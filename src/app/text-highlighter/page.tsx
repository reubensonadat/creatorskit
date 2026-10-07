'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextStepRow from '@/components/NextStepRow';
import { gateAction } from '@/components/AdGate';
import { putHandoffImage, takeHandoffText } from '@/lib/tool-handoff';
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
} from 'lucide-react';
import {
  HighlighterRenderOptions,
  PAPER_THEMES,
  renderHighlighterStory,
  renderHighlighterStoryWithEntrance,
  synthesizeCutSound,
  easeHighlightSweep,
  playCutSound,
  NewspaperCut,
} from './highlighter-engine';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inputs when cut changes
  useEffect(() => {
    if (currentCut) {
      setCustomHeadline(currentCut.headline || '');
      setCustomMasthead(currentCut.masthead || 'CREATOR KIT');
      setCustomSubhead(currentCut.subhead || '');
      setCustomByline(currentCut.byline || '');
      setCustomBodyText((currentCut.bodyParagraphs || BODY_CORPUS).join('\n\n'));
    }
  }, [currentCutIndex, cuts]);

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
  };

  // Redraw Canvas Frame (optionally with per-frame sequence overrides —
  // multi-scene phrase/sector/entrance state from the sequence clock)
  const redraw = useCallback((overrides?: Partial<HighlighterRenderOptions>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderHighlighterStoryWithEntrance(ctx, canvas.width, canvas.height, cut, { ...renderOptions, ...overrides }, currentCutIndex);
  }, [cuts, currentCutIndex, renderOptions]);

  // Live Smooth Animation Loop — butter-smooth by construction:
  //  • the canvas is driven DIRECTLY by the sequence clock every frame;
  //  • React state (scrubber readouts) syncs at ~10 Hz, so the 60 fps render
  //    path never triggers a full page re-render mid-motion;
  //  • the rAF effect depends only on play-state + duration + scroll blur,
  //    so the subscription never tears down once per frame.
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  useEffect(() => {
    let active = true;
    let lastStateSync = 0;

    const loop = (timestamp: number) => {
      if (!active) return;

      let frameOverrides: Partial<HighlighterRenderOptions> | undefined;
      if (isPlaying) {
        if (!animStartTimeRef.current) animStartTimeRef.current = timestamp;
        const elapsed = (timestamp - animStartTimeRef.current) % sequenceTotalMs;
        const seq = sampleSequence(elapsed);
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
        frameOverrides = {
          anchorPhrase: seq.phrase,
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

      redrawRef.current(frameOverrides);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // SHUFFLE VIBE — instant personality roulette from the 30-vibe deck.
  // Never touches the user's text: roll until it feels right, hit GENERATE.
  const [lastVibeId, setLastVibeId] = useState<string | null>(null);
  const handleShuffleVibe = () => {
    const pool = PRESET_TOPICS.filter((t) => t.id !== lastVibeId);
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p) return;
    setLastVibeId(p.id);
    applyPresetVibe(p, { keepText: true });
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

  // Single Frame PNG Download
  // Downloads gated behind a sponsor pause (owner correction 2026-10-07:
  // generate stays free, the export moment carries the ad).
  const handleDownloadSingleFrame = () =>
    gateAction('/text-highlighter', 'Download frame', 'download', 0, handleDownloadSingleFrameUngated);
  const handleDownloadSingleFrameUngated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `highlighter-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.png`;
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
      const totalFrames = Math.max(40, Math.round((sequenceTotalMs / 1000) * fps));
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
          // Same deterministic sequence clock as the live loop.
          const seq = sampleSequence((frameIndex / fps) * 1000);
          if (frameIndex % 10 === 0) {
            setEntranceProgress(seq.entP);
            setHighlightProgress(seq.hp);
          }

          const isSceneScroll = seq.screenIndex > 0 && seq.entranceDir !== 'none';
          const frameRenderOptions: HighlighterRenderOptions = {
            ...renderOptions,
            anchorPhrase: seq.phrase,
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
      downloadBlob(
        result.blob,
        `highlighter-animation-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.${ext}`
      );
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
            Cinematic slow-motion marker, circle, underline, and box highlighter animations. Choose from 52 Google Fonts and customize circular lens blur.
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
                <span style={{ color: '#000', fontWeight: 900 }}>
                  ANIMATION: {Math.round(highlightProgress * 100)}%
                </span>
                <span style={{ color: '#aaa' }}>|</span>
                <span style={{ textTransform: 'uppercase', color: '#333', fontWeight: 800 }}>
                  {cuts[currentCutIndex]?.masthead || 'NEWSPAPER'}
                </span>
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
            </div>

            {/* Transport & Animation Speed Bar */}
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
          {/* Target Phrase Box */}
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

          {/* Tab Navigation Bar (All 4 tabs sit strictly on ONE single line) */}
          <div className="tool-tab-bar" style={{ display: 'flex', border: '3px solid #000', background: '#000', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {[
              { id: 'style' as const, label: 'Style & Ink', icon: Sliders },
              { id: 'typography' as const, label: 'Fonts (52)', icon: Type },
              { id: 'scene' as const, label: 'Optics & Scene', icon: Disc },
              { id: 'text' as const, label: 'Story Copy', icon: FileText },
            ].map((tab) => {
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
