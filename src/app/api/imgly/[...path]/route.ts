import { NextRequest, NextResponse } from 'next/server';
import rawFallbackManifest from '@/lib/imgly-manifest-fallback.json';

/**
 * Same-origin proxy for the @imgly/background-removal engine resources
 * (isnet onnx model), which normally stream from staticimgly.com with NO
 * caching — the lib has zero built-in persistence, so every fresh visit
 * would re-download ~15MB. Chunks answer with `Cache-Control: immutable`
 * and the browser's disk cache carries the engine across sessions (works
 * in dev too, where the PWA service worker is intentionally unregistered).
 *
 * ── THE ORT VERSION BRIDGE ────────────────────────────────────────────────
 * @imgly bundles whichever onnxruntime-web the app resolves at build time
 * (ours: the 1.26.0-dev build @huggingface/transformers pins — and that
 * build is compiled jsep-always) but downloads the wasm binaries its data
 * package ships (1.21.0, matching @imgly's peerDependencies pin). Mismatched
 * JS glue + wasm binaries = "_OrtGetInputOutputMetadata is not a function"
 * on EVERY run — no amount of hard-refreshing fixes it.
 *
 * So this proxy rewrites resources.json: the /onnxruntime-web/* entries are
 * repointed at the exact jsep glue build we bundle, served straight from
 * the jsDelivr CDN (the same pin whisper-worker.ts uses). Those chunk names
 * are absolute URLs — `new URL(absolute, base)` ignores the publicPath —
 * and jsDelivr itself answers with year-long immutable CORS-enabled cache
 * headers, which also keeps the 27MB wasm off this edge function entirely.
 *
 * The lib byte-validates every chunk against the manifest
 * (`chunkSize !== blob.size` throws), so the rewritten entries carry the
 * REAL identity sizes of the pinned files (measured from node_modules —
 * jsDelivr's content-length can't be trusted here: undici requests gzip
 * and gets the COMPRESSED length while streaming the decompressed body).
 *
 * ── WHY /v2/ ─────────────────────────────────────────────────────────────
 * An earlier revision shipped resources.json itself with `immutable` —
 * browsers that visited then have the 1.21-era manifest pinned for a year
 * and will never re-fetch it. Bumping the publicPath to /api/imgly/v2/
 * (stripped below) sidesteps that poisoned cache entry; the manifest is now
 * `no-store` so future proxy fixes always reach visitors.
 *
 * ── NEVER-DOWN MANIFEST ───────────────────────────────────────────────────
 * Upstream (staticimgly) occasionally stalls or drops connections: without
 * a guard, a dead DNS/connect hung requests for 30–90s and every cutout in
 * the browser died on "Resource metadata not found". Now:
 *   - every upstream attempt is aborted after 12s (fail fast → the browser
 *     engine's fallback ladder can switch routes instead of hanging),
 *   - the freshly patched manifest is cached in process memory,
 *   - if upstream is unreachable we serve the last-known-good copy, and
 *     failing that a BUNDLED copy of the 1.7.0 manifest — the data package
 *     is version-pinned and immutable, so that copy can never go stale.
 *   The result: resources.json effectively never 502s, and users with the
 *   model chunks in their disk cache can cut even while upstream is down.
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const IMGLY_BASE = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
// MUST match the onnxruntime-web version resolved into the browser bundle —
// keep in sync with src/lib/captions/whisper-worker.ts (same pin, same CDN).
const ORT_JSDELIVR = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/';
const ORT_PREFIX = '/onnxruntime-web/';
// The onnxruntime-web bundle we ship is compiled jsep-always (its own dist
// hard-selects "ort-wasm-simd-threaded.jsep.mjs" even on the CPU/wasm path),
// while @imgly asks for the PLAIN simd-threaded names on its CPU path. Plain
// glue + jsep-built JS = the _OrtGetInputOutputMetadata crash. Answering
// every ort name with the jsep glue keeps JS and glue in agreement.
const ORT_GLUE = {
    mjs: { file: 'ort-wasm-simd-threaded.jsep.mjs', size: 46_490 },
    wasm: { file: 'ort-wasm-simd-threaded.jsep.wasm', size: 26_101_073 },
};
const ORT_KEYS = [
    'ort-wasm-simd-threaded.mjs',
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.jsep.mjs',
    'ort-wasm-simd-threaded.jsep.wasm',
];
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Timeouts are split by phase so slow-but-healthy connections are never killed:
 * - HEADERS_MS caps DNS+connect+response-headers (a stalled connect fails fast
 *   → the browser engine's fallback ladder can switch routes, not hang 90s).
 * - STALL_MS only aborts a DOWNLOADING BODY once NO bytes have flowed for this
 *   long — a 27MB wasm trickling at 200KB/s streams fine, a dead socket does
 *   not survive 45s of silence.
 */
const HEADERS_TIMEOUT_MS = 15_000;
const BODY_STALL_MS = 45_000;
const UPSTREAM_TRIES = 2;

/** Last-known-good manifests (process memory). */
let cachedRawManifest: string | null = null;
let cachedPatchedManifest: string | null = null;

function patchManifest(manifest: Record<string, unknown>): string {
    for (const key of ORT_KEYS) {
        const glue = key.endsWith('.mjs') ? ORT_GLUE.mjs : ORT_GLUE.wasm;
        manifest[`${ORT_PREFIX}${key}`] = {
            // absolute URL: the lib fetches it directly from jsDelivr
            // (immutable + CORS there), bypassing this function for 27MB files
            chunks: [{ name: `${ORT_JSDELIVR}${glue.file}`, offsets: [0, glue.size] }],
            size: glue.size,
            mime: key.endsWith('.mjs') ? 'text/javascript' : 'application/wasm',
        };
    }
    return JSON.stringify(manifest);
}

/**
 * staticimgly occasionally drops a connection mid-handshake; the engine
 * checksums every chunk and one failed fetch kills the whole cut. Each
 * attempt: bounded connect phase + stall-guarded body. Retrying twice keeps
 * worst-case latency bounded instead of the 30–90s stalls seen in the wild.
 * 4xx responses other than 429 are permanent — don't hammer them.
 */
async function fetchUpstream(url: string): Promise<Response> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < UPSTREAM_TRIES; attempt++) {
        try {
            const res = await fetchUpstreamOnce(url);
            if (res.ok) return res;
            lastError = new Error(`upstream ${res.status}`);
            if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        } catch (err) {
            lastError = err;
        }
        if (attempt < UPSTREAM_TRIES - 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }
    throw lastError instanceof Error ? lastError : new Error('upstream fetch failed');
}

async function fetchUpstreamOnce(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const connectTimer = setTimeout(() => ctrl.abort(), HEADERS_TIMEOUT_MS);
    let res: Response;
    try {
        res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    } finally {
        clearTimeout(connectTimer);
    }

    if (!res.body) return res;

    // Re-arm as a no-data stall watchdog while the body streams.
    let lastByte = Date.now();
    const watchdog = setInterval(() => {
        if (Date.now() - lastByte > BODY_STALL_MS) ctrl.abort();
    }, 5_000);

    const guarded = res.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                lastByte = Date.now();
                controller.enqueue(chunk);
            },
            flush() {
                clearInterval(watchdog);
            },
            cancel() {
                clearInterval(watchdog);
            },
        } as Transformer<Uint8Array, Uint8Array>),
    );

    return new Response(guarded, { status: res.status, headers: res.headers });
}

async function upstreamManifestText(): Promise<string> {
    if (cachedRawManifest) return cachedRawManifest;
    const upstream = await fetchUpstream(`${IMGLY_BASE}resources.json`);
    const text = await upstream.text();
    JSON.parse(text); // validate before caching
    cachedRawManifest = text;
    return text;
}

/**
 * PATCHED manifest (ORT entries → our bundled 1.26.0-dev jsep build) — for
 * the BUNDLED in-tab copy of @imgly, whose onnxruntime-web glue is the
 * version this app resolves at build time.
 */
async function patchedManifest(): Promise<string> {
    if (cachedPatchedManifest) return cachedPatchedManifest;
    try {
        cachedPatchedManifest = patchManifest(JSON.parse(await upstreamManifestText()) as Record<string, unknown>);
        return cachedPatchedManifest;
    } catch {
        // Upstream down → bundled immutable 1.7.0 copy.
        return patchManifest(rawFallbackManifest as Record<string, unknown>);
    }
}

/**
 * UNPATCHED manifest (ORT entries stay at the 1.21 pair the data package
 * ships) — for the CDN +esm copy of @imgly the Web Worker imports. jsDelivr's
 * +esm build inlines onnxruntime-web 1.21.0 glue, so feeding it the patched
 * 1.26 wasm caused "_OrtGetInputName is not a function" on every session
 * create AND poisoned the worker's cached WASM instance for all later
 * attempts. Served under /api/imgly/v2n/ — chunk URLs are identical to /v2/,
 * so the immutable browser cache is fully shared between both variants.
 */
async function unpatchedManifest(): Promise<string> {
    try {
        return await upstreamManifestText();
    } catch {
        return JSON.stringify(rawFallbackManifest);
    }
}

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } },
): Promise<NextResponse> {
    const params = await ctx.params;
    let segs = params.path ?? [];
    // Cache-generation prefix — see header. v2 = patched ORT manifest,
    // v2n = native/unpatched ORT manifest (version-matched for the CDN lib).
    const variant = segs[0] === 'v2' || segs[0] === 'v2n' ? segs[0] : null;
    if (variant) segs = segs.slice(1);
    const rel = segs.join('/');
    if (!rel || rel.includes('..')) {
        return new NextResponse('bad resource path', { status: 400 });
    }

    if (rel === 'resources.json') {
        const headers = new Headers();
        headers.set('content-type', 'application/json');
        // NOT immutable: this is the one file the proxy rewrites — future
        // engine fixes must be able to reach browsers that already visited.
        headers.set('cache-control', 'no-store');
        const body = variant === 'v2n' ? await unpatchedManifest() : await patchedManifest();
        return new NextResponse(body, { status: 200, headers });
    }

    // Model chunks + everything else: byte-exact passthrough from the
    // version-pinned data package (the lib checksums chunk sizes).
    const upstream = await fetchUpstream(IMGLY_BASE + rel);
    if (!upstream.body) {
        return new NextResponse('engine resource unavailable', { status: 502 });
    }

    const headers = new Headers();
    const type = upstream.headers.get('content-type');
    if (type) headers.set('content-type', type);
    headers.set('cache-control', IMMUTABLE);
    return new NextResponse(upstream.body, { status: 200, headers });
}
