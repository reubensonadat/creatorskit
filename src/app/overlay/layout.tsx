import type { Metadata } from 'next';

/**
 * /overlay is the refresh-proof URL for the Auto Captions overlay deck —
 * it renders the SAME app as /auto-captions with initialDeck="overlay"
 * (see src/app/overlay/page.tsx and next.config.ts note). Canonicalizing
 * to /auto-captions (SEO audit 2026-10-10) tells search engines the
 * canonical home of that content and stops the two URLs from splitting
 * ranking signals.
 */
export const metadata: Metadata = {
    title: 'Free Auto Captions — Caption Videos for TikTok, Reels & Shorts | CreatorsKit',
    description:
        'Generate animated captions for TikTok, Reels and Shorts free in your browser. On-device AI, 50+ styles, no signup, no watermark.',
    alternates: { canonical: '/auto-captions' },
    robots: { index: true, follow: true },
};

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
