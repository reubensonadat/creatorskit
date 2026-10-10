import type { Metadata } from 'next';
import { SITE_BASE_URL, toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLd } from '@/lib/seo';
import ToolSeoBlock, { BUSINESS_DOC_SIGNER_SEO } from '@/components/ToolSeoBlock';

export const metadata: Metadata = toolMetadata({
    title: 'Free Document Signer & Contract Suite — Free DocuSign Alternative | CreatorsKit',
    description:
        '100% Free online document signer, contract maker, and influencer business suite. Upload Word (.docx) or agreements to auto-format and e-sign free. No signup, no limits.',
    path: '/business',
    keywords: buildKeywords(
        [
            'free docusign alternative',
            'free document signer',
            'sign documents online free',
            'free contract signer',
            'e sign documents free no account',
            'upload and sign document online',
            'free electronic signature maker',
            'influencer invoice',
            'creator invoice template',
            'brand deal invoice',
            'sponsorship agreement template',
            'creator contract generator',
            'influencer payment receipt',
        ],
        [
            'docusign alternative free online',
            'free document signer no subscription',
            'how to sign documents online without docusign',
            'sign word documents online free',
            'upload docx and sign online',
            'free agreement signature tool',
            'influencer contract template free',
            'mobile money invoice generator',
            'momo payment invoice ghana',
            'content creator contract template free',
            'brand collaboration agreement signer',
            'sign pdf and word contracts free',
            'client signature link free',
            'digital signature brand kit',
            'creator business documents free',
            'paid partnership contract maker',
            'sponsorship payment receipt',
            'free hellosign alternative',
            'free adobe sign alternative',
            'free esignature tool online',
            'influencer media kit maker',
            'creator rate card template free',
            'free receipt maker online',
            'ghana invoice generator',
            'nigeria creator invoice template',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Free Document Signer & Business Suite',
        description:
            'Free DocuSign alternative and creator document suite: upload, auto-format, and e-sign agreements, brand-deal invoices, and receipts. 100% free with no monthly subscription.',
        path: '/business',
        applicationCategory: 'BusinessApplication',
        featureList: [
            '100% Free DocuSign alternative with zero envelope limits',
            'Upload Word (.docx) & text to auto-structure legal layouts',
            'Dual electronic signature execution spaces (Party A & Party B)',
            'Universal Brand Kit identity & signature persistence',
            'Mobile money (MTN, Telecel, AT) and bank transfer payment integration',
            'Print-ready PDF export and live interactive client countersigning links',
            '100% private on-device encryption with no cloud tracking',
        ],
        related: [
            { name: 'Brand Kit', url: `${SITE_BASE_URL}/brand-kit` },
            { name: 'Your Data & Device Transfer', url: `${SITE_BASE_URL}/your-data` },
            { name: 'Free Invoice Generator', url: `${SITE_BASE_URL}/invoice` },
        ],
    }),
    breadcrumbJsonLd('/business', 'Free Document Signer & Business Suite'),
    faqJsonLd([
        {
            q: 'Is CreatorsKit really a 100% free alternative to DocuSign?',
            a: 'Yes. Unlike DocuSign which charges $10 to $40 per user per month and restricts envelope sends, CreatorsKit is completely free with no account requirements, no send limits, and no credit card required.',
        },
        {
            q: 'Can I upload my own contracts and documents?',
            a: 'Yes. You can upload Microsoft Word (.docx) files, plain text documents (.txt, .md), or paste contract clauses. CreatorsKit automatically parses recitals, numbered articles, and terms into a structured legal blueprint ready for dual electronic signatures.',
        },
        {
            q: 'Are electronic signatures legally binding on agreements and invoices?',
            a: 'Yes. Electronic signatures executed with intent and consent are recognized under the US ESIGN Act, UETA, European eIDAS, and electronic transaction laws across Africa and globally.',
        },
        {
            q: 'Can I receive payment with mobile money on invoices?',
            a: 'Yes. Invoices feature mobile money (MTN, Telecel, AT Money) and bank transfer details with one-tap zero-space copying for fast mobile payment processing.',
        },
        {
            q: 'Where are my business documents stored?',
            a: 'On your device. Documents live in your browser’s local storage and encrypted device-transfer backups — they are never sitting unencrypted on a third-party cloud server.',
        },
        {
            q: 'Can I send a contract to a client for signature?',
            a: 'Yes. Generate a live client link and your client can review, sign with a finger, and download the countersigned PDF on any phone — no account needed on their side.',
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
            <ToolSeoBlock content={BUSINESS_DOC_SIGNER_SEO} />
        </>
    );
}
