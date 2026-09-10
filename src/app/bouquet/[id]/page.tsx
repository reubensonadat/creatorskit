import type { Metadata } from 'next';
import BouquetViewer from './bouquet-viewer';
import { getBouquetByShortId, type StoredBouquet } from '@/lib/supabase';

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

    let title = 'Living 3D Gift & Keepsake | CreatorsKit';
    if (recipient && sender) {
        title = `${recipient}, you received a Living 3D Gift from ${sender}! | CreatorsKit`;
    } else if (recipient) {
        title = `${recipient}, you have a Living 3D Gift waiting! | CreatorsKit`;
    } else if (sender) {
        title = `A Living 3D Gift from ${sender} | CreatorsKit`;
    }

    const description = message
        ? `“${message.length > 140 ? message.slice(0, 137) + '...' : message}” — An interactive 3D living diorama with a secret message encoded in the ground. Tap to open!`
        : 'An interactive 3D living diorama with a secret message encoded in the ground. Tap the tree to reveal your surprise!';

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
                    url: 'https://creatorkit.app/og-tree-qr.png',
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
            images: ['https://creatorkit.app/og-tree-qr.png'],
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

    const initialBouquet: StoredBouquet = bouquet || {
        id,
        scene_type: (typeof sp.scene === 'string' ? sp.scene : 'sakura') as any,
        season: 'spring',
        palette_id: (typeof sp.pal === 'string' ? sp.pal : 'sakura'),
        target_url: (typeof sp.u === 'string' ? decodeURIComponent(sp.u) : 'https://creatorkit.app'),
        sender_name: sender,
        recipient_name: recipient,
        message: message || 'Here is a living 3D oasis just for you. Rotate it around, watch the petals drift, and tap to reveal the hidden QR surprise!',
        audio_enabled: sp.audio === '1',
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: recipient ? `Living 3D Gift for ${recipient}` : 'Living 3D Keepsake',
        description: message || 'An interactive 3D living diorama gift.',
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
