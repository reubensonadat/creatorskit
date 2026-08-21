"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Image, ChevronLeft } from "lucide-react";
import Link from "next/link";

type FitMode = "fill" | "contain";
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
  const [fit, setFit] = useState<FitMode>("fill");
  const [letterbox, setLetterbox] = useState("#000000");
  const [format, setFormat] = useState<OutFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [downloaded, setDownloaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
    let dw: number, dh: number, dx: number, dy: number;

    if (fit === "fill") {
      // cover: scale so it fills, crop overflow
      if (sAspect > tAspect) {
        dh = H;
        dw = H * sAspect;
      } else {
        dw = W;
        dh = W / sAspect;
      }
      dx = (W - dw) / 2;
      dy = (H - dh) / 2;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    } else {
      // contain: fit inside, letterbox
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
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, dx, dy, dw, dh);
  }, [source, preset, fit, letterbox]);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setSource(img);
        setSourceInfo(`${img.naturalWidth} × ${img.naturalHeight}px · ${(f.size / 1024).toFixed(0)} KB`);
        setFileName(f.name.replace(/\.[^.]+$/, ""));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
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
        a.download = `${fileName}-${preset.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        window.setTimeout(() => setDownloaded(false), 1600);
      },
      mime,
      quality
    );
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                Platform Resizer
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                Presets
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              One image, every platform. Pick a preset, choose fill or contain, export in PNG, JPG or WebP. All locally — nothing is uploaded.
            </p>
          </div>
        </div>

        {/* Upload */}
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
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "100px 40px",
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
              Drop an image here
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              JPG · PNG · WEBP — full resolution kept
            </p>
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
          <div className="quote-grid" style={{ gap: 28, alignItems: "start" }}>
            {/* Preview */}
            <div className="brutalist-card" style={{ padding: 20, alignItems: "center", gap: 14 }}>
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  maxWidth: 480,
                  aspectRatio: `${preset.width}/${preset.height}`,
                  border: "3px solid #000",
                  boxShadow: "5px 5px 0 rgba(0,0,0,0.16)",
                  background: "#000",
                }}
              />
              <div style={{ fontSize: "0.76rem", color: "var(--text-hint)", fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
                {preset.label} · {preset.width} × {preset.height} · {sourceInfo}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", width: "100%" }}>
                <button
                  className="brutalist-button brutalist-button-primary"
                  onClick={download}
                  style={{ fontSize: "0.8rem", padding: "10px 18px" }}
                >
                  <Download size={15} style={{ marginRight: 6 }} />
                  {downloaded ? "Downloaded!" : "Download"}
                </button>
                <button className="brutalist-button" onClick={() => setSource(null)} style={{ fontSize: "0.8rem", padding: "10px 18px" }}>
                  New Image
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="brutalist-card" style={{ padding: 24, gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="ctrl-label">Platform</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p)}
                      style={{
                        textAlign: "left",
                        padding: "7px 8px",
                        border: "2px solid #000",
                        background: preset.id === p.id ? "var(--accent)" : "#fff",
                        color: preset.id === p.id ? "#fff" : "#000",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                      <span style={{ display: "block", fontFamily: "monospace", fontSize: "0.6rem", opacity: 0.75 }}>
                        {p.hint} · {p.width}×{p.height}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="ctrl-label" style={{ display: "block", marginBottom: 6 }}>Fit</label>
                <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                  {(["fill", "contain"] as FitMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setFit(m)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "none",
                        borderRight: m === "fill" ? "2px solid #000" : "none",
                        background: fit === m ? "var(--accent)" : "#fff",
                        color: fit === m ? "#fff" : "#000",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {m === "fill" ? "Fill (crop)" : "Contain (fit)"}
                    </button>
                  ))}
                </div>
                {fit === "contain" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <label className="ctrl-label" style={{ fontSize: "0.66rem" }}>Letterbox</label>
                    <input
                      type="color"
                      value={letterbox}
                      onChange={(e) => setLetterbox(e.target.value)}
                      style={{ width: 40, height: 26, border: "2px solid #000", background: "#fff", padding: 2, cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="ctrl-label" style={{ display: "block", marginBottom: 6 }}>Format</label>
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
                        background: format === f ? "var(--accent)" : "#fff",
                        color: format === f ? "#fff" : "#000",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {format !== "png" && (
                  <div className="slider-row" style={{ marginTop: 10 }}>
                    <label>Quality</label>
                    <div className="slider-content" style={{ boxShadow: "none", border: "2px solid #000" }}>
                      <div className="slider-wrapper">
                        <input
                          type="range"
                          min={0.5}
                          max={1}
                          step={0.05}
                          value={quality}
                          onChange={(e) => setQuality(Number(e.target.value))}
                          className="custom-slider"
                        />
                      </div>
                      <div className="slider-divider" />
                      <span className="slider-value">{Math.round(quality * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}