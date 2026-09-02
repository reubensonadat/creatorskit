'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

  // Typography Scale & Layout
  const [headlineScale, setHeadlineScale] = useState(1.0);
  const [headlineWrapMode, setHeadlineWrapMode] = useState<'single-line' | 'auto-wrap'>('auto-wrap');

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Canvas Refs & Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);

  const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspectRatio) || ASPECT_RATIOS[0];

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
  };

  // Redraw Canvas Frame
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderHighlighterStory(ctx, canvas.width, canvas.height, cut, renderOptions, currentCutIndex);
  }, [cuts, currentCutIndex, renderOptions]);

  // Live Smooth Animation Loop
  useEffect(() => {
    let active = true;

    const loop = (timestamp: number) => {
      if (!active) return;

      if (isPlaying) {
        if (!animStartTimeRef.current) animStartTimeRef.current = timestamp;
        const drawDurationMs = highlightDuration * 1000;
        const totalCycleMs = drawDurationMs + 1000; // 1s hold at end
        const elapsed = (timestamp - animStartTimeRef.current) % totalCycleMs;

        if (elapsed <= drawDurationMs) {
          const p = easeHighlightSweep(elapsed / drawDurationMs);
          setHighlightProgress(p);
        } else {
          setHighlightProgress(1.0);
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
  }, [isPlaying, highlightDuration, redraw]);

  // Handle Preset Selection
  const handleLoadPreset = (presetId: string) => {
    const p = PRESET_TOPICS.find((t) => t.id === presetId);
    if (!p) return;
    setAnchorPhrase(p.anchor);
    setHighlightColor(p.highlightColor);
    setHighlightStyle(p.highlightStyle);
    setPaperTheme(p.paperTheme);

    const freshCuts = p.cuts.length > 0 ? JSON.parse(JSON.stringify(p.cuts)) : generateCutsForPhrase(p.anchor, 6);
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

    const presetPhrases = p.anchor.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean).length || 1;
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setIsPlaying(true);
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, presetPhrases);
  };

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
    setIsPlaying(true);
    const phrasesCount = phrase.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean).length || 1;
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, phrasesCount);
    setTimeout(() => setIsGenerating(false), 250);
  };

  // Restart Animation from 0%
  const handleReplay = () => {
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setIsPlaying(true);
    const phrasesCount = anchorPhrase.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean).length || 1;
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume, highlightDuration, phrasesCount);
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
  const handleDownloadSingleFrame = () => {
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
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setIsPlaying(false);
    setExportProgress('Preparing HD encoder...');

    try {
      // 60fps constant frame rate — buttery sweep, matching the live preview.
      const fps = 60;
      const sweepFrames = Math.max(20, Math.round(highlightDuration * fps));
      const totalFrames = Math.max(40, Math.round((highlightDuration + 1.0) * fps));
      const currentCut = cuts[currentCutIndex] || cuts[0];
      const phrasesCount = anchorPhrase.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean).length || 1;

      // Make sure webfonts are ready before any frame renders.
      try {
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
              synthesizeCutSound(ctx, dest, soundEffect, soundVolume, 0, highlightDuration, phrasesCount);
            },
          });
        } catch (audioErr) {
          console.warn('Offline audio render bypassed:', audioErr);
          audioBuffer = null;
        }
      }

      const result = await exportCanvasVideoToMp4({
        width: selectedAspect.width,
        height: selectedAspect.height,
        fps,
        totalFrames,
        bitrate: 20_000_000,
        audioBuffer,
        onProgress: (p) => setExportProgress(`Encoding HD video: ${Math.round(p * 100)}%`),
        renderFrame: (frameIndex, ctx) => {
          const p = frameIndex < sweepFrames ? easeHighlightSweep(frameIndex / sweepFrames) : 1.0;
          if (frameIndex % 10 === 0) setHighlightProgress(p);

          const frameRenderOptions: HighlighterRenderOptions = {
            ...renderOptions,
            highlightProgress: p,
          };

          renderHighlighterStory(ctx, ctx.canvas.width, ctx.canvas.height, currentCut, frameRenderOptions, currentCutIndex);
        },
      });

      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(
        result.blob,
        `highlighter-animation-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.${ext}`
      );
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
                    background: isPlaying ? '#22c55e' : '#eab308',
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
            <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666', marginTop: -2 }}>
              💡 <b>Sequential Highlight:</b> Separate multiple phrases with <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 2 }}>|</code> to sweep each phrase one after another with an animated pause!
            </span>

            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                Tool Presets:
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
