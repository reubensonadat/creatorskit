import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Receipt Maker — Free Printable Receipt Generator | CreatorKit',
    description:
        'Create clean printable receipts in seconds. Itemized sales and payment receipts, thermal-printer friendly, printable or PDF. Free with no signup.',
    path: '/receipt',
    keywords: buildKeywords(
        [
            'receipt maker',
            'receipt generator',
            'printable receipt',
            'receipt template',
            'create receipt online',
            'receipt pdf',
            'payment receipt maker',
            'sales receipt generator',
            'thermal receipt maker',
            'receipt printer online',
        ],
        [
            'receipt maker free',
            'receipt no signup',
            'custom receipt template',
            'business receipt generator',
            'invoice receipt maker',
            'digital receipt creator',
            'print receipt from browser',
            'receipt number generator',
            'itemized receipt maker',
            'pos receipt template',
            'gift receipt maker',
            'order receipt generator',
            'service receipt template',
            'cash receipt maker',
            'receipt without watermark',
            'download receipt pdf',
            '80mm receipt template',
            '58mm receipt template',
            'thermal printer friendly receipt',
            'creativity prop receipt maker',
            'shop receipt designer',
            'mini business receipt tool',
            'payment confirmation receipt',
            'mobile money receipt',
            'thank you receipt template',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorKit Receipt Maker',
        description:
            'Free printable receipt generator. Itemized sales and payment receipts with a thermal-printer friendly layout — printable straight from your browser.',
        path: '/receipt',
        applicationCategory: 'BusinessApplication',
        featureList: [
            'Itemized receipt lines',
            'Automatic totals & receipt numbers',
            'Thermal-printer friendly output',
            'Printable or PDF download',
            'No signup, no watermark',
        ],
        related: [
            { name: 'Free Invoice Generator', url: `${SITE_BASE_URL}/invoice` },
            { name: 'Creator Business & Legal Suite', url: `${SITE_BASE_URL}/business` },
        ],
    }),
    breadcrumbJsonLd('/receipt', 'Receipt Maker'),
];

export default function ReceiptLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
