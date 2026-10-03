/**
 * /about — who builds CreatorsKit, why it exists, and the promises
 * the product is built on. Every claim here is real: solo founder in
 * Ghana, on-device-first architecture, no accounts, free core, funded
 * by light ads (never inside a tool flow).
 */

import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';
import { toolMetadata, buildKeywords } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'About CreatorsKit — Free Creator Tools, Built in Ghana, Run on Your Device | CreatorsKit',
    description:
        'CreatorsKit is a suite of 20+ free browser tools for creators and freelancers — built by one person in Ghana, running on-device so your files stay yours. No accounts, no watermarks, no server copies of your work.',
    path: '/about',
    keywords: buildKeywords(
        ['about creatorkit', 'creatorskit', 'free creator tools'],
        ['who made creatorkit', 'ghana creator tools', 'on-device creator suite', 'no account tools'],
    ),
});

const INTRO =
    'CreatorsKit (creatorskit.win) is a suite of 20+ free browser tools for people who make things and bill for them — creators, freelancers, and small businesses. It is built and run by one person in Ghana. Everything runs on-device: your photos, videos, and documents are processed by your own browser and stored on your own device. No accounts, no uploads, no watermarks on your work.';

const SECTIONS: LegalSection[] = [
    {
        id: '01',
        title: 'Why CreatorsKit exists',
        items: [
            { label: 'Built out of real need', text: 'The suite started as tools the founder built for their own creator work — scripting videos, captioning them, cutting clips, invoicing brands — and kept growing because every tool solved a problem that was actually in the way.' },
            { label: 'Made for real conditions', text: 'Built in Ghana, for the conditions we know: mobile data is expensive, phones vary wildly, and free tools that quietly upload your files are not a favor. That is why processing happens on your device (it also saves your data) and why exports are clean — no watermarks, no "upgrade to download."' },
            { label: 'Small on purpose', text: 'One builder, no investors, no growth hacks. The site costs almost nothing to run because your device does the heavy lifting — which means the tools can stay free without turning you into the product.' },
        ],
    },
    {
        id: '02',
        title: 'The promises',
        items: [
            { label: 'On-device first', text: 'If a job can run in your browser, it runs in your browser — resizing, watermarking, compressing, captioning, cutting, compositing, planning. Only a handful of optional features touch the internet, and the Privacy Policy names every one of them.' },
            { label: 'No accounts', text: 'There is nothing to sign up for. No email, no password, no profile. Your identity is never the price of a tool.' },
            { label: 'Your files stay yours', text: 'Nothing you load into a tool is uploaded. Your working files live in your browser’s storage on your device — viewable, deletable, and exportable any time at /your-data.' },
            { label: 'Clean exports', text: 'No watermarks on your photos, videos, or documents. The only branding anywhere is a small "Made with CreatorsKit" footer on pages shared through our link service — credit for the tool, never a mark on your work.' },
            { label: 'Free core, forever', text: 'The tools are free. The site is funded lightly — ads in reserved slots, never inside a tool flow or before an export. If paid conveniences ever launch, the free tools stay free.' },
        ],
    },
    {
        id: '03',
        title: 'What’s inside',
        items: [
            { label: 'Get paid', text: 'Invoices, receipts, agreements, and letterheads for creator businesses — MoMo and bank payment fields built in, plus share links that open beautifully for clients. Send an invoice; the client pays; done.' },
            { label: 'Make the video', text: 'Teleprompter for scripts, auto-captions for subtitles, text highlighter and match cut for kinetic typography, sync slate for multi-cam takes, thumbnail lab and its 3-second glance test.' },
            { label: 'Ship it everywhere', text: 'Resizer for every platform format, watermark to protect your work, compress & convert to save data, carousel slicer for posts, background remover, text-behind-image posters, quote cards, palettes and gradients for brand looks.' },
            { label: 'Plan it', text: 'Demystify turns a big idea into a numbered, checkable plan with links straight into the tools that execute each step — bring your own AI key and it plans with the model you choose.' },
            { label: 'Give something', text: 'Bouquet builds digital gift pages — flowers, a card, a message — for birthdays and moments that deserve more than a text.' },
        ],
    },
    {
        id: '04',
        title: 'The boring-but-important parts',
        items: [
            { label: 'Privacy', text: 'Full policy at /privacy: no tracking cookies, no profiles, nothing sold. The short version is at the top of that page, and /your-data shows you everything stored on your device with one-click deletion and export.' },
            { label: 'Terms', text: 'The terms at /terms are short on purpose: use the tools, keep what you make, don’t abuse the service. Governed by the laws of Ghana.' },
            { label: 'AI features', text: 'The AI planner works with your own API key (Groq, OpenAI, or Google Gemini) — your key, your cost, your choice of model. It is stored only in your browser and forwarded only when you ask for a plan.' },
        ],
    },
    {
        id: '05',
        title: 'Say hello',
        items: [
            { label: 'Contact', text: 'creatorskit26@gmail.com — for questions, feature ideas, bug reports, or removing a share link. Or find us on X @creatorskit.' },
            { label: 'Made with it', text: 'Everything on this site — every tool, page, and document template — was built and tested with the same tools it offers. If it isn’t good enough for a working creator’s deadline, it doesn’t ship.' },
        ],
    },
];

export default function AboutPage() {
    return (
        <LegalPage
            badge="ABOUT"
            title="Free tools. Your device. Your data."
            updated="OCTOBER 3, 2026"
            intro={INTRO}
            sections={SECTIONS}
            sibling={{ href: '/privacy', label: 'PRIVACY POLICY' }}
        />
    );
}
