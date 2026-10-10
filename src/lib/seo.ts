/**
 * src/lib/seo.ts
 * Single source of truth for site-wide SEO: base URL, keyword factory
 * (200+ unique keywords per tool), Next Metadata factory and JSON-LD
 * structured-data builders. Server-safe (no browser APIs).
 */
import type { Metadata } from 'next';

// Canonical production domain. The Cloudflare Pages default domain
// (https://creatorskit.pages.dev) serves the same app but every canonical
// URL, sitemap entry and JSON-LD node points here so signals consolidate.
export const SITE_BASE_URL = 'https://creatorskit.win';
export const SITE_NAME = 'CreatorsKit';
export const SITE_TAGLINE = 'Tools for Creators who ship';

/**
 * Deterministic modifiers crossed with each tool's hand-written high-intent
 * base phrases so every page ships 200+ unique keyword combinations without
 * hand-maintaining giant lists.
 */
const KEYWORD_MODIFIERS = [
    'free',
    'online',
    'tool',
    'maker',
    'generator',
    'app',
    'software',
    'website',
    'no signup',
    'no login',
    'no watermark',
    'without watermark',
    'without app',
    'no download',
    'no install',
    'in browser',
    'browser based',
    'for android',
    'for iphone',
    'for ios',
    'for mobile',
    'for pc',
    'for windows',
    'for mac',
    'for laptop',
    'for chromebook',
    'best',
    'easy',
    'fast',
    'offline',
    '2026',
];

export function buildKeywords(bases: string[], extras: string[] = [], limit = 210): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (raw: string) => {
        const kw = raw.toLowerCase().trim();
        if (kw && !seen.has(kw)) {
            seen.add(kw);
            out.push(kw);
        }
    };
    bases.forEach(push);
    extras.forEach(push);
    for (const mod of KEYWORD_MODIFIERS) {
        for (const base of bases) {
            push(`${base} ${mod}`);
            if (out.length >= limit) return out;
        }
    }
    return out;
}

/**
 * Default OG card for a tool path — pre-generated PNGs in /public/og
 * (regenerate with: node scripts/generate-og-images.mjs). '/' maps to
 * home.png; '/teleprompter/mirror' would map to teleprompter-mirror.png.
 */
export function ogImagePath(path: string): string {
    const name = path.replace(/^\//, '').replace(/\//g, '-') || 'home';
    return `/og/${name}.png`;
}

export interface ToolMetaInput {
    title: string;
    description: string;
    /** Route path, e.g. '/text-behind' */
    path: string;
    keywords: string[];
    /** Site-relative OG image, e.g. '/assets/text-behind/demo-cruise-poster.jpg' */
    ogImage?: string;
    ogImageAlt?: string;
    noIndex?: boolean;
}

export function toolMetadata(input: ToolMetaInput): Metadata {
    const url = `${SITE_BASE_URL}${input.path}`;
    // Every indexable tool now ships a branded OG card by default (SEO audit
    // fix #6): explicit screenshots still win, generated card is the floor.
    const ogImage = input.ogImage
        ? `${SITE_BASE_URL}${input.ogImage}`
        : input.noIndex
          ? undefined
          : `${SITE_BASE_URL}${ogImagePath(input.path)}`;
    return {
        title: input.title,
        description: input.description,
        keywords: input.keywords,
        alternates: { canonical: url },
        robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
        openGraph: {
            title: input.title,
            description: input.description,
            url,
            siteName: SITE_NAME,
            type: 'website',
            ...(ogImage
                ? {
                    images: [
                        {
                            url: ogImage,
                            width: 1200,
                            height: 630,
                            alt: input.ogImageAlt ?? input.title,
                        },
                    ],
                }
                : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: input.title,
            description: input.description,
            ...(ogImage ? { images: [ogImage] } : {}),
        },
    };
}

export interface AppJsonLdInput {
    name: string;
    description: string;
    path: string;
    applicationCategory?: string;
    featureList: string[];
    /** Site-relative or absolute image URLs */
    images?: string[];
    keywords?: string[];
    /** Cross-links that glue related tools together (e.g. background remover ⇄ text behind image) */
    related?: { name: string; url: string }[];
}

export function softwareAppJsonLd(input: AppJsonLdInput): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: input.name,
        description: input.description,
        url: `${SITE_BASE_URL}${input.path}`,
        applicationCategory: input.applicationCategory ?? 'DesignApplication',
        operatingSystem: 'Any (works in your web browser)',
        browserRequirements: 'Requires JavaScript',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        ...(input.images?.length
            ? { screenshot: input.images.map((src) => (src.startsWith('http') ? src : `${SITE_BASE_URL}${src}`)) }
            : {}),
        featureList: input.featureList,
        ...(input.keywords?.length ? { keywords: input.keywords.slice(0, 48).join(', ') } : {}),
        ...(input.related?.length
            ? {
                seeAlso: input.related.map((r) => r.url),
                isRelatedTo: input.related.map((r) => ({
                    '@type': 'SoftwareApplication',
                    name: r.name,
                    url: r.url,
                })),
            }
            : {}),
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_BASE_URL },
    };
}

export function breadcrumbJsonLd(path: string, name: string): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_BASE_URL },
            { '@type': 'ListItem', position: 2, name, item: `${SITE_BASE_URL}${path}` },
        ],
    };
}

export function faqJsonLd(qas: { q: string; a: string }[]): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: qas.map((qa) => ({
            '@type': 'Question',
            name: qa.q,
            acceptedAnswer: { '@type': 'Answer', text: qa.a },
        })),
    };
}

/** dangerouslySetInnerHTML payload for JSON-LD script tags. */
export function jsonLd(obj: Record<string, unknown>): { __html: string } {
    return { __html: JSON.stringify(obj) };
}
