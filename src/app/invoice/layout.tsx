import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Free Invoice Generator — Creator & Freelancer Invoices | CreatorsKit',
    description:
        'Generate clean professional invoices for freelance and creator work. Custom line items, mobile money & bank details, printable PDF. Free, no signup.',
    path: '/invoice',
    keywords: buildKeywords(
        [
            'invoice generator',
            'free invoice maker',
            'invoice template',
            'freelance invoice',
            'create invoice online',
            'invoice pdf generator',
            'custom invoice creator',
            'service invoice template',
            'digital invoice maker',
            'printable invoice',
        ],
        [
            'invoice generator no signup',
            'invoice without watermark',
            'mobile money invoice generator',
            'bank transfer invoice',
            'ghana invoice generator',
            'nigeria invoice generator',
            'africa freelance invoice',
            'creator services invoice',
            'social media manager invoice',
            'video editor invoice',
            'photographer invoice template',
            'designer invoice template',
            'invoice number generator',
            'professional invoice format',
            'download invoice as pdf',
            'print invoice online',
            'gst invoice maker',
            'vat invoice generator',
            'proforma invoice maker',
            'receipt and invoice maker',
            'client invoice tool',
            'unlimited free invoices',
            'brand deal invoice',
            'sponsorship invoice',
            'content creator invoice template',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Invoice Generator',
        description:
            'Free invoice generator for freelancers and creators. Custom line items, mobile money and bank details, printable PDF invoices with no signup and no watermark.',
        path: '/invoice',
        applicationCategory: 'BusinessApplication',
        featureList: [
            'Custom line items and rates',
            'Mobile money & bank transfer fields',
            'Automatic invoice numbering',
            'Print-ready PDF output',
            'Saves drafts privately in your browser',
            'No signup, no watermark',
        ],
        related: [{ name: 'Creator Business & Legal Suite', url: `${SITE_BASE_URL}/business` }],
    }),
    breadcrumbJsonLd('/invoice', 'Invoice Generator'),
];

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
