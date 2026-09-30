import { NextRequest, NextResponse } from 'next/server';

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

async function patchedManifest(): Promise<string> {
    const upstream = await fetch(`${IMGLY_BASE}resources.json`, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`upstream manifest ${upstream.status}`);
    const manifest = (await upstream.json()) as Record<string, unknown>;

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

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } },
): Promise<NextResponse> {
    const params = await ctx.params;
    let segs = params.path ?? [];
    if (segs[0] === 'v2') segs = segs.slice(1); // cache-generation prefix — see header
    const rel = segs.join('/');
    if (!rel || rel.includes('..')) {
        return new NextResponse('bad resource path', { status: 400 });
    }

    if (rel === 'resources.json') {
        let body: string;
        try {
            body = await patchedManifest();
        } catch {
            return new NextResponse('engine resource unavailable', { status: 502 });
        }
        const headers = new Headers();
        headers.set('content-type', 'application/json');
        // NOT immutable: this is the one file the proxy rewrites — future
        // engine fixes must be able to reach browsers that already visited.
        headers.set('cache-control', 'no-store');
        return new NextResponse(body, { status: 200, headers });
    }

    // Model chunks + everything else: byte-exact passthrough from the
    // version-pinned data package (the lib checksums chunk sizes).
    const upstream = await fetch(IMGLY_BASE + rel, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
        return new NextResponse('engine resource unavailable', {
            status: upstream.status || 502,
        });
    }

    const headers = new Headers();
    const type = upstream.headers.get('content-type');
    if (type) headers.set('content-type', type);
    headers.set('cache-control', IMMUTABLE);
    return new NextResponse(upstream.body, { status: 200, headers });
}
