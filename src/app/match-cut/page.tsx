'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextStepRow from '@/components/NextStepRow';
import { gateAction } from '@/components/AdGate';
import { putHandoffImage, takeHandoffText } from '@/lib/tool-handoff';
import { ThinkingOrb } from 'thinking-orbs';
import { loadState, saveState } from '@/lib/local-memory';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Volume2,
  VolumeX,
  Zap,
  Plus,
  Trash2,
  Film,
  Image as ImageIcon,
  Copy,
  Check,
  Crosshair,
  Layers,
  Sliders,
  Type,
  FileArchive,
  RefreshCw,
  ChevronDown,
  Shuffle,
  Camera,
  X,
  ListOrdered,
  ScanText,
} from 'lucide-react';
import {
  renderNewspaperMatchCut,
  renderRealPaperMatchCut,
  playCutSound,
  synthesizeCutSound,
  easeHighlightSweep,
  PAPER_THEMES,
  type NewspaperCut,
  type RealPaperLine,
  type RealPaperPick,
  type RenderOptions,
} from './match-cut-engine';
import {
  exportCanvasVideoToMp4,
  renderOfflineAudio,
  downloadBlob,
} from '@/lib/canvas-video-exporter';
import { renderPaperTransition } from '@/lib/motion/paper-transition';
import { PRESET_TOPICS, generateCutsForPhrase, MASTHEADS, LOCATIONS, BYLINES } from './presets';
import { GOOGLE_FONTS_LIST } from './google-fonts';
import { TactileScrubber } from '@/components/tactile-scrubber';

const SOUND_OPTIONS = [
  { id: 'shutter' as const, label: 'Shutter Snap' },
  { id: 'typewriter' as const, label: 'Typewriter Clack' },
  { id: 'motor' as const, label: 'Motor Drive' },
  { id: 'paper' as const, label: 'Paper Rustle' },
  { id: 'mute' as const, label: 'Muted' },
];

const FONT_CYCLE_PRESETS = [
  {
    id: 'broadsheet',
    label: '📰 Broadsheet',
    fonts: [
      '"Playfair Display", Georgia, serif',
      '"DM Serif Display", serif',
      '"Bodoni Moda", serif',
      '"Cormorant Garamond", serif',
      '"Cinzel", "Times New Roman", serif',
    ],
  },
  {
    id: 'classified',
    label: '⌨️ Classified',
    fonts: [
      '"Special Elite", monospace',
      '"Courier Prime", "Courier New", monospace',
      '"Space Mono", monospace',
      '"IBM Plex Mono", monospace',
      '"Cutive Mono", monospace',
    ],
  },
  {
    id: 'tabloid',
    label: '🚨 Tabloid Heavy',
    fonts: [
      '"Bebas Neue", Impact, sans-serif',
      '"Anton", Impact, sans-serif',
      '"Archivo Black", sans-serif',
      '"Oswald", sans-serif',
      '"Ultra", serif',
    ],
  },
  {
    id: 'eclectic',
    label: '🎨 Eclectic Mix',
    fonts: [
      '"Playfair Display", Georgia, serif',
      '"Special Elite", monospace',
      '"Caveat", "Segoe Script", "Brush Script MT", cursive',
      '"Cinzel", "Times New Roman", serif',
      '"Inter", sans-serif',
    ],
  },
  {
    id: 'brutalist',
    label: '⚡ Brutalist Sans',
    fonts: [
      '"Inter", sans-serif',
      '"Syne", sans-serif',
      '"Space Grotesk", sans-serif',
      '"Montserrat", sans-serif',
      '"Outfit", sans-serif',
    ],
  },
];

const ASPECT_RATIOS = [
  { id: '9:16' as const, label: '9:16 · Story / Reels / TikTok', width: 1080, height: 1920, aspect: '9/16' },
  { id: '4:3' as const, label: '4:3 · Classic TV / Standard', width: 1440, height: 1080, aspect: '4/3' },
  { id: '16:9' as const, label: '16:9 · YouTube / Landscape', width: 1920, height: 1080, aspect: '16/9' },
  { id: '1:1' as const, label: '1:1 · Square Post', width: 1080, height: 1080, aspect: '1/1' },
  { id: '4:5' as const, label: '4:5 · Feed Portrait', width: 1080, height: 1350, aspect: '4/5' },
  { id: '3:4' as const, label: '3:4 · Editorial Portrait', width: 1080, height: 1440, aspect: '3/4' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Cyber Yellow', hex: '#FFE500' },
  { name: 'Neon Green', hex: '#00FF66' },
  { name: 'Electric Cyan', hex: '#00F0FF' },
  { name: 'Hot Pink', hex: '#FF2A85' },
  { name: 'Vivid Orange', hex: '#FF7700' },
  { name: 'Blood Crimson', hex: '#DC2626' },
  { name: 'Knockout Black', hex: '#111111' },
];

/** The slice of working state that survives reloads — refresh the page and
 *  the paper, the OCR lines and the picks come right back. */
type MatchCutSession = {
  paperSource: 'synthetic' | 'real';
  scanLines: RealPaperLine[];
  scanPicks: RealPaperPick[];
  scanFillStyle: 'paper' | 'edge' | 'blur';
  scanPageChange: boolean;
  scanEdgeColor: string | null;
  scanPasteText: string;
  scanMatchMode: 'exact' | 'contains';
  scanImageDataUrl: string | null;
};

export default function TextMatchCutStudioPage() {
  // Core Match Cut State
  const [anchorPhrase, setAnchorPhrase] = useState(PRESET_TOPICS[0].anchor);
  const [cuts, setCuts] = useState<NewspaperCut[]>(PRESET_TOPICS[0].cuts);
  const [currentCutIndex, setCurrentCutIndex] = useState(0);

  // Playback & Sound Engine State
  const [isPlaying, setIsPlaying] = useState(true);
  const [cutsPerSecond, setCutsPerSecond] = useState(10); // Default 10 cuts/sec
  const [soundEffect, setSoundEffect] = useState<'shutter' | 'typewriter' | 'motor' | 'paper' | 'mute'>('shutter');
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [showSoundDropdown, setShowSoundDropdown] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Visual & Stylistic Options
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4'>('9:16');
  const [highlightColor, setHighlightColor] = useState('#FFE500');
  const [highlightStyle, setHighlightStyle] = useState<'marker' | 'underline' | 'double-underline' | 'box' | 'circle' | 'tape'>('marker');
  const [markerOpacity, setMarkerOpacity] = useState(0.85);
  // Where the highlighted phrase sits INSIDE the generated sentences.
  const [anchorPosition, setAnchorPosition] = useState<'auto' | 'start' | 'middle' | 'end'>('auto');
  // Advanced layout toggles — which document sections are visible.
  const [showTopColumns, setShowTopColumns] = useState(true);
  const [showMasthead, setShowMasthead] = useState(true);
  const [showSubhead, setShowSubhead] = useState(true);
  const [showByline, setShowByline] = useState(true);
  const [showBottomColumns, setShowBottomColumns] = useState(true);
  const [showDividerRules, setShowDividerRules] = useState(true);
  const [paperTheme, setPaperTheme] = useState<'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir'>('vintage');
  const [fontFamily, setFontFamily] = useState<string>('"Playfair Display", Georgia, serif');
  const [fontCycleList, setFontCycleList] = useState<string[]>([
    '"Playfair Display", Georgia, serif',
    '"Special Elite", monospace',
    '"Caveat", "Segoe Script", "Brush Script MT", cursive',
    '"Cinzel", "Times New Roman", serif',
    '"Inter", sans-serif',
  ]);
  const [editingFontSlot, setEditingFontSlot] = useState<number | null>(null);
  const [fontCategoryFilter, setFontCategoryFilter] = useState<'All' | 'Serif' | 'Typewriter' | 'Tabloid' | 'Sans' | 'Display'>('All');
  const [highlightSector, setHighlightSector] = useState<'top-masthead' | 'center-headline' | 'body-paragraph'>('center-headline');
  const [depthOfField, setDepthOfField] = useState(true);
  const [dofIntensity, setDofIntensity] = useState(0.75);
  const [filmGrain, setFilmGrain] = useState(true);
  const [cameraShake, setCameraShake] = useState(true);
  const [showCrosshairGuide, setShowCrosshairGuide] = useState(false);

  // Close sound dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
        setShowSoundDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Interactive Speed Track Drag Controller
  const speedTrackRef = useRef<HTMLDivElement>(null);

  const updateSpeedFromClientX = useCallback((clientX: number) => {
    if (!speedTrackRef.current) return;
    const rect = speedTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newSpeed = Math.round(1 + ratio * 29); // 1 to 30
    setCutsPerSecond(newSpeed);
  }, []);

  const handleSpeedTrackMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updateSpeedFromClientX(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => {
      updateSpeedFromClientX(moveEvent.clientX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSpeedTrackTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    updateSpeedFromClientX(e.touches[0].clientX);
    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      updateSpeedFromClientX(moveEvent.touches[0].clientX);
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  // Studio Mode: Match Cut (Whip Cuts) vs Animated Highlighter (Slow Sweep)
  const [animationMode, setAnimationMode] = useState<'match-cut' | 'animated-highlight'>('match-cut');
  const [highlightDirection, setHighlightDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [highlightDuration, setHighlightDuration] = useState(2.0); // seconds
  const [highlightProgress, setHighlightProgress] = useState(1.0); // 0 to 1

  // Paper Motion — the SAME shared spring/streak library as the Text
  // Highlighter: the sequence slams into frame with directional motion blur,
  // runs, then the last paper whips back out with a hot streak.
  const [entranceDirection, setEntranceDirection] = useState<'none' | 'top' | 'bottom' | 'left' | 'right'>('none');
  const [entranceFlight, setEntranceFlight] = useState(0.6);
  const [entranceHold, setEntranceHold] = useState(0.4);
  const [entranceBlur, setEntranceBlur] = useState(0.8);
  const [entranceProgress, setEntranceProgress] = useState(1);
  const [exitDirection, setExitDirection] = useState<'none' | 'top' | 'bottom' | 'left' | 'right'>('none');
  const [exitDuration, setExitDuration] = useState(0.5);
  const [exitBlur, setExitBlur] = useState(0.85);
  const [exitProgress, setExitProgress] = useState(0);

  // Sidebar Tab Navigation
  const [activeTab, setActiveTab] = useState<'headlines' | 'style' | 'macro' | 'export'>('headlines');

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  // Export resolution multiplier — 2 = 4K (e.g. 9:16 becomes 2160×3840).
  const [exportScale, setExportScale] = useState(1);

  // Canvas Refs & Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastCutTimeRef = useRef<number>(0);
  const animStartTimeRef = useRef<number>(0);

  const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspectRatio) || ASPECT_RATIOS[0];

  // Motion timeline (ms): [slam-in] → main (whip loops / sweep) → [whip-out] → tail.
  // Deterministic clock shared by the live loop and the frame-stepped exporter.
  const entranceWindowMs = entranceDirection === 'none' ? 0 : (entranceFlight + entranceHold) * 1000;
  const exitWindowMs = exitDirection === 'none' ? 0 : exitDuration * 1000;
  const EXIT_TAIL_MS = 450;
  const mainWindowMs = animationMode === 'animated-highlight'
    ? highlightDuration * 1000 + 300 // sweep + settle beat
    : (cuts.length / Math.max(1, cutsPerSecond)) * 1000 * 3; // 3 whip loops
  const motionTotalMs = entranceWindowMs + mainWindowMs + exitWindowMs + EXIT_TAIL_MS;

  const sampleMotion = (elapsedMs: number): { entP: number; mainT: number; exitP: number } => {
    let t = Math.max(0, elapsedMs);
    if (entranceWindowMs > 0) {
      if (t < entranceWindowMs) return { entP: t / entranceWindowMs, mainT: 0, exitP: 0 };
      t -= entranceWindowMs;
    }
    if (t < mainWindowMs) return { entP: 1, mainT: t, exitP: 0 };
    t -= mainWindowMs;
    if (exitWindowMs > 0) {
      if (t < exitWindowMs) return { entP: 1, mainT: mainWindowMs, exitP: t / exitWindowMs };
      return { entP: 1, mainT: mainWindowMs, exitP: 1 };
    }
    return { entP: 1, mainT: mainWindowMs, exitP: 0 };
  };

  // Bundle current render options.
  // Match-cut anchors are clamped to ≤23 chars per phrase — the optical lock
  // only works when the camera centers on a short, identical phrase in every
  // paper; long phrases smear the lock point across the whole headline.
  // ── REAL PAPER scan mode ──────────────────────────────────────────
  // One uploaded screenshot → OCR → word-level picks → hard zoom-cuts.
  // Tap ONE word (or a neighbor to widen it to a two-word span), or paste
  // a word list and let the finder locate each phrase in the document.
  const [paperSource, setPaperSource] = useState<'synthetic' | 'real'>('synthetic');
  const [scanImage, setScanImage] = useState<HTMLImageElement | null>(null);
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null);
  const [scanImageW, setScanImageW] = useState(0);
  const [scanImageH, setScanImageH] = useState(0);
  const [scanLines, setScanLines] = useState<RealPaperLine[]>([]);
  const [scanPicks, setScanPicks] = useState<RealPaperPick[]>([]);
  const [scanEdgeColor, setScanEdgeColor] = useState<string | null>(null);
  const [scanFillStyle, setScanFillStyle] = useState<'paper' | 'edge' | 'blur'>('blur');
  const [scanPageChange, setScanPageChange] = useState(true);
  const [scanPasteText, setScanPasteText] = useState('');
  const [scanMatchMode, setScanMatchMode] = useState<'exact' | 'contains'>('contains');
  const [scanRangeFrom, setScanRangeFrom] = useState<number | null>(null);
  const [scanTrimAt, setScanTrimAt] = useState<number | null>(null);
  const [scanTrimWord, setScanTrimWord] = useState<number | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  // OCR live state — drives the thinking-orb overlay on the canvas so the
  // app never looks frozen while the engine loads and reads the document.
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrPhase, setOcrPhase] = useState('READING DOCUMENT');
  const [ocrProgress, setOcrProgress] = useState(0);
  const scanFileRef = useRef<HTMLInputElement | null>(null);
  const scanCutTRef = useRef(0);

  // ─── SESSION MEMORY — refresh-safe ────────────────────────────────────────
  // The paper, the OCR lines and the picks survive a reload: same IndexedDB
  // slot system the text-highlighter uses, so a refresh never eats your work.
  const sessionLoadStartedRef = useRef(false);
  const sessionHydratedRef = useRef(false);
  useEffect(() => {
    if (sessionLoadStartedRef.current) return;
    sessionLoadStartedRef.current = true;
    let cancelled = false;
    (async () => {
      const rec = await loadState<MatchCutSession>('match-cut');
      if (rec?.state) {
        const s = rec.state;
        if (s.paperSource === 'real') setPaperSource('real');
        if (s.scanFillStyle === 'paper' || s.scanFillStyle === 'edge') setScanFillStyle(s.scanFillStyle);
        setScanPageChange(s.scanPageChange !== false);
        if (typeof s.scanEdgeColor === 'string') setScanEdgeColor(s.scanEdgeColor);
        setScanPasteText(String(s.scanPasteText ?? ''));
        if (s.scanMatchMode === 'exact') setScanMatchMode('exact');
        if (typeof s.scanImageDataUrl === 'string' && s.scanImageDataUrl && Array.isArray(s.scanLines) && s.scanLines.length > 0) {
          const img = new Image();
          img.onload = () => {
            if (cancelled) return;
            setScanImage(img);
            setScanImageUrl(s.scanImageDataUrl as string);
            setScanImageW(img.naturalWidth);
            setScanImageH(img.naturalHeight);
          };
          img.src = s.scanImageDataUrl;
          setScanLines(s.scanLines);
          setScanPicks(Array.isArray(s.scanPicks) ? s.scanPicks : []);
        }
      }
      if (!cancelled) sessionHydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced autosave — nothing to press; the work is simply there when you
  // come back. (Skipped until hydration finishes so defaults never clobber a
  // saved session mid-load.)
  useEffect(() => {
    if (!sessionHydratedRef.current) return;
    const t = setTimeout(() => {
      void saveState<MatchCutSession>('match-cut', 'Match-cut working state', {
        paperSource,
        scanLines,
        scanPicks,
        scanFillStyle,
        scanPageChange,
        scanEdgeColor,
        scanPasteText,
        scanMatchMode,
        scanImageDataUrl: scanImageUrl && !scanImageUrl.startsWith('blob:') ? scanImageUrl : null,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [paperSource, scanLines, scanPicks, scanFillStyle, scanPageChange, scanEdgeColor, scanPasteText, scanMatchMode, scanImageUrl]);

  // Average color of the image's outer border ring → the EDGE fill color.
  const sampleEdgeColor = (img: HTMLImageElement): string | null => {
    try {
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 24;
      const cx = c.getContext('2d');
      if (!cx) return null;
      cx.drawImage(img, 0, 0, 24, 24);
      const d = cx.getImageData(0, 0, 24, 24).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          if (x > 1 && x < 22 && y > 1 && y < 22) continue; // border ring only
          const i = (y * 24 + x) * 4;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          n++;
        }
      }
      if (n === 0) return null;
      const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    } catch {
      return null;
    }
  };

  const handleScanImport = async (file: File) => {
    setOcrBusy(true);
    setOcrProgress(2);
    setOcrPhase('DECODING IMAGE');
    setOcrStatus('Decoding image…');
    try {
      // dataURL, not a blob URL — blob URLs die on refresh; this way the
      // session memory below can put the paper right back after a reload.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('decode failed'));
        r.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('decode failed'));
        image.src = dataUrl;
      });

      setOcrPhase('LOADING THE READER');
      setOcrProgress(3);
      setOcrStatus('Loading the reader — it downloads once, then lives on your device…');
      const Tesseract = await import('tesseract.js');
      type OcrWorker = {
        recognize: (image: HTMLImageElement | string, opts?: unknown, out?: unknown) => Promise<{ data: any }>;
        terminate: () => Promise<unknown>;
      };
      const createOcrWorker = (Tesseract as unknown as {
        createWorker: (lang?: string, oem?: number, options?: { logger?: (m: { status?: string; progress?: number }) => void }) => Promise<OcrWorker>;
      }).createWorker;
      // Every tesseract logger status maps to a friendly phase label plus a
      // slice of the 0–100 bar on the canvas overlay — the orb keeps moving
      // the whole time, so the app never reads as frozen.
      const OCR_PHASES: Record<string, [string, number, number]> = {
        'loading tesseract core': ['LOADING READER', 4, 10],
        'initializing tesseract': ['STARTING ENGINE', 10, 16],
        'loading language traineddata': ['DOWNLOADING LANGUAGE MODEL', 16, 55],
        'initializing api': ['PREPARING READER', 55, 62],
        'recognizing text': ['READING DOCUMENT', 62, 100],
      };
      const worker = await createOcrWorker('eng', 1, {
        logger: (m) => {
          const phase = OCR_PHASES[m.status ?? ''];
          if (!phase) return;
          const p = Math.min(1, Math.max(0, typeof m.progress === 'number' ? m.progress : 0));
          setOcrPhase(m.status === 'recognizing text' ? `READING DOCUMENT — ${Math.round(p * 100)}%` : phase[0]);
          setOcrProgress(Math.round(phase[1] + (phase[2] - phase[1]) * p));
        },
      });

      // EXACT parity with the text-highlighter's OCR: the raw image goes
      // straight into recognition — same input, same output options, same
      // extraction — so any screenshot the highlighter reads, this reads.
      const iw = img.naturalWidth || 1;
      const ih = img.naturalHeight || 1;
      const { data } = await worker.recognize(img, {}, { blocks: true, text: true });
      await worker.terminate();

      const lines: RealPaperLine[] = [];
      const pushLine = (
        text: unknown,
        bbox?: { x0: number; y0: number; x1: number; y1: number },
        words?: { text?: unknown; bbox?: { x0: number; y0: number; x1: number; y1: number } }[]
      ) => {
        const t = String(text ?? '').replace(/\s+/g, ' ').trim();
        if (!t || t.length < 2 || !bbox) return;
        const normWords = (words || [])
          .map((w) => ({
            text: String(w.text ?? '').trim(),
            box: w.bbox ? { x0: w.bbox.x0 / iw, y0: w.bbox.y0 / ih, x1: w.bbox.x1 / iw, y1: w.bbox.y1 / ih } : null,
          }))
          .filter((w): w is { text: string; box: { x0: number; y0: number; x1: number; y1: number } } => w.text.length > 0 && w.box !== null);
        lines.push({
          id: `scan-line-${lines.length}`,
          text: t,
          box: { x0: bbox.x0 / iw, y0: bbox.y0 / ih, x1: bbox.x1 / iw, y1: bbox.y1 / ih },
          words: normWords.length > 0 ? normWords : undefined,
        });
      };
      if (Array.isArray(data.blocks) && data.blocks.length > 0) {
        data.blocks.forEach((b: any) => b?.paragraphs?.forEach((p: any) => p?.lines?.forEach((l: any) => pushLine(l?.text, l?.bbox, Array.isArray(l?.words) ? l.words : undefined))));
      } else if (Array.isArray(data.lines) && data.lines.length > 0) {
        data.lines.forEach((l: any) => pushLine(l?.text, l?.bbox, Array.isArray(l?.words) ? l.words : undefined));
      } else if (Array.isArray(data.words) && data.words.length > 0) {
        const words = (data.words as any[]).filter((w) => w?.text?.trim() && w?.bbox);
        const bands: { y: number; items: any[] }[] = [];
        words.forEach((w) => {
          const cy = (w.bbox.y0 + w.bbox.y1) / 2;
          const band = bands.find((bd) => Math.abs(bd.y - cy) < (w.bbox.y1 - w.bbox.y0) * 0.7);
          if (band) {
            band.items.push(w);
            band.y = band.items.reduce((s, it) => s + (it.bbox.y0 + it.bbox.y1) / 2, 0) / band.items.length;
          } else {
            bands.push({ y: cy, items: [w] });
          }
        });
        bands.sort((a, b) => a.y - b.y).forEach((bd) => {
          const items = [...bd.items].sort((a, b) => a.bbox.x0 - b.bbox.x0);
          pushLine(
            items.map((w) => w.text).join(' '),
            {
              x0: Math.min(...items.map((w) => w.bbox.x0)),
              y0: Math.min(...items.map((w) => w.bbox.y0)),
              x1: Math.max(...items.map((w) => w.bbox.x1)),
              y1: Math.max(...items.map((w) => w.bbox.y1)),
            },
            items.map((w) => ({ text: w.text, bbox: w.bbox }))
          );
        });
      }

      if (lines.length === 0) {
        setOcrBusy(false);
        setOcrStatus('No readable text found — try a sharper, brighter photo of the article.');
        setTimeout(() => setOcrStatus(null), 4000);
        return;
      }

      if (scanImageUrl?.startsWith('blob:')) URL.revokeObjectURL(scanImageUrl);
      setScanEdgeColor(sampleEdgeColor(img));
      setScanImage(img);
      setScanImageUrl(dataUrl);
      setScanImageW(img.naturalWidth);
      setScanImageH(img.naturalHeight);
      setScanLines(lines);
      setPaperSource('real');
      setScanPicks([]);
      setCurrentCutIndex(0);
      scanCutTRef.current = 0;
      setIsPlaying(true);
      setOcrBusy(false);
      setOcrStatus(`Extracted ${lines.length} lines — tap lines in cut order, ✂ BREAK / TRIM to cut on one word, or paste a word list.`);
      setTimeout(() => setOcrStatus(null), 5000);
    } catch (err) {
      console.warn('Scan import failed:', err);
      const isDecode = err instanceof Error && err.message.includes('decode');
      const heic = /\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/.test(file.type);
      setOcrStatus(
        isDecode
          ? heic
            ? 'This looks like an HEIC photo — export it as JPG/PNG from your photos app and retry.'
            : 'That image could not be decoded — try a JPG or PNG screenshot.'
          : 'Reading failed — the reader downloads once, so check your connection and retry.'
      );
      setTimeout(() => setOcrStatus(null), 4500);
    }
  };

  // Which cut (if any) owns this LINE? LINE picks, word-span picks, and
  // paste picks all trace back to a line — this drives the numbered
  // position badges on every line row, exactly like the highlighter.
  const scanPickIndexOfLine = (lineId: string): number =>
    scanPicks.findIndex((p) => p.id === `l-${lineId}` || p.id.startsWith(`w-${lineId}-`) || (p.id.startsWith('p-') && p.id.includes(`-${lineId}-`)));

  // RANGE — grab a continuous block of lines in one shot: RANGE on the
  // first line, RANGE on the last — every line in the block becomes its
  // own hard cut, in reading order (same gesture as the highlighter).
  const applyScanRange = (from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const block = scanLines.slice(lo, hi + 1).map((line) => ({ id: `l-${line.id}`, text: line.text, box: line.box }));
    setScanPicks([...scanPicks.filter((p) => !block.some((b) => b.id === p.id)), ...block]);
    setCurrentCutIndex(0);
    scanCutTRef.current = 0;
    setScanRangeFrom(null);
  };

  const pickScanLine = (line: RealPaperLine) => {
    const existing = scanPickIndexOfLine(line.id);
    if (existing >= 0) {
      setScanPicks(scanPicks.filter((_, i) => i !== existing));
      if (scanTrimAt === existing) {
        setScanTrimAt(null);
        setScanTrimWord(null);
      }
      setCurrentCutIndex(0);
      scanCutTRef.current = 0;
      return;
    }
    setScanPicks([...scanPicks, { id: `l-${line.id}`, text: line.text, box: line.box }]);
  };

  const removeScanPick = (idx: number) => {
    setScanPicks(scanPicks.filter((_, i) => i !== idx));
    if (scanTrimAt != null) {
      if (scanTrimAt === idx) {
        setScanTrimAt(null);
        setScanTrimWord(null);
      } else if (scanTrimAt > idx) {
        setScanTrimAt(scanTrimAt - 1);
      }
    }
    setCurrentCutIndex(0);
    scanCutTRef.current = 0;
  };

  // ✂ BREAK / TRIM — same gesture as the highlighter: pick the line (if
  // needed) and open its word trimmer.
  const openScanTrimForLine = (line: RealPaperLine) => {
    const existing = scanPickIndexOfLine(line.id);
    if (existing >= 0) {
      setScanTrimAt(existing);
    } else {
      setScanPicks([...scanPicks, { id: `l-${line.id}`, text: line.text, box: line.box }]);
      setScanTrimAt(scanPicks.length);
    }
    setScanTrimWord(null);
  };

  // Inside the trimmer: first tap narrows the pick to that single word;
  // a second tap on another word of the same line widens it into a
  // two-word span (the "one word or two words" contract).
  const handleScanTrimWord = (wi: number) => {
    if (scanTrimAt == null) return;
    const pick = scanPicks[scanTrimAt];
    if (!pick) return;
    const line = scanLines.find((l) => pick.id === `l-${l.id}` || pick.id.startsWith(`w-${l.id}-`) || (pick.id.startsWith('p-') && pick.id.includes(`-${l.id}-`)));
    const words = line?.words || [];
    if (!line || !words[wi]) return;
    if (scanTrimWord == null) {
      setScanTrimWord(wi);
      const w = words[wi];
      setScanPicks(scanPicks.map((p, i) => (i === scanTrimAt ? { ...p, id: `w-${line.id}-${wi}-${wi}`, text: w.text, box: w.box } : p)));
      return;
    }
    const lo = Math.min(scanTrimWord, wi);
    const hi = Math.max(scanTrimWord, wi);
    const span = words.slice(lo, hi + 1);
    setScanPicks(scanPicks.map((p, i) => (i === scanTrimAt ? {
      ...p,
      id: `w-${line.id}-${lo}-${hi}`,
      text: span.map((s) => s.text).join(' '),
      box: {
        x0: Math.min(...span.map((s) => s.box.x0)),
        y0: Math.min(...span.map((s) => s.box.y0)),
        x1: Math.max(...span.map((s) => s.box.x1)),
        y1: Math.max(...span.map((s) => s.box.y1)),
      },
    }
    : p)));
  };

  // PASTE WORDS — one word/phrase per line. The whole document is one
  // flattened word stream, so phrases can wrap across lines. Every
  // occurrence of a pasted word becomes its own cut, in reading order:
  // paste "war" once and War, Warfare, Warring… all get claimed.
  // Matching is case- and punctuation-insensitive containment — a
  // pasted word matches ANY word containing it.
  const applyScanPaste = () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
    const phrases = scanPasteText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (phrases.length === 0) return;

    const stream = scanLines
      .flatMap((line) => (line.words || []).map((w, wi) => ({ t: norm(w.text), line, wi, w })))
      .filter((x) => x.t.length > 0);

    const found: RealPaperPick[] = [];
    const used = new Set<string>();

    // One pasted line → EVERY unused occurrence becomes its own cut, in
    // reading order: paste "war" once and War, Warfare, Warring… are all
    // claimed in a single sweep. Words already claimed by an earlier
    // pasted line are skipped, so nothing is ever cut twice.
    const findAllOccurrences = (wanted: string[]): RealPaperPick[] => {
      const picks: RealPaperPick[] = [];
      for (let s = 0; s + wanted.length <= stream.length; s++) {
        let ok = true;
        for (let k = 0; k < wanted.length; k++) {
          // MATCH mode — CONTAINS: the word inside longer words too
          // ("war" lands on "Warfare", "Warring"…). EXACT: the word
          // itself only. Either way: any case, punctuation-insensitive.
          const hit = scanMatchMode === 'exact'
            ? stream[s + k].t === wanted[k]
            : stream[s + k].t.includes(wanted[k]);
          if (!hit) { ok = false; break; }
        }
        if (!ok) continue;
        const spanWords = stream.slice(s, s + wanted.length);
        if (spanWords.some((x) => used.has(`${x.line.id}:${x.wi}`))) continue;
        spanWords.forEach((x) => used.add(`${x.line.id}:${x.wi}`));
        picks.push({
          id: `p-${found.length + picks.length}-${spanWords[0].line.id}-${spanWords[0].wi}`,
          text: spanWords.map((x) => x.w.text).join(' '),
          box: {
            x0: Math.min(...spanWords.map((x) => x.w.box.x0)),
            y0: Math.min(...spanWords.map((x) => x.w.box.y0)),
            x1: Math.max(...spanWords.map((x) => x.w.box.x1)),
            y1: Math.max(...spanWords.map((x) => x.w.box.y1)),
          },
        });
      }
      return picks;
    };

    let missing = 0;
    phrases.forEach((phrase) => {
      const wanted = phrase.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
      if (wanted.length === 0) { missing++; return; }
      const picks = findAllOccurrences(wanted);
      if (picks.length > 0) {
        found.push(...picks);
      } else {
        missing++;
      }
    });

    setScanPicks(found);
    setScanRangeFrom(null);
    setScanTrimAt(null);
    setScanTrimWord(null);
    setCurrentCutIndex(0);
    scanCutTRef.current = 0;
    if (found.length > 0) setIsPlaying(true);
    setOcrStatus(missing > 0
      ? `${found.length} cuts — every occurrence, in reading order. ${missing} pasted line${missing === 1 ? '' : 's'} not found (check spelling, or the reader misread it).`
      : `${found.length} cuts — every occurrence, in reading order.`);
    setTimeout(() => setOcrStatus(null), 4500);
  };

  // One switch for the paper source — the sidebar chooser card and the
  // compact viewport toggle both route through here so the clock and the
  // RANGE/trim state always reset together.
  const switchPaperSource = (id: 'synthetic' | 'real') => {
    setPaperSource(id);
    setCurrentCutIndex(0);
    scanCutTRef.current = 0;
    lastCutTimeRef.current = 0;
    setIsPlaying(true);
    setScanRangeFrom(null);
    setScanTrimAt(null);
    setScanTrimWord(null);
  };

  const renderOptions: RenderOptions = {
    anchorPhrase: anchorPhrase
      .split('|')
      .map((p) => p.trim().slice(0, 23))
      .filter(Boolean)
      .join(' | '),
    highlightColor,
    highlightStyle,
    markerOpacity,
    paperTheme,
    depthOfField,
    dofIntensity,
    filmGrain,
    cameraShake,
    aspectRatio,
    showCrosshairGuide,
    animationMode,
    highlightProgress: animationMode === 'animated-highlight' ? highlightProgress : 1.0,
    highlightDirection,
    highlightSector,
    fontFamily,
    fontCycleList: animationMode === 'match-cut' ? fontCycleList : undefined,
    showTopColumns,
    showMasthead,
    showSubhead,
    showByline,
    showBottomColumns,
    showDividerRules,
  };

  // Composite with the SHARED paper-transition library: slam-in before the
  // sequence, whip-out after it. Falls through to the plain render otherwise.
  const renderWithMotion = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cut: NewspaperCut,
    opts: RenderOptions,
    cutIndex: number,
    entP: number,
    exitP: number
  ) => {
    const theme = PAPER_THEMES[paperTheme] || PAPER_THEMES.vintage;
    if (entranceDirection !== 'none' && entP < 1) {
      renderPaperTransition(ctx, width, height, (c) => {
        renderNewspaperMatchCut(c, width, height, cut, {
          ...opts,
          highlightProgress: animationMode === 'animated-highlight' ? 0 : opts.highlightProgress,
        }, cutIndex);
      }, { mode: 'in', direction: entranceDirection, progress: entP, blur: entranceBlur, bg: theme.bg });
      return;
    }
    if (exitDirection !== 'none' && exitP > 0) {
      renderPaperTransition(ctx, width, height, (c) => {
        renderNewspaperMatchCut(c, width, height, cut, opts, cutIndex);
      }, { mode: 'out', direction: exitDirection, progress: exitP, blur: exitBlur, bg: theme.bg });
      return;
    }
    renderNewspaperMatchCut(ctx, width, height, cut, opts, cutIndex);
  };

  // Redraw current cut (optionally with per-frame motion overrides — hp lets
  // the animated-highlight sweep run at FULL frame rate even though the
  // React progress states are only synced at ~10 Hz)
  const redraw = useCallback((entP?: number, exitP?: number, hp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // REAL PAPER: hard zoom-cuts over the OCR'd screenshot. The cut clock
    // is (currentCutIndex → which word is live, scanCutTRef → sweep inside
    // the cut); entrance/exit paper transitions are a synthetic-mode thing.
    if (paperSource === 'real') {
      if (scanImage) {
        renderRealPaperMatchCut(ctx, canvas.width, canvas.height, scanImage, scanImageW, scanImageH, scanPicks, {
          highlightColor,
          highlightStyle,
          markerOpacity,
          highlightDirection,
          fillStyle: scanFillStyle,
          edgeColor: scanEdgeColor ?? undefined,
          filmGrain,
          depthOfField,
          dofIntensity,
          cutT: scanCutTRef.current,
          cutIndex: currentCutIndex,
          pageChange: scanPageChange,
        });
      }
      return;
    }

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderWithMotion(
      ctx,
      canvas.width,
      canvas.height,
      cut,
      hp !== undefined ? { ...renderOptions, highlightProgress: hp } : renderOptions,
      currentCutIndex,
      entP ?? entranceProgress,
      exitP ?? exitProgress
    );
  }, [cuts, currentCutIndex, renderOptions, entranceProgress, exitProgress, entranceDirection, exitDirection, entranceBlur, exitBlur, paperTheme, animationMode, paperSource, scanImage, scanImageW, scanImageH, scanPicks, scanFillStyle, scanEdgeColor, scanPageChange]);

  // Live Animation Loop supporting both Match Cut and Animated Highlighter
  // modes — one deterministic motion clock drives slam-in / main / whip-out.
  // The canvas is driven DIRECTLY every frame; React progress state syncs at
  // ~10 Hz so the 60 fps render path never re-renders the page mid-motion.
  const redrawRef = useRef(redraw);
  // Sync the latest redraw into the ref AFTER commit (never during render —
  // react-hooks/refs). Declared before the loop effect so it always runs first.
  useEffect(() => {
    redrawRef.current = redraw;
  }, [redraw]);

  useEffect(() => {
    let active = true;
    let lastStateSync = 0;

    const loop = (timestamp: number) => {
      if (!active) return;

      if (isPlaying) {
        if (!animStartTimeRef.current) animStartTimeRef.current = timestamp;
        const elapsed = (timestamp - animStartTimeRef.current) % motionTotalMs;
        const m = sampleMotion(elapsed);
        const inMotionWindow =
          (entranceDirection !== 'none' && m.entP < 1) ||
          (exitDirection !== 'none' && m.exitP > 0);

        // Full-frame-rate sweep value for animated mode; the explicit args
        // below carry it to the canvas — state is only a ~10 Hz UI readout.
        let hpOverride: number | undefined;
        if (animationMode !== 'match-cut') {
          const drawDurationMs = highlightDuration * 1000;
          hpOverride = m.mainT <= drawDurationMs ? easeHighlightSweep(m.mainT / drawDurationMs) : 1.0;
        }
        if (timestamp - lastStateSync > 100) {
          lastStateSync = timestamp;
          setEntranceProgress(m.entP);
          setExitProgress(m.exitP);
          if (hpOverride !== undefined) setHighlightProgress(hpOverride);
        }

        if (paperSource === 'real') {
          // REAL cut clock: advance through word picks at cuts/sec, and
          // track the intra-cut sweep so the marker stamps every cut.
          if (scanPicks.length > 0) {
            const interval = 1000 / cutsPerSecond;
            if (timestamp - lastCutTimeRef.current >= interval) {
              lastCutTimeRef.current = timestamp;
              setCurrentCutIndex((prev) => {
                const next = (prev + 1) % scanPicks.length;
                const strokeDur = Math.min(0.28, Math.max(0.08, 0.9 / Math.max(1, cutsPerSecond)));
                playCutSound(soundEffect, soundVolume, strokeDur);
                return next;
              });
            }
            scanCutTRef.current = Math.min(1, (timestamp - lastCutTimeRef.current) / interval);
          }
        } else if (animationMode === 'match-cut') {
          if (inMotionWindow) {
            // Motion windows hold the boundary cut — no whip-cutting mid-flight.
            setCurrentCutIndex(0);
          } else if (cuts.length > 0) {
            const interval = 1000 / cutsPerSecond;
            if (timestamp - lastCutTimeRef.current >= interval) {
              lastCutTimeRef.current = timestamp;
              setCurrentCutIndex((prev) => {
                const next = (prev + 1) % cuts.length;
                // Short percussive stroke per cut — full-length looping
                // strokes stack into clipping distortion on rapid cuts.
                const strokeDur = Math.min(0.28, Math.max(0.08, 0.9 / Math.max(1, cutsPerSecond)));
                playCutSound(soundEffect, soundVolume, strokeDur);
                return next;
              });
            }
          }
        }

        redrawRef.current(m.entP, m.exitP, hpOverride);
      } else {
        redrawRef.current();
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, cutsPerSecond, cuts.length, soundEffect, soundVolume, animationMode, highlightDuration, motionTotalMs, entranceDirection, exitDirection, paperSource, scanPicks.length]);

  // Cross-tool intake (§4): transcript text handed off from Auto-Captions seeds the anchor phrase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await takeHandoffText('match-cut');
      if (cancelled || !text) return;
      // Headlines are clamped to 23 chars in the renderer — build the longest
      // opening phrase from the transcript that still fits.
      let phrase = '';
      for (const w of text.split(/\s+/).filter(Boolean)) {
        if ((phrase + ' ' + w).trim().length > 23) break;
        phrase = (phrase + ' ' + w).trim();
      }
      if (!phrase) phrase = (text.split(/\s+/).filter(Boolean)[0] ?? '').slice(0, 23);
      if (!phrase) return;
      setAnchorPhrase(phrase);
      setCuts(generateCutsForPhrase(phrase, 8, anchorPosition));
      setCurrentCutIndex(0);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load Curated Topic Preset
  const handleLoadPreset = (presetId: string) => {
    const p = PRESET_TOPICS.find((t) => t.id === presetId);
    if (!p) return;
    setAnchorPhrase(p.anchor);
    setHighlightColor(p.highlightColor);
    setHighlightStyle(p.highlightStyle);
    setPaperTheme(p.paperTheme);
    setCuts(p.cuts);
    setCurrentCutIndex(0);
  };

  // Generate 8 new headlines for any custom anchor phrase
  const handleAutoGenerate = () => {
    const phrase = anchorPhrase.trim();
    if (!phrase) return;
    setIsGenerating(true);
    const newCuts = generateCutsForPhrase(phrase, 8, anchorPosition);
    setCuts(newCuts);
    setCurrentCutIndex(0);
    lastCutTimeRef.current = performance.now();
    playCutSound(soundEffect, soundVolume);
    setTimeout(() => setIsGenerating(false), 250);
  };

  // Add a blank custom headline cut
  const handleAddCut = () => {
    const newIndex = cuts.length;
    const masthead = MASTHEADS[newIndex % MASTHEADS.length];
    const location = LOCATIONS[newIndex % LOCATIONS.length];
    const byline = BYLINES[newIndex % BYLINES.length];
    const newCut: NewspaperCut = {
      id: `cut-${Date.now()}`,
      masthead,
      subhead: 'Special Investigations Bureau',
      headline: `The secret truth about ${anchorPhrase || 'the topic'} revealed`,
      byline,
      location,
      bodyParagraphs: [
        'Investigators confirmed that documents subpoenaed earlier this morning contain critical corroborating testimony.',
        'When pressed for details, committee representatives affirmed that the full report will be presented in open session.',
      ],
      dateString: 'VOL. XC NO. 5,120 • LATE CITY EDITION • PRICE 25 CENTS',
      columnCount: 3,
      rotationOffset: (Math.random() - 0.5) * 0.8,
    };
    setCuts([...cuts, newCut]);
    setCurrentCutIndex(cuts.length);
  };

  // Remove a cut
  const handleDeleteCut = (index: number) => {
    if (cuts.length <= 1) return;
    const updated = cuts.filter((_, i) => i !== index);
    setCuts(updated);
    if (currentCutIndex >= updated.length) {
      setCurrentCutIndex(updated.length - 1);
    }
  };

  // Update headline text
  const handleHeadlineChange = (index: number, text: string) => {
    const updated = [...cuts];
    updated[index] = { ...updated[index], headline: text };
    setCuts(updated);
  };

  // Step Controls
  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentCutIndex((prev) => (prev > 0 ? prev - 1 : cuts.length - 1));
    playCutSound(soundEffect, soundVolume);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentCutIndex((prev) => (prev + 1) % cuts.length);
    playCutSound(soundEffect, soundVolume);
  };

  // Copy Single Still Frame PNG
  const handleCopySingleFrame = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      });
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  // Download Single Still Frame PNG
  // Downloads gated behind a sponsor pause (owner correction 2026-10-07:
  // generate stays free, the export/download moment carries the ad).
  const handleDownloadSingleFrame = () =>
    gateAction('/match-cut', 'Download frame', 'download', 0, handleDownloadSingleFrameUngated);
  const handleDownloadSingleFrameUngated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `match-cut-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}-frame-${currentCutIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export PNG Sequence ZIP (gated)
  const handleExportZip = () =>
    gateAction('/match-cut', 'Download PNG sequence', 'download', 0, () => {
      void handleExportZipUngated();
    });
  const handleExportZipUngated = async () => {
    setIsExporting(true);
    setExportProgress('Rendering PNG sequence...');
    try {
      const JSZip = (await import('jszip')).default; // lazy per §7 — never in the page bundle
      const zip = new JSZip();
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = selectedAspect.width;
      exportCanvas.height = selectedAspect.height;
      const ctx = exportCanvas.getContext('2d')!;

      const realStill = paperSource === 'real' && scanImage && scanPicks.length > 0;
      const stillCount = realStill ? scanPicks.length : cuts.length;
      for (let i = 0; i < stillCount; i++) {
        setExportProgress(`Rendering frame ${i + 1} of ${stillCount}...`);
        if (realStill) {
          renderRealPaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, scanImage, scanImageW, scanImageH, scanPicks, {
            highlightColor,
            highlightStyle,
            markerOpacity,
            highlightDirection,
            fillStyle: scanFillStyle,
            edgeColor: scanEdgeColor ?? undefined,
            filmGrain,
            depthOfField,
            dofIntensity,
            cutT: 1,
            cutIndex: i,
            pageChange: scanPageChange,
          });
        } else {
          renderNewspaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, cuts[i], renderOptions, i);
        }
        const dataUrl = exportCanvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        zip.file(`match-cut-${String(i + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
      }

      setExportProgress('Packing ZIP archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `match-cuts-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}-pngs.zip`;
      link.click();
      setExportProgress(null);
    } catch (err) {
      console.error('ZIP Export failed:', err);
      setExportProgress('Export failed.');
      setTimeout(() => setExportProgress(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);

  // Export High-Definition Video via deterministic WebCodecs encoding.
  // Every frame is rendered exactly once with an explicit timestamp — no
  // real-time MediaRecorder capture, so no dropped frames, no stutter, and a
  // constant frame rate at High-profile H.264 quality (with offline AAC audio).
  const handleExportVideo = () =>
    gateAction('/match-cut', 'Download video', 'download', 0, () => {
      void handleExportVideoUngated();
    });
  const handleExportVideoUngated = async () => {
    if (cuts.length === 0 && !(paperSource === 'real' && scanImage && scanPicks.length > 0)) return;
    setIsExporting(true);
    setIsPlaying(false);
    const exportResLabel = `${exportScale > 1 ? '4K' : 'HD'} (${selectedAspect.width * exportScale}×${selectedAspect.height * exportScale})`;
    setExportProgress(`Preparing ${exportResLabel} encoder...`);

    try {
      const isAnimated = animationMode === 'animated-highlight';
      // 60fps for the cinematic sweep — buttery, matches the live preview.
      // Rapid whip-cut sequences stay at 30fps; the staccato is the point.
      const fps = isAnimated ? 60 : 30;
      const framesPerCut = Math.max(3, Math.round(fps / cutsPerSecond));
      // REAL mode cuts through word picks; synthetic cuts through generated pages.
      const exportCutCount = paperSource === 'real' ? Math.max(1, scanPicks.length) : cuts.length;

      // Whole motion timeline: slam-in → main → whip-out → tail.
      const totalFrames = Math.max(30, Math.round((motionTotalMs / 1000) * fps));

      // Make sure webfonts (masthead serif, etc.) are ready before any frame renders.
      try {
        await document.fonts?.ready;
      } catch { }

      // Deterministic offline audio track (exact same timeline as the video frames).
      let audioBuffer: AudioBuffer | null = null;
      if (soundEffect !== 'mute') {
        setExportProgress('Rendering audio track...');
        try {
          audioBuffer = await renderOfflineAudio({
            durationSec: totalFrames / fps,
            schedule: (ctx, dest) => {
              const lead = entranceWindowMs / 1000; // sounds wait for the slam-in
              if (isAnimated) {
                synthesizeCutSound(ctx, dest, soundEffect, soundVolume, lead, highlightDuration);
              } else {
                // Short percussive strokes synced to each cut. Full-length
                // 1.8s highlighter drones stacked on rapid cuts is what made
                // the old export audio distort into mush.
                const strokeDur = Math.min(0.28, Math.max(0.08, (framesPerCut / fps) * 0.9));
                for (let loop = 0; loop < 3; loop++) {
                  for (let c = 0; c < exportCutCount; c++) {
                    const t = lead + ((loop * exportCutCount + c) * framesPerCut) / fps;
                    synthesizeCutSound(ctx, dest, soundEffect, soundVolume, t, strokeDur);
                  }
                }
              }
            },
          });
        } catch (audioErr) {
          console.warn('Offline audio render bypassed:', audioErr);
          audioBuffer = null;
        }
      }

      const animatedCut = cuts[currentCutIndex] || cuts[0];
      const drawFrames = Math.max(30, Math.round(highlightDuration * fps));

      const result = await exportCanvasVideoToMp4({
        width: selectedAspect.width * exportScale,
        height: selectedAspect.height * exportScale,
        fps,
        totalFrames,
        // 4K needs roughly 2.2× the bits per frame to stay crisp.
        bitrate: exportScale > 1 ? 45_000_000 : 20_000_000,
        audioBuffer,
        // Force a pristine intra frame at every whip-cut boundary so each
        // hard cut snaps in crisp instead of smearing from the previous page.
        isKeyFrame: (i) => !isAnimated && i % framesPerCut === 0,
        onProgress: (p) => setExportProgress(`Encoding ${exportResLabel} video: ${Math.round(p * 100)}%`),
        renderFrame: (frameIndex, ctx) => {
          // Same deterministic motion clock as the live loop.
          const m = sampleMotion((frameIndex / fps) * 1000);
          const inMotionWindow =
            (entranceDirection !== 'none' && m.entP < 1) ||
            (exitDirection !== 'none' && m.exitP > 0);
          if (paperSource === 'real' && scanImage) {
            // Same hard-cut clock as the live loop: floor() picks the word,
            // the fractional part drives that cut's marker sweep.
            const cutCount = Math.max(1, scanPicks.length);
            const cutPos = (m.mainT / 1000) * cutsPerSecond;
            const c = Math.floor(cutPos) % cutCount;
            const cutT = cutPos % 1;
            renderRealPaperMatchCut(ctx, ctx.canvas.width, ctx.canvas.height, scanImage, scanImageW, scanImageH, scanPicks, {
              highlightColor,
              highlightStyle,
              markerOpacity,
              highlightDirection,
              fillStyle: scanFillStyle,
              edgeColor: scanEdgeColor ?? undefined,
              filmGrain,
              depthOfField,
              dofIntensity,
              cutT,
              cutIndex: c,
              pageChange: scanPageChange,
            });
          } else if (isAnimated) {
            const mainFrame = Math.min(drawFrames, Math.round((m.mainT / 1000) * fps));
            const p = mainFrame < drawFrames ? easeHighlightSweep(mainFrame / drawFrames) : 1.0;
            const frameRenderOptions: RenderOptions = {
              ...renderOptions,
              highlightProgress: p,
            };
            renderWithMotion(ctx, ctx.canvas.width, ctx.canvas.height, animatedCut, frameRenderOptions, 0, m.entP, m.exitP);
          } else {
            const c = inMotionWindow ? 0 : Math.floor((m.mainT / 1000) * cutsPerSecond) % cuts.length;
            renderWithMotion(ctx, ctx.canvas.width, ctx.canvas.height, cuts[c], renderOptions, c, m.entP, m.exitP);
          }
        },
      });

      const cleanAnchor =
        anchorPhrase
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'match-cut';
      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(result.blob, `match-cut-${cleanAnchor}.${ext}`);
      // Keep the render around so the NEXT → row can hand the FILE to resizer (§4).
      setLastVideoBlob(result.blob);

      setExportProgress(null);
      setIsPlaying(true);
    } catch (err) {
      console.error('Video Export failed:', err);
      setExportProgress('Video export failed. Try Animated GIF or PNG sequence.');
      setTimeout(() => setExportProgress(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="tool-page-padding" style={{ position: 'relative', minHeight: '100%', padding: '20px 16px 80px', maxWidth: 1380, margin: '0 auto', boxSizing: 'border-box', width: '100%' }}>
      {/* Top Title Section */}
      <div className="tool-page-header" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              color: '#000',
              letterSpacing: '0.14em',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              background: '#FFE500',
              padding: '3px 8px',
              border: '2px solid #000',
              boxShadow: '2px 2px 0 #000',
            }}
          >
            OPTICAL MATCH CUT STUDIO
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#666',
              fontFamily: 'monospace',
            }}
          >
            MACRO LENS OPTICS · 1080P EXPORT
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#000',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Text Match CUT Studio
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#555',
              maxWidth: 720,
              lineHeight: 1.5,
              fontWeight: 500,
              margin: 0,
            }}
          >
            Lock any anchor keyword dead-center on screen while vintage headlines, mastheads, and newspaper archives whip-cut with macro lens depth-of-field.
          </p>
        </div>
      </div>

      {/* Main Workspace 2-Column Grid */}
      <div
        className="matchcut-workspace-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.28fr) minmax(360px, 440px)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Canvas Viewport & Transport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Main Stage Viewport Frame */}
          <div
            className="brutalist-card tool-canvas-frame"
            style={{
              padding: 14,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {/* Viewport Meta Bar */}
            <div
              className="tool-viewport-meta"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#666',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    background: isPlaying ? '#22c55e' : '#a1a1aa',
                    border: '1.5px solid #000',
                    borderRadius: '50%',
                  }}
                />
                <span style={{ color: '#000', fontWeight: 900 }}>
                  CUT {Math.min(currentCutIndex + 1, paperSource === 'real' ? Math.max(1, scanPicks.length) : cuts.length)} OF {paperSource === 'real' ? scanPicks.length : cuts.length}
                </span>
                <span style={{ color: '#aaa' }}>|</span>
                <span style={{ textTransform: 'uppercase', color: '#333', fontWeight: 800 }}>
                  {paperSource === 'real' ? (scanPicks[currentCutIndex]?.text || 'REAL PAPER · TAP WORDS') : (cuts[currentCutIndex]?.masthead || 'NEWSPAPER')}
                </span>
              </div>

              <div className="tool-viewport-meta-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Paper source entry lives in the sidebar as the yellow
                    "Match-cut my screenshot" CTA — same as the highlighter. */}
                <button
                  onClick={() => setShowCrosshairGuide(!showCrosshairGuide)}
                  style={{
                    padding: '4px 8px',
                    border: '1.5px solid #000',
                    background: showCrosshairGuide ? '#000' : '#fff',
                    color: showCrosshairGuide ? '#fff' : '#000',
                    fontFamily: 'monospace',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Toggle optical alignment crosshair"
                >
                  <Crosshair size={11} />
                  GUIDE
                </button>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  style={{
                    padding: '3px 8px',
                    border: '1.5px solid #000',
                    background: '#f4f4f5',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  title="Change aspect ratio"
                >
                  {ASPECT_RATIOS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 3, overflow: 'hidden' }} title="Export resolution — 4K doubles both dimensions (9:16 → 2160×3840)">
                  {[{ id: 1, label: 'HD' }, { id: 2, label: '4K' }].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setExportScale(r.id)}
                      style={{
                        padding: '3px 7px',
                        border: 'none',
                        background: exportScale === r.id ? '#000' : '#fff',
                        color: exportScale === r.id ? '#FFE500' : '#000',
                        fontFamily: 'monospace',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage Canvas */}
            <div
              className="tool-canvas-viewport"
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: 'calc(100vh - 340px)',
                minHeight: 390,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#141413',
                border: '3px solid #000',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', display: 'inline-flex', maxWidth: '100%' }}>
                <canvas
                  ref={canvasRef}
                  width={selectedAspect.width}
                  height={selectedAspect.height}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 360px)',
                    width: 'auto',
                    height: 'auto',
                    aspectRatio: `${selectedAspect.width} / ${selectedAspect.height}`,
                    display: 'block',
                  }}
                />
                {ocrBusy && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(20,20,19,0.78)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                        background: '#fff',
                        border: '2px solid #000',
                        borderRadius: 4,
                        boxShadow: '4px 4px 0 #000',
                        padding: '22px 30px 18px',
                        maxWidth: '86%',
                      }}
                    >
                      <ThinkingOrb state="searching" size={64} theme="light" aria-label="Reading your document" />
                      <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>
                        {ocrPhase}
                      </div>
                      <div style={{ width: '100%', height: 12, border: '2px solid #000', background: '#f4f4f0', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${ocrProgress}%`, background: '#FFE500', transition: 'width 160ms linear' }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888' }}>
                        FIRST READ DOWNLOADS THE ENGINE — HANG TIGHT
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* REAL PAPER controls live in the right sidebar — the exact deck
                position the text-highlighter uses for scan mode, so the muscle
                memory carries over 1:1. */}

            {/* Transport & Scrubber Bar */}
            <div
              className="tool-transport-bar"
              style={{
                width: '100%',
                marginTop: 12,
                padding: '8px 12px',
                border: '2px solid #000',
                background: '#f4f4f5',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              {/* Play / Step Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={handleStepPrev}
                  className="brutalist-button"
                  style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                  title="Previous Cut"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`brutalist-button ${isPlaying ? 'brutalist-button-primary' : ''}`}
                  style={{ padding: '6px 16px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'PAUSE' : 'PLAY LOOP'}
                </button>
                <button
                  onClick={handleStepNext}
                  className="brutalist-button"
                  style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                  title="Next Cut"
                >
                  <SkipForward size={14} />
                </button>
              </div>

              {/* Stout Tactile Speed Controller / Dragger */}
              <div className="tool-transport-speed" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Interactive Scrubber Capsule */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#fff',
                    padding: '3px 6px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCutsPerSecond((s) => Math.max(1, s - 1))}
                    style={{
                      width: 19,
                      height: 19,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #000',
                      background: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      borderRadius: 2,
                      padding: 0,
                    }}
                    title="Decrease speed (-1 cut/s)"
                  >
                    -
                  </button>

                  {/* Tactile Fill Scrubber Track */}
                  <div
                    ref={speedTrackRef}
                    onMouseDown={handleSpeedTrackMouseDown}
                    onTouchStart={handleSpeedTrackTouchStart}
                    style={{
                      position: 'relative',
                      width: 76,
                      height: 15,
                      background: '#e5e7eb',
                      border: '1.5px solid #000',
                      borderRadius: 3,
                      cursor: 'ew-resize',
                      overflow: 'hidden',
                      userSelect: 'none',
                    }}
                    title="Click or drag to scrub cuts/sec"
                  >
                    {/* Active Yellow Fill */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${((cutsPerSecond - 1) / 29) * 100}%`,
                        background: '#FFE500',
                        borderRight: '1.5px solid #000',
                      }}
                    />
                    {/* Tactile Gauge Grip Grooves */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        pointerEvents: 'none',
                        opacity: 0.3,
                      }}
                    >
                      <div style={{ width: 1, height: 8, background: '#000' }} />
                      <div style={{ width: 1, height: 8, background: '#000' }} />
                      <div style={{ width: 1, height: 8, background: '#000' }} />
                      <div style={{ width: 1, height: 8, background: '#000' }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCutsPerSecond((s) => Math.min(30, s + 1))}
                    style={{
                      width: 19,
                      height: 19,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #000',
                      background: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      borderRadius: 2,
                      padding: 0,
                    }}
                    title="Increase speed (+1 cut/s)"
                  >
                    +
                  </button>

                  {/* Live Value Indicator Badge */}
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      color: '#000',
                      background: '#FFE500',
                      padding: '1px 5px',
                      border: '1.5px solid #000',
                      borderRadius: 3,
                      minWidth: 40,
                      textAlign: 'center',
                    }}
                  >
                    {cutsPerSecond}/s
                  </span>
                </div>

                {/* Preset Chips */}
                <div
                  className="tool-transport-speed-presets"
                  style={{
                    display: 'flex',
                    border: '2px solid #000',
                    background: '#fff',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '1.5px 1.5px 0 #000',
                  }}
                >
                  {[5, 10, 15, 24, 30].map((spd, idx) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setCutsPerSecond(spd)}
                      style={{
                        padding: '4px 6px',
                        border: 'none',
                        borderRight: idx !== 4 ? '1px solid #000' : 'none',
                        background: cutsPerSecond === spd ? '#000' : '#fff',
                        color: cutsPerSecond === spd ? '#FFE500' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      title={`${spd} cuts per second`}
                    >
                      {spd}{spd === 10 ? '★' : ''}/s
                    </button>
                  ))}
                </div>
              </div>

              {/* Stout Neo-Brutalist Sound Selector */}
              <div style={{ position: 'relative' }} ref={soundMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowSoundDropdown((p) => !p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    border: '2px solid #000',
                    background: soundEffect === 'mute' ? '#e5e7eb' : '#FFE500',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                    textTransform: 'uppercase',
                  }}
                  title="Select Cut Sound Effect"
                >
                  {soundEffect === 'mute' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{SOUND_OPTIONS.find((s) => s.id === soundEffect)?.label || 'Sound'}</span>
                  <ChevronDown size={12} style={{ transform: showSoundDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {showSoundDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 4px)',
                      right: 0,
                      zIndex: 1000,
                      background: '#fff',
                      border: '2.5px solid #000',
                      boxShadow: '4px 4px 0 #000',
                      minWidth: 170,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {SOUND_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSoundEffect(opt.id as any);
                          if (opt.id !== 'mute') playCutSound(opt.id, soundVolume);
                          setShowSoundDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          border: 'none',
                          borderBottom: '1px solid #000',
                          background: soundEffect === opt.id ? '#FFE500' : '#fff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        <span>{opt.label}</span>
                        {soundEffect === opt.id && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Under-canvas Aspect Ratio bar */}
            <div
              className="tool-aspect-bar tool-aspect-export-row"
              style={{
                width: '100%',
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ASPECT_RATIOS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspectRatio(a.id)}
                    style={{
                      padding: '5px 10px',
                      border: '2px solid #000',
                      borderRadius: 4,
                      background: aspectRatio === a.id ? '#000' : '#ffffff',
                      color: aspectRatio === a.id ? '#ffffff' : '#000000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {a.id}
                  </button>
                ))}
              </div>

              <div className="tool-anchor-row" style={{ display: 'flex', gap: 8 }}>
                <button
                  className="brutalist-button"
                  onClick={handleDownloadSingleFrame}
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    padding: '8px 14px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    boxShadow: '3px 3px 0 #000',
                  }}
                  title="Download current single still image"
                >
                  <Download size={14} /> Still PNG
                </button>
                <button
                  className="brutalist-button"
                  onClick={handleCopySingleFrame}
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    padding: '8px 14px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: copiedNotification ? '#dcfce7' : '#ffffff',
                    boxShadow: '3px 3px 0 #000',
                  }}
                  title="Copy current frame to clipboard"
                >
                  {copiedNotification ? (
                    <Check size={14} style={{ color: '#15803d' }} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copiedNotification ? 'Copied!' : 'Copy Frame'}
                </button>
              </div>
            </div>

            {/* Export Progress Notification Toast */}
            {exportProgress && (
              <div
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '10px 14px',
                  border: '2px solid #000',
                  borderRadius: 4,
                  background: '#fef08a',
                  color: '#000',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                {exportProgress}
              </div>
            )}
          </div>

          {/* Quick Export Cards Row */}
          <div
            className="tool-export-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="brutalist-button brutalist-button-primary"
              style={{
                padding: '12px 18px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '4px 4px 0 #000',
              }}
            >
              <Film size={17} />
              Export MP4 Video
            </button>

            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="brutalist-button"
              style={{
                padding: '12px 18px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '4px 4px 0 #000',
                background: '#ffffff',
              }}
            >
              <FileArchive size={17} />
              PNG Sequence (ZIP)
            </button>
          </div>

          {/* NEXT → hand-off row (docs/TOOL_INTEGRATION_PLAN.md §4.3) */}
          {!isExporting && (
            <NextStepRow
              currentHref="/match-cut"
              heading="Video exported — keep going"
              onBeforeNavigate={(href) => {
                if (href === '/resizer' && lastVideoBlob) {
                  return putHandoffImage('resizer', lastVideoBlob, {
                    sourceTool: 'match-cut',
                    name: `match-cut-${Date.now()}.mp4`,
                  });
                }
              }}
            />
          )}
        </div>

        {/* Right Column: Control Sidebar */}
        <div className="tool-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {paperSource === 'real' ? (
          <>
          {ocrStatus && (
            <div style={{ padding: '6px 10px', border: '2px solid #000', borderRadius: 4, background: '#fef08a', fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900, color: '#000', letterSpacing: '0.04em' }}>
              {ocrStatus}
            </div>
          )}

          {/* REAL PAPER — same "Document Scan Mode" deck the text-highlighter
              uses: same column, same card, same LINE / RANGE / ✂ controls.
              Only the render differs: hard match-cuts instead of sweeps. */}
          <div
            className="brutalist-card"
            style={{
              padding: 14,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Camera size={14} style={{ color: '#000' }} />
                Document Scan Mode
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  ref={scanFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleScanImport(f);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => scanFileRef.current?.click()}
                  disabled={ocrBusy}
                  title="Upload the screenshot or photo to match-cut"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    background: '#FFE500',
                    color: '#000',
                    fontSize: '0.64rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: ocrBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '2px 2px 0 #000',
                    textTransform: 'uppercase',
                    opacity: ocrBusy ? 0.5 : 1,
                  }}
                >
                  {ocrBusy ? 'READING…' : scanImage ? 'REPLACE' : 'UPLOAD'}
                </button>
                <button
                  onClick={() => switchPaperSource('synthetic')}
                  title="Back to synthetic pages"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    background: '#FFE500',
                    color: '#000',
                    fontSize: '0.64rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                    textTransform: 'uppercase',
                  }}
                >
                  <X size={12} /> EXIT
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {scanImage && scanImageUrl && (
                <img src={scanImageUrl} alt="Imported page" style={{ width: 52, height: 52, objectFit: 'cover', border: '2px solid #000', borderRadius: 4 }} />
              )}
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: '#000',
                  background: '#FFE500',
                  padding: '2px 6px',
                  border: '1px solid #000',
                  borderRadius: 4,
                }}
              >
                {scanLines.length} LINES READ • {scanPicks.length} PICKED
              </span>
            </div>

            {!scanImage ? (
              <button
                onClick={() => scanFileRef.current?.click()}
                disabled={ocrBusy}
                style={{ padding: '26px 10px', border: '2px dashed #000', borderRadius: 4, background: '#fffbe6', color: '#000', fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', cursor: ocrBusy ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', opacity: ocrBusy ? 0.5 : 1 }}
              >
                {ocrBusy ? 'READING YOUR DOCUMENT…' : 'DROP A SCREENSHOT OF ANY ARTICLE — EVERY WORD GETS READ, THEN CUT ON'}
              </button>
            ) : (
              <>
            {/* PAGE CHANGE + FILL STYLE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={scanPageChange}
                  onChange={(e) => setScanPageChange(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#FFE500', cursor: 'pointer' }}
                />
                Page Change
                <span style={{ marginLeft: 'auto', fontSize: '0.56rem', color: '#888' }}>
                  {scanPageChange ? 'REFRAME EVERY CUT' : 'SAME FRAME'}
                </span>
              </label>

              <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }} title="Frame finish around the page">
                {[{ id: 'paper' as const, label: 'PAPER' }, { id: 'edge' as const, label: 'EDGE' }, { id: 'blur' as const, label: 'BLUR' }].map((f, fi) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setScanFillStyle(f.id)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      border: 'none',
                      borderRight: fi < 2 ? '1.5px solid #000' : 'none',
                      background: scanFillStyle === f.id ? '#000' : '#fff',
                      color: scanFillStyle === f.id ? '#FFE500' : '#000',
                      fontFamily: 'monospace',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CUT ORDER — numbered chips, same look as HIGHLIGHT ORDER */}
            {scanPicks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ListOrdered size={12} /> CUT ORDER ({scanPicks.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => { setScanPicks([]); setCurrentCutIndex(0); scanCutTRef.current = 0; setScanRangeFrom(null); setScanTrimAt(null); setScanTrimWord(null); }}
                    style={{
                      padding: '2px 6px',
                      border: '1.5px solid #000',
                      borderRadius: 3,
                      background: '#fff',
                      color: '#000',
                      fontSize: '0.58rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    CLEAR
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {scanPicks.map((pick, i) => (
                    <div
                      key={`${pick.id}-${i}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        border: '1.5px solid #000',
                        borderRadius: 999,
                        background: '#FFE500',
                        color: '#000',
                        fontSize: '0.62rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                      }}
                    >
                      <span
                        onClick={() => removeScanPick(i)}
                        title="Remove this cut"
                        style={{ cursor: 'pointer' }}
                      >
                        {i + 1}. {pick.text.slice(0, 22)}✕
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PASTE WORDS auto-find */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                Paste Words — One Per Line
              </span>
              {/* MATCH — your call: EXACT WORD lands on the word itself;
                  CONTAINS also lands on longer words carrying it (WAR finds
                  WARFARE). Same segmented control as the FILL picker. */}
              <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }} title="EXACT WORD = the word itself. CONTAINS = also inside longer words: WAR finds WARFARE.">
                {([{ id: 'exact' as const, label: 'EXACT WORD' }, { id: 'contains' as const, label: 'CONTAINS' }]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setScanMatchMode(m.id)}
                    style={{ flex: 1, padding: '3px 6px', border: 'none', background: scanMatchMode === m.id ? '#FFE500' : '#f4f4f0', color: '#000', fontFamily: 'monospace', fontSize: '0.56rem', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  value={scanPasteText}
                  onChange={(e) => setScanPasteText(e.target.value)}
                  placeholder={'PASTE WORDS — one word or phrase per line.\nEvery occurrence becomes its own cut: paste WAR and\nWar, Warfare, Warring… all get cut, in reading order.'}
                  rows={3}
                  style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, background: '#fff', color: '#000', fontFamily: 'monospace', fontSize: '0.64rem', resize: 'vertical', outline: 'none' }}
                />
                <button
                  onClick={applyScanPaste}
                  style={{ padding: '8px 12px', border: '2px solid #000', background: '#000', color: '#FFE500', fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900, cursor: 'pointer' }}
                  title="Find each word/phrase in the document — cut order follows your list"
                >
                  FIND WORDS
                </button>
              </div>
            </div>

            {/* PART-of-line trimmer — same box as the highlighter: tap the
                first word, then the last; the cut narrows to that span. */}
            {scanTrimAt != null && scanPicks[scanTrimAt] && (() => {
              const pick = scanPicks[scanTrimAt];
              const line = scanLines.find((l) => pick.id === `l-${l.id}` || pick.id.startsWith(`w-${l.id}-`) || (pick.id.startsWith('p-') && pick.id.includes(`-${l.id}-`)));
              const words = line && line.words && line.words.length > 0 ? line.words : [{ text: pick.text, box: pick.box }];
              return (
                <div style={{ border: '2px solid #000', borderRadius: 4, padding: 8, background: '#fffbe6', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span>
                      BREAK LINE / TRIM — TAP WORDS TO CUT ON: &ldquo;{pick.text.slice(0, 40)}&rdquo;
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setScanTrimAt(null);
                        setScanTrimWord(null);
                      }}
                      style={{ padding: '2px 8px', border: '1.5px solid #000', borderRadius: 3, background: '#000', color: '#FFE500', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}
                    >
                      DONE ✓
                    </button>
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {words.map((w, wi) => (
                      <button
                        key={wi}
                        type="button"
                        onClick={() => handleScanTrimWord(wi)}
                        style={{
                          padding: '3px 8px',
                          border: scanTrimWord === wi ? '2px solid #000' : '1px solid #777',
                          borderRadius: 3,
                          background: scanTrimWord === wi ? '#FFE500' : '#fff',
                          color: '#000',
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: scanTrimWord === wi ? '2px 2px 0 #000' : 'none',
                        }}
                      >
                        {w.text}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!line) return;
                        setScanPicks(scanPicks.map((p, i) => (i === scanTrimAt ? { ...p, id: `l-${line.id}`, text: line.text, box: line.box } : p)));
                        setScanTrimWord(null);
                      }}
                      disabled={!line}
                      style={{
                        padding: '3px 8px',
                        border: '1.5px solid #000',
                        borderRadius: 3,
                        background: '#fff',
                        color: '#000',
                        fontSize: '0.58rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        cursor: line ? 'pointer' : 'not-allowed',
                        opacity: line ? 1 : 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      RESTORE FULL LINE ↺
                    </button>
                    <span style={{ fontSize: '0.56rem', fontFamily: 'monospace', color: '#666', textTransform: 'uppercase' }}>
                      {scanTrimWord == null ? 'TAP A WORD TO CUT ON IT, OR TWO WORDS FOR A PHRASE' : 'TAP SECOND WORD TO SET RANGE'}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scanRangeFrom != null ? (
                <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textTransform: 'uppercase', background: '#FFE500', border: '1.5px solid #000', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>RANGE START AT LINE {scanRangeFrom + 1} — TAP RANGE ON THE LAST LINE</span>
                  <button
                    onClick={() => setScanRangeFrom(null)}
                    style={{ padding: '1px 6px', border: '1.5px solid #000', borderRadius: 3, background: '#fff', color: '#000', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </span>
              ) : (
                <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                  TAP LINES IN THE ORDER YOU WANT THEM CUT — OR RANGE TO GRAB A CONTINUOUS BLOCK
                </span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                {scanLines.map((line, lineIdx) => {
                  const pickIdx = scanPickIndexOfLine(line.id);
                  const rangeActive = scanRangeFrom != null && scanRangeFrom !== lineIdx;
                  return (
                    <div key={line.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                      <button
                        onClick={() => pickScanLine(line)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          textAlign: 'left',
                          padding: '6px 8px',
                          border: pickIdx >= 0 ? '2px solid #000' : scanRangeFrom === lineIdx ? '2px dashed #000' : '1.5px solid #ccc',
                          borderRadius: 4,
                          background: pickIdx >= 0 ? '#FFE500' : '#fff',
                          color: '#000',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            minWidth: 20,
                            textAlign: 'center',
                            padding: '1px 4px',
                            border: '1px solid #000',
                            borderRadius: 3,
                            background: pickIdx >= 0 ? '#000' : 'transparent',
                            color: pickIdx >= 0 ? '#FFE500' : '#999',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                          }}
                        >
                          {pickIdx >= 0 ? pickIdx + 1 : '+'}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.text}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (scanRangeFrom == null) setScanRangeFrom(lineIdx);
                          else applyScanRange(scanRangeFrom, lineIdx);
                        }}
                        title={scanRangeFrom == null ? 'Start a continuous block here — every line in it becomes a cut' : 'End the range here — every line in between joins the cut sequence'}
                        style={{
                          padding: '6px 3px',
                          borderTop: rangeActive ? '2px solid #000' : '1.5px solid #999',
                          borderRight: rangeActive ? '2px solid #000' : '1.5px solid #999',
                          borderBottom: rangeActive ? '2px solid #000' : '1.5px solid #999',
                          borderLeft: 'none',
                          borderTopRightRadius: 4,
                          borderBottomRightRadius: 4,
                          background: rangeActive ? '#FFE500' : '#f4f4f0',
                          color: '#000',
                          fontSize: '0.54rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          letterSpacing: '0.02em',
                          cursor: 'pointer',
                          writingMode: 'vertical-rl',
                        }}
                      >
                        {scanRangeFrom === lineIdx ? 'END ⇃' : 'RANGE ⇂'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openScanTrimForLine(line)}
                        title="BREAK / TRIM — cut on only one word or a phrase inside this line"
                        style={{
                          padding: '6px 8px',
                          border: scanTrimAt != null && scanTrimAt === pickIdx ? '2px solid #000' : '1.5px solid #999',
                          borderRadius: 4,
                          background: scanTrimAt != null && scanTrimAt === pickIdx ? '#FFE500' : '#f4f4f0',
                          color: '#000',
                          fontSize: '0.54rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          letterSpacing: '0.02em',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ✂ BREAK / TRIM
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
          </>
          ) : (
          <>

          {/* Pinned Anchor Phrase Master Box with 23 Character Limit */}
          <div
            className="brutalist-card"
            style={{
              padding: 14,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Crosshair size={14} style={{ color: '#000' }} />
                Locked Anchor Phrase
              </label>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: anchorPhrase.length >= 23 ? '#dc2626' : '#666',
                  background: anchorPhrase.length >= 23 ? '#fee2e2' : '#f4f4f5',
                  padding: '2px 6px',
                  border: '1px solid #000',
                  borderRadius: 4,
                }}
              >
                {anchorPhrase.length}/23 CHARS
              </span>
            </div>

            <div className="tool-anchor-row" style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                maxLength={23}
                value={anchorPhrase}
                onChange={(e) => setAnchorPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAutoGenerate();
                  }
                }}
                placeholder="Enter word (max 23 chars)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '2px solid #000',
                  borderRadius: 4,
                  background: '#fff',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: '#000',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className="brutalist-button brutalist-button-primary"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  padding: '10px 18px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '3px 3px 0 #000',
                  textTransform: 'uppercase',
                  transform: isGenerating ? 'scale(0.96)' : 'none',
                  transition: 'transform 0.1s ease',
                }}
                title="Generate newspaper articles containing this anchor phrase"
              >
                <Zap size={15} className={isGenerating ? 'animate-bounce' : ''} />
                {isGenerating ? 'GENERATING...' : 'GENERATE CUTS'}
              </button>
            </div>

            {/* Quick Topic Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                Presets:
              </span>
              {PRESET_TOPICS.map((p) => {
                const isActive = anchorPhrase.toLowerCase() === p.anchor.toLowerCase();
                return (
                  <button
                    key={p.id}
                    onClick={() => handleLoadPreset(p.id)}
                    style={{
                      padding: '4px 10px',
                      border: '1.5px solid #000',
                      borderRadius: 4,
                      background: isActive ? '#FFE500' : '#ffffff',
                      color: '#000000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.66rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                      transition: 'all 0.12s',
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* REAL PAPER IMPORT — one yellow CTA, the same pattern as the
              highlighter's "Import newspaper image" button. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => scanFileRef.current?.click()}
              disabled={ocrBusy}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '7px 10px',
                border: '2px solid #000',
                borderRadius: 4,
                background: '#FFE500',
                color: '#000',
                fontSize: '0.68rem',
                fontFamily: 'monospace',
                fontWeight: 900,
                textTransform: 'uppercase',
                cursor: ocrBusy ? 'not-allowed' : 'pointer',
                boxShadow: '2px 2px 0 #000',
                opacity: ocrBusy ? 0.5 : 1,
              }}
            >
              <ScanText size={13} /> {ocrBusy ? 'Reading your screenshot…' : 'Match-cut my screenshot'}
            </button>
            <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888', fontWeight: 700 }}>
              Screenshot of an article → every word gets read → tap the words to cut on, in order.
            </span>
            <input
              ref={scanFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleScanImport(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Tab Navigation (All 3 tabs sit strictly on ONE single line) */}
          <div className="tool-tab-bar" style={{ display: 'flex', border: '3px solid #000', background: '#000', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {[
              { id: 'headlines' as const, label: `Cuts (${cuts.length})`, icon: Layers },
              { id: 'style' as const, label: 'Highlighter', icon: Type },
              { id: 'macro' as const, label: 'Optics & Paper', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '10px 4px',
                    border: 'none',
                    background: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#000000' : '#ffffff',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    fontSize: '0.64rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Headline Cuts Sequence Editor */}
          {activeTab === 'headlines' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                maxHeight: 'calc(100vh - 380px)',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  Headline Story Cuts
                </span>
                <button
                  onClick={handleAddCut}
                  className="brutalist-button"
                  style={{ fontSize: '0.68rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={12} /> Add Cut
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cuts.map((cut, idx) => (
                  <div
                    key={cut.id || idx}
                    style={{
                      padding: 12,
                      border: currentCutIndex === idx ? '2.5px solid #000' : '1.5px solid #ccc',
                      background: currentCutIndex === idx ? '#fefce8' : '#ffffff',
                      boxShadow: currentCutIndex === idx ? '3px 3px 0 #000' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => {
                          setCurrentCutIndex(idx);
                          playCutSound(soundEffect, soundVolume);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            background: '#000',
                            color: '#fff',
                            padding: '2px 6px',
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#000' }}>
                          {cut.masthead}
                        </span>
                      </button>

                      {cuts.length > 1 && (
                        <button
                          onClick={() => handleDeleteCut(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#999',
                            padding: 2,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
                          title="Delete this cut"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={cut.headline}
                      onChange={(e) => handleHeadlineChange(idx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1.5px solid #000',
                        background: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#000',
                        outline: 'none',
                      }}
                      placeholder="Headline containing anchor word..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Highlighter Style & Color */}
          {activeTab === 'style' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Highlighter Color Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  Highlighter Ink Color
                </label>
                <div className="tool-page-badge-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setHighlightColor(c.hex)}
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: c.hex,
                        border: highlightColor === c.hex ? '3px solid #000' : '2px solid #ccc',
                        boxShadow: highlightColor === c.hex ? '2px 2px 0 #000' : 'none',
                        cursor: 'pointer',
                        transform: highlightColor === c.hex ? 'scale(1.1)' : 'none',
                      }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    style={{
                      width: 32,
                      height: 32,
                      border: '2px solid #000',
                      cursor: 'pointer',
                      padding: 1,
                      background: '#fff',
                    }}
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Highlighter Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  Highlighting Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {(['marker', 'underline', 'double-underline', 'box', 'circle', 'tape'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setHighlightStyle(style)}
                      style={{
                        padding: '8px 4px',
                        border: '2px solid #000',
                        background: highlightStyle === style ? '#000' : '#fff',
                        color: highlightStyle === style ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      {style.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marker Opacity Slider */}
              <TactileScrubber
                label="Ink Opacity"
                value={markerOpacity}
                min={0.3}
                max={1.0}
                step={0.05}
                stepDelta={0.05}
                onChange={setMarkerOpacity}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                presets={[
                  { label: '50%', value: 0.5 },
                  { label: '70%', value: 0.7 },
                  { label: '85% ★', value: 0.85 },
                  { label: '100%', value: 1.0 },
                ]}
              />

              {/* 5-Font Rapid Cut Jitter Cycle Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '2px solid #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000', display: 'block' }}>
                      5-Font Rapid Jitter Cycle
                    </label>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666' }}>
                      5 Google Fonts cycle consecutively with each cut
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const shuffled = [...GOOGLE_FONTS_LIST].sort(() => 0.5 - Math.random());
                      setFontCycleList(shuffled.slice(0, 5).map((f) => f.fontFamily));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: '#FFE500',
                      border: '1.5px solid #000',
                      borderRadius: 3,
                      boxShadow: '2px 2px 0 #000',
                      fontSize: '0.64rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                    title="Randomize 5 fonts"
                  >
                    <Shuffle size={11} />
                    <span>Shuffle</span>
                  </button>
                </div>

                {/* Quick Vibe Combos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.60rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#888' }}>
                    Quick Vibe Combos:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {FONT_CYCLE_PRESETS.map((preset) => {
                      const isSelected = JSON.stringify(fontCycleList) === JSON.stringify(preset.fonts);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFontCycleList(preset.fonts)}
                          style={{
                            padding: '4px 7px',
                            border: '1.5px solid #000',
                            borderRadius: 3,
                            background: isSelected ? '#000' : '#fff',
                            color: isSelected ? '#FFE500' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: isSelected ? '1.5px 1.5px 0 #000' : 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5-Slot Visual Font Strip */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {fontCycleList.map((f, idx) => {
                    const matchedFont = GOOGLE_FONTS_LIST.find((gf) => gf.fontFamily === f);
                    const displayName = matchedFont ? matchedFont.name : f.split(',')[0].replace(/"/g, '');
                    const category = matchedFont?.category || 'Custom';
                    const isEditing = editingFontSlot === idx;

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div
                          onClick={() => setEditingFontSlot(isEditing ? null : idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            border: '2px solid #000',
                            background: isEditing ? '#FFE500' : '#fff',
                            boxShadow: isEditing ? '2px 2px 0 #000' : '1px 1px 0 rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            borderRadius: 4,
                            transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, background: '#000', color: '#fff', padding: '1px 5px', borderRadius: 2 }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: f, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {displayName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', background: '#eee', padding: '2px 5px', borderRadius: 2 }}>
                              {category}
                            </span>
                            <ChevronDown size={13} style={{ transform: isEditing ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </div>
                        </div>

                        {/* Interactive Font Drawer when slot is open */}
                        {isEditing && (
                          <div
                            style={{
                              padding: 8,
                              border: '2px solid #000',
                              borderTop: 'none',
                              background: '#fafafa',
                              boxShadow: '2px 2px 0 #000',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              marginTop: -4,
                              borderRadius: '0 0 4px 4px',
                            }}
                          >
                            {/* Category Filter Tabs */}
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {(['All', 'Serif', 'Typewriter', 'Tabloid', 'Sans', 'Display'] as const).map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFontCategoryFilter(cat);
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    border: '1px solid #000',
                                    background: fontCategoryFilter === cat ? '#000' : '#fff',
                                    color: fontCategoryFilter === cat ? '#fff' : '#000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    borderRadius: 2,
                                  }}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>

                            {/* Font List Options with Typography Previews */}
                            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, border: '1px solid #ddd', padding: 4, background: '#fff' }}>
                              {GOOGLE_FONTS_LIST.filter(
                                (gf) => fontCategoryFilter === 'All' || gf.category === fontCategoryFilter
                              ).map((gf) => {
                                const isCurrent = f === gf.fontFamily;
                                return (
                                  <button
                                    key={gf.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = [...fontCycleList];
                                      updated[idx] = gf.fontFamily;
                                      setFontCycleList(updated);
                                      setEditingFontSlot(null);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '5px 8px',
                                      border: isCurrent ? '1.5px solid #000' : '1px solid #eee',
                                      background: isCurrent ? '#FFE500' : '#fff',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      borderRadius: 2,
                                    }}
                                  >
                                    <span style={{ fontSize: '0.80rem', fontFamily: gf.fontFamily, fontWeight: 700 }}>
                                      {gf.name}
                                    </span>
                                    <span style={{ fontSize: '0.56rem', fontFamily: 'monospace', color: '#666' }}>
                                      {gf.category}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Optics, Macro Defocus & Paper Texture */}
          {activeTab === 'macro' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Newspaper Archetype */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  Paper & Newsprint Theme
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {Object.entries(PAPER_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setPaperTheme(key as any)}
                      style={{
                        padding: '8px 10px',
                        border: '2px solid #000',
                        background: paperTheme === key ? '#000' : '#fff',
                        color: paperTheme === key ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anchor Position In Sentence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  Highlight Position In Sentence
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(['auto', 'start', 'middle', 'end'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setAnchorPosition(pos)}
                      style={{
                        padding: '8px 6px',
                        border: '2px solid #000',
                        background: anchorPosition === pos ? '#000' : '#fff',
                        color: anchorPosition === pos ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.62rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {pos === 'auto' ? 'Mixed' : pos === 'start' ? 'Begin' : pos}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', lineHeight: 1.4 }}>
                  Controls where the highlighted phrase sits inside generated sentences. Applies on Auto-Generate.
                </span>
              </div>

              {/* Depth of Field & Optics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', cursor: 'pointer' }}>
                    Macro Depth of Field (Lens Blur)
                  </label>
                  <input
                    type="checkbox"
                    checked={depthOfField}
                    onChange={(e) => setDepthOfField(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#000', cursor: 'pointer' }}
                  />
                </div>

                {depthOfField && (
                  <TactileScrubber
                    label="Defocus Intensity"
                    value={dofIntensity}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    stepDelta={0.1}
                    onChange={setDofIntensity}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    presets={[
                      { label: 'Soft', value: 0.3 },
                      { label: 'Med ★', value: 0.75 },
                      { label: 'Heavy', value: 1.0 },
                    ]}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', cursor: 'pointer' }}>
                    Authentic Paper Grain & Halftone
                  </label>
                  <input
                    type="checkbox"
                    checked={filmGrain}
                    onChange={(e) => setFilmGrain(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#000', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', cursor: 'pointer' }}>
                    Micro Handheld Camera Jitter
                  </label>
                  <input
                    type="checkbox"
                    checked={cameraShake}
                    onChange={(e) => setCameraShake(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#000', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Paper Motion — the same slam-in / whip-out system as the Text
                  Highlighter, powered by the shared spring + streak library. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
                    Paper Motion
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: entranceDirection !== 'none' || exitDirection !== 'none' ? '#16a34a' : '#b91c1c' }}>
                    {entranceDirection !== 'none' || exitDirection !== 'none' ? 'SLAM → RUN → WHIP' : 'OFF'}
                  </span>
                </div>

                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>
                  Slam In
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['none', 'top', 'bottom', 'left', 'right'] as const).map((d) => (
                    <button
                      key={`in-${d}`}
                      type="button"
                      onClick={() => setEntranceDirection(d)}
                      style={{
                        flex: 1,
                        padding: '5px 4px',
                        border: '2px solid #000',
                        borderRadius: 3,
                        background: entranceDirection === d ? '#000' : '#fff',
                        color: entranceDirection === d ? '#FFE500' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.58rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                      title={d === 'none' ? 'No entrance — the sequence starts immediately' : `The paper slams in from the ${d} with motion blur`}
                    >
                      {d === 'none' ? 'OFF' : d === 'top' ? '↓ TOP' : d === 'bottom' ? '↑ BOTTOM' : d === 'left' ? '→ LEFT' : '← RIGHT'}
                    </button>
                  ))}
                </div>
                {entranceDirection !== 'none' && (
                  <>
                    <TactileScrubber
                      label="Flight"
                      value={entranceFlight}
                      min={0.3}
                      max={2}
                      step={0.1}
                      stepDelta={0.1}
                      onChange={setEntranceFlight}
                      formatValue={(v) => `${v.toFixed(1)}s`}
                      presets={[
                        { label: '0.4s', value: 0.4 },
                        { label: '0.6s ★', value: 0.6 },
                        { label: '1.2s', value: 1.2 },
                      ]}
                    />
                    <TactileScrubber
                      label="Hold Before Run"
                      value={entranceHold}
                      min={0}
                      max={4}
                      step={0.1}
                      stepDelta={0.1}
                      onChange={setEntranceHold}
                      formatValue={(v) => `${v.toFixed(1)}s`}
                      presets={[
                        { label: '0s', value: 0 },
                        { label: '0.4s ★', value: 0.4 },
                        { label: '1s', value: 1 },
                      ]}
                    />
                    <TactileScrubber
                      label="In Motion Blur"
                      value={entranceBlur}
                      min={0}
                      max={1}
                      step={0.05}
                      stepDelta={0.05}
                      onChange={setEntranceBlur}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                      presets={[
                        { label: 'OFF', value: 0 },
                        { label: '50%', value: 0.5 },
                        { label: '80% ★', value: 0.8 },
                        { label: 'MAX', value: 1 },
                      ]}
                    />
                  </>
                )}

                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', color: '#555', paddingTop: 6, borderTop: '1px dashed #ddd' }}>
                  Whip Out
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['none', 'top', 'bottom', 'left', 'right'] as const).map((d) => (
                    <button
                      key={`out-${d}`}
                      type="button"
                      onClick={() => setExitDirection(d)}
                      style={{
                        flex: 1,
                        padding: '5px 4px',
                        border: '2px solid #000',
                        borderRadius: 3,
                        background: exitDirection === d ? '#000' : '#fff',
                        color: exitDirection === d ? '#FFE500' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.58rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                      title={d === 'none' ? 'No exit — the sequence simply holds' : `The paper whips out through the ${d} with motion blur`}
                    >
                      {d === 'none' ? 'OFF' : d === 'top' ? '↑ TOP' : d === 'bottom' ? '↓ BOTTOM' : d === 'left' ? '← LEFT' : '→ RIGHT'}
                    </button>
                  ))}
                </div>
                {exitDirection !== 'none' && (
                  <>
                    <TactileScrubber
                      label="Exit Duration"
                      value={exitDuration}
                      min={0.2}
                      max={1.5}
                      step={0.05}
                      stepDelta={0.05}
                      onChange={setExitDuration}
                      formatValue={(v) => `${v.toFixed(2)}s`}
                      presets={[
                        { label: '0.3s', value: 0.3 },
                        { label: '0.5s ★', value: 0.5 },
                        { label: '0.9s', value: 0.9 },
                      ]}
                    />
                    <TactileScrubber
                      label="Out Motion Blur"
                      value={exitBlur}
                      min={0}
                      max={1}
                      step={0.05}
                      stepDelta={0.05}
                      onChange={setExitBlur}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                      presets={[
                        { label: 'OFF', value: 0 },
                        { label: '50%', value: 0.5 },
                        { label: '85% ★', value: 0.85 },
                        { label: 'MAX', value: 1 },
                      ]}
                    />
                  </>
                )}
              </div>

              {/* Advanced Settings — document section visibility */}
              <details style={{ borderTop: '2px solid #eee', paddingTop: 10 }}>
                <summary
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    color: '#000',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  ⚙ Advanced Settings — Document Sections
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                  <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#666', lineHeight: 1.4 }}>
                    Control which parts of the paper appear around the locked headline line.
                  </span>
                  {([
                    ['Top columns (above)', showTopColumns, setShowTopColumns],
                    ['Masthead & dateline', showMasthead, setShowMasthead],
                    ['Subhead', showSubhead, setShowSubhead],
                    ['Byline', showByline, setShowByline],
                    ['Bottom columns (below)', showBottomColumns, setShowBottomColumns],
                    ['Divider rules', showDividerRules, setShowDividerRules],
                  ] as [string, boolean, (v: boolean) => void][]).map(([label, value, setter]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#000', cursor: 'pointer' }}>
                        {label}
                      </label>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setter(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#000', cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
