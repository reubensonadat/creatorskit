import type { Metadata } from 'next';
import BouquetViewer from './bouquet-viewer';
import { getBouquetByShortId, type StoredBouquet } from '@/lib/supabase';
import { SITE_BASE_URL } from '@/lib/seo';

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

    const canonicalUrl = `${SITE_BASE_URL}/bouquet/${id}`;

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
            siteName: 'CreatorsKit',
            images: [
                {
                    url: `${SITE_BASE_URL}/assets/bouquet/flowers/rose-pink.webp`,
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
            images: [`${SITE_BASE_URL}/assets/bouquet/flowers/rose-pink.webp`],
            creator: '@creatorskit',
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

    const flowersFromSp = typeof sp.fl === 'string' && sp.fl ? sp.fl.split(',').filter(Boolean) : undefined;
    const greeneryFromSp = typeof sp.gr === 'string' && sp.gr ? sp.gr.split(',').filter(Boolean) : undefined;
    const seedFromSp = typeof sp.seed === 'string' && sp.seed ? parseInt(sp.seed, 10) : undefined;
    const fontFromSp = typeof sp.font === 'string' && sp.font ? sp.font : undefined;
    const placementFromSp = typeof sp.cp === 'string' && sp.cp ? sp.cp : undefined;
    const greetingFromSp = typeof sp.grt === 'string' && sp.grt ? sp.grt : undefined;
    const closingFromSp = typeof sp.cls === 'string' && sp.cls ? sp.cls : undefined;

    const initialBouquet: StoredBouquet = bouquet ? {
        ...bouquet,
        sender_name: bouquet.sender_name || sender,
        recipient_name: bouquet.recipient_name || recipient,
        message: bouquet.message || message,
        gift_format: bouquet.gift_format || format,
        sound_preset: bouquet.sound_preset || soundPreset,
        metadata: {
            ...bouquet.metadata,
            flowers: bouquet.metadata?.flowers?.length ? bouquet.metadata.flowers : flowersFromSp,
            greenery: bouquet.metadata?.greenery?.length ? bouquet.metadata.greenery : greeneryFromSp,
            cardFont: bouquet.metadata?.cardFont || fontFromSp || 'space-mono',
            cardPlacement: bouquet.metadata?.cardPlacement || placementFromSp || 'right',
            greeting: bouquet.metadata?.greeting || greetingFromSp || 'Dear',
            closing: bouquet.metadata?.closing || closingFromSp || 'Sincerely,',
            seed: bouquet.metadata?.seed || seedFromSp || 1042,
            giftFormat: bouquet.metadata?.giftFormat || format,
            soundPreset: bouquet.metadata?.soundPreset || soundPreset,
        }
    } : {
        id,
        scene_type: 'botanical-2d',
        season: 'spring',
        palette_id: 'classic-cream',
        target_url: `${SITE_BASE_URL}/bouquet/${id}`,
        sender_name: sender || 'A Friend',
        recipient_name: recipient || 'Someone Special',
        message: message || 'Thinking of you and sending this freshly picked bouquet to brighten your day.',
        gift_format: format,
        sound_preset: soundPreset,
        audio_enabled: Boolean(soundPreset),
        metadata: {
            flowers: flowersFromSp || ['rose-pink', 'sunflower-golden', 'peony-blush', 'tulip-rose', 'lily-ivory'],
            greenery: greeneryFromSp || ['fern-illustration', 'olive-spray'],
            cardFont: fontFromSp || 'space-mono',
            cardPlacement: placementFromSp || 'right',
            greeting: greetingFromSp || 'Dear',
            closing: closingFromSp || 'Sincerely,',
            cardTemplateId: 'classic-cream',
            seed: seedFromSp || 1042,
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
            name: 'CreatorsKit',
            url: SITE_BASE_URL,
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
