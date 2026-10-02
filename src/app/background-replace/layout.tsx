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
    title: 'Background Remover — Free One-Click Transparent PNG Cutout | CreatorsKit',
    description:
        'Remove image backgrounds free in seconds. On-device AI keeps photos 100% private, transparent PNG cutouts, edge refinement, instant hand-off to poster tools.',
    path: '/background-replace',
    keywords: buildKeywords(
        [
            'remove background from image',
            'background remover',
            'remove background',
            'image background remover',
            'photo background remover',
            'transparent background maker',
            'transparent png maker',
            'cutout image',
            'background eraser',
            'delete background from photo',
            'remove bg',
            'background cutout tool',
        ],
        [
            'remove background online free',
            'background remover no signup',
            'background remover without watermark',
            'remove white background',
            'remove background from jpg',
            'remove background from png',
            'remove background from photo free',
            'isolate subject from photo',
            'product photo background remover',
            'profile picture background remover',
            'thumbnail background remover',
            'background remover for text behind image',
            'cutout for poster maker',
            'png cutout download',
            'change image background',
            'magic eraser alternative',
            'remove bg alternative free',
            'photoshop background remover alternative free',
            'canva background remover alternative free',
            'ai background remover on device',
            'privacy background remover',
            'background remover works offline',
            'edge refinement cutout',
            'hair edge background removal',
            'one click background remover',
            'batch background remover',
            'background remover for ecommerce',
            'passport photo background remover',
            'logo background remover',
            'meme cutout maker',
        ],
    ),
    ogImage: '/assets/text-behind/demo-portrait-poster.jpg',
    ogImageAlt: 'Photo subject cleanly cut out from its background as a transparent PNG',
});

const lds = [
    softwareAppJsonLd({
        name: 'Background Remover & Cutout',
        description:
            'Free one-click background remover that runs on your device. Turns any photo into a transparent PNG cutout with edge refinement, then hands off to other CreatorsKit tools.',
        path: '/background-replace',
        featureList: [
            'One-click background removal',
            '100% private on-device AI mode',
            'Server fallback for heavy images',
            'Transparent PNG download',
            'Cutout edge refinement',
            'Instant hand-off to Text Behind Image poster maker',
            'Model cached offline after first use',
        ],
        images: ['/assets/text-behind/demo-portrait-poster.jpg'],
        related: [
            { name: 'Text Behind Image — Depth Poster Maker', url: `${SITE_BASE_URL}/text-behind` },
            { name: 'Thumbnail Lab & Split-Tester', url: `${SITE_BASE_URL}/thumbnail-lab` },
        ],
    }),
    breadcrumbJsonLd('/background-replace', 'Background Remover'),
    faqJsonLd([
        {
            q: 'How do I remove the background from a picture for free?',
            a: 'Open the Background Remover, drop in your photo and the AI cuts the subject out automatically. Download the result as a transparent PNG — free, no signup, no watermark.',
        },
        {
            q: 'Does my photo get uploaded anywhere?',
            a: 'The primary engine runs entirely on your device using a cached AI model. Nothing is uploaded. A server fallback only activates if your device cannot run the model.',
        },
        {
            q: 'Can I use the cutout in the Text Behind Image poster maker?',
            a: 'Yes — one tap sends your cutout straight into the Text Behind Image tool where you can sandwich giant text behind your subject for a depth poster effect.',
        },
    ]),
];

export default function BackgroundReplaceLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
