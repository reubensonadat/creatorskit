/**
 * src/app/api/component-search/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FEDERATED COMPONENT SEARCH — one query, every site in the directory at once.
 * (Backs /components and every /components/[slug] detail page.)
 *
 * How it works, per source (strategy set in src/data/component-directory.ts):
 *
 *   'sitemap'  We fetch the site's sitemap.xml (cached 24h, index files are
 *              followed), tokenize every URL and rank against the query —
 *              exact, real component pages straight from the source.
 *              Verified live against 21st.dev (2.7k component URLs),
 *              aceternity.com, magicui.design, daisyui.com, motion.dev and
 *              tweakcn.com on 2026-11-05.
 *
 *   'bing'     For sites that bot-wall or client-render everything (uiverse.io
 *              sits behind Cloudflare's challenge for datacenter/server IPs),
 *              we run a `site:<domain> <query>` Bing search server-side and
 *              parse the organic results. DuckDuckGo's html/lite endpoints
 *              are blocked from this network — Bing works and is polite
 *              enough for personal-use volume. Capped at BING_CAP concurrent
 *              engines per query, lowest `search.priority` first.
 *
 *   'link'     No live results — the UI always shows a deep link to the
 *              site's own search page regardless, so nothing dead-ends.
 *
 * Every source gets an 8s timeout and runs in parallel (allSettled) — one
 * slow or blocked site never blocks the others. Whole responses are cached
 * 10 minutes so refining a query is instant on repeat terms.
 */

import { NextRequest } from 'next/server';
import {
    COMPONENT_SITES,
    liveSearchSources,
    resolveSearchUrl,
    type ComponentSite,
} from '@/data/component-directory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DirectorySearchResult {
    title: string;
    url: string;
    /** short context line when the engine provides one */
    snippet?: string;
}

export interface DirectorySourceReport {
    slug: string;
    name: string;
    site: string;
    strategy: 'sitemap' | 'bing' | 'link';
    status: 'ok' | 'empty' | 'error' | 'skipped';
    results: DirectorySearchResult[];
    /** deep link so the user can always finish the job on the site itself */
    searchUrl: string;
    ms: number;
}

export interface DirectorySearchResponse {
    query: string;
    tookMs: number;
    sources: DirectorySourceReport[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8_000;
const SITEMAP_TTL_MS = 24 * 60 * 60 * 1_000;
const QUERY_TTL_MS = 10 * 60 * 1_000;
const BING_CAP = 4; // concurrent bing engines per query (politeness cap)
const RESULTS_PER_SOURCE = 6;

// ─── Caches (module-scope; per-instance in serverless, fine for this use) ────

interface SitemapCacheEntry {
    at: number;
    urls: string[];
    /** precomputed searchable text per url, same index */
    texts: string[];
}

const sitemapCache = new Map<string, SitemapCacheEntry>();
const queryCache = new Map<string, { at: number; body: DirectorySearchResponse }>();

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Fetch a URL and read the ENTIRE body under one abort deadline. The abort
 * signal must stay armed through res.text() — a server that stalls mid-body
 * (Bing does this when soft-blocking) would otherwise hang the read forever
 * and wedge the whole federated request.
 */
async function fetchText(url: string, ms = FETCH_TIMEOUT_MS): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': UA,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

/** "3d-card-effect" + "@user/components/button" → "3d card effect user components button" */
function urlToText(url: string): string {
    try {
        const u = new URL(url);
        const path = decodeURIComponent(u.pathname).replace(/[/_.]+/g, ' ');
        return `${u.hostname.replace(/\./g, ' ')} ${path}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    } catch {
        return url.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    }
}

/** "neon button!" → ["neon", "button"] (≥2 chars, deduped, order kept) */
function tokenize(q: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of q.toLowerCase().split(/[^a-z0-9]+/)) {
        if (raw.length >= 2 && !seen.has(raw)) {
            seen.add(raw);
            out.push(raw);
        }
    }
    return out;
}

/** Pretty title from the last meaningful URL segment. */
function titleFromUrl(url: string): string {
    try {
        const segs = new URL(url).pathname.split('/').filter(Boolean);
        const last = decodeURIComponent(segs[segs.length - 1] ?? '');
        const pretty = last
            .split(/[-_]+/)
            .filter(Boolean)
            .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
            .join(' ');
        if (segs.length >= 3) {
            // keep the author/category context, e.g. "@crysta1221 · Button"
            const ctx = decodeURIComponent(segs[segs.length - 2] ?? '').replace(/^@/, '@');
            if (ctx) return `${pretty || url} · ${ctx}`;
        }
        return pretty || url;
    } catch {
        return url;
    }
}

// ─── Adapter 1: sitemap token search ──────────────────────────────────────────

function extractLocs(xml: string): string[] {
    const locs: string[] = [];
    const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) locs.push(m[1].split(AMP_ENTITY).join('&'));
    return locs;
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
    const xml = await fetchText(sitemapUrl);

    // sitemap-index → follow children (depth 1, cap 8)
    if (/<sitemapindex/i.test(xml)) {
        const children = extractLocs(xml).slice(0, 8);
        const nested = await Promise.allSettled(children.map((c) => fetchSitemapUrls(c)));
        return nested.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    }

    const urls = extractLocs(xml);
    if (urls.length === 0) throw new Error('sitemap had no <loc> urls');
    return urls;
}

async function getSitemap(site: ComponentSite): Promise<SitemapCacheEntry> {
    const key = site.search.sitemapUrl ?? site.url;
    const hit = sitemapCache.get(key);
    if (hit && Date.now() - hit.at < SITEMAP_TTL_MS) return hit;

    const urls = await fetchSitemapUrls(key);
    const entry: SitemapCacheEntry = {
        at: Date.now(),
        urls,
        texts: urls.map(urlToText),
    };
    sitemapCache.set(key, entry);
    return entry;
}

function rankSitemapUrls(entry: SitemapCacheEntry, tokens: string[]): { url: string; score: number }[] {
    const scored: { url: string; score: number }[] = [];
    for (let i = 0; i < entry.urls.length; i++) {
        const text = entry.texts[i];
        let matched = 0;
        for (const t of tokens) {
            if (text.includes(t)) matched++;
        }
        if (matched === 0) continue;
        // all-token matches outrank partial; shorter paths = more specific pages
        const allBonus = matched === tokens.length ? 100 : 0;
        const lengthBonus = Math.max(0, 20 - entry.urls[i].length / 12);
        scored.push({ url: entry.urls[i], score: matched * 10 + allBonus + lengthBonus });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

async function searchViaSitemap(site: ComponentSite, tokens: string[]): Promise<DirectorySearchResult[]> {
    const entry = await getSitemap(site);
    const ranked = rankSitemapUrls(entry, tokens);
    return ranked.slice(0, RESULTS_PER_SOURCE).map(({ url }) => ({ title: titleFromUrl(url), url }));
}

// ─── Adapter 2: Bing site: search ─────────────────────────────────────────────

/** Bing wraps some hrefs in /ck/a redirector URLs carrying base64 in `u=a1…`. */
// AMP_ENTITY is assembled by concatenation on purpose: editor tooling
// normalizes contiguous HTML-entity sequences in edits back to raw
// characters, which once turned the unescape loop below into a no-op
// infinite loop that wedged the whole server.
const AMP_ENTITY = '&' + 'amp;';

function decodeBingHref(rawHref: string): string | null {
    try {
        // Bing escapes ampersands inside href attributes as HTML entities
        // (sometimes double-escaped). Restore them before URL parsing or
        // the u param key reads as "amp;u" and every link is dropped.
        let href = rawHref;
        while (href.includes(AMP_ENTITY)) href = href.split(AMP_ENTITY).join('&');
        if (!href.startsWith('https://www.bing.com/ck/')) return href;
        const u = new URL(href).searchParams.get('u');
        if (!u || !u.startsWith('a1')) return null;
        const b64 = u.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const decoded = atob(padded);
        return decoded.startsWith('http') ? decoded : null;
    } catch {
        return null;
    }
}

function stripTags(html: string): string {
    return html
        .replace(/<[^>]+>/g, '')
        .split(AMP_ENTITY).join('&')
        .split('&' + 'quot;').join('"')
        .split('&' + 'apos;').join("'")
        .split('&' + 'lt;').join('<')
        .split('&' + 'gt;').join('>')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, ' ')
        .trim();
}

function sameSite(url: string, domain: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase();
        const root = domain.toLowerCase().replace(/^www\./, '');
        return host === root || host === `www.${root}` || host.endsWith(`.${root}`);
    } catch {
        return false;
    }
}

function parseBingResults(html: string, domain: string, q: string): DirectorySearchResult[] {
    const flat = html.replace(/\r?\n/g, ' ');
    const blockRe = /<li class="b_algo"[^>]*>([\s\S]*?)(?=<li class="b_algo"|<\/ol>)/g;
    const out: DirectorySearchResult[] = [];
    let block: RegExpExecArray | null;
    while ((block = blockRe.exec(flat)) && out.length < RESULTS_PER_SOURCE) {
        const inner = block[1];
        const linkMatch = inner.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkMatch) continue;
        const href = decodeBingHref(linkMatch[1]);
        if (!href || !sameSite(href, domain)) continue;

        const title = stripTags(linkMatch[2]);
        const snippetMatch = inner.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        const snippet = snippetMatch ? stripTags(snippetMatch[1]).slice(0, 160) : undefined;

        out.push({
            title: title || titleFromUrl(href),
            url: href,
            snippet: snippet?.includes(q) || !snippet ? snippet : undefined,
        });
    }
    return out;
}

async function searchViaBing(site: ComponentSite, q: string): Promise<DirectorySearchResult[]> {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(`site:${site.domain} ${q}`)}&count=15`;
    const html = await fetchText(url);
    const results = parseBingResults(html, site.domain, q);
    // Zero b_algo blocks at all = engine blocked us → error (UI shows fallback
    // link); blocks present but filtered to zero = genuinely nothing indexed.
    const hasBlocks = html.includes('b_algo');
    if (results.length === 0 && !hasBlocks) throw new Error('bing parse failed');
    return results;
}

// ─── Orchestration ────────────────────────────────────────────────────────────

async function searchSource(site: ComponentSite, q: string): Promise<DirectorySourceReport> {
    const started = Date.now();
    const tokens = tokenize(q);
    const base = {
        slug: site.slug,
        name: site.name,
        site: site.url,
        strategy: site.search.strategy,
        searchUrl: resolveSearchUrl(site, q),
    };

    if (site.search.strategy === 'link' || tokens.length === 0) {
        return { ...base, status: 'skipped', results: [], ms: 0 };
    }

    try {
        let results: DirectorySearchResult[] = [];
        if (site.search.strategy === 'sitemap') {
            try {
                results = await searchViaSitemap(site, tokens);
            } catch (err) {
                // sitemap missing/walled → bing fallback keeps the source alive
                if (site.search.bingFallback !== false) {
                    try {
                        results = await searchViaBing(site, q);
                    } catch {
                        throw err;
                    }
                }
            }
        } else {
            results = await searchViaBing(site, q);
        }
        return {
            ...base,
            status: results.length > 0 ? 'ok' : 'empty',
            results,
            ms: Date.now() - started,
        };
    } catch {
        return { ...base, status: 'error', results: [], ms: Date.now() - started };
    }
}

export async function GET(request: NextRequest): Promise<Response> {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
    const source = request.nextUrl.searchParams.get('source');

    if (q.length < 2) {
        return Response.json({ error: 'Provide ?q= of at least 2 characters' }, { status: 400 });
    }
    if (source && !COMPONENT_SITES.some((s) => s.slug === source)) {
        return Response.json({ error: `Unknown source "${source}"` }, { status: 400 });
    }

    const cacheKey = `${q.toLowerCase()}|${source ?? 'all'}`;
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.at < QUERY_TTL_MS) {
        return Response.json(cached.body);
    }

    const started = Date.now();

    let targets: ComponentSite[];
    let reportOnly: ComponentSite[] = [];
    if (source) {
        targets = [COMPONENT_SITES.find((s) => s.slug === source)!];
    } else {
        const live = liveSearchSources();
        // Sitemap sources all run; bing engines capped by priority. Everything
        // else (link-strategy sites + bing sites beyond the cap) is reported
        // as skipped WITHOUT fetching — the cap must actually cap.
        const sitemap = live.filter((s) => s.search.strategy === 'sitemap');
        const bing = live.filter((s) => s.search.strategy === 'bing');
        targets = [...sitemap, ...bing.slice(0, BING_CAP)];
        const executed = new Set(targets);
        reportOnly = COMPONENT_SITES.filter((s) => !executed.has(s));
    }

    const settled = await Promise.allSettled(targets.map((site) => searchSource(site, q)));
    const sources: DirectorySourceReport[] = settled.map((r, i) =>
        r.status === 'fulfilled'
            ? r.value
            : {
                slug: targets[i].slug,
                name: targets[i].name,
                site: targets[i].url,
                strategy: targets[i].search.strategy,
                status: 'error',
                results: [],
                searchUrl: resolveSearchUrl(targets[i], q),
                ms: 0,
            },
    );
    sources.push(
        ...reportOnly.map((s) => ({
            slug: s.slug,
            name: s.name,
            site: s.url,
            strategy: s.search.strategy,
            status: 'skipped' as const,
            results: [],
            searchUrl: resolveSearchUrl(s, q),
            ms: 0,
        })),
    );

    const body: DirectorySearchResponse = {
        query: q,
        tookMs: Date.now() - started,
        sources,
    };

    queryCache.set(cacheKey, { at: Date.now(), body });
    // keep the query cache bounded
    if (queryCache.size > 50) {
        const oldest = queryCache.keys().next().value;
        if (oldest) queryCache.delete(oldest);
    }

    return Response.json(body);
}
