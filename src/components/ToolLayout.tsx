"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, X, PanelLeftOpen } from "lucide-react";

import { SiteNavList, findTool } from "@/components/nav/SiteNav";
import { adPlanFor } from "@/data/ads";

function AdRailSlot({ id, height, label }: { id: string; height: number; label: string }) {
  return (
    <div
      id={id}
      style={{
        width: "100%",
        height,
        border: "2px dashed #000000",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        textAlign: "center",
        padding: 10,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: "0.6rem",
          fontWeight: 900,
          background: "#000",
          color: "#fff",
          padding: "2px 8px",
          fontFamily: "monospace",
          textTransform: "uppercase",
        }}
      >
        Advertisement
      </span>
      <span style={{ fontSize: "0.58rem", fontFamily: "monospace", color: "#888" }}>
        [ {label} · AdSense-ready ]
      </span>
    </div>
  );
}

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTool = findTool(pathname);
  const [hovered, setHovered] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Owner ruling 2026-10-07 (per-tool ad plan, src/data/ads.ts):
  //  · rail  → the ONE desktop banner (300×600, ≥1600px), tools that opt out
  //    (sync-slate, video-grabber, recipient/gift pages) get none
  //  · mobileAnchor → the ONE phone banner (320×50 sticky bottom, ≤768px)
  const adPlan = adPlanFor(pathname);

  return (
    <div
      className={`tool-layout-root${adPlan.rail ? " tool-layout-has-rails" : ""}`}
      style={{ display: "grid", gridTemplateRows: "52px 1fr", background: "#f4f4f5", overflow: "hidden" }}
    >
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
          {/* Mobile sidebar toggle */}
          <button
            className="tool-layout-mobile-sidebar-toggle"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            aria-label={mobileSidebarOpen ? "Close tools navigation" : "Open tools navigation"}
            aria-expanded={mobileSidebarOpen}
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              background: mobileSidebarOpen ? "#000" : "transparent",
              border: "2px solid #000",
              cursor: "pointer",
              color: mobileSidebarOpen ? "#fff" : "#000",
              flexShrink: 0,
            }}
          >
            <PanelLeftOpen size={16} />
          </button>
          <Link
            href="/"
            className="tool-layout-topbar-home"
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
          <div className="tool-layout-title-group">
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
          className="tool-layout-topbar-ck"
          style={{
            fontSize: "0.7rem",
            padding: "6px 14px",
            background: "#000000",
            color: "#ffffff",
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
      <div className="tool-layout-body" style={{ display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Desktop Sidebar — expansion OVERLAYS the workspace (owner ruling
            2026-10-07): the lane is a fixed 52px in flow, and the expanded
            220px panel is absolutely positioned on top, so the tool content
            NEVER reflows or squishes when the sidebar opens. Hover tracking
            lives on the aside, and the panel is its DOM child — so the panel
            keeps itself open while the pointer is anywhere inside it. */}
        <aside
          className="tool-layout-desktop-sidebar"
          style={{
            position: "relative",
            width: 52,
            flexShrink: 0,
            // Above ALL page content z-indexes (e.g. sync-slate's camera
            // rig switcher sits at 60) — the sidebar overlay must always win.
            zIndex: 320,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: hovered ? 220 : 52,
              background: "#ffffff",
              borderRight: "2px solid #000000",
              boxShadow: hovered ? "8px 0 16px rgba(0,0,0,0.12)" : "none",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowX: "hidden",
              transition: "width 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
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
              <SiteNavList variant="rail" expanded={hovered} currentHref={pathname} />
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="tool-layout-mobile-sidebar-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: "fixed",
              top: 52,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 240,
            }}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside
          className="tool-layout-mobile-sidebar"
          style={{
            position: "fixed",
            top: 52,
            left: mobileSidebarOpen ? 0 : "-280px",
            width: 260,
            bottom: 0,
            background: "#ffffff",
            borderRight: "2px solid #000000",
            display: "none",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 241,
          }}
        >
          <div style={{ padding: "12px 12px 8px", borderBottom: "1.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#000", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
              TOOLS NAVIGATION
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close tools navigation"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#000", padding: 4, display: "flex", alignItems: "center" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: "6px 8px" }}>
            <SiteNavList variant="drawer" currentHref={pathname} onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </aside>

        {/* Clean Workspace */}
        <main className="tool-layout-main" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minWidth: 0, background: "#f4f4f5", position: "relative" }}>
          {children}

          {/* THE one desktop ad banner (owner ruling 2026-10-07): a single
              right-side 300×600 rail, CSS-gated to ≥1600px viewports, shown
              only for tools whose plan (src/data/ads.ts) keeps it on. */}
          {adPlan.rail ? (
            <aside
              className="tool-layout-ad-rail"
              aria-label="Advertisement"
              style={{
                position: "fixed",
                top: 52,
                right: 0,
                bottom: 0,
                width: 300,
                flexDirection: "column",
                gap: 12,
                padding: "14px 12px",
                zIndex: 10,
                overflowY: "auto",
              }}
            >
              <AdRailSlot id="ck-rail-right-300x600" height={600} label="300 × 600" />
            </aside>
          ) : null}

          {/* THE one phone banner for this tool (per-tool plan): sticky
              320×50 anchor, CSS-gated to ≤768px, tools that opt out get
              nothing. Sits under the consent bar until it is answered. */}
          {adPlan.mobileAnchor ? (
            <div className="ck-anchor-ad" aria-label="Advertisement" id="ck-anchor-mobile-320x50">
              <span
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 900,
                  background: "#000",
                  color: "#fff",
                  padding: "2px 7px",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              >
                Ad
              </span>
              <span style={{ fontSize: "0.58rem", fontFamily: "monospace", color: "#888" }}>
                [ 320 × 50 anchor · AdSense-ready ]
              </span>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
