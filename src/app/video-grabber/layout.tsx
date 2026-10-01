import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Video Grabber — Save Video & Audio Files to Your Device | CreatorKit',
    description:
        'Paste any video or audio link, watch one short ad, and save the file straight to your device. Free, no sketchy downloads, works on mobile.',
    path: '/video-grabber',
    keywords: buildKeywords(
        [
            'video downloader',
            'download video online',
            'save video from link',
            'audio downloader',
            'video grabber',
            'download video to device',
            'media saver',
            'clip downloader',
            'video url downloader',
            'file saver online',
            'link to file converter',
        ],
        [
            'download video free online',
            'paste link download video',
            'save audio file online',
            'video saver no signup',
            'mobile video downloader',
            'download from link free',
            'mp4 downloader online',
            'mp3 audio save',
            'one ad downloader',
            'ad unlocked downloader',
            'media file grabber',
            'video archive tool',
            'lecture video saver',
            'presentation video download',
            'creative asset saver',
            'reference video downloader',
            'video grab tool',
            'download manager web',
            'online media fetch',
            'save clip to gallery',
            'download training video',
            'webinar replay saver',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Video Grabber',
        description:
            'Free link-based media saver: paste a video or audio link, watch one short ad, and the file saves straight to your device — no sketchy installers.',
        path: '/video-grabber',
        featureList: [
            'Paste any video or audio link',
            'One short ad instead of paywalls',
            'Saves directly to your device',
            'Works on mobile browsers',
            'No installers or sketchy downloads',
        ],
    }),
    breadcrumbJsonLd('/video-grabber', 'Video Grabber'),
];

export default function VideoGrabberLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
