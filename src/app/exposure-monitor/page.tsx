'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Video,
  Image as ImageIcon,
  Sun,
  Sliders,
  Eye,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Zap,
  SplitSquareVertical,
  FlipHorizontal,
  Flame,
} from 'lucide-react';

// False Color Standard Scales (ARRI / RED IRE Standard)
export interface FalseColorBand {
  minIre: number;
  maxIre: number;
  color: string;
  label: string;
  description: string;
}

export const FALSE_COLOR_BANDS: FalseColorBand[] = [
  { minIre: 95, maxIre: 100, color: '#ef4444', label: 'RED (95-100+)', description: 'Blown out / Overexposed Highlight Clipping' },
  { minIre: 85, maxIre: 95, color: '#eab308', label: 'YELLOW (85-95)', description: 'Near-clipping Warning (Specular highlights)' },
  { minIre: 70, maxIre: 85, color: '#9ca3af', label: 'GRAY (70-85)', description: 'High Midtones / Light Surfaces' },
  { minIre: 58, maxIre: 70, color: '#d97706', label: 'BRONZE (58-70)', description: 'Tan / Darker Skin Key Highlights' },
  { minIre: 52, maxIre: 58, color: '#ec4899', label: 'PINK (52-58)', description: 'Ideal Caucasian / Light Skin Key Target' },
  { minIre: 42, maxIre: 48, color: '#16a34a', label: 'GREEN (42-48)', description: 'Shadow Side of Skin / Standard 18% Gray' },
  { minIre: 20, maxIre: 42, color: '#0284c7', label: 'CYAN (20-42)', description: 'Low Midtones / Background Shadows' },
  { minIre: 4, maxIre: 20, color: '#1d4ed8', label: 'BLUE (4-20)', description: 'Deep Shadows / Noise Floor' },
  { minIre: 0, maxIre: 4, color: '#7e22ce', label: 'PURPLE (0-4)', description: 'Crushed Black / Underexposed Void' },
];

export const TEST_SCENES = [
  {
    id: 'studio-portrait',
    name: 'Studio Portrait (Balanced Softbox)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
    type: 'balanced',
  },
  {
    id: 'cinematic-moody',
    name: 'Cinematic Moody (High Contrast)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    type: 'moody',
  },
  {
    id: 'window-backlight',
    name: 'Window Backlight (Overexposed)',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop',
    type: 'overexposed',
  },
];

export default function ExposureMonitorPage() {
  // Input Source State
  const [sourceType, setSourceType] = useState<'camera' | 'test-scene' | 'upload'>('test-scene');
  const [selectedTestScene, setSelectedTestScene] = useState(TEST_SCENES[0].id);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Monitor Display Mode
  const [viewMode, setViewMode] = useState<'false-color' | 'split' | 'zebra' | 'normal'>('false-color');
  const [splitPosition, setSplitPosition] = useState(50); // percentage 0-100
  const [zebraThreshold, setZebraThreshold] = useState(90); // IRE percentage
  const [activeScopeTab, setActiveScopeTab] = useState<'waveform' | 'parade' | 'vectorscope'>('waveform');

  // Interactive Hover Loupe
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; ire: number; r: number; g: number; b: number } | null>(null);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState({
    avgIre: 48,
    clipPercent: 1.2,
    crushPercent: 3.4,
    centerSkinIre: 56,
    colorCast: 'Neutral Balanced',
    status: 'OPTIMAL',
  });

  // Snapshot Reference
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState(false);

  // Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Zebra animation phase
  const zebraPhaseRef = useRef(0);

  // Fetch Camera Devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setCameraDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }
      }).catch(() => {});
    }
  }, [selectedCameraId]);

  // Start Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        setSourceType('camera');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setCameraError(e.message || 'Camera permission denied or camera not found');
      setIsCameraActive(false);
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  }, []);

  // Handle Switch to Camera Source
  const handleSelectCameraSource = () => {
    setSourceType('camera');
    startCamera(selectedCameraId);
  };

  // Handle Switch to Test Scene
  const handleSelectTestScene = (sceneId: string) => {
    stopCamera();
    setSelectedTestScene(sceneId);
    setSourceType('test-scene');
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    const url = URL.createObjectURL(file);
    if (imageRef.current) {
      imageRef.current.src = url;
      setSourceType('upload');
    }
  };

  // Map Rec.709 RGB to False Color Pixel
  const getFalseColorRGB = (r: number, g: number, b: number): [number, number, number] => {
    // Rec.709 standard luma calculation
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ire = (luma / 255) * 100;

    if (ire >= 95) return [239, 68, 68]; // Red (Overexposed)
    if (ire >= 85) return [234, 179, 8]; // Yellow (Near clip)
    if (ire >= 70) return [156, 163, 175]; // Gray (High midtone)
    if (ire >= 58) return [217, 119, 6]; // Bronze (Tan skin highlight)
    if (ire >= 52) return [236, 72, 153]; // Pink (Ideal Light skin target)
    if (ire >= 42) return [22, 163, 74]; // Green (Shadow side skin)
    if (ire >= 20) return [2, 132, 199]; // Cyan (Low midtone)
    if (ire >= 4) return [29, 78, 216]; // Blue (Deep shadow)
    return [126, 34, 206]; // Purple (Crushed black)
  };

  // Render Studio Scopes onto 2D Canvas
  const renderScopes = useCallback((
    ctx: CanvasRenderingContext2D,
    imgData: ImageData,
    srcW: number,
    srcH: number
  ) => {
    const scopeW = 400;
    const scopeH = 260;

    if (ctx.canvas.width !== scopeW || ctx.canvas.height !== scopeH) {
      ctx.canvas.width = scopeW;
      ctx.canvas.height = scopeH;
    }

    // Clear dark background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, scopeW, scopeH);

    const pixels = imgData.data;

    if (activeScopeTab === 'waveform') {
      // LUMA OSCILLOSCOPE WAVEFORM
      // Draw standard IRE Grid Lines (100, 80, 60, 40, 20, 0)
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      const ireLines = [100, 80, 60, 40, 20, 0];
      ctx.font = '9px monospace';
      ctx.fillStyle = '#71717a';

      ireLines.forEach((ire) => {
        const y = scopeH - (ire / 100) * (scopeH - 24) - 12;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(scopeW - 8, y);
        ctx.stroke();
        ctx.fillText(`${ire}`, 6, y + 3);
      });

      // Draw Ideal Skin Tone Target Band (Pink zone 52-58 IRE)
      const skinTopY = scopeH - (58 / 100) * (scopeH - 24) - 12;
      const skinBtmY = scopeH - (52 / 100) * (scopeH - 24) - 12;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
      ctx.fillRect(30, skinTopY, scopeW - 38, skinBtmY - skinTopY);

      // Plot Waveform Pixels (Green Phosphor Aesthetic)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      const stepX = 2;
      const stepY = 2;
      const plotW = scopeW - 38;

      for (let y = 0; y < srcH; y += stepY) {
        for (let x = 0; x < srcW; x += stepX) {
          const idx = (y * srcW + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          const plotX = 30 + Math.floor((x / srcW) * plotW);
          const plotY = scopeH - (luma / 255) * (scopeH - 24) - 12;

          ctx.fillRect(plotX, plotY, 1.5, 1.5);
        }
      }
    } else if (activeScopeTab === 'parade') {
      // RGB 3-CHANNEL PARADE
      const channelW = Math.floor((scopeW - 36) / 3);

      ['RED', 'GREEN', 'BLUE'].forEach((chan, idx) => {
        const startX = 30 + idx * channelW;
        ctx.strokeStyle = '#27272a';
        ctx.strokeRect(startX, 12, channelW - 4, scopeH - 24);

        ctx.font = '8px monospace';
        ctx.fillStyle = chan === 'RED' ? '#ef4444' : chan === 'GREEN' ? '#22c55e' : '#3b82f6';
        ctx.fillText(chan, startX + 4, 22);

        // Plot Channel Points
        ctx.fillStyle = chan === 'RED' ? 'rgba(239, 68, 68, 0.12)' : chan === 'GREEN' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)';
        const step = 3;

        for (let y = 0; y < srcH; y += step) {
          for (let x = 0; x < srcW; x += step) {
            const pIdx = (y * srcW + x) * 4;
            const val = chan === 'RED' ? pixels[pIdx] : chan === 'GREEN' ? pixels[pIdx + 1] : pixels[pIdx + 2];

            const plotX = startX + Math.floor((x / srcW) * (channelW - 6));
            const plotY = scopeH - (val / 255) * (scopeH - 24) - 12;

            ctx.fillRect(plotX, plotY, 1.5, 1.5);
          }
        }
      });
    } else if (activeScopeTab === 'vectorscope') {
      // CHROMA VECTORSCOPE WITH OPTICAL SKIN TONE LINE
      const centerVx = scopeW / 2;
      const centerVy = scopeH / 2;
      const radius = 90;

      // Draw concentric color circles & graticule
      ctx.strokeStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(centerVx, centerVy, radius, 0, Math.PI * 2);
      ctx.arc(centerVx, centerVy, radius * 0.75, 0, Math.PI * 2);
      ctx.arc(centerVx, centerVy, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Optical Skin Tone Line (I-Line at approx 135° phase angle)
      const skinAngle = (137 * Math.PI) / 180;
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerVx, centerVy);
      ctx.lineTo(centerVx + Math.cos(skinAngle) * radius, centerVy - Math.sin(skinAngle) * radius);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = '#ec4899';
      ctx.fillText('SKIN TONE I-LINE', centerVx - 85, centerVy - 70);

      // Plot U/V Chroma Coordinates
      ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
      const step = 3;

      for (let y = 0; y < srcH; y += step) {
        for (let x = 0; x < srcW; x += step) {
          const idx = (y * srcW + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          // YUV conversion for U (Cb) and V (Cr)
          const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
          const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

          const plotX = centerVx + (u / 128) * (radius * 0.9);
          const plotY = centerVy - (v / 128) * (radius * 0.9);

          ctx.fillRect(plotX, plotY, 1.5, 1.5);
        }
      }
    }
  }, [activeScopeTab]);

  // Process and Render Video Frames
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;

      const mainCanvas = mainCanvasRef.current;
      const scopeCanvas = scopeCanvasRef.current;
      if (!mainCanvas || !scopeCanvas) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
      const scopeCtx = scopeCanvas.getContext('2d');
      if (!mainCtx || !scopeCtx) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Determine active visual source element
      let sourceEl: HTMLVideoElement | HTMLImageElement | null = null;
      if (sourceType === 'camera' && videoRef.current && isCameraActive && videoRef.current.readyState >= 2) {
        sourceEl = videoRef.current;
      } else if (sourceType === 'test-scene' || sourceType === 'upload') {
        sourceEl = imageRef.current;
      }

      if (!sourceEl) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Sync canvas dimensions
      const srcWidth = sourceEl instanceof HTMLVideoElement ? sourceEl.videoWidth : sourceEl.naturalWidth || 640;
      const srcHeight = sourceEl instanceof HTMLVideoElement ? sourceEl.videoHeight : sourceEl.naturalHeight || 360;

      if (srcWidth === 0 || srcHeight === 0) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const displayW = 640;
      const displayH = Math.round((srcHeight / srcWidth) * displayW);

      if (mainCanvas.width !== displayW || mainCanvas.height !== displayH) {
        mainCanvas.width = displayW;
        mainCanvas.height = displayH;
      }

      // Render raw frame first
      mainCtx.drawImage(sourceEl, 0, 0, displayW, displayH);

      // Extract pixel data for shader analysis
      const imgData = mainCtx.getImageData(0, 0, displayW, displayH);
      const pixels = imgData.data;
      const totalPixels = displayW * displayH;

      // Telemetry Accumulators
      let lumaSum = 0;
      let clippedCount = 0;
      let crushedCount = 0;
      let centerSkinLumaSum = 0;
      let centerSkinCount = 0;
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;

      const centerX = Math.floor(displayW * 0.35);
      const centerY = Math.floor(displayH * 0.25);
      const centerW = Math.floor(displayW * 0.3);
      const centerH = Math.floor(displayH * 0.4);

      zebraPhaseRef.current = (zebraPhaseRef.current + 0.5) % 12;
      const phase = Math.floor(zebraPhaseRef.current);

      const splitBoundary = Math.floor((splitPosition / 100) * displayW);

      // Pixel Shader Pass
      for (let y = 0; y < displayH; y++) {
        for (let x = 0; x < displayW; x++) {
          const idx = (y * displayW + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const ire = (luma / 255) * 100;

          lumaSum += ire;
          redSum += r;
          greenSum += g;
          blueSum += b;

          if (ire >= 95) clippedCount++;
          if (ire <= 4) crushedCount++;

          // Center face area measurement
          if (x >= centerX && x <= centerX + centerW && y >= centerY && y <= centerY + centerH) {
            centerSkinLumaSum += ire;
            centerSkinCount++;
          }

          // Visual Mode Transformations
          if (viewMode === 'false-color') {
            const [fcR, fcG, fcB] = getFalseColorRGB(r, g, b);
            pixels[idx] = fcR;
            pixels[idx + 1] = fcG;
            pixels[idx + 2] = fcB;
          } else if (viewMode === 'split') {
            // Split view: Left = Normal, Right = False Color
            if (x > splitBoundary) {
              const [fcR, fcG, fcB] = getFalseColorRGB(r, g, b);
              pixels[idx] = fcR;
              pixels[idx + 1] = fcG;
              pixels[idx + 2] = fcB;
            }
          } else if (viewMode === 'zebra') {
            // Animated diagonal zebra stripes on pixels above threshold
            if (ire >= zebraThreshold) {
              const stripe = (x + y + phase) % 8 < 4;
              if (stripe) {
                pixels[idx] = 255;
                pixels[idx + 1] = 0;
                pixels[idx + 2] = 0;
              } else {
                pixels[idx] = 255;
                pixels[idx + 1] = 255;
                pixels[idx + 2] = 255;
              }
            }
          }
        }
      }

      // Put processed image data back
      mainCtx.putImageData(imgData, 0, 0);

      // If split mode, draw a sharp vertical guideline
      if (viewMode === 'split') {
        mainCtx.strokeStyle = '#FFE500';
        mainCtx.lineWidth = 2;
        mainCtx.beginPath();
        mainCtx.moveTo(splitBoundary, 0);
        mainCtx.lineTo(splitBoundary, displayH);
        mainCtx.stroke();
      }

      // Telemetry Calculation Updates
      const avgIre = Math.round(lumaSum / totalPixels);
      const clipPct = parseFloat(((clippedCount / totalPixels) * 100).toFixed(1));
      const crushPct = parseFloat(((crushedCount / totalPixels) * 100).toFixed(1));
      const centerSkinIre = centerSkinCount > 0 ? Math.round(centerSkinLumaSum / centerSkinCount) : 50;

      let colorCast = 'Neutral Balanced';
      const avgR = redSum / totalPixels;
      const avgG = greenSum / totalPixels;
      const avgB = blueSum / totalPixels;
      if (avgR > avgB * 1.25) colorCast = 'Warm Orange/Yellow Cast';
      else if (avgB > avgR * 1.25) colorCast = 'Cool Blue Cast';
      else if (avgG > avgR * 1.15 && avgG > avgB * 1.15) colorCast = 'Fluorescent Green Tint';

      let status = 'OPTIMAL';
      if (clipPct > 5) status = 'CLIPPING HIGHLIGHTS';
      else if (crushPct > 15) status = 'HEAVY SHADOW CRUSH';

      setTelemetry({
        avgIre,
        clipPercent: clipPct,
        crushPercent: crushPct,
        centerSkinIre,
        colorCast,
        status,
      });

      // RENDER SCOPES (Waveform / RGB Parade / Vectorscope)
      renderScopes(scopeCtx, imgData, displayW, displayH);

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sourceType, isCameraActive, viewMode, splitPosition, zebraThreshold, activeScopeTab, renderScopes]);

  // Hover Pixel Loupe Inspector
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const luma = 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
        const ire = Math.round((luma / 255) * 100);

        setHoverPixel({
          x,
          y,
          ire,
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
        });
      }
    }
  };

  // Take Snapshot Reference
  const handleCaptureSnapshot = () => {
    const canvas = mainCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSnapshotDataUrl(dataUrl);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', color: '#000000', padding: '16px 20px 80px' }}>
      
      {/* Hidden Source Elements */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <img
        ref={imageRef}
        src={TEST_SCENES.find((s) => s.id === selectedTestScene)?.url || TEST_SCENES[0].url}
        crossOrigin="anonymous"
        alt="Reference frame"
        style={{ display: 'none' }}
      />

      {/* Top Header Section */}
      <div style={{ maxWidth: 1360, margin: '0 auto 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  background: '#FFE500',
                  color: '#000',
                  padding: '2px 8px',
                  border: '1.5px solid #000',
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                CINEMA SCOPES · LIGHTING LAB
              </span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                ARRI/RED FALSE COLOR · LUMA WAVEFORM · SKIN TONE VECTORSCOPE
              </span>
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#000',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              False Color & Exposure Monitor
            </h1>
          </div>

          {/* Source Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Live Camera Button */}
            <button
              onClick={handleSelectCameraSource}
              className="brutalist-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.74rem',
                padding: '8px 12px',
                background: sourceType === 'camera' ? '#22c55e' : '#fff',
                color: '#000',
              }}
            >
              <Camera size={14} />
              {isCameraActive ? 'WEBCAM ACTIVE' : 'CONNECT WEBCAM'}
            </button>

            {/* Test Scene Dropdown */}
            <select
              value={selectedTestScene}
              onChange={(e) => handleSelectTestScene(e.target.value)}
              style={{
                padding: '7px 10px',
                border: '2px solid #000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.74rem',
                background: sourceType === 'test-scene' ? '#FFE500' : '#fff',
              }}
            >
              {TEST_SCENES.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  SCENE: {scene.name}
                </option>
              ))}
            </select>

            {/* Upload Custom Image */}
            <label
              className="brutalist-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.74rem',
                padding: '8px 12px',
                background: sourceType === 'upload' ? '#000' : '#fff',
                color: sourceType === 'upload' ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              <ImageIcon size={14} />
              UPLOAD FILE
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* Main 2-Column Studio Deck */}
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(380px, 460px)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Main Video Monitor & False Color Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Main Display Frame */}
          <div
            style={{
              background: '#ffffff',
              border: '3px solid #000',
              boxShadow: '6px 6px 0 rgba(0,0,0,0.18)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* View Mode Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', border: '2px solid #000', background: '#000' }}>
                {(['false-color', 'split', 'zebra', 'normal'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      background: viewMode === mode ? '#FFE500' : '#fff',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {mode === 'false-color' ? 'FALSE COLOR' : mode === 'split' ? 'SPLIT A/B' : mode === 'zebra' ? 'ZEBRAS' : 'NORMAL'}
                  </button>
                ))}
              </div>

              {/* Snapshot Button */}
              <button
                onClick={handleCaptureSnapshot}
                className="brutalist-button"
                style={{
                  fontSize: '0.68rem',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: snapshotDataUrl ? '#22c55e' : '#fff',
                }}
              >
                <Sun size={13} />
                {snapshotDataUrl ? 'REF CAPTURED' : 'GRAB REF FRAME'}
              </button>
            </div>

            {/* Canvas Monitor Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                background: '#111113',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <canvas
                ref={mainCanvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverPixel(null)}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 'calc(100vh - 380px)',
                  display: 'block',
                  cursor: 'crosshair',
                }}
              />

              {/* Interactive Hover Loupe Badge */}
              {hoverPixel && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(0,0,0,0.85)',
                    border: '2px solid #FFE500',
                    padding: '6px 10px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>
                      PIXEL: ({hoverPixel.x}, {hoverPixel.y})
                    </span>
                    <span>•</span>
                    <span style={{ color: '#FFE500', fontWeight: 900 }}>
                      IRE: {hoverPixel.ire}%
                    </span>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        background: `rgb(${hoverPixel.r}, ${hoverPixel.g}, ${hoverPixel.b})`,
                        border: '1px solid #fff',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Split View Slider (if in split mode) */}
            {viewMode === 'split' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', background: '#f4f4f5', border: '1.5px solid #000' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900 }}>
                  A/B SPLIT POSITION:
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900 }}>
                  {splitPosition}%
                </span>
              </div>
            )}

            {/* Zebra Slider (if in zebra mode) */}
            {viewMode === 'zebra' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', background: '#fee2e2', border: '1.5px solid #ef4444' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, color: '#b91c1c' }}>
                  ZEBRA THRESHOLD:
                </span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={zebraThreshold}
                  onChange={(e) => setZebraThreshold(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, color: '#b91c1c' }}>
                  {zebraThreshold}% IRE
                </span>
              </div>
            )}

            {/* False Color Legend Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, color: '#555' }}>
                ARRI / RED EXPOSURE IRE CHROMATIC SCALE:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 2, border: '2px solid #000', background: '#000' }}>
                {FALSE_COLOR_BANDS.map((band) => (
                  <div
                    key={band.label}
                    style={{
                      background: band.color,
                      padding: '4px 2px',
                      textAlign: 'center',
                      fontSize: '0.55rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      color: ['#FFE500', '#ec4899', '#9ca3af'].includes(band.color) ? '#000' : '#fff',
                    }}
                    title={`${band.label}: ${band.description}`}
                  >
                    {band.minIre}-{band.maxIre}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Oscilloscope Waveforms & Lighting Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Real-time Oscilloscope Scopes Frame */}
          <div
            style={{
              background: '#ffffff',
              border: '3px solid #000',
              padding: 14,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Scopes Tab Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', border: '1.5px solid #000' }}>
                {(['waveform', 'parade', 'vectorscope'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveScopeTab(tab)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      background: activeScopeTab === tab ? '#000' : '#fff',
                      color: activeScopeTab === tab ? '#fff' : '#000',
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                REAL-TIME 60FPS
              </span>
            </div>

            {/* Scope Canvas Screen */}
            <div
              style={{
                width: '100%',
                background: '#09090b',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <canvas
                ref={scopeCanvasRef}
                style={{
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '400 / 260',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* Smart Lighting Advisor & Frame Telemetry */}
          <div
            style={{
              background: '#ffffff',
              border: '3px solid #000',
              padding: 14,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                Lighting Telemetry
              </h3>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  padding: '2px 6px',
                  background: telemetry.status === 'OPTIMAL' ? '#dcfce7' : '#fee2e2',
                  border: `1px solid ${telemetry.status === 'OPTIMAL' ? '#22c55e' : '#ef4444'}`,
                  color: telemetry.status === 'OPTIMAL' ? '#15803d' : '#b91c1c',
                }}
              >
                {telemetry.status}
              </span>
            </div>

            {/* Key Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div style={{ padding: 8, background: '#f4f4f5', border: '1.5px solid #000' }}>
                <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                  SKIN KEY TARGET
                </div>
                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 900, color: '#ec4899' }}>
                  {telemetry.centerSkinIre} IRE
                </div>
                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888' }}>
                  Ideal: 52-58 IRE (Pink)
                </div>
              </div>

              <div style={{ padding: 8, background: '#f4f4f5', border: '1.5px solid #000' }}>
                <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                  HIGHLIGHT CLIPPING
                </div>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    color: telemetry.clipPercent > 3 ? '#ef4444' : '#22c55e',
                  }}
                >
                  {telemetry.clipPercent}%
                </div>
                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888' }}>
                  Max safe: &lt;2.0%
                </div>
              </div>

              <div style={{ padding: 8, background: '#f4f4f5', border: '1.5px solid #000' }}>
                <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                  SHADOW NOISE FLOOR
                </div>
                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 900, color: '#3b82f6' }}>
                  {telemetry.crushPercent}%
                </div>
                <div style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#888' }}>
                  Crushed blacks &lt;4 IRE
                </div>
              </div>

              <div style={{ padding: 8, background: '#f4f4f5', border: '1.5px solid #000' }}>
                <div style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                  COLOR BALANCE
                </div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', marginTop: 4 }}>
                  {telemetry.colorCast}
                </div>
              </div>
            </div>

            {/* Plain English Studio Lighting Advice */}
            <div
              style={{
                padding: '10px 12px',
                background: '#fef9c3',
                border: '1.5px solid #eab308',
                fontSize: '0.74rem',
                lineHeight: 1.5,
                fontWeight: 600,
                color: '#713f12',
              }}
            >
              <strong>DIRECTOR ADVICE:</strong>{' '}
              {telemetry.centerSkinIre > 65
                ? 'Your key light is a bit hot on the face. Lower light intensity or diffuse slightly so cheeks hit the Pink/Bronze 52-58 IRE zone.'
                : telemetry.centerSkinIre < 45
                ? 'Subject face is in the shadow zone (Green 42-48 IRE). Bring your key light closer to lift skin tone into the optimal pink band.'
                : 'Lighting is balanced! Skin tone is sitting right in the cinema sweet spot (52-58 IRE) with zero clipping.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
