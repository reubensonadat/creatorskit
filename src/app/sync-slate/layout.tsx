import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Sync Slate & Clapper — Free Multi-Take Audio Sync Board | CreatorsKit',
    description:
        'A film-style sync slate for solo creators: sharp clap marker, live mic levels and take logging in one screen. Pair it with the teleprompter on shoot day. Free, runs in your browser.',
    path: '/sync-slate',
    keywords: buildKeywords(
        [
            'sync slate',
            'clapper board online',
            'film slate app',
            'audio sync clapper',
            'take logging tool',
            'mic level meter',
        ],
        [
            'digital clapperboard free',
            'multi take audio sync',
            'dual system sound sync',
            'clap marker for video',
            'shoot day slate',
            'production slate online',
            'browser clapper board',
            'solo creator filmmaking tools',
            'take counter slate',
            'sync audio to video clap',
            'no install film slate',
            'phone clapper board',
            'second screen slate',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Sync Slate & Clapper',
        description:
            'Free browser-based sync slate with clap marker, live mic levels and take logging — built for solo creators running multi-take audio sync. Pairs with the CreatorsKit teleprompter.',
        path: '/sync-slate',
        featureList: [
            'Sharp clap sync marker',
            'Live microphone level meter',
            'Take logging & counters',
            'Pairs with the teleprompter',
            'Works offline after load',
        ],
    }),
    breadcrumbJsonLd('/sync-slate', 'Sync Slate & Clapper'),
];

export default function SyncSlateLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
