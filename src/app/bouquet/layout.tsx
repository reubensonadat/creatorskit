import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Digital Bouquet Studio — Printable Personalized Flower Gift | CreatorKit',
    description:
        'Craft a handcrafted digital flower bouquet with a personalized card and print it in real time. A thoughtful free printable gift.',
    path: '/bouquet',
    keywords: buildKeywords(
        [
            'digital bouquet',
            'virtual bouquet',
            'printable bouquet',
            'paper flower bouquet',
            'bouquet maker',
            'flower gift card',
            'personalized bouquet',
            'digital gift',
            'printable flower gift',
            'bouquet card maker',
        ],
        [
            'digital bouquet free',
            'send flowers digitally',
            'printable gift online',
            'last minute gift printable',
            'long distance gift',
            'virtual flowers for her',
            'digital flowers for him',
            'anniversary digital gift',
            'birthday printable bouquet',
            'mothers day bouquet printable',
            'get well soon flowers digital',
            'valentine digital bouquet',
            'graduation gift printable',
            'thank you bouquet',
            'paper flowers template',
            'bouquet with message card',
            'custom note bouquet',
            'gift without delivery',
            'instant gift download',
            'eco friendly gift',
            'real time printed bouquet',
            'thermal printer gift',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Digital Bouquet Studio',
        description:
            'Free digital bouquet studio: arrange a handcrafted flower bouquet, write a personalized card, and print it as a gift in real time.',
        path: '/bouquet',
        featureList: [
            'Arrange flowers & greenery',
            'Personalized gift card',
            'Real-time receipt printing',
            'Share link with a message',
            'No signup, free forever',
        ],
    }),
    breadcrumbJsonLd('/bouquet', 'Digital Bouquet Studio'),
];

export default function BouquetLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
