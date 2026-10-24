'use client';

import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { NATIVE_TOOLS, CURATED_DIRECTORY } from '@/data/tools';
import { hapticTap } from '@/lib/haptics';
import AdBanner from '@/components/AdBanner';
import AdSenseUnit from '@/components/AdSenseUnit';

// Homepage FAQ (AdSense remediation 2026-10-23) — rendered as an on-page
// section AND emitted as FAQPage structured data below, so the substance
// reviewers read and the graph search engines read are the same words.
const HOME_FAQS = [
  {
    q: 'Is CreatorsKit really free?',
    a: 'Yes — every tool is free with no signup, no watermark and no export limits. The site is funded by ads placed in reserved page slots beside the workspace, never inside a tool flow or on anything you download. There is no premium tier hiding the second half of the workflow.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. There is nothing to sign up for: no email, no password, no profile. Tools open ready to use, and your settings and working files are stored on your own device — you can inspect and delete everything at /your-data.',
  },
  {
    q: 'Are my photos and videos uploaded to a server?',
    a: 'No. Processing happens on your device, in your browser. Your files are never transmitted or stored on a server. The few optional features that touch the internet — like the server background-removal mode or AI planning with your own API key — are explicit opt-ins, named in the Privacy Policy.',
  },
  {
    q: 'Can I use the tools on my phone?',
    a: 'Yes. Every tool is built mobile-first and works in any modern mobile browser. You can also install CreatorsKit as an app (PWA) from the browser menu — installed, the tools work offline and open like native apps.',
  },
  {
    q: 'Is the work I create watermarked?',
    a: 'Never. Exports are clean, full-quality files with no watermark — the only watermark in the suite is the optional one YOU add to your own images with the Batch Watermark tool.',
  },
  {
    q: 'Who is CreatorsKit for?',
    a: 'Creators and freelancers who produce content and get paid for it: video creators, influencers, photographers, designers and small studios. The suite covers the full arc — scripting, captions, effects, formatting, protection, invoicing and contracts — with payment fields for MoMo and bank rails built in for West African creators, and everything works everywhere else too.',
  },
];

const HOME_FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function Home() {
  return (
    <div style={{ background: "#f4f4f5", minHeight: "100vh", color: "#000000", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      {/* FAQPage structured data — same words as the on-page FAQ section */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_FAQ_JSON_LD) }}
      />
      {/* ─── HERO (TRUE LANDSCAPE SHOWCASE · WANDER.ph INSPIRED) ────────── */}
      <section style={{ padding: "clamp(20px, 3.5vw, 36px) clamp(16px, 5vw, 24px) clamp(24px, 4vw, 40px)", maxWidth: 1200, margin: "0 auto" }}>

        {/* ─── TRUE LANDSCAPE SHOWCASE BANNER (Clean, Unobstructed Artwork) ─── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: "14px",
            overflow: "hidden",
            border: "3px solid #000000",
            boxShadow: "5px 5px 0 #000000",
            background: "#08080a",
            marginBottom: 24,
          }}
        >
          {/* Responsive WebP Landscape Image — 100% Free & Clear View */}
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/assets/text-behind/creators-hero-mobile.webp"
              type="image/webp"
            />
            <source
              srcSet="/assets/text-behind/creators-hero.webp"
              type="image/webp"
            />
            <img
              src="/assets/text-behind/creators-hero.webp"
              alt="CreatorsKit — Text Behind Image Hero"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
              }}
            />
          </picture>

        </div>

        {/* ─── HEADLINE & QUICK ACTIONS (Cleanly below image) ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Action Row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/app"
              onClick={() => hapticTap()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
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
              Open the App
              <ChevronRight size={16} />
            </Link>

            <Link
              href="/text-behind"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
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
              Try Text Behind Image
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* SEO Headline */}
          <div>
            <h1 style={{ fontSize: "clamp(1.9rem, 5.2vw, 3.6rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, color: "#000000", margin: "4px 0 10px" }}>
              Free Tools for Creators &amp; Influencers
            </h1>
            <p style={{ fontSize: "clamp(0.9rem, 2vw, 1.05rem)", color: "#444444", maxWidth: 680, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
              Brutalist tools to bill brands, protect deal agreements, and produce viral video assets. No subscriptions. Runs 100% locally in your browser.
            </p>
          </div>

          {/* ─── INITIAL TOOLS PICKER (Standardized Neobrutalism · Consistent Chevrons) ─── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            {/* Invoices & Deals (Yellow Hero Anchor) */}
            <Link
              href="/business"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                background: "#FFE500",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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
                padding: "11px 18px",
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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
                padding: "11px 18px",
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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
                padding: "11px 18px",
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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
                padding: "11px 18px",
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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

            {/* Research Blog */}
            <Link
              href="/blog"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                background: "#000000",
                color: "#ffffff",
                border: "2px solid #000000",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "0.8rem",
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
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px)" }}>
        <div style={{ height: 2, background: "#000000" }} />
      </div>

      {/* ─── SECTION 1: IN-HOUSE CREATORKIT TOOLS ────────────────────────── */}
      <section id="in-house-tools" style={{ padding: "clamp(34px, 6vw, 60px) clamp(16px, 5vw, 24px) clamp(25px, 5vw, 50px)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Section title without unnecessary verbose paragraph */}
        <div className="home-sec-head" style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, background: "#000000", flexShrink: 0 }} />
          <h2 className="home-sec-title" style={{ fontSize: "clamp(0.98rem, 4.6vw, 2rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "#000000", margin: 0, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            CreatorsKit In-House Tools
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

      {/* ─── GOOGLE AD SLOT BANNER (real unit — invisible until configured) ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px) 36px" }}>
        <AdSenseUnit slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} format="horizontal" style={{ minHeight: 90 }} />
      </div>

      {/* ─── SECTION 2: CURATED EXTERNAL TOOLS ───────────────────────────── */}
      <section id="external-tools" style={{ padding: "clamp(10px, 3vw, 20px) clamp(16px, 5vw, 24px) clamp(40px, 6vw, 70px)", maxWidth: 1200, margin: "0 auto" }}>
        <div className="home-sec-head" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, background: "#000000", flexShrink: 0 }} />
          <h2 className="home-sec-title" style={{ fontSize: "clamp(0.98rem, 4.6vw, 1.8rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "#000000", margin: 0, textTransform: "uppercase", whiteSpace: "nowrap" }}>
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
              <span style={{ fontSize: "clamp(0.56rem, 2.9vw, 0.68rem)", fontWeight: 900, color: "#ffffff", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", whiteSpace: "nowrap" }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 28, alignItems: "center" }}>
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
                  flexWrap: "wrap",
                  gap: "2px 8px",
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

      {/* ─── EDITORIAL: WHY THE SUITE EXISTS (AdSense remediation 2026-10-23) ─ */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "56px clamp(16px, 5vw, 24px) 0" }}>
        <div style={{ borderTop: "3px solid #000000", paddingTop: 22 }}>
          <div
            style={{
              display: "inline-block",
              fontSize: "0.62rem",
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: "0.14em",
              background: "#FFE500",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0 #000000",
              padding: "3px 10px",
              marginBottom: 14,
            }}
          >
            WHY CREATORSKIT
          </div>
          <h2 style={{ fontSize: "clamp(1.4rem, 3.6vw, 1.9rem)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 16px" }}>
            The complete workflow between &ldquo;idea&rdquo; and &ldquo;invoice paid&rdquo;
          </h2>
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: "0.94rem", lineHeight: 1.7, color: "#333333", margin: 0 }}>
              Most creator tools solve one slice of the job and pretend the rest does not exist. The video editor has no
              captions, the caption tool has no resize, the resize tool definitely has no invoice — so a single sponsored
              post turns into an afternoon of tab-hopping between subscriptions. CreatorsKit is the full pipeline in one
              place: script it on the teleprompter, cut it with match cuts and highlights, caption it, resize it for every
              platform, protect it with a watermark, then invoice the brand that paid for it — with an agreement behind the
              invoice and a receipt after payment lands.
            </p>
            <p style={{ fontSize: "0.94rem", lineHeight: 1.7, color: "#333333", margin: 0 }}>
              The second difference is where the work happens. Every tool runs on your device: photos, videos, voice notes
              and client details are processed by your own browser and never uploaded to a server. That is not just a
              privacy promise — on an expensive data plan it is the difference between editing a reel for free and paying
              to upload your own files to someone else&rsquo;s computer. It also means the tools keep working offline, once
              installed as an app.
            </p>
            <p style={{ fontSize: "0.94rem", lineHeight: 1.7, color: "#333333", margin: 0 }}>
              The third difference is the price structure: no accounts, no watermarks, no export limits, no
              &ldquo;free trial&rdquo; that ends mid-project. The tools are funded by ads in reserved page slots — beside
              the workspace and at the bottom of a scroll, never inside a tool flow and never stamped onto anything you
              download. If it is not good enough to ship a client deliverable through, it does not ship at all.
            </p>
          </div>

          {/* Pillar cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 26 }}>
            {[
              {
                n: "01",
                t: "On-device processing",
                d: "Your files are edited by your browser, not uploaded. Faster on slow connections, private by architecture.",
              },
              {
                n: "02",
                t: "One connected pipeline",
                d: "Every tool hands its output to the next — captions feed highlighters, cutouts feed posters, invoices follow deals.",
              },
              {
                n: "03",
                t: "Free core, forever",
                d: "No accounts, no watermarks, no export caps. Light ads outside the workflow pay the bills.",
              },
              {
                n: "04",
                t: "Built for real conditions",
                d: "Made in Ghana for phones, data plans and payment rails — MoMo invoice fields included — where the work actually happens.",
              },
            ].map((c) => (
              <div
                key={c.n}
                style={{
                  background: "#ffffff",
                  border: "2px solid #000000",
                  boxShadow: "3px 3px 0 #000000",
                  padding: "14px 16px",
                }}
              >
                <span style={{ fontSize: "0.62rem", fontWeight: 900, fontFamily: "monospace", background: "#000000", color: "#FFE500", padding: "2px 7px" }}>
                  {c.n}
                </span>
                <h3 style={{ fontSize: "0.92rem", fontWeight: 900, margin: "10px 0 6px", letterSpacing: "-0.01em" }}>{c.t}</h3>
                <p style={{ fontSize: "0.84rem", lineHeight: 1.6, color: "#444444", margin: 0 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ (AdSense remediation 2026-10-23) ───────────────────────────── */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(16px, 5vw, 24px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: "0.66rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.1em", background: "#000000", color: "#ffffff", padding: "2px 7px" }}>
            FAQ
          </span>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            Questions creators ask
          </h2>
          <div style={{ flex: 1, height: 2, background: "#000000", minWidth: 20 }} />
        </div>
        <div style={{ display: "grid", gap: 0, border: "2px solid #000000", background: "#ffffff", boxShadow: "3px 3px 0 #000000" }}>
          {HOME_FAQS.map((f, i) => (
            <details key={i} open={i === 0} style={{ borderTop: i === 0 ? "none" : "2px solid #e4e4e7" }}>
              <summary
                style={{
                  cursor: "pointer",
                  padding: "13px 16px",
                  fontSize: "0.93rem",
                  fontWeight: 900,
                  letterSpacing: "-0.01em",
                  listStyle: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {f.q}
                <span aria-hidden style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "1rem", flexShrink: 0 }}>
                  +
                </span>
              </summary>
              <p style={{ padding: "0 16px 15px", fontSize: "0.88rem", lineHeight: 1.7, color: "#444444", margin: 0 }}>{f.a}</p>
            </details>
          ))}
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

      {/* ─── SITE FOOTER (legal + data transparency) ─────────────────────── */}
      {/* Below-fold leaderboard — the one homepage ad slot (owner ruling:
          clean first impression, monetize the exit scroll). */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 5vw, 24px)" }}>
        <AdBanner slot="leaderboard" />
      </div>

      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "28px clamp(16px, 5vw, 24px) 40px" }}>
        <div style={{ height: 2, background: "#000000", marginBottom: 22 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, color: "#000000", letterSpacing: "0.08em" }}>
            CREATORSKIT · CREATORSKIT.WIN · © 2026
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <Link
              href="/about"
              style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textDecoration: "none", borderBottom: "2px solid #000000", paddingBottom: 2 }}
            >
              ABOUT
            </Link>
            <Link
              href="/your-data"
              style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textDecoration: "none", borderBottom: "2px solid #000000", paddingBottom: 2 }}
            >
              YOUR DATA
            </Link>
            <Link
              href="/privacy"
              style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textDecoration: "none", borderBottom: "2px solid #000000", paddingBottom: 2 }}
            >
              PRIVACY POLICY
            </Link>
            <Link
              href="/terms"
              style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textDecoration: "none", borderBottom: "2px solid #000000", paddingBottom: 2 }}
            >
              TERMS OF SERVICE
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
