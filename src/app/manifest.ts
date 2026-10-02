import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CreatorsKit — Creator Production Suite',
    short_name: 'CreatorsKit',
    description:
      'All-in-one brutalist production tools for creators — teleprompter, auto captions, thumbnails, invoices & more. Free, instant, in your browser.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090D16',
    theme_color: '#000000',
    orientation: 'any',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Business & Legal Suite',
        short_name: 'Business',
        description: 'Invoices, receipts, contracts & letterheads for creators',
        url: '/business',
        icons: [{ src: '/logo.png', sizes: '192x192' }],
      },
      {
        name: 'Studio Teleprompter',
        short_name: 'Teleprompter',
        description: 'Voice-tracked scrolling teleprompter for creators',
        url: '/teleprompter',
        icons: [{ src: '/logo.png', sizes: '192x192' }],
      },
      {
        name: 'Sync Slate (Clapper)',
        short_name: 'Sync Slate',
        description: 'Timecode sync slate & audio sync tone generator',
        url: '/sync-slate',
        icons: [{ src: '/logo.png', sizes: '192x192' }],
      },
      {
        name: 'Thumbnail Lab',
        short_name: 'Thumbnails',
        description: 'Design high-converting YouTube thumbnails',
        url: '/thumbnail-lab',
        icons: [{ src: '/logo.png', sizes: '192x192' }],
      },
    ],
  };
}
