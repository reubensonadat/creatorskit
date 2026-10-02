import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Color Palette Extractor — Pull HEX Codes From Any Photo | CreatorsKit',
    description:
        'Drop any image and instantly pull its exact color palette. Copy HEX codes in one click, then feed your colors straight into the Gradient Studio. Free, private, runs in your browser.',
    path: '/palette-extractor',
    keywords: buildKeywords(
        [
            'color palette extractor',
            'image color picker',
            'extract colors from image',
            'photo palette generator',
            'hex code finder',
            'color picker from image online',
        ],
        [
            'get hex codes from photo',
            'brand colors from image',
            'dominant color extractor',
            'image to palette converter',
            'copy hex codes from image',
            'color scheme from picture',
            'average color finder',
            'palette from screenshot',
            'thumbnail color matcher',
            'extract brand palette free',
            'no upload color extractor',
            'private image color tool',
            'color grabber online',
            'swatch from image',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Color Palette Extractor',
        description:
            'Free browser tool that pulls the exact color palette from any photo — HEX codes ready to copy, feeds the Gradient & Palette Studio. Images never leave your device.',
        path: '/palette-extractor',
        featureList: [
            'Extract palette from any image',
            'One-click HEX copy',
            'Feeds Gradient & Palette Studio',
            'Works offline after load',
            'Images never leave your device',
        ],
    }),
    breadcrumbJsonLd('/palette-extractor', 'Color Palette Extractor'),
];

export default function PaletteExtractorLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
