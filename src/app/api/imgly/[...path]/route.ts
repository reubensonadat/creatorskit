import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy for the @imgly/background-removal engine resources
 * (isnet onnx model + onnxruntime-web wasm), which normally stream from
 * staticimgly.com with NO caching — the lib has zero built-in persistence,
 * so every fresh visit would re-download ~15MB.
 *
 * The proxy adds the missing piece: version-pinned URLs never change, so we
 * answer with `Cache-Control: public, max-age=31536000, immutable` and the
 * browser's disk cache carries the engine across sessions (works in dev too,
 * where the PWA service worker is intentionally unregistered).
 *
 * The client opts in via publicPath: `${origin}/api/imgly/` in
 * src/lib/background-removal.ts — every resource (resources.json + chunks)
 * resolves relative to that base.
 */

export const dynamic = 'force-dynamic';

const IMGLY_BASE = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ path?: string[] }> | { path?: string[] } },
): Promise<NextResponse> {
    const params = await ctx.params;
    const rel = (params.path ?? []).join('/');
    if (!rel || rel.includes('..')) {
        return new NextResponse('bad resource path', { status: 400 });
    }

    const upstream = await fetch(IMGLY_BASE + rel, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
        return new NextResponse('engine resource unavailable', {
            status: upstream.status || 502,
        });
    }

    const headers = new Headers();
    const type = upstream.headers.get('content-type');
    if (type) headers.set('content-type', type);
    // The persistence layer: one fetch per URL, cached for a year.
    headers.set('cache-control', 'public, max-age=31536000, immutable');

    // Byte-exact passthrough — the lib checksums chunk sizes.
    return new NextResponse(upstream.body, { status: 200, headers });
}
