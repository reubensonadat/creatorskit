"use client";

import { useState, useRef } from "react";
import { 
  RefreshCw, 
  ChevronLeft, 
  Download, 
  Columns,
  Archive
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import SpeederLoader from "@/components/SpeederLoader";

export default function CarouselSlicerPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [slices, setSlices] = useState<string[]>([]);
  const [numSlides, setNumSlides] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      setPreview(dataUrl);
      setSlices([]);
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const sliceImage = () => {
    if (!image) return;
    setIsProcessing(true);
    setTimeout(() => {
      const sliceWidth = Math.floor(image.naturalWidth / numSlides);
      const results: string[] = [];

      for (let i = 0; i < numSlides; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = sliceWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          image,
          i * sliceWidth,
          0,
          sliceWidth,
          image.naturalHeight,
          0,
          0,
          sliceWidth,
          image.naturalHeight
        );
        results.push(canvas.toDataURL("image/png"));
      }

      setSlices(results);
      setIsProcessing(false);
    }, 50);
  };

  const downloadZip = async () => {
    if (!slices.length) return;
    setIsZipping(true);
    const zip = new JSZip();
    for (let i = 0; i < slices.length; i++) {
      const base64 = slices[i].split(",")[1];
      zip.file(`slide-${i + 1}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creatorkit-carousel-slicer.zip";
    a.click();
    URL.revokeObjectURL(url);
    setIsZipping(false);
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setSlices([]);
  };

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div className="grid-bg" />

      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                Carousel Slicer
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                Splits
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              Convert wide landscape grids or panoramas into perfectly sized individual carousel slices.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        {!preview && (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) loadImage(file);
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
              <Columns size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Upload panoramas or banner layouts
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              Supports wide custom banner files. Ideal ratios: 3:1 or wider. File stays secure in your client memory.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadImage(file);
              }}
            />
          </div>
        )}

        {/* Active layout editor */}
        {preview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {(isProcessing || isZipping) && (
              <SpeederLoader message={isProcessing ? "Splitting Panorama" : "Generating ZIP Bundle"} />
            )}

            {/* Main Preview Screen */}
            <div
              style={{
                border: "4px solid #000000",
                background: "#ffffff",
                padding: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "6px 6px 0 #000000",
              }}
            >
              <img
                src={preview}
                alt="Source panorama"
                style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", border: "3px solid #000000" }}
              />
            </div>

            {/* Panel Controls */}
            <div
              className="brutalist-card"
              style={{
                padding: "24px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 32,
                flexWrap: "wrap",
                background: "#ffffff",
              }}
            >
              <div className="slider-row" style={{ flex: 1, minWidth: 260 }}>
                <label>Number of Slide Segments</label>
                <div className="slider-content" style={{ boxShadow: "none", border: "3px solid #000" }}>
                  <div className="slider-wrapper">
                    <input
                      type="range"
                      min={2}
                      max={10}
                      step={1}
                      value={numSlides}
                      onChange={(e) => {
                        setNumSlides(Number(e.target.value));
                        setSlices([]);
                      }}
                      className="custom-slider"
                    />
                  </div>
                  <div className="slider-divider" />
                  <span className="slider-value">{numSlides}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="brutalist-button brutalist-button-red" onClick={reset}>
                  <RefreshCw size={16} style={{ marginRight: 2 }} /> Reset
                </button>
                <button
                  className="brutalist-button brutalist-button-primary"
                  onClick={sliceImage}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Generate Slices"}
                </button>
              </div>
            </div>

            {/* Generated results grid */}
            {slices.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase" }}>
                    Split results output ({slices.length} frames)
                  </h3>
                  <button
                    className="brutalist-button brutalist-button-primary"
                    onClick={downloadZip}
                    disabled={isZipping}
                    style={{ gap: 8 }}
                  >
                    <Archive size={18} />
                    {isZipping ? "Packaging..." : "Download ZIP Package"}
                  </button>
                </div>

                {/* Slices row layout */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(slices.length, 5)}, 1fr)`,
                    gap: 16,
                  }}
                >
                  {slices.map((src, i) => (
                    <div
                      key={i}
                      className="brutalist-card"
                      style={{
                        overflow: "hidden",
                        background: "#ffffff",
                        position: "relative",
                        padding: 0,
                        border: "3px solid #000000",
                        boxShadow: "4px 4px 0 #000000",
                      }}
                    >
                      <img
                        src={src}
                        alt={`Segment ${i + 1}`}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          background: "#ffffff",
                          color: "#000000",
                          fontSize: "0.68rem",
                          fontWeight: 900,
                          padding: "2px 8px",
                          border: "2px solid #000000",
                        }}
                      >
                        {i + 1}
                      </div>
                      <a
                        href={src}
                        download={`slide-${i + 1}.png`}
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          background: "#ffffff",
                          color: "#000000",
                          padding: 6,
                          display: "flex",
                          alignItems: "center",
                          textDecoration: "none",
                          border: "2px solid #000000",
                        }}
                        title={`Download slide ${i + 1}`}
                      >
                        <Download size={14} />
                      </a>
                    </div>
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
