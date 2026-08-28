"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LayoutGrid, Menu, X } from "lucide-react";
import { ALL_TOOLS } from "@/data/tools";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (mobileRootRef.current && !mobileRootRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const onPopState = () => {
      setMenuOpen(false);
      setMobileMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

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
      {/* Desktop Nav */}
      <nav
        className="navbar-desktop"
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

        {/* Right Section: Blog + Tools Dropdown + All Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: "0.75rem",
              fontWeight: 900,
              cursor: "pointer",
              background: pathname.startsWith('/blog') ? "#000000" : "#ffffff",
              color: pathname.startsWith('/blog') ? "#FFE500" : "#000000",
              border: "2px solid #000",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              textDecoration: "none",
              boxShadow: "2px 2px 0 #000",
              borderRadius: "4px",
            }}
          >
            Blog
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
                    {ALL_TOOLS.length}
                  </span>
                </div>
                {ALL_TOOLS.map((tool) => {
                  const isActive = pathname === tool.href;
                  const isExt = tool.isExternal && (tool.externalUrl || tool.href).startsWith('http');
                  const target = tool.externalUrl || tool.href;

                  if (isExt) {
                    return (
                      <a
                        key={tool.label}
                        href={target}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "8px 12px",
                          textDecoration: "none",
                          transition: "background 0.12s",
                          color: "#000",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{tool.label}</span>
                        <span style={{ fontSize: "0.55rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.06em", color: "#888" }}>
                          {tool.hint} ↗
                        </span>
                      </a>
                    );
                  }

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
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav
        className="navbar-mobile"
        style={{
          padding: "0 12px",
          height: 52,
          display: "none",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
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

        <div ref={mobileRootRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              background: mobileMenuOpen ? "#000" : "transparent",
              border: "2px solid #000",
              cursor: "pointer",
              color: mobileMenuOpen ? "#fff" : "#000",
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {mobileMenuOpen && (
            <div
              style={{
                position: "fixed",
                top: 52,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99,
                background: "#fff",
                overflowY: "auto",
                padding: 16,
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <Link
                  href="/blog"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 8px",
                    textAlign: "center",
                    background: pathname.startsWith('/blog') ? "#000000" : "#ffffff",
                    color: pathname.startsWith('/blog') ? "#FFE500" : "#000000",
                    border: "2px solid #000",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    textDecoration: "none",
                    boxShadow: "2px 2px 0 #000",
                    borderRadius: "4px",
                  }}
                >
                  BLOG &amp; CASE STUDIES
                </Link>
              </div>

              <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>
                ALL TOOLS ({ALL_TOOLS.length})
              </div>
              {ALL_TOOLS.map((tool) => {
                const isActive = pathname === tool.href;
                const isExt = tool.isExternal && (tool.externalUrl || tool.href).startsWith('http');
                const target = tool.externalUrl || tool.href;

                if (isExt) {
                  return (
                    <a
                      key={tool.label}
                      href={target}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        textDecoration: "none",
                        borderBottom: "1px solid #f0f0f0",
                        color: "#000",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{tool.label}</div>
                        <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#888", marginTop: 2 }}>
                          {tool.hint} · EXTERNAL ↗
                        </div>
                      </div>
                    </a>
                  );
                }

                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      textDecoration: "none",
                      borderBottom: "1px solid #f0f0f0",
                      background: isActive ? "#000" : "transparent",
                      color: isActive ? "#fff" : "#000",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{tool.label}</div>
                      <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: isActive ? "#999" : "#888", marginTop: 2 }}>
                        {tool.hint}
                      </div>
                    </div>
                    {tool.badge && (
                      <span style={{ fontSize: "0.55rem", fontFamily: "monospace", fontWeight: 900, background: isActive ? "#FFE500" : "#000", color: isActive ? "#000" : "#fff", padding: "2px 6px" }}>
                        {tool.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
