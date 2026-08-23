import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CreatorKit — Creator Production Suite',
    short_name: 'CreatorKit',
    description: 'All-in-one brutalist production tools, 3D studio space planner, teleprompter, sync slate, and creator utilities.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090D16',
    theme_color: '#FFE500',
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
        name: '3D Space Planner',
        short_name: 'Space Planner',
        description: 'Design & pre-visualize your studio space in 3D',
        url: '/space-planner',
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
