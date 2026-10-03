import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, softwareAppJsonLd, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'How to Stop Procrastinating — Make the Big Task Small | Demystify | CreatorsKit',
    description:
        'How to stop procrastinating: type the big task you keep avoiding and get it back as small, checkable steps plus a mind map. Bring your own free AI key (Groq, OpenAI or Gemini) — every step links to the free CreatorsKit tool that executes it. Nothing is stored on our servers.',
    path: '/demystify',
    keywords: buildKeywords(
        [
            'how to stop procrastinating',
            'stop procrastinating tool',
            'make a big task look small',
            'break big task into small steps',
            'ai mind map generator',
            'notebooklm alternative',
            'anti procrastination planner',
            'ai project planner',
            'idea to steps generator',
            'byok ai tool',
            'free ai planner',
        ],
        [
            'how to stop procrastinating on my project',
            'how to start when you dont feel like it',
            'how to make a big task look small',
            'how to break down a big task into small steps',
            'what to do when a task feels too big',
            'ai mind map of things i need to do',
            'turn my idea into a step by step plan free',
            'action plan generator no signup',
            'free notebooklm style mind map planner',
            'how to start a youtube channel step by step',
            'free ai planner no signup',
            'creatorskit demystify',
        ],
    ),
});

const lds = [
    softwareAppJsonLd({
        name: 'CreatorsKit Demystify',
        description:
            'BYOK AI planner that turns a rough idea into numbered, checkable steps — each linked to the CreatorsKit tool that executes it.',
        path: '/demystify',
        featureList: [
            'Idea to numbered plan in one click',
            'Bring your own key: Groq, OpenAI or Gemini',
            'Steps link straight to creator tools',
            'Progress checkboxes with Markdown & JSON export',
            'Keys stay in your browser — nothing stored server-side',
        ],
    }),
    breadcrumbJsonLd('/demystify', 'Demystify'),
];

export default function DemystifyLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
