"use client";

import { useState, useRef, useEffect } from "react";
import { Crosshair, RefreshCw, Download, ChevronLeft } from "lucide-react";
import Link from "next/link";

type FillMode = "color" | "image" | "transparent";

const FILL_COLORS = [
  { id: "accent", label: "Brand Blue", hex: "#5E9BC6" },
  { id: "black", label: "Black", hex: "#000000" },
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "ink", label: "Ink", hex: "#1E2224" },
  { id: "paper", label: "Paper", hex: "#FDFDFD" },
];

export default function BackgroundReplacePage() {
  const [subjectSrc, setSubjectSrc] = useState<string | null>(null);
  const [subjectImg, setSubjectImg] = useState<HTMLImageElement | null>(null);
  const [cutoutSrc, setCutoutSrc] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState("");
  const [fillMode, setFillMode] = useState<FillMode>("color");
  const [fillColor, setFillColor] = useState("#5E9BC6");
  const [backdropSrc, setBackdropSrc] = useState<string | null>(null);
  const [backdropImg, setBackdropImg] = useState<HTMLImageElement | null>(null);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [downloaded, setDownloaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const runInBrowserRemoval = async (src: string) => {
    const { removeBackground } = await import("@imgly/background-removal");
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 2 && !blob; attempt++) {
      try {
        blob = await removeBackground(src, { model: "isnet_fp16", proxyToWorker: true });
      } catch (err) {
        console.warn(`in-browser removal attempt ${attempt + 1} failed`, err);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (!blob) throw new Error("in-browser removal failed");
    setCutoutSrc(URL.createObjectURL(blob));
    setError("");
  };

  const removeBackground = async () => {
    if (!subjectSrc || !subjectImg) return;
    setError("");
    setIsRemoving(true);
    const removalTimer = setTimeout(() => {
      setIsRemoving(false);
      setError("Processing took too long. Show yours again with the in-browser cut.");
    }, 30000);

    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: downscaleForUpload(subjectImg) ?? subjectSrc }),
      });
      if (res.ok) {
        setCutoutSrc(URL.createObjectURL(await res.blob()));
      } else {
        const data = await res.json().catch(() => null);
        const message = data?.error?.message ?? data?.error ?? `Server error (${res.status}).`;
        if (res.status === 500 && String(message).includes("HUGGINGFACE_API_KEY")) {
          setError(`${message} Trying the in-browser fallback...`);
        } else if (String(message).toLowerCase().includes("in-browser")) {
          setError(message);
        } else {
          setError(`${message} Trying the in-browser fallback...`);
        }
        await runInBrowserRemoval(subjectSrc);
      }
    } catch {
      setError("Could not reach the AI service. Trying the in-browser fallback...");
      await runInBrowserRemoval(subjectSrc);
    } finally {
      clearTimeout(removalTimer);
      setIsRemoving(false);
    }
  };

  // Composite: fill + cutout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !subjectImg || !cutoutSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = subjectImg.naturalWidth;
    const H = subjectImg.naturalHeight;
    canvas.width = W;
    canvas.height = H;

    // Fill layer
    if (fillMode === "transparent") {
      const s = 16;
      for (let y = 0; y < H; y += s) {
        for (let x = 0; x < W; x += s) {
          ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? "#e5e7eb" : "#ffffff";
          ctx.fillRect(x, y, s, s);
        }
      }
    } else if (fillMode === "color") {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, W, H);
    } else if (fillMode === "image" && backdropImg) {
      const bAspect = backdropImg.naturalWidth / backdropImg.naturalHeight;
      const tAspect = W / H;
      let dw: number, dh: number;
      if (bAspect > tAspect) {
        dh = H;
        dw = H * bAspect;
      } else {
        dw = W;
        dh = W / bAspect;
      }
      ctx.drawImage(backdropImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    // Cutout layer
    const cutout = new Image();
    cutout.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(cutout, 0, 0, W, H);
    };
    cutout.src = cutoutSrc;
  }, [subjectImg, cutoutSrc, fillMode, fillColor, backdropImg]);

  const handleSubjectFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setSubjectImg(img);
        setSubjectSrc(String(reader.result));
        setCutoutSrc(null);
        setError("");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBackdropFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setBackdropImg(img);
        setBackdropSrc(String(reader.result));
        setFillMode("image");
        setError("");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `background-replaced.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        window.setTimeout(() => setDownloaded(false), 1600);
      },
      format === "png" ? "image/png" : "image/jpeg",
      format === "jpg" ? 0.92 : undefined
    );
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
                Background Replace
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                AI Remove
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              Cut a subject out with AI, then fill in a brand color, a transparent PNG or another image
              as the new scene. Free Hugging Face inference first, in-browser fallback when offline.
            </p>
          </div>
        </div>

        {/* Subject upload */}
        {!subjectSrc ? (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleSubjectFile(e.dataTransfer.files?.[0]);
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
              <Crosshair size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Drop the photo to cut out
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
                handleSubjectFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Cutout action */}
            <div className="brutalist-card" style={{ padding: 20, gap: 14, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%", flexWrap: "wrap" }}>
                <img
                  src={subjectSrc}
                  alt="Original"
                  style={{ width: 120, height: 120, objectFit: "cover", border: "3px solid #000", boxShadow: "3px 3px 0 rgba(0,0,0,0.15)" }}
                />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#000", marginBottom: 4 }}>
                    Step 1 — Remove background
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-hint)", fontWeight: 600, lineHeight: 1.5 }}>
                    {cutoutSrc
                      ? "Cutout ready — now pick a fill below."
                      : isRemoving
                      ? "Removing… (HF first, local fallback if needed — can take 30s+)"
                      : "Uses free Hugging Face inference; falls back to fully local AI in your browser."}
                  </div>
                  {error && !cutoutSrc && (
                    <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#b91c1c", fontWeight: 700, lineHeight: 1.45 }}>
                      {error}
                    </div>
                  )}
                </div>
                <button
                  className="brutalist-button brutalist-button-primary"
                  disabled={isRemoving}
                  onClick={removeBackground}
                  style={{ fontSize: "0.8rem", padding: "10px 18px" }}
                >
                  {isRemoving ? (
                    <>
                      <RefreshCw size={14} style={{ marginRight: 6, animation: "dotLabelPulse 1s ease-in-out infinite" }} />
                      Removing…
                    </>
                  ) : cutoutSrc ? (
                    "Re-run removal"
                  ) : (
                    "Remove Background"
                  )}
                </button>
              </div>
            </div>

            {/* Fill + composite */}
            <div className="brutalist-card" style={{ padding: 20, gap: 16 }}>
              <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#000" }}>
                Step 2 — Choose the new scene
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["color", "image", "transparent"] as FillMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFillMode(m)}
                    style={{
                      padding: "8px 14px",
                      border: "2px solid #000",
                      background: fillMode === m ? "var(--accent)" : "#fff",
                      color: fillMode === m ? "#fff" : "#000",
                      fontWeight: 800,
                      fontSize: "0.74rem",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {m === "color" ? "Color" : m === "image" ? "Image" : "Transparent PNG"}
                  </button>
                ))}
              </div>

              {fillMode === "color" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {FILL_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFillColor(c.hex)}
                      title={c.label}
                      style={{
                        width: 44,
                        height: 44,
                        border: "3px solid #000",
                        background: c.hex,
                        cursor: "pointer",
                        boxShadow: fillColor === c.hex ? "3px 3px 0 var(--accent)" : "3px 3px 0 rgba(0,0,0,0.15)",
                        transform: fillColor === c.hex ? "translate(-1px,-1px)" : "none",
                      }}
                    />
                  ))}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.74rem", fontWeight: 800, fontFamily: "monospace" }}>
                    Custom:
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      style={{ width: 44, height: 38, border: "2px solid #000", background: "#fff", padding: 2, cursor: "pointer" }}
                    />
                  </span>
                </div>
              )}

              {fillMode === "image" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {backdropSrc ? (
                    <img src={backdropSrc} alt="Backdrop" style={{ width: 64, height: 64, objectFit: "cover", border: "2px solid #000" }} />
                  ) : null}
                  <label className="brutalist-button" style={{ cursor: "pointer", fontSize: "0.76rem", padding: "8px 14px", margin: 0 }}>
                    {backdropSrc ? "Swap backdrop…" : "Choose backdrop image…"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        handleBackdropFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Composite preview + export */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    aspectRatio: subjectImg ? `${subjectImg.naturalWidth}/${subjectImg.naturalHeight}` : "1/1",
                    border: "3px solid #000",
                    boxShadow: "5px 5px 0 rgba(0,0,0,0.16)",
                    background: "#fff",
                  }}
                />
                {cutoutSrc ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
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
                    <button className="brutalist-button brutalist-button-primary" onClick={download} style={{ fontSize: "0.8rem", padding: "10px 18px" }}>
                      <Download size={14} style={{ marginRight: 6 }} />
                      {downloaded ? "Downloaded!" : "Download Image"}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-hint)", fontFamily: "monospace", fontWeight: 700 }}>
                    Preview appears after step 1 finishes.
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