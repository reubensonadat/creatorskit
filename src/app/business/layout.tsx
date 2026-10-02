import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Creator Business & Legal Suite — Free Influencer Invoices & Contracts | CreatorsKit',
    description:
        'Free influencer brand-deal invoices, sponsorship agreements, payment receipts and pitch letterheads. Mobile money ready, printable, no signup.',
    path: '/business',
    keywords: buildKeywords(
        [
            'influencer invoice',
            'influencer invoice template',
            'creator invoice template',
            'brand deal invoice',
            'sponsorship invoice',
            'freelance invoice generator',
            'content creator invoice',
            'youtube invoice template',
            'influencer contract',
            'sponsorship agreement template',
            'creator agreement template',
            'influencer payment receipt',
            'pitch letterhead',
        ],
        [
            'influencer invoice generator free',
            'how to invoice a brand as an influencer',
            'what to charge brands as a creator',
            'influencer rate card',
            'mobile money invoice',
            'momo payment invoice',
            'content creator contract template free',
            'influencer agreement pdf',
            'brand collaboration agreement',
            'creator legal documents free',
            'ugc creator invoice',
            'tiktok creator invoice',
            'instagram sponsor invoice',
            'youtube sponsorship invoice',
            'freelance receipt template',
            'payment receipt generator',
            'creator pitch letterhead',
            'influencer media kit letterhead',
            'sponsorship payment terms',
            'creator business documents',
            'brand deal paperwork',
            'influencer tax invoice',
            'collab agreement generator',
            'gifted collaboration agreement',
            'paid partnership contract',
            'creator sponsorship proposal',
            'influencer onboarding documents',
            'agency invoice template creator',
            'brand ambassador agreement',
            'content licensing agreement template',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Business & Legal Suite',
        description:
            'Free suite of creator business documents: brand-deal invoices, sponsorship agreements, payment receipts and pitch letterheads. Mobile-money ready and printable.',
        path: '/business',
        applicationCategory: 'BusinessApplication',
        featureList: [
            'Influencer brand-deal invoices',
            'Sponsorship & collaboration agreements',
            'Payment receipts',
            'Pitch letterheads',
            'Mobile money & bank transfer details',
            'Print-ready PDF output',
            'No signup, fully private',
        ],
        related: [
            { name: 'Free Invoice Generator', url: `${SITE_BASE_URL}/invoice` },
            { name: 'Thumbnail Lab & Split-Tester', url: `${SITE_BASE_URL}/thumbnail-lab` },
        ],
    }),
    breadcrumbJsonLd('/business', 'Creator Business & Legal Suite'),
    faqJsonLd([
        {
            q: 'How do I invoice a brand for a sponsored post?',
            a: 'Open the Business & Legal Suite, pick the brand-deal invoice, add your line items, rates, mobile money or bank details, and print or save a clean PDF to send the brand.',
        },
        {
            q: 'Are the influencer contract templates free?',
            a: 'Yes — the sponsorship agreement, collaboration contract and payment receipt templates are all free, with no signup and no watermark.',
        },
        {
            q: 'Can I receive payment with mobile money?',
            a: 'Yes. Invoices include mobile money (MoMo) and bank transfer fields so creators anywhere can get paid without Stripe or PayPal.',
        },
    ]),
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
