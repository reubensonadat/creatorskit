'use client';

/**
 * TEXT BEHIND IMAGE — the movie-poster sandwich editor (plan M1).
 *
 * Layer 0 (bottom):  the original photo
 * Layer 1 (middle):  the giant typography
 * Layer 2 (top):     the subject cutout (transparent PNG)
 *
 * M1 = zero AI, Mode A only: the user uploads background + an already-cut-out
 * PNG. The canvas is FREE — it takes the background's native dimensions and
 * never forces an aspect ratio. Server matte (M2), browser person-seg (M3)
 * and the refine brush slot in behind the same CUTOUT chip.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, Scissors, Download, Layers, Type as TypeIcon } from 'lucide-react';
import { downloadBlob } from '@/lib/canvas-video-exporter';
import { POPULAR_OVERLAY_FONTS } from '@/lib/captions/overlay-renderer';
import { TactileScrubber } from '@/components/tactile-scrubber';

// ---------------------------------------------------------------------------
// Fonts — reuse the overlay picker list, extended with poster-grade faces.
// ---------------------------------------------------------------------------

interface PosterFont {
    id: string;
    name: string;
    family: string;
    weight: number;
}

const EXTRA_POSTER_FONTS: PosterFont[] = [
    { id: 'anton', name: 'Anton', family: '"Anton", Impact, sans-serif', weight: 400 },
    { id: 'playfair-display', name: 'Playfair Display', family: '"Playfair Display", serif', weight: 900 },
];

const POSTER_FONTS: PosterFont[] = [
    ...EXTRA_POSTER_FONTS,
    ...POPULAR_OVERLAY_FONTS.map((f) => ({
        id: f.id,
        name: f.name,
        family: f.family,
        // The overlay list is a heavy-weight display list; only the mono and
        // Bebas faces ship non-900 weights on Google Fonts.
        weight: f.id === 'space-mono' ? 700 : f.id === 'bebas-neue' ? 400 : 900,
    })),
];

const fontById = (id: string): PosterFont =>
    POSTER_FONTS.find((f) => f.id === id) ?? POSTER_FONTS[0];

/** Inject the one combined Google-Fonts stylesheet for the whole list, once. */
let posterFontsLinkInjected = false;
function ensurePosterFontsCss(): void {
    if (posterFontsLinkInjected || typeof document === 'undefined') return;
    if (document.getElementById('ck-poster-fonts-css')) {
        posterFontsLinkInjected = true;
        return;
    }
    const families = POSTER_FONTS.map((f) => {
        const base = f.name.replace(/ /g, '+');
        return f.weight === 400 ? base : `${base}:wght@${f.weight}`;
    }).join('&family=');
    const link = document.createElement('link');
    link.id = 'ck-poster-fonts-css';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
    posterFontsLinkInjected = true;
}

/** Resolve the font before ANY draw (preview included) so export == preview. */
async function ensurePosterFontReady(id: string): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    ensurePosterFontsCss();
    const font = fontById(id);
    try {
        await document.fonts.load(`${font.weight} 100px ${font.family}`);
        await document.fonts.ready;
    } catch {
        /* fall back to whatever face is available — never block the editor */
    }
}

// ---------------------------------------------------------------------------
// Text layer state
// ---------------------------------------------------------------------------

type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen';

/** Canvas calls "normal" compositing "source-over". */
const asCompositeOp = (mode: BlendMode): GlobalCompositeOperation =>
    mode === 'normal' ? 'source-over' : (mode as GlobalCompositeOperation);

interface TextLayer {
    text: string;
    fontId: string;
    uppercase: boolean;
    /** fit-to-width mode: target text width as % of canvas width (the EGYPT look). */
    fitToWidth: boolean;
    widthPct: number;
    /** fixed mode: font size as % of canvas height. */
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
    rotationDeg: number;
    blend: BlendMode;
    depth: 'behind' | 'front';
    xPct: number;
    yPct: number;
}

const DEFAULT_TEXT_LAYER: TextLayer = {
    text: 'BEHIND',
    fontId: 'anton',
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
    rotationDeg: 0,
    blend: 'normal',
    depth: 'behind',
    xPct: 0.5,
    yPct: 0.4,
};

const SETTINGS_KEY = 'ck_text_behind_v5';

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FFE500', '#FF4D4D', '#4DD2FF', '#111827'];

/**
 * One-tap text recipes. The default is plain solid black — the color fills
 * the letters completely with zero background bleed. The fancy looks (outline,
 * gradients) live here as opt-in presets for colored/dark scenes.
 */
const TEXT_PRESETS: { id: string; name: string; swatch: string; patch: Partial<TextLayer> }[] = [
    {
        id: 'white',
        name: 'WHITE',
        swatch: '#FFFFFF',
        patch: { fillMode: 'solid', color: '#FFFFFF', strokeEm: 0, shadow: true },
    },
    {
        id: 'black',
        name: 'BLACK',
        swatch: '#000000',
        patch: { fillMode: 'solid', color: '#000000', strokeEm: 0, shadow: false },
    },
    {
        id: 'outline',
        name: 'OUTLINE',
        swatch: 'linear-gradient(#FFF 55%, #000 55%)',
        patch: { fillMode: 'solid', color: '#FFFFFF', strokeColor: '#000000', strokeEm: 0.05, shadow: true },
    },
    {
        id: 'gold',
        name: 'GOLD',
        swatch: 'linear-gradient(180deg, #FFFFFF 0%, #FFE500 100%)',
        patch: { fillMode: 'gradient', color: '#FFFFFF', gradientColor2: '#FFE500', gradientAngle: 90, strokeEm: 0, shadow: true },
    },
    {
        id: 'sunset',
        name: 'SUNSET',
        swatch: 'linear-gradient(180deg, #FF4D4D 0%, #FFE500 100%)',
        patch: { fillMode: 'gradient', color: '#FF4D4D', gradientColor2: '#FFE500', gradientAngle: 90, strokeEm: 0, shadow: true },
    },
    {
        id: 'pop',
        name: 'POP',
        swatch: '#FFE500',
        patch: { fillMode: 'solid', color: '#FFE500', strokeColor: '#000000', strokeEm: 0.04, shadow: false },
    },
];

// --- Refresh-safe persistence (the auto-captions lesson): style settings in
// localStorage, image blobs in IndexedDB — a reload loses nothing.
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
    } catch { /* private mode — persistence is best-effort */ }
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
    } catch { /* best-effort */ }
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

    // --- text layer ---------------------------------------------------------
    const [layer, setLayer] = useState<TextLayer>(DEFAULT_TEXT_LAYER);
    const patchLayer = useCallback((patch: Partial<TextLayer>) => {
        setLayer((prev) => ({ ...prev, ...patch }));
    }, []);

    // --- interaction --------------------------------------------------------
    const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
    const [hoveringText, setHoveringText] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportNote, setExportNote] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const cutoutInputRef = useRef<HTMLInputElement>(null);
    /** Metrics from the last preview draw — powers hit-testing for the drag. */
    const metricsRef = useRef<TextMetrics | null>(null);
    const dragRef = useRef<{ active: boolean; movedPx: number; ox: number; oy: number } | null>(null);

    const canvasW = bgImage?.naturalWidth ?? 0;
    const canvasH = bgImage?.naturalHeight ?? 0;

    // --- settings persistence (text style only; blobs stay out of localStorage) ---
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) setLayer({ ...DEFAULT_TEXT_LAYER, ...(JSON.parse(raw) as Partial<TextLayer>) });
        } catch { /* first visit or corrupt entry */ }
    }, []);

    // Restore the saved images (blobs live in IndexedDB) so a refresh keeps
    // the whole session alive — same contract as the captions sessions.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const restore = async (key: 'bg' | 'cutout'): Promise<HTMLImageElement | null> => {
                const blob = await idbGet(key);
                if (!blob || cancelled) return null;
                try {
                    return await loadImage(blob);
                } catch {
                    return null;
                }
            };
            const bg = await restore('bg');
            if (bg && !cancelled) {
                setBgImage(bg);
                setBgInfo(`${bg.naturalWidth} × ${bg.naturalHeight}px · restored`);
            }
            const cut = await restore('cutout');
            if (cut && !cancelled) {
                setCutoutImage(cut);
                setCutoutInfo(`${cut.naturalWidth} × ${cut.naturalHeight}px · PNG · restored`);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(layer));
        } catch { /* storage full / private mode — non-fatal */ }
    }, [layer]);

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
            setBgImage(img);
            setBgInfo(`${img.naturalWidth} × ${img.naturalHeight}px`);
            void idbPut('bg', file); // refresh-safe
        } catch {
            setBgInfo('Could not open that file.');
        }
    }, []);

    const handleCutoutFile = useCallback(async (file: File | null) => {
        if (!file) return;
        try {
            const img = await loadImage(file);
            setCutoutImage(img);
            setCutoutInfo(`${img.naturalWidth} × ${img.naturalHeight}px · PNG`);
            void idbPut('cutout', file); // refresh-safe
        } catch {
            setCutoutInfo('Could not open that file.');
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Compositing — ONE draw function feeds the live preview AND the export, so
    // what you see is exactly what you download (the resizer lesson).
    // ---------------------------------------------------------------------------

    const drawSandwich = useCallback(
        (ctx: CanvasRenderingContext2D, W: number, H: number, opts: { preview: boolean; opaqueBg?: string }) => {
            if (!bgImage) return;
            if (opts.opaqueBg) {
                ctx.fillStyle = opts.opaqueBg;
                ctx.fillRect(0, 0, W, H);
            }
            // Layer 0 — the photo. It defines the canvas, so it draws 1:1.
            ctx.drawImage(bgImage, 0, 0, W, H);

            const drawText = () => {
                const font = fontById(layer.fontId);
                const display = layer.uppercase ? layer.text.toUpperCase() : layer.text;
                const lines = display.split('\n');
                if (!display.trim()) return;

                // Two-pass fit-to-width: measure at a probe size, then scale
                // linearly to the requested width. Exact — no iteration loop.
                const probe = Math.max(12, H * 0.1);
                const measure = (px: number) => {
                    ctx.font = `${font.weight} ${px}px ${font.family}`;
                    const ls = (ctx as CanvasRenderingContext2D & { letterSpacing?: string });
                    if ('letterSpacing' in ctx) ls.letterSpacing = `${layer.letterSpacingEm * px}px`;
                    const widths = lines.map((l) => ctx.measureText(l || ' ').width);
                    const widest = Math.max(...widths, 1);
                    const lineH = px * 1.08;
                    return { widest, blockW: widest, blockH: lineH * lines.length, lineH };
                };
                let fontPx: number;
                let m: ReturnType<typeof measure>;
                if (layer.fitToWidth) {
                    const atProbe = measure(probe);
                    fontPx = Math.max(8, probe * ((W * layer.widthPct) / 100 / atProbe.blockW));
                    m = measure(fontPx);
                } else {
                    fontPx = Math.max(8, (H * layer.heightPct) / 100);
                    m = measure(fontPx);
                }

                ctx.save();
                ctx.globalCompositeOperation = asCompositeOp(layer.blend);
                ctx.globalAlpha = layer.opacity;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.translate(layer.xPct * W, layer.yPct * H);
                ctx.rotate((layer.rotationDeg * Math.PI) / 180);
                ctx.font = `${font.weight} ${fontPx}px ${font.family}`;
                const ls = (ctx as CanvasRenderingContext2D & { letterSpacing?: string });
                if ('letterSpacing' in ctx) ls.letterSpacing = `${layer.letterSpacingEm * fontPx}px`;

                // Fill: solid or a two-stop gradient across the block (the
                // chrome/sunset poster look). Built after rotate so the
                // gradient angle rides with the text.
                let fill: string | CanvasGradient = layer.color;
                if (layer.fillMode === 'gradient') {
                    const rad = (layer.gradientAngle * Math.PI) / 180;
                    const gx = Math.cos(rad) * (m.blockW / 2);
                    const gy = Math.sin(rad) * (m.blockH / 2);
                    const grad = ctx.createLinearGradient(-gx, -gy, gx, gy);
                    grad.addColorStop(0, layer.color);
                    grad.addColorStop(1, layer.gradientColor2);
                    fill = grad;
                }
                ctx.fillStyle = fill;

                // Legibility stack: outline behind the fill + a soft drop
                // shadow — what makes poster type pop over ANY photo.
                const strokePx = layer.strokeEm * fontPx;
                if (strokePx > 0) {
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.lineWidth = strokePx;
                    ctx.strokeStyle = layer.strokeColor;
                }
                if (layer.shadow) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
                    ctx.shadowBlur = fontPx * 0.1;
                    ctx.shadowOffsetY = fontPx * 0.06;
                }
                const firstMid = -(m.blockH / 2) + m.lineH / 2;
                lines.forEach((line, i) => {
                    const y = firstMid + i * m.lineH;
                    if (strokePx > 0) ctx.strokeText(line, 0, y);
                    ctx.fillText(line, 0, y);
                });
                ctx.restore();

                metricsRef.current = {
                    cx: layer.xPct * W,
                    cy: layer.yPct * H,
                    w: m.blockW,
                    h: m.blockH,
                    rot: (layer.rotationDeg * Math.PI) / 180,
                    fontPx,
                };
            };

            const drawCutout = () => {
                if (!cutoutImage) return;
                // Cover-fit: if the cutout's dims differ from the photo's,
                // scale it to cover and center it (same-size uploads land 1:1).
                const scale = Math.max(W / cutoutImage.naturalWidth, H / cutoutImage.naturalHeight);
                const dw = cutoutImage.naturalWidth * scale;
                const dh = cutoutImage.naturalHeight * scale;
                ctx.drawImage(cutoutImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
            };

            if (layer.depth === 'behind') {
                drawText();
                drawCutout();
            } else {
                drawCutout();
                drawText();
            }

            if (opts.preview) {
                // Selection feedback + snap guides — preview only, never exported.
                const m = metricsRef.current;
                if (m) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 229, 0, 0.9)';
                    ctx.lineWidth = Math.max(1, W / 900);
                    ctx.setLineDash([W / 120, W / 160]);
                    ctx.translate(m.cx, m.cy);
                    ctx.rotate(m.rot);
                    ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
                    ctx.restore();
                }
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 229, 0, 0.75)';
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
        [bgImage, cutoutImage, layer, guides]
    );

    // --- preview redraw -----------------------------------------------------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !bgImage) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawSandwich(ctx, canvasW, canvasH, { preview: true });
    }, [bgImage, canvasW, canvasH, drawSandwich]);

    // Fonts land async — once the chosen face resolves, repaint.
    useEffect(() => {
        let cancelled = false;
        ensurePosterFontReady(layer.fontId).then(() => {
            if (!cancelled) {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx && bgImage) drawSandwich(ctx, canvas.width, canvas.height, { preview: true });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [layer.fontId, bgImage, drawSandwich]);

    // --- drag (the cue-timeline pattern: capture → move → up) ----------------

    const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const hitTestText = (x: number, y: number): boolean => {
        const m = metricsRef.current;
        if (!m) return false;
        const dx = x - m.cx;
        const dy = y - m.cy;
        const cos = Math.cos(m.rot);
        const sin = Math.sin(m.rot);
        const rx = dx * cos + dy * sin;
        const ry = -dx * sin + dy * cos;
        const pad = m.fontPx * 0.35;
        return Math.abs(rx) <= m.w / 2 + pad && Math.abs(ry) <= m.h / 2 + pad;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!bgImage) return;
        const p = canvasPoint(e);
        if (!hitTestText(p.x, p.y)) return;
        const m = metricsRef.current!;
        dragRef.current = { active: true, movedPx: 0, ox: m.cx - p.x, oy: m.cy - p.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!bgImage) return;
        const p = canvasPoint(e);
        const drag = dragRef.current;
        if (!drag?.active) {
            setHoveringText(hitTestText(p.x, p.y));
            return;
        }
        drag.movedPx += 1; // any move counts; the layer follows 1:1
        const W = canvasRef.current!.width;
        const H = canvasRef.current!.height;
        let nx = (p.x + drag.ox) / W;
        let ny = (p.y + drag.oy) / H;

        // Snap guides: center + thirds, within 0.8% of the frame.
        const tol = 0.008;
        let snapV: number | null = null;
        let snapH: number | null = null;
        for (const c of [0.5, 1 / 3, 2 / 3]) {
            if (Math.abs(nx - c) < tol) { nx = c; snapV = c; }
            if (Math.abs(ny - c) < tol) { ny = c; snapH = c; }
        }
        setGuides((prev) => (prev.v === snapV && prev.h === snapH ? prev : { v: snapV, h: snapH }));
        patchLayer({
            xPct: Math.max(0, Math.min(1, nx)),
            yPct: Math.max(0, Math.min(1, ny)),
        });
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
            await ensurePosterFontReady(layer.fontId); // the overlay-presets lesson
            const off = document.createElement('canvas');
            off.width = canvasW * scale;
            off.height = canvasH * scale;
            const ctx = off.getContext('2d')!;
            ctx.scale(scale, scale);
            drawSandwich(ctx, canvasW, canvasH, { preview: false, opaqueBg: format === 'jpg' ? '#FFFFFF' : undefined });
            const blob = await new Promise<Blob | null>((resolve) =>
                off.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
            );
            if (!blob) throw new Error('Export failed.');
            const base = (layer.text.split('\n')[0] || 'text-behind').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'text-behind';
            downloadBlob(blob, `${base}-behind-${canvasW * scale}x${canvasH * scale}.${format}`);
            setExportNote(`Saved ${canvasW * scale} × ${canvasH * scale} ${format.toUpperCase()}.`);
        } catch (err) {
            setExportNote(err instanceof Error ? err.message : 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

    const cutoutChip = useMemo(() => {
        if (cutoutImage) return { label: 'CUTOUT: UPLOADED', bg: '#22C55E' };
        return { label: 'CUTOUT: NONE', bg: '#FF4D4D' };
    }, [cutoutImage]);

    // ---------------------------------------------------------------------------
    // UI
    // ---------------------------------------------------------------------------

    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {icon}
            <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </span>
        </div>
    );

    const labelStyle: React.CSSProperties = {
        fontSize: '0.64rem',
        fontWeight: 900,
        fontFamily: 'monospace',
        textTransform: 'uppercase',
        color: '#000',
    };


    return (
        <div style={{ minHeight: '100vh', background: '#F4F4F5', padding: '20px 16px 60px' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link href="/" className="brutalist-button" style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}>
                            ‹ HOME
                        </Link>
                        <h1 style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', margin: 0 }}>
                            Text Behind Image
                        </h1>
                    </div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 900, padding: '4px 10px', border: '2px solid #000', background: cutoutChip.bg, color: '#000', fontFamily: 'monospace' }}>
                        {cutoutChip.label}
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start' }} className="text-behind-layout">
                    {/* ---------------- Viewport (sticky — pinned left while the
                        control stack scrolls on desktop) ---------------- */}
                    <div
                        className="brutalist-card text-behind-viewport"
                        style={{
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            position: 'sticky',
                            top: 12,
                            alignSelf: 'start',
                            maxHeight: 'calc(100vh - 24px)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 320,
                                // Checkered alpha backdrop — proves the cutout's
                                // transparency and frames the free canvas.
                                background:
                                    'repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 22px 22px',
                                border: '2px solid #000',
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
                                        maxWidth: '100%',
                                        maxHeight: '68vh',
                                        width: 'auto',
                                        height: 'auto',
                                        display: 'block',
                                        touchAction: 'none',
                                        cursor: hoveringText ? 'grab' : 'default',
                                    }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 420 }}>
                                    <Layers size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
                                    <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: 8 }}>
                                        GIANT TYPE. BEHIND THE SUBJECT.
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#555', lineHeight: 1.7 }}>
                                        1. Upload a photo (the background).<br />
                                        2. Upload its subject as a transparent PNG cutout.<br />
                                        3. Drag your text where the subject overlaps it.<br />
                                        <span style={{ color: '#888' }}>Auto cutout (server + browser) lands next — this works today with your own PNGs.<br />Everything you load is saved on this device — a refresh loses nothing.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {bgImage && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#555' }}>
                                    FREE CANVAS · {canvasW} × {canvasH}px · NATIVE EXPORT
                                </span>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button
                                        className="brutalist-button"
                                        style={{ padding: '5px 10px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                        onClick={() => (layer.depth === 'behind' ? patchLayer({ depth: 'front' }) : patchLayer({ depth: 'behind' }))}
                                        title="Flip text fully behind / fully in front of the subject"
                                    >
                                        <Layers size={12} />
                                        {layer.depth === 'behind' ? 'DEPTH: BEHIND' : 'DEPTH: FRONT'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ---------------- Controls ---------------- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Images */}
                        <div className="brutalist-card" style={{ padding: 14 }}>
                            {sectionTitle(<ImagePlus size={14} />, 'Images')}
                            <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)} />
                            <input ref={cutoutInputRef} type="file" accept="image/png,image/*" style={{ display: 'none' }} onChange={(e) => handleCutoutFile(e.target.files?.[0] ?? null)} />
                            <button className="brutalist-button brutalist-button-primary" style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }} onClick={() => bgInputRef.current?.click()}>
                                1 · BACKGROUND PHOTO {bgInfo ? '✓' : ''}
                            </button>
                            {bgInfo && <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666', marginBottom: 8 }}>{bgInfo}</div>}
                            <button className="brutalist-button" style={{ width: '100%', padding: '8px 10px', fontSize: '0.72rem', marginBottom: 6 }} onClick={() => cutoutInputRef.current?.click()}>
                                2 · SUBJECT CUTOUT PNG {cutoutInfo ? '✓' : ''}
                            </button>
                            {cutoutInfo && <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666' }}>{cutoutInfo}</div>}
                            <button
                                className="brutalist-button"
                                style={{ width: '100%', padding: '6px 10px', fontSize: '0.64rem', marginTop: 8 }}
                                onClick={() => {
                                    setBgImage(null);
                                    setBgInfo('');
                                    setCutoutImage(null);
                                    setCutoutInfo('');
                                    setExportNote('');
                                    void idbClear(['bg', 'cutout']);
                                }}
                            >
                                RESET IMAGES
                            </button>
                            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                                {['SERVER MATTE — SOON', 'BROWSER PERSON — SOON'].map((s) => (
                                    <span key={s} style={{ fontSize: '0.56rem', fontFamily: 'monospace', fontWeight: 900, border: '1px solid #aaa', color: '#888', padding: '2px 6px' }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Text */}
                        <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {sectionTitle(<TypeIcon size={14} />, 'Text')}
                            <textarea
                                value={layer.text}
                                onChange={(e) => patchLayer({ text: e.target.value })}
                                rows={2}
                                style={{ width: '100%', border: '2px solid #000', padding: '6px 8px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                                placeholder="BEHIND"
                            />
                            <label style={{ ...labelStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={layer.uppercase} onChange={(e) => patchLayer({ uppercase: e.target.checked })} style={{ accentColor: '#FFDD00' }} />
                                UPPERCASE
                            </label>
                            <div>
                                <span style={labelStyle}>FONT</span>
                                <select
                                    value={layer.fontId}
                                    onChange={(e) => patchLayer({ fontId: e.target.value })}
                                    style={{ width: '100%', marginTop: 4, border: '2px solid #000', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.74rem', background: '#fff' }}
                                >
                                    {POSTER_FONTS.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span style={labelStyle}>COLOR</span>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                                    {TEXT_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => patchLayer({ color: c })}
                                            style={{ width: 24, height: 24, border: layer.color === c ? '3px solid #000' : '2px solid #999', background: c, cursor: 'pointer', padding: 0 }}
                                            aria-label={`Color ${c}`}
                                        />
                                    ))}
                                    <input type="color" value={layer.color} onChange={(e) => patchLayer({ color: e.target.value })} style={{ width: 28, height: 24, border: '2px solid #999', padding: 0, cursor: 'pointer', background: 'none' }} />
                                </div>
                            </div>
                        </div>

                        {/* Style */}
                        <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {sectionTitle(<Scissors size={14} />, 'Style')}
                            <div>
                                <span style={labelStyle}>PRESETS</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
                                    {TEXT_PRESETS.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => patchLayer(p.patch)}
                                            className="brutalist-button"
                                            style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}
                                            title={p.name}
                                        >
                                            <span style={{ height: 14, border: '2px solid #000', background: p.swatch, display: 'block' }} />
                                            <span style={{ fontSize: '0.56rem', fontFamily: 'monospace', fontWeight: 900 }}>{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                                width="100%"
                            />
                            <div>
                                <span style={labelStyle}>FILL</span>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    {(['solid', 'gradient'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => patchLayer({ fillMode: mode })}
                                            className="brutalist-button"
                                            style={{ flex: 1, padding: '5px 6px', fontSize: '0.62rem', fontFamily: 'monospace', background: layer.fillMode === mode ? '#FFDD00' : '#fff' }}
                                        >
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {layer.fillMode === 'gradient' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={labelStyle}>COLOR 2</span>
                                        <input type="color" value={layer.gradientColor2} onChange={(e) => patchLayer({ gradientColor2: e.target.value })} style={{ width: 28, height: 24, border: '2px solid #999', padding: 0, cursor: 'pointer', background: 'none' }} />
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
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={labelStyle}>OUTLINE</span>
                                    <input type="color" value={layer.strokeColor} onChange={(e) => patchLayer({ strokeColor: e.target.value })} style={{ width: 28, height: 24, border: '2px solid #999', padding: 0, cursor: 'pointer', background: 'none' }} />
                                </div>
                                <TactileScrubber
                                    label="OUTLINE WIDTH"
                                    value={Math.round(layer.strokeEm * 100)}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    onChange={(v) => patchLayer({ strokeEm: v / 100 })}
                                    formatValue={(v) => (v === 0 ? 'OFF' : `${(v / 100).toFixed(2)}em`)}
                                    width="100%"
                                />
                            </div>
                            <label style={{ ...labelStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={layer.shadow} onChange={(e) => patchLayer({ shadow: e.target.checked })} style={{ accentColor: '#FFDD00' }} />
                                DROP SHADOW
                            </label>
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
                            <div>
                                <span style={labelStyle}>BLEND</span>
                                <select
                                    value={layer.blend}
                                    onChange={(e) => patchLayer({ blend: e.target.value as BlendMode })}
                                    style={{ width: '100%', marginTop: 4, border: '2px solid #000', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.74rem', background: '#fff' }}
                                >
                                    {(['normal', 'multiply', 'overlay', 'screen'] as BlendMode[]).map((b) => (
                                        <option key={b} value={b}>
                                            {b.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Export */}
                        <div className="brutalist-card" style={{ padding: 14 }}>
                            {sectionTitle(<Download size={14} />, 'Export')}
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
                            </div>
                            {exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#B45309' }}>RENDERING…</div>}
                            {exportNote && !exporting && <div style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{exportNote}</div>}
                            {!cutoutImage && bgImage && (
                                <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                                    No cutout uploaded — the text renders on top of the photo. Add a transparent PNG for the behind-subject effect.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 980px) {
                    .text-behind-layout { grid-template-columns: 1fr !important; }
                    .text-behind-viewport { position: static !important; max-height: none !important; }
                }
            `}</style>
        </div>
    );
}
