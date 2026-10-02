"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, X, PanelLeftOpen } from "lucide-react";

import { SiteNavList, findTool } from "@/components/nav/SiteNav";

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTool = findTool(pathname);
  const [hovered, setHovered] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sideAdOpen, setSideAdOpen] = useState(false);

  return (
    <div className="tool-layout-root" style={{ display: "grid", gridTemplateRows: "52px 1fr", background: "#f4f4f5", overflow: "hidden" }}>
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
        {/* Desktop Sidebar */}
        <aside
          className="tool-layout-desktop-sidebar"
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
            <SiteNavList variant="rail" expanded={hovered} currentHref={pathname} />
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

          {/* NON-INTRUSIVE SIDE POPUP AD (For In-House Tools) */}
          <div className="tool-layout-ad-wrapper">
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
          </div>
        </main>
      </div>
    </div>
  );
}
