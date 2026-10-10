'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextStepRow from '@/components/NextStepRow';
import { gateAction } from '@/components/AdGate';
import { putHandoffImage, takeHandoffText } from '@/lib/tool-handoff';
import { loadState, saveState } from '@/lib/local-memory';
import {
  Play,
  Pause,
  RotateCcw,
  Film,
  ImageIcon,
  Download,
  Copy,
  Check,
  ChevronLeft,
  Volume2,
  VolumeX,
  Crosshair,
  RefreshCw,
  Zap,
  Shuffle,
  FileText,
  Sliders,
  MoveVertical,
  Type,
  Disc,
  ChevronDown,
  ScanText,
  ListOrdered,
  X,
  Camera,
  Pipette,
  Link2,
  Unlink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  HighlighterRenderOptions,
  PAPER_THEMES,
  renderHighlighterStory,
  renderHighlighterStoryWithEntrance,
  renderScanDocumentStory,
  sampleScanSequence,
  scanSequenceTotalMs,
  scanSweepStartMs,
  getPickSweepMs,
  synthesizeCutSound,
  easeHighlightSweep,
  playCutSound,
  NewspaperCut,
  ScanLineBox,
  ScanBeat,
} from './highlighter-engine';
import { findPhraseOccurrences, normalizePhraseKey } from '@/lib/paper-graphics';
import {
  exportCanvasVideoToMp4,
  renderOfflineAudio,
  downloadBlob,
} from '@/lib/canvas-video-exporter';
import { PRESET_TOPICS, generateCutsForPhrase, BODY_CORPUS, MASTHEADS, SUBHEADS, LOCATIONS, BYLINES } from './highlighter-presets';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';
import { TactileScrubber } from '@/components/tactile-scrubber';

const SOUND_OPTIONS = [
  { id: 'highlighter-1' as const, label: 'Chisel Highlighter' },
  { id: 'highlighter-2' as const, label: 'Fine Highlighter' },
  { id: 'paper' as const, label: 'Paper Friction' },
  { id: 'typewriter' as const, label: 'Typewriter Clack' },
  { id: 'shutter' as const, label: 'Shutter Snap' },
  { id: 'motor' as const, label: 'Motor Drive' },
  { id: 'mute' as const, label: 'Muted' },
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
  { name: 'Chisel Yellow', hex: '#FFE500' },
  { name: 'Coral Pink', hex: '#ff6b81' },
  { name: 'Neon Green', hex: '#00FF66' },
  { name: 'Electric Cyan', hex: '#00F0FF' },
  { name: 'Hot Pink', hex: '#FF2A85' },
  { name: 'Vivid Orange', hex: '#FF7700' },
  { name: 'Blood Crimson', hex: '#DC2626' },
  { name: 'Knockout Black', hex: '#111111' },
];

/** The slice of working state that survives reloads — the page remembers the
 *  last thing you made and puts it right back when you return. */
type TextHighlighterSession = {
  anchorPhrase: string;
  cuts: NewspaperCut[];
  currentCutIndex: number;
  customHeadline: string;
  customMasthead: string;
  customSubhead: string;
  customByline: string;
  customBodyText: string;
  highlightSector: 'top-masthead' | 'center-headline' | 'body-paragraph';
  stickyHighlights: boolean;
  phraseInstances: Record<string, number>;
  scanPageFit: 'contain' | 'cover';
  scanAutoCamera: boolean;
  scanFillStyle: 'paper' | 'edge' | 'blur';
  scanEdgeColor: string | null;
  scanLines: ScanLineBox[];
  scanPicks: ScanLineBox[];
  scanImageDataUrl: string | null;
  scanThumbnail?: string | null;
};

export default function TextHighlighterPage() {
  // Core Phrase & Cut State
  const [anchorPhrase, setAnchorPhrase] = useState(PRESET_TOPICS[0].anchor);
  const [cuts, setCuts] = useState<NewspaperCut[]>(PRESET_TOPICS[0].cuts);
  const [currentCutIndex, setCurrentCutIndex] = useState(0);

  // Document Sector Position
  const [highlightSector, setHighlightSector] = useState<'top-masthead' | 'center-headline' | 'body-paragraph'>('center-headline');

  // Typography (52 Google Fonts)
  const [fontFamily, setFontFamily] = useState<string>('"Playfair Display", Georgia, serif');
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>('All');

  // Force-download the selected webfont so canvas can actually rasterize it.
  // The stylesheet in the root layout only makes families AVAILABLE — the
  // font files download lazily when rendered DOM text requests them, and
  // canvas usage does NOT trigger that. Without this explicit load() the
  // engine silently falls back to Georgia/Playfair and font selection
  // appears completely dead.
  useEffect(() => {
    const bare = fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (!bare || typeof document === 'undefined' || !document.fonts?.load) return;
    Promise.all([
      document.fonts.load(`bold 64px "${bare}"`),
      document.fonts.load(`italic 32px "${bare}"`),
      document.fonts.load(`900 32px "${bare}"`),
    ])
      .then(() => document.fonts.ready)
      .catch(() => { /* canvas falls back to the next family in the stack */ });
  }, [fontFamily]);

  // Custom Document Copy State (for active cut)
  const currentCut = cuts[currentCutIndex] || cuts[0];
  const [customHeadline, setCustomHeadline] = useState(currentCut?.headline || '');
  const [customMasthead, setCustomMasthead] = useState(currentCut?.masthead || 'CREATOR KIT');
  const [customSubhead, setCustomSubhead] = useState(currentCut?.subhead || '');
  const [customByline, setCustomByline] = useState(currentCut?.byline || '');
  const [customBodyText, setCustomBodyText] = useState((currentCut?.bodyParagraphs || BODY_CORPUS).join('\n\n'));

  // Sidebar Tab Navigation (4-Tab Modular Suite)
  const [sidebarTab, setSidebarTab] = useState<'style' | 'typography' | 'scene' | 'text'>('style');

  // Animation & Sweep Transport
  const [isPlaying, setIsPlaying] = useState(true);
  const [highlightDuration, setHighlightDuration] = useState(2.0); // 2.0s smooth animation
  const [highlightDirection, setHighlightDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [highlightProgress, setHighlightProgress] = useState(1.0); // 0 to 1
  const [soundEffect, setSoundEffect] = useState<'highlighter-1' | 'highlighter-2' | 'paper' | 'shutter' | 'typewriter' | 'motor' | 'mute'>('highlighter-1');
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [showSoundDropdown, setShowSoundDropdown] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

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

  // Interactive Duration Track Drag Controller (0.5s to 4.0s)
  const durationTrackRef = useRef<HTMLDivElement>(null);

  const updateDurationFromClientX = useCallback((clientX: number) => {
    if (!durationTrackRef.current) return;
    const rect = durationTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newDur = Math.round((0.5 + ratio * 3.5) * 10) / 10; // 0.5s to 4.0s
    setHighlightDuration(newDur);
  }, []);

  const handleDurationTrackMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updateDurationFromClientX(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => {
      updateDurationFromClientX(moveEvent.clientX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDurationTrackTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    updateDurationFromClientX(e.touches[0].clientX);
    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      updateDurationFromClientX(moveEvent.touches[0].clientX);
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  // Fullscreen Theater Mode (Desktop Focus & Presentation)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next && !document.fullscreenElement && typeof document.documentElement.requestFullscreen === 'function') {
          document.documentElement.requestFullscreen().catch(() => undefined);
        } else if (!next && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
          document.exitFullscreen().catch(() => undefined);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Visual & Style Options
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4'>('16:9');
  const [highlightColor, setHighlightColor] = useState('#FFE500');
  const [highlightStyle, setHighlightStyle] = useState<'marker' | 'underline' | 'double-underline' | 'box' | 'circle' | 'tape'>('marker');
  const [markerOpacity, setMarkerOpacity] = useState(0.85);
  const [paperTheme, setPaperTheme] = useState<'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir' | 'academic'>('academic');
  const [depthOfField, setDepthOfField] = useState(true); // Circular lens blur
  const [dofIntensity, setDofIntensity] = useState(0.75); // Blur strength
  const [filmGrain, setFilmGrain] = useState(true);
  const [cameraShake, setCameraShake] = useState(true);
  const [showCrosshairGuide, setShowCrosshairGuide] = useState(false);

  // Layout & Visibility
  const [showTopColumns, setShowTopColumns] = useState(true);
  const [showMasthead, setShowMasthead] = useState(true);
  const [showSubhead, setShowSubhead] = useState(true);
  const [showByline, setShowByline] = useState(true);
  const [showBottomColumns, setShowBottomColumns] = useState(true);
  const [showDividerRules, setShowDividerRules] = useState(true);

  // Camera Zoom
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [zoomDirection, setZoomDirection] = useState<'in' | 'out'>('in');
  const [zoomIntensity, setZoomIntensity] = useState(0.10);

  // Paper Entrance — the pre-sweep slam: the whole article flies in from an
  // edge with directional motion blur, holds a beat, THEN the sweep begins.
  const [entranceDirection, setEntranceDirection] = useState<'none' | 'top' | 'bottom' | 'left' | 'right'>('none');
  const [entranceFlight, setEntranceFlight] = useState(0.7);
  const [entranceHold, setEntranceHold] = useState(0.9);
  const [entranceBlur, setEntranceBlur] = useState(0.8);
  const [entranceProgress, setEntranceProgress] = useState(0);

  // Paper Exit — the post-sweep whip-out: the finished paper pulls back a
  // hair (anticipation), then accelerates out of frame with a hot streak,
  // leaving only the paper color behind. Same shared spring as the entrance.
  const [exitDirection, setExitDirection] = useState<'none' | 'top' | 'bottom' | 'left' | 'right'>('none');
  const [exitDuration, setExitDuration] = useState(0.5);
  const [exitBlur, setExitBlur] = useState(0.85);
  const [exitProgress, setExitProgress] = useState(0);

  // Multi-screen story sequencer (the viral reference): ONE paper, ONE
  // theme, ONE sector — the document NEVER changes. "|" separates phrases
  // highlighted on the SAME screen (one continuous marker pass). ">" and
  // "<" break to the next screen: the same paper scrolls DOWN (>) or UP
  // (<) with a rapid motion-blurred vertical pan, then the sweep resumes.
  const [scrollTransitions, setScrollTransitions] = useState(true);
  // Scroll tuning — how long each inter-screen scroll runs, how hot its
  // motion blur is, and how far the paper travels (all transitions).
  const [scrollDuration, setScrollDuration] = useState(0.42);
  const [scrollBlur, setScrollBlur] = useState(0.85);
  const [paperTravel, setPaperTravel] = useState(1.3);

  // §STICKY — marker memory: highlights from earlier screens STAY on the
  // page while the sequence scrolls to the next phrase. Nothing is erased.
  const [stickyHighlights, setStickyHighlights] = useState(true);

  // §MATCH RESOLVER — per-phrase instance picks. When a phrase appears
  // several times in the document the studio asks WHICH occurrence, and
  // only that one gets swept (see the resolver panel under the phrase box).
  const [phraseInstances, setPhraseInstances] = useState<Record<string, number>>({});

  // §DOCUMENT SCAN MODE — a real newspaper photo, OCR'd in the browser.
  // The clip becomes the page; the creator taps extracted LINES in the
  // order they should be highlighted, and the camera dives to each one.
  const [scanImage, setScanImage] = useState<HTMLImageElement | null>(null);
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null);
  const [scanPageFit, setScanPageFit] = useState<'contain' | 'cover'>('contain');
  const [scanAutoCamera, setScanAutoCamera] = useState(true);
  // Insert position for the pick sequence: set by the "+" buttons between
  // chips; the next line tapped lands there instead of at the end.
  const [scanInsertAt, setScanInsertAt] = useState<number | null>(null);
  // Data-URL twin of the scan photo — persisted so the session survives reloads.
  const [scanImageDataUrl, setScanImageDataUrl] = useState<string | null>(null);
  // Range-select: first line of a continuous multi-line grab (index into scanLines).
  const [scanRangeFrom, setScanRangeFrom] = useState<number | null>(null);
  // FILL finish: how the artificial extension is styled — PAPER keeps the
  // theme sheet, EDGE samples the photo's border color (eyedropper) so the
  // extension blends into the picture, BLUR fills the frame with a blurred
  // copy of the page.
  const [scanFillStyle, setScanFillStyle] = useState<'paper' | 'edge' | 'blur'>('blur');
  const [scanContinuousMode, setScanContinuousMode] = useState(false);
  const [scanEdgeColor, setScanEdgeColor] = useState<string | null>(null);
  // PART-of-line trim: which pick index is open in the word trimmer, and
  // the first word already tapped (null → next tap sets the start).
  const [scanTrimAt, setScanTrimAt] = useState<number | null>(null);
  const [scanTrimWord, setScanTrimWord] = useState<number | null>(null);
  const [scanLines, setScanLines] = useState<ScanLineBox[]>([]);
  const [scanPicks, setScanPicks] = useState<ScanLineBox[]>([]);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const ocrFileRef = useRef<HTMLInputElement>(null);
  const [scanThumbnail, setScanThumbnail] = useState<string | null>(null);
  const scanActive = Boolean(scanImage);
  const sequenceGroups = (() => {
    // Split on direction tokens; each ">" / "<" run starts a new screen.
    const raw = anchorPhrase.split(/(>+|<+)/);
    const groups: { phrases: string[]; label: string; scrollIn: 'down' | 'up' | 'none' }[] = [];
    let pendingScroll: 'down' | 'up' = 'down';
    raw.forEach((part) => {
      if (/^>+$/.test(part)) { pendingScroll = 'down'; return; }
      if (/^<+$/.test(part)) { pendingScroll = 'up'; return; }
      const phrases = part.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean);
      if (phrases.length === 0) return;
      groups.push({ phrases, label: phrases.join(' | '), scrollIn: groups.length === 0 ? 'none' : pendingScroll });
      pendingScroll = 'down';
    });
    if (groups.length === 0) {
      groups.push({ phrases: [anchorPhrase.trim() || 'highlight'], label: anchorPhrase.trim() || 'highlight', scrollIn: 'none' });
    }
    // Master toggle OFF → collapse every phrase onto ONE screen (classic pass).
    if (!scrollTransitions && groups.length > 1) {
      const all = groups.flatMap((g) => g.phrases);
      return [{ phrases: all, label: all.join(' | '), scrollIn: 'none' }];
    }
    return groups;
  })();
  const sequenceActive = sequenceGroups.length > 1;
  const entranceWindowMs = entranceDirection === 'none' ? 0 : (entranceFlight + entranceHold) * 1000;
  const exitWindowMs = exitDirection === 'none' ? 0 : exitDuration * 1000;
  const SCENE_TRANSITION_MS = scrollDuration * 1000;  // motion-blurred scroll between screens
  const SCENE_SETTLE_MS = 380;      // dead stop beat after the scroll lands
  const SCENE_GAP_MS = 350;         // hold after each completed sweep
  const FINAL_HOLD_MS = 350;        // beat between the last sweep and the whip-out
  const EXIT_TAIL_MS = 450;         // blank paper color after the paper is gone
  const sceneSweepMs = highlightDuration * 1000;

  // Deterministic sequence clock — S(t) = f(t). Used identically by the live
  // loop and the frame-stepped exporter so preview pixels == export pixels.
  // The sector & paper NEVER change — every screen is the same document.
  // Tail: last sweep → FINAL hold → whip-out EXIT → blank paper tail.
  const sampleSequence = (elapsedMs: number): {
    phrase: string;
    screenIndex: number;
    entranceDir: 'none' | 'top' | 'bottom' | 'left' | 'right';
    entP: number;
    hp: number;
    exitDir: 'none' | 'top' | 'bottom' | 'left' | 'right';
    exitP: number;
  } => {
    const groups = sequenceGroups;
    let t = elapsedMs;
    if (entranceWindowMs > 0) {
      if (t < entranceWindowMs) {
        return { phrase: groups[0].label, screenIndex: 0, entranceDir: entranceDirection, entP: t / entranceWindowMs, hp: 0, exitDir: 'none', exitP: 0 };
      }
      t -= entranceWindowMs;
    }
    for (let i = 0; i < groups.length; i++) {
      if (i > 0 && groups[i].scrollIn !== 'none') {
        if (t < SCENE_TRANSITION_MS) {
          // ">" moves the view DOWN the page ⇒ paper flies in from below.
          const dir = groups[i].scrollIn === 'down' ? 'bottom' : 'top';
          return { phrase: groups[i].label, screenIndex: i, entranceDir: dir, entP: t / SCENE_TRANSITION_MS, hp: 0, exitDir: 'none', exitP: 0 };
        }
        t -= SCENE_TRANSITION_MS;
        if (t < SCENE_SETTLE_MS) {
          return { phrase: groups[i].label, screenIndex: i, entranceDir: 'none', entP: 1, hp: 0, exitDir: 'none', exitP: 0 };
        }
        t -= SCENE_SETTLE_MS;
      }
      if (t < sceneSweepMs) {
        return { phrase: groups[i].label, screenIndex: i, entranceDir: 'none', entP: 1, hp: easeHighlightSweep(t / sceneSweepMs), exitDir: 'none', exitP: 0 };
      }
      t -= sceneSweepMs;
      if (groups.length > 1) {
        if (t < SCENE_GAP_MS) {
          return { phrase: groups[i].label, screenIndex: i, entranceDir: 'none', entP: 1, hp: 1, exitDir: 'none', exitP: 0 };
        }
        t -= SCENE_GAP_MS;
      }
    }
    const last = groups.length - 1;
    const tailPhrase = { phrase: groups[last].label, screenIndex: last, entranceDir: 'none' as const, entP: 1, hp: 1 };
    if (t < FINAL_HOLD_MS) return { ...tailPhrase, exitDir: 'none', exitP: 0 };
    t -= FINAL_HOLD_MS;
    if (exitWindowMs > 0) {
      if (t < exitWindowMs) return { ...tailPhrase, exitDir: exitDirection, exitP: t / exitWindowMs };
      t -= exitWindowMs;
      return { ...tailPhrase, exitDir: exitDirection, exitP: 1 };
    }
    return { ...tailPhrase, exitDir: 'none', exitP: 0 };
  };

  const sequenceTotalMs = (() => {
    let acc = entranceWindowMs;
    sequenceGroups.forEach((g, i) => {
      acc += (i > 0 && g.scrollIn !== 'none' ? SCENE_TRANSITION_MS + SCENE_SETTLE_MS : 0) + sceneSweepMs + (sequenceGroups.length > 1 ? SCENE_GAP_MS : 0);
    });
    return acc + FINAL_HOLD_MS + exitWindowMs + EXIT_TAIL_MS;
  })();

  // ── SCAN-MODE / SEQUENCE REF BRIDGE ───────────────────────────────────────
  // The rAF loop must always read FRESH values (picks, sticky flag, current
  // sampleSequence) without re-subscribing every render, so everything the
  // loop needs per-frame flows through refs assigned on each render.
  const scanSweepMs = highlightDuration * 1000;
  const scanTotalMs = scanSequenceTotalMs(scanPicks, scanSweepMs);
  const scanStateRef = useRef({ active: false, picks: [] as ScanLineBox[], sweepMs: 2000, totalMs: 1200 });
  const scanBeatRef = useRef<ScanBeat>({ pickIndex: 0, phase: 'overview', phaseT: 0 });
  const [scanBeatUi, setScanBeatUi] = useState<ScanBeat>({ pickIndex: 0, phase: 'overview', phaseT: 0 });
  const sampleSequenceRef = useRef(sampleSequence);
  const stickyRef = useRef(stickyHighlights);
  const sequenceGroupsRef = useRef(sequenceGroups);
  // Latest-value bridge for the rAF loop: refs are refreshed after every commit
  // (in an effect, never during render) so the 60fps loop always reads fresh
  // values without ever re-subscribing.
  useEffect(() => {
    scanStateRef.current = { active: scanActive, picks: scanPicks, sweepMs: scanSweepMs, totalMs: scanTotalMs };
    sampleSequenceRef.current = sampleSequence;
    stickyRef.current = stickyHighlights;
    sequenceGroupsRef.current = sequenceGroups;
  });

  // Typography Scale & Layout
  const [headlineScale, setHeadlineScale] = useState(1.0);
  const [headlineWrapMode, setHeadlineWrapMode] = useState<'single-line' | 'auto-wrap'>('auto-wrap');

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  // §4: last exported video — carried into the resizer via the hand-off row
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  // Export resolution multiplier — 2 = 4K (e.g. 9:16 becomes 2160×3840).
  const [exportScale, setExportScale] = useState(1);

  // Canvas Refs & Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);

  const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspectRatio) || ASPECT_RATIOS[0];

  // Cross-tool intake (§4): transcript text handed off from Auto-Captions seeds the anchor phrase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await takeHandoffText('text-highlighter');
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
      setCuts(generateCutsForPhrase(phrase, 6));
      setCurrentCutIndex(0);
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync inputs when the active cut changes — React's "adjust state during
  // render" pattern (no effect, no cascading re-render).
  const [syncedCut, setSyncedCut] = useState(currentCut);
  if (currentCut && currentCut !== syncedCut) {
    setSyncedCut(currentCut);
    setCustomHeadline(currentCut.headline || '');
    setCustomMasthead(currentCut.masthead || 'CREATOR KIT');
    setCustomSubhead(currentCut.subhead || '');
    setCustomByline(currentCut.byline || '');
    setCustomBodyText((currentCut.bodyParagraphs || BODY_CORPUS).join('\n\n'));
  }

  // ─── SESSION MEMORY — the page remembers the last thing you made ─────────
  const sessionLoadStartedRef = useRef(false);
  const sessionHydratedRef = useRef(false);
  useEffect(() => {
    if (sessionLoadStartedRef.current) return;
    sessionLoadStartedRef.current = true;
    let cancelled = false;
    (async () => {
      const rec = await loadState<TextHighlighterSession>('text-highlighter');
      if (rec?.state) {
        const s = rec.state;
        setAnchorPhrase(String(s.anchorPhrase ?? ''));
        if (Array.isArray(s.cuts) && s.cuts.length > 0) {
          const idx = Math.min(Math.max(0, s.currentCutIndex | 0), s.cuts.length - 1);
          setCuts(s.cuts);
          setCurrentCutIndex(idx);
          // Pre-sync so the render-time cut sync above doesn't clobber the
          // restored custom fields with the cut's own defaults.
          setSyncedCut(s.cuts[idx] || s.cuts[0]);
        }
        setCustomHeadline(String(s.customHeadline ?? ''));
        setCustomMasthead(String(s.customMasthead ?? 'CREATOR KIT'));
        setCustomSubhead(String(s.customSubhead ?? ''));
        setCustomByline(String(s.customByline ?? ''));
        setCustomBodyText(String(s.customBodyText ?? ''));
        if (s.highlightSector === 'top-masthead' || s.highlightSector === 'center-headline' || s.highlightSector === 'body-paragraph') {
          setHighlightSector(s.highlightSector);
        }
        setStickyHighlights(Boolean(s.stickyHighlights));
        if (s.phraseInstances && typeof s.phraseInstances === 'object') setPhraseInstances(s.phraseInstances);
        if (s.scanPageFit === 'cover') setScanPageFit('cover');
        if (s.scanAutoCamera === false) setScanAutoCamera(false);
        if (s.scanFillStyle === 'edge' || s.scanFillStyle === 'blur') setScanFillStyle(s.scanFillStyle);
        if (typeof s.scanEdgeColor === 'string') setScanEdgeColor(s.scanEdgeColor);
        if (typeof s.scanImageDataUrl === 'string' && s.scanImageDataUrl && Array.isArray(s.scanLines) && s.scanLines.length > 0) {
          const img = new Image();
          img.onload = () => {
            if (cancelled) return;
            setScanImage(img);
            setScanImageUrl(s.scanImageDataUrl as string);
          };
          img.src = s.scanImageDataUrl;
          setScanLines(s.scanLines);
          setScanPicks(Array.isArray(s.scanPicks) ? s.scanPicks : []);
        }
        if (typeof s.scanThumbnail === 'string' && s.scanThumbnail) {
          setScanThumbnail(s.scanThumbnail);
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
      void saveState<TextHighlighterSession>('text-highlighter', 'Text Highlighter working state', {
        anchorPhrase,
        cuts,
        currentCutIndex,
        customHeadline,
        customMasthead,
        customSubhead,
        customByline,
        customBodyText,
        highlightSector,
        stickyHighlights,
        phraseInstances,
        scanPageFit,
        scanAutoCamera,
        scanFillStyle,
        scanEdgeColor,
        scanLines,
        scanPicks,
        scanImageDataUrl,
        scanThumbnail,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [anchorPhrase, cuts, currentCutIndex, customHeadline, customMasthead, customSubhead, customByline, customBodyText, highlightSector, stickyHighlights, phraseInstances, scanPageFit, scanAutoCamera, scanFillStyle, scanEdgeColor, scanLines, scanPicks, scanImageDataUrl, scanThumbnail]);

  // Update active cut with user edits
  const handleApplyCustomText = () => {
    const paras = customBodyText
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const updated = [...cuts];
    updated[currentCutIndex] = {
      ...updated[currentCutIndex],
      headline: customHeadline,
      masthead: customMasthead,
      subhead: customSubhead,
      byline: customByline,
      bodyParagraphs: paras.length > 0 ? paras : BODY_CORPUS,
    };
    setCuts(updated);
    handleReplay();
  };

  // Shuffle & Generate Brand New Random Story Copy
  const handleShuffleStory = () => {
    const randMasthead = MASTHEADS[Math.floor(Math.random() * MASTHEADS.length)];
    const randSubhead = SUBHEADS[Math.floor(Math.random() * SUBHEADS.length)];
    const randLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const randByline = BYLINES[Math.floor(Math.random() * BYLINES.length)];

    const shuffledBody = [
      BODY_CORPUS[Math.floor(Math.random() * BODY_CORPUS.length)],
      BODY_CORPUS[Math.floor(Math.random() * BODY_CORPUS.length)],
      BODY_CORPUS[Math.floor(Math.random() * BODY_CORPUS.length)],
    ];

    setCustomMasthead(randMasthead);
    setCustomSubhead(randSubhead);
    setCustomByline(`${randLocation} — ${randByline}`);
    setCustomBodyText(shuffledBody.join('\n\n'));

    const updated = [...cuts];
    updated[currentCutIndex] = {
      ...updated[currentCutIndex],
      masthead: randMasthead,
      subhead: randSubhead,
      byline: `${randLocation} — ${randByline}`,
      bodyParagraphs: shuffledBody,
    };
    setCuts(updated);
    handleReplay();
  };

  const renderOptions: HighlighterRenderOptions = {
    anchorPhrase,
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
    animationMode: 'animated-highlight',
    highlightProgress,
    highlightDirection,
    highlightSector,
    fontFamily,
    showTopColumns,
    showMasthead,
    showSubhead,
    showByline,
    showBottomColumns,
    showDividerRules,
    zoomEnabled,
    zoomDirection,
    zoomIntensity,
    headlineScale,
    headlineWrapMode,
    entranceDirection,
    entranceProgress,
    entranceBlur,
    exitDirection,
    exitProgress,
    exitBlur,
    paperTravel,
    anchorInstances: phraseInstances,
    scanPageFit,
    scanAutoCamera,
    scanFillStyle,
    scanEdgeColor: scanEdgeColor ?? undefined,
  };

  // Redraw Canvas Frame. Two worlds:
  //  • DOCUMENT SCAN MODE — the imported photo + camera beat drive it all;
  //  • JOURNAL MODE — per-frame sequence overrides from the sequence clock.
  const redraw = useCallback((overrides?: Partial<HighlighterRenderOptions>, scanBeat?: ScanBeat) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (scanBeat && scanImage) {
      renderScanDocumentStory(ctx, canvas.width, canvas.height, {
        image: scanImage,
        imageW: scanImage.naturalWidth || 1,
        imageH: scanImage.naturalHeight || 1,
        picks: scanPicks,
      }, { ...renderOptions, ...overrides }, scanBeat);
      return;
    }

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderHighlighterStoryWithEntrance(ctx, canvas.width, canvas.height, cut, { ...renderOptions, ...overrides }, currentCutIndex);
  }, [cuts, currentCutIndex, renderOptions, scanImage, scanPicks]);

  // Live Smooth Animation Loop — butter-smooth by construction:
  //  • the canvas is driven DIRECTLY by the sequence clock every frame;
  //  • React state (scrubber readouts) syncs at ~10 Hz, so the 60 fps render
  //    path never triggers a full page re-render mid-motion;
  //  • the rAF effect depends only on play-state + duration + scroll blur,
  //    so the subscription never tears down once per frame.
  const redrawRef = useRef(redraw);
  // Refreshed after every commit so the loop below always draws with the
  // latest options without re-subscribing.
  useEffect(() => {
    redrawRef.current = redraw;
  });

  useEffect(() => {
    let active = true;
    let lastStateSync = 0;

    const loop = (timestamp: number) => {
      if (!active) return;

      const scanState = scanStateRef.current;

      let frameOverrides: Partial<HighlighterRenderOptions> | undefined;
      if (isPlaying) {
        if (!animStartTimeRef.current) animStartTimeRef.current = timestamp;

        // ── DOCUMENT SCAN MODE clock ──────────────────────────────────
        if (scanState.active) {
          const elapsed = (timestamp - animStartTimeRef.current) % Math.max(600, scanState.totalMs);
          scanBeatRef.current = sampleScanSequence(elapsed, scanState.picks, scanState.sweepMs);
          if (timestamp - lastStateSync > 100) {
            lastStateSync = timestamp;
            setScanBeatUi(scanBeatRef.current);
          }
          redrawRef.current(undefined, scanBeatRef.current);
          animFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        // ── JOURNAL MODE sequence clock ───────────────────────────────
        const elapsed = (timestamp - animStartTimeRef.current) % sequenceTotalMs;
        const seq = sampleSequenceRef.current(elapsed);
        // UI-only sync at ~10 Hz — the overrides below carry the truth to
        // the canvas at full frame rate.
        if (timestamp - lastStateSync > 100) {
          lastStateSync = timestamp;
          setEntranceProgress(seq.entP);
          setExitProgress(seq.exitP);
          setHighlightProgress(seq.hp);
        }
        // Sector is deliberately NOT overridden — same paper, same sector.
        // Inter-screen scrolls are PURE glides: their own blur setting, ZERO
        // tilt wobble, no zoom, no settle bounce — the sheet flies flat.
        const isSceneScroll = seq.screenIndex > 0 && seq.entranceDir !== 'none';
        // STICKY MEMORY: phrases swept on earlier screens stay on the page,
        // faintly dimmed, while the live phrase sweeps on the new screen.
        const settledJoin = stickyRef.current && seq.screenIndex > 0
          ? sequenceGroupsRef.current.slice(0, seq.screenIndex).flatMap((g) => g.phrases).join(' | ')
          : '';
        frameOverrides = {
          anchorPhrase: seq.phrase,
          persistedPhrases: settledJoin,
          entranceDirection: seq.entranceDir,
          entranceProgress: seq.entP,
          highlightProgress: seq.hp,
          exitDirection: seq.exitDir,
          exitProgress: seq.exitP,
          ...(isSceneScroll
            ? { entranceBlur: scrollBlur, entranceTilt: 0, entranceScaleFrom: 1, entranceOvershoot: 0.02 }
            : {}),
        };
      }

      redrawRef.current(frameOverrides, scanState.active ? scanBeatRef.current : undefined);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, sequenceTotalMs, scrollBlur]);

  // ─── ZERO-LEARNING-CURVE SEQUENCING ───────────────────────────────────────
  // One-tap tokens: chips insert "|", ">" and "<" AT THE CURSOR so nobody
  // ever has to learn syntax — you tap, the structure builds itself.
  const anchorInputRef = useRef<HTMLInputElement>(null);
  const insertAnchorToken = (token: string) => {
    const el = anchorInputRef.current;
    const start = el?.selectionStart ?? anchorPhrase.length;
    const end = el?.selectionEnd ?? anchorPhrase.length;
    setAnchorPhrase(anchorPhrase.slice(0, start) + token + anchorPhrase.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // Apply a preset's LOOK + MOTION personality. keepText preserves the
  // user's anchor phrase and regenerates the paper AROUND it — that's the
  // shuffle contract: vibes change, your words never do.
  const applyPresetVibe = (p: (typeof PRESET_TOPICS)[number], opts?: { keepText?: boolean }) => {
    setHighlightColor(p.highlightColor);
    setHighlightStyle(p.highlightStyle);
    setPaperTheme(p.paperTheme);

    // Motion recipe — presets carry the FULL cinematic package (slam-in →
    // sweep → whip-out) so one click sets the whole personality, not just
    // the colors. Different presets intentionally use different edges and
    // blur intensities so the library feels varied, not templated.
    const m = p.motion;
    setEntranceDirection(m?.entranceDirection ?? 'none');
    if (m?.entranceFlight) setEntranceFlight(m.entranceFlight);
    if (m?.entranceHold !== undefined) setEntranceHold(m.entranceHold);
    setEntranceBlur(m?.entranceBlur ?? 0.8);
    setExitDirection(m?.exitDirection ?? 'none');
    if (m?.exitDuration) setExitDuration(m.exitDuration);
    setExitBlur(m?.exitBlur ?? 0.8);
    setEntranceProgress(0);
    setExitProgress(0);

    const anchor = opts?.keepText ? anchorPhrase : p.anchor;
    const freshCuts = !opts?.keepText && p.cuts.length > 0
      ? JSON.parse(JSON.stringify(p.cuts))
      : generateCutsForPhrase(anchor, 6);
    setCuts(freshCuts);
    setCurrentCutIndex(0);

    const firstCut = freshCuts[0];
    if (firstCut) {
      setCustomHeadline(firstCut.headline || '');
      setCustomMasthead(firstCut.masthead || 'CREATOR KIT');
      setCustomSubhead(firstCut.subhead || '');
      setCustomByline(firstCut.byline || '');
      setCustomBodyText((firstCut.bodyParagraphs || BODY_CORPUS).join('\n\n'));
    }

    const presetScreens = (anchor.match(/(>+|<+)/g)?.length ?? 0) + 1;
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setIsPlaying(true);
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, presetScreens);
  };

  // Handle Preset Selection (full apply — example text + vibe)
  const handleLoadPreset = (presetId: string) => {
    const p = PRESET_TOPICS.find((t) => t.id === presetId);
    if (!p) return;
    setAnchorPhrase(p.anchor);
    applyPresetVibe(p);
  };

  // SHUFFLE VIBE — instant personality roulette from the 50-vibe deck.
  // Never touches the user's text: roll until it feels right, hit GENERATE.
  const [lastVibeId, setLastVibeId] = useState<string | null>(null);
  const handleShuffleVibe = () => {
    const pool = PRESET_TOPICS.filter((t) => t.id !== lastVibeId);
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p) return;
    setLastVibeId(p.id);
    applyPresetVibe(p, { keepText: true });
  };

  // ── DOCUMENT SCAN MODE ─────────────────────────────────────────────────────
  // Newspaper photo → browser OCR → extracted lines you tap, in the exact
  // order you want them highlighted. The uploaded clip becomes the page and
  // the camera dives to each pick; every mark stays on the paper.
  // Eyedropper: average the border pixels of the scan (downscaled for
  // speed) → the artificial FILL extension blends into the photo instead
  // of reading as a foreign sheet.
  // Eyedropper: sample border pixels of the scan using IQR to reject outlier bars/ads
  const sampleEdgeColor = (img: HTMLImageElement): string | null => {
    try {
      const size = 32;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const cc = c.getContext('2d', { willReadFrequently: true });
      if (!cc) return null;
      cc.drawImage(img, 0, 0, size, size);
      const d = cc.getImageData(0, 0, size, size).data;
      const pixels: { r: number; g: number; b: number; lum: number }[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const edge = x < 3 || y < 3 || x >= size - 3 || y >= size - 3;
          if (!edge) continue;
          const k = (y * size + x) * 4;
          const r = d[k];
          const g = d[k + 1];
          const b = d[k + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          pixels.push({ r, g, b, lum });
        }
      }
      if (pixels.length === 0) return null;
      // Sort by luminance and sample IQR (20%..80%) to ignore navigation bars / notches
      pixels.sort((a, b) => a.lum - b.lum);
      const start = Math.floor(pixels.length * 0.2);
      const end = Math.floor(pixels.length * 0.8);
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = start; i < end; i++) {
        r += pixels[i].r;
        g += pixels[i].g;
        b += pixels[i].b;
        n++;
      }
      if (!n) return null;
      const hex = (v: number) => Math.max(0, Math.min(255, Math.round(v / n))).toString(16).padStart(2, '0');
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    } catch {
      return null;
    }
  };

  const pickScreenColor = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res?.sRGBHex) {
          setScanEdgeColor(res.sRGBHex);
          setScanFillStyle('edge');
        }
      } catch {
        // user cancelled / pressed ESC
      }
    }
  };

  const handleOcrImport = async (file: File) => {
    let url = '';
    try {
      setOcrStatus('Reading image…');
      url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not decode the image'));
        img.src = url;
      });

      setOcrStatus('Loading the reader — it downloads once, then lives on your device…');
      const Tesseract = await import('tesseract.js');
      type OcrWorker = {
        recognize: (image: HTMLImageElement, opts?: unknown, out?: unknown) => Promise<{ data: unknown }>;
        terminate: () => Promise<unknown>;
      };
      const createOcrWorker = (Tesseract as unknown as {
        createWorker: (
          lang?: string,
          oem?: number,
          opts?: { logger?: (m: { status?: string; progress?: number }) => void }
        ) => Promise<OcrWorker>;
      }).createWorker;
      const worker = await createOcrWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrStatus(`Reading the page… ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const result = await worker.recognize(img, {}, { blocks: true, text: true });
      await worker.terminate();

      // Data-URL twin for session persistence (IndexedDB-friendly).
      let dataUrl = '';
      try {
        dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => resolve('');
          r.readAsDataURL(file);
        });
      } catch { dataUrl = ''; }
      const iw = img.naturalWidth || 1;
      const ih = img.naturalHeight || 1;
      const lines: ScanLineBox[] = [];
      const data = result.data as any;
      const pushLine = (
        text: unknown,
        bbox?: { x0: number; y0: number; x1: number; y1: number },
        words?: { text?: unknown; bbox?: { x0: number; y0: number; x1: number; y1: number } }[]
      ) => {
        const t = String(text ?? '').replace(/\s+/g, ' ').trim();
        if (!t || t.length < 2 || !bbox) return;
        // Keep the word boxes — they power PART-of-line trims later.
        let normWords = (words || [])
          .map((w) => ({
            text: String(w.text ?? '').trim(),
            box: w.bbox
              ? { x0: w.bbox.x0 / iw, y0: w.bbox.y0 / ih, x1: w.bbox.x1 / iw, y1: w.bbox.y1 / ih }
              : null,
          }))
          .filter((w): w is { text: string; box: { x0: number; y0: number; x1: number; y1: number } } => w.text.length > 0 && w.box !== null);

        // Fallback: if OCR didn't provide individual words, synthesize them from line text!
        if (normWords.length < 2) {
          const rawWs = t.split(/\s+/).filter(Boolean);
          if (rawWs.length > 0) {
            const totalChars = rawWs.reduce((acc, w) => acc + w.length, 0) + (rawWs.length - 1);
            const lineX0 = bbox.x0 / iw;
            const lineX1 = bbox.x1 / iw;
            const totalW = lineX1 - lineX0;
            let cur = lineX0;
            normWords = rawWs.map((w) => {
              const wFrac = w.length / totalChars;
              const wW = wFrac * totalW;
              const spW = (1 / totalChars) * totalW;
              const wb = {
                text: w,
                box: {
                  x0: cur,
                  y0: bbox.y0 / ih,
                  x1: Math.min(lineX1, cur + wW),
                  y1: bbox.y1 / ih,
                },
              };
              cur += wW + spW;
              return wb;
            });
          }
        }

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
        // Fallback: cluster loose words into visual lines by vertical bands.
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
          const x0 = Math.min(...items.map((w) => w.bbox.x0));
          const y0 = Math.min(...items.map((w) => w.bbox.y0));
          const x1 = Math.max(...items.map((w) => w.bbox.x1));
          const y1 = Math.max(...items.map((w) => w.bbox.y1));
          pushLine(items.map((w) => w.text).join(' '), { x0, y0, x1, y1 }, items.map((w) => ({ text: w.text, bbox: w.bbox })));
        });
      }

      if (lines.length === 0) {
        setOcrStatus('No readable text found — try a sharper, brighter photo of the article.');
        setTimeout(() => setOcrStatus(null), 4000);
        URL.revokeObjectURL(url);
        return;
      }

      const sampled = sampleEdgeColor(img);
      setScanEdgeColor(sampled);
      setScanFillStyle('blur'); // Default to modern ambient blur fill on import

      // Create a lightweight JPEG thumbnail (3-4KB) that is guaranteed to persist and never break
      let thumbDataUrl = '';
      try {
        const thumbC = document.createElement('canvas');
        const maxThumb = 120;
        const tScale = Math.min(maxThumb / (img.naturalWidth || 1), maxThumb / (img.naturalHeight || 1));
        thumbC.width = Math.max(20, Math.round((img.naturalWidth || 1) * tScale));
        thumbC.height = Math.max(20, Math.round((img.naturalHeight || 1) * tScale));
        const tCtx = thumbC.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, thumbC.width, thumbC.height);
          thumbDataUrl = thumbC.toDataURL('image/jpeg', 0.85);
        }
      } catch { /* ignore */ }

      // Create a persistent compressed image data URL so the session survives reloads
      let fullDataUrl = '';
      try {
        const fullC = document.createElement('canvas');
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        fullC.width = Math.round((img.naturalWidth || 1) * scale);
        fullC.height = Math.round((img.naturalHeight || 1) * scale);
        const fCtx = fullC.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(img, 0, 0, fullC.width, fullC.height);
          fullDataUrl = fullC.toDataURL('image/jpeg', 0.85);
        }
      } catch { /* ignore */ }

      setScanThumbnail(thumbDataUrl || null);
      setScanImage(img);
      setScanImageUrl(url);
      setScanImageDataUrl(fullDataUrl || null);
      setScanLines(lines);
      setScanPicks([]);
      setPhraseInstances({});
      setSidebarTab('style');
      scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
      setIsPlaying(false);
      setOcrStatus(`Extracted ${lines.length} lines — tap the ones you want highlighted, in order.`);
    } catch (err) {
      console.warn('OCR import failed:', err);
      const isDecode = err instanceof Error && err.message.includes('decode');
      const heic = /\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
      setOcrStatus(
        isDecode
          ? heic
            ? 'This looks like an HEIC photo — export it as JPG/PNG from your photos app and retry.'
            : 'That image could not be decoded — try a JPG or PNG photo of the article.'
          : 'Reading failed — the reader downloads once, so check your connection and retry.'
      );
      setTimeout(() => setOcrStatus(null), 4500);
      if (url) URL.revokeObjectURL(url);
    }
  };

  const toggleScanPick = (line: ScanLineBox) => {
    // Flow (RANGE) picks own several lines at once — tapping any member
    // line removes (or re-adds) the whole block.
    const ownsLine = (p: ScanLineBox) => p.id === line.id || (p.flow || []).some((f) => f.id === line.id);
    const idx = scanPicks.findIndex(ownsLine);
    let next: ScanLineBox[];
    if (idx >= 0) {
      next = scanPicks.filter((p) => !ownsLine(p));
      setScanInsertAt(null);
    } else if (scanContinuousMode && scanPicks.length > 0) {
      // Continuous mode: append this line directly into the ongoing continuous sweep!
      const allFlow: ScanLineBox[] = [];
      scanPicks.forEach((p) => {
        if (p.flow && p.flow.length > 0) allFlow.push(...p.flow);
        else allFlow.push(p);
      });
      allFlow.push(line);
      const u = allFlow.reduce(
        (acc, l) => ({
          x0: Math.min(acc.x0, l.box.x0),
          y0: Math.min(acc.y0, l.box.y0),
          x1: Math.max(acc.x1, l.box.x1),
          y1: Math.max(acc.y1, l.box.y1),
        }),
        { x0: 1, y0: 1, x1: 0, y1: 0 }
      );
      const mergedPick: ScanLineBox = {
        id: `flow-continuous-${Date.now()}`,
        text: allFlow.map((l) => l.text).join(' / '),
        box: u,
        flow: allFlow,
        words: allFlow.flatMap((l) => l.words || []),
      };
      next = [mergedPick];
      setScanInsertAt(null);
    } else if (scanInsertAt != null && scanInsertAt <= scanPicks.length) {
      // Insert exactly between two picks — no re-tapping the whole sequence.
      next = [...scanPicks.slice(0, scanInsertAt), line, ...scanPicks.slice(scanInsertAt)];
      setScanInsertAt(null);
    } else {
      next = [...scanPicks, line];
    }
    setScanPicks(next);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    if (next.length > 0) {
      animStartTimeRef.current = performance.now();
      setIsPlaying(true);
      if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, next.length);
    }
  };

  // Grab a CONTINUOUS run of lines in one shot: RANGE on the first line,
  // RANGE on the last — the whole block becomes ONE "flow" pick, swept by
  // a single continuous A→B→C→D marker motion in a single beat.
  const applyScanRange = (fromIdx: number, toIdx: number) => {
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const rangeLines = scanLines.slice(lo, hi + 1);
    if (rangeLines.length === 0) {
      setScanRangeFrom(null);
      return;
    }
    const u = rangeLines.reduce(
      (acc, l) => ({
        x0: Math.min(acc.x0, l.box.x0),
        y0: Math.min(acc.y0, l.box.y0),
        x1: Math.max(acc.x1, l.box.x1),
        y1: Math.max(acc.y1, l.box.y1),
      }),
      { x0: 1, y0: 1, x1: 0, y1: 0 }
    );
    const flowPick: ScanLineBox = {
      id: `flow-${rangeLines[0].id}-${rangeLines[rangeLines.length - 1].id}-${Date.now()}`,
      text: rangeLines.map((l) => l.text).join(' / '),
      box: u,
      flow: rangeLines,
      words: rangeLines.flatMap((l) => l.words || []),
    };

    // Remove any previous individual picks that were within this range
    const rangeIds = new Set(rangeLines.map((l) => l.id));
    const filteredPicks = scanPicks.filter(
      (p) => !rangeIds.has(p.id) && !(p.flow || []).some((f) => rangeIds.has(f.id))
    );

    const next = [...filteredPicks, flowPick];
    setScanPicks(next);
    setScanRangeFrom(null);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    animStartTimeRef.current = performance.now();
    setIsPlaying(true);
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, next.length);
  };

  const mergeScanPicks = (i: number) => {
    if (i < 0 || i >= scanPicks.length - 1) return;
    const a = scanPicks[i];
    const b = scanPicks[i + 1];
    const flowA = a.flow && a.flow.length > 0 ? a.flow : [a];
    const flowB = b.flow && b.flow.length > 0 ? b.flow : [b];
    const mergedFlow = [...flowA, ...flowB];
    const u = mergedFlow.reduce(
      (acc, l) => ({
        x0: Math.min(acc.x0, l.box.x0),
        y0: Math.min(acc.y0, l.box.y0),
        x1: Math.max(acc.x1, l.box.x1),
        y1: Math.max(acc.y1, l.box.y1),
      }),
      { x0: 1, y0: 1, x1: 0, y1: 0 }
    );
    const mergedPick: ScanLineBox = {
      id: `flow-${mergedFlow[0].id}-${mergedFlow[mergedFlow.length - 1].id}-${Date.now()}`,
      text: mergedFlow.map((l) => l.text).join(' / '),
      box: u,
      flow: mergedFlow,
      words: mergedFlow.flatMap((l) => l.words || []),
    };
    const next = [...scanPicks.slice(0, i), mergedPick, ...scanPicks.slice(i + 2)];
    setScanPicks(next);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    animStartTimeRef.current = performance.now();
    setIsPlaying(true);
  };

  const splitScanPick = (i: number) => {
    const p = scanPicks[i];
    if (!p?.flow || p.flow.length <= 1) return;
    const individualPicks = p.flow;
    const next = [...scanPicks.slice(0, i), ...individualPicks, ...scanPicks.slice(i + 1)];
    setScanPicks(next);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    animStartTimeRef.current = performance.now();
    setIsPlaying(true);
  };

  const mergeAllPicks = () => {
    if (scanPicks.length <= 1) return;
    const allFlow: ScanLineBox[] = [];
    scanPicks.forEach((p) => {
      if (p.flow && p.flow.length > 0) allFlow.push(...p.flow);
      else allFlow.push(p);
    });
    const u = allFlow.reduce(
      (acc, l) => ({
        x0: Math.min(acc.x0, l.box.x0),
        y0: Math.min(acc.y0, l.box.y0),
        x1: Math.max(acc.x1, l.box.x1),
        y1: Math.max(acc.y1, l.box.y1),
      }),
      { x0: 1, y0: 1, x1: 0, y1: 0 }
    );
    const mergedPick: ScanLineBox = {
      id: `flow-all-${Date.now()}`,
      text: allFlow.map((l) => l.text).join(' / '),
      box: u,
      flow: allFlow,
      words: allFlow.flatMap((l) => l.words || []),
    };
    setScanPicks([mergedPick]);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    animStartTimeRef.current = performance.now();
    setIsPlaying(true);
  };

  const splitAllPicks = () => {
    const allIndividual: ScanLineBox[] = [];
    scanPicks.forEach((p) => {
      if (p.flow && p.flow.length > 0) allIndividual.push(...p.flow);
      else allIndividual.push(p);
    });
    setScanPicks(allIndividual);
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    animStartTimeRef.current = performance.now();
    setIsPlaying(true);
  };

  // ── PART-of-line trim ("break the line") ─────────────────────────────────
  // Tap words to narrow the highlight box to that span ("middle sentence inside line").
  const openTrimForLine = (line: ScanLineBox) => {
    if (!line.words || line.words.length === 0) {
      const ws = line.text.split(/\s+/).filter(Boolean);
      const totalChars = ws.reduce((acc, w) => acc + w.length, 0) + (ws.length - 1);
      const lineX0 = line.box.x0;
      const lineX1 = line.box.x1;
      const totalW = lineX1 - lineX0;
      let cur = lineX0;
      line.words = ws.map((w) => {
        const wFrac = w.length / totalChars;
        const wW = wFrac * totalW;
        const spW = (1 / totalChars) * totalW;
        const wb = { text: w, box: { x0: cur, y0: line.box.y0, x1: Math.min(lineX1, cur + wW), y1: line.box.y1 } };
        cur += wW + spW;
        return wb;
      });
    }
    const idx = scanPicks.findIndex((p) => p.id === line.id || (p.flow || []).some((f) => f.id === line.id));
    if (idx >= 0) {
      if (scanPicks[idx].flow && scanPicks[idx].flow!.length > 1) {
        splitScanPick(idx);
        setTimeout(() => {
          const newIdx = scanPicks.findIndex((p) => p.id === line.id);
          if (newIdx >= 0) {
            setScanTrimAt(newIdx);
            setScanTrimWord(null);
          }
        }, 50);
        return;
      }
      setScanTrimAt(scanTrimAt === idx ? null : idx);
      setScanTrimWord(null);
      return;
    }
    const at = scanInsertAt != null && scanInsertAt <= scanPicks.length ? scanInsertAt : scanPicks.length;
    toggleScanPick(line);
    setScanTrimAt(at);
    setScanTrimWord(null);
  };

  const handleTrimWord = (wordIdx: number) => {
    if (scanTrimAt == null) return;
    const pick = scanPicks[scanTrimAt];
    if (!pick?.words || pick.words.length === 0) return;

    if (scanTrimWord == null) {
      // First tap: highlight just this single word immediately
      const w = pick.words[wordIdx];
      setScanTrimWord(wordIdx);
      setScanPicks(scanPicks.map((p, i) => i === scanTrimAt
        ? {
            ...p,
            origBox: p.origBox ?? p.box,
            origText: p.origText ?? p.text,
            box: { ...p.box, x0: w.box.x0, x1: w.box.x1 },
            text: w.text,
          }
        : p));
      return;
    }

    // Second tap: expand span from first tap to second tap
    const lo = Math.min(scanTrimWord, wordIdx);
    const hi = Math.max(scanTrimWord, wordIdx);
    const ws = pick.words.slice(lo, hi + 1);
    const x0 = Math.min(...ws.map((w) => w.box.x0));
    const x1 = Math.max(...ws.map((w) => w.box.x1));
    setScanPicks(scanPicks.map((p, i) => i === scanTrimAt
      ? {
          ...p,
          origBox: p.origBox ?? p.box,
          origText: p.origText ?? p.text,
          box: { ...p.box, x0, x1 },
          text: ws.map((w) => w.text).join(' '),
        }
      : p));
    setScanTrimWord(null);
  };

  const resetScanTrim = () => {
    if (scanTrimAt == null) return;
    setScanPicks(scanPicks.map((p, i) => (i === scanTrimAt && p.origBox
      ? { ...p, box: p.origBox, text: p.origText ?? p.text, origBox: undefined, origText: undefined }
      : p)));
    setScanTrimWord(null);
  };

  const exitScanMode = () => {
    if (scanImageUrl?.startsWith('blob:')) URL.revokeObjectURL(scanImageUrl);
    setScanImage(null);
    setScanImageUrl(null);
    setScanInsertAt(null);
    setScanRangeFrom(null);
    setScanTrimAt(null);
    setScanTrimWord(null);
    setScanFillStyle('blur');
    setScanContinuousMode(false);
    setScanEdgeColor(null);
    setScanImageDataUrl(null);
    setScanThumbnail(null);
    setScanLines([]);
    setScanPicks([]);
    setOcrStatus(null);
    if (ocrFileRef.current) ocrFileRef.current.value = '';
    scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
    handleReplay();
  };

  const tokenChipStyle = {
    padding: '5px 10px',
    border: '2px solid #000',
    borderRadius: 4,
    background: '#fff',
    color: '#000',
    fontSize: '0.62rem',
    fontFamily: 'monospace',
    fontWeight: 900,
    textTransform: 'uppercase',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    boxShadow: '2px 2px 0 #000',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  } as const;

  // Generate Custom Phrase Cuts
  const handleAutoGenerate = () => {
    const phrase = anchorPhrase.trim();
    if (!phrase) return;
    setIsGenerating(true);
    const newCuts = generateCutsForPhrase(phrase, 6);
    setCuts(newCuts);
    setCurrentCutIndex(0);
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setExitProgress(0);
    setIsPlaying(true);
    // One sound pass per screen (">" / "<" tokens), not per phrase.
    const screensCount = (phrase.match(/(>+|<+)/g)?.length ?? 0) + 1;
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, screensCount);
    setTimeout(() => setIsGenerating(false), 250);
  };

  // Restart Animation from 0%
  const handleReplay = () => {
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setEntranceProgress(entranceWindowMs > 0 ? 0 : 1);
    setExitProgress(0);
    setIsPlaying(true);
    if (scanActive) {
      scanBeatRef.current = { pickIndex: 0, phase: 'overview', phaseT: 0 };
      if (soundEffect !== 'mute' && scanPicks.length > 0) playCutSound(soundEffect, soundVolume, highlightDuration, scanPicks.length);
      return;
    }
    const screensCount = sequenceGroups.length;
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, screensCount);
  };

  // Single Frame PNG Copy
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

  // Export base name — in scan mode the file is named after what is
  // actually ON it: the first picked line, slugified and capped. No more
  // meaningless default names that have nothing to do with the content.
  const scanExportBase = (): string => {
    const first = scanActive ? (scanPicks[0]?.text || scanLines[0]?.text || '') : '';
    const slug = first.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return slug || 'newspaper-highlight';
  };

  // Single Frame PNG Download
  // Downloads gated behind a sponsor pause (owner correction 2026-10-07:
  // generate stays free, the export moment carries the ad).
  const handleDownloadSingleFrame = () =>
    gateAction('/text-highlighter', 'Download frame', 'download', 0, handleDownloadSingleFrameUngated);
  const handleDownloadSingleFrameUngated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = scanActive ? `${scanExportBase()}.png` : `highlighter-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export High-Definition Video via deterministic WebCodecs encoding.
  // Renders each frame exactly once with explicit timestamps — constant frame
  // rate, zero dropped frames, High-profile H.264 + offline-rendered AAC audio.
  const handleExportVideo = () =>
    gateAction('/text-highlighter', 'Download video', 'download', 0, () => {
      void handleExportVideoUngated();
    });
  const handleExportVideoUngated = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setIsPlaying(false);
    const exportResLabel = `${exportScale > 1 ? '4K' : 'HD'} (${selectedAspect.width * exportScale}×${selectedAspect.height * exportScale})`;
    setExportProgress(`Preparing ${exportResLabel} encoder...`);

    try {
      // 60fps constant frame rate — buttery sweep, matching the live preview.
      const fps = 60;
      const exportSweepMs = highlightDuration * 1000;
      const exportTotalMs = scanActive ? scanSequenceTotalMs(scanPicks, exportSweepMs) : sequenceTotalMs;
      const totalFrames = Math.max(40, Math.round((exportTotalMs / 1000) * fps));
      const currentCut = cuts[currentCutIndex] || cuts[0];

      // Make sure webfonts are ready before any frame renders — an explicit
      // load() is required: fonts download lazily and canvas usage alone
      // never triggers the fetch, so `ready` alone can still race.
      try {
        const bare = fontFamily.split(',')[0].replace(/["']/g, '').trim();
        if (bare) {
          await Promise.all([
            document.fonts.load(`bold 64px "${bare}"`),
            document.fonts.load(`italic 32px "${bare}"`),
            document.fonts.load(`900 32px "${bare}"`),
          ]);
        }
        await document.fonts?.ready;
      } catch { }

      // Deterministic offline audio track (exact same timeline as the frames).
      let audioBuffer: AudioBuffer | null = null;
      if (soundEffect !== 'mute') {
        setExportProgress('Rendering audio track...');
        try {
          audioBuffer = await renderOfflineAudio({
            durationSec: totalFrames / fps,
            schedule: (ctx, dest) => {
              if (scanActive) {
                // One marker pass per picked line, fired at the exact second
                // each scan sweep begins (after the overview + camera dive).
                scanPicks.forEach((pick, i) => {
                  const pickDur = getPickSweepMs(pick, exportSweepMs) / 1000;
                  synthesizeCutSound(ctx, dest, soundEffect, soundVolume, scanSweepStartMs(i, scanPicks, exportSweepMs) / 1000, pickDur, 1);
                });
                return;
              }
              // One marker pass per screen — each sweep gets its own sound at
              // the exact second its screen starts (after any slam/scroll).
              let cursor = entranceWindowMs;
              sequenceGroups.forEach((g, i) => {
                if (i > 0 && g.scrollIn !== 'none') cursor += SCENE_TRANSITION_MS + SCENE_SETTLE_MS;
                synthesizeCutSound(ctx, dest, soundEffect, soundVolume, cursor / 1000, highlightDuration, 1);
                cursor += sceneSweepMs + (sequenceGroups.length > 1 ? SCENE_GAP_MS : 0);
              });
            },
          });
        } catch (audioErr) {
          console.warn('Offline audio render bypassed:', audioErr);
          audioBuffer = null;
        }
      }

      const result = await exportCanvasVideoToMp4({
        width: selectedAspect.width * exportScale,
        height: selectedAspect.height * exportScale,
        fps,
        totalFrames,
        // 4K needs roughly 2.2× the bits per frame to stay crisp.
        bitrate: exportScale > 1 ? 45_000_000 : 20_000_000,
        audioBuffer,
        onProgress: (p) => setExportProgress(`Encoding ${exportResLabel} video: ${Math.round(p * 100)}%`),
        renderFrame: (frameIndex, ctx) => {
          const frameMs = (frameIndex / fps) * 1000;

          // ── DOCUMENT SCAN MODE — same deterministic clock as the loop. ──
          if (scanActive && scanImage) {
            const beat = sampleScanSequence(frameMs, scanPicks, exportSweepMs);
            renderScanDocumentStory(ctx, ctx.canvas.width, ctx.canvas.height, {
              image: scanImage,
              imageW: scanImage.naturalWidth || 1,
              imageH: scanImage.naturalHeight || 1,
              picks: scanPicks,
            }, renderOptions, beat);
            return;
          }

          // Same deterministic sequence clock as the live loop.
          const seq = sampleSequence(frameMs);
          if (frameIndex % 10 === 0) {
            setEntranceProgress(seq.entP);
            setHighlightProgress(seq.hp);
          }

          const isSceneScroll = seq.screenIndex > 0 && seq.entranceDir !== 'none';
          const frameRenderOptions: HighlighterRenderOptions = {
            ...renderOptions,
            anchorPhrase: seq.phrase,
            persistedPhrases: stickyHighlights && seq.screenIndex > 0
              ? sequenceGroups.slice(0, seq.screenIndex).flatMap((g) => g.phrases).join(' | ')
              : '',
            highlightProgress: seq.hp,
            entranceDirection: seq.entranceDir,
            entranceProgress: seq.entP,
            exitDirection: seq.exitDir,
            exitProgress: seq.exitP,
            // Export mirrors the live loop: inter-screen scrolls are pure
            // glides (own blur, flat tilt, no zoom, no bounce).
            ...(isSceneScroll
              ? { entranceBlur: scrollBlur, entranceTilt: 0, entranceScaleFrom: 1, entranceOvershoot: 0.02 }
              : {}),
          };

          renderHighlighterStoryWithEntrance(ctx, ctx.canvas.width, ctx.canvas.height, currentCut, frameRenderOptions, currentCutIndex);
        },
      });

      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const exportName = scanActive
        ? scanExportBase()
        : `highlighter-animation-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}`;
      downloadBlob(result.blob, `${exportName}.${ext}`);
      setLastExportBlob(result.blob);
      setExportProgress(null);
    } catch (err) {
      console.error('Video Export failed:', err);
      setExportProgress('Export failed.');
      setTimeout(() => setExportProgress(null), 3000);
    } finally {
      setIsExporting(false);
      setIsPlaying(true);
      animStartTimeRef.current = performance.now();
    }
  };

  // Filter Google Fonts by category
  const filteredFonts =
    selectedFontCategory === 'All'
      ? GOOGLE_FONTS_LIST
      : GOOGLE_FONTS_LIST.filter((f) => f.category === selectedFontCategory);

  return (
    <div
      className="tool-page-padding"
      style={{
        position: 'relative',
        minHeight: '100%',
        padding: '20px 16px 80px',
        maxWidth: 1380,
        margin: '0 auto',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Top Title & Category Bar */}
      <div className="tool-page-header" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="tool-page-badge-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            ANIMATED HIGHLIGHTER STUDIO
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#666',
              fontFamily: 'monospace',
            }}
          >
            MACRO LENS OPTICS · 52 GOOGLE FONTS · 1080P EXPORT
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
            Text Highlighter Studio
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
            Cinematic slow-motion marker, circle, underline, and box highlighter animations. 50 curated script presets, sticky multi-phrase sequences that never erase, ambiguous-match instance picking, and real newspaper-photo import with camera-dive choreography.
          </p>
        </div>
      </div>

      {/* Main Workspace 2-Column Responsive Grid */}
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
                {scanActive ? (
                  <span style={{ color: '#000', fontWeight: 900 }}>
                    PICK {Math.min(scanBeatUi.pickIndex + 1, Math.max(scanPicks.length, 1))}/{Math.max(scanPicks.length, 1)} ·{' '}
                    {scanPicks.length === 0 ? 'TAP LINES BELOW' : scanBeatUi.phase.toUpperCase()}
                  </span>
                ) : (
                  <>
                    <span style={{ color: '#000', fontWeight: 900 }}>
                      ANIMATION: {Math.round(highlightProgress * 100)}%
                    </span>
                    <span style={{ color: '#aaa' }}>|</span>
                    <span style={{ textTransform: 'uppercase', color: '#333', fontWeight: 800 }}>
                      {cuts[currentCutIndex]?.masthead || 'NEWSPAPER'}
                    </span>
                  </>
                )}
              </div>

              <div className="tool-viewport-meta-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                {scanActive && (
                  <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 3, overflow: 'hidden' }} title="Scan page fit — FILL keeps the WHOLE picture visible and extends the page with matching paper to fill the aspect ratio; FIT shows the whole page with a desk margin">
                    {[{ id: 'contain' as const, label: 'FIT' }, { id: 'cover' as const, label: 'FILL' }].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setScanPageFit(f.id)}
                        style={{
                          padding: '3px 7px',
                          border: 'none',
                          background: scanPageFit === f.id ? '#000' : '#fff',
                          color: scanPageFit === f.id ? '#FFE500' : '#000',
                          fontFamily: 'monospace',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
                {scanActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 3, overflow: 'hidden' }} title="Scan canvas background — BLUR fills the frame with a blurred ambient copy of the page; EDGE blends the canvas with the photo's edge color; PAPER uses the newspaper desk theme">
                      {[{ id: 'blur' as const, label: 'BLUR' }, { id: 'edge' as const, label: 'EDGE' }, { id: 'paper' as const, label: 'PAPER' }].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setScanFillStyle(f.id)}
                          style={{
                            padding: '3px 7px',
                            border: 'none',
                            background: scanFillStyle === f.id ? '#000' : '#fff',
                            color: scanFillStyle === f.id ? '#FFE500' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {scanFillStyle === 'edge' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fff', border: '1.5px solid #000', borderRadius: 3, padding: '1px 4px' }}>
                        <button
                          type="button"
                          onClick={pickScreenColor}
                          title="EyeDropper — click anywhere on the page/screen to sample the exact background color"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: '2px 4px',
                            background: '#FFE500',
                            border: '1px solid #000',
                            borderRadius: 2,
                            cursor: 'pointer',
                            fontSize: '0.58rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                          }}
                        >
                          <Pipette size={10} /> PICK
                        </button>
                        <input
                          type="color"
                          value={scanEdgeColor || '#141414'}
                          onChange={(e) => setScanEdgeColor(e.target.value)}
                          title="Choose edge fill color"
                          style={{
                            width: 18,
                            height: 18,
                            padding: 0,
                            border: '1px solid #000',
                            borderRadius: 2,
                            cursor: 'pointer',
                            background: 'none',
                          }}
                        />
                        {scanImage && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = sampleEdgeColor(scanImage);
                              if (c) setScanEdgeColor(c);
                            }}
                            title="Auto sample border color from image"
                            style={{
                              padding: '2px 3px',
                              background: '#fff',
                              border: '1px solid #ccc',
                              borderRadius: 2,
                              cursor: 'pointer',
                              fontSize: '0.55rem',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                            }}
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stage Canvas */}
            <div
              className="tool-canvas-viewport"
              style={isFullscreen ? {
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#0a0a09',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 24px 96px',
                width: '100vw',
                height: '100vh',
                border: 'none',
                boxShadow: 'none',
                overflow: 'hidden',
              } : {
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
              {isFullscreen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 20,
                    right: 20,
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'rgba(0,0,0,0.85)',
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.72rem', color: '#FFE500', letterSpacing: '0.06em' }}>
                      THEATER FULLSCREEN · TEXT HIGHLIGHTER
                    </span>
                    {scanActive ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.64rem', color: '#fff', background: '#222', padding: '2px 6px', borderRadius: 3 }}>
                        PICK {Math.min(scanBeatUi.pickIndex + 1, Math.max(scanPicks.length, 1))}/{Math.max(scanPicks.length, 1)} · {scanBeatUi.phase.toUpperCase()}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.64rem', color: '#fff', background: '#222', padding: '2px 6px', borderRadius: 3 }}>
                        ANIMATION: {Math.round(highlightProgress * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      style={{
                        padding: '3px 8px',
                        border: '1px solid #555',
                        borderRadius: 3,
                        background: '#181818',
                        color: '#FFE500',
                        fontFamily: 'monospace',
                        fontSize: '0.64rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {ASPECT_RATIOS.map((a) => (
                        <option key={a.id} value={a.id}>{a.id}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        border: '1.5px solid #000',
                        borderRadius: 4,
                        background: '#FFE500',
                        color: '#000',
                        fontFamily: 'monospace',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0 #000',
                      }}
                    >
                      <Minimize2 size={12} /> EXIT (ESC)
                    </button>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={selectedAspect.width}
                height={selectedAspect.height}
                style={isFullscreen ? {
                  maxWidth: 'calc(100vw - 48px)',
                  maxHeight: 'calc(100vh - 160px)',
                  width: 'auto',
                  height: 'auto',
                  aspectRatio: `${selectedAspect.width} / ${selectedAspect.height}`,
                  display: 'block',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                  border: '2px solid rgba(255,255,255,0.1)',
                } : {
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 360px)',
                  width: 'auto',
                  height: 'auto',
                  aspectRatio: `${selectedAspect.width} / ${selectedAspect.height}`,
                  display: 'block',
                }}
              />
            </div>

            {/* Transport & Animation Speed Bar */}
            <div
              className="tool-transport-bar"
              style={isFullscreen ? {
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100000,
                width: 'auto',
                maxWidth: 'calc(100vw - 32px)',
                marginTop: 0,
                padding: '8px 16px',
                border: '2px solid #000',
                background: '#f4f4f5',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                boxShadow: '4px 4px 0 #000',
                borderRadius: 6,
              } : {
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
              {/* Play / Replay Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={handleReplay}
                  className="brutalist-button"
                  style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                  title="Replay highlight stroke from beginning"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`brutalist-button ${isPlaying ? 'brutalist-button-primary' : ''}`}
                  style={{ padding: '6px 16px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'PAUSE' : 'PLAY LOOP'}
                </button>
              </div>

              {/* Tactile Duration Controller / Dragger */}
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
                    onClick={() => setHighlightDuration((d) => Math.max(0.5, Math.round((d - 0.25) * 10) / 10))}
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
                    title="Decrease duration (-0.25s)"
                  >
                    -
                  </button>

                  {/* Tactile Fill Scrubber Track */}
                  <div
                    ref={durationTrackRef}
                    onMouseDown={handleDurationTrackMouseDown}
                    onTouchStart={handleDurationTrackTouchStart}
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
                    title="Click or drag to scrub duration"
                  >
                    {/* Active Yellow Fill */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.max(0, Math.min(100, ((highlightDuration - 0.5) / 3.5) * 100))}%`,
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
                    onClick={() => setHighlightDuration((d) => Math.min(4.0, Math.round((d + 0.25) * 10) / 10))}
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
                    title="Increase duration (+0.25s)"
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
                      minWidth: 38,
                      textAlign: 'center',
                    }}
                  >
                    {highlightDuration.toFixed(1)}s
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
                  {[1.0, 1.5, 2.0, 3.0, 4.0].map((d, idx) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setHighlightDuration(d)}
                      style={{
                        padding: '4px 6px',
                        border: 'none',
                        borderRight: idx !== 4 ? '1px solid #000' : 'none',
                        background: highlightDuration === d ? '#000' : '#fff',
                        color: highlightDuration === d ? '#FFE500' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      title={`${d}s sweep duration`}
                    >
                      {d}s{d === 2.0 ? '★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setHighlightDirection(highlightDirection === 'ltr' ? 'rtl' : 'ltr')}
                  className="brutalist-button"
                  style={{ padding: '5px 8px', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}
                  title="Toggle highlight sweep direction"
                >
                  {highlightDirection === 'ltr' ? 'LTR ➔' : '⬅ RTL'}
                </button>
              </div>


              {/* Stout Upward-Opening Sound Selector */}
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
                  title="Select Drawing Audio Sound Effect"
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
                      minWidth: 175,
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

            {/* Under-canvas Aspect Ratio Bar */}
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
          {/* Quick Export Button */}
          <div style={{ width: '100%' }}>
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="brutalist-button brutalist-button-primary"
              style={{
                width: '100%',
                padding: '13px 18px',
                fontSize: '0.86rem',
                fontWeight: 900,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '4px 4px 0 #000',
                textTransform: 'uppercase',
              }}
            >
              <Film size={18} />
              Export MP4 Video
            </button>

            {/* NEXT → hand-off row (docs/TOOL_INTEGRATION_PLAN.md §4.3) */}
            {!isExporting && (
              <NextStepRow
                currentHref="/text-highlighter"
                heading="Video exported — keep going"
                onBeforeNavigate={async (href) => {
                  // §4: carry the exported video straight into the resizer
                  if (href === '/resizer' && lastExportBlob) {
                    await putHandoffImage('resizer', lastExportBlob, {
                      sourceTool: 'text-highlighter',
                      name: 'highlighter-export.mp4',
                    });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Customization Sidebar */}
        <div className="tool-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ocrStatus && (
            <div style={{ padding: '6px 10px', border: '2px solid #000', borderRadius: 4, background: '#fef08a', fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 900, color: '#000', letterSpacing: '0.04em' }}>
              {ocrStatus}
            </div>
          )}

          {/* SCAN MODE — a totally different right-panel view for imported newspaper images. No generated paper: the user's photo IS the page. */}
          {scanActive ? (
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
                  <Camera size={14} style={{ color: '#000' }} />
                  Document Scan Mode
                </label>
                <button
                  onClick={exitScanMode}
                  title="Exit scan mode"
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {scanImage && (
                  <div style={{ width: 48, height: 48, borderRadius: 4, border: '2px solid #000', overflow: 'hidden', flexShrink: 0, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {scanThumbnail ? (
                      <img src={scanThumbnail} alt="Imported document" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <canvas
                        ref={(el) => {
                          if (el && scanImage) {
                            el.width = 48;
                            el.height = 48;
                            const ctx = el.getContext('2d');
                            if (ctx) ctx.drawImage(scanImage, 0, 0, 48, 48);
                          }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    color: '#000',
                    background: '#FFE500',
                    padding: '3px 8px',
                    border: '1.5px solid #000',
                    borderRadius: 4,
                  }}
                >
                  {scanLines.length} LINES READ • {scanPicks.length} PICKED
                </span>
              </div>

              {/* AUTO CAMERA & CONTINUOUS MODE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={scanAutoCamera}
                    onChange={(e) => setScanAutoCamera(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#FFE500', cursor: 'pointer' }}
                  />
                  Auto Camera
                  <span style={{ marginLeft: 'auto', fontSize: '0.56rem', color: '#888' }}>
                    {scanAutoCamera ? 'ZOOM CHOREOGRAPHY ON' : 'STATIC FULL PAGE'}
                  </span>
                </label>

                <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setScanContinuousMode(true);
                      mergeAllPicks();
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      border: 'none',
                      borderRight: '1.5px solid #000',
                      background: scanContinuousMode ? '#000' : '#fff',
                      color: scanContinuousMode ? '#FFE500' : '#000',
                      fontFamily: 'monospace',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                    title="Continuous Mode: highlights all lines ABCD in ONE fluid continuous sweep without intermediate holds"
                  >
                    <Zap size={11} /> CONTINUOUS FLOW
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScanContinuousMode(false);
                      splitAllPicks();
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      border: 'none',
                      background: !scanContinuousMode ? '#000' : '#fff',
                      color: !scanContinuousMode ? '#FFE500' : '#000',
                      fontFamily: 'monospace',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                    title="Step-by-step Mode: dives to each picked line individually with a hold"
                  >
                    <ListOrdered size={11} /> STEP BY STEP
                  </button>
                </div>
              </div>

              {scanPicks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ListOrdered size={12} /> HIGHLIGHT ORDER ({scanPicks.length})
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {scanPicks.length > 1 && (
                        <button
                          type="button"
                          onClick={mergeAllPicks}
                          title="Merge ALL picked lines into ONE seamless continuous sweep (ABCD... with NO hold or pause between them)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '3px 8px',
                            border: '1.5px solid #000',
                            borderRadius: 3,
                            background: '#FFE500',
                            color: '#000',
                            fontSize: '0.60rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '1px 1px 0 #000',
                          }}
                        >
                          <Zap size={10} /> MERGE ALL
                        </button>
                      )}
                      {scanPicks.some((p) => p.flow && p.flow.length > 1) && (
                        <button
                          type="button"
                          onClick={splitAllPicks}
                          title="Split merged continuous lines back into step-by-step individual lines with holds"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '3px 8px',
                            border: '1.5px solid #000',
                            borderRadius: 3,
                            background: '#fff',
                            color: '#000',
                            fontSize: '0.60rem',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Unlink size={10} /> SPLIT
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setScanPicks([])}
                        style={{
                          padding: '3px 7px',
                          border: '1.5px solid #000',
                          borderRadius: 3,
                          background: '#fff',
                          color: '#000',
                          fontSize: '0.60rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          textTransform: 'uppercase',
                        }}
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {scanPicks.map((pick, i) => (
                      <React.Fragment key={pick.id}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                            padding: '4px 8px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: pick.flow && pick.flow.length > 1 ? '#FFF066' : '#FFE500',
                            boxShadow: '1px 1px 0 #000',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.60rem',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                background: '#000',
                                color: '#FFE500',
                                padding: '1px 4px',
                                borderRadius: 3,
                                flexShrink: 0,
                              }}
                            >
                              {i + 1}
                            </span>
                            {pick.flow && pick.flow.length > 1 && (
                              <span
                                style={{
                                  fontSize: '0.52rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 900,
                                  background: '#000',
                                  color: '#fff',
                                  padding: '1px 4px',
                                  borderRadius: 3,
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {pick.flow.length}L FLOW ⇉
                              </span>
                            )}
                            <span
                              onClick={() => toggleScanPick(pick)}
                              title="Click to remove from sequence"
                              style={{
                                fontSize: '0.66rem',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#000',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                flex: 1,
                              }}
                            >
                              {pick.text}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {pick.flow && pick.flow.length > 1 && (
                              <button
                                type="button"
                                onClick={() => splitScanPick(i)}
                                title="Split into separate lines"
                                style={{
                                  border: '1px solid #000',
                                  borderRadius: 3,
                                  background: '#fff',
                                  color: '#000',
                                  padding: '2px 5px',
                                  fontSize: '0.54rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                SPLIT
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setScanTrimAt(scanTrimAt === i ? null : i);
                                setScanTrimWord(null);
                              }}
                              title="Trim words / break line"
                              style={{
                                border: scanTrimAt === i ? '1.5px solid #000' : '1px solid #000',
                                borderRadius: 3,
                                background: scanTrimAt === i ? '#000' : '#fff',
                                color: scanTrimAt === i ? '#FFE500' : '#000',
                                padding: '2px 5px',
                                fontSize: '0.54rem',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ✂ TRIM
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleScanPick(pick)}
                              title="Remove line"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#000',
                                cursor: 'pointer',
                                padding: '1px 3px',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                lineHeight: 1,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {i < scanPicks.length - 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '3px 0' }}>
                            <button
                              type="button"
                              onClick={() => mergeScanPicks(i)}
                              title={`Join pick ${i + 1} and ${i + 2} into ONE continuous sweep without holds`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 9px',
                                border: '1.5px solid #000',
                                borderRadius: 999,
                                background: '#FFE500',
                                color: '#000',
                                fontSize: '0.58rem',
                                fontFamily: 'monospace',
                                fontWeight: 900,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '1px 1px 0 #000',
                              }}
                            >
                              <Link2 size={10} /> + JOIN {i + 1} &amp; {i + 2} (CONTINUOUS)
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                    <button
                      type="button"
                      onClick={() => setScanInsertAt(scanInsertAt === scanPicks.length ? null : scanPicks.length)}
                      title="Insert next tapped line at the END"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        padding: 0,
                        border: scanInsertAt === scanPicks.length ? '2px solid #000' : '1.5px dashed #999',
                        borderRadius: 999,
                        background: scanInsertAt === scanPicks.length ? '#FFE500' : '#fff',
                        color: '#000',
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
              )}

              {/* PART-of-line trimmer — tap the first word, then the last;
                  the pick narrows to that word span ("break the line"). */}
              {scanTrimAt != null && scanPicks[scanTrimAt] && (() => {
                const pick = scanPicks[scanTrimAt];
                const words = pick.words && pick.words.length > 0 ? pick.words : pick.text.split(/\s+/).map((t) => ({ text: t, box: pick.box }));
                return (
                  <div style={{ border: '2px solid #000', borderRadius: 4, padding: 8, background: '#fffbe6', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>
                        BREAK LINE / TRIM — TAP WORDS TO HIGHLIGHT: &ldquo;{pick.text.slice(0, 40)}&rdquo;
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
                          onClick={() => handleTrimWord(wi)}
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
                        onClick={resetScanTrim}
                        disabled={!scanPicks[scanTrimAt]?.origBox}
                        style={{
                          padding: '3px 8px',
                          border: '1.5px solid #000',
                          borderRadius: 3,
                          background: '#fff',
                          color: '#000',
                          fontSize: '0.58rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          cursor: scanPicks[scanTrimAt]?.origBox ? 'pointer' : 'not-allowed',
                          opacity: scanPicks[scanTrimAt]?.origBox ? 1 : 0.4,
                          textTransform: 'uppercase',
                        }}
                      >
                        RESTORE FULL LINE ↺
                      </button>
                      <span style={{ fontSize: '0.56rem', fontFamily: 'monospace', color: '#666', textTransform: 'uppercase' }}>
                        {scanTrimWord == null ? 'TAP A WORD TO HIGHLIGHT IT, OR TWO WORDS FOR A PHRASE' : 'TAP SECOND WORD TO SET RANGE'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {scanInsertAt != null ? (
                  <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textTransform: 'uppercase', background: '#FFE500', border: '1.5px solid #000', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span>INSERT AT POSITION {scanInsertAt + 1} — TAP A LINE</span>
                    <button
                      onClick={() => setScanInsertAt(null)}
                      style={{ padding: '1px 6px', border: '1.5px solid #000', borderRadius: 3, background: '#fff', color: '#000', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer' }}
                    >
                      CANCEL
                    </button>
                  </span>
                ) : scanRangeFrom != null ? (
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
                    TAP LINES IN THE ORDER YOU WANT THEM HIGHLIGHTED — OR RANGE TO GRAB A CONTINUOUS BLOCK
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                  {scanLines.map((line, lineIdx) => {
                    // Flow (RANGE) picks mark every member line as picked.
                    const pickIdx = scanPicks.findIndex((p) => p.id === line.id || (p.flow || []).some((f) => f.id === line.id));
                    const rangeActive = scanRangeFrom != null && scanRangeFrom !== lineIdx;
                    return (
                      <div key={line.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                        <button
                          onClick={() => toggleScanPick(line)}
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
                          title={scanRangeFrom == null ? 'Start a continuous multi-line selection here' : 'End the range here — every line in between joins the sequence'}
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
                          onClick={() => openTrimForLine(line)}
                          title="BREAK / TRIM — highlight only a piece or middle sentence of this line"
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
            </div>
          ) : (
            <div
              className="brutalist-card"
              style={{
                padding: 14,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderRadius: 4,
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
                  Highlighted Phrase
                </label>
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
                  {anchorPhrase.trim().length} CHARS • {anchorPhrase.trim().split(/\s+/).filter(Boolean).length} WORDS
                </span>
              </div>

              <div className="tool-anchor-row" style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={anchorInputRef}
                  type="text"
                  value={anchorPhrase}
                  onChange={(e) => setAnchorPhrase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAutoGenerate();
                    }
                  }}
                  placeholder="Enter words, sentence, or passage to highlight..."
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
                >
                  <Zap size={15} className={isGenerating ? 'animate-bounce' : ''} />
                  {isGenerating ? 'GENERATING...' : 'GENERATE'}
                </button>
              </div>
              {/* ONE-TAP SEQUENCE TOKENS — zero syntax to learn: tap a chip and
                the token drops in at the cursor. Structure without typing. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                <button onClick={() => insertAnchorToken(' | ')} style={tokenChipStyle}>
                  + PHRASE <span style={{ background: '#FFE500', border: '1px solid #000', padding: '0 4px', borderRadius: 2 }}>{'|'}</span>
                </button>
                <button onClick={() => insertAnchorToken(' > ')} style={{ ...tokenChipStyle, background: '#000', color: '#fff' }}>
                  ↓ SCROLL DOWN <span style={{ background: '#FFE500', color: '#000', border: '1px solid #000', padding: '0 4px', borderRadius: 2 }}>{'>'}</span>
                </button>
                <button onClick={() => insertAnchorToken(' < ')} style={{ ...tokenChipStyle, background: '#000', color: '#fff' }}>
                  ↑ SCROLL UP <span style={{ background: '#FFE500', color: '#000', border: '1px solid #000', padding: '0 4px', borderRadius: 2 }}>{'<'}</span>
                </button>
              </div>

              {/* LIVE STRUCTURE READOUT — the parsed screens as chips, so users
                SEE what the video will do instead of parsing symbols. */}
              {sequenceGroups.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {sequenceGroups.map((g, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.6rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: '#000',
                        background: i === 0 ? '#FFE500' : '#fff',
                        border: '1.5px solid #000',
                        borderRadius: 999,
                        padding: '2px 9px',
                      }}
                    >
                      {i === 0 ? '' : g.scrollIn === 'down' ? '↓ ' : '↑ '}SCREEN {i + 1} · {g.phrases.length} PHRASE{g.phrases.length === 1 ? '' : 'S'}
                    </span>
                  ))}
                </div>
              )}

              {/* MULTI-INSTANCE RESOLVER — when a phrase matches several spots in the copy,
                the studio asks WHICH one to light up instead of hitting them all. */}
              {(() => {
                const sectorText =
                  highlightSector === 'center-headline'
                    ? customHeadline
                    : highlightSector === 'body-paragraph'
                      ? customBodyText
                      : '';
                if (!sectorText) return null;
                const allPhrases = sequenceGroups.flatMap((g) => g.phrases);
                const ambiguous = allPhrases
                  .map((phrase) => ({ phrase, occ: findPhraseOccurrences(sectorText, phrase) }))
                  .filter((r) => r.occ.length > 1);
                if (ambiguous.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                      MULTIPLE MATCHES — PICK WHICH ONE
                    </span>
                    {ambiguous.map(({ phrase, occ }) => {
                      const current = phraseInstances[normalizePhraseKey(phrase)] ?? 1;
                      return (
                        <div key={phrase} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textTransform: 'uppercase' }}>
                            &ldquo;{phrase}&rdquo; × {occ.length}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {occ.map((o) => (
                              <button
                                key={o.index}
                                onClick={() =>
                                  setPhraseInstances((prev) => ({ ...prev, [normalizePhraseKey(phrase)]: o.index }))
                                }
                                style={{
                                  padding: '2px 7px',
                                  border: current === o.index ? '2px solid #000' : '1px solid #999',
                                  borderRadius: 3,
                                  background: current === o.index ? '#FFE500' : '#fff',
                                  color: '#000',
                                  fontSize: '0.58rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                #{o.index} {o.context}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* OCR IMPORT — snap a photo of a real article, extract the text,
                then tap the lines in the order you want them highlighted. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={() => ocrFileRef.current?.click()}
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
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  <ScanText size={13} /> Import newspaper image
                </button>
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888', fontWeight: 700 }}>
                  Photo of an article → every word gets read → tap the lines to highlight, in order.
                </span>
                <input
                  ref={ocrFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleOcrImport(f);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                  Tool Presets:
                </span>
                {/* SHUFFLE VIBE — instant personality roulette. Keeps your text;
                  rolls a new look + motion recipe from the full deck. */}
                <button
                  onClick={handleShuffleVibe}
                  style={{
                    padding: '5px 12px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    background: '#000',
                    color: '#FFE500',
                    fontSize: '0.64rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                    letterSpacing: '0.04em',
                  }}
                >
                  🎲 SHUFFLE VIBE · {PRESET_TOPICS.length} DECK
                </button>
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
          )}

          {/* Tab Navigation Bar (All 4 tabs sit strictly on ONE single line) */}
          <div className="tool-tab-bar" style={{ display: 'flex', border: '3px solid #000', background: '#000', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {[
              { id: 'style' as const, label: 'Style & Ink', icon: Sliders },
              { id: 'typography' as const, label: 'Fonts (52)', icon: Type },
              { id: 'scene' as const, label: 'Optics & Scene', icon: Disc },
              { id: 'text' as const, label: 'Story Copy', icon: FileText },
            ]
              .filter((tab) => !scanActive || tab.id === 'style' || tab.id === 'scene')
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = sidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id as any)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '10px 3px',
                      border: 'none',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#000000' : '#ffffff',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      fontSize: '0.62rem',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      letterSpacing: '0.01em',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={12} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                  </button>
                );
              })}
          </div>

          {/* TAB 1: Style & Ink Controls */}
          {sidebarTab === 'style' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderRadius: 4,
              }}
            >
              {/* Highlighting Style */}
              <div>
                <label
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#000',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Highlighting Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { id: 'marker', label: 'Marker Pen' },
                    { id: 'circle', label: 'Hand Circle' },
                    { id: 'underline', label: 'Underline' },
                    { id: 'double-underline', label: 'Double Line' },
                    { id: 'box', label: 'Block Box' },
                    { id: 'tape', label: 'Washi Tape' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setHighlightStyle(s.id as any);
                        handleReplay();
                      }}
                      style={{
                        padding: '8px 4px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: highlightStyle === s.id ? '#000' : '#fff',
                        color: highlightStyle === s.id ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ink Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#000',
                    display: 'block',
                  }}
                >
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
                        borderRadius: 4,
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
                      borderRadius: 4,
                      cursor: 'pointer',
                      padding: 1,
                      background: '#fff',
                    }}
                    title="Custom hex color"
                  />
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

              {/* Sector Placement */}
              <div>
                <label
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <MoveVertical size={13} />
                  Document Sector Position
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { id: 'top-masthead' as const, label: 'Top (Header)' },
                    { id: 'center-headline' as const, label: 'Center (Main)' },
                    { id: 'body-paragraph' as const, label: 'Bottom (Body)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setHighlightSector(s.id)}
                      style={{
                        padding: '6px 4px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: highlightSector === s.id ? '#000' : '#fff',
                        color: highlightSector === s.id ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Typography & 52 Google Fonts */}
          {sidebarTab === 'typography' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderRadius: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Type size={14} />
                  Font Selection (52 Google Fonts)
                </label>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    color: '#000',
                    background: '#FFE500',
                    padding: '2px 6px',
                    border: '1px solid #000',
                    borderRadius: 4,
                  }}
                >
                  {GOOGLE_FONTS_LIST.find((f) => f.fontFamily === fontFamily)?.name || 'Custom'}
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, background: '#fff', overflow: 'hidden' }}>
                {['All', 'Serif', 'Typewriter', 'Tabloid', 'Sans', 'Display'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFontCategory(cat)}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      border: 'none',
                      borderRight: cat !== 'Display' ? '1px solid #000' : 'none',
                      background: selectedFontCategory === cat ? '#000' : '#fff',
                      color: selectedFontCategory === cat ? '#fff' : '#000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.62rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Main Font Select Dropdown */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '2px solid #000',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#000',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {filteredFonts.map((f) => (
                  <option key={f.id} value={f.fontFamily}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>

              {/* Quick Popular Font Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {[
                  { label: 'Playfair Serif', font: '"Playfair Display", Georgia, serif' },
                  { label: 'Special Elite', font: '"Special Elite", monospace' },
                  { label: 'Bebas Tabloid', font: '"Bebas Neue", Impact, sans-serif' },
                  { label: 'Cinzel Roman', font: '"Cinzel", "Times New Roman", serif' },
                  { label: 'Perm Marker', font: '"Permanent Marker", cursive' },
                  { label: 'Inter Sans', font: '"Inter", sans-serif' },
                ].map((qf) => (
                  <button
                    key={qf.label}
                    onClick={() => setFontFamily(qf.font)}
                    style={{
                      padding: '6px 4px',
                      border: '1.5px solid #000',
                      borderRadius: 4,
                      background: fontFamily === qf.font ? '#000' : '#fff',
                      color: fontFamily === qf.font ? '#fff' : '#000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.62rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {qf.label}
                  </button>
                ))}
              </div>

              {/* Headline Scale */}
              <div style={{ paddingTop: 10, borderTop: '2px solid #eee' }}>
                <TactileScrubber
                  label="Headline Scale"
                  value={headlineScale}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  stepDelta={0.1}
                  onChange={setHeadlineScale}
                  formatValue={(v) => `${v.toFixed(1)}x`}
                  presets={[
                    { label: '0.8x', value: 0.8 },
                    { label: '1.0x ★', value: 1.0 },
                    { label: '1.3x', value: 1.3 },
                    { label: '1.6x', value: 1.6 },
                  ]}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Optics & Canvas Scene */}
          {sidebarTab === 'scene' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderRadius: 4,
              }}
            >
              {/* Paper Archetype */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
                  Paper Archetype
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {Object.values(PAPER_THEMES).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setPaperTheme(theme.id as any)}
                      style={{
                        padding: '9px 4px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: paperTheme === theme.id ? '#000' : theme.bg,
                        color: paperTheme === theme.id ? '#fff' : theme.ink,
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.66rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: paperTheme === theme.id ? '2px 2px 0 #FFE500' : 'none',
                      }}
                    >
                      {theme.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Visibility Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#666', display: 'block' }}>
                  Show Elements
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[
                    { key: 'showTopColumns', label: 'Top Columns', val: showTopColumns, set: setShowTopColumns },
                    { key: 'showMasthead', label: 'Masthead', val: showMasthead, set: setShowMasthead },
                    { key: 'showSubhead', label: 'Subhead', val: showSubhead, set: setShowSubhead },
                    { key: 'showByline', label: 'Byline', val: showByline, set: setShowByline },
                    { key: 'showBottomColumns', label: 'Bottom Cols', val: showBottomColumns, set: setShowBottomColumns },
                    { key: 'showDividerRules', label: 'Dividers', val: showDividerRules, set: setShowDividerRules },
                  ].map((t) => (
                    <label
                      key={t.key}
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#000',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 0',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={t.val}
                        onChange={(e) => t.set(e.target.checked)}
                        style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Headline Layout Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#666' }}>
                    Headline Layout
                  </label>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, color: '#000' }}>
                    {headlineWrapMode === 'single-line' ? 'SINGLE LINE (FIT)' : 'MULTI-LINE (AUTO)'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    onClick={() => setHeadlineWrapMode('auto-wrap')}
                    style={{
                      padding: '7px 4px',
                      border: '2px solid #000',
                      borderRadius: 4,
                      background: headlineWrapMode === 'auto-wrap' ? '#000' : '#fff',
                      color: headlineWrapMode === 'auto-wrap' ? '#fff' : '#000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                      boxShadow: headlineWrapMode === 'auto-wrap' ? '2px 2px 0 #FFE500' : 'none',
                    }}
                  >
                    Auto Multi-Line
                  </button>
                  <button
                    onClick={() => setHeadlineWrapMode('single-line')}
                    style={{
                      padding: '7px 4px',
                      border: '2px solid #000',
                      borderRadius: 4,
                      background: headlineWrapMode === 'single-line' ? '#000' : '#fff',
                      color: headlineWrapMode === 'single-line' ? '#fff' : '#000',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                      boxShadow: headlineWrapMode === 'single-line' ? '2px 2px 0 #FFE500' : 'none',
                    }}
                  >
                    Single Line (Fit)
                  </button>
                </div>
              </div>

              {/* Circular Optical Lens Blur */}
              <div
                style={{
                  padding: 10,
                  border: '2px solid #000',
                  borderRadius: 4,
                  background: depthOfField ? '#fef08a' : '#f4f4f5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: '#000',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={depthOfField}
                      onChange={(e) => setDepthOfField(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                    />
                    <Disc size={13} />
                    Circular Optical Lens Blur
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                    {depthOfField ? `${Math.round(dofIntensity * 100)}%` : 'OFF'}
                  </span>
                </div>

                {depthOfField && (
                  <TactileScrubber
                    label="Blur Intensity"
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
              </div>

              {/* Paper Entrance — motion-blur slam before the sweep */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                    Paper Entrance
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: entranceDirection === 'none' ? '#b91c1c' : '#16a34a' }}>
                    {entranceDirection === 'none' ? 'OFF' : 'SLAM → HOLD → SWEEP'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['none', 'top', 'bottom', 'left', 'right'] as const).map((d) => (
                    <button
                      key={d}
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
                      title={d === 'none' ? 'No entrance — the sweep starts immediately' : `Paper slams in from the ${d} with motion blur`}
                    >
                      {d === 'none' ? 'OFF' : d === 'top' ? '↓ TOP' : d === 'bottom' ? '↑ BOTTOM' : d === 'left' ? '→ LEFT' : '← RIGHT'}
                    </button>
                  ))}
                </div>
                {/* Screen sequence — same paper throughout; ">" scrolls the view
                    down, "<" scrolls up, "|" keeps phrases on the same screen. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={scrollTransitions}
                      onChange={(e) => setScrollTransitions(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                    />
                    Screen Sequence
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: sequenceActive ? '#16a34a' : '#000' }}>
                    {sequenceActive ? `${sequenceGroups.length} SCREENS · SAME PAPER` : '1 SCREEN'}
                  </span>
                </div>
                <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#666', lineHeight: 1.5 }}>
                  {'Type > in the phrase box to scroll DOWN to the next phrase, < to scroll UP. Use | to highlight more phrases on the SAME screen. The paper, theme and sector never change.'}
                </div>

                {/* STICKY HIGHLIGHTS — marker memory. When ON, earlier screens keep
                    their ink while the sequence scrolls to the next phrase. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '2px solid #eee' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={stickyHighlights}
                      onChange={(e) => setStickyHighlights(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#FFE500', cursor: 'pointer' }}
                    />
                    Keep Earlier Highlights
                    <span style={{ marginLeft: 'auto', fontSize: '0.58rem', color: '#888' }}>
                      {stickyHighlights ? 'MARKER MEMORY ON' : 'EACH SCREEN CLEAN'}
                    </span>
                  </label>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#666', lineHeight: 1.5 }}>
                    When ON, highlights from earlier screens STAY on the page while the marker scrolls to the next phrase — nothing is ever erased, just like a real marker on paper.
                  </div>
                </div>
                {scrollTransitions && sequenceActive && (
                  <>
                    <TactileScrubber
                      label="Scroll Duration"
                      value={scrollDuration}
                      min={0.25}
                      max={1.2}
                      step={0.05}
                      stepDelta={0.05}
                      onChange={setScrollDuration}
                      formatValue={(v) => `${Math.round(v * 1000)}ms`}
                      presets={[
                        { label: '300ms', value: 0.3 },
                        { label: '420ms ★', value: 0.42 },
                        { label: '800ms', value: 0.8 },
                      ]}
                    />
                    <TactileScrubber
                      label="Scroll Blur"
                      value={scrollBlur}
                      min={0}
                      max={1}
                      step={0.05}
                      stepDelta={0.05}
                      onChange={setScrollBlur}
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
                <TactileScrubber
                  label="Travel Distance"
                  value={paperTravel}
                  min={0.6}
                  max={2.2}
                  step={0.1}
                  stepDelta={0.1}
                  onChange={setPaperTravel}
                  formatValue={(v) => `${v.toFixed(1)}×`}
                  presets={[
                    { label: '0.8×', value: 0.8 },
                    { label: '1.3× ★', value: 1.3 },
                    { label: '1.8×', value: 1.8 },
                  ]}
                />
                <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#666', lineHeight: 1.5 }}>
                  {'Travel Distance scales EVERY paper move — the slam-in, each > / < scroll, and the whip-out.'}
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
                        { label: '0.7s ★', value: 0.7 },
                        { label: '1.2s', value: 1.2 },
                      ]}
                    />
                    <TactileScrubber
                      label="Hold Before Sweep"
                      value={entranceHold}
                      min={0}
                      max={4}
                      step={0.1}
                      stepDelta={0.1}
                      onChange={setEntranceHold}
                      formatValue={(v) => `${v.toFixed(1)}s`}
                      presets={[
                        { label: '0s', value: 0 },
                        { label: '1s', value: 1 },
                        { label: '2s', value: 2 },
                        { label: '4s', value: 4 },
                      ]}
                    />
                    <TactileScrubber
                      label="Motion Blur"
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
              </div>

              {/* Paper Exit — the post-sweep whip-out. Mirrors the entrance:
                  anticipation windup, acceleration out of frame, hot motion
                  blur, then blank paper color. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Paper Exit
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: exitDirection === 'none' ? '#b91c1c' : '#16a34a' }}>
                    {exitDirection === 'none' ? 'OFF' : 'SWEEP → WHIP OUT'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['none', 'top', 'bottom', 'left', 'right'] as const).map((d) => (
                    <button
                      key={`exit-${d}`}
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
                      title={d === 'none' ? 'No exit — the finished paper just holds' : `Paper whips out through the ${d} with motion blur`}
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
                      label="Exit Motion Blur"
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

              {/* Camera Zoom & Grain Effects */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={zoomEnabled}
                      onChange={(e) => setZoomEnabled(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                    />
                    Camera Zoom Effect
                  </label>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                    {zoomEnabled ? `${Math.round(zoomIntensity * 100)}%` : 'OFF'}
                  </span>
                </div>

                {zoomEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['in', 'out'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setZoomDirection(d)}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            border: '1.5px solid #000',
                            borderRadius: 3,
                            background: zoomDirection === d ? '#000' : '#fff',
                            color: zoomDirection === d ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.64rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}
                        >
                          {d === 'in' ? 'Zoom In' : 'Zoom Out'}
                        </button>
                      ))}
                    </div>
                    <TactileScrubber
                      label="Zoom Intensity"
                      value={zoomIntensity}
                      min={0.03}
                      max={0.25}
                      step={0.01}
                      stepDelta={0.02}
                      onChange={setZoomIntensity}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={filmGrain}
                      onChange={(e) => setFilmGrain(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                    />
                    Authentic Paper Grain & Halftone
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={cameraShake}
                      onChange={(e) => setCameraShake(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#000', cursor: 'pointer' }}
                    />
                    Micro Handheld Camera Jitter
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Story & Article Copy Editor */}
          {sidebarTab === 'text' && (
            <div
              className="brutalist-card"
              style={{
                padding: 16,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderRadius: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                  Document Copy Editor
                </span>
                <button
                  onClick={handleShuffleStory}
                  className="brutalist-button"
                  style={{ padding: '4px 8px', fontSize: '0.66rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Generate a brand new random story"
                >
                  <Shuffle size={12} />
                  Shuffle Story
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                  Masthead Publication Title
                </label>
                <input
                  type="text"
                  value={customMasthead}
                  onChange={(e) => setCustomMasthead(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                  Main Headline / Sentence (with anchor)
                </label>
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                  Subheading
                </label>
                <input
                  type="text"
                  value={customSubhead}
                  onChange={(e) => setCustomSubhead(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                  Byline / Dateline
                </label>
                <input
                  type="text"
                  value={customByline}
                  onChange={(e) => setCustomByline(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                  Surrounding Article Paragraphs (Separate with double enter)
                </label>
                <textarea
                  rows={5}
                  value={customBodyText}
                  onChange={(e) => setCustomBodyText(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 4, fontSize: '0.74rem', lineHeight: 1.4, resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleApplyCustomText}
                className="brutalist-button brutalist-button-primary"
                style={{ padding: '10px', fontSize: '0.76rem', borderRadius: 4, width: '100%', marginTop: 4 }}
              >
                Apply Text to Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
