'use client';

/**
 * CARD STUDIO (quote cards) — the text-behind interface, minus the AI model.
 *
 * Owner ruling 2026-10-02: this is a deliberate fork of Text Behind Image with
 * the SAME interface (text boxes, fonts, shapes, grain, undo, export), but:
 * - NO AI background removal ever runs here (bring your own transparent PNG
 *   via "custom subject" if you want the sandwich look).
 * - Multiple photos can be inserted as movable canvas layers.
 * - Cards are individual: each keeps its own photo, bg colour, text & overlays.
 * - Batch photo upload creates one card per photo. Deck exports as a ZIP.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Scissors, Download, Type as TypeIcon, Plus, Copy, Trash2, Search, X, UploadCloud, AlertTriangle, ChevronDown, Square, Minus, Slash, Circle, Star, Layers, Undo2, Redo2 } from 'lucide-react';
import MobileEditorToolbar from '@/components/mobile-editor/MobileEditorToolbar';
import Link from 'next/link';
import NextImage from 'next/image';
import SiteNav from '@/components/nav/SiteNav';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { renderToStaticMarkup } from 'react-dom/server';
import { REMIX_ICONS_LIST, type IconDefinition } from '@/lib/remix-icons';
import { GOOGLE_FONTS_LIST, getGoogleFontsStylesheetUrl } from '@/app/match-cut/google-fonts';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { standardizeSourceImage } from '@/lib/background-removal';

import { putHandoffImage, takeHandoffImage } from '@/lib/tool-handoff';
import NextStepRow from '@/components/NextStepRow';

// ---------------------------------------------------------------------------
// Fonts — 75+ Google Fonts across Cursive, Graffiti, Gothic, Tabloid, Serif, Sans, Mono
// ---------------------------------------------------------------------------

interface PosterFont {
    id: string;
    name: string;
    family: string;
    weight: number;
    category: 'Cursive' | 'Graffiti' | 'Gothic' | 'Tabloid' | 'Serif' | 'Sans' | 'Typewriter' | 'Display';
}

const SPECIALTY_FONTS: PosterFont[] = [
    // --- CURSIVE, SCRIPT & CALLIGRAPHY ---
    { id: 'great-vibes', name: 'Great Vibes', family: '"Great Vibes", cursive', category: 'Cursive', weight: 400 },
    { id: 'dancing-script', name: 'Dancing Script', family: '"Dancing Script", cursive', category: 'Cursive', weight: 700 },
    { id: 'pacifico', name: 'Pacifico', family: '"Pacifico", cursive', category: 'Cursive', weight: 400 },
    { id: 'satisfy', name: 'Satisfy', family: '"Satisfy", cursive', category: 'Cursive', weight: 400 },
    { id: 'sacramento', name: 'Sacramento', family: '"Sacramento", cursive', category: 'Cursive', weight: 400 },
    { id: 'alex-brush', name: 'Alex Brush', family: '"Alex Brush", cursive', category: 'Cursive', weight: 400 },
    { id: 'parisienne', name: 'Parisienne', family: '"Parisienne", cursive', category: 'Cursive', weight: 400 },
    { id: 'allura', name: 'Allura', family: '"Allura", cursive', category: 'Cursive', weight: 400 },
    { id: 'mr-dafoe', name: 'Mr Dafoe', family: '"Mr Dafoe", cursive', category: 'Cursive', weight: 400 },
    { id: 'yellowtail', name: 'Yellowtail', family: '"Yellowtail", cursive', category: 'Cursive', weight: 400 },
    { id: 'kaushan-script', name: 'Kaushan Script', family: '"Kaushan Script", cursive', category: 'Cursive', weight: 400 },
    { id: 'damion', name: 'Damion', family: '"Damion", cursive', category: 'Cursive', weight: 400 },
    { id: 'lobster', name: 'Lobster', family: '"Lobster", cursive', category: 'Cursive', weight: 400 },
    { id: 'playball', name: 'Playball', family: '"Playball", cursive', category: 'Cursive', weight: 400 },
    { id: 'marck-script', name: 'Marck Script', family: '"Marck Script", cursive', category: 'Cursive', weight: 400 },
    { id: 'caveat', name: 'Caveat', family: '"Caveat", cursive', category: 'Cursive', weight: 700 },
    { id: 'kalam', name: 'Kalam', family: '"Kalam", cursive', category: 'Cursive', weight: 700 },
    { id: 'shadows', name: 'Shadows Into Light', family: '"Shadows Into Light", cursive', category: 'Cursive', weight: 400 },
    { id: 'indie-flower', name: 'Indie Flower', family: '"Indie Flower", cursive', category: 'Cursive', weight: 400 },
    { id: 'covered-grace', name: 'Covered By Your Grace', family: '"Covered By Your Grace", cursive', category: 'Cursive', weight: 400 },

    // --- BLACKLETTER & GOTHIC ---
    { id: 'unifraktur', name: 'UnifrakturMaguntia', family: '"UnifrakturMaguntia", cursive', category: 'Gothic', weight: 400 },
    { id: 'pirata-one', name: 'Pirata One', family: '"Pirata One", cursive', category: 'Gothic', weight: 400 },
    { id: 'medievalsharp', name: 'MedievalSharp', family: '"MedievalSharp", cursive', category: 'Gothic', weight: 400 },

    // --- GRAFFITI, BRUSH & STREET ---
    { id: 'permanent-marker', name: 'Permanent Marker', family: '"Permanent Marker", cursive', category: 'Graffiti', weight: 400 },
    { id: 'rock-salt', name: 'Rock Salt', family: '"Rock Salt", cursive', category: 'Graffiti', weight: 400 },
    { id: 'sedgwick-ave', name: 'Sedgwick Ave', family: '"Sedgwick Ave", cursive', category: 'Graffiti', weight: 400 },
    { id: 'sedgwick-display', name: 'Sedgwick Display', family: '"Sedgwick Ave Display", cursive', category: 'Graffiti', weight: 400 },
    { id: 'creepster', name: 'Creepster', family: '"Creepster", cursive', category: 'Graffiti', weight: 400 },
    { id: 'bangers', name: 'Bangers Comic', family: '"Bangers", cursive', category: 'Graffiti', weight: 400 },
    { id: 'rubik-glitch', name: 'Rubik Glitch', family: '"Rubik Glitch", cursive', category: 'Graffiti', weight: 400 },
];

const BASE_FONTS: PosterFont[] = GOOGLE_FONTS_LIST.map((f) => ({
    id: f.id,
    name: f.name,
    family: f.fontFamily,
    category: (['caveat', 'kalam', 'shadows', 'indie-flower', 'covered-grace'].includes(f.id)
        ? 'Cursive'
        : ['permanent-marker', 'rock-salt', 'bangers'].includes(f.id)
            ? 'Graffiti'
            : f.category) as PosterFont['category'],
    weight: f.category === 'Tabloid'
        ? (['anton', 'bebas-neue', 'russo-one'].includes(f.id) ? 400 : 900)
        : f.category === 'Sans'
            ? (['inter', 'montserrat', 'outfit', 'syne'].includes(f.id) ? 900 : 700)
            : f.category === 'Serif'
                ? (['playfair', 'cinzel', 'bodoni'].includes(f.id) ? 900 : 700)
                : f.category === 'Typewriter'
                    ? (f.id === 'space-mono' ? 700 : 400)
                    : 400,
}));

const POSTER_FONTS: PosterFont[] = [
    ...BASE_FONTS.filter((bf) => !SPECIALTY_FONTS.some((sf) => sf.id === bf.id)),
    ...SPECIALTY_FONTS,
];

const fontById = (id: string): PosterFont =>
    POSTER_FONTS.find(
        (f) =>
            f.id === id ||
            f.id === id.replace(/ /g, '-').toLowerCase() ||
            (f.id === 'playfair' && id === 'playfair-display') ||
            (f.id === 'unifraktur' && (id === 'unifrakturmaguntia' || id === 'unifraktur-maguntia')) ||
            f.name.toLowerCase() === id.replace(/-/g, ' ').toLowerCase() ||
            f.name.toLowerCase().replace(/ /g, '') === id.toLowerCase().replace(/[-_ ]/g, '')
    ) ?? POSTER_FONTS[0];

const SPECIALTY_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Creepster&family=Damion&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Kaushan+Script&family=Lobster&family=Marck+Script&family=MedievalSharp&family=Mr+Dafoe&family=Pacifico&family=Parisienne&family=Pirata+One&family=Playball&family=Rubik+Glitch&family=Sacramento&family=Satisfy&family=Sedgwick+Ave&family=Sedgwick+Ave+Display&family=UnifrakturMaguntia&family=Yellowtail&display=swap';

/** Inject the combined Google-Fonts stylesheet for all families once. */
let posterFontsLinkInjected = false;
function ensurePosterFontsCss(): void {
    if (posterFontsLinkInjected || typeof document === 'undefined') return;
    if (!document.getElementById('ck-poster-fonts-css')) {
        const link = document.createElement('link');
        link.id = 'ck-poster-fonts-css';
        link.rel = 'stylesheet';
        link.href = getGoogleFontsStylesheetUrl();
        document.head.appendChild(link);
    }
    if (!document.getElementById('ck-specialty-fonts-css')) {
        const link2 = document.createElement('link');
        link2.id = 'ck-specialty-fonts-css';
        link2.rel = 'stylesheet';
        link2.href = SPECIALTY_FONTS_URL;
        document.head.appendChild(link2);
    }
    posterFontsLinkInjected = true;
}

/** Resolve the font before ANY draw (preview included) so export == preview. */
async function ensurePosterFontReady(id: string, weight?: number, italic?: boolean): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    ensurePosterFontsCss();
    const font = fontById(id);
    const targetWeight = weight || font.weight;
    const style = italic ? 'italic' : 'normal';
    try {
        await document.fonts.load(`${style} ${targetWeight} 100px ${font.family}`);
        await document.fonts.ready;
    } catch {
        /* fall back to available face */
    }
}

// ---------------------------------------------------------------------------
// Text layer state
// ---------------------------------------------------------------------------

type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen';

const asCompositeOp = (mode: BlendMode): GlobalCompositeOperation =>
    mode === 'normal' ? 'source-over' : (mode as GlobalCompositeOperation);

interface TextLayer {
    id: string;
    text: string;
    fontId: string;
    weight: number; // 400 (Regular), 700 (Bold), 900 (Heavy)
    italic: boolean;
    caseMode: 'uppercase' | 'capitalize' | 'lowercase' | 'original';
    uppercase: boolean; // backward-compat
    fitToWidth: boolean;
    widthPct: number;
    heightPct: number;
    letterSpacingEm: number;
    color: string;
    opacity: number;
    fillMode: 'solid' | 'gradient';
    gradientColor2: string;
    gradientAngle: number;
    strokeEm: number;
    strokeColor: string;
    shadow: boolean;
    shadowMode: 'none' | 'soft' | 'hard' | 'neon';
    rotationDeg: number;
    blend: BlendMode;
    depth: 'behind' | 'front';
    xPct: number;
    yPct: number;
}

const DEFAULT_TEXT_LAYER: TextLayer = {
    id: 'box-1',
    text: 'BEHIND',
    fontId: 'anton',
    weight: 400,
    italic: false,
    caseMode: 'uppercase',
    uppercase: true,
    fitToWidth: true,
    widthPct: 86,
    heightPct: 14,
    letterSpacingEm: 0.02,
    color: '#000000',
    opacity: 1,
    fillMode: 'solid',
    strokeEm: 0,
    gradientColor2: '#FFE500',
    gradientAngle: 90,
    strokeColor: '#000000',
    shadow: false,
    shadowMode: 'none',
    rotationDeg: 0,
    blend: 'normal',
    depth: 'behind',
    xPct: 0.5,
    yPct: 0.4,
};

// ---------------------------------------------------------------------------
// Advanced image editing — shape overlays (rect / line / light beam) + grain
// ---------------------------------------------------------------------------

type ShapeKind = 'rect' | 'line' | 'beam' | 'circle' | 'icon' | 'button' | 'image';

interface ShapeLayer {
    id: string;
    kind: ShapeKind;
    xPct: number; // centre x (0-1)
    yPct: number; // centre y (0-1)
    wPct: number; // width / length as % of canvas width
    hPct: number; // height / thickness as % of canvas height
    rotationDeg: number;
    fillColor: string; // body colour — rect fill · line colour · beam tint
    fillOn: boolean; // solid body vs hollow (glow/border only)
    strokeColor: string; // border / outline colour · button label colour
    strokeW: number; // border width in ‰ of canvas width (0-30)
    cornerPct: number; // corner radius as % of the shorter side (0-50)
    opacity: number; // 0-1
    glow: number; // 0-1 — additive bloom (lightsaber halo, neon frame)
    blend: BlendMode;
    depth: 'behind' | 'front'; // relative to the subject cutout
    iconId?: string; // remix icon id (kind === 'icon')
    imgSrc?: string; // data URL of an uploaded photo (kind === 'image')
    label?: string; // centred text (kind === 'button') — e.g. "NEXT"
}

interface ShapeMetric {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rot: number;
}

const makeShape = (kind: ShapeKind, index: number): ShapeLayer => ({
    id: `shape-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    xPct: 0.5,
    yPct: kind === 'button' ? 0.82 : 0.5,
    wPct: kind === 'rect' || kind === 'circle' ? 40 : kind === 'icon' ? 14 : kind === 'button' ? 34 : 70,
    hPct: kind === 'rect' ? 18 : kind === 'line' ? 0.7 : kind === 'beam' ? 4 : kind === 'icon' ? 14 : kind === 'button' ? 9 : 40,
    rotationDeg: kind === 'beam' ? -24 : 0,
    fillColor: kind === 'beam' ? '#7DD3FC' : kind === 'line' || kind === 'button' ? '#FFFFFF' : '#FFE500',
    iconId: 'arrow-right',
    label: kind === 'button' ? 'NEXT' : undefined,
    fillOn: true,
    strokeColor: '#000000',
    strokeW: kind === 'button' ? 8 : 0,
    cornerPct: kind === 'rect' ? 8 : kind === 'button' ? 18 : 50,
    opacity: 1,
    glow: kind === 'beam' ? 0.8 : 0,
    blend: 'normal',
    depth: kind === 'button' ? 'front' : 'behind',
});

interface GrainSettings {
    enabled: boolean;
    opacity: number; // 0-0.6
    size: number; // 1-5 — speckle scale
}

const DEFAULT_GRAIN: GrainSettings = { enabled: false, opacity: 0.18, size: 2 };

/** One undo step — everything the canvas composites, captured before a change. */
interface UndoSnapshot {
    layers: TextLayer[];
    activeLayerId: string;
    shapes: ShapeLayer[];
    activeShapeId: string | null;
    grain: GrainSettings;
    bgDim: number;
}

/** Deterministic seeded PRNG — the grain tile is stable across redraws/exports. */
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const grainTileCache = new Map<number, HTMLCanvasElement>();

/** Grey-noise tile — drawn with an `overlay` blend so it reads as film grain,
 *  lifting the darks and dusting the lights instead of just dimming them. */
const grainTile = (dotPx: number): HTMLCanvasElement | null => {
    if (typeof document === 'undefined') return null;
    const size = Math.max(1, Math.min(5, Math.round(dotPx)));
    const cached = grainTileCache.get(size);
    if (cached) return cached;
    const T = document.createElement('canvas');
    T.width = 128;
    T.height = 128;
    const tctx = T.getContext('2d');
    if (!tctx) return null;
    const rnd = mulberry32(0xc0ffee + size);
    const img = tctx.createImageData(T.width, T.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = Math.round(rnd() * 255);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grainTileCache.set(size, T);
    return T;
};

/** '#RRGGBB' + alpha → rgba() string (falls back to the raw input). */
const withAlpha = (hex: string, a: number): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Rounded-rect path via arcTo — identical on every engine (no roundRect dependency). */
const pathRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.max(0, Math.min(r, Math.min(Math.abs(w), Math.abs(h)) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
};

/** Remix icon → canvas image cache (rendered per colour, decoded async). */
const iconImageCache = new Map<string, HTMLImageElement>();

const iconDefById = (id: string) => REMIX_ICONS_LIST.find((i) => i.id === id) ?? null;

/** Returns the cached image once decoded; kicks off the decode and calls
 *  onReady so the canvas repaints the moment the icon becomes drawable. */
const loadIconImage = (def: IconDefinition, color: string, onReady: () => void): HTMLImageElement | null => {
    if (typeof window === 'undefined') return null;
    const key = `${def.id}|${color.toLowerCase()}`;
    const cached = iconImageCache.get(key);
    if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
    const Comp = def.component as React.ComponentType<{ size?: number | string; color?: string }>;
    try {
        const markup = renderToStaticMarkup(<Comp size={512} color={color} />);
        const img = new Image();
        img.onload = onReady;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
        iconImageCache.set(key, img);
    } catch { /* un-drawable icon — the placeholder frame stays */ }
    return null;
};

const SETTINGS_KEY = 'ck_quote_card_v1';
const OVERLAYS_KEY = 'ck_quote_card_overlays_v1';
const DECK_KEY = 'ck_quote_card_deck_v1';

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FFE500', '#FF4D4D', '#4DD2FF', '#00FF88', '#FF3399', '#111827'];

/**
 * 10 Curated Poster Style Variations — solid, vivid, and distinct.
 */
const TEXT_PRESETS: { id: string; name: string; swatch: string; patch: Partial<TextLayer> }[] = [
    {
        id: 'white',
        name: 'SOLID WHITE',
        swatch: '#FFFFFF',
        patch: { fillMode: 'solid', color: '#FFFFFF', strokeEm: 0, shadow: true, shadowMode: 'soft', blend: 'normal', opacity: 1 },
    },
    {
        id: 'black',
        name: 'SOLID BLACK',
        swatch: '#000000',
        patch: { fillMode: 'solid', color: '#000000', strokeEm: 0, shadow: false, shadowMode: 'none', blend: 'normal', opacity: 1 },
    },
    {
        id: 'outline',
        name: 'HOLLOW OUTLINE',
        swatch: 'linear-gradient(#FFF 50%, #000 50%)',
        patch: { fillMode: 'solid', color: '#FFFFFF', strokeColor: '#000000', strokeEm: 0.06, shadow: true, shadowMode: 'soft', blend: 'normal', opacity: 1 },
    },
    {
        id: 'neon',
        name: 'NEON CYBER',
        swatch: 'linear-gradient(45deg, #00FFFF, #00FF88)',
        patch: { fillMode: 'solid', color: '#00FFFF', strokeColor: '#000000', strokeEm: 0.02, shadow: true, shadowMode: 'neon', blend: 'normal', opacity: 1 },
    },
    {
        id: 'gold',
        name: 'GOLD FOIL',
        swatch: 'linear-gradient(180deg, #FFFFFF 0%, #FFE500 100%)',
        patch: { fillMode: 'gradient', color: '#FFFFFF', gradientColor2: '#FFE500', gradientAngle: 90, strokeEm: 0, shadow: true, shadowMode: 'soft', blend: 'normal', opacity: 1 },
    },
    {
        id: 'sunset',
        name: 'SUNSET HEAT',
        swatch: 'linear-gradient(180deg, #FF4D4D 0%, #FFE500 100%)',
        patch: { fillMode: 'gradient', color: '#FF4D4D', gradientColor2: '#FFE500', gradientAngle: 90, strokeEm: 0, shadow: true, shadowMode: 'soft', blend: 'normal', opacity: 1 },
    },
    {
        id: 'pop',
        name: 'YELLOW POP',
        swatch: '#FFE500',
        patch: { fillMode: 'solid', color: '#FFE500', strokeColor: '#000000', strokeEm: 0.04, shadow: false, shadowMode: 'none', blend: 'normal', opacity: 1 },
    },
    {
        id: 'brutalist',
        name: '3D BRUTALIST',
        swatch: 'linear-gradient(135deg, #FFE500 50%, #000 50%)',
        patch: { fillMode: 'solid', color: '#FFE500', strokeColor: '#000000', strokeEm: 0.03, shadow: true, shadowMode: 'hard', blend: 'normal', opacity: 1 },
    },
    {
        id: 'cinematic',
        name: 'POSTER BLEED',
        swatch: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(0,0,0,0.5))',
        patch: { fillMode: 'solid', color: '#FFFFFF', strokeEm: 0, shadow: true, shadowMode: 'soft', blend: 'overlay', opacity: 0.92 },
    },
    {
        id: 'crimson',
        name: 'DARK CRIMS',
        swatch: '#FF3366',
        patch: { fillMode: 'solid', color: '#FF3366', strokeColor: '#FFFFFF', strokeEm: 0.02, shadow: true, shadowMode: 'soft', blend: 'normal', opacity: 1 },
    },
];

/** Custom color entry — accepts #rgb, #rrggbb, rrggbb or rgb(r,g,b). */
function parseColorInput(raw: string): string | null {
    const s = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) {
        return '#' + s.split('').map((ch) => ch + ch).join('').toLowerCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`;
    const m = raw.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (m) {
        const parts = [m[1], m[2], m[3]].map(Number);
        if (parts.every((n) => n >= 0 && n <= 255)) {
            return '#' + parts.map((n) => n.toString(16).padStart(2, '0')).join('');
        }
    }
    return null;
}

/** The layer's case transform — ONE source of truth for canvas AND previews. */
const applyCase = (
    text: string,
    caseMode?: 'uppercase' | 'capitalize' | 'lowercase' | 'original',
    uppercaseCompat?: boolean,
): string => {
    const mode = caseMode ?? (uppercaseCompat ? 'uppercase' : 'original');
    if (mode === 'uppercase') return text.toUpperCase();
    if (mode === 'lowercase') return text.toLowerCase();
    if (mode === 'capitalize') return text.replace(/\b\w/g, (c) => c.toUpperCase());
    return text;
};

// --- Refresh-safe persistence: images in IndexedDB, layers in localStorage

function idbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('ck_quote_card', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
    });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
    try {
        const db = await idbOpen();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { /* best effort */ }
}

async function idbGet(key: string): Promise<Blob | null> {
    try {
        const db = await idbOpen();
        return await new Promise((resolve) => {
            const tx = db.transaction('kv', 'readonly');
            const req = tx.objectStore('kv').get(key);
            req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function idbClear(keys: string[]): Promise<void> {
    try {
        const db = await idbOpen();
        await new Promise<void>((resolve) => {
            const tx = db.transaction('kv', 'readwrite');
            keys.forEach((k) => tx.objectStore('kv').delete(k));
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch { /* best effort */ }
}

interface TextMetrics {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rot: number;
    fontPx: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Phase-6 mobile sheet titles — one per bottom-bar category
 * (docs/TOOL_INTEGRATION_PLAN.md §8, Canva pattern). */
const MOBILE_SHEET_LABELS = {
    cards: 'CARD DECK',
    photo: 'PHOTO & CUTOUT',
    text: 'TEXT & TYPOGRAPHY',
    shapes: 'SHAPES & LAYERS',
    next: 'EXPORT & NEXT STEPS',
} as const;

export default function QuoteCardPage() {
    // --- images -------------------------------------------------------------
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [bgInfo, setBgInfo] = useState<string>('');
    const [cutoutImage, setCutoutImage] = useState<HTMLImageElement | null>(null);
    const [cutoutInfo, setCutoutInfo] = useState<string>('');

    // --- card canvas (no AI here — owner ruling 2026-10-02) -----------------
    /** Solid card background — the canvas when a card has no photo. */
    const [cardBgColor, setCardBgColor] = useState('#18181b');
    /** True once the user starts a colour card (canvas without a photo). */
    const [colorCardStarted, setColorCardStarted] = useState(false);
    const [cutoutError, setCutoutError] = useState<string | null>(null);

    /** Phase-6 Canva pattern (owner ruling 2026-10-02): the canvas is ALWAYS
     * visible; a bottom category bar opens ONE slide-up sheet per job.
     * activeSheet = open category id, or null (pure canvas mode). */
    const [activeSheet, setActiveSheet] = useState<keyof typeof MOBILE_SHEET_LABELS | null>(null);
    /** Guard: require explicit confirmation before wiping the user's photos */
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);

    // --- multiple text layers -----------------------------------------------
    const [layers, setLayers] = useState<TextLayer[]>([DEFAULT_TEXT_LAYER]);
    const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_TEXT_LAYER.id);

    const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0] ?? DEFAULT_TEXT_LAYER;

    // Custom color text field — mirrors the active layer's color both ways
    const [customColorInput, setCustomColorInput] = useState('');
    useEffect(() => {
        setCustomColorInput(activeLayer.color);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeLayer.color]);

    // --- undo (Ctrl+Z + floating button under the canvas) -------------------
    /** Snapshots pushed BEFORE each change; capped so memory stays sane. */
    const undoStackRef = useRef<UndoSnapshot[]>([]);
    const [undoCount, setUndoCount] = useState(0);
    const redoStackRef = useRef<UndoSnapshot[]>([]);
    const [redoCount, setRedoCount] = useState(0);
    const lastPushAtRef = useRef(0);
    /** Always-fresh view of the editable state — what a snapshot captures. */
    const undoStateRef = useRef<UndoSnapshot | null>(null);

    const pushUndo = useCallback(() => {
        const snap = undoStateRef.current;
        if (!snap) return;
        const stack = undoStackRef.current;
        const last = stack[stack.length - 1];
        // Skip no-op pushes (identical state objects) and coalesce rapid bursts (slider scrubs).
        if (last && last.layers === snap.layers && last.shapes === snap.shapes && last.grain === snap.grain && last.bgDim === snap.bgDim) return;
        const now = Date.now();
        if (stack.length > 0 && now - lastPushAtRef.current < 450) return;
        lastPushAtRef.current = now;
        undoStackRef.current = [...stack.slice(-39), snap];
        setUndoCount(undoStackRef.current.length);
        // A new change invalidates the redo history.
        if (redoStackRef.current.length > 0) {
            redoStackRef.current = [];
            setRedoCount(0);
        }
    }, []);

    // --- icon layers (Remix set) ---------------------------------------------
    /** Bumped when an icon image finishes decoding, so the canvas repaints. */
    const [iconTick, setIconTick] = useState(0);
    const handleIconReady = useCallback(() => setIconTick((t) => (t + 1) % 100000), []);
    const [iconSearch, setIconSearch] = useState('');
    const filteredShapeIcons = useMemo(() => {
        const q = iconSearch.trim().toLowerCase();
        if (!q) return REMIX_ICONS_LIST;
        return REMIX_ICONS_LIST.filter((i) => i.name.toLowerCase().includes(q) || i.category.includes(q));
    }, [iconSearch]);

    const patchActiveLayer = useCallback((patch: Partial<TextLayer>) => {
        pushUndo();
        setLayers((prev) =>
            prev.map((l) => (l.id === activeLayerId ? { ...l, ...patch } : l))
        );
    }, [activeLayerId, pushUndo]);

    const layer = activeLayer;
    const patchLayer = patchActiveLayer;

    // --- font audition & search state ---------------------------------------
    const [fontCategory, setFontCategory] = useState<
        'All' | 'Cursive' | 'Graffiti' | 'Gothic' | 'Tabloid' | 'Serif' | 'Sans' | 'Typewriter'
    >('All');
    const [fontSearch, setFontSearch] = useState('');
    const [fontDropdownOpen, setFontDropdownOpen] = useState(false);

    // --- interaction --------------------------------------------------------
    const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
    const [hoveringLayerId, setHoveringLayerId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportNote, setExportNote] = useState('');
    const [handoffModalOpen, setHandoffModalOpen] = useState(false);
    const [sendingHandoff, setSendingHandoff] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const cutoutInputRef = useRef<HTMLInputElement>(null);
    /** The raw background file/blob — the auto-cutout engines take it as input. */
    const bgFileRef = useRef<File | Blob | null>(null);
    const [dropActive, setDropActive] = useState(false);
    /** Background dim (0–0.85) — darkens the photo so the type pops. */
    const [bgDim, setBgDim] = useState(0);

    // --- advanced image editing: shape overlays + film grain ----------------
    const [shapes, setShapes] = useState<ShapeLayer[]>([]);
    const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
    const [grain, setGrain] = useState<GrainSettings>(DEFAULT_GRAIN);
    /** Collapsed by default — the advanced kit only appears when asked for. */
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const activeShape = shapes.find((s) => s.id === activeShapeId) ?? null;

    const patchActiveShape = useCallback((patch: Partial<ShapeLayer>) => {
        pushUndo();
        setShapes((prev) => prev.map((s) => (s.id === activeShapeId ? { ...s, ...patch } : s)));
    }, [activeShapeId, pushUndo]);

    const addShape = (kind: ShapeKind) => {
        pushUndo();
        const s = makeShape(kind, shapes.length);
        setShapes((prev) => [...prev, s]);
        setActiveShapeId(s.id);
        setAdvancedOpen(true);
    };

    const removeShape = (id: string) => {
        pushUndo();
        setShapes((prev) => prev.filter((s) => s.id !== id));
        if (activeShapeId === id) setActiveShapeId(null);
        photoLayerImgsRef.current.delete(id);
    };

    // --- photo layers (multiple uploaded images on the canvas) ---------------
    /** Decoded <img> per photo-layer shape id; bumping iconTick repaints. */
    const photoLayerImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const photoLayerInputRef = useRef<HTMLInputElement>(null);

    /** Multi-photo intake — every file becomes a movable, rotatable photo layer. */
    const handleAddPhotoLayers = async (files: FileList | null) => {
        if (!files) return;
        const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (list.length === 0) return;
        pushUndo();
        let idx = shapes.length;
        for (const f of list) {
            const dataUrl = await new Promise<string>((res) => {
                const r = new FileReader();
                r.onload = () => res(String(r.result));
                r.readAsDataURL(f);
            });
            const s: ShapeLayer = {
                ...makeShape('image', idx++),
                wPct: 55,
                hPct: 45,
                fillColor: '#FFFFFF',
                fillOn: false,
                depth: 'front',
                imgSrc: dataUrl,
            };
            setShapes((prev) => [...prev, s]);
            const img = new Image();
            img.onload = () => {
                photoLayerImgsRef.current.set(s.id, img);
                setIconTick((t) => (t + 1) % 100000);
            };
            img.src = dataUrl;
        }
        setActiveShapeId(null);
        setAdvancedOpen(true);
        setExportNote(
            list.length === 1
                ? 'Photo added as a canvas layer — drag it, rotate it, scale it.'
                : list.length + ' photos added as canvas layers.'
        );
    };

    // --- Card Studio deck: individual cards, each with its own photo/bg ------
    /** cards.length === 0 → single implicit card (the working state itself).
     *  Every card keeps its own photo, bg colour, text layers, shapes & grain.
     *  NO AI models run here — photos are placed as-is (owner ruling 2026-10-02). */
    type CardDeckItem = { id: string; name: string; layers: TextLayer[]; shapes: ShapeLayer[]; grain: GrainSettings; bgColor: string; format: { w: number; h: number } };
    const [cards, setCards] = useState<CardDeckItem[]>([]);
    const [activeCardId, setActiveCardId] = useState<string>('');
    const [deckExporting, setDeckExporting] = useState(false);
    /** In-memory per-card photos while the deck lives (blob + decoded img). */
    const cardBgRef = useRef<Map<string, { img: HTMLImageElement; blob: Blob }>>(new Map());

    const activeDeckId = () => activeCardId || 'card-1';

    const deckWithWorkingState = (): CardDeckItem[] => {
        if (cards.length === 0) return [{ id: 'card-1', name: 'CARD 1', layers, shapes, grain, bgColor: cardBgColor, format: cardFormat }];
        return cards.map((c) =>
            c.id === activeCardId || (activeCardId === '' && c.id === 'card-1')
                ? { ...c, layers, shapes, grain, bgColor: cardBgColor, format: cardFormat }
                : c
        );
    };

    /** Stash the working photo under the active card id (called before switches). */
    const stashWorkingPhoto = () => {
        if (bgImage && bgFileRef.current) {
            cardBgRef.current.set(activeDeckId(), { img: bgImage, blob: bgFileRef.current });
        }
    };

    /** Apply a card's photo (or lack of one) to the working state. */
    const applyCardPhoto = (id: string) => {
        const photo = cardBgRef.current.get(id);
        if (photo) {
            bgFileRef.current = photo.blob;
            setBgImage(photo.img);
            setBgInfo(photo.img.naturalWidth + ' × ' + photo.img.naturalHeight + 'px · card photo');
        } else {
            bgFileRef.current = null;
            setBgImage(null);
            setBgInfo('');
            setColorCardStarted(true); // a card without a photo is a colour card
        }
    };

    const resetHistory = () => {
        undoStackRef.current = [];
        setUndoCount(0);
        redoStackRef.current = [];
        setRedoCount(0);
    };

    const switchCard = (targetId: string) => {
        const deck = cards.length > 0 ? cards : deckWithWorkingState();
        const target = deck.find((c) => c.id === targetId);
        if (!target) return;
        stashWorkingPhoto();
        setCards(deckWithWorkingState());
        setActiveCardId(target.id);
        setLayers(target.layers);
        setActiveLayerId(target.layers[0]?.id ?? '');
        setShapes(target.shapes);
        setActiveShapeId(null);
        setGrain(target.grain);
        setCardBgColor(target.bgColor);
        setCardFormat(target.format);
        applyCardPhoto(target.id);
        resetHistory();
    };

    const addCard = () => {
        stashWorkingPhoto();
        const deck = deckWithWorkingState();
        // Owner ruling 2026-10-02: a NEW card inherits the ACTIVE card's canvas
        // size (photo-derived, or the SIZE chip for colour cards) — a 16:9 or
        // 9:16 deck stays that way; cards never snap back to a default.
        const inherit = { w: canvasW, h: canvasH };
        const next: CardDeckItem = {
            id: 'card-' + Date.now(),
            name: 'CARD ' + (deck.length + 1),
            layers: [{ ...DEFAULT_TEXT_LAYER, id: 't-' + Date.now() }],
            shapes: [],
            grain: DEFAULT_GRAIN,
            bgColor: cardBgColor,
            format: inherit,
        };
        setCards([...deck, next]);
        setActiveCardId(next.id);
        setLayers(next.layers);
        setActiveLayerId(next.layers[0].id);
        setShapes([]);
        setActiveShapeId(null);
        setGrain(DEFAULT_GRAIN);
        bgFileRef.current = null;
        setBgImage(null);
        setBgInfo('');
        setColorCardStarted(true);
        setCardFormat(inherit);
        resetHistory();
    };

    const removeCard = (id: string) => {
        if (cards.length === 0) return;
        const stashed = deckWithWorkingState();
        if (stashed.length <= 1) {
            // Deleting the last card returns to the implicit single-card mode.
            setCards([]);
            setActiveCardId('');
            return;
        }
        const idx = stashed.findIndex((c) => c.id === id);
        const next = stashed.filter((c) => c.id !== id);
        cardBgRef.current.delete(id);
        setCards(next);
        const wasActive = id === activeDeckId();
        if (wasActive) {
            const fallback = next[Math.max(0, idx - 1)];
            setActiveCardId(fallback.id);
            setLayers(fallback.layers);
            setActiveLayerId(fallback.layers[0]?.id ?? '');
            setShapes(fallback.shapes);
            setActiveShapeId(null);
            setGrain(fallback.grain);
            setCardBgColor(fallback.bgColor);
            setCardFormat(fallback.format);
            applyCardPhoto(fallback.id);
            resetHistory();
        }
    };


    /** Keep the snapshot source in sync with the last committed render. */
    useEffect(() => {
        undoStateRef.current = { layers, activeLayerId, shapes, activeShapeId, grain, bgDim };
    }, [layers, activeLayerId, shapes, activeShapeId, grain, bgDim]);

    const applySnapshot = (snap: UndoSnapshot) => {
        setLayers(snap.layers);
        setActiveLayerId(snap.activeLayerId);
        setShapes(snap.shapes);
        setActiveShapeId(snap.activeShapeId);
        setGrain(snap.grain);
        setBgDim(snap.bgDim);
    };

    const undo = useCallback(() => {
        const stack = undoStackRef.current;
        if (stack.length === 0) return;
        const snap = stack[stack.length - 1];
        undoStackRef.current = stack.slice(0, -1);
        setUndoCount(undoStackRef.current.length);
        lastPushAtRef.current = 0;
        const current = undoStateRef.current;
        if (current) {
            redoStackRef.current = [...redoStackRef.current.slice(-39), current];
            setRedoCount(redoStackRef.current.length);
        }
        applySnapshot(snap);
    }, []);

    const redo = useCallback(() => {
        const rstack = redoStackRef.current;
        if (rstack.length === 0) return;
        const snap = rstack[rstack.length - 1];
        redoStackRef.current = rstack.slice(0, -1);
        setRedoCount(redoStackRef.current.length);
        const current = undoStateRef.current;
        if (current) {
            undoStackRef.current = [...undoStackRef.current, current];
            setUndoCount(undoStackRef.current.length);
            lastPushAtRef.current = 0;
        }
        applySnapshot(snap);
    }, []);

    const patchGrain = useCallback(
        (patch: Partial<GrainSettings>) => {
            pushUndo();
            setGrain((g) => ({ ...g, ...patch }));
        },
        [pushUndo]
    );

    // Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z or Ctrl+Y redo — never hijacks typing.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const k = e.key.toLowerCase();
            const isUndo = k === 'z' && !e.shiftKey;
            const isRedo = (k === 'z' && e.shiftKey) || k === 'y';
            if (!isUndo && !isRedo) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            e.preventDefault();
            if (isUndo) undo();
            else redo();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);

    /** Metrics for each text layer — powers multi-layer hit testing & dragging. */
    const metricsRef = useRef<Record<string, TextMetrics>>({});
    /** Metrics for each shape overlay — same role as metricsRef, for shapes. */
    const shapeMetricsRef = useRef<Record<string, ShapeMetric>>({});
    const dragRef = useRef<
        | { active: boolean; kind: 'text'; layerId: string; movedPx: number; ox: number; oy: number }
        | { active: boolean; kind: 'shape'; shapeId: string; movedPx: number; ox: number; oy: number }
        | null
    >(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
                setFontDropdownOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        ensurePosterFontsCss();
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    /** Card format template — the canvas size when a card has no photo yet. */
    const [cardFormat, setCardFormat] = useState({ w: 1080, h: 1350 });
    const canvasW = bgImage?.naturalWidth ?? cardFormat.w;
    const canvasH = bgImage?.naturalHeight ?? cardFormat.h;

    // --- settings persistence (text layers array with backward-compat) ---
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const loaded = parsed.map((item, idx) => ({
                        ...DEFAULT_TEXT_LAYER,
                        ...item,
                        id: item.id || `box-${idx + 1}`,
                    }));
                    setLayers(loaded);
                    setActiveLayerId(loaded[0].id);
                } else if (parsed && typeof parsed === 'object') {
                    const single = { ...DEFAULT_TEXT_LAYER, ...parsed, id: parsed.id || 'box-1' };
                    setLayers([single]);
                    setActiveLayerId(single.id);
                }
            }
        } catch { /* use defaults */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(layers));
        } catch { /* non-fatal */ }
    }, [layers]);

    useEffect(() => {
        try {
            const saved = parseFloat(localStorage.getItem('ck_quote_card_bgdim') ?? '');
            if (Number.isFinite(saved) && saved > 0) setBgDim(Math.min(0.85, saved));
        } catch { /* default */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('ck_quote_card_bgdim', String(bgDim));
        } catch { /* non-fatal */ }
    }, [bgDim]);

    // --- advanced overlays (shapes + grain) persistence ----------------------
    useEffect(() => {
        try {
            const raw = localStorage.getItem(OVERLAYS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.shapes)) {
                    setShapes(
                        parsed.shapes.map((item: Partial<ShapeLayer>, idx: number) => ({
                            ...makeShape(item.kind ?? 'rect', idx),
                            ...item,
                        }))
                    );
                }
                if (parsed.grain && typeof parsed.grain === 'object') {
                    setGrain((g) => ({ ...g, ...parsed.grain }));
                }
            }
        } catch { /* use defaults */ }
    }, []);

    useEffect(() => {
        try {
            // Photo layers persist as placeholders — imgSrc data URLs would blow
            // the localStorage quota. Their geometry survives; images re-upload.
            const persistableShapes = shapes.map((s) => (s.kind === 'image' ? { ...s, imgSrc: undefined } : s));
            localStorage.setItem(OVERLAYS_KEY, JSON.stringify({ shapes: persistableShapes, grain }));
        } catch { /* non-fatal */ }
    }, [shapes, grain]);

    // --- Card Studio deck persistence ----------------------------------------
    // Declared AFTER the layers/overlays loaders so the hydrated active card
    // wins over the legacy single-card keys (same-tick effect order).
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DECK_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
                // Backward compat: decks saved before per-card formats get 4:5.
                const loaded = parsed.cards.map((c) => ({ ...c, format: c.format ?? { w: 1080, h: 1350 } }));
                setCards(loaded);
                const active = loaded.find((c) => c.id === parsed.activeCardId) ?? loaded[0];
                setActiveCardId(active.id);
                setLayers(active.layers);
                setActiveLayerId(active.layers[0]?.id ?? '');
                setShapes(active.shapes);
                setGrain(active.grain);
                setCardBgColor(active.bgColor);
                setCardFormat(active.format);
                setColorCardStarted(true);
            }
        } catch { /* non-fatal */ }
    }, []);

    const deckHadCardsRef = useRef(false);
    useEffect(() => {
        if (cards.length > 0) deckHadCardsRef.current = true;
        // Skip while implicit AND never materialized — avoids wiping the saved
        // deck on the mount tick before the loader above has hydrated cards.
        if (cards.length === 0 && !deckHadCardsRef.current) return;
        try {
            if (cards.length === 0) {
                // Back to the implicit single card — retire the deck key.
                localStorage.removeItem(DECK_KEY);
            } else {
                const persistable = deckWithWorkingState().map((c) => ({
                    ...c,
                    shapes: c.shapes.map((s) => (s.kind === 'image' ? { ...s, imgSrc: undefined } : s)),
                }));
                localStorage.setItem(DECK_KEY, JSON.stringify({ cards: persistable, activeCardId }));
            }
        } catch { /* non-fatal */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, activeCardId, layers, shapes, grain, cardBgColor, cardFormat]);

    // Restore saved images from IndexedDB
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const restore = async (key: 'bg' | 'cutout'): Promise<{ img: HTMLImageElement; blob: Blob } | null> => {
                const blob = await idbGet(key);
                if (!blob || cancelled) return null;
                try {
                    return { img: await loadImage(blob), blob };
                } catch {
                    return null;
                }
            };
            const bg = await restore('bg');
            if (bg && !cancelled) {
                bgFileRef.current = bg.blob;
                setBgImage(bg.img);
                setBgInfo(`${bg.img.naturalWidth} × ${bg.img.naturalHeight}px · restored`);
            }
            const cut = await restore('cutout');
            if (cut && !cancelled) {
                setCutoutImage(cut.img);
                setCutoutInfo(`${cut.img.naturalWidth} × ${cut.img.naturalHeight}px · PNG · restored`);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- file intake --------------------------------------------------------
    const loadImage = (source: File | Blob): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(source);
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Could not decode that image.'));
            };
            img.src = url;
        });

    const handleBgFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            const std = await standardizeSourceImage(file);
            bgFileRef.current = std.blob;
            setBgImage(std.img);
            setBgInfo(std.width + ' × ' + std.height + 'px · Standardized PNG');
            void idbPut('bg', std.blob);
        } catch {
            setBgInfo('Could not open that file.');
        }
    }, []);

    /** Multi-file intake: the first photo becomes the active card's background,
     *  every extra photo becomes its own NEW card (owner ruling 2026-10-02). */
    const handleBgFiles = async (files: FileList | null) => {
        if (!files) return;
        const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (list.length === 0) return;
        await handleBgFile(list[0]);
        for (const extra of list.slice(1)) {
            try {
                stashWorkingPhoto();
                const deck = deckWithWorkingState();
                const std = await standardizeSourceImage(extra);
                const id = 'card-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                cardBgRef.current.set(id, { img: std.img, blob: std.blob });
                setCards([
                    ...deck,
                    { id, name: 'CARD ' + (deck.length + 1), layers: [DEFAULT_TEXT_LAYER], shapes: [], grain: DEFAULT_GRAIN, bgColor: cardBgColor, format: { w: std.width, h: std.height } },
                ]);
                setActiveCardId(id);
                setLayers([DEFAULT_TEXT_LAYER]);
                setActiveLayerId(DEFAULT_TEXT_LAYER.id);
                setShapes([]);
                setActiveShapeId(null);
                setGrain(DEFAULT_GRAIN);
                bgFileRef.current = std.blob;
                setBgImage(std.img);
                setBgInfo(std.width + ' × ' + std.height + 'px · Standardized PNG');
            } catch { /* skip undecodable extras */ }
        }
        if (list.length > 1) setExportNote(list.length + ' photos loaded — one card each.');
    };

    /** Cross-tool intake (§4): a handed-off image (e.g. a gradient backdrop from
     *  color-gradient) becomes the active card's background photo. */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const rec = await takeHandoffImage('quote-card');
            if (cancelled || !rec || !rec.blob.type.startsWith('image/')) return;
            await handleBgFile(new File([rec.blob], rec.name ?? 'card-bg.png', { type: rec.blob.type }));
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCutoutFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            const std = await standardizeSourceImage(file);
            setCutoutImage(std.img);
            setCutoutInfo(`${std.width} × ${std.height}px · YOUR PNG`);
            void idbPut('cutout', std.blob);
        } catch {
            setCutoutInfo('Could not open that cutout PNG.');
        }
    }, []);



    /** Wipes photo + cutout — only ever called after the user confirms. */
    const handleResetPhotos = () => {
        setBgImage(null);
        setBgInfo('');
        setCutoutImage(null);
        setCutoutInfo('');
        setCutoutError(null);
        setBgDim(0);
        bgFileRef.current = null;
        setColorCardStarted(false);
        setExportNote('');
        void idbClear(['bg', 'cutout']);
    };

    /** Owner ruling 2026-10-02: work stays cached, but a WHOLE NEW STATE must
     *  always be one confirmed tap away — wipes photos, every card, text,
     *  overlays and all saved keys, returning the studio to first-load. */
    const handleResetAll = () => {
        handleResetPhotos();
        setCards([]);
        setActiveCardId('');
        cardBgRef.current.clear();
        photoLayerImgsRef.current.clear();
        setLayers([DEFAULT_TEXT_LAYER]);
        setActiveLayerId(DEFAULT_TEXT_LAYER.id);
        setShapes([]);
        setActiveShapeId(null);
        setActiveLayerId(DEFAULT_TEXT_LAYER.id);
        setGrain(DEFAULT_GRAIN);
        setCardBgColor('#18181b');
        setCardFormat({ w: 1080, h: 1350 });
        resetHistory();
        setExportNote('Fresh state — nothing saved from before.');
        try {
            localStorage.removeItem(SETTINGS_KEY);
            localStorage.removeItem(OVERLAYS_KEY);
            localStorage.removeItem(DECK_KEY);
        } catch { /* non-fatal */ }
    };

    // --- multi-textbox management -------------------------------------------
    const handleAddTextBox = () => {
        pushUndo();
        const nextNum = layers.length + 1;
        const newId = `box-${Date.now().toString(36)}`;
        const newLayer: TextLayer = {
            ...DEFAULT_TEXT_LAYER,
            id: newId,
            text: nextNum === 2 ? 'SUBTITLE' : `TEXT #${nextNum}`,
            fontId: activeLayer.fontId,
            yPct: Math.min(0.85, activeLayer.yPct + 0.18),
            depth: nextNum === 2 ? 'front' : 'behind',
        };
        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(newId);
        void ensurePosterFontReady(newLayer.fontId, newLayer.weight, newLayer.italic);
    };

    const handleDuplicateActiveTextBox = () => {
        pushUndo();
        const newId = `box-${Date.now().toString(36)}`;
        const duplicated: TextLayer = {
            ...activeLayer,
            id: newId,
            yPct: Math.min(0.9, activeLayer.yPct + 0.08),
        };
        setLayers((prev) => [...prev, duplicated]);
        setActiveLayerId(newId);
    };

    const handleDeleteActiveTextBox = () => {
        if (layers.length <= 1) return;
        pushUndo();
        const remaining = layers.filter((l) => l.id !== activeLayerId);
        setLayers(remaining);
        setActiveLayerId(remaining[0].id);
    };

    // --- filtered fonts for dropdown ----------------------------------------
    const filteredFonts = useMemo(() => {
        return POSTER_FONTS.filter((f) => {
            const matchesCat = fontCategory === 'All' || f.category === fontCategory;
            const q = fontSearch.toLowerCase().trim();
            const matchesSearch =
                !q ||
                f.name.toLowerCase().includes(q) ||
                f.category.toLowerCase().includes(q) ||
                (q === 'cursive' && f.category === 'Cursive') ||
                (q === 'script' && f.category === 'Cursive') ||
                (q === 'calligraphy' && f.category === 'Cursive') ||
                (q === 'handwriting' && (f.category === 'Cursive' || f.category === 'Graffiti')) ||
                (q === 'gothic' && f.category === 'Gothic') ||
                (q === 'graffiti' && f.category === 'Graffiti');
            return matchesCat && matchesSearch;
        });
    }, [fontCategory, fontSearch]);

    // --- canvas rendering (multi-layer sandwich) ----------------------------
    const drawSandwich = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            W: number,
            H: number,
            opts: { preview: boolean; opaqueBg?: string }
        ) => {
            ctx.clearRect(0, 0, W, H);

            if (opts.opaqueBg) {
                ctx.fillStyle = opts.opaqueBg;
                ctx.fillRect(0, 0, W, H);
            }

            // Layer 0: Background photo
            // Card background colour — visible on colour cards and behind photos.
            ctx.fillStyle = cardBgColor;
            ctx.fillRect(0, 0, W, H);
            if (bgImage) {
                ctx.drawImage(bgImage, 0, 0, W, H);
                // Darken the photo so the type behind the subject pops — the
                // classic poster trick. Part of the shared draw, so the
                // export is exactly the preview.
                if (bgDim > 0) {
                    ctx.save();
                    ctx.fillStyle = `rgba(0,0,0,${bgDim})`;
                    ctx.fillRect(0, 0, W, H);
                    ctx.restore();
                }
            }

            // Single Layer Renderer
            const drawSingleLayer = (l: TextLayer) => {
                if (!l.text.trim()) return;
                const font = fontById(l.fontId);

                const textToRender = applyCase(l.text, l.caseMode, l.uppercase);

                const lines = textToRender.split('\n');
                const targetWeight = l.weight || font.weight;
                const targetStyle = l.italic ? 'italic' : 'normal';

                const probe = Math.max(12, H * 0.1);
                const measure = (px: number) => {
                    ctx.font = `${targetStyle} ${targetWeight} ${px}px ${font.family}`;
                    const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
                    if ('letterSpacing' in ctx) ls.letterSpacing = `${l.letterSpacingEm * px}px`;
                    const widths = lines.map((line) => ctx.measureText(line || ' ').width);
                    const widest = Math.max(...widths, 1);
                    const lineH = px * 1.08;
                    return { widest, blockW: widest, blockH: lineH * lines.length, lineH };
                };

                let fontPx: number;
                let m: ReturnType<typeof measure>;
                if (l.fitToWidth) {
                    const atProbe = measure(probe);
                    fontPx = Math.max(8, probe * ((W * l.widthPct) / 100 / atProbe.blockW));
                    m = measure(fontPx);
                } else {
                    fontPx = Math.max(8, (H * l.heightPct) / 100);
                    m = measure(fontPx);
                }

                ctx.save();
                ctx.globalCompositeOperation = asCompositeOp(l.blend);
                ctx.globalAlpha = l.opacity;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.translate(l.xPct * W, l.yPct * H);
                ctx.rotate((l.rotationDeg * Math.PI) / 180);
                ctx.font = `${targetStyle} ${targetWeight} ${fontPx}px ${font.family}`;
                const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
                if ('letterSpacing' in ctx) ls.letterSpacing = `${l.letterSpacingEm * fontPx}px`;

                // Fill color or gradient
                let fill: string | CanvasGradient = l.color;
                if (l.fillMode === 'gradient') {
                    const rad = (l.gradientAngle * Math.PI) / 180;
                    const gx = Math.cos(rad) * (m.blockW / 2);
                    const gy = Math.sin(rad) * (m.blockH / 2);
                    const grad = ctx.createLinearGradient(-gx, -gy, gx, gy);
                    grad.addColorStop(0, l.color);
                    grad.addColorStop(1, l.gradientColor2);
                    fill = grad;
                }
                ctx.fillStyle = fill;

                // Outline
                const strokePx = l.strokeEm * fontPx;
                if (strokePx > 0) {
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.lineWidth = strokePx;
                    ctx.strokeStyle = l.strokeColor;
                }

                // Shadow & Glow variations
                const sMode = l.shadowMode ?? (l.shadow ? 'soft' : 'none');
                if (sMode === 'soft') {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
                    ctx.shadowBlur = fontPx * 0.12;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = fontPx * 0.06;
                } else if (sMode === 'hard') {
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = fontPx * 0.05;
                    ctx.shadowOffsetY = fontPx * 0.05;
                } else if (sMode === 'neon') {
                    ctx.shadowColor = l.fillMode === 'gradient' ? l.gradientColor2 : l.color;
                    ctx.shadowBlur = fontPx * 0.3;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }

                const firstMid = -(m.blockH / 2) + m.lineH / 2;
                lines.forEach((line, i) => {
                    const y = firstMid + i * m.lineH;
                    if (strokePx > 0) ctx.strokeText(line, 0, y);
                    ctx.fillText(line, 0, y);
                });
                ctx.restore();

                metricsRef.current[l.id] = {
                    cx: l.xPct * W,
                    cy: l.yPct * H,
                    w: m.blockW,
                    h: m.blockH,
                    rot: (l.rotationDeg * Math.PI) / 180,
                    fontPx,
                };
            };

            const drawCutout = () => {
                if (!cutoutImage) return;
                const scale = Math.max(W / cutoutImage.naturalWidth, H / cutoutImage.naturalHeight);
                const dw = cutoutImage.naturalWidth * scale;
                const dh = cutoutImage.naturalHeight * scale;
                ctx.drawImage(cutoutImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
            };

            // Shape overlay renderer (advanced image editing) — every kind shares
            // one model: fill (body) + border (outline) + glow + blend + rotation.
            const drawShapeLayer = (s: ShapeLayer) => {
                let w = Math.max(4, (s.wPct / 100) * W);
                let h = Math.max(2, (s.hPct / 100) * H);
                // TRUE circle (mobile ruling 2026-10-02): independent w/h would
                // render an oval on any non-square canvas — clamp to the smaller axis.
                if (s.kind === 'circle') {
                    const d = Math.min(w, h);
                    w = d;
                    h = d;
                }
                const radius = (s.cornerPct / 100) * Math.min(w, h);
                const lw = Math.max(1, (W / 1000) * Math.max(1, s.strokeW));
                ctx.save();
                ctx.translate(s.xPct * W, s.yPct * H);
                ctx.rotate((s.rotationDeg * Math.PI) / 180);
                ctx.globalCompositeOperation = asCompositeOp(s.blend);

                // Body path for the current kind — rect/line share the rounded-rect
                // (a line is a thin capsule), circle is an ellipse. Icons draw as images.
                const traceBody = () => {
                    if (s.kind === 'circle') {
                        ctx.beginPath();
                        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
                    } else {
                        pathRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
                    }
                };

                if (s.kind === 'image') {
                    // Uploaded photo layer — cover-fit into the shape rect, clipped
                    // to rounded corners. Aspect-locked, so nothing squashes.
                    const img = photoLayerImgsRef.current.get(s.id);
                    ctx.globalAlpha = s.opacity;
                    if (img) {
                        const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
                        const dw = img.naturalWidth * sc;
                        const dh = img.naturalHeight * sc;
                        ctx.save();
                        pathRoundRect(ctx, -w / 2, -h / 2, w, h, radius);
                        ctx.clip();
                        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
                        ctx.restore();
                    } else {
                        // Still decoding — dashed placeholder so the layer is never invisible
                        ctx.strokeStyle = s.strokeColor;
                        ctx.lineWidth = Math.max(1.5, W / 700);
                        ctx.setLineDash([w / 12, w / 16]);
                        ctx.strokeRect(-w / 2, -h / 2, w, h);
                        ctx.setLineDash([]);
                    }
                } else if (s.kind === 'icon') {
                    // Remix icon layer — rendered to an image and stamped at w × h.
                    const def = iconDefById(s.iconId ?? 'arrow-right');
                    const img = def ? loadIconImage(def, s.fillColor, handleIconReady) : null;
                    if (s.glow > 0) {
                        ctx.save();
                        ctx.globalAlpha = s.opacity * 0.45 * (0.25 + s.glow);
                        ctx.shadowColor = s.fillColor;
                        ctx.shadowBlur = Math.min(w, h) * 0.35 * s.glow;
                        ctx.fillStyle = s.fillColor;
                        ctx.fillRect(-w / 2, -h / 2, w, h);
                        ctx.restore();
                    }
                    ctx.globalAlpha = s.opacity;
                    if (img) {
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    } else {
                        // Still decoding — dashed placeholder so the layer is never invisible
                        ctx.strokeStyle = s.fillColor;
                        ctx.lineWidth = Math.max(1.5, W / 700);
                        ctx.setLineDash([w / 12, w / 16]);
                        ctx.strokeRect(-w / 2, -h / 2, w, h);
                        ctx.setLineDash([]);
                    }
                } else if (s.kind === 'beam') {
                    // Lightsaber beam — stacked glow passes, fading body, white-hot core.
                    const halo = (alpha: number, blur: number) => {
                        ctx.save();
                        ctx.globalAlpha = s.opacity * alpha * (0.25 + s.glow);
                        ctx.shadowColor = s.fillColor;
                        ctx.shadowBlur = blur;
                        ctx.fillStyle = s.fillColor;
                        traceBody();
                        ctx.fill();
                        ctx.restore();
                    };
                    if (s.glow > 0) {
                        halo(0.1, h * 2.4);
                        halo(0.16, h * 4.5);
                        halo(0.2, h * 7.5);
                    }
                    if (s.fillOn) {
                        const bodyFade = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
                        bodyFade.addColorStop(0, withAlpha(s.fillColor, 0));
                        bodyFade.addColorStop(0.12, withAlpha(s.fillColor, 0.95));
                        bodyFade.addColorStop(0.88, withAlpha(s.fillColor, 0.95));
                        bodyFade.addColorStop(1, withAlpha(s.fillColor, 0));
                        ctx.globalAlpha = s.opacity;
                        ctx.fillStyle = bodyFade;
                        traceBody();
                        ctx.fill();

                        const coreFade = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
                        coreFade.addColorStop(0, 'rgba(255,255,255,0)');
                        coreFade.addColorStop(0.12, 'rgba(255,255,255,0.9)');
                        coreFade.addColorStop(0.88, 'rgba(255,255,255,0.9)');
                        coreFade.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.globalAlpha = s.opacity * 0.85;
                        ctx.fillStyle = coreFade;
                        pathRoundRect(ctx, -w / 2 + w * 0.01, -h * 0.3, w * 0.98, h * 0.6, h * 0.3);
                        ctx.fill();
                    }
                } else {
                    // Rect, line, circle & arrow share one body model.
                    if (s.glow > 0 && (s.fillOn || s.strokeW > 0)) {
                        ctx.save();
                        ctx.globalAlpha = s.opacity * 0.45 * (0.25 + s.glow);
                        ctx.shadowBlur = h * 1.6 * s.glow;
                        if (s.fillOn) {
                            ctx.shadowColor = s.fillColor;
                            ctx.fillStyle = s.fillColor;
                            traceBody();
                            ctx.fill();
                        } else {
                            ctx.shadowColor = s.strokeColor;
                            ctx.strokeStyle = s.strokeColor;
                            ctx.lineWidth = lw;
                            traceBody();
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                    if (s.fillOn) {
                        ctx.globalAlpha = s.opacity;
                        ctx.fillStyle = s.fillColor;
                        traceBody();
                        ctx.fill();
                    }
                }
                // Border / outline — available on every shape kind.
                if (s.strokeW > 0) {
                    ctx.globalAlpha = s.opacity;
                    ctx.strokeStyle = s.strokeColor;
                    ctx.lineWidth = lw;
                    traceBody();
                    ctx.stroke();
                }
                // Button label — centred in the pill, auto-shrunk to fit, uses the
                // border colour on a filled body (or the fill colour when hollow).
                if (s.kind === 'button' && (s.label ?? '').trim()) {
                    const label = (s.label ?? '').toUpperCase();
                    ctx.globalAlpha = s.opacity;
                    let fpx = h * 0.42;
                    ctx.font = `900 ${fpx}px monospace`;
                    const lsB = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
                    if ('letterSpacing' in ctx) lsB.letterSpacing = `${Math.max(0.5, fpx * 0.06)}px`;
                    const twB = ctx.measureText(label).width;
                    if (twB > w * 0.84) {
                        fpx = Math.max(9, fpx * ((w * 0.84) / twB));
                        ctx.font = `900 ${fpx}px monospace`;
                        if ('letterSpacing' in ctx) lsB.letterSpacing = `${Math.max(0.5, fpx * 0.06)}px`;
                    }
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = s.fillOn ? s.strokeColor : s.fillColor;
                    ctx.fillText(label, 0, h * 0.02);
                    if ('letterSpacing' in ctx) lsB.letterSpacing = '0px';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                }
                ctx.restore();
                shapeMetricsRef.current[s.id] = { cx: s.xPct * W, cy: s.yPct * H, w, h, rot: (s.rotationDeg * Math.PI) / 180 };
            };

            // 1. Behind layers — text first, shapes sit above the behind-text
            metricsRef.current = {};
            shapeMetricsRef.current = {};
            layers.filter((l) => l.depth === 'behind').forEach(drawSingleLayer);
            shapes.filter((s) => s.depth === 'behind').forEach(drawShapeLayer);

            // 2. Cutout PNG
            drawCutout();

            // 3. Front layers — shapes first, text stays on top
            shapes.filter((s) => s.depth === 'front').forEach(drawShapeLayer);
            layers.filter((l) => l.depth === 'front').forEach(drawSingleLayer);

            // 4. Film grain (advanced) — over photo, shapes, cutout and text alike
            if (grain.enabled && grain.opacity > 0) {
                const tile = grainTile(grain.size);
                if (tile) {
                    const pat = ctx.createPattern(tile, 'repeat');
                    if (pat) {
                        ctx.save();
                        try {
                            pat.setTransform(new DOMMatrix([grain.size, 0, 0, grain.size, 0, 0]));
                        } catch { /* older engines: unscaled fine grain */ }
                        ctx.globalCompositeOperation = 'overlay';
                        ctx.globalAlpha = grain.opacity;
                        ctx.fillStyle = pat;
                        ctx.fillRect(0, 0, W, H);
                        ctx.restore();
                    }
                }
            }

            // Preview Overlays (Selection frames and snap lines)
            if (opts.preview) {
                layers.forEach((l) => {
                    const m = metricsRef.current[l.id];
                    if (!m) return;
                    const isActive = l.id === activeLayerId;
                    ctx.save();
                    ctx.strokeStyle = isActive ? 'rgba(255, 221, 0, 0.95)' : 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = isActive ? Math.max(1.5, W / 800) : Math.max(1, W / 1000);
                    ctx.setLineDash(isActive ? [W / 120, W / 160] : [W / 200, W / 200]);
                    ctx.translate(m.cx, m.cy);
                    ctx.rotate(m.rot);
                    ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
                    ctx.restore();
                });

                ctx.save();
                ctx.strokeStyle = 'rgba(255, 221, 0, 0.8)';
                ctx.lineWidth = Math.max(1, W / 1100);
                ctx.setLineDash([W / 90, W / 120]);
                if (guides.v !== null) {
                    ctx.beginPath();
                    ctx.moveTo(guides.v * W, 0);
                    ctx.lineTo(guides.v * W, H);
                    ctx.stroke();
                }
                if (guides.h !== null) {
                    ctx.beginPath();
                    ctx.moveTo(0, guides.h * H);
                    ctx.lineTo(W, guides.h * H);
                    ctx.stroke();
                }
                ctx.restore();

                // Shape frames — cyan to tell shapes apart from text layers. Every
                // shape shows a faint outline so nothing gets lost on the canvas;
                // the active one gets a bold solid frame, corner ticks and a label.
                shapes.forEach((s) => {
                    const m = shapeMetricsRef.current[s.id];
                    if (!m) return;
                    const isActive = s.id === activeShapeId;
                    ctx.save();
                    ctx.translate(m.cx, m.cy);
                    ctx.rotate(m.rot);
                    if (isActive) {
                        ctx.strokeStyle = 'rgba(77, 210, 255, 0.95)';
                        ctx.lineWidth = Math.max(2, W / 500);
                        ctx.setLineDash([]);
                        ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
                        // Corner ticks — selection handles, slightly outside the frame
                        const t = Math.max(8, Math.min(m.w, m.h) * 0.22);
                        ctx.lineWidth = Math.max(3, W / 350);
                        ctx.strokeStyle = 'rgba(77, 210, 255, 1)';
                        ctx.beginPath();
                        ([
                            [-1, -1],
                            [1, -1],
                            [1, 1],
                            [-1, 1],
                        ] as const).forEach(([sx, sy]) => {
                            const x0 = (sx * m.w) / 2;
                            const y0 = (sy * m.h) / 2;
                            ctx.moveTo(x0 - sx * t, y0);
                            ctx.lineTo(x0, y0);
                            ctx.lineTo(x0, y0 - sy * t);
                        });
                        ctx.stroke();
                        // Label chip — "#2 BEAM", above the top-left corner
                        const idx = shapes.findIndex((x) => x.id === s.id) + 1;
                        const label = `#${idx} ${s.kind.toUpperCase()}`;
                        const fontPx = Math.max(11, Math.round(W / 95));
                        ctx.font = `900 ${fontPx}px monospace`;
                        const tw = ctx.measureText(label).width;
                        const pad = fontPx * 0.35;
                        const lx = -m.w / 2;
                        const ly = -m.h / 2 - fontPx - pad * 1.7;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                        ctx.fillRect(lx, ly, tw + pad * 2, fontPx + pad);
                        ctx.fillStyle = '#4DD2FF';
                        ctx.fillText(label, lx + pad, ly + fontPx * 0.8 + pad * 0.1);
                    } else {
                        ctx.strokeStyle = 'rgba(77, 210, 255, 0.38)';
                        ctx.lineWidth = Math.max(1, W / 1000);
                        ctx.setLineDash([W / 200, W / 160]);
                        ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
                    }
                    ctx.restore();
                });
            }
        },
        [bgImage, cutoutImage, layers, activeLayerId, guides, bgDim, shapes, activeShapeId, grain, iconTick, handleIconReady, cardBgColor]
    );

    // Always-fresh draw closure + canvas size for deck export: re-assigned every
    // render so sequential per-card state swaps render through them untouched.
    const drawSandwichRef = useRef(drawSandwich);
    drawSandwichRef.current = drawSandwich;
    const canvasSizeRef = useRef({ w: canvasW, h: canvasH });
    canvasSizeRef.current = { w: canvasW, h: canvasH };

    // Repaint on canvas changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || (!bgImage && !colorCardStarted)) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawSandwich(ctx, canvasW, canvasH, { preview: true });
    }, [bgImage, colorCardStarted, cardBgColor, canvasW, canvasH, drawSandwich]);

    // Repaint when fonts resolve
    useEffect(() => {
        let cancelled = false;
        Promise.all(layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic))).then(() => {
            if (!cancelled) {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx && bgImage) drawSandwich(ctx, canvas.width, canvas.height, { preview: true });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [layers, bgImage, drawSandwich]);

    // --- drag and hit testing ------------------------------------------------
    const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const hitTestLayers = (x: number, y: number, touch = false): string | null => {
        const front = layers.filter((l) => l.depth === 'front');
        const behind = layers.filter((l) => l.depth === 'behind');
        const ordered = [...front.slice().reverse(), ...behind.slice().reverse()];

        for (const l of ordered) {
            const m = metricsRef.current[l.id];
            if (!m) continue;
            const dx = x - m.cx;
            const dy = y - m.cy;
            const cos = Math.cos(m.rot);
            const sin = Math.sin(m.rot);
            const rx = dx * cos + dy * sin;
            const ry = -dx * sin + dy * cos;
            const pad = touch ? Math.max(m.fontPx * 0.35, 34) : m.fontPx * 0.35; // fat-finger grab zone on touch
            if (Math.abs(rx) <= m.w / 2 + pad && Math.abs(ry) <= m.h / 2 + pad) {
                return l.id;
            }
        }
        return null;
    };

    const hitTestShapes = (x: number, y: number, touch = false): string | null => {
        const front = shapes.filter((s) => s.depth === 'front');
        const behind = shapes.filter((s) => s.depth === 'behind');
        const ordered = [...front.slice().reverse(), ...behind.slice().reverse()];

        for (const s of ordered) {
            const m = shapeMetricsRef.current[s.id];
            if (!m) continue;
            const dx = x - m.cx;
            const dy = y - m.cy;
            const cos = Math.cos(m.rot);
            const sin = Math.sin(m.rot);
            const rx = dx * cos + dy * sin;
            const ry = -dx * sin + dy * cos;
            const pad = touch ? Math.max(28, Math.min(m.w, m.h) * 0.45) : Math.max(8, Math.min(m.w, m.h) * 0.3); // fat-finger grab zone on touch
            if (Math.abs(rx) <= m.w / 2 + pad && Math.abs(ry) <= m.h / 2 + pad) {
                return s.id;
            }
        }
        return null;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        // Colour cards (no photo) are draggable too — everything must be movable.
        if (!bgImage && !colorCardStarted) return;
        const p = canvasPoint(e);

        // Shapes win the click first — they are the props you just placed.
        const shapeId = hitTestShapes(p.x, p.y, e.pointerType === 'touch');
        if (shapeId) {
            const sm = shapeMetricsRef.current[shapeId];
            setActiveShapeId(shapeId);
            if (!sm) return;
            dragRef.current = { active: true, kind: 'shape', shapeId, movedPx: 0, ox: sm.cx - p.x, oy: sm.cy - p.y };
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older touch browsers */ }
            return;
        }
        setActiveShapeId(null);

        const hitId = hitTestLayers(p.x, p.y, e.pointerType === 'touch');
        if (!hitId) return;

        setActiveLayerId(hitId);
        const m = metricsRef.current[hitId];
        if (!m) return;
        dragRef.current = { active: true, kind: 'text', layerId: hitId, movedPx: 0, ox: m.cx - p.x, oy: m.cy - p.y };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older touch browsers */ }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!bgImage && !colorCardStarted) return;
        const p = canvasPoint(e);
        const drag = dragRef.current;
        if (!drag?.active) {
            setHoveringLayerId(hitTestLayers(p.x, p.y));
            return;
        }

        if (drag.movedPx === 0) pushUndo(); // snapshot once, at the start of a drag
        drag.movedPx += 1;
        const W = canvasRef.current!.width;
        const H = canvasRef.current!.height;
        let nx = (p.x + drag.ox) / W;
        let ny = (p.y + drag.oy) / H;

        // Spatial snapping — canvas centre/thirds first, then edge-to-edge
        // contact ("magnetic" alignment) against the canvas frame and every
        // other layer/shape on the board: sides kiss the image edge, a rect
        // slides flush under a line of text, centres line up centre-to-centre.
        // Dragging further than a tolerance past a snap releases it.
        const tol = 0.008;
        const tolEdge = 0.012;
        let snapV: number | null = null;
        let snapH: number | null = null;
        for (const c of [0.5, 1 / 3, 2 / 3]) {
            if (Math.abs(nx - c) < tol) { nx = c; snapV = c; }
            if (Math.abs(ny - c) < tol) { ny = c; snapH = c; }
        }

        // Half extents of the dragged item (rotation-aware AABB), normalised.
        const selfIsShape = drag.kind === 'shape';
        const selfM = selfIsShape ? shapeMetricsRef.current[drag.shapeId ?? ''] : metricsRef.current[drag.layerId ?? ''];
        let selfW = 0;
        let selfH = 0;
        let selfRot = 0;
        if (selfM) {
            selfW = selfM.w;
            selfH = selfM.h;
            selfRot = selfM.rot;
        } else if (selfIsShape) {
            const s = shapes.find((x) => x.id === drag.shapeId);
            if (s) {
                selfW = (s.wPct / 100) * W;
                selfH = (s.hPct / 100) * H;
                selfRot = (s.rotationDeg * Math.PI) / 180;
            }
        }
        const cAbs = Math.abs(Math.cos(selfRot));
        const sAbs = Math.abs(Math.sin(selfRot));
        const hw = (selfW * cAbs + selfH * sAbs) / 2 / W;
        const hh = (selfW * sAbs + selfH * cAbs) / 2 / H;

        // Candidate contact edges: canvas frame + every other layer/shape.
        type SnapEdge = { at: number; guide: number; center?: boolean };
        const edgesX: SnapEdge[] = [{ at: 0, guide: 0 }, { at: 1, guide: 1 }];
        const edgesY: SnapEdge[] = [{ at: 0, guide: 0 }, { at: 1, guide: 1 }];
        const aabbOf = (m: { cx: number; cy: number; w: number; h: number; rot: number }) => {
            const c = Math.abs(Math.cos(m.rot));
            const s = Math.abs(Math.sin(m.rot));
            return {
                l: (m.cx - (m.w * c + m.h * s) / 2) / W,
                r: (m.cx + (m.w * c + m.h * s) / 2) / W,
                t: (m.cy - (m.w * s + m.h * c) / 2) / H,
                b: (m.cy + (m.w * s + m.h * c) / 2) / H,
                cx: m.cx / W,
                cy: m.cy / H,
            };
        };
        layers.forEach((l) => {
            if (!selfIsShape && l.id === drag.layerId) return;
            const m = metricsRef.current[l.id];
            if (!m) return;
            const b = aabbOf(m);
            edgesX.push({ at: b.l, guide: b.l }, { at: b.r, guide: b.r }, { at: b.cx, guide: b.cx, center: true });
            edgesY.push({ at: b.t, guide: b.t }, { at: b.b, guide: b.b }, { at: b.cy, guide: b.cy, center: true });
        });
        shapes.forEach((s) => {
            if (selfIsShape && s.id === drag.shapeId) return;
            const m = shapeMetricsRef.current[s.id];
            if (!m) return;
            const b = aabbOf(m);
            edgesX.push({ at: b.l, guide: b.l }, { at: b.r, guide: b.r }, { at: b.cx, guide: b.cx, center: true });
            edgesY.push({ at: b.t, guide: b.t }, { at: b.b, guide: b.b }, { at: b.cy, guide: b.cy, center: true });
        });
        if (snapV === null) {
            for (const e of edgesX) {
                const asLeft = e.at + hw; // self's left edge lands on e.at
                const asRight = e.at - hw; // self's right edge lands on e.at
                if (e.center && Math.abs(nx - e.at) < tolEdge) { nx = e.at; snapV = e.guide; break; }
                if (Math.abs(nx - asLeft) < tolEdge) { nx = asLeft; snapV = e.guide; break; }
                if (Math.abs(nx - asRight) < tolEdge) { nx = asRight; snapV = e.guide; break; }
            }
        }
        if (snapH === null) {
            for (const e of edgesY) {
                const asTop = e.at + hh; // self's top edge lands on e.at
                const asBottom = e.at - hh; // self's bottom edge lands on e.at
                if (e.center && Math.abs(ny - e.at) < tolEdge) { ny = e.at; snapH = e.guide; break; }
                if (Math.abs(ny - asTop) < tolEdge) { ny = asTop; snapH = e.guide; break; }
                if (Math.abs(ny - asBottom) < tolEdge) { ny = asBottom; snapH = e.guide; break; }
            }
        }
        setGuides((prev) => (prev.v === snapV && prev.h === snapH ? prev : { v: snapV, h: snapH }));

        if (drag.kind === 'shape') {
            setShapes((prev) =>
                prev.map((s) =>
                    s.id === drag.shapeId
                        ? { ...s, xPct: Math.max(0, Math.min(1, nx)), yPct: Math.max(0, Math.min(1, ny)) }
                        : s
                )
            );
            return;
        }

        setLayers((prev) =>
            prev.map((l) =>
                l.id === drag.layerId
                    ? { ...l, xPct: Math.max(0, Math.min(1, nx)), yPct: Math.max(0, Math.min(1, ny)) }
                    : l
            )
        );
    };

    const endDrag = () => {
        dragRef.current = null;
        setGuides({ v: null, h: null });
    };

    // --- export --------------------------------------------------------------
    const handleExport = async (format: 'png' | 'jpg', scale: 1 | 2) => {
        if ((!bgImage && !colorCardStarted) || exporting) return;
        setExporting(true);
        setExportNote('Preparing…');
        try {
            await Promise.all(
                layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic))
            );
            const off = document.createElement('canvas');
            off.width = canvasW * scale;
            off.height = canvasH * scale;
            const ctx = off.getContext('2d')!;
            ctx.scale(scale, scale);
            drawSandwich(ctx, canvasW, canvasH, {
                preview: false,
                opaqueBg: format === 'jpg' ? '#FFFFFF' : undefined,
            });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', 0.94)
            );
            if (!blob) throw new Error('Export failed.');
            const base = (activeLayer.text.split('\n')[0] || 'card').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'card';
            downloadBlob(blob, `${base}-card-${canvasW * scale}x${canvasH * scale}.${format}`);
            setExportNote(`Saved ${canvasW * scale} × ${canvasH * scale} ${format.toUpperCase()}.`);
        } catch (err) {
            setExportNote(err instanceof Error ? err.message : 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    /** Cross-tool: ship the current clean canvas straight into Thumbnail Lab without preview overlays. */
    const handleSendToThumbnailLab = async (format: 'longform' | 'shorts') => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;
        setSendingHandoff(true);
        try {
            await Promise.all(
                layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic))
            );
            const off = document.createElement('canvas');
            off.width = canvasW;
            off.height = canvasH;
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            // Clean render: preview: false ensures yellow selection border & snap lines are excluded
            drawSandwich(ctx, canvasW, canvasH, {
                preview: false,
            });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, 'image/png')
            );
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('thumbnail-lab', blob, { format, sourceTool: 'quote-card' });
            setHandoffModalOpen(false);
            window.open('/thumbnail-lab', '_blank');
        } catch (err) {
            console.error('Failed to send to Thumbnail Lab:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Cross-tool: slice the clean canvas into seamless carousel slides (§4). */
    const handleSendToCarouselSlicer = async () => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;
        setSendingHandoff(true);
        try {
            await Promise.all(
                layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic))
            );
            const off = document.createElement('canvas');
            off.width = canvasW;
            off.height = canvasH;
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            drawSandwich(ctx, canvasW, canvasH, { preview: false });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, 'image/png')
            );
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('carousel-slicer', blob, { sourceTool: 'quote-card' });
            setHandoffModalOpen(false);
            window.open('/carousel-slicer', '_blank');
        } catch (err) {
            console.error('Failed to send to Carousel Slicer:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Cross-tool: need the AI text-behind sandwich? Ship this card to Text Behind. */
    const handleSendToTextBehind = async () => {
        if ((!bgImage && !colorCardStarted) || sendingHandoff) return;
        setSendingHandoff(true);
        try {
            await Promise.all(layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic)));
            const off = document.createElement('canvas');
            off.width = canvasW;
            off.height = canvasH;
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            drawSandwichRef.current(ctx, canvasW, canvasH, { preview: false });
            const blob = await new Promise<Blob | null>((resolve) => off.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('text-behind', blob, { sourceTool: 'quote-card' });
            setHandoffModalOpen(false);
            window.open('/text-behind', '_blank');
        } catch (err) {
            console.error('Failed to send to Text Behind:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Cross-tool: reformat the clean card for every platform (§4). */
    const handleSendToResizer = async () => {
        if (!bgImage || sendingHandoff) return;
        setSendingHandoff(true);
        try {
            await Promise.all(
                layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic))
            );
            const off = document.createElement('canvas');
            off.width = canvasW;
            off.height = canvasH;
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            drawSandwich(ctx, canvasW, canvasH, { preview: false });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, 'image/png')
            );
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('resizer', blob, { sourceTool: 'quote-card' });
            setHandoffModalOpen(false);
            window.open('/resizer', '_blank');
        } catch (err) {
            console.error('Failed to send to Resizer:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Deck export: render every card clean, bundle a ZIP (lazy jszip per §7). */
    const handleExportDeck = async () => {
        if (exporting || sendingHandoff || deckExporting) return;
        const deck = deckWithWorkingState();
        if (deck.length < 2) return; // single card → the plain PNG buttons cover it
        setDeckExporting(true);
        setExportNote('Rendering deck…');
        stashWorkingPhoto();
        const orig = {
            layers,
            activeLayerId,
            shapes,
            activeShapeId,
            grain,
            cardBgColor,
            cardFormat,
            bgImage,
            bgBlob: bgFileRef.current,
        };
        const nextFrame = () =>
            new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))));
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const off = document.createElement('canvas');
            const ctx = off.getContext('2d');
            if (!ctx) throw new Error('Offscreen context failed');
            for (let i = 0; i < deck.length; i++) {
                const card = deck[i];
                // Swap the working state to this card; the double-rAF lets React
                // commit so drawSandwichRef holds the fresh closure.
                setLayers(card.layers);
                setActiveLayerId(card.layers[0]?.id ?? '');
                setShapes(card.shapes);
                setActiveShapeId(null);
                setGrain(card.grain);
                setCardBgColor(card.bgColor);
                setCardFormat(card.format);
                const photo = cardBgRef.current.get(card.id) ?? null;
                setBgImage(photo ? photo.img : null);
                bgFileRef.current = photo ? photo.blob : null;
                await Promise.all(card.layers.map((l) => ensurePosterFontReady(l.fontId, l.weight, l.italic)));
                await nextFrame();
                const W = canvasSizeRef.current.w;
                const H = canvasSizeRef.current.h;
                if (off.width !== W || off.height !== H) {
                    off.width = W;
                    off.height = H;
                }
                drawSandwichRef.current(ctx, W, H, { preview: false });
                const blob = await new Promise<Blob | null>((resolve) => off.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error('Card ' + (i + 1) + ' render failed.');
                zip.file(
                    String(i + 1).padStart(2, '0') + '-' + card.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png',
                    blob
                );
                setExportNote('Rendering deck… ' + (i + 1) + '/' + deck.length);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const base = (activeLayer.text.split('\n')[0] || 'creatorskit').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'cards';
            downloadBlob(zipBlob, base + '-deck-' + deck.length + '-cards.zip');
            setExportNote('Saved ZIP · ' + deck.length + ' cards.');
        } catch (err) {
            setExportNote(err instanceof Error ? err.message : 'Deck export failed.');
        } finally {
            // Restore the working state of the card the user was editing.
            setLayers(orig.layers);
            setActiveLayerId(orig.activeLayerId);
            setShapes(orig.shapes);
            setActiveShapeId(orig.activeShapeId);
            setGrain(orig.grain);
            setCardBgColor(orig.cardBgColor);
            setCardFormat(orig.cardFormat);
            setBgImage(orig.bgImage);
            bgFileRef.current = orig.bgBlob;
            setDeckExporting(false);
        }
    };


    const labelStyle: React.CSSProperties = {
        fontFamily: 'monospace',
        fontSize: '0.66rem',
        fontWeight: 900,
        letterSpacing: '0.04em',
        color: '#000',
        textTransform: 'uppercase',
    };

    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {icon}
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
            </span>
        </div>
    );

    return (
        <div
            className={`text-behind-root${activeSheet ? ` ck-sheet-open ck-sheet-${activeSheet}` : ''}`}
            style={{
                width: '100%',
                height: '100dvh',
                maxHeight: '100dvh',
                overflow: 'hidden',
                background: '#f4f4f5',
                color: '#000',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            <div
                className="text-behind-container"
                style={{
                    maxWidth: 1600,
                    width: '100%',
                    height: '100%',
                    margin: '0 auto',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* Clean Header — tools toggle + title, nothing else */}
                <div className="text-behind-header" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 10, padding: '2px 0' }}>
                    {/* Searchable tool menu — single source of truth (src/components/nav/SiteNav.tsx) */}
                    <SiteNav mode="floating" currentHref="/quote-card" theme="light" align="left" label="TOOLS" />
                    <h1 style={{ fontSize: '0.95rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                        CARD STUDIO — QUOTE CARDS
                    </h1>
                </div>

                {/* Main 2-Column Grid */}
                <div
                    className="text-behind-layout"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.45fr) 420px',
                        gap: 14,
                        flex: 1,
                        minHeight: 0,
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    {/* Viewport Column */}
                    <div
                        className="text-behind-viewport"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            height: '100%',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Card tabs moved BELOW the canvas (mobile ruling 2026-10-02) —
                            the 1 2 3 4 strip no longer crowds the page header. */}
                        <div
                            onWheel={(e) => {
                                if (controlsRef.current) {
                                    controlsRef.current.scrollTop += e.deltaY;
                                }
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (!dropActive) setDropActive(true);
                            }}
                            onDragLeave={() => setDropActive(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDropActive(false);
                                const f = e.dataTransfer.files?.[0];
                                if (f && f.type.startsWith('image/')) void handleBgFile(f);
                            }}
                            style={{
                                flex: 1,
                                minHeight: 0,
                                width: '100%',
                                backgroundColor: '#e5e7eb',
                                backgroundImage: 'conic-gradient(#ffffff 90deg, #e5e7eb 90deg 180deg, #ffffff 180deg 270deg, #e5e7eb 270deg)',
                                backgroundSize: '20px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                border: dropActive ? '3px dashed #DC2626' : '2px solid #000',
                                overflow: 'hidden',
                            }}
                        >
                            {(bgImage || colorCardStarted) ? (
                                <>
                                    <canvas
                                        ref={canvasRef}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={endDrag}
                                        onPointerCancel={endDrag}
                                        style={{
                                            maxWidth: 'calc(100% - 24px)',
                                            maxHeight: 'calc(100% - 24px)',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            display: 'block',
                                            touchAction: 'none',
                                            cursor: hoveringLayerId ? 'grab' : 'default',
                                            border: '2px solid #000',
                                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.22), 4px 4px 0 #000',
                                        }}
                                    />
                                    {confirmResetOpen && (
                                        <div
                                            className="text-behind-confirm-pop"
                                            style={{
                                                position: 'fixed',
                                                right: 12,
                                                bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
                                                zIndex: 60,
                                                maxWidth: 'min(300px, calc(100vw - 24px))',
                                                backgroundColor: '#fff',
                                                border: '2px solid #000',
                                                boxShadow: '4px 4px 0 #000',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace' }}>
                                                START FRESH?
                                            </span>
                                            <span style={{ fontSize: '0.62rem', color: '#555', fontFamily: 'monospace', lineHeight: 1.4 }}>
                                                New photos keeps your text, cards & colours. A whole new state clears
                                                EVERYTHING — photos, every card, text, overlays — like your first visit.
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    className="brutalist-button"
                                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.7rem' }}
                                                    onClick={() => {
                                                        setConfirmResetOpen(false);
                                                        handleResetPhotos();
                                                    }}
                                                >
                                                    NEW PHOTOS ONLY
                                                </button>
                                                <button
                                                    type="button"
                                                    className="brutalist-button brutalist-button-primary"
                                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.7rem' }}
                                                    onClick={() => {
                                                        setConfirmResetOpen(false);
                                                        handleResetAll();
                                                    }}
                                                >
                                                    WHOLE NEW STATE
                                                </button>
                                                <button
                                                    type="button"
                                                    className="brutalist-button"
                                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.7rem' }}
                                                    onClick={() => setConfirmResetOpen(false)}
                                                >
                                                    NO, KEEP
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {cutoutError && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: 12,
                                                left: 12,
                                                right: 12,
                                                backgroundColor: '#fff',
                                                border: '2px solid #ef4444',
                                                boxShadow: '4px 4px 0 #000',
                                                padding: '12px 14px',
                                                zIndex: 35,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <AlertTriangle size={18} color="#dc2626" />
                                                    <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', color: '#b91c1c' }}>
                                                        IMAGE TROUBLE
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setCutoutError(null)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem', padding: '0 4px' }}
                                                    title="Dismiss"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '0.66rem', color: '#444', fontFamily: 'monospace', lineHeight: 1.4 }}>
                                                {cutoutError}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <button
                                                    type="button"
                                                    className="brutalist-button brutalist-button-primary"
                                                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                    onClick={() => {
                                                        setCutoutError(null);
                                                        cutoutInputRef.current?.click();
                                                    }}
                                                >
                                                    <span>PICK A PNG INSTEAD</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="brutalist-button"
                                                    style={{ padding: '7px 10px', fontSize: '0.7rem' }}
                                                    onClick={() => cutoutInputRef.current?.click()}
                                                >
                                                    <span>UPLOAD PNG CUTOUT</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card tabs — float at the BOTTOM EDGE of the card
                                        viewport (mobile ruling 2026-10-02): mid-screen, never
                                        crowding the header and never under the START EDITING
                                        button. */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 10,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: 6,
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            maxWidth: 'calc(100% - 24px)',
                                            zIndex: 30,
                                            background: 'rgba(255, 255, 255, 0.94)',
                                            border: '2px solid #000',
                                            boxShadow: '3px 3px 0 #000',
                                            padding: '5px 8px',
                                        }}
                                    >
                                        {(cards.length > 0 ? cards : deckWithWorkingState()).map((c, i) => {
                                            const isActive =
                                                cards.length === 0 || c.id === activeCardId || (activeCardId === '' && c.id === 'card-1');
                                            return (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', border: '2px solid #000' }}>
                                                    <button
                                                        onClick={() => switchCard(c.id)}
                                                        style={{
                                                            padding: '3px 10px',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 900,
                                                            fontSize: '0.62rem',
                                                            letterSpacing: '0.04em',
                                                            cursor: 'pointer',
                                                            border: 'none',
                                                            background: isActive ? '#000' : '#fff',
                                                            color: isActive ? '#fff' : '#000',
                                                        }}
                                                    >
                                                        {String(i + 1).padStart(2, '0')}
                                                    </button>
                                                    {cards.length > 1 && (
                                                        <button
                                                            onClick={() => removeCard(c.id)}
                                                            title="Delete card"
                                                            style={{
                                                                padding: '3px 6px',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                fontSize: '0.62rem',
                                                                cursor: 'pointer',
                                                                border: 'none',
                                                                borderLeft: '2px solid #000',
                                                                background: isActive ? '#000' : '#fff',
                                                                color: isActive ? '#fff' : '#000',
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <button
                                            onClick={addCard}
                                            style={{
                                                padding: '3px 10px',
                                                fontFamily: 'monospace',
                                                fontWeight: 900,
                                                fontSize: '0.62rem',
                                                letterSpacing: '0.04em',
                                                cursor: 'pointer',
                                                border: '2px dashed #000',
                                                background: '#fff',
                                                color: '#000',
                                            }}
                                        >
                                            + CARD
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    onClick={() => bgInputRef.current?.click()}
                                    style={{
                                        textAlign: 'center',
                                        padding: '40px 32px',
                                        minWidth: 360,
                                        maxWidth: 460,
                                        background: dropActive ? '#FFFBEA' : '#fafafa',
                                        border: dropActive ? '2px dashed #000' : '2px dashed #a3a3a3',
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        margin: 20,
                                    }}
                                >
                                    <UploadCloud size={40} style={{ margin: '0 auto 10px', display: 'block', color: dropActive ? '#000' : '#737373' }} />
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#000', marginBottom: 4 }}>
                                        {dropActive ? 'Drop it — we’ll take it from here' : 'Drag & drop your photo here'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#737373', marginBottom: 12 }}>
                                        or click to browse
                                    </div>
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.04em', background: '#FFE500', border: '1.5px solid #000', padding: '2px 8px' }}>
                                        MULTI-CARD STUDIO · NO AI · 100% ON-DEVICE
                                    </span>
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1.5px dashed #d4d4d4' }}>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#525252', marginBottom: 8 }}>
                                            NO PHOTO YET? START A COLOUR CARD
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
                                            {['#18181b', '#f5f5f4', '#FFE500', '#dc2626', '#2563eb', '#059669'].map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => {
                                                        setCardBgColor(c);
                                                        setColorCardStarted(true);
                                                    }}
                                                    title={'Start a ' + c + ' card'}
                                                    style={{ width: 34, height: 34, border: '2px solid #000', background: c, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
                                            {([
                                                ['1:1', 1080, 1080],
                                                ['4:5', 1080, 1350],
                                                ['9:16', 1080, 1920],
                                            ] as [string, number, number][]).map(([label, w, h]) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    className="brutalist-button"
                                                    onClick={() => setCardFormat({ w, h })}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.64rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        background: cardFormat.w === w && cardFormat.h === h ? '#000' : '#fff',
                                                        color: cardFormat.w === w && cardFormat.h === h ? '#fff' : '#000',
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#a3a3a3', marginTop: 6, fontFamily: 'monospace' }}>
                                            every card keeps its own photo, colour, text & overlays · free · no signup
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(bgImage || colorCardStarted) && (
                            <div className="text-behind-meta-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px 6px', flexShrink: 0, gap: 8 }}>
                                {/* The size/active caption stays untouched — icons sit to its right */}
                                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, color: '#666' }}>
                                    {canvasW} × {canvasH}px · Active: #{layers.findIndex((l) => l.id === activeLayerId) + 1} ({activeLayer.depth.toUpperCase()})
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <button
                                        type="button"
                                        onClick={undo}
                                        disabled={undoCount === 0}
                                        title="Undo (Ctrl+Z)"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '3px 7px',
                                            background: undoCount > 0 ? '#fff' : '#f1f1f1',
                                            border: '1.5px solid #000',
                                            boxShadow: undoCount > 0 ? '2px 2px 0 #000' : 'none',
                                            cursor: undoCount > 0 ? 'pointer' : 'default',
                                            color: undoCount > 0 ? '#000' : '#9ca3af',
                                        }}
                                    >
                                        <Undo2 size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={redo}
                                        disabled={redoCount === 0}
                                        title="Redo (Ctrl+Shift+Z)"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '3px 7px',
                                            background: redoCount > 0 ? '#fff' : '#f1f1f1',
                                            border: '1.5px solid #000',
                                            boxShadow: redoCount > 0 ? '2px 2px 0 #000' : 'none',
                                            cursor: redoCount > 0 ? 'pointer' : 'default',
                                            color: redoCount > 0 ? '#000' : '#9ca3af',
                                        }}
                                    >
                                        <Redo2 size={14} />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Controls Column */}
                    <div
                        ref={controlsRef}
                        className="text-behind-controls-scroll"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            height: '100%',
                            minHeight: 0,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            paddingRight: 6,
                        }}
                    >
                        {/* Hidden File Inputs */}
                        <input
                            ref={bgInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                void handleBgFiles(e.target.files);
                                e.currentTarget.value = '';
                            }}
                        />
                        <input
                            ref={cutoutInputRef}
                            type="file"
                            accept="image/png,image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                handleCutoutFile(e.target.files?.[0] ?? null);
                                e.currentTarget.value = '';
                            }}
                        />
                        <input
                            ref={photoLayerInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                void handleAddPhotoLayers(e.target.files);
                                e.currentTarget.value = '';
                            }}
                        />

                        {/* Phase-6 sheet header (mobile only) — title + DONE closes the sheet */}
                        <div className="text-behind-sheet-head">
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {activeSheet ? MOBILE_SHEET_LABELS[activeSheet] : ''}
                            </span>
                            <button type="button" onClick={() => setActiveSheet(null)}>
                                DONE
                            </button>
                        </div>

                        {/* Desktop Continuous Cards Column */}
                        <div className="text-behind-desktop-cards">
                            {/* 0. Card deck manager — mobile CARDS sheet only
                                (desktop keeps the floating deck strip on the canvas). */}
                            <div className="brutalist-card" data-ck-cat="cards" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {sectionTitle(<Layers size={14} />, `Card Deck (${(cards.length > 0 ? cards : deckWithWorkingState()).length})`)}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {(cards.length > 0 ? cards : deckWithWorkingState()).map((c, i) => {
                                        const isActive =
                                            cards.length === 0 || c.id === activeCardId || (activeCardId === '' && c.id === 'card-1');
                                        return (
                                            <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', border: '2px solid #000' }}>
                                                <button
                                                    onClick={() => switchCard(c.id)}
                                                    style={{
                                                        padding: '8px 14px',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        fontSize: '0.68rem',
                                                        letterSpacing: '0.04em',
                                                        cursor: 'pointer',
                                                        border: 'none',
                                                        background: isActive ? '#000' : '#fff',
                                                        color: isActive ? '#fff' : '#000',
                                                    }}
                                                >
                                                    CARD {String(i + 1).padStart(2, '0')}
                                                </button>
                                                {cards.length > 1 && (
                                                    <button
                                                        onClick={() => removeCard(c.id)}
                                                        title="Delete card"
                                                        style={{
                                                            padding: '8px 10px',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 900,
                                                            fontSize: '0.68rem',
                                                            cursor: 'pointer',
                                                            border: 'none',
                                                            borderLeft: '2px solid #000',
                                                            background: isActive ? '#000' : '#fff',
                                                            color: isActive ? '#fff' : '#000',
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button type="button" className="brutalist-button" style={{ padding: '8px 10px', fontSize: '0.7rem' }} onClick={addCard}>
                                    + ADD CARD
                                </button>
                                <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', lineHeight: 1.5 }}>
                                    Each card keeps its own photo, text and shapes. Switch here or tap the numbers floating under the card.
                                </div>
                            </div>

                            {/* 1. Photos & Subject Cutout Card — mobile sheet: PHOTO */}
                            <div className="brutalist-card" data-ck-cat="photo" style={{ padding: 14 }}>
                                {sectionTitle(<ImagePlus size={14} />, 'Photos & Cutout')}
                                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666', marginBottom: 10 }}>
                                    PER-CARD PHOTOS · NO AI MODELS · 100% ON-DEVICE
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <button
                                        className="brutalist-button brutalist-button-primary"
                                        style={{ padding: '9px 8px', fontSize: '0.72rem' }}
                                        onClick={() => bgInputRef.current?.click()}
                                    >
                                        {bgImage ? 'CHANGE PHOTO ↻' : '+ UPLOAD PHOTO'}
                                    </button>
                                    <button
                                        type="button"
                                        className="brutalist-button"
                                        style={{ padding: '9px 8px', fontSize: '0.72rem' }}
                                        onClick={() => photoLayerInputRef.current?.click()}
                                    >
                                        + PHOTO ON CANVAS
                                    </button>
                                </div>

                                {cutoutInfo ? (
                                    <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#16a34a', marginBottom: 8, padding: '6px 8px', background: '#f0fdf4', border: '1.5px solid #16a34a' }}>
                                        ✓ {cutoutInfo}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', marginBottom: 8 }}>
                                        Optional: bring your own transparent PNG to layer in front of the text.
                                    </div>
                                )}

                                {bgInfo && (
                                    <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, color: '#000', marginBottom: 8, padding: '4px 6px', background: '#f5f5f5', border: '1px solid #ddd' }}>
                                        PHOTO: {bgInfo}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="brutalist-button"
                                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.66rem', marginBottom: 8 }}
                                    onClick={() => cutoutInputRef.current?.click()}
                                >
                                    UPLOAD CUSTOM SUBJECT PNG
                                </button>

                                    {/* Card background colour — the canvas on photo-less cards */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                            CARD COLOUR
                                        </label>
                                        <input
                                            type="color"
                                            value={cardBgColor}
                                            onChange={(e) => setCardBgColor(e.target.value)}
                                            style={{ width: 34, height: 26, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                        />
                                        {['#18181b', '#f5f5f4', '#FFE500', '#dc2626', '#2563eb', '#059669'].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCardBgColor(c)}
                                                title={'Card colour ' + c}
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    border: cardBgColor === c ? '2px solid #000' : '1.5px solid #999',
                                                    background: c,
                                                    cursor: 'pointer',
                                                    boxShadow: cardBgColor === c ? '2px 2px 0 #000' : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Card format template — canvas size for photo-less cards */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                            FORMAT
                                        </label>
                                        {([['1:1', 1080, 1080], ['4:5', 1080, 1350], ['9:16', 1080, 1920]] as [string, number, number][]).map(([label, w, h]) => (
                                            <button
                                                key={label}
                                                type="button"
                                                className="brutalist-button"
                                                disabled={!!bgImage}
                                                title={bgImage ? 'Format follows the photo' : w + ' × ' + h + ' px'}
                                                onClick={() => setCardFormat({ w, h })}
                                                style={{
                                                    padding: '5px 9px',
                                                    fontSize: '0.64rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    background: cardFormat.w === w && cardFormat.h === h ? '#000' : '#fff',
                                                    color: cardFormat.w === w && cardFormat.h === h ? '#fff' : '#000',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                {bgImage && (
                                    <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1.5px solid #eee' }}>
                                        <TactileScrubber
                                            label="BACKGROUND DIM"
                                            value={Math.round(bgDim * 100)}
                                            min={0}
                                            max={85}
                                            step={5}
                                            onChange={(v) => {
                                                pushUndo();
                                                setBgDim(v / 100);
                                            }}
                                            formatValue={(v) => (v === 0 ? 'OFF' : `${v}%`)}
                                            presets={[
                                                { label: 'OFF', value: 0 },
                                                { label: 'SUBTLE', value: 25 },
                                                { label: 'MOODY', value: 50 },
                                                { label: 'NIGHT', value: 75 },
                                            ]}
                                            width="100%"
                                        />
                                    </div>
                                )}

                                <button
                                    className="brutalist-button"
                                    style={{ width: '100%', padding: '5px 10px', fontSize: '0.6rem', marginTop: 10 }}
                                    onClick={() => setConfirmResetOpen(true)}
                                >
                                    NEW STATE / RESET
                                </button>
                            </div>

                            {/* 2. Text Boxes & Typography Card — mobile sheet: TEXT */}
                            <div className="brutalist-card" data-ck-cat="text" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Multi-Textbox Selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 10, borderBottom: '1.5px solid #000' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {sectionTitle(<TypeIcon size={14} />, `Text Boxes (${layers.length})`)}
                                        <button
                                            type="button"
                                            onClick={handleAddTextBox}
                                            className="brutalist-button"
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '0.64rem',
                                                fontFamily: 'monospace',
                                                fontWeight: 900,
                                                background: '#FFDD00',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <Plus size={12} /> ADD TEXT BOX
                                        </button>
                                    </div>

                                    {/* Layer Pill Bar */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {layers.map((l, index) => {
                                            const isActive = l.id === activeLayerId;
                                            return (
                                                <button
                                                    key={l.id}
                                                    type="button"
                                                    onClick={() => setActiveLayerId(l.id)}
                                                    style={{
                                                        padding: '5px 8px',
                                                        border: '2px solid #000',
                                                        background: isActive ? '#FFDD00' : '#fff',
                                                        boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '0.68rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <span style={{ opacity: 0.6 }}>#{index + 1}</span>
                                                    <span>{l.text ? applyCase(l.text.slice(0, 9), l.caseMode, l.uppercase) : 'EMPTY'}</span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.52rem',
                                                            padding: '1px 4px',
                                                            background: l.depth === 'behind' ? '#e0e7ff' : '#fef3c7',
                                                            color: l.depth === 'behind' ? '#3730a3' : '#92400e',
                                                            border: '1px solid #000',
                                                        }}
                                                    >
                                                        {l.depth === 'behind' ? 'BEHIND' : 'FRONT'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Active Box Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                type="button"
                                                onClick={handleDuplicateActiveTextBox}
                                                style={{
                                                    padding: '3px 6px',
                                                    fontSize: '0.58rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 700,
                                                    border: '1px solid #000',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                }}
                                            >
                                                <Copy size={10} /> DUP
                                            </button>
                                            {layers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={handleDeleteActiveTextBox}
                                                    style={{
                                                        padding: '3px 6px',
                                                        fontSize: '0.58rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 700,
                                                        border: '1px solid #ff4d4d',
                                                        color: '#b91c1c',
                                                        background: '#fff5f5',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                    }}
                                                >
                                                    <Trash2 size={10} /> DEL
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                type="button"
                                                onClick={() => patchLayer({ depth: 'behind' })}
                                                style={{
                                                    padding: '3px 6px',
                                                    fontSize: '0.58rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    border: '1px solid #000',
                                                    background: layer.depth === 'behind' ? '#000' : '#fff',
                                                    color: layer.depth === 'behind' ? '#fff' : '#000',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                BEHIND CUTOUT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => patchLayer({ depth: 'front' })}
                                                style={{
                                                    padding: '3px 6px',
                                                    fontSize: '0.58rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    border: '1px solid #000',
                                                    background: layer.depth === 'front' ? '#000' : '#fff',
                                                    color: layer.depth === 'front' ? '#fff' : '#000',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                IN FRONT
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Text Input Area */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={labelStyle}>TEXT CONTENT</span>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666' }}>LINE BREAKS SUPPORTED</span>
                                    </div>
                                    <textarea
                                        value={layer.text}
                                        onChange={(e) => patchLayer({ text: e.target.value })}
                                        rows={2}
                                        style={{
                                            width: '100%',
                                            border: '2px solid #000',
                                            padding: '6px 8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                        }}
                                        placeholder="TYPE YOUR TEXT..."
                                    />
                                </div>

                                {/* 75+ Google Fonts Selector with Search, Cursive & Categories */}
                                <div style={{ position: 'relative' }} ref={fontDropdownRef}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={labelStyle}>GOOGLE FONTS ({POSTER_FONTS.length}+ VARIATIONS)</span>
                                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#166534', background: '#dcfce7', padding: '1px 5px', border: '1px solid #166534' }}>
                                            {fontById(layer.fontId).category.toUpperCase()}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setFontDropdownOpen((prev) => !prev)}
                                        style={{
                                            width: '100%',
                                            marginTop: 4,
                                            border: '2px solid #000',
                                            padding: '8px 10px',
                                            background: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            boxShadow: fontDropdownOpen ? '3px 3px 0 #000' : '2px 2px 0 #000',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontFamily: fontById(layer.fontId).family, fontSize: '1.05rem', fontWeight: layer.weight || fontById(layer.fontId).weight, fontStyle: layer.italic ? 'italic' : 'normal', color: '#000' }}>
                                                {fontById(layer.fontId).name}
                                            </div>
                                            <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666' }}>
                                                {fontById(layer.fontId).category} · {layer.weight || fontById(layer.fontId).weight} {layer.italic ? '· Italic' : ''}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                                            {fontDropdownOpen ? '▲ CLOSE' : `▼ ${POSTER_FONTS.length} FONTS`}
                                        </span>
                                    </button>

                                    {/* Dropdown Menu with Category Filter & Search */}
                                    {fontDropdownOpen && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                marginTop: 4,
                                                background: '#fff',
                                                border: '2px solid #000',
                                                boxShadow: '4px 4px 0 #000',
                                                zIndex: 70,
                                                maxHeight: 360,
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            {/* Search Bar */}
                                            <div style={{ padding: '8px', borderBottom: '1.5px solid #000', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Search size={14} style={{ opacity: 0.6 }} />
                                                <input
                                                    type="text"
                                                    value={fontSearch}
                                                    onChange={(e) => setFontSearch(e.target.value)}
                                                    placeholder="Search 75+ fonts (cursive, script, gothic, graffiti, sans...)"
                                                    style={{
                                                        flex: 1,
                                                        border: '1px solid #ccc',
                                                        padding: '5px 7px',
                                                        fontSize: '0.72rem',
                                                        fontFamily: 'monospace',
                                                        outline: 'none',
                                                    }}
                                                />
                                                {fontSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFontSearch('')}
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Category Filter Tabs */}
                                            <div style={{ display: 'flex', borderBottom: '1.5px solid #000', background: '#f4f4f5', overflowX: 'auto', flexShrink: 0 }}>
                                                {(['All', 'Tabloid', 'Sans', 'Serif', 'Cursive', 'Graffiti', 'Gothic', 'Typewriter'] as const).map((cat) => {
                                                    const isActive = fontCategory === cat;
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setFontCategory(cat)}
                                                            style={{
                                                                flex: '1 0 auto',
                                                                padding: '6px 8px',
                                                                border: 'none',
                                                                borderRight: '1px solid #ddd',
                                                                background: isActive ? '#000' : 'transparent',
                                                                color: isActive ? '#FFE500' : '#000',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                fontSize: '0.6rem',
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {cat === 'Cursive' ? 'Cursive / Script' : cat === 'Graffiti' ? 'Graffiti / Brush' : cat}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Font List Items */}
                                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                                {filteredFonts.length === 0 ? (
                                                    <div style={{ padding: 16, textAlign: 'center', fontSize: '0.68rem', fontFamily: 'monospace', color: '#888' }}>
                                                        No fonts matching &ldquo;{fontSearch}&rdquo;
                                                    </div>
                                                ) : (
                                                    filteredFonts.map((f) => {
                                                        const isSelected = layer.fontId === f.id;
                                                        return (
                                                            <button
                                                                key={f.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    patchLayer({ fontId: f.id });
                                                                    setFontDropdownOpen(false);
                                                                    void ensurePosterFontReady(f.id, layer.weight, layer.italic);
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '9px 12px',
                                                                    background: isSelected ? '#FFDD00' : '#fff',
                                                                    border: 'none',
                                                                    borderBottom: '1px solid #e5e5e5',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isSelected) e.currentTarget.style.background = '#f4f4f5';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isSelected) e.currentTarget.style.background = '#fff';
                                                                }}
                                                            >
                                                                <div>
                                                                    <span style={{ fontFamily: f.family, fontSize: '1.05rem', fontWeight: f.weight, color: '#000' }}>
                                                                        {f.name}
                                                                    </span>
                                                                    <span style={{ marginLeft: 6, fontSize: '0.52rem', fontFamily: 'monospace', background: '#eee', color: '#333', padding: '1px 5px', border: '1px solid #ccc', fontWeight: 700 }}>
                                                                        {f.category}
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontFamily: f.family, fontSize: '0.92rem', color: isSelected ? '#000' : '#666', letterSpacing: '0.04em' }}>
                                                                    {layer.text ? applyCase(layer.text.slice(0, 10), layer.caseMode, layer.uppercase) : 'POSTER'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hero Quick-Audition Chips: Anton first, no sparkles/emojis */}
                                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'anton', label: 'ANTON' },
                                            { id: 'bebas-neue', label: 'BEBAS' },
                                            { id: 'archivo-black', label: 'ARCHIVO' },
                                            { id: 'inter', label: 'INTER' },
                                            { id: 'playfair', label: 'PLAYFAIR' },
                                            { id: 'cinzel', label: 'CINZEL' },
                                            { id: 'syne', label: 'SYNE' },
                                            { id: 'space-mono', label: 'SPACE MONO' },
                                            { id: 'pacifico', label: 'PACIFICO' },
                                            { id: 'great-vibes', label: 'GREAT VIBES' },
                                            { id: 'dancing-script', label: 'DANCING' },
                                            { id: 'lobster', label: 'LOBSTER' },
                                            { id: 'mr-dafoe', label: 'MR DAFOE' },
                                            { id: 'unifraktur', label: 'GOTHIC' },
                                            { id: 'permanent-marker', label: 'MARKER' },
                                        ].map((chip) => {
                                            const f = fontById(chip.id);
                                            const isSelected = layer.fontId === chip.id;
                                            return (
                                                <button
                                                    key={chip.id}
                                                    type="button"
                                                    onClick={() => {
                                                        patchLayer({ fontId: chip.id });
                                                        void ensurePosterFontReady(chip.id, layer.weight, layer.italic);
                                                    }}
                                                    style={{
                                                        padding: '3px 8px',
                                                        fontSize: '0.62rem',
                                                        fontFamily: f.family,
                                                        border: '1.5px solid #000',
                                                        background: isSelected ? '#FFDD00' : '#fff',
                                                        boxShadow: isSelected ? '1.5px 1.5px 0 #000' : 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: f.weight,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {chip.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Typographic Variations (Weight, Italic, Case, 3D Shadow) */}
                                <div style={{ padding: '10px 12px', border: '1.5px solid #000', background: '#fafafa', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={labelStyle}>TYPOGRAPHIC VARIATIONS</span>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb' }}>
                                            WEIGHT · SLANT · CASE
                                        </span>
                                    </div>

                                    {/* Weight variations */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, color: '#555' }}>WEIGHT VARIATION</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {[
                                                { weight: 400, label: 'REGULAR (400)' },
                                                { weight: 700, label: 'BOLD (700)' },
                                                { weight: 900, label: 'HEAVY (900)' },
                                            ].map((w) => {
                                                const active = (layer.weight || fontById(layer.fontId).weight) === w.weight;
                                                return (
                                                    <button
                                                        key={w.weight}
                                                        type="button"
                                                        onClick={() => {
                                                            patchLayer({ weight: w.weight });
                                                            void ensurePosterFontReady(layer.fontId, w.weight, layer.italic);
                                                        }}
                                                        className="brutalist-button"
                                                        style={{
                                                            flex: 1,
                                                            padding: '4px 4px',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 900,
                                                            background: active ? '#FFDD00' : '#fff',
                                                        }}
                                                    >
                                                        {w.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Slant & Case Variations */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 8 }}>
                                        {/* Slant / Italic */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, color: '#555' }}>SLANT</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = !layer.italic;
                                                    patchLayer({ italic: next });
                                                    void ensurePosterFontReady(layer.fontId, layer.weight, next);
                                                }}
                                                className="brutalist-button"
                                                style={{
                                                    padding: '5px 4px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 900,
                                                    fontStyle: layer.italic ? 'italic' : 'normal',
                                                    background: layer.italic ? '#FFDD00' : '#fff',
                                                }}
                                            >
                                                {layer.italic ? '✓ ITALIC' : 'NORMAL'}
                                            </button>
                                        </div>

                                        {/* Letter Case */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, color: '#555' }}>LETTER CASE</span>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                {[
                                                    { mode: 'uppercase' as const, label: 'ABC' },
                                                    { mode: 'capitalize' as const, label: 'Abc' },
                                                    { mode: 'lowercase' as const, label: 'abc' },
                                                    { mode: 'original' as const, label: 'Aa' },
                                                ].map((c) => {
                                                    const active = (layer.caseMode ?? (layer.uppercase ? 'uppercase' : 'original')) === c.mode;
                                                    return (
                                                        <button
                                                            key={c.mode}
                                                            type="button"
                                                            onClick={() => patchLayer({ caseMode: c.mode, uppercase: c.mode === 'uppercase' })}
                                                            className="brutalist-button"
                                                            style={{
                                                                flex: 1,
                                                                padding: '5px 2px',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 900,
                                                                background: active ? '#FFDD00' : '#fff',
                                                            }}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shadow & 3D Depth Modes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700, color: '#555' }}>SHADOW & 3D DEPTH</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                                            {[
                                                { mode: 'none' as const, label: 'FLAT', desc: 'No Shadow' },
                                                { mode: 'soft' as const, label: 'SOFT', desc: 'Drop Glow' },
                                                { mode: 'hard' as const, label: '3D HARD', desc: 'Brutalist' },
                                                { mode: 'neon' as const, label: 'NEON', desc: 'Vivid Glow' },
                                            ].map((s) => {
                                                const active = (layer.shadowMode ?? (layer.shadow ? 'soft' : 'none')) === s.mode;
                                                return (
                                                    <button
                                                        key={s.mode}
                                                        type="button"
                                                        onClick={() => patchLayer({ shadowMode: s.mode, shadow: s.mode !== 'none' })}
                                                        className="brutalist-button"
                                                        style={{
                                                            padding: '4px 2px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            background: active ? '#FFDD00' : '#fff',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, fontFamily: 'monospace' }}>{s.label}</span>
                                                        <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: active ? '#000' : '#666' }}>{s.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Color Selection */}
                                <div>
                                    <span style={labelStyle}>TEXT COLOR</span>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {TEXT_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => patchLayer({ color: c })}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    border: layer.color === c ? '3px solid #000' : '2px solid #999',
                                                    background: c,
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                }}
                                                aria-label={`Color ${c}`}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            value={layer.color}
                                            onChange={(e) => patchLayer({ color: e.target.value })}
                                            style={{ width: 28, height: 24, border: '2px solid #999', padding: 0, cursor: 'pointer', background: 'none' }}
                                        />
                                    </div>
                                    {/* Custom hex / RGB entry */}
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, color: '#555' }}>CUSTOM</span>
                                        <input
                                            value={customColorInput}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                setCustomColorInput(raw);
                                                const parsed = parseColorInput(raw);
                                                if (parsed) patchLayer({ color: parsed });
                                            }}
                                            placeholder="#FFDD00 · fda · rgb(255,221,0)"
                                            spellCheck={false}
                                            style={{
                                                flex: 1,
                                                minWidth: 120,
                                                padding: '4px 6px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                border: `2px solid ${customColorInput && !parseColorInput(customColorInput) ? '#DC2626' : '#999'}`,
                                                outline: 'none',
                                            }}
                                        />
                                        {['R', 'G', 'B'].map((ch, i) => {
                                            const hex = layer.color.replace('#', '').padEnd(6, '0');
                                            const val = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
                                            return (
                                                <span key={ch} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                    <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, color: '#555' }}>{ch}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={255}
                                                        value={val}
                                                        onChange={(e) => {
                                                            const parts = [0, 1, 2].map((j) => parseInt(hex.slice(j * 2, j * 2 + 2), 16));
                                                            parts[i] = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                                                            const next = '#' + parts.map((n) => n.toString(16).padStart(2, '0')).join('');
                                                            patchLayer({ color: next });
                                                            setCustomColorInput(next);
                                                        }}
                                                        style={{ width: 44, padding: '4px 3px', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, border: '2px solid #999', outline: 'none' }}
                                                    />
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Style Presets, Blends & Geometry Card — mobile sheet: TEXT */}
                            <div className="brutalist-card" data-ck-cat="text" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {sectionTitle(<Scissors size={14} />, 'Style & Poster Looks')}

                                {/* 10 Style Presets */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={labelStyle}>POSTER VARIATION PRESETS (10)</span>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666' }}>ONE-TAP LOOKS</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                                        {TEXT_PRESETS.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => patchLayer(p.patch)}
                                                className="brutalist-button"
                                                style={{ padding: '5px 3px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}
                                                title={p.name}
                                            >
                                                <span style={{ width: '100%', height: 14, border: '2px solid #000', background: p.swatch, display: 'block' }} />
                                                <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
                                                    {p.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sizing Controls */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {([true, false] as const).map((fit) => (
                                            <button
                                                key={String(fit)}
                                                onClick={() => patchLayer({ fitToWidth: fit })}
                                                className="brutalist-button"
                                                style={{
                                                    flex: 1,
                                                    padding: '5px 6px',
                                                    fontSize: '0.62rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    background: layer.fitToWidth === fit ? '#FFDD00' : '#fff',
                                                }}
                                            >
                                                {fit ? 'FIT TO WIDTH' : 'FIXED SIZE'}
                                            </button>
                                        ))}
                                    </div>
                                    {layer.fitToWidth ? (
                                        <TactileScrubber
                                            label="WIDTH"
                                            value={Math.round(layer.widthPct)}
                                            min={10}
                                            max={100}
                                            step={1}
                                            onChange={(v) => patchLayer({ widthPct: v })}
                                            formatValue={(v) => `${v}%`}
                                            presets={[{ label: 'TIGHT', value: 70 }, { label: 'WIDE', value: 86 }, { label: 'FULL', value: 100 }]}
                                            width="100%"
                                        />
                                    ) : (
                                        <TactileScrubber
                                            label="SIZE"
                                            value={Math.round(layer.heightPct)}
                                            min={2}
                                            max={40}
                                            step={0.5}
                                            onChange={(v) => patchLayer({ heightPct: v })}
                                            formatValue={(v) => `${v}%`}
                                            width="100%"
                                        />
                                    )}
                                </div>

                                {/* Spacing & Opacity */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <TactileScrubber
                                        label="LETTER SPACING"
                                        value={Math.round(layer.letterSpacingEm * 100)}
                                        min={-5}
                                        max={30}
                                        step={1}
                                        onChange={(v) => patchLayer({ letterSpacingEm: v / 100 })}
                                        formatValue={(v) => `${(v / 100).toFixed(2)}em`}
                                        width="100%"
                                    />
                                    <TactileScrubber
                                        label="OPACITY"
                                        value={Math.round(layer.opacity * 100)}
                                        min={10}
                                        max={100}
                                        step={1}
                                        onChange={(v) => patchLayer({ opacity: v / 100 })}
                                        formatValue={(v) => `${v}%`}
                                        presets={[{ label: '50%', value: 50 }, { label: '80%', value: 80 }, { label: '100%', value: 100 }]}
                                        width="100%"
                                    />
                                </div>

                                {/* Blend Mode */}
                                <div style={{ padding: '8px 10px', border: '1.5px solid #000', background: '#fafafa', borderRadius: 2 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={labelStyle}>BLEND MODE</span>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, color: layer.blend === 'normal' ? '#15803d' : '#2563eb', background: layer.blend === 'normal' ? '#dcfce7' : '#dbeafe', padding: '1px 5px', border: '1px solid currentColor' }}>
                                            {layer.blend === 'normal' ? 'SOLID' : layer.blend.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                        {[
                                            { id: 'normal', label: 'SOLID' },
                                            { id: 'overlay', label: 'OVERLAY' },
                                            { id: 'screen', label: 'SCREEN' },
                                            { id: 'multiply', label: 'MULTIPLY' },
                                        ].map((b) => {
                                            const active = layer.blend === b.id;
                                            return (
                                                <button
                                                    key={b.id}
                                                    type="button"
                                                    onClick={() => patchLayer({ blend: b.id as BlendMode })}
                                                    className="brutalist-button"
                                                    style={{
                                                        padding: '6px 2px',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900,
                                                        fontFamily: 'monospace',
                                                        textAlign: 'center',
                                                        background: active ? '#FFDD00' : '#fff',
                                                        boxShadow: active ? '1.5px 1.5px 0 #000' : 'none',
                                                        border: '1.5px solid #000',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {b.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fill Mode & Gradient */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={labelStyle}>FILL TYPE</span>
                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666' }}>
                                            {layer.fillMode === 'solid' ? 'FLAT COLOR' : 'TWO-COLOR GRADIENT'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {(['solid', 'gradient'] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => patchLayer({ fillMode: mode })}
                                                className="brutalist-button"
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 8px',
                                                    fontSize: '0.64rem',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 900,
                                                    background: layer.fillMode === mode ? '#FFDD00' : '#fff',
                                                    boxShadow: layer.fillMode === mode ? '2px 2px 0 #000' : 'none',
                                                }}
                                            >
                                                {mode === 'solid' ? 'SOLID' : 'GRADIENT'}
                                            </button>
                                        ))}
                                    </div>

                                    {layer.fillMode === 'gradient' && (
                                        <div style={{ padding: '10px 12px', border: '1.5px solid #000', background: '#fafafa', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={labelStyle}>GRADIENT END COLOR</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#555' }}>{layer.gradientColor2}</span>
                                                    <input
                                                        type="color"
                                                        value={layer.gradientColor2}
                                                        onChange={(e) => patchLayer({ gradientColor2: e.target.value })}
                                                        style={{ width: 28, height: 24, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <TactileScrubber
                                                label="GRADIENT ANGLE"
                                                value={Math.round(layer.gradientAngle)}
                                                min={0}
                                                max={360}
                                                step={1}
                                                onChange={(v) => patchLayer({ gradientAngle: v })}
                                                formatValue={(v) => `${v}°`}
                                                presets={[{ label: '0°', value: 0 }, { label: '45°', value: 45 }, { label: '90°', value: 90 }, { label: '180°', value: 180 }]}
                                                width="100%"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Outline / Stroke */}
                                <div style={{ padding: '10px 12px', border: '1.5px solid #000', background: '#fafafa', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={labelStyle}>OUTLINE / STROKE</span>
                                            <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: layer.strokeEm > 0 ? '#15803d' : '#888' }}>
                                                {layer.strokeEm > 0 ? '● ON' : '○ OFF'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#555' }}>{layer.strokeColor}</span>
                                            <input
                                                type="color"
                                                value={layer.strokeColor}
                                                onChange={(e) => patchLayer({ strokeColor: e.target.value })}
                                                style={{ width: 28, height: 24, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <TactileScrubber
                                        label="OUTLINE WIDTH"
                                        value={Math.round(layer.strokeEm * 100)}
                                        min={0}
                                        max={12}
                                        step={0.5}
                                        onChange={(v) => patchLayer({ strokeEm: v / 100 })}
                                        formatValue={(v) => (v === 0 ? 'OFF' : `${(v / 100).toFixed(2)}em`)}
                                        presets={[
                                            { label: 'OFF', value: 0 },
                                            { label: 'THIN', value: 2 },
                                            { label: 'MED', value: 5 },
                                            { label: 'BOLD', value: 8 },
                                        ]}
                                        width="100%"
                                    />
                                </div>

                                {/* Rotation */}
                                <TactileScrubber
                                    label="ROTATION"
                                    value={Math.round(layer.rotationDeg)}
                                    min={0}
                                    max={360}
                                    step={1}
                                    onChange={(v) => patchLayer({ rotationDeg: v })}
                                    formatValue={(v) => `${v}°`}
                                    presets={[{ label: '0°', value: 0 }, { label: '90°', value: 90 }, { label: '180°', value: 180 }, { label: '270°', value: 270 }]}
                                    width="100%"
                                />
                            </div>

                            {/* 4. Export Card — mobile sheet: NEXT */}
                            <div className="brutalist-card" data-ck-cat="next" style={{ padding: 14 }}>
                                {sectionTitle(<Download size={14} />, 'Export Poster')}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                                    <button className="brutalist-button brutalist-button-primary" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('png', 1)}>
                                        PNG · NATIVE
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('png', 2)}>
                                        PNG · 2×
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('jpg', 1)}>
                                        JPG · NATIVE
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={(!bgImage && !colorCardStarted) || exporting} onClick={() => handleExport('jpg', 2)}>
                                        JPG · 2×
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={(!bgImage && !colorCardStarted) || exporting || sendingHandoff}
                                        onClick={() => setHandoffModalOpen(true)}
                                    >
                                        → OPEN IN THUMBNAIL LAB (NO DOWNLOAD)
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={exporting || sendingHandoff || deckExporting || cards.length < 2}
                                        onClick={handleExportDeck}
                                    >
                                        ⬇ EXPORT DECK — ALL CARDS (ZIP)
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={exporting || sendingHandoff}
                                        onClick={handleSendToTextBehind}
                                    >
                                        → WANT THE TEXT-BEHIND EFFECT? SEND TO TEXT BEHIND
                                    </button>
                                </div>
                                {exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#B45309' }}>RENDERING…</div>}
                                {exportNote && !exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{exportNote}</div>}

                                {/* NEXT → hand-off row (docs/TOOL_INTEGRATION_PLAN.md §4.3) */}
                                {exportNote && !exporting && (
                                    <NextStepRow currentHref="/quote-card" heading="Card saved — keep going" />
                                )}
                                {!cutoutImage && bgImage && (
                                    <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                                        No cutout uploaded — text renders on top of photo. Add a transparent PNG for the behind-subject effect.
                                    </div>
                                )}
                            </div>

                            {/* 5. Advanced Image Editing (shapes + grain) — mobile sheet: SHAPES */}
                            <div className="brutalist-card" data-ck-cat="shapes" style={{ padding: 14 }}>
                                <button
                                    type="button"
                                    onClick={() => setAdvancedOpen((o) => !o)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    {sectionTitle(null, 'Advanced Image Editing')}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {(shapes.length > 0 || grain.enabled) && (
                                            <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', fontWeight: 900, background: '#000', color: '#FFE500', padding: '2px 5px', border: '1px solid #000' }}>
                                                {shapes.length + (grain.enabled ? 1 : 0)} ACTIVE
                                            </span>
                                        )}
                                        <ChevronDown size={14} style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                    </span>
                                </button>

                                {advancedOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                        <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', lineHeight: 1.5 }}>
                                            Rectangles, lines, light beams & film grain — extra layers you can place behind or in
                                            front of the subject without leaving the tool. Click a shape on the canvas to drag it.
                                        </div>

                                        {/* Shape add row — chips wrap with their icons on narrow
                                            screens (mobile ruling 2026-10-02), never squashed. */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 6 }}>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('rect')}
                                            >
                                                <Square size={11} /> RECT
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('line')}
                                            >
                                                <Minus size={11} /> LINE
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('beam')}
                                            >
                                                <Slash size={11} /> BEAM
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('circle')}
                                            >
                                                <Circle size={11} /> CIRCLE
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('icon')}
                                            >
                                                <Star size={11} /> ICON
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('button')}
                                                title="Button pill with editable label (NEXT, SWIPE, LINK IN BIO…)"
                                            >
                                                BTN
                                            </button>
                                        </div>

                                        {/* Shape pills */}
                                        {shapes.length > 0 && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {shapes.map((s, index) => {
                                                    const isActive = s.id === activeShapeId;
                                                    const kindLabel = s.kind === 'rect' ? 'RECT' : s.kind === 'line' ? 'LINE' : s.kind === 'beam' ? 'BEAM' : s.kind === 'circle' ? 'CIRCLE' : s.kind === 'button' ? 'BUTTON' : 'ICON';
                                                    return (
                                                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'stretch', border: '2px solid #000', background: isActive ? '#4DD2FF' : '#fff' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveShapeId(isActive ? null : s.id)}
                                                                style={{ padding: '5px 7px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}
                                                            >
                                                                <span style={{ opacity: 0.6 }}>#{index + 1}</span>
                                                                {kindLabel}
                                                                <span style={{ fontSize: '0.5rem', padding: '1px 4px', border: '1px solid #000', background: s.depth === 'behind' ? '#e0e7ff' : '#fef3c7' }}>
                                                                    {s.depth === 'behind' ? 'BEHIND' : 'FRONT'}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeShape(s.id)}
                                                                title="Delete shape"
                                                                style={{ padding: '0 6px', background: 'none', border: 'none', borderLeft: '1.5px solid #000', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Active shape inspector */}
                                        {activeShape && (
                                            <div style={{ border: '2px solid #000', background: '#fafafa', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.66rem' }}>
                                                        {activeShape.kind === 'rect' ? 'RECTANGLE' : activeShape.kind === 'line' ? 'LINE' : activeShape.kind === 'beam' ? 'LIGHT BEAM' : activeShape.kind === 'circle' ? 'CIRCLE' : activeShape.kind === 'button' ? 'BUTTON' : 'ICON'}
                                                    </span>
                                                    <div style={{ display: 'flex', border: '1.5px solid #000' }}>
                                                        {(['behind', 'front'] as const).map((d) => (
                                                            <button
                                                                key={d}
                                                                type="button"
                                                                onClick={() => patchActiveShape({ depth: d })}
                                                                style={{
                                                                    padding: '3px 7px',
                                                                    border: 'none',
                                                                    fontSize: '0.55rem',
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: 900,
                                                                    cursor: 'pointer',
                                                                    background: activeShape.depth === d ? '#000' : '#fff',
                                                                    color: activeShape.depth === d ? '#FFE500' : '#000',
                                                                }}
                                                            >
                                                                {d === 'behind' ? 'BEHIND SUBJECT' : 'FRONT'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>COLOR</span>
                                                    {TEXT_COLORS.map((c) => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => patchActiveShape({ fillColor: c })}
                                                            style={{ width: 20, height: 20, background: c, border: activeShape.fillColor === c ? '2px solid #000' : '1px solid #888', cursor: 'pointer', padding: 0 }}
                                                        />
                                                    ))}
                                                    <input
                                                        type="color"
                                                        value={activeShape.fillColor}
                                                        onChange={(e) => patchActiveShape({ fillColor: e.target.value })}
                                                        style={{ width: 30, height: 24, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                                    />
                                                </div>

                                                {/* Button label editor (kind === 'button') */}
                                                {activeShape.kind === 'button' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>BUTTON LABEL</span>
                                                        <input
                                                            type="text"
                                                            value={activeShape.label ?? ''}
                                                            onChange={(e) => patchActiveShape({ label: e.target.value })}
                                                            placeholder="NEXT · SWIPE · LINK IN BIO"
                                                            maxLength={24}
                                                            style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #000', fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', background: '#fff' }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Icon picker — Remix Icon library (searchable) */}
                                                {activeShape.kind === 'icon' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <input
                                                            type="text"
                                                            value={iconSearch}
                                                            onChange={(e) => setIconSearch(e.target.value)}
                                                            placeholder="Search icons — arrow, star, play..."
                                                            style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #000', fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 800, background: '#fff' }}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, maxHeight: 150, overflowY: 'auto', border: '1.5px solid #000', background: '#fff', padding: 5 }}>
                                                            {filteredShapeIcons.length === 0 ? (
                                                                <span style={{ gridColumn: '1 / -1', fontSize: '0.58rem', fontFamily: 'monospace', color: '#777', textAlign: 'center', padding: '8px 0' }}>
                                                                    No icons match "{iconSearch}"
                                                                </span>
                                                            ) : (
                                                                filteredShapeIcons.map((ic) => {
                                                                    const Ic = ic.component as React.ComponentType<{ size?: number | string; color?: string }>;
                                                                    const active = activeShape.iconId === ic.id;
                                                                    return (
                                                                        <button
                                                                            key={ic.id}
                                                                            type="button"
                                                                            title={ic.name}
                                                                            onClick={() => patchActiveShape({ iconId: ic.id })}
                                                                            style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: active ? '1.5px solid #000' : '1px solid #ddd', background: active ? '#000' : '#fff', cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            <Ic size={15} color={active ? '#FFE500' : '#000'} />
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {activeShape.kind === 'circle' ? (
                                                    // TRUE circle (mobile ruling 2026-10-02) — one DIAMETER
                                                    // control drives both axes so it can never go oval.
                                                    <TactileScrubber
                                                        label="DIAMETER"
                                                        value={activeShape.wPct}
                                                        min={2}
                                                        max={100}
                                                        step={1}
                                                        onChange={(v) => patchActiveShape({ wPct: v, hPct: v })}
                                                        formatValue={(v) => `${Math.round(v)}%`}
                                                        showSteppers={false}
                                                        width="100%"
                                                    />
                                                ) : (
                                                    <>
                                                        <TactileScrubber
                                                            label={activeShape.kind === 'icon' ? 'SIZE' : activeShape.kind === 'rect' ? 'WIDTH' : 'LENGTH'}
                                                            value={activeShape.wPct}
                                                            min={2}
                                                            max={100}
                                                            step={1}
                                                            onChange={(v) => patchActiveShape({ wPct: v })}
                                                            formatValue={(v) => `${Math.round(v)}%`}
                                                            showSteppers={false}
                                                            width="100%"
                                                        />
                                                        <TactileScrubber
                                                            label={activeShape.kind === 'rect' || activeShape.kind === 'icon' ? 'HEIGHT' : 'THICKNESS'}
                                                            value={activeShape.hPct}
                                                            min={activeShape.kind === 'rect' || activeShape.kind === 'icon' ? 2 : 0.2}
                                                            max={activeShape.kind === 'rect' || activeShape.kind === 'icon' ? 100 : 20}
                                                            step={activeShape.kind === 'rect' || activeShape.kind === 'icon' ? 1 : 0.2}
                                                            onChange={(v) => patchActiveShape({ hPct: v })}
                                                            formatValue={(v) => `${v.toFixed(1)}%`}
                                                            showSteppers={false}
                                                            width="100%"
                                                        />
                                                    </>
                                                )}
                                                {/* Rotation — scrubber plus a direct angle input for exact degrees */}
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <TactileScrubber
                                                            label="ROTATION"
                                                            value={Math.round(activeShape.rotationDeg)}
                                                            min={0}
                                                            max={360}
                                                            step={1}
                                                            onChange={(v) => patchActiveShape({ rotationDeg: v })}
                                                            formatValue={(v) => `${v}°`}
                                                            presets={[{ label: '0°', value: 0 }, { label: '45°', value: 45 }, { label: '90°', value: 90 }, { label: '135°', value: 135 }, { label: '180°', value: 180 }]}
                                                            showSteppers={false}
                                                            width="100%"
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 5 }}>
                                                        <input
                                                            type="number"
                                                            min={-360}
                                                            max={360}
                                                            step={1}
                                                            value={Math.round(activeShape.rotationDeg)}
                                                            onChange={(e) => {
                                                                const raw = parseFloat(e.target.value);
                                                                if (Number.isFinite(raw)) patchActiveShape({ rotationDeg: ((raw % 360) + 360) % 360 });
                                                            }}
                                                            title="Type an exact angle"
                                                            style={{ width: 56, padding: '4px 5px', border: '1.5px solid #000', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.66rem', background: '#fff', color: '#000' }}
                                                        />
                                                        <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: '#555' }}>°</span>
                                                    </div>
                                                </div>
                                                <TactileScrubber
                                                    label="OPACITY"
                                                    value={Math.round(activeShape.opacity * 100)}
                                                    min={5}
                                                    max={100}
                                                    step={5}
                                                    onChange={(v) => patchActiveShape({ opacity: v / 100 })}
                                                    formatValue={(v) => `${v}%`}
                                                    showSteppers={false}
                                                    width="100%"
                                                />
                                                <TactileScrubber
                                                    label="GLOW"
                                                    value={Math.round(activeShape.glow * 100)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    onChange={(v) => patchActiveShape({ glow: v / 100 })}
                                                    formatValue={(v) => (v === 0 ? 'OFF' : `${v}%`)}
                                                    showSteppers={false}
                                                    width="100%"
                                                />

                                                {/* Fill type — every kind: rect fill · line body · beam streak */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>
                                                        {activeShape.kind === 'beam' ? 'BEAM BODY' : activeShape.kind === 'icon' ? 'ICON COLOR' : 'FILL'}
                                                    </span>
                                                    {([true, false] as const).map((on) => (
                                                        <button
                                                            key={String(on)}
                                                            type="button"
                                                            onClick={() => patchActiveShape({ fillOn: on })}
                                                            style={{ padding: '3px 8px', border: '1.5px solid #000', background: activeShape.fillOn === on ? '#000' : '#fff', color: activeShape.fillOn === on ? '#fff' : '#000', fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}
                                                        >
                                                            {on ? 'SOLID' : 'HOLLOW'}
                                                        </button>
                                                    ))}
                                                </div>
                                                {(activeShape.kind === 'rect' || activeShape.kind === 'line') && (
                                                    <TactileScrubber
                                                        label="CORNER ROUNDING"
                                                        value={activeShape.cornerPct}
                                                        min={0}
                                                        max={50}
                                                        step={1}
                                                        onChange={(v) => patchActiveShape({ cornerPct: v })}
                                                        formatValue={(v) => (v === 0 ? 'SHARP' : `${v}%`)}
                                                        showSteppers={false}
                                                        width="100%"
                                                    />
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>BORDER</span>
                                                    <input
                                                        type="color"
                                                        value={activeShape.strokeColor}
                                                        onChange={(e) => patchActiveShape({ strokeColor: e.target.value })}
                                                        style={{ width: 30, height: 24, border: '2px solid #000', padding: 0, cursor: 'pointer', background: 'none' }}
                                                    />
                                                </div>
                                                <TactileScrubber
                                                    label="BORDER WIDTH"
                                                    value={activeShape.strokeW}
                                                    min={0}
                                                    max={30}
                                                    step={1}
                                                    onChange={(v) => patchActiveShape({ strokeW: v })}
                                                    formatValue={(v) => (v === 0 ? 'OFF' : `${(v / 10).toFixed(1)}%`)}
                                                    showSteppers={false}
                                                    width="100%"
                                                />

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>BLEND</span>
                                                    {(['normal', 'multiply', 'overlay', 'screen'] as const).map((b) => (
                                                        <button
                                                            key={b}
                                                            type="button"
                                                            onClick={() => patchActiveShape({ blend: b })}
                                                            style={{ padding: '3px 7px', border: '1.5px solid #000', background: activeShape.blend === b ? '#000' : '#fff', color: activeShape.blend === b ? '#FFE500' : '#000', fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeShape(activeShape.id)}
                                                    style={{ padding: '5px 8px', border: '1.5px solid #000', background: '#fff', cursor: 'pointer', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                >
                                                    <Trash2 size={11} /> DELETE SHAPE
                                                </button>
                                            </div>
                                        )}

                                        {/* Film grain overlay */}
                                        <div style={{ borderTop: '1.5px solid #eee', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {sectionTitle(<Layers size={13} />, 'Film Grain Overlay')}
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {([false, true] as const).map((on) => (
                                                    <button
                                                        key={String(on)}
                                                        type="button"
                                                        onClick={() => patchGrain({ enabled: on })}
                                                        style={{ padding: '4px 10px', border: '1.5px solid #000', background: grain.enabled === on ? '#000' : '#fff', color: grain.enabled === on ? '#FFE500' : '#000', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}
                                                    >
                                                        {on ? 'ON' : 'OFF'}
                                                    </button>
                                                ))}
                                            </div>
                                            {grain.enabled && (
                                                <>
                                                    <TactileScrubber
                                                        label="INTENSITY"
                                                        value={Math.round(grain.opacity * 100)}
                                                        min={2}
                                                        max={60}
                                                        step={2}
                                                        onChange={(v) => patchGrain({ opacity: v / 100 })}
                                                        formatValue={(v) => `${v}%`}
                                                        showSteppers={false}
                                                        width="100%"
                                                    />
                                                    <TactileScrubber
                                                        label="GRAIN SIZE"
                                                        value={grain.size}
                                                        min={1}
                                                        max={5}
                                                        step={1}
                                                        onChange={(v) => patchGrain({ size: v })}
                                                        formatValue={(v) => (v <= 1 ? 'FINE' : v === 2 ? 'STANDARD' : v === 3 ? 'COARSE' : 'CHUNKY')}
                                                        presets={[{ label: 'FINE', value: 1 }, { label: 'STD', value: 2 }, { label: 'COARSE', value: 4 }]}
                                                        showSteppers={false}
                                                        width="100%"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Phase-6 Canva pattern (owner ruling 2026-10-02): bottom category
                bar — the canvas NEVER sits under it; each chip opens ONE
                slide-up sheet; tap the canvas (peek) or DONE to close. */}
            <MobileEditorToolbar
                categories={[
                    { id: 'cards', label: 'Cards', icon: <Layers size={15} /> },
                    { id: 'photo', label: 'Photo', icon: <ImagePlus size={15} /> },
                    { id: 'text', label: 'Text', icon: <TypeIcon size={15} /> },
                    { id: 'shapes', label: 'Shapes', icon: <Square size={15} /> },
                    { id: 'next', label: 'Next', icon: <Download size={15} /> },
                ]}
                active={activeSheet}
                onSelect={(id) => {
                    setActiveSheet(id as keyof typeof MOBILE_SHEET_LABELS | null);
                    // The SHAPES sheet hosts the Advanced card — make sure
                    // its content is expanded when the sheet opens.
                    if (id === 'shapes') setAdvancedOpen(true);
                }}
            />

            {/* Canvas tap closes a peek sheet; dimmed tap closes a full sheet */}
            {activeSheet && (
                <div className="text-behind-sheet-backdrop" onClick={() => setActiveSheet(null)} />
            )}


            {/* Cross-Tool Handoff Format Choice Modal */}
            {handoffModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => !sendingHandoff && setHandoffModalOpen(false)}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 500,
                            background: '#fff',
                            border: '3px solid #000',
                            boxShadow: '8px 8px 0 #000',
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase' }}>
                                    CROSS-TOOL HANDOFF
                                </div>
                                <h3 style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.15rem', color: '#000', textTransform: 'uppercase' }}>
                                    Send to Thumbnail Lab
                                </h3>
                            </div>
                            <button
                                onClick={() => !sendingHandoff && setHandoffModalOpen(false)}
                                style={{
                                    border: '2px solid #000',
                                    background: '#f4f4f5',
                                    fontWeight: 900,
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'sans-serif', color: '#333', lineHeight: 1.5 }}>
                            Select the destination placement in Thumbnail Lab for your clean graphic:
                            {canvasW > 0 && canvasH > 0 && (
                                <span style={{ display: 'block', marginTop: 8, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.74rem', color: '#000' }}>
                                    📐 Canvas dimensions: {canvasW} × {canvasH} ({canvasW >= canvasH ? 'Horizontal 16:9 recommended' : 'Vertical 9:16 Shorts recommended'})
                                </span>
                            )}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Option 1: Longform */}
                            <button
                                className="brutalist-button"
                                disabled={sendingHandoff}
                                onClick={() => void handleSendToThumbnailLab('longform')}
                                style={{
                                    padding: '16px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    textAlign: 'center',
                                    background: canvasW >= canvasH ? '#000' : '#fff',
                                    color: canvasW >= canvasH ? '#fff' : '#000',
                                    border: '2px solid #000',
                                    cursor: sendingHandoff ? 'wait' : 'pointer',
                                }}
                            >
                                <span style={{ fontSize: '1.6rem' }}>🎬</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                                    16:9 Long-Form
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#444', lineHeight: 1.3 }}>
                                    YouTube Mobile & Desktop Video Feed
                                </span>
                                {canvasW >= canvasH && (
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 6px' }}>
                                        ★ MATCHES RATIO
                                    </span>
                                )}
                            </button>

                            {/* Option 2: Shorts */}
                            <button
                                className="brutalist-button"
                                disabled={sendingHandoff}
                                onClick={() => void handleSendToThumbnailLab('shorts')}
                                style={{
                                    padding: '16px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    textAlign: 'center',
                                    background: canvasW < canvasH ? '#000' : '#fff',
                                    color: canvasW < canvasH ? '#fff' : '#000',
                                    border: '2px solid #000',
                                    cursor: sendingHandoff ? 'wait' : 'pointer',
                                }}
                            >
                                <span style={{ fontSize: '1.6rem' }}>📱</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                                    9:16 Shorts / Reel
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#444', lineHeight: 1.3 }}>
                                    YouTube Shorts Shelf & Player
                                </span>
                                {canvasW < canvasH && (
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '2px 6px' }}>
                                        ★ MATCHES RATIO
                                    </span>
                                )}
                            </button>

                            {/* Option 3: Carousel Slicer hand-off (§4) */}
                            <button
                                className="brutalist-button"
                                disabled={sendingHandoff}
                                onClick={() => void handleSendToCarouselSlicer()}
                                style={{
                                    gridColumn: '1 / -1',
                                    padding: '14px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    textAlign: 'center',
                                    background: '#fff',
                                    border: '2px solid #000',
                                    cursor: sendingHandoff ? 'wait' : 'pointer',
                                }}
                            >
                                <span style={{ fontSize: '1.4rem' }}>🪟</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                                    Slice Into Carousel Slides
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#444', lineHeight: 1.3 }}>
                                    Instagram & LinkedIn multi-slide post (no download needed)
                                </span>
                            </button>

                            {/* Option 4: Resizer hand-off (§4) */}
                            <button
                                className="brutalist-button"
                                disabled={sendingHandoff}
                                onClick={() => void handleSendToResizer()}
                                style={{
                                    gridColumn: '1 / -1',
                                    padding: '14px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    textAlign: 'center',
                                    background: '#fff',
                                    border: '2px solid #000',
                                    cursor: sendingHandoff ? 'wait' : 'pointer',
                                }}
                            >
                                <span style={{ fontSize: '1.4rem' }}>📐</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                                    Reformat For Every Platform
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#444', lineHeight: 1.3 }}>
                                    TikTok 9:16, IG 4:5, X & YouTube — auto batch (no download needed)
                                </span>
                            </button>
                        </div>

                        {sendingHandoff && (
                            <div style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', color: '#B45309' }}>
                                ⏳ RENDERING CLEAN GRAPHIC (WITHOUT BORDER) & OPENING LAB…
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                /* Clean brutalist scrollbar for settings column */
                .text-behind-controls-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .text-behind-controls-scroll::-webkit-scrollbar-track {
                    background: #f4f4f5;
                    border-left: 1px solid #000;
                }
                .text-behind-controls-scroll::-webkit-scrollbar-thumb {
                    background: #000;
                }
                @keyframes ckShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .ck-skeleton-shimmer {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
                    animation: ckShimmer 1.5s infinite;
                }
                .ck-skeleton-box {
                    animation: ckPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes ckPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }
                @media (min-width: 981px) {
                    .text-behind-desktop-cards {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 14px !important;
                        height: 100% !important;
                        min-height: 0 !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        padding-right: 6px !important;
                    }
                    /* Phase-6 Canva pattern — desktop never sees the bar, sheet
                       header, backdrop, or the mobile-only CARDS deck card */
                    .ck-mobile-editor-toolbar,
                    .text-behind-sheet-head,
                    .text-behind-sheet-backdrop {
                        display: none !important;
                    }
                    .text-behind-desktop-cards > [data-ck-cat='cards'] {
                        display: none !important;
                    }
                }
                @media (max-width: 980px) {
                    /* Pin to the real viewport — no parent padding/background can
                       leak a gap above or below the studio. */
                    .text-behind-root {
                        position: fixed !important;
                        inset: 0 !important;
                        height: 100% !important;
                        max-height: 100% !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        background: #fff !important;
                    }
                    .text-behind-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        gap: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 100% !important;
                    }
                    .text-behind-header {
                        padding: 8px 12px !important;
                        border-bottom: 1.5px solid #000 !important;
                        background: #fff !important;
                        flex-shrink: 0 !important;
                    }
                    .text-behind-layout {
                        display: flex !important;
                        flex-direction: column !important;
                        flex: 1 !important;
                        min-height: 0 !important;
                        overflow: hidden !important;
                        gap: 0 !important;
                        width: 100% !important;
                    }
                    /* Canvas-first stage: the card fills the whole screen and
                       NEVER sits under the bottom category bar (Phase 6). */
                    .text-behind-viewport {
                        flex: 1 1 auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        position: relative !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin: 0 !important;
                        border: none !important;
                        width: 100% !important;
                        background-size: 16px 16px !important;
                        /* Reserve the toolbar lane — canvas never touches the bar */
                        padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
                        box-sizing: border-box !important;
                    }
                    .text-behind-viewport canvas {
                        max-width: 100% !important;
                        max-height: 100% !important;
                        width: auto !important;
                        height: auto !important;
                    }
                    .text-behind-meta-strip {
                        display: none !important;
                    }
                    /* ---- Phase-6 Canva sheet: the controls column becomes a
                       slide-up bottom sheet while the canvas stays visible. */
                    .text-behind-controls-scroll {
                        display: none !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll {
                        display: flex !important;
                        position: fixed !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        z-index: 80 !important;
                        height: min(60vh, 560px) !important;
                        max-height: min(60vh, 560px) !important;
                        flex-direction: column !important;
                        background: #fff !important;
                        border-top: 3px solid #000 !important;
                        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.28) !important;
                        padding: 0 !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        -webkit-overflow-scrolling: touch !important;
                        animation: ckSheetUp 220ms cubic-bezier(0.32, 0.72, 0, 1);
                    }
                    /* Dense categories get the tall sheet */
                    .ck-sheet-text .text-behind-controls-scroll,
                    .ck-sheet-shapes .text-behind-controls-scroll {
                        height: 85vh !important;
                        max-height: 85vh !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .ck-sheet-open .text-behind-controls-scroll::-webkit-scrollbar-thumb {
                        background: #000;
                    }
                    @keyframes ckSheetUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    /* Sheet header — title + DONE (mobile only) */
                    .text-behind-sheet-head {
                        display: none !important;
                    }
                    .ck-sheet-open .text-behind-sheet-head {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        gap: 10px !important;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 5 !important;
                        background: #fff !important;
                        border-bottom: 2px solid #000 !important;
                        padding: 10px 14px !important;
                        flex-shrink: 0 !important;
                    }
                    .text-behind-sheet-head button {
                        background: #000 !important;
                        color: #fff !important;
                        border: 2px solid #000 !important;
                        font-family: monospace !important;
                        font-weight: 900 !important;
                        font-size: 0.66rem !important;
                        letter-spacing: 0.08em !important;
                        padding: 6px 12px !important;
                        cursor: pointer !important;
                    }
                    /* Canvas tap-catcher: transparent for peek sheets
                       (tap the canvas to get back), dimmed for full sheets */
                    .text-behind-sheet-backdrop {
                        position: fixed !important;
                        inset: 0 !important;
                        z-index: 70 !important;
                        background: transparent !important;
                    }
                    .ck-sheet-text .text-behind-sheet-backdrop,
                    .ck-sheet-shapes .text-behind-sheet-backdrop {
                        background: rgba(0, 0, 0, 0.45) !important;
                    }
                    /* Sheet body: only the active category's cards show —
                       desktop JSX reused verbatim, filtered per sheet. */
                    .text-behind-desktop-cards {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 14px !important;
                        padding: 12px 2px calc(24px + env(safe-area-inset-bottom, 0px)) !important;
                    }
                    .text-behind-desktop-cards .brutalist-card {
                        padding: 14px 12px !important;
                    }
                    .ck-sheet-open .text-behind-desktop-cards > [data-ck-cat] {
                        display: none !important;
                    }
                    .ck-sheet-cards .text-behind-desktop-cards > [data-ck-cat~='cards'],
                    .ck-sheet-text .text-behind-desktop-cards > [data-ck-cat~='text'],
                    .ck-sheet-shapes .text-behind-desktop-cards > [data-ck-cat~='shapes'] {
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .ck-sheet-photo .text-behind-desktop-cards > [data-ck-cat~='photo'],
                    .ck-sheet-next .text-behind-desktop-cards > [data-ck-cat~='next'] {
                        display: block !important;
                    }
                    /* ---- Touch sizing: every control a real finger target ---- */
                    .ck-sheet-open .text-behind-controls-scroll button {
                        font-size: 0.78rem !important;
                        min-height: 42px !important;
                        max-width: 100% !important;
                        padding: 8px 12px !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll button svg {
                        width: 16px !important;
                        height: 16px !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll input[type='text'],
                    .ck-sheet-open .text-behind-controls-scroll input[type='number'],
                    .ck-sheet-open .text-behind-controls-scroll textarea {
                        font-size: 1rem !important; /* 16px stops iOS focus-zoom */
                        min-height: 46px !important;
                        box-sizing: border-box !important;
                        max-width: 100% !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll input[type='range'] {
                        min-height: 44px !important;
                        height: 44px !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll input[type='color'] {
                        width: 44px !important;
                        height: 44px !important;
                        min-width: 44px !important;
                        border: 2px solid #000 !important;
                        padding: 2px !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll select {
                        font-size: 0.95rem !important;
                        min-height: 44px !important;
                        padding: 10px !important;
                    }
                    /* Dense desktop chip-grids -> roomy phone grids
                       (inline styles are beaten by !important + attribute selectors) */
                    .ck-sheet-open .text-behind-controls-scroll div[style*='repeat(5,'] {
                        grid-template-columns: repeat(3, 1fr) !important;
                    }
                    .ck-sheet-open .text-behind-controls-scroll div[style*='repeat(4,'] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    /* Empty-state drop zone never overflows narrow phones
                       (it's a clickable div with an inline min-width: 360px) */
                    .text-behind-viewport div[style*='min-width:360px'] {
                        min-width: 0 !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        margin: 12px !important;
                    }
                    /* Reset confirmation popover — real touch targets */
                    .text-behind-confirm-pop button {
                        min-height: 44px !important;
                        font-size: 0.72rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
