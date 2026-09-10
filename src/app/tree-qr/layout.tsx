import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Living 3D QR Gift & Keepsake Studio | Scannable 3D Art Diorama Cards',
    description:
        'Create living 3D scannable gifts and interactive voxel keepsakes. Customize Japanese Sakura trees, Rose bouquets, and zen dioramas with secret messages and music links encoded into the ground.',
    keywords: [
        '3D QR code generator',
        'living QR gift',
        'digital bouquet 3D',
        'scannable 3D keepsake',
        'personalized digital gift card',
        'voxel QR code',
        'interactive wedding invitation QR',
        'aesthetic QR code generator',
        'creative gift card link',
        '3D diorama QR',
    ],
    authors: [{ name: 'CreatorKit' }],
    alternates: {
        canonical: 'https://creatorkit.app/tree-qr',
    },
    openGraph: {
        title: 'Living 3D QR Gift & Keepsake Studio | Scannable 3D Art Cards',
        description:
            'Create living 3D scannable gifts and interactive voxel keepsakes with secret messages and music links encoded in the ground.',
        url: 'https://creatorkit.app/tree-qr',
        siteName: 'CreatorKit',
        images: [
            {
                url: 'https://creatorkit.app/og-tree-qr.png',
                width: 1200,
                height: 630,
                alt: 'Living 3D QR Gift & Keepsake Studio',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Living 3D QR Gift & Keepsake Studio | Scannable 3D Art Cards',
        description:
            'Create living 3D scannable gifts and interactive voxel keepsakes with secret messages and music links encoded in the ground.',
        images: ['https://creatorkit.app/og-tree-qr.png'],
        creator: '@creatorkit',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Living 3D QR Gift & Keepsake Studio',
    url: 'https://creatorkit.app/tree-qr',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires WebGL and JavaScript',
    description:
        'Interactive web studio to design living 3D voxel dioramas that seamlessly morph into 100% scannable QR codes. Perfect for personalized digital gifts, wedding invites, music drops, and portfolio passes.',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
    creator: {
        '@type': 'Organization',
        name: 'CreatorKit',
        url: 'https://creatorkit.app',
    },
    featureList: [
        'Interactive 3D orbital diorama with 360 degree rotation and zoom',
        'Authentic physical height morph between 3D diorama and 2D scannable QR code',
        'Handcrafted botanical & architectural presets: Sakura, Rose Bouquet, Wisteria, Zen Bonsai, Cottage House',
        'Custom synchronized world color palettes',
        'Personalized digital gift card creation with custom dedications and messages',
        'High-resolution PNG orthographic export for print and isometric renders',
        'Printable thermal receipt passes for tactile keepsakes',
    ],
};

export default function TreeQRLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
