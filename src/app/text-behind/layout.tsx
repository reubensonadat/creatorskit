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
    title: 'Text Behind Image — Put Text Behind Your Subject Free | CreatorKit',
    description:
        'Put text behind any photo subject in seconds. Free on-device AI background remover, giant poster type sandwich, background dim, 360° rotation. No signup.',
    path: '/text-behind',
    keywords: buildKeywords(
        [
            'text behind image',
            'put text behind image',
            'text behind photo',
            'text behind subject',
            'behind image text effect',
            'layer text behind person',
            'depth text effect',
            'poster text effect',
            'text cutout poster',
            'photo depth poster',
            'write behind picture',
            'poster maker with text behind',
        ],
        [
            'how to put text behind a picture',
            'how to put text behind a subject',
            'background remover for text behind image',
            'remove background for poster text',
            'cutout subject for text layering',
            'sandwich text effect photo',
            'kinetic poster typography',
            'travel poster generator',
            'typography behind subject',
            'giant text behind person',
            'text behind image capcut alternative',
            'text behind image canva alternative',
            'text behind image photoshop alternative',
            'text behind image picsart alternative',
            'text behind image premiere alternative',
            'free depth poster maker',
            '3d depth text photo',
            'text behind person effect online',
            'poster maker with background remover',
            'image text layers editor',
            'subject cutout poster maker',
            'write text behind photo online',
            'crush text behind image',
            'vertical text poster maker',
            'photo sandwich effect',
            'text wraps behind subject',
            'youtube thumbnail text behind image',
            'tiktok profile poster maker',
            'instagram story poster maker',
            'artist poster generator free',
        ],
    ),
    ogImage: '/assets/text-behind/demo-cruise-poster.jpg',
    ogImageAlt: 'Travel poster with giant CRUISE text placed behind the photo subject',
});

const lds = [
    softwareAppJsonLd({
        name: 'Text Behind Image — Depth Poster Maker',
        description:
            'Free browser tool that layers text behind your photo subject. On-device AI background remover, giant poster typography, background dim, 360° text rotation and PNG/JPG export.',
        path: '/text-behind',
        featureList: [
            'On-device AI background remover (photo never leaves your phone)',
            'Text-behind-subject depth sandwich',
            'Giant poster typography with Google Fonts',
            'Background dim & tint',
            '360° text rotation, outline, shadow & gradient fills',
            'PNG / JPG export up to 2×',
            'Works offline after first load',
        ],
        images: [
            '/assets/text-behind/demo-cruise-poster.jpg',
            '/assets/text-behind/demo-earth-poster.jpg',
            '/assets/text-behind/demo-portrait-poster.jpg',
            '/assets/text-behind/demo-egypt-poster.jpg',
        ],
        related: [
            { name: 'Background Remover & Cutout', url: `${SITE_BASE_URL}/background-replace` },
            { name: 'Thumbnail Lab & Split-Tester', url: `${SITE_BASE_URL}/thumbnail-lab` },
        ],
    }),
    breadcrumbJsonLd('/text-behind', 'Text Behind Image'),
    faqJsonLd([
        {
            q: 'How do I put text behind a subject in a photo?',
            a: 'Upload your photo, the built-in AI background remover cuts out the subject on your device, then add a text box and set its depth to "behind". The text renders between the background and your subject for a real 3D depth effect.',
        },
        {
            q: 'Is my photo uploaded to a server?',
            a: 'By default the background removal runs fully on your device with a local AI model. A server fallback exists only for very large images, and your photos are never stored.',
        },
        {
            q: 'Is Text Behind Image free?',
            a: 'Yes. Text Behind Image is completely free, has no signup and no watermark. The AI engine downloads once and is then cached offline in your browser.',
        },
    ]),
];

export default function TextBehindLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
