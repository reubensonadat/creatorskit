import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host consolidation — every reachable alias of the site must land on the
 * canonical production origin (https://creatorskit.win, src/lib/seo.ts
 * SITE_BASE_URL) so canonical URLs, sitemap entries and JSON-LD nodes never
 * fight a second live host (duplicate-content split).
 *
 * What redirects (308, path + query preserved):
 *   - creatorskit.pages.dev  (the Cloudflare Pages production default domain)
 *   - www.creatorskit.win    (apex is canonical)
 *   - any other non-local host that somehow serves the app
 *
 * What never redirects:
 *   - creatorskit.win itself
 *   - localhost / 127.0.0.1 / *.local (dev)
 *   - <branch-hash>.creatorskit.pages.dev (Cloudflare preview deployments —
 *     they end in .pages.dev but are NOT the production default domain)
 *
 * NOTE: this uses the `middleware.ts` convention (deprecated in Next 16 in
 * favor of `proxy.ts`) because @cloudflare/next-on-pages — which serves
 * production — does not yet recognize `proxy.ts`. Rename + re-export as
 * `proxy` once next-on-pages ships support.
 */

const CANONICAL_HOST = 'creatorskit.win';
const PAGES_DEV_PROD = 'creatorskit.pages.dev';

export function middleware(request: NextRequest) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

    // Canonical apex host — serve directly.
    if (host === CANONICAL_HOST) {
        return NextResponse.next();
    }

    // Local development hosts — never redirect.
    const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.endsWith('.local');
    if (isLocal) {
        return NextResponse.next();
    }

    // Cloudflare per-branch preview deployments (<hash>.creatorskit.pages.dev)
    // must stay reachable for deploy verification — only the production
    // default domain consolidates.
    const isPreview = host.endsWith('.pages.dev') && host !== PAGES_DEV_PROD;
    if (isPreview) {
        return NextResponse.next();
    }

    // Everything else (creatorskit.pages.dev, www.creatorskit.win, stray
    // hosts) 308-redirects to the canonical apex, preserving path + query.
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
}

/**
 * Skip static assets: the redirect only matters for HTML navigations and API
 * entry points — asset requests keep working on whatever host served the page
 * (previews, local) without a needless redirect hop.
 */
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|mjs|map|woff|woff2|ttf|mp3|wav|wasm|json|pdf)$).*)',
    ],
};
