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
} from 'lucide-react';
import JSZip from 'jszip';
import {
  renderNewspaperMatchCut,
  playCutSound,
  synthesizeCutSound,
  PAPER_THEMES,
  type NewspaperCut,
  type RenderOptions,
} from './match-cut-engine';
import { PRESET_TOPICS, generateCutsForPhrase, MASTHEADS, LOCATIONS, BYLINES } from './presets';
import { SimpleGifEncoder } from './gif-encoder';
import { GOOGLE_FONTS_LIST } from './google-fonts';

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

  // Visual & Stylistic Options
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4'>('9:16');
  const [highlightColor, setHighlightColor] = useState('#FFE500');
  const [highlightStyle, setHighlightStyle] = useState<'marker' | 'underline' | 'double-underline' | 'box' | 'circle' | 'tape'>('marker');
  const [markerOpacity, setMarkerOpacity] = useState(0.85);
  const [paperTheme, setPaperTheme] = useState<'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir'>('vintage');
  const [fontFamily, setFontFamily] = useState<string>('"Playfair Display", Georgia, serif');
  const [fontCycleList, setFontCycleList] = useState<string[]>([
    '"Playfair Display", Georgia, serif',
    '"Special Elite", monospace',
    '"Bebas Neue", Impact, sans-serif',
    '"Cinzel", "Times New Roman", serif',
    '"Inter", sans-serif',
  ]);
  const [highlightSector, setHighlightSector] = useState<'top-masthead' | 'center-headline' | 'body-paragraph'>('center-headline');
  const [depthOfField, setDepthOfField] = useState(true);
  const [dofIntensity, setDofIntensity] = useState(0.75);
  const [filmGrain, setFilmGrain] = useState(true);
  const [cameraShake, setCameraShake] = useState(true);
  const [showCrosshairGuide, setShowCrosshairGuide] = useState(false);

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

  // Bundle current render options
  const renderOptions: RenderOptions = {
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
    animationMode,
    highlightProgress: animationMode === 'animated-highlight' ? highlightProgress : 1.0,
    highlightDirection,
    highlightSector,
    fontFamily,
    fontCycleList: animationMode === 'match-cut' ? fontCycleList : undefined,
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
                playCutSound(soundEffect, soundVolume);
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
            const p = elapsed / drawDurationMs;
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
    const newCuts = generateCutsForPhrase(phrase, 8);
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

  // Export Looping Animated GIF
  const handleExportGif = async () => {
    setIsExporting(true);
    setExportProgress('Encoding Animated GIF...');
    try {
      const gifWidth = Math.min(selectedAspect.width, 600);
      const gifHeight = Math.round(gifWidth * (selectedAspect.height / selectedAspect.width));
      const frameDelayMs = Math.round(1000 / cutsPerSecond);

      const gifEncoder = new SimpleGifEncoder(gifWidth, gifHeight, frameDelayMs);
      const offscreen = document.createElement('canvas');
      offscreen.width = gifWidth;
      offscreen.height = gifHeight;
      const ctx = offscreen.getContext('2d')!;

      for (let i = 0; i < cuts.length; i++) {
        setExportProgress(`Encoding GIF frame ${i + 1} of ${cuts.length}...`);
        renderNewspaperMatchCut(ctx, gifWidth, gifHeight, cuts[i], renderOptions, i);
        gifEncoder.addFrame(ctx);
      }

      const gifBlob = gifEncoder.finish();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(gifBlob);
      link.download = `match-cut-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.gif`;
      link.click();
      setExportProgress(null);
    } catch (err) {
      console.error('GIF Export failed:', err);
      setExportProgress('GIF Export failed.');
      setTimeout(() => setExportProgress(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export High-Definition Video via MediaRecorder with multi-codec detection and audio synthesis
  const handleExportVideo = async () => {
    setIsExporting(true);
    setIsPlaying(false);
    setExportProgress('Initializing video encoder...');

    let exportCanvas: HTMLCanvasElement | null = null;
    let audioContext: AudioContext | null = null;

    try {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = selectedAspect.width;
      exportCanvas.height = selectedAspect.height;
      exportCanvas.style.position = 'fixed';
      exportCanvas.style.left = '-9999px';
      exportCanvas.style.top = '-9999px';
      exportCanvas.style.width = '200px';
      exportCanvas.style.height = '200px';
      exportCanvas.style.opacity = '0';
      exportCanvas.style.pointerEvents = 'none';
      exportCanvas.style.zIndex = '-9999';
      document.body.appendChild(exportCanvas);

      const ctx = exportCanvas.getContext('2d', { alpha: false })!;

      // Initial frame paint
      renderNewspaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, cuts[0], renderOptions, 0);

      // Probe browser for supported video MIME types
      const mimeCandidates = [
        { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
        { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
        { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8', ext: 'webm' },
        { mime: 'video/webm;codecs=h264', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' },
      ];

      let selectedMime = '';
      let targetExt = 'webm';

      if (typeof MediaRecorder !== 'undefined') {
        for (const candidate of mimeCandidates) {
          try {
            if (MediaRecorder.isTypeSupported(candidate.mime)) {
              selectedMime = candidate.mime;
              targetExt = candidate.ext;
              break;
            }
          } catch {
            // Check next candidate
          }
        }
      }

      const stream = (exportCanvas as any).captureStream
        ? (exportCanvas as any).captureStream(30)
        : (exportCanvas as any).mozCaptureStream(30);

      const videoTrack = stream.getVideoTracks()[0];

      // Audio track setup if sound is enabled
      let audioDest: MediaStreamAudioDestinationNode | null = null;
      if (soundEffect !== 'mute' && typeof window !== 'undefined') {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            audioDest = audioContext.createMediaStreamDestination();
            const audioTrack = audioDest.stream.getAudioTracks()[0];
            if (audioTrack) {
              stream.addTrack(audioTrack);
            }
          }
        } catch (audioErr) {
          console.warn('Audio track setup bypassed:', audioErr);
        }
      }

      // Initialize MediaRecorder with fallback
      let recorder: MediaRecorder;
      const chunks: Blob[] = [];

      try {
        recorder = new MediaRecorder(
          stream,
          selectedMime
            ? {
                mimeType: selectedMime,
                videoBitsPerSecond: 10_000_000,
              }
            : undefined
        );
      } catch {
        // Fallback to default recorder
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const recordPromise = new Promise<Blob>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          if (chunks.length > 0) {
            const finalMime = recorder.mimeType || selectedMime || 'video/webm';
            resolve(new Blob(chunks, { type: finalMime }));
          } else {
            reject(new Error('Recording timed out without producing frames.'));
          }
        }, 20000);

        recorder.onstop = () => {
          clearTimeout(timeoutId);
          const finalMime = recorder.mimeType || selectedMime || 'video/webm';
          resolve(new Blob(chunks, { type: finalMime }));
        };

        recorder.onerror = (err) => {
          clearTimeout(timeoutId);
          reject(err);
        };
      });

      // Start recording with 100ms timeslice
      recorder.start(100);

      if (animationMode === 'animated-highlight') {
        // Render smooth 30fps animated marker sweep
        const fps = 30;
        const drawFrames = Math.max(15, Math.round(highlightDuration * fps));
        const holdFrames = Math.round(0.8 * fps);
        const totalFrames = drawFrames + holdFrames;

        // Trigger cut / marker sound at start
        if (audioContext && audioDest && soundEffect !== 'mute') {
          synthesizeCutSound(audioContext, audioDest, soundEffect, soundVolume);
        }

        for (let f = 0; f < totalFrames; f++) {
          const p = f < drawFrames ? f / drawFrames : 1.0;
          const currentCut = cuts[currentCutIndex] || cuts[0];
          const frameRenderOptions: RenderOptions = {
            ...renderOptions,
            highlightProgress: p,
          };

          renderNewspaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, currentCut, frameRenderOptions, 0);

          if (typeof (videoTrack as any)?.requestFrame === 'function') {
            try {
              (videoTrack as any).requestFrame();
            } catch {}
          }
          setExportProgress(`Recording animated highlight: ${Math.round(((f + 1) / totalFrames) * 100)}%`);
          await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
        }
      } else {
        // Render rapid whip-cut sequence
        const totalLoops = 3;
        const fps = 30;
        const framesPerCut = Math.max(3, Math.round(fps / cutsPerSecond));
        const totalFrames = cuts.length * totalLoops * framesPerCut;

        let frameCounter = 0;
        for (let loop = 0; loop < totalLoops; loop++) {
          for (let c = 0; c < cuts.length; c++) {
            renderNewspaperMatchCut(ctx, exportCanvas.width, exportCanvas.height, cuts[c], renderOptions, c);

            // Trigger audio snap for this cut
            if (audioContext && audioDest && soundEffect !== 'mute') {
              synthesizeCutSound(audioContext, audioDest, soundEffect, soundVolume);
            }

            for (let f = 0; f < framesPerCut; f++) {
              frameCounter++;
              if (typeof (videoTrack as any)?.requestFrame === 'function') {
                try {
                  (videoTrack as any).requestFrame();
                } catch {}
              }
              setExportProgress(`Recording match cut video: ${Math.round((frameCounter / totalFrames) * 100)}%`);
              await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
            }
          }
        }
      }

      setExportProgress('Finalizing video file...');
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      const videoBlob = await recordPromise;

      const cleanAnchor =
        anchorPhrase
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'match-cut';
      const actualExtension = (recorder.mimeType || selectedMime).includes('mp4') ? 'mp4' : targetExt;
      const downloadFileName = `match-cut-${cleanAnchor}.${actualExtension}`;

      const videoUrl = URL.createObjectURL(videoBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = videoUrl;
      downloadLink.download = downloadFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      setTimeout(() => URL.revokeObjectURL(videoUrl), 10000);
      setExportProgress(null);
      setExportProgress(null);
      setIsPlaying(true);
    } catch (err) {
      console.error('Video Export failed:', err);
      setExportProgress('Video recording failed. Try Animated GIF or PNG sequence.');
      setTimeout(() => setExportProgress(null), 4000);
    } finally {
      if (exportCanvas && exportCanvas.parentNode) {
        exportCanvas.parentNode.removeChild(exportCanvas);
      }
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close();
        } catch {}
      }
      setIsExporting(false);
    }
  };

  return (
    <div className="tool-page-padding" style={{ position: 'relative', minHeight: '100%', padding: '20px 16px 80px', maxWidth: 1380, margin: '0 auto', boxSizing: 'border-box', overflow: 'hidden', width: '100%' }}>
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

              {/* Speed Controls: 1 to 30 cuts/second */}
              <div className="tool-transport-speed" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                  SPEED: <span style={{ color: '#d97706' }}>{cutsPerSecond} CUTS/SEC</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={cutsPerSecond}
                  onChange={(e) => setCutsPerSecond(parseFloat(e.target.value))}
                  style={{ width: 90, accentColor: '#000', cursor: 'pointer' }}
                  title="Adjust cut speed from 1 to 30 cuts per second"
                />
                <div className="tool-transport-speed-presets" style={{ display: 'flex', border: '2px solid #000', background: '#fff' }}>
                  {[5, 10, 15, 20, 30].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setCutsPerSecond(spd)}
                      style={{
                        padding: '4px 6px',
                        border: 'none',
                        borderRight: spd !== 30 ? '1px solid #000' : 'none',
                        background: cutsPerSecond === spd ? '#000' : '#fff',
                        color: cutsPerSecond === spd ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                      title={`${spd} cuts per second`}
                    >
                      {spd}{spd === 10 ? '★' : ''}/s
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effect Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    const next = soundEffect === 'mute' ? 'shutter' : 'mute';
                    setSoundEffect(next);
                    if (next !== 'mute') playCutSound(next, soundVolume);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: soundEffect === 'mute' ? '#888' : '#000',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                  title={soundEffect === 'mute' ? 'Unmute cut sound' : 'Mute cut sound'}
                >
                  {soundEffect === 'mute' ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <select
                  value={soundEffect}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSoundEffect(val);
                    if (val !== 'mute') playCutSound(val, soundVolume);
                  }}
                  style={{
                    padding: '4px 6px',
                    border: '2px solid #000',
                    background: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <option value="shutter">Shutter Snap</option>
                  <option value="typewriter">Typewriter Clack</option>
                  <option value="motor">Motor Drive</option>
                  <option value="paper">Paper Rustle</option>
                  <option value="mute">Muted</option>
                </select>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
              onClick={handleExportGif}
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
              <ImageIcon size={17} />
              Looping Animated GIF
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

          {/* Tab Navigation */}
          <div className="tool-tab-bar" style={{ display: 'flex', border: '3px solid #000', background: '#000', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)' }}>
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
                    gap: 6,
                    padding: '10px 8px',
                    border: 'none',
                    background: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#000000' : '#ffffff',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900 }}>
                  <span>INK OPACITY:</span>
                  <span>{Math.round(markerOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={markerOpacity}
                  onChange={(e) => setMarkerOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#000' }}
                />
              </div>

              {/* 5-Font Rapid Cut Jitter Cycle Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                    5-Font Rapid Jitter Cycle (Google Fonts)
                  </label>
                  <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#d97706' }}>
                    CYCLES EVERY CUT
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fontCycleList.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, width: 22, color: '#666' }}>
                        #{idx + 1}
                      </span>
                      <select
                        value={f}
                        onChange={(e) => {
                          const updated = [...fontCycleList];
                          updated[idx] = e.target.value;
                          setFontCycleList(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          border: '1.5px solid #000',
                          borderRadius: 4,
                          background: '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {GOOGLE_FONTS_LIST.map((gf) => (
                          <option key={gf.id} value={gf.fontFamily}>
                            {gf.name} ({gf.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                      <span>DEFOCUS INTENSITY:</span>
                      <span style={{ color: '#000', fontWeight: 900 }}>{Math.round(dofIntensity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={dofIntensity}
                      onChange={(e) => setDofIntensity(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#000' }}
                    />
                  </div>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
