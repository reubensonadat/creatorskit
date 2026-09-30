import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy for the @imgly/background-removal engine resources
 * (isnet onnx model + onnxruntime-web wasm), which normally stream from
 * staticimgly.com with NO caching — the lib has zero built-in persistence,
 * so every fresh visit would re-download ~15MB.
 *
 * Chunk files answer with `Cache-Control: immutable` and the browser's disk
 * cache carries the engine across sessions (works in dev too, where the PWA
 * service worker is intentionally unregistered).
 *
 * ── THE ORT VERSION BRIDGE ────────────────────────────────────────────────
 * @imgly bundles whichever onnxruntime-web the app resolves at build time
 * (ours: the 1.26.0-dev build @huggingface/transformers pins) but downloads
 * the wasm binaries its data package ships (1.21.0, matching @imgly's
 * peerDependencies pin). Glue 1.26 + binaries 1.21 =
 * "_OrtGetInputOutputMetadata is not a function" on EVERY run — no amount of
 * hard-refreshing fixes it. So this proxy rewrites resources.json: the
 * /onnxruntime-web/* entries are repointed at the exact ort build installed
 * in node_modules, served from the same jsDelivr CDN URL whisper-worker.ts
 * already uses (proven to load in this app).
 *
 * The lib byte-validates every chunk against the manifest
 * (`chunkSize !== blob.size` throws), so the rewritten entries carry the
 * REAL size of the file we serve — checked live via HEAD at manifest time.
 *
 * ── WHY /v2/ ─────────────────────────────────────────────────────────────
 * An earlier revision shipped resources.json itself with `immutable` —
 * browsers that visited then have the 1.21-era manifest pinned for a year
 * and will never re-fetch it. Bumping the publicPath to /api/imgly/v2/
 * (stripped below) sidesteps that poisoned cache entry; the manifest is now
 * `no-store` so future proxy fixes always reach visitors.
 */

export const dynamic = 'force-dynamic';

const IMGLY_BASE = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
// MUST match the onnxruntime-web version resolved into the browser bundle —
// keep in sync with src/lib/captions/whisper-worker.ts (same pin, same CDN).
const ORT_JSDELIVR = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/';
const ORT_PREFIX = '/onnxruntime-web/';
// Identity byte sizes of the pinned build (measured from node_modules —
// jsDelivr content-length is NOT usable here: undici requests gzip/br and
// then gets the COMPRESSED length reported, while the streamed body is
// decompressed, so a live HEAD would lie to the lib's byte-exact chunk
// validation). If the pin above changes, re-measure these.
const ORT_FILES: Record<string, number> = {
    'ort-wasm-simd-threaded.mjs': 24_180,
    'ort-wasm-simd-threaded.wasm': 12_942_611,
    'ort-wasm-simd-threaded.jsep.mjs': 46_490,
    'ort-wasm-simd-threaded.jsep.wasm': 26_101_073,
};
const IMMUTABLE = 'public, max-age=31536000, immutable';

async function patchedManifest(): Promise<string> {
    const upstream = await fetch(`${IMGLY_BASE}resources.json`, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`upstream manifest ${upstream.status}`);
    const manifest = (await upstream.json()) as Record<string, unknown>;

    for (const [file, size] of Object.entries(ORT_FILES)) {
        manifest[`${ORT_PREFIX}${file}`] = {
            chunks: [{ name: `__ort/${file}`, offsets: [0, size] }],
            size,
            mime: file.endsWith('.mjs') ? 'text/javascript' : 'application/wasm',
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

    // The ort bridge — serve binaries that MATCH the bundled ort JS glue.
    if (rel.startsWith('__ort/')) {
        const file = rel.slice('__ort/'.length);
        if (!/^ort-wasm-simd-threaded(\.jsep)?\.(mjs|wasm)$/.test(file)) {
            return new NextResponse('bad ort file', { status: 400 });
        }
        // identity encoding: the manifest records the identity size and the
        // lib byte-validates what arrives — no transparent gzip surprises.
        const upstream = await fetch(`${ORT_JSDELIVR}${file}`, {
            cache: 'no-store',
            headers: { 'accept-encoding': 'identity' },
        });
        if (!upstream.ok || !upstream.body) {
            return new NextResponse('ort resource unavailable', {
                status: upstream.status || 502,
            });
        }
        const headers = new Headers();
        const type = upstream.headers.get('content-type');
        headers.set(
            'content-type',
            type ?? (file.endsWith('.mjs') ? 'text/javascript' : 'application/wasm'),
        );
        headers.set('cache-control', IMMUTABLE);
        return new NextResponse(upstream.body, { status: 200, headers });
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
