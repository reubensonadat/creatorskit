export type CreatorModeId =
  | 'studio-carousel'
  | 'editorial-book'
  | 'cinematic-meme'
  | 'mobile-showcase'
  | 'cyber-engagement';

export type BackgroundType =
  | 'mesh'
  | 'preset-gradient'
  | 'custom-gradient'
  | 'graph-grid'
  | 'halftone-dither'
  | 'solid'
  | 'photo';

export type AssetFrameType =
  | 'none'
  | 'desktop-window'
  | 'mobile-phone'
  | 'split-comparison'
  | 'floating-card'
  | 'color-swatches';

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

export interface SlideItem {
  id: string;
  // Text Content
  categoryBadge: string;
  eyebrowText: string;
  heroTitle: string;
  highlightWords: string; // Words to highlight in accent color
  subtitleText: string;
  sectionNumber: string; // e.g. "01", "02"
  linkPillText: string; // e.g. "originkit.dev"
  linkPillType: 'direct-link' | 'comment-dm' | 'swipe-cue' | 'custom';
  swipePrompt: string; // e.g. "Swipe for start 👆" or "Swipe ➔"

  // Author & Profile
  authorName: string;
  authorHandle: string;
  authorVerified: boolean;
  avatarUrl?: string;
  avatarImgEl?: HTMLImageElement | null;

  // Background
  bgType: BackgroundType;
  presetGradientId: string;
  customGradColors: [string, string, string];
  customGradAngle: number;
  solidColor: string;
  photoUrl?: string;
  photoImgEl?: HTMLImageElement | null;
  meshPins: MeshPin[];
  meshWarpSize: number; // 30 - 100%
  meshDiffusion: number; // 10 - 100px
  gridColor: string;
  gridSize: number;

  // Asset / Mockup Layer
  assetFrameType: AssetFrameType;
  screenshotUrl?: string;
  screenshotImgEl?: HTMLImageElement | null;
  secondaryScreenshotUrl?: string; // For Before/After or Dual Phone
  secondaryScreenshotImgEl?: HTMLImageElement | null;
  beforeLabel?: string; // e.g. "BEFORE"
  afterLabel?: string; // e.g. "AFTER"
  colorSwatches?: ColorSwatchItem[];
  windowTheme: 'dark' | 'light' | 'glass' | 'cyber';
  phoneTheme: 'dark' | 'silver' | 'titanium';
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
