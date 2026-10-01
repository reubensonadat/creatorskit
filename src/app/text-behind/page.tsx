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
import { ImagePlus, Scissors, Download, SlidersHorizontal, Type as TypeIcon, Plus, Copy, Trash2, Search, X, UploadCloud, AlertTriangle, Eye, LayoutTemplate, Home } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { ALL_TOOLS } from '@/data/tools';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { GOOGLE_FONTS_LIST, getGoogleFontsStylesheetUrl } from '@/app/match-cut/google-fonts';
import { TactileScrubber } from '@/components/tactile-scrubber';
import {
    removeBackgroundBrowser,
    standardizeSourceImage,
    BROWSER_MODELS,
    prewarmBackgroundEngine,
    type MatteEngine,
    type MatteProgress,
    type BrowserModel,
} from '@/lib/background-removal';

import { putHandoffImage, takeHandoffImage } from '@/lib/tool-handoff';

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

const SETTINGS_KEY = 'ck_text_behind_v6';

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

    /** Mobile studio mode (bouquet-style): 'stage' = full-bleed canvas,
     * 'sidebar' = full-screen controls. Never split-screen — the artwork is
     * either fully visible or the controls fully own the screen. */
    const [mobileStudioTab, setMobileStudioTab] = useState<'stage' | 'sidebar'>('stage');
    /** CreatorKit tools navigation drawer (bouquet-style slide-out) */
    const [toolsOpen, setToolsOpen] = useState(false);
    const [toolSearch, setToolSearch] = useState('');
    /** Guard: require explicit confirmation before wiping the user's photos */
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);

    const filteredTools = useMemo(() => {
        const q = toolSearch.trim().toLowerCase();
        if (!q) return ALL_TOOLS;
        return ALL_TOOLS.filter((t) => `${t.label} ${t.desc} ${t.hint}`.toLowerCase().includes(q));
    }, [toolSearch]);

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

    const patchActiveLayer = useCallback((patch: Partial<TextLayer>) => {
        setLayers((prev) =>
            prev.map((l) => (l.id === activeLayerId ? { ...l, ...patch } : l))
        );
    }, [activeLayerId]);

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

    /** Metrics for each text layer — powers multi-layer hit testing & dragging. */
    const metricsRef = useRef<Record<string, TextMetrics>>({});
    const dragRef = useRef<{ active: boolean; layerId: string; movedPx: number; ox: number; oy: number } | null>(null);

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
            const rawCutout = await removeBackgroundBrowser(source, onProgress, 'isnet_quint8');
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

            // 1. Behind text layers
            metricsRef.current = {};
            layers.filter((l) => l.depth === 'behind').forEach(drawSingleLayer);

            // 2. Cutout PNG
            drawCutout();

            // 3. Front text layers
            layers.filter((l) => l.depth === 'front').forEach(drawSingleLayer);

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
            }
        },
        [bgImage, cutoutImage, layers, activeLayerId, guides, bgDim]
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

    const hitTestLayers = (x: number, y: number): string | null => {
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
            const pad = m.fontPx * 0.35;
            if (Math.abs(rx) <= m.w / 2 + pad && Math.abs(ry) <= m.h / 2 + pad) {
                return l.id;
            }
        }
        return null;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!bgImage) return;
        const p = canvasPoint(e);
        const hitId = hitTestLayers(p.x, p.y);
        if (!hitId) return;

        setActiveLayerId(hitId);
        const m = metricsRef.current[hitId];
        if (!m) return;
        dragRef.current = { active: true, layerId: hitId, movedPx: 0, ox: m.cx - p.x, oy: m.cy - p.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!bgImage) return;
        const p = canvasPoint(e);
        const drag = dragRef.current;
        if (!drag?.active) {
            setHoveringLayerId(hitTestLayers(p.x, p.y));
            return;
        }

        drag.movedPx += 1;
        const W = canvasRef.current!.width;
        const H = canvasRef.current!.height;
        let nx = (p.x + drag.ox) / W;
        let ny = (p.y + drag.oy) / H;

        // Snap guides: center + thirds
        const tol = 0.008;
        let snapV: number | null = null;
        let snapH: number | null = null;
        for (const c of [0.5, 1 / 3, 2 / 3]) {
            if (Math.abs(nx - c) < tol) { nx = c; snapV = c; }
            if (Math.abs(ny - c) < tol) { ny = c; snapH = c; }
        }
        setGuides((prev) => (prev.v === snapV && prev.h === snapH ? prev : { v: snapV, h: snapH }));
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
            className={`text-behind-root${mobileStudioTab === 'sidebar' ? ' mode-sidebar' : ''}`}
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
                    <button
                        type="button"
                        className="brutalist-button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: '0.66rem' }}
                        onClick={() => setToolsOpen(true)}
                        title="Open CreatorKit Tools Menu"
                    >
                        <LayoutTemplate size={14} />
                        <span>TOOLS</span>
                    </button>
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
                            {bgImage ? (
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
                                            {/* Shimmering Skeleton of the image */}
                                            <div
                                                className="ck-skeleton-box"
                                                style={{
                                                    width: Math.min(260, canvasW ? Math.round((canvasW / Math.max(canvasW, canvasH)) * 220) : 200),
                                                    height: Math.min(260, canvasH ? Math.round((canvasH / Math.max(canvasW, canvasH)) * 220) : 200),
                                                    backgroundColor: '#e5e7eb',
                                                    border: '2px solid #000',
                                                    boxShadow: '4px 4px 0 #000',
                                                    borderRadius: 12,
                                                    marginBottom: 16,
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <div className="ck-skeleton-shimmer" />
                                                <Scissors size={32} style={{ color: '#000', zIndex: 2 }} />
                                            </div>

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
                                                { src: '/assets/text-behind/demo-cruise-poster.jpg', alt: 'Travel poster with giant CRUISE text layered behind the photo subject' },
                                                { src: '/assets/text-behind/demo-earth-poster.jpg', alt: 'Earth poster with EARTH typography behind the subject — depth text effect' },
                                                { src: '/assets/text-behind/demo-portrait-poster.jpg', alt: 'Portrait poster with bold text behind the person, on-device background remover cutout' },
                                                { src: '/assets/text-behind/demo-egypt-poster.jpg', alt: 'Egypt travel poster with EGYPT text behind the subject' },
                                            ].map((demo) => (
                                                <NextImage
                                                    key={demo.src}
                                                    src={demo.src}
                                                    alt={demo.alt}
                                                    width={150}
                                                    height={100}
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
                            <div className="text-behind-meta-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px 6px', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, color: '#666' }}>
                                    {canvasW} × {canvasH}px · Active: #{layers.findIndex((l) => l.id === activeLayerId) + 1} ({activeLayer.depth.toUpperCase()})
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

                        {/* Mobile sidebar header (mobile only) — context + jump back to the stage */}
                        <div className="text-behind-drawer-bar">
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.04em' }}>
                                POSTER CONTROLS · {layers.length} TEXT {layers.length === 1 ? 'BOX' : 'BOXES'}
                            </span>
                            <button type="button" onClick={() => setMobileStudioTab('stage')}>
                                <Eye size={13} />
                                <span>VIEW</span>
                            </button>
                        </div>

                        {/* Desktop Continuous Cards Column */}
                        <div className="text-behind-desktop-cards">
                            {/* 1. Photos & Subject Cutout Card */}
                            <div className="brutalist-card" style={{ padding: 14 }}>
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
                                    <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1.5px solid #eee' }}>
                                        <TactileScrubber
                                            label="BACKGROUND DIM"
                                            value={Math.round(bgDim * 100)}
                                            min={0}
                                            max={85}
                                            step={5}
                                            onChange={(v) => setBgDim(v / 100)}
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

                            {/* 2. Text Boxes & Typography Card */}
                            <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

                            {/* 3. Style Presets, Blends & Geometry Card */}
                            <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
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

                            {/* 4. Export Card */}
                            <div className="brutalist-card" style={{ padding: 14 }}>
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

            {/* Mobile floating mode pill (bouquet-studio style): stage ⇄ sidebar.
                Never covers the canvas in stage mode; sits above the controls
                in sidebar mode so the latest change is one tap away. */}
            <button
                type="button"
                className="text-behind-edit-fab"
                onClick={() => setMobileStudioTab((t) => (t === 'stage' ? 'sidebar' : 'stage'))}
            >
                {mobileStudioTab === 'stage' ? (
                    <>
                        <SlidersHorizontal size={14} />
                        <span>{bgImage ? 'EDIT POSTER' : 'START EDITING'}</span>
                    </>
                ) : (
                    <>
                        <Eye size={14} />
                        <span>VIEW POSTER</span>
                    </>
                )}
            </button>

            {/* ── CreatorKit Tools Navigation Drawer (bouquet-style slide-out) ── */}
            {toolsOpen && (
                <>
                    <div className="text-behind-tools-backdrop" onClick={() => setToolsOpen(false)} />
                    <aside className="text-behind-tools-drawer">
                        <div className="text-behind-tools-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                                    CREATORKIT TOOLS
                                </span>
                                <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', padding: '2px 6px', background: '#000', color: '#fff', fontWeight: 700 }}>
                                    {ALL_TOOLS.length}
                                </span>
                            </div>
                            <button type="button" onClick={() => setToolsOpen(false)} title="Close drawer">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="text-behind-tools-search">
                            <Link href="/" onClick={() => setToolsOpen(false)} className="text-behind-tools-home">
                                <Home size={14} />
                                <span>CREATORKIT HOME</span>
                                <span style={{ fontSize: '0.55rem', color: '#d4d4d4' }}>HUB</span>
                            </Link>
                            <div style={{ position: 'relative' }}>
                                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
                                <input
                                    type="text"
                                    value={toolSearch}
                                    onChange={(e) => setToolSearch(e.target.value)}
                                    placeholder="Filter tools..."
                                    className="text-behind-tools-input"
                                />
                            </div>
                        </div>
                        <div className="text-behind-tools-list">
                            {filteredTools.map((tool) => (
                                <Link
                                    key={tool.href}
                                    href={tool.href}
                                    onClick={() => setToolsOpen(false)}
                                    className={`text-behind-tool-item${tool.href === '/text-behind' ? ' active' : ''}`}
                                >
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700 }}>{tool.label}</span>
                                    <span style={{ fontSize: '0.55rem' }}>{tool.desc}</span>
                                    <span className="text-behind-tool-hint">{tool.hint}</span>
                                </Link>
                            ))}
                        </div>
                    </aside>
                </>
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
                                    background: canvasW >= canvasH ? '#FFE500' : '#fff',
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
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#FFE500', padding: '2px 6px' }}>
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
                                    background: canvasW < canvasH ? '#FFE500' : '#fff',
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
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#FFE500', padding: '2px 6px' }}>
                                        ★ MATCHES RATIO
                                    </span>
                                )}
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
                /* ── CreatorKit tools navigation drawer (bouquet-style slide-out) ── */
                .text-behind-tools-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    z-index: 70;
                }
                .text-behind-tools-drawer {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    width: min(340px, 100vw);
                    background: #fff;
                    border-right: 2px solid #000;
                    z-index: 71;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.25);
                    animation: ckToolsSlideIn 0.2s ease-out;
                }
                @keyframes ckToolsSlideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .text-behind-tools-head {
                    height: 44px;
                    padding: 0 12px;
                    background: #fafafa;
                    border-bottom: 2px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }
                .text-behind-tools-head > button {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    border: 1.5px solid #000;
                    cursor: pointer;
                }
                .text-behind-tools-search {
                    padding: 12px;
                    border-bottom: 2px solid #000;
                    background: #fafafa;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .text-behind-tools-home {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: space-between;
                    padding: 8px 10px;
                    background: #000;
                    color: #fff;
                    border: 1.5px solid #000;
                    font-family: monospace;
                    font-size: 0.68rem;
                    font-weight: 900;
                    letter-spacing: 0.05em;
                    box-shadow: 2px 2px 0 #000;
                    text-decoration: none;
                }
                .text-behind-tools-input {
                    width: 100%;
                    padding: 8px 10px 8px 30px;
                    border: 1.5px solid #000;
                    background: #fff;
                    font-family: monospace;
                    font-size: 0.72rem;
                    outline: none;
                    box-sizing: border-box;
                }
                .text-behind-tools-list {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .text-behind-tool-item {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    grid-template-areas: 'label hint' 'desc hint';
                    column-gap: 8px;
                    padding: 10px;
                    border: 2px solid #e7e5e4;
                    background: #fff;
                    text-decoration: none;
                    color: #000;
                    align-items: center;
                }
                .text-behind-tool-item span:nth-child(1) { grid-area: label; }
                .text-behind-tool-item span:nth-child(2) { grid-area: desc; color: #78716c; line-height: 1.3; }
                .text-behind-tool-item:hover { border-color: #000; background: #fafafa; }
                .text-behind-tool-item.active {
                    background: #000;
                    color: #fff;
                    border-color: #000;
                    box-shadow: 2px 2px 0 #000;
                }
                .text-behind-tool-item.active span:nth-child(2) { color: #d4d4d4; }
                .text-behind-tool-hint {
                    grid-area: hint;
                    font-family: monospace;
                    font-size: 0.55rem;
                    font-weight: 700;
                    padding: 3px 6px;
                    background: #f5f5f4;
                    color: #57534e;
                    align-self: start;
                    white-space: nowrap;
                }
                .text-behind-tool-item.active .text-behind-tool-hint {
                    background: #fff;
                    color: #000;
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
                    .text-behind-edit-fab,
                    .text-behind-drawer-bar {
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
                    /* Canvas-first hero: the poster fills the whole screen while
                       the drawer is closed — see everything, uninterrupted. */
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
                    }
                    .text-behind-viewport canvas {
                        max-width: 100% !important;
                        max-height: 100% !important;
                        width: auto !important;
                        height: auto !important;
                    }
                    /* Bouquet-faithful: in sidebar mode the controls own the
                       ENTIRE screen — the canvas is never partially covered by
                       a differently-colored panel. One tap on VIEW POSTER
                       shows the change full-screen. */
                    .text-behind-root.mode-sidebar .text-behind-viewport {
                        display: none !important;
                    }
                    .text-behind-meta-strip {
                        display: none !important;
                    }
                    /* Full control column: hidden until the drawer opens, then a
                       complete scrollable panel — the SAME controls as desktop. */
                    .text-behind-controls-scroll {
                        display: none !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll {
                        display: flex !important;
                        flex: 1 1 auto !important;
                        min-height: 0 !important;
                        height: auto !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        padding: 0 12px 32px !important;
                        padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
                        background: #fff !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll::-webkit-scrollbar-thumb {
                        background: #000;
                    }
                    .text-behind-desktop-cards {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                    .text-behind-desktop-cards .brutalist-card {
                        padding: 14px 12px !important;
                    }
                    /* ---- Touch sizing: every control a real finger target ---- */
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll button {
                        font-size: 0.78rem !important;
                        min-height: 42px !important;
                        max-width: 100% !important;
                        padding: 8px 12px !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll button svg {
                        width: 16px !important;
                        height: 16px !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll input[type='text'],
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll input[type='number'],
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll textarea {
                        font-size: 1rem !important; /* 16px stops iOS focus-zoom */
                        min-height: 46px !important;
                        box-sizing: border-box !important;
                        max-width: 100% !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll input[type='range'] {
                        min-height: 44px !important;
                        height: 44px !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll input[type='color'] {
                        width: 44px !important;
                        height: 44px !important;
                        min-width: 44px !important;
                        border: 2px solid #000 !important;
                        padding: 2px !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll select {
                        font-size: 0.95rem !important;
                        min-height: 44px !important;
                        padding: 10px !important;
                    }
                    /* Dense desktop chip-grids -> roomy phone grids
                       (inline styles are beaten by !important + attribute selectors) */
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll div[style*='repeat(5,'] {
                        grid-template-columns: repeat(3, 1fr) !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-controls-scroll div[style*='repeat(4,'] {
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
                    /* Sticky sidebar header bar with VIEW button */
                    .text-behind-root.mode-sidebar .text-behind-drawer-bar {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 30 !important;
                        background: #fff !important;
                        border-bottom: 2px solid #000 !important;
                        margin: 0 -12px 10px !important;
                        padding: 10px 14px !important;
                        flex-shrink: 0 !important;
                    }
                    .text-behind-drawer-bar button {
                        display: inline-flex !important;
                        align-items: center !important;
                        gap: 6px !important;
                        background: #000 !important;
                        color: #fff !important;
                        border: 2px solid #000 !important;
                        font-family: monospace !important;
                        font-weight: 900 !important;
                        font-size: 0.68rem !important;
                        letter-spacing: 0.06em !important;
                        padding: 6px 12px !important;
                        cursor: pointer !important;
                    }
                    /* Floating EDIT trigger — bouquet-studio style */
                    .text-behind-edit-fab {
                        display: flex !important;
                        position: fixed !important;
                        bottom: calc(18px + env(safe-area-inset-bottom, 0px)) !important;
                        left: 50% !important;
                        transform: translateX(-50%) !important;
                        z-index: 60 !important;
                        align-items: center !important;
                        gap: 8px !important;
                        background: #000 !important;
                        color: #fff !important;
                        border: 2px solid #000 !important;
                        box-shadow: 3px 3px 0 #000, 0 10px 24px rgba(0, 0, 0, 0.35) !important;
                        font-family: monospace !important;
                        font-weight: 900 !important;
                        font-size: 0.78rem !important;
                        letter-spacing: 0.06em !important;
                        padding: 12px 22px !important;
                        cursor: pointer !important;
                        white-space: nowrap !important;
                    }
                    .text-behind-root.mode-sidebar .text-behind-edit-fab {
                        z-index: 65 !important;
                    }
                }
            `}</style>
        </div>
    );
}
