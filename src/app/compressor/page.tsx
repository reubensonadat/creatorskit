"use client";

import { useState, useRef, useCallback } from "react";
import { 
  RefreshCw, 
  ChevronLeft, 
  Image,
  Download,
  FolderDown
} from "lucide-react";
import Link from "next/link";
import SpeederLoader from "@/components/SpeederLoader";
import ExportButton from "@/components/ExportButton";
import JSZip from "jszip";

interface CompressedResult {
  dataUrl: string;
  size: number;
  width: number;
  height: number;
}

interface BatchItem {
  id: number;
  name: string;
  dataUrl: string;
  size: number;
  result?: { dataUrl: string; size: number };
}

export default function CompressorPage() {
  const [original, setOriginal] = useState<{ dataUrl: string; size: number; name: string } | null>(null);
  const [compressed, setCompressed] = useState<CompressedResult | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<"image/jpeg" | "image/webp">("image/jpeg");
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [isCompressing, setIsCompressing] = useState(false);
  const [batch, setBatch] = useState<BatchItem[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const compressToDataUrl = useCallback(
    (dataUrl: string, q: number, fmt: string): Promise<{ dataUrl: string; size: number }> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Encoding failed"));
              const reader = new FileReader();
              reader.onload = (e) => resolve({ dataUrl: e.target!.result as string, size: blob.size });
              reader.readAsDataURL(blob);
            },
            fmt,
            q
          );
        };
        img.onerror = () => reject(new Error("Decode failed"));
        img.src = dataUrl;
      }),
    []
  );

  const compress = useCallback(
    (dataUrl: string, q: number, fmt: string) => {
      setIsCompressing(true);
      const img = new Image();
      img.onload = () => {
        compressToDataUrl(dataUrl, q, fmt)
          .then((r) =>
            setCompressed({
              ...r,
              width: img.naturalWidth,
              height: img.naturalHeight,
            })
          )
          .catch(() => setIsCompressing(false))
          .finally(() => setIsCompressing(false));
      };
      img.onerror = () => setIsCompressing(false);
      img.src = dataUrl;
    },
    [compressToDataUrl]
  );

  const runBatch = async (items: BatchItem[]) => {
    setIsCompressing(true);
    for (const item of items) {
      try {
        const result = await compressToDataUrl(item.dataUrl, quality, format);
        setBatch((prev) => prev.map((i) => (i.id === item.id ? { ...i, result } : i)));
      } catch {
        // keep item without result on failure
      }
    }
    setIsCompressing(false);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      setOriginal({ dataUrl, size: file.size, name: file.name });
      setCompressed(null);
      compress(dataUrl, quality, format);
    };
    reader.readAsDataURL(file);
  };

  const handleFiles = (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    if (images.length === 1) {
      handleFile(images[0]);
      return;
    }
    const items: BatchItem[] = images.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      dataUrl: "",
      size: f.size,
    }));
    let pending = items.length;
    items.forEach((item, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        item.dataUrl = e.target!.result as string;
        pending -= 1;
        if (pending === 0) {
          setBatch(items);
          setOriginal(null);
          runBatch(items);
        }
      };
      reader.readAsDataURL(images[i]);
    });
  };

  const handleQualityChange = (q: number) => {
    setQuality(q);
    if (original) compress(original.dataUrl, q, format);
  };

  const handleFormatChange = (fmt: "image/jpeg" | "image/webp") => {
    setFormat(fmt);
    if (original) compress(original.dataUrl, quality, fmt);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const savings =
    original && compressed
      ? Math.round((1 - compressed.size / original.size) * 100)
      : 0;

  const downloadFormat = (exportFmt: "image/png" | "image/jpeg" | "image/webp") => {
    if (!original) return;
    
    // If WebP or JPEG matches compressed output, export it directly
    if (exportFmt === "image/webp" && format === "image/webp" && compressed) {
      triggerDownload(compressed.dataUrl, "webp");
      return;
    }
    if (exportFmt === "image/jpeg" && format === "image/jpeg" && compressed) {
      triggerDownload(compressed.dataUrl, "jpg");
      return;
    }

    // Otherwise recalculate dynamically for the download format
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const ext = exportFmt === "image/png" ? "png" : exportFmt === "image/webp" ? "webp" : "jpg";
      const dataUrl = canvas.toDataURL(exportFmt, exportFmt === "image/png" ? undefined : quality);
      triggerDownload(dataUrl, ext);
    };
    img.src = original.dataUrl;
  };

  const triggerDownload = (url: string, ext: string) => {
    if (!original) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = original.name.replace(/\.[^.]+$/, "") + `-optimized.${ext}`;
    a.click();
  };

  const reset = () => {
    setOriginal(null);
    setCompressed(null);
    setSliderPos(50);
    setBatch([]);
  };

  const downloadOne = (item: BatchItem) => {
    if (!item.result) return;
    const ext = format === "image/jpeg" ? "jpg" : "webp";
    const a = document.createElement("a");
    a.href = item.result.dataUrl;
    a.download = item.name.replace(/\.[^.]+$/, "") + `-optimized.${ext}`;
    a.click();
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    batch.forEach((item) => {
      if (!item.result) return;
      const ext = format === "image/jpeg" ? "jpg" : "webp";
      zip.file(item.name.replace(/\.[^.]+$/, "") + `-optimized.${ext}`, item.result.dataUrl.split(",")[1], { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compressed-batch-${batch.length}-images.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const batchDone = batch.filter((i) => i.result).length;

  const batchSavings =
    batch.filter((i) => i.result).reduce((acc, i) => acc + (1 - i.result!.size / i.size) * 100, 0) /
    Math.max(1, batchDone);

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div className="grid-bg" />

      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Title Section */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#FFDD00", color: "#000", fontFamily: "monospace" }}>
              IMAGE COMPRESSOR PRO
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              CLIENT-SIDE JPEG & WEBP OPTIMIZATION · ZERO UPLOAD
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            Image Compressor Pro
          </h1>
        </div>

        {/* Drop Zone */}
        {!original && batch.length === 0 && (
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
              background: isDragging ? "rgba(37, 99, 235, 0.02)" : "#ffffff",
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
              Drag your files here
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 400, lineHeight: 1.6, fontWeight: 500 }}>
              PNG, JPG, and WebP support. One image opens the single-compare view —
              drop several to batch compress them all at once.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                handleFiles(e.target.files ?? []);
                e.currentTarget.value = "";
              }}
            />
          </div>
        )}

        {/* Batch Results */}
        {batch.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {isCompressing && <SpeederLoader message={`Compressing batch — ${batchDone}/${batch.length}`} />}
            <div className="brutalist-card" style={{ padding: 20, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#000" }}>
                  Batch Compress — {batchDone}/{batch.length} done
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-hint)", fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>
                  {format === "image/jpeg" ? "JPEG" : "WebP"} · {Math.round(quality * 100)}% quality · avg {batchSavings.toFixed(0)}% saved
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="brutalist-button" onClick={() => fileRef.current?.click()} style={{ fontSize: "0.76rem", padding: "9px 14px" }}>
                  Add more…
                </button>
                <button className="brutalist-button brutalist-button-red" onClick={reset} style={{ fontSize: "0.76rem", padding: "9px 14px" }}>
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> New batch
                </button>
                <button
                  className="brutalist-button brutalist-button-primary"
                  onClick={downloadAllZip}
                  disabled={batchDone === 0}
                  style={{ fontSize: "0.76rem", padding: "9px 14px" }}
                >
                  <FolderDown size={14} style={{ marginRight: 4 }} /> Download all (.zip)
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {batch.map((item) => {
                const saved = item.result ? Math.round((1 - item.result.size / item.size) * 100) : 0;
                return (
                  <div key={item.id} className="brutalist-card" style={{ padding: 14, gap: 12 }}>
                    <div style={{ position: "relative", border: "2px solid #000", background: "#fff", overflow: "hidden" }}>
                      {item.dataUrl ? (
                        <img src={item.dataUrl} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 800, color: "var(--text-hint)" }}>
                          Decoding…
                        </div>
                      )}
                      {item.result && (
                        <span style={{ position: "absolute", top: 8, right: 8, padding: "4px 8px", border: "2px solid #000", background: saved >= 0 ? "#10b981" : "#fff", color: saved >= 0 ? "#fff" : "#000", fontSize: "0.68rem", fontWeight: 900, fontFamily: "monospace" }}>
                          {saved >= 0 ? `−${saved}%` : "+0%"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
                      {item.name}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-hint)" }}>
                      <span>{formatBytes(item.size)}</span>
                      <span>{item.result ? formatBytes(item.result.size) : "…"}</span>
                    </div>
                    <button
                      className="brutalist-button"
                      onClick={() => downloadOne(item)}
                      disabled={!item.result}
                      style={{ width: "100%", justifyContent: "center", fontSize: "0.74rem", padding: "8px 12px" }}
                    >
                      <Download size={13} style={{ marginRight: 4 }} />
                      {item.result ? "Download" : "Waiting…"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Result Editor */}
        {original && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {isCompressing && (
              <SpeederLoader message="Compiling assets" />
            )}

            {/* Viewport Frame */}
            <div
              className="checkerboard"
              style={{
                border: "4px solid #000000",
                position: "relative",
                aspectRatio: "16/9",
                background: "#ffffff",
                boxShadow: "6px 6px 0 #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              {/* Original preview */}
              <img
                src={original.dataUrl}
                alt="Original"
                style={{
                  position: "absolute",
                  maxWidth: "100%",
                  maxHeight: "90%",
                  objectFit: "contain",
                  border: "3px solid #000000",
                  boxShadow: "3px 3px 0 #000000",
                }}
              />
              {/* Compressed preview overlay */}
              {compressed && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={compressed.dataUrl}
                    alt="Compressed"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "90%",
                      objectFit: "contain",
                      border: "3px solid #000000",
                      boxShadow: "3px 3px 0 #000000",
                    }}
                  />
                </div>
              )}
              {/* Visual Split Control */}
              <input
                type="range"
                min={0}
                max={100}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="custom-slider"
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "70%",
                  zIndex: 10,
                }}
              />
              {/* Floating comparative stats labels */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  padding: "6px 12px",
                  border: "3px solid #000000",
                  background: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 900,
                  color: "#000000",
                  boxShadow: "3px 3px 0 #000000",
                  fontFamily: "monospace",
                }}
              >
                ORIGINAL: {formatBytes(original.size)}
              </div>
              {compressed && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    padding: "6px 12px",
                    border: "3px solid #000000",
                    background: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    color: savings > 0 ? "#10b981" : "#000000",
                    boxShadow: "3px 3px 0 #000000",
                    fontFamily: "monospace",
                  }}
                >
                  COMPRESSED: {formatBytes(compressed.size)} ({savings}% SAVED)
                </div>
              )}
            </div>

            {/* Split controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Compression adjustment */}
              <div
                className="brutalist-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: 20,
                  border: "3px solid #000",
                  boxShadow: "6px 6px 0 #000",
                  background: "#fff",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>
                      Quality Level
                    </label>
                    <span style={{ fontSize: "0.8rem", fontWeight: 900, fontFamily: "monospace", background: "#FFDD00", padding: "1px 8px", border: "1.5px solid #000" }}>
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={quality}
                    onChange={(e) => handleQualityChange(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 900, textTransform: "uppercase" }}>
                    Export Format
                  </label>
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["image/jpeg", "image/webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleFormatChange(fmt)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          border: "none",
                          borderRight: fmt === "image/jpeg" ? "2px solid #000" : "none",
                          background: format === fmt ? "#000" : "#fff",
                          color: format === fmt ? "#fff" : "#000",
                          cursor: "pointer",
                          fontWeight: 900,
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                        }}
                      >
                        {fmt === "image/jpeg" ? "JPEG" : "WebP"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Board */}
              <div
                className="brutalist-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {[
                  { label: "Original Size", value: formatBytes(original.size), color: "var(--text-muted)" },
                  {
                    label: "Target Size",
                    value: compressed ? formatBytes(compressed.size) : "Calculating...",
                    color: "var(--text-primary)",
                  },
                  {
                    label: "Space Optimized",
                    value: compressed ? `${savings}%` : "0%",
                    color: savings > 0 ? "#10b981" : "var(--text-muted)",
                  },
                  {
                    label: "Image Bounds",
                    value: compressed ? `${compressed.width} × ${compressed.height} px` : "—",
                    color: "var(--text-muted)",
                  },
                ].map((stat) => (
                  <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-hint)", fontWeight: 800, fontFamily: "monospace" }}>{stat.label}</span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 900, color: stat.color, fontFamily: "monospace" }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", gap: 20, justifyContent: "space-between", alignItems: "flex-end" }}>
              <button className="brutalist-button brutalist-button-red" onClick={reset}>
                <RefreshCw size={16} style={{ marginRight: 2 }} /> New Image
              </button>
              
              <ExportButton 
                onExportPNG={() => downloadFormat("image/png")}
                onExportJPEG={() => downloadFormat("image/jpeg")}
                onExportWebP={() => downloadFormat("image/webp")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
