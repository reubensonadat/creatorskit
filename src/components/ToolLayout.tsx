"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  Layers,
  Scissors,
  Captions,
  MonitorPlay,
  Images,
  Quote,
  Maximize2,
  Palette,
  FileImage,
  Droplets,
  Eraser,
  AudioLines,
  Sparkles,
  Ruler,
} from "lucide-react";

const tools = [
  { label: "Text Behind Image", href: "/text-behind", hint: "AI LAYERING", icon: Layers },
  { label: "Text Match CUT", href: "/match-cut", hint: "WORD ANCHOR", icon: Scissors },
  { label: "Auto-Captions", href: "/auto-captions", hint: "WHISPER AI", icon: Captions },
  { label: "Studio Teleprompter", href: "/teleprompter", hint: "SPEECH LAB", icon: MonitorPlay },
  { label: "Carousel Slicer", href: "/carousel-slicer", hint: "SPLITS", icon: Images },
  { label: "Quote Card Maker", href: "/quote-card", hint: "POST GRAPHICS", icon: Quote },
  { label: "Platform Resizer", href: "/resizer", hint: "SIZES", icon: Maximize2 },
  { label: "Palette Extractor", href: "/palette-extractor", hint: "COLORS", icon: Palette },
  { label: "Image Compressor", href: "/compressor", hint: "WEBP / JPEG", icon: FileImage },
  { label: "Watermark Batch", href: "/watermark", hint: "BATCH ZIP", icon: Droplets },
  { label: "Background Replace", href: "/background-replace", hint: "AI REMOVE", icon: Eraser },
  { label: "Silence Trimmer", href: "/silence-trimmer", hint: "AUDIO CUT", icon: AudioLines },
  { label: "Color Gradient", href: "/color-gradient", hint: "GRADIENTS", icon: Sparkles },
  { label: "Creator Space Planner", href: "/space-planner", hint: "PLAN THE SHOT", icon: Ruler },
];

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTool = tools.find((t) => pathname === t.href);
  const [hovered, setHovered] = useState(false);
  const noAds = pathname === "/space-planner" || pathname === "/teleprompter";

  return (
    <div style={{ display: "grid", gridTemplateRows: "52px 1fr", height: "100vh", background: "#f4f4f5", overflow: "hidden" }}>
      {/* Topbar */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "2px solid #000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              border: "2px solid #000",
              background: "#fff",
              color: "#000",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#000" }}>
              {currentTool?.label || "Tool"}
            </h1>
            <div style={{ fontSize: "0.6rem", fontFamily: "monospace", fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {currentTool?.hint}
            </div>
          </div>
        </div>
        <Link
          href="/"
          style={{
            fontSize: "0.7rem",
            padding: "6px 14px",
            background: "#000",
            color: "#fff",
            border: "2px solid #000",
            fontWeight: 900,
            textDecoration: "none",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          CK.win
        </Link>
      </header>

      {/* Main area */}
      <div style={{ display: "flex", overflow: "hidden" }}>
        {/* Sidebar - hidden on fullscreen apps */}
        {!noAds && (
        <aside
          style={{
            width: hovered ? 200 : 52,
            background: "#ffffff",
            borderRight: "2px solid #000000",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            transition: "width 0.2s ease",
            flexShrink: 0,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div style={{ padding: hovered ? "12px 10px 8px" : "12px 0 8px", borderBottom: hovered ? "1px solid #eee" : "none" }}>
            {hovered ? (
              <div style={{ fontSize: "0.55rem", fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
                Tools
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, background: "#000" }} />
              </div>
            )}
          </div>
          <div style={{ padding: hovered ? "6px" : "6px 0" }}>
            {tools.map((tool) => {
              const isActive = pathname === tool.href;
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  title={tool.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: hovered ? 10 : 0,
                    padding: hovered ? "8px 10px" : "10px 0",
                    marginBottom: 2,
                    textDecoration: "none",
                    background: isActive ? "#000" : "transparent",
                    color: isActive ? "#fff" : "#444",
                    fontWeight: isActive ? 900 : 600,
                    fontSize: "0.78rem",
                    justifyContent: hovered ? "flex-start" : "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#000"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#444"; } }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {hovered && (
                    <>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tool.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.48rem", fontFamily: "monospace", opacity: 0.5, flexShrink: 0 }}>
                        {tool.hint}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>
        )}

        {/* Left Ad - hidden on fullscreen apps */}
        {!noAds && (
          <div
            style={{
              width: 160,
              background: "#f4f4f5",
              borderRight: "1px solid #e5e5e5",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 16,
              flexShrink: 0,
            }}
            className="ad-panel"
          >
            <div style={{ width: "100%", padding: "0 10px" }}>
              <div style={{ width: "100%", aspectRatio: "300/250", background: "#fff", border: "2px dashed #ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.55rem", color: "#aaa", fontFamily: "monospace" }}>300x250</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: noAds ? 0 : "24px", minWidth: 0 }}>
          {children}
        </main>

        {/* Right Ad - hidden on fullscreen apps */}
        {!noAds && (
          <div
            style={{
              width: 160,
              background: "#f4f4f5",
              borderLeft: "1px solid #e5e5e5",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 16,
              gap: 16,
              flexShrink: 0,
            }}
            className="ad-panel"
          >
            <div style={{ width: "100%", padding: "0 10px" }}>
              <div style={{ width: "100%", aspectRatio: "300/250", background: "#fff", border: "2px dashed #ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.55rem", color: "#aaa", fontFamily: "monospace" }}>300x250</span>
              </div>
            </div>
            <div style={{ width: "100%", padding: "0 10px" }}>
              <div style={{ width: "100%", aspectRatio: "300/250", background: "#fff", border: "2px dashed #ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.55rem", color: "#aaa", fontFamily: "monospace" }}>300x250</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .ad-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
