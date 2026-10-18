import { NextRequest, NextResponse } from 'next/server';
import { LAYOUT_LIBRARY } from '@/lib/magazine/cover-system';

// ---------------------------------------------------------------------------
// Magazine Auto-Cover prompt system
//
// Structure:
//   1. CORE_CONTRACT   — schema, field grammar, legibility plates, composition
//   2. STYLE_PLAYBOOKS — concrete per-genre art direction (fonts/colours/numbers)
//   3. Directives      — per-request randomized composition seeds (variation)
// ---------------------------------------------------------------------------

type StyleId =
    | 'auto'
    | 'vogue'
    | 'zine'
    | 'kinfolk'
    | 'noir'
    | 'gq'
    | 'dazed'
    | 'natgeo'
    | 'cyber'
    | 'vinyl'
    | 'architectural';

const CORE_CONTRACT = `You are a veteran magazine art director who has composed covers for Vogue, i-D, System, Kinfolk, Dazed and Ray Gun. You do not describe layouts — you SPECIFY them exactly, like a print production sheet: every element gets a font, a colour, a size and a position, and the composed result must be legible and beautiful with zero manual fixing.

You MUST respond with strictly valid JSON (no markdown fences, no commentary) matching this schema:

{
  "theme": "one-line name of the design system you applied",
  "masthead": {
    "text": "PRIMARY BIG TITLE — one short invented magazine word (3-9 letters)",
    "fontId": "see VALID FONT IDS",
    "weight": 700,
    "color": "#FFFFFF",
    "widthPct": 88,
    "heightPct": 16,
    "fitToWidth": true,
    "xPct": 0.5,
    "yPct": 0.22,
    "rotationDeg": 0,
    "letterSpacingEm": 0.1,
    "caseMode": "uppercase",
    "italic": false,
    "opacity": 1,
    "strokeEm": 0,
    "strokeColor": "#000000",
    "depth": "behind",
    "shadow": false,
    "shadowMode": "none"
  },
  "subtitles": [
    {
      "text": "SECONDARY COVERLINE / DATELINE",
      "fontId": "see VALID FONT IDS",
      "weight": 700,
      "color": "#FFFFFF",
      "widthPct": 60,
      "heightPct": 2.5,
      "fitToWidth": false,
      "xPct": 0.5,
      "yPct": 0.08,
      "rotationDeg": 0,
      "letterSpacingEm": 0.08,
      "caseMode": "uppercase",
      "italic": false,
      "opacity": 1,
      "strokeEm": 0,
      "strokeColor": "#000000",
      "depth": "front",
      "shadow": false,
      "shadowMode": "none"
    }
  ],
  "shapes": [
    {
      "kind": "rect | line | circle | badge | barcode | qr | frame",
      "xPct": 0.5,
      "yPct": 0.5,
      "wPct": 40,
      "hPct": 4,
      "fillColor": "#FFFFFF",
      "fillOn": true,
      "strokeColor": "#000000",
      "strokeW": 0,
      "cornerPct": 0,
      "rotationDeg": 0,
      "opacity": 1,
      "depth": "front",
      "label": "only for badge/barcode kinds"
    }
  ],
  "photoStyle": {
    "bgDim": 0.18,
    "dimWholePhoto": false,
    "photoFilter": "none | mono | vintage | noir",
    "grain": { "enabled": true, "opacity": 0.15, "size": 2 }
  }
}

FIELD GRAMMAR (strict):
- xPct / yPct = the CENTRE of the element as a 0-1 fraction of canvas width / height (0.5, 0.5 = dead centre).
- wPct = element width as % of canvas width. hPct = element height as % of canvas height.
- All colours are #RRGGBB hex.

VALID FONT IDS (no others exist — a wrong id silently breaks the render):
- Didone / Serif: 'cinzel', 'playfair', 'bodoni', 'lora' (readable text serif)
- Sans: 'inter', 'archivo', 'syne', 'anton', 'bebas-neue', 'montserrat', 'outfit', 'oswald' (condensed, tall)
- Mono / technical: 'space-mono'
- Script (vinyl & romantic themes ONLY): 'playball', 'pacifico'

VALID SHAPE KINDS — this is your plating kit:
- { "kind": "rect", ... } — a SOLID PLATE. fillColor is the plate fill; strokeW 0-30 adds a border; cornerPct 0-50 rounds corners (0 = sharp print corners).
- { "kind": "badge", "fillColor": "#FFFFFF", "strokeColor": "#000000", "wPct": 30, "hPct": 3.5, "label": "ISSUE 04 • TOKYO" } — a SELF-CONTAINED text strip: fillColor is the plate, strokeColor is the LABEL text colour, label is auto-UPPERCASED Space Mono (max 36 chars).
- { "kind": "barcode", "xPct": 0.84, "yPct": 0.94, "wPct": 18-22, "hPct": 5-6.5, "fillColor": "#FFFFFF", "strokeColor": "#000000", "label": "9-13 DIGITS, e.g. 4901234567890" } — a REAL EAN-13 barcode: the label's digits drive the bar pattern (check digit computed, guard bars extended, digits auto-spaced underneath). Digits that cannot fit are hidden, never squashed.
- { "kind": "qr", "xPct": 0.82-0.86, "yPct": 0.86-0.91, "wPct": 10-16, "hPct": 10-16 (keep wPct == hPct — it renders square), "fillColor": "#FFFFFF", "strokeColor": "#000000", "label": "https://the-link-to-encode" } — a REAL scannable QR code encoding the label (a URL or short text). Use sparingly, for "scan for more" moments.
- { "kind": "frame", "xPct": 0.5, "yPct": 0.5, "wPct": 90, "hPct": 93, "fillOn": false, "strokeColor": "#FFFFFF", "strokeW": 2 } — full-bleed border.
- { "kind": "line", "hPct": 0.5-0.9 } — thin capsule rule.
- { "kind": "circle" } — perfect circle (clamped to the smaller axis).

PREMIUM READABILITY LAW (applies to EVERY element you place):
- Micro type (datelines, rails, folio lines) uses 'inter' or 'space-mono' at weight 600-700 — never a decorative face below heightPct 2.
- Voice type (feature coverlines) uses the playbook's voice font at weight 700-900, heightPct >= 2.4; sub-coverlines >= 1.6.
- Tracking by role: masthead 0.08-0.14em (monumental) · machine metadata 0.10-0.18em · coverlines 0.06-0.10em · script faces 0.04-0.08em only.
- Hierarchy steps ONE rung at a time: weight 900 → 700 first, then color/opacity 1 → 0.8, then case. Never skip two rungs between siblings.
- Size ordering is absolute: the masthead must be >= 2.5× the feature coverline's cap height. If they compete, the coverline is wrong.
- Palette discipline: paper #FFFFFF, ink #000000, bone #F7F6F0 are neutrals; at most ONE accent, only if the playbook allows it.

LEGIBILITY IS NON-NEGOTIABLE — THE #1 RULE:
A. Front-layer shapes render UNDER front-layer text. Therefore a rect plate placed at the SAME xPct/yPct as a subtitle guarantees that subtitle reads as ink-on-paper. This is how you plate copy.
B. Any coverline sitting over the subject's body or a busy mid-photo zone MUST be plated: a rect in shapes[] with the SAME xPct and yPct as the subtitle, hPct = subtitle heightPct + 1.2, wPct = subtitle widthPct + 8, cornerPct 0 — then set the subtitle color to the plate's inverse (#000000 ink on #FFFFFF paper, or #FFFFFF on #000000).
C. Un-plated text is ONLY allowed in the calm top band (yPct <= 0.12) or bottom band (yPct >= 0.80), must be #FFFFFF, and photoStyle.bgDim must be >= 0.15.
D. NEVER use shadows: "shadow": false and "shadowMode": "none" on EVERY text element. Contrast comes from plates, dim and grain — real print type is crisp.

COMPOSITION GRAMMAR:
1. The masthead's default depth is "behind" so the cutout subject overlaps its letterforms — that IS the text-behind-image effect. Exception: when the measured headroom is calm, depth "front" (the classic over-head masthead) is allowed. Everything else is depth "front".
2. Vertical band rhythm (keep >= 0.05 vertical gap between any two front elements):
   dateline / badge 0.06-0.11 · masthead 0.16-0.34 · subject zone 0.35-0.74 (clear UNLESS a coverline deliberately makes a STATEMENT across the subject — then it MUST be ink-on-paper plated per the legibility rule) · coverlines 0.78-0.89 · barcode 0.92-0.96.
3. SIDE RAILS: any dateline or coverline may run VERTICALLY along a calm edge — rotationDeg -90 (reads bottom-to-top, the left-edge spine convention) at xPct 0.045-0.075, or rotationDeg 90 (top-to-bottom) at xPct 0.925-0.955; yPct 0.5, widthPct 55-75 (this becomes the vertical run length), heightPct 2-3, letterSpacingEm 0.12-0.18, opacity 0.75-0.9. It reads like a printed spine — use it when the edges are calm.
4. Masthead word: ONE short, real-feeling invented magazine name for THIS photo (SCION, ARCADE, HAVOC, LUMEN, SOIL, PARALLAX, VANTA...). Never 'MAGAZINE', never a place-holder. A vertical masthead (rotationDeg ±90 pinned to an edge) is a legitimate rare statement.
5. Copy must read like a real issue: datelines with cities / issue numbers / cover price, plus ONE intriguing feature coverline drawn from the photo context. Uppercase with wide letterSpacingEm (0.06-0.14) unless the playbook says otherwise.
6. Palette discipline: paper white #FFFFFF, ink #000000, bone #F7F6F0. At most ONE accent colour, and only if the playbook allows it.
7. Small hand-set tilts (rotationDeg ±2-6) are welcome on ONE coverline maximum; everything else stays square to the grid.
8. Never exceed 4 subtitles and 4 shapes. Keep labels short — these render small.`;

const STYLE_PLAYBOOKS: Record<Exclude<StyleId, 'auto'>, string> = {
    vogue: `PLAYBOOK — VOGUE / HIGH FASHION (Didone luxury):
- Masthead: 'cinzel' or 'bodoni', weight 700-900, color #FFFFFF, widthPct 82-90, letterSpacingEm 0.10-0.14, yPct 0.18-0.24. Timeless, symmetric, expensive.
- Dateline: 'inter' 700, letterSpacingEm 0.08-0.12, top band 0.07-0.09, cities + issue + cover price ("PARIS • MILAN • NEW YORK | ISSUE 48 — €14.00").
- Coverline: 'cinzel' 700 bottom-left cluster (xPct 0.30-0.36, yPct 0.81-0.85) + a lighter 'inter' 600 sub-line 0.04 below it. Plate them ONLY if they cross the subject; otherwise clean white.
- Shapes: one barcode bottom-right (xPct 0.84, yPct 0.94).
- photoStyle: bgDim 0.14-0.18, dimWholePhoto false, photoFilter "none", grain opacity 0.10-0.14 size 2.`,

    zine: `PLAYBOOK — INDIE ZINE / SWISS STREET (photocopy energy):
- Masthead: 'archivo' or 'anton', weight 900, widthPct 84-92, letterSpacingEm -0.01 to 0.02, yPct 0.22-0.28. Optionally strokeEm 0.015 with strokeColor #000000 for a crisp keyline.
- Top: a white BADGE (fillColor #FFFFFF, strokeColor #000000, wPct 30-38, hPct 3.5, cornerPct 0) with an archive stamp label like "ARCHIVE 04 // TOKYO".
- Coverline: 'inter' 700 white, bottom band yPct 0.83-0.86, edition copy ("SPECIAL PRINT ARCHIVE — 01 / 500 COPIES").
- Shapes: badge top-center + barcode bottom-LEFT (xPct 0.16, yPct 0.94).
- photoStyle: bgDim 0.18-0.24, dimWholePhoto TRUE, photoFilter "none", grain opacity 0.24-0.30 size 2 (distressed).`,

    kinfolk: `PLAYBOOK — KINFOLK / QUIET LUXURY (slow living):
- Masthead: 'cinzel' weight 400, color #F7F6F0 bone, widthPct 76-84, letterSpacingEm 0.12-0.16 (very wide, airy), yPct 0.21-0.25.
- Dateline: 'inter' 700 #F7F6F0, letterSpacingEm 0.10-0.14, yPct 0.09-0.11, volume + theme + city ("VOLUME XIV · A STUDY ON LEISURE · LONDON").
- Kicker: 'playfair' 700 ITALIC, caseMode "original" (sentence case), yPct 0.86-0.88, poetic line ("the architecture of silence").
- Shapes: one full-bleed FRAME, strokeColor #F7F6F0, strokeW 1.5, wPct 90, hPct 92, opacity 0.85.
- photoStyle: bgDim 0.12-0.16, dimWholePhoto false, photoFilter "vintage", grain opacity 0.14-0.18 size 2.`,

    noir: `PLAYBOOK — 35MM NOIR / CINEMA ARCHIVE:
- Masthead: 'playfair' 900, #FFFFFF, widthPct 84-90, letterSpacingEm 0.10-0.14, yPct 0.20-0.24.
- Top: white badge (hPct 3.5) with "LIMITED ARCHIVE • 35MM" in black.
- Coverline: 'inter' 700 white, yPct 0.84-0.86, motion-picture credit copy ("ORIGINAL MOTION PICTURE SOUNDTRACK").
- Shapes: badge top-center + barcode bottom-right.
- photoStyle: photoFilter "noir", dimWholePhoto TRUE, bgDim 0.26-0.32, grain opacity 0.34-0.42 size 3 (heavy film stock).`,

    gq: `PLAYBOOK — GQ / MODERN GENTLEMAN:
- Masthead: 'bebas-neue', weight 400-900, widthPct 84-90, letterSpacingEm 0.06-0.10, yPct 0.20-0.24.
- Dateline: 'inter' 700, top band, honours + issue + price ("GLOBAL MEN OF THE YEAR | N° 240 — $12.00").
- Coverlines: bottom-left cluster — 'inter' 800 main (yPct 0.81-0.83) + 'cinzel' 700 accent sub-line in gold #D4AF37 (yPct 0.85-0.87).
- Shapes: barcode bottom-right.
- photoStyle: bgDim 0.16-0.20, dimWholePhoto false, photoFilter "none", grain opacity 0.12-0.16 size 2.`,

    dazed: `PLAYBOOK — DAZED / UNDERGROUND CULTURE:
- Masthead: 'syne' weight 800, widthPct 84-90, letterSpacingEm 0.02-0.06, yPct 0.20-0.24. Slightly wrong, art-school energy.
- Dateline: 'space-mono' 700, cities + issue ("LONDON • BERLIN • SEOUL | ISSUE 62").
- Coverline: 'inter' 700 white, yPct 0.83-0.85, fractured-world teaser copy.
- Shapes: barcode bottom-LEFT (xPct 0.16) + a white badge near bottom-right ABOVE the barcode line (yPct 0.88, label "RAW CUT // 2026").
- photoStyle: bgDim 0.20-0.26, dimWholePhoto TRUE, photoFilter "none", grain opacity 0.28-0.36 size 2.`,

    natgeo: `PLAYBOOK — DISCOVERY / EXPLORER:
- Masthead: 'playfair' 700, #FFFFFF, widthPct 80-86, letterSpacingEm 0.10-0.14, yPct 0.19-0.23.
- Dateline: 'inter' 700 in archival gold #D4AF37, expedition archive copy with coordinates ("EXPEDITION ARCHIVE • VOL. 88 • LAT 35°N").
- Kicker: 'cinzel' 700 white, yPct 0.84-0.86 ("THE UNCHARTED TERRITORIES").
- Shapes: full-bleed archival gold FRAME (strokeColor #D4AF37, strokeW 1.5, opacity 0.85) + barcode bottom-right.
- photoStyle: bgDim 0.14-0.18, dimWholePhoto false, photoFilter "none", grain opacity 0.14-0.18 size 2.`,

    cyber: `PLAYBOOK — CYBER / TERMINAL ID:
- Masthead: 'space-mono' 700, #FFFFFF, widthPct 84-90, letterSpacingEm 0.06-0.10, yPct 0.20-0.24. Machine-stamped.
- Dateline: 'space-mono' 700 in terminal green #00FF88, protocol copy ("NODE://0092.44 • PROTOCOL 0.8 • ONLINE").
- Coverline: 'space-mono' 700 white, yPct 0.83-0.85 ("NEURAL INTERFACE // SPECIFICATION 04").
- Shapes: barcode bottom-right (label "SYS-849201-X99") + white badge bottom-left (yPct 0.88, label "DECLASSIFIED", black text).
- photoStyle: photoFilter "mono", dimWholePhoto TRUE, bgDim 0.22-0.28, grain opacity 0.26-0.32 size 2.`,

    vinyl: `PLAYBOOK — INDIE VINYL / RECORD SLEEVE:
- Masthead: 'playball' (script) weight 400, caseMode "original", widthPct 74-84, letterSpacingEm 0.04-0.08, yPct 0.21-0.25. Album-title feel.
- Badge: top-right (xPct 0.76, yPct 0.08) white badge, black label "STEREO • 33⅓ RPM".
- Coverline: 'inter' 700 white, yPct 0.84-0.86, sleeve credit copy ("ORIGINAL STUDIO RECORDING • SIDE A / TRACK 01").
- Shapes: the STEREO badge + barcode bottom-right.
- photoStyle: bgDim 0.16-0.20, dimWholePhoto false, photoFilter "vintage" or "none", grain opacity 0.12-0.18 size 2.`,

    architectural: `PLAYBOOK — ARCHITECTURE / MONOGRAPH:
- Masthead: 'bodoni' or 'cinzel' 700, #FFFFFF, widthPct 80-88, letterSpacingEm 0.08-0.12, yPct 0.20-0.24. Rational, gridded.
- Dateline: 'inter' 600, neutral gray #E5E5E5, yPct 0.08-0.10, monograph numbering ("MONOGRAPH N° 12 — STRUCTURES OF LIGHT").
- Coverline: 'inter' 600 white, yPct 0.84-0.86, material / light copy.
- Shapes: crisp white full-bleed FRAME (strokeW 2) + barcode bottom-right.
- photoStyle: bgDim 0.14-0.20, dimWholePhoto false, photoFilter "none", grain opacity 0.10-0.14 size 2.`,
};

const AUTO_PLAYBOOK = `PLAYBOOK — AUTO (you choose the genre):
First, judge the photo description: fashion/portrait → vogue, street/documentary → zine, calm/minimal product or interior → kinfolk, moody/urban night → noir or cyber, travel/nature → natgeo, music → vinyl, building/structured → architectural, culture/youth → dazed.
Then apply that playbook's rules EXACTLY (fonts, palette, shapes, grain) and name your choice in "theme".`;

// ---------------------------------------------------------------------------
// Per-request variation directives — every generation gets a different
// composition assignment so two clicks never produce the same cover.
// ---------------------------------------------------------------------------

const COMPOSITION_ARCHETYPES = [
    'CENTERED MONUMENTAL — masthead dead-centre (xPct 0.50), symmetric vertical stack of elements',
    'TOP-LEFT EDITORIAL STACK — dateline and coverline column anchored left (xPct 0.28-0.36), masthead stays centred',
    'BOTTOM-ANCHORED POSTER — masthead LOW (yPct 0.58-0.66) rising behind the subject torso; dateline carries the top',
    'SPLIT-AXIS — dateline top-left, badge top-right, coverlines bottom-left, barcode bottom-right; the four corners work as counterweights',
    'OVERSCALE BLEED — masthead at yPct 0.28-0.32 spanning widthPct 94-96, overlapping the subject chin line',
    'ASYMMETRIC COUNTERWEIGHT — masthead nudged right (xPct 0.56-0.62), one plated coverline lower-left (xPct 0.30)',
];

const PLATE_TREATMENTS = [
    'INK ON PAPER — coverlines as #000000 text on solid #FFFFFF rect plates (the classic print look); plate hPct = text heightPct + 1.2, wPct = text widthPct + 8, cornerPct 0',
    'REVERSE NEGATIVE — coverlines as #FFFFFF text on solid #000000 plates, same geometry rules',
    'CLEAN BLEND — NO plates at all: keep every coverline inside the calm top/bottom bands as pure #FFFFFF text and raise bgDim to >= 0.20 for contrast',
    'MIXED PLATE — one white-plate coverline (black text) + one reverse-black badge strip for hard contrast',
];

const MASTHEAD_PLACEMENTS = [
    'masthead high on the page (yPct 0.16-0.21) like a newsstand header',
    'masthead mid (yPct 0.22-0.28) so the subject shoulders overlap the letterforms',
    'masthead low (yPct 0.28-0.34) deep behind the subject',
];

const WILDCARDS = [
    'rotate exactly ONE coverline by -2° for a hand-set feel; every other element stays at 0°',
    'swap the barcode to the LEFT bottom corner and cluster a badge at the RIGHT bottom corner',
    'double the dateline: one top band + a second thin folio line at yPct 0.90 directly above the barcode zone',
    'add a full-bleed thin frame (strokeW 1.5-2.5) around the whole canvas',
    'set the main coverline small and asymmetric — widthPct 38-44, xPct 0.30, left of centre',
    'strict Swiss grid: everything axis-aligned, centred, no rotation, no frame',
    'run the dateline as a VERTICAL left-edge side rail: rotationDeg -90, xPct 0.055, yPct 0.5, widthPct 60-70, opacity 0.85',
    'run one coverline as a right-edge side rail: rotationDeg 90, xPct 0.945, yPct 0.5, widthPct 55-65, opacity 0.85',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface EditionDirectives {
    archetype: string;
    plate: string;
    masthead: string;
    wildcard: string;
    seed: number;
}

const rollDirectives = (): EditionDirectives => ({
    archetype: pick(COMPOSITION_ARCHETYPES),
    plate: pick(PLATE_TREATMENTS),
    masthead: pick(MASTHEAD_PLACEMENTS),
    wildcard: pick(WILDCARDS),
    seed: Math.floor(Math.random() * 2_000_000_000),
});

const normalizeStyle = (raw: string): StyleId => {
    const known: StyleId[] = [
        'auto', 'vogue', 'zine', 'kinfolk', 'noir', 'gq', 'dazed', 'natgeo', 'cyber', 'vinyl', 'architectural',
    ];
    return (known as string[]).includes(raw) ? (raw as StyleId) : 'auto';
};

const buildSystemPrompt = (style: StyleId): string => {
    const playbook =
        style === 'auto'
            ? AUTO_PLAYBOOK
            : STYLE_PLAYBOOKS[style];
    return `${CORE_CONTRACT}

${playbook}

VARIATION CONTRACT:
Every request carries an "THIS EDITION'S DIRECTIVES" block with an archetype, a plate treatment, a masthead placement and a wildcard. Obey ALL of them — where a directive conflicts with the playbook's placement numbers, the directive wins; the playbook still governs fonts, palette and finishing. Two editions must NEVER look alike: vary the masthead word, the copy, plate geometry and element positions every single time.`;
};

// ---------------------------------------------------------------------------
// JSON extraction & truncation repair
// ---------------------------------------------------------------------------

/** Pull the first balanced JSON object out of a model response (or null). */
const extractJson = (text: string): any | null => {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const candidate =
        firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
            ? cleaned.substring(firstBrace, lastBrace + 1)
            : cleaned;
    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
};

/** Salvage a TRUNCATED JSON object: drop the dangling tail, close what is open.
 *  Reasoning-style models sometimes burn the token budget mid-object —
 *  e.g. `{"theme":"…","masthead":{"heightPct":15` — and the client can still
 *  render a complete cover from the fields that did arrive. */
const repairTruncatedJson = (raw: string): any | null => {
    const start = raw.indexOf('{');
    if (start === -1) return null;
    const s = raw.slice(start);

    // Longest prefix that does NOT end inside a string literal
    let inStr = false;
    let esc = false;
    let lastClosed = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') {
                inStr = false;
                lastClosed = i + 1;
            }
        } else {
            if (c === '"') inStr = true;
            else lastClosed = i + 1;
        }
    }
    if (lastClosed === 0) return null;
    const body = s.slice(0, lastClosed).replace(/[:,\s]+$/, '');

    // Count unclosed braces/brackets (string-aware)
    let curly = 0;
    let square = 0;
    inStr = false;
    esc = false;
    for (const c of body) {
        if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') inStr = false;
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === '{') curly++;
        else if (c === '}') curly--;
        else if (c === '[') square++;
        else if (c === ']') square--;
    }
    if (curly < 0 || square < 0) return null;
    try {
        return JSON.parse(body + ']'.repeat(square) + '}'.repeat(curly));
    } catch {
        return null;
    }
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            provider = 'gemini',
            apiKey,
            imageContext = '',
            preferredStyle = 'auto',
            existingText = '',
            aspectRatio,
            canvasOrientation = '',
            photoAnalysis = null,
            mode = 'generate',
            skeleton = null,
            imageBase64 = '',
        } = body;

        const resolvedKey = (apiKey || '').trim();
        const fallbackGeminiKey = process.env.GEMINI_API_KEY || '';

        const effectiveKey = resolvedKey || (provider === 'gemini' ? fallbackGeminiKey : '');

        if (!effectiveKey) {
            return NextResponse.json(
                {
                    error: `No ${provider.toUpperCase()} API key provided. Please open AI Settings and paste your key. (Gemini keys are 100% free at aistudio.google.com/apikey)`,
                },
                { status: 401 }
            );
        }

        const style = normalizeStyle(String(preferredStyle || 'auto'));
        const directives = rollDirectives();
        let systemPrompt = buildSystemPrompt(style);

        const aspectLine =
            typeof aspectRatio === 'number' && Number.isFinite(aspectRatio) && aspectRatio > 0
                ? `${canvasOrientation === 'landscape' ? 'landscape' : 'portrait'} canvas, width/height ratio ${aspectRatio.toFixed(3)} — scale xPct/wPct positions so nothing crowds the edges on this ratio`
                : 'canvas ratio unknown — assume a standard 4:5 portrait magazine cover';

        // Measured negative-space facts — the photograph dictates which
        // composition template is used, never the other way around.
        const pa: any = photoAnalysis || null;
        const pct = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : '?');
        const photoFacts = pa
            ? `PHOTO ANALYSIS (measured from the canvas): headroom calm ${pct(pa.headroom)}%, left column ${pct(pa.leftSpace)}%, right column ${pct(pa.rightSpace)}%, bottom band ${pct(pa.bottomSpace)}%, subject sits ${pa.subjectX || 'center'}, photo reads ${pa.photoLight ? 'light' : 'dark'}.
TEMPLATE DECISION TREE — the measured calm zones pick the composition:
- calm headroom (>=50%) → masthead top-full yPct 0.16-0.20; depth "front" = the classic over-head masthead, depth "behind" = the sandwich. Coverlines stack in the calmer side column or the bottom band.
- calm side column (>=42%) → put the masthead AND the coverline stack inside that strip (masthead xPct 0.27 left / 0.73 right, widthPct 46-54); barcode in the opposite bottom corner.
- dense everywhere → masthead depth "behind" (the deep layer), coverlines as a centered bottom strip (yPct 0.80-0.86); if one bold line must cross the subject it is ONLY legal as an ink-on-paper STATEMENT plate.
- the barcode/QR corner is OPPOSITE the main text mass.`
            : 'PHOTO ANALYSIS: unavailable — infer the calm zones from the photo description and apply the same decision tree.';

        const columnStrategy = `COVERLINE COLUMN STRATEGY (apply after placing the feature coverline):
- Stack 1-3 micro teasers in the SAME calm column as the feature cluster — weight 600, opacity 0.75-0.85, heightPct 1.4-1.6, each yPct stepping ~0.032 below the previous line. Hierarchy steps ONE rung at a time (weight 800 → 700 → 600, then opacity 1 → 0.8). Never two rungs between siblings.
- If BOTH side columns are calm, you may split: feature cluster on one side, 2 teasers mid-height in the opposite column (xPct 0.28 / 0.72, yPct 0.42 & 0.46).
- BANNER (rare special-issue signal, at most one per cover): a full-width rect strip (wPct 96-100, yPct 0.79, hPct 4-5, cornerPct 0) carrying the feature line in inverse-contrast ink-on-paper.`;

        const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 100;

        const componentVocab = `COMPONENT VOCABULARY — compose the cover from exactly these parts (the app renders this grammar):
- MASTHEAD — the brand word, heaviest weight on the page
- DATELINE or SIDE RAIL — micro type, one or the other, never both
- FEATURE COVERLINE — the loudest line after the masthead
- SUB — exactly one rung below the feature
- TEASERS — 1-3 micro lines, one rung below again, same calm column
- BADGE — issue/date chip strip, top band
- BARCODE or QR — bottom corner OPPOSITE the text mass
- PLATE — opaque rect under any coverline crossing a busy zone, ink-on-paper with inverse text
Every text element you emit is one of these roles. Nothing else exists.`;

        let userPrompt = `Design this edition:

PHOTO / VIBE: ${imageContext || 'Dynamic photo of a subject suitable for a magazine cover'}
CANVAS: ${aspectLine}
${componentVocab}
THE ACTUAL PHOTO IS ATTACHED to this message${hasImage ? '' : ' (image unavailable — rely on the analysis above)'}. Study what you SEE — subject position, gaze direction, wardrobe, palette, light, mood — and let it drive BOTH the composition template and the copy specifics.
LAYOUT POOL — the app's hidden preset library (${LAYOUT_LIBRARY.length} structural skeletons from the 60-cover grammar). Pick ONE id that suits the photo and shape your composition around it; echo your choice as "layoutId" in the JSON: ${LAYOUT_LIBRARY.map((l) => `${l.id} ${l.template}/${l.cluster}/${l.variant}`).join(', ')}.
${photoFacts}
${columnStrategy}
STYLE: ${style}${style === 'auto' ? ' (pick the genre yourself per the AUTO playbook)' : ` — follow the ${style.toUpperCase()} playbook exactly`}
USER THEME TO HONOUR: ${existingText || 'Invent the masthead word and all cover copy yourself'}${existingText ? `
Treat the user's words as THE EDITION THEME and distribute them across the hierarchy: the feature coverline expresses the theme directly and concretely, grounded in what the photo actually shows; the sub-line sharpens or subverts it; the teasers and rail riff on its facets; the masthead word condenses its world into one invented title. Mine the photo description for subject-relevant specifics — names, places, materials, mood — and never paste the theme verbatim into every element.` : ''}

THIS EDITION'S DIRECTIVES (obey all four; they override playbook placement numbers where they conflict):
1. Composition archetype: ${directives.archetype}
2. Coverline treatment: ${directives.plate}
3. Masthead placement: ${directives.masthead}
4. Wildcard: ${directives.wildcard}
Creativity seed #${directives.seed}: lean into it. Remember the legibility plates rule — a coverline over the subject or a busy zone MUST sit on an opaque rect plate with inverse-contrast text.

Output ONLY the JSON object.`;

        if (mode === 'refine' && skeleton) {
            systemPrompt = `You are the copy desk of a premium magazine. A designer has already ASSEMBLED the cover — every position, font, size, plate, rail, barcode and treatment is LOCKED. Your ONLY job is to rewrite the COPY of each element so this edition reads like a real editor wrote it: sharper, more specific, true to the photo. Obey every maxChars budget exactly. Never rename roles, never add or remove elements, never describe layout. Output ONLY JSON of shape {"texts":[{"id":"...","text":"..."}],"labels":[{"id":"...","label":"..."}]} — omit any element you cannot improve.`;
            userPrompt = `PHOTO / VIBE: ${imageContext || 'A strong editorial photograph of the subject'}
STYLE: ${style}

SKELETON ELEMENTS (geometry LOCKED — rewrite only the copy):
${JSON.stringify(skeleton, null, 1)}

Write this edition's copy now. Output ONLY the JSON object.`;
        }

        let jsonText = '';

        if (provider === 'gemini') {
            let requestedModel = body.model || 'gemini-3.8-flash';
            if (
                requestedModel.includes('2.5') ||
                requestedModel.includes('1.5-pro') ||
                requestedModel === 'gemini-pro'
            ) {
                requestedModel = 'gemini-3.8-flash';
            }

            const candidateModels = Array.from(new Set([
                requestedModel,
                'gemini-3.8-flash',
                'gemini-2.0-flash',
                'gemini-1.5-flash',
            ])).filter((m) => !m.includes('2.5') && !m.includes('1.5-pro'));

            const geminiGenerate = async (model: string): Promise<string> => {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(effectiveKey)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            contents: [
                                {
                                    role: 'user',
                                    parts: hasImage
                                        ? [
                                            { text: userPrompt },
                                            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
                                        ]
                                        : [{ text: userPrompt }],
                                },
                            ],
                            generationConfig: {
                                temperature: 0.95,
                                topP: 0.95,
                                maxOutputTokens: 8192,
                                responseMimeType: 'application/json',
                            },
                        }),
                    }
                );
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                return (data.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
            };

            let lastError = '';
            let succeeded = false;

            // Pass 1 — static candidate list. A response only counts when it
            // parses as COMPLETE JSON: guards against token-truncated output
            // from reasoning-style models (they can burn the budget mid-object).
            for (let i = 0; i < candidateModels.length; i++) {
                const curModel = candidateModels[i];
                try {
                    const text = await geminiGenerate(curModel);
                    jsonText = text;
                    if (extractJson(text)) {
                        succeeded = true;
                        break;
                    }
                    lastError = `${curModel} returned incomplete JSON (likely truncated)`;
                } catch (fetchErr: any) {
                    lastError = fetchErr?.message || String(fetchErr);
                    // If Google recommends a specific model in the error message (e.g. "use models/gemini-3.8-flash")
                    const suggestedMatch = lastError.match(/models\/([a-z0-9.\-]+)/i);
                    if (suggestedMatch && suggestedMatch[1]) {
                        const suggestedModel = suggestedMatch[1];
                        if (
                            !suggestedModel.includes('2.5') &&
                            !suggestedModel.includes('1.5-pro') &&
                            !candidateModels.includes(suggestedModel)
                        ) {
                            candidateModels.splice(i + 1, 0, suggestedModel);
                        }
                    }
                }
            }

            // Pass 2 — live model discovery fallback if static candidates fail
            if (!succeeded) {
                try {
                    const listRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}&pageSize=50`
                    );
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        const liveModels: string[] = (listData.models || [])
                            .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                            .map((m: any) => String(m.name).replace(/^models\//, ''))
                            .filter((id: string) => !id.includes('2.5') && !id.includes('1.5-pro') && !candidateModels.includes(id));

                        for (const liveModel of liveModels) {
                            try {
                                const text = await geminiGenerate(liveModel);
                                jsonText = text;
                                if (extractJson(text)) {
                                    succeeded = true;
                                    break;
                                }
                            } catch {
                                /* try the next live model */
                            }
                        }
                    }
                } catch {
                    /* list fallback error */
                }
            }

            // Last resort — accept a REPAIRABLE truncation from the best text we got
            if (!succeeded && !repairTruncatedJson(jsonText)) {
                return NextResponse.json({ error: `Gemini API error: ${lastError}` }, { status: 400 });
            }
        } else if (provider === 'openai' || provider === 'groq') {
            const endpoint =
                provider === 'groq'
                    ? 'https://api.groq.com/openai/v1/chat/completions'
                    : 'https://api.openai.com/v1/chat/completions';
            const model =
                body.model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${effectiveKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.9,
                    max_tokens: 4000,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                return NextResponse.json({ error: `${provider.toUpperCase()} API error: ${err}` }, { status: res.status });
            }

            const data = await res.json();
            jsonText = data.choices?.[0]?.message?.content || '';
        }

        // Complete JSON first; otherwise salvage a truncated object (the client
        // fills any missing arrays/fields with sane editorial defaults).
        const parsed = extractJson(jsonText) ?? repairTruncatedJson(jsonText);
        if (!parsed) {
            return NextResponse.json(
                { error: `Failed to parse AI layout response as JSON. Raw output: ${jsonText.slice(0, 200)}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, layout: parsed, directives });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to generate layout' }, { status: 500 });
    }
}
