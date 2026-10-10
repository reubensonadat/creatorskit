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
    { title: 'Article screenshot mode', text: 'Drop a screenshot of any article — a Wikipedia page, a news story, anything readable — and every word on the page becomes tappable. Tap the words you want and the edit cuts on each one, in your order; a word that appears many times gets a cut for every appearance.' },
    { title: 'Kinetic typography presets', text: 'Punch-in, slide, spin and glitch presets with editable timing curves, so text moves like it was keyframed by hand.' },
    { title: '52 Google Fonts built in', text: 'Broadsheet serifs, condensed posters, mono type — cycle families per cut or lock one voice across the whole edit.' },
    { title: 'TikTok & Shorts export sizes', text: '9:16, 1:1 and 16:9 exports sized for every short-form surface, rendered on your device with no queue.' },
    { title: 'Works offline (PWA)', text: 'Install CreatorsKit once and Match CUT keeps working on flights and bad connections — it is a local tool, not a cloud form.' },
  ],
  stepsTitle: 'How to make a text match cut',
  steps: [
    'Open Text Match CUT and drop in your clip (or pick a demo).',
    'Paste the words you want on screen — the script box drives everything.',
    'Or drop a screenshot of an article — every word becomes tappable, so you can cut on the exact words you choose.',
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
    { q: 'Can I cut on words from a screenshot of an article?', a: 'Yes. Drop a screenshot of any article and every word becomes tappable. Choose the words and the order; the tool cuts on each one — and a word that appears many times gets its own cut for every appearance.' },
    { q: 'What is a match cut, exactly?', a: 'A match cut is an edit where two shots are joined by a shared element — here, a word that appears in one scene and resolves into the next. In short-form video, word-anchor match cuts keep pacing tight and retention high.' },
  ],
  relatedTitle: 'Pairs well with',
  related: [
    { href: '/auto-captions', label: 'Auto Captions', hint: 'Generate the word timings from your audio first' },
    { href: '/thumbnail-lab', label: 'Thumbnail Lab', hint: 'Split-test the cover that carries the edit' },
    { href: '/text-highlighter', label: 'Text Highlighter', hint: 'Animated sweeps for talking-head clips' },
  ],
};

export const HIGHLIGHTER_SEO: ToolSeoContent = {
  kicker: 'TEXT HIGHLIGHTER',
  h2: 'Free Animated Text Highlighter for Videos — Marker, Circle & Box Callouts',
  intro: [
    'The CreatorsKit Text Highlighter puts the emphasis effects you see in MrBeast, Hormozi and every high-retention talking-head edit directly in your browser: marker sweeps that paint across words, circles and boxes drawn around the phrase that matters, underline and tape styles — all animated, all frame-accurate.',
    'Snap a photo of a real newspaper or article and the page becomes your canvas — tap the lines in the order you want them highlighted and the camera dives between them. Everything runs locally on your device; no signup, no watermark, no upload.',
  ],
  featuresTitle: 'What the tool does',
  features: [
    { title: 'Marker sweeps & pen styles', text: 'Classic highlighter-pen sweeps in seven loud colors, plus underline, double-underline, box and tape styles — the full vocabulary of viral caption emphasis.' },
    { title: 'Real newspaper & article photos', text: 'Photograph or screenshot any article and every line becomes tappable. Tap lines in order and the camera dives cut-to-cut between your highlights.' },
    { title: 'Sticky multi-phrase sequences', text: 'Queue several phrases and they highlight one after another without erasing what came before — perfect for step-by-step breakdowns.' },
    { title: '50 curated script presets', text: 'Pre-written scripts for money, motivation, tech and storytelling clips — load one, tweak the words, ship the video.' },
    { title: 'Every export size', text: '9:16, 1:1, 16:9 and more, rendered on your device with clean, watermark-free output.' },
    { title: 'Works offline (PWA)', text: 'Install CreatorsKit once and the Text Highlighter keeps working on flights and dead zones.' },
  ],
  stepsTitle: 'How to highlight text in a video',
  steps: [
    'Open the Text Highlighter and load a preset script or paste your own words.',
    'Pick a highlight style — marker, circle, box, underline or tape — and a loud color.',
    'Set the sweep duration to match your pacing, then play it back.',
    'For article videos, snap or screenshot the page, drop it in, and tap the lines in the order you want them highlighted.',
    'Export the clip — free, no watermark, straight from your browser.',
  ],
  faqTitle: 'Text Highlighter — FAQ',
  faq: [
    { q: 'Is the text highlighter really free?', a: 'Yes. The Text Highlighter is one of CreatorsKit’s free tools — no account, no export limits, no watermark. One unobtrusive ad banner keeps the whole site free.' },
    { q: 'How do I get the Hormozi or MrBeast caption style?', a: 'Choose the marker style with a loud yellow or green, big condensed type, and fast sweeps — that is the exact recipe the big channels use, and it is two taps here.' },
    { q: 'Can I highlight a real newspaper or article photo?', a: 'Yes. Take a photo or screenshot of any article, drop it in, and tap the lines you want highlighted. The camera dives between your highlights in the final video.' },
    { q: 'Does my footage leave my device?', a: 'Never. All rendering happens locally in your browser — there is no server upload step.' },
    { q: 'Can I use it on my phone?', a: 'Yes — it is touch-first. Install CreatorsKit as an app (PWA) from your browser menu for a home-screen icon and offline support.' },
    { q: 'Which sizes can I export?', a: '9:16 for TikTok, Reels and Shorts, 1:1 for feed posts, 16:9 for YouTube, plus editorial portrait ratios — all watermark-free.' },
  ],
  relatedTitle: 'Pairs well with',
  related: [
    { href: '/match-cut', label: 'Text Match CUT', hint: 'Hard word-anchor cuts for the same footage' },
    { href: '/auto-captions', label: 'Auto Captions', hint: 'Generate word timings from your audio first' },
    { href: '/thumbnail-lab', label: 'Thumbnail Lab', hint: 'Split-test the cover that carries the edit' },
  ],
};

export const BUSINESS_DOC_SIGNER_SEO: ToolSeoContent = {
  kicker: 'FREE DOCUMENT SIGNER & DOCUSIGN ALTERNATIVE',
  h2: 'Free Online Document Signer, Invoice Maker & Receipt Printer — No Account, No Monthly Fees',
  intro: [
    'CreatorsKit Business Suite is the 100% free DocuSign alternative for independent creators, agencies, freelancers, and businesses. Upload your existing Word documents (.docx), paste contract text, or generate fresh agreements, invoices, and receipts in seconds.',
    'Unlike DocuSign, HelloSign, or Adobe Sign that charge $10 to $40 per month and cap your envelope sends, CreatorsKit gives you unlimited document signing completely free. Everything is saved locally on your device with your Brand Kit — no signup required, no cloud tracking, and zero subscription paywalls.',
  ],
  featuresTitle: 'Why Creators & Businesses Choose CreatorsKit over DocuSign',
  features: [
    { title: '100% Free Forever with Zero Envelope Limits', text: 'Sign 5 documents, 50 documents, or 500 documents a month without paying a dime. No trial periods that expire, no envelope limits, and no credit card required.' },
    { title: 'Upload & Auto-Format Any Document', text: 'Drop in a Word document (.docx) or paste plain text clauses. CreatorsKit automatically parses recitals, numbered articles, terms, and builds dual execution signature boxes in our Full Legal Blueprint layout.' },
    { title: 'Universal Brand Kit Integration', text: 'Draw or type your signature once in your Brand Kit. It stays securely on your device, auto-signs your documents, and ports to your new phone with encrypted device transfer.' },
    { title: 'Interactive Client E-Sign Links', text: 'Share a live interactive link so clients and brand partners can countersign on their phone with a finger or stylus. Locked execution audit badges guarantee non-tampering.' },
    { title: 'Built-in Mobile Money & Bank Payments', text: 'Specifically built for modern commerce: invoices and contracts feature MTN, Telecel, AT Money, and bank transfer spaces with one-tap zero-space copy for African and global creators.' },
    { title: 'Local-First Privacy & Zero Server Snooping', text: 'Your confidential legal clauses, rates, and client details never sit unencrypted on third-party servers. Your device owns your documents.' },
  ],
  stepsTitle: 'How to Upload, Format & Sign Documents Free Online',
  steps: [
    'Open the Business Suite and pick your document kind (Invoice, Receipt, Agreement, or Letterhead).',
    'Import your existing document: drop a Word file (.docx) or paste your contract clauses into the text box.',
    'Let the Smart Builder organize your text into clean numbered sections, recitals, and dual signature blocks.',
    'Sign as Party A with your saved Brand Kit signature (canvas drawing or cursive script).',
    'Export a crisp, print-ready PDF or copy a secure client link for Party B to review and countersign.',
  ],
  faqTitle: 'Free Document Signer & DocuSign Alternative — FAQ',
  faq: [
    { q: 'Is CreatorsKit really a free alternative to DocuSign?', a: 'Yes. DocuSign charges $10-$40 per user each month and limits you to just 5 envelopes on personal plans. CreatorsKit is completely free with no limits, no account creation, and no subscription.' },
    { q: 'Are electronic signatures legally binding?', a: 'Yes. Under the US ESIGN Act, UETA, European eIDAS, and electronic transaction acts worldwide, digital signatures executed with intent are legally recognized on commercial agreements, service contracts, and invoices.' },
    { q: 'Can I upload my own contract or agreement?', a: 'Yes. You can upload any Microsoft Word (.docx) file, text document (.txt, .md), or paste agreement text directly. CreatorsKit instantly extracts your clauses and arranges them into our Full Legal agreement format with signing spaces.' },
    { q: 'Where is my signature stored?', a: 'Your signature is stored securely in your browser localStorage under your Brand Kit. It never touches our servers unless you choose to send an encrypted client link.' },
    { q: 'Can my client sign on their mobile phone?', a: 'Yes. When you generate a share link, your client opens a mobile-optimized signing interface where they can draw their signature with their finger, date it, and download the countersigned PDF.' },
  ],
  relatedTitle: 'Explore More Creator Business Tools',
  related: [
    { href: '/brand-kit', label: 'Brand Kit', hint: 'Store your logo, colors, fonts, and signature' },
    { href: '/your-data', label: 'Your Data', hint: 'Transfer your signed documents to a new phone' },
    { href: '/invoice', label: 'Quick Invoice', hint: 'Generate simple one-off invoices in seconds' },
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
