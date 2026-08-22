'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const tools = [
  { label: 'Text Behind Image', href: '/text-behind', hint: 'AI LAYERING', desc: 'Place text behind subjects in photos automatically' },
  { label: 'Text Match CUT', href: '/match-cut', hint: 'WORD ANCHOR', desc: 'Highlight a word, generate dynamic text cuts & Google Fonts' },
  { label: 'Text Highlighter', href: '/text-highlighter', hint: 'ANIMATED SWEEP', desc: 'Cinematic animated marker, circle, box & underline strokes' },
  { label: 'Production Sync Slate', href: '/sync-slate', hint: 'A/V CLAPPER', desc: 'Sub-frame timecode, 1kHz SMPTE audio tone & CSV shot sheets' },
  { label: 'Exposure & False Color', href: '/exposure-monitor', hint: 'SCOPES & IRE', desc: 'ARRI/RED False Color shader, live waveforms, RGB parade & vectorscope' },
  { label: 'Thumbnail Lab & Split-Tester', href: '/thumbnail-lab', hint: 'CTR GRADER', desc: 'Simulate YouTube feeds, squint tests, competitor benchmarking & badge collision checks' },
  { label: 'Studio Teleprompter', href: '/teleprompter', hint: 'SPEECH LAB', desc: 'Voice Smart Speed, 52 Google Fonts, eyeline spotlight & mirror' },
  { label: 'Creator Space Planner', href: '/space-planner', hint: 'PLAN THE SHOT', desc: 'Design 3D studio layouts with equipment, lighting & budget' },
  { label: 'Auto-Captions', href: '/auto-captions', hint: 'WHISPER AI', desc: 'Generate subtitles from audio with Whisper' },
  { label: 'Carousel Slicer', href: '/carousel-slicer', hint: 'SPLITS', desc: 'Slice wide images into seamless carousel posts' },
  { label: 'Quote Card Maker', href: '/quote-card', hint: 'POST GRAPHICS', desc: 'Turn quotes into styled social cards' },
  { label: 'Platform Resizer', href: '/resizer', hint: 'SIZES', desc: 'Resize images for every social platform instantly' },
  { label: 'Palette Extractor', href: '/palette-extractor', hint: 'COLORS', desc: 'Extract harmonious color palettes from any image' },
  { label: 'Image Compressor', href: '/compressor', hint: 'WEBP / JPEG', desc: 'Batch compress images with quality control' },
  { label: 'Watermark Batch', href: '/watermark', hint: 'BATCH ZIP', desc: 'Add watermarks to hundreds of images in bulk' },
  { label: 'Background Replace', href: '/background-replace', hint: 'AI REMOVE', desc: 'Remove & replace photo backgrounds with AI' },
  { label: 'Silence Trimmer', href: '/silence-trimmer', hint: 'AUDIO CUT', desc: 'Auto-remove silence from audio/video files' },
  { label: 'Color Gradient', href: '/color-gradient', hint: 'GRADIENTS', desc: 'Create beautiful multi-stop CSS gradient backgrounds' },
];

export default function Home() {
  return (
    <div style={{ background: "#f4f4f5", minHeight: "100vh", color: "#000" }}>
      {/* Hero */}
      <section style={{ padding: "100px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", color: "#888" }}>
            v0.2.1
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#000", marginBottom: 24 }}>
          Tools for
          <br />
          Creators<span style={{ color: "#ccc" }}>.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#666", maxWidth: 500, lineHeight: 1.7, marginBottom: 48, fontWeight: 500 }}>
          14 brutalist tools for video, photo, audio & design.
          <br />
          No subscriptions. Runs in your browser.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="#tools"
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
            Explore Tools
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/space-planner"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
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
            Space Planner
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ height: 2, background: "#ddd" }} />
      </div>

      {/* Tools Grid */}
      <section id="tools" style={{ padding: "60px 24px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, background: "#000" }} />
            <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
              All Tools
            </span>
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.02em", color: "#000", marginBottom: 8 }}>
            Every tool, one place
          </h2>
          <p style={{ color: "#888", fontSize: "0.9rem" }}>
            Free, local-first, and built for speed.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: "block",
                padding: 24,
                background: "#fff",
                border: "2px solid #ddd",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#000";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", fontFamily: "monospace", marginBottom: 4 }}>
                    {tool.hint}
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "#000" }}>{tool.label}</h3>
                </div>
                <div style={{ width: 28, height: 28, border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#888" }}>
                  <ChevronRight size={14} />
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.5 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ height: 2, background: "#ddd", marginBottom: 60 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "#000", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Ready to create?
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#888" }}>
              Pick a tool and start building.
            </p>
          </div>
          <Link
            href="/space-planner"
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
            Start Building
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
