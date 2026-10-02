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
    title: 'Quote Card Maker — Instagram & Facebook Quote Cards Free | CreatorsKit',
    description:
        'Make quote cards for Instagram and Facebook. Per-card photos, background colours, format templates, batch upload and a multi-card deck ZIP export. No AI, no signup, 100% on-device.',
    path: '/quote-card',
    keywords: buildKeywords(
        [
            'quote card maker',
            'instagram quote card maker',
            'facebook quote card maker',
            'quote card generator',
            'quote cards for instagram',
            'quote image maker',
            'quote post maker',
            'motivational quote card',
            'multi card deck',
            'batch quote cards',
        ],
        [
            'how to make quote cards for instagram',
            'how to make a quote picture for facebook',
            'instagram quote post maker free',
            'quote card maker no watermark',
            'quote card templates 1080x1350',
            'instagram square quote card 1:1',
            'story quote card 9:16',
            'batch upload photos one card each',
            'multiple photos on quote card',
            'change quote card background color',
            'quote card with your own photo',
            'quote card maker without canva',
            'quote card maker without signup',
            'free quote graphic designer',
            'inspirational quote image generator',
            'quote typography poster maker',
            'paste quote on photo online',
            'multi card instagram deck zip',
            'quote card google fonts',
            'creator quote card toolkit',
            'facebook quote picture maker free',
            'whatsapp status quote card',
            'quote card maker ghana',
            'quote card maker africa',
            'no ai quote card maker',
            'private on device quote maker',
        ],
    ),
    ogImage: '/assets/text-behind/demo-portrait-poster.jpg',
    ogImageAlt: 'Bold typographic quote card made with the CreatorsKit Quote Card Studio',
});

const lds = [
    softwareAppJsonLd({
        name: 'Quote Card Studio — Instagram & Facebook Quote Card Maker',
        description:
            'Free browser tool for designing quote cards. Every card keeps its own photo and background colour, batch upload creates one card per photo, and the whole deck exports as a ZIP. Same famous text-behind interface — no AI models, everything runs on your device.',
        path: '/quote-card',
        featureList: [
            'Individual cards — each with its own photo, colour, text & overlays',
            'Batch photo upload: every extra photo becomes a new card',
            'Card background colours & 1:1 / 4:5 / 9:16 format templates',
            'Multiple photos as movable, rotatable canvas layers',
            '52 Google Fonts, weights, italics, case & blend modes',
            'Grain, shapes, icons & undo/redo history',
            'Deck export as a ZIP of clean PNGs',
            'Hand-off to Text Behind Image for the AI depth sandwich',
            'No AI models, no signup, no watermark — 100% on-device',
        ],
        images: ['/assets/text-behind/demo-portrait-poster.jpg'],
        related: [
            { name: 'Text Behind Image', url: `${SITE_BASE_URL}/text-behind` },
            { name: 'Carousel Slicer', url: `${SITE_BASE_URL}/carousel-slicer` },
        ],
    }),
    breadcrumbJsonLd('/quote-card', 'Quote Card Studio'),
    faqJsonLd([
        {
            q: 'How do I make a quote card for Instagram?',
            a: 'Open Quote Card Studio, drop in a photo (or start a colour card), type your quote, pick a font and export as PNG. The 1:1 and 4:5 format templates match Instagram posts exactly; 9:16 fits Stories and Reels covers.',
        },
        {
            q: 'Can I make many quote cards at once?',
            a: 'Yes. Upload several photos in one go — the first becomes your current card and every extra photo automatically becomes its own new card. Switch between cards with the tabs, then export the whole deck as a ZIP.',
        },
        {
            q: 'Does this tool remove backgrounds with AI?',
            a: 'No. Quote Card Studio is deliberately AI-free — photos are placed exactly as you upload them. If you want the text-behind-subject depth effect, one click hands the card to Text Behind Image, which has the on-device AI cutout.',
        },
        {
            q: 'Is Quote Card Studio free?',
            a: 'Yes — completely free, no signup and no watermark. Everything runs in your browser, so your photos never leave your device.',
        },
    ]),
];

export default function QuoteCardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
