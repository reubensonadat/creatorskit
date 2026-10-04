import type { Metadata } from 'next';
import { toolMetadata } from '@/lib/seo';

// noindex: the mirror is a private second-screen surface reached via a
// payload-encoded link generated inside the teleprompter (CREW MODE) — never
// a search entry point. Signals consolidate on /teleprompter.
export const metadata: Metadata = toolMetadata({
    title: 'Script Mirror — Second Screen',
    description:
        'Your teleprompter script scrolling on a second screen while you film on your phone’s camera app at full quality.',
    path: '/teleprompter/mirror',
    keywords: [],
    noIndex: true,
});

export default function MirrorLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
