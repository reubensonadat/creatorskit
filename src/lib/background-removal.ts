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

/** The three IS-Net model variants shipped by @imgly/background-removal.
 * sizeMB values are the REAL CDN manifest sizes (44.3/88.2/176.1 MB —
 * resources.json chunks them into 4MB hash-named pieces). tier orders the
 * models for the cache rule: use a higher one → the lower ones' weights
 * are evicted from IndexedDB. The choice syncs across tools via the
 * ck_bgrem_quality_v1 localStorage key. */
export type BrowserModel = 'isnet_quint8' | 'isnet_fp16' | 'isnet';

export const BROWSER_MODELS: Record<BrowserModel, { label: string; sub: string; sizeMB: number; tier: number }> = {
    isnet_quint8: { label: 'FAST',   sub: '~44 MB download', sizeMB: 44, tier: 0 },
    isnet_fp16:  { label: 'BETTER', sub: '~88 MB download', sizeMB: 88, tier: 1 },
    isnet:       { label: 'BEST',   sub: '~176 MB download', sizeMB: 176, tier: 2 },
};

export type MatteProgress = (
    stage: MatteStage,
    message: string,
    percent: number,
) => void;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const MATTE_POLL_MS = 1500;

// ---------------------------------------------------------------------------
// Browser engine — @imgly/background-removal (already a dependency).
// Downloads its WASM weights from CDN on first use, keeps them in IndexedDB
// (see ENGINE CACHE below), then runs fully offline.
// ---------------------------------------------------------------------------

let imglyModule: Promise<typeof import('@imgly/background-removal')> | null = null;

/**
 * Decode + normalize a source photo BEFORE either engine touches it.
 * - unreadable formats (HEIC etc.) fail HERE with a friendly message instead
 *   of "The source image could not be decoded" deep inside the engine
 * - EXIF orientation is applied, so phone portraits point the right way
 * - maxEdge cap shrinks 50MP phone monsters → fast engine runs and server
 *   uploads of ~1MB instead of tens of MB (big slow uploads are what die
 *   as "connection lost" on mobile networks)
 */
async function normalizeSourceBlob(
    source: Blob,
    maxEdge: number,
    type: 'image/png' | 'image/jpeg',
): Promise<Blob> {
    const fail = new Error('That photo format cannot be read in the browser — save it as JPG or PNG and try again.');
    let width = 0;
    let height = 0;
    let drawable: ImageBitmap | HTMLImageElement;
    try {
        drawable = await createImageBitmap(source, { imageOrientation: 'from-image' });
        width = drawable.width;
        height = drawable.height;
    } catch {
        // older browsers: <img> honors EXIF orientation by default
        const url = URL.createObjectURL(source);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('decode failed'));
                el.src = url;
            });
            drawable = img;
            width = img.naturalWidth;
            height = img.naturalHeight;
        } catch {
            throw fail;
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    if (!width || !height) throw fail;

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw fail;
    ctx.drawImage(drawable as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if ('close' in drawable && typeof drawable.close === 'function') drawable.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) throw fail;
    return blob;
}

// ---------------------------------------------------------------------------
// ENGINE CACHE — IndexedDB, not the HTTP cache.
//
// The engine files (~13MB isnet model + ~26MB ort glue) are immutable, but
// the HTTP disk cache is an eviction lottery: the browser can drop them after
// days of disuse or under storage pressure, and the next visit silently
// re-downloads everything. This IDB cache survives eviction, is shared by
// every tool that cuts on device (/text-behind and /background-replace both
// end up here), and asks for persistent storage on first use.
// ---------------------------------------------------------------------------

const ENGINE_DB = 'ck_engine_cache';
const ENGINE_STORE = 'files';

function engineDbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(ENGINE_DB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(ENGINE_STORE)) req.result.createObjectStore(ENGINE_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function engineCacheGet(url: string): Promise<Blob | null> {
    try {
        const db = await engineDbOpen();
        const blob = await new Promise<Blob | null>((resolve) => {
            const get = db.transaction(ENGINE_STORE, 'readonly').objectStore(ENGINE_STORE).get(url);
            get.onsuccess = () => resolve(get.result instanceof Blob ? get.result : null);
            get.onerror = () => resolve(null);
        });
        db.close();
        return blob;
    } catch {
        return null; // IDB unavailable (private mode…) → plain network fetch
    }
}

async function engineCachePut(url: string, blob: Blob): Promise<void> {
    try {
        const db = await engineDbOpen();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(ENGINE_STORE, 'readwrite');
            tx.objectStore(ENGINE_STORE).put(blob, url);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        /* best-effort — a cache miss just means a re-download */
    }
}

/**
 * Engine files are immutable, so keying by URL is safe forever.
 * resources.json is EXCLUDED on purpose: it is the (no-store) manifest that
 * points at the files — it must always be revalidated so fixes propagate.
 */
function isEngineUrl(url: string): boolean {
    if (url.endsWith('resources.json')) return false;
    return (
        url.startsWith(`${location.origin}/api/imgly/`) ||
        url.startsWith('https://cdn.jsdelivr.net/npm/onnxruntime-web@')
    );
}

let fetchPatchDepth = 0;
let originalFetch: typeof fetch | null = null;

const patchedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const real = originalFetch ?? window.fetch.bind(window);
    if (method !== 'GET' || !isEngineUrl(url)) return real(input, init);
    // serve from IDB when we have it — but NEVER let a cache hiccup kill the
    // fetch: any failure here just falls through to the network
    try {
        const cached = await engineCacheGet(url);
        if (cached) return new Response(cached, { status: 200, statusText: 'OK' });
    } catch {
        /* cache read failed — go to network */
    }
    let res: Response;
    try {
        res = await real(input, init);
    } catch {
        // one retry — the ~26MB glue files blip on mobile networks all the time
        await sleep(1500);
        try {
            res = await real(input, init);
        } catch {
            // tag the URL so the user-facing error says WHICH file died
            throw new TypeError(`Failed to fetch ${url}`);
        }
    }
    if (res.ok) {
        try {
            const copy = res.clone();
            void copy.blob().then((b) => engineCachePut(url, b)).catch(() => {});
        } catch {
            /* body already consumed — skip caching */
        }
    }
    return res;
};

/**
 * Run `fn` (the @imgly call) with window.fetch patched to serve engine files
 * from IndexedDB. Depth-counted so overlapping cuts never restore the wrong
 * original — the patch installs on the outermost run and uninstalls when it
 * finishes.
 */
async function withEngineCache<T>(fn: () => Promise<T>): Promise<T> {
    if (fetchPatchDepth === 0) {
        originalFetch = window.fetch.bind(window);
        window.fetch = patchedFetch;
        // best-effort: ask the browser not to evict our engine under pressure
        try {
            void navigator.storage?.persist?.();
        } catch {
            /* not supported — fine */
        }
    }
    fetchPatchDepth++;
    try {
        return await fn();
    } finally {
        fetchPatchDepth--;
        if (fetchPatchDepth === 0 && originalFetch) {
            window.fetch = originalFetch;
            originalFetch = null;
        }
    }
}

// (Model tiers: see BROWSER_MODELS at the top of this file.)

/**
 * When a higher-tier model is used, delete the lower tiers' weight chunks
 * from the engine cache so storage stays bounded (the shared ORT wasm and
 * the kept model's chunks are untouched). Model weights are cached under
 * content-hash chunk URLs, so the fresh manifest is re-read to learn which
 * hashes belong to the lower models before deleting.
 */
async function evictLowerModels(keep: BrowserModel): Promise<void> {
    const lower = (Object.keys(BROWSER_MODELS) as BrowserModel[]).filter(
        (m) => BROWSER_MODELS[m].tier < BROWSER_MODELS[keep].tier,
    );
    if (lower.length === 0) return;
    try {
        const res = await fetch(`${location.origin}/api/imgly/v2/resources.json`, { cache: 'no-store' });
        if (!res.ok) return;
        const manifest = (await res.json()) as Record<string, { chunks?: { name: string }[] }>;
        const doomed = new Set<string>();
        for (const key of lower) {
            for (const chunk of manifest[`/models/${key}`]?.chunks ?? []) doomed.add(chunk.name);
        }
        if (doomed.size === 0) return;
        const db = await engineDbOpen();
        await new Promise<void>((resolve) => {
            const tx = db.transaction(ENGINE_STORE, 'readwrite');
            const cursorReq = tx.objectStore(ENGINE_STORE).openCursor();
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (!cursor) return;
                const url = String(cursor.key);
                if (doomed.has(url.slice(url.lastIndexOf('/') + 1))) cursor.delete();
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        db.close();
    } catch {
        /* eviction is a storage optimization — never fail a cut over it */
    }
}

export async function removeBackgroundBrowser(
    source: Blob,
    onProgress?: MatteProgress,
    model: BrowserModel = 'isnet_quint8',
): Promise<Blob> {
    if (!imglyModule) imglyModule = import('@imgly/background-removal');
    const { removeBackground } = await imglyModule;
    // Normalize first: exotic containers fail here with a clear message,
    // EXIF orientation is baked in, and giant photos shrink before inference.
    const normalized = await normalizeSourceBlob(source, 2048, 'image/png');
    try {
        // withEngineCache: every engine fetch below is served from IndexedDB
        // once downloaded — the second cut (here or in /text-behind) starts
        // instantly even if the HTTP cache was evicted.
        const out = await withEngineCache(() => removeBackground(normalized, {
            // Same-origin proxy (src/app/api/imgly/v2) — rewrites the manifest
            // so the ort glue matches this ort build, and serves immutable
            // cache headers. publicPath must be absolute: the lib resolves
            // every resource with new URL(rel, base). /v2/ is a
            // cache-generation bump — v1 was pinned immutable for a year.
            publicPath: `${window.location.origin}/api/imgly/v2/`,
            model,
            // CPU path — device:'gpu' is a dead end here: @imgly's WebGPU
            // code targets ort 1.21's API and this ort build renamed the
            // init (webgpuInit is not a function → no available backend).
            // Note: @imgly forces main-thread inference on its CPU path, so
            // the tab pauses briefly during the actual cut — CUT ON SERVER
            // is the freeze-free option.
            device: 'cpu',
            proxyToWorker: false,
            // v1.7 API: progress(key, current, total) — 'fetch:*' keys are the
            // one-time engine download; everything else is inference.
            progress: (key: string, current: number, total: number) => {
                const pct = total > 0 ? Math.round((current / total) * 100) : 0;
                if (key.startsWith('fetch')) {
                    const { label, sizeMB } = BROWSER_MODELS[model];
                    onProgress?.('downloading', `Downloading the ${label} engine (~${sizeMB} MB, one time)…`, pct);
                } else {
                    onProgress?.('processing', 'Cutting out the subject…', pct);
                }
            },
            output: { format: 'image/png' },
        }));
        // used a higher-tier model → drop the lower tiers' weights from the
        // engine cache (shared ORT wasm stays; both tools share one cache)
        if (BROWSER_MODELS[model].tier > 0) void evictLowerModels(model);
        return out;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Engine-start failures (ort glue/wasm mismatch, resource fetch
        // problems). Honest message — the old "hard-refresh" advice was a
        // misdiagnosis and sent the user refreshing 30+ times for nothing.
        // The real error rides along in parens so a failure screenshot is
        // immediately diagnosable.
        if (/publicPath|Failed to create session|_Ort|Failed to fetch/i.test(message)) {
            throw new Error(
                `The on-device cutout engine could not start in this browser — use CUT ON SERVER instead (or upload your own PNG). (${message.slice(0, 160)})`,
            );
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
    // Downscale + JPEG before upload: ~1MB instead of tens of MB, so the
    // upload survives slow mobile links (and fails fast on unreadable files).
    const upload = await normalizeSourceBlob(source, 2048, 'image/jpeg');
    const form = new FormData();
    form.append('file', upload, 'image.jpg');
    const uploadUrl = `${CAPTIONS_WORKER_BASE}/matte?ticket=${encodeURIComponent(ticket)}`;
    const doUpload = () => fetch(uploadUrl, { method: 'POST', body: form });
    let startRes: Response;
    try {
        startRes = await doUpload();
    } catch {
        // free-tier wake-up wobble or mid-deploy blip — one retry
        await sleep(2500);
        startRes = await doUpload().catch(() => {
            throw new Error('Connection lost while uploading — the cutout server may be waking up or redeploying. Give it a minute and try again.');
        });
    }

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
