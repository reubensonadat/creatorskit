import type { Metadata } from 'next';
import { toolMetadata, buildKeywords } from '@/lib/seo';

export const metadata: Metadata = toolMetadata({
    title: 'Your Data — Everything CreatorsKit Stores, Viewable & Deletable | CreatorsKit',
    description:
        'See every file and setting CreatorsKit has saved on your device — per tool, with sizes and last-used dates. View, delete, or export it all as one ZIP. Nothing is stored on any server.',
    path: '/your-data',
    keywords: buildKeywords(
        [
            'your data',
            'data transparency',
            'delete my data',
            'export my data',
            'privacy checker',
            'local storage viewer',
        ],
        [
            'see what a website stores',
            'delete browser data per tool',
            'on-device storage viewer',
            'no server storage',
            'data export zip',
        ],
    ),
});

export default function YourDataLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
