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
  Paintbrush,
  Ruler,
  Highlighter,
  Film,
  Sun,
  Zap,
  X,
} from "lucide-react";

import { ALL_TOOLS } from "@/data/tools";

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "/auto-captions": Captions,
  "/background-replace": Eraser,
  "/beat-sync": Zap,
  "/carousel-slicer": Images,
  "/color-gradient": Paintbrush,
  "/compressor": FileImage,
  "/exposure-monitor": Sun,
  "/match-cut": Scissors,
  "/palette-extractor": Palette,
  "/quote-card": Quote,
  "/resizer": Maximize2,
  "/silence-trimmer": AudioLines,
  "/space-planner": Ruler,
  "/sync-slate": Film,
  "/teleprompter": MonitorPlay,
  "/text-behind": Layers,
  "/text-highlighter": Highlighter,
  "/thumbnail-lab": Images,
  "/watermark": Droplets,
};

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTool = ALL_TOOLS.find((t) => pathname === t.href);
  const [hovered, setHovered] = useState(false);
  const [sideAdOpen, setSideAdOpen] = useState(true);

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
              gap: 4,
              padding: "6px 12px",
              border: "2px solid #000",
              background: "#fff",
              color: "#000",
              textDecoration: "none",
              flexShrink: 0,
              boxShadow: "2px 2px 0 #000",
              fontWeight: 900,
              fontSize: "0.72rem",
              fontFamily: "monospace",
            }}
          >
            <ChevronLeft size={14} />
            HOME
          </Link>
          <div>
            <h1 style={{ fontSize: "0.95rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#000", margin: 0 }}>
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
            background: "#FFE500",
            color: "#000",
            border: "2px solid #000",
            boxShadow: "2px 2px 0 #000",
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

      {/* Main area with clean workspace */}
      <div style={{ display: "flex", overflow: "hidden", height: "calc(100vh - 52px)", position: "relative" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: hovered ? 220 : 52,
            background: "#ffffff",
            borderRight: "2px solid #000000",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            transition: "width 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
            flexShrink: 0,
            zIndex: 40,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div style={{ padding: hovered ? "12px 12px 8px" : "12px 0 8px", borderBottom: hovered ? "1.5px solid #eee" : "none" }}>
            {hovered ? (
              <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#000", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
                TOOLS NAVIGATION
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, background: "#000", borderRadius: 1 }} />
              </div>
            )}
          </div>
          <div style={{ padding: hovered ? "6px 8px" : "6px 7px" }}>
            {ALL_TOOLS.map((tool) => {
              const isActive = pathname === tool.href;
              const Icon = TOOL_ICONS[tool.href] || Layers;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  title={tool.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: hovered ? 10 : 0,
                    padding: hovered ? "8px 10px" : "0",
                    width: hovered ? "100%" : "36px",
                    height: hovered ? "auto" : "36px",
                    margin: hovered ? "0 0 3px 0" : "0 auto 4px auto",
                    textDecoration: "none",
                    background: isActive ? "#000000" : "transparent",
                    color: isActive ? "#FFE500" : "#444",
                    fontWeight: isActive ? 900 : 600,
                    fontSize: "0.78rem",
                    justifyContent: hovered ? "flex-start" : "center",
                    borderRadius: 4,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#f4f4f5";
                      e.currentTarget.style.color = "#000";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#444";
                    }
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {hovered && (
                    <>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tool.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.52rem", fontFamily: "monospace", opacity: 0.7, flexShrink: 0 }}>
                        {tool.hint}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Clean Workspace */}
        <main style={{ flex: 1, overflowY: "auto", minWidth: 0, background: "#f4f4f5", position: "relative" }}>
          {children}

          {/* NON-INTRUSIVE SIDE POPUP AD (For In-House Tools) */}
          {sideAdOpen ? (
            <aside
              aria-label="Sponsored placement"
              style={{
                position: "fixed",
                bottom: 16,
                right: 16,
                width: 300,
                background: "#ffffff",
                border: "3px solid #000000",
                boxShadow: "5px 5px 0 #000000",
                zIndex: 90,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 900,
                    background: "#000",
                    color: "#fff",
                    padding: "2px 6px",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  ADVERTISEMENT
                </span>
                <button
                  onClick={() => setSideAdOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    color: "#000",
                  }}
                  title="Close side ad"
                >
                  <X size={14} />
                </button>
              </div>

              {/* 300x250 Medium Rectangle Google Ad Container */}
              <div
                id="side-popup-ad-slot"
                style={{
                  width: "100%",
                  height: 140,
                  border: "2px dashed #000000",
                  background: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 8,
                }}
              >
                <span style={{ fontSize: "0.68rem", fontWeight: 800, fontFamily: "monospace", color: "#555" }}>
                  Google AdSense Side Unit
                </span>
                <span style={{ fontSize: "0.58rem", fontFamily: "monospace", color: "#888", marginTop: 2 }}>
                  [ 300x250 Responsive Side Placement ]
                </span>
              </div>
            </aside>
          ) : (
            <button
              onClick={() => setSideAdOpen(true)}
              style={{
                position: "fixed",
                bottom: 16,
                right: 16,
                background: "#FFDD00",
                border: "2px solid #000",
                boxShadow: "2px 2px 0 #000",
                padding: "4px 8px",
                fontSize: "0.62rem",
                fontWeight: 900,
                fontFamily: "monospace",
                cursor: "pointer",
                zIndex: 90,
              }}
            >
              SPONSOR AD
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
