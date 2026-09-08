/**
 * Client-Side Audio Processor for CreatorKit Whisper Engine
 * ========================================================
 * Decodes any audio/video file directly in the browser and resamples it to
 * 16,000 Hz Mono Float32Array (Whisper's native input).
 *
 * Decoding happens through a 3-tier fallback pipeline because
 * AudioContext.decodeAudioData() alone fails ("EncodingError: Unable to decode
 * audio data") on several very common inputs:
 *   - MediaRecorder WebM/Opus blobs (Teleprompter handoff recordings)
 *   - MKV / AVI / some MOV containers, PCM-in-MOV, AC-3 audio tracks
 *   - Video files whose container the WebAudio sniffer rejects
 *   - Video-only files (no audio track at all)
 *
 * Tier 1  decodeAudioData()           — fast path, most well-formed files.
 * Tier 2  Media-element capture       — plays the file through a hidden <audio>
 *                                       element into the WebAudio graph at
 *                                       accelerated playbackRate and captures
 *                                       PCM directly. Handles anything the
 *                                       browser can PLAY, even when the
 *                                       WebAudio decoder refuses it.
 * Tier 3  Actionable AudioDecodeError — explains the failure and points the
 *                                       user to the cloud engines (which decode
 *                                       server-side) or a re-export.
 *
 * 100% Client-Side. $0 Server Bandwidth.
 */

export interface DecodedAudioResult {
    audioData: Float32Array;
    duration: number;
    sampleRate: number;
}

export type AudioDecodeErrorCode =
    | 'EMPTY_FILE'
    | 'UNSUPPORTED_CODEC'
    | 'CAPTURE_FAILED';

/** Rich, user-actionable decode failure thrown when every tier fails. */
export class AudioDecodeError extends Error {
    public readonly code: AudioDecodeErrorCode;
    public readonly fileName: string;
    public readonly fileType: string;
    public readonly fileSizeMB: number;

    constructor(
        code: AudioDecodeErrorCode,
        message: string,
        file?: File | Blob | null
    ) {
        super(message);
        this.name = 'AudioDecodeError';
        this.code = code;
        this.fileName = (file as File)?.name || 'unknown file';
        this.fileType = file?.type || 'unknown type';
        this.fileSizeMB = file ? Math.round((file.size / (1024 * 1024)) * 10) / 10 : 0;
    }
}

const TARGET_SAMPLE_RATE = 16000;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextClass(): AudioContextConstructor {
    const cls =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioContextConstructor }).webkitAudioContext;
    if (!cls) {
        throw new AudioDecodeError('UNSUPPORTED_CODEC', 'Web Audio API is not available in this browser.');
    }
    return cls;
}

/**
 * Resamples any decoded AudioBuffer (any channel count / rate) to
 * 16 kHz mono — Whisper's native input format.
 */
async function resampleTo16kMono(buffer: AudioBuffer): Promise<AudioBuffer> {
    if (buffer.sampleRate === TARGET_SAMPLE_RATE && buffer.numberOfChannels === 1) {
        return buffer;
    }

    const length = Math.max(1, Math.ceil(buffer.duration * TARGET_SAMPLE_RATE));
    const offlineCtx = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    return offlineCtx.startRendering();
}

/* ------------------------------------------------------------------ */
/* TIER 1 — Fast path: decodeAudioData                                 */
/* ------------------------------------------------------------------ */

async function decodeViaWebAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const cls = getAudioContextClass();
    const ctx = new cls();
    try {
        // Note: decodeAudioData detaches the ArrayBuffer on success in most
        // browsers, so the caller must never reuse it afterwards.
        return await ctx.decodeAudioData(arrayBuffer);
    } finally {
        if (ctx.state !== 'closed') {
            await ctx.close().catch(() => { });
        }
    }
}

/* ------------------------------------------------------------------ */
/* TIER 2 — Media-element capture fallback                             */
/* ------------------------------------------------------------------ */

/** Waits for a single DOM event, resolving even on timeout (best effort). */
function onceEvent(target: EventTarget, eventName: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            target.removeEventListener(eventName, handler);
            clearTimeout(timer);
            resolve();
        };
        const handler = () => finish();
        const timer = setTimeout(finish, timeoutMs);
        target.addEventListener(eventName, handler, { once: true });
    });
}

/**
 * Loads metadata and resolves the TRUE duration of the media.
 *
 * MediaRecorder WebM blobs (Teleprompter takes) frequently report
 * duration = Infinity until the element is forced to seek past the end —
 * the classic fix is seeking to ~1e101 which makes the remuxing demuxer
 * compute the real duration.
 */
async function resolveStreamDuration(el: HTMLAudioElement): Promise<number> {
    if (el.readyState < 1) {
        await onceEvent(el, 'loadedmetadata', 15000);
    }
    if (Number.isFinite(el.duration) && el.duration > 0) {
        return el.duration;
    }

    try {
        el.currentTime = 1e101; // force duration resolution on streamable WebM
        await onceEvent(el, 'durationchange', 4000);
        const duration = el.duration;
        el.currentTime = 0;
        await onceEvent(el, 'seeked', 4000);
        return Number.isFinite(duration) && duration > 0 ? duration : 0;
    } catch {
        el.currentTime = 0;
        return 0;
    }
}

interface CaptureResult {
    buffer: AudioBuffer;
    /** True when every captured sample was exactly 0.0 (digital silence). */
    silent: boolean;
}

/**
 * Plays the (already wired) media element through the given AudioContext and
 * captures raw PCM via a ScriptProcessorNode. Not audibly connected: output
 * runs through a zero-gain node so capture stays silent for the user.
 *
 * `earlySilenceAbort` stops the attempt as soon as it becomes obvious the
 * pipeline is muted (some browsers mute audio above ~4x playbackRate, which
 * yields exact zero samples) so the caller can retry at 1x.
 */
function captureOnce(
    ctx: AudioContext,
    source: MediaElementAudioSourceNode,
    el: HTMLAudioElement,
    knownDuration: number,
    playbackRate: number,
    onProgress?: (stage: string) => void
): Promise<CaptureResult> {
    return new Promise<CaptureResult>((resolve, reject) => {
        const chunks: Float32Array[] = [];
        let capturedSamples = 0;
        let maxAbsSample = 0;
        let settled = false;
        let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
        let startedAt = performance.now();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const processor = ctx.createScriptProcessor(4096, 2, 2);
        const mute = ctx.createGain();
        mute.gain.value = 0; // keep the graph pulling, but stay silent

        const teardownNodes = () => {
            processor.onaudioprocess = null;
            try { source.disconnect(); } catch { /* already disconnected */ }
            try { processor.disconnect(); } catch { /* already disconnected */ }
            try { mute.disconnect(); } catch { /* already disconnected */ }
            if (watchdogTimer !== null) {
                clearTimeout(watchdogTimer);
                watchdogTimer = null;
            }
        };

        const finish = () => {
            if (settled) return;
            settled = true;

            // Give the graph a moment to flush trailing onaudioprocess calls
            // after the 'ended' event, then assemble the final buffer.
            setTimeout(() => {
                teardownNodes();

                const total = new Float32Array(capturedSamples);
                let offset = 0;
                for (const chunk of chunks) {
                    total.set(chunk, offset);
                    offset += chunk.length;
                }

                const buffer = ctx.createBuffer(1, Math.max(1, total.length), ctx.sampleRate);
                if (total.length > 0) {
                    buffer.copyToChannel(total, 0);
                }

                resolve({
                    buffer,
                    silent: maxAbsSample === 0,
                });
            }, 300);
        };

        const fail = (err: Error) => {
            if (settled) return;
            settled = true;
            teardownNodes();
            el.pause();
            reject(err);
        };

        // Hard safety net: never hang longer than duration/speed + 45s.
        const expectedWallMs =
            knownDuration > 0 ? (knownDuration / playbackRate) * 1000 + 45000 : 45 * 60 * 1000;
        watchdogTimer = setTimeout(() => {
            console.warn('[audio-processor] Capture watchdog fired — finalizing partial audio.');
            el.pause();
            finish();
        }, expectedWallMs);

        processor.onaudioprocess = (event) => {
            if (settled) return;

            const left = event.inputBuffer.getChannelData(0);
            const right =
                event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : null;

            const mono = new Float32Array(left.length);
            let localMax = 0;
            for (let i = 0; i < left.length; i++) {
                mono[i] = right ? (left[i] + right[i]) * 0.5 : left[i];
                const abs = mono[i] < 0 ? -mono[i] : mono[i];
                if (abs > localMax) localMax = abs;
            }
            if (localMax > maxAbsSample) maxAbsSample = localMax;

            chunks.push(mono);
            capturedSamples += mono.length;

            // Early mute detection: after ~2s wall time at an accelerated rate
            // with nothing but exact digital silence, the pipeline is almost
            // certainly muted high-rate audio. Abort early so the caller can
            // retry in realtime.
            if (
                playbackRate > 1 &&
                performance.now() - startedAt > 2000 &&
                maxAbsSample === 0 &&
                capturedSamples > ctx.sampleRate // >1s of audio captured
            ) {
                console.warn('[audio-processor] Accelerated capture produced digital silence — aborting for realtime retry.');
                el.pause();
                finish();
            }
        };

        el.onended = () => finish();
        el.onerror = () => {
            fail(new Error('The browser media engine cannot play this file.'));
        };

        el.playbackRate = playbackRate;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (el as any).preservesPitch = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (el as any).webkitPreservesPitch = false;
        } catch { /* non-fatal */ }

        source.connect(processor);
        processor.connect(mute);
        mute.connect(ctx.destination);

        onProgress?.(
            playbackRate > 1
                ? `Extracting audio with media engine (${playbackRate}x speed)...`
                : 'Extracting audio with media engine (realtime)...'
        );

        el.currentTime = 0;
        el.play().catch((err: unknown) => {
            fail(
                new Error(
                    `Audio playback was blocked by the browser (${err instanceof Error ? err.message : 'NotAllowedError'
                    }). Click the page once and retry.`
                )
            );
        });
    });
}

/**
 * TIER 2: decodes a file by playing it through a hidden <audio> element
 * wired into a 16 kHz AudioContext. Works for anything the browser can
 * play — even when decodeAudioData() refuses the container — including
 * MediaRecorder WebM/Opus blobs, MKV and most MOV files.
 */
async function decodeViaMediaElementCapture(
    file: File | Blob,
    onProgress?: (stage: string) => void
): Promise<AudioBuffer> {
    const objectUrl = URL.createObjectURL(file);
    const el = document.createElement('audio');
    el.src = objectUrl;
    el.preload = 'auto';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).playsInline = true;

    let ctx: AudioContext | null = null;

    try {
        const duration = await resolveStreamDuration(el);
        if (el.error) {
            throw new Error('The browser media engine cannot load this file.');
        }

        const cls = getAudioContextClass();
        try {
            ctx = new cls({ sampleRate: TARGET_SAMPLE_RATE });
        } catch {
            ctx = new cls(); // older browsers without the sampleRate option
        }
        await ctx.resume().catch(() => { /* sticky activation from the file pick */ });

        // A media element can only ever be wired to ONE source node.
        const source = ctx.createMediaElementSource(el);

        // 1st pass: accelerated capture (8x). Falls back to realtime
        // automatically if the accelerated pipeline turns out muted.
        let result = await captureOnce(ctx, source, el, duration, 8, onProgress);
        if (result.silent && result.buffer.duration < 0.3) {
            // Ended almost immediately with silence → likely "no audio track".
            throw new Error('No audible audio track detected in this file.');
        }
        if (result.silent) {
            onProgress?.('Accelerated capture was muted — recapturing in realtime...');
            result = await captureOnce(ctx, source, el, duration, 1, onProgress);
        }
        if (result.buffer.duration < 0.3) {
            throw new Error('No audible audio track detected in this file.');
        }

        return result.buffer;
    } finally {
        el.pause();
        el.removeAttribute('src');
        el.load();
        URL.revokeObjectURL(objectUrl);
        if (ctx && ctx.state !== 'closed') {
            await ctx.close().catch(() => { });
        }
    }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function buildUnsupportedCodecMessage(file: File | Blob): string {
    const name = (file as File)?.name || 'this file';
    const type = file.type || 'unknown format';
    const sizeMB = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    return (
        `This browser cannot decode the audio inside "${name}" (${type}, ${sizeMB} MB). ` +
        'The file may use an unsupported audio codec (e.g. AC-3, PCM in MOV) or have no audio track. ' +
        'Fix it in one of two ways: (1) re-export the audio as MP3, M4A or WAV, or ' +
        '(2) retry with the free Groq or OpenAI cloud engine — it decodes virtually any format server-side.'
    );
}

/**
 * Decodes an uploaded Audio or Video File into a 16kHz mono Float32Array
 * using the tiered fallback pipeline described at the top of this file.
 */
export async function processAudioForWhisper(
    file: File | Blob,
    onProgress?: (stage: string) => void
): Promise<DecodedAudioResult> {
    if (!file || file.size === 0) {
        throw new AudioDecodeError(
            'EMPTY_FILE',
            'The selected file is empty or unreadable. Please re-select the original media file.'
        );
    }

    onProgress?.('Reading audio file...');
    const arrayBuffer = await file.arrayBuffer();

    // ── TIER 1: fast WebAudio decode ─────────────────────────────────
    try {
        onProgress?.('Decoding audio stream in browser...');
        const decoded = await decodeViaWebAudio(arrayBuffer);
        onProgress?.('Resampling to 16kHz mono for Whisper...');
        const resampled = await resampleTo16kMono(decoded);
        return {
            audioData: new Float32Array(resampled.getChannelData(0)),
            duration: decoded.duration,
            sampleRate: TARGET_SAMPLE_RATE,
        };
    } catch (webAudioError) {
        console.warn(
            '[audio-processor] decodeAudioData failed — falling back to media engine capture:',
            webAudioError
        );
    }

    // ── TIER 2: media-element capture ────────────────────────────────
    let captured: AudioBuffer;
    try {
        captured = await decodeViaMediaElementCapture(file, onProgress);
    } catch (captureError) {
        console.warn('[audio-processor] media engine capture failed:', captureError);
        throw new AudioDecodeError(
            'UNSUPPORTED_CODEC',
            buildUnsupportedCodecMessage(file),
            file
        );
    }

    onProgress?.('Resampling to 16kHz mono for Whisper...');
    const resampled = await resampleTo16kMono(captured);
    return {
        audioData: new Float32Array(resampled.getChannelData(0)),
        duration: captured.duration,
        sampleRate: TARGET_SAMPLE_RATE,
    };
}
