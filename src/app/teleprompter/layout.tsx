import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Studio Teleprompter — Free Online Teleprompter with Voice Sync | CreatorKit',
    description:
        'A free teleprompter for phone and desktop. Voice-activated scrolling, 52 fonts, eyeline spotlight, selfie mirror mode. No signup, works offline.',
    path: '/teleprompter',
    keywords: buildKeywords(
        [
            'teleprompter',
            'online teleprompter',
            'teleprompter app',
            'free teleprompter',
            'teleprompter for android',
            'teleprompter for iphone',
            'voice activated teleprompter',
            'teleprompter with camera',
            'autocue',
            'prompter app',
            'script scrolling app',
        ],
        [
            'teleprompter online free no signup',
            'teleprompter that follows your voice',
            'voice sync teleprompter',
            'speech scrolling app',
            'video script reader',
            'camera teleprompter online',
            'selfie mirror teleprompter',
            'eyeline teleprompter spotlight',
            'teleprompter for youtube videos',
            'teleprompter for presentations',
            'teleprompter for speeches',
            'teleprompter offline',
            'teleprompter no watermark',
            'best free teleprompter 2026',
            'google fonts teleprompter',
            'adjustable scroll speed teleprompter',
            'teleprompter for tiktok',
            'teleprompter for reels',
            'teleprompter for interviews',
            'public speaking practice tool',
            'script memorization tool',
            'webcam teleprompter',
            'mirror mode teleprompter',
            'grandma simple teleprompter',
            'phone teleprompter free',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Studio Teleprompter',
        description:
            'Free online teleprompter with voice-activated scrolling, 52 fonts, eyeline spotlight and selfie mirror mode. Works on phone and desktop, even offline.',
        path: '/teleprompter',
        featureList: [
            'Voice-activated scroll speed',
            'Mobile-first simple mode',
            '52 Google Fonts',
            'Eyeline spotlight',
            'Selfie camera mirror',
            'Works offline after first load',
        ],
    }),
    breadcrumbJsonLd('/teleprompter', 'Studio Teleprompter'),
    faqJsonLd([
        {
            q: 'Is there a free teleprompter that scrolls with my voice?',
            a: 'Yes. The Studio Teleprompter listens to your speech and scrolls the script in sync — speak faster and it scrolls faster, pause and it waits.',
        },
        {
            q: 'Can I use a teleprompter on my phone?',
            a: 'Yes, it has a grandma-simple mobile mode: paste your script, tap play and read. It works in your phone browser with no install.',
        },
        {
            q: 'Does the teleprompter work offline?',
            a: 'Yes — after the first load the teleprompter keeps working offline, which makes it reliable on set or in low-signal studios.',
        },
    ]),
];

export default function TeleprompterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
