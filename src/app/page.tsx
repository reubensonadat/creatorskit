'use client';

import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { NATIVE_TOOLS, CURATED_DIRECTORY } from '@/data/tools';

export default function Home() {
  return (
    <div style={{ background: "#f4f4f5", minHeight: "100vh", color: "#000000", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(48px, 10vw, 96px) clamp(16px, 5vw, 24px) clamp(30px, 6vw, 64px)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Headline */}
        <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#000000", marginBottom: 24 }}>
          Tools for
          <br />
          Creators &amp; Influencers
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "clamp(0.95rem, 2.2vw, 1.15rem)", color: "#444444", maxWidth: 620, lineHeight: 1.65, marginBottom: 38, fontWeight: 500 }}>
          Brutalist tools to bill brands with MoMo/Bank, protect your content with deal agreements, and produce viral video assets.
          <br />
          No subscriptions. Runs 100% locally in your browser.
        </p>

        {/* ─── INITIAL TOOLS PICKER (Standardized Neobrutalism · Consistent Chevrons) ─── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Invoices & Deals (Yellow Hero Anchor) */}
          <Link
            href="/business"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 24px",
              background: "#FFE500",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
            }}
          >
            Invoices &amp; Deals
            <ChevronRight size={16} />
          </Link>

          {/* Teleprompter */}
          <Link
            href="/teleprompter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 20px",
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#f4f4f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            Teleprompter
          </Link>

          {/* Match Cut */}
          <Link
            href="/match-cut"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 20px",
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#f4f4f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            Match CUT
          </Link>

          {/* Highlighter */}
          <Link
            href="/text-highlighter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 20px",
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#f4f4f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            Highlighter
          </Link>

          {/* Thumbnail Lab */}
          <Link
            href="/thumbnail-lab"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 20px",
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#f4f4f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            Thumbnail Lab
          </Link>

          {/* Research Blog (Consistent ChevronRight, White on Black) */}
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 22px",
              background: "#000000",
              color: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.82rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#222222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#000000";
            }}
          >
            Research Blog
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px)" }}>
        <div style={{ height: 2, background: "#000000" }} />
      </div>

      {/* ─── SECTION 1: IN-HOUSE CREATORKIT TOOLS ────────────────────────── */}
      <section id="in-house-tools" style={{ padding: "clamp(34px, 6vw, 60px) clamp(16px, 5vw, 24px) clamp(25px, 5vw, 50px)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Section title without unnecessary verbose paragraph */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, background: "#000000" }} />
          <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#000000", margin: 0, textTransform: "uppercase" }}>
            CreatorKit In-House Tools
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
          {NATIVE_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: "block",
                padding: "clamp(16px, 3vw, 22px)",
                background: "#ffffff",
                border: "2px solid #000000",
                borderRadius: "4px",
                boxShadow: tool.isFlagship ? "4px 4px 0 #000000" : "3px 3px 0 #000000",
                textDecoration: "none",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = tool.isFlagship ? "4px 4px 0 #000000" : "3px 3px 0 #000000";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  {/* Yellow Tag Accent Pop (e.g. PHONE & DESKTOP · ESSENTIAL) */}
                  <div
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#000000",
                      background: "#FFE500",
                      padding: "2px 7px",
                      borderRadius: "2px",
                      border: "1.5px solid #000000",
                      fontFamily: "monospace",
                      marginBottom: 8,
                      display: "inline-block",
                    }}
                  >
                    {tool.hint} {tool.badge ? `· ${tool.badge}` : ''}
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#000000", margin: 0, letterSpacing: "-0.01em" }}>
                    {tool.label}
                  </h3>
                </div>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: "2px solid #000000",
                    borderRadius: "4px",
                    background: tool.isFlagship ? "#FFE500" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#000000",
                    boxShadow: "1px 1px 0 #000000",
                    marginLeft: 8,
                  }}
                >
                  <ChevronRight size={15} />
                </div>
              </div>
              <p style={{ fontSize: "0.84rem", color: "#555555", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── GOOGLE AD SLOT BANNER ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px) 36px" }}>
        <div
          id="google-ad-slot-middle"
          style={{
            minHeight: 90,
            background: "#ffffff",
            border: "2px dashed #000000",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#444444",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            padding: 16,
            boxShadow: "3px 3px 0 #000000",
          }}
        >
          <span style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#000000" }}>
            ADVERTISEMENT
          </span>
          <span style={{ fontSize: "0.7rem", marginTop: 4, textAlign: "center", color: "#666666" }}>
            High-Viewability Google AdSense Leaderboard Slot
          </span>
        </div>
      </div>

      {/* ─── SECTION 2: CURATED EXTERNAL TOOLS ───────────────────────────── */}
      <section id="external-tools" style={{ padding: "clamp(10px, 3vw, 20px) clamp(16px, 5vw, 24px) clamp(40px, 6vw, 70px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, background: "#000000" }} />
          <h2 style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#000000", margin: 0, textTransform: "uppercase" }}>
            Recommended External Tools
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
          {CURATED_DIRECTORY.map((tool) => (
            <Link
              key={tool.label}
              href={tool.href}
              style={{
                display: "block",
                padding: "clamp(16px, 3vw, 22px)",
                background: "#ffffff",
                border: "2px dashed #000000",
                borderRadius: "4px",
                textDecoration: "none",
                boxShadow: "2px 2px 0 #000000",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderStyle = "solid";
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "4px 4px 0 #000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderStyle = "dashed";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 0 #000000";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#000000",
                      background: "#ffffff",
                      border: "1px solid #000000",
                      borderRadius: "2px",
                      padding: "2px 6px",
                      fontFamily: "monospace",
                      marginBottom: 8,
                      display: "inline-block",
                    }}
                  >
                    {tool.hint} · EXTERNAL WEB APP
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#000000", margin: 0 }}>
                    {tool.label}
                  </h3>
                </div>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: "1px solid #000000",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#000000",
                    background: "#f4f4f5",
                    marginLeft: 8,
                  }}
                >
                  <ExternalLink size={13} />
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#555555", lineHeight: 1.45, margin: 0 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── SECTION 3: CREATOR RESEARCH & BREAKDOWNS ────────────────────── */}
      <section style={{ padding: "0 clamp(16px, 5vw, 24px) clamp(40px, 6vw, 70px)", maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            background: "#000000",
            color: "#ffffff",
            border: "3px solid #000000",
            borderRadius: "4px",
            boxShadow: "6px 6px 0 #FFE500",
            padding: "clamp(24px, 5vw, 40px)",
          }}
        >
          {/* Header Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, background: "#FFE500" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
                NEW VIRAL RESEARCH &amp; CASE STUDIES
              </span>
            </div>
            <Link
              href="/blog"
              style={{
                color: "#ffffff",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                fontWeight: 900,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: "1px solid #ffffff",
                paddingBottom: 2,
              }}
            >
              VIEW ALL ARTICLES
              <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28, alignItems: "center" }}>
            <div>
              <span
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "3px 8px",
                  fontSize: "0.62rem",
                  fontFamily: "monospace",
                  fontWeight: 900,
                  borderRadius: "2px",
                  marginBottom: 10,
                  display: "inline-block",
                  letterSpacing: "0.04em",
                }}
              >
                YOUTUBE STRATEGY
              </span>
              {/* White Headline - High readability */}
              <h3 style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.25, margin: "0 0 12px", color: "#ffffff" }}>
                Why Veritasium Still Gets 100M+ Views: The 3-Part Formula Deconstructed
              </h3>
              <p style={{ color: "#d4d4d8", fontSize: "0.88rem", lineHeight: 1.55, margin: "0 0 20px" }}>
                How Derek Muller turned dry physics into viral gold by inverting traditional education, targeting misconceptions, and leveraging cinematic A/B plot retention techniques.
              </p>
              {/* Yellow button with BLACK text and ChevronRight */}
              <Link
                href="/blog/veritasium-why-he-still-gets-views-formula"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 22px",
                  background: "#FFE500",
                  color: "#000000",
                  border: "2px solid #000000",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontWeight: 900,
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  boxShadow: "3px 3px 0 #ffffff",
                  transition: "all 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(-2px, -2px)";
                  e.currentTarget.style.boxShadow = "5px 5px 0 #ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "3px 3px 0 #ffffff";
                }}
              >
                READ CASE STUDY
                <ChevronRight size={16} />
              </Link>
            </div>

            {/* Video Preview */}
            <div style={{ border: "2px solid #444444", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <img
                src="https://img.youtube.com/vi/QHhJ8_TJeNo/hqdefault.jpg"
                alt="Veritasium Formula Breakdown"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(0,0,0,0.9)",
                  padding: "8px 12px",
                  borderTop: "1px solid #444444",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.7rem",
                  fontFamily: "monospace",
                }}
              >
                <span style={{ color: "#FFE500", fontWeight: 900 }}>FORMULA:</span>
                <span style={{ color: "#ffffff", fontWeight: 700 }}>Misconception · Paradox · A/B Plot</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px) 80px" }}>
        <div style={{ height: 2, background: "#000000", marginBottom: 50 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900, color: "#000000", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Ready to create?
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#666666", margin: 0, fontFamily: "monospace" }}>
              Pick a tool and start building. Runs 100% locally.
            </p>
          </div>
          <Link
            href="/match-cut"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: "#000000",
              color: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "4px",
              fontWeight: 900,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "5px 5px 0 #000000";
              e.currentTarget.style.background = "#222222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0 #000000";
              e.currentTarget.style.background = "#000000";
            }}
          >
            Start with Match CUT
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
