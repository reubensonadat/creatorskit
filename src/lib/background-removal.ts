/**
 * Shared background-removal engine — the auto-captions fallback philosophy:
 *
 *   BROWSER (@imgly, runs on the user's CPU, zero server cost)
 *     → SERVER (free Render worker /matte, rembg u2netp, any subject)
 *     → MANUAL (the user uploads their own transparent PNG — always works)
 *
 * The server path reuses the SAME one-time upload grant as /transcribe
 * (the ticket is a generic one-time credential minted by the edge function),
 * so no edge changes were needed. Mirrors worker-transcribe.ts's
 * ticket → upload → poll dance.
 */

import { VIDEO_GRAB_ENDPOINT } from './video-grabber';
import { CAPTIONS_WORKER_BASE } from './captions/worker-transcribe';

export type MatteEngine = 'browser' | 'server';
export type MatteStage = 'downloading' | 'processing' | 'uploading' | 'queued' | 'server_processing';

export type MatteProgress = (
    stage: MatteStage,
    message: string,
    percent: number,
) => void;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const MATTE_POLL_MS = 1500;

// ---------------------------------------------------------------------------
// Browser engine — @imgly/background-removal (already a dependency).
// Downloads its WASM weights from CDN on first use, then runs fully offline.
// ---------------------------------------------------------------------------

let imglyModule: Promise<typeof import('@imgly/background-removal')> | null = null;

export async function removeBackgroundBrowser(
    source: Blob,
    onProgress?: MatteProgress,
): Promise<Blob> {
    if (!imglyModule) imglyModule = import('@imgly/background-removal');
    const { removeBackground } = await imglyModule;
    try {
        return await removeBackground(source, {
            // Same-origin proxy (src/app/api/imgly) — adds immutable caching
            // so the ~15MB engine downloads ONCE per browser, not per visit
            // (the lib has no built-in persistence). publicPath must be
            // absolute: the lib resolves every resource with new URL(rel, base).
            publicPath: `${window.location.origin}/api/imgly/`,
            // isnet_quint8 ≈ 13MB download vs isnet_fp16 ≈ 44MB: the first-use
            // download shrinks 3× and poster cutouts stay crisp.
            model: 'isnet_quint8',
            // No proxy worker: under Next.js dev Fast Refresh the ORT worker
            // script goes stale (_OrtGetInputOutputMetadata crash). Main-thread
            // inference costs ~2-6s and keeps the progress UI honest.
            proxyToWorker: false,
            // v1.7 API: progress(key, current, total) — 'fetch:*' keys are the
            // one-time engine download; everything else is inference.
            progress: (key: string, current: number, total: number) => {
                const pct = total > 0 ? Math.round((current / total) * 100) : 0;
                if (key.startsWith('fetch')) {
                    onProgress?.('downloading', 'Downloading the cutout engine (one time)…', pct);
                } else {
                    onProgress?.('processing', 'Cutting out the subject…', pct);
                }
            },
            output: { format: 'image/png' },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // The classic onnxruntime-web glue/wasm cache mismatch (stale service
        // worker or dev-server cache mixing engine versions).
        if (/publicPath|Failed to create session|_Ort/i.test(message)) {
            throw new Error('The cutout engine hit a stale browser cache — hard-refresh (Ctrl+Shift+R) and press CUT again.');
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Server engine — worker /matte (rembg u2netp; any subject, not just people).
// ---------------------------------------------------------------------------

async function requestUploadTicket(): Promise<string> {
    let res: Response;
    try {
        res = await fetch(VIDEO_GRAB_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'captions-ticket' }),
        });
    } catch {
        throw new Error('Cannot reach the cutout service. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ticket) {
        throw new Error(data?.error || 'Cutout service is not available right now.');
    }
    return data.ticket as string;
}

export async function removeBackgroundServer(
    source: Blob,
    onProgress?: MatteProgress,
): Promise<Blob> {
    // ── ticket + upload ──────────────────────────────────────────────────
    onProgress?.('uploading', 'Connecting to CreatorKit Server…', 8);
    const ticket = await requestUploadTicket();

    onProgress?.('uploading', 'Uploading image to the server…', 20);
    const form = new FormData();
    form.append('file', source, 'image');
    const startRes = await fetch(`${CAPTIONS_WORKER_BASE}/matte?ticket=${encodeURIComponent(ticket)}`, {
        method: 'POST',
        body: form,
    }).catch(() => {
        throw new Error('Connection lost while uploading — the server may be restarting.');
    });

    const start = await startRes.json().catch(() => ({}));
    if (startRes.status === 413) throw new Error('Image too large for server cutout (max ~99MB).');
    if (startRes.status === 429) throw new Error('The server is busy with other jobs — try again in a minute.');
    if (!startRes.ok || !start?.jobId || !start?.token) {
        throw new Error(start?.detail || 'The server rejected the upload.');
    }

    // ── poll ──────────────────────────────────────────────────────────────
    const jobId = start.jobId as string;
    const token = start.token as string;
    let pct = 30;
    for (; ;) {
        await sleep(MATTE_POLL_MS);
        let jobRes: Response;
        try {
            jobRes = await fetch(`${CAPTIONS_WORKER_BASE}/matte/job/${jobId}?t=${encodeURIComponent(token)}`);
        } catch {
            // Free-tier container reboots look like this — keep polling a few
            // rounds before giving up (the job may survive on disk).
            pct = Math.min(95, pct + 2);
            onProgress?.('server_processing', 'Waiting for the server…', pct);
            continue;
        }
        const job = await jobRes.json().catch(() => ({}));
        if (job.status === 'ready') {
            onProgress?.('server_processing', 'Downloading your cutout…', 97);
            const fileRes = await fetch(`${CAPTIONS_WORKER_BASE}/matte/file/${jobId}?t=${encodeURIComponent(token)}`);
            if (!fileRes.ok) throw new Error('The cutout result was lost — try again.');
            return await fileRes.blob();
        }
        if (job.status === 'failed') {
            throw new Error(job.error || 'Server cutout failed.');
        }
        pct = Math.min(95, pct + 3);
        onProgress?.(
            job.queuedAhead ? 'queued' : 'server_processing',
            job.queuedAhead ? 'Waiting for a free server slot…' : 'Cutting out on the server…',
            pct,
        );
    }
}
