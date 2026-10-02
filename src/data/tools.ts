/**
 * src/data/tools.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for every tool route in CreatorsKit.
 * Navigation chrome, home grid, sitemap and hand-offs all derive from this file.
 * No other component may keep a hardcoded route list (see
 * docs/TOOL_INTEGRATION_PLAN.md §3).
 */

export type ToolChrome = 'embedded' | 'fullscreen';
export type ToolStatus = 'live' | 'beta' | 'archived';

export interface ToolItem {
  label: string;
  href: string;
  hint: string;
  desc: string;
  category?: 'business' | 'studio' | 'motion' | 'audio' | 'utility' | 'directory' | 'archived';
  chrome: ToolChrome;
  status: ToolStatus;
  /** lucide icon name — resolved in one place by SiteNav */
  icon: string;
  /** hrefs this tool can hand its output to (docs/TOOL_INTEGRATION_PLAN.md §4) */
  handoffs?: string[];
  isFlagship?: boolean;
  isExternal?: boolean;
  externalUrl?: string;
  badge?: string;
}

// ─── 1. IN-HOUSE TOOLS (100% local · zero daily maintenance) ─────────────────
export const NATIVE_TOOLS: ToolItem[] = [
  {
    label: 'Creator Business & Legal Suite',
    href: '/business',
    hint: 'INVOICES & DEALS',
    desc: 'Influencer brand deal invoices (MoMo/Bank), sponsorship agreements, payment receipts & pitch letterheads',
    isFlagship: true,
    category: 'business',
    chrome: 'embedded',
    status: 'live',
    icon: 'FileText',
    badge: 'NEW FLAGSHIP',
  },
  {
    label: 'Thumbnail Lab & Split-Tester',
    href: '/thumbnail-lab',
    hint: 'CTR GRADER',
    desc: 'Simulate YouTube feeds, 3-second rapid glance tests, mobile Shorts shelves & CTR benchmarking',
    isFlagship: true,
    category: 'utility',
    chrome: 'fullscreen',
    status: 'live',
    icon: 'Images',
    badge: 'GROWTH',
  },
  {
    label: 'Studio Teleprompter',
    href: '/teleprompter',
    hint: 'PHONE & DESKTOP',
    desc: 'Grandma-simple mobile mode, voice sync, 52 Google Fonts, eyeline spotlight & selfie camera mirror',
    isFlagship: true,
    category: 'studio',
    chrome: 'fullscreen',
    status: 'live',
    icon: 'MonitorPlay',
    // §4: "the script I just rehearsed = the caption script"
    handoffs: ['/auto-captions'],
    badge: 'ESSENTIAL',
  },
  {
    label: 'Text Highlighter',
    href: '/text-highlighter',
    hint: 'ANIMATED SWEEPS',
    desc: 'Cinematic animated marker sweeps, circle callouts, boxes & paper textures for viral videos',
    isFlagship: true,
    category: 'motion',
    chrome: 'embedded',
    status: 'live',
    icon: 'Highlighter',
    // §4: reformat the rendered video for every platform
    handoffs: ['/resizer'],
    badge: 'POPULAR',
  },
  {
    label: 'Text Match CUT',
    href: '/match-cut',
    hint: 'WORD ANCHOR',
    desc: 'Word-anchor kinetic typography match cuts & rapid visual transitions for short-form video',
    isFlagship: true,
    category: 'motion',
    chrome: 'embedded',
    status: 'live',
    icon: 'Scissors',
    // §4: reformat the rendered video for every platform
    handoffs: ['/resizer'],
    badge: 'POPULAR',
  },
  {
    label: 'Auto Captions',
    href: '/auto-captions',
    hint: 'STUDIO SUBTITLES',
    desc: 'Generate subtitles for free. Fast, accurate, timestamped captions & subtitle export.',
    isFlagship: true,
    category: 'studio',
    chrome: 'embedded',
    status: 'live',
    icon: 'AudioLines',
    handoffs: ['/text-highlighter', '/match-cut', '/resizer'],
    badge: 'NEW',
  },
  {
    label: 'Digital Bouquet Studio',
    href: '/bouquet',
    hint: 'PRINTABLE BOTANICAL GIFT',
    desc: 'Craft a handcrafted flower bouquet with a personalized card and print it in real-time',
    isFlagship: true,
    category: 'studio',
    chrome: 'fullscreen',
    status: 'live',
    icon: 'Flower2',
    badge: 'NEW',
  },
  {
    label: 'Compress & Convert',
    href: '/compressor',
    hint: 'PDF ⇄ IMAGES · SAVE DATA',
    desc: 'Convert PDFs to images, images to PDF, or squeeze into WebP/JPG — with size estimates before you commit. 100% on-device',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'live',
    icon: 'FileImage',
    handoffs: ['/resizer'],
  },
  {
    label: 'Social Platform Resizer',
    href: '/resizer',
    hint: 'AUTO-FORMAT',
    desc: 'Instant 1-click batch crop and aspect ratio formatting for YouTube 16:9, TikTok 9:16, IG & X',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'live',
    icon: 'Maximize2',
    handoffs: ['/compressor'],
  },
  {
    label: 'Batch Watermark & Protection',
    href: '/watermark',
    hint: 'ANTI-THEFT',
    desc: 'Batch apply logo stamps and copyright marks across images in bulk to prevent content theft',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'live',
    icon: 'Droplets',
    handoffs: ['/compressor', '/resizer'],
  },
  {
    label: 'Carousel Slicer',
    href: '/carousel-slicer',
    hint: 'SEAMLESS POSTS',
    desc: 'Slice wide panoramic graphics into seamless multi-slide Instagram & LinkedIn posts',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'live',
    icon: 'Images',
    handoffs: ['/compressor', '/resizer'],
  },
  {
    label: 'Video Grabber',
    href: '/video-grabber',
    hint: 'AD-UNLOCKED SAVES',
    desc: 'Paste any video or audio link, watch one short ad, and save the file straight to your device',
    isFlagship: true,
    category: 'utility',
    chrome: 'fullscreen',
    status: 'beta',
    icon: 'Video',
    // YouTube currently bot-walls our server IP → grabber paused (see
    // docs/VIDEO_GRABBER_HANDOFF.md §8). Keep it visible but labeled so
    // visitors don't think the tool is broken; restore 'live' when
    // the VPS/residential route ships.
    badge: 'IN DEVELOPMENT',
  },
  {
    label: 'Text Behind Image',
    href: '/text-behind',
    hint: 'DEPTH POSTERS',
    desc: 'Type-behind-subject posters — on-device or server cutout, giant type sandwich, background dim & exports',
    isFlagship: true,
    category: 'studio',
    chrome: 'fullscreen',
    status: 'live',
    icon: 'Layers',
    handoffs: ['/thumbnail-lab', '/carousel-slicer', '/resizer'],
    badge: 'NEW',
  },
  {
    label: 'Quote Card Studio',
    href: '/quote-card',
    hint: 'INSTAGRAM & FACEBOOK QUOTES',
    desc: 'Design quote cards for Instagram & Facebook — per-card photos, background colours, batch upload, multi-card deck ZIP export. No AI, 100% on-device',
    isFlagship: false,
    category: 'studio',
    chrome: 'fullscreen',
    status: 'live',
    icon: 'Quote',
    // Owner ruling 2026-10-02: text-behind's interface, minus the AI model.
    handoffs: ['/text-behind', '/carousel-slicer', '/resizer'],
    badge: 'NEW',
  },
  {
    label: 'Background Remover & Cutout',
    href: '/background-replace',
    hint: 'ONE-CLICK PNG',
    desc: 'Remove any photo background on your device or our server — transparent PNG in seconds, hand-off to other tools',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'live',
    icon: 'Eraser',
    handoffs: ['/text-behind', '/thumbnail-lab', '/watermark'],
    badge: 'NEW',
  },
  // ── Promoted orphans (owner ruling 2026-10-02 — docs/TOOL_INTEGRATION_PLAN.md §5) ──
  {
    label: 'Color Palette Extractor',
    href: '/palette-extractor',
    hint: 'PULL BRAND COLORS',
    desc: 'Drop any photo and pull its exact color palette — HEX codes ready to copy, feeds the gradient studio',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'beta',
    icon: 'Palette',
    handoffs: ['/color-gradient'],
    badge: 'NEW',
  },
  {
    label: 'Sync Slate & Clapper',
    href: '/sync-slate',
    hint: 'MULTI-TAKE AUDIO SYNC',
    desc: 'Film-style sync slate with mic levels and take logging — pair it with the teleprompter on shoot day',
    isFlagship: false,
    category: 'studio',
    chrome: 'embedded',
    status: 'live',
    icon: 'Film',
    handoffs: ['/teleprompter'],
  },
  {
    label: 'Gradient & Palette Studio',
    href: '/color-gradient',
    hint: 'TEST ON A REAL PAGE',
    desc: 'Build beautiful, usable palettes and gradients — then test them live on a real website preview',
    isFlagship: false,
    category: 'utility',
    chrome: 'embedded',
    status: 'beta',
    icon: 'Paintbrush',
    handoffs: ['/text-behind', '/watermark'],
    badge: 'NEW',
  },
];

// ─── 2. HIDDEN ROUTES (rendered but not listed — hub sub-pages, folds, archives) ──
export const HIDDEN_TOOLS: ToolItem[] = [
  // Refresh-proof URL for the Auto Captions overlay deck: renders the captions
  // app with initialDeck="overlay" so reloading keeps you in the overlay studio
  // (session persists in IndexedDB). Linked from inside auto-captions.
  {
    label: 'Caption Overlay Studio (deck)',
    href: '/overlay',
    hint: 'OVERLAY DECK',
    desc: 'Standalone URL for the Auto Captions overlay deck — refresh without losing your workspace',
    chrome: 'embedded',
    status: 'live',
    icon: 'Video',
  },
  // (Space Planner was fully removed 2026-10-02 — route deleted, /space-planner
  // 301s to / in next.config.ts. Post-mortem: docs/BUSINESS_MODEL_PLAN.md.)
];

// ─── 3. CURATED EXTERNAL TOOLS (routed through the ad bridge) ────────────────
export const CURATED_DIRECTORY: ToolItem[] = [
  {
    label: 'AI Voiceover & Speech Dubbing',
    href: '/redirect?url=https%3A%2F%2Felevenlabs.io&name=ElevenLabs+Voice+AI&desc=Industry-leading+human-quality+AI+voiceover%2C+voice+cloning%2C+and+multilingual+speech+dubbing',
    hint: 'ELEVENLABS.IO',
    desc: 'Industry-leading human-quality AI voiceover, voice cloning, and multilingual speech dubbing',
    isExternal: true,
    externalUrl: 'https://elevenlabs.io',
    category: 'directory',
    chrome: 'embedded',
    status: 'live',
    icon: 'ExternalLink',
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
    chrome: 'embedded',
    status: 'live',
    icon: 'ExternalLink',
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
    chrome: 'embedded',
    status: 'live',
    icon: 'ExternalLink',
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
    chrome: 'embedded',
    status: 'live',
    icon: 'ExternalLink',
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
    chrome: 'embedded',
    status: 'live',
    icon: 'ExternalLink',
    badge: 'EXTERNAL',
  },
];

export const ALL_TOOLS: ToolItem[] = [...NATIVE_TOOLS, ...CURATED_DIRECTORY];

/** Everything the app can render, including hidden/archived routes. */
export const EVERY_TOOL: ToolItem[] = [...NATIVE_TOOLS, ...HIDDEN_TOOLS, ...CURATED_DIRECTORY];

/**
 * pathname → chrome map for ClientLayout. Derived here so no component ever
 * hardcodes a route list again. Unknown routes default to the marketing bar.
 */
export const TOOL_CHROME: Record<string, ToolChrome> = Object.fromEntries(
  EVERY_TOOL.map((t) => [t.href, t.chrome]),
);

/** Tools visible in nav/home grids: live + beta, never archived. */
export const VISIBLE_TOOLS: ToolItem[] = ALL_TOOLS.filter((t) => t.status !== 'archived');
