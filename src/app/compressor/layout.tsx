import type { Metadata } from 'next';
import {
    SITE_BASE_URL,
    toolMetadata,
    buildKeywords,
    softwareAppJsonLd,
    breadcrumbJsonLd,
    faqJsonLd,
    jsonLd,
} from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Compress & Convert — PDF to PNG & Images to PDF Free | CreatorsKit',
    description:
        'Convert PDF to PNG or JPG, images to PDF, and compress everything into WebP/JPG — free, no upload, with estimated output sizes before you commit. Batch friendly.',
    path: '/compressor',
    keywords: buildKeywords(
        [
            'compress and convert',
            'pdf to png converter',
            'pdf to jpg',
            'image to pdf',
            'compress images online',
            'webp converter',
        ],
        [
            'convert pdf to png free online no upload',
            'pdf to jpg no watermark',
            'turn png into pdf free',
            'images to pdf no signup',
            'convert pdf pages to images offline',
            'batch compress images browser',
            'webp to jpg converter free',
            'png to webp converter',
            'compress jpg save mobile data',
            'reduce image size without losing quality',
            'pdf to png ghana',
            'svg to png converter',
            'svg to pdf',
            'avif converter browser',
            'multiple images one zip download',
            'private on device file converter',
            'no upload pdf converter privacy',
            'free image converter no signup',
        ],
    ),
    ogImage: '/assets/text-behind/demo-portrait-poster.jpg',
    ogImageAlt: 'CreatorsKit Compress & Convert — PDF and image conversion hub',
});

const lds = [
    softwareAppJsonLd({
        name: 'Compress & Convert — PDF ⇄ Image Converter',
        description:
            'Free browser converter: PDF pages to PNG/JPG/WebP, images and SVG to PDF, and cross-format image compression — with estimated output sizes before you commit. Everything runs on your device.',
        path: '/compressor',
        featureList: [
            'PDF → PNG / JPG / WebP (every page, pick the sharpness)',
            'PNG / JPG / WebP / SVG → PDF',
            'PNG ⇄ JPG ⇄ WebP (and AVIF where supported)',
            'Estimated output size BEFORE converting',
            'Batch queue with per-file progress',
            'One-click ZIP of every converted file',
            'No upload, no signup, no watermark',
        ],
        images: ['/assets/text-behind/demo-portrait-poster.jpg'],
        related: [
            { name: 'Social Platform Resizer', url: `${SITE_BASE_URL}/resizer` },
            { name: 'Batch Watermark & Protection', url: `${SITE_BASE_URL}/watermark` },
        ],
    }),
    breadcrumbJsonLd('/compressor', 'Compress & Convert'),
    faqJsonLd([
        {
            q: 'How do I convert a PDF to PNG images?',
            a: 'Drop your PDF into Compress & Convert, choose PNG (or JPG/WebP) and a render sharpness, then convert — every PDF page becomes its own image, downloadable individually or as one ZIP.',
        },
        {
            q: 'Can I turn images into a PDF without uploading them?',
            a: 'Yes. Select PDF as the target format, add your images (PNG, JPG, WebP, even SVG) and convert. The PDF is built entirely inside your browser tab — nothing is uploaded anywhere.',
        },
        {
            q: 'Will I know the output size before converting?',
            a: 'Yes — every queued file shows an estimated output size and savings percentage, computed locally under your current quality settings before you commit to anything.',
        },
        {
            q: 'Is Compress & Convert free?',
            a: 'Completely free, no signup and no watermark. The PDF engine loads only when first needed, then works offline.',
        },
    ]),
];

export default function CompressorLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
