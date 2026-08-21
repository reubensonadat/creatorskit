"use client";

import { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";

type FormatPreset = { id: string; label: string; width: number; height: number };
type TextPosition = "center" | "left";
type FontChoice = "inter" | "playfair" | "jakarta";

const FORMATS: FormatPreset[] = [
  { id: "1:1", label: "1:1 · Square", width: 1080, height: 1080 },
  { id: "4:5", label: "4:5 · Feed", width: 1080, height: 1350 },
  { id: "9:16", label: "9:16 · Story/Reels", width: 1080, height: 1920 },
  { id: "16:9", label: "16:9 · Landscape", width: 1280, height: 720 },
];

const BG_PRESETS: {
  id: string;
  label: string;
  css: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}[] = [
  {
    id: "accent",
    label: "Brand Blue",
    css: "var(--accent)",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "var(--accent)";
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "black",
    label: "Black",
    css: "#000000",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "white",
    label: "White",
    css: "#ffffff",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "ink",
    label: "Ink #1E2224",
    css: "var(--text-primary)",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#1E2224";
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "gradient-blue",
    label: "Blue Pulse",
    css: "linear-gradient(135deg, #5E9BC6, #407fa8 55%, #1E2224)",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#5E9BC6");
      g.addColorStop(0.55, "#407fa8");
      g.addColorStop(1, "#1E2224");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "gradient-ink",
    label: "Midnight",
    css: "linear-gradient(160deg, #1E2224, #000000)",
    draw: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1E2224");
      g.addColorStop(1, "#000000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
];

const FONTS: Record<FontChoice, { label: string; family: string; weight: number }> = {
  inter: { label: "Inter", family: "Inter, sans-serif", weight: 800 },
  playfair: { label: "Playfair Display", family: "Playfair Display, serif", weight: 700 },
  jakarta: { label: "Plus Jakarta Sans", family: "Plus Jakarta Sans, sans-serif", weight: 800 },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const words = raw.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export default function QuoteCardPage() {
  const [quote, setQuote] = useState(
    "Creativity is intelligence having fun.\nMake something that scares you a little."
  );
  const [author, setAuthor] = useState("CreatorKit");
  const [format, setFormat] = useState<FormatPreset>(FORMATS[0]);
  const [bgId, setBgId] = useState("accent");
  const [customBg, setCustomBg] = useState("#5E9BC6");
  const [textColor, setTextColor] = useState("#ffffff");
  const [position, setPosition] = useState<TextPosition>("center");
  const [fontChoice, setFontChoice] = useState<FontChoice>("inter");
  const [showAuthor, setShowAuthor] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bgPreset = BG_PRESETS.find((b) => b.id === bgId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 2; // crisp export, preview is CSS-scaled down
    const W = format.width * scale;
    const H = format.height * scale;
    canvas.width = W;
    canvas.height = H;

    if (bgId === "custom") {
      ctx.fillStyle = customBg;
      ctx.fillRect(0, 0, W, H);
    } else {
      bgPreset?.draw(ctx, W, H);
    }

    const font = FONTS[fontChoice];
    // Auto-fit: start large, shrink until it fits
    const maxTextWidth = W * 0.82;
    const maxTextHeight = H * (showAuthor ? 0.62 : 0.78);
    let fontSize = W * 0.11;
    let lines: string[] = [];
    do {
      ctx.font = `${font.weight} ${Math.round(fontSize * scale)}px ${font.family}`;
      lines = wrapText(ctx, quote, maxTextWidth * scale);
      if (lines.length * fontSize * 1.28 * scale <= maxTextHeight * scale) break;
      fontSize *= 0.92;
    } while (fontSize > W * 0.035);

    ctx.font = `${font.weight} ${Math.round(fontSize * scale)}px ${font.family}`;
    const lineHeight = fontSize * 1.28 * scale;
    const totalHeight = lines.length * lineHeight;
    let y = (H - totalHeight) / 2 + lineHeight * 0.86;

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = textColor;

    for (const line of lines) {
      if (position === "center") {
        ctx.textAlign = "center";
        ctx.fillText(line, W / 2, y);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(line, W * 0.09, y);
      }
      y += lineHeight;
    }

    if (showAuthor && author.trim()) {
      const authorSize = fontSize * 0.42;
      ctx.font = `700 ${Math.round(authorSize * scale)}px ${font.family}`;
      ctx.fillStyle =
        textColor === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
      ctx.textAlign = position;
      ctx.fillText(
        `— ${author.trim()}`,
        position === "center" ? W / 2 : W * 0.09,
        Math.min(H - H * 0.08, lineHeight * (lines.length + 0.6) + (H - totalHeight) / 2)
      );
    }

    // Brutalist frame
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(W * 0.045, H * 0.045, W * 0.91, H * 0.91);
  }, [quote, author, format, bgId, bgPreset, customBg, textColor, position, fontChoice, showAuthor]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-card-${format.id.replace(":", "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      window.setTimeout(() => setDownloaded(false), 1600);
    }, "image/png");
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "var(--accent)", letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Post Graphics
        </span>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#000", textTransform: "uppercase", marginBottom: 10 }}>
          Quote Card Maker
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", maxWidth: 620, lineHeight: 1.6, fontWeight: 500, marginBottom: 36 }}>
          Type a hook, pick brand colors and format, export a sharp quote graphic. Everything renders
          locally — nothing leaves your browser.
        </p>

        <div className="quote-grid" style={{ gap: 28, alignItems: "start" }}>
          {/* Preview */}
          <div className="brutalist-card" style={{ padding: 20, alignItems: "center", gap: 14 }}>
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                aspectRatio: `${format.width}/${format.height}`,
                border: "3px solid #000",
                boxShadow: "5px 5px 0 rgba(0,0,0,0.16)",
                background: "#000",
              }}
            />
            <button
              className="brutalist-button brutalist-button-primary"
              onClick={download}
              style={{ fontSize: "0.8rem", padding: "10px 18px" }}
            >
              <Download size={15} style={{ marginRight: 6 }} />
              {downloaded ? "Downloaded!" : `Download ${format.label}`}
            </button>
          </div>

          {/* Controls */}
          <div className="brutalist-card" style={{ padding: 24, gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Quote Text</label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={4}
                style={{
                  border: "2px solid #000",
                  background: "#fff",
                  padding: 10,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                  color: "#000",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name / handle"
                style={{
                  border: "2px solid #000",
                  background: "#fff",
                  padding: "8px 10px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  outline: "none",
                  color: "#000",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Format</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f)}
                    style={{
                      padding: "8px 6px",
                      border: "2px solid #000",
                      background: format.id === f.id ? "var(--accent)" : "#fff",
                      color: format.id === f.id ? "#fff" : "#000",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      fontFamily: "monospace",
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Background</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {BG_PRESETS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBgId(b.id)}
                    style={{
                      padding: "8px 6px",
                      border: "2px solid #000",
                      background: "#fff",
                      color: "#000",
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      fontFamily: "monospace",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: "1px solid #000",
                        background: b.css.startsWith("linear") ? "var(--accent)" : b.css,
                        flexShrink: 0,
                      }}
                    />
                    {b.label}
                  </button>
                ))}
                <button
                  onClick={() => setBgId("custom")}
                  style={{
                    padding: "8px 6px",
                    border: "2px solid #000",
                    background: bgId === "custom" ? "var(--accent)" : "#fff",
                    color: bgId === "custom" ? "#fff" : "#000",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBgId("custom");
                    }}
                    style={{ width: 20, height: 20, border: "none", padding: 0, background: "none", cursor: "pointer" }}
                  />
                  Custom
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Text Color</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  border: "2px solid #000",
                  background: "#fff",
                  cursor: "pointer",
                  padding: 2,
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="ctrl-label">Font</label>
              {(["inter", "playfair", "jakarta"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setFontChoice(key)}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "2px solid #000",
                    background: fontChoice === key ? "var(--accent)" : "#fff",
                    color: fontChoice === key ? "#fff" : "#000",
                    fontWeight: FONTS[key].weight,
                    fontSize: "0.82rem",
                    fontFamily: FONTS[key].family,
                    cursor: "pointer",
                  }}
                >
                  {FONTS[key].label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {(["center", "left"] as TextPosition[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    border: "2px solid #000",
                    background: position === p ? "var(--accent)" : "#fff",
                    color: position === p ? "#fff" : "#000",
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setShowAuthor((v) => !v)}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "2px solid #000",
                  background: showAuthor ? "var(--accent)" : "#fff",
                  color: showAuthor ? "#fff" : "#000",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Author
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}