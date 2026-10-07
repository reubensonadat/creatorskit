/**
 * /privacy — CreatorsKit Privacy Policy.
 *
 * Every claim in this document describes how the app actually behaves,
 * as built: local-first tools, no accounts, per-feature server round-trips
 * listed honestly (site loading, BYOK proxy, cloud transcription, video
 * grabber, oEmbed, model downloads, share links), advertising, third
 * parties, transfers, retention, and self-serve control at /your-data.
 * Update this page whenever a feature changes what leaves the device.
 */

import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';
import { toolMetadata, buildKeywords } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Privacy Policy — Local-First, No Accounts, Your Files Stay Yours | CreatorsKit',
    description:
        'CreatorsKit runs in your browser. No accounts, no profiles, no tracking cookies. This policy documents exactly what stays on your device, what each optional cloud feature sends, who our providers are, how long anything is kept, and how to view, delete, or export everything at any time.',
    path: '/privacy',
    keywords: buildKeywords(
        ['privacy policy', 'data protection', 'no account needed', 'on-device processing'],
        ['browser only creator tools', 'no server storage', 'local first privacy', 'ghana data protection', 'no tracking cookies'],
    ),
});

const INTRO =
    'CreatorsKit is a suite of creator tools that runs in your browser. There is no sign-up, no account, and no profile. Your photos, videos, documents, and settings are processed on your device and stored on your device. We only receive data over the internet when a page loads or when you deliberately use a feature that needs it — and every one of those features is listed in sections 4 and 5 below, in plain words. You can see and delete everything the site has stored, any time, at /your-data. If anything in this policy is unclear, our contact details are in section 16.';

const SECTIONS: LegalSection[] = [
    {
        id: '01',
        title: 'Who we are and what this covers',
        items: [
            { label: 'The operator', text: 'CreatorsKit (creatorskit.win) is a free suite of browser-based tools for creators, freelancers, and small businesses, built and operated from Ghana. For the purposes of data protection law, CreatorsKit is the data controller for the little data this policy describes — and we have deliberately kept that "little" as small as the product allows.' },
            { label: 'What this policy covers', text: 'It applies to every page and tool on creatorskit.win, including the AI planner, the business suite (invoices, receipts, agreements, letterheads), video and image tools, and any public share links created with them. It explains what information is handled, where it lives, who else is involved, how long anything is kept, and the controls you have.' },
            { label: 'How to read it', text: 'Sections 3 and 4 are the heart: what never leaves your device, and what does when you choose a cloud feature. Sections 6–10 cover cookies, analytics, advertising, and the third parties we rely on. The rest covers your rights, retention, international transfers, and law.' },
        ],
    },
    {
        id: '02',
        title: 'What we never collect',
        items: [
            { label: 'No accounts', text: 'We do not collect names, emails, phone numbers, birthdays, or any identifier when you use the tools. There is nothing to register and nothing to log in with.' },
            { label: 'No files on our servers', text: 'Photos, videos, audio, invoices, plans, thumbnails, and exports are processed by your browser (canvas, WebAssembly, WebCodecs) and saved only to your device storage. Loading a file into a tool does not upload it anywhere.' },
            { label: 'No tracking of you', text: 'We set no tracking cookies, build no advertising profiles, do no cross-site tracking, and do no device fingerprinting. We do not know who you are, and we designed the product so we never need to.' },
            { label: 'No selling or sharing of personal data', text: 'We do not sell, rent, or trade personal data, and we do not share it with data brokers — there is no personal-data inventory to sell. That is the point of building local-first.' },
        ],
    },
    {
        id: '03',
        title: 'What stays on your device',
        items: [
            { label: 'Working files (IndexedDB)', text: 'Tools remember your work between visits — watermark queues and logo libraries, resizer sources and presets, thumbnail-lab candidates, carousel slices, compressor queues, teleprompter scripts, sync-slate take logs, quote-card decks, demystify plans — in your browser’s IndexedDB database ("ck_local_memory"). None of this ever leaves the device.' },
            { label: 'Settings and preferences (localStorage)', text: 'Tool settings, brand kits, watermark positions, remembered formats, and similar preferences live in your browser’s localStorage under keys beginning with "ck_". These are functional, not tracking: they exist so the tool greets you with your own setup next visit.' },
            { label: 'Your AI keys (if you use AI features)', text: 'If you choose to use Demystify with your own Groq, OpenAI, or Google Gemini API key, that key is stored in your browser’s localStorage and sent only with the requests you make (see section 5). It is never written to any server of ours.' },
            { label: 'App cache (PWA)', text: 'CreatorsKit is installable as an app (PWA). Its cached files — the site’s own code, images, and AI model files you have downloaded — live in your browser’s cache on your device, so tools work fast and some work offline.' },
            { label: 'See it, delete it, export it', text: 'The /your-data page lists every per-tool store on your device with sizes and dates. You can view contents, delete any tool’s memory individually, or export everything as one ZIP. Deleting it there deletes it permanently — there is no server copy to recover or to ask us about.' },
        ],
    },
    {
        id: '04',
        title: 'What the website itself sends',
        items: [
            { label: 'Just loading pages', text: 'Like any website, opening creatorskit.win sends standard technical requests to our hosting (edge/CDN on Cloudflare/Vercel): your IP address, browser type, the page requested, and timing. These are used to serve the page, keep the site secure, and rotate away in short-lived server logs. They are not used to profile or identify you.' },
            { label: 'Assets from CDNs', text: 'Pages load images, scripts, and fonts from content delivery networks — the same requests any website makes. Notably, some text tools load fonts from Google Fonts, so Google sees the font request from your browser.' },
        ],
    },
    {
        id: '05',
        title: 'Optional cloud features — what each one sends',
        items: [
            { label: 'The honest list', text: 'Almost everything in CreatorsKit works entirely on your device. The exceptions below only activate when you explicitly use them, and each one names exactly what is sent and where it goes.' },
            { label: 'AI planning with your own key (Demystify)', text: 'If you paste your own Groq, OpenAI, or Google Gemini API key, your idea text and that key are forwarded to the AI provider you chose so a plan can be generated. Your key is used for that request only — it is never stored, logged, or kept on any server of ours. The idea text is processed for the response and then discarded. Your provider’s own privacy policy governs how they handle the request.' },
            { label: 'Cloud transcription (optional engine)', text: 'Auto-captions can transcribe entirely on your device. If the cloud engine is used, your audio is sent over HTTPS to our transcription worker, converted to timed text for your job, and discarded after the job completes. We do not keep an archive of your audio or transcripts.' },
            { label: 'Video Grabber', text: 'When you ask it to fetch a video, the URL you enter is sent to our worker, which retrieves the file and streams it back to your browser. We keep no library of fetched videos.' },
            { label: 'AI background removal', text: 'The first time you use it, AI model files are downloaded from a content delivery network into your browser cache. After that, cutouts run entirely on your device.' },
            { label: 'YouTube reference import', text: 'Importing a YouTube reference into Thumbnail Lab fetches the video’s public title and thumbnail through YouTube’s oEmbed service. Only the video URL/ID you enter is used.' },
            { label: 'Bouquet gift pages', text: 'A bouquet is a gift page meant to be opened by its recipient — creating one and sharing the link is, by design, sending that page’s content (your message, flowers, card) to the person you are gifting.' },
        ],
    },
    {
        id: '06',
        title: 'Share links (invoices, receipts, agreements, bouquets)',
        items: [
            { label: 'Two kinds of link', text: 'When you share a business document or a gift page, there are two modes. In link mode, the entire document is encoded inside the link itself — that link never touches our servers, and whoever you send it to can open it directly. In short-link mode, the document is stored in our database (Supabase) so a tidy URL (like /r/ABC123) can be opened by anyone who receives it.' },
            { label: 'Only what you type', text: 'A shared document contains exactly the details you entered — your business name, contact email or phone, payment channels like MoMo numbers, line items, notes, and branding you chose to include. Check what a document contains before sharing it; do not share details you want to keep private.' },
            { label: 'Anyone with the link can view', text: 'A share link works like a document in an envelope: anyone holding the link can open it, including people your recipient forwards it to. Share links only with the client or person they are meant for.' },
            { label: 'Removing a stored link', text: 'Encoded links live wherever you sent them — we cannot revoke those. Short links stored in our database can be removed: contact us at creatorskit26@gmail.com with the link and we will delete it.' },
            { label: 'The badge', text: 'Shared pages carry a small "Made with CreatorsKit — free creator tools" footer. That footer identifies the tool that made the document; it does not add tracking to the page.' },
        ],
    },
    {
        id: '07',
        title: 'Analytics & measurement',
        items: [
            { label: 'Your choice comes first', text: 'The first time you visit, a small banner asks you to Accept or Deny analytics and advertising cookies. Until you Accept, Google Analytics runs in consent-denied mode: it stores no cookies and sets no identifiers. Deny, and it stays that way — every tool works identically either way. Your choice is remembered in your browser (localStorage key "ck_consent_v1") and you can change it anytime by clearing site data.' },
            { label: 'Google Analytics 4 (after you Accept)', text: 'If you accept, Google Analytics 4 counts how often pages and tools are opened, from roughly where and on what kind of device, using Google’s cookies (such as _ga) under Google’s privacy terms. You can review or reset them in your browser and in Google’s activity controls. We enable IP anonymization and do not use GA to build advertising profiles.' },
            { label: 'How many said yes or no', text: 'To know the accept/deny ratio, GA4 receives a cookieless consent signal when the banner is answered — including for people who deny. That signal carries no identifier and stores nothing on your device; it exists purely so we can see, in aggregate, how visitors feel about tracking.' },
            { label: 'Count events, never people', text: 'Analytics answers one question: which tools do people find useful. No replay recording, no session recording, no cross-site profiles, no personal data exports. Our operating principle, from the business plan this product is built on: count events, never people.' },
        ],
    },
    {
        id: '08',
        title: 'Cookies and local storage',
        items: [
            { label: 'No cookies of our own', text: 'We set no cookies ourselves — none. The only cookies ever present come from Google Analytics and ad networks, and only if you accepted them in the banner. Deny and your browser stays cookie-free from us.' },
            { label: 'Functional storage only', text: 'The site’s storage (IndexedDB + localStorage, described in section 3) is strictly functional — remembering your work and settings between visits. It is readable by you (via /your-data) and removable at any time from your browser settings.' },
            { label: 'Do Not Track', text: 'Because we do not track you in the first place, Do Not Track and Global Privacy Control signals are respected by default — there is nothing on our side to switch off.' },
        ],
    },
    {
        id: '09',
        title: 'Advertising',
        items: [
            { label: 'Why ads exist here', text: 'Ads keep every tool free. Advertising appears only in reserved slots on free pages (such as side and footer banners) — never inside a tool’s workflow before an export, and never blocking your file.' },
            { label: 'Ad networks and their cookies', text: 'Ad slots are served by advertising networks (such as Google AdSense when live). Those networks may set their own cookies or similar technologies subject to their own privacy policies — including to measure or personalize ads. You can review and control Google’s ad settings at Google’s “Ads Settings” page, and most browsers let you limit third-party cookies entirely.' },
            { label: 'Sponsored screens on mobile', text: 'On mobile, occasionally a short sponsored screen appears before an external site opens, plus a once-per-session banner. These are house features to keep the service free; they collect nothing beyond what section 4 already describes.' },
            { label: 'Future rewarded ads', text: 'If we ever add “watch an ad for one extra AI use” flows, this section will say so plainly before it ships.' },
        ],
    },
    {
        id: '10',
        title: 'Third-party services we rely on',
        items: [
            { label: 'Hosting & delivery', text: 'Cloudflare / Vercel serve the site and its API routes globally. They process standard technical request data (IP, timestamps) to deliver pages and protect against abuse.' },
            { label: 'Share-link storage & background jobs', text: 'Supabase hosts the database that stores short share links and the edge functions that power Video Grabber jobs. It stores only what a share link itself contains (section 6) — never your device data.' },
            { label: 'AI providers (only if you bring a key)', text: 'Groq, OpenAI, and Google process your idea text when you use Demystify with your own key, under their own policies. We forward the request; we do not add anything to it.' },
            { label: 'Fonts and media CDNs', text: 'Google Fonts serves typefaces; CDNs serve images, scripts, and AI model files. These providers see standard web requests from your browser.' },
            { label: 'What each one gets', text: 'The pattern throughout: each third party receives only the minimum needed to serve the specific feature you used — a URL to fetch, an audio stream to transcribe, a document to host, a font to serve. No third party receives your identity from us, because we do not have it.' },
        ],
    },
    {
        id: '11',
        title: 'How we protect data',
        items: [
            { label: 'Encrypted transport', text: 'Everything travels over HTTPS. API keys forwarded for AI features are transmitted per request and never persisted or logged on our servers.' },
            { label: 'Nothing to breach', text: 'The most important security measure is architectural: because there is no central user database — no passwords, no profiles, no stored files — there is no honeypot for a breach. The data that matters most (your work) sits on your device, protected by your device’s own security.' },
            { label: 'Abuse prevention', text: 'Server-side rate limits and one-time upload grants protect the shared infrastructure (transcription, video grabbing) from abuse. These safeguards process request metadata only.' },
            { label: 'Honest limits', text: 'No system is perfect. If something ever goes wrong that affects information you shared with us (for example, a stored share link), we will say so plainly and fix it — you can hold us to that.' },
        ],
    },
    {
        id: '12',
        title: 'Children',
        items: [
            { label: 'Age requirement', text: 'CreatorsKit is intended for creators aged 13 and above. We do not knowingly collect personal information from children under 13 — and because the tools collect no personal information at all, there is normally nothing to collect from anyone.' },
            { label: 'If you are a parent or guardian', text: 'If you believe a child has shared personal information through a feature (for example, typing their phone number into a shared invoice), contact us at creatorskit26@gmail.com and we will remove the stored document.' },
        ],
    },
    {
        id: '13',
        title: 'Your rights — self-serve by design',
        items: [
            { label: 'Access & portability', text: 'Open /your-data to see every stored item per tool, and click EXPORT ALL to download everything as a ZIP you can take anywhere.' },
            { label: 'Deletion & erasure', text: 'Delete any tool’s memory with its DELETE button on /your-data, or clear your browser storage — that is the only copy in existence. Erasure is instant because storage is yours.' },
            { label: 'Withdrawal & objection', text: 'Stop using a cloud feature and nothing further is sent. Uninstalling the site or clearing browser storage removes every trace from your device.' },
            { label: 'Stored share links', text: 'To remove a stored short link, email creatorskit26@gmail.com with the link and we will delete it. Encoded links cannot be revoked (they live in the messages you sent) — share deliberately.' },
            { label: 'Complaints', text: 'If you believe we have mishandled information, contact us first at creatorskit26@gmail.com and we will make it right. You also have the right to complain to Ghana’s Data Protection Commission.' },
        ],
    },
    {
        id: '14',
        title: 'Data retention',
        items: [
            { label: 'On your device', text: 'Your working files and settings are kept until you delete them (see /your-data) or clear your browser data. Nothing expires on a timer because nothing is on our side to expire.' },
            { label: 'In-transit features', text: 'Idea text sent for AI plans, audio sent for transcription, and video URLs sent to the grabber are processed for the request and then discarded. We do not build archives of user content.' },
            { label: 'Stored share links', text: 'Short links are kept until removed (section 6) so your recipients can keep opening them. Contact us to remove one.' },
            { label: 'Server logs', text: 'Short-lived hosting logs (IP addresses, timestamps, error traces) exist for security and abuse prevention and are rotated away. They are not used to profile anyone.' },
        ],
    },
    {
        id: '15',
        title: 'International transfers & Ghana data protection law',
        items: [
            { label: 'Where processors sit', text: 'Some providers we rely on (Cloudflare, Vercel, Supabase, Google, OpenAI, Groq) process data in data centers outside Ghana. When you use a feature that touches them, that feature’s data may be processed in those countries, under the safeguards described in this policy and their own policies.' },
            { label: 'Act 843, 2012', text: 'CreatorsKit is built and operated from Ghana. We handle data consistent with the Ghana Data Protection Act, 2012 (Act 843) — and go further than it requires: the fastest way to satisfy “delete my data” is a product that never collected it.' },
        ],
    },
    {
        id: '16',
        title: 'Changes & contact',
        items: [
            { label: 'Policy updates', text: 'If this policy changes, the new version with a new “last updated” date replaces this page. Material changes (new cloud features, new categories of processing) will be described here before or when they ship.' },
            { label: 'Contact', text: 'Questions, data requests, or share-link removal: creatorskit26@gmail.com — or find us on X @creatorskit. We answer real messages from real people.' },
        ],
    },
];

export default function PrivacyPage() {
    return (
        <LegalPage
            badge="PRIVACY POLICY"
            title="Your data stays yours"
            updated="OCTOBER 3, 2026"
            intro={INTRO}
            sections={SECTIONS}
            sibling={{ href: '/terms', label: 'TERMS OF SERVICE' }}
        />
    );
}
