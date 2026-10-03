/**
 * /terms — CreatorsKit Terms of Service.
 *
 * Real terms for a real product: free browser tools, no accounts,
 * local-first storage, optional cloud features, share links, BYOK AI,
 * advertising-funded free operation, Ghana law. Matches the shipped
 * behavior — update alongside any feature change.
 */

import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';
import { toolMetadata, buildKeywords } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Terms of Service — Free Browser Creator Tools, No Account | CreatorsKit',
    description:
        'The terms for using CreatorsKit: free browser-based creator tools, no accounts, your content stays yours, share links for business documents, bring-your-own-key AI features, acceptable use, liability, and Ghanaian governing law.',
    path: '/terms',
    keywords: buildKeywords(
        ['terms of service', 'terms of use', 'usage terms'],
        ['free creator tools terms', 'browser tool terms', 'no account tools'],
    ),
});

const INTRO =
    'CreatorsKit (creatorskit.win) is a free suite of browser-based tools for creators — invoicing and business documents, teleprompter, captions, thumbnails, resizing, watermarks, compressing, planning, and more. There is no account and nothing to subscribe to today. These terms are short on purpose: use the tools, keep what you make, don’t abuse the service. The sections below fill in the edges — what the service is, what you own, how share links and AI features work, what we each are responsible for, and the law that governs it all.';

const SECTIONS: LegalSection[] = [
    {
        id: '01',
        title: 'Acceptance & eligibility',
        items: [
            { label: 'The agreement', text: 'By opening or using CreatorsKit you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please don’t use the site.' },
            { label: 'Who can use it', text: 'Anyone aged 13 or older. The tools are built for creators, freelancers, and small businesses — anyone is welcome to use them lawfully. If you use CreatorsKit on behalf of a business, you confirm you have authority to accept these terms for it.' },
            { label: 'It’s free', text: 'All tools are currently free, with no account. If paid features ever launch, they will be clearly priced, require an explicit checkout, and be governed by the terms in force at that time. Nothing will ever auto-charge you.' },
        ],
    },
    {
        id: '02',
        title: 'What the service is (and isn’t)',
        items: [
            { label: 'Browser tools that respect your machine', text: 'CreatorsKit runs in your browser. Files you load into a tool are processed on your device — resizing, watermarking, compressing, captioning, cutting, compositing — and your working files are stored on your device (see Privacy Policy section 3). This is why heavy tools stay fast and private: your computer does the work.' },
            { label: 'The tool set', text: 'The suite includes business documents (invoices, receipts, agreements, letterheads), teleprompter, auto-captions, text highlighter, match cut, thumbnail lab, resizer, watermark, compress & convert, carousel slicer, background remover, text-behind-image, quote cards, palette extractor, gradient studio, sync slate, gift bouquets, video grabber, and the AI planner (Demystify). Tools may be added, changed, or retired over time; free tools stay usable while offered.' },
            { label: 'Optional cloud features', text: 'A few features use the internet when you choose them: AI planning with your own API key, optional cloud transcription, Video Grabber, share links, and YouTube reference import. Each is described in the tool itself and in the Privacy Policy.' },
            { label: 'Availability', text: 'We aim for the site to always be up, but the service is provided "as is" and "as available." Features may change, pause, or be retired (we’ll be public about it), and we don’t guarantee uninterrupted access, or that every export will succeed on every device — browsers and hardware vary.' },
        ],
    },
    {
        id: '03',
        title: 'No accounts — your device is your workspace',
        items: [
            { label: 'Local means local', text: 'Because your work lives in your browser’s storage, clearing your browser data, using private/incognito mode, or switching devices can remove it. The /your-data page shows what’s stored and lets you export a full backup as a ZIP — use it before clearing anything or moving devices.' },
            { label: 'Back up what matters', text: 'You are responsible for keeping copies of anything important (invoices, exports, projects). CreatorsKit is a tool, not an archive — there is no server copy of your work to restore from, by design.' },
            { label: 'Your device, your limits', text: 'Processing happens on your machine, so very large files are bounded by your device’s memory and browser limits rather than by us. If a 4K export stutters on an older phone, that is physics, not a breach of these terms.' },
        ],
    },
    {
        id: '04',
        title: 'Your content stays yours',
        items: [
            { label: 'Full ownership', text: 'Everything you create — invoices, receipts, agreements, letterheads, videos, images, plans, cutouts, cards, palettes — belongs entirely to you. We claim no license to it, because it never reaches us in the first place. Use your exports commercially, modify them, sell them: they are yours with no conditions from us.' },
            { label: 'The one exception: share links', text: 'When you create a share link, you give us permission to host that one document so the link can open for whoever you send it to. That permission exists only to make your link work; you can ask us to remove a stored link at creatorskit26@gmail.com.' },
            { label: 'No watermarks on your work', text: 'Exports are clean — we do not stamp your photos, videos, or documents. The only branding anywhere is the "Made with CreatorsKit" footer on pages shared through our link service, which credits the tool rather than marking your content.' },
        ],
    },
    {
        id: '05',
        title: 'Business documents & templates',
        items: [
            { label: 'Templates, not advice', text: 'Invoices, receipts, agreements, and letterheads produced here are templates you fill in. You are responsible for the accuracy of amounts, tax, terms, names, dates, and signatures, and for whether a document suits your legal or tax situation. CreatorsKit is not a law firm or an accountant — for anything consequential, get professional review.' },
            { label: 'Agreements & signatures', text: 'The agreement tool formats a contract you define. It does not verify identity, witness signatures, or make a contract enforceable — that depends on you, your counterpart, and applicable law.' },
            { label: 'Payment details are yours to share carefully', text: 'Documents can include payment channels such as MoMo numbers or bank details. Those details become visible to anyone who receives the document or link. Include exactly what you intend clients to see.' },
            { label: 'Currency & totals', text: 'The tools calculate totals, discounts, and tax from what you enter. Always sanity-check the final document before sending it to a client — a wrong digit in your rate field is your digit, not ours.' },
        ],
    },
    {
        id: '06',
        title: 'Share links',
        items: [
            { label: 'Your link, your recipient', text: 'A share link works like a document in an envelope: anyone holding it can open it, including people your recipient forwards it to. We cannot control forwarding once you have sent a link — share deliberately.' },
            { label: 'Two kinds, one rule', text: 'Encoded links (the whole document inside the URL) never touch our servers and cannot be revoked by anyone. Stored short links (/r/…) live in our database and can be removed on request at creatorskit26@gmail.com.' },
            { label: 'Lawful content only', text: 'Share links must not be used for phishing, impersonation, fraud, harassment, or distributing illegal content. Abusive links will be removed when we become aware of them.' },
            { label: 'Lifetime', text: 'Stored links remain viewable until removed. If you want a link gone, ask and it goes — but treat every link you send as permanent for safety’s sake.' },
        ],
    },
    {
        id: '07',
        title: 'AI features & bring-your-own-key',
        items: [
            { label: 'Your key, your account, your cost', text: 'Demystify works with your own Groq, OpenAI, or Google Gemini API key. You are responsible for having the right to use that key, for keeping it safe in your browser, and for any costs or limits under your provider’s plan. Your relationship with the provider is yours alone.' },
            { label: 'Provider terms apply', text: 'When you use an AI feature, the provider’s own terms and acceptable-use policies govern what you may ask for. We simply forward your request without adding anything to it.' },
            { label: 'Outputs may be imperfect', text: 'AI-generated plans and text can be inaccurate, incomplete, or outdated. Verify anything important before acting on it. We do not guarantee any particular model will remain available — providers retire models, and the tool updates its model list to cope.' },
            { label: 'Nothing learned from you', text: 'Your prompts are processed for the response and discarded; we do not train anything on your ideas and keep no archive of them (see the Privacy Policy).' },
        ],
    },
    {
        id: '08',
        title: 'Acceptable use',
        items: [
            { label: 'Don’t harm people', text: 'Don’t use CreatorsKit or its share links for phishing, scams, fraud, harassment, impersonation, malware, or distributing illegal content. Don’t create documents that misrepresent who you are or what someone owes.' },
            { label: 'Don’t harm the service', text: 'No scraping the site at scale, hammering our APIs, attempting to bypass rate limits, enumerating or extracting other people’s share links, reverse-engineering our infrastructure, or reselling the suite as your own product.' },
            { label: 'Respect other people’s rights', text: 'Only upload content you have the right to use — your footage, licensed assets, or material you have permission to process. Copyright and personality rights apply to thumbnails, cutouts, and quote cards like everywhere else.' },
            { label: 'Enforcement', text: 'We may rate-limit, block abusive traffic, or remove abusive share links, with no obligation to warn first. These are edge cases; normal creative use will never come near this section.' },
        ],
    },
    {
        id: '09',
        title: 'Fees & the free model',
        items: [
            { label: 'Today: zero', text: 'Every tool is free. We don’t take payments, hold card details, or run subscriptions, and there is no account to bill.' },
            { label: 'Tomorrow, if ever', text: 'If paid tiers launch (higher limits, cloud conveniences), free tools stay free and paid features will always require an explicit purchase you initiate, at prices shown on a pricing page before anything is charged.' },
            { label: 'Why ads', text: 'The site may show advertising to keep tools free (see Privacy Policy section 9). Ads live in reserved slots and never interrupt a tool flow or an export.' },
        ],
    },
    {
        id: '10',
        title: 'Intellectual property',
        items: [
            { label: 'Ours', text: 'The site, its design, code, and tool implementations are © CreatorsKit 2026. You may not copy the suite’s code or design to operate a competing service, and you may not present the tools as your own product.' },
            { label: 'Yours', text: 'Your content (section 4) and any third-party assets you bring into the tools (fonts, logos, footage) remain subject to the rights you already have in them.' },
            { label: 'The badge', text: 'Pages shared through our link service carry a small "Made with CreatorsKit" footer. It identifies the tool that made the document and may not be stripped from documents shared through that service.' },
        ],
    },
    {
        id: '11',
        title: 'Disclaimers',
        items: [
            { label: 'No warranty', text: 'The service is provided "as is," without warranties of any kind, express or implied — including fitness for a particular purpose, accuracy, or uninterrupted availability. Exports depend on your browser, device, and available memory; check important exports before you rely on them.' },
            { label: 'Not professional advice', text: 'Document templates, plans, and AI-generated content are informational. They are not legal, tax, financial, or professional advice.' },
            { label: 'Third-party dependencies', text: 'AI providers, CDNs, hosting, and ad networks are outside our control; their availability and behavior are theirs, and outages there can affect features here.' },
        ],
    },
    {
        id: '12',
        title: 'Limitation of liability & indemnity',
        items: [
            { label: 'Liability cap', text: 'To the maximum extent permitted by law, CreatorsKit’s total liability arising from your use of the service is limited to the amount you paid us for the service in question — which, while the tools are free, is zero. We are not liable for lost profits, lost data, or indirect damages.' },
            { label: 'What we are not responsible for', text: 'Your files (processed and stored on your device), your recipients (who you choose to send links to), your AI provider (your account and key), and other people’s content you choose to upload.' },
            { label: 'Your side', text: 'You agree to use the service lawfully and within these terms; if your misuse of CreatorsKit causes a claim against us, you will cover the damages that misuse directly caused. Normal, good-faith creative use will never trigger this.' },
        ],
    },
    {
        id: '13',
        title: 'Termination & walking away',
        items: [
            { label: 'Leave any time', text: 'There is no account to close. Stop using the site, clear your browser storage or uninstall the app, and every trace on your side is gone (see /your-data).' },
            { label: 'Our side', text: 'We may restrict access for abuse (section 8) or wind down features as the product evolves. If a tool is ever retired, we will say so publicly rather than let it silently rot.' },
            { label: 'What survives', text: 'Share links you already sent may keep working (until removed), and these terms keep governing them.' },
        ],
    },
    {
        id: '14',
        title: 'Governing law & general terms',
        items: [
            { label: 'Ghana', text: 'These terms are governed by the laws of Ghana, and disputes fall under Ghanaian jurisdiction. Where good-faith conversation can resolve something, we will always try that first — email us.' },
            { label: 'Changes', text: 'We may update these terms as the product evolves. The "last updated" date on this page changes with every revision, and continued use after an update means you accept the current version.' },
            { label: 'Severability', text: 'If any clause is unenforceable, the rest still applies.' },
            { label: 'Entire agreement', text: 'These terms (plus the Privacy Policy) are the whole agreement between you and CreatorsKit regarding the service, superseding anything prior.' },
            { label: 'Contact', text: 'creatorskit26@gmail.com · X @creatorskit.' },
        ],
    },
];

export default function TermsPage() {
    return (
        <LegalPage
            badge="TERMS OF SERVICE"
            title="Use it. Own what you make."
            updated="OCTOBER 3, 2026"
            intro={INTRO}
            sections={SECTIONS}
            sibling={{ href: '/privacy', label: 'PRIVACY POLICY' }}
        />
    );
}
