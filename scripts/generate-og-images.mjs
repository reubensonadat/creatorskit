/**
 * scripts/generate-og-images.mjs
 *
 * Build-time OG (Open Graph) image generator — SEO audit fix #6.
 * Renders neobrutalist 1200x630 brand cards for every tool and writes
 * them to public/og/<name>.png. Zero runtime cost, works on Cloudflare
 * Pages (plain static files), and every tool page gets a rich link
 * preview when shared in DMs, WhatsApp, TikTok, X, Discord, etc.
 *
 * Owner ruling 2026-10-10: the black-background tagline pill under the
 * title is REMOVED (text overflowed / wrapped). The tagline is now
 * plain fitted text under the underline rule, and the yellow FREE
 * corner badge is the single accent.
 *
 * Usage:  node scripts/generate-og-images.mjs
 * Requires: sharp (already in package.json dependencies).
 *
 * These files are referenced by src/lib/seo.ts → toolMetadata() default
 * ogImage (/og/<path>.png) — regenerate after adding a new tool entry.
 */
import sharp from 'sharp';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'og');

const FONT_STACK = 'Arial Black, Impact, Haettenschweiler, Arial, sans-serif';
const MONO_STACK = 'Consolas, Courier New, monospace';

/** XML-escape text before injecting into the SVG template. */
function esc(s) {
    return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

/**
 * Every indexable surface of the site. `file` matches the slug used by
 * seo.ts ogImagePath(): '/' → home.png, '/watermark' → watermark.png.
 * text-behind intentionally absent — it ships real demo screenshots.
 */
const CARDS = [
    { file: 'home', kicker: 'TOOLS FOR CREATORS WHO SHIP', title: 'CREATORSKIT', tag: '20+ FREE TOOLS · NO SIGNUP · NO WATERMARK', big: true },
    { file: 'background-replace', kicker: 'PHOTO · ON-DEVICE AI', title: 'BACKGROUND REMOVER', tag: 'FREE · NO SIGNUP · NO UPLOAD' },
    { file: 'quote-card', kicker: 'DESIGN · TYPE', title: 'QUOTE CARDS', tag: 'FREE · NO SIGNUP · NO WATERMARK' },
    { file: 'business', kicker: 'INVOICE · CONTRACT · E-SIGN', title: 'BUSINESS SUITE', tag: 'FREE DOCUSIGN ALTERNATIVE · NO LIMITS' },
    { file: 'brand-kit', kicker: 'LOGO · COLORS · FONTS · SIGNATURE', title: 'BRAND KIT', tag: 'FREE · SAVED ON YOUR DEVICE' },
    { file: 'invoice', kicker: 'GET PAID · MOMO + BANK', title: 'INVOICE MAKER', tag: 'FREE · UNLIMITED · NO ACCOUNT' },
    { file: 'receipt', kicker: 'PRINT-READY RECEIPTS', title: 'RECEIPT MAKER', tag: 'FREE · INSTANT PDF' },
    { file: 'teleprompter', kicker: 'FILM SOLO · READ NATURALLY', title: 'TELEPROMPTER', tag: 'FREE · WORKS OFFLINE' },
    { file: 'thumbnail-lab', kicker: 'YOUTUBE CTR · SPLIT-TESTS', title: 'THUMBNAIL LAB', tag: 'FREE · SCORE BEFORE YOU UPLOAD' },
    { file: 'auto-captions', kicker: 'TIKTOK · REELS · SHORTS', title: 'AUTO CAPTIONS', tag: 'FREE · ON-DEVICE AI · 50+ STYLES' },
    { file: 'text-highlighter', kicker: 'MRBEAST · HORMOZI STYLE', title: 'TEXT HIGHLIGHTER', tag: 'FREE · NEWSPAPER WORD DIVE' },
    { file: 'match-cut', kicker: 'WORD-ANCHOR EDITS', title: 'MATCH CUT', tag: 'FREE · KINETIC TYPE · NO APP' },
    { file: 'demystify', kicker: 'AI-GUIDED PLANNING', title: 'DEMYSTIFY', tag: 'FREE · BRING YOUR OWN KEY' },
    { file: 'resizer', kicker: 'ANY PLATFORM · ANY SIZE', title: 'RESIZER', tag: 'FREE · BATCH · NO UPLOAD' },
    { file: 'watermark', kicker: 'PROTECT YOUR PHOTOS', title: 'WATERMARK', tag: 'FREE · BATCH · LOGO STAMPS' },
    { file: 'carousel-slicer', kicker: 'ONE VIDEO → MANY POSTS', title: 'CAROUSEL SLICER', tag: 'FREE · IG · LINKEDIN · TIKTOK' },
    { file: 'palette-extractor', kicker: 'COLOR FROM ANY IMAGE', title: 'PALETTE EXTRACTOR', tag: 'FREE · INSTANT SWATCHES' },
    { file: 'sync-slate', kicker: 'MULTI-CAM SYNC', title: 'SYNC SLATE', tag: 'FREE · AUDIO CLAP MATCH' },
    { file: 'color-gradient', kicker: 'CSS-READY GRADIENTS', title: 'COLOR GRADIENTS', tag: 'FREE · COPY + PASTE' },
    { file: 'compressor', kicker: 'SHRINK · CONVERT', title: 'COMPRESSOR', tag: 'FREE · PRIVATE · IN BROWSER' },
    { file: 'video-grabber', kicker: 'PULL CLIPS FROM VIDEOS', title: 'VIDEO GRABBER', tag: 'FREE · NO RE-ENCODE LOSS' },
    { file: 'bouquet', kicker: 'SHAREABLE FLOWERS', title: 'BOUQUET', tag: 'FREE · A LINK, NOT A PDF' },
    { file: 'blog', kicker: 'CREATOR CASE STUDIES', title: 'RESEARCH BLOG', tag: 'FREE · VIRAL FORMULAS DECONSTRUCTED' },
];

/**
 * Fit the title on ONE line inside a 1000px budget (card inner width is
 * ~1050px). Arial Black caps average ≈0.70em per glyph including the
 * negative tracking, so fitted = 1000 / (len * 0.70). Owner feedback
 * 2026-10-10: long titles were still overflowing — this hard-caps by
 * measured budget instead of character-count tiers.
 */
function titleLayout(title, big) {
    const len = title.length;
    const fitted = Math.floor(1000 / (len * 0.7));
    const size = Math.max(56, Math.min(150, fitted));
    const y = big ? 330 : 335;
    return { size, y };
}

/** Plain tagline size that can never exceed the card width. */
function tagSize(tag) {
    // Conservative glyph budget: ~0.62em average advance for the mono stack.
    return Math.max(20, Math.min(30, Math.floor(980 / (tag.length * 0.62))));
}

function svgCard({ kicker, title, tag, big }) {
    const { size, y } = titleLayout(title, big);
    const tSize = tagSize(tag);
    const letterSpacing = size > 120 ? -4 : -2;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f4f4f5"/>
  <g fill="#d4d4d8">
    ${Array.from({ length: 15 }, (_, r) =>
        Array.from({ length: 28 }, (_, c) => `<circle cx="${30 + c * 42}" cy="${30 + r * 42}" r="2.5"/>`).join('')
    ).join('\n    ')}
  </g>
  <rect x="60" y="60" width="1104" height="534" fill="#000000" opacity="0.12"/>
  <rect x="46" y="46" width="1104" height="534" fill="#ffffff" stroke="#000000" stroke-width="6"/>
  <!-- yellow FREE corner badge (the single accent — owner ruling 2026-10-10) -->
  <rect x="46" y="46" width="264" height="104" fill="#FFE500" stroke="#000000" stroke-width="6"/>
  <text x="178" y="113" font-family="${MONO_STACK}" font-size="34" font-weight="700" fill="#000000" text-anchor="middle" letter-spacing="3">FREE</text>
  <!-- kicker -->
  <text x="100" y="212" font-family="${MONO_STACK}" font-size="27" font-weight="700" fill="#52525b" letter-spacing="3">${esc(kicker)}</text>
  <!-- title -->
  <text x="96" y="${y}" font-family="${FONT_STACK}" font-size="${size}" font-weight="900" fill="#000000" letter-spacing="${letterSpacing}">${esc(title)}</text>
  <!-- underline rule -->
  <rect x="100" y="${y + 34}" width="150" height="10" fill="#000000"/>
  <!-- tagline: plain fitted text, NO background pill (owner ruling 2026-10-10) -->
  <text x="100" y="${y + 92}" font-family="${MONO_STACK}" font-size="${tSize}" font-weight="700" fill="#52525b" letter-spacing="1.5">${esc(tag)}</text>
  <!-- bottom bar -->
  <line x1="46" y1="500" x2="1150" y2="500" stroke="#000000" stroke-width="4"/>
  <circle cx="108" cy="540" r="18" fill="#FFE500" stroke="#000000" stroke-width="5"/>
  <text x="140" y="552" font-family="${MONO_STACK}" font-size="30" font-weight="700" fill="#000000">creatorskit.win</text>
  <g stroke="#000000" stroke-width="5" fill="none">
    <polyline points="1040,516 1058,540 1040,564"/>
    <polyline points="1074,516 1092,540 1074,564"/>
  </g>
</svg>`;
}

export async function main() {
    await mkdir(OUT_DIR, { recursive: true });

    // Clear stale cards so renamed tools never leave orphans behind.
    const keep = new Set(CARDS.map((c) => `${c.file}.png`));
    const existing = await readdir(OUT_DIR).catch(() => []);
    for (const f of existing) {
        if (f.endsWith('.png') && !keep.has(f)) {
            await unlink(path.join(OUT_DIR, f)).catch(() => null);
        }
    }

    let ok = 0;
    for (const card of CARDS) {
        const svg = svgCard(card);
        const out = path.join(OUT_DIR, `${card.file}.png`);
        try {
            await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
            ok++;
            console.log(`  ok  ${card.file}.png`);
        } catch (err) {
            console.error(`FAIL  ${card.file}.png — ${err.message}`);
            process.exitCode = 1;
        }
    }
    console.log(`\n${ok}/${CARDS.length} OG cards written to public/og/`);
}

// Only auto-run when executed directly (node scripts/generate-og-images.mjs),
// never when imported for testing.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
