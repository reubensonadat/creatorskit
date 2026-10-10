import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';
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
            'newspaper video effect',
            'article screenshot to video',
            'screenshot words video maker',
            'newspaper zoom transition',
            'text zoom cut maker',
            'word pop transition free',
            'hard cut text editor online',
            'free kinetic typography no watermark',
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
    faqJsonLd([
        {
            q: 'Is the text match cut generator really free?',
            a: 'Yes. Match CUT is one of CreatorsKit’s free tools. There is no account, no export limit and no watermark — the site is supported by a single unobtrusive ad banner, never by charging creators.',
        },
        {
            q: 'Do I need After Effects or Premiere?',
            a: 'No. Match CUT runs in any modern browser — Chrome on Android, Safari on iPhone, or your desktop. If you can open a web page, you can make the edit.',
        },
        {
            q: 'Does my video get uploaded anywhere?',
            a: 'Never. The tool is fully local: your video is read by the browser, edited on your device, and exported from it. There is no server upload step at all.',
        },
        {
            q: 'Can I cut on words from a screenshot of an article?',
            a: 'Yes. Drop a screenshot of any article — a Wikipedia page, a news story, anything readable — and every word becomes tappable. Choose the words and the order; the tool cuts on each one, and a word that appears many times gets a cut for every appearance.',
        },
        {
            q: 'What is a match cut, exactly?',
            a: 'A match cut is an edit where two shots are joined by a shared element — here, a word that appears in one scene and resolves into the next. In short-form video, word-anchor match cuts keep pacing tight and retention high.',
        },
    ]),
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
