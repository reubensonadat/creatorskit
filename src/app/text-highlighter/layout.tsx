import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';
import ToolSeoBlock, { HIGHLIGHTER_SEO } from '@/components/ToolSeoBlock';

export const metadata: Metadata = toolMetadata({
    title: 'Text Highlighter — Animated Caption Highlights for Videos | CreatorsKit',
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
            'text highlighter app',
            'highlight words in video free',
            'animated underline text video',
            'highlighter pen effect online',
            'caption emphasis tool',
            'sticky text highlights',
            'multi phrase highlight video',
            'newspaper photo video maker',
            'article photo highlights',
            'talking head caption styling',
            'podcast clip highlights',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Text Highlighter',
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
    faqJsonLd([
        {
            q: 'Is the text highlighter really free?',
            a: 'Yes. The Text Highlighter is one of CreatorsKit’s free tools — no account, no export limits, no watermark. One unobtrusive ad banner keeps the whole site free.',
        },
        {
            q: 'How do I get the Hormozi or MrBeast caption style?',
            a: 'Choose the marker style with a loud yellow or green, big condensed type, and fast sweeps — that is the exact recipe the big channels use, and it is two taps here.',
        },
        {
            q: 'Can I highlight a real newspaper or article photo?',
            a: 'Yes. Take a photo or screenshot of any article, drop it in, and tap the lines you want highlighted. The camera dives between your highlights in the final video.',
        },
        {
            q: 'Does my footage leave my device?',
            a: 'Never. All rendering happens locally in your browser — there is no server upload step.',
        },
        {
            q: 'Can I use it on my phone?',
            a: 'Yes — it is touch-first. Install CreatorsKit as an app (PWA) from your browser menu for a home-screen icon and offline support.',
        },
        {
            q: 'Which sizes can I export?',
            a: '9:16 for TikTok, Reels and Shorts, 1:1 for feed posts, 16:9 for YouTube, plus editorial portrait ratios — all watermark-free.',
        },
    ]),
];

export default function TextHighlighterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
            {/* Crawlable long-form content below the tool UI — same
                remove.bg / canva pattern as Match CUT: depth on the REAL
                url, never thin duplicate routes. */}
            <ToolSeoBlock content={HIGHLIGHTER_SEO} />
        </>
    );
}
