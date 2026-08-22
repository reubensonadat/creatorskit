import { MeshPin, GradientPreset } from './types';

// Helper: HSL to Hex
export const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Helper: Hex to HSL
export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

export const getContrastRatio = (c1: string, c2: string): number => {
  const l1 = getLuminance(c1) + 0.05;
  const l2 = getLuminance(c2) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
};

export const COLOR_KEYWORD_MAP: Record<string, string> = {
  emerald: '#00A86B',
  jade: '#047857',
  cyan: '#00D2DF',
  sapphire: '#1D4ED8',
  cobalt: '#1E3E62',
  navy: '#0B192C',
  violet: '#7C3AED',
  purple: '#9333EA',
  magenta: '#D946EF',
  coral: '#FF5757',
  pink: '#FF2A85',
  amber: '#F59E0B',
  orange: '#EA580C',
  gold: '#FFB800',
  yellow: '#FFE500',
  lime: '#84CC16',
  forest: '#064E3B',
  mint: '#10B981',
  teal: '#0D9488',
  slate: '#334155',
  charcoal: '#18181B',
  espresso: '#1A0B05',
  noir: '#09090B',
  ivory: '#FDFBF7',
  linen: '#F5F5F0',
};

// Generates smart fluid mesh pins and harmonious text/accent colors from any seed color
export function generateSmartHarmoniousTheme(seedInput: string) {
  let hex = seedInput.trim().toLowerCase();
  if (COLOR_KEYWORD_MAP[hex]) {
    hex = COLOR_KEYWORD_MAP[hex];
  } else if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex) && !/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = '#00A86B'; // fallback to emerald
  }

  const { h, s, l } = hexToHsl(hex);
  const isDarkBase = l < 40;

  // Generate 5 mesh nodes
  const primaryHue = h;
  const compHue = (h + 180) % 360;
  const analogousHue1 = (h + 35 + 360) % 360;
  const analogousHue2 = (h - 35 + 360) % 360;
  const triadicHue = (h + 120) % 360;

  const node1Color = hslToHex(primaryHue, Math.min(85, Math.max(45, s)), isDarkBase ? 38 : 55);
  const node2Color = hslToHex(compHue, Math.min(90, Math.max(50, s + 10)), isDarkBase ? 48 : 65);
  const node3Color = hslToHex(analogousHue1, Math.min(85, Math.max(40, s)), isDarkBase ? 24 : 75);
  const node4Color = hslToHex(analogousHue2, Math.min(90, Math.max(45, s + 5)), isDarkBase ? 42 : 50);
  const node5Color = hslToHex(triadicHue, Math.min(80, Math.max(35, s)), isDarkBase ? 15 : 85);

  const meshPins: MeshPin[] = [
    { id: 1, color: node1Color, x: 20, y: 20 },
    { id: 2, color: node2Color, x: 80, y: 25 },
    { id: 3, color: node3Color, x: 50, y: 75 },
    { id: 4, color: node4Color, x: 15, y: 80 },
    { id: 5, color: node5Color, x: 85, y: 80 },
  ];

  // Best high-contrast text color
  const textColor = isDarkBase ? '#FFFFFF' : '#09090B';
  const accentColor = isDarkBase
    ? hslToHex(compHue, 95, 65)
    : hslToHex(primaryHue, 90, 35);

  const customGradColors: [string, string, string] = [
    node1Color,
    node2Color,
    node5Color,
  ];

  return {
    meshPins,
    textColor,
    accentColor,
    customGradColors,
    baseHex: hex,
    isDarkBase,
  };
}

// 12 Curated Studio Presets matching the reference images
export const CURATED_STUDIO_GRADIENTS: GradientPreset[] = [
  {
    id: 'liquid-silk-emerald',
    name: 'Liquid Silk Emerald & Coral',
    category: 'mesh',
    description: 'Dev tools & high-engagement cover style (Craftwork design)',
    colors: ['#00A86B', '#FF2A85', '#FFB800', '#0052D4'],
    meshNodes: [
      { id: 1, color: '#00A86B', x: 18, y: 22 },
      { id: 2, color: '#FF2A85', x: 82, y: 28 },
      { id: 3, color: '#FFB800', x: 50, y: 78 },
      { id: 4, color: '#0052D4', x: 85, y: 82 },
      { id: 5, color: '#022C22', x: 20, y: 80 },
    ],
  },
  {
    id: 'espresso-amber-glow',
    name: 'Espresso Amber Glow',
    category: 'cinematic',
    description: 'Warm, dark, component & SaaS showcase (Originkit style)',
    colors: ['#1A0B05', '#582C12', '#9A3412', '#2A1208'],
    meshNodes: [
      { id: 1, color: '#582C12', x: 25, y: 20 },
      { id: 2, color: '#9A3412', x: 75, y: 30 },
      { id: 3, color: '#EA580C', x: 50, y: 60 },
      { id: 4, color: '#1A0B05', x: 20, y: 85 },
      { id: 5, color: '#2A1208', x: 80, y: 85 },
    ],
  },
  {
    id: 'miromiro-sapphire-cyan',
    name: 'Sapphire Glow & Cyber Cyan',
    category: 'mesh',
    description: 'Rich deep blue with glowing cyan aura (MiroMiro style)',
    colors: ['#0B192C', '#1E3E62', '#00D2DF', '#09090B'],
    meshNodes: [
      { id: 1, color: '#1E3E62', x: 20, y: 20 },
      { id: 2, color: '#00D2DF', x: 80, y: 25 },
      { id: 3, color: '#1D4ED8', x: 50, y: 70 },
      { id: 4, color: '#0B192C', x: 15, y: 85 },
      { id: 5, color: '#000000', x: 85, y: 85 },
    ],
  },
  {
    id: 'editorial-graph-linen',
    name: 'Graph Paper Grid on Warm Ivory',
    category: 'editorial',
    description: 'Minimal graphic grid & serif literature (Color Psychology & Inspiration style)',
    colors: ['#FDFBF7', '#F5F5F0', '#E5E5DE', '#18181B'],
    meshNodes: [
      { id: 1, color: '#FDFBF7', x: 20, y: 20 },
      { id: 2, color: '#F5F5F0', x: 80, y: 20 },
      { id: 3, color: '#FAF7F0', x: 50, y: 80 },
    ],
  },
  {
    id: 'retro-halftone-cloud',
    name: 'Retro Dither & Halftone Noir',
    category: 'cyber',
    description: 'Textured dither grain & brutalist clouds (Developer Taste style)',
    colors: ['#18181B', '#27272A', '#3F3F46', '#09090B'],
    meshNodes: [
      { id: 1, color: '#27272A', x: 25, y: 25 },
      { id: 2, color: '#3F3F46', x: 75, y: 30 },
      { id: 3, color: '#18181B', x: 50, y: 75 },
      { id: 4, color: '#09090B', x: 20, y: 85 },
    ],
  },
  {
    id: 'sunset-lavender-tangerine',
    name: 'Sunset Lavender & Tangerine',
    category: 'mesh',
    description: 'Vibrant modern gradient for mobile app showcases',
    colors: ['#7C3AED', '#EC4899', '#F97316', '#FEF08A'],
    meshNodes: [
      { id: 1, color: '#7C3AED', x: 20, y: 20 },
      { id: 2, color: '#EC4899', x: 80, y: 20 },
      { id: 3, color: '#F97316', x: 20, y: 80 },
      { id: 4, color: '#FEF08A', x: 80, y: 80 },
    ],
  },
  {
    id: 'obsidian-midnight-noir',
    name: 'Obsidian Midnight Carbon',
    category: 'cinematic',
    description: 'Deep black vignette for AI comparisons & meme breakdowns',
    colors: ['#18181B', '#09090B', '#000000', '#27272A'],
    meshNodes: [
      { id: 1, color: '#18181B', x: 30, y: 20 },
      { id: 2, color: '#27272A', x: 70, y: 30 },
      { id: 3, color: '#09090B', x: 50, y: 70 },
      { id: 4, color: '#000000', x: 50, y: 90 },
    ],
  },
  {
    id: 'forest-jade-aura',
    name: 'Forest Pine & Jade Aura',
    category: 'cinematic',
    description: 'Organic lush emerald tones for outdoor and creative posts',
    colors: ['#064E3B', '#047857', '#022C22', '#10B981'],
    meshNodes: [
      { id: 1, color: '#047857', x: 25, y: 20 },
      { id: 2, color: '#10B981', x: 75, y: 30 },
      { id: 3, color: '#064E3B', x: 50, y: 70 },
      { id: 4, color: '#022C22', x: 20, y: 85 },
    ],
  },
  {
    id: 'cyber-neon-lime',
    name: 'Cyber Neon Lime & Slate',
    category: 'cyber',
    description: 'High-energy tech & code tutorial highlight',
    colors: ['#09090B', '#1E293B', '#84CC16', '#22C55E'],
    meshNodes: [
      { id: 1, color: '#1E293B', x: 20, y: 20 },
      { id: 2, color: '#84CC16', x: 80, y: 25 },
      { id: 3, color: '#09090B', x: 50, y: 75 },
      { id: 4, color: '#22C55E', x: 80, y: 80 },
    ],
  },
  {
    id: 'pastel-peach-cotton',
    name: 'Pastel Peach & Alabaster',
    category: 'minimal',
    description: 'Gentle, soft aesthetic for lifestyle & creative quotes',
    colors: ['#FEE2E2', '#FFEDD5', '#FEF3C7', '#FAF5FF'],
    meshNodes: [
      { id: 1, color: '#FFEDD5', x: 25, y: 25 },
      { id: 2, color: '#FEE2E2', x: 75, y: 25 },
      { id: 3, color: '#FAF5FF', x: 50, y: 75 },
    ],
  },
];
