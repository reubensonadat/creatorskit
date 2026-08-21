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
  Sparkles,
} from 'lucide-react';
import {
  RenderOptions,
  PAPER_THEMES,
  renderNewspaperMatchCut,
  synthesizeCutSound,
  playCutSound,
  NewspaperCut,
} from '../match-cut/match-cut-engine';
import { PRESET_TOPICS, generateCutsForPhrase } from '../match-cut/presets';
import { SimpleGifEncoder } from '../match-cut/gif-encoder';

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

export default function TextHighlighterPage() {
  // Core Phrase & Cut State
  const [anchorPhrase, setAnchorPhrase] = useState(PRESET_TOPICS[0].anchor);
  const [cuts, setCuts] = useState<NewspaperCut[]>(PRESET_TOPICS[0].cuts);
  const [currentCutIndex, setCurrentCutIndex] = useState(0);

  // Animation & Sweep Transport
  const [isPlaying, setIsPlaying] = useState(true);
  const [highlightDuration, setHighlightDuration] = useState(2.0); // 2.0s smooth animation
  const [highlightDirection, setHighlightDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [highlightProgress, setHighlightProgress] = useState(1.0); // 0 to 1
  const [soundEffect, setSoundEffect] = useState<'shutter' | 'typewriter' | 'motor' | 'paper' | 'mute'>('paper');
  const [soundVolume, setSoundVolume] = useState(0.4);

  // Visual & Style Options
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4'>('9:16');
  const [highlightColor, setHighlightColor] = useState('#FFE500');
  const [highlightStyle, setHighlightStyle] = useState<'marker' | 'underline' | 'double-underline' | 'box' | 'circle' | 'tape'>('marker');
  const [markerOpacity, setMarkerOpacity] = useState(0.85);
  const [paperTheme, setPaperTheme] = useState<'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir'>('vintage');
  const [depthOfField, setDepthOfField] = useState(false);
  const [dofIntensity, setDofIntensity] = useState(0.5);
  const [filmGrain, setFilmGrain] = useState(true);
  const [cameraShake, setCameraShake] = useState(true);
  const [showCrosshairGuide, setShowCrosshairGuide] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Canvas Refs & Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);

  const selectedAspect = ASPECT_RATIOS.find((a) => a.id === aspectRatio) || ASPECT_RATIOS[0];

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
    animationMode: 'animated-highlight',
    highlightProgress,
    highlightDirection,
  };

  // Redraw Canvas Frame
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cut = cuts[currentCutIndex] || cuts[0];
    if (!cut) return;

    renderNewspaperMatchCut(ctx, canvas.width, canvas.height, cut, renderOptions, currentCutIndex);
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
          const p = elapsed / drawDurationMs;
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
    setCuts(p.cuts);
    setCurrentCutIndex(0);
    animStartTimeRef.current = performance.now();
  };

  // Generate Custom Phrase Cuts
  const handleAutoGenerate = () => {
    if (!anchorPhrase.trim()) return;
    const newCuts = generateCutsForPhrase(anchorPhrase.trim(), 6);
    setCuts(newCuts);
    setCurrentCutIndex(0);
    animStartTimeRef.current = performance.now();
  };

  // Restart Animation from 0%
  const handleReplay = () => {
    animStartTimeRef.current = performance.now();
    setHighlightProgress(0);
    setIsPlaying(true);
    if (soundEffect !== 'mute') playCutSound(soundEffect, soundVolume);
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

  // Export 1080p Video MP4/WebM of the Animated Highlighter
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

      const mimeCandidates = [
        { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
        { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
        { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
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
          } catch {}
        }
      }

      const stream = (exportCanvas as any).captureStream
        ? (exportCanvas as any).captureStream(30)
        : (exportCanvas as any).mozCaptureStream(30);

      const videoTrack = stream.getVideoTracks()[0];

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

      let recorder: MediaRecorder;
      const chunks: Blob[] = [];

      try {
        recorder = new MediaRecorder(
          stream,
          selectedMime
            ? { mimeType: selectedMime, videoBitsPerSecond: 12000000 }
            : undefined
        );
      } catch {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
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

      recorder.start(100);

      const fps = 30;
      const drawFrames = Math.max(15, Math.round(highlightDuration * fps));
      const holdFrames = Math.round(0.8 * fps);
      const totalFrames = drawFrames + holdFrames;

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

      setExportProgress('Finalizing video file...');
      recorder.stop();
      const videoBlob = await recordPromise;

      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `highlighter-animation-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.${targetExt}`;
      a.click();
      setExportProgress(null);
    } catch (err) {
      console.error('Video Export failed:', err);
      setExportProgress('Export failed.');
      setTimeout(() => setExportProgress(null), 3000);
    } finally {
      if (exportCanvas && exportCanvas.parentNode) {
        exportCanvas.parentNode.removeChild(exportCanvas);
      }
      if (audioContext) {
        try {
          audioContext.close();
        } catch {}
      }
      setIsExporting(false);
      setIsPlaying(true);
    }
  };

  // Export Animated GIF of the Highlighter
  const handleExportGif = async () => {
    setIsExporting(true);
    setExportProgress('Encoding Animated GIF...');
    try {
      const gifWidth = Math.min(selectedAspect.width, 540);
      const gifHeight = Math.round(gifWidth * (selectedAspect.height / selectedAspect.width));
      const totalFrames = 24;
      const frameDelayMs = Math.round((highlightDuration * 1000) / totalFrames);

      const gifEncoder = new SimpleGifEncoder(gifWidth, gifHeight, frameDelayMs);
      const offscreen = document.createElement('canvas');
      offscreen.width = gifWidth;
      offscreen.height = gifHeight;
      const ctx = offscreen.getContext('2d')!;

      for (let i = 0; i < totalFrames; i++) {
        const p = i / (totalFrames - 1);
        setExportProgress(`Encoding GIF frame ${i + 1} of ${totalFrames}...`);
        const frameRenderOptions: RenderOptions = {
          ...renderOptions,
          highlightProgress: p,
        };
        renderNewspaperMatchCut(ctx, gifWidth, gifHeight, cuts[currentCutIndex] || cuts[0], frameRenderOptions, 0);
        gifEncoder.addFrame(ctx);
      }

      const gifBlob = gifEncoder.finish();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(gifBlob);
      link.download = `highlighter-sweep-${anchorPhrase.toLowerCase().replace(/\s+/g, '-')}.gif`;
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

  return (
    <div style={{ background: '#f4f4f5', minHeight: '100vh', color: '#000', padding: '24px 20px 80px' }}>
      {/* Top Breadcrumb & Title Bar */}
      <div style={{ maxWidth: 1280, margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/"
              className="brutalist-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: '0.72rem',
                borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              <ChevronLeft size={13} />
              Home
            </Link>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#000',
                letterSpacing: '0.12em',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                background: '#FFE500',
                padding: '3px 8px',
                border: '2px solid #000',
                borderRadius: 4,
              }}
            >
              ANIMATED HIGHLIGHTER
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/match-cut"
              className="brutalist-button"
              style={{
                padding: '4px 10px',
                fontSize: '0.68rem',
                borderRadius: 4,
                textDecoration: 'none',
                background: '#ffffff',
              }}
            >
              Switch to Optical Match Cut Studio ⚡
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          <h1
            style={{
              fontSize: '1.75rem',
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
              fontSize: '0.82rem',
              color: '#555',
              maxWidth: 680,
              lineHeight: 1.5,
              fontWeight: 500,
              margin: 0,
            }}
          >
            Cinematic slow-motion marker, circle, underline, and box highlighter animations. Export smooth 1080p video clips with authentic felt-tip drawing sounds.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(340px, 420px)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Canvas Viewport & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            className="brutalist-card"
            style={{
              padding: 14,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              borderRadius: 4,
            }}
          >
            {/* Viewport Meta Bar */}
            <div
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setShowCrosshairGuide(!showCrosshairGuide)}
                  style={{
                    padding: '4px 8px',
                    border: '1.5px solid #000',
                    borderRadius: 4,
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
                    borderRadius: 4,
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
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: 'calc(100vh - 340px)',
                minHeight: 380,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#141413',
                border: '3px solid #000',
                borderRadius: 4,
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
              style={{
                width: '100%',
                marginTop: 12,
                padding: '8px 12px',
                border: '2px solid #000',
                borderRadius: 4,
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
                  style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: 4 }}
                  title="Replay highlight stroke from beginning"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`brutalist-button ${isPlaying ? 'brutalist-button-primary' : ''}`}
                  style={{ padding: '6px 16px', fontSize: '0.74rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'PAUSE' : 'PLAY LOOP'}
                </button>
              </div>

              {/* Sweep Duration */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                  DURATION: <span style={{ color: '#d97706' }}>{highlightDuration}S</span>
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={highlightDuration}
                  onChange={(e) => setHighlightDuration(parseFloat(e.target.value))}
                  style={{ width: 80, accentColor: '#000', cursor: 'pointer' }}
                  title="Adjust sweep animation duration in seconds"
                />
                <div style={{ display: 'flex', border: '2px solid #000', borderRadius: 4, background: '#fff', overflow: 'hidden' }}>
                  {[1.0, 1.5, 2.0, 3.0].map((d) => (
                    <button
                      key={d}
                      onClick={() => setHighlightDuration(d)}
                      style={{
                        padding: '4px 6px',
                        border: 'none',
                        borderRight: d !== 3.0 ? '1px solid #000' : 'none',
                        background: highlightDuration === d ? '#000' : '#fff',
                        color: highlightDuration === d ? '#fff' : '#000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                    >
                      {d}s{d === 2.0 ? '★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setHighlightDirection(highlightDirection === 'ltr' ? 'rtl' : 'ltr')}
                  className="brutalist-button"
                  style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: 4 }}
                  title="Toggle highlight sweep direction"
                >
                  {highlightDirection === 'ltr' ? '➡️ LTR' : '⬅️ RTL'}
                </button>
              </div>

              {/* Sound Effect Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    const next = soundEffect === 'mute' ? 'paper' : 'mute';
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
                  title={soundEffect === 'mute' ? 'Unmute drawing audio' : 'Mute drawing audio'}
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
                    borderRadius: 4,
                    background: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <option value="paper">Marker Friction (Paper)</option>
                  <option value="shutter">Shutter Click</option>
                  <option value="typewriter">Typewriter Clack</option>
                  <option value="mute">Muted</option>
                </select>
              </div>
            </div>

            {/* Under-canvas Aspect Ratio Bar */}
            <div
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

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="brutalist-button"
                  onClick={handleDownloadSingleFrame}
                  style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: 4 }}
                  title="Download current single still image"
                >
                  <Download size={13} style={{ marginRight: 4 }} /> Still PNG
                </button>
                <button
                  className="brutalist-button"
                  onClick={handleCopySingleFrame}
                  style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: 4 }}
                  title="Copy current frame to clipboard"
                >
                  {copiedNotification ? (
                    <Check size={13} style={{ marginRight: 4, color: '#22c55e' }} />
                  ) : (
                    <Copy size={13} style={{ marginRight: 4 }} />
                  )}
                  {copiedNotification ? 'Copied!' : 'Copy'}
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
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="brutalist-button brutalist-button-primary"
              style={{
                padding: '10px 14px',
                fontSize: '0.76rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Film size={15} />
              Export MP4 Video
            </button>

            <button
              onClick={handleExportGif}
              disabled={isExporting}
              className="brutalist-button"
              style={{
                padding: '10px 14px',
                fontSize: '0.76rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <ImageIcon size={15} />
              Looping GIF
            </button>
          </div>
        </div>

        {/* Right Column: Customization Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                maxLength={23}
                value={anchorPhrase}
                onChange={(e) => setAnchorPhrase(e.target.value)}
                placeholder="Enter word to highlight (max 23 chars)"
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
                className="brutalist-button"
                style={{
                  fontSize: '0.74rem',
                  padding: '8px 14px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Apply
              </button>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>
                Tool Presets:
              </span>
              {PRESET_TOPICS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLoadPreset(p.id)}
                  style={{
                    padding: '3px 8px',
                    border: '1.5px solid #000',
                    borderRadius: 4,
                    background: anchorPhrase.toLowerCase() === p.anchor.toLowerCase() ? '#000' : '#fff',
                    color: anchorPhrase.toLowerCase() === p.anchor.toLowerCase() ? '#fff' : '#000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Style Controls Card */}
          <div
            className="brutalist-card"
            style={{
              padding: 14,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 4,
            }}
          >
            {/* Highlighter Style Mode */}
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
                Highlighting Style
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
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ink Color */}
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
                Highlighter Color
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setHighlightColor(c.hex)}
                    style={{
                      width: 28,
                      height: 28,
                      background: c.hex,
                      border: highlightColor === c.hex ? '3px solid #000' : '1.5px solid #000',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Paper Theme */}
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
                Paper Archetype
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {Object.values(PAPER_THEMES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setPaperTheme(theme.id as any)}
                    style={{
                      padding: '6px 4px',
                      border: '2px solid #000',
                      borderRadius: 4,
                      background: paperTheme === theme.id ? '#000' : theme.bg,
                      color: paperTheme === theme.id ? '#fff' : theme.ink,
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                    }}
                  >
                    {theme.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
