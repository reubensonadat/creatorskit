"use client";

import { useState, useRef } from "react";
import { Palette, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Swatch {
  hex: string;
  count: number;
  pct: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function extractPalette(img: HTMLImageElement, count = 10): Promise<Swatch[]> {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let visible = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    visible++;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  if (visible === 0) return [];

  const dominant = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => ({
      hex: rgbToHex(bucket.r / bucket.n, bucket.g / bucket.n, bucket.b / bucket.n),
      count: bucket.n,
      pct: (bucket.n / visible) * 100,
    }));

  return dominant;
}

export default function PaletteExtractorPage() {
  const [image, setImage] = useState<string | null>(null);
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [sourceInfo, setSourceInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setImage(String(reader.result));
        setSourceInfo(`${file.name} · ${img.naturalWidth} × ${img.naturalHeight}px`);
        setBusy(true);
        window.setTimeout(async () => {
          const palette = await extractPalette(img);
          setPalette(palette);
          setBusy(false);
        }, 30);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const cssPalette = palette
    .map((s, i) => `--palette-${i + 1}: ${s.hex};`)
    .join("\n");

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                Palette Extractor
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                From Image
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              Drop any image and get its dominant colors as click-to-copy hex codes or a ready-to-paste CSS palette. Runs 100% in your browser.
            </p>
          </div>
        </div>

        {/* Upload */}
        {!image ? (
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
              <Palette size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Drop an image to extract its palette
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              JPG · PNG · WEBP
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
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={image}
                  alt="Source"
                  style={{ width: 56, height: 56, objectFit: "cover", border: "2px solid #000", boxShadow: "3px 3px 0 rgba(0,0,0,0.15)" }}
                />
                <div>
                  <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#000" }}>{sourceInfo}</div>
                  {busy && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "var(--text-hint)", fontWeight: 700, fontFamily: "monospace" }}>
                      <RefreshCw size={14} style={{ animation: "dotLabelPulse 1s ease-in-out infinite" }} />
                      Quantizing colors…
                    </div>
                  )}
                </div>
              </div>
              {palette.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="brutalist-button"
                    onClick={() => copy(palette.map((s) => s.hex).join(" "), "hex")}
                    style={{ fontSize: "0.72rem", padding: "7px 12px" }}
                  >
                    {copied === "hex" ? "Copied!" : "Copy All Hex"}
                  </button>
                  <button
                    className="brutalist-button brutalist-button-primary"
                    onClick={() => copy(cssPalette, "css")}
                    style={{ fontSize: "0.72rem", padding: "7px 12px" }}
                  >
                    {copied === "css" ? "Copied!" : "Copy CSS Palette"}
                  </button>
                </div>
              )}
            </div>

            {!busy && palette.length > 0 && (
              <div className="brutalist-card" style={{ padding: 24, gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {palette.map((swatch) => {
                    const dark = luminance(swatch.hex) < 130;
                    return (
                      <button
                        key={swatch.hex}
                        onClick={() => copy(swatch.hex, swatch.hex)}
                        style={{
                          border: "3px solid #000",
                          background: swatch.hex,
                          padding: "14px 10px",
                          minHeight: 84,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                          boxShadow: "3px 3px 0 rgba(0,0,0,0.18)",
                          textAlign: "left",
                        }}
                        title="Click to copy the hex code"
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 900,
                            fontSize: "0.72rem",
                            color: dark ? "#ffffff" : "#000000",
                          }}
                        >
                          {copied === swatch.hex ? "COPIED!" : swatch.hex}
                        </span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)",
                          }}
                        >
                          {swatch.pct.toFixed(1)}% of image
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    border: "2px dashed rgba(0,0,0,0.3)",
                    background: "rgba(0,0,0,0.02)",
                    padding: 12,
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                    whiteSpace: "pre-wrap",
                    fontWeight: 600,
                  }}
                >
                  {cssPalette}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}