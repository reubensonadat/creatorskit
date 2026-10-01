import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Auto Captions — Free Subtitle Generator for Videos | CreatorKit',
    description:
        'Generate accurate timestamped subtitles for free. Studio-grade captions with SRT/VTT export and word styling, processed privately in your browser.',
    path: '/auto-captions',
    keywords: buildKeywords(
        [
            'auto captions',
            'subtitle generator',
            'automatic captions',
            'video captions',
            'closed captions generator',
            'srt generator',
            'captions for videos',
            'add subtitles to video',
            'subtitles online',
            'cc generator',
            'video to text',
        ],
        [
            'auto captions free',
            'subtitle generator no signup',
            'free srt maker',
            'whisper captions free',
            'generate subtitles from audio',
            'caption video online',
            'subtitles without watermark',
            'srt file generator online',
            'vtt generator',
            'webvtt maker',
            'burn captions into video',
            'caption editor online',
            'tiktok captions generator',
            'reels captions generator',
            'shorts captions generator',
            'youtube subtitle maker',
            'podcast captions',
            'interview transcript captions',
            'multi language subtitles',
            'caption styling tool',
            'animated captions free',
            'accessibility captions',
            'hearing impaired captions',
            'karaoke style captions',
            'word by word captions',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Auto Captions',
        description:
            'Free automatic caption and subtitle generator. Accurate timestamped captions with SRT/VTT export and styling, processed privately inside your browser.',
        path: '/auto-captions',
        featureList: [
            'Automatic speech-to-text captions',
            'Accurate word timestamps',
            'SRT & VTT export',
            'Word-by-word styling',
            'Runs privately in your browser',
            'No signup, no watermark',
        ],
        related: [
            { name: 'Text Highlighter — Animated Caption Highlights', url: `${SITE_BASE_URL}/text-highlighter` },
            { name: 'Studio Teleprompter', url: `${SITE_BASE_URL}/teleprompter` },
        ],
    }),
    breadcrumbJsonLd('/auto-captions', 'Auto Captions'),
    faqJsonLd([
        {
            q: 'How do I auto-generate subtitles for free?',
            a: 'Open Auto Captions, load your video, and the speech recognition engine writes timestamped captions for you — free, with no signup.',
        },
        {
            q: 'Can I download subtitles as an SRT file?',
            a: 'Yes. Every generated caption track exports as SRT or VTT, ready for YouTube, Premiere, CapCut or any editor.',
        },
        {
            q: 'Are my videos uploaded anywhere?',
            a: 'No. Captioning runs privately inside your browser, so your footage never leaves your device.',
        },
    ]),
];

export default function AutoCaptionsLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
