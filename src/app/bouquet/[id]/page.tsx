import type { Metadata } from 'next';
import BouquetViewer from './bouquet-viewer';
import { getBouquetByShortId, type StoredBouquet } from '@/lib/supabase';

export const runtime = 'edge';

type Props = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { id } = await params;
    const sp = searchParams ? await searchParams : {};
    const bouquet = await getBouquetByShortId(id);

    const sender = bouquet?.sender_name?.trim() || (typeof sp.from === 'string' ? sp.from.trim() : '');
    const recipient = bouquet?.recipient_name?.trim() || (typeof sp.to === 'string' ? sp.to.trim() : '');
    const message = bouquet?.message?.trim() || (typeof sp.msg === 'string' ? sp.msg.trim() : '');

    let title = 'Digital Bouquet & Keepsake Card | CreatorsKit';
    if (recipient && sender) {
        title = `${recipient}, you received a fresh flower bouquet from ${sender}! | CreatorsKit`;
    } else if (recipient) {
        title = `${recipient}, you have a fresh flower bouquet waiting! | CreatorsKit`;
    } else if (sender) {
        title = `A fresh flower bouquet from ${sender} | CreatorsKit`;
    }

    const description = message
        ? `“${message.length > 140 ? message.slice(0, 137) + '...' : message}” — A personalized botanical bouquet gift with a handwritten card.`
        : 'A personalized botanical flower bouquet gift with a handwritten card and printable keepsake.';

    const canonicalUrl = `https://creatorkit.app/bouquet/${id}`;

    return {
        title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: 'CreatorKit',
            images: [
                {
                    url: 'https://creatorkit.app/assets/bouquet/flowers/rose-pink.webp',
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            type: 'website',
            locale: 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['https://creatorkit.app/assets/bouquet/flowers/rose-pink.webp'],
            creator: '@creatorkit',
        },
        robots: {
            index: false,
            follow: true,
        },
    };
}

export default async function BouquetPage({ params, searchParams }: Props) {
    const { id } = await params;
    const sp = searchParams ? await searchParams : {};
    const bouquet = await getBouquetByShortId(id);

    const sender = bouquet?.sender_name?.trim() || (typeof sp.from === 'string' ? sp.from.trim() : undefined);
    const recipient = bouquet?.recipient_name?.trim() || (typeof sp.to === 'string' ? sp.to.trim() : undefined);
    const message = bouquet?.message?.trim() || (typeof sp.msg === 'string' ? sp.msg.trim() : undefined);
    const format = bouquet?.gift_format || (typeof sp.format === 'string' ? sp.format : undefined) || bouquet?.metadata?.giftFormat || 'both';
    const soundPreset = bouquet?.sound_preset || (typeof sp.sound === 'string' ? sp.sound : undefined) || bouquet?.metadata?.soundPreset || 'music-box';

    const initialBouquet: StoredBouquet = bouquet || {
        id,
        scene_type: 'botanical-2d',
        season: 'spring',
        palette_id: 'classic-cream',
        target_url: `https://creatorkit.app/bouquet/${id}`,
        sender_name: sender || 'A Friend',
        recipient_name: recipient || 'Someone Special',
        message: message || 'Thinking of you and sending this freshly picked bouquet to brighten your day.',
        gift_format: format,
        sound_preset: soundPreset,
        audio_enabled: Boolean(soundPreset),
        metadata: {
            flowers: ['rose-pink', 'sunflower-golden', 'peony-blush', 'tulip-rose', 'lily-ivory'],
            greenery: ['fern-illustration', 'olive-spray'],
            cardTemplateId: 'classic-cream',
            seed: 1042,
            giftFormat: format,
            soundPreset,
        },
    };


    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: recipient ? `Digital Bouquet for ${recipient}` : 'Digital Botanical Bouquet',
        description: message || 'A personalized botanical bouquet gift.',
        creator: {
            '@type': 'Person',
            name: sender || 'A Friend',
        },
        provider: {
            '@type': 'Organization',
            name: 'CreatorKit',
            url: 'https://creatorkit.app',
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BouquetViewer initialBouquet={initialBouquet} />
        </>
    );
}
