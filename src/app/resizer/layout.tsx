import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Social Platform Resizer — Free Batch Image Cropper & Formatter | CreatorKit',
    description:
        'One-click batch crop and resize images for YouTube 16:9, TikTok 9:16, Instagram, X and more. Free, fast, runs entirely in your browser.',
    path: '/resizer',
    keywords: buildKeywords(
        [
            'image resizer',
            'social media resizer',
            'photo resizer',
            'batch image resizer',
            'aspect ratio converter',
            'crop image online',
            'resize for instagram',
            'resize for tiktok',
            'resize for youtube',
            'image format converter',
            'photo size converter',
        ],
        [
            'social media image sizes',
            'instagram post size maker',
            'tiktok video cover size',
            'youtube thumbnail size',
            '1 1 crop instagram',
            '9 16 story resizer',
            '4 5 portrait resizer',
            '16 9 banner resizer',
            'batch crop photos free',
            'bulk image resize online',
            'resize multiple images at once',
            'image resizer no signup',
            'resize without losing quality',
            'photo dimension changer',
            'platform preset resizer',
            'x twitter header resizer',
            'linkedin post image size',
            'facebook cover resizer',
            'whatsapp status size',
            'pinterest pin size maker',
            'convert image dimensions',
            'landscape to portrait converter',
            'portrait to landscape converter',
            'webp png jpg resizer',
            'px to ratio calculator image',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Social Platform Resizer',
        description:
            'Free batch image resizer with one-click presets for YouTube, TikTok, Instagram, X and more. Crops and formats images entirely in your browser.',
        path: '/resizer',
        featureList: [
            'One-click platform presets',
            'Batch processing',
            'YouTube 16:9, TikTok 9:16, IG, X sizes',
            'No quality loss resizing',
            'Images never leave your device',
        ],
    }),
    breadcrumbJsonLd('/resizer', 'Social Platform Resizer'),
];

export default function ResizerLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
