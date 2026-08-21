"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const ASPECTS = [
  { id: "9:16" as const, label: "9:16", w: 1080, h: 1920 },
  { id: "1:1" as const, label: "1:1", w: 1080, h: 1080 },
  { id: "16:9" as const, label: "16:9", w: 1920, h: 1080 },
] as const;

const EXAMPLES = [
  "creator kit",
  "DIGITAL",
  "matte poster",
];

const PARAGRAPHS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
];

const FONTS = [
  { family: "'Playfair Display', serif", weight: "900" },
  { family: "'Times New Roman', serif", weight: "700" },
  { family: "Georgia, serif", weight: "700" },
];

const FPS = 30;

export default function TextMatchCutPage() {
  const [fullText, setFullText] = useState("");
  const [highlightWord, setHighlightWord] = useState("");
  const [highlightColor, setHighlightColor] = useState("#FFE500");
  const [aspect, setAspect] = useState<"9:16" | "1:1" | "16:9">("1:1");
  const [cw, setCw] = useState<number>(1080);
  const [ch, setCh] = useState<number>(1920);
  const [cutsPerSecond, setCutsPerSecond] = useState<number>(1);
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdRef = useRef<number>(null);
  const frameBufferRef = useRef<Blob[]>([]);

  const wordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== wordRef.current) {
        e.preventDefault();
        wordRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const asp = ASPECTS.find((a) => a.id === aspect);
    if (asp) {
      setCw(asp.w);
      setCh(asp.h);
    }
  }, [aspect]);

  const splitPhrase = useCallback(() => {
    const text = fullText.trim().toUpperCase();
    const anchor = highlightWord.trim().toUpperCase();
    if (!anchor || !text.includes(anchor)) {
      return { prefix: text, anchor: text, suffix: "" };
    }
    const idx = text.indexOf(anchor);
    return {
      prefix: text.slice(0, idx),
      anchor,
      suffix: text.slice(idx + anchor.length),
    };
  }, [fullText, highlightWord]);

  const getFitFontSize = useCallback((
    ctx: CanvasRenderingContext2D,
    anchor: string,
    width: number,
    height: number,
    baseSize: number
  ) => {
    ctx.font = `900 ${baseSize}px "Playfair Display", serif`;
    const metrics = ctx.measureText(anchor);
    const maxWidth = width * 0.85;
    if (metrics.width > maxWidth) {
      return baseSize * (maxWidth / metrics.width);
    }
    return baseSize;
  }, []);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    parts: { prefix: string; anchor: string; suffix: string }
  ) => {
    const { prefix, anchor, suffix } = parts;
    
    // Draw background
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw surrounding paragraphs in smaller text
    const paragraphLineHeight = 28;
    const maxParagraphLines = Math.floor(ctx.canvas.height / paragraphLineHeight);
    const startY = Math.max(0, Math.floor(ctx.canvas.height / 2) - (maxParagraphLines * paragraphLineHeight) / 2);
    
    ctx.font = "400 0.9em Georgia, serif";
    ctx.fillStyle = "#555";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    PARAGRAPHS.slice(0, maxParagraphLines).forEach((line, i) => {
      const y = startY + i * paragraphLineHeight;
      ctx.fillText(line, 20, y);
    });

    // Main text elements with surreal font variation
    const fonts = [FONTS[0], FONTS[1], FONTS[2]];
    const fontIndex = Math.floor(Math.random() * fonts.length);
    
    // Font size for the main text
    const baseFontSize = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.08;
    const fontSize = getFitFontSize(ctx, anchor, ctx.canvas.width, ctx.canvas.height, baseFontSize);
    
    // Prefix
    ctx.font = `900 ${fontSize}px "${fonts[fontIndex].family}", serif`;
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const prefixText = prefix + (prefix ? " " : "");
    const prefixMetrics = ctx.measureText(prefixText);
    const prefixWidth = prefixMetrics.width;
    ctx.fillText(prefixText, (ctx.canvas.width - prefixWidth) / 2, ctx.canvas.height / 2);

    // Anchor (highlight)
    ctx.font = `900 ${fontSize}px "${fonts[(fontIndex + 1) % fonts.length].family}", serif`;
    const anchorMetrics = ctx.measureText(anchor);
    const anchorWidth = anchorMetrics.width;
    const anchorX = (ctx.canvas.width - (prefixWidth + anchorWidth + (suffix ? ctx.measureText(" " + suffix).width : 0))) / 2 + prefixWidth;
    const anchorY = ctx.canvas.height / 2;
    
    // Highlight background
    ctx.fillStyle = "#FFE500";
    const padX = 12;
    const padY = 8;
    ctx.fillRect(
      anchorX - padX,
      anchorY - fontSize / 2 - padY,
      anchorWidth + padX * 2,
      fontSize + padY * 2
    );
    
    // Anchor text
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(anchor, anchorX + anchorWidth / 2, anchorY);

    // Suffix
    if (suffix) {
      ctx.font = `900 ${fontSize}px "${fonts[(fontIndex + 2) % fonts.length].family}", serif`;
      const suffixText = " " + suffix;
      const suffixMetrics = ctx.measureText(suffixText);
      const suffixWidth = suffixMetrics.width;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(suffixText, anchorX + anchorWidth, anchorY);
    }

    // Vignette
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width / 2, ctx.canvas.height / 2, Math.min(ctx.canvas.width, ctx.canvas.height) * 0.2,
      ctx.canvas.width / 2, ctx.canvas.height / 2, Math.max(ctx.canvas.width, ctx.canvas.height) * 0.8
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }, []);

  useEffect(() => {
    if (!generated || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stream = canvas.captureStream(FPS);
    const mediaStream = new MediaStream(stream.getTracks());
    const recorder = new MediaRecorder(mediaStream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start();

    let frame = 0;
    let lastCutFrame = 0;
    const framesPerCut = Math.max(1, Math.round(FPS / cutsPerSecond));

    let lastTime = performance.now();
    const frameInterval = 1000 / FPS;

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      if (deltaTime >= frameInterval) {
        lastTime = time - (deltaTime % frameInterval);
        if (frame - lastCutFrame >= framesPerCut) {
          lastCutFrame = frame;
        }

        const parts = splitPhrase();
        drawFrame(ctx, parts);

        canvas.toBlob((blob) => {
          if (blob) {
            chunks.push(blob as Blob);
            frameBufferRef.current.push(blob);
          }
        }, canvas.toDataURL("image/webp"));

        frame++;
      }
      requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(() => loop(0));

    const stopDuration = 2000;
    setTimeout(() => {
      recorder.stop();
      const blobUrl = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = false;
      video.src = blobUrl;
      const container = document.createElement("div");
      container.style.marginTop = "20px";
      container.appendChild(video);
      document.body.appendChild(container);
    }, stopDuration);

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      recorder?.stop();
      recorder?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [generated, splitPhrase, drawFrame, cw, ch, cutsPerSecond]);

  const handleGenerate = () => {
    if (!fullText.trim()) return;
    setGenerated(true);
  };

  const handleRegenerate = () => {
    setGenerated(false);
    setTimeout(() => setGenerated(true), 50);
  };

  const charCount = 23 - fullText.length;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>Text Match CUT</h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>Word Anchor</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>Type a phrase, highlight a word. Clean match cuts in browser.</p>
          </div>
        </div>

        <div className="brutalist-card" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <input
                ref={wordRef}
                type="text"
                value={fullText}
                maxLength={23}
                onChange={(e) => setFullText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setGenerated(true); }}
                placeholder="Type a phrase"
                autoComplete="off"
                spellCheck={false}
                style={{ width: "100%", padding: "14px 16px", fontSize: "1.05rem", fontWeight: 900, border: "3px solid #000", outline: "none", boxSizing: "border-box" }}
              />
              <span
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace", color: "var(--text-hint)" }}
              >
                <kbd style={{ border: "1px solid #000", padding: "1px 5px", background: "#fff", fontFamily: "monospace" }}> / </kbd> to focus
              </span>
            </div>
            <input
              type="text"
              value={highlightWord}
              maxLength={23}
              onChange={(e) => setHighlightWord(e.target.value)}
              placeholder="Word to highlight"
              autoComplete="off"
              spellCheck={false}
              style={{ flex: "1 1 140px", padding: "14px 16px", fontSize: "1.05rem", fontWeight: 900, border: "3px solid #000", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label
                style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-hint)", whiteSpace: "nowrap" }}
              >
                Color
              </label>
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                style={{ width: 44, height: 44, border: "3px solid #000", padding: 2, cursor: "pointer", background: "none" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
            <span id="charCount" style={{ fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace", color: "var(--text-hint)" }} aria-live="polite">
              {charCount} characters left
            </span>
            <button
              onClick={handleGenerate}
              disabled={!fullText.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 26px",
                border: "3px solid #000",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 900,
                fontSize: "0.85rem",
                fontFamily: "monospace",
                textTransform: "uppercase",
                cursor: fullText.trim() ? "pointer" : "not-allowed",
                boxShadow: "5px 5px 0 #000",
                opacity: fullText.trim() ? 1 : 0.55,
              }}
            >
              Generate Preview
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <label
              style={{ fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace", color: "var(--text-hint)" }}
            >
              Cuts per second:
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              max="10"
              value={cutsPerSecond}
              onChange={(e) => setCutsPerSecond(+e.target.value)}
              style={{
                width: 80,
                padding: "4px 8px",
                fontSize: "0.7rem",
                fontWeight: 900,
                border: "3px solid #000",
                outline: "none",
                boxSizing: "border-box",
                marginLeft: 4,
              }}
            />
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 900,
                fontFamily: "monospace",
                color: "var(--text-hint)",
                letterSpacing: "0.08em",
              }}
            >
              SEE IT WORK —
            </span>
            {EXAMPLES.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setFullText(p);
                  const words = p.split(" ");
                  setHighlightWord(words[Math.floor(words.length / 2)]);
                  setTimeout(() => setGenerated(true), 0);
                }}
                style={{
                  padding: "6px 12px",
                  border: "2px solid #000",
                  background: "#fff",
                  color: "#000",
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                {p.length > 24 ? p.slice(0, 22) + "..." : p}
              </button>
            ))}
          </div>
        </div>

        {generated && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "monospace", color: "#000" }}>
                Generated Text Match
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                <div style={{ fontSize: "0.8rem", fontStyle: "italic", color: "#555" }}>
                  Result preview
                </div>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={cw}
              height={ch}
              style={{
                width: "100%",
                maxHeight: "calc(100vh - 400px)",
                aspectRatio: `${cw} / ${ch}`,
                background: "#000",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button
                onClick={() => {
                  setGenerated(false);
                  setTimeout(() => setGenerated(true), 50);
                }}
                className="brutalist-button"
                style={{ padding: "10px 20px", fontSize: "0.85rem" }}
              >
                Regenerate
              </button>
              <span style={{ fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace", color: "var(--text-hint)", marginLeft: "auto" }}>
                {cutsPerSecond.toFixed(1)}·cps · {cw}×{ch}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}