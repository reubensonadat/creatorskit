"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Image as ImageIcon, FolderArchive, Layers, Sliders } from "lucide-react";
import JSZip from "jszip";

type FitMode = "blur-fill" | "fill" | "contain";
type OutFormat = "png" | "jpg" | "webp";

interface PlatformPreset {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
}

const PLATFORMS: PlatformPreset[] = [
  { id: "tiktok", label: "TikTok", hint: "9:16", width: 1080, height: 1920 },
  { id: "reels", label: "IG Reels / Story", hint: "9:16", width: 1080, height: 1920 },
  { id: "shorts", label: "YouTube Shorts", hint: "9:16", width: 1080, height: 1920 },
  { id: "ig-feed", label: "IG Feed Square", hint: "1:1", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "IG Feed Portrait", hint: "4:5", width: 1080, height: 1350 },
  { id: "yt-thumb", label: "YouTube Thumbnail", hint: "16:9", width: 1280, height: 720 },
  { id: "pinterest", label: "Pinterest", hint: "2:3", width: 1000, height: 1500 },
  { id: "linkedin", label: "LinkedIn Post", hint: "1.91:1", width: 1200, height: 627 },
  { id: "xpost", label: "X / Twitter Post", hint: "16:9", width: 1600, height: 900 },
];

export default function ResizerPage() {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [sourceInfo, setSourceInfo] = useState("");
  const [fileName, setFileName] = useState("image");
  const [preset, setPreset] = useState<PlatformPreset>(PLATFORMS[0]);
  const [fit, setFit] = useState<FitMode>("blur-fill");
  const [letterbox, setLetterbox] = useState("#000000");
  const [blurAmount, setBlurAmount] = useState(30);
  const [format, setFormat] = useState<OutFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [downloaded, setDownloaded] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Render canvas with Blur Pillarbox / Fill / Contain
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = preset.width;
    const H = preset.height;
    canvas.width = W;
    canvas.height = H;

    const sAspect = source.naturalWidth / source.naturalHeight;
    const tAspect = W / H;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (fit === "blur-fill") {
      // 1. Draw Blurred Zoomed Background (Pillarbox/Letterbox Fill)
      let bgW: number, bgH: number, bgX: number, bgY: number;
      if (sAspect > tAspect) {
        bgH = H;
        bgW = H * sAspect;
      } else {
        bgW = W;
        bgH = W / sAspect;
      }
      bgX = (W - bgW) / 2;
      bgY = (H - bgH) / 2;

      ctx.save();
      ctx.filter = `blur(${blurAmount}px) brightness(0.65)`;
      ctx.drawImage(source, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
      ctx.restore();

      // 2. Draw Foreground Contained Subject with Cinema Drop Shadow
      let fgW: number, fgH: number, fgX: number, fgY: number;
      if (sAspect > tAspect) {
        fgW = W;
        fgH = W / sAspect;
      } else {
        fgH = H;
        fgW = H * sAspect;
      }
      fgX = (W - fgW) / 2;
      fgY = (H - fgH) / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(source, fgX, fgY, fgW, fgH);
      ctx.restore();
    } else if (fit === "fill") {
      // Direct Crop Fill
      let dw: number, dh: number, dx: number, dy: number;
      if (sAspect > tAspect) {
        dh = H;
        dw = H * sAspect;
      } else {
        dw = W;
        dh = W / sAspect;
      }
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(source, dx, dy, dw, dh);
    } else {
      // Solid Color Letterbox
      let dw: number, dh: number, dx: number, dy: number;
      if (sAspect > tAspect) {
        dw = W;
        dh = W / sAspect;
      } else {
        dh = H;
        dw = H * sAspect;
      }
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
      ctx.fillStyle = letterbox;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(source, dx, dy, dw, dh);
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [source, preset, fit, letterbox, blurAmount]);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setSource(img);
        setSourceInfo(`${img.naturalWidth} × ${img.naturalHeight}px · ${(f.size / 1024).toFixed(0)} KB`);
        setFileName(f.name.replace(/\.[^.]+$/, ""));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
  };

  // Load Unsplash creator photography sample
  const loadDemoImage = () => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setSource(img);
      setSourceInfo("1280 × 1920px · Unsplash Studio Portrait");
      setFileName("creator-portrait-demo");
    };
    img.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1280&auto=format&fit=crop";
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}-${preset.id}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        window.setTimeout(() => setDownloaded(false), 1600);
      },
      mime,
      quality
    );
  };

  const downloadAllZip = async () => {
    if (!source) return;
    setIsZipping(true);
    const zip = new JSZip();

    for (const p of PLATFORMS) {
      const c = document.createElement("canvas");
      c.width = p.width;
      c.height = p.height;
      const ctx = c.getContext("2d");
      if (!ctx) continue;

      const sAspect = source.naturalWidth / source.naturalHeight;
      const tAspect = p.width / p.height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (fit === "blur-fill") {
        let bgW: number, bgH: number, bgX: number, bgY: number;
        if (sAspect > tAspect) {
          bgH = p.height;
          bgW = p.height * sAspect;
        } else {
          bgW = p.width;
          bgH = p.width / sAspect;
        }
        bgX = (p.width - bgW) / 2;
        bgY = (p.height - bgH) / 2;

        ctx.save();
        ctx.filter = `blur(${blurAmount}px) brightness(0.65)`;
        ctx.drawImage(source, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
        ctx.restore();

        let fgW: number, fgH: number, fgX: number, fgY: number;
        if (sAspect > tAspect) {
          fgW = p.width;
          fgH = p.width / sAspect;
        } else {
          fgH = p.height;
          fgW = p.height * sAspect;
        }
        fgX = (p.width - fgW) / 2;
        fgY = (p.height - fgH) / 2;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.drawImage(source, fgX, fgY, fgW, fgH);
        ctx.restore();
      } else if (fit === "fill") {
        let dw: number, dh: number, dx: number, dy: number;
        if (sAspect > tAspect) {
          dh = p.height;
          dw = p.height * sAspect;
        } else {
          dw = p.width;
          dh = p.width / sAspect;
        }
        dx = (p.width - dw) / 2;
        dy = (p.height - dh) / 2;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, p.width, p.height);
        ctx.drawImage(source, dx, dy, dw, dh);
      } else {
        let dw: number, dh: number, dx: number, dy: number;
        if (sAspect > tAspect) {
          dw = p.width;
          dh = p.width / sAspect;
        } else {
          dh = p.height;
          dw = p.height * sAspect;
        }
        dx = (p.width - dw) / 2;
        dy = (p.height - dh) / 2;
        ctx.fillStyle = letterbox;
        ctx.fillRect(0, 0, p.width, p.height);
        ctx.drawImage(source, dx, dy, dw, dh);
      }

      const mime = format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, mime, quality));
      if (blob) {
        zip.file(`${fileName}-${p.id}-${p.width}x${p.height}.${format}`, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-all-social-formats.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setIsZipping(false);
  };

  return (
    <div style={{ position: "relative", minHeight: "100%", padding: "20px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Top Title Section */}
      <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#FFDD00", color: "#000", fontFamily: "monospace" }}>
            SOCIAL RESIZER & BLUR PILLARBOX
          </span>
          <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
            PORTRAIT TO LANDSCAPE · BLUR BACKGROUND · BATCH ZIP
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
          Social Platform Resizer
        </h1>
      </div>

      {/* Upload Stage */}
      {!source ? (
        <div
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className="brutalist-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 40px",
            textAlign: "center",
            cursor: "pointer",
            border: `4px dashed ${isDragging ? "#FFDD00" : "#000000"}`,
            background: "#ffffff",
            boxShadow: "6px 6px 0 #000000",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              border: "3px solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              background: "#FFDD00",
              boxShadow: "4px 4px 0 #000000",
            }}
          >
            <ImageIcon size={30} style={{ color: "#000" }} />
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
            Drop an image here or click to browse
          </h3>
          <p style={{ fontSize: "0.88rem", color: "#666", maxWidth: 440, lineHeight: 1.6, fontWeight: 500, margin: "0 0 20px" }}>
            PNG · JPG · WEBP — Full resolution preserved
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadDemoImage();
            }}
            className="brutalist-button"
            style={{ padding: "8px 18px", fontSize: "0.78rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}
          >
            TRY DEMO IMAGE
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Preview Stage */}
          <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: "#fff", border: "3px solid #000", boxShadow: "6px 6px 0 #000" }}>
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                maxHeight: "440px",
                objectFit: "contain",
                border: "2px solid #000",
                background: letterbox,
              }}
            />
            <div style={{ fontSize: "0.76rem", color: "#666", fontFamily: "monospace", fontWeight: 800, textAlign: "center" }}>
              {preset.label} · {preset.width} × {preset.height} · {sourceInfo}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <button
                className="brutalist-button brutalist-button-primary"
                onClick={download}
                style={{ fontSize: "0.82rem", padding: "10px 20px" }}
              >
                <Download size={15} style={{ marginRight: 6 }} />
                {downloaded ? "Downloaded!" : `Download ${preset.label}`}
              </button>

              <button
                className="brutalist-button"
                onClick={downloadAllZip}
                disabled={isZipping}
                style={{ fontSize: "0.82rem", padding: "10px 16px", background: "#FFDD00" }}
              >
                <FolderArchive size={15} style={{ marginRight: 6 }} />
                {isZipping ? "Creating ZIP..." : "Download All (ZIP)"}
              </button>

              <button
                className="brutalist-button"
                onClick={() => setSource(null)}
                style={{ fontSize: "0.82rem", padding: "10px 16px" }}
              >
                Change Image
              </button>
            </div>
          </div>

          {/* Controls Side Panel */}
          <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "#fff", border: "3px solid #000", boxShadow: "6px 6px 0 #000" }}>
            {/* Platform Preset Picker */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Target Social Platform
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "2px solid #000",
                      background: preset.id === p.id ? "#FFDD00" : "#fff",
                      color: "#000",
                      fontWeight: 900,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                    <span style={{ display: "block", fontFamily: "monospace", fontSize: "0.62rem", opacity: 0.75 }}>
                      {p.hint} · {p.width}×{p.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fit & Background Mode */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Background & Resize Effect
              </label>
              <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                <button
                  onClick={() => setFit("blur-fill")}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "none",
                    borderRight: "2px solid #000",
                    background: fit === "blur-fill" ? "#000" : "#fff",
                    color: fit === "blur-fill" ? "#FFE500" : "#000",
                    fontWeight: 900,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  ✨ Blurred Fill
                </button>
                <button
                  onClick={() => setFit("fill")}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "none",
                    borderRight: "2px solid #000",
                    background: fit === "fill" ? "#000" : "#fff",
                    color: fit === "fill" ? "#fff" : "#000",
                    fontWeight: 900,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Crop Fill
                </button>
                <button
                  onClick={() => setFit("contain")}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "none",
                    background: fit === "contain" ? "#000" : "#fff",
                    color: fit === "contain" ? "#fff" : "#000",
                    fontWeight: 900,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Letterbox
                </button>
              </div>

              {/* Blur Intensity Slider */}
              {fit === "blur-fill" && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 800, fontFamily: "monospace" }}>Blur Intensity:</label>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={blurAmount}
                    onChange={(e) => setBlurAmount(Number(e.target.value))}
                    style={{ flex: 1, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 900, width: 36, textAlign: "right" }}>
                    {blurAmount}px
                  </span>
                </div>
              )}

              {fit === "contain" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, fontFamily: "monospace" }}>Letterbox Color:</label>
                  <input
                    type="color"
                    value={letterbox}
                    onChange={(e) => setLetterbox(e.target.value)}
                    style={{ width: 44, height: 26, border: "2px solid #000", padding: 2, cursor: "pointer" }}
                  />
                </div>
              )}
            </div>

            {/* Export Format */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Export Format
              </label>
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
                      color: format === f ? "#fff" : "#000",
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}