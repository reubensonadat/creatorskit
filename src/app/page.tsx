'use client';

import Link from 'next/link';
import { ChevronRight, ArrowRight, ExternalLink } from 'lucide-react';
import { NATIVE_TOOLS, CURATED_DIRECTORY } from '@/data/tools';

export default function Home() {
  return (
    <div style={{ background: "#f4f4f5", minHeight: "100vh", color: "#000", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      {/* Hero */}
      <section style={{ padding: "clamp(40px, 10vw, 90px) clamp(16px, 5vw, 24px) clamp(30px, 8vw, 70px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", color: "#888" }}>
            v0.4.0 · GH & NG READY
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem, 8vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#000", marginBottom: 24 }}>
          Tools for
          <br />
          Creators &amp; Influencers<span style={{ color: "#FFE500" }}>.</span>
        </h1>
        <p style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)", color: "#666", maxWidth: 580, lineHeight: 1.7, marginBottom: 40, fontWeight: 500 }}>
          Brutalist tools to bill brands with MoMo/Bank, protect your content with deal agreements, and produce viral video assets.
          <br />
          No subscriptions. Runs 100% locally in your browser.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/business"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: "#FFE500",
              color: "#000",
              border: "2px solid #000",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
          >
            Invoices &amp; Deals
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/teleprompter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: "#000",
              color: "#fff",
              border: "2px solid #000",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#000"; }}
          >
            Teleprompter
          </Link>
          <Link
            href="/match-cut"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px",
              background: "transparent",
              color: "#000",
              border: "2px solid #ccc",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ccc"; }}
          >
            Match CUT
          </Link>
          <Link
            href="/text-highlighter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px",
              background: "transparent",
              color: "#000",
              border: "2px solid #ccc",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ccc"; }}
          >
            Highlighter
          </Link>
          <Link
            href="/thumbnail-lab"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px",
              background: "transparent",
              color: "#000",
              border: "2px solid #ccc",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ccc"; }}
          >
            Thumbnail Lab
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px)" }}>
        <div style={{ height: 2, background: "#ddd" }} />
      </div>

      {/* SECTION 1: IN-HOUSE CREATORKIT TOOLS */}
      <section id="in-house-tools" style={{ padding: "clamp(30px, 6vw, 60px) clamp(16px, 5vw, 24px) clamp(25px, 5vw, 50px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 36, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, background: "#000" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
                IN-HOUSE STUDIO SUITE
              </span>
            </div>
            <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#000", margin: 0 }}>
              CreatorKit In-House Tools
            </h2>
          </div>
          <p style={{ color: "#666", fontSize: "0.88rem", maxWidth: 420, margin: 0, fontWeight: 500 }}>
            Built by us. 100% free, runs entirely in your browser with zero server latency.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 8 }}>
          {NATIVE_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: "block",
                padding: "clamp(16px, 3vw, 24px)",
                background: "#fff",
                border: "2px solid #000",
                boxShadow: tool.isFlagship ? "3px 3px 0 #000" : "none",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "5px 5px 0 #000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = tool.isFlagship ? "3px 3px 0 #000" : "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: tool.isFlagship ? "#b45309" : "#888", fontFamily: "monospace", marginBottom: 4 }}>
                    {tool.hint} {tool.badge ? `· ${tool.badge}` : ''}
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#000", margin: 0 }}>{tool.label}</h3>
                </div>
                <div style={{ width: 28, height: 28, border: "2px solid #000", background: tool.isFlagship ? "#FFDD00" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#000" }}>
                  <ChevronRight size={14} />
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5, margin: 0 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* High-Converting Google Ad Slot Banner */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px) 40px" }}>
        <div
          id="google-ad-slot-middle"
          style={{
            minHeight: 100,
            background: "#ffffff",
            border: "2px dashed #000000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#666666",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            padding: 16,
            boxShadow: "4px 4px 0 #000000",
          }}
        >
          <span style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>
            ADVERTISEMENT
          </span>
          <span style={{ fontSize: "0.68rem", marginTop: 4, textAlign: "center" }}>High-Viewability Google AdSense Leaderboard Slot</span>
        </div>
      </div>

      {/* SECTION 2: CURATED EXTERNAL TOOLS (Routed Through Ad Interstitial) */}
      <section id="external-tools" style={{ padding: "clamp(10px, 3vw, 20px) clamp(16px, 5vw, 24px) clamp(40px, 8vw, 80px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, background: "#FFDD00", border: "1px solid #000" }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
              CURATED PARTNER & EXTERNAL WEB TOOLS
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#000", margin: 0 }}>
            Recommended External Tools
          </h2>
          <p style={{ color: "#666", fontSize: "0.88rem", margin: "4px 0 0", fontWeight: 500 }}>
            Curated top-tier web applications for AI depth cutouts, audio stems, SFX, and LUTs.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 8 }}>
          {CURATED_DIRECTORY.map((tool) => (
            <Link
              key={tool.label}
              href={tool.href}
              style={{
                display: "block",
                padding: "clamp(16px, 3vw, 22px)",
                background: "#fff",
                border: "2px dashed #666",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#000";
                e.currentTarget.style.borderStyle = "solid";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "3px 3px 0 #000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#666";
                e.currentTarget.style.borderStyle = "dashed";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", fontFamily: "monospace", marginBottom: 4 }}>
                    {tool.hint} · EXTERNAL WEB APP
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#000", margin: 0 }}>{tool.label}</h3>
                </div>
                <div style={{ width: 26, height: 26, border: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#000" }}>
                  <ExternalLink size={12} />
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.4, margin: 0 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px) 80px" }}>
        <div style={{ height: 2, background: "#ddd", marginBottom: 60 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900, color: "#000", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Ready to create?
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#888" }}>
              Pick a tool and start building.
            </p>
          </div>
          <Link
            href="/match-cut"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: "#000",
              color: "#fff",
              border: "2px solid #000",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; e.currentTarget.style.borderColor = "#333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#000"; e.currentTarget.style.borderColor = "#000"; }}
          >
            Start with Match CUT
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
