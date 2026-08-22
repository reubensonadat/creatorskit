export interface ToolItem {
  label: string;
  href: string;
  hint: string;
  desc: string;
  isFlagship?: boolean;
  isExternal?: boolean;
  category?: 'studio' | 'motion' | 'audio' | 'utility' | 'directory';
  externalUrl?: string;
  badge?: string;
}

// ─── 1. IN-HOUSE CREATORKIT TOOLS (100% Local · Zero Daily Maintenance) ─────
export const NATIVE_TOOLS: ToolItem[] = [
  {
    label: 'Text Match CUT',
    href: '/match-cut',
    hint: 'WORD ANCHOR',
    desc: 'Word-anchor kinetic typography match cuts & rapid visual transitions for short-form video',
    isFlagship: true,
    category: 'motion',
    badge: 'POPULAR',
  },
  {
    label: 'Text Highlighter',
    href: '/text-highlighter',
    hint: 'ANIMATED SWEEPS',
    desc: 'Cinematic animated marker sweeps, circle callouts, boxes & paper textures for viral videos',
    isFlagship: true,
    category: 'motion',
    badge: 'POPULAR',
  },
  {
    label: 'Creator Space Planner',
    href: '/space-planner',
    hint: '3D PRE-VIS',
    desc: 'Design 3D studio rooms with camera lens FOV cones, lighting Kelvin/Lux, and budget calculator',
    isFlagship: true,
    category: 'studio',
    badge: 'HERO',
  },
  {
    label: 'Production Sync Slate',
    href: '/sync-slate',
    hint: 'A/V CLAPPER',
    desc: 'SMPTE clapper slate with sub-frame timecode, 1kHz sync beep & CSV shot sheets',
    isFlagship: true,
    category: 'studio',
    badge: 'PRO',
  },
  {
    label: 'Studio Teleprompter',
    href: '/teleprompter',
    hint: 'AI SPEECH SYNC',
    desc: 'Voice Smart Speed, 52 Google Fonts, eyeline spotlight HUD & mirror glass display',
    isFlagship: true,
    category: 'studio',
    badge: 'ESSENTIAL',
  },
  {
    label: 'Thumbnail Lab & Split-Tester',
    href: '/thumbnail-lab',
    hint: 'CTR GRADER',
    desc: 'Simulate YouTube feeds, 3-second rapid glance tests, mobile Shorts shelves & CTR benchmarking',
    isFlagship: true,
    category: 'utility',
    badge: 'GROWTH',
  },
  {
    label: 'Social Platform Resizer',
    href: '/resizer',
    hint: 'AUTO-FORMAT',
    desc: 'Instant 1-click batch crop and aspect ratio formatting for YouTube, TikTok, IG & X with ZIP export',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Color Gradient Studio',
    href: '/color-gradient',
    hint: 'PALETTES & CSS',
    desc: 'Create multi-stop mesh & linear CSS gradients with color harmonics & CSS code export',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Palette Extractor',
    href: '/palette-extractor',
    hint: 'HEX CODES',
    desc: 'Extract dominant color palettes and contrast ratios from any image or thumbnail',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Carousel Slicer',
    href: '/carousel-slicer',
    hint: 'SEAMLESS POSTS',
    desc: 'Slice wide panoramic graphics into seamless multi-slide Instagram & LinkedIn posts',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Image Compressor Pro',
    href: '/compressor',
    hint: 'CLIENT-SIDE WEBP',
    desc: 'Fast in-browser WebP & JPEG compression with visual quality retention slider',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Exposure & False Color',
    href: '/exposure-monitor',
    hint: 'SCOPES & IRE',
    desc: 'ARRI/RED False Color shader, live waveforms, RGB parade & vectorscope',
    isFlagship: false,
    category: 'studio',
  },
  {
    label: 'Batch Watermark',
    href: '/watermark',
    hint: 'PROTECTION',
    desc: 'Batch apply logo stamps and copyright marks across images in bulk',
    isFlagship: false,
    category: 'utility',
  },
  {
    label: 'Quote Card Studio',
    href: '/quote-card',
    hint: 'GRAPHICS',
    desc: 'Basic typography quote cards and multi-slide carousels',
    isFlagship: false,
    category: 'utility',
  },
];

// ─── 2. CURATED EXTERNAL TOOLS (Routed Through 4-Sector Ad Bridge) ───────────
export const CURATED_DIRECTORY: ToolItem[] = [
  {
    label: 'Text Behind Image (Depth AI)',
    href: '/text-behind',
    hint: 'TEXTBEHINDIMAGE.COM',
    desc: 'Place 3D typography behind subjects in photos with automated depth isolation',
    isExternal: true,
    externalUrl: 'https://textbehindimage.com/',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'AI Background Cutout & Remove',
    href: '/background-replace',
    hint: 'FILECONV.ONLINE',
    desc: 'Instant AI subject isolation and background removal powered by FileConv Remove-BG',
    isExternal: true,
    externalUrl: 'https://fileconv.online/remove-bg',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'AI Silence & Pause Trimmer',
    href: '/redirect?url=https%3A%2F%2Fpodcastle.ai%2Ftools%2Fsilence-remover&name=Podcastle+Silence+Remover&desc=Automatically+detect+and+trim+dead+air%2C+filler+pauses%2C+and+silence+from+audio+and+video+recordings',
    hint: 'PODCASTLE.AI',
    desc: 'Automatically detect and trim dead air, filler pauses, and silence from recordings',
    isExternal: true,
    externalUrl: 'https://podcastle.ai/tools/silence-remover',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'Castos Podcast Quote Cards',
    href: '/redirect?url=https%3A%2F%2Fdynamo.castos.com%2Fquote-cards&name=Castos+Podcast+Cards&desc=Generate+viral+podcast+audiograms+and+soundbite+cards+with+Castos+Dynamo',
    hint: 'CASTOS DYNAMO',
    desc: 'Generate viral podcast audiograms and soundbite cards with Castos Dynamo',
    isExternal: true,
    externalUrl: 'https://dynamo.castos.com/quote-cards',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'Vocal & Stem Isolator',
    href: '/redirect?url=https%3A%2F%2Fvocalremover.org&name=Vocal+Remover+AI&desc=Split+music+tracks+into+isolated+voice%2C+drums%2C+bass%2C+and+instrumental+stems',
    hint: 'VOCALREMOVER.ORG',
    desc: 'Split music tracks into isolated voice, drums, bass, and instrumental stems',
    isExternal: true,
    externalUrl: 'https://vocalremover.org',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'Creator SFX & Sound Bites',
    href: '/redirect?url=https%3A%2F%2Ffreesound.org&name=Freesound+SFX+Library&desc=Free+whooshes%2C+cinematic+impacts%2C+risers%2C+and+sound+effects+library+for+video+editing',
    hint: 'FREESOUND.ORG',
    desc: 'Free whooshes, cinematic impacts, risers, and sound effects library for video editing',
    isExternal: true,
    externalUrl: 'https://freesound.org',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'Cinematic Color Grading LUTs',
    href: '/redirect?url=https%3A%2F%2Ffreshluts.com&name=FreshLUTs+Cinematic+Packs&desc=Download+free+cinematic+.cube+LUTs+for+Sony+S-Log3%2C+Canon+Log%2C+and+iPhone+ProRes',
    hint: 'FRESHLUTS.COM',
    desc: 'Download free cinematic .cube LUTs for Sony S-Log3, Canon Log, and iPhone ProRes',
    isExternal: true,
    externalUrl: 'https://freshluts.com',
    category: 'directory',
    badge: 'EXTERNAL',
  },
  {
    label: 'Stock 4K Video B-Roll',
    href: '/redirect?url=https%3A%2F%2Fwww.pexels.com%2Fvideos&name=Pexels+4K+Video+Library&desc=Free+commercial-use+4K+drone+shots%2C+studio+overlays%2C+and+creator+aesthetic+clips',
    hint: 'PEXELS.COM',
    desc: 'Free commercial-use 4K drone shots, studio overlays, and creator aesthetic clips',
    isExternal: true,
    externalUrl: 'https://www.pexels.com/videos',
    category: 'directory',
    badge: 'EXTERNAL',
  },
];

export const ALL_TOOLS: ToolItem[] = [...NATIVE_TOOLS, ...CURATED_DIRECTORY];
