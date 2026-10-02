import type { Metadata } from 'next';
import { toolMetadata, buildKeywords, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'CreatorsKit Blog — Creator Growth, Tools & Monetization Guides',
    description:
        'Practical guides for creators: growing on YouTube and TikTok, monetization, invoicing brands, thumbnails, captions and the business of content.',
    path: '/blog',
    keywords: buildKeywords(
        [
            'creator blog',
            'youtube growth tips',
            'content creator tips',
            'creator monetization',
            'influencer marketing guide',
            'creator tools blog',
            'video editing tips',
            'social media growth',
            'creator business advice',
            'tiktok growth tips',
        ],
        [
            'how to grow on youtube',
            'how to get brand deals',
            'creator economy insights',
            'freelance creator advice',
            'thumbnail best practices',
            'caption accessibility tips',
            'video seo tips',
            'short form video strategy',
            'content calendar tips',
            'creator invoice basics',
            'youtube algorithm guide',
            'tiktok algorithm explained',
            'faceless channel ideas',
            'viral video formulas',
            'creator equipment guides',
            'budget creator gear',
            'mobile filmmaking tips',
            'instagram reels strategy',
            'audience building tactics',
            'newsletter for creators',
        ],
    ),
});

const lds = [breadcrumbJsonLd('/blog', 'Blog')];

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {lds.map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
            ))}
            {children}
        </>
    );
}
