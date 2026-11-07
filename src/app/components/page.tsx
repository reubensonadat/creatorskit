import type { Metadata } from 'next';
import DirectoryExplorer from '@/components/directory/DirectoryExplorer';
import { SITE_BASE_URL } from '@/lib/seo';

/**
 * /components — the owner's personal UI component directory.
 * The interactive half lives in DirectoryExplorer (client); this file owns
 * metadata/SEO so the page can stay a server component.
 */
export const metadata: Metadata = {
    title: 'UI Component Directory — Search Every Component Library At Once | CreatorsKit',
    description:
        'A personal armory of the best UI component sites — uiverse, 21st.dev, shadcn/ui, Aceternity, Magic UI, Mobbin and 35 more. Search them all at once, never build components from scratch again.',
    alternates: { canonical: '/components' },
    openGraph: {
        title: 'UI Component Directory — CreatorsKit',
        description:
            '40+ component libraries, galleries and icon sets, searchable from one box. Never build UI from scratch again.',
        url: `${SITE_BASE_URL}/components`,
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'UI Component Directory — CreatorsKit',
        description: 'Search uiverse, 21st.dev, shadcn and 37 more libraries from one box.',
    },
};

export default function ComponentsDirectoryPage() {
    return <DirectoryExplorer />;
}
