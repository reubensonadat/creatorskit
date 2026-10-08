import type { MetadataRoute } from 'next';
import { SITE_BASE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const entry = (
        path: string,
        priority: number,
        changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    ): MetadataRoute.Sitemap[number] => ({
        url: path === '/' ? `${SITE_BASE_URL}/` : `${SITE_BASE_URL}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    });

    return [
        // ── Home ────────────────────────────────────────────────────────────
        entry('/', 1.0, 'daily'),

        // NOTE: /app (the installed-PWA tool launcher, manifest start_url) is
        // deliberately NOT listed — it's noindex so search signals consolidate
        // on '/' (see src/app/app/layout.tsx).

        // ── Flagship pair: background remover ⇄ text behind image ──────────
        // Unified theme, separate pages → two shots at the same queries.
        entry('/background-replace', 0.95, 'daily'),
        entry('/text-behind', 0.95, 'daily'),
        entry('/quote-card', 0.8, 'daily'),

        // ── Everyday creator business tools ─────────────────────────────────
        entry('/business', 0.9, 'daily'),
        entry('/brand-kit', 0.85, 'daily'),
        entry('/invoice', 0.85, 'weekly'),
        entry('/receipt', 0.8, 'weekly'),

        // ── Everyday studio tools ───────────────────────────────────────────
        entry('/teleprompter', 0.85, 'daily'),
        entry('/thumbnail-lab', 0.85, 'daily'),
        entry('/auto-captions', 0.8, 'weekly'),
        entry('/text-highlighter', 0.8, 'weekly'),
        entry('/match-cut', 0.8, 'weekly'),

        // ── AI-guided planning (BYOK — keys never touch our servers) ─────────
        entry('/demystify', 0.8, 'weekly'),

        // ── Utility tools ───────────────────────────────────────────────────
        entry('/resizer', 0.75, 'weekly'),
        entry('/watermark', 0.75, 'weekly'),
        entry('/carousel-slicer', 0.7, 'weekly'),

        // ── Promoted orphans (docs/TOOL_INTEGRATION_PLAN.md §5) ─────────────
        entry('/palette-extractor', 0.65, 'weekly'),
        entry('/sync-slate', 0.6, 'monthly'),
        entry('/color-gradient', 0.6, 'weekly'),

        entry('/blog', 0.7, 'daily'),

        // ── Secondary / in development ──────────────────────────────────────
        entry('/video-grabber', 0.6, 'monthly'),
        entry('/bouquet', 0.5, 'weekly'),

        // ── Site / legal ─────────────────────────────────────────────────────
        entry('/about', 0.5, 'monthly'),
        entry('/your-data', 0.5, 'monthly'),
        entry('/privacy', 0.4, 'yearly'),
        entry('/terms', 0.3, 'yearly'),
    ];
}
