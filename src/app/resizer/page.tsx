"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Download,
  FolderArchive,
  Check,
  Image as ImageIcon,
  Film,
  Play,
  Pause,
  Camera,
  Upload,
  RefreshCw,
  LayoutGrid,
  Stamp,
} from "lucide-react";
import { exportCanvasVideoToMp4, downloadBlob, seekVideo, decodeAudioFromFile } from "@/lib/canvas-video-exporter";
import {
  drawWatermark,
  loadImageFromFile,
  WATERMARK_POSITIONS,
  type WatermarkMode,
  type WatermarkOptions,
  type WatermarkPosition,
} from "@/lib/watermark";
import { TactileScrubber } from "@/components/tactile-scrubber";
import NextStepRow from "@/components/NextStepRow";
import { putHandoffImage, takeHandoffImage } from "@/lib/tool-handoff";
import { loadAssets, loadState, saveAssets, saveState } from "@/lib/local-memory";

type FitMode = "blur-fill" | "gradient" | "fill" | "contain";
type OutFormat = "png" | "jpg" | "webp";

interface SafeZone {
  /** Relative insets (fractions of width/height) covered by native platform UI. */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface PlatformPreset {
  id: string;
  label: string;
  aspectRatioLabel: string;
  width: number;
  height: number;
  safe?: SafeZone;
}

const PLATFORMS: PlatformPreset[] = [
  {
    id: "tiktok",
    label: "TikTok",
    aspectRatioLabel: "9:16",
    width: 1080,
    height: 1920,
    safe: { top: 0.13, right: 0.16, bottom: 0.24, left: 0.04 },
  },
  {
    id: "reels",
    label: "Instagram Reels",
    aspectRatioLabel: "9:16",
    width: 1080,
    height: 1920,
    safe: { top: 0.1, right: 0.14, bottom: 0.2, left: 0.04 },
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    aspectRatioLabel: "9:16",
    width: 1080,
    height: 1920,
    safe: { top: 0.09, right: 0.12, bottom: 0.19, left: 0.04 },
  },
  { id: "ig-portrait", label: "Instagram Portrait", aspectRatioLabel: "4:5", width: 1080, height: 1350 },
  { id: "ig-feed", label: "Instagram Square", aspectRatioLabel: "1:1", width: 1080, height: 1080 },
  { id: "yt-thumb", label: "YouTube Video / Thumb", aspectRatioLabel: "16:9", width: 1280, height: 720 },
  { id: "xpost", label: "X / Twitter Post", aspectRatioLabel: "16:9", width: 1600, height: 900 },
  { id: "pinterest", label: "Pinterest Pin", aspectRatioLabel: "2:3", width: 1000, height: 1500 },
  { id: "linkedin", label: "LinkedIn & FB Banner", aspectRatioLabel: "1.91:1", width: 1200, height: 627 },
];

const GRADIENT_PRESETS = [
  { id: "sunset", label: "Sunset Glow", colors: ["#ff5e62", "#ff9966"] },
  { id: "cyber", label: "Cyber Neon", colors: ["#8a2387", "#e94057", "#f27121"] },
  { id: "nebula", label: "Dark Studio", colors: ["#0f2027", "#203a43", "#2c5364"] },
  { id: "amber", label: "MoMo Gold", colors: ["#f7971e", "#ffd200"] },
  { id: "emerald", label: "Emerald Mint", colors: ["#11998e", "#38ef7d"] },
  { id: "midnight", label: "Midnight Blue", colors: ["#141E30", "#243B55"] },
];

// ---------------------------------------------------------------------------
// Single source of truth for compositing. Every surface (live preview,
// thumbnails, ZIP batch and video export) draws through this one function, so
// what you see is always exactly what gets exported — at any resolution.
// ---------------------------------------------------------------------------

interface ComposeOptions {
  fit: FitMode;
  gradientColors: string[];
  letterbox: string;
  /** Background blur strength as a fraction of canvas width (scale-invariant). */
  blurFrac: number;
  zoom: number;
  panX: number; // -100..100
  panY: number; // -100..100
}

function drawFormattedFrame(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  srcW: number,
  srcH: number,
  W: number,
  H: number,
  o: ComposeOptions
) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const drawContained = (withShadow: boolean) => {
    const s = Math.min(W / srcW, H / srcH) * o.zoom;
    const dw = srcW * s;
    const dh = srcH * s;
    const dx = (W - dw) / 2 + (o.panX / 100) * (W * 0.5);
    const dy = (H - dh) / 2 + (o.panY / 100) * (H * 0.5);
    if (withShadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = Math.max(10, W * 0.025);
      ctx.shadowOffsetY = Math.max(3, H * 0.005);
      ctx.drawImage(media, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(media, dx, dy, dw, dh);
    }
  };

  if (o.fit === "blur-fill") {
    // 1. Blurred, darkened cover background
    const bgScale = Math.max(W / srcW, H / srcH);
    const bgW = srcW * bgScale;
    const bgH = srcH * bgScale;
    const blurPx = Math.max(2, o.blurFrac * W);
    const pad = blurPx * 2; // overscan so blur never reveals hard edges
    ctx.save();
    ctx.filter = `blur(${blurPx}px) brightness(0.7)`;
    ctx.drawImage(media, (W - bgW) / 2 - pad, (H - bgH) / 2 - pad, bgW + pad * 2, bgH + pad * 2);
    ctx.restore();
    ctx.filter = "none";
    // 2. Sharp contained subject
    drawContained(true);
  } else if (o.fit === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    const stops = Math.max(1, o.gradientColors.length - 1);
    o.gradientColors.forEach((c, idx) => grad.addColorStop(idx / stops, c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    drawContained(true);
  } else if (o.fit === "fill") {
    // Hard crop with centered zoom & pan across the overflow only
    const s = Math.max(W / srcW, H / srcH) * o.zoom;
    const dw = srcW * s;
    const dh = srcH * s;
    const overflowX = Math.max(0, (dw - W) / 2);
    const overflowY = Math.max(0, (dh - H) / 2);
    const dx = (W - dw) / 2 + (o.panX / 100) * overflowX;
    const dy = (H - dh) / 2 + (o.panY / 100) * overflowY;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(media, dx, dy, dw, dh);
  } else {
    // Solid letterbox
    ctx.fillStyle = o.letterbox;
    ctx.fillRect(0, 0, W, H);
    drawContained(false);
  }
}

/** Programmatic platform-UI safe-zone overlay (profile row, icon rail, caption/CTA). */
function drawSafeZoneOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, z: SafeZone) {
  const bandFill = "rgba(255, 45, 85, 0.16)";
  const bandEdge = "rgba(255, 45, 85, 0.85)";
  const fs = Math.max(9, W * 0.026);

  const label = (text: string, x: number, y: number) => {
    ctx.save();
    ctx.font = `900 ${fs}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  const band = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = bandFill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = bandEdge;
    ctx.lineWidth = Math.max(1.5, W * 0.003);
    ctx.setLineDash([W * 0.02, W * 0.015]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  };

  ctx.save();
  band(0, 0, W, H * z.top);
  label("TAP UI", W / 2, (H * z.top) / 2);

  band(W * (1 - z.right), 0, W * z.right, H);
  label("ICONS", W * (1 - z.right / 2), H * 0.42);

  band(0, H * (1 - z.bottom), W, H * z.bottom);
  label("CAPTION + CTA", W / 2, H * (1 - z.bottom / 2));

  if (z.left > 0.01) band(0, 0, W * z.left, H);

  ctx.strokeStyle = "rgba(255, 229, 0, 0.95)";
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.setLineDash([W * 0.03, W * 0.02]);
  ctx.strokeRect(W * z.left, H * z.top, W * (1 - z.left - z.right), H * (1 - z.top - z.bottom));
  ctx.setLineDash([]);
  ctx.restore();
}

// seekVideo + decodeAudioFromFile live in src/lib/canvas-video-exporter.ts
// (promoted there in Phase 7.2 so batch watermark shares the exact pipeline).

export default function ResizerPage() {
  // Media State (Image or Video)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState("");
  const [fileName, setFileName] = useState("creator-media");

  // Video Playback & Scrubbing
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState("");
  // §4: last saved image — carried into the compressor via the hand-off row
  const [lastImageBlob, setLastImageBlob] = useState<Blob | null>(null);

  // Trim (In/Out points for video export)
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0); // 0 = until end

  // Formatting & Framing
  const [preset, setPreset] = useState<PlatformPreset>(PLATFORMS[0]);
  const [fit, setFit] = useState<FitMode>("blur-fill");
  const [activeGradient, setActiveGradient] = useState(GRADIENT_PRESETS[0]);
  const [letterbox, setLetterbox] = useState("#000000");
  const [blurPercent, setBlurPercent] = useState(2.6);
  const [showSafeZones, setShowSafeZones] = useState(false);

  // Brand Watermark (stamped into every export)
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmMode, setWmMode] = useState<WatermarkMode>("text");
  const [wmText, setWmText] = useState("@yourhandle");
  const [wmColor, setWmColor] = useState("#ffffff");
  const [wmSize, setWmSize] = useState(5);
  const [wmOpacity, setWmOpacity] = useState(0.8);
  const [wmPosition, setWmPosition] = useState<WatermarkPosition>("bottom-right");
  const [wmLogo, setWmLogo] = useState<HTMLImageElement | null>(null);
  const [wmLogoName, setWmLogoName] = useState("");
  const [wmLogoDataUrl, setWmLogoDataUrl] = useState<string | null>(null);

  // Export Settings
  const [format, setFormat] = useState<OutFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [downloaded, setDownloaded] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Pan & Zoom Framing
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const thumbsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const lastThumbDrawRef = useRef(0);
  const wmLogoInputRef = useRef<HTMLInputElement>(null);

  const currentCompose = useCallback(
    (): ComposeOptions => ({
      fit,
      gradientColors: activeGradient.colors,
      letterbox,
      blurFrac: blurPercent / 100,
      zoom: zoomScale,
      panX,
      panY,
    }),
    [fit, activeGradient, letterbox, blurPercent, zoomScale, panX, panY]
  );

  // ---- Brand watermark (shared engine with the Batch Watermark tool) ----
  const currentWatermark = useCallback((): WatermarkOptions | null => {
    if (!wmEnabled) return null;
    if (wmMode === "text" && !wmText.trim()) return null;
    if (wmMode === "logo" && !wmLogo) return null;
    return {
      mode: wmMode,
      text: wmText,
      textColor: wmColor,
      logo: wmLogo,
      sizePct: wmSize,
      opacity: wmOpacity,
      position: wmPosition,
    };
  }, [wmEnabled, wmMode, wmText, wmColor, wmLogo, wmSize, wmOpacity, wmPosition]);

  // Remember the brand kit across visits (text settings + reasonably small logos)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ck-brand-kit");
      if (!raw) return;
      const kit = JSON.parse(raw) as {
        wmMode?: WatermarkMode;
        wmText?: string;
        wmColor?: string;
        wmSize?: number;
        wmOpacity?: number;
        wmPosition?: WatermarkPosition;
        logoDataUrl?: string;
      };
      if (kit.wmText !== undefined) setWmText(kit.wmText);
      if (kit.wmColor) setWmColor(kit.wmColor);
      if (kit.wmSize) setWmSize(kit.wmSize);
      if (kit.wmOpacity) setWmOpacity(kit.wmOpacity);
      if (kit.wmPosition) setWmPosition(kit.wmPosition);
      if (kit.logoDataUrl) {
        const img = new Image();
        img.onload = () => {
          setWmLogo(img);
          setWmLogoName("saved-logo");
          if (kit.wmMode === "logo") setWmMode("logo");
        };
        img.src = kit.logoDataUrl;
      }
    } catch {
      /* corrupt kit — ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const kit = {
        wmMode,
        wmText,
        wmColor,
        wmSize,
        wmOpacity,
        wmPosition,
        logoDataUrl:
          wmMode === "logo" && wmLogoDataUrl && wmLogoDataUrl.length < 800_000 ? wmLogoDataUrl : undefined,
      };
      localStorage.setItem("ck-brand-kit", JSON.stringify(kit));
    } catch {
      /* storage full — settings stay session-only */
    }
  }, [wmMode, wmText, wmColor, wmSize, wmOpacity, wmPosition, wmLogoDataUrl]);

  const handleWmLogoUpload = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setWmLogo(img);
      setWmLogoName(file.name);
      setWmLogoDataUrl(img.src as string);
      setWmEnabled(true);
    } catch {
      /* unreadable logo */
    }
  }, []);

  // Load a demo photo on mount so the tool proves itself instantly
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setSourceImage(img);
      setIsVideo(false);
      setSourceInfo("1280 × 853px · Studio Master (demo)");
      setFileName("creator-master");
    };
    img.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1280&auto=format&fit=crop";
  }, []);

  const resetTransform = () => {
    setZoomScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  const getMediaDimensions = useCallback(() => {
    if (isVideo) {
      return { w: videoRef.current?.videoWidth || 1920, h: videoRef.current?.videoHeight || 1080 };
    }
    return { w: sourceImage?.naturalWidth || 1280, h: sourceImage?.naturalHeight || 720 };
  }, [isVideo, sourceImage]);

  // High-Resolution Canvas Rendering Engine (preview)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = preset.width;
    const H = preset.height;
    canvas.width = W;
    canvas.height = H;

    const currentMedia = isVideo ? videoRef.current : sourceImage;
    if (!currentMedia) return;

    const { w: sW, h: sH } = getMediaDimensions();
    drawFormattedFrame(ctx, currentMedia, sW, sH, W, H, currentCompose());
    const wm = currentWatermark();
    if (wm) drawWatermark(ctx, W, H, wm);

    if (showSafeZones && preset.safe) {
      drawSafeZoneOverlay(ctx, W, H, preset.safe);
    }
  }, [preset, showSafeZones, isVideo, sourceImage, getMediaDimensions, currentCompose, currentWatermark]);

  // Live thumbnails of ALL platform formats at once
  const drawAllThumbs = useCallback(() => {
    const currentMedia = isVideo ? videoRef.current : sourceImage;
    if (!currentMedia) return;
    const { w: sW, h: sH } = getMediaDimensions();
    const compose = currentCompose();
    const wm = currentWatermark();

    PLATFORMS.forEach((p, i) => {
      const c = thumbsRef.current[i];
      if (!c) return;
      const TH = 300;
      const tw = Math.round(TH * (p.width / p.height));
      if (c.width !== tw || c.height !== TH) {
        c.width = tw;
        c.height = TH;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      drawFormattedFrame(ctx, currentMedia, sW, sH, c.width, c.height, compose);
      if (wm) drawWatermark(ctx, c.width, c.height, wm);
    });
    lastThumbDrawRef.current = performance.now();
  }, [isVideo, sourceImage, getMediaDimensions, currentCompose, currentWatermark]);

  useEffect(() => {
    renderCanvas();
    drawAllThumbs();
  }, [renderCanvas, drawAllThumbs]);

  // Handle Video Frame Continuous Rendering (refresh thumbs ~1x/sec while playing)
  useEffect(() => {
    if (!isVideo || !isPlayingVideo) return;
    const loop = () => {
      renderCanvas();
      if (videoRef.current) setVideoCurrentTime(videoRef.current.currentTime);
      if (performance.now() - lastThumbDrawRef.current > 900) drawAllThumbs();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVideo, isPlayingVideo, renderCanvas, drawAllThumbs]);

  // Handle Media File Upload (Image or Video)
  const handleFileUpload = useCallback((f: File | null) => {
    if (!f) return;

    setRenderedVideoUrl(null);
    setExportNote("");
    setTrimIn(0);
    setTrimOut(0);
    const isVid = f.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(f.name);
    setIsVideo(isVid);
    setSourceFile(f);
    // Phase 7.1 — remember the last source file (IndexedDB, on-device only).
    void saveAssets("resizer", "Format Resizer", [{ slot: "0", blob: f, name: f.name }]);

    if (isVid) {
      const url = URL.createObjectURL(f);
      setVideoUrl(url);
      setSourceImage(null);
      setFileName(f.name.replace(/\.[^.]+$/, ""));
      resetTransform();
    } else {
      setVideoUrl(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          setSourceImage(img);
          setSourceInfo(`${img.naturalWidth} × ${img.naturalHeight}px · ${(f.size / 1024).toFixed(0)} KB`);
          setFileName(f.name.replace(/\.[^.]+$/, ""));
          resetTransform();
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(f);
    }
  }, []);

  // Clipboard paste support (images)
  const handleFileUploadRef = useRef(handleFileUpload);
  useEffect(() => {
    handleFileUploadRef.current = handleFileUpload;
  }, [handleFileUpload]);

  // Phase 7.1 — restore the last source file + formatting presets from local
  // memory (on-device only). A pending §4 hand-off (match-cut / auto-captions
  // pass the source FILE as video; watermark & friends pass images) still
  // wins over the restore. Transform (zoom/pan) is session-only by design —
  // handleFileUpload resets it, so it is deliberately not persisted.
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadState<{
          presetId: string;
          fit: FitMode;
          gradientId: string;
          letterbox: string;
          blurPercent: number;
          format: OutFormat;
          quality: number;
        }>("resizer");
        if (saved) {
          const p = PLATFORMS.find((x) => x.id === saved.state.presetId);
          if (p) setPreset(p);
          setFit(saved.state.fit);
          const g = GRADIENT_PRESETS.find((x) => x.id === saved.state.gradientId);
          if (g) setActiveGradient(g);
          setLetterbox(saved.state.letterbox);
          setBlurPercent(saved.state.blurPercent);
          setFormat(saved.state.format);
          setQuality(saved.state.quality);
        }
        const stored = await loadAssets("resizer");
        const mem = stored[0];
        if (mem) {
          handleFileUploadRef.current(new File([mem.blob], mem.name ?? "source", { type: mem.blob.type }));
        }
      } catch {
        /* private mode / unavailable — memory is optional */
      }
      hydratedRef.current = true;
      const rec = await takeHandoffImage("resizer");
      if (!rec) return;
      const ext = rec.blob.type.startsWith("video/") ? "mp4" : "png";
      const name = rec.name ?? `handoff-${Date.now()}.${ext}`;
      handleFileUploadRef.current(new File([rec.blob], name, { type: rec.blob.type }));
    })();
  }, []);

  // Phase 7.1 — the formatting presets survive app close (state store).
  useEffect(() => {
    if (!hydratedRef.current) return; // never fire before the restore lands
    void saveState("resizer", "Format Resizer", {
      presetId: preset.id,
      fit,
      gradientId: activeGradient.id,
      letterbox,
      blurPercent,
      format,
      quality,
    });
  }, [preset, fit, activeGradient, letterbox, blurPercent, format, quality]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) handleFileUploadRef.current(f);
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Download Single Formatted Image / Frame Snapshot
  const downloadSingle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        downloadBlob(blob, `${fileName}-${preset.id}-${preset.width}x${preset.height}.${format}`);
        setLastImageBlob(blob);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 1600);
      },
      mime,
      quality
    );
  };

  // Deterministic MP4 render (WebCodecs H.264 + original audio, trimmed to In/Out)
  const renderFormattedVideo = async () => {
    const video = videoRef.current;
    if (!video || !isVideo || renderingVideo) return;

    const duration = video.duration || 0;
    const inPt = Math.max(0, Math.min(trimIn, duration));
    const outPt = trimOut > inPt ? Math.min(trimOut, duration || trimOut) : duration;
    if (outPt - inPt < 0.2) return;

    const fps = 30;
    const totalFrames = Math.max(1, Math.round((outPt - inPt) * fps));

    video.pause();
    setIsPlayingVideo(false);
    setRenderingVideo(true);
    setRenderProgress(0);
    setRenderedVideoUrl(null);
    setExportNote("Decoding source audio…");

    const audioBuffer = await decodeAudioFromFile(sourceFile, inPt, outPt);

    const sW = video.videoWidth || 1920;
    const sH = video.videoHeight || 1080;
    const compose = currentCompose();

    try {
      const result = await exportCanvasVideoToMp4({
        width: preset.width,
        height: preset.height,
        fps,
        totalFrames,
        audioBuffer,
        renderFrameAsync: async (i, ctx) => {
          await seekVideo(video, inPt + i / fps);
          drawFormattedFrame(ctx, video, sW, sH, preset.width, preset.height, compose);
          const wm = currentWatermark();
          if (wm) drawWatermark(ctx, preset.width, preset.height, wm);
        },
        onProgress: (p) => setRenderProgress(Math.round(p * 100)),
      });

      if (result.audioIncluded) setExportNote("MP4 · H.264 + original audio");
      else if (result.usedFallback) setExportNote("MP4/WebM · legacy recorder (no WebCodecs)");
      else setExportNote("MP4 · H.264 (source had no decodable audio)");

      const url = URL.createObjectURL(result.blob);
      setRenderedVideoUrl(url);
      downloadBlob(result.blob, `${fileName}-${preset.id}-${preset.width}x${preset.height}.mp4`);
    } catch {
      setExportNote("Export failed — try a shorter trim range.");
    } finally {
      setRenderingVideo(false);
      // Park playhead back at the out point preview
      video.currentTime = inPt;
      setVideoCurrentTime(inPt);
    }
  };

  // Batch Export All Platforms in 1 Click ZIP (same compositor → identical output)
  const downloadAllZip = async () => {
    const currentMedia = isVideo ? videoRef.current : sourceImage;
    if (!currentMedia || isZipping) return;

    setIsZipping(true);
    try {
      const JSZip = (await import("jszip")).default; // lazy per §7 — never in the page bundle
      const zip = new JSZip();
      const { w: sW, h: sH } = getMediaDimensions();
      const compose = currentCompose();

      for (const p of PLATFORMS) {
        const c = document.createElement("canvas");
        c.width = p.width;
        c.height = p.height;
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        drawFormattedFrame(ctx, currentMedia, sW, sH, p.width, p.height, compose);
        const wm = currentWatermark();
        if (wm) drawWatermark(ctx, p.width, p.height, wm);

        const mime = format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
        const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, mime, quality));
        if (blob) {
          zip.file(`${fileName}-${p.id}-${p.width}x${p.height}.${format}`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${fileName}-all-social-formats.zip`);
    } finally {
      setIsZipping(false);
    }
  };

  const exportClipLength = isVideo
    ? ((trimOut > trimIn ? Math.min(trimOut, videoDuration || trimOut) : videoDuration) - trimIn).toFixed(1)
    : "0";

  return (
    <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
      {/* Hidden Video Player for Video Processing */}
      {isVideo && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted
          loop
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setVideoDuration(v.duration);
            setTrimIn(0);
            setTrimOut(0);
            setSourceInfo(`${v.videoWidth} × ${v.videoHeight}px · Video (${v.duration.toFixed(1)}s)`);
            renderCanvas();
            drawAllThumbs();
          }}
          onSeeked={() => {
            renderCanvas();
            drawAllThumbs();
          }}
          style={{ display: "none" }}
        />
      )}

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "16px 20px 80px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Studio Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
                Social Platform Resizer
              </h1>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 900,
                  padding: "2px 8px",
                  border: "2px solid #000",
                  background: "#FFE500",
                  color: "#000",
                  fontFamily: "monospace",
                  boxShadow: "2px 2px 0 #000",
                }}
              >
                PHOTO & VIDEO FORMATTER
              </span>
            </div>
            <p className="resizer-header-desc" style={{ fontSize: "0.82rem", color: "#666", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
              <strong style={{ color: "#000" }}>One master asset → every platform's exact frame.</strong> Frame the
              crop once with pan & zoom, then export all 9 formats (TikTok, Reels, Shorts, IG, YouTube, X, Pinterest,
              LinkedIn) in a single ZIP — with safe-zone guides, blur/gradient padding and your brand watermark baked in.
            </p>
          </div>

          {/* Quick Open File */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              onClick={() => fileRef.current?.click()}
              className="brutalist-button brutalist-button-primary"
              style={{ padding: "10px 18px", fontSize: "0.82rem" }}
            >
              <Upload size={16} style={{ marginRight: 6 }} />
              Open Photo or Video
            </button>
            <span style={{ fontSize: "0.66rem", fontFamily: "monospace", color: "#888", fontWeight: 700 }}>
              …or drop it on the stage / paste a screenshot
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                handleFileUpload(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="tool-inner-grid resizer-workspace-grid" style={{ display: "grid", gridTemplateColumns: "minmax(400px, 1.3fr) 380px", gap: 20, alignItems: "start" }}>
          {/* Left Column: Device Stage Preview + Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Canvas Monitor Card */}
            <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 14 }}>
              <div className="resizer-monitor-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {isVideo ? <Film size={18} /> : <ImageIcon size={18} />}
                  <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                    {preset.label} ({preset.aspectRatioLabel})
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      padding: "2px 6px",
                      border: "1px solid #000",
                      background: isVideo ? "#dcfce7" : "#FFE500",
                      color: "#000",
                    }}
                  >
                    {isVideo ? "VIDEO" : "PHOTO"} {preset.width} × {preset.height}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Safe Zone Toggle */}
                  {preset.safe && (
                    <button
                      onClick={() => setShowSafeZones((s) => !s)}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.68rem",
                        fontFamily: "monospace",
                        fontWeight: 900,
                        border: "1.5px solid #000",
                        background: showSafeZones ? "#FFE500" : "#fff",
                        color: "#000",
                        cursor: "pointer",
                      }}
                      title="Show where TikTok/Reels/Shorts UI covers your frame"
                    >
                      Safe Zones: {showSafeZones ? "ON" : "OFF"}
                    </button>
                  )}
                  <span className="resizer-src-info" style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
                    {sourceInfo}
                  </span>
                </div>
              </div>

              {/* Device Viewport Stage (drop target) */}
              <div
                className="resizer-stage"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  handleFileUpload(e.dataTransfer.files?.[0] ?? null);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "480px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "#f4f4f5",
                  backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                  border: `3px ${isDraggingOver ? "dashed" : "solid"} #000`,
                  boxShadow: "3px 3px 0 #000",
                  overflow: "hidden",
                  padding: 24,
                  userSelect: "none",
                }}
              >
                {/* Drag & drop affordance */}
                {isDraggingOver && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255, 229, 0, 0.25)",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      fontSize: "1rem",
                      color: "#000",
                      pointerEvents: "none",
                    }}
                  >
                    DROP PHOTO / VIDEO TO LOAD
                  </div>
                )}

                {/* Floating Canvas Quick Controls Bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#000",
                    border: "2px solid #fff",
                    padding: "3px 6px",
                    boxShadow: "2px 2px 0 #000",
                  }}
                >
                  <button
                    onClick={() => setZoomScale((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    style={{ background: "#fff", border: "1px solid #000", width: 22, height: 22, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Zoom Out"
                  >
                    −
                  </button>
                  <span style={{ color: "#FFE500", fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 900, minWidth: 42, textAlign: "center" }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                    style={{ background: "#fff", border: "1px solid #000", width: 22, height: 22, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={resetTransform}
                    style={{ background: "#FFE500", border: "1px solid #000", padding: "2px 6px", fontSize: "0.62rem", fontWeight: 900, fontFamily: "monospace", cursor: "pointer", marginLeft: 4 }}
                    title="Reset Position & Zoom"
                  >
                    Reset
                  </button>
                </div>

                {/* The Device-Shaped Canvas */}
                <canvas
                  ref={canvasRef}
                  onPointerDown={(e) => {
                    isMouseDownRef.current = true;
                    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!isMouseDownRef.current) return;
                    const dx = e.clientX - dragStartPosRef.current.x;
                    const dy = e.clientY - dragStartPosRef.current.y;
                    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
                    setPanX((px) => Math.max(-100, Math.min(100, px + dx * 0.5)));
                    setPanY((py) => Math.max(-100, Math.min(100, py + dy * 0.5)));
                  }}
                  onPointerUp={(e) => {
                    isMouseDownRef.current = false;
                    try {
                      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                    } catch { }
                  }}
                  onPointerCancel={() => {
                    isMouseDownRef.current = false;
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY < 0 ? 0.08 : -0.08;
                    setZoomScale((z) => Math.max(0.4, Math.min(3.0, Number((z + delta).toFixed(2)))));
                  }}
                  className="resizer-canvas"
                  style={{
                    maxHeight: "440px",
                    maxWidth: "100%",
                    width: "auto",
                    height: "auto",
                    border: "3px solid #000",
                    boxShadow: "6px 6px 0 rgba(0,0,0,0.15)",
                    borderRadius: preset.safe ? 14 : 0,
                    display: "block",
                    cursor: "grab",
                    touchAction: "none",
                  }}
                />
              </div>

              {/* Video Playback, Timeline & Trim Controls */}
              {isVideo && (
                <div style={{ background: "#000", color: "#fff", border: "2px solid #000", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => {
                          const v = videoRef.current;
                          if (!v) return;
                          if (isPlayingVideo) {
                            v.pause();
                            setIsPlayingVideo(false);
                          } else {
                            v.play();
                            setIsPlayingVideo(true);
                          }
                        }}
                        style={{ background: "#FFE500", color: "#000", border: "none", padding: "4px 10px", fontWeight: 900, fontSize: "0.75rem", fontFamily: "monospace", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {isPlayingVideo ? <Pause size={12} /> : <Play size={12} />}
                        {isPlayingVideo ? "Pause" : "Play Clip"}
                      </button>
                      <span style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#FFE500" }}>
                        {videoCurrentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setTrimIn(videoCurrentTime)}
                        style={{ background: "#fff", color: "#000", border: "1px solid #000", padding: "3px 8px", fontSize: "0.64rem", fontWeight: 900, fontFamily: "monospace", cursor: "pointer" }}
                        title="Mark current playhead as export start"
                      >
                        SET IN
                      </button>
                      <button
                        onClick={() => setTrimOut(videoCurrentTime)}
                        style={{ background: "#fff", color: "#000", border: "1px solid #000", padding: "3px 8px", fontSize: "0.64rem", fontWeight: 900, fontFamily: "monospace", cursor: "pointer" }}
                        title="Mark current playhead as export end"
                      >
                        SET OUT
                      </button>
                      {(trimIn > 0 || trimOut > 0) && (
                        <button
                          onClick={() => {
                            setTrimIn(0);
                            setTrimOut(0);
                          }}
                          style={{ background: "#666", color: "#fff", border: "1px solid #000", padding: "3px 8px", fontSize: "0.64rem", fontWeight: 900, fontFamily: "monospace", cursor: "pointer" }}
                        >
                          CLEAR
                        </button>
                      )}
                      <span style={{ fontSize: "0.66rem", fontFamily: "monospace", color: "#bbb", fontWeight: 700 }}>
                        IN {trimIn.toFixed(1)}s · OUT {(trimOut > 0 ? Math.min(trimOut, videoDuration) : videoDuration).toFixed(1)}s · CLIP {exportClipLength}s
                      </span>
                    </div>
                  </div>

                  <TactileScrubber
                    min={0}
                    max={videoDuration || 10}
                    step={0.05}
                    value={videoCurrentTime}
                    onChange={(t) => {
                      setVideoCurrentTime(t);
                      if (videoRef.current) {
                        videoRef.current.currentTime = t;
                        renderCanvas();
                      }
                    }}
                    showValueBadge={false}
                    showSteppers={false}
                    fillColor="#FFE500"
                  />

                  <button
                    onClick={downloadSingle}
                    style={{ alignSelf: "flex-end", background: "#fff", color: "#000", border: "1px solid #000", padding: "4px 8px", fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Camera size={12} /> Capture Frame as {format.toUpperCase()}
                  </button>
                </div>
              )}

              {/* Sub-hint */}
              <div
                className="resizer-drag-hint"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  color: "#666",
                  fontWeight: 700,
                  padding: "4px 6px",
                  margin: "6px 0 2px",
                }}
              >
                <span>Click & drag to reposition · Scroll to zoom{preset.safe ? " · Safe zones mark native UI coverage" : ""}</span>
                <span style={{ background: "#f4f4f5", border: "1px solid #d4d4d8", padding: "2px 6px", borderRadius: 4 }}>
                  Pan: ({Math.round(panX)}, {Math.round(panY)})
                </span>
              </div>

              {/* Action Buttons */}
              <div className="resizer-action-buttons" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                {isVideo ? (
                  !renderingVideo ? (
                    <button
                      onClick={renderFormattedVideo}
                      className="brutalist-button brutalist-button-primary"
                      style={{ padding: "12px 16px", fontSize: "0.82rem", justifyContent: "center" }}
                    >
                      <Film size={16} style={{ marginRight: 6 }} />
                      Render {preset.label} MP4 ({exportClipLength}s)
                    </button>
                  ) : (
                    <div style={{ padding: 12, background: "#FFE500", border: "2px solid #000", textAlign: "center", fontWeight: 900, fontSize: "0.8rem", fontFamily: "monospace" }}>
                      Rendering MP4: {renderProgress}%
                      <div style={{ height: 8, border: "1.5px solid #000", marginTop: 6, background: "#fff" }}>
                        <div style={{ width: `${renderProgress}%`, height: "100%", background: "#000" }} />
                      </div>
                    </div>
                  )
                ) : (
                  <button
                    onClick={downloadSingle}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: "12px 16px", fontSize: "0.82rem", justifyContent: "center" }}
                  >
                    {downloaded ? <Check size={16} style={{ marginRight: 6 }} /> : <Download size={16} style={{ marginRight: 6 }} />}
                    {downloaded ? "Saved Image!" : `Download ${preset.label} (${format.toUpperCase()})`}
                  </button>
                )}

                {isVideo && renderedVideoUrl ? (
                  <a
                    href={renderedVideoUrl}
                    download={`${fileName}-${preset.id}-video.mp4`}
                    className="brutalist-button"
                    style={{ padding: "12px 16px", fontSize: "0.82rem", justifyContent: "center", background: "#000", color: "#FFE500", textDecoration: "none", display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Download size={16} style={{ marginRight: 6 }} />
                      Download MP4 Again
                    </span>
                    <span style={{ fontSize: "0.6rem", fontFamily: "monospace", color: "#999" }}>{exportNote}</span>
                  </a>
                ) : (
                  <button
                    onClick={downloadAllZip}
                    disabled={isZipping}
                    className="brutalist-button"
                    style={{ padding: "12px 16px", fontSize: "0.82rem", justifyContent: "center", background: "#000", color: "#FFE500", display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {isZipping ? (
                      <>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />
                          Generating ZIP...
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FolderArchive size={16} style={{ marginRight: 6 }} />
                          {isVideo ? "Export All Posters (ZIP)" : "Export All 9 Formats (ZIP)"}
                        </span>
                        {isVideo && <span style={{ fontSize: "0.6rem", fontFamily: "monospace", color: "#999" }}>current frame as {format.toUpperCase()}</span>}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* NEXT → hand-off row (docs/TOOL_INTEGRATION_PLAN.md §4.3) */}
              {(isVideo ? renderedVideoUrl : downloaded || lastImageBlob) && (
                <NextStepRow
                  currentHref="/resizer"
                  heading={isVideo ? "MP4 rendered — keep going" : "Image saved — keep going"}
                  onBeforeNavigate={async (href) => {
                    // §4: carry the saved image straight into the compressor.
                    // (Video outputs navigate as a plain link — the compressor
                    // receiver only accepts images.)
                    if (href === "/compressor" && !isVideo && lastImageBlob) {
                      await putHandoffImage("compressor", lastImageBlob, {
                        sourceTool: "resizer",
                        name: `${fileName}-${preset.id}.${format}`,
                      });
                    }
                  }}
                  onDownload={
                    isVideo
                      ? () => {
                        if (!renderedVideoUrl) return;
                        const a = document.createElement("a");
                        a.href = renderedVideoUrl;
                        a.download = `${fileName}-${preset.id}-video.mp4`;
                        a.click();
                      }
                      : downloadSingle
                  }
                />
              )}
            </div>

            {/* ALL FORMATS — live preview strip (the whole point, visible at once) */}
            <div className="brutalist-card" style={{ padding: 16, background: "#fff", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 900 }}>
                  <LayoutGrid size={14} />
                  ALL 9 FORMATS — LIVE PREVIEW
                </span>
                <span style={{ fontSize: "0.65rem", fontFamily: "monospace", fontWeight: 800, color: "#888" }}>
                  CLICK TO EDIT · ZIP EXPORTS ALL
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 6,
                }}
              >
                {PLATFORMS.map((p, i) => {
                  const isSelected = preset.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPreset(p);
                        resetTransform();
                      }}
                      style={{
                        flex: "0 0 auto",
                        border: `2.5px solid ${isSelected ? "#000" : "#e5e5e5"}`,
                        background: "#fff",
                        padding: 4,
                        cursor: "pointer",
                        boxShadow: isSelected ? "3px 3px 0 #000" : "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 96,
                      }}
                      title={`Edit ${p.label} (${p.aspectRatioLabel})`}
                    >
                      <canvas
                        ref={(el) => {
                          thumbsRef.current[i] = el;
                        }}
                        className="resizer-thumb-canvas"
                        style={{
                          height: 110,
                          width: "auto",
                          display: "block",
                          background: "#111",
                          borderRadius: p.safe ? 6 : 0,
                        }}
                      />
                      <div style={{ fontFamily: "monospace", fontSize: "0.6rem", fontWeight: 900, color: isSelected ? "#000" : "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.label}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.56rem", color: "#999", marginTop: -4 }}>
                        {p.aspectRatioLabel} · {p.width}×{p.height}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Platform Presets & Format Settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Social Platform Presets Grid */}
            <div className="brutalist-card" style={{ padding: 16, background: "#fff", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 900 }}>
                  SELECT SOCIAL TARGET
                </span>
                <span style={{ fontSize: "0.65rem", fontFamily: "monospace", fontWeight: 800, color: "#888" }}>
                  9 FORMATS
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {PLATFORMS.map((p) => {
                  const isSelected = preset.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPreset(p);
                        resetTransform();
                      }}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        border: `2px solid ${isSelected ? "#000" : "#e5e5e5"}`,
                        background: isSelected ? "#FFDD00" : "#fff",
                        color: "#000",
                        boxShadow: isSelected ? "2px 2px 0 #000" : "none",
                        fontWeight: 900,
                        fontSize: "0.74rem",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 900, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {p.label}
                        {p.safe && (
                          <span
                            style={{
                              fontSize: "0.52rem",
                              fontFamily: "monospace",
                              padding: "1px 4px",
                              border: "1px solid #000",
                              background: "#fff",
                            }}
                            title="Has native UI safe zones"
                          >
                            SZ
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: isSelected ? "#000" : "#666", marginTop: 2 }}>
                        {p.aspectRatioLabel} · {p.width}×{p.height}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="brutalist-card" style={{ padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 900 }}>
                  FILL &amp; BACKGROUND EFFECT
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", border: "2px solid #000", background: "#fff" }}>
                {([
                  { id: "blur-fill", label: "Blur" },
                  { id: "gradient", label: "Gradient" },
                  { id: "fill", label: "Crop" },
                  { id: "contain", label: "Solid" },
                ] as { id: FitMode; label: string }[]).map((m, idx, arr) => (
                  <button
                    key={m.id}
                    onClick={() => setFit(m.id)}
                    style={{
                      padding: "8px 2px",
                      border: "none",
                      borderRight: idx < arr.length - 1 ? "2px solid #000" : "none",
                      background: fit === m.id ? "#000" : "#fff",
                      color: fit === m.id ? "#FFE500" : "#000",
                      fontWeight: 900,
                      fontSize: "0.7rem",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Blur Intensity Slider (% of frame width — consistent across every format) */}
              {fit === "blur-fill" && (
                <div style={{ paddingTop: 4 }}>
                  <TactileScrubber
                    label="Blur Intensity"
                    min={0.8}
                    max={8}
                    step={0.2}
                    value={blurPercent}
                    onChange={(v) => setBlurPercent(v)}
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    showSteppers={false}
                  />
                </div>
              )}

              {/* Gradient Preset Swatches */}
              {fit === "gradient" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, paddingTop: 4 }}>
                  {GRADIENT_PRESETS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGradient(g)}
                      style={{
                        padding: "6px 8px",
                        border: `2px solid ${activeGradient.id === g.id ? "#000" : "#d4d4d8"}`,
                        background: `linear-gradient(135deg, ${g.colors.join(", ")})`,
                        color: "#fff",
                        textShadow: "0 1px 2px #000",
                        fontSize: "0.65rem",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        cursor: "pointer",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Solid Color Picker */}
              {fit === "contain" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 800 }}>Letterbox Color:</span>
                  <input
                    type="color"
                    value={letterbox}
                    onChange={(e) => setLetterbox(e.target.value)}
                    style={{ width: 48, height: 26, border: "2px solid #000", cursor: "pointer" }}
                  />
                </div>
              )}
            </div>

            {/* Brand Watermark — same engine as the Batch Watermark tool, baked into every export */}
            <div className="brutalist-card" style={{ padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* ── Header row ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 900 }}>
                  <Stamp size={14} />
                  BRAND WATERMARK
                </span>
                <button
                  onClick={() => setWmEnabled((v) => !v)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                    fontWeight: 900,
                    border: "2px solid #000",
                    background: wmEnabled ? "#000" : "#fff",
                    color: wmEnabled ? "#FFE500" : "#000",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  {wmEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {wmEnabled && (
                <>
                  {/* ── Group 1: Mode toggle ── */}
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["text", "logo"] as WatermarkMode[]).map((m, idx) => (
                      <button
                        key={m}
                        onClick={() => setWmMode(m)}
                        style={{
                          flex: 1,
                          padding: "9px 2px",
                          border: "none",
                          borderRight: idx === 0 ? "2px solid #000" : "none",
                          background: wmMode === m ? "#000" : "#fff",
                          color: wmMode === m ? "#FFE500" : "#000",
                          fontWeight: 900,
                          fontSize: "0.7rem",
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {m === "text" ? "Handle" : "Logo"}
                      </button>
                    ))}
                  </div>

                  {/* ── Divider ── */}
                  <div style={{ borderTop: "1.5px dashed #d4d4d8", margin: "14px 0" }} />

                  {/* ── Group 2: Text / Logo input ── */}
                  {wmMode === "text" ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={wmText}
                        onChange={(e) => setWmText(e.target.value)}
                        placeholder="@yourhandle"
                        style={{ flex: 1, border: "2px solid #000", background: "#fff", padding: "8px 10px", fontSize: "0.78rem", fontFamily: "monospace", outline: "none", color: "#000" }}
                      />
                      <input
                        type="color"
                        value={wmColor}
                        onChange={(e) => setWmColor(e.target.value)}
                        style={{ width: 40, height: 36, border: "2px solid #000", cursor: "pointer" }}
                        title="Watermark color"
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button onClick={() => wmLogoInputRef.current?.click()} className="brutalist-button" style={{ fontSize: "0.7rem", padding: "8px 10px", justifyContent: "center" }}>
                        {wmLogoName ? `Logo: ${wmLogoName.slice(0, 22)}` : "Choose logo…"}
                      </button>
                      <input
                        ref={wmLogoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          handleWmLogoUpload(e.target.files?.[0]);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  )}

                  {/* ── Divider ── */}
                  <div style={{ borderTop: "1.5px dashed #d4d4d8", margin: "14px 0" }} />

                  {/* ── Group 3: Position + Size + Fade ── */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {/* Position grid */}
                    <div>
                      <div style={{ fontSize: "0.6rem", fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.06em", color: "#666", marginBottom: 6 }}>POSITION</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, width: 108 }}>
                        {WATERMARK_POSITIONS.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => setWmPosition(p.key)}
                            style={{
                              padding: "6px 0",
                              border: `1.5px solid ${wmPosition === p.key ? "#000" : "#d4d4d8"}`,
                              background: wmPosition === p.key ? "#FFE500" : "#fff",
                              fontWeight: 900,
                              fontSize: "0.58rem",
                              fontFamily: "monospace",
                              cursor: "pointer",
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size + Fade scrubbers */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: "0.6rem", fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.06em", color: "#666", marginBottom: 2 }}>SIZE &amp; FADE</div>
                      <TactileScrubber
                        label="Size"
                        min={2}
                        max={12}
                        step={0.5}
                        value={wmSize}
                        onChange={(v) => setWmSize(v)}
                        formatValue={(v) => `${v}%`}
                        height={12}
                        showSteppers={false}
                      />
                      <TactileScrubber
                        label="Fade"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={wmOpacity}
                        onChange={(v) => setWmOpacity(v)}
                        formatValue={(v) => `${Math.round(v * 100)}%`}
                        height={12}
                        showSteppers={false}
                      />
                    </div>
                  </div>

                  {/* ── Footer note ── */}
                  <div style={{ marginTop: 14, padding: "8px 10px", background: "#f4f4f5", borderLeft: "3px solid #000" }}>
                    <span style={{ fontSize: "0.6rem", fontFamily: "monospace", color: "#555", fontWeight: 700 }}>
                      Stamped onto every format, video frame &amp; ZIP — remembered for next visit.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Export File Format */}
            <div className="brutalist-card" style={{ padding: 16, background: "#fff", gap: 10 }}>
              <span style={{ fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 900 }}>
                EXPORT IMAGE FORMAT
              </span>

              <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                {(["png", "jpg", "webp"] as OutFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: "none",
                      borderRight: f !== "webp" ? "2px solid #000" : "none",
                      background: format === f ? "#000" : "#fff",
                      color: format === f ? "#FFE500" : "#000",
                      fontWeight: 900,
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Lossy quality slider */}
              {format !== "png" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <TactileScrubber
                    label="Quality"
                    min={0.5}
                    max={1}
                    step={0.02}
                    value={quality}
                    onChange={(v) => setQuality(v)}
                    formatValue={(v) => `${Math.round(v * 100)}`}
                    showSteppers={false}
                  />
                </div>
              )}

              {isVideo && (
                <div style={{ fontSize: "0.64rem", fontFamily: "monospace", color: "#666", fontWeight: 700, lineHeight: 1.6 }}>
                  Video export renders a frame-accurate H.264 MP4 at 30fps via WebCodecs — original audio
                  included when the browser can decode it. Frame captures and the ZIP always use the format
                  selected above.
                  {exportNote && <span style={{ display: "block", color: "#000", fontWeight: 900 }}>Last export: {exportNote}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}