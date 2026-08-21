"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Image,
  FileText,
  SlidersHorizontal,
  Plus,
  Sparkles,
  Settings,
  Trash2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import DotLoader from "@/components/DotLoader";
import FontPicker from "@/components/FontPicker";
import ExportButton from "@/components/ExportButton";

const FONTS = [
  "Inter",
  "Playfair Display",
  "Bebas Neue",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Roboto Condensed",
  "Abril Fatface",
  "Pacifico",
  "Space Grotesk",
];

const FONT_WEIGHTS = [400, 600, 700, 800, 900];

const STORAGE_KEY = "creatorkit:text-behind:v1";

interface TextLayer {
  id: string;
  text: string;
  font: string;
  fontWeight: number;
  fontSize: number;
  textColor: string;
  textOpacity: number;
  textX: number;
  textY: number;
  rotation: number;
  align: "left" | "center" | "right";
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isExpanded: boolean;
}

type CutModel = "isnet_fp16" | "isnet_quint8";

const DEFAULT_LAYER: TextLayer = {
  id: "layer-1",
  text: "text",
  font: "Inter",
  fontWeight: 900,
  fontSize: 200,
  textColor: "#ffffff",
  textOpacity: 1,
  textX: 0.5,
  textY: 0.5,
  rotation: 0,
  align: "center",
  isBold: true,
  isItalic: false,
  isUnderline: false,
  isExpanded: true,
};

export default function TextBehindImagePage() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [subjectSrc, setSubjectSrc] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab switch
  const [activeTab, setActiveTab] = useState<"text" | "image" | "settings">("text");

  // Text layers state
  const [textLayers, setTextLayers] = useState<TextLayer[]>([DEFAULT_LAYER]);

  // Image adjustment controls
  const [imageRotation, setImageRotation] = useState(0);
  const [imageBrightness, setImageBrightness] = useState(100);
  const [imageContrast, setImageContrast] = useState(100);
  const [imageEnhanced, setImageEnhanced] = useState(false);

  // Settings
  const [aspectRatio, setAspectRatio] = useState<"original" | "1:1" | "16:9" | "9:16">("original");

  // Cut quality for local background removal
  const [cutModel, setCutModel] = useState<CutModel>("isnet_fp16");

  // Track rendered canvas buffer size for distortion-free preview sizing
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const subjectImgRef = useRef<HTMLImageElement | null>(null);
  const layerIdRef = useRef(0);

  const nextLayerId = () => `layer-${++layerIdRef.current}`;

  // localStorage persistence
  const hydratedRef = useRef(false);
  const restoreRef = useRef(false);
  const persistImageRef = useRef<{ original: string | null; subject: string | null }>({
    original: null,
    subject: null,
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const origImg = originalImgRef.current;
    if (!canvas || !origImg) return;

    const W = origImg.naturalWidth;
    const H = origImg.naturalHeight;

    // Swap dimensions only for exact 90°/270°; otherwise keep the original axes
    const rot = ((imageRotation % 360) + 360) % 360;
    const isRotated90 = rot % 90 === 0 && rot % 180 !== 0;
    const renderW = isRotated90 ? H : W;
    const renderH = isRotated90 ? W : H;

    // Apply aspect ratio cropping
    let canvasW = renderW;
    let canvasH = renderH;
    if (aspectRatio === "1:1") {
      const size = Math.min(renderW, renderH);
      canvasW = size;
      canvasH = size;
    } else if (aspectRatio === "16:9") {
      canvasW = renderW;
      canvasH = Math.round(renderW * (9 / 16));
    } else if (aspectRatio === "9:16") {
      canvasH = renderH;
      canvasW = Math.round(renderH * (9 / 16));
    }

    canvas.width = canvasW;
    canvas.height = canvasH;
    setCanvasDims({ w: canvasW, h: canvasH });

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const drawAdjustedImage = (img: HTMLImageElement) => {
      ctx.save();
      // Apply filters
      let filters = `brightness(${imageBrightness}%) contrast(${imageContrast}%)`;
      if (imageEnhanced) {
        filters += " saturate(130%) contrast(110%)";
      }
      ctx.filter = filters;

      // Translate, rotate and scale to cover canvas crop area (rotated bounding box)
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);

      const rad = (imageRotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const extW = W * cos + H * sin;
      const extH = W * sin + H * cos;
      const scale = Math.max(canvasW / extW, canvasH / extH);
      const drawW = W * scale;
      const drawH = H * scale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };

    // Layer 1: background image
    drawAdjustedImage(origImg);

    // Layer 2: all text layers in order
    textLayers.forEach((layer) => {
      ctx.save();

      const tx = canvasW * layer.textX;
      const ty = canvasH * layer.textY;

      ctx.translate(tx, ty);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      const italicPrefix = layer.isItalic ? "italic " : "";
      const boldPrefix = layer.isBold ? "bold " : "";
      ctx.font = `${italicPrefix}${boldPrefix}${layer.fontSize}px '${layer.font}'`;
      ctx.fillStyle = layer.textColor;
      ctx.globalAlpha = layer.textOpacity;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "middle";

      ctx.fillText(layer.text, 0, 0);

      // Underline logic
      if (layer.isUnderline) {
        const textWidth = ctx.measureText(layer.text).width;
        let underlineX = -textWidth / 2;
        if (layer.align === "left") underlineX = 0;
        else if (layer.align === "right") underlineX = -textWidth;

        ctx.strokeStyle = layer.textColor;
        ctx.lineWidth = Math.max(2, layer.fontSize / 15);
        ctx.beginPath();
        ctx.moveTo(underlineX, layer.fontSize / 2);
        ctx.lineTo(underlineX + textWidth, layer.fontSize / 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // Layer 3: foreground subject mask
    if (subjectImgRef.current) {
      drawAdjustedImage(subjectImgRef.current);
    }
  }, [textLayers, aspectRatio, imageRotation, imageBrightness, imageContrast, imageEnhanced]);

  useEffect(() => {
    if (originalSrc) render();
  }, [render, originalSrc, subjectSrc]);

  // Handle dynamic loading of Google fonts when layers change font family
  useEffect(() => {
    textLayers.forEach((layer) => {
      const slug = layer.font.replace(/ /g, "+");
      const weights = FONT_WEIGHTS.join(";");
      const linkId = `gfont-${slug}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${slug}:wght@${weights}&display=swap`;
        document.head.appendChild(link);
      }
    });
    document.fonts.ready.then(() => render());
  }, [textLayers, render]);

  // Restore the previous session from localStorage (runs once on mount)
  useEffect(() => {
    if (restoreRef.current) return;
    restoreRef.current = true;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.originalSrc === "string") persistImageRef.current.original = saved.originalSrc;
      if (typeof saved.subjectSrc === "string") persistImageRef.current.subject = saved.subjectSrc;
      const load = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("load failed"));
          img.src = url;
        });
      const hydrate = async () => {
        try {
          let subjectOk = false;
          if (typeof saved.subjectSrc === "string") {
            try {
              subjectImgRef.current = await load(saved.subjectSrc);
              subjectOk = true;
            } catch {
              subjectImgRef.current = null;
              persistImageRef.current.subject = null;
            }
          }
          let origOk = false;
          if (typeof saved.originalSrc === "string") {
            try {
              originalImgRef.current = await load(saved.originalSrc);
              origOk = true;
            } catch {
              originalImgRef.current = null;
              persistImageRef.current.original = null;
            }
          }
          if (Array.isArray(saved.textLayers) && saved.textLayers.length) {
            setTextLayers(saved.textLayers);
          }
          if (typeof saved.imageRotation === "number") setImageRotation(saved.imageRotation);
          if (typeof saved.imageBrightness === "number") setImageBrightness(saved.imageBrightness);
          if (typeof saved.imageContrast === "number") setImageContrast(saved.imageContrast);
          setImageEnhanced(!!saved.imageEnhanced);
          const aspects = ["original", "1:1", "16:9", "9:16"] as const;
          if (aspects.includes(saved.aspectRatio)) {
            setAspectRatio(saved.aspectRatio as (typeof aspects)[number]);
          }
          if (saved.cutModel === "isnet_fp16" || saved.cutModel === "isnet_quint8") {
            setCutModel(saved.cutModel);
          }
          if (origOk) setOriginalSrc(saved.originalSrc);
          if (subjectOk) setSubjectSrc(saved.subjectSrc);
          if (origOk) render();
        } catch {
          // Corrupt payload — ignore and start fresh
        }
      };
      hydrate();
    } catch {
      // Corrupt payload — ignore and start fresh
    }
  }, [render]);

  // Persist the session to localStorage (skips the pre-hydration mount)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const { original, subject } = persistImageRef.current;
    const payload = {
      v: 1,
      originalSrc: original,
      subjectSrc: subject,
      textLayers,
      imageRotation,
      imageBrightness,
      imageContrast,
      imageEnhanced,
      aspectRatio,
      cutModel,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, subjectSrc: null }));
      } catch {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...payload, originalSrc: null, subjectSrc: null })
          );
        } catch {
          // Storage full even without images — nothing more we can do
        }
      }
    }
  }, [textLayers, imageRotation, imageBrightness, imageContrast, imageEnhanced, aspectRatio, cutModel, originalSrc, subjectSrc]);

  const attachSubject = (url: string) => {
    setSubjectSrc(url);
    const subjectImg = new Image();
    subjectImg.onload = () => {
      subjectImgRef.current = subjectImg;
      persistImageRef.current.subject = toPersistableSubject(subjectImg);
      render();
    };
    subjectImg.src = url;
  };

  const downscaleForUpload = (img: HTMLImageElement, maxDim = 2048): string | null => {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1) return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const toPersistableSubject = (img: HTMLImageElement): string | null => {
    const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  };

  const runInBrowserRemoval = async (src: string, model: CutModel = "isnet_fp16") => {
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      let blob: Blob | null = null;
      for (let attempt = 0; attempt < 2 && !blob; attempt++) {
        try {
          blob = await removeBackground(src, { model, proxyToWorker: true });
        } catch (err) {
          console.warn(`in-browser removal attempt ${attempt + 1} failed`, err);
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (!blob) throw new Error("in-browser removal failed");
      attachSubject(URL.createObjectURL(blob));
      setError(null);
      return true;
    } catch (err) {
      console.error(err);
      setError("Background removal failed. Visual layers will render flat.");
      return false;
    }
  };

  const processBackground = async (dataUrl: string, img: HTMLImageElement) => {
    setIsRemoving(true);
    const removalTimer = setTimeout(() => {
      setIsRemoving(false);
      setError("Processing took too long. Showing the original image instead.");
    }, 30000);

    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: downscaleForUpload(img) ?? dataUrl }),
      });

      if (res.ok) {
        attachSubject(URL.createObjectURL(await res.blob()));
      } else {
        const data = await res.json().catch(() => null);
        const message = data?.error?.message ?? `Server error (${res.status}).`;
        if (res.status === 500 && message.includes("HUGGINGFACE_API_KEY")) {
          setError(`${message} In the meantime, trying the in-browser fallback...`);
        } else if (message.toLowerCase().includes("in-browser")) {
          setError(message);
        } else {
          setError(`${message} Trying the in-browser fallback...`);
        }
        await runInBrowserRemoval(downscaleForUpload(img, 1536) ?? dataUrl, cutModel);
      }
    } catch (err) {
      console.error(err);
      setError("Could not reach the AI service. Trying the in-browser fallback...");
      await runInBrowserRemoval(downscaleForUpload(img, 1536) ?? dataUrl, cutModel);
    } finally {
      clearTimeout(removalTimer);
      setIsRemoving(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    setSubjectSrc(null);
    subjectImgRef.current = null;
    persistImageRef.current.subject = null;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        originalImgRef.current = img;
        const src = String(reader.result);
        persistImageRef.current.original = downscaleForUpload(img, 2048) ?? src;
        setOriginalSrc(src);
        render();
        processBackground(src, img);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const toggleExpandLayer = (id: string) => {
    setTextLayers((prev) => prev.map((l) => (l.id === id ? { ...l, isExpanded: !l.isExpanded } : l)));
  };

  const addNewLayer = () => {
    const newL: TextLayer = {
      ...DEFAULT_LAYER,
      id: nextLayerId(),
      text: "text",
      textY: 0.6,
      fontSize: Math.round((textLayers[0]?.fontSize ?? 160) * 0.8),
      isExpanded: true,
    };
    setTextLayers((prev) => prev.map((l) => ({ ...l, isExpanded: false })).concat(newL));
  };

  const duplicateLayer = (id: string) => {
    const source = textLayers.find((l) => l.id === id);
    if (!source) return;
    const clone: TextLayer = {
      ...source,
      id: nextLayerId(),
      textX: Math.min(0.9, source.textX + 0.05),
      textY: Math.min(0.9, source.textY + 0.05),
      isExpanded: true,
    };
    setTextLayers((prev) => prev.map((l) => ({ ...l, isExpanded: false })).concat(clone));
  };

  const removeLayer = (id: string) => {
    if (textLayers.length <= 1) return;
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const download = (exportFmt: "image/png" | "image/jpeg" | "image/webp") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ext = exportFmt === "image/png" ? "png" : exportFmt === "image/jpeg" ? "jpg" : "webp";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `creatorkit-text-behind.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      exportFmt,
      exportFmt === "image/png" ? undefined : 0.92
    );
  };

  const reset = () => {
    setOriginalSrc(null);
    setSubjectSrc(null);
    subjectImgRef.current = null;
    originalImgRef.current = null;
    persistImageRef.current = { original: null, subject: null };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — nothing to clear
    }
    setError(null);
    setTextLayers([DEFAULT_LAYER]);
    setImageRotation(0);
    setImageBrightness(100);
    setImageContrast(100);
    setImageEnhanced(false);
    setAspectRatio("original");
  };

  const rotateImage = (delta: number) => {
    setImageRotation((prev) => (prev + delta + 360) % 360);
  };

  const tabs = [
    { id: "text" as const, label: "Text", icon: FileText },
    { id: "image" as const, label: "Image", icon: SlidersHorizontal },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div className="grid-bg" />

      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Header Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
              <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
            </Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                  Text Behind Image
                </h1>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                  AI Core
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
                Isolate subjects using in-browser machine learning and layer gorgeous typography behind them.
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Grid */}
        {!originalSrc ? (
          /* Dropzone */
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className="brutalist-card dropzone-panel"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              border: `4px dashed ${isDragging ? "var(--accent)" : "#000000"}`,
              background: isDragging ? "rgba(94, 155, 198, 0.02)" : "#ffffff",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                border: "3px solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                background: "#ffffff",
                boxShadow: "4px 4px 0 #000000",
              }}
            >
              <Image size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Drag and drop an image
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              Works entirely inside your web browser. No files are uploaded to servers. Supports PNG, JPG, and WebP assets.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          /* Editor Layout */
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start", flex: 1 }}>
            {/* Left: Main Viewport */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {error && (
                <div
                  style={{
                    padding: "16px 20px",
                    border: "3px solid #b91c1c",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    boxShadow: "4px 4px 0 rgba(185, 28, 28, 0.25)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Viewport Frame */}
              <div className="checkerboard" style={{ border: "4px solid #000000", position: "relative", background: "#ffffff", boxShadow: "6px 6px 0 #000000", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, minHeight: 320 }}>
                {isRemoving && <DotLoader message="Processing Image" />}
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 300px)",
                    width: "auto",
                    height: "auto",
                    aspectRatio:
                      canvasDims.w && canvasDims.h
                        ? `${canvasDims.w} / ${canvasDims.h}`
                        : "auto",
                    display: "block",
                    border: "3px solid #000000",
                    boxShadow: "3px 3px 0 #000000",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Under-canvas toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {(["original", "1:1", "16:9", "9:16"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAspectRatio(a)}
                      style={{
                        padding: "6px 10px",
                        border: "2px solid #000",
                        background: aspectRatio === a ? "var(--accent)" : "#ffffff",
                        color: aspectRatio === a ? "#ffffff" : "#000000",
                        fontFamily: "monospace",
                        fontWeight: 900,
                        fontSize: "0.66rem",
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      {a === "original" ? "Fit" : a}
                    </button>
                  ))}
                  <button
                    className="brutalist-button"
                    onClick={() => rotateImage(90)}
                    style={{ fontSize: "0.72rem", padding: "6px 12px", fontFamily: "monospace", fontWeight: 900 }}
                  >
                    Rotate 90°
                  </button>
                  <button
                    className="brutalist-button"
                    onClick={() => {
                      if (originalImgRef.current && originalSrc) {
                        processBackground(originalSrc, originalImgRef.current);
                      }
                    }}
                    style={{ fontSize: "0.72rem", padding: "6px 12px", fontFamily: "monospace", fontWeight: 900 }}
                  >
                    <RefreshCw size={13} style={{ marginRight: 4 }} />
                    Re-cut
                  </button>
                  <button
                    className="brutalist-button"
                    onClick={() => download("image/png")}
                    style={{ fontSize: "0.72rem", padding: "6px 12px", fontFamily: "monospace", fontWeight: 900 }}
                  >
                    Download
                  </button>
                </div>
                <button
                  className="brutalist-button brutalist-button-red"
                  onClick={reset}
                  style={{ fontSize: "0.72rem", padding: "6px 12px", fontFamily: "monospace", fontWeight: 900 }}
                >
                  New Image
                </button>
              </div>
            </div>

            {/* Right: Settings Sidebar */}
            <div className="tool-sidebar tool-scroll" style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "calc(100vh - 250px)" }}>
              {/* Tab switcher */}
              <div style={{ display: "flex", border: "3px solid #000000", background: "#000000", boxShadow: "4px 4px 0 rgba(0,0,0,0.15)" }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 6px",
                        border: "none",
                        background: isActive ? "#000000" : "#ffffff",
                        color: isActive ? "#ffffff" : "#000000",
                        fontWeight: 900,
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        borderRight: tab.id === "settings" ? "none" : "3px solid #000",
                      }}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TEXT TAB */}
              {activeTab === "text" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <button className="brutalist-button" onClick={addNewLayer} style={{ fontSize: "0.72rem", padding: "7px 12px", fontFamily: "monospace", fontWeight: 900 }}>
                      <Plus size={14} style={{ marginRight: 4 }} /> Add Layer
                    </button>
                  </div>

                  {textLayers.map((layer, idx) => (
                    <div key={layer.id} className="brutalist-card" style={{ padding: 0, overflow: "hidden" }}>
                      {/* Layer header */}
                      <div
                        onClick={() => toggleExpandLayer(layer.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: layer.isExpanded ? "2px solid #000" : "none",
                          background: layer.isExpanded ? "#f4f4f4" : "#ffffff",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 900,
                              fontFamily: "monospace",
                              padding: "3px 7px",
                              border: "2px solid #000",
                              background: "#ffffff",
                              color: "#000",
                            }}
                          >
                            Text {idx + 1}
                          </span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#666", fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {layer.text || "empty"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateLayer(layer.id);
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#000", fontSize: "0.85rem", fontWeight: 900, padding: 4, opacity: 0.7 }}
                            title="Duplicate layer"
                          >
                            ⧉
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLayer(layer.id);
                            }}
                            disabled={textLayers.length <= 1}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", padding: 4, opacity: textLayers.length <= 1 ? 0.3 : 0.8 }}
                            title="Delete layer"
                          >
                            <Trash2 size={14} />
                          </button>
                          <span style={{ fontSize: "0.8rem", fontWeight: 900, transform: layer.isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                            ▾
                          </span>
                        </div>
                      </div>

                      {/* Expanded controls */}
                      {layer.isExpanded && (
                        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                          <input
                            type="text"
                            value={layer.text}
                            onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
                            placeholder="Type your text…"
                            style={{ padding: "8px 10px", fontSize: "0.85rem", border: "2px solid #000", boxShadow: "none", width: "100%", outline: "none", color: "#000", fontWeight: 600 }}
                          />

                          {/* Alignment + styles */}
                          <div style={{ display: "flex", gap: 6 }}>
                            {(["left", "center", "right"] as const).map((a) => (
                              <button
                                key={a}
                                onClick={() => updateLayer(layer.id, { align: a })}
                                style={{
                                  flex: 1,
                                  padding: "7px",
                                  border: "2px solid #000",
                                  background: layer.align === a ? "#000000" : "#ffffff",
                                  color: layer.align === a ? "#ffffff" : "#000000",
                                  fontFamily: "monospace",
                                  fontWeight: 900,
                                  fontSize: "0.66rem",
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                }}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {[
                              { key: "isBold", label: "B" },
                              { key: "isItalic", label: "I" },
                              { key: "isUnderline", label: "U" },
                            ].map((t) => (
                              <button
                                key={t.key}
                                onClick={() => updateLayer(layer.id, { [t.key]: !layer[t.key as "isBold"] } as Partial<TextLayer>)}
                                style={{
                                  flex: 1,
                                  padding: "7px",
                                  border: "2px solid #000",
                                  background: layer[t.key as "isBold"] ? "#000000" : "#ffffff",
                                  color: layer[t.key as "isBold"] ? "#ffffff" : "#000000",
                                  fontWeight: 900,
                                  fontSize: "0.85rem",
                                  fontFamily: "monospace",
                                  cursor: "pointer",
                                }}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* Font Size */}
                          <div className="slider-row">
                            <label>Font Size</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div className="slider-content" style={{ flex: 1 }}>
                                <div className="slider-wrapper">
                                  <input
                                    className="custom-slider"
                                    type="range"
                                    min={10}
                                    max={800}
                                    step={2}
                                    value={Math.min(layer.fontSize, 800)}
                                    onChange={(e) => updateLayer(layer.id, { fontSize: Number(e.target.value) })}
                                  />
                                </div>
                                <div className="slider-divider" />
                                <span className="slider-value">{layer.fontSize}</span>
                              </div>
                              <input
                                type="number"
                                min={10}
                                max={2000}
                                value={layer.fontSize}
                                onChange={(e) => updateLayer(layer.id, { fontSize: Math.max(10, Math.min(2000, Number(e.target.value))) })}
                                style={{ width: 58, border: "2px solid #000", padding: "6px 8px", fontFamily: "monospace", fontWeight: 800, fontSize: "0.8rem", outline: "none", boxShadow: "none", color: "#000" }}
                              />
                            </div>
                          </div>

                          {/* Font Family */}
                          <div>
                            <label className="ctrl-label" style={{ display: "block", marginBottom: 6 }}>Font Family</label>
                            <FontPicker
                              id={`font-${layer.id}`}
                              value={layer.font}
                              fallbackFonts={FONTS}
                              onChange={(value) => updateLayer(layer.id, { font: value })}
                            />
                          </div>

                          {/* Color */}
                          <div>
                            <label className="ctrl-label" style={{ display: "block", marginBottom: 6 }}>Color</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="color"
                                value={layer.textColor}
                                onChange={(e) => updateLayer(layer.id, { textColor: e.target.value })}
                                style={{ width: 42, height: 34, border: "2px solid #000", padding: 2, background: "#fff", cursor: "pointer" }}
                              />
                              <input
                                type="text"
                                value={layer.textColor}
                                onChange={(e) => updateLayer(layer.id, { textColor: e.target.value })}
                                style={{ flex: 1, padding: "6px 8px", fontSize: "0.78rem", border: "2px solid #000", boxShadow: "none", width: 90, textAlign: "center", outline: "none", color: "#000", fontFamily: "monospace", fontWeight: 800, textTransform: "uppercase" }}
                              />
                            </div>
                          </div>

                          {/* Opacity */}
                          <div className="slider-row">
                            <label>Opacity</label>
                            <div className="slider-content">
                              <div className="slider-wrapper">
                                <input
                                  className="custom-slider"
                                  type="range"
                                  min={5}
                                  max={100}
                                  value={Math.round(layer.textOpacity * 100)}
                                  onChange={(e) => updateLayer(layer.id, { textOpacity: Number(e.target.value) / 100 })}
                                />
                              </div>
                              <div className="slider-divider" />
                              <span className="slider-value">{Math.round(layer.textOpacity * 100)}%</span>
                            </div>
                          </div>

                          {/* Rotation */}
                          <div className="slider-row">
                            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              Rotation
                              <button
                                onClick={() => updateLayer(layer.id, { rotation: 0 })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: "0.62rem", fontWeight: 900, fontFamily: "monospace" }}
                              >
                                RESET
                              </button>
                            </label>
                            <div className="slider-content">
                              <div className="slider-wrapper">
                                <input
                                  className="custom-slider"
                                  type="range"
                                  min={-180}
                                  max={180}
                                  value={layer.rotation}
                                  onChange={(e) => updateLayer(layer.id, { rotation: Number(e.target.value) })}
                                />
                              </div>
                              <div className="slider-divider" />
                              <span className="slider-value">{layer.rotation}°</span>
                            </div>
                          </div>

                          {/* Position */}
                          <div className="slider-row">
                            <label>X Position</label>
                            <div className="slider-content">
                              <div className="slider-wrapper">
                                <input
                                  className="custom-slider"
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={layer.textX}
                                  onChange={(e) => updateLayer(layer.id, { textX: Number(e.target.value) })}
                                />
                              </div>
                              <div className="slider-divider" />
                              <span className="slider-value">{Math.round(layer.textX * 100)}</span>
                            </div>
                          </div>
                          <div className="slider-row">
                            <label>Y Position</label>
                            <div className="slider-content">
                              <div className="slider-wrapper">
                                <input
                                  className="custom-slider"
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={layer.textY}
                                  onChange={(e) => updateLayer(layer.id, { textY: Number(e.target.value) })}
                                />
                              </div>
                              <div className="slider-divider" />
                              <span className="slider-value">{Math.round(layer.textY * 100)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* IMAGE TAB */}
              {activeTab === "image" && (
                <div className="brutalist-card" style={{ padding: 20, gap: 18 }}>
                  <div className="slider-row">
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      Rotation
                      <button
                        onClick={() => setImageRotation(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: "0.62rem", fontWeight: 900, fontFamily: "monospace" }}
                      >
                        RESET
                      </button>
                    </label>
                    <div className="slider-content">
                      <div className="slider-wrapper">
                        <input
                          className="custom-slider"
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={imageRotation}
                          onChange={(e) => setImageRotation(Number(e.target.value))}
                        />
                      </div>
                      <div className="slider-divider" />
                      <span className="slider-value">{imageRotation}°</span>
                    </div>
                  </div>

                  <div className="slider-row">
                    <label>Brightness</label>
                    <div className="slider-content">
                      <div className="slider-wrapper">
                        <input
                          className="custom-slider"
                          type="range"
                          min={20}
                          max={180}
                          value={imageBrightness}
                          onChange={(e) => setImageBrightness(Number(e.target.value))}
                        />
                      </div>
                      <div className="slider-divider" />
                      <span className="slider-value">{imageBrightness}%</span>
                    </div>
                  </div>

                  <div className="slider-row">
                    <label>Contrast</label>
                    <div className="slider-content">
                      <div className="slider-wrapper">
                        <input
                          className="custom-slider"
                          type="range"
                          min={50}
                          max={160}
                          value={imageContrast}
                          onChange={(e) => setImageContrast(Number(e.target.value))}
                        />
                      </div>
                      <div className="slider-divider" />
                      <span className="slider-value">{imageContrast}%</span>
                    </div>
                  </div>

                  <button
                    className="brutalist-button"
                    onClick={() => setImageEnhanced((v) => !v)}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      fontSize: "0.76rem",
                      padding: "10px",
                      background: imageEnhanced ? "var(--accent)" : "#ffffff",
                      color: imageEnhanced ? "#ffffff" : "#000000",
                      margin: 0,
                    }}
                  >
                    <Sparkles size={15} style={{ marginRight: 6 }} />
                    {imageEnhanced ? "Enhanced — On" : "Enhance Colors"}
                  </button>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <>
                  <div className="brutalist-card" style={{ padding: 20, gap: 14 }}>
                    <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#000" }}>Aspect Ratio</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(["original", "1:1", "16:9", "9:16"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setAspectRatio(a)}
                          style={{
                            padding: "10px 8px",
                            border: "2px solid #000",
                            background: aspectRatio === a ? "#000000" : "#ffffff",
                            color: aspectRatio === a ? "#ffffff" : "#000000",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          {a === "original" ? "Original" : a}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-hint)", fontFamily: "monospace", fontWeight: 700, lineHeight: 1.5 }}>
                      Export size follows the crop shown in the preview. PNG keeps transparency of the cut subject.
                    </div>
                  </div>

                  <div className="brutalist-card" style={{ padding: 20, gap: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#000" }}>Subject Cut</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(["isnet_fp16", "isnet_quint8"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setCutModel(m)}
                          style={{
                            padding: "10px 8px",
                            border: "2px solid #000",
                            background: cutModel === m ? "#000000" : "#ffffff",
                            color: cutModel === m ? "#ffffff" : "#000000",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          {m === "isnet_fp16" ? "Best" : "Fast"}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-hint)", fontFamily: "monospace", fontWeight: 700, lineHeight: 1.5 }}>
                      Best = sharper edges (~40MB model). Fast = half the size, quicker cuts. Applies on the next Re-cut.
                    </div>
                  </div>

                  <div className="brutalist-card" style={{ padding: 20, gap: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#000" }}>Export</div>
                    <ExportButton
                      onExportPNG={() => download("image/png")}
                      onExportJPEG={() => download("image/jpeg")}
                      onExportWebP={() => download("image/webp")}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}