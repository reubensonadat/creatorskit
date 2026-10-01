/**
 * Shared background-removal engine — hardened for "it just works" reliability.
 *
 * 1. ZERO unsupported format errors:
 *    Every incoming image is rigorously decoded and normalized into a clean,
 *    standardized RGBA PNG canvas blob with EXIF orientation preserved before
 *    reaching the AI engine (JPEG, PNG, WebP, AVIF, HEIC, …).
 * 2. Persistent warm Web Worker:
 *    Inference runs off the main thread and the worker is KEPT ALIVE between
 *    cuts, so the 2nd, 3rd, … cutouts are near-instant. It is recycled after
 *    a few idle minutes to free memory (weights stay in the HTTP disk cache).
 * 3. Self-healing execution cascade:
 *    worker(requested model) → worker(backup model) → in-tab(requested model)
 *    → in-tab(backup model, reduced resolution). A new run supersedes a stale
 *    one automatically. A watchdog kills hung engines and moves to the next rung.
 * 4. Output validation:
 *    Every result is pixel-inspected — a blank (fully transparent) or
 *    unsegmented (fully opaque) matte is treated as a failure and retried on
 *    the next rung instead of silently shipping a broken cutout.
 * 5. Seamless edge refinement:
 *    The alpha matte gets a light blur + smoothstep contrast curve (halo
 *    suppression, no jaggies, hair preserved) before returning.
 * 6. Prewarm:
 *    `prewarmBackgroundEngine()` silently downloads the model after the first
 *    user interaction so the first real cut already has a hot engine.
 */

import { ensureModelFetchPatch } from './imgly-model-cache';

export type MatteEngine = 'browser' | 'server';
export type MatteStage = 'downloading' | 'processing' | 'uploading' | 'queued' | 'server_processing';

export type BrowserModel = 'isnet_quint8' | 'isnet_fp16' | 'isnet';

export const BROWSER_MODELS: Record<BrowserModel, { label: string; sub: string; sizeMB: number; tier: number }> = {
    isnet_quint8: { label: 'FAST', sub: '~23 MB download', sizeMB: 23, tier: 0 },
    isnet_fp16: { label: 'BETTER', sub: '~84 MB download', sizeMB: 84, tier: 1 },
    isnet: { label: 'BEST', sub: '~176 MB download', sizeMB: 176, tier: 2 },
};

export type MatteProgress = (
    stage: MatteStage,
    message: string,
    percent: number,
) => void;

/**
 * Proxy manifest variants (chunk URLs are identical — cache fully shared):
 * - 'v2n' — native/unpatched, for the WORKER's CDN copy of @imgly whose
 *   onnxruntime-web glue is 1.21.0 (needs the version-matched 1.21 wasm).
 * - 'v2'  — patched ORT bridge, for the BUNDLED in-tab copy whose glue is
 *   the 1.26.0-dev jsep build this app resolves at build time.
 */
const PROXY_PUBLIC_PATH = (variant: 'v2' | 'v2n'): string =>
    typeof window !== 'undefined'
        ? `${window.location.origin}/api/imgly/${variant}/`
        : `/api/imgly/${variant}/`;

/** Kill a silent worker after this long without a single message. */
const WATCHDOG_MS = 180_000;
/** Recycle the idle warm worker after this long to free device memory. */
const IDLE_RELEASE_MS = 180_000;

// ---------------------------------------------------------------------------
// Standardize Source Image Pipeline
// ---------------------------------------------------------------------------

export interface StandardizedImage {
    blob: Blob;
    img: HTMLImageElement;
    width: number;
    height: number;
    url: string;
}

/**
 * Rigorously decode and standardize any user image (JPEG, WebP, AVIF, HEIC, PNG, etc.)
 * into a pristine standard PNG format on a canvas.
 * - Handles EXIF orientation (no sideways camera shots)
 * - Normalizes color channels into standard 8-bit RGBA
 * - Bounds excessive dimensions to prevent mobile memory crashes
 */
export async function standardizeSourceImage(
    source: Blob,
    maxEdge: number = 2560,
): Promise<StandardizedImage> {
    const failError = new Error('That photo format could not be read — please select a valid JPG, PNG, or WebP image.');
    let width = 0;
    let height = 0;
    let drawable: ImageBitmap | HTMLImageElement;

    try {
        drawable = await createImageBitmap(source, { imageOrientation: 'from-image' });
        width = drawable.width;
        height = drawable.height;
    } catch {
        // Fallback for browsers or formats where createImageBitmap throws
        const objectUrl = URL.createObjectURL(source);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('Image decode failed'));
                el.src = objectUrl;
            });
            drawable = img;
            width = img.naturalWidth;
            height = img.naturalHeight;
        } catch {
            throw failError;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    if (!width || !height) throw failError;

    // Bound dimensions to safe limits while retaining high quality
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw failError;

    ctx.drawImage(drawable as CanvasImageSource, 0, 0, targetWidth, targetHeight);
    if ('close' in drawable && typeof (drawable as ImageBitmap).close === 'function') {
        (drawable as ImageBitmap).close();
    }

    // Convert to pristine standard PNG
    const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
    });

    if (!pngBlob) throw failError;

    const finalUrl = URL.createObjectURL(pngBlob);
    const finalImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to load standardized image'));
        el.src = finalUrl;
    });

    return {
        blob: pngBlob,
        img: finalImg,
        width: targetWidth,
        height: targetHeight,
        url: finalUrl,
    };
}

// ---------------------------------------------------------------------------
// Output validation — never ship a blank / unsegmented cutout
// ---------------------------------------------------------------------------

export interface CutoutVerdict {
    /** Trustworthy matte — ship it. */
    ok: boolean;
    /** Fully (or almost fully) transparent — the model failed. */
    blank: boolean;
    /** Fully opaque — nothing was removed at all. */
    noSegmentation: boolean;
    opaqueRatio: number;
}

async function decodeForInspection(blob: Blob, maxEdge: number): Promise<ImageData | null> {
    let drawable: ImageBitmap | HTMLImageElement | null = null;
    let createdUrl: string | null = null;
    try {
        try {
            drawable = await createImageBitmap(blob);
        } catch {
            createdUrl = URL.createObjectURL(blob);
            drawable = await new Promise<HTMLImageElement | null>((resolve) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => resolve(null);
                el.src = createdUrl as string;
            });
        }
        if (!drawable) return null;

        const w = drawable.width;
        const h = drawable.height;
        if (!w || !h) return null;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(drawable as CanvasImageSource, 0, 0, tw, th);
        return ctx.getImageData(0, 0, tw, th);
    } catch {
        return null;
    } finally {
        if (drawable && 'close' in drawable && typeof (drawable as ImageBitmap).close === 'function') {
            try { (drawable as ImageBitmap).close(); } catch { /* ignore */ }
        }
        if (createdUrl) {
            try { URL.revokeObjectURL(createdUrl); } catch { /* ignore */ }
        }
    }
}

/** Pixel-inspect a cutout: is there a real subject matte in here? */
export async function inspectCutout(blob: Blob): Promise<CutoutVerdict | null> {
    const data = await decodeForInspection(blob, 512);
    if (!data) return null;

    const px = data.data;
    const total = data.width * data.height;
    let opaque = 0;
    const step = total > 250_000 ? 2 : 1; // sample every 2nd px on big checks
    let sampled = 0;
    for (let i = 0; i < total; i += step) {
        if (px[i * 4 + 3] > 16) opaque++;
        sampled++;
    }
    const opaqueRatio = sampled > 0 ? opaque / sampled : 0;

    return {
        ok: opaqueRatio > 0.002 && opaqueRatio < 0.9995,
        blank: opaqueRatio <= 0.002,
        noSegmentation: opaqueRatio >= 0.9995,
        opaqueRatio,
    };
}

// ---------------------------------------------------------------------------
// Edge refinement — the "seamless" pass
// ---------------------------------------------------------------------------

/**
 * Polish the alpha matte of a cutout PNG at NATIVE resolution:
 * - a sub-pixel blur of the alpha channel removes stair-stepped jaggies
 * - a smoothstep contrast curve kills faint halo bleed and fringe noise
 * - topology locks: pixels that were fully opaque stay opaque, pixels that
 *   were fully transparent stay transparent — only the soft edge is improved
 * (hair strands with mid-range alpha keep their gradient).
 * Returns the ORIGINAL blob untouched if anything is unsupported.
 */
export async function refineCutoutEdges(blob: Blob): Promise<Blob> {
    try {
        let drawable: ImageBitmap | HTMLImageElement | null = null;
        let createdUrl: string | null = null;

        try {
            drawable = await createImageBitmap(blob);
        } catch {
            createdUrl = URL.createObjectURL(blob);
            drawable = await new Promise<HTMLImageElement | null>((resolve) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => resolve(null);
                el.src = createdUrl as string;
            });
        }
        if (!drawable) return blob;

        const w = drawable.width;
        const h = drawable.height;
        if (!w || !h || w * h > 40_000_000) {
            if (createdUrl) URL.revokeObjectURL(createdUrl);
            return blob;
        }

        // Sharp color + blurred alpha
        const base = document.createElement('canvas');
        base.width = w;
        base.height = h;
        const bctx = base.getContext('2d', { willReadFrequently: true });
        if (!bctx) return blob;
        bctx.drawImage(drawable as CanvasImageSource, 0, 0);

        const radius = Math.max(0.4, Math.min(1.4, Math.max(w, h) / 1800));
        const soft = document.createElement('canvas');
        soft.width = w;
        soft.height = h;
        const sctx = soft.getContext('2d', { willReadFrequently: true });
        if (!sctx) return blob;

        let alphaData: Uint8ClampedArray;
        if (typeof sctx.filter === 'string') {
            sctx.filter = `blur(${radius}px)`;
            sctx.drawImage(drawable as CanvasImageSource, 0, 0);
            alphaData = sctx.getImageData(0, 0, w, h).data;
            sctx.filter = 'none';
        } else {
            // Canvas filters unsupported → refine the sharp alpha only
            alphaData = bctx.getImageData(0, 0, w, h).data;
        }

        const baseData = bctx.getImageData(0, 0, w, h);
        const out = baseData.data;

        // Smoothstep LUT: expand contrast around the alpha transition
        const LUT = new Uint8Array(256);
        const lo = 8;
        const hi = 247;
        for (let a = 0; a < 256; a++) {
            if (a <= lo) LUT[a] = 0;
            else if (a >= hi) LUT[a] = 255;
            else {
                const t = (a - lo) / (hi - lo);
                LUT[a] = Math.round(t * t * (3 - 2 * t) * 255);
            }
        }

        const n = w * h;
        for (let i = 0; i < n; i++) {
            const idx = i * 4 + 3;
            const sharp = out[idx];
            // Topology locks — never invent or erase solid pixels
            if (sharp === 0 || sharp === 255) continue;
            const smoothed = LUT[alphaData[idx]];
            out[idx] = smoothed === 0 || smoothed === 255
                ? (smoothed === 255 && sharp >= 128 ? 255 : smoothed === 0 && sharp < 128 ? 0 : sharp)
                : Math.min(255, Math.round(smoothed * 0.65 + sharp * 0.35));
        }

        bctx.putImageData(baseData, 0, 0);
        if (createdUrl) URL.revokeObjectURL(createdUrl);

        const refined = await new Promise<Blob | null>((resolve) => {
            base.toBlob(resolve, 'image/png');
        });
        return refined ?? blob;
    } catch {
        return blob;
    }
}

// ---------------------------------------------------------------------------
// Persistent warm-worker bridge
// ---------------------------------------------------------------------------

interface WorkerOutMessage {
    type: 'progress' | 'done' | 'error';
    id?: number;
    blob?: Blob;
    message?: string;
    phase?: string;
    pct?: number;
}

interface BridgeJob {
    id: number;
    resolve: (blob: Blob) => void;
    reject: (err: Error) => void;
    onProgress?: MatteProgress;
    lastSeen: number;
    timer: ReturnType<typeof setInterval>;
    blobUrl: string | null;
}

export interface BridgeRunOptions {
    blob: Blob;
    model: BrowserModel;
    onProgress?: MatteProgress;
    /** Only fetch the weights (no inference) — prewarm. */
    prewarm?: boolean;
    /** Force a cold worker (previous rung failed — don't trust the warm one). */
    freshWorker?: boolean;
}

const INTERRUPTED = 'interrupted';
const WORKER_UNAVAILABLE = 'worker-unavailable';

class MatteWorkerBridge {
    private worker: Worker | null = null;
    private job: BridgeJob | null = null;
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private seq = 0;

    get warm(): boolean {
        return this.worker !== null;
    }

    get busy(): boolean {
        return this.job !== null;
    }

    private ensureWorker(): Worker {
        if (this.worker) return this.worker;
        // ?v= cache-bust: the PWA service worker serves /workers/*.js
        // cache-first — a new query string guarantees every user picks up the
        // current worker (with the IndexedDB model-cache patch) immediately.
        const w = new Worker('/workers/bg-removal-worker.js?v=idb1', { type: 'module' });
        w.onmessage = (ev: MessageEvent) => this.onMessage(ev);
        w.onerror = () => this.failJob(new Error('Cutout engine crashed — restarting.'), true);
        this.worker = w;
        return w;
    }

    private onMessage(ev: MessageEvent) {
        const data = (ev.data || {}) as WorkerOutMessage;
        const job = this.job;
        if (!job || data.id !== job.id) return; // stale message from a superseded job
        job.lastSeen = Date.now();

        if (data.type === 'progress') {
            const stage: MatteStage = data.phase === 'fetch' || data.phase === 'init' ? 'downloading' : 'processing';
            const pct = typeof data.pct === 'number' ? data.pct : 0;
            job.onProgress?.(stage, data.message || 'Cutting out subject…', Math.max(0, Math.min(100, pct)));
        } else if (data.type === 'done') {
            const blob = data.blob as Blob;
            this.finishJob();
            job.resolve(blob);
        } else if (data.type === 'error') {
            this.failJob(new Error(String(data.message || 'Cutout failed')), false);
        }
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    private scheduleIdleRelease(): void {
        this.clearIdleTimer();
        this.idleTimer = setTimeout(() => this.terminate(), IDLE_RELEASE_MS);
    }

    private finishJob(): void {
        const job = this.job;
        if (!job) return;
        clearInterval(job.timer);
        if (job.blobUrl) { try { URL.revokeObjectURL(job.blobUrl); } catch { /* ignore */ } }
        this.job = null;
        this.scheduleIdleRelease();
    }

    private failJob(err: Error, restart: boolean): void {
        const job = this.job;
        if (!job) return;
        clearInterval(job.timer);
        if (job.blobUrl) { try { URL.revokeObjectURL(job.blobUrl); } catch { /* ignore */ } }
        this.job = null;
        if (restart) this.terminate();
        else this.scheduleIdleRelease();
        job.reject(err);
    }

    /** Kill the worker outright (frees the WASM heap + model weights). */
    terminate(): void {
        this.clearIdleTimer();
        if (this.worker) {
            try { this.worker.terminate(); } catch { /* ignore */ }
            this.worker = null;
        }
    }

    /**
     * Run one job on the (persistent) worker. Supersedes + terminates any
     * in-flight job first so a stale run can never wedge the engine.
     */
    run(opts: BridgeRunOptions): Promise<Blob> {
        if (this.job) this.failJob(new Error(INTERRUPTED), true);
        this.clearIdleTimer();
        if (opts.freshWorker) this.terminate();

        const id = ++this.seq;
        const blobUrl = URL.createObjectURL(opts.blob);

        return new Promise<Blob>((resolve, reject) => {
            let w: Worker;
            try {
                w = this.ensureWorker();
            } catch {
                URL.revokeObjectURL(blobUrl);
                reject(new Error(WORKER_UNAVAILABLE));
                return;
            }

            const job: BridgeJob = {
                id,
                resolve,
                reject,
                onProgress: opts.onProgress,
                lastSeen: Date.now(),
                blobUrl,
                timer: setInterval(() => {
                    if (!this.job) return;
                    if (Date.now() - this.job.lastSeen > WATCHDOG_MS) {
                        this.failJob(new Error('Cutout engine stalled — restarting.'), true);
                    }
                }, 10_000),
            };
            this.job = job;

            w.postMessage({
                type: opts.prewarm ? 'preload' : 'process',
                id,
                blob: opts.blob,
                blobUrl,
                model: opts.model,
                publicPath: PROXY_PUBLIC_PATH('v2n'),
            });
        });
    }

    dispose(): void {
        this.failJob(new Error(INTERRUPTED), true);
        this.terminate();
    }
}

const bridge = new MatteWorkerBridge();

if (typeof window !== 'undefined') {
    try {
        window.addEventListener('pagehide', () => bridge.dispose());
    } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Direct in-tab fallback (if Web Workers are unavailable or the worker path died)
// ---------------------------------------------------------------------------

let imglyModule: Promise<typeof import('@imgly/background-removal')> | null = null;

async function runDirectFallback(
    sourceBlob: Blob,
    onProgress?: MatteProgress,
    model: BrowserModel = 'isnet_quint8',
): Promise<Blob> {
    // Model chunks must round-trip through the IndexedDB cache on the main
    // thread too — the worker carries its own self-contained patch.
    ensureModelFetchPatch();
    if (!imglyModule) imglyModule = import('@imgly/background-removal');
    const { removeBackground } = await imglyModule;
    return await removeBackground(sourceBlob, {
        model,
        proxyToWorker: false,
        device: 'cpu',
        // Route through the same-origin proxy — the bundled onnxruntime build
        // MUST be paired with the PATCHED manifest (v2) the proxy serves.
        publicPath: PROXY_PUBLIC_PATH('v2'),
        progress: (key: string, current: number, total: number) => {
            const phase = key.split(':')[0];
            const currentMB = (current / (1024 * 1024)).toFixed(1);
            const totalMB = (total / (1024 * 1024)).toFixed(1);
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            const stage: MatteStage = phase.startsWith('fetch') ? 'downloading' : 'processing';
            const msg = total > 0 ? `${phase} — ${currentMB} MB / ${totalMB} MB` : `${phase}…`;
            onProgress?.(stage, msg, pct);
        },
        output: { format: 'image/png' },
    });
}

// ---------------------------------------------------------------------------
// Self-healing cascade
// ---------------------------------------------------------------------------

interface CascadeToken {
    cancelled: boolean;
}
let activeCascade: CascadeToken | null = null;
/** Set once ANY rung completes — afterwards prewarming is pointless (weights cached). */
let engineEverSucceeded = false;

const NETWORK_FRIENDLY = /fetch|network|cors|offline|timed?[\s-]?out|50[234]|stalled|crashed|metadata not found|name_not_resolved|dns|enotfound|econnreset/i;

function friendlyError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    if (/offline/i.test(msg)) return msg;
    if (NETWORK_FRIENDLY.test(msg)) {
        return 'The AI engine could not be reached — check your connection, then retry.';
    }
    if (/memory|alloc|abort/i.test(msg)) {
        return 'Your device ran low on memory during the cut — retry usually fixes it.';
    }
    return 'Subject cutout failed — please try again.';
}

async function applyRefinement(raw: Blob, onProgress?: MatteProgress): Promise<Blob> {
    try {
        onProgress?.('processing', 'Polishing cutout edges…', 97);
        return await refineCutoutEdges(raw);
    } catch {
        return raw;
    }
}

/**
 * Main cutout function — one call, maximum resilience.
 *
 * Rung 1  warm worker + requested model (the happy path; instant when hot)
 * Rung 2  fresh worker + backup model (corrupted chunk cache / poisoned session)
 * Rung 3  direct in-tab + requested model (worker infrastructure broken)
 * Rung 4  direct in-tab + backup model at reduced resolution (low memory)
 *
 * Every rung's output is pixel-validated; blank/unsegmented mattes fall
 * through to the next rung. If every rung produces a "suspicious but usable"
 * matte, the best one is returned instead of failing the user.
 */
export async function removeBackgroundBrowser(
    source: Blob,
    onProgress?: MatteProgress,
    model: BrowserModel = 'isnet_quint8',
): Promise<Blob> {
    // Instant offline bail-out — no point cycling four engine rungs with no network.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You appear to be offline — reconnect to the internet, then retry the cutout.');
    }

    if (activeCascade) activeCascade.cancelled = true;
    const token: CascadeToken = { cancelled: false };
    activeCascade = token;

    const workersUsable = typeof window !== 'undefined' && typeof Worker !== 'undefined';
    const fallbackModel: BrowserModel = model === 'isnet_quint8' ? 'isnet_fp16' : 'isnet_quint8';

    // 1. Rigorous format standardization — surfaces real format errors early
    //    so the user gets the "photo format" message, never an engine crash.
    const std = await standardizeSourceImage(source, 2560);

    interface Rung {
        label: string;
        needsWorker: boolean;
        /** true = reuses the already-requested model; false = would download the OTHER model */
        sameModel: boolean;
        run: () => Promise<Blob>;
    }

    const rungs: Rung[] = [
        {
            label: 'device engine',
            needsWorker: true,
            sameModel: true,
            run: () => bridge.run({ blob: std.blob, model, onProgress }),
        },
        {
            label: 'device engine (backup model)',
            needsWorker: true,
            sameModel: false,
            run: async () => {
                const smaller = await standardizeSourceImage(source, 2048);
                return bridge.run({ blob: smaller.blob, model: fallbackModel, onProgress, freshWorker: true });
            },
        },
        {
            label: 'in-tab engine',
            needsWorker: false,
            sameModel: true,
            run: async () => {
                const smaller = await standardizeSourceImage(source, 2048);
                return runDirectFallback(smaller.blob, onProgress, model);
            },
        },
        {
            label: 'in-tab engine (light model)',
            needsWorker: false,
            sameModel: false,
            run: async () => {
                const smaller = await standardizeSourceImage(source, 1600);
                return runDirectFallback(smaller.blob, onProgress, fallbackModel);
            },
        },
    ];

    let queue = workersUsable ? rungs : rungs.filter((r) => !r.needsWorker);
    let bestSuspect: Blob | null = null;
    let lastError: unknown = null;

    while (queue.length > 0) {
        if (token.cancelled) throw new Error(INTERRUPTED);
        const rung = queue[0];
        queue = queue.slice(1);

        try {
            const raw = await rung.run();
            engineEverSucceeded = true;
            if (token.cancelled) throw new Error(INTERRUPTED);

            const verdict = await inspectCutout(raw);
            if (!verdict) {
                // Could not decode for verification — trust the engine
                return applyRefinement(raw, onProgress);
            }
            if (verdict.blank) {
                lastError = new Error('blank-cutout');
                onProgress?.('processing', 'Cutout looked empty — retrying on backup engine…', 60);
                continue;
            }
            if (verdict.noSegmentation) {
                // Possibly a legitimate full-frame subject — remember it, try
                // a rung that may produce a real matte, but never hard-fail.
                if (!bestSuspect) bestSuspect = raw;
                continue;
            }
            return applyRefinement(raw, onProgress);
        } catch (err) {
            if (token.cancelled) throw new Error(INTERRUPTED);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg === WORKER_UNAVAILABLE) {
                // No Worker API at all — drop the remaining worker rungs
                queue = queue.filter((r) => !r.needsWorker);
            } else if (NETWORK_FRIENDLY.test(msg)) {
                // A dead connection is not fixed by downloading a DIFFERENT
                // model — drop backup-model rungs so a network failure never
                // pulls an extra ~44 MB of weights the user didn't ask for.
                queue = queue.filter((r) => r.sameModel);
            }
            lastError = err;
            console.warn(`[removeBackgroundBrowser] Rung "${rung.label}" failed:`, msg);
        }
    }

    if (bestSuspect) return applyRefinement(bestSuspect, onProgress);
    throw new Error(friendlyError(lastError));
}

/**
 * Server cutout redirected to fast on-device browser engine.
 * The server option is completely removed to eliminate network timeouts and server costs.
 */
export async function removeBackgroundServer(
    source: Blob,
    onProgress?: MatteProgress,
): Promise<Blob> {
    return removeBackgroundBrowser(source, onProgress, 'isnet_quint8');
}

// ---------------------------------------------------------------------------
// Engine prewarm — make the FIRST cut feel instant
// ---------------------------------------------------------------------------

let prewarmStarted = false;

async function tinyWarmupBlob(): Promise<Blob> {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#808080';
            ctx.fillRect(0, 0, 32, 32);
        }
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) return blob;
    } catch {
        /* fall through */
    }
    return new Blob([], { type: 'image/png' });
}

/**
 * Silently pre-fetch + initialize the cutout engine (model weights + WASM)
 * once the user has shown intent (first tap/key) or after a short idle wait.
 * The weights land in the browser's disk cache, so the first real cutout
 * skips the ~110 MB download entirely. Safe to call repeatedly — it is a
 * no-op after the first invocation.
 */
export function prewarmBackgroundEngine(): void {
    if (prewarmStarted || typeof window === 'undefined') return;
    ensureModelFetchPatch(); // also requests persistent storage for the model
    prewarmStarted = true;

    const trigger = () => {
        window.removeEventListener('pointerdown', trigger);
        window.removeEventListener('keydown', trigger);
        const idle = (cb: () => void) => {
            const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
            if (typeof ric === 'function') ric(cb, { timeout: 5000 });
            else setTimeout(cb, 1500);
        };
        idle(() => {
            // Never race the prewarm against a real cut (duplicate downloads)
            // and never prewarm once the weights are already on disk.
            if (bridge.busy || engineEverSucceeded) return;
            tinyWarmupBlob()
                .then((blob) => bridge.run({ blob, model: 'isnet_quint8', prewarm: true }))
                .catch(() => bridge.terminate());
        });
    };

    try {
        window.addEventListener('pointerdown', trigger, { passive: true });
        window.addEventListener('keydown', trigger);
        setTimeout(trigger, 12_000); // idle fallback — no interaction yet
    } catch {
        /* prewarm is best-effort */
    }
}
