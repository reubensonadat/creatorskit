'use client';

/**
 * TEXT BEHIND IMAGE — the movie-poster sandwich editor.
 *
 * Layer 0 (bottom): the original photo
 * Layer 1 (behind): typography behind the subject
 * Layer 2 (cutout): the subject cutout (transparent PNG)
 * Layer 3 (front):  typography in front of the subject
 *
 * Supports:
 * - 52 Google Fonts across 5 categories (Serif, Typewriter, Tabloid, Sans, Display)
 * - True typographic variations: Weights (Regular, Bold, Heavy), Italic/Slant, Case transforms
 * - Depth management: Multiple independent text layers (behind vs front)
 * - 10 Curated Poster Style Presets & interactive Blend Modes (Solid, Overlay, Screen, Multiply)
 * - Pinned desktop studio viewport with independent scrolling settings column
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Scissors, Download, Type as TypeIcon, Plus, Copy, Trash2, Search, X, UploadCloud, AlertTriangle, ChevronDown, ChevronUp, Square, Minus, Slash, Circle, Star, Layers, Undo2, Redo2, Barcode, QrCode, Frame, Sparkles, BookOpen, Crown, Tag, Wand2, Loader2, Activity, Terminal, CheckCircle2, Clock, Eye, Cpu, Compass } from 'lucide-react';
import { ByokModal, ByokButton } from '@/components/ai/ByokModal';
import { getStoredAiKey, getActiveAiProvider, getStoredAiModel } from '@/lib/ai-keyring';
import MobileEditorToolbar from '@/components/mobile-editor/MobileEditorToolbar';
import Link from 'next/link';
import NextImage from 'next/image';
import { ThinkingOrb } from 'thinking-orbs';
import SiteNav from '@/components/nav/SiteNav';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { renderToStaticMarkup } from 'react-dom/server';
import { REMIX_ICONS_LIST, type IconDefinition } from '@/lib/remix-icons';
import QRCode from 'qrcode';
import { GOOGLE_FONTS_LIST, getGoogleFontsStylesheetUrl } from '@/app/match-cut/google-fonts';
import { analyzePhotoFromCanvas, composeSystemCover, LAYOUT_LIBRARY, matchGenreToStyle, type SystemContentInput, type SystemStyleId, type ArtDirection } from '@/lib/magazine/cover-system';
import { loadBrandKit, updateBrandKit } from '@/lib/brand-kit';
import { analyzeGridFromCanvas, gridToPhotoAnalysis, getCutoutBoundingBox, solveEditorialCover, applySolverToCover, type GridAnalysis, type SolverSemantics, type SolverResult } from '@/lib/magazine/solver';
import { traceCoverPipeline } from '@/lib/magazine/pipeline-trace';
import { extractPhotoSwatches, extractLightAngle, harmonizeAiSwatches, downsampleForSwatches, brightenTo, rgbaFromHex, type PhotoSwatches } from '@/lib/magazine/swatches';
import type { PhotoFilterId } from '@/lib/magazine/types';

/** §16 OPTICAL SANDWICH DEPTH — the cached underlay canvas that sits
 *  between the behind-band typography and the cutout subject. Three
 *  physical passes, built once per (cutout, palette, size) and reused:
 *
 *    PASS 1 · wide ambient occlusion — the room the subject stands in
 *             presses a soft wash around the silhouette (ink from the
 *             photo's own deepest shadow tone, not flat black).
 *    PASS 2 · directional contact shadow — cast AWAY from the photo's
 *             measured key light with a gravity bias: the subject is
 *             physically resting on the page, and the letters behind
 *             its edges take the weight.
 *    PASS 3 · rim light — a paper-toned silhouette offset TOWARD the
 *             key light; the opaque cutout drawn afterwards covers all
 *             but the lit crescent, so the subject separates from the
 *             letterforms the way a lit object separates from a wall.
 *
 *  Print type itself stays crisp (no blur on glyphs — the #1 law); this
 *  is the SUBJECT being three-dimensional, not the type. */
const buildSandwichDepthUnderlay = (
    cutout: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    W: number,
    H: number,
    sw: PhotoSwatches | null,
    light: { dx: number; dy: number },
): HTMLCanvasElement | null => {
    try {
        const off = document.createElement('canvas');
        off.width = Math.max(1, W);
        off.height = Math.max(1, H);
        const ctx = off.getContext('2d');
        if (!ctx) return null;
        const inkHex = sw?.inkDark || '#000000';
        const rimHex = brightenTo(sw?.paperNeutral || '#FFFFFF', 236);
        const lx = light.dx;
        const ly = light.dy;

        // PASS 1 — wide ambient occlusion (the room around the subject).
        ctx.save();
        ctx.shadowColor = rgbaFromHex(inkHex, 0.30);
        ctx.shadowBlur = Math.max(18, Math.round(H * 0.030));
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.max(2, Math.round(H * 0.003));
        ctx.drawImage(cutout, dx, dy, dw, dh);
        ctx.restore();

        // PASS 2 — tight directional contact shadow, cast away from the
        // key light with a gravity bias.
        ctx.save();
        ctx.shadowColor = rgbaFromHex(inkHex, 0.42);
        ctx.shadowBlur = Math.max(8, Math.round(H * 0.012));
        ctx.shadowOffsetX = -lx * H * 0.011;
        ctx.shadowOffsetY = (-ly * 0.85 + 0.25) * H * 0.009;
        ctx.drawImage(cutout, dx, dy, dw, dh);
        ctx.restore();

        // PASS 3 — rim light on the lit edge (paper-toned silhouette,
        // offset toward the light, softly feathered).
        const rim = document.createElement('canvas');
        rim.width = Math.max(1, Math.ceil(dw));
        rim.height = Math.max(1, Math.ceil(dh));
        const rctx = rim.getContext('2d');
        if (rctx) {
            rctx.drawImage(cutout, 0, 0, rim.width, rim.height);
            rctx.globalCompositeOperation = 'source-in';
            rctx.fillStyle = rimHex;
            rctx.fillRect(0, 0, rim.width, rim.height);
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.filter = 'blur(1px)';
            ctx.drawImage(rim, dx + lx * H * 0.005, dy + ly * H * 0.005, dw, dh);
            ctx.filter = 'none';
            ctx.restore();
        }
        return off;
    } catch {
        return null;
    }
};
import { diagnoseSituation, recallPrecedents, reconcile, runCritiqueLoop, candidateFrom } from '@/lib/magazine/brain';
import { settleIntoCalm, type SettleMove } from '@/lib/magazine/settle';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { gateAction } from '@/components/AdGate';
import {
    removeBackgroundBrowser,
    standardizeSourceImage,
    BROWSER_MODELS,
    prewarmBackgroundEngine,
    preferredBrowserModel,
    type MatteEngine,
    type MatteProgress,
    type BrowserModel,
} from '@/lib/background-removal';

import { putHandoffImage, takeHandoffImage } from '@/lib/tool-handoff';
import NextStepRow from '@/components/NextStepRow';

/** Engine quality choice — same key as /background-replace so the two tools stay in sync. */
const QUALITY_KEY = 'ck_bgrem_quality_v1';

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

type ShapeKind = 'rect' | 'line' | 'beam' | 'circle' | 'icon' | 'button' | 'barcode' | 'badge' | 'frame' | 'qr';

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
    label?: string; // centred text (kind === 'button', 'badge', 'barcode') — e.g. "NEXT"
}

interface ShapeMetric {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rot: number;
}

const makeShape = (kind: ShapeKind, index: number): ShapeLayer => {
    let wPct = 40;
    let hPct = 18;
    let yPct = 0.5;
    let xPct = 0.5;
    let depth: 'behind' | 'front' = 'behind';
    let label: string | undefined = undefined;
    let strokeW = 0;
    let strokeColor = '#000000';
    let fillColor = '#FFE500';
    let fillOn = true;
    let cornerPct = 8;
    let glow = 0;
    let rotationDeg = 0;

    if (kind === 'rect' || kind === 'circle') {
        wPct = 40;
        hPct = kind === 'rect' ? 18 : 40;
    } else if (kind === 'line') {
        wPct = 70;
        hPct = 0.7;
        fillColor = '#FFFFFF';
    } else if (kind === 'beam') {
        wPct = 70;
        hPct = 4;
        rotationDeg = -24;
        fillColor = '#7DD3FC';
        glow = 0.8;
    } else if (kind === 'icon') {
        wPct = 14;
        hPct = 14;
    } else if (kind === 'button') {
        wPct = 34;
        hPct = 9;
        yPct = 0.82;
        fillColor = '#FFFFFF';
        strokeW = 8;
        cornerPct = 18;
        depth = 'front';
        label = 'NEXT';
    } else if (kind === 'barcode') {
        wPct = 24;
        hPct = 7.5;
        xPct = 0.82;
        yPct = 0.92;
        fillColor = '#FFFFFF';
        strokeColor = '#000000';
        strokeW = 0;
        cornerPct = 0;
        depth = 'front';
        label = '9771234567003';
    } else if (kind === 'qr') {
        wPct = 13;
        hPct = 13;
        xPct = 0.82;
        yPct = 0.88;
        fillColor = '#FFFFFF';
        strokeColor = '#000000';
        strokeW = 0;
        cornerPct = 0;
        depth = 'front';
        label = 'https://creatorskit.app';
    } else if (kind === 'badge') {
        wPct = 38;
        hPct = 4.2;
        xPct = 0.5;
        yPct = 0.08;
        fillColor = '#000000';
        strokeColor = '#FFFFFF';
        strokeW = 2;
        cornerPct = 4;
        depth = 'front';
        label = 'ISSUE N° 04 • FALL 2026';
    } else if (kind === 'frame') {
        wPct = 92;
        hPct = 94;
        xPct = 0.5;
        yPct = 0.5;
        fillOn = false;
        strokeColor = '#FFFFFF';
        strokeW = 2;
        cornerPct = 0;
        depth = 'front';
    }

    return {
        id: `shape-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        xPct,
        yPct,
        wPct,
        hPct,
        rotationDeg,
        fillColor,
        iconId: 'arrow-right',
        label,
        fillOn,
        strokeColor,
        strokeW,
        cornerPct,
        opacity: 1,
        glow,
        blend: 'normal',
        depth,
    };
};

interface GrainSettings {
    enabled: boolean;
    opacity: number; // 0-0.6
    size: number; // 1-5 — speckle scale
}

const DEFAULT_GRAIN: GrainSettings = { enabled: false, opacity: 0.18, size: 2 };

export const PHOTO_FILTER_PRESETS: { id: PhotoFilterId; label: string; filterCss: string }[] = [
    { id: 'none', label: 'ORIGINAL', filterCss: 'none' },
    { id: 'mono', label: 'B&W MONO', filterCss: 'grayscale(100%) contrast(110%)' },
    { id: 'vintage', label: 'VINTAGE', filterCss: 'sepia(35%) contrast(105%) brightness(95%)' },
    { id: 'noir', label: '35MM NOIR', filterCss: 'grayscale(100%) contrast(150%) brightness(90%)' },
    { id: 'editorial', label: 'EDITORIAL', filterCss: 'contrast(112%) saturate(112%) brightness(102%)' },
    { id: 'sepia', label: 'ARCHIVAL SEPIA', filterCss: 'sepia(80%) contrast(95%) brightness(96%) hue-rotate(-15deg)' },
    { id: 'faded', label: 'FADED MATTE', filterCss: 'contrast(90%) brightness(108%) saturate(85%)' },
    { id: 'cinematic', label: 'CINEMATIC', filterCss: 'contrast(118%) saturate(125%) hue-rotate(-8deg) brightness(96%)' },
    { id: 'analog', label: 'PORTRA ANALOG', filterCss: 'sepia(18%) saturate(115%) contrast(104%) brightness(102%)' },
    { id: 'cyber', label: 'CYBER PUNK', filterCss: 'contrast(130%) saturate(145%) hue-rotate(185deg) brightness(92%)' },
];

export function getPhotoFilterCss(id: PhotoFilterId | string): string {
    const found = PHOTO_FILTER_PRESETS.find((p) => p.id === id);
    return found ? found.filterCss : 'none';
}

/** One undo step — everything the canvas composites, captured before a change. */
interface UndoSnapshot {
    layers: TextLayer[];
    activeLayerId: string;
    shapes: ShapeLayer[];
    activeShapeId: string | null;
    grain: GrainSettings;
    bgDim: number;
    dimWholePhoto?: boolean;
    photoFilter?: PhotoFilterId;
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

/** Photographic silver halide film grain tile — drawn with an `overlay` blend
 *  using a central-limit distribution to mimic organic 35mm crystal emulsion. */
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
    // Central-limit theorem: sum of 3 uniform distributions produces a natural bell curve (Gaussian)
    for (let i = 0; i < d.length; i += 4) {
        const u = (rnd() + rnd() + rnd()) / 3;
        const v = Math.round(128 + (u - 0.5) * 210);
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
    if (rr <= 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        return;
    }
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

const SETTINGS_KEY = 'ck_text_behind_v6';
const OVERLAYS_KEY = 'ck_text_behind_overlays_v1';

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

// --- AI Auto-Cover style options & response mapping helpers ----------------
// (mirror the contract in src/app/api/ai/magazine-layout/route.ts)

const AI_STYLE_OPTIONS: {
    id: 'auto' | 'vogue' | 'zine' | 'kinfolk' | 'noir' | 'gq' | 'dazed' | 'natgeo' | 'cyber' | 'vinyl' | 'architectural' | 'food' | 'fragments' | 'time' | 'eye' | 'bazaar';
    label: string;
    desc: string;
}[] = [
        { id: 'auto', label: 'AUTO', desc: 'Auto-detects mood & calm zones to elect the best matching genre' },
        { id: 'vogue', label: 'FASHION', desc: 'Timeless Didone luxury, Paris/Milan datelines, high-fashion restraint' },
        { id: 'zine', label: 'ZINE', desc: 'Indie Swiss street, photocopy grain, archive stamps, action culture' },
        { id: 'kinfolk', label: 'LUXURY', desc: 'Quiet luxury, slow living, minimal stillness, bone-white frame' },
        { id: 'noir', label: 'NOIR', desc: '35mm cinema archive, dramatic high contrast, silver screen film grain' },
        { id: 'gq', label: 'GQ', desc: 'Modern gentleman, bold condensed masthead, sharp menswear editorial' },
        { id: 'dazed', label: 'DAZED', desc: 'Underground youth culture, art-school energy, provocative headlines' },
        { id: 'natgeo', label: 'DISCOVERY', desc: 'Expedition archive, geographic coordinates, iconic yellow keyline' },
        { id: 'cyber', label: 'CYBER', desc: 'Monospace terminal ID, neural network protocols, futuristic telemetry' },
        { id: 'vinyl', label: 'VINYL', desc: 'Vintage 33⅓ RPM album sleeve, retro script masthead, tracklist notes' },
        { id: 'architectural', label: 'ARCHITECT', desc: 'Concrete monograph, rational grid system, structural minimalism' },
        { id: 'food', label: 'FOOD', desc: 'Appetite editorial, culinary warmth, menu card frame, sensory food voice' },
        { id: 'fragments', label: 'FRAGMENTS', desc: 'Type-as-mask poster, architectural giant backdrop, vertical right rail' },
        { id: 'time', label: 'TIME', desc: 'Person of the year, declarative historical gravitas, iconic red border' },
        { id: 'eye', label: 'EYE', desc: 'Radical graphic design review, Swiss typography, critical design essays' },
        { id: 'bazaar', label: 'BAZAAR', desc: 'Soft couture poetry, delicate typography, Harper\'s Bazaar elegance' },
    ];

/** Sanitize an AI-provided case transform (defaults to uppercase editorial). */
const asCaseMode = (v: unknown): TextLayer['caseMode'] =>
    v === 'lowercase' || v === 'capitalize' || v === 'original' || v === 'uppercase' ? v : 'uppercase';

/** Sanitize an AI-provided blend mode. */
const asBlendMode = (v: unknown): BlendMode =>
    v === 'multiply' || v === 'overlay' || v === 'screen' ? v : 'normal';

/** Clamp an AI-provided number to a sane editorial range. */
const clampNum = (v: unknown, min: number, max: number, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** Sanitize an AI-provided colour to #RRGGBB (canvas-safe). */
const asHexColor = (v: unknown, fallback: string): string =>
    typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toUpperCase() : fallback;

/** Sanitize an AI-provided shadow mode — print type stays crisp by default. */
const asShadowMode = (v: unknown): TextLayer['shadowMode'] =>
    v === 'soft' || v === 'hard' || v === 'neon' ? v : 'none';

// --- Real EAN-13 barcode encoding (authentic, scannable print specs) -------

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
/** First digit → A/B pattern for the six left-side digits (A=odd/L, B=even/G). */
const EAN_PARITY = ['AAAAAA', 'AABABB', 'AABBAB', 'AABBBA', 'ABAABB', 'ABBAAB', 'ABBBAA', 'ABABAB', 'ABABBA', 'ABBABA'];

/** Extract 13 clean digits from any label (custom numbers welcome). Missing
 *  digits are filled deterministically and the check digit is always computed. */
const ean13Digits = (label: string): string => {
    const given = (label.match(/\d/g) || []).join('').slice(0, 13);
    let base = given.length >= 9 ? given.slice(0, 12) : '';
    let fill = 0;
    while (base.length < 12) {
        base += String((base.length * 7 + fill * 3 + 4) % 10);
        fill++;
    }
    const d = base.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    return base + String(check);
};

/** 95-module EAN-13 bit string (guards + parity-encoded left + right). */
const ean13Bits = (digits: string): string => {
    const parity = EAN_PARITY[Number(digits[0])] || 'AAAAAA';
    let bits = '101';
    for (let i = 1; i <= 6; i++) {
        const d = Number(digits[i]);
        bits += parity[i - 1] === 'A' ? EAN_L[d] : EAN_G[d];
    }
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += EAN_R[Number(digits[i])];
    return bits + '101';
};

// --- Real QR code matrix (client-side, via the `qrcode` package) -----------

interface QrMatrix {
    size: number;
    dark: boolean[];
}

const qrMatrixCache = new Map<string, QrMatrix>();

const getQrMatrix = (text: string): QrMatrix | null => {
    const content = (text || '').trim() || 'https://creatorskit.app';
    const cached = qrMatrixCache.get(content);
    if (cached) return cached;
    try {
        const qr = QRCode.create(content, { errorCorrectionLevel: 'M' });
        const size = qr.modules.size;
        const data = qr.modules.data;
        const dark: boolean[] = [];
        for (let i = 0; i < size * size; i++) dark[i] = (data[i] & 1) === 1;
        const matrix = { size, dark };
        qrMatrixCache.set(content, matrix);
        return matrix;
    } catch {
        return null;
    }
};

// --- Front-element collision resolver (the "nothing overlaps" contract) ----

/** Nudge front elements apart when their boxes intersect — every AI layout
 *  lands butter-smooth with zero overlaps, deterministically. */
/** ------------------------------------------------------------------
 * LAYOUT LAW ENGINE — the app's own civic sense, applied by AUTO-LAYOUT
 * to every generated surface (AI covers, ASSEMBLE covers, presets).
 *
 * L1 · PURPOSE — a rect/circle/line/beam that carries no text is idle
 *      decoration and is deleted. Only functional objects (barcode, QR,
 *      frame, badge, button, icon) may stand on a cover alone.
 * L2 · PLATING — a rect that owns text is re-cut to that text with real
 *      padding and moved to its text's side of the sandwich, so a plate
 *      never floats in front of the message it serves.
 * L3 · SEPARATION — nothing crosses anything: ownership-aware collision
 *      solve; text never stacks on text, foreign plates, barcode or QR.
 *      Plates travel WITH their text instead of being pushed off it.
 * L4 · CLEARANCE — inside a page frame every element clears the frame
 *      line by a margin, and no text sits on a divider rule.
 * ------------------------------------------------------------------ */
const enforceLayoutLaws = (
    layers: TextLayer[],
    shapes: ShapeLayer[],
    opts: { prune?: boolean } = {},
): { layers: TextLayer[]; shapes: ShapeLayer[] } => {
    const PRUNE = opts.prune !== false;
    type Box = { x0: number; y0: number; x1: number; y1: number };
    // 90 AND 270 are rails — |rot| mod 180 ≈ 90 covers both upright rails and
    // the user's 270° flips. (The old check missed 270°, so a vertical text
    // was measured as a wide horizontal bar — the law engine then pinned it
    // to the centre band instead of letting it live on the left edge.)
    const railOf = (rot: number) => Math.abs(Math.abs(rot || 0) % 180 - 90) < 15;
    const axisAligned = (rot: number) => Math.abs((rot || 0) % 180) <= 12;
    const boxOfLayer = (l: TextLayer): Box => {
        const rail = railOf(l.rotationDeg);
        let effWidthPct = l.widthPct;
        if (!l.fitToWidth && l.text.trim()) {
            const fontH = l.heightPct;
            const lineLens = l.text.split('\n').map((ln) => ln.length);
            const maxLen = Math.max(...lineLens, 1);
            // Poster canvas aspect ratio: Height / Width is ~1.5 (e.g. 2560 / 1705).
            // Since fontH is in % of H, 1% of H = 1.5% of W.
            const aspect = 1.5;
            const track = Math.max(0, l.letterSpacingEm || 0);
            const adv = (l.caseMode === 'uppercase' || l.uppercase ? 0.76 : 0.68) + track * 1.1;
            const approxW = maxLen * fontH * aspect * adv + (fontH * aspect * 0.5);
            effWidthPct = Math.max(l.widthPct, Math.min(96, approxW));
        }
        const w = (rail ? l.heightPct : effWidthPct) / 100;
        const h = (rail ? effWidthPct : l.heightPct) / 100;
        return { x0: l.xPct - w / 2, x1: l.xPct + w / 2, y0: l.yPct - h / 2, y1: l.yPct + h / 2 };
    };
    const boxOfShape = (s: ShapeLayer): Box => {
        const side = Math.min(s.wPct, s.hPct);
        const square = s.kind === 'qr' || s.kind === 'circle';
        const rail = railOf(s.rotationDeg);
        let wPct = square ? side : s.wPct;
        if (s.kind === 'badge' && s.label) {
            const estW = Math.min(46, Math.max(18, s.label.length * 0.92 + 4.5));
            wPct = Math.max(wPct, estW);
        }
        const w = wPct / 100;
        const h = ((square ? side : s.hPct) + (s.kind === 'barcode' || s.kind === 'qr' || s.kind === 'badge' ? 1 : 0)) / 100;
        return rail
            ? { x0: s.xPct - h / 2, x1: s.xPct + h / 2, y0: s.yPct - w / 2, y1: s.yPct + w / 2 }
            : { x0: s.xPct - w / 2, x1: s.xPct + w / 2, y0: s.yPct - h / 2, y1: s.yPct + h / 2 };
    };
    const inter = (a: Box, b: Box): number =>
        Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
        Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const area = (b: Box): number => Math.max(0.0001, (b.x1 - b.x0) * (b.y1 - b.y0));
    const centerIn = (b: Box, t: Box): boolean =>
        (t.x0 + t.x1) / 2 >= b.x0 && (t.x0 + t.x1) / 2 <= b.x1 && (t.y0 + t.y1) / 2 >= b.y0 && (t.y0 + t.y1) / 2 <= b.y1;
    const functional = (s: ShapeLayer): boolean =>
        s.kind === 'barcode' || s.kind === 'qr' || s.kind === 'frame' || s.kind === 'badge' || s.kind === 'button' || s.kind === 'icon';

    const texts = layers.map((l) => ({ l, box: boxOfLayer(l) }));

    // -- L1 · PURPOSE — prune idle decoration --------------------------------
    const ownsText = new Map<string, string>(); // shapeId -> ownerId
    const kept: ShapeLayer[] = [];
    for (const s of shapes) {
        if (functional(s)) {
            kept.push(s);
            continue;
        }
        const sb = boxOfShape(s);
        let owner: string | null = null;
        for (const t of texts) {
            const cov = inter(sb, t.box) / area(t.box);
            const attachedRule =
                s.kind === 'line' &&
                Math.max(sb.x0, t.box.x0) < Math.min(sb.x1, t.box.x1) &&
                Math.min(Math.abs(sb.y0 - t.box.y1), Math.abs(t.box.y0 - sb.y1)) < 0.035;
            if (centerIn(sb, t.box) || cov >= 0.5 || attachedRule) {
                owner = t.l.id;
                break;
            }
        }
        if (owner) {
            ownsText.set(s.id, owner);
            kept.push(s);
        } else if (!PRUNE) {
            // Manual mode keeps the user's decoration — but the laws still
            // stop it from crossing anything (it joins the separation solve).
            kept.push(s);
        }
        // else — idle: a rectangle just sitting there doing nothing. Deleted.
    }

    // -- L2 · PLATING — owned rects become true plates ------------------------
    let shaped: ShapeLayer[] = kept.map((s) => {
        const ownerId = ownsText.get(s.id);
        if (!ownerId || s.kind !== 'rect' || !axisAligned(s.rotationDeg)) return s;
        const t = texts.find((x) => x.l.id === ownerId);
        if (!t || !axisAligned(t.l.rotationDeg)) return s;
        // Generous editorial padding (12% of text width or at least 3.5% canvas width)
        const padX = Math.max(0.035, (t.box.x1 - t.box.x0) * 0.12);
        const padY = Math.max(0.014, (t.box.y1 - t.box.y0) * 0.38);
        const x0 = Math.max(0.01, t.box.x0 - padX);
        const x1 = Math.min(0.99, t.box.x1 + padX);
        const y0 = Math.max(0.012, t.box.y0 - padY);
        const y1 = Math.min(0.982, t.box.y1 + padY);
        const calcW = (x1 - x0) * 100;
        const calcH = (y1 - y0) * 100;
        return {
            ...s,
            depth: t.l.depth, // the plate serves its text — same side of the sandwich
            xPct: (x0 + x1) / 2,
            yPct: (y0 + y1) / 2,
            // Plate must NEVER be smaller than the text, and NEVER shrink below authored slab width
            wPct: Math.max(s.wPct, calcW),
            hPct: Math.max(s.hPct, calcH),
        };
    });

    // -- L4 · CLEARANCE — respect the frame, respect the rules ---------------
    let outLayers: TextLayer[] = layers.map((l) => ({ ...l }));
    const pageFrame = shaped.find(
        (s) => s.kind === 'frame' && s.wPct > 80 && s.hPct > 80 && axisAligned(s.rotationDeg)
    );
    if (pageFrame) {
        const fb = boxOfShape(pageFrame);
        const ix0 = fb.x0 + 0.026;
        const ix1 = fb.x1 - 0.026;
        const iy0 = fb.y0 + 0.03;
        const iy1 = fb.y1 - 0.03;
        outLayers = outLayers.map((l) => {
            if (l.depth !== 'front' || !axisAligned(l.rotationDeg)) return l;
            const b = boxOfLayer(l);
            const w = b.x1 - b.x0;
            let cx = l.xPct;
            let widthPct = l.widthPct;
            if (w > ix1 - ix0) {
                // Too wide for the frame interior — narrow the line itself.
                widthPct = (ix1 - ix0) * 100 * 0.98;
                cx = (ix0 + ix1) / 2;
            } else {
                if (b.x0 < ix0) cx = ix0 + w / 2;
                if (b.x1 > ix1) cx = ix1 - w / 2;
            }
            const h = b.y1 - b.y0;
            let cy = l.yPct;
            if (b.y0 < iy0) cy = iy0 + h / 2;
            if (b.y1 > iy1) cy = iy1 - h / 2;
            return { ...l, xPct: cx, yPct: cy, widthPct };
        });
        shaped = shaped.map((s) => {
            if (s.kind === 'frame' || !axisAligned(s.rotationDeg)) return s;
            const b = boxOfShape(s);
            const w = b.x1 - b.x0;
            const h = b.y1 - b.y0;
            let cx = s.xPct;
            if (b.x0 < ix0) cx = ix0 + w / 2;
            if (b.x1 > ix1) cx = ix1 - w / 2;
            let cy = s.yPct;
            if (b.y0 < iy0) cy = iy0 + h / 2;
            if (b.y1 > iy1) cy = iy1 - h / 2;
            return { ...s, xPct: cx, yPct: cy };
        });
    }
    const rules = shaped.filter((s) => s.kind === 'line' && s.hPct < 2.5 && axisAligned(s.rotationDeg));
    if (rules.length > 0) {
        outLayers = outLayers.map((l) => {
            if (l.depth !== 'front') return l;
            const b = boxOfLayer(l);
            for (const r of rules) {
                const rb = boxOfShape(r);
                if (Math.max(b.x0, rb.x0) >= Math.min(b.x1, rb.x1)) continue;
                if (b.y0 >= rb.y1 || b.y1 <= rb.y0) continue;
                // Text sitting ON a divider rule — push it fully clear.
                const h = b.y1 - b.y0;
                const toTop = Math.abs(b.y1 - rb.y0);
                const toBottom = Math.abs(rb.y1 - b.y0);
                const gap = 0.016;
                const cy = toTop <= toBottom ? rb.y0 - gap - h / 2 : rb.y1 + gap + h / 2;
                return { ...l, yPct: Math.min(0.975, Math.max(0.025, cy)) };
            }
            return l;
        });
    }

    // -- L3 · SEPARATION — situational-awareness solve ------------------------
    // Every element knows three things about its surroundings: the boxes of
    // its neighbours, WHO those neighbours are (role weight — the masthead
    // and the barcode are anchors that hold their line while teasers
    // yield), and where the left/right page edges are.
    type Node = { id: string; isLayer: boolean; cx: number; cy: number; hw: number; hh: number; weight: number };
    const roleWeight = (id: string, isLayer: boolean, kind?: ShapeKind): number => {
        if (isLayer) {
            if (id === 'box-masthead') return 3.0;
            if (id === 'box-feature') return 2.2;
            if (id.startsWith('box-sub')) return 1.6;
            if (id === 'box-dateline' || id === 'box-rail') return 1.2;
            return 1.0;
        }
        if (kind === 'barcode' || kind === 'qr') return 2.6;
        if (kind === 'badge' || kind === 'button') return 1.8;
        return 1.0;
    };
    const nodes: Node[] = [];
    // Every text joins the solve — behind-depth included. The sandwich look
    // (text under the cutout) is preserved because separation only acts
    // where boxes actually intersect; plates never join as boulders.
    outLayers
        .forEach((l) => {
            const b = boxOfLayer(l);
            nodes.push({
                id: l.id,
                isLayer: true,
                cx: l.xPct,
                cy: l.yPct,
                hw: Math.max(0.02, (b.x1 - b.x0) / 2),
                hh: Math.max(0.02, (b.y1 - b.y0) / 2),
                weight: roleWeight(l.id, true),
            });
        });
    shaped
        .filter(
            (s) =>
                s.depth === 'front' &&
                !ownsText.has(s.id) && // plates travel with their text, not as boulders
                !(s.kind === 'frame' && s.wPct > 80 && s.hPct > 80) &&
                !(s.kind === 'line' && s.hPct < 1.5)
        )
        .forEach((s) => {
            const b = boxOfShape(s);
            nodes.push({
                id: s.id,
                isLayer: false,
                cx: s.xPct,
                cy: s.yPct,
                hw: Math.max(0.02, (b.x1 - b.x0) / 2),
                hh: Math.max(0.02, (b.y1 - b.y0) / 2),
                weight: roleWeight(s.id, false, s.kind),
            });
        });
    const GAP = 0.018;
    const HGAP = 0.014;
    const clampX = (n: Node) => {
        if (n.hw < 0.48) n.cx = Math.min(0.98 - n.hw, Math.max(0.02 + n.hw, n.cx));
    };
    const order = [...nodes].sort((a, b) => a.cy - b.cy);

    for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
            const a = order[i];
            const b = order[j];
            const xOverlap = a.hw + b.hw - Math.abs(a.cx - b.cx);
            if (xOverlap <= 0) continue; // side-by-side and aware of it — clear
            const minDist = a.hh + b.hh + GAP;
            const dist = b.cy - a.cy;
            if (dist >= minDist) continue;
            // Awareness #1 — SIDESTEP: the columns only graze each other and
            // the elements sit at the same height, so the lighter one steps
            // aside horizontally instead of triggering a vertical cascade.
            const minW = Math.min(a.hw, b.hw);
            const sameBand = Math.abs(a.cy - b.cy) < (a.hh + b.hh) * 0.8;
            if (sameBand && xOverlap < minW * 0.7) {
                const lighter = a.weight <= b.weight ? a : b;
                const dir = lighter.cx <= (lighter === a ? b.cx : a.cx) ? -1 : 1;
                lighter.cx += dir * (xOverlap + HGAP);
                clampX(lighter);
                continue;
            }
            // Awareness #2 — ROLE: anchors (masthead, feature, barcode, QR)
            // hold their line; the yield is split by inverse weight so the
            // junior element (a teaser, a sub) does the moving.
            const aAnchor = a.weight >= 2.2;
            const bAnchor = b.weight >= 2.2;
            const push = minDist - dist;
            const invA = aAnchor ? 0 : 1 / a.weight;
            const invB = bAnchor ? 0 : 1 / b.weight;
            const total = invA + invB || 1;
            a.cy = Math.max(0.04, a.cy - push * (invA / total));
            // b absorbs whatever a could not take, clamped to the safe zone.
            b.cy = Math.min(0.955, Math.max(b.cy, a.cy + minDist));
        }
    }

    const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
    const finalLayers = outLayers.map((l) => {
        const n = nodeById.get(l.id);
        return n ? { ...l, yPct: n.cy, xPct: n.cx } : l;
    });

    // Awareness #3 — EDGES: nobody hangs off the left or right margin.
    // (Rails are exempt — living on the edge IS their job.)
    const edgeSafe = finalLayers.map((l) => {
        if (railOf(l.rotationDeg)) return l;
        const hw = Math.min(0.48, l.widthPct / 200);
        let xPct = l.xPct;
        let widthPct = l.widthPct;
        if (hw >= 0.48) {
            widthPct = 96;
            xPct = 0.5;
        } else {
            if (l.xPct - hw < 0.02) xPct = 0.02 + hw;
            if (l.xPct + hw > 0.98) xPct = 0.98 - hw;
        }
        return xPct === l.xPct && widthPct === l.widthPct ? l : { ...l, xPct, widthPct };
    });

    // Owned shapes re-cut / re-follow their (possibly moved) owner text.
    const finalTexts = edgeSafe.map((l) => ({ l, box: boxOfLayer(l) }));
    const finalShapes = shaped.map((s) => {
        const ownerId = ownsText.get(s.id);
        if (!ownerId) {
            const n = nodeById.get(s.id);
            return n ? { ...s, yPct: n.cy } : s;
        }
        const t = finalTexts.find((x) => x.l.id === ownerId);
        const before = texts.find((x) => x.l.id === ownerId);
        if (!t || !before) return s;
        if (s.kind === 'rect' && axisAligned(s.rotationDeg) && axisAligned(t.l.rotationDeg)) {
            // Full re-cut so the padding is pixel-perfect after the solve.
            const padX = Math.max(0.035, (t.box.x1 - t.box.x0) * 0.12);
            const padY = Math.max(0.014, (t.box.y1 - t.box.y0) * 0.38);
            const x0 = Math.max(0.01, t.box.x0 - padX);
            const x1 = Math.min(0.99, t.box.x1 + padX);
            const y0 = Math.max(0.012, t.box.y0 - padY);
            const y1 = Math.min(0.982, t.box.y1 + padY);
            const calcW = (x1 - x0) * 100;
            const calcH = (y1 - y0) * 100;
            return {
                ...s,
                xPct: (x0 + x1) / 2,
                yPct: (y0 + y1) / 2,
                wPct: Math.max(s.wPct, calcW),
                hPct: Math.max(s.hPct, calcH),
            };
        }
        // Circles / rules keep their offset from the owner and travel with it.
        return { ...s, xPct: s.xPct + (t.l.xPct - before.l.xPct), yPct: s.yPct + (t.l.yPct - before.l.yPct) };
    });

    return { layers: edgeSafe, shapes: finalShapes };
};

// ── THE FINAL GUARANTEE · no text ever sits on text ────────────────────────
// The house law, stated plainly: every text is SELF-AWARE — it knows the
// measured box of every other text on the canvas and yields before it can
// overlap one. This pass runs AFTER every other intelligence (composer,
// solver, law engine, AI) on the FINAL layer list, ALWAYS — not gated by
// any toggle. The hierarchy rules ARE the collision rules: role weights
// mirror the §4 ladder (masthead 5 · feature 4 · sub 2.5 · dateline 1.5 ·
// teaser 1.2), so anchors hold their line while juniors yield. Vertical
// pushes come first so alignment axes survive; a same-band graze sidesteps
// horizontally instead of triggering a cascade. Only exemption: the giant
// wordmark backdrop (sys-giant-*) and true monumental scale (≥20% cap
// height) — the sandwich the subject covers. Depth alone exempts NOTHING:
// a behind-depth masthead is still reading text and still must yield.
const measureTextBox = (l: TextLayer): { hw: number; hh: number } => {
    const rail = Math.abs(Math.abs(l.rotationDeg || 0) % 180 - 90) < 15;
    const rawLines = l.text.split('\n');
    const lines = rawLines.filter((s) => s.trim()).length || 1;
    const maxLen = Math.max(...rawLines.map((ln) => ln.length), 1);
    let effW = l.widthPct;
    if (!l.fitToWidth && l.text.trim()) {
        // Conservative: assume wide glyphs PLUS tracking, scaled by canvas aspect ratio (~1.5)
        const track = Math.max(0, l.letterSpacingEm || 0);
        const adv = (l.caseMode === 'uppercase' || l.uppercase ? 0.76 : 0.68) + track * 1.1;
        const aspect = 1.5;
        effW = Math.min(96, maxLen * l.heightPct * aspect * adv + l.heightPct * aspect * 0.5);
    }
    const wPct = rail ? Math.max(l.heightPct, 1.2) : effW;
    const hPct = rail ? effW : l.heightPct * (lines > 1 ? lines * 1.12 : 1);
    return { hw: Math.max(0.012, wPct / 200), hh: Math.max(0.008, hPct / 200) };
};

const guaranteeNoTextOverlap = (layers: TextLayer[], fixedShapes?: ShapeLayer[]): TextLayer[] => {
    // Architecture exemption, NARROWED by ruling: only the solver's giant
    // wordmark (sys-giant-*) and true monumental scale are backdrop. The
    // old rule exempted every behind-depth text ≥8% — which un-exempted
    // nothing the masthead does: a behind masthead overlapping coverlines
    // is a collision, not a sandwich. Only monumental scale exempts.
    const isArchitecture = (l: TextLayer): boolean =>
        l.id.startsWith('sys-giant-') || l.heightPct >= 20;
    const weightOf = (l: TextLayer): number => {
        if (l.id === 'box-masthead') return 5;
        if (l.id === 'box-feature') return 4;
        if (l.id.startsWith('box-sub')) return 2.5;
        if (l.id === 'box-dateline' || l.id === 'box-rail') return 1.5;
        if (l.id.startsWith('box-teaser')) return 1.2;
        return 1;
    };
    type GNode = { src: TextLayer | null; cx: number; cy: number; hw: number; hh: number; w: number; arch: boolean; fixed: boolean };
    const nodes: GNode[] = layers
        .filter((l) => l.text.trim())
        .map((l) => {
            const { hw, hh } = measureTextBox(l);
            return { src: l, cx: l.xPct, cy: l.yPct, hw, hh, w: weightOf(l), arch: isArchitecture(l), fixed: false };
        });
    // TEXT-BEARING SHAPES ARE TEXT — the badge pill, the barcode and its
    // EAN digits, and the QR tile all render glyphs, so they join the
    // separation graph as FIXED pseudo-nodes: never architecture-exempt,
    // never moved, never re-cut. Everything textual yields around them —
    // a teaser stack can never land on the barcode band again, because
    // the guarantee now sees the band.
    (fixedShapes ?? []).forEach((s) => {
        if (s.kind !== 'badge' && s.kind !== 'barcode' && s.kind !== 'qr') return;
        let wPct = s.wPct;
        if (s.kind === 'badge' && s.label) {
            const estW = Math.min(46, Math.max(18, s.label.length * 0.92 + 4.5));
            wPct = Math.max(wPct, estW);
        }
        nodes.push({
            src: null,
            cx: s.xPct,
            cy: s.yPct,
            hw: Math.max(0.012, wPct / 200),
            hh: Math.max(0.008, s.hPct / 200),
            w: 2,
            arch: false,
            fixed: true,
        });
    });
    const GAP = 0.020;
    const clampX = (n: GNode) => {
        if (n.hw < 0.48) n.cx = Math.min(0.98 - n.hw, Math.max(0.02 + n.hw, n.cx));
    };
    // Iterate to a FIXED POINT: every push is rechecked against the whole
    // list, so a yield that creates a new conflict with a third text is
    // itself resolved. Self-awareness is global, never pairwise-once.
    for (let pass = 0; pass < 24; pass++) {
        let moved = false;
        const order = [...nodes].sort((a, b) => a.cy - b.cy);
        for (let i = 0; i < order.length; i++) {
            for (let j = i + 1; j < order.length; j++) {
                const a = order[i];
                const b = order[j];
                if (a.arch || b.arch) continue; // the sandwich / giant statement
                if (a.fixed && b.fixed) continue; // two anchors never yield to each other
                const xOverlap = a.hw + b.hw - Math.abs(a.cx - b.cx);
                if (xOverlap <= 0) continue; // side-by-side and aware of it
                const minDist = a.hh + b.hh + GAP;
                const dist = b.cy - a.cy;
                if (dist >= minDist) continue;
                // Sidestep: columns merely grazing at the same height —
                // the lighter element steps aside, no vertical cascade.
                const minW = Math.min(a.hw, b.hw);
                if (Math.abs(a.cy - b.cy) < (a.hh + b.hh) * 0.8 && xOverlap < minW * 0.7) {
                    const lighter = a.fixed ? b : b.fixed ? a : a.w <= b.w ? a : b;
                    const other = lighter === a ? b : a;
                    const dir = lighter.cx <= other.cx ? -1 : 1;
                    lighter.cx += dir * (xOverlap + 0.012);
                    clampX(lighter);
                    moved = true;
                    continue;
                }
                // Vertical, split by inverse role weight: the masthead and
                // the feature hold their band; teasers and datelines move.
                const push = minDist - dist;
                const invA = a.fixed || a.w >= 4 ? 0 : 1 / a.w;
                const invB = b.fixed || b.w >= 4 ? 0 : 1 / b.w;
                const total = invA + invB || 1;
                if (!a.fixed) a.cy = Math.max(0.035, a.cy - push * (invA / total));
                if (!b.fixed) b.cy = Math.min(0.955, Math.max(b.cy, a.cy + minDist));
                moved = true;
            }
        }

        // EDITORIAL HIERARCHY INVARIANT:
        // The feature headline and subline are a coupled story unit.
        // A subline must NEVER sit above its headline. If the sub was pushed
        // upward by an obstacle below (e.g. barcode/badge), the feature headline
        // must yield upward ahead of it to preserve the story hierarchy.
        const feat = nodes.find((n) => n.src?.id === 'box-feature');
        const sub = nodes.find((n) => n.src?.id && n.src.id.startsWith('box-sub'));
        if (feat && sub && !feat.fixed) {
            const minUnitGap = feat.hh + sub.hh + GAP;
            if (sub.cy < feat.cy + minUnitGap) {
                if (sub.cy + sub.hh <= 0.94) {
                    sub.cy = Math.min(0.955, feat.cy + minUnitGap);
                } else {
                    feat.cy = Math.max(0.04, sub.cy - minUnitGap);
                }
                moved = true;
            }
        }

        if (!moved) break;
    }
    // STORY-ORDER COUPLING — the read order is law within its column corridor:
    // masthead → feature → sub → teasers.
    // Each rung must hold its gap below the rung above; when the floor is full
    // the pair retreats upward TOGETHER, the headline leading the retreat.
    // CRITICAL FIX: Only apply story ordering to elements that share the same horizontal
    // column/corridor! Elements on opposite flanks (e.g. left teasers vs right headline)
    // are independent reading columns and must NEVER push each other downward into barcodes.
    const rankOf = (id: string): number =>
        id === 'box-masthead' ? 0 : id === 'box-feature' ? 1 : id.startsWith('box-sub') ? 2 : id.startsWith('box-teaser') ? 3 : 4;
    const story = nodes
        .filter((n) => n.src && !n.fixed && (n.src.id === 'box-feature' || n.src.id.startsWith('box-sub') || n.src.id.startsWith('box-teaser')))
        .sort((x, y) => rankOf(x.src!.id) - rankOf(y.src!.id) || x.cy - y.cy);
    for (let sweep = 0; sweep < 2; sweep++) {
        for (let i = 1; i < story.length; i++) {
            const above = story[i - 1];
            const below = story[i];
            if (rankOf(above.src!.id) === rankOf(below.src!.id)) continue; // siblings carry no order law
            const xDist = Math.abs(above.cx - below.cx);
            const xSpan = above.hw + below.hw;
            if (xDist > xSpan + 0.05) continue; // separate columns — never push across flanks
            const minDist = above.hh + below.hh + GAP;
            if (below.cy - above.cy >= minDist) continue;
            const downY = above.cy + minDist;
            if (downY + below.hh <= 0.965) {
                below.cy = downY; // the later rung yields downward when the floor allows
            } else {
                // floor full — the story retreats upward, headline leading
                above.cy = Math.max(0.035 + above.hh, below.cy - minDist);
                if (above.cy + minDist + below.hh <= 0.965) below.cy = above.cy + minDist;
            }
        }
    }

    // FINAL SANCTITY PASS — Barcode / QR / Fixed Shape Barrier
    // If any text still intersects a fixed node (e.g. barcode or QR code),
    // push it firmly outside the fixed node's bounding envelope so no text
    // is EVER stamped inside a retail barcode.
    const fixedNodes = nodes.filter((n) => n.fixed);
    for (const textNode of nodes.filter((n) => n.src && !n.fixed)) {
        for (const fn of fixedNodes) {
            const xOverlap = textNode.hw + fn.hw + 0.015 - Math.abs(textNode.cx - fn.cx);
            const yOverlap = textNode.hh + fn.hh + 0.015 - Math.abs(textNode.cy - fn.cy);
            if (xOverlap > 0 && yOverlap > 0) {
                // Definite collision with barcode/QR! Push text vertically away
                if (textNode.cy < fn.cy) {
                    textNode.cy = Math.max(0.035, fn.cy - (fn.hh + textNode.hh + GAP));
                } else {
                    textNode.cy = Math.min(0.955, fn.cy + (fn.hh + textNode.hh + GAP));
                }
            }
        }
    }
    const byLayer = new Map(nodes.filter((n) => n.src).map((n) => [n.src!, n] as const));
    return layers.map((l) => {
        const n = byLayer.get(l);
        return n && (n.cx !== l.xPct || n.cy !== l.yPct) ? { ...l, xPct: n.cx, yPct: n.cy } : l;
    });
};

// PLATES FOLLOW THEIR WORDS — the ruling: text on a rect/plate/square is
// INTENDED design (never separated, never pruned); the only follow-up
// separation needs is cosmetic. When a line moves or is reworded, the
// plate serving it re-cuts to the new box. A plate SERVES the text its
// id names ('plate-feature' → 'box-feature') — a NAMED bond that survives
// ANY separation distance; an unnamed plate binds to the nearest text
// centre. A plate can never be stranded mid-canvas while its word settles
// elsewhere (the ghost-plate bug); plates already covering their text are
// left untouched — authored geometry wins, always.
const reCutPlates = (
    layers: TextLayer[],
    shapes: ShapeLayer[],
    subjectBox?: { x0: number; y0: number; x1: number; y1: number } | null,
): ShapeLayer[] => {
    const texts = layers
        .filter((l) => l.text.trim() && Math.abs((l.rotationDeg || 0) % 180) <= 12)
        .map((l) => {
            const { hw, hh } = measureTextBox(l);
            return { l, x0: l.xPct - hw, x1: l.xPct + hw, y0: l.yPct - hh, y1: l.yPct + hh };
        });
    const byId = new Map(texts.map((t) => [t.l.id, t] as const));

    return shapes.flatMap((s) => {
        const isPlate = s.id.includes('plate') || s.id.includes('banner');
        if (s.kind !== 'rect' || !isPlate || Math.abs((s.rotationDeg || 0) % 180) > 12) return [s];

        // 1. Explicit ID binding:
        // 'plate-feature' strictly serves 'box-feature'
        // 'plate-sub' strictly serves 'box-sub'
        // 'banner' strictly serves 'box-feature'
        let owner: (typeof texts)[number] | null = null;
        if (s.id.includes('plate-feature') || s.id.includes('banner')) {
            owner = byId.get('box-feature') || null;
        } else if (s.id.includes('plate-sub')) {
            owner = byId.get('box-sub') || null;
        }

        // 2. Proximity fallback for custom / user-added plates
        if (!owner) {
            const sx0 = s.xPct - s.wPct / 200;
            const sx1 = s.xPct + s.wPct / 200;
            const sy0 = s.yPct - s.hPct / 200;
            const sy1 = s.yPct + s.hPct / 200;
            let bestDist = Infinity;
            for (const t of texts) {
                const tcx = (t.x0 + t.x1) / 2;
                const tcy = (t.y0 + t.y1) / 2;
                const scx = (sx0 + sx1) / 2;
                const scy = (sy0 + sy1) / 2;
                const dy = Math.abs(tcy - scy);
                const dx = Math.abs(tcx - scx);
                if (dy < 0.12 && dx < 0.40) {
                    const dist = dy * 3 + dx;
                    if (dist < bestDist) {
                        bestDist = dist;
                        owner = t;
                    }
                }
            }
        }

        // PRUNE ORPHANED STATEMENT PLATES:
        // A plate generated for feature/sub text that no longer has corresponding text
        // must be discarded — never left floating as an empty ghost slab across the canvas!
        if (!owner) {
            if (s.id.includes('plate-feature') || s.id.includes('plate-sub') || s.id.includes('banner')) {
                return []; // prune orphaned plate
            }
            return [s]; // preserve generic user-drawn shapes
        }

        const padX = Math.max(0.035, (owner.x1 - owner.x0) * 0.12);
        const padY = Math.max(0.014, (owner.y1 - owner.y0) * 0.38);
        const x0 = Math.max(0.01, owner.x0 - padX);
        const x1 = Math.min(0.99, owner.x1 + padX);
        const y0 = Math.max(0.012, owner.y0 - padY);
        const y1 = Math.min(0.982, owner.y1 + padY);
        const calcW = (x1 - x0) * 100;
        const calcH = (y1 - y0) * 100;

        // SUBJECT SANCTITY RULE:
        // A big opaque plate or banner in front of the cutout subject destroys the visual.
        // If the plate overlaps the cutout subject:
        // 1. If owner text is 'behind', the plate is set to 'behind' (the subject cuts cleanly in front).
        // 2. If owner text is 'front', DROP THE FRONT PLATE (return []) so the text renders
        //    as pure, unplated high-fashion editorial typography without any box covering the subject!
        if (subjectBox) {
            const overlapX = Math.max(0, Math.min(x1, subjectBox.x1) - Math.max(x0, subjectBox.x0));
            const overlapY = Math.max(0, Math.min(y1, subjectBox.y1) - Math.max(y0, subjectBox.y0));
            const overlapsSubject = overlapX > 0.04 && overlapY > 0.04;
            if (overlapsSubject) {
                if (owner.l.depth === 'behind') {
                    return [{
                        ...s,
                        depth: 'behind',
                        xPct: (x0 + x1) / 2,
                        yPct: (y0 + y1) / 2,
                        wPct: Math.max(s.wPct, calcW),
                        hPct: Math.max(s.hPct, calcH),
                    }];
                }
                // In front of subject: DROP FRONT PLATE! Clean typography only.
                return [];
            }
        }

        return [{
            ...s,
            depth: owner.l.depth,
            xPct: (x0 + x1) / 2,
            yPct: (y0 + y1) / 2,
            wPct: Math.max(s.wPct, calcW),
            hPct: Math.max(s.hPct, calcH),
        }];
    });
};

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
        const req = indexedDB.open('ck_text_behind', 1);
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
    photo: 'PHOTO & CUTOUT',
    text: 'TEXT & TYPOGRAPHY',
    shapes: 'SHAPES & LAYERS',
    effects: 'EFFECTS & GRAIN',
    next: 'EXPORT & NEXT STEPS',
} as const;

export default function TextBehindPage() {
    // --- images -------------------------------------------------------------
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [bgInfo, setBgInfo] = useState<string>('');
    const [cutoutImage, setCutoutImage] = useState<HTMLImageElement | null>(null);
    const [cutoutInfo, setCutoutInfo] = useState<string>('');

    // --- auto-cutout (browser WASM first, worker /matte fallback) -----------
    const [matte, setMatte] = useState<{
        busy: boolean;
        engine: MatteEngine;
        message: string;
        percent: number;
    } | null>(null);
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
        if (last && last.layers === snap.layers && last.shapes === snap.shapes && last.grain === snap.grain && last.bgDim === snap.bgDim && last.dimWholePhoto === snap.dimWholePhoto && last.photoFilter === snap.photoFilter) return;
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
    /** Dim entire photo (both background AND cutout together) */
    const [dimWholePhoto, setDimWholePhoto] = useState(false);
    /** Photo color grade preset (10 curated editorial and film looks) */
    const [photoFilter, setPhotoFilter] = useState<PhotoFilterId>('none');
    /** Whether to show all 10 color grades or just the initial 4 */
    const [showAllFilters, setShowAllFilters] = useState(false);

    // --- Magazine Presets & AI Studio state ---
    const [editorialOpen, setEditorialOpen] = useState(false);
    const [activeEditorialPreset, setActiveEditorialPreset] = useState<string | null>(null);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiStyle, setAiStyle] = useState<'auto' | 'vogue' | 'zine' | 'kinfolk' | 'noir' | 'gq' | 'dazed' | 'natgeo' | 'cyber' | 'vinyl' | 'architectural' | 'food' | 'fragments' | 'time' | 'eye' | 'bazaar'>('auto');
    const [aiError, setAiError] = useState<string | null>(null);
    /** Live solver readout — style, placements, decorations and law flags
     *  from the last ASSEMBLE, surfaced under the 3-step flow. */
    const [solverReport, setSolverReport] = useState<string | null>(null);
    /** Which photo (src) the CURRENT aiSemantics.direction was read from —
     *  swapping the photo invalidates the art direction; the mirrored
     *  ASSEMBLE button re-reads it before assembling. */
    const dirPhotoSrcRef = useRef('');
    /** §12.5 — the LAST direction round trip's debug payload: the edition
     *  assignment roll, the measured facts string the model was told, the
     *  user's vibe input and the RAW model output. Feeds the glass-pipeline
     *  console trace so a bad cover can be blamed on the exact stage. */
    const dirDebugRef = useRef<{ assignment?: unknown; facts?: string; vibe?: string; raw?: string } | null>(null);
    /** Key on file → the ASSEMBLE button mirrors the pipeline (art-direct
     *  first, then assemble). Synced on mount and whenever the BYOK modal
     *  closes (key saved / removed). */
    const [aiKeyed, setAiKeyed] = useState(false);
    useEffect(() => {
        setAiKeyed(!!getStoredAiKey(getActiveAiProvider()));
    }, [aiModalOpen]);
    /** BRAND KIT hookup — the saved palette travels with every cover: the
     *  accent becomes the genre's single accent ink and the AI is told to
     *  stay inside the brand hues. Edits here write back to the kit. */
    const [brandUse, setBrandUse] = useState(false);
    const [brandPrimary, setBrandPrimary] = useState('');
    const [brandAccent, setBrandAccent] = useState('');
    /** CUSTOM TEXT — the user's exact words for the three storytelling
     *  slots; they outrank the vibe input, the canvas and the copy pools. */
    const [aiCustom, setAiCustom] = useState({ masthead: '', coverline: '', sub: '' });
    /** AI PERCEPTION — semantics-only analysis of the photo. The
     *  deterministic solver owns every coordinate; this only describes. */
    const [aiSemantics, setAiSemantics] = useState<SolverSemantics | null>(null);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    /** §16 PHOTO PALETTE — the three swatches (accentPrimary · paperNeutral ·
     *  inkDark) measured from the clean background photo the moment it
     *  lands, then harmonized with the vision model's claims when an
     *  art-direction round trip happens. Feeds the composer's typographic
     *  inks and the sandwich's optical depth passes. */
    const [photoSwatches, setPhotoSwatches] = useState<PhotoSwatches | null>(null);
    const photoLightAngleRef = useRef<{ dx: number; dy: number }>({ dx: -0.61, dy: -0.79 });
    const depthUnderlayRef = useRef<{ key: string; canvas: HTMLCanvasElement | null } | null>(null);
    /** SESSION PERSISTENCE — the art direction for the photo on the canvas
     *  is cached in localStorage keyed by a pixel fingerprint. Refresh the
     *  browser with the same photo → the direction restores instantly with
     *  ZERO server calls; a different photo (different pixels) is a miss. */
    const DIR_CACHE_KEY = 'ck_text_behind_direction_v2';
    useEffect(() => {
        if (!bgImage) return;
        if (dirPhotoSrcRef.current && dirPhotoSrcRef.current !== bgImage.src) {
            // a different photo than the one we art-directed → invalidate
            dirPhotoSrcRef.current = '';
            setAiSemantics(null);
            return;
        }
        if (aiSemantics) return;
        try {
            const raw = localStorage.getItem(DIR_CACHE_KEY);
            if (!raw) return;
            const stored = JSON.parse(raw) as { fp?: string; sem?: SolverSemantics };
            if (!stored?.fp || !stored.sem) return;
            const fp = photoFingerprint(bgImage);
            if (fp && fp === stored.fp) {
                setAiSemantics(stored.sem);
                dirPhotoSrcRef.current = bgImage.src;
                // §16 — a cached direction carries its harmonized palette;
                // restore it so the depth passes and composer inks survive
                // the refresh too.
                if (stored.sem.swatches) {
                    setPhotoSwatches(stored.sem.swatches);
                    depthUnderlayRef.current = null;
                }
            }
        } catch {
            /* corrupt cache — ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bgImage]);

    // §16 — measure the photo's palette + key-light direction the moment a
    // clean background photo lands. Deterministic (one 96×120 pixel pass),
    // zero AI calls; when a vision round trip later claims swatches, they
    // are validated against THIS measurement.
    useEffect(() => {
        depthUnderlayRef.current = null; // new photo — rebuild the depth passes
        if (!bgImage) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPhotoSwatches(null);
            return;
        }
        const off = downsampleForSwatches(bgImage, 96, 120);
        if (!off) return;
        const measured = extractPhotoSwatches(off);
        if (measured) setPhotoSwatches(measured);
        photoLightAngleRef.current = extractLightAngle(off);
    }, [bgImage]);

    /** AI THOUGHT PROCESS & TELEMETRY STREAM
     *  Live progressive thinking HUD that showcases negative-space scans,
     *  archetype matching, and solver geometry without obscuring the canvas. */
    const [thoughtState, setThoughtState] = useState<{
        active: boolean;
        mode: 'analyze' | 'direct-assemble' | 'rewrite' | 'assemble-offline';
        title: string;
        elapsedMs: number;
        currentStep: number;
        totalSteps: number;
        progressPct: number;
        items: Array<{
            id: string;
            step: 1 | 2 | 3 | 4 | 5;
            label: string;
            detail?: string;
            status: 'pending' | 'running' | 'success' | 'note';
            timestampMs: number;
        }>;
        expanded: boolean;
        dismissed: boolean;
        summary?: {
            archetype?: string;
            genre?: string;
            mood?: string[];
            template?: string;
            cluster?: string;
            treatment?: string;
            depth?: string;
            collisions?: number;
            durationSec?: number;
        } | null;
    }>({
        active: false,
        mode: 'analyze',
        title: '',
        elapsedMs: 0,
        currentStep: 1,
        totalSteps: 5,
        progressPct: 0,
        items: [],
        expanded: false,
        dismissed: false,
        summary: null,
    });
    const thoughtTimerRef = useRef<NodeJS.Timeout | null>(null);
    const thoughtDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
    const thoughtStartRef = useRef<number>(0);

    const stopThoughtTimer = useCallback(() => {
        if (thoughtTimerRef.current) {
            clearInterval(thoughtTimerRef.current);
            thoughtTimerRef.current = null;
        }
        if (thoughtDismissTimerRef.current) {
            clearTimeout(thoughtDismissTimerRef.current);
            thoughtDismissTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (thoughtTimerRef.current) clearInterval(thoughtTimerRef.current);
            if (thoughtDismissTimerRef.current) clearTimeout(thoughtDismissTimerRef.current);
        };
    }, []);

    const startThoughtProcess = useCallback((mode: 'analyze' | 'direct-assemble' | 'rewrite' | 'assemble-offline', title: string) => {
        stopThoughtTimer();
        const start = Date.now();
        thoughtStartRef.current = start;
        const initialItems: Array<{
            id: string;
            step: 1 | 2 | 3 | 4 | 5;
            label: string;
            detail?: string;
            status: 'pending' | 'running' | 'success' | 'note';
            timestampMs: number;
        }> = [];

        // For rewrite mode, focus strictly on typography hierarchy & character budgets
        if (mode === 'rewrite') {
            initialItems.push({
                id: 't-rw-init',
                step: 1,
                label: 'Mapping Typography Hierarchy & Roles',
                detail: `Inspecting ${layers.length} canvas layers (masthead, coverlines, teasers)`,
                status: 'running',
                timestampMs: 10,
            });
        } else {
            // Instant local negative space measurement (<10ms)
            try {
                const cv = canvasRef.current;
                const grid = cv ? analyzeGridFromCanvas(cv) : null;
                if (grid) {
                    const pa = gridToPhotoAnalysis(grid);
                    const hr = Math.round(pa.headroom * 100);
                    const ls = Math.round(pa.leftSpace * 100);
                    const rs = Math.round(pa.rightSpace * 100);
                    const dom = grid.light ? 'Light Palette' : 'Dark Palette';
                    initialItems.push({
                        id: 't-grid',
                        step: 1,
                        label: '24×30 Negative Space Grid Measured',
                        detail: `Headroom: ${hr}% · Flanks: L:${ls}% R:${rs}% · ${dom}`,
                        status: 'success',
                        timestampMs: 15,
                    });
                }
            } catch {
                /* local measure unavailable */
            }

            if (initialItems.length === 0) {
                initialItems.push({
                    id: 't-init',
                    step: 1,
                    label: 'Scanning Negative Space & Bounding Box',
                    detail: 'Analyzing canvas luminance & quadrant density',
                    status: 'running',
                    timestampMs: 10,
                });
            }
        }

        setThoughtState({
            active: true,
            mode,
            title,
            elapsedMs: 0,
            currentStep: 1,
            totalSteps: mode === 'rewrite' ? 4 : 5,
            progressPct: 8,
            items: initialItems,
            expanded: false,
            dismissed: false,
            summary: null,
        });

        if (mode === 'assemble-offline') {
            return;
        }

        thoughtTimerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - thoughtStartRef.current;

            setThoughtState((prev) => {
                if (!prev.active) return prev;

                let step = prev.currentStep;
                let pct = prev.progressPct;
                const items = [...prev.items];

                if (mode === 'rewrite') {
                    if (elapsed < 900) {
                        step = 1;
                        pct = Math.min(30, 10 + (elapsed / 900) * 20);
                        if (!items.find((i) => i.id === 't-rw-1')) {
                            items.push({
                                id: 't-rw-1',
                                step: 1,
                                label: 'Mapping Typography Hierarchy & Roles',
                                detail: 'Reading masthead, kicker, feature and teaser slots',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else if (elapsed < 2400) {
                        step = 2;
                        pct = Math.min(60, 30 + ((elapsed - 900) / 1500) * 30);
                        if (!items.find((i) => i.id === 't-rw-2')) {
                            const prevItem = items.find((i) => i.id === 't-rw-1');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-rw-2',
                                step: 2,
                                label: 'Grounding Editorial Voice in Photo',
                                detail: 'Drafting fresh words tied to visual mood & subject focus',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else if (elapsed < 4200) {
                        step = 3;
                        pct = Math.min(85, 60 + ((elapsed - 2400) / 1800) * 25);
                        if (!items.find((i) => i.id === 't-rw-3')) {
                            const prevItem = items.find((i) => i.id === 't-rw-2');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-rw-3',
                                step: 3,
                                label: 'Enforcing Letter Budgets & Hierarchy',
                                detail: 'Calibrating character limits (masthead ≤ 12, feature ≤ 44)',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else {
                        step = 4;
                        pct = Math.min(94, 85 + ((elapsed - 4200) / 2500) * 9);
                        if (!items.find((i) => i.id === 't-rw-4')) {
                            const prevItem = items.find((i) => i.id === 't-rw-3');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-rw-4',
                                step: 4,
                                label: 'Awaiting Final Streamed Copy Payload',
                                detail: 'Recutting legibility plates & zero-collision settlement',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    }
                } else {
                    if (elapsed < 1100) {
                        step = 1;
                        pct = Math.min(22, 8 + (elapsed / 1100) * 14);
                    } else if (elapsed < 2400) {
                        step = 2;
                        pct = Math.min(45, 22 + ((elapsed - 1100) / 1300) * 23);
                        if (!items.find((i) => i.id === 't-vision')) {
                            const prevItem = items.find((i) => i.id === 't-init' || i.id === 't-grid');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-vision',
                                step: 2,
                                label: 'AI Vision Cortex Processing',
                                detail: 'Transmitting 896px vision thumbnail to AI · Reading fabric weave, accessories & gaze',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else if (elapsed < 3800) {
                        step = 3;
                        pct = Math.min(70, 45 + ((elapsed - 2400) / 1400) * 25);
                        if (!items.find((i) => i.id === 't-arch')) {
                            const prevItem = items.find((i) => i.id === 't-vision');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-arch',
                                step: 3,
                                label: 'Matching 10 Master Brand Archetypes',
                                detail: 'Testing negative space against Vogue, Time, Kinfolk, Noir, Avant-Garde',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else if (elapsed < 5200) {
                        step = 4;
                        pct = Math.min(88, 70 + ((elapsed - 3800) / 1400) * 18);
                        if (!items.find((i) => i.id === 't-dir')) {
                            const prevItem = items.find((i) => i.id === 't-arch');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-dir',
                                step: 4,
                                label: 'Art Directing Editorial Anatomy',
                                detail: 'Calibrating masthead depth, coverline cluster & barcode corner',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    } else {
                        step = 5;
                        pct = Math.min(95, 88 + ((elapsed - 5200) / 3000) * 7);
                        if (!items.find((i) => i.id === 't-solver-wait')) {
                            const prevItem = items.find((i) => i.id === 't-dir');
                            if (prevItem) prevItem.status = 'success';
                            items.push({
                                id: 't-solver-wait',
                                step: 5,
                                label: 'Synthesizing Copy & Hierarchy',
                                detail: 'Drafting bespoke title, machine dateline & teaser rungs',
                                status: 'running',
                                timestampMs: elapsed,
                            });
                        }
                    }
                }

                return {
                    ...prev,
                    elapsedMs: elapsed,
                    currentStep: step,
                    progressPct: Math.round(pct),
                    items,
                };
            });
        }, 100);
    }, [stopThoughtTimer]);

    const completeThoughtProcess = useCallback((opts: {
        sem?: SolverSemantics | null;
        direction?: ArtDirection | null;
        solverOut?: SolverResult | null;
        durationSec?: number;
        note?: string;
    }) => {
        stopThoughtTimer();
        const duration = opts.durationSec ?? Number(((Date.now() - thoughtStartRef.current) / 1000).toFixed(1));
        const sem = opts.sem;
        const dir = opts.direction ?? sem?.direction;
        const arch = sem?.archetypeHint || dir?.template || 'VOGUE-DEEP-LAYER';
        const genre = sem?.genre || 'AUTO';
        const tmpl = dir?.template || 'DEEP-LAYER';
        const cluster = dir?.cluster || 'LEFT';
        const trt = dir?.treatment || 'STATEMENT';

        setThoughtState((prev) => {
            const allItems = prev.items.map((it) => ({ ...it, status: 'success' as const }));

            if (prev.mode === 'rewrite') {
                allItems.push({
                    id: 't-complete-rw',
                    step: 4,
                    label: 'Copy Desk Rewriting Complete',
                    detail: opts.note || `${layers.length} elements reworded · 0 collisions`,
                    status: 'success',
                    timestampMs: Math.round(duration * 1000),
                });

                return {
                    ...prev,
                    active: false,
                    progressPct: 100,
                    elapsedMs: Math.round(duration * 1000),
                    currentStep: 4,
                    items: allItems,
                    summary: {
                        archetype: 'COPY DESK',
                        genre: 'REWRITE',
                        mood: [],
                        template: 'LOCKED',
                        cluster: 'VERIFIED',
                        treatment: 'EDITORIAL',
                        depth: 'front',
                        collisions: 0,
                        durationSec: duration,
                    },
                };
            }

            allItems.push({
                id: 't-complete',
                step: 5,
                label: 'Cover Geometry Assembled & Verified',
                detail: opts.note || `Archetype: ${arch.toUpperCase()} · Masthead: ${tmpl === 'DEEP-LAYER' ? 'BEHIND' : 'FRONT'} · 0 Collisions`,
                status: 'success',
                timestampMs: Math.round(duration * 1000),
            });

            return {
                ...prev,
                active: false,
                progressPct: 100,
                elapsedMs: Math.round(duration * 1000),
                currentStep: 5,
                items: allItems,
                summary: {
                    archetype: arch.toUpperCase(),
                    genre: genre.toUpperCase(),
                    mood: sem?.mood || [],
                    template: tmpl,
                    cluster,
                    treatment: trt,
                    depth: tmpl === 'DEEP-LAYER' ? 'behind' : 'front',
                    collisions: 0,
                    durationSec: duration,
                },
            };
        });

        // Automatically dismiss the floating HUD card 2.2s after completion so the canvas is clean and unobstructed
        if (thoughtDismissTimerRef.current) clearTimeout(thoughtDismissTimerRef.current);
        thoughtDismissTimerRef.current = setTimeout(() => {
            setThoughtState((prev) => {
                if (prev.expanded) return prev;
                return { ...prev, dismissed: true };
            });
        }, 2200);
    }, [stopThoughtTimer]);

    const failThoughtProcess = useCallback((errMessage: string) => {
        stopThoughtTimer();
        const elapsed = Date.now() - thoughtStartRef.current;
        setThoughtState((prev) => {
            const allItems = [...prev.items];
            allItems.push({
                id: 't-err',
                step: prev.currentStep as any,
                label: 'Thought Process Interrupted',
                detail: errMessage,
                status: 'note',
                timestampMs: elapsed,
            });
            return {
                ...prev,
                active: false,
                items: allItems,
            };
        });
    }, [stopThoughtTimer]);
    const patchBrandColors = (primary: string, accent: string) => {
        setBrandPrimary(primary);
        setBrandAccent(accent);
        try {
            updateBrandKit({ colors: { primary, accent } });
        } catch {
            /* storage blocked — session-only brand */
        }
    };
    useEffect(() => {
        try {
            const kit = loadBrandKit();
            if (kit.colors.primary || kit.colors.accent) {
                setBrandPrimary(kit.colors.primary);
                setBrandAccent(kit.colors.accent);
                setBrandUse(true);
            }
        } catch {
            /* storage blocked — brand stays off */
        }
    }, []);

    /** AUTO-LAYOUT (default ON): the app quietly keeps every front element
     *  collision-free and print-tidy after AI layouts. OFF = full manual rule. */
    const [autoLayout, setAutoLayout] = useState(true);
    /** One-shot law pass requested by preset application (the preset writes
     *  raw layers/shapes; the flag makes the effect above catch them). */
    const solveNextRef = useRef(false);
    /** ASSEMBLE fallback only — when the AI has NOT art-directed this
     *  photo, clicks walk the hidden LAYOUT POOL for structural variety.
     *  The AI's direction (§7) skips the pool entirely. */
    const assembleIdxRef = useRef(0);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('ck_text_behind_autolayout_v1');
            if (saved === '0') setAutoLayout(false);
        } catch { /* default on */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('ck_text_behind_autolayout_v1', autoLayout ? '1' : '0');
        } catch { /* non-fatal */ }
    }, [autoLayout]);

    // --- advanced image editing: shape overlays + film grain ----------------
    const [shapes, setShapes] = useState<ShapeLayer[]>([]);
    const [activeShapeId, setActiveShapeId] = useState<string | null>(null);

    // Preset commit — SEPARATION ONLY, per ruling: preset geometry is
    // authored, so nothing is pinned, pruned, clamped or frame-tucked.
    // The pass separates text×text collisions (teasers off the barcode
    // band, badge off the masthead) with the shapes as fixed anchors,
    // then re-cuts plates to their words. The full law engine
    // (enforceLayoutLaws) lives behind the manual button only.
    useEffect(() => {
        if (!solveNextRef.current) return;
        solveNextRef.current = false;
        if (!autoLayout) return;
        const cutoutBox = cutoutImage ? getCutoutBoundingBox(cutoutImage) : null;
        const settled = guaranteeNoTextOverlap(layers, shapes);
        setLayers(settled);
        setShapes(reCutPlates(settled, shapes, cutoutBox));
    }, [layers, shapes, autoLayout]);

    const [grain, setGrain] = useState<GrainSettings>(DEFAULT_GRAIN);
    /** Visible naturally by default when scrolling down — shapes & overlays are immediately accessible without clicking */
    const [advancedOpen, setAdvancedOpen] = useState(true);

    // Auto-expand advanced tools whenever shapes exist so they remain visible naturally
    useEffect(() => {
        if (shapes.length > 0) {
            setAdvancedOpen(true);
        }
    }, [shapes.length]);

    const activeShape = shapes.find((s) => s.id === activeShapeId) ?? null;

    const patchActiveShape = useCallback((patch: Partial<ShapeLayer>) => {
        pushUndo();
        setShapes((prev) => prev.map((s) => (s.id === activeShapeId ? { ...s, ...patch } : s)));
    }, [activeShapeId, pushUndo]);

    const MAX_SHAPES = 12;

    const addShape = (kind: ShapeKind) => {
        if (shapes.length >= MAX_SHAPES) {
            alert(`Shape limit reached (${MAX_SHAPES} layers). Delete one first — premium pages stay uncluttered.`);
            return;
        }
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
    };


    /** Keep the snapshot source in sync with the last committed render. */
    useEffect(() => {
        undoStateRef.current = { layers, activeLayerId, shapes, activeShapeId, grain, bgDim, dimWholePhoto, photoFilter };
    }, [layers, activeLayerId, shapes, activeShapeId, grain, bgDim, dimWholePhoto, photoFilter]);

    const applySnapshot = (snap: UndoSnapshot) => {
        setLayers(snap.layers);
        setActiveLayerId(snap.activeLayerId);
        setShapes(snap.shapes);
        setActiveShapeId(snap.activeShapeId);
        setGrain(snap.grain);
        setBgDim(snap.bgDim);
        if (typeof snap.dimWholePhoto === 'boolean') setDimWholePhoto(snap.dimWholePhoto);
        if (snap.photoFilter) setPhotoFilter(snap.photoFilter);
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

    const canvasW = bgImage?.naturalWidth ?? 0;
    const canvasH = bgImage?.naturalHeight ?? 0;

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
            const saved = parseFloat(localStorage.getItem('ck_text_behind_bgdim') ?? '');
            if (Number.isFinite(saved) && saved > 0) setBgDim(Math.min(0.85, saved));
        } catch { /* default */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('ck_text_behind_bgdim', String(bgDim));
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
            localStorage.setItem(OVERLAYS_KEY, JSON.stringify({ shapes, grain }));
        } catch { /* non-fatal */ }
    }, [shapes, grain]);

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
            // Cross-tool hand-off (Background Remover → here): a freshly sent
            // cutout wins over whatever was restored from IndexedDB.
            const handoff = await takeHandoffImage('text-behind');
            if (handoff && !cancelled) {
                try {
                    const img = await loadImage(handoff.blob);
                    setCutoutImage(img);
                    setCutoutInfo(`${img.naturalWidth} × ${img.naturalHeight}px · PNG · FROM BACKGROUND REMOVER`);
                    await idbPut('cutout', handoff.blob);
                } catch { /* not a decodable image — ignore */ }
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Warm the AI engine silently after first interaction so the first real
    // cutout skips the ~110 MB model download the moment a photo lands.
    useEffect(() => {
        prewarmBackgroundEngine();
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

    const handleAutoCutout = useCallback(async (customBlob?: Blob) => {
        const source = customBlob || bgFileRef.current;
        if (!source) {
            setCutoutError('Upload the background photo first.');
            setMatte(null);
            return;
        }
        setCutoutError(null);
        setMatte({
            busy: true,
            engine: 'browser',
            message: 'Starting AI cutout model…',
            percent: 5,
        });
        const onProgress: MatteProgress = (_stage, message, percent) => {
            setMatte((prev) => (prev ? { ...prev, message, percent } : prev));
        };
        try {
            const rawCutout = await removeBackgroundBrowser(source, onProgress, preferredBrowserModel());
            const stdCutout = await standardizeSourceImage(rawCutout);
            setCutoutImage(stdCutout.img);
            setCutoutInfo(`${stdCutout.width} × ${stdCutout.height}px · Subject Cutout Ready`);
            void idbPut('cutout', stdCutout.blob);
            setCutoutError(null);
            setMatte(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Cutout failed — please try again.';
            console.error('[handleAutoCutout] Cutout error:', err);
            setCutoutError(message);
            setMatte(null);
        }
    }, []);

    const handleBgFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            setCutoutError(null);
            setMatte({
                busy: true,
                engine: 'browser',
                message: 'Standardizing image format…',
                percent: 5,
            });
            const std = await standardizeSourceImage(file);
            bgFileRef.current = std.blob;
            setBgImage(std.img);
            setBgInfo(`${std.width} × ${std.height}px · Standardized PNG`);
            void idbPut('bg', std.blob);

            // Invalidate art-direction cache and previous photo semantics
            dirPhotoSrcRef.current = '';
            setAiSemantics(null);
            try {
                localStorage.removeItem(DIR_CACHE_KEY);
            } catch { /* ignore */ }

            // Clear stale decorative plates/shapes from previous photo
            setShapes([]);

            // Trigger AI cutout automatically
            void handleAutoCutout(std.blob);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not open that file — please select a valid JPG or PNG.';
            setBgInfo('Could not open that file.');
            setCutoutError(msg);
            setMatte(null);
        }
    }, [handleAutoCutout]);

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
        setMatte(null);
        setBgDim(0);
        bgFileRef.current = null;
        setExportNote('');
        void idbClear(['bg', 'cutout']);
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

    type EditorialPresetId = 'vogue' | 'zine' | 'kinfolk' | 'noir' | 'gq' | 'dazed' | 'natgeo' | 'cyber' | 'vinyl' | 'architectural' | 'skate' | 'old-money' | 'film-noir' | 'fragments' | 'time' | 'eye' | 'bazaar';

    const EDITORIAL_PRESETS_CATALOG: {
        id: EditorialPresetId;
        num: string;
        title: string;
        desc: string;
    }[] = [
            { id: 'vogue', num: '[01]', title: 'HIGH FASHION', desc: 'Didone Masthead + Paris Folio + Barcode' },
            { id: 'zine', num: '[02]', title: 'INDIE ZINE', desc: 'Swiss Type + Archive Stamp + Film Grain' },
            { id: 'kinfolk', num: '[03]', title: 'QUIET LUXURY', desc: 'Minimal Bleed Frame + Bone Ivory Type' },
            { id: 'noir', num: '[04]', title: '35MM NOIR', desc: 'Cinema Type + Heavy Grain + Film Stamp' },
            { id: 'gq', num: '[05]', title: 'GQ / GENTLEMAN', desc: 'Bebas Condensed + Gold Type + Issue Folio' },
            { id: 'dazed', num: '[06]', title: 'DAZED / CULTURE', desc: 'Raw Syne Bold + Dateline + Distressed Grain' },
            { id: 'natgeo', num: '[07]', title: 'DISCOVERY', desc: 'Archival Gold Bleed Frame + Coordinates + Barcode' },
            { id: 'cyber', num: '[08]', title: 'CYBER / MATRIX', desc: 'Terminal Space Mono + Cyber Stamp + Node ID' },
            { id: 'vinyl', num: '[09]', title: 'INDIE VINYL', desc: 'Album Script + STEREO 33⅓ RPM + Tracklist' },
            { id: 'architectural', num: '[10]', title: 'ARCHITECTURE', desc: 'Bodoni/Cinzel + Crisp White Bleed Frame' },
            { id: 'fragments', num: '[11]', title: 'HUMAN FRAGMENTS', desc: 'Type-as-Mask + Right Info Rail + Crosshairs' },
            { id: 'time', num: '[12]', title: 'TIME / ICONIC', desc: 'Bold Red Border + Person of the Year Serif' },
            { id: 'eye', num: '[13]', title: 'BRUTALIST EYE', desc: 'Raw Graphic Mass + Monochrome Full-Bleed' },
            { id: 'bazaar', num: '[14]', title: 'HARPER’S BAZAAR', desc: 'Soft Couture Didone + Behind-Subject Depth' },
        ];

    const applyEditorialPreset = (rawId: EditorialPresetId) => {
        pushUndo();
        setActiveEditorialPreset(rawId);
        // AUTO-LAYOUT LAW PASS: presets are styled skeletons — the moment
        // one lands, the same laws that sanitize AI and ASSEMBLE output
        // (purpose / plating / separation / clearance) sanitize the preset.
        solveNextRef.current = true;
        // Normalize aliases
        const presetId = rawId === 'skate' ? 'zine' : rawId === 'old-money' ? 'kinfolk' : rawId === 'film-noir' ? 'noir' : rawId;

        if (presetId === 'vogue') {
            // [01] VOGUE / COUTURE: Classic Didone serif, Paris/Milan folio, contained barcode
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'VOGUE',
                    fontId: 'cinzel',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 88,
                    letterSpacingEm: 0.10,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.20,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'PARIS • LONDON • MILAN  |  WINTER ISSUE 48  —  €14.00',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 76,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    opacity: 0.95,
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'THE NEW SILHOUETTE',
                    fontId: 'cinzel',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 48,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.32,
                    yPct: 0.82,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-subkicker',
                    text: 'TAILORING IN THE AGE OF NOISE',
                    fontId: 'inter',
                    weight: 600,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 48,
                    letterSpacingEm: 0.08,
                    color: '#E5E5E5',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.32,
                    yPct: 0.86,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.84,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 0.98,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 771234 567008  04',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.12, size: 2 });
            setBgDim(0.16);
            setDimWholePhoto(false);
            setPhotoFilter('none');
        } else if (presetId === 'zine') {
            // [02] STREET / ZINE: Swiss heavy sans, Tokyo archive stamp, distressed grain
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'ZINE',
                    fontId: 'archivo',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 86,
                    letterSpacingEm: -0.01,
                    color: '#FFFFFF',
                    strokeEm: 0.015,
                    strokeColor: '#000000',
                    shadow: false,
                    shadowMode: 'none',
                    rotationDeg: 0,
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.24,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'SPECIAL PRINT ARCHIVE — 01 / 500 COPIES',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.85,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-spine',
                    text: 'INDEPENDENT PRINT — ARCHIVE SERIES',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 66,
                    heightPct: 2.2,
                    letterSpacingEm: 0.14,
                    color: '#FFFFFF',
                    opacity: 0.85,
                    shadow: false,
                    shadowMode: 'none',
                    rotationDeg: -90,
                    depth: 'front',
                    xPct: 0.055,
                    yPct: 0.5,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.16,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 778000 120401  08',
                },
                {
                    id: `shape-badge-${Date.now()}`,
                    kind: 'badge',
                    xPct: 0.5,
                    yPct: 0.08,
                    wPct: 34,
                    hPct: 3.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 2,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'SPECIAL ARCHIVE // 01 / 500',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.26, size: 2 });
            setBgDim(0.20);
            setDimWholePhoto(true);
            setPhotoFilter('none');
        } else if (presetId === 'kinfolk') {
            // [03] KINFOLK / SLOW LIVING: Bone ivory Didone, delicate bleed frame
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'ESSENCE',
                    fontId: 'cinzel',
                    weight: 400,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 80,
                    letterSpacingEm: 0.12,
                    color: '#F7F6F0',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.23,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'VOLUME XIV  ·  A STUDY ON LEISURE  ·  LONDON',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#F7F6F0',
                    opacity: 0.9,
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.10,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'THE ARCHITECTURE OF SILENCE',
                    fontId: 'playfair',
                    weight: 700,
                    italic: true,
                    caseMode: 'original',
                    uppercase: false,
                    fitToWidth: true,
                    widthPct: 60,
                    letterSpacingEm: 0.08,
                    color: '#F7F6F0',
                    opacity: 0.95,
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.87,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-frame-${Date.now()}`,
                    kind: 'frame',
                    xPct: 0.5,
                    yPct: 0.5,
                    wPct: 90,
                    hPct: 92,
                    rotationDeg: 0,
                    fillColor: '#F7F6F0',
                    fillOn: false,
                    strokeColor: '#F7F6F0',
                    strokeW: 1.5,
                    cornerPct: 0,
                    opacity: 0.85,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.15, size: 2 });
            setBgDim(0.15);
            setDimWholePhoto(false);
            setPhotoFilter('vintage');
        } else if (presetId === 'noir') {
            // [04] 35MM CINEMA / NOIR: Playfair cinema masthead, film soundtrack credits
            setPhotoFilter('noir');
            setDimWholePhoto(true);
            setBgDim(0.28);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'CINEMA',
                    fontId: 'playfair',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 86,
                    letterSpacingEm: 0.12,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'ORIGINAL MOTION PICTURE SOUNDTRACK',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    opacity: 0.9,
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.85,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-badge-${Date.now()}`,
                    kind: 'badge',
                    xPct: 0.5,
                    yPct: 0.08,
                    wPct: 36,
                    hPct: 3.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'LIMITED ARCHIVE • 35MM',
                },
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.84,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '8 431092 001924  35',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.38, size: 3 });
        } else if (presetId === 'gq') {
            // [05] GQ / MODERN GENT: Bold condensed sans, gold/white styling
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'STYLE',
                    fontId: 'bebas-neue',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 88,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'GLOBAL MEN OF THE YEAR  |  N° 240  —  $12.00',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'THE REINVENTION OF LUXURY',
                    fontId: 'inter',
                    weight: 800,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 54,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.34,
                    yPct: 0.82,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-subkicker',
                    text: 'A RETURN TO CLASSIC CRAFTSMANSHIP',
                    fontId: 'cinzel',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 54,
                    letterSpacingEm: 0.08,
                    color: '#D4AF37',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.34,
                    yPct: 0.86,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.84,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 770028 732001  12',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.15, size: 2 });
            setBgDim(0.18);
            setDimWholePhoto(false);
            setPhotoFilter('none');
        } else if (presetId === 'dazed') {
            // [06] DAZED / UNDERGROUND: Raw Syne bold, underground culture teaser
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'DAZED',
                    fontId: 'syne',
                    weight: 800,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 86,
                    letterSpacingEm: 0.04,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'LONDON  •  BERLIN  •  SEOUL  |  ISSUE 62',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 74,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'NEW VISIONS FOR A FRACTURED WORLD',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 70,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.84,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-spine',
                    text: 'MONTHLY CULTURE DOSSIER — PRINTED IN LONDON',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 62,
                    heightPct: 2.2,
                    letterSpacingEm: 0.14,
                    color: '#FFFFFF',
                    opacity: 0.8,
                    shadow: false,
                    shadowMode: 'none',
                    rotationDeg: 90,
                    depth: 'front',
                    xPct: 0.945,
                    yPct: 0.5,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.16,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 771353 790014  62',
                },
                {
                    id: `shape-badge-${Date.now()}`,
                    kind: 'badge',
                    xPct: 0.80,
                    yPct: 0.88,
                    wPct: 28,
                    hPct: 3.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 2,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'RAW CUT // 2026',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.32, size: 2 });
            setBgDim(0.22);
            setDimWholePhoto(true);
            setPhotoFilter('none');
        } else if (presetId === 'natgeo') {
            // [07] DISCOVERY / EXPLORER: Iconic yellow frame border, narrative serif kicker
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'FRONTIER',
                    fontId: 'playfair',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 84,
                    letterSpacingEm: 0.12,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.20,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'EXPEDITION ARCHIVE  •  VOL. 88  •  LAT 35°N',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 70,
                    letterSpacingEm: 0.08,
                    color: '#D4AF37',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.09,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'THE UNCHARTED TERRITORIES',
                    fontId: 'cinzel',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 64,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.85,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-frame-${Date.now()}`,
                    kind: 'frame',
                    xPct: 0.5,
                    yPct: 0.5,
                    wPct: 88,
                    hPct: 92,
                    rotationDeg: 0,
                    fillColor: '#D4AF37',
                    fillOn: false,
                    strokeColor: '#D4AF37',
                    strokeW: 1.5,
                    cornerPct: 0,
                    opacity: 0.85,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                },
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.82,
                    yPct: 0.93,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 770027 935007  88',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.16, size: 2 });
            setBgDim(0.16);
            setDimWholePhoto(false);
            setPhotoFilter('none');
        } else if (presetId === 'cyber') {
            // [08] CYBER / MATRIX ID: Technical Space Mono, digital terminal styling
            setPhotoFilter('mono');
            setDimWholePhoto(true);
            setBgDim(0.25);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'SYSTEM',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 86,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'NODE://0092.44  •  PROTOCOL 0.8  •  ONLINE',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 74,
                    letterSpacingEm: 0.08,
                    color: '#00FF88',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'NEURAL INTERFACE // SPECIFICATION 04',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.84,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.84,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'SYS-849201-X99',
                },
                {
                    id: `shape-badge-${Date.now()}`,
                    kind: 'badge',
                    xPct: 0.20,
                    yPct: 0.88,
                    wPct: 26,
                    hPct: 3.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 2,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'DECLASSIFIED',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.30, size: 2 });
        } else if (presetId === 'vinyl') {
            // [09] INDIE VINYL / RECORD: Album art typography, STEREO 33⅓ RPM badge
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'ECHOES',
                    fontId: 'playball',
                    weight: 400,
                    caseMode: 'original',
                    uppercase: false,
                    fitToWidth: true,
                    widthPct: 82,
                    letterSpacingEm: 0.06,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'ORIGINAL STUDIO RECORDING  •  SIDE A / TRACK 01',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 74,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.85,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-badge-${Date.now()}`,
                    kind: 'badge',
                    xPct: 0.76,
                    yPct: 0.08,
                    wPct: 30,
                    hPct: 3.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 2,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: 'STEREO 33⅓ RPM',
                },
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.16,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '0 75678 19234 8',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.24, size: 2 });
            setBgDim(0.20);
            setDimWholePhoto(false);
            setPhotoFilter('vintage');
        } else if (presetId === 'architectural') {
            // [10] ARCHITECTURE / FORM: Minimal Bodoni/Cinzel, razor-sharp clean margins
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'STRUCTURE',
                    fontId: 'cinzel',
                    weight: 400,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 86,
                    letterSpacingEm: 0.12,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.22,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'INTERNATIONAL REVIEW OF SPATIAL DESIGN  —  08',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 74,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'MONOLITHS IN MODERN CONCRETE',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 62,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.86,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-frame-${Date.now()}`,
                    kind: 'frame',
                    xPct: 0.5,
                    yPct: 0.5,
                    wPct: 92,
                    hPct: 94,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: false,
                    strokeColor: '#FFFFFF',
                    strokeW: 1.5,
                    cornerPct: 0,
                    opacity: 0.65,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                },
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.84,
                    yPct: 0.94,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 772041 385002  08',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.14, size: 2 });
            setBgDim(0.18);
            setDimWholePhoto(false);
            setPhotoFilter('none');
        } else if (presetId === 'fragments') {
            // [11] HUMAN FRAGMENTS: Swiss type-as-mask + right vertical info rail
            setPhotoFilter('none');
            setDimWholePhoto(false);
            setBgDim(0.12);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'FRAGMENTS',
                    fontId: 'archivo',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 92,
                    letterSpacingEm: -0.04,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.18,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'EDITORIAL POSTER  |  SERIES 01 — ARCHIVAL MONOGRAPH',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 76,
                    letterSpacingEm: 0.06,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.07,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-feature',
                    text: 'THE HUMAN ARCHIVE',
                    fontId: 'inter',
                    weight: 800,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: false,
                    widthPct: 40,
                    letterSpacingEm: 0.04,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.28,
                    yPct: 0.78,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-kicker',
                    text: 'A STUDY IN URBAN PRESENCE & SILENT ARCHITECTURE',
                    fontId: 'inter',
                    weight: 600,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: false,
                    widthPct: 44,
                    letterSpacingEm: 0.02,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.28,
                    yPct: 0.85,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.82,
                    yPct: 0.91,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 771234 567008  01',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.10, size: 1 });
        } else if (presetId === 'time') {
            // [12] TIME / ICONIC: Bold red border + Person of the Year serif typography
            setPhotoFilter('none');
            setDimWholePhoto(false);
            setBgDim(0.14);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'TIME',
                    fontId: 'playfair',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 82,
                    letterSpacingEm: 0.04,
                    color: '#E10600',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.16,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'PERSON OF THE YEAR  |  SPECIAL ISSUE',
                    fontId: 'inter',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 68,
                    letterSpacingEm: 0.06,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.06,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-feature',
                    text: 'PERSON OF THE YEAR',
                    fontId: 'playfair',
                    weight: 900,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: false,
                    widthPct: 70,
                    letterSpacingEm: 0.02,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.82,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-frame-${Date.now()}`,
                    kind: 'frame',
                    xPct: 0.5,
                    yPct: 0.5,
                    wPct: 94,
                    hPct: 95,
                    rotationDeg: 0,
                    fillColor: '#E10600',
                    fillOn: false,
                    strokeColor: '#E10600',
                    strokeW: 3.5,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                },
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.82,
                    yPct: 0.91,
                    wPct: 18,
                    hPct: 5.5,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '0 725274 01001 9',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.10, size: 1 });
        } else if (presetId === 'eye') {
            // [13] BRUTALIST EYE: High contrast graphic typography
            setPhotoFilter('mono');
            setDimWholePhoto(true);
            setBgDim(0.20);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'EYE',
                    fontId: 'syne',
                    weight: 800,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 88,
                    letterSpacingEm: -0.05,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.28,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'INTERNATIONAL REVIEW OF GRAPHIC DESIGN  |  No. 128',
                    fontId: 'space-mono',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 78,
                    letterSpacingEm: 0.04,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.82,
                    yPct: 0.91,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 770960 779001  28',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.22, size: 2 });
        } else if (presetId === 'bazaar') {
            // [14] HARPER'S BAZAAR: Couture Didone behind subject
            setPhotoFilter('none');
            setDimWholePhoto(false);
            setBgDim(0.12);
            setLayers([
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: 'BAZAAR',
                    fontId: 'cinzel',
                    weight: 700,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 88,
                    letterSpacingEm: -0.02,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'behind',
                    xPct: 0.5,
                    yPct: 0.18,
                },
                {
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-dateline',
                    text: 'PARIS • NEW YORK • MILAN  |  THE FASHION ISSUE',
                    fontId: 'inter',
                    weight: 600,
                    caseMode: 'uppercase',
                    uppercase: true,
                    fitToWidth: true,
                    widthPct: 72,
                    letterSpacingEm: 0.08,
                    color: '#FFFFFF',
                    shadow: false,
                    shadowMode: 'none',
                    depth: 'front',
                    xPct: 0.5,
                    yPct: 0.08,
                },
            ]);
            setActiveLayerId('box-masthead');
            setShapes([
                {
                    id: `shape-barcode-${Date.now()}`,
                    kind: 'barcode',
                    xPct: 0.82,
                    yPct: 0.91,
                    wPct: 20,
                    hPct: 6,
                    rotationDeg: 0,
                    fillColor: '#FFFFFF',
                    fillOn: true,
                    strokeColor: '#000000',
                    strokeW: 0,
                    cornerPct: 0,
                    opacity: 1,
                    glow: 0,
                    blend: 'normal',
                    depth: 'front',
                    label: '9 770018 531003  10',
                },
            ]);
            setGrain({ enabled: true, opacity: 0.10, size: 1 });
        }
    };

    /** Stable identity of the CURRENT photo — a tiny grayscale hash of its
     *  pixels. Blob URLs change every reload; pixels don't, so the cached
     *  art direction survives refreshes with the same photo on the canvas. */
    const photoFingerprint = (img: HTMLImageElement | null): string => {
        try {
            if (!img || !img.complete || img.naturalWidth === 0) return '';
            const w = 12;
            const h = 14;
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            if (!ctx) return '';
            ctx.drawImage(img, 0, 0, w, h);
            const d = ctx.getImageData(0, 0, w, h).data;
            let hash = 5381;
            for (let i = 0; i < d.length; i += 4) {
                const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
                hash = ((hash * 33) ^ Math.round(lum)) >>> 0;
            }
            return hash.toString(36);
        } catch {
            return '';
        }
    };

    /** The clean photo shot downscaled — ALWAYS drawn directly from the
     *  source photograph (bgImage) so the AI reads the pure subject, materials,
     *  setting, and mood, NEVER polluted by old text layers or plates on the canvas. */
    const captureCanvasShot = (): string | null => {
        try {
            const img = bgImage;
            if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                // 896px — the perception budget that keeps fabric weave
                // (corduroy ribs, silk sheen, knit gauge), micro accessories
                // (watch faces, jewelry, sneaker colorways) and gaze
                // direction legible to the vision model. At 512px those
                // dissolve into mush and the copy comes back generic.
                const targetW = 896;
                const targetH = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * targetW));
                const off = document.createElement('canvas');
                off.width = targetW;
                off.height = targetH;
                const ctx = off.getContext('2d');
                if (!ctx) return null;
                ctx.drawImage(img, 0, 0, targetW, targetH);
                const url = off.toDataURL('image/jpeg', 0.88);
                const b64 = url.split(',')[1];
                return b64 && b64.length > 100 ? b64 : null;
            }
            const src = canvasRef.current;
            if (!src || src.width === 0 || src.height === 0) return null;
            const targetW = 896;
            const targetH = Math.max(1, Math.round((src.height / src.width) * targetW));
            const off = document.createElement('canvas');
            off.width = targetW;
            off.height = targetH;
            const ctx = off.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(src, 0, 0, targetW, targetH);
            const url = off.toDataURL('image/jpeg', 0.80);
            const b64 = url.split(',')[1];
            return b64 && b64.length > 100 ? b64 : null;
        } catch {
            return null;
        }
    };

    /** Analyzes the clean photo's negative space and light zones directly
     *  from the raw background image, free of text/shape artifacts. */
    const getCleanPhotoAnalysis = () => {
        try {
            const img = bgImage;
            if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                const off = document.createElement('canvas');
                off.width = Math.min(img.naturalWidth, 512);
                off.height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * off.width));
                const ctx = off.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, off.width, off.height);
                    return analyzePhotoFromCanvas(off);
                }
            }
            return canvasRef.current ? analyzePhotoFromCanvas(canvasRef.current) : null;
        } catch {
            return null;
        }
    };

    /** AI PERCEPTION — semantics-only read of the photo (subject, mood,
     *  genre). Feeds the deterministic editorial solver; the AI never
     *  decides a coordinate. Works without it too (solver falls back to
     *  its own measured colour-mood inference). */
    /** The single art-direction round trip — shared by ANALYZE and the
     *  mirrored ASSEMBLE button. One fast call returns analysis + the
     *  VALIDATED direction pick + the edition's copy together, and
     *  remembers which photo it was read from. Throws on failure. */
    const runAiDirection = async (): Promise<SolverSemantics> => {
        const provider = getActiveAiProvider();
        const key = getStoredAiKey(provider);
        const model = getStoredAiModel(provider);
        if (!key) throw new Error('No AI key on file');
        // A prompt is being sent — auto layout re-engages. The manual
        // pause only survives until the next art-direction round trip.
        setAutoLayout(true);
        const res = await fetch('/api/ai/magazine-layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                apiKey: key,
                model,
                mode: 'analyze',
                imageContext: aiPrompt.trim(),
                imageBase64: captureCanvasShot(),
                // The app owns the perception math — sample from clean photo
                photoAnalysis: getCleanPhotoAnalysis(),
                preferredStyle: aiStyle,
                brandColors: brandUse ? { primary: brandPrimary, accent: brandAccent } : null,
                customText: { masthead: aiCustom.masthead, coverline: aiCustom.coverline, sub: aiCustom.sub },
                aspectRatio: canvasW && canvasH ? Math.round((canvasW / canvasH) * 1000) / 1000 : undefined,
                canvasOrientation: canvasH >= canvasW ? 'portrait' : 'landscape',
                existingText: layers.find((l) => l.id.includes('masthead'))?.text || activeLayer.text || '',
            }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.semantics) {
            throw new Error(data.error || 'Photo analysis failed');
        }
        dirPhotoSrcRef.current = bgImage?.src ?? '';
        dirDebugRef.current = (data as any).debug ?? null;
        // §16 — harmonize the AI's claimed swatches against the measured
        // palette: a hex that is not plausibly IN this photo dies here and
        // the pixel measurement wins (same doctrine as coordinates).
        try {
            const sem = data.semantics as SolverSemantics;
            const off = bgImage ? downsampleForSwatches(bgImage, 96, 120) : null;
            const measured = off ? extractPhotoSwatches(off) : null;
            const harmonized = harmonizeAiSwatches((sem as { swatches?: Parameters<typeof harmonizeAiSwatches>[0] }).swatches, measured);
            if (harmonized) {
                sem.swatches = harmonized;
                setPhotoSwatches(harmonized);
                depthUnderlayRef.current = null; // palette changed — rebuild depth
            } else if (measured) {
                setPhotoSwatches(measured);
            }
            if (off) photoLightAngleRef.current = extractLightAngle(off);
        } catch {
            /* palette harmonization is best-effort — the solve proceeds */
        }
        try {
            const fp = photoFingerprint(bgImage ?? null);
            if (fp) localStorage.setItem(DIR_CACHE_KEY, JSON.stringify({ fp, sem: data.semantics }));
        } catch {
            /* quota / private mode — best-effort cache */
        }
        return data.semantics as SolverSemantics;
    };

    const handleAiAnalyzePhoto = async () => {
        if (!getStoredAiKey(getActiveAiProvider())) {
            setAiModalOpen(true);
            return;
        }
        setAiAnalyzing(true);
        setAiError(null);
        startThoughtProcess('analyze', 'AI PHOTO ANALYSIS & ART DIRECTION');
        try {
            const sem = await runAiDirection();
            setAiSemantics(sem);
            completeThoughtProcess({ sem, direction: sem.direction });
            // §12.5 — the ANALYZE click prints the AI stages immediately:
            // the measured facts, the brief, the assignment roll and the
            // RAW model output (is the vision analysis good? judge here).
            traceCoverPipeline({
                analysis: null,
                semantics: sem,
                aiDebug: dirDebugRef.current,
                solver: null,
                composed: null,
                composedMeta: null,
                guarantee: null,
            });
        } catch (err: any) {
            const msg = err?.message || 'Photo analysis failed';
            setAiError(msg);
            failThoughtProcess(msg);
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleGenerateAiCover = async () => {
        const provider = getActiveAiProvider();
        const key = getStoredAiKey(provider);
        const model = getStoredAiModel(provider);

        if (!key) {
            setAiModalOpen(true);
            return;
        }

        setAiGenerating(true);
        setAiError(null);

        try {
            // Measure the photo's calm quadrants so the AI applies the same
            // template decision tree the on-device assembler uses.
            let photoAnalysis: ReturnType<typeof analyzePhotoFromCanvas> = null;
            try {
                const cv = canvasRef.current;
                photoAnalysis = cv ? analyzePhotoFromCanvas(cv) : null;
            } catch {
                photoAnalysis = null;
            }

            const res = await fetch('/api/ai/magazine-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    apiKey: key,
                    model,
                    imageContext: aiPrompt.trim() || activeLayer.text || 'high impact subject photo',
                    imageBase64: captureCanvasShot(),
                    preferredStyle: aiStyle,
                    existingText: activeLayer.text,
                    aspectRatio: canvasW && canvasH ? Math.round((canvasW / canvasH) * 1000) / 1000 : undefined,
                    canvasOrientation: canvasH >= canvasW ? 'portrait' : 'landscape',
                    photoAnalysis,
                    brandColors: brandUse ? { primary: brandPrimary, accent: brandAccent } : null,
                    customText: { masthead: aiCustom.masthead, coverline: aiCustom.coverline, sub: aiCustom.sub },
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success || !data.layout) {
                throw new Error(data.error || 'Failed to generate layout');
            }

            const layout = data.layout;
            pushUndo();

            // Construct Text Layers
            const newLayers: TextLayer[] = [];

            // 1. Primary Masthead — geometry honored verbatim (incl. xPct/case/italic/opacity)
            if (layout.masthead) {
                const m = layout.masthead;
                const mCase = asCaseMode(m.caseMode);
                newLayers.push({
                    ...DEFAULT_TEXT_LAYER,
                    id: 'box-masthead',
                    text: m.text || 'EDITORIAL',
                    fontId: m.fontId || 'cinzel',
                    weight: m.weight || 700,
                    italic: !!m.italic,
                    caseMode: mCase,
                    uppercase: mCase === 'uppercase',
                    fitToWidth: m.fitToWidth ?? true,
                    widthPct: clampNum(m.widthPct, 30, 98, 88),
                    heightPct: clampNum(m.heightPct, 4, 40, 18),
                    letterSpacingEm: clampNum(m.letterSpacingEm, -0.05, 0.3, 0.1),
                    color: asHexColor(m.color, '#FFFFFF'),
                    opacity: clampNum(m.opacity, 0.2, 1, 1),
                    strokeEm: clampNum(m.strokeEm, 0, 0.08, 0),
                    strokeColor: asHexColor(m.strokeColor, '#000000'),
                    shadow: m.shadow ?? false,
                    shadowMode: asShadowMode(m.shadowMode),
                    rotationDeg: clampNum(m.rotationDeg, -90, 90, 0),
                    blend: asBlendMode(m.blend),
                    depth: 'behind',
                    xPct: clampNum(m.xPct, 0.08, 0.92, 0.5),
                    yPct: clampNum(m.yPct, 0.05, 0.75, 0.22),
                });
            }

            // 2. Subtitles / coverlines — full field fidelity so plated
            // ink-on-paper compositions survive the trip from the AI verbatim
            if (Array.isArray(layout.subtitles)) {
                layout.subtitles.slice(0, 5).forEach((sub: any, idx: number) => {
                    const sCase = asCaseMode(sub.caseMode);
                    newLayers.push({
                        ...DEFAULT_TEXT_LAYER,
                        id: `box-sub-${idx + 1}`,
                        text: sub.text || 'ISSUE N° 01',
                        fontId: sub.fontId || 'inter',
                        weight: sub.weight || 700,
                        italic: !!sub.italic,
                        caseMode: sCase,
                        uppercase: sCase === 'uppercase',
                        fitToWidth: sub.fitToWidth ?? false,
                        widthPct: clampNum(sub.widthPct, 15, 96, 65),
                        heightPct: clampNum(sub.heightPct, 1, 20, 3),
                        letterSpacingEm: clampNum(sub.letterSpacingEm, -0.02, 0.3, 0.18),
                        color: asHexColor(sub.color, '#FFFFFF'),
                        opacity: clampNum(sub.opacity, 0.3, 1, 1),
                        strokeEm: clampNum(sub.strokeEm, 0, 0.06, 0),
                        strokeColor: asHexColor(sub.strokeColor, '#000000'),
                        shadow: sub.shadow ?? false,
                        shadowMode: asShadowMode(sub.shadowMode),
                        // ±90 allowed: vertical side rails along the canvas edges
                        rotationDeg: clampNum(sub.rotationDeg, -90, 90, 0),
                        blend: asBlendMode(sub.blend),
                        depth: 'front',
                        xPct: clampNum(sub.xPct, 0.03, 0.97, 0.5),
                        yPct: clampNum(sub.yPct, 0.04, 0.96, idx === 0 ? 0.08 : 0.86),
                    });
                });
            }

            // Construct Shapes — plates, badges, frames, barcodes & QRs with
            // full geometry fidelity (cornerPct/opacity/strokeW all honored)
            const newShapes: ShapeLayer[] = [];
            if (Array.isArray(layout.shapes)) {
                const VALID_AI_SHAPE_KINDS = ['rect', 'line', 'beam', 'circle', 'icon', 'button', 'barcode', 'badge', 'frame', 'qr'];
                layout.shapes.slice(0, 6).forEach((s: any, idx: number) => {
                    newShapes.push({
                        id: `shape-ai-${Date.now().toString(36)}-${idx}`,
                        kind: (VALID_AI_SHAPE_KINDS.includes(s.kind) ? s.kind : 'rect') as ShapeKind,
                        xPct: clampNum(s.xPct, 0.05, 0.95, s.kind === 'barcode' || s.kind === 'qr' ? 0.84 : 0.5),
                        yPct: clampNum(s.yPct, 0.04, 0.96, 0.93),
                        wPct: clampNum(s.wPct, 2, 96, 24),
                        hPct: clampNum(s.hPct, 0.3, 90, 7),
                        rotationDeg: clampNum(s.rotationDeg, -15, 15, 0),
                        fillColor: asHexColor(s.fillColor, '#FFFFFF'),
                        fillOn: s.fillOn ?? true,
                        strokeColor: asHexColor(s.strokeColor, '#000000'),
                        strokeW: clampNum(s.strokeW, 0, 30, 0),
                        cornerPct: clampNum(s.cornerPct, 0, 50, 0),
                        opacity: clampNum(s.opacity, 0.2, 1, 1),
                        glow: 0,
                        blend: 'normal',
                        depth: s.depth === 'behind' ? 'behind' : 'front',
                        iconId: s.iconId || 'arrow-right',
                        label:
                            typeof s.label === 'string'
                                ? s.label.slice(0, 36)
                                : s.kind === 'barcode'
                                    ? '9771234567003'
                                    : s.kind === 'qr'
                                        ? 'https://creatorskit.app'
                                        : 'SPECIAL EDITION',
                    });
                });
            }

            // BRAND KIT LAW — the saved palette is not a suggestion. This
            // AI-direct path maps the model's hues verbatim, so with the
            // kit ON we snap them home: every saturated (hue-bearing)
            // text colour becomes the brand accent; the badge plate and
            // saturated frame strokes take the brand primary. Neutral
            // ink/paper/gray survives untouched — plated compositions
            // keep their polarity, and the badge renderer flips its
            // label ink against the fill, so legibility always holds.
            if (brandUse && (brandAccent || brandPrimary)) {
                const hueSpread = (hx: string) => {
                    const h = hx.replace('#', '');
                    if (h.length !== 6) return 0;
                    const r = parseInt(h.slice(0, 2), 16);
                    const g = parseInt(h.slice(2, 4), 16);
                    const b = parseInt(h.slice(4, 6), 16);
                    return Math.max(r, g, b) - Math.min(r, g, b);
                };
                if (brandAccent) {
                    newLayers.forEach((l) => {
                        if (hueSpread(l.color) > 60) l.color = brandAccent;
                    });
                }
                newShapes.forEach((s) => {
                    if (s.kind === 'badge' && brandPrimary) {
                        s.fillColor = brandPrimary;
                    } else if (s.kind === 'frame' && (brandPrimary || brandAccent) && hueSpread(s.strokeColor) > 60) {
                        s.strokeColor = brandPrimary || brandAccent;
                    }
                });
            }

            // USER RULING — auto layout must NEVER lock elements to
            // positions. Text on a rect/plate/square is intended design,
            // not a collision: the ONLY automatic intervention is
            // text×text separation (unconditional, no toggle), plus
            // plates re-cutting to follow words the separation moved.
            // The full law engine stays available via the explicit
            // law button — never in the automatic path.
            const cutoutBox = cutoutImage ? getCutoutBoundingBox(cutoutImage) : null;
            const guaranteed = guaranteeNoTextOverlap(newLayers, newShapes);

            if (guaranteed.length > 0) {
                setLayers(guaranteed);
                setActiveLayerId(guaranteed[0].id);
            }
            setShapes(reCutPlates(guaranteed, newShapes, cutoutBox));

            // Apply photo style
            if (layout.photoStyle) {
                if (typeof layout.photoStyle.bgDim === 'number') {
                    setBgDim(Math.min(0.85, Math.max(0, layout.photoStyle.bgDim)));
                }
                if (typeof layout.photoStyle.dimWholePhoto === 'boolean') {
                    setDimWholePhoto(layout.photoStyle.dimWholePhoto);
                }
                if (layout.photoStyle.photoFilter) {
                    setPhotoFilter(layout.photoStyle.photoFilter);
                }
                if (layout.photoStyle.grain) {
                    setGrain({
                        enabled: layout.photoStyle.grain.enabled ?? true,
                        opacity: layout.photoStyle.grain.opacity ?? 0.22,
                        size: layout.photoStyle.grain.size ?? 2,
                    });
                }
            }
        } catch (err: any) {
            setAiError(err.message || 'AI layout generation failed. Please check your API key.');
        } finally {
            setAiGenerating(false);
        }
    };

    // --- SYSTEM ASSEMBLY ------------------------------------------------------
    // Consolidates the full magazine component grammar (masthead · dateline ·
    // coverlines · side rail · badge · plate · barcode/QR · frame) into one
    // complete cover, on-device — no AI key, different edition every click.
    const handleAssembleSystemCover = async () => {
        if (!bgImage) {
            setAiError('Add a background photo first — the system composes over your image.');
            return;
        }
        setAiError(null);

        // §7 MIRROR — the button IS the pipeline. With a key on file EVERY
        // click runs the art-direction round trip FIRST — the server rolls
        // a fresh EDITION ASSIGNMENT per call, so every click is the AI
        // re-reading the same photo from a DIFFERENT viewpoint (family,
        // treatment, masthead attitude, energy, wildcard), then assembling
        // from the returned brief: art-direct → assemble, one tap, a new
        // edition every time. No key or failed call → the deterministic
        // fallback owns it — same click, always a cover.
        let sem: SolverSemantics | null = aiSemantics;
        const willArtDirect = !!getStoredAiKey(getActiveAiProvider());
        if (willArtDirect) {
            startThoughtProcess('direct-assemble', 'ART-DIRECTING & SOLVING COVER');
            setAiAnalyzing(true);
            try {
                const fresh = await runAiDirection();
                sem = fresh;
                setAiSemantics(fresh);
            } catch {
                /* no direction available — the on-device solve proceeds */
            } finally {
                setAiAnalyzing(false);
            }
        } else {
            startThoughtProcess('assemble-offline', 'ON-DEVICE EDITORIAL SOLVER');
        }

        // Negative-space scan — the photo's calm quadrants choose the
        // composition template (calm headroom → over-head masthead, calm
        // side column → side-strip stack, dense → sandwich + bottom strip).
        // ONE fast downsampled scan (96×120 thumbnail) feeds BOTH engines —
        // the grid carries everything the old region scan measured, so the
        // opening step of ASSEMBLE is a single instant pass, not two
        // full-canvas reads.
        const cutoutBox = cutoutImage ? getCutoutBoundingBox(cutoutImage) : null;
        let analysis: ReturnType<typeof analyzePhotoFromCanvas> = null;
        let grid: GridAnalysis | null = null;
        try {
            const img = bgImage;
            if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                const off = document.createElement('canvas');
                off.width = Math.min(img.naturalWidth, 512);
                off.height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * off.width));
                const ctx = off.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, off.width, off.height);
                    grid = analyzeGridFromCanvas(off, cutoutBox);
                    analysis = grid ? gridToPhotoAnalysis(grid) : analyzePhotoFromCanvas(off);
                }
            } else {
                const cv = canvasRef.current;
                grid = cv ? analyzeGridFromCanvas(cv, cutoutBox) : null;
                analysis = grid ? gridToPhotoAnalysis(grid) : cv ? analyzePhotoFromCanvas(cv) : null;
            }
        } catch {
            /* canvas sampling unavailable — fall back to seeded templates */
        }
        if (analysis && cutoutBox) {
            analysis.subjectBox = cutoutBox;
        }

        // THE SOLVER PASS — perception meets geometry. The AI (optional)
        // supplies semantics only; this deterministic optimizer owns every
        // coordinate: a 24×30 measurement field → candidate whitespace
        // zones → Hungarian assignment → rail/plate mathematics.
        let solverOut: SolverResult | null = null;
        try {
            solverOut = grid
                ? solveEditorialCover(grid, sem, {
                    seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
                    style: aiStyle !== 'auto' ? aiStyle : undefined,
                    // The AI's analyze-time copy joins the solver's §3
                    // fitness pass — its words are measured against real
                    // zones at real rungs before geometry is chosen.
                    copy: sem?.copy
                        ? {
                            masthead: sem.copy.masthead,
                            dateline: sem.copy.dateline,
                            feature: sem.copy.feature,
                            sub: sem.copy.sub,
                            teasers: sem.copy.teasers?.join('\n'),
                        }
                        : undefined,
                })
                : null;
        } catch {
            solverOut = null;
        }

        // The app's own intelligence builds the STRUCTURE from the scan;
        // the user's REAL content fills the storytelling slots (vibe input
        // and text already on the canvas outrank the copy pools). The AI
        // copy desk can then refine words without moving a coordinate.
        const existingById = (id: string) => layers.find((l) => l.id === id)?.text.trim();
        const vibe = aiPrompt.trim();
        const vibeParts = vibe
            .split(/\r?\n|\s+[|—–]\s+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const content: SystemContentInput = {};
        // CUSTOM TEXT fields outrank everything — the user's exact words are
        // contract; then the AI's analyze-time copy (it read the photo and
        // named the genre in the same round trip — its fresh words outrank
        // the canvas's stale ones); then the canvas, then the vibe input,
        // then the pools.
        const aiCopy = sem?.copy;
        if (aiCustom.masthead.trim()) content.masthead = aiCustom.masthead.trim().slice(0, 14);
        else if (aiCopy?.masthead) content.masthead = aiCopy.masthead;
        if (aiCustom.coverline.trim()) content.feature = aiCustom.coverline.trim().slice(0, 44);
        else if (aiCopy?.feature) content.feature = aiCopy.feature;
        if (aiCustom.sub.trim()) content.sub = aiCustom.sub.trim().slice(0, 60);
        else if (aiCopy?.sub) content.sub = aiCopy.sub;
        if (aiCopy?.dateline) content.dateline = aiCopy.dateline;
        if (aiCopy?.teasers?.length) content.teasers = aiCopy.teasers.slice(0, 3);
        // §7 context slots — badge and rail speak in editorial language.
        if (aiCopy?.badge) content.badge = aiCopy.badge.slice(0, 32);
        else if (aiCustom.masthead.trim() && !content.badge) content.badge = `ISSUE 01 • ${aiCustom.masthead.trim().toUpperCase()}`;
        else if (!content.badge && sem?.mood?.length) {
            content.badge = `SPECIAL ISSUE • ${sem.mood[0].toUpperCase()}`.slice(0, 28);
        }
        if (aiCopy?.rail) content.rail = aiCopy.rail.slice(0, 64);
        else {
            const railLine = sem?.summary?.replace(/\s+/g, ' ').trim().slice(0, 64) ?? '';
            if (!content.rail && railLine) {
                content.rail = railLine;
            }
        }
        if (!content.masthead && vibeParts.length) {
            const first = vibeParts[0].split(/\s+/)[0].replace(/[^A-Za-z0-9&'-]/g, '');
            if (first.length >= 3 && first.length <= 10) content.masthead = first.toUpperCase();
        }
        if (!content.feature && vibeParts.length) {
            content.feature = vibeParts[vibeParts.length - 1].slice(0, 44);
        }

        // §7 — THE AI ART-DIRECTS, THE APP ASSEMBLES. When analyze
        // returned a direction it wins outright: no layoutId, no static
        // skeleton cycling — the composer materializes the pick into real
        // geometry (ladder, plates, scan, guarantee). With no direction
        // on the table (no key / not yet analyzed), the hidden pool walk
        // keeps one-click structural variety as the deterministic
        // fallback. Same click, same speed — the direction rides the
        // analyze response that already happened.
        const direction = sem?.direction ?? null;
        const poolEntry = direction ? null : LAYOUT_LIBRARY[assembleIdxRef.current % LAYOUT_LIBRARY.length];
        if (!direction) assembleIdxRef.current += 1;
        // Base style only — a `preset:*` signature token is decoration,
        // never a composer genre; composeSystemCover needs a real
        // SystemStyleId (or 'auto').
        const solvedToken = solverOut?.style ?? '';
        const solvedBaseStyle: SystemStyleId | 'auto' =
            solvedToken && !solvedToken.startsWith('preset:')
                ? (solvedToken as SystemStyleId)
                : 'auto';
        // AI genre perception (e.g. zine / dazed / cyber / noir / skate culture -> zine) outranks mathematical hue guess!
        const aiGenre = matchGenreToStyle(sem?.genre) ?? (sem?.genre as SystemStyleId | 'auto' | undefined);
        const effectiveStyle: SystemStyleId | 'auto' =
            aiStyle !== 'auto'
                ? aiStyle
                : aiGenre && aiGenre !== 'auto'
                    ? aiGenre
                    : solvedBaseStyle || 'auto';
        const composeSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
        // §15 THE BRAIN — situation → precedents → reconcile → critique.
        // The AI brief wins unless it contradicts a measured finding; the
        // resolver composes candidate editions, TASTES them against the
        // calm field (calm/hierarchy/order/margins/balance/shelter), and
        // amends its own plan when the champion scores poorly. Zero extra
        // AI calls; every thought lands in the console trace.
        const situation = grid ? diagnoseSituation(grid) : null;
        const precedents = situation ? recallPrecedents(situation) : [];
        const reconciled = situation
            ? reconcile(situation, precedents, direction)
            : { direction: direction ?? {}, precedent: '(no grid — raw brief stands)', audit: [] };
        const candSeeds = [composeSeed, (composeSeed ^ 0x9e3779b9) >>> 0, (composeSeed + 0x85ebca6b) >>> 0];
        const composeWith = (d: typeof direction, sd: number) =>
            composeSystemCover({
                style: effectiveStyle,
                seed: sd,
                analysis,
                content,
                direction: d,
                ...(poolEntry ? { layoutId: poolEntry.id } : {}),
                brand: brandUse ? { primary: brandPrimary, accent: brandAccent } : undefined,
                archetype: sem?.archetypeHint || undefined,
                // §16 — the harmonized photo palette inks the typography
                // (the AI round trip's set, else the raw measurement).
                swatches: sem?.swatches ?? photoSwatches ?? null,
            });
        const critique =
            situation && grid
                ? runCritiqueLoop({
                    situation,
                    baseDirection: reconciled.direction,
                    grid,
                    seeds: candSeeds,
                    composeCandidate: (d, sd) =>
                        candidateFrom(sd, `edition-${candSeeds.indexOf(sd) + 1}`, composeWith(d, sd).text as unknown as Array<Record<string, unknown>>),
                })
                : null;
        const finalDirection = critique ? critique.direction : reconciled.direction;
        const finalSeed = critique ? critique.championSeed : composeSeed;
        const composed = composeWith(finalDirection, finalSeed);
        // NOTE: applySolverToCover is intentionally NOT called here.
        // The solver's coordinate override was causing masthead, badge and
        // dateline to collide — the compose system already owns clean positions.
        // The solver still contributes its genre signal (solvedBaseStyle) and
        // decorations (giant wordmark, crosshairs, etc.) via the block below.

        // SOLVER DECORATIONS AT FULL FIDELITY — the engine emits crosshair
        // registration marks, em-dash dividers, accent blocks, rail plates,
        // border frames and the giant type-as-mask wordmark. A flat rect
        // can't express half of that geometry, so the app re-expands every
        // decoration with its OWN machinery: the giant word becomes a real
        // TextLayer (so fit-to-width, tracking, stroke borders, depth and
        // opacity all apply to it), and crosshairs become twin registration
        // bars. This is where the solver drives the app's full feature set.
        const solverTexts: TextLayer[] = [];
        const solverDecor: ShapeLayer[] = [];
        if (solverOut) {
            // Drop the engine's flat-rect approximations — everything the
            // decorations carry is re-rendered below with richer geometry.
            composed.shapes = composed.shapes.filter((s) => !s.id.startsWith('sys-decoration-'));
            const stamp = Date.now().toString(36);
            // Solver type families → the app's registered poster fonts
            // (aligned with the genre registry: fragments→inter, eye→syne,
            // time/food→playfair, bazaar→cinzel).
            const fontForFamily = (fam?: string): string => {
                if (fam === 'didone') return 'cinzel';
                if (fam === 'transitional-serif') return 'playfair';
                if (fam === 'display' || fam === 'grotesque') return 'syne';
                if (fam === 'mono') return 'space-mono';
                return 'inter';
            };
            solverOut.decorations.forEach((d, i) => {
                // House unit grammar: xPct/yPct are FRACTIONS of the canvas,
                // wPct/hPct are PERCENT — exactly what the renderer's
                // `xPct * W` expects. Never multiply x/y by 100 here.
                const cx = d.xPct;
                const cy = d.yPct;
                if (d.kind === 'giant-type') {
                    // The giant wordmark is centre-anchored with percent
                    // width/height — a real TextLayer, so fit-to-width,
                    // tracking, depth, opacity and stroke all apply to it.
                    solverTexts.push({
                        ...DEFAULT_TEXT_LAYER,
                        id: `sys-giant-${stamp}-${i}`,
                        text: d.text ?? 'PULSE',
                        fontId: fontForFamily(d.typeFamily),
                        weight: d.weight ?? 900,
                        caseMode: 'uppercase',
                        uppercase: true,
                        fitToWidth: true,
                        widthPct: d.wPct,
                        heightPct: d.hPct,
                        letterSpacingEm: d.letterSpacing ?? -0.03,
                        color: d.color,
                        // mask-in-type: the photo reads through the word —
                        // approximated as a ghosted architectural backdrop.
                        opacity: d.maskPhoto ? 0.14 : 0.92,
                        strokeEm: 0,
                        strokeColor: d.color,
                        shadow: false,
                        shadowMode: 'none',
                        rotationDeg: d.rotationDeg ?? 0,
                        depth: d.depth ?? 'behind',
                        xPct: cx,
                        yPct: cy,
                    });
                } else if (d.kind === 'crosshair') {
                    // Suppressed — crosshairs/plus registration marks feel gimmicky and are omitted for high-end editorial elegance.
                    return;
                } else {
                    // frame / accent-block / em-dash / rail-bg → rects,
                    // with frames keeping their stroke-only treatment.
                    solverDecor.push({
                        id: `sys-decor-${stamp}-${i}`,
                        kind: 'rect',
                        xPct: cx,
                        yPct: cy,
                        wPct: d.wPct,
                        hPct: d.hPct,
                        rotationDeg: d.rotationDeg ?? 0,
                        fillColor: d.color,
                        fillOn: d.kind !== 'frame',
                        strokeColor: d.color,
                        strokeW: d.kind === 'frame' ? (d.thickness ?? 1.5) : 0,
                        cornerPct: (d as { corner?: number }).corner ?? 0,
                        opacity: 1,
                        glow: 0,
                        blend: 'normal' as BlendMode,
                        depth: d.depth ?? 'front',
                    });
                }
            });
            const dirTag = direction
                ? `⚙ AI DIRECTION ${[direction.template, direction.mastheadDepth, direction.cluster, direction.mainLinePos, direction.treatment, direction.palette, direction.special].filter(Boolean).join(' / ').toUpperCase()} · `
                : '';
            setSolverReport(
                `${dirTag}${solverOut.style.toUpperCase()} · ${solverOut.placements.length} placements · ${solverOut.decorations.length} decorations · ${solverOut.violations?.length ?? 0} law flags`,
            );
        } else {
            setSolverReport(null);
        }

        pushUndo();

        const newLayers: TextLayer[] = composed.text.map((t) => ({
            ...DEFAULT_TEXT_LAYER,
            id: t.id,
            text: t.text,
            fontId: t.fontId,
            weight: t.weight,
            italic: !!t.italic,
            caseMode: t.caseMode,
            uppercase: t.caseMode === 'uppercase',
            fitToWidth: t.fitToWidth,
            widthPct: t.widthPct,
            heightPct: t.heightPct,
            letterSpacingEm: t.letterSpacingEm,
            color: t.color,
            opacity: t.opacity,
            strokeEm: t.strokeEm ?? 0,
            strokeColor: t.strokeColor ?? '#000000',
            shadow: false,
            shadowMode: 'none',
            rotationDeg: t.rotationDeg,
            depth: t.depth,
            xPct: t.xPct,
            yPct: t.yPct,
        }));

        // 24 (not 12): the solver appends its full decoration set after the
        // composer's own shapes — frames, plates, rail backdrops, bars.
        const newShapes: ShapeLayer[] = composed.shapes.slice(0, 24).map((s, idx) => ({
            // Keep the COMPOSER'S semantic id ('sys-plate-feature-N') — the
            // plate re-cutter binds plates to their words BY NAME; minting
            // fresh anonymous ids here severed that bond and stranded plates
            // mid-canvas whenever the guarantee settled their text elsewhere.
            id: typeof s.id === 'string' && s.id ? s.id : `sys-shape-${Date.now().toString(36)}-${idx}`,
            kind: s.kind,
            xPct: s.xPct,
            yPct: s.yPct,
            wPct: s.wPct,
            hPct: s.hPct,
            rotationDeg: s.rotationDeg,
            fillColor: s.fillColor,
            fillOn: s.fillOn,
            strokeColor: s.strokeColor,
            strokeW: s.strokeW,
            cornerPct: s.cornerPct,
            opacity: s.opacity,
            glow: 0,
            blend: 'normal' as BlendMode,
            depth: s.depth,
            label: s.label,
        }));

        setPhotoFilter(composed.photo.photoFilter);
        setBgDim(composed.photo.bgDim);
        setDimWholePhoto(composed.photo.dimWholePhoto);
        setGrain({
            enabled: composed.photo.grain.enabled,
            opacity: composed.photo.grain.opacity,
            size: composed.photo.grain.size,
        });

        // USER RULING — no position locking in the automatic path: text
        // over shapes/plates is intended design; the only intervention is
        // text×text separation over the COMPLETE list (solver statements
        // included, giant backdrop exempt by scale alone), then plates
        // re-cut to follow any words that moved. Nothing is pruned,
        // nothing is pinned, no frame clamps — separation only.
        const preSettle = [...newLayers, ...solverTexts];
        const allShapes = [...newShapes, ...solverDecor];

        // BARCODE SANCTITY PASS:
        // A barcode or QR code must NEVER overlap the masthead or any headline!
        const mhLayer = preSettle.find((l) => l.id === 'box-masthead');
        if (mhLayer) {
            const { hw: mHw, hh: mHh } = measureTextBox(mhLayer);
            const mhX0 = mhLayer.xPct - mHw;
            const mhX1 = mhLayer.xPct + mHw;
            const mhY0 = mhLayer.yPct - mHh;
            const mhY1 = mhLayer.yPct + mHh;
            allShapes.forEach((s) => {
                if (s.kind === 'barcode' || s.kind === 'qr') {
                    const sHw = s.wPct / 200;
                    const sHh = s.hPct / 200;
                    const sX0 = s.xPct - sHw;
                    const sX1 = s.xPct + sHw;
                    const sY0 = s.yPct - sHh;
                    const sY1 = s.yPct + sHh;
                    const xO = Math.min(mhX1, sX1) - Math.max(mhX0, sX0);
                    const yO = Math.min(mhY1, sY1) - Math.max(mhY0, sY0);
                    if (xO > 0 && yO > 0) {
                        // Relocate barcode to opposite vertical pole
                        if (mhLayer.yPct > 0.5) {
                            s.yPct = 0.065;
                        } else {
                            s.yPct = s.kind === 'qr' ? 0.885 : 0.915;
                        }
                    }
                }
            });
        }

        const guaranteed = guaranteeNoTextOverlap(preSettle, allShapes);
        // §14 CALM SETTLING — one measured nudge along x toward the calmest
        // stretch of each band (the grid's column profile windowed to the
        // text's y-range). The guarantee's y is law; separation-only: no
        // pruning, no pinning, slides capped at ±7% and blocked by siblings.
        let settled = guaranteed;
        let settleMoves: SettleMove[] = [];
        if (grid) {
            const nodes = guaranteed.map((l) => {
                const { hw, hh } = measureTextBox(l);
                return {
                    id: l.id,
                    xPct: l.xPct,
                    yPct: l.yPct,
                    hw,
                    hh,
                    architecture: l.id.startsWith('sys-giant-') || l.heightPct >= 20,
                    pinned: Math.abs(Math.abs(l.rotationDeg || 0) % 180 - 90) < 15,
                };
            });
            const settledRun = settleIntoCalm(nodes, grid);
            const posById = new Map(settledRun.nodes.map((n) => [n.id, n.xPct] as const));
            settled = guaranteed.map((l) =>
                posById.has(l.id) && posById.get(l.id) !== l.xPct ? { ...l, xPct: posById.get(l.id)! } : l,
            );
            settleMoves = settledRun.moves;
        }
        const effectiveSubjectBox = cutoutBox || grid?.subjectBox || null;
        setLayers(settled);
        setShapes([...reCutPlates(settled, allShapes, effectiveSubjectBox)]);
        setActiveLayerId('box-masthead');

        // §12.5 THE GLASS PIPELINE — one console readout of EVERY decision
        // this click made: MEASURE → AI BRIEF → SOLVER → COMPOSER →
        // GUARANTEE. Bad cover? Blame the exact stage. The snapshot is on
        // window.__CK_TRACE__ — copy it, send it back with GOOD/BAD.
        const settledMoved = settled
            .map((l) => {
                const pre = preSettle.find((p) => p.id === l.id);
                return pre
                    ? {
                        id: l.id,
                        dxPct: Math.round((l.xPct - pre.xPct) * 1000) / 1000,
                        dyPct: Math.round((l.yPct - pre.yPct) * 1000) / 1000,
                    }
                    : null;
            })
            .filter((m): m is { id: string; dxPct: number; dyPct: number } => !!m && (m.dxPct !== 0 || m.dyPct !== 0));
        traceCoverPipeline({
            analysis,
            semantics: sem,
            aiDebug: dirDebugRef.current,
            solver: solverOut,
            composed,
            composedMeta: { style: effectiveStyle as string, seed: finalSeed },
            guarantee: { moved: settledMoved },
            brain: situation
                ? {
                    situation: situation.summary,
                    findings: situation.findings,
                    precedents: precedents.map((p) => ({ id: p.id, name: p.name, fit: p.fit })),
                    precedentUsed: reconciled.precedent,
                    audit: reconciled.audit,
                    attempts: critique ? critique.attempts : [],
                }
                : null,
            settle: settleMoves,
        });
        completeThoughtProcess({ sem, direction, solverOut });
    };

    // --- AI REFINE COPY ---------------------------------------------------
    // The app's own intelligence built the structure; the AI is the copy
    // desk. It rewrites ONLY the words on the canvas — masthead, coverlines,
    // teasers, badges — specific to the photo/vibe. Geometry is locked:
    // not a single coordinate, plate, font or treatment moves.
    const handleAiRefineCopy = async () => {
        const provider = getActiveAiProvider();
        const key = getStoredAiKey(provider);
        const model = getStoredAiModel(provider);

        if (!key) {
            setAiModalOpen(true);
            return;
        }
        if (!layers.length && !shapes.length) {
            setAiError('Assemble a cover (or add elements) first — AI REFINE rewrites the copy of what is on the canvas.');
            return;
        }

        setAiGenerating(true);
        setAiError(null);
        startThoughtProcess('rewrite', 'AI COPY DESK — BESPOKE REWORDING');

        try {
            const roleOf = (id: string) =>
                id.includes('masthead')
                    ? 'masthead'
                    : id.includes('dateline')
                        ? 'dateline'
                        : id.includes('rail')
                            ? 'side rail'
                            : id.includes('feature')
                                ? 'feature coverline'
                                : id.includes('sub')
                                    ? 'sub-coverline'
                                    : id.includes('teaser')
                                        ? 'teaser'
                                        : 'coverline';
            const maxFor = (id: string, text: string) => {
                if (id.includes('masthead')) return 10;
                if (id.includes('rail') || id.includes('dateline')) return 56;
                if (id.includes('feature')) return 44;
                if (id.includes('teaser')) return 30;
                return Math.max(8, Math.min(56, Math.ceil(text.length * 1.3) || 24));
            };
            const skeleton = {
                texts: layers.map((l) => ({
                    id: l.id,
                    role: roleOf(l.id),
                    current: l.text,
                    maxChars: maxFor(l.id, l.text),
                })),
                shapes: shapes
                    .filter((s) => s.kind === 'badge' || s.kind === 'barcode' || s.kind === 'qr')
                    .map((s) => ({
                        id: s.id,
                        role: s.kind === 'badge' ? 'badge label' : s.kind === 'qr' ? 'QR encoded link' : 'barcode digits',
                        current: s.label || '',
                        maxChars: s.kind === 'badge' ? 34 : s.kind === 'qr' ? 60 : 13,
                    })),
            };

            const res = await fetch('/api/ai/magazine-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    apiKey: key,
                    model,
                    mode: 'refine',
                    skeleton,
                    imageContext: aiPrompt.trim() || activeLayer.text || 'the photo currently on the canvas',
                    imageBase64: captureCanvasShot(),
                    preferredStyle: aiStyle,
                    customText: { masthead: aiCustom.masthead, coverline: aiCustom.coverline, sub: aiCustom.sub },
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success || !data.layout) {
                throw new Error(data.error || 'Copy refinement failed');
            }

            const textMap = new Map<string, string>(
                (data.layout.texts || []).map((t: any) => [String(t.id), String(t.text)]),
            );
            const labelMap = new Map<string, string>(
                (data.layout.labels || []).map((t: any) => [String(t.id), String(t.label)]),
            );

            pushUndo();
            // The words changed — their lengths changed with them. THE
            // FINAL GUARANTEE re-runs over the reworded canvas: if the new
            // copy grew into a neighbour's box, the junior element yields
            // before the user ever sees a collision. (Geometry only moves
            // when a collision would otherwise exist — untouched words
            // keep their coordinates to the pixel.) Plates then re-cut to
            // the new word lengths — text on its plate stays intended.
            const relabeled = shapes.map((s) => (labelMap.has(s.id) ? { ...s, label: labelMap.get(s.id)! } : s));
            const settled = guaranteeNoTextOverlap(
                layers.map((l) => (textMap.has(l.id) ? { ...l, text: textMap.get(l.id)! } : l)),
                relabeled,
            );
            const cutoutBox = cutoutImage ? getCutoutBoundingBox(cutoutImage) : null;
            setLayers(settled);
            setShapes(reCutPlates(settled, relabeled, cutoutBox));
            completeThoughtProcess({
                sem: aiSemantics,
                note: 'Copy Rewritten & Plates Recut (0 Collisions)',
            });
        } catch (err: any) {
            const msg = err.message || 'Copy refinement failed. Please check your API key.';
            setAiError(msg);
            failThoughtProcess(msg);
        } finally {
            setAiGenerating(false);
        }
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
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (opts.opaqueBg) {
                ctx.fillStyle = opts.opaqueBg;
                ctx.fillRect(0, 0, W, H);
            }

            // Layer 0: Background photo
            if (bgImage) {
                ctx.filter = getPhotoFilterCss(photoFilter);

                ctx.drawImage(bgImage, 0, 0, W, H);
                ctx.filter = 'none';

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

            // CIVIC-SENSE PLATE DETECTION — which opaque front plate (rect,
            // banner or badge body) dominates the given text box? Feeds the
            // contrast guard in drawSingleLayer so ink-on-paper polarity is
            // a law of the renderer, not a suggestion of the composer.
            const hexLuminance = (hex: string): number => {
                const h = hex.replace('#', '');
                if (h.length !== 6) return 128;
                return 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
            };
            const plateLuminanceUnder = (x0: number, y0: number, x1: number, y1: number): number | null => {
                const area = Math.max(1, (x1 - x0) * (y1 - y0));
                let bestLum: number | null = null;
                let bestCover = 0;
                for (const s of shapes) {
                    if (s.depth !== 'front' || !s.fillOn || s.opacity < 0.6) continue;
                    if (s.kind !== 'rect' && s.kind !== 'badge' && s.kind !== 'button') continue;
                    const sw = (s.wPct / 100) * W;
                    const sh = (s.hPct / 100) * H;
                    const sx0 = s.xPct * W - sw / 2;
                    const sy0 = s.yPct * H - sh / 2;
                    const ox = Math.max(0, Math.min(x1, sx0 + sw) - Math.max(x0, sx0));
                    const oy = Math.max(0, Math.min(y1, sy0 + sh) - Math.max(y0, sy0));
                    const cover = (ox * oy) / area;
                    if (cover > bestCover) {
                        bestCover = cover;
                        bestLum = hexLuminance(s.fillColor || '#000000');
                    }
                }
                return bestCover >= 0.55 ? bestLum : null;
            };

            // Single Layer Renderer
            const drawSingleLayer = (l: TextLayer) => {
                if (!l.text.trim()) return;
                const font = fontById(l.fontId);

                const textToRender = applyCase(l.text, l.caseMode, l.uppercase);
                const lines = textToRender.split('\n');

                // Weight preservation: prevent text from becoming a faint hairline
                const baseWeight = l.weight || font.weight;
                const targetStyle = l.italic ? 'italic' : 'normal';

                // Safe bounds & thresholds
                const maxSafeW = W * 0.90;
                const minReadablePx = Math.max(14, H * 0.016); // Strict legibility floor so text never disappears
                const desiredHealthyPx = Math.max(22, Math.min(H * 0.032, W * 0.032));

                let currentLsEm = l.letterSpacingEm;

                const measure = (px: number, lsEm: number, wt: number) => {
                    ctx.font = `${targetStyle} ${wt} ${px}px ${font.family}`;
                    const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
                    if ('letterSpacing' in ctx) ls.letterSpacing = `${lsEm * px}px`;
                    const widths = lines.map((line) => ctx.measureText(line || ' ').width);
                    const widest = Math.max(...widths, 1);
                    const lineH = px * 1.10;
                    return { widest, blockW: widest, blockH: lineH * lines.length, lineH };
                };

                const probe = Math.max(16, H * 0.08);
                let fontPx: number;

                if (l.fitToWidth) {
                    let atProbe = measure(probe, currentLsEm, baseWeight);
                    let calculatedPx = probe * ((W * l.widthPct) / 100 / atProbe.blockW);

                    // SMART SPACE-WITHIN OPTIMIZATION:
                    // If fontPx would drop below healthy thickness because of excess tracking,
                    // progressively tighten the "space within" (letter spacing) FIRST so font size & weight stay thick and bold!
                    while (calculatedPx < desiredHealthyPx && currentLsEm > 0.01) {
                        currentLsEm = Math.max(0.01, currentLsEm - 0.015);
                        atProbe = measure(probe, currentLsEm, baseWeight);
                        calculatedPx = probe * ((W * l.widthPct) / 100 / atProbe.blockW);
                    }
                    fontPx = Math.max(minReadablePx, calculatedPx);
                } else {
                    fontPx = Math.max(minReadablePx, (H * l.heightPct) / 100);
                }

                // If small font size, ensure bold weight (700) so letter strokes are solid & never hairline
                const targetWeight = (fontPx < 26 && baseWeight <= 500) ? 700 : baseWeight;
                let m = measure(fontPx, currentLsEm, targetWeight);

                // If block width exceeds safe canvas area, tighten letter spacing further down to 0
                if (m.blockW > maxSafeW && currentLsEm > 0.01) {
                    while (m.blockW > maxSafeW && currentLsEm > 0.01) {
                        currentLsEm = Math.max(0, currentLsEm - 0.02);
                        m = measure(fontPx, currentLsEm, targetWeight);
                    }
                }

                // If still wider than safe area after tightening letter spacing, scale down fontPx
                // but enforce minReadablePx so it never becomes an invisible hairline
                if (m.blockW > maxSafeW) {
                    fontPx = Math.max(minReadablePx, fontPx * (maxSafeW / m.blockW));
                    m = measure(fontPx, currentLsEm, targetWeight);
                }

                // Rotation-aware safe margins: clamp against the AXIS-ALIGNED
                // bounding box of the ROTATED block, so a ±90° side rail can
                // hug the canvas edge without being shoved to the centre.
                const rotRad = (l.rotationDeg * Math.PI) / 180;
                const cosA = Math.abs(Math.cos(rotRad));
                const sinA = Math.abs(Math.sin(rotRad));
                const halfW = (m.blockW * cosA + m.blockH * sinA) / 2;
                const halfH = (m.blockW * sinA + m.blockH * cosA) / 2;
                const safeMarginX = W * 0.03;
                let posX = l.xPct * W;
                if (posX - halfW < safeMarginX) posX = safeMarginX + halfW;
                else if (posX + halfW > W - safeMarginX) posX = W - safeMarginX - halfW;

                let posY = l.yPct * H;
                const safeMarginY = H * 0.03;
                if (posY - halfH < safeMarginY) posY = safeMarginY + halfH;
                if (posY + halfH > H - safeMarginY) posY = H - safeMarginY - halfH;

                ctx.save();
                ctx.globalCompositeOperation = asCompositeOp(l.blend);
                ctx.globalAlpha = l.opacity;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.translate(posX, posY);
                ctx.rotate((l.rotationDeg * Math.PI) / 180);
                ctx.font = `${targetStyle} ${targetWeight} ${fontPx}px ${font.family}`;
                const ls = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
                if ('letterSpacing' in ctx) ls.letterSpacing = `${currentLsEm * fontPx}px`;

                // CIVIC-SENSE CONTRAST GUARD: front-layer text sitting on an
                // opaque plate must wear the plate's inverse ink — black
                // rectangle ⇒ white text, white rectangle ⇒ black text —
                // whatever placed the plate (system, AI, preset or your own
                // two hands). Enforced at render, so every plate reads.
                let inkColor = l.color;
                if (l.depth === 'front' && l.fillMode !== 'gradient') {
                    const plateLum = plateLuminanceUnder(posX - halfW, posY - halfH, posX + halfW, posY + halfH);
                    if (plateLum !== null) {
                        const inkLum = hexLuminance(inkColor);
                        if (Math.abs(plateLum - inkLum) / 255 < 0.45) {
                            inkColor = plateLum > 127.5 ? '#000000' : '#FFFFFF';
                        }
                    }
                }

                // Fill color or gradient
                let fill: string | CanvasGradient = inkColor;
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
                } else if (l.depth === 'front' && strokePx <= 0) {
                    // OPTICAL LEGIBILITY HALO:
                    // When unplated front text sits over an active photograph, provide an
                    // ultra-subtle, high-taste contrast halo so letters never dissolve into photo textures.
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
                    ctx.shadowBlur = Math.max(3, fontPx * 0.08);
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Math.max(1, fontPx * 0.025);
                }

                const firstMid = -(m.blockH / 2) + m.lineH / 2;
                lines.forEach((line, i) => {
                    const y = firstMid + i * m.lineH;
                    if (strokePx > 0) ctx.strokeText(line, 0, y);
                    ctx.fillText(line, 0, y);
                });
                ctx.restore();

                metricsRef.current[l.id] = {
                    cx: posX,
                    cy: posY,
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
                const dx = (W - dw) / 2;
                const dy = (H - dh) / 2;

                // §16 OPTICAL SANDWICH DEPTH (v2 — the physical edition):
                // When typography sits behind the subject, the subject is a
                // LIT OBJECT in a room, not a flat sticker. Three passes —
                // ambient occlusion, a directional contact shadow cast away
                // from the photo's measured key light, and a paper-toned rim
                // light on the lit edge — are pre-composited ONCE into a
                // cached underlay keyed by (cutout · palette · size), so the
                // steady-state render costs ONE drawImage (cheaper than the
                // old single-pass shadow it replaces).
                const hasBehindText = layers.some((l) => l.depth === 'behind' && l.text.trim());
                if (hasBehindText) {
                    const sw = photoSwatches;
                    const light = photoLightAngleRef.current;
                    const key = `${cutoutImage.src}|${sw?.inkDark ?? ''}|${sw?.paperNeutral ?? ''}|${W}x${H}|${light.dx.toFixed(3)},${light.dy.toFixed(3)}`;
                    let underlay = depthUnderlayRef.current;
                    if (!underlay || underlay.key !== key) {
                        underlay = {
                            key,
                            canvas: buildSandwichDepthUnderlay(cutoutImage, dx, dy, dw, dh, W, H, sw, light),
                        };
                        depthUnderlayRef.current = underlay;
                    }
                    if (underlay.canvas) ctx.drawImage(underlay.canvas, 0, 0);
                }

                ctx.filter = getPhotoFilterCss(photoFilter);

                ctx.drawImage(cutoutImage, dx, dy, dw, dh);
                ctx.filter = 'none';

                // If dim whole photo is enabled, apply the same dim tint atop the cutout pixels
                if (dimWholePhoto && bgDim > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = `rgba(0,0,0,${bgDim})`;
                    ctx.fillRect(dx, dy, dw, dh);
                    ctx.restore();
                }
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

                let shapeBoxW = w;
                let badgeFont = 0;
                let badgeLabel = '';
                if (s.kind === 'badge') {
                    badgeLabel = (s.label || 'ISSUE N° 04 • FALL 2026').toUpperCase().trim();

                    // An editorial badge is a sleek chip or pill, NEVER an amateur banner stretching across the body.
                    // Maximum width is constrained to ~46% canvas width (or explicit w if user scrubbed it wider)
                    const maxBadgeW = Math.max(w, Math.round(W * 0.46));
                    const minBadgeW = Math.round(W * 0.16);

                    // Healthy readable font floor: on high-res canvas (e.g. 2560px), must never shrink to 1-pixel specks
                    const minReadableBadgePx = Math.max(12, Math.round(H * 0.010));
                    const maxBadgePx = Math.max(minReadableBadgePx, Math.round(H * 0.018));
                    badgeFont = Math.max(minReadableBadgePx, Math.min(maxBadgePx, h * 0.52));

                    // When pill corners are rounded (e.g. cornerPct >= 40), the hemispherical ends
                    // require at least radius (~h/2) padding so text never touches the curvature.
                    const capsulePad = (s.cornerPct >= 40) ? Math.round(h * 0.48) : Math.round(badgeFont * 0.95);
                    let padX = Math.max(14, capsulePad);
                    ctx.font = `700 ${badgeFont}px "Space Mono", monospace, monospace`;
                    let textW = ctx.measureText(badgeLabel).width;

                    // If text is long, scale down font smoothly so badge remains compact and fits cleanly within maxBadgeW
                    while ((textW + padX * 2 > maxBadgeW) && badgeFont > minReadableBadgePx * 0.70) {
                        badgeFont -= 0.5;
                        padX = Math.max(12, (s.cornerPct >= 40) ? Math.round(badgeFont * 1.25) : Math.round(badgeFont * 0.85));
                        ctx.font = `700 ${badgeFont}px "Space Mono", monospace, monospace`;
                        textW = ctx.measureText(badgeLabel).width;
                    }

                    // Sizing the box: badge width hugs the text with clean padding, bounded cleanly
                    let actualW = Math.min(maxBadgeW, Math.max(minBadgeW, textW + padX * 2));
                    if (w > actualW) actualW = w;

                    // Comfortable vertical breathing room
                    h = Math.max(h, Math.round(badgeFont * 2.1));
                    shapeBoxW = actualW;
                    w = actualW;
                } else if (s.kind === 'barcode') {
                    w = Math.max(w, Math.round(W * 0.18));
                    const minBarH = Math.max(28, Math.round(H * 0.038));
                    const estFont = Math.max(14, Math.round(H * 0.009));
                    h = Math.max(h, minBarH + estFont * 2 + 16);
                    shapeBoxW = w;
                } else if (s.kind === 'button') {
                    h = Math.max(h, Math.round(H * 0.038));
                    shapeBoxW = w;
                }

                const radius = (s.cornerPct / 100) * Math.min(shapeBoxW, h);
                const lw = Math.max(1, (W / 1000) * Math.max(1, s.strokeW));
                let posX = s.xPct * W;
                let posY = s.yPct * H;
                // Barcodes and QR codes must strictly respect the magazine frame margin (6.5% X, 5.5% Y)
                const safeMarginX = (s.kind === 'barcode' || s.kind === 'qr') ? W * 0.065 : W * 0.035;
                const safeMarginY = (s.kind === 'barcode' || s.kind === 'qr') ? H * 0.055 : H * 0.035;
                if (posX - shapeBoxW / 2 < safeMarginX) posX = safeMarginX + shapeBoxW / 2;
                if (posX + shapeBoxW / 2 > W - safeMarginX) posX = W - safeMarginX - shapeBoxW / 2;
                if (posY - h / 2 < safeMarginY) posY = safeMarginY + h / 2;
                if (posY + h / 2 > H - safeMarginY) posY = H - safeMarginY - h / 2;

                ctx.save();
                ctx.translate(posX, posY);
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

                if (s.kind === 'icon') {
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
                } else if (s.kind === 'barcode') {
                    // REAL EAN-13 barcode — bars are computed from the label's
                    // digits (custom numbers welcome), check digit included,
                    // guard bars extended, digits spaced like a retail scan.
                    ctx.save();
                    if (s.fillOn) {
                        ctx.globalAlpha = s.opacity;
                        ctx.fillStyle = s.fillColor || '#FFFFFF';
                        ctx.fillRect(-w / 2, -h / 2, w, h);
                    }
                    const barColor = s.strokeColor || '#000000';
                    if (s.strokeW > 0) {
                        ctx.strokeStyle = barColor;
                        ctx.lineWidth = Math.max(1, (W / 1200) * s.strokeW);
                        ctx.strokeRect(-w / 2, -h / 2, w, h);
                    }

                    ctx.globalAlpha = s.opacity;
                    ctx.fillStyle = barColor;

                    // Inner contained zone: guaranteed padding so no bars or numbers seep out
                    // Generous horizontal padding (11%) guarantees quiet zones on both sides so digits never leak
                    const padX = Math.max(20, w * 0.11);
                    const padY = Math.max(8, h * 0.09);
                    const innerW = w - padX * 2;
                    const innerH = h - padY * 2;

                    const digits = ean13Digits(s.label || '');
                    const bits = ean13Bits(digits);
                    const unit = innerW / bits.length;

                    // Digit line: auto-sized with clean ceiling so digits NEVER leak out of the container
                    const maxAllowedFont = Math.max(12, (innerH - 14) / 1.7);
                    let fontPx = Math.max(11, Math.min(maxAllowedFont, Math.round(H * 0.009), innerW / 17));
                    const textHeight = fontPx * 1.35;
                    const barsH = Math.max(12, innerH - textHeight);
                    const barsTop = -h / 2 + padY;
                    const guardExtra = fontPx * 0.25;

                    // Bars (module width from the true EAN bit string)
                    for (let m = 0; m < bits.length; m++) {
                        if (bits[m] === '1') {
                            const isGuard = m < 3 || (m >= 45 && m < 50) || m >= 92;
                            ctx.fillRect(-innerW / 2 + m * unit, barsTop, Math.max(0.6, unit * 0.92), barsH + (isGuard ? guardExtra : 0));
                        }
                    }

                    // Digits — authentic EAN placement: digit 1 safely in the left
                    // quiet zone, 2–7 under the left group, 8–13 under the right.
                    if (fontPx > 0) {
                        ctx.font = `700 ${fontPx}px "Space Mono", monospace, monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        const textTop = barsTop + barsH + guardExtra;
                        const moduleX = (mod: number) => -innerW / 2 + mod * unit;
                        // Digit 1: safely centered in the left quiet zone (between -w/2 and -innerW/2)
                        // This guarantees the first number NEVER bleeds outside the barcode rect!
                        const leftQuietCenter = (-w / 2 + (-innerW / 2)) / 2;
                        ctx.fillText(digits[0], leftQuietCenter, textTop);
                        for (let d = 1; d <= 6; d++) {
                            const start = 3 + (d - 1) * 7;
                            ctx.fillText(digits[d], moduleX(start) + 3.5 * unit, textTop);
                        }
                        for (let d = 7; d <= 12; d++) {
                            const start = 50 + (d - 7) * 7;
                            ctx.fillText(digits[d], moduleX(start) + 3.5 * unit, textTop);
                        }
                    }
                    ctx.restore();
                } else if (s.kind === 'qr') {
                    // REAL scannable QR code — encodes the label (any link or
                    // text). Quiet zone + module grid drawn at print crispness.
                    ctx.save();
                    ctx.globalAlpha = s.opacity;
                    const side = Math.min(w, h);
                    const matrix = getQrMatrix(s.label || '');
                    if (!matrix) {
                        // Encoder refused the payload (rare) — dashed placeholder
                        ctx.strokeStyle = s.strokeColor || '#000000';
                        ctx.lineWidth = Math.max(1.5, W / 700);
                        ctx.setLineDash([side / 12, side / 16]);
                        ctx.strokeRect(-side / 2, -side / 2, side, side);
                        ctx.setLineDash([]);
                    } else {
                        if (s.fillOn) {
                            ctx.fillStyle = s.fillColor || '#FFFFFF';
                            ctx.fillRect(-side / 2, -side / 2, side, side);
                        }
                        const quiet = 2;
                        const total = matrix.size + quiet * 2;
                        const px = side / total;
                        ctx.fillStyle = s.strokeColor || '#000000';
                        for (let r = 0; r < matrix.size; r++) {
                            for (let c = 0; c < matrix.size; c++) {
                                if (matrix.dark[r * matrix.size + c]) {
                                    ctx.fillRect(-side / 2 + (c + quiet) * px, -side / 2 + (r + quiet) * px, Math.ceil(px * 10) / 10, Math.ceil(px * 10) / 10);
                                }
                            }
                        }
                    }
                    if (s.strokeW > 0) {
                        ctx.strokeStyle = s.strokeColor || '#000000';
                        ctx.lineWidth = Math.max(1, (W / 1000) * Math.max(1, s.strokeW));
                        ctx.strokeRect(-side / 2, -side / 2, side, side);
                    }
                    ctx.restore();
                } else if (s.kind === 'badge') {
                    // Editorial Issue Badge (clean container, auto-scaled typography, 100% clustered & contained)
                    if (s.fillOn) {
                        ctx.globalAlpha = s.opacity;
                        ctx.fillStyle = s.fillColor || '#000000';
                        pathRoundRect(ctx, -shapeBoxW / 2, -h / 2, shapeBoxW, h, radius);
                        ctx.fill();
                    }
                    if (s.strokeW > 0) {
                        ctx.globalAlpha = s.opacity;
                        ctx.strokeStyle = s.strokeColor || '#FFFFFF';
                        ctx.lineWidth = lw;
                        pathRoundRect(ctx, -shapeBoxW / 2, -h / 2, shapeBoxW, h, radius);
                        ctx.stroke();
                    }

                    // Strict clip inside pill so long text NEVER bleeds outside bounds
                    ctx.save();
                    pathRoundRect(ctx, -shapeBoxW / 2, -h / 2, shapeBoxW, h, radius);
                    ctx.clip();

                    ctx.globalAlpha = s.opacity;
                    if (s.fillOn) {
                        // Civic-sense polarity: the badge label's ink must be
                        // the INVERSE of its plate — black plate ⇒ white
                        // label, white plate ⇒ black label.
                        const lum = (hx: string) => {
                            const h = hx.replace('#', '');
                            if (h.length !== 6) return 128;
                            return 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
                        };
                        const plateLum = lum(s.fillColor || '#000000');
                        const inkLum = lum(s.strokeColor || '#FFFFFF');
                        ctx.fillStyle =
                            Math.abs(plateLum - inkLum) / 255 < 0.45
                                ? plateLum > 127.5
                                    ? '#000000'
                                    : '#FFFFFF'
                                : s.strokeColor || '#FFFFFF';
                    } else {
                        ctx.fillStyle = s.fillColor || '#000000';
                    }
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `700 ${badgeFont}px "Space Mono", monospace, monospace`;
                    const renderTextW = ctx.measureText(badgeLabel).width;
                    const maxInnerW = shapeBoxW - (s.cornerPct >= 40 ? h * 0.9 : 24);
                    if (renderTextW > maxInnerW && maxInnerW > 20) {
                        badgeFont = Math.max(10, badgeFont * (maxInnerW / renderTextW));
                        ctx.font = `700 ${badgeFont}px "Space Mono", monospace, monospace`;
                    }
                    // Optical vertical centering for all-caps monospace (-4% font size offset)
                    const opticalOffsetY = -Math.round(badgeFont * 0.04);
                    ctx.fillText(badgeLabel, 0, opticalOffsetY);
                    ctx.restore();
                } else if (s.kind === 'frame') {
                    // Clean bleed margin border (corner tick crosshairs eliminated)
                    ctx.globalAlpha = s.opacity;
                    ctx.strokeStyle = s.strokeColor || '#FFFFFF';
                    ctx.lineWidth = lw;
                    ctx.strokeRect(-w / 2, -h / 2, w, h);
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
                // Border / outline — primitive shapes (rect, circle, line, button). Compound shapes (badge, barcode, qr, frame) handle their own stroke cleanly without phantom inner slices.
                if (s.strokeW > 0 && (s.kind === 'rect' || s.kind === 'circle' || s.kind === 'line' || s.kind === 'button')) {
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
                        fpx = Math.max(16, Math.round(H * 0.013), fpx * ((w * 0.84) / twB));
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
                shapeMetricsRef.current[s.id] = { cx: posX, cy: posY, w: shapeBoxW, h, rot: (s.rotationDeg * Math.PI) / 180 };
            };

            // 1. Behind layers — text first, shapes sit above the behind-text
            metricsRef.current = {};
            shapeMetricsRef.current = {};
            // Shapes are the SURFACE, text sits on top — in BOTH depth bands.
            // (Behind-band rects must never cover behind-band typography.)
            shapes.filter((s) => s.depth === 'behind').forEach(drawShapeLayer);
            layers.filter((l) => l.depth === 'behind').forEach(drawSingleLayer);

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
        [bgImage, cutoutImage, layers, activeLayerId, guides, bgDim, dimWholePhoto, photoFilter, shapes, activeShapeId, grain, iconTick, handleIconReady, photoSwatches]
    );

    // Repaint on canvas changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bgImage) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawSandwich(ctx, canvasW, canvasH, { preview: true });
    }, [bgImage, canvasW, canvasH, drawSandwich]);

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
        // A page frame (or any huge hollow scaffold) is structure, not a
        // prop — it must never swallow clicks meant for the content inside.
        const front = shapes.filter(
            (s) => s.depth === 'front' && !(s.kind === 'frame' && s.wPct > 80 && s.hPct > 80)
        );
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
        if (!bgImage) return;
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
        if (!bgImage) return;
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
        const gapSnap = 0.014; // preferred breathing room between neighbours
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
                // Clearance snap first — settle a breath apart, never touching.
                if (Math.abs(nx - (e.at + hw + gapSnap)) < tolEdge) { nx = e.at + hw + gapSnap; snapV = e.guide; break; }
                if (Math.abs(nx - (e.at - hw - gapSnap)) < tolEdge) { nx = e.at - hw - gapSnap; snapV = e.guide; break; }
                if (Math.abs(nx - asLeft) < tolEdge) { nx = asLeft; snapV = e.guide; break; }
                if (Math.abs(nx - asRight) < tolEdge) { nx = asRight; snapV = e.guide; break; }
            }
        }
        if (snapH === null) {
            for (const e of edgesY) {
                const asTop = e.at + hh; // self's top edge lands on e.at
                const asBottom = e.at - hh; // self's bottom edge lands on e.at
                if (e.center && Math.abs(ny - e.at) < tolEdge) { ny = e.at; snapH = e.guide; break; }
                // Clearance snap first — settle a breath apart, never touching.
                if (Math.abs(ny - (e.at + hh + gapSnap)) < tolEdge) { ny = e.at + hh + gapSnap; snapH = e.guide; break; }
                if (Math.abs(ny - (e.at - hh - gapSnap)) < tolEdge) { ny = e.at - hh - gapSnap; snapH = e.guide; break; }
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
        const drag = dragRef.current;
        dragRef.current = null;
        setGuides({ v: null, h: null });
        // MANUAL RULE — the user's hand outranks the engine: a real drag
        // PAUSES auto-layout. Their arrangement is final exactly as
        // dropped (overlaps allowed, full flexibility) until the next AI
        // prompt re-engages the solver. No re-solve ever fights the pointer.
        if (drag?.active && drag.movedPx > 3 && autoLayout) {
            setAutoLayout(false);
        }
    };

    // --- export --------------------------------------------------------------
    // Download is gated behind a sponsor pause (owner ruling 2026-10-07) —
    // cooldown 0 here because exports are rare, deliberate actions.
    const handleExport = (format: 'png' | 'jpg', scale: 1 | 2) =>
        gateAction('/text-behind', 'Download', 'download', 0, () => {
            void handleExportUngated(format, scale);
        });
    const handleExportUngated = async (format: 'png' | 'jpg', scale: 1 | 2) => {
        if (!bgImage || exporting) return;
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
            const base = (activeLayer.text.split('\n')[0] || 'text-behind').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'text-behind';
            downloadBlob(blob, `${base}-behind-${canvasW * scale}x${canvasH * scale}.${format}`);
            setExportNote(`Saved ${canvasW * scale} × ${canvasH * scale} ${format.toUpperCase()}.`);
        } catch (err) {
            setExportNote(err instanceof Error ? err.message : 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    /** Cross-tool: ship the current clean canvas straight into Thumbnail Lab without preview overlays. */
    const handleSendToThumbnailLab = async (format: 'longform' | 'shorts') => {
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
            // Clean render: preview: false ensures yellow selection border & snap lines are excluded
            drawSandwich(ctx, canvasW, canvasH, {
                preview: false,
            });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, 'image/png')
            );
            if (!blob) throw new Error('Handoff render failed.');
            await putHandoffImage('thumbnail-lab', blob, { format, sourceTool: 'text-behind' });
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
            await putHandoffImage('carousel-slicer', blob, { sourceTool: 'text-behind' });
            setHandoffModalOpen(false);
            window.open('/carousel-slicer', '_blank');
        } catch (err) {
            console.error('Failed to send to Carousel Slicer:', err);
        } finally {
            setSendingHandoff(false);
        }
    };

    /** Cross-tool: reformat the clean canvas for every platform (§4). */
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
            await putHandoffImage('resizer', blob, { sourceTool: 'text-behind' });
            setHandoffModalOpen(false);
            window.open('/resizer', '_blank');
        } catch (err) {
            console.error('Failed to send to Resizer:', err);
        } finally {
            setSendingHandoff(false);
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
                    <SiteNav mode="floating" currentHref="/text-behind" theme="light" align="left" label="TOOLS" />
                    <h1 style={{ fontSize: '0.95rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                        TEXT BEHIND IMAGE
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
                            className="text-behind-stage"
                            style={{
                                flex: 1,
                                minHeight: 0,
                                width: '100%',
                                height: '100%',
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
                            {bgImage ? (
                                <>
                                    {/* FLOATING THOUGHT HUD — completely non-obscuring:
                                        positioned at top of canvas viewport with pointerEvents: none on
                                        wrapper and pointerEvents: auto on card. The user can see and
                                        interact with the canvas freely! */}
                                    {(thoughtState.active || (thoughtState.summary && !thoughtState.dismissed)) && (
                                        <div
                                            className="ck-thought-hud-container"
                                            style={{
                                                position: 'absolute',
                                                top: 10,
                                                left: 12,
                                                right: 12,
                                                zIndex: 45,
                                                pointerEvents: 'none',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <div
                                                className="ck-thought-hud-card"
                                                style={{
                                                    pointerEvents: 'auto',
                                                    width: '100%',
                                                    maxWidth: 600,
                                                    background: '#FFFFFF',
                                                    border: '2px solid #000000',
                                                    boxShadow: '3px 3px 0px #000000',
                                                    fontFamily: 'monospace',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Top Status Row */}
                                                {/* Single-Line Compact Bar */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '4px 8px',
                                                        background: thoughtState.active ? '#FFFFFF' : '#FAFAFA',
                                                        gap: 6,
                                                        whiteSpace: 'nowrap',
                                                        minHeight: 32,
                                                        boxSizing: 'border-box',
                                                    }}
                                                >
                                                    {/* Left: Dot + Step Badge */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                        <div
                                                            style={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                background: thoughtState.active ? '#FFE500' : '#10B981',
                                                                border: '1.2px solid #000',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize: '0.52rem',
                                                                fontWeight: 900,
                                                                background: '#000',
                                                                color: '#FFE500',
                                                                padding: '1px 4px',
                                                                letterSpacing: '0.02em',
                                                            }}
                                                        >
                                                            {thoughtState.active
                                                                ? `${thoughtState.currentStep}/${thoughtState.totalSteps}`
                                                                : 'DONE'}
                                                        </span>
                                                    </div>

                                                    {/* Center: Truncated Live Thought Message (fills remaining space) */}
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '0.56rem',
                                                            fontWeight: 700,
                                                            color: '#111',
                                                            padding: '0 4px',
                                                        }}
                                                        title={thoughtState.items.length > 0 ? thoughtState.items[thoughtState.items.length - 1].label : ''}
                                                    >
                                                        {thoughtState.items.length > 0
                                                            ? thoughtState.items[thoughtState.items.length - 1].label
                                                            : 'Analyzing canvas negative space...'}
                                                    </div>

                                                    {/* Right: Timer + Log Button + Dismiss */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2,
                                                                fontSize: '0.54rem',
                                                                fontWeight: 800,
                                                                color: '#222',
                                                                background: '#F3F4F6',
                                                                padding: '1px 4px',
                                                                border: '1px solid #000',
                                                            }}
                                                        >
                                                            <Clock size={10} />
                                                            <span>{(thoughtState.elapsedMs / 1000).toFixed(1)}s</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => setThoughtState((s) => ({ ...s, expanded: !s.expanded }))}
                                                            className="brutalist-button"
                                                            style={{
                                                                fontSize: '0.5rem',
                                                                fontWeight: 900,
                                                                padding: '2px 5px',
                                                                background: '#000',
                                                                color: '#FFF',
                                                                border: '1px solid #000',
                                                                cursor: 'pointer',
                                                                lineHeight: 1.2,
                                                            }}
                                                            title={thoughtState.expanded ? 'Collapse to single line' : 'Show live thoughts log'}
                                                        >
                                                            {thoughtState.expanded ? 'SLIM ▲' : 'LOG ▼'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setThoughtState((s) => ({ ...s, dismissed: true }))}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontWeight: 900,
                                                                fontSize: '0.7rem',
                                                                padding: '0 2px',
                                                                color: '#666',
                                                                lineHeight: 1,
                                                            }}
                                                            title="Dismiss"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Progress Bar — only visible while actively running; disappears once done */}
                                                {thoughtState.active && (
                                                    <div style={{ width: '100%', height: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                height: '100%',
                                                                width: `${thoughtState.progressPct}%`,
                                                                background: '#FFE500',
                                                                transition: 'width 0.15s ease-out',
                                                                borderRight: '1px solid #000',
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Expanded Thoughts Drawer */}
                                                {thoughtState.expanded && (
                                                    <div
                                                        style={{
                                                            padding: '8px 10px',
                                                            background: '#0D0D0D',
                                                            color: '#E5E7EB',
                                                            maxHeight: 140,
                                                            overflowY: 'auto',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 5,
                                                            fontSize: '0.55rem',
                                                            lineHeight: 1.4,
                                                            borderTop: '1.5px solid #000',
                                                        }}
                                                    >
                                                        {thoughtState.items.map((it) => (
                                                            <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                                <span style={{ color: '#FFE500', flexShrink: 0, fontWeight: 900 }}>
                                                                    [{(it.timestampMs / 1000).toFixed(2)}s]
                                                                </span>
                                                                <span style={{ color: it.status === 'success' ? '#10B981' : '#FFF', fontWeight: 700 }}>
                                                                    {it.status === 'success' ? '✔' : it.status === 'running' ? '▶' : '·'}
                                                                </span>
                                                                <div style={{ flex: 1 }}>
                                                                    <span style={{ color: '#FFF', fontWeight: 700 }}>{it.label}</span>
                                                                    {it.detail && <span style={{ color: '#9CA3AF', marginLeft: 6 }}>— {it.detail}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {thoughtState.summary && (
                                                            <div
                                                                style={{
                                                                    marginTop: 4,
                                                                    paddingTop: 6,
                                                                    borderTop: '1px dashed #333',
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                {thoughtState.mode === 'rewrite' ? (
                                                                    <>
                                                                        <span style={{ background: '#FFE500', color: '#000', padding: '1px 5px', fontWeight: 900 }}>
                                                                            COPY DESK REWRITE
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#FFF', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            {layers.length} ELEMENTS REWORDED
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#10B981', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            0 OVERLAPS
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#9CA3AF', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            {thoughtState.summary.durationSec}s
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span style={{ background: '#FFE500', color: '#000', padding: '1px 5px', fontWeight: 900 }}>
                                                                            ARCHETYPE: {thoughtState.summary.archetype}
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#FFF', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            GENRE: {thoughtState.summary.genre}
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#FFF', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            MASTHEAD: {thoughtState.summary.depth?.toUpperCase()}
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#10B981', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            0 OVERLAPS
                                                                        </span>
                                                                        <span style={{ background: '#222', color: '#9CA3AF', padding: '1px 5px', border: '1px solid #444' }}>
                                                                            {thoughtState.summary.durationSec}s
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
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
                                    {bgImage && confirmResetOpen && (
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
                                                RESET THE PHOTOS YOU PUT HERE?
                                            </span>
                                            <span style={{ fontSize: '0.62rem', color: '#555', fontFamily: 'monospace', lineHeight: 1.4 }}>
                                                Clears your photo, cutout and background dim. This cannot be undone.
                                            </span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    className="brutalist-button brutalist-button-primary"
                                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.7rem' }}
                                                    onClick={() => {
                                                        setConfirmResetOpen(false);
                                                        handleResetPhotos();
                                                    }}
                                                >
                                                    YES, RESET
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
                                                        BACKGROUND REMOVAL FAILED
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
                                                        void handleAutoCutout();
                                                    }}
                                                >
                                                    <span>RETRY CUTOUT</span>
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
                                    {matte?.busy && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                                backdropFilter: 'blur(6px)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 24,
                                                zIndex: 25,
                                            }}
                                        >
                                            {/* Thinking orb — connecting while fetching the AI engine, shaping while cutting the subject out */}
                                            <ThinkingOrb
                                                size={64}
                                                style={{ marginBottom: 16 }}
                                                state={
                                                    (matte.message || '').toLowerCase().includes('fetch') ||
                                                        (matte.message || '').toLowerCase().includes('download')
                                                        ? 'connecting'
                                                        : 'shaping'
                                                }
                                            />

                                            {/* Status & Progress Info */}
                                            <div style={{ textAlign: 'center', maxWidth: 320, width: '100%' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', color: '#000', marginBottom: 4 }}>
                                                    {matte.message || 'Extracting Subject…'}
                                                </div>
                                                <div style={{ fontSize: '0.66rem', color: '#666', marginBottom: 10 }}>
                                                    {matte.message.includes('fetch') || matte.message.includes('Downloading')
                                                        ? 'Fetching AI engine files — one time only, then kept offline.'
                                                        : 'Cutting out subject — This takes a few seconds'}
                                                </div>
                                                <div style={{ width: '100%', maxWidth: 220, height: 8, background: '#fff', border: '1.5px solid #000', margin: '0 auto', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: `${Math.max(6, Math.min(100, matte.percent))}%`,
                                                            background: '#FFE500',
                                                            transition: 'width 0.2s ease-out',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                        ON-DEVICE AI CUTOUT · 100% PRIVATE & FAST
                                    </span>
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1.5px dashed #d4d4d4' }}>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#525252', marginBottom: 8 }}>
                                            POSTERS MADE WITH TEXT BEHIND IMAGE
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                                            {[
                                                { src: '/assets/text-behind/demo-cruise-poster.webp', alt: 'Travel poster with giant CRUISE text layered behind the photo subject', eager: true },
                                                { src: '/assets/text-behind/demo-earth-poster.webp', alt: 'Earth poster with EARTH typography behind the subject — depth text effect', eager: false },
                                                { src: '/assets/text-behind/demo-portrait-poster.webp', alt: 'Portrait poster with bold text behind the person, on-device background remover cutout', eager: false },
                                                { src: '/assets/text-behind/demo-egypt-poster.webp', alt: 'Egypt travel poster with EGYPT text behind the subject', eager: false },
                                            ].map((demo) => (
                                                <NextImage
                                                    key={demo.src}
                                                    src={demo.src}
                                                    alt={demo.alt}
                                                    width={150}
                                                    height={100}
                                                    loading={demo.eager ? 'eager' : 'lazy'}
                                                    style={{ border: '1.5px solid #000', borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#a3a3a3', marginTop: 6, fontFamily: 'monospace' }}>
                                            giant type sandwiched behind your subject · free · no signup
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {bgImage && (
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
                        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)} />
                        <input ref={cutoutInputRef} type="file" accept="image/png,image/*" style={{ display: 'none' }} onChange={(e) => handleCutoutFile(e.target.files?.[0] ?? null)} />

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
                            {/* 1. Photos & Subject Cutout Card — mobile sheet: PHOTO */}
                            <div className="brutalist-card" data-ck-cat="photo" style={{ padding: 14 }}>
                                {sectionTitle(<ImagePlus size={14} />, 'Photos & Cutout')}
                                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#666', marginBottom: 10 }}>
                                    STANDARDIZED CANVAS RENDERING · 100% PRIVATE ON-DEVICE AI
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
                                        disabled={!bgImage || !!matte?.busy}
                                        onClick={() => void handleAutoCutout()}
                                    >
                                        {matte?.busy ? 'CUTTING OUT…' : '↻ RE-CUT SUBJECT'}
                                    </button>
                                </div>

                                {cutoutInfo ? (
                                    <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#16a34a', marginBottom: 8, padding: '6px 8px', background: '#f0fdf4', border: '1.5px solid #16a34a' }}>
                                        ✓ {cutoutInfo}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', marginBottom: 8 }}>
                                        {bgImage ? 'Subject cutout not generated yet.' : 'Upload a photo to extract the subject.'}
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

                                {bgImage && (
                                    <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1.5px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
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

                                        {/* Dim Target: Background Only vs. Whole Photo */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                                            <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>DIM TARGET</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => { pushUndo(); setDimWholePhoto(false); }}
                                                    style={{
                                                        padding: '3px 8px',
                                                        border: '1.5px solid #000',
                                                        background: !dimWholePhoto ? '#000' : '#fff',
                                                        color: !dimWholePhoto ? '#FFE500' : '#000',
                                                        fontSize: '0.55rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    BG ONLY
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { pushUndo(); setDimWholePhoto(true); }}
                                                    style={{
                                                        padding: '3px 8px',
                                                        border: '1.5px solid #000',
                                                        background: dimWholePhoto ? '#000' : '#fff',
                                                        color: dimWholePhoto ? '#FFE500' : '#000',
                                                        fontSize: '0.55rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    WHOLE PHOTO
                                                </button>
                                            </div>
                                        </div>

                                        {/* Photo Filter Presets */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>PHOTO COLOR GRADE</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllFilters((v) => !v)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '0 2px',
                                                        fontSize: '0.55rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        color: '#000',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    {showAllFilters ? '− LESS' : '+ MORE (6)'}
                                                </button>
                                            </div>

                                            {/* Primary 4 presets (always visible) */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                                {PHOTO_FILTER_PRESETS.slice(0, 4).map((f) => {
                                                    const isSelected = photoFilter === f.id;
                                                    return (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => { pushUndo(); setPhotoFilter(f.id); }}
                                                            style={{
                                                                padding: '5px 2px',
                                                                border: '1.5px solid #000',
                                                                background: isSelected ? '#000' : '#fff',
                                                                color: isSelected ? '#FFE500' : '#000',
                                                                fontSize: '0.52rem',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                cursor: 'pointer',
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {f.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Expanded 6 presets */}
                                            {showAllFilters && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 2 }}>
                                                    {PHOTO_FILTER_PRESETS.slice(4).map((f) => {
                                                        const isSelected = photoFilter === f.id;
                                                        return (
                                                            <button
                                                                key={f.id}
                                                                type="button"
                                                                onClick={() => { pushUndo(); setPhotoFilter(f.id); }}
                                                                style={{
                                                                    padding: '5px 2px',
                                                                    border: '1.5px solid #000',
                                                                    background: isSelected ? '#000' : '#fff',
                                                                    color: isSelected ? '#FFE500' : '#000',
                                                                    fontSize: '0.52rem',
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: 900,
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center',
                                                                }}
                                                            >
                                                                {f.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Active filter note if one of the more presets is selected while collapsed */}
                                            {!showAllFilters && PHOTO_FILTER_PRESETS.slice(4).some((p) => p.id === photoFilter) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.54rem', fontFamily: 'monospace', color: '#555', marginTop: 2 }}>
                                                    <span>ACTIVE PRESET:</span>
                                                    <span style={{ background: '#000', color: '#FFE500', padding: '1px 6px', fontWeight: 900, border: '1px solid #000' }}>
                                                        {PHOTO_FILTER_PRESETS.find((p) => p.id === photoFilter)?.label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {bgImage && (
                                    <button
                                        className="brutalist-button"
                                        style={{ width: '100%', padding: '5px 10px', fontSize: '0.6rem', marginTop: 10 }}
                                        onClick={() => setConfirmResetOpen(true)}
                                    >
                                        RESET / REMOVE PHOTO
                                    </button>
                                )}
                            </div>

                            {/* Magazine Cover & Editorial Presets Card */}
                            <div className="brutalist-card" data-ck-cat="text photo" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: editorialOpen ? 12 : 0, background: '#FAFAFA' }}>
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => setEditorialOpen(!editorialOpen)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: '0.76rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        MAGAZINE & EDITORIAL PRESETS
                                    </div>
                                    <button
                                        type="button"
                                        className="brutalist-button"
                                        style={{
                                            fontSize: '0.54rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 900,
                                            background: editorialOpen ? '#FFE500' : '#000',
                                            color: editorialOpen ? '#000' : '#FFE500',
                                            padding: '3px 8px',
                                            border: '1.5px solid #000',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        {editorialOpen ? 'COLLAPSE [-]' : '10 LOOKS [+]'}
                                    </button>
                                </div>

                                {editorialOpen && (
                                    <>
                                        <div style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'monospace', lineHeight: 1.4 }}>
                                            Transform your photo into a curated high-fashion cover, indie zine, or quiet luxury layout with matched typography, kickers & barcodes.
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                            {EDITORIAL_PRESETS_CATALOG.map((p) => {
                                                const isCurrent =
                                                    activeEditorialPreset === p.id ||
                                                    (p.id === 'zine' && activeEditorialPreset === 'skate') ||
                                                    (p.id === 'kinfolk' && activeEditorialPreset === 'old-money') ||
                                                    (p.id === 'noir' && activeEditorialPreset === 'film-noir');
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        className={`brutalist-button ck-editorial-card ${isCurrent ? 'active' : ''}`}
                                                        style={{
                                                            padding: '8px 10px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-start',
                                                            gap: 3,
                                                            textAlign: 'left',
                                                            background: isCurrent ? '#FFE500' : '#ffffff',
                                                            color: '#000000',
                                                            border: '1.5px solid #000000',
                                                            boxShadow: isCurrent ? '2px 2px 0px #000000' : 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => applyEditorialPreset(p.id)}
                                                    >
                                                        <div style={{ fontWeight: 900, fontSize: '0.66rem', letterSpacing: '0.04em', color: '#000000' }}>
                                                            {p.num} {p.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.54rem', color: isCurrent ? '#333333' : '#777777', fontFamily: 'monospace' }}>
                                                            {p.desc}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Divider */}
                                        <div style={{ height: 1, background: '#E5E7EB', margin: '3px 0' }} />

                                        {/* AI Magazine Auto-Layout Designer */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    AI AUTO-COVER
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'nowrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAutoLayout((v) => !v)}
                                                        title="AUTO-LAYOUT: keeps every element collision-free & print-aligned. A manual drag pauses it (your arrangement wins); sending an AI prompt re-engages it."
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: '0.52rem',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 900,
                                                            border: '1.5px solid #000',
                                                            background: autoLayout ? '#000' : '#FFF',
                                                            color: autoLayout ? '#FFE500' : '#000',
                                                            cursor: 'pointer',
                                                            textTransform: 'uppercase',
                                                            whiteSpace: 'nowrap',
                                                            lineHeight: 1.2,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        LAYOUT: {autoLayout ? 'ON' : 'OFF'}
                                                    </button>
                                                    <ByokButton onClick={() => setAiModalOpen(true)} />
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '0.58rem', color: '#666', fontFamily: 'monospace', lineHeight: 1.35 }}>
                                                Two engines, one design system. ASSEMBLE mirrors the pipeline: with your Gemini, OpenAI, or Groq key it first asks the AI to art-direct THIS photo (template · cluster · treatment · corners · rail — a validated menu, never raw coordinates), then assembles the full component grammar on-device — masthead, dateline, plated coverlines, side rail, badge, real EAN-13/QR, frame — under the no-overlap guarantee. No key: pure on-device fallback. Every click is a new edition.
                                            </div>

                                            {/* Style selection */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {AI_STYLE_OPTIONS.map((style) => (
                                                        <button
                                                            key={style.id}
                                                            type="button"
                                                            onClick={() => setAiStyle(style.id)}
                                                            title={style.desc}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '0.55rem',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 900,
                                                                border: '1px solid #000',
                                                                background: aiStyle === style.id ? '#000' : '#FFF',
                                                                color: aiStyle === style.id ? '#FFF' : '#000',
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                                transition: 'all 0.12s ease',
                                                            }}
                                                        >
                                                            {style.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.52rem', fontFamily: 'monospace', color: '#555', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
                                                    <span style={{ fontWeight: 900, color: '#000', background: '#EAEAEA', padding: '1px 4px', border: '1px solid #CCC' }}>
                                                        {AI_STYLE_OPTIONS.find((s) => s.id === aiStyle)?.label}
                                                    </span>
                                                    <span>{AI_STYLE_OPTIONS.find((s) => s.id === aiStyle)?.desc}</span>
                                                </div>
                                            </div>

                                            {/* Custom text — the user's exact words for the storytelling slots */}
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <input
                                                    type="text"
                                                    value={aiCustom.masthead}
                                                    onChange={(e) => setAiCustom((c) => ({ ...c, masthead: e.target.value }))}
                                                    placeholder="MASTHEAD (e.g. SUPPER)"
                                                    maxLength={14}
                                                    style={{ flex: '1 1 90px', padding: '4px 7px', fontSize: '0.55rem', fontFamily: 'monospace', border: '1px solid #000', background: '#FFF', outline: 'none', minWidth: 0 }}
                                                />
                                                <input
                                                    type="text"
                                                    value={aiCustom.coverline}
                                                    onChange={(e) => setAiCustom((c) => ({ ...c, coverline: e.target.value }))}
                                                    placeholder="COVERLINE (e.g. FRIDAY SPECIAL)"
                                                    maxLength={44}
                                                    style={{ flex: '2 1 160px', padding: '4px 7px', fontSize: '0.55rem', fontFamily: 'monospace', border: '1px solid #000', background: '#FFF', outline: 'none', minWidth: 0 }}
                                                />
                                                <input
                                                    type="text"
                                                    value={aiCustom.sub}
                                                    onChange={(e) => setAiCustom((c) => ({ ...c, sub: e.target.value }))}
                                                    placeholder="SUB LINE (optional)"
                                                    maxLength={60}
                                                    style={{ flex: '2 1 150px', padding: '4px 7px', fontSize: '0.55rem', fontFamily: 'monospace', border: '1px solid #000', background: '#FFF', outline: 'none', minWidth: 0 }}
                                                />
                                            </div>

                                            {/* Brand kit — the saved palette rides every cover (stored in ck_brandkit_v1) */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setBrandUse((v) => !v)}
                                                    title="Brand Kit palette: the accent becomes the cover's single accent ink and the AI stays inside your brand hues. Saved to your Brand Kit — the same kit invoices, watermark and quote cards read from."
                                                    style={{
                                                        padding: '3px 7px',
                                                        fontSize: '0.55rem',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 900,
                                                        border: '1px solid #000',
                                                        background: brandUse ? '#000' : '#FFF',
                                                        color: brandUse ? '#FFE500' : '#000',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    BRAND: {brandUse ? 'ON' : 'OFF'}
                                                </button>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 700 }}>
                                                    PRIMARY
                                                    <input
                                                        type="color"
                                                        value={brandPrimary || '#000000'}
                                                        onChange={(e) => patchBrandColors(e.target.value, brandAccent)}
                                                        style={{ width: 22, height: 20, padding: 0, border: '1px solid #000', background: 'none', cursor: 'pointer' }}
                                                    />
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.55rem', fontFamily: 'monospace', fontWeight: 700 }}>
                                                    ACCENT
                                                    <input
                                                        type="color"
                                                        value={brandAccent || '#E8590C'}
                                                        onChange={(e) => patchBrandColors(brandPrimary, e.target.value)}
                                                        style={{ width: 22, height: 20, padding: 0, border: '1px solid #000', background: 'none', cursor: 'pointer' }}
                                                    />
                                                </label>
                                            </div>

                                            {/* Prompt / Vibe input + Clean Two-Button Flow */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input
                                                        type="text"
                                                        value={aiPrompt}
                                                        onChange={(e) => setAiPrompt(e.target.value)}
                                                        placeholder="Vibe / Theme (e.g. Editorial fashion, cinematic trenchcoat, indie zine)..."
                                                        style={{
                                                            flex: 1,
                                                            padding: '7px 10px',
                                                            fontSize: '0.64rem',
                                                            fontFamily: 'monospace',
                                                            border: '1.5px solid #000',
                                                            background: '#FFF',
                                                            outline: 'none',
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !aiGenerating && !aiAnalyzing) {
                                                                e.preventDefault();
                                                                handleAssembleSystemCover();
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleAssembleSystemCover}
                                                        disabled={aiAnalyzing || aiGenerating}
                                                        title="ANALYZE & ASSEMBLE: AI analyzes the photo (subject, mood, negative space) and assembles the cover edition mathematically with zero overlap."
                                                        className="brutalist-button"
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: '#FFF',
                                                            color: '#000',
                                                            border: '1.5px solid #000',
                                                            fontWeight: 900,
                                                            fontSize: '0.66rem',
                                                            fontFamily: 'monospace',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 6,
                                                            cursor: aiAnalyzing ? 'wait' : 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {aiAnalyzing ? '◉ ANALYZING & ASSEMBLING…' : '⚙ ANALYZE & ASSEMBLE'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAiRefineCopy}
                                                        disabled={aiAnalyzing || aiGenerating}
                                                        title="REWRITE WORDS: AI copy desk rewrites only the words (headlines, coverlines, teasers) tailored to your photo while preserving every position and treatment."
                                                        className="brutalist-button"
                                                        style={{
                                                            padding: '8px 12px',
                                                            background: '#FFF',
                                                            color: '#000',
                                                            border: '1.5px solid #000',
                                                            fontWeight: 900,
                                                            fontSize: '0.66rem',
                                                            fontFamily: 'monospace',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 6,
                                                            cursor: aiGenerating ? 'wait' : 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {aiGenerating ? '✦ REWRITING WORDS…' : '✦ REWRITE WORDS'}
                                                    </button>
                                                </div>

                                                {aiSemantics && (
                                                    <div style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.35, padding: '2px 0' }}>
                                                        ◉ {aiSemantics.summary || 'photo analyzed'} → <b>{(aiSemantics.genre || 'auto').toUpperCase()}</b>
                                                        {aiSemantics.mood?.length ? ` · ${aiSemantics.mood.join(' · ')}` : ''}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.52rem', fontFamily: 'monospace', color: '#666', lineHeight: 1.45 }}>
                                                    <span><b style={{ color: '#000' }}>1 · ANALYZE & ASSEMBLE</b> — AI art-directs from your photo’s mood & calm zones, then the deterministic solver places every element mathematically with zero overlap.</span>
                                                    <span><b style={{ color: '#000' }}>2 · REWRITE WORDS</b> — AI copy desk rewrites the headlines & teasers to match your photo’s exact story. Coordinates and plates stay locked.</span>
                                                </div>
                                            </div>
                                            {/* LIVE AI ART-DIRECTION & SOLVER THOUGHT STREAM */}
                                            {(thoughtState.active || thoughtState.summary) && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        padding: '8px 10px',
                                                        background: '#FFFFFF',
                                                        border: '1.5px solid #000',
                                                        boxShadow: '2px 2px 0px #000',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', fontWeight: 900, fontFamily: 'monospace' }}>
                                                            <div
                                                                style={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    background: thoughtState.active ? '#FFE500' : '#10B981',
                                                                    border: '1px solid #000',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <span>
                                                                {thoughtState.active
                                                                    ? `THOUGHT STREAM • STEP ${thoughtState.currentStep}/${thoughtState.totalSteps}`
                                                                    : 'SOLVER TELEMETRY'}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, color: '#555' }}>
                                                            ⏱ {(thoughtState.elapsedMs / 1000).toFixed(1)}s
                                                        </span>
                                                    </div>

                                                    {/* Step Pills */}
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {(thoughtState.mode === 'rewrite'
                                                            ? ['1·ROLES', '2·VOICE', '3·BUDGETS', '4·VERIFY']
                                                            : ['1·SCAN', '2·VISION', '3·ARCHETYPE', '4·DIRECTION', '5·SOLVER']
                                                        ).map((label, idx) => {
                                                            const stepNum = idx + 1;
                                                            const isDone = !thoughtState.active || thoughtState.currentStep > stepNum;
                                                            const isCurrent = thoughtState.active && thoughtState.currentStep === stepNum;
                                                            return (
                                                                <span
                                                                    key={label}
                                                                    style={{
                                                                        fontSize: '0.48rem',
                                                                        fontFamily: 'monospace',
                                                                        fontWeight: 900,
                                                                        padding: '2px 5px',
                                                                        border: '1px solid #000',
                                                                        background: isCurrent ? '#FFE500' : isDone ? '#000' : '#F3F4F6',
                                                                        color: isCurrent ? '#000' : isDone ? '#FFF' : '#777',
                                                                    }}
                                                                >
                                                                    {label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Active Thought Line */}
                                                    <div style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: '#222', lineHeight: 1.35 }}>
                                                        {thoughtState.items.length > 0 ? (
                                                            <>
                                                                <b style={{ color: '#000' }}>▶ {thoughtState.items[thoughtState.items.length - 1].label}:</b>{' '}
                                                                {thoughtState.items[thoughtState.items.length - 1].detail}
                                                            </>
                                                        ) : (
                                                            'Drafting bespoke editorial copy...'
                                                        )}
                                                    </div>

                                                    {/* Result Chips */}
                                                    {thoughtState.summary && (
                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, paddingTop: 4, borderTop: '1px dashed #CCC' }}>
                                                            {thoughtState.mode === 'rewrite' ? (
                                                                <>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', fontWeight: 900, background: '#FFE500', color: '#000', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        COPY DESK REWRITE
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#F3F4F6', color: '#000', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        {layers.length} ELEMENTS REWORDED
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#DCFCE7', color: '#166534', padding: '1px 4px', border: '1px solid #166534', fontWeight: 900 }}>
                                                                        0 COLLISIONS
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#F3F4F6', color: '#555', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        {thoughtState.summary.durationSec}s
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', fontWeight: 900, background: '#FFE500', color: '#000', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        {thoughtState.summary.archetype}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#F3F4F6', color: '#000', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        {thoughtState.summary.genre}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#F3F4F6', color: '#000', padding: '1px 4px', border: '1px solid #000' }}>
                                                                        DEPTH: {thoughtState.summary.depth?.toUpperCase()}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', background: '#DCFCE7', color: '#166534', padding: '1px 4px', border: '1px solid #166534', fontWeight: 900 }}>
                                                                        0 COLLISIONS
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {solverReport && (
                                                <div style={{ fontSize: '0.52rem', fontFamily: 'monospace', color: '#444', padding: '4px 6px', border: '1px dashed #999', background: '#fafafa' }}>
                                                    ⚙ SOLVER: {solverReport}
                                                </div>
                                            )}

                                            {aiError && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: '#FEE2E2', border: '1px solid #DC2626', color: '#991B1B', fontSize: '0.6rem', fontFamily: 'monospace' }}>
                                                    <AlertTriangle size={12} />
                                                    <span style={{ flex: 1 }}>{aiError}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAiModalOpen(true)}
                                                        style={{ textDecoration: 'underline', fontWeight: 900, background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontSize: '0.6rem' }}
                                                    >
                                                        Configure Key
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
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

                            {/* 4. Advanced Image Editing — visible naturally on desktop.
                                Mobile sheets: SHAPES (shape UI) + EFFECTS (film grain). */}
                            <div className="brutalist-card" data-ck-cat="shapes effects" style={{ padding: 14 }}>
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
                                        <div className="ck-cat-shapeui" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 6 }}>
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
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('barcode')}
                                                title="Authentic magazine retail barcode"
                                            >
                                                <Barcode size={11} /> BARCODE
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('qr')}
                                                title="Real scannable QR code (paste any link as its content)"
                                            >
                                                <QrCode size={11} /> QR CODE
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('badge')}
                                                title="Editorial issue dateline badge"
                                            >
                                                <Tag size={11} /> BADGE
                                            </button>
                                            <button
                                                type="button"
                                                className="brutalist-button"
                                                style={{ padding: '8px 4px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                                onClick={() => addShape('frame')}
                                                title="Magazine bleed frame"
                                            >
                                                <Frame size={11} /> FRAME
                                            </button>
                                        </div>

                                        {/* Shape pills */}
                                        {shapes.length > 0 && (
                                            <div className="ck-cat-shapeui" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {shapes.map((s, index) => {
                                                    const isActive = s.id === activeShapeId;
                                                    const kindLabel = s.kind === 'rect' ? 'RECT' : s.kind === 'line' ? 'LINE' : s.kind === 'beam' ? 'BEAM' : s.kind === 'circle' ? 'CIRCLE' : s.kind === 'button' ? 'BUTTON' : s.kind === 'barcode' ? 'BARCODE' : s.kind === 'badge' ? 'BADGE' : s.kind === 'qr' ? 'QR' : s.kind === 'frame' ? 'FRAME' : 'ICON';
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
                                            <div className="ck-cat-shapeui" style={{ border: '2px solid #000', background: '#fafafa', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.66rem' }}>
                                                        {activeShape.kind === 'rect' ? 'RECTANGLE' : activeShape.kind === 'line' ? 'LINE' : activeShape.kind === 'beam' ? 'LIGHT BEAM' : activeShape.kind === 'circle' ? 'CIRCLE' : activeShape.kind === 'button' ? 'BUTTON' : activeShape.kind === 'barcode' ? 'BARCODE' : activeShape.kind === 'badge' ? 'EDITORIAL BADGE' : activeShape.kind === 'qr' ? 'QR CODE' : activeShape.kind === 'frame' ? 'MAGAZINE FRAME' : 'ICON'}
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

                                                {/* Label editor (button, badge, barcode) */}
                                                {(activeShape.kind === 'button' || activeShape.kind === 'badge' || activeShape.kind === 'barcode' || activeShape.kind === 'qr') && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, color: '#555' }}>
                                                            {activeShape.kind === 'button' ? 'BUTTON LABEL' : activeShape.kind === 'badge' ? 'BADGE TEXT' : activeShape.kind === 'qr' ? 'QR CONTENT (LINK / TEXT)' : 'BARCODE NUMBER'}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={activeShape.label ?? ''}
                                                            onChange={(e) => patchActiveShape({ label: e.target.value })}
                                                            placeholder={activeShape.kind === 'barcode' ? '9771234567003 (9–13 digits → real EAN-13)' : activeShape.kind === 'qr' ? 'https://your-link.com (encoded for real)' : activeShape.kind === 'badge' ? 'ISSUE N° 04 • FALL 2026' : 'NEXT · SWIPE · LINK IN BIO'}
                                                            maxLength={36}
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

                                        {/* Film grain overlay — mobile sheet: EFFECTS */}
                                        <div className="ck-cat-grain" style={{ borderTop: '1.5px solid #eee', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

                            {/* 5. Export Card — mobile sheet: NEXT (sits below advanced image editing) */}
                            <div className="brutalist-card" data-ck-cat="next" style={{ padding: 14 }}>
                                {sectionTitle(<Download size={14} />, 'Export Poster')}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                                    <button className="brutalist-button brutalist-button-primary" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('png', 1)}>
                                        PNG · NATIVE
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('png', 2)}>
                                        PNG · 2×
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('jpg', 1)}>
                                        JPG · NATIVE
                                    </button>
                                    <button className="brutalist-button" style={{ padding: '8px 6px', fontSize: '0.7rem' }} disabled={!bgImage || exporting} onClick={() => handleExport('jpg', 2)}>
                                        JPG · 2×
                                    </button>
                                    <button
                                        className="brutalist-button"
                                        style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }}
                                        disabled={!bgImage || exporting || sendingHandoff}
                                        onClick={() => setHandoffModalOpen(true)}
                                    >
                                        → OPEN IN THUMBNAIL LAB (NO DOWNLOAD)
                                    </button>
                                </div>
                                {exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#B45309' }}>RENDERING…</div>}
                                {exportNote && !exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{exportNote}</div>}

                                {/* NEXT → hand-off row (docs/TOOL_INTEGRATION_PLAN.md §4.3) */}
                                {exportNote && !exporting && (
                                    <NextStepRow currentHref="/text-behind" heading="Poster saved — keep going" />
                                )}
                                {!cutoutImage && bgImage && (
                                    <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                                        No cutout uploaded — text renders on top of photo. Add a transparent PNG for the behind-subject effect.
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
                    { id: 'photo', label: 'Photo', icon: <ImagePlus size={15} /> },
                    { id: 'text', label: 'Text', icon: <TypeIcon size={15} /> },
                    { id: 'shapes', label: 'Shapes', icon: <Square size={15} /> },
                    { id: 'effects', label: 'Effects', icon: <Layers size={15} /> },
                    { id: 'next', label: 'Next', icon: <Download size={15} /> },
                ]}
                active={activeSheet}
                onSelect={(id) => {
                    setActiveSheet(id as keyof typeof MOBILE_SHEET_LABELS | null);
                    // The Advanced card hosts both SHAPES and EFFECTS — make
                    // sure its content is expanded when either sheet opens.
                    if (id === 'shapes' || id === 'effects') setAdvancedOpen(true);
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
                /* Editorial Presets Cards — clean hover without blackouts */
                .ck-editorial-card {
                    background: #ffffff !important;
                    color: #000000 !important;
                    transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease !important;
                }
                .ck-editorial-card:hover {
                    background: #f4f4f5 !important;
                    color: #000000 !important;
                }
                .ck-editorial-card.active {
                    background: #FFE500 !important;
                    color: #000000 !important;
                }
                .ck-editorial-card.active:hover {
                    background: #FFE500 !important;
                    color: #000000 !important;
                }

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
                    /* Phase-6 Canva pattern — desktop never sees the bar, sheet header or backdrop */
                    .ck-mobile-editor-toolbar,
                    .text-behind-sheet-head,
                    .text-behind-sheet-backdrop {
                        display: none !important;
                    }
                }
                @media (min-width: 981px) and (max-width: 1240px) {
                    .text-behind-layout {
                        grid-template-columns: minmax(0, 1fr) 375px !important;
                        gap: 10px !important;
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
                    /* Canvas-first stage: the poster fills the whole screen and
                       NEVER sits under the bottom category bar (Phase 6). */
                    .text-behind-viewport {
                        flex: 1 1 auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        position: relative !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin: 0 !important;
                        border: none !important;
                        width: 100% !important;
                        height: 100% !important;
                        background-size: 16px 16px !important;
                        /* Reserve the toolbar lane — canvas never touches the bar */
                        padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
                        box-sizing: border-box !important;
                    }
                    .text-behind-stage {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 100% !important;
                    }
                    .text-behind-viewport canvas {
                        max-width: calc(100% - 14px) !important;
                        max-height: calc(100% - 14px) !important;
                        width: auto !important;
                        height: auto !important;
                    }
                    .ck-thought-hud-container {
                        top: 6px !important;
                        left: 8px !important;
                        right: 8px !important;
                        max-width: calc(100vw - 16px) !important;
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
                    /* Dense categories get the tall sheet, leaving headroom for live canvas feedback */
                    .ck-sheet-text .text-behind-controls-scroll,
                    .ck-sheet-shapes .text-behind-controls-scroll {
                        height: min(78vh, 680px) !important;
                        max-height: min(78vh, 680px) !important;
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
                    .ck-sheet-photo .text-behind-desktop-cards > [data-ck-cat~='photo'],
                    .ck-sheet-next .text-behind-desktop-cards > [data-ck-cat~='next'] {
                        display: block !important;
                    }
                    .ck-sheet-text .text-behind-desktop-cards > [data-ck-cat~='text'],
                    .ck-sheet-shapes .text-behind-desktop-cards > [data-ck-cat~='shapes'],
                    .ck-sheet-effects .text-behind-desktop-cards > [data-ck-cat~='effects'] {
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    /* The Advanced card is shared by SHAPES and EFFECTS — split them */
                    .ck-sheet-shapes .ck-cat-grain {
                        display: none !important;
                    }
                    .ck-sheet-effects .ck-cat-shapeui {
                        display: none !important;
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
            <ByokModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} initialProvider="gemini" />
        </div>
    );
}
