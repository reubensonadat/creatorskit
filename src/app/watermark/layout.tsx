import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Batch Watermark — Free Bulk Photo Protection Tool | CreatorsKit',
    description:
        'Batch-apply logo stamps and copyright marks across images in bulk. Protect your photos from content theft. Free, private, in your browser.',
    path: '/watermark',
    keywords: buildKeywords(
        [
            'watermark photos',
            'batch watermark',
            'bulk watermark',
            'add watermark to photos',
            'photo watermark tool',
            'logo stamp photos',
            'copyright watermark',
            'watermark images online',
            'image protection',
            'watermark maker',
            'photo copyright tool',
        ],
        [
            'watermark photos free',
            'batch watermark tool',
            'bulk add logo to photos',
            'copyright photos online',
            'protect images from theft',
            'watermark multiple images at once',
            'watermark no signup',
            'transparent logo watermark',
            'custom watermark maker',
            'photo stamp tool',
            'drag and drop watermark',
            'watermark jpg png webp',
            'instagram photo protection',
            'photographer watermark tool',
            'ecommerce product photo watermark',
            'digital asset protection',
            'visible watermark generator',
            'text watermark photos',
            'watermark position tool',
            'free watermark app',
            'brand your photos',
            'content theft protection',
            'logo placement batch',
            'diagonal watermark',
            'watermark opacity control',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Batch Watermark',
        description:
            'Free bulk watermarking tool. Batch-apply logo stamps and copyright marks across all your images to protect photos from content theft.',
        path: '/watermark',
        featureList: [
            'Batch logo stamping',
            'Text & image watermarks',
            'Position and opacity control',
            'Bulk processing folders of images',
            'Images never leave your device',
        ],
    }),
    breadcrumbJsonLd('/watermark', 'Batch Watermark'),
];

export default function WatermarkLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
