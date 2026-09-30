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
import Link from 'next/link';
import { ImagePlus, Scissors, Download, Layers, Type as TypeIcon, Plus, Copy, Trash2, Search, X } from 'lucide-react';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { GOOGLE_FONTS_LIST, getGoogleFontsStylesheetUrl } from '@/app/match-cut/google-fonts';
import { TactileScrubber } from '@/components/tactile-scrubber';
import {
    removeBackgroundBrowser,
    removeBackgroundServer,
    type MatteEngine,
    type MatteProgress,
} from '@/lib/background-removal';
import { putHandoffImage } from '@/lib/tool-handoff';

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

// --- Refresh-safe persistence: images in IndexedDB, layers in localStorage
const CUTOUT_MODE_KEY = 'ck_text_behind_cutout_mode_v1';
type CutoutMode = 'manual' | 'browser' | 'server';

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

    /** Which way the user builds the cutout layer — drives the Photos card UI. */
    const [cutoutMode, setCutoutMode] = useState<CutoutMode>('browser');

    // --- multiple text layers -----------------------------------------------
    const [layers, setLayers] = useState<TextLayer[]>([DEFAULT_TEXT_LAYER]);
    const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_TEXT_LAYER.id);

    const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0] ?? DEFAULT_TEXT_LAYER;

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

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const cutoutInputRef = useRef<HTMLInputElement>(null);
    /** The raw background file/blob — the auto-cutout engines take it as input. */
    const bgFileRef = useRef<File | Blob | null>(null);
    /** Latest auto-cut runner + mode, so ANY intake (button, drop) can kick the cutout. */
    const autoCutRef = useRef<{ run: (engine: MatteEngine) => void; mode: CutoutMode }>({
        run: () => {},
        mode: 'browser',
    });
    const [dropActive, setDropActive] = useState(false);

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
            const savedMode = localStorage.getItem(CUTOUT_MODE_KEY);
            if (savedMode === 'manual' || savedMode === 'browser' || savedMode === 'server') {
                setCutoutMode(savedMode);
            }
        } catch { /* use default */ }
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
            localStorage.setItem(CUTOUT_MODE_KEY, cutoutMode);
        } catch { /* non-fatal */ }
    }, [cutoutMode]);

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
            const img = await loadImage(file);
            bgFileRef.current = file;
            setBgImage(img);
            setBgInfo(`${img.naturalWidth} × ${img.naturalHeight}px`);
            void idbPut('bg', file);
            // SEAMLESS: in auto modes the cutout starts the instant the photo
            // lands — no second click (drop or upload, both roads lead here).
            const { run, mode } = autoCutRef.current;
            if (mode !== 'manual') run(mode === 'server' ? 'server' : 'browser');
        } catch {
            setBgInfo('Could not open that file.');
        }
    }, []);

    const handleCutoutFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            const img = await loadImage(file);
            setCutoutImage(img);
            setCutoutInfo(`${img.naturalWidth} × ${img.naturalHeight}px · YOUR PNG`);
            void idbPut('cutout', file);
        } catch {
            setCutoutInfo('Could not open that cutout PNG.');
        }
    }, []);

    /**
     * AUTO CUTOUT — runs the background photo through a matting engine and
     * drops the transparent PNG straight into the sandwich's cutout layer.
     * BROWSER = @imgly WASM on the user's CPU (recommended, free);
     * SERVER = worker /matte, rembg u2netp (any subject, any machine).
     */
    const handleAutoCutout = useCallback(async (engine: MatteEngine) => {
        const source = bgFileRef.current;
        if (!source) {
            setMatte({ busy: false, engine, message: 'Upload the background photo first.', percent: 0 });
            return;
        }
        setMatte({
            busy: true,
            engine,
            message: engine === 'browser' ? 'Starting the browser engine…' : 'Connecting…',
            percent: 2,
        });
        const onProgress: MatteProgress = (_stage, message, percent) => {
            setMatte((prev) => (prev ? { ...prev, message, percent } : prev));
        };
        try {
            const blob = engine === 'browser'
                ? await removeBackgroundBrowser(source, onProgress)
                : await removeBackgroundServer(source, onProgress);
            const img = await loadImage(blob);
            setCutoutImage(img);
            setCutoutInfo(`${img.naturalWidth} × ${img.naturalHeight}px · PNG · ${engine === 'browser' ? 'CUT ON MY DEVICE' : 'CUT ON SERVER'}`);
            void idbPut('cutout', blob);
            setMatte(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Cutout failed — try the other engine.';
            setMatte({ busy: false, engine, message, percent: 0 });
        }
    }, []);

    // Keep the seamless-kick bridge fresh (assigned during render, used by
    // handleBgFile which has [] deps and must not see stale mode/runner).
    autoCutRef.current = {
        run: (engine) => void handleAutoCutout(engine),
        mode: cutoutMode,
    };

    /** Cross-tool: ship the current canvas straight into Thumbnail Lab. */
    const handleSendToThumbnailLab = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
                if (blob) await putHandoffImage('thumbnail-lab', blob);
                resolve();
            }, 'image/png');
        });
        window.open('/thumbnail-lab', '_blank');
    }, []);

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
            }

            // Single Layer Renderer
            const drawSingleLayer = (l: TextLayer) => {
                if (!l.text.trim()) return;
                const font = fontById(l.fontId);

                let textToRender = l.text;
                const mode = l.caseMode ?? (l.uppercase ? 'uppercase' : 'original');
                if (mode === 'uppercase') {
                    textToRender = textToRender.toUpperCase();
                } else if (mode === 'lowercase') {
                    textToRender = textToRender.toLowerCase();
                } else if (mode === 'capitalize') {
                    textToRender = textToRender.replace(/\b\w/g, (c) => c.toUpperCase());
                }

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
        [bgImage, cutoutImage, layers, activeLayerId, guides]
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
            className="text-behind-root"
            style={{
                width: '100%',
                height: 'calc(100vh - 56px)',
                maxHeight: 'calc(100vh - 56px)',
                overflow: 'hidden',
                background: '#f4f4f5',
                color: '#000',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            <div
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
                {/* Clean Header */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '2px 0' }}>
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
                            ) : (
                                <div
                                    onClick={() => bgInputRef.current?.click()}
                                    style={{ textAlign: 'center', padding: '34px 26px', maxWidth: 460, background: '#fff', border: dropActive ? '3px dashed #DC2626' : '3px solid #000', boxShadow: '5px 5px 0 #000', color: '#000', margin: 20, cursor: 'pointer' }}
                                >
                                    <Layers size={38} style={{ margin: '0 auto 12px', display: 'block', color: '#000' }} />
                                    <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '0.92rem', marginBottom: 8, color: '#000' }}>
                                        {dropActive ? 'RELEASE TO START' : 'GIANT TYPE. BEHIND THE SUBJECT.'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.7 }}>
                                        {cutoutMode === 'manual' ? (
                                            <>
                                                DROP OR CLICK TO LOAD THE BACKGROUND PHOTO,
                                                <br />
                                                THEN ADD YOUR CUTOUT PNG.
                                            </>
                                        ) : (
                                            <>
                                                DROP A PHOTO (OR CLICK) — THE SUBJECT CUTS ITSELF OUT
                                                <br />
                                                <span style={{ color: '#000', fontWeight: 900, background: '#FFE500', padding: '1px 4px', border: '1px solid #000' }}>
                                                    {cutoutMode === 'browser' ? 'ON YOUR DEVICE — NOTHING UPLOADS' : 'VIA THE CREATORKIT SERVER'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {bgImage && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px 6px', flexShrink: 0 }}>
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
                        {/* 1. Images Intake */}
                        <div className="brutalist-card" style={{ padding: 14 }}>
                            {sectionTitle(<ImagePlus size={14} />, '1 · Photos & Cutout')}
                            <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)} />
                            <input ref={cutoutInputRef} type="file" accept="image/png,image/*" style={{ display: 'none' }} onChange={(e) => handleCutoutFile(e.target.files?.[0] ?? null)} />
                            {/* HOW DO YOU WANT TO BUILD THE SANDWICH? Pick a mode first —
                                the card then shows ONLY the flow that matches the choice. */}
                            <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 5 }}>
                                HOW DO YOU WANT TO ADD THE SUBJECT?
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 10 }}>
                                {([
                                    { m: 'manual' as CutoutMode, label: 'MY OWN PNG', sub: 'I HAVE BOTH IMAGES' },
                                    { m: 'browser' as CutoutMode, label: 'CUT ON MY DEVICE', sub: 'FREE · RECOMMENDED' },
                                    { m: 'server' as CutoutMode, label: 'CUT ON SERVER', sub: 'ANY SUBJECT' },
                                ]).map(({ m, label, sub }) => (
                                    <button
                                        key={m}
                                        className={cutoutMode === m ? 'brutalist-button brutalist-button-primary' : 'brutalist-button'}
                                        style={{
                                            padding: '6px 4px',
                                            fontSize: '0.56rem',
                                            lineHeight: 1.25,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 2,
                                        }}
                                        onClick={() => setCutoutMode(m)}
                                    >
                                        <span>{label}</span>
                                        <span style={{ fontSize: '0.48rem', color: cutoutMode === m ? '#000' : '#777', fontWeight: 700 }}>{sub}</span>
                                    </button>
                                ))}
                            </div>

                            {cutoutMode === 'manual' ? (
                                <>
                                    <div style={{ fontSize: '0.56rem', fontFamily: 'monospace', color: '#666', marginBottom: 8 }}>
                                        UPLOAD THE PHOTO, THEN YOUR ALREADY-TRANSPARENT SUBJECT PNG. THE PNG SITS ON TOP OF YOUR TEXT.
                                    </div>
                                    <button className="brutalist-button" style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }} onClick={() => bgInputRef.current?.click()}>
                                        1 · BACKGROUND PHOTO {bgInfo ? '✓' : ''}
                                    </button>
                                    <button className="brutalist-button" style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }} onClick={() => cutoutInputRef.current?.click()}>
                                        2 · SUBJECT CUTOUT PNG {cutoutInfo ? '✓' : ''}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '0.56rem', fontFamily: 'monospace', color: '#666', marginBottom: 8 }}>
                                        {cutoutMode === 'browser'
                                            ? 'THE CUTOUT IS COMPUTED RIGHT HERE IN YOUR BROWSER — NOTHING LEAVES YOUR MACHINE. THE FIRST RUN DOWNLOADS THE ENGINE ONE TIME.'
                                            : 'THE PHOTO GOES TO THE CREATORKIT WORKER AND THE CUTOUT COMES BACK AS A PNG — WORKS FOR ANY SUBJECT.'}
                                    </div>
                                    <button className="brutalist-button" style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }} onClick={() => bgInputRef.current?.click()}>
                                        1 · UPLOAD THE PHOTO {bgInfo ? '✓' : ''}
                                    </button>
                                    <button
                                        className="brutalist-button brutalist-button-primary"
                                        style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }}
                                        disabled={!!matte?.busy}
                                        onClick={() => void handleAutoCutout(cutoutMode === 'server' ? 'server' : 'browser')}
                                    >
                                        {cutoutMode === 'browser' ? '↻ RE-CUT ON MY DEVICE' : '↻ RE-CUT ON THE SERVER'}
                                    </button>
                                </>
                            )}
                            {bgInfo && <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666', marginBottom: 6 }}>{bgInfo}</div>}
                            {cutoutInfo && <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666', marginBottom: 2 }}>{cutoutInfo}</div>}
                            {matte && (
                                <div style={{ marginTop: 8, padding: '6px 8px', border: '1.5px solid #000', background: '#fafafa' }}>
                                    <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: matte.busy ? '#000' : '#b00' }}>
                                        {matte.busy ? `${matte.message} (${matte.percent}%)` : matte.message}
                                    </div>
                                    {matte.busy && (
                                        <div style={{ height: 6, background: '#fff', border: '1px solid #000', marginTop: 4 }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, matte.percent))}%`, background: '#FFE500' }} />
                                        </div>
                                    )}
                                    {!matte.busy && (
                                        <button className="brutalist-button" style={{ padding: '3px 8px', fontSize: '0.56rem', marginTop: 5 }} onClick={() => setMatte(null)}>
                                            DISMISS
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                className="brutalist-button"
                                style={{ width: '100%', padding: '5px 10px', fontSize: '0.62rem', marginTop: 6 }}
                                onClick={() => {
                                    setBgImage(null);
                                    setBgInfo('');
                                    setCutoutImage(null);
                                    setCutoutInfo('');
                                    setMatte(null);
                                    bgFileRef.current = null;
                                    setExportNote('');
                                    void idbClear(['bg', 'cutout']);
                                }}
                            >
                                RESET IMAGES
                            </button>
                        </div>

                        {/* 2. Text Boxes & Typography */}
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
                                                <span>{l.text ? l.text.slice(0, 9).toUpperCase() : 'EMPTY'}</span>
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
                                                                {layer.text ? layer.text.slice(0, 10).toUpperCase() : 'POSTER'}
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
                            </div>
                        </div>

                        {/* 3. Style Presets, Blends & Geometry */}
                        <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {sectionTitle(<Scissors size={14} />, '2 · Style & Poster Looks')}

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
                                min={-45}
                                max={45}
                                step={1}
                                onChange={(v) => patchLayer({ rotationDeg: v })}
                                formatValue={(v) => `${v}°`}
                                presets={[{ label: '0°', value: 0 }, { label: '-15°', value: -15 }, { label: '+15°', value: 15 }]}
                                width="100%"
                            />
                        </div>

                        {/* 4. Export */}
                        <div className="brutalist-card" style={{ padding: 14 }}>
                            {sectionTitle(<Download size={14} />, '3 · Export Poster')}
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
                                <button className="brutalist-button" style={{ gridColumn: '1 / -1', padding: '8px 6px', fontSize: '0.68rem' }} disabled={!bgImage || exporting} onClick={() => void handleSendToThumbnailLab()}>
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
                @media (max-width: 980px) {
                    .text-behind-root {
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        padding-bottom: 40px !important;
                    }
                    .text-behind-layout {
                        grid-template-columns: 1fr !important;
                        height: auto !important;
                        gap: 20px !important;
                    }
                    .text-behind-viewport {
                        height: 50vh !important;
                        min-height: 280px !important;
                        margin-bottom: 12px !important;
                    }
                    .text-behind-controls-scroll {
                        height: auto !important;
                        overflow-y: visible !important;
                        padding-right: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
