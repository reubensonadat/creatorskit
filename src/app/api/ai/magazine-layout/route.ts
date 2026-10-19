import { NextRequest, NextResponse } from 'next/server';
import { ART_DIRECTION_MENU, LAYOUT_LIBRARY, sanitizeArtDirection } from '@/lib/magazine/cover-system';
import { ARCHETYPES, listArchetypes } from '@/lib/magazine/archetypes';

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
    | 'architectural'
    | 'food'
    | 'fragments'
    | 'time'
    | 'eye'
    | 'bazaar';

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

    food: `PLAYBOOK — FOOD BRAND / APPETITE EDITORIAL:
- Masthead: 'playfair' 900, #FFFFFF, widthPct 80-88, letterSpacingEm 0.08-0.12, yPct 0.19-0.23. Menu-card confidence — warm, generous, delicious.
- Dateline: 'inter' 700 in appetite orange #E8590C, service-line copy ("FRIDAY TABLE  |  MENU No. 12 — SERVICE FROM 7PM").
- Coverline: 'lora' italic 500 white, yPct 0.83-0.85 — food writing with heat ("FRESH OUT THE KITCHEN", "TONIGHT WE FEAST", "FRIDAY SPECIAL").
- Shapes: cream menu-card FRAME (#F6EFE3, strokeW 1.5-2) + barcode bottom-LEFT + one badge "HOT PLATE" filled #E8590C with white text.
- photoStyle: photoFilter "vintage" (warm lift), bgDim 0.12-0.16, dimWholePhoto false, grain opacity 0.10-0.16 size 2.
- Voice rule: the copy must taste like food writing — heat, freshness, scarcity ("WHILE IT LASTS", "SELLS OUT FAST", "SECONDS ENCOURAGED"). Never corporate.`,

    fragments: `PLAYBOOK — HUMAN FRAGMENTS / TYPE-AS-MASK POSTER:
- Masthead: 'inter' weight 900, widthPct 88-96, letterSpacingEm -0.03 to -0.05 — GIANT type fills the canvas as architectural backdrop; the subject overlaps it, the masthead is the structure itself.
- Dateline: 'space-mono' 700 uppercase — a vertical right-rail stack (feature → series → mood → year) separated by em-dash dividers.
- Coverline: 'inter' 800, in-rail, left-aligned, narrow (widthPct ≤ 20).
- Shapes: crosshair registration marks in TL + BR corners, optional single accent block, cream keyline frame (#F5F0E8).
- photoStyle: photoFilter "none", bgDim 0.05-0.10, dimWholePhoto false, grain opacity 0.06-0.10 size 1.
- Voice rule: the type IS the architecture — copy reads like a design-research folio ("THE HUMAN ARCHIVE", "ANATOMY OF MOVEMENT", "CONCRETE MEMORY").`,

    time: `PLAYBOOK — TIME / PERSON OF THE YEAR:
- Masthead: 'playfair' 900, #FFFFFF, widthPct 78-86, letterSpacingEm 0.02-0.06, yPct 0.12-0.16 — sits ABOVE the subject, never behind it.
- Dateline: 'inter' 700 in TIME red #E10600 ("PERSON OF THE YEAR  |  SPECIAL ISSUE").
- Coverline: 'playfair' 800 white, yPct 0.78-0.84.
- Shapes: the iconic red border frame (#E10600, strokeW 3-5) is MANDATORY + barcode bottom-right.
- photoStyle: photoFilter "none", bgDim 0.10-0.15, dimWholePhoto false, grain opacity 0.08-0.12 size 1.
- Voice rule: historic, declarative gravity ("VOICES THAT CHANGED THE WORLD", "THE ARCHITECTS OF TOMORROW").`,

    eye: `PLAYBOOK — EYE / RADICAL GRAPHIC DESIGN REVIEW:
- Masthead: 'syne' 800, widthPct 85-94, letterSpacingEm -0.04 to -0.06 — integrated with the subject, half-behind when headroom allows.
- Dateline: 'space-mono' 700 ("INTERNATIONAL REVIEW OF GRAPHIC DESIGN  |  No. {n}").
- Coverline: 'syne' 800, large, over-body; secondary lines minimal or absent.
- Shapes: none — typography carries everything. Optional single red accent (#FF0000) as a thin rule.
- photoStyle: photoFilter "mono", bgDim 0.08-0.12, dimWholePhoto false, grain opacity 0.10-0.14 size 1.
- Voice rule: critical-design essays ("RADICAL FORM", "SYSTEMS OF LEGIBILITY", "DISMANTLING THE GRID").`,

    bazaar: `PLAYBOOK — HARPER'S BAZAAR / SOFT COUTURE:
- Masthead: 'cinzel' 700, #FFFFFF, widthPct 84-92, letterSpacingEm -0.01 to -0.03, yPct 0.16-0.20 — behind-subject when the photo has headroom.
- Dateline: 'inter' 600 white ("PARIS • NEW YORK • MILAN  |  THE FASHION ISSUE").
- Coverline: 'cinzel' 700 white, yPct 0.80-0.85.
- Shapes: minimal — barcode bottom-right only. Elegance through restraint.
- photoStyle: photoFilter "none", bgDim 0.10-0.15, dimWholePhoto false, grain opacity 0.08-0.12 size 1.
- Voice rule: couture poetry ("THE ART OF STILLNESS", "PURE COUTURE", "THE MODERN MUSE").`,
};

const AUTO_PLAYBOOK = `PLAYBOOK — AUTO (you choose the genre):
First, judge the photo description — the attached photo outranks any description: fashion/portrait → vogue, warm food/appetite photo (dishes, kitchen heat, produce, a Friday table) → food, street/documentary → zine, calm/minimal product or interior → kinfolk, moody/urban night → noir or cyber, travel/nature → natgeo, music → vinyl, building/structured → architectural, culture/youth → dazed, bold typographic poster energy (graphic design, big type, design research) → fragments or eye, person-of-the-year gravitas or red-border newsiness → time, soft pink couture elegance → bazaar.
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
        'auto', 'vogue', 'zine', 'kinfolk', 'noir', 'gq', 'dazed', 'natgeo', 'cyber', 'vinyl', 'architectural', 'food',
        'fragments', 'time', 'eye', 'bazaar',
    ];
    return (known as string[]).includes(raw) ? (raw as StyleId) : 'auto';
};

// §6.5 — the ten canonical brand templates the solver's archetype system
// knows. The ANALYZE mode is trained on this anatomy: the AI reads the
// photo, names the archetype its negative space is born to wear, and the
// deterministic solver consumes the hint as a brand band. The AI never
// emits a coordinate — geometry stays ours, per the fixed-brand ruling.
const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
const ARCHETYPE_ANATOMY = listArchetypes()
    .map(
        (a) =>
            `- ${a.id} — ${a.name}: masthead ${a.mastheadFamily} at position ${a.mastheadPosition}, ${a.stack} coverline stack, main line ${a.mainLine}, ${a.color}`,
    )
    .join('\n');

// §7 — the AI art-direction menu, rendered LIVE from the composer's
// contract (ART_DIRECTION_MENU) so the prompt can never drift from the
// sanitizer. The analyze mode returns a "direction" pick alongside the
// copy; the app's deterministic compositor materializes it into real
// geometry (ladder, plates, scan, guarantee). The AI calls the structure,
// never a coordinate.
const DIRECTION_MENU = [
    `- template: ${ART_DIRECTION_MENU.templates.join(' | ')}`,
    `- cluster: ${ART_DIRECTION_MENU.clusters.join(' | ')}`,
    `- treatment: ${ART_DIRECTION_MENU.treatments.join(' | ')}`,
    `- scanCorner: ${ART_DIRECTION_MENU.scanCorners.join(' | ')}`,
    `- badgeSpot: ${ART_DIRECTION_MENU.badgeSpots.join(' | ')}`,
    '- rail: true | false',
].join('\n');

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
            brandColors = null,
            customText = null,
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

        // BRAND KIT + CUSTOM TEXT — the user's saved palette and their exact
        // words. The palette constrains the AI's hues; the custom text is
        // contract (verbatim, never reworded).
        const hexOf = (v: unknown): string =>
            typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : '';
        const brandPrimary = hexOf((brandColors as any)?.primary);
        const brandAccent = hexOf((brandColors as any)?.accent);
        const ct = (customText ?? {}) as Record<string, unknown>;
        const customLines = [
            typeof ct.masthead === 'string' && ct.masthead.trim() ? `masthead: "${ct.masthead.trim().slice(0, 14)}"` : '',
            typeof ct.coverline === 'string' && ct.coverline.trim() ? `feature coverline: "${ct.coverline.trim().slice(0, 44)}"` : '',
            typeof ct.sub === 'string' && ct.sub.trim() ? `sub-line: "${ct.sub.trim().slice(0, 60)}"` : '',
        ].filter(Boolean);
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

${brandPrimary || brandAccent ? `BRAND PALETTE (the user's saved brand kit — these are the ONLY hues allowed beyond ink/paper): primary ${brandPrimary || 'unset'}, accent ${brandAccent || 'unset'}. The accent colours exactly ONE element (dateline, badge or a thin rule); the primary may tint the frame or badge fill; everything else stays pure ink-on-paper.` : ''}
${customLines.length ? `CUSTOM TEXT (typed by the user — these appear VERBATIM, never reworded): ${customLines.join('; ')}. Compose the remaining roles yourself in the same voice.` : ''}
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
${customLines.length ? `CUSTOM TEXT (locked verbatim — skeleton elements matching these roles return UNCHANGED): ${customLines.join('; ')}` : ''}

SKELETON ELEMENTS (geometry LOCKED — rewrite only the copy):
${JSON.stringify(skeleton, null, 1)}

Write this edition's copy now. Output ONLY the JSON object.`;
        }

        if (mode === 'analyze') {
            systemPrompt = `You are the photo editor AND art director AND copy chief of a premium magazine. You look at photographs, describe what they ARE, name the brand template their negative space is born to wear, art-direct its structure, and write the edition's words in the SAME breath. You MUST respond with strictly valid JSON only, no markdown fences, no commentary: {"summary": string, "genre": string, "mood": string[], "subjectFocus": string, "archetype": string, "direction": {"template": string, "cluster": string, "treatment": string, "scanCorner": string, "badgeSpot": string, "rail": boolean}, "copy": {"masthead": string, "dateline": string, "feature": string, "sub": string, "teasers": string[]}}.
- summary: one dense sentence naming the subject, wardrobe/materials, setting, light and mood.
- genre: the editorial world this photograph genuinely belongs in — judge what you SEE, not any description text. One of: auto, vogue, zine, kinfolk, noir, gq, dazed, natgeo, cyber, vinyl, architectural, food, fragments, time, eye, bazaar.
- mood: 2-4 adjective keywords.
- subjectFocus: where the visual mass sits and what the eye hits first.
- archetype: EXACTLY ONE id, verbatim, from the ten canonical templates below. You are trained on this anatomy — a 60-cover structural analysis distilled into brand templates. Judge the NEGATIVE SPACE, not the subject matter: where the calm zones sit decides which template wears this photo.

THE TEN ARCHETYPES (id — anatomy):
${ARCHETYPE_ANATOMY}
MASTHEAD POSITIONS: A full-width over the subject's head · B deep layer BEHIND the subject (the celebrity sandwich) · C compact news nameplate, top-centre · D indie top-left corner anchor · E vertical side rail (the whole top goes to the photo) · F inverted floor band.
SELECTION HEURISTIC (read the calm space, then pick):
- generous calm headroom → classic-vogue / time-frame / natgeo-frame
- one wide calm side column (subject off-centre) → indie-minimal (left) or bazaar-soft (right)
- dense everywhere, strong centred subject, face holds the middle → vogue-deep-layer
- calm bottom band, torso-heavy crop → bottom-strip
- formal, institutional, commemorative gravitas → time-frame or inverted-commemorative
- art-school energy, radical graphic play → avant-garde
- newsstand loudness, stacked text columns → tabloid-stack
- direction: your ART DIRECTION for this cover — you are the designer CALLING the structure, and the app's deterministic compositor then builds the actual geometry (type ladder, legibility plates, spacing, no-overlap guarantee) from your pick. Every field is optional but the strong picks are template + cluster + treatment. Choose values EXACTLY from these menus, verbatim:
${DIRECTION_MENU}
Field meanings: template = the masthead anatomy (TOP-MASTHEAD nameplate over calm headroom · SIDE-STRIP strip masthead with a coverline column down one calm flank · DEEP-LAYER masthead sandwiched BEHIND a dense centred subject · VERTICAL rotated rail, whole top goes to the photo · INVERTED masthead anchored low in a calm floor band). cluster = which flank the coverline stack colonises ("split" only for a symmetric pose). treatment = how the feature coverline is built (strip wide one-line kicker · statement huge multi-word feature on a legibility plate · banner full-width solid band · symmetric mirrored side rungs). scanCorner = the CALMER floor corner, away from the subject's mass, for the barcode/QR. badgeSpot = where the badge pill sits (top of the page / over the coverline cluster / opposite floor corner). rail = true to swap the dateline for a rotated spine rail (quiet, architectural or archival genres only). Your direction MUST agree with the archetype you named (vogue-deep-layer → template DEEP-LAYER; indie-minimal → SIDE-STRIP + cluster left; inverted-commemorative → INVERTED). Judge the NEGATIVE SPACE, not the subject matter.
- copy: THIS edition's words, genre-correct and grounded in what THIS photograph actually shows — one round trip, no follow-up needed. Budgets are hard (the renderer truncates):
 · masthead — ONE invented magazine word, 3-9 LETTERS, uppercase. Coin a NEW one for this photo (SCION, ARCADE, HAVOC, LUMEN are taken — never repeat a word you have used before).
 · dateline — cities / issue number / price machine copy, ≤40 chars ("PARIS • ISSUE 48 — €14.00").
 · feature — the loudest coverline, ≤44 chars, drawn from the subject, wardrobe, setting or mood you actually see.
 · sub — one rung below the feature; sharpens or subverts it, ≤60 chars.
 · teasers — 2-3 micro lines, ≤28 chars each.
 Fresh words only: if a phrase feels like the obvious first guess, write the second one. UPPERCASE everything except lines that must read sentence-case.`;
            userPrompt = `Analyze the attached photograph and return the JSON.`;
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
                // SPEED RULING: these JSON reads need perception, not
                // deliberation. Thinking-capable models (2.5+ / 3.x) think
                // by DEFAULT — multi-second deliberation before the first
                // token, and thinking tokens burn the output budget
                // mid-object (the truncation the retry loop was seeing).
                // Budget 0 = answer in one pass. Older models (2.0/1.5)
                // reject the field, so it is added only when supported.
                const thinkingCapable = /(?:^|-)(?:2\.5|3\.)\d*/.test(model);
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
                                ...(thinkingCapable ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
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

        // ANALYZE MODE — the AI is a perception layer only. It never emits a
        // coordinate; the deterministic editorial solver consumes this.
        if (mode === 'analyze') {
            const s = parsed as Record<string, unknown>;
            const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
            const mood = Array.isArray(s.mood)
                ? (s.mood as unknown[]).filter((m) => typeof m === 'string').slice(0, 4) as string[]
                : [];
            // §6.5 — the archetype hint, validated against the registry.
            // The solver consumes it as a brand band; anything the model
            // hallucinated outside the ten ids is dropped (free solve).
            const rawArch = str(s.archetype, 48);
            const archetypeHint = ARCHETYPE_IDS.includes(rawArch) ? rawArch : '';
            // §7 — the art-direction pick, sanitized key-by-key against the
            // live menus. A hallucinated value is dropped (that decision
            // falls back to the composer); an empty object means "no
            // direction" and the deterministic solve owns everything.
            const direction = sanitizeArtDirection(s.direction);
            // The edition's words — same round trip as the analysis. Every
            // line is clamped to its render budget so the app can trust
            // the copy verbatim; the masthead is scrubbed to wordmark-safe
            // characters and uppercased (it is a logo, not a sentence).
            const c = (s.copy ?? {}) as Record<string, unknown>;
            const line = (v: unknown, max: number) =>
                str(v, max).replace(/\s+/g, ' ').trim();
            const mastheadWord = line(c.masthead, 12).toUpperCase().replace(/[^A-Z0-9&'-]/g, '');
            const dateline = line(c.dateline, 40);
            const feature = line(c.feature, 44);
            const sub = line(c.sub, 60);
            const teasers = Array.isArray(c.teasers)
                ? (c.teasers as unknown[]).map((t) => line(t, 28)).filter(Boolean).slice(0, 3)
                : [];
            const copy = {
                ...(mastheadWord.length >= 3 ? { masthead: mastheadWord } : {}),
                ...(dateline ? { dateline } : {}),
                ...(feature ? { feature } : {}),
                ...(sub ? { sub } : {}),
                ...(teasers.length ? { teasers } : {}),
            };
            return NextResponse.json({
                success: true,
                semantics: {
                    summary: str(s.summary, 240),
                    genre: normalizeStyle(String(s.genre || 'auto')),
                    mood,
                    subjectFocus: str(s.subjectFocus ?? s.subject_focus, 120),
                    ...(archetypeHint ? { archetypeHint } : {}),
                    ...(Object.keys(direction).length ? { direction } : {}),
                    ...(Object.keys(copy).length ? { copy } : {}),
                },
            });
        }

        return NextResponse.json({ success: true, layout: parsed, directives });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to generate layout' }, { status: 500 });
    }
}
