'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const tools = [
  { label: 'Text Behind Image', href: '/text-behind', hint: 'AI LAYERING', desc: 'Place text behind subjects in photos automatically' },
  { label: 'Text Match CUT', href: '/match-cut', hint: 'WORD ANCHOR', desc: 'Highlight a word, generate dynamic text cuts' },
  { label: 'Auto-Captions', href: '/auto-captions', hint: 'WHISPER AI', desc: 'Generate subtitles from audio with Whisper' },
  { label: 'Studio Teleprompter', href: '/teleprompter', hint: 'SPEECH LAB', desc: 'Pro teleprompter with speed control & mirroring' },
  { label: 'Carousel Slicer', href: '/carousel-slicer', hint: 'SPLITS', desc: 'Slice wide images into carousel posts' },
  { label: 'Quote Card Maker', href: '/quote-card', hint: 'POST GRAPHICS', desc: 'Turn quotes into styled social cards' },
  { label: 'Platform Resizer', href: '/resizer', hint: 'SIZES', desc: 'Resize images for every platform instantly' },
  { label: 'Palette Extractor', href: '/palette-extractor', hint: 'COLORS', desc: 'Extract color palettes from any image' },
  { label: 'Image Compressor', href: '/compressor', hint: 'WEBP / JPEG', desc: 'Batch compress images with quality control' },
  { label: 'Watermark Batch', href: '/watermark', hint: 'BATCH ZIP', desc: 'Add watermarks to hundreds of images' },
  { label: 'Background Replace', href: '/background-replace', hint: 'AI REMOVE', desc: 'Remove & replace backgrounds with AI' },
  { label: 'Silence Trimmer', href: '/silence-trimmer', hint: 'AUDIO CUT', desc: 'Auto-remove silence from audio/video' },
  { label: 'Color Gradient', href: '/color-gradient', hint: 'GRADIENTS', desc: 'Create beautiful gradient backgrounds' },
  { label: 'Creator Space Planner', href: '/space-planner', hint: 'PLAN THE SHOT', desc: 'Design studio layouts with equipment & budget' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Hero */}
      <section style={{ padding: '120px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, background: 'rgba(212, 165, 55, 0.15)', border: '1px solid rgba(212, 165, 55, 0.3)', marginBottom: 24 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'monospace' }}>v0.2.1 — Creators Kit</span>
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, color: '#1A1A1A', marginBottom: 24 }}>
            Tools for <span style={{ color: 'var(--accent)' }}>Creators</span>
            <br />who <span style={{ color: 'var(--accent)' }}>ship</span>.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#6B6863', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="#tools" className="brutalist-button brutalist-button-primary" style={{ padding: '16px 32px', fontSize: '1rem' }}>
              Explore Tools
              <ChevronRight size={20} style={{ marginLeft: 8 }} />
            </Link>
            <Link href="/space-planner" className="brutalist-button" style={{ padding: '16px 32px', fontSize: '1rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              Try Space Planner
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" style={{ padding: '0 24px 120px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1A1A1A', marginBottom: 8 }}>
            All Tools
          </h2>
          <p style={{ color: '#6B6863', fontSize: '1rem' }}>
            Every tool is free, local-first, and built for speed.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: 'block',
                padding: 28,
                background: '#FFFFFF',
                border: '2px solid #E8E4DC',
                borderRadius: 16,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '6px 6px 0 rgba(212,165,55,0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E8E4DC';
                e.currentTarget.style.boxShadow = '4px 4px 0 rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: 'rgba(212,165,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,165,55,0.3)' }}>
                  <span style={{ fontSize: '1.5rem' }}>🛠</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 4 }}>
                    {tool.hint}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1A1A1A' }}>{tool.label}</h3>
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#6B6863', lineHeight: 1.6, marginBottom: 16 }}>
                {tool.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                Open Tool
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#1A1A1A', border: '2px solid #000', borderRadius: 24, padding: '60px 40px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 16, letterSpacing: '-0.02em' }}>
            Ready to create?
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            Pick a tool and start building. No login, no limits, no BS.
          </p>
          <Link href="/space-planner" className="brutalist-button brutalist-button-primary" style={{ padding: '16px 32px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Start with Space Planner
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}