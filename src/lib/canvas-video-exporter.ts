// Deterministic canvas → MP4 video exporter built on WebCodecs + mp4-muxer.
//
// Why this exists: MediaRecorder + canvas.captureStream() captures frames in
// real time on the wall clock. Heavy canvas renders (>1 frame budget), setTimeout
// jitter, and background-tab throttling all produce dropped/duplicated frames and
// a variable frame rate, which reads as "bad quality" output. This exporter
// instead renders every frame exactly once — as fast or as slow as the machine
// allows — and encodes it with an explicit microsecond timestamp. The result is
// a constant-frame-rate, high-bitrate, High-profile H.264 MP4 with zero dropped
// frames, muxed in-memory for fast-start playback.

import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface CanvasVideoExportOptions {
    width: number;
    height: number;
    fps: number;
    totalFrames: number;
    /** Draws frame `frameIndex` onto the provided 2D context. Called exactly once per frame. */
    renderFrame: (frameIndex: number, ctx: CanvasRenderingContext2D) => void;
    /** Encode bitrate in bits/sec. Defaults to a quality factor tuned for dense text + grain. */
    bitrate?: number;
    /** Optional pre-rendered (e.g. OfflineAudioContext) audio track to mux in as AAC. */
    audioBuffer?: AudioBuffer | null;
    /** Seconds between keyframes. Default 2. */
    keyframeIntervalSec?: number;
    /**
     * Optional predicate forcing an encoder keyframe at specific frames —
     * e.g. every whip-cut boundary, so each hard cut starts from a pristine
     * intra frame instead of a smudgy inter-frame prediction.
     */
    isKeyFrame?: (frameIndex: number) => boolean;
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
}

export interface CanvasVideoExportResult {
    blob: Blob;
    mimeType: string;
    audioIncluded: boolean;
    /** True when WebCodecs was unavailable and the legacy MediaRecorder path was used. */
    usedFallback: boolean;
}

const AVC_CODEC_CANDIDATES = [
    'avc1.640034', // High Profile Level 5.2 — 4K-safe
    'avc1.640028', // High Profile Level 4.0 — 1080p-class
    'avc1.4D0028', // Main Profile Level 4.0
    'avc1.42E01E', // Baseline Profile — last resort (old behavior)
];

const VIDEO_TARGET_MIME = 'video/mp4';

function sleep(ms = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function webCodecsSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof VideoEncoder !== 'undefined' &&
        typeof VideoFrame !== 'undefined'
    );
}

function defaultBitrate(width: number, height: number, fps: number): number {
    // ~0.4 bits per pixel per frame keeps grainy, dense newspaper text crisp.
    const estimate = Math.round(width * height * fps * 0.4);
    return Math.min(48_000_000, Math.max(8_000_000, estimate));
}

class ThrottledProgress {
    private lastEmit = 0;
    constructor(private readonly onProgress?: (p: number) => void) { }
    emit(p: number, force = false): void {
        if (!this.onProgress) return;
        const now = performance.now();
        if (!force && now - this.lastEmit < 120) return;
        this.lastEmit = now;
        this.onProgress(Math.min(1, Math.max(0, p)));
    }
}

/** Renders an AudioBuffer's planar samples into the muxer as AAC. Returns false when AAC is unsupported. */
async function muxAudioTrack(
    muxer: Muxer<ArrayBufferTarget>,
    audioBuffer: AudioBuffer
): Promise<boolean> {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') return false;

    const numberOfChannels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;

    const config: AudioEncoderConfig = {
        codec: 'mp4a.40.2',
        sampleRate,
        numberOfChannels,
        bitrate: 192_000,
    };

    let support: AudioEncoderSupport | null = null;
    try {
        support = await AudioEncoder.isConfigSupported(config);
    } catch {
        return false;
    }
    if (!support?.supported) return false;

    const encoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (err) => console.warn('AAC encode error:', err),
    });
    encoder.configure(config);

    const totalFrames = audioBuffer.length;
    const planar = new Float32Array(totalFrames * numberOfChannels);
    for (let ch = 0; ch < numberOfChannels; ch++) {
        planar.set(audioBuffer.getChannelData(ch), ch * totalFrames);
    }

    const BLOCK = 4800; // ~100ms @ 48kHz — keeps encoder queue shallow
    for (let start = 0; start < totalFrames; start += BLOCK) {
        const count = Math.min(BLOCK, totalFrames - start);
        const blockData = new Float32Array(count * numberOfChannels);
        for (let ch = 0; ch < numberOfChannels; ch++) {
            blockData.set(
                planar.subarray(ch * totalFrames + start, ch * totalFrames + start + count),
                ch * count
            );
        }
        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: count,
            numberOfChannels,
            timestamp: Math.round((start / sampleRate) * 1_000_000),
            data: blockData,
        });
        encoder.encode(audioData);
        audioData.close();
        if (encoder.encodeQueueSize > 16) await sleep(0);
    }

    await encoder.flush();
    encoder.close();
    return true;
}

/**
 * Renders an audio timeline deterministically with OfflineAudioContext.
 * `schedule` may place buffer sources / synthesized SFX onto `destination`.
 */
export async function renderOfflineAudio(opts: {
    durationSec: number;
    sampleRate?: number;
    schedule: (ctx: OfflineAudioContext, destination: AudioNode) => void | Promise<void>;
}): Promise<AudioBuffer> {
    const sampleRate = opts.sampleRate ?? 48_000;
    const length = Math.max(1, Math.ceil(opts.durationSec * sampleRate));
    const ctx = new OfflineAudioContext(2, length, sampleRate);

    // Transparent soft limiter in front of the destination. Overlapping SFX
    // (e.g. rapid whip-cut strokes) can otherwise sum past 0 dBFS and the
    // exported audio hard-clips into harsh digital distortion.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 18;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.16;
    limiter.connect(ctx.destination);

    await opts.schedule(ctx, limiter);
    return ctx.startRendering();
}

/** Main entry: deterministic, frame-accurate canvas → MP4 (H.264 + optional AAC). */
export async function exportCanvasVideoToMp4(
    options: CanvasVideoExportOptions
): Promise<CanvasVideoExportResult> {
    if (!webCodecsSupported()) {
        return exportViaMediaRecorderFallback(options);
    }

    const {
        width,
        height,
        fps,
        totalFrames,
        renderFrame,
        bitrate = defaultBitrate(width, height, fps),
        audioBuffer = null,
        keyframeIntervalSec = 2,
        onProgress,
        signal,
    } = options;

    const progress = new ThrottledProgress(onProgress);

    // Even dimensions keep hardware H.264 encoders happy.
    const encWidth = width - (width % 2);
    const encHeight = height - (height % 2);

    // Pick the best supported H.264 profile (High > Main > Baseline).
    let chosenCodec: string | null = null;
    for (const codec of AVC_CODEC_CANDIDATES) {
        const config: VideoEncoderConfig = {
            codec,
            width: encWidth,
            height: encHeight,
            bitrate,
            framerate: fps,
        };
        try {
            const support = await VideoEncoder.isConfigSupported(config);
            if (support.supported) {
                chosenCodec = codec;
                break;
            }
        } catch {
            // try next candidate
        }
    }
    if (!chosenCodec) {
        return exportViaMediaRecorderFallback(options);
    }

    const canvas = document.createElement('canvas');
    canvas.width = encWidth;
    canvas.height = encHeight;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Could not acquire 2D context for export canvas.');

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
        target,
        video: {
            codec: 'avc',
            width: encWidth,
            height: encHeight,
            frameRate: fps,
        },
        ...(audioBuffer
            ? {
                audio: {
                    codec: 'aac' as const,
                    numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
                    sampleRate: audioBuffer.sampleRate,
                },
            }
            : {}),
        fastStart: 'in-memory' as const,
    });

    const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (err) => console.error('VideoEncoder error:', err),
    });
    encoder.configure({
        codec: chosenCodec,
        width: encWidth,
        height: encHeight,
        bitrate,
        framerate: fps,
        latencyMode: 'quality',
    });

    const keyframeEvery = Math.max(1, Math.round(keyframeIntervalSec * fps));
    const microPerFrame = 1_000_000 / fps;

    for (let i = 0; i < totalFrames; i++) {
        if (signal?.aborted) {
            encoder.close();
            throw new DOMException('Export aborted', 'AbortError');
        }

        renderFrame(i, ctx);

        const frame = new VideoFrame(canvas, {
            timestamp: Math.round(i * microPerFrame),
            duration: Math.round(microPerFrame),
        });
        encoder.encode(frame, {
            keyFrame: i % keyframeEvery === 0 || (options.isKeyFrame?.(i) ?? false),
        });
        frame.close();

        // Backpressure: never let the encoder queue grow unbounded.
        while (encoder.encodeQueueSize > 6) {
            await sleep(1);
        }

        // Frames 0–90% of progress budget; audio + finalize take the rest.
        progress.emit((i + 1) / totalFrames * 0.9);
        // Yield so progress UI can paint.
        if (i % 2 === 0) await sleep(0);
    }

    progress.emit(0.9);
    await encoder.flush();
    encoder.close();

    let audioIncluded = false;
    if (audioBuffer && audioBuffer.length > 0) {
        audioIncluded = await muxAudioTrack(muxer, audioBuffer);
    }

    muxer.finalize();
    progress.emit(1, true);

    return {
        blob: new Blob([target.buffer], { type: VIDEO_TARGET_MIME }),
        mimeType: VIDEO_TARGET_MIME,
        audioIncluded,
        usedFallback: false,
    };
}

/**
 * Legacy path for browsers without WebCodecs (e.g. old Safari). Uses
 * captureStream(0) + requestFrame() manual capture — the correct manual-mode
 * usage — so at least no duplicate auto-captures occur. Still real-time bound.
 */
async function exportViaMediaRecorderFallback(
    options: CanvasVideoExportOptions
): Promise<CanvasVideoExportResult> {
    const {
        width,
        height,
        fps,
        totalFrames,
        renderFrame,
        bitrate = defaultBitrate(width, height, fps),
        onProgress,
        signal,
    } = options;

    if (typeof MediaRecorder === 'undefined') {
        throw new Error('This browser supports neither WebCodecs nor MediaRecorder video export.');
    }

    const progress = new ThrottledProgress(onProgress);

    const mimeCandidates = [
        'video/mp4;codecs=avc1.640028',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
    ];
    let selectedMime = 'video/webm';
    for (const mime of mimeCandidates) {
        try {
            if (MediaRecorder.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
            }
        } catch {
            // continue
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width - (width % 2);
    canvas.height = height - (height % 2);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not acquire 2D context for export canvas.');
    renderFrame(0, ctx);

    const stream = canvas.captureStream(0);
    const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;

    const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: bitrate,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const recordPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || selectedMime }));
        recorder.onerror = (err) => reject(err);
    });
    recorder.start(250);

    for (let i = 0; i < totalFrames; i++) {
        if (signal?.aborted) break;
        renderFrame(i, ctx);
        videoTrack.requestFrame();
        progress.emit((i + 1) / totalFrames);
        await sleep(1000 / fps);
    }

    await sleep(150);
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await recordPromise;

    return {
        blob,
        mimeType: selectedMime,
        audioIncluded: false,
        usedFallback: true,
    };
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
