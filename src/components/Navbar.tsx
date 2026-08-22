"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";

const tools = [
  { label: "Text Behind Image", href: "/text-behind", hint: "AI LAYERING" },
  { label: "Text Match CUT", href: "/match-cut", hint: "WORD ANCHOR" },
  { label: "Text Highlighter", href: "/text-highlighter", hint: "ANIMATED SWEEP" },
  { label: "Production Sync Slate", href: "/sync-slate", hint: "A/V CLAPPER" },
  { label: "Exposure & False Color", href: "/exposure-monitor", hint: "SCOPES & IRE" },
  { label: "Thumbnail Lab & Split-Tester", href: "/thumbnail-lab", hint: "CTR GRADER" },
  { label: "Studio Teleprompter", href: "/teleprompter", hint: "SPEECH LAB" },
  { label: "Creator Space Planner", href: "/space-planner", hint: "PLAN THE SHOT" },
  { label: "Auto-Captions", href: "/auto-captions", hint: "WHISPER AI" },
  { label: "Carousel Slicer", href: "/carousel-slicer", hint: "SPLITS" },
  { label: "Quote Card Maker", href: "/quote-card", hint: "POST GRAPHICS" },
  { label: "Platform Resizer", href: "/resizer", hint: "SIZES" },
  { label: "Palette Extractor", href: "/palette-extractor", hint: "COLORS" },
  { label: "Image Compressor", href: "/compressor", hint: "WEBP / JPEG" },
  { label: "Watermark Batch", href: "/watermark", hint: "BATCH ZIP" },
  { label: "Background Replace", href: "/background-replace", hint: "AI REMOVE" },
  { label: "Silence Trimmer", href: "/silence-trimmer", hint: "AUDIO CUT" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPopState = () => setMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "2px solid #000000",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <nav
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              overflow: "hidden",
              border: "2px solid #000",
              background: "#fff",
            }}
          >
            <img src="/logo.png" alt="CK" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "-0.03em", color: "#000", fontFamily: "monospace" }}>
            CK<span style={{ color: "#888" }}>.win</span>
          </span>
        </Link>

        {/* Tools Dropdown */}
        <div ref={rootRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              fontSize: "0.75rem",
              fontWeight: 900,
              cursor: "pointer",
              background: menuOpen ? "#000" : "transparent",
              color: menuOpen ? "#fff" : "#666",
              border: "2px solid #000",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!menuOpen) { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={(e) => { if (!menuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; } }}
          >
            <LayoutGrid size={14} />
            Tools
            <ChevronDown size={12} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 60,
                minWidth: 320,
                maxHeight: "min(70vh, 640px)",
                overflowY: "auto",
                background: "#fff",
                border: "2px solid #000",
                boxShadow: "4px 4px 0 #000",
                padding: 8,
              }}
            >
              <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", padding: "8px 12px", borderBottom: "1px solid #eee", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>All tools</span>
                <span style={{ background: "#000", color: "#fff", fontSize: "0.6rem", fontWeight: 900, fontFamily: "monospace", padding: "1px 6px" }}>
                  {tools.length}
                </span>
              </div>
              {tools.map((tool) => {
                const isActive = pathname === tool.href;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 12px",
                      textDecoration: "none",
                      transition: "background 0.12s",
                      background: isActive ? "#000" : "transparent",
                      color: isActive ? "#fff" : "#000",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f5f5f5"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{tool.label}</span>
                    <span style={{ fontSize: "0.55rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.06em", color: isActive ? "#999" : "#aaa" }}>
                      {tool.hint}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/#tools"
          style={{
            fontSize: "0.72rem",
            padding: "6px 14px",
            background: "#000",
            color: "#fff",
            border: "2px solid #000",
            fontWeight: 900,
            textDecoration: "none",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; e.currentTarget.style.borderColor = "#333"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#000"; e.currentTarget.style.borderColor = "#000"; }}
        >
          All Tools
        </Link>
      </nav>
    </header>
  );
}
