import type { Metadata } from 'next';
import { toolMetadata } from '@/lib/seo';

/**
 * App home metadata. /app is the installed-PWA launcher surface, not an SEO
 * surface — noindex keeps every search signal consolidated on '/' (the
 * marketing landing page). That is also why /app is deliberately absent
 * from src/app/sitemap.ts.
 */
export const metadata: Metadata = toolMetadata({
    title: 'App Home — Every CreatorsKit Tool in One Tap',
    description:
        'The CreatorsKit app home: search once, tap a tool, done. Invoices, captions, teleprompter, thumbnails, watermarks and more — free, no account, runs on your device.',
    path: '/app',
    keywords: [],
    noIndex: true,
});

export default function AppHomeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
