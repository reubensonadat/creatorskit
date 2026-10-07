import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';
import ToolSeoBlock, { MATCH_CUT_SEO } from '@/components/ToolSeoBlock';

export const metadata: Metadata = toolMetadata({
    title: 'Text Match CUT — Word-Anchor Kinetic Typography Transitions | CreatorsKit',
    description:
        'Create word-anchor match cuts and kinetic typography transitions for short-form video. Free, in-browser, exports clean clips for TikTok & Shorts.',
    path: '/match-cut',
    keywords: buildKeywords(
        [
            'match cut',
            'text match cut',
            'kinetic typography',
            'kinetic text video',
            'word anchor transition',
            'match cut transition',
            'text transition video',
            'typography video maker',
            'kinetic type generator',
            'word cut edit',
            'text animation video',
        ],
        [
            'match cut generator free',
            'kinetic typography maker online',
            'text based transitions',
            'viral text transitions',
            'tiktok text transition',
            'shorts text transition',
            'after effects typography alternative free',
            'motion text video',
            'animated words video',
            'lyric video maker',
            'quote video maker',
            'beat sync text',
            'music synced typography',
            'edit text transitions online',
            'no watermark kinetic typography',
            'word pop video',
            'speech text animation',
            'jump cut text effect',
            'transition maker free',
            'caption animation maker',
            'velocity edit text',
            'glitch text transition',
            'zoom text transition',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Text Match CUT',
        description:
            'Free kinetic typography tool: build word-anchor match cuts and rapid text transitions for short-form video directly in your browser.',
        path: '/match-cut',
        featureList: [
            'Word-anchor match cuts',
            'Kinetic typography presets',
            'Beat-synced text animation',
            'TikTok & Shorts export sizes',
            'Google Fonts typography',
            'No signup, no watermark',
        ],
        related: [
            { name: 'Text Highlighter — Animated Caption Highlights', url: `${SITE_BASE_URL}/text-highlighter` },
            { name: 'Auto Captions — Free Subtitle Generator', url: `${SITE_BASE_URL}/auto-captions` },
        ],
    }),
    breadcrumbJsonLd('/match-cut', 'Text Match CUT'),
];

export default function MatchCutLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
            {/* Crawlable long-form content below the tool UI — the answer to
                "separate description pages?": depth on the REAL url, not thin
                duplicate routes. Pattern for every flagship tool. */}
            <ToolSeoBlock content={MATCH_CUT_SEO} />
        </>
    );
}
