export type CreatorModeId =
  | 'cobalt-hook'
  | 'editorial-linen'
  | 'dark-notes'
  | 'marigold-display'
  | 'dual-comparison'
  | 'trio-showcase';

export type BackgroundType =
  | 'solid'
  | 'graph-grid'
  | 'halftone-dither'
  | 'mesh'
  | 'preset-gradient'
  | 'custom-gradient'
  | 'photo';

export type LayoutMode =
  | 'hero-hook'
  | 'single-image'
  | 'dual-comparison'
  | 'trio-gallery'
  | 'tweet-card'
  | 'editorial-quote'
  | 'desktop-window'
  | 'mobile-phone'
  | 'color-swatches';

export type SwipePromptType =
  | 'connected-arc'
  | 'search-bar'
  | 'notes-folder'
  | 'pill-arrow'
  | 'dots-bar'
  | 'minimal-arrow'
  | 'custom-text'
  | 'none';

export type HighlightStyle = 'pill' | 'box' | 'underline' | 'text-color';

export interface MeshPin {
  id: number;
  color: string;
  x: number; // 0 - 100%
  y: number; // 0 - 100%
}

export interface ColorSwatchItem {
  name: string;
  hex: string;
  desc?: string;
}

export interface SlideImageSlot {
  id: string;
  url?: string;
  imgEl?: HTMLImageElement | null;
  label?: string;
  caption?: string;
  fit?: 'cover' | 'contain';
}

export interface SlideItem {
  id: string;
  layoutMode: LayoutMode;

  // Header & Eyebrow Elements
  categoryBadge: string;
  categoryBadgeIcon?: string; // Remix icon key
  topTagPill?: string; // e.g. "Click Here to Edit Files"
  eyebrowText: string;
  sectionNumber: string; // e.g. "PAGE 01", "01"
  brandLogoText?: string; // e.g. "Brand"
  brandLogoIcon?: string; // e.g. "RiPlaneLine"

  // Main Typography
  heroTitle: string;
  highlightWords: string; // Words to highlight
  highlightStyle: HighlightStyle;
  highlightBgColor: string;
  highlightTextColor: string;
  secondaryHighlightWords?: string;
  secondaryHighlightBox?: boolean; // Dashed selection frame box
  
  subtitleText: string;
  bulletPoints?: string[]; // Optional 3 takeaways or numbered steps

  // Fonts & Styling
  titleFontFamily: string;
  bodyFontFamily: string;
  titleFontSize: number; // 70 to 140
  textColor: string;
  accentColor: string;
  textAlign: 'left' | 'center' | 'right';
  titleItalic: boolean;
  titleTracking: number; // letter spacing modifier

  // Multi-Image Slots
  images: SlideImageSlot[];
  imagePosition?: 'top' | 'center' | 'bottom' | 'split';
  imageAspectRatio?: '16:9' | '4:3' | '1:1' | 'auto';
  imageFrameStyle?: 'none' | 'shadow-card' | 'brutalist-border' | 'rounded-smooth';

  // Micro-Components & Bottom Elements
  dottedDivider: boolean;
  swipePromptType: SwipePromptType;
  swipePromptText: string; // e.g. "SWIPE"
  swipePromptSubtext?: string; // e.g. "Swipe to view notes 4 >"
  swipeSearchPlaceholder?: string; // e.g. "I'm looking for..."
  watermarkText?: string; // e.g. "creatorkit.studio"

  // Author & Profile
  showAuthorBlock: boolean;
  authorName: string;
  authorHandle: string;
  authorVerified: boolean;
  avatarUrl?: string;
  avatarImgEl?: HTMLImageElement | null;

  // Background
  bgType: BackgroundType;
  solidColor: string;
  presetGradientId: string;
  customGradColors: [string, string, string];
  customGradAngle: number;
  photoUrl?: string;
  photoImgEl?: HTMLImageElement | null;
  bgBlur: number;
  bgDimness: number;
  meshPins: MeshPin[];
  meshWarpSize: number;
  meshDiffusion: number;
  gridColor: string;
  gridSize: number;

  // Legacy compatibility
  colorSwatches?: ColorSwatchItem[];
  windowTheme?: 'dark' | 'light' | 'glass' | 'cyber';
  phoneTheme?: 'dark' | 'silver' | 'titanium';
}

export interface AspectRatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  aspect: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  category: 'mesh' | 'cinematic' | 'editorial' | 'cyber' | 'minimal';
  colors: string[];
  angle?: number;
  meshNodes?: MeshPin[];
  description: string;
}
