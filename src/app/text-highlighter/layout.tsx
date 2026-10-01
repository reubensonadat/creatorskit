import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Text Highlighter — Animated Caption Highlights for Videos | CreatorKit',
    description:
        'Add cinematic animated text highlights, marker sweeps, circle callouts and boxes to videos. Viral caption styles free, straight in your browser.',
    path: '/text-highlighter',
    keywords: buildKeywords(
        [
            'text highlighter',
            'highlight text in video',
            'animated text highlight',
            'caption highlight',
            'video text marker',
            'text callout video',
            'highlight sweep animation',
            'marker pen text effect',
            'circle text callout',
            'box text callout',
            'animated highlight video',
        ],
        [
            'highlight text in video free',
            'animated highlighter effect',
            'kinemaster text highlight alternative',
            'premiere text highlight free',
            'capcut text highlight alternative',
            'word highlight captions',
            'viral caption styles',
            'hormozi caption style free',
            'mrbeast caption style free',
            'marker sweep effect',
            'draw on video text',
            'attention grabbing captions',
            'caption pop effect',
            'text emphasis video editor',
            'highlight generator no watermark',
            'social video text effects',
            'shorts text highlighter',
            'reels text highlighter',
            'tutorial video callouts',
            'educational video highlights',
            'marker animation online',
            'paper texture text overlay',
            'handwritten circle video overlay',
            'underline text animation',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Text Highlighter',
        description:
            'Free animated text highlighter for videos: marker sweeps, circle and box callouts, paper textures and viral caption emphasis styles — all in your browser.',
        path: '/text-highlighter',
        featureList: [
            'Animated marker sweeps',
            'Circle & box callouts',
            'Paper texture overlays',
            'Viral caption emphasis styles',
            'Frame-accurate export',
            'No signup, no watermark',
        ],
        related: [
            { name: 'Auto Captions — Free Subtitle Generator', url: `${SITE_BASE_URL}/auto-captions` },
            { name: 'Text Match CUT', url: `${SITE_BASE_URL}/match-cut` },
        ],
    }),
    breadcrumbJsonLd('/text-highlighter', 'Text Highlighter'),
];

export default function TextHighlighterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
