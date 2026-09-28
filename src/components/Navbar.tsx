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
          height: 54,
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
              width: 30,
              height: 30,
              overflow: "hidden",
              border: "2px solid #000000",
              background: "#ffffff",
              boxShadow: "2px 2px 0 #000000",
            }}
          >
            <img src="/logo.png" alt="CK" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "-0.02em", color: "#000000", fontFamily: "monospace" }}>
            CK<span style={{ color: "#71717a" }}>.win</span>
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
              padding: "7px 14px",
              fontSize: "0.75rem",
              fontWeight: 900,
              cursor: "pointer",
              background: pathname.startsWith('/blog') ? "#000000" : "#ffffff",
              color: pathname.startsWith('/blog') ? "#ffffff" : "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "2px 2px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-1px, -1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 #000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "2px 2px 0 #000"; }}
          >
            Blog
          </Link>

          {/* Tools Dropdown */}
          <div ref={rootRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                fontSize: "0.75rem",
                fontWeight: 900,
                cursor: "pointer",
                background: menuOpen ? "#000000" : "#ffffff",
                color: menuOpen ? "#ffffff" : "#000000",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0 #000000",
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                  e.currentTarget.style.boxShadow = "3px 3px 0 #000";
                }
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "2px 2px 0 #000";
                }
              }}
            >
              <LayoutGrid size={13} />
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
                  width: 320,
                  maxHeight: "min(70vh, 560px)",
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "2px solid #000000",
                  boxShadow: "4px 4px 0 #000000",
                  padding: 8,
                }}
              >
                <div style={{ fontSize: "0.62rem", fontWeight: 900, color: "#666666", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", padding: "8px 12px", borderBottom: "1px solid #e5e5e5", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>ALL TOOLS</span>
                  <span style={{ background: "#000000", color: "#ffffff", fontSize: "0.62rem", fontWeight: 900, padding: "1px 6px" }}>
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
                          transition: "background 0.1s",
                          color: "#000000",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f4f5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{tool.label}</span>
                        <span style={{ fontSize: "0.58rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.06em", color: "#71717a" }}>
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
                        transition: "background 0.1s",
                        background: isActive ? "#000000" : "transparent",
                        color: isActive ? "#ffffff" : "#000000",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f4f4f5"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{tool.label}</span>
                      <span style={{ fontSize: "0.58rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.06em", color: isActive ? "#a1a1aa" : "#71717a" }}>
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
              fontSize: "0.75rem",
              padding: "7px 16px",
              background: "#000000",
              color: "#ffffff",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0 #000000",
              fontWeight: 900,
              textDecoration: "none",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-1px, -1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 #000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "2px 2px 0 #000"; }}
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
              width: 32,
              height: 32,
              overflow: "hidden",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <img src="/logo.png" alt="CK" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.03em", color: "#09090b" }}>
            CreatorKit<span style={{ color: "#71717a", fontWeight: 500, fontSize: "0.8rem", marginLeft: 4 }}>studio</span>
          </span>
        </Link>

        <div ref={mobileRootRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              background: mobileMenuOpen ? "#f4f4f5" : "transparent",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#18181b",
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {mobileMenuOpen && (
            <div
              style={{
                position: "fixed",
                top: 58,
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
                    padding: "10px 14px",
                    textAlign: "center",
                    background: pathname.startsWith('/blog') ? "#18181b" : "#f4f4f5",
                    color: pathname.startsWith('/blog') ? "#ffffff" : "#18181b",
                    border: "1px solid #e4e4e7",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    borderRadius: "8px",
                  }}
                >
                  Blog &amp; Case Studies
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
