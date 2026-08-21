"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";

const tools = [
  { label: "Text Behind Image", href: "/text-behind", hint: "AI LAYERING" },
  { label: "Text Match CUT", href: "/match-cut", hint: "WORD ANCHOR" },
  { label: "Auto-Captions", href: "/auto-captions", hint: "WHISPER AI" },
  { label: "Studio Teleprompter", href: "/teleprompter", hint: "SPEECH LAB" },
  { label: "Carousel Slicer", href: "/carousel-slicer", hint: "SPLITS" },
  { label: "Quote Card Maker", href: "/quote-card", hint: "POST GRAPHICS" },
  { label: "Platform Resizer", href: "/resizer", hint: "SIZES" },
  { label: "Palette Extractor", href: "/palette-extractor", hint: "COLORS" },
  { label: "Image Compressor", href: "/compressor", hint: "WEBP / JPEG" },
  { label: "Watermark Batch", href: "/watermark", hint: "BATCH ZIP" },
  { label: "Background Replace", href: "/background-replace", hint: "AI REMOVE" },
  { label: "Silence Trimmer", href: "/silence-trimmer", hint: "AUDIO CUT" },
  { label: "Creator Space Planner", href: "/space-planner", hint: "PLAN THE SHOT" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isToolPage = tools.some((t) => pathname === t.href);

  // Close the menu on outside click, Escape, or browser back/forward
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
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--bg-border)",
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
          height: 60,
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
              width: 32,
              height: 32,
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid var(--bg-border)",
              background: "#ffffff",
            }}
          >
            <img
              src="/logo.png"
              alt="CK Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            Creator<span style={{ color: "var(--accent)" }}>Kit</span>
            <span style={{ color: "var(--text-hint)", fontWeight: 400 }}>
              .win
            </span>
          </span>
        </Link>

        {/* Tools Dropdown */}
        <div ref={rootRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s, color 0.15s",
              background: menuOpen || isToolPage ? "var(--accent-glow)" : "transparent",
              color: isToolPage ? "var(--accent)" : "var(--text-primary)",
              border: isToolPage ? "1px solid var(--accent)" : "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!menuOpen) {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
              }
            }}
            onMouseLeave={(e) => {
              if (!menuOpen) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <LayoutGrid size={16} />
            Tools
            <ChevronDown
              size={14}
              style={{
                transition: "transform 0.2s ease",
                transform: menuOpen ? "rotate(180deg)" : "none",
                color: menuOpen ? "var(--accent)" : "inherit",
              }}
            />
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                zIndex: 60,
                minWidth: 300,
                maxHeight: "min(70vh, 640px)",
                overflowY: "auto",
                background: "#ffffff",
                border: "3px solid #000000",
                borderTop: "3px solid var(--accent)",
                boxShadow: "6px 6px 0 #000000",
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 900,
                  color: "var(--text-hint)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                  padding: "6px 10px 8px",
                  borderBottom: "1px solid rgba(0,0,0,0.12)",
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "var(--accent)" }}>All tools</span>
                <span
                  style={{
                    background: "var(--accent)",
                    color: "#ffffff",
                    fontSize: "0.62rem",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    padding: "1px 8px",
                    borderRadius: 3,
                  }}
                >
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
                      padding: "9px 10px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      transition: "background 0.12s, color 0.12s",
                      background: isActive ? "var(--accent)" : "transparent",
                      color: isActive ? "#ffffff" : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                        (e.currentTarget as HTMLElement).style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      }
                    }}
                  >
                    <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{tool.label}</span>
                    <span
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        letterSpacing: "0.06em",
                        color: isActive ? "rgba(255,255,255,0.8)" : "var(--text-hint)",
                      }}
                    >
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
          className="brutalist-button brutalist-button-primary"
          style={{ fontSize: "0.78rem", padding: "6px 14px", flexShrink: 0 }}
        >
          All Tools
        </Link>
      </nav>
    </header>
  );
}