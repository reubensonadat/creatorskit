import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Gradient & Palette Studio — Test Colors On A Real Website | CreatorsKit',
    description:
        'Build beautiful, usable palettes and gradients — then preview them live on a real website mockup before you commit. Copy CSS in one click. Free, private, runs in your browser.',
    path: '/color-gradient',
    keywords: buildKeywords(
        [
            'gradient generator',
            'color palette maker',
            'css gradient tool',
            'test colors on website',
            'palette preview tool',
            'color scheme generator',
        ],
        [
            'gradient css generator',
            'live website color preview',
            'ui palette tester',
            'brand color tester',
            'linear gradient maker',
            'radial gradient generator',
            'copy css gradient',
            'accessible palette builder',
            'website color scheme preview',
            'gradient studio free',
            'no signup gradient tool',
            'private color tools',
            'palette to css variables',
            'test palette on landing page',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Gradient & Palette Studio',
        description:
            'Free browser studio for building palettes and gradients with a live real-website preview — see your colors in context and copy production-ready CSS. Nothing leaves your device.',
        path: '/color-gradient',
        featureList: [
            'Palette & gradient builder',
            'Live real-website preview',
            'One-click CSS copy',
            'Feeds from the Palette Extractor',
            'Works offline after load',
        ],
    }),
    breadcrumbJsonLd('/color-gradient', 'Gradient & Palette Studio'),
];

export default function ColorGradientLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
