import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Thumbnail Lab & Split-Tester — Free YouTube Thumbnail CTR Tester | CreatorKit',
    description:
        'Test YouTube thumbnails before you publish. Simulate real feeds, 3-second glance tests, mobile Shorts shelves and A/B split CTR benchmarking. Free.',
    path: '/thumbnail-lab',
    keywords: buildKeywords(
        [
            'youtube thumbnail tester',
            'thumbnail tester',
            'thumbnail preview',
            'test youtube thumbnail',
            'youtube feed preview',
            'thumbnail a/b testing',
            'thumbnail split test',
            'ctr tester',
            'thumbnail click test',
            'youtube thumbnail grader',
            'youtube search preview',
            'thumbnail comparison tool',
        ],
        [
            'youtube thumbnail tester free',
            'see thumbnail in youtube feed',
            'mobile shorts shelf preview',
            '3 second glance test',
            'first glance thumbnail test',
            'thumbnail click through rate',
            'improve ctr youtube',
            'youtube homepage simulator',
            'ab test thumbnails online',
            'thumbnail compare side by side',
            'upload thumbnail preview',
            'does my thumbnail stand out',
            'thumbnail contrast checker',
            'thumbnail mobile preview',
            'thumbnail tester no signup',
            'youtube growth tools free',
            'video thumbnail optimizer',
            'thumbnail ideas grader',
            'youtube studio thumbnail test',
            'face thumbnail tester',
            'text thumbnail tester',
            'red arrow thumbnail check',
            'thumbnail vs competitor test',
            'browse features preview tool',
            'recommended feed simulator',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Thumbnail Lab & Split-Tester',
        description:
            'Free YouTube thumbnail tester: preview designs inside a simulated feed, run 3-second glance tests and split-test variants to pick the highest-CTR cover.',
        path: '/thumbnail-lab',
        featureList: [
            'Simulated YouTube feed & search previews',
            'Mobile Shorts shelf preview',
            '3-second rapid glance test',
            'A/B split testing between variants',
            'CTR scoring and feedback',
            'No signup, images stay private',
        ],
        related: [
            { name: 'Text Behind Image — Depth Poster Maker', url: `${SITE_BASE_URL}/text-behind` },
            { name: 'Background Remover & Cutout', url: `${SITE_BASE_URL}/background-replace` },
        ],
    }),
    breadcrumbJsonLd('/thumbnail-lab', 'Thumbnail Lab & Split-Tester'),
    faqJsonLd([
        {
            q: 'How do I test my YouTube thumbnail before uploading?',
            a: 'Drop your thumbnail designs into Thumbnail Lab. They appear inside a simulated YouTube feed, Shorts shelf and search results so you can judge them exactly the way viewers will.',
        },
        {
            q: 'What is a 3-second glance test?',
            a: 'Your thumbnail flashes for 3 seconds, then you answer what you remember. If it fails the glance test, viewers scrolling a real feed will skip it too.',
        },
        {
            q: 'Can I A/B split test thumbnails for free?',
            a: 'Yes. Load two or more variants and Thumbnail Lab scores them side by side so you publish the strongest one — free and without signup.',
        },
    ]),
];

export default function ThumbnailLabLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
