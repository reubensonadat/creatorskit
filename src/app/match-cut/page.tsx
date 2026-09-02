'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import JSZip from 'jszip';
import {
  renderNewspaperMatchCut,
  playCutSound,
  synthesizeCutSound,
  easeHighlightSweep,
  PAPER_THEMES,
  type NewspaperCut,
  type RenderOptions,
} from './match-cut-engine';
import {
  exportCanvasVideoToMp4,
  renderOfflineAudio,
  downloadBlob,
} from '@/lib/canvas-video-exporter';
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

  // Sidebar Tab Navigation
  const [activeTab, setActiveTab] = useState<'headlines' | 'style' | 'macro' | 'export'>('headlines');

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Canvas Refs & Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastCutTimeRef = useRef<number>(0);
  const animStartTimeRef = useRef<number>(0);

  const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspectRatio) || ASPECT_RATIOS[0];

  // Bundle current render options.
  // Match-cut anchors are clamped to ≤23 chars per phrase — the optical lock
  // only works when the camera centers on a short, identical phrase in every
  // paper; long phrases smear the lock point across the whole headline.
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

  // Redraw current cut
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderNewspaperMatchCut(
      ctx,
      canvas.width,
      canvas.height,
      cut,
      renderOptions,
      currentCutIndex
    );
  }, [cuts, currentCutIndex, renderOptions]);

  // Live Animation Loop supporting both Match Cut and Animated Highlighter modes
  useEffect(() => {
    let active = true;

    const loop = (timestamp: number) => {
      if (!active) return;

      if (isPlaying) {
        if (animationMode === 'match-cut') {
          if (cuts.length > 0) {
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
        } else {
          // Cinematic Animated Highlighter Sweep
          if (!animStartTimeRef.current) animStartTimeRef.current = timestamp;
          const totalCycleMs = (highlightDuration + 0.8) * 1000;
          const elapsed = (timestamp - animStartTimeRef.current) % totalCycleMs;
          const drawDurationMs = highlightDuration * 1000;

          if (elapsed <= drawDurationMs) {
            const p = easeHighlightSweep(elapsed / drawDurationMs);
            setHighlightProgress(p);
          } else {
            setHighlightProgress(1.0);
          }
        }
      }

      redraw();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, cutsPerSecond, cuts.length, soundEffect, soundVolume, animationMode, highlightDuration, redraw]);

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
  const handleDownloadSingleFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `match-cut-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}-frame-${currentCutIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export PNG Sequence ZIP
  const handleExportZip = async () => {
    setIsExporting(true);
    setExportProgress('Rendering PNG sequence...');
    try {
      const zip = new JSZip();
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = selectedAspect.width;
      exportCanvas.height = selectedAspect.height;
      const ctx = exportCanvas.getContext('2d')!;

      for (let i = 0; i < cuts.length; i++) {
        setExportProgress(`Rendering frame ${i + 1} of ${cuts.length}...`);
        renderNewspaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, cuts[i], renderOptions, i);
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

  // Export High-Definition Video via deterministic WebCodecs encoding.
  // Every frame is rendered exactly once with an explicit timestamp — no
  // real-time MediaRecorder capture, so no dropped frames, no stutter, and a
  // constant frame rate at High-profile H.264 quality (with offline AAC audio).
  const handleExportVideo = async () => {
    if (cuts.length === 0) return;
    setIsExporting(true);
    setIsPlaying(false);
    setExportProgress('Preparing HD encoder...');

    try {
      const isAnimated = animationMode === 'animated-highlight';
      // 60fps for the cinematic sweep — buttery, matches the live preview.
      // Rapid whip-cut sequences stay at 30fps; the staccato is the point.
      const fps = isAnimated ? 60 : 30;
      const framesPerCut = Math.max(3, Math.round(fps / cutsPerSecond));

      const totalFrames = isAnimated
        ? Math.max(30, Math.round(highlightDuration * fps)) + Math.round(0.8 * fps)
        : cuts.length * 3 * framesPerCut;

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
              if (isAnimated) {
                synthesizeCutSound(ctx, dest, soundEffect, soundVolume, 0, highlightDuration);
              } else {
                // Short percussive strokes synced to each cut. Full-length
                // 1.8s highlighter drones stacked on rapid cuts is what made
                // the old export audio distort into mush.
                const strokeDur = Math.min(0.28, Math.max(0.08, (framesPerCut / fps) * 0.9));
                for (let loop = 0; loop < 3; loop++) {
                  for (let c = 0; c < cuts.length; c++) {
                    const t = ((loop * cuts.length + c) * framesPerCut) / fps;
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
        width: selectedAspect.width,
        height: selectedAspect.height,
        fps,
        totalFrames,
        bitrate: 20_000_000,
        audioBuffer,
        // Force a pristine intra frame at every whip-cut boundary so each
        // hard cut snaps in crisp instead of smearing from the previous page.
        isKeyFrame: (i) => !isAnimated && i % framesPerCut === 0,
        onProgress: (p) => setExportProgress(`Encoding HD video: ${Math.round(p * 100)}%`),
        renderFrame: (frameIndex, ctx) => {
          if (isAnimated) {
            const p = frameIndex < drawFrames ? easeHighlightSweep(frameIndex / drawFrames) : 1.0;
            const frameRenderOptions: RenderOptions = {
              ...renderOptions,
              highlightProgress: p,
            };
            renderNewspaperMatchCut(ctx, ctx.canvas.width, ctx.canvas.height, animatedCut, frameRenderOptions, 0);
          } else {
            const c = Math.floor(frameIndex / framesPerCut) % cuts.length;
            renderNewspaperMatchCut(ctx, ctx.canvas.width, ctx.canvas.height, cuts[c], renderOptions, c);
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
                    background: isPlaying ? '#22c55e' : '#eab308',
                    border: '1.5px solid #000',
                    borderRadius: '50%',
                  }}
                />
                <span style={{ color: '#000', fontWeight: 900 }}>
                  CUT {currentCutIndex + 1} OF {cuts.length}
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
        </div>

        {/* Right Column: Control Sidebar */}
        <div className="tool-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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

        </div>
      </div>
    </div>
  );
}
