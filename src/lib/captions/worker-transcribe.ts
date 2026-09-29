/**
 * CreatorKit Server Transcription Client (our own Render worker — FREE)
 * ====================================================================
 * Calls the auto-captions module on workers/ (video-worker-xwv9.onrender.com):
 *
 *   1. Edge function mints a one-time upload ticket (real worker token
 *      NEVER enters client code — the edge holds it server-side).
 *   2. Browser uploads audio DIRECTLY to the worker (bypasses the edge
 *      function's body limits + bandwidth — critical on mobile data).
 *   3. Poll the job; map word timestamps through the SAME cue grouping
 *      the browser engine uses (groupWordsIntoSingleLineCues), so every
 *      downstream preset/overlay behaves identically whichever engine ran.
 *
 * Upload payload priority:
 *   a) decoded 16k-mono PCM (Float32Array) → re-encoded to a 16-bit WAV
 *      (~32KB/s — tiny, deterministic, exactly what browser Whisper sees);
 *   b) the raw original file (when the browser couldn't decode it at all —
 *      MKV/AC-3/etc — the worker's PyAV decodes server-side instead).
 */

import { VIDEO_GRAB_ENDPOINT } from '../video-grabber';
import { SubtitleWord } from './vtt-formatter';
import { groupWordsIntoSingleLineCues, TranscriptionResult, WhisperProgress } from './whisper-client';

export const CAPTIONS_WORKER_BASE =
    process.env.NEXT_PUBLIC_CAPTIONS_WORKER_URL?.replace(/\/+$/, '') ||
    'https://video-worker-xwv9.onrender.com';

/** Worker hard cap is 100MB — stay just under to avoid a 413 after a long upload. */
const MAX_UPLOAD_BYTES = 99 * 1024 * 1024;
const POLL_INTERVAL_MS = 3000;
const POLL_DEADLINE_MS = 20 * 60 * 1000; // ~52 min audio cap → ~20 min server time
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

export type WorkerTranscribeCode =
    | 'too_large'
    | 'busy'
    | 'auth'
    | 'edge_offline'
    | 'timeout'
    | 'failed';

export class WorkerTranscribeError extends Error {
    public readonly code: WorkerTranscribeCode;
    constructor(message: string, code: WorkerTranscribeCode) {
        super(message);
        this.name = 'WorkerTranscribeError';
        this.code = code;
    }
}

/**
 * Weak-device heuristic: phones / low-RAM machines transcribe faster (and
 * cooler, and without freezing — the S21 lesson) on the server. Desktops
 * keep the instant offline browser engine first.
 */
export function prefersServerTranscription(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return true;
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true;
    return /Android|iPhone|iPad|iPod/i.test(nav.userAgent);
}

/** Encode 16k-mono PCM into a 16-bit WAV Blob (~32KB per second of audio). */
export function encodeWav16kMono(samples: Float32Array, sampleRate = 16000): Blob {
    const bytesPerSample = 2;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true); // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Step 1 — ask the edge function (which holds the real token) for a one-time upload grant. */
async function requestUploadTicket(): Promise<string> {
    let res: Response;
    try {
        res = await fetch(VIDEO_GRAB_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'captions-ticket' }),
        });
    } catch {
        throw new WorkerTranscribeError('Cannot reach the caption service. Check your connection.', 'edge_offline');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ticket) {
        throw new WorkerTranscribeError(
            data?.error || 'Caption service is not available right now.',
            data?.code === 'worker_offline' ? 'edge_offline' : 'auth'
        );
    }
    return data.ticket as string;
}

export interface WorkerTranscribeOptions {
    /** Original media file — used as-is when no decoded PCM is available. */
    file: File | Blob;
    /** Decoded 16k-mono PCM if the browser already produced it (preferred: smaller upload). */
    audioData?: Float32Array | null;
    /** Total audio duration in seconds — improves the progress estimate while polling. */
    durationSeconds?: number;
    onProgress?: (progress: WhisperProgress) => void;
}

/**
 * Full server pipeline: ticket → upload → poll → cues.
 * Returns the SAME shape as WhisperClient.transcribe so the page treats
 * both engines identically.
 */
export async function transcribeOnWorker(opts: WorkerTranscribeOptions): Promise<TranscriptionResult> {
    const startedAt = performance.now();
    const { file, audioData, durationSeconds, onProgress } = opts;

    // ── pick the upload payload ─────────────────────────────────────────
    let payload: Blob;
    let filename: string;
    if (audioData && audioData.length > 0) {
        onProgress?.({ stage: 'loading_model', message: 'Preparing audio for upload…', percent: 10 });
        payload = encodeWav16kMono(audioData);
        filename = 'audio-16k.wav';
    } else {
        if (file.size > MAX_UPLOAD_BYTES) {
            throw new WorkerTranscribeError(
                'File is too large for server transcription (max ~100MB). Try the Local engine or trim the clip.',
                'too_large'
            );
        }
        payload = file;
        filename = (file as File).name || 'audio';
    }

    // ── ticket + upload ─────────────────────────────────────────────────
    onProgress?.({ stage: 'loading_model', message: 'Connecting to CreatorKit Server…', percent: 15 });
    const ticket = await requestUploadTicket();

    onProgress?.({ stage: 'loading_model', message: 'Uploading audio to the server…', percent: 25 });
    const form = new FormData();
    form.append('file', payload, filename);

    let startRes: Response;
    try {
        startRes = await fetch(`${CAPTIONS_WORKER_BASE}/transcribe?ticket=${encodeURIComponent(ticket)}`, {
            method: 'POST',
            body: form,
        });
    } catch {
        throw new WorkerTranscribeError('Upload failed — the server may be waking up. Try again.', 'failed');
    }

    const start = await startRes.json().catch(() => ({}));
    if (startRes.status === 413) {
        throw new WorkerTranscribeError(
            'Audio too large for server transcription (max ~100MB). Try the Local engine.',
            'too_large'
        );
    }
    if (startRes.status === 429) {
        throw new WorkerTranscribeError('The server is busy with other jobs — try again in a minute.', 'busy');
    }
    if (!startRes.ok || !start?.jobId || !start?.token) {
        throw new WorkerTranscribeError(start?.detail || 'The server rejected the upload.', 'failed');
    }

    // ── poll ────────────────────────────────────────────────────────────
    // Progress estimate: base.en int8 runs ≈2.2× faster than realtime on
    // the free box — map elapsed/expected onto 40→95 so the bar moves
    // believably instead of freezing for minutes.
    const expectedServerSeconds = Math.max(8, ((durationSeconds ?? payload.size / 32000) / 2.2) + 8);
    const pollStartedAt = performance.now();
    let consecutiveErrors = 0;

    onProgress?.({ stage: 'transcribing', message: start.queuedAhead ? 'Waiting for a free server slot…' : 'Transcribing on the server…', percent: 40 });

    for (; ;) {
        await sleep(POLL_INTERVAL_MS);

        let job: any;
        try {
            const pollRes = await fetch(
                `${CAPTIONS_WORKER_BASE}/transcribe/job/${encodeURIComponent(start.jobId)}?t=${encodeURIComponent(start.token)}`
            );
            if (pollRes.status === 404) {
                // We already HOLD a jobId, so the job existed. A 404 this early
                // means the worker restarted mid-transcription (jobs live in
                // memory; deploys swap the container). Render's proxy errors
                // during the swap arrive as opaque CORS/fetch failures — the
                // consecutiveErrors branch below covers those.
                throw new WorkerTranscribeError(
                    'The server restarted mid-transcription (jobs do not survive deploys). Try again.',
                    'failed'
                );
            }
            job = await pollRes.json();
            consecutiveErrors = 0;
        } catch (err) {
            if (err instanceof WorkerTranscribeError) throw err;
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
                throw new WorkerTranscribeError('Lost contact with the server while transcribing.', 'failed');
            }
            continue;
        }

        if (job?.status === 'processing') {
            const elapsed = (performance.now() - pollStartedAt) / 1000;
            const fraction = Math.min(1, elapsed / expectedServerSeconds);
            onProgress?.({
                stage: 'transcribing',
                message: job.queuedAhead ? 'Waiting for a free server slot…' : 'Transcribing on the server…',
                percent: 40 + Math.round(55 * fraction),
            });
            if (performance.now() - pollStartedAt > POLL_DEADLINE_MS) {
                throw new WorkerTranscribeError('Server transcription is taking unusually long. Try a shorter clip.', 'timeout');
            }
            continue;
        }

        if (job?.status === 'failed') {
            throw new WorkerTranscribeError(job?.error || 'Server transcription failed.', 'failed');
        }

        if (job?.status === 'ready') {
            // ── map to the exact browser-engine contract ────────────────
            const rawWords: SubtitleWord[] = (job.words || [])
                .map((w: any) => ({
                    word: String(w.word || '').trim(),
                    start: Number(w.start),
                    end: Number(w.end),
                }))
                .filter((w: SubtitleWord) => w.word);
            const cues = groupWordsIntoSingleLineCues(rawWords);
            onProgress?.({ stage: 'complete', message: 'Transcription complete!', percent: 100 });
            return {
                cues,
                fullText: String(job.text || '').trim(),
                elapsedSeconds: ((performance.now() - startedAt) / 1000).toFixed(1),
            };
        }

        throw new WorkerTranscribeError('Unexpected server response.', 'failed');
    }
}
