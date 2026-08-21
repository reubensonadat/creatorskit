"use client";

import { useState, useRef } from "react";
import JSZip from "jszip";
import { Camera, Download, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";

type WatermarkMode = "text" | "logo";
type PositionKey =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "center" | "mid-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

interface Item {
  id: string;
  name: string;
  img: HTMLImageElement;
}

const POSITIONS: { key: PositionKey; label: string }[] = [
  { key: "top-left", label: "TL" },
  { key: "top-center", label: "TC" },
  { key: "top-right", label: "TR" },
  { key: "mid-left", label: "ML" },
  { key: "center", label: "C" },
  { key: "mid-right", label: "MR" },
  { key: "bottom-left", label: "BL" },
  { key: "bottom-center", label: "BC" },
  { key: "bottom-right", label: "BR" },
];

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${file.name}`));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function WatermarkPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [text, setText] = useState("@creatorkit");
  const [textColor, setTextColor] = useState("#ffffff");
  const [sizePct, setSizePct] = useState(5);
  const [opacity, setOpacity] = useState(0.8);
  const [position, setPosition] = useState<PositionKey>("bottom-right");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState("");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneLabel, setDoneLabel] = useState("");
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const loaded: Item[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const img = await loadImageFromFile(file);
        loaded.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name.replace(/\.[^.]+$/, ""), img });
      } catch {
        /* skip unreadable */
      }
    }
    setItems((prev) => [...prev, ...loaded]);
    setResults([]);
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    const img = await loadImageFromFile(file);
    setLogo(img);
    setLogoName(file.name);
  };

  const drawWatermarked = (item: Item): Promise<Blob> =>
    new Promise((resolve) => {
      const W = item.img.naturalWidth;
      const H = item.img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(new Blob());
        return;
      }
      ctx.drawImage(item.img, 0, 0);

      // watermark box sizing
      const padding = Math.max(18, Math.round(H * 0.03));
      let wmW = 0;
      let wmH = 0;
      if (mode === "text") {
        wmH = Math.round((H * sizePct) / 100);
        ctx.font = `800 ${wmH}px Inter, sans-serif, system-ui`;
        wmW = ctx.measureText(text).width;
      } else if (logo) {
        wmH = Math.round((H * sizePct) / 100);
        const ratio = logo.naturalWidth / logo.naturalHeight;
        wmW = wmH * ratio;
      }

      const posX =
        position === "top-left" || position === "mid-left" || position === "bottom-left"
          ? padding
          : position === "top-center" || position === "center" || position === "bottom-center"
          ? (W - wmW) / 2
          : W - wmW - padding;
      const posY =
        position === "top-left" || position === "top-center" || position === "top-right"
          ? padding
          : position === "mid-left" || position === "center" || position === "mid-right"
          ? (H - wmH) / 2
          : H - wmH - padding;

      ctx.globalAlpha = opacity;
      if (mode === "text") {
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(text, posX, posY, Math.max(1, W - posX - padding));
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillText(text, posX + 1, posY + 1, Math.max(1, W - posX - padding));
        ctx.fillStyle = textColor;
        ctx.fillText(text, posX, posY, Math.max(1, W - posX - padding));
      } else if (logo) {
        ctx.drawImage(logo, posX, posY, wmW, wmH);
      }
      ctx.globalAlpha = 1;

      canvas.toBlob(
        (blob) => resolve(blob ?? new Blob()),
        format === "png" ? "image/png" : "image/jpeg",
        format === "jpg" ? 0.92 : undefined
      );
    });

  const runBatch = async (zip: boolean) => {
    if (items.length === 0) return;
    setBusy(true);
    setProgress(0);
    setDoneLabel("");
    const out: { name: string; url: string }[] = [];
    const zipped = new JSZip();
    const ext = format === "png" ? "png" : "jpg";
    for (let i = 0; i < items.length; i++) {
      const blob = await drawWatermarked(items[i]);
      const name = `${items[i].name}-watermarked.${ext}`;
      zipped.file(name, blob);
      const url = URL.createObjectURL(blob);
      out.push({ name, url });
      setProgress(i + 1);
    }
    setResults(out);

    if (zip) {
      const zblob = await zipped.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zblob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked-${items.length}-images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDoneLabel(zip ? `Done! ZIP with ${items.length} image(s) downloaded.` : `${items.length} image(s) ready below.`);
    setBusy(false);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                Watermark Batch
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                Batch ZIP
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              Stamp your handle, name or logo on many images at once and export a ZIP. Everything runs locally in your browser.
            </p>
          </div>
        </div>

        {/* Upload */}
        {items.length === 0 ? (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
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
              <Camera size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Add images to watermark
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              Select multiple — originals are never modified
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Settings */}
            <div className="brutalist-card" style={{ padding: 24, gap: 16 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="ctrl-label">Watermark Type</label>
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["text", "logo"] as WatermarkMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          borderRight: m === "text" ? "2px solid #000" : "none",
                          background: mode === m ? "var(--accent)" : "#fff",
                          color: mode === m ? "#fff" : "#000",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "text" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 }}>
                    <label className="ctrl-label">Handle / Name</label>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{
                        border: "2px solid #000",
                        background: "#fff",
                        padding: "7px 10px",
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        outline: "none",
                        color: "#000",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="ctrl-label">Logo Image</label>
                    <button className="brutalist-button" onClick={() => logoInputRef.current?.click()} style={{ fontSize: "0.74rem", padding: "7px 12px" }}>
                      {logoName ? `Logo: ${logoName.slice(0, 24)}` : "Choose logo…"}
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        pickLogo(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="ctrl-label">Format</label>
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["png", "jpg"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        style={{
                          padding: "7px 12px",
                          border: "none",
                          borderRight: f === "png" ? "2px solid #000" : "none",
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
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="slider-row">
                  <label>Watermark Size ({sizePct}% of height)</label>
                  <div className="slider-content" style={{ boxShadow: "none", border: "2px solid #000" }}>
                    <div className="slider-wrapper">
                      <input
                        type="range"
                        min={2}
                        max={15}
                        step={1}
                        value={sizePct}
                        onChange={(e) => setSizePct(Number(e.target.value))}
                        className="custom-slider"
                      />
                    </div>
                    <div className="slider-divider" />
                    <span className="slider-value">{sizePct}%</span>
                  </div>
                </div>
                <div className="slider-row">
                  <label>Opacity ({Math.round(opacity * 100)}%)</label>
                  <div className="slider-content" style={{ boxShadow: "none", border: "2px solid #000" }}>
                    <div className="slider-wrapper">
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="custom-slider"
                      />
                    </div>
                    <div className="slider-divider" />
                    <span className="slider-value">{Math.round(opacity * 100)}%</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="ctrl-label">Position</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, maxWidth: 220 }}>
                  {POSITIONS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPosition(p.key)}
                      style={{
                        padding: "7px 0",
                        border: "2px solid #000",
                        background: position === p.key ? "var(--accent)" : "#fff",
                        color: position === p.key ? "#fff" : "#000",
                        fontWeight: 800,
                        fontSize: "0.62rem",
                        fontFamily: "monospace",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {mode === "text" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="ctrl-label" style={{ fontSize: "0.66rem" }}>Color</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{ width: 40, height: 26, border: "2px solid #000", background: "#fff", padding: 2, cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  className="brutalist-button brutalist-button-primary"
                  disabled={busy || (mode === "text" && !text.trim()) || (mode === "logo" && !logo)}
                  onClick={() => runBatch(true)}
                  style={{ fontSize: "0.8rem", padding: "10px 18px" }}
                >
                  {busy ? (
                    <>
                      <RefreshCw size={14} style={{ marginRight: 6, animation: "dotLabelPulse 1s ease-in-out infinite" }} />
                      Watermarking… {progress}/{items.length}
                    </>
                  ) : (
                    <>
                      <Download size={14} style={{ marginRight: 6 }} />
                      Watermark All + ZIP ({items.length})
                    </>
                  )}
                </button>
                <button
                  className="brutalist-button"
                  disabled={busy}
                  onClick={() => runBatch(false)}
                  style={{ fontSize: "0.8rem", padding: "10px 18px" }}
                >
                  Preview Only
                </button>
                <button
                  className="brutalist-button"
                  onClick={() => {
                    setItems([]);
                    setResults([]);
                  }}
                  style={{ fontSize: "0.8rem", padding: "10px 18px" }}
                >
                  Clear all
                </button>
              </div>

              {doneLabel && (
                <div
                  style={{
                    padding: "10px 14px",
                    border: "2px solid #2f9e44",
                    background: "#f0fdf4",
                    color: "#166534",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    fontFamily: "monospace",
                  }}
                >
                  {doneLabel}
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 12 }}>
                  Watermarked images ({results.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {results.map((r) => (
                    <a
                      key={r.name}
                      href={r.url}
                      download={r.name}
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    >
                      <div className="brutalist-card" style={{ padding: 10, gap: 8, alignItems: "center" }}>
                        <img
                          src={r.url}
                          alt={r.name}
                          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", border: "2px solid #000", background: "#fff" }}
                        />
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, fontFamily: "monospace", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                          {r.name}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}