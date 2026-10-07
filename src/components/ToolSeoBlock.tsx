import Link from 'next/link';

/**
 * ToolSeoBlock — server-rendered, crawlable long-form content rendered
 * BELOW the tool UI inside the tool page's layout (owner question
 * 2026-10-07: "do we need separate description pages to rank?").
 *
 * Answer implemented in code: NO separate thin description pages (they'd
 * split ranking signals and risk thin-content penalties). Instead, the
 * REAL tool URLs get the depth Google rewards — a below-the-fold section
 * with H2/H3s, feature copy, how-to steps, FAQs and internal links.
 * This is the remove.bg / canva.com pattern: tool first, content under it.
 *
 * Usage (in a tool's layout.tsx, after {children}):
 *   <ToolSeoBlock content={MATCH_CUT_SEO} />
 *
 * Pure server component — zero JS shipped to the client.
 */

export interface ToolSeoContent {
  /** eyebrow, e.g. 'MATCH CUT' */
  kicker: string;
  h2: string;
  intro: string[];
  featuresTitle: string;
  features: { title: string; text: string }[];
  stepsTitle: string;
  steps: string[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  /** internal links: { href, label } */
  relatedTitle: string;
  related: { href: string; label: string; hint: string }[];
}

export const MATCH_CUT_SEO: ToolSeoContent = {
  kicker: 'TEXT MATCH CUT',
  h2: 'Free Text Match Cut & Kinetic Typography Generator',
  intro: [
    'Text Match CUT builds the word-anchor transitions you see everywhere on TikTok, Reels and YouTube Shorts — a word lands on the beat, the scene cuts, and the next word keeps the rhythm. It used to take After Effects and an afternoon. Here it takes your video and about a minute.',
    'Everything runs locally in your browser. No signup, no upload to a server, no watermark on your export. Your footage never leaves your device.',
  ],
  featuresTitle: 'What the tool does',
  features: [
    { title: 'Word-anchor cuts on the beat', text: 'Type or paste your script, tap words onto the timeline, and each anchored word becomes a hard cut point in the exported clip — the signature match-cut feel of viral edits.' },
    { title: 'Kinetic typography presets', text: 'Punch-in, slide, spin and glitch presets with editable timing curves, so text moves like it was keyframed by hand.' },
    { title: '52 Google Fonts built in', text: 'Broadsheet serifs, condensed posters, mono type — cycle families per cut or lock one voice across the whole edit.' },
    { title: 'TikTok & Shorts export sizes', text: '9:16, 1:1 and 16:9 exports sized for every short-form surface, rendered on your device with no queue.' },
    { title: 'Works offline (PWA)', text: 'Install CreatorsKit once and Match CUT keeps working on flights and bad connections — it is a local tool, not a cloud form.' },
  ],
  stepsTitle: 'How to make a text match cut',
  steps: [
    'Open Text Match CUT and drop in your clip (or pick a demo).',
    'Paste the words you want on screen — the script box drives everything.',
    'Tap the timeline where each word should land; snap to beats or to taps.',
    'Choose a typography preset and font, then play it back to check the rhythm.',
    'Export the finished clip — clean, no watermark, straight to your camera roll or laptop.',
  ],
  faqTitle: 'Text Match CUT — FAQ',
  faq: [
    { q: 'Is the text match cut generator really free?', a: 'Yes. Match CUT is one of CreatorsKit’s free tools. There is no account, no export limit and no watermark — the site is supported by a single unobtrusive ad banner, never by charging creators.' },
    { q: 'Do I need After Effects or Premiere?', a: 'No. Match CUT runs in any modern browser — Chrome on Android, Safari on iPhone, or your desktop. If you can open a web page, you can make the edit.' },
    { q: 'Does my video get uploaded anywhere?', a: 'Never. The tool is fully local: your video is read by the browser, edited on your device, and exported from it. There is no server upload step at all.' },
    { q: 'Can I use it on my phone?', a: 'Yes — the editor is touch-first. Install CreatorsKit as an app (PWA) from your browser menu and Match CUT gets its own icon and offline support.' },
    { q: 'What is a match cut, exactly?', a: 'A match cut is an edit where two shots are joined by a shared element — here, a word that appears in one scene and resolves into the next. In short-form video, word-anchor match cuts keep pacing tight and retention high.' },
  ],
  relatedTitle: 'Pairs well with',
  related: [
    { href: '/auto-captions', label: 'Auto Captions', hint: 'Generate the word timings from your audio first' },
    { href: '/thumbnail-lab', label: 'Thumbnail Lab', hint: 'Split-test the cover that carries the edit' },
    { href: '/text-highlighter', label: 'Text Highlighter', hint: 'Animated sweeps for talking-head clips' },
  ],
};

const styles = {
  wrap: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 'clamp(34px, 6vw, 64px) clamp(16px, 5vw, 24px) 60px',
    fontFamily: 'var(--font-geist-mono, monospace)',
    color: '#18181b',
  } as const,
  kicker: {
    fontSize: '0.62rem',
    fontWeight: 900,
    letterSpacing: '0.14em',
    color: '#71717a',
    marginBottom: 8,
  } as const,
  h2: {
    fontSize: 'clamp(1.35rem, 4vw, 2.1rem)',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    margin: '0 0 14px',
  } as const,
  rule: { height: 2, background: '#000', width: 56, margin: '0 0 18px' } as const,
  p: {
    fontSize: '0.92rem',
    lineHeight: 1.7,
    color: '#3f3f46',
    margin: '0 0 12px',
    maxWidth: 720,
  } as const,
  h3: {
    fontSize: '0.78rem',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    margin: '34px 0 14px',
  } as const,
  feature: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  } as const,
  featureCard: {
    border: '2px solid #000',
    background: '#fff',
    padding: '14px 16px',
    boxShadow: '3px 3px 0 #000',
  } as const,
  featureTitle: { fontSize: '0.85rem', fontWeight: 900, margin: '0 0 6px' } as const,
  featureText: { fontSize: '0.8rem', lineHeight: 1.6, color: '#3f3f46', margin: 0 } as const,
  ol: { margin: 0, paddingLeft: 22, display: 'grid', gap: 8, maxWidth: 720 } as const,
  li: { fontSize: '0.88rem', lineHeight: 1.6, color: '#3f3f46' } as const,
  faq: { display: 'grid', gap: 0, maxWidth: 820, border: '2px solid #000', background: '#fff', boxShadow: '3px 3px 0 #000' } as const,
  details: { borderBottom: '1.5px solid #e4e4e7', padding: '12px 16px' } as const,
  summary: { fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', listStyle: 'none' } as const,
  answer: { fontSize: '0.82rem', lineHeight: 1.65, color: '#3f3f46', marginTop: 8 } as const,
  relatedGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
    maxWidth: 820,
  } as const,
  relatedLink: {
    display: 'block',
    border: '2px solid #000',
    background: '#fff',
    padding: '12px 14px',
    textDecoration: 'none',
    color: '#000',
    boxShadow: '3px 3px 0 #000',
  } as const,
  relatedLabel: { fontSize: '0.85rem', fontWeight: 900, display: 'block' } as const,
  relatedHint: { fontSize: '0.72rem', color: '#71717a', display: 'block', marginTop: 3 } as const,
};

export default function ToolSeoBlock({ content }: { content: ToolSeoContent }) {
  return (
    <section className="tool-seo-block" style={styles.wrap} aria-label={`About ${content.kicker.toLowerCase()}`}>
      <div style={styles.kicker}>{content.kicker}</div>
      <h2 style={styles.h2}>{content.h2}</h2>
      <div style={styles.rule} />
      {content.intro.map((paragraph, i) => (
        <p key={i} style={styles.p}>
          {paragraph}
        </p>
      ))}

      <h3 style={styles.h3}>{content.featuresTitle}</h3>
      <div style={styles.feature}>
        {content.features.map((f) => (
          <div key={f.title} style={styles.featureCard}>
            <div style={styles.featureTitle}>{f.title}</div>
            <p style={styles.featureText}>{f.text}</p>
          </div>
        ))}
      </div>

      <h3 style={styles.h3}>{content.stepsTitle}</h3>
      <ol style={styles.ol}>
        {content.steps.map((s, i) => (
          <li key={i} style={styles.li}>
            {s}
          </li>
        ))}
      </ol>

      <h3 style={styles.h3}>{content.faqTitle}</h3>
      <div style={styles.faq}>
        {content.faq.map((item) => (
          <details key={item.q} style={styles.details}>
            <summary style={styles.summary}>{item.q}</summary>
            <div style={styles.answer}>{item.a}</div>
          </details>
        ))}
      </div>

      <h3 style={styles.h3}>{content.relatedTitle}</h3>
      <div style={styles.relatedGrid}>
        {content.related.map((r) => (
          <Link key={r.href} href={r.href} style={styles.relatedLink}>
            <span style={styles.relatedLabel}>{r.label}</span>
            <span style={styles.relatedHint}>{r.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
