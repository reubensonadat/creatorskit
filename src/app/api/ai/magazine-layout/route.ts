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

LEGIBILITY & EDITORIAL INTEGRITY — THE #1 RULE:
A. Negative Space Colonization: Place typography inside calm quadrants (headroom, calm flank columns, or calm bottom band). Ensure high contrast: crisp #FFFFFF text on dark areas, #000000 on light areas.
B. High-end editorial covers (Vogue, GQ, TIME, Dazed, Harper's Bazaar) rely on pure, unplated typography in negative space, NEVER amateur stacked colored rectangles (no clunky yellow/black slabs across the body). Solid shapes are reserved for: sleek pill badges (kind: "badge", e.g. "ISSUE 04 • TOKYO"), full border frames (kind: "frame", e.g. TIME red border, NatGeo yellow border), or barcodes.
C. Group related copy by Gestalt Proximity: Kicker + Headline + Sub-deck form a single tight visual unit with consistent vertical alignment.
D. NEVER use shadows: "shadow": false and "shadowMode": "none" on EVERY text element. Real print typography is crisp and sharp.

COMPOSITION GRAMMAR:
1. The masthead's default depth is "behind" so the cutout subject overlaps its letterforms — that IS the 3D text-behind-image effect. Exception: when the measured headroom is generous, depth "front" (the classic over-head masthead) is allowed. Coverlines are ALWAYS depth "front".
2. Vertical band rhythm: dateline / badge 0.05-0.10 · masthead 0.12-0.28 · subject focal zone (keep face clear of text) · coverlines in calm column or floor band (0.72-0.88) · barcode in corner opposite text mass (0.91-0.95).
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

// §7.5 — analyze-mode EDITION ASSIGNMENTS. Re-analyzing must art-direct a
// DIFFERENT edition of the same brand: every analyze call rolls a family,
// a treatment, a masthead attitude, an energy and a lawful wildcard, and
// the model honours the roll (the measured facts still veto unsafe picks).
// Without this, the model converges on the same "safe" menu every read and
// every edition collapses into one layout nudged a centimetre.
const ANALYZE_FAMILIES = [
    'the heritage TOP-MASTHEAD band (calm headroom carries the brand)',
    'the SIDE-STRIP whitespace strategy (masthead + stack colonize the calm flank)',
    'the DEEP-LAYER sandwich (masthead behind the subject, >=70% legible)',
    'the VERTICAL spine rail (the rotated brand on the calm edge)',
    'the INVERTED commemorative floor (brand at the floor, photo owns the top)',
    'whichever template a typical read of this photo would NOT pick — explore the second reading',
];
const ANALYZE_TREATMENTS = [
    'editorial — pure unplated type in calm space (the ~80% default)',
    'strip — the floor-strip read',
    'statement — ONE opaque ink-on-paper plate crossing the body below the chin',
    'banner — the full-width special-issue band (rare punctuation)',
    'symmetric — twin columns when both flanks are calm',
];
const ANALYZE_SCALES = [
    'monumental — the masthead sprawls (heritage fashion energy)',
    'classic — the standard band',
    'compact — the newsstand nameplate (small, centred, newspaper voice)',
];
const ANALYZE_ENERGIES = [
    'quiet — monograph air (minimal furniture, gentle grain)',
    'balanced — the standard newsstand mix',
    'loud — punch (denser furniture, deeper dim, bolder grain)',
];
const ANALYZE_WILDCARDS = [
    'run the micro type as a VERTICAL side rail instead of a top dateline',
    'move the badge to the cluster (the story ribbon) instead of the top band',
    'mine ONE accent hue from the wardrobe/set and spend it on exactly one element',
    'park the feature line MID-HEIGHT in the calm column, below the chin line',
    'palette "mono" — full gravitas B&W',
    'palette "duotone" — an era tint lifted from the photo',
    'strict Swiss: everything axis-aligned, no rail, no badge, no frame',
];
interface AnalyzeAssignment {
    family: string;
    treatment: string;
    scale: string;
    energy: string;
    wildcard: string;
    seed: number;
}
const rollAnalyzeAssignment = (): AnalyzeAssignment => ({
    family: pick(ANALYZE_FAMILIES),
    treatment: pick(ANALYZE_TREATMENTS),
    scale: pick(ANALYZE_SCALES),
    energy: pick(ANALYZE_ENERGIES),
    wildcard: pick(ANALYZE_WILDCARDS),
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
    `- mastheadDepth: ${ART_DIRECTION_MENU.mastheadDepths.join(' | ')}`,
    `- mainLinePos: ${ART_DIRECTION_MENU.mainLinePoses.join(' | ')}`,
    `- palette: ${ART_DIRECTION_MENU.palettes.join(' | ')}`,
    `- special: ${ART_DIRECTION_MENU.specials.join(' | ')}`,
    `- scanCorner: ${ART_DIRECTION_MENU.scanCorners.join(' | ')}`,
    `- badgeSpot: ${ART_DIRECTION_MENU.badgeSpots.join(' | ')}`,
    '- rail: true | false',
    `- tone: ${ART_DIRECTION_MENU.tones.join(' | ')} — the masthead's ink`,
    `- mastheadScale: ${ART_DIRECTION_MENU.mastheadScales.join(' | ')} — the scale attitude`,
    `- energy: ${ART_DIRECTION_MENU.energies.join(' | ')} — the finishing bias`,
    `- mastheadRot: ${ART_DIRECTION_MENU.mastheadRots.join(' | ')} — "none", or the masthead runs VERTICAL on a spine edge`,
    '- accent: "#RRGGBB" — ONE hue you actually SEE in the photo (wardrobe / set / light), never invented',
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
            ? `PHOTO ANALYSIS (measured from the canvas): headroom calm ${pct(pa.headroom)}%, left column ${pct(pa.leftSpace)}%, right column ${pct(pa.rightSpace)}%, bottom band ${pct(pa.bottomSpace)}%, subject sits ${pa.subjectX || 'center'}, photo reads ${pa.photoLight ? 'light' : 'dark'}.${pa.pose === 'horizontal' ? `
SUBJECT POSE: HORIZONTAL — the subject lies/reclines across the frame. The calm zones are the TOP and BOTTOM bands; the side columns belong to the body. Cluster "center" with the stack in a band, mastheadDepth "front" over the calm band (or INVERTED) — NEVER a side-column stack. If the subject's HEAD rests at the left/right edge, the statement edition is mastheadRot "spine-left"/"spine-right" — the bold vertical masthead runs down that edge.` : ''}
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
            const styleVoice = style !== 'auto' && STYLE_PLAYBOOKS[style]
                ? `\nSTYLE VOICE DIRECTIVE (${style.toUpperCase()}):\n${STYLE_PLAYBOOKS[style]}\nEnsure all rewritten headlines, datelines, and badges speak in this exact editorial voice.`
                : '';
            systemPrompt = `You are the copy desk of a premium magazine. A designer has already ASSEMBLED the cover — every position, font, size, plate, rail, barcode and treatment is LOCKED. Your ONLY job is to rewrite the COPY of each element so this edition reads like a real editor wrote it: sharper, more specific, true to the photo.${styleVoice} Obey every maxChars budget exactly. Never rename roles, never add or remove elements, never describe layout. Output ONLY JSON of shape {"texts":[{"id":"...","text":"..."}],"labels":[{"id":"...","label":"..."}]} — omit any element you cannot improve.`;
            userPrompt = `PHOTO / VIBE: ${imageContext || 'A strong editorial photograph of the subject'}
STYLE: ${style}
${customLines.length ? `CUSTOM TEXT (locked verbatim — skeleton elements matching these roles return UNCHANGED): ${customLines.join('; ')}` : ''}

SKELETON ELEMENTS (geometry LOCKED — rewrite only the copy):
${JSON.stringify(skeleton, null, 1)}

Write this edition's copy now. Output ONLY the JSON object.`;
        }

        let analyzeAssignment: AnalyzeAssignment | null = null;
        if (mode === 'analyze') {
            const assignment = rollAnalyzeAssignment();
            analyzeAssignment = assignment;

            const selectedStyleGuidance = style === 'auto'
                ? `EDITORIAL GENRE SELECTION: The user chose AUTO. Study the attached photo, subject, wardrobe, and mood, then select the absolute best matching genre among the 16 recognized house styles:
- vogue (High fashion Didone luxury)
- zine (Indie zine / Swiss street / action sports / skateboard / photocopy)
- kinfolk (Quiet luxury / slow living / minimal interiors)
- noir (35mm film noir / cinema archive / moody shadows)
- gq (Modern gentleman / sharp menswear)
- dazed (Underground culture / art-school / avant-garde)
- natgeo (Discovery / nature / exploration)
- cyber (Terminal ID / futuristic / tech)
- vinyl (Music album sleeve / retro groove)
- architectural (Architecture / spatial monograph)
- food (Appetite editorial / culinary warmth / kitchen heat)
- fragments (Human fragments / type-as-mask poster)
- time (Person of the year / historic gravitas / red border)
- eye (Radical graphic design review)
- bazaar (Soft couture / Harper's Bazaar poetry)
Set the "genre" field in your JSON response to your chosen genre.`
                : `USER SELECTED GENRE: The user explicitly selected the "${style.toUpperCase()}" style! You MUST direct this edition according to the ${style.toUpperCase()} editorial aesthetic:
${STYLE_PLAYBOOKS[style] || ''}
Ensure the "genre" field in your JSON response is "${style}".`;

            systemPrompt = `You are an elite magazine creative director and art director (Vogue, TIME, Dazed, Kinfolk, Eye, System).
One shot, two jobs:
1. PERCEIVE THE PHOTO DEEPLY: Look at the attached image with extraordinary visual sensitivity. Analyze the subject, their pose, action, wardrobe, textures, expressions, gaze direction, lighting atmosphere, background architecture/environment, and authentic color accents.
2. ART-DIRECT THIS EDITION: Pick the brand archetype, structural direction, colour attitude, type-scale attitude, finishing energy, and write bespoke, high-impact editorial copy (masthead, dateline, feature headline, sub-headline, teasers, badge chip, and vertical rail line).

${selectedStyleGuidance}

Respond with strictly valid JSON only (no markdown fences, no commentary):
{
  "summary": "Rich 1-2 sentence visual description of the photo (subject, action, wardrobe, setting, lighting)",
  "genre": "${style === 'auto' ? 'chosen_genre_from_list' : style}",
  "mood": ["mood1", "mood2", "mood3"],
  "subjectFocus": "concise description of the subject focal point",
  "archetype": "one archetype id from the ARCHETYPES list",
  "direction": {
    "template": "TOP-MASTHEAD | SIDE-STRIP | DEEP-LAYER | VERTICAL | INVERTED",
    "cluster": "left | right | center | split",
    "treatment": "editorial | strip | statement | banner | symmetric",
    "mastheadDepth": "front | behind",
    "mainLinePos": "bottom | below-chin | over-body | side | above-head",
    "palette": "bw | colored-masthead | neutral-masthead | duotone | mono-accent",
    "special": "none | frame | inverted | wrap",
    "scanCorner": "BL | BR",
    "badgeSpot": "top | cluster | corner",
    "rail": true,
    "tone": "paper | ink | accent",
    "accent": "#RRGGBB hex actually seen in the photo",
    "mastheadScale": "monumental | classic | compact",
    "energy": "quiet | balanced | loud",
    "mastheadRot": "none | spine-left | spine-right"
  },
  "note": "one sharp sentence on WHY this composition was chosen (art director's rationale, <=120 chars)",
  "copy": {
    "masthead": "ONE short invented magazine title (3-10 uppercase letters, e.g. KINETIC, SUPPER, SCION, VOID)",
    "dateline": "CITY • ISSUE NN — €NN or curated dateline",
    "feature": "Loudest headline specific to this photo (max 44 chars)",
    "sub": "Sub-headline expanding the story (max 60 chars)",
    "teasers": ["teaser line 1", "teaser line 2", "teaser line 3"],
    "badge": "Short uppercase pill text (e.g. ISSUE 04 // TOKYO, max 28 chars)",
    "rail": "Spine metadata / photography credit / essay tagline (max 64 chars)"
  }
}

THE STRUCTURAL LAWBOOK (the 60-cover anatomy — obey it, never fight it):
1. FIXED BRAND, VARIABLE COMPOSITION: the archetype pins the brand system (masthead position + family + tone + scan corner); the photograph's negative space picks the composition dropped into it. The brand never moves per issue — the composition does.
2. NEGATIVE SPACE LOGIC: typography lives in the CALM zones the measurements point to. Subject right → cluster "left"; subject left → "right"; centered with open flanks → "split"; full-bleed dense → cluster "center" + treatment "statement" (opaque plate) — pure type never crosses a busy zone.
3. SANDWICH LEGIBILITY: mastheadDepth "behind" (the celebrity override) is legal ONLY when the masthead stays >=70% legible around the subject's head — the brain must reconstruct the wordmark. Calm headroom → "front" (the classic over-head band).
4. MUTUAL COMPATIBILITY & FACE PROTECTION: "treatment" and "mainLinePos" must harmonize: treatment "strip" or "editorial" (clean, unplated typography) REQUIRES mainLinePos "bottom" or "below-chin" in a calm negative-space band. mainLinePos "over-body" is STRICTLY reserved for treatment "statement" (opaque contrast plates crossing the torso). NEVER emit treatment "strip" with mainLinePos "over-body". The face is an absolute NO-TEXT zone; nothing ever prints on the face.
5. SYMMETRIC FLANKS: treatment "symmetric" is strictly legal ONLY if BOTH left column >=35% AND right column >=35% in the measured facts. If either flank is 0% or busy, "symmetric" is forbidden — pick "editorial" or "strip" in the calm zone.
6. HIERARCHY RATIO — exaggerate, never polite: masthead 100 → feature 50-70 → teasers 25-35. Small differences read as mistakes. The masthead is the page's #1 size, always.
7. GESTALT: proximity (kicker + feature + sub = ONE tight unit) · alignment (one axis per cluster) · similarity (siblings share voice) · continuity (the eye travels one path). Hierarchy steps ONE rung at a time.
8. scanCorner sits OPPOSITE the text mass (cluster left → "right"). badgeSpot: "top" newsstand pill · "cluster" story ribbon · "corner" counterweight. rail true only for quiet monographs.
9. CROP → TEMPLATE: dense full-bleed → DEEP-LAYER / bottom bands; off-centre subject → the calm flank (SIDE-STRIP); generous headroom → TOP-MASTHEAD; commemorative gravitas → INVERTED. A RECLINING/LYING subject (pose HORIZONTAL in the facts) rotates the whole grammar — the bands own the type, the columns belong to the body: cluster "center", stack in a band, never a side-column stack. For a reclining subject whose HEAD rests at one edge, the statement edition is mastheadRot "spine-left"/"spine-right" with the spine on the head's edge: the giant wordmark runs vertical (270° left / 90° right), weight 900, mastheadDepth "behind" — the head crossing the letters IS the sandwich; the feature cluster sits in the calm floor band as treatment "strip", cluster "center", mainLinePos "bottom".
10. COLOUR INTELLIGENCE: palette "accent" or tone "accent" REQUIRES an "accent" hex you actually SEE in the photo (wardrobe, set, light) — never an invented hue. tone "ink" only when the photo reads light; "paper" is the default on dark photos.
11. SCALE ATTITUDE: mastheadScale must agree with the archetype — "monumental" (heritage sprawl, fashion didones) · "classic" (the standard band) · "compact" (the newsstand nameplate).
12. ENERGY: "quiet" (monograph air, minimal furniture, gentle grain) · "balanced" · "loud" (newsstand punch, denser furniture, deeper dim). It biases the finishing, never the laws.
13. BESPOKE EDITORIAL COPY: ground ALL copy in the SPECIFIC subject of the image (hardware/tech → SILICON, MONOGRAPH, RETINA; portrait/fashion → couture voice; architecture → spatial monographs). Never unrelated copy. Masthead: ONE invented wordmark (3-9 uppercase letters); dateline: "CITY • ISSUE NN — €NN"; feature ≤44 chars; sub ≤60; teasers 2-3 × ≤28. "note" = one sharp sentence on WHY this composition (the art director's rationale, ≤120 chars).
14. PAIRING LAWS (mutual exclusions the resolver enforces — never fight them): mainLinePos "over-body" is legal ONLY with treatment "statement" (the opaque plate); clean treatments (editorial/strip/banner/symmetric) pair with "bottom"/"below-chin"/"side". treatment "symmetric" and cluster "split" require BOTH side columns ≥35% calm in the measured facts — one busy flank or a reclining subject means a single calm-side cluster. template "VERTICAL" or mastheadRot spine-* means cluster "center" with mainLinePos "bottom" — the spine owns its edge, the story lives in the bands.

ARCHETYPES (pick EXACTLY one id):
${ARCHETYPE_ANATOMY}

DIRECTION MENU (values EXACTLY as listed):
${DIRECTION_MENU}

EVERY READ MUST ART-DIRECT A DIFFERENT EDITION. The user re-analyzes to EXPLORE — same photo, different issues of the same brand. When the EDITION ASSIGNMENT in the user message differs from your first instinct, honour the assignment (the measured facts still veto unsafe picks — never place type in a busy zone to satisfy a roll). If a phrase feels like the obvious first guess, write the second one.`;

            userPrompt = `PERCEIVE AND ART-DIRECT THIS EDITORIAL COVER:

CANVAS GEOMETRY: ${aspectLine}
${photoFacts}

PHOTO / VIBE BRIEF: ${imageContext || 'Analyze the visual contents of the attached photograph directly (subject, objects, setting, mood).'}
${existingText ? `EXISTING CONTEXT: "${existingText}" — draw inspiration from this theme.` : ''}
${brandPrimary || brandAccent ? `BRAND PALETTE (the user's saved brand kit — restrict accents to these hues): primary ${brandPrimary || 'unset'}, accent ${brandAccent || 'unset'}.` : ''}
${customLines.length ? `CUSTOM TEXT (typed by the user — these appear VERBATIM, never reworded): ${customLines.join('; ')}. Compose the remaining copy in the exact same editorial voice.` : ''}

THIS EDITION'S ASSIGNMENT (roll #${assignment.seed} — art-direct THIS issue; the next roll asks differently):
1. Composition family: ${assignment.family}
2. Feature treatment: ${assignment.treatment}
3. Masthead attitude: ${assignment.scale}
4. Energy: ${assignment.energy}
5. Wildcard: ${assignment.wildcard}

CRITICAL PERCEPTION DIRECTIVE:
Look at the attached image carefully. Extract subject specifics:
- What is the subject wearing? (Colors, materials, streetwear, tailoring, sportswear)
- What is the subject doing? (Action, stillness, motion, expression, gesture)
- What is the setting and light? (Urban asphalt, concrete architecture, studio shadows, warm kitchen, golden hour)
- What single accent color (#RRGGBB) can you pick directly from the photo (e.g. sneakers, jacket, neon sign, backdrop)?
Ground every word of your copy in what is genuinely visible in the photograph.

The MEASURED facts are ground truth — the attached photo confirms wardrobe, mood and specifics. Return the JSON only.`;
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
                                maxOutputTokens: mode === 'analyze' ? 2048 : 8192,
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
            const direction = sanitizeArtDirection(s.direction, photoAnalysis);
            const dirNote = str(s.note, 120);
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
            const badge = line(c.badge, 32);
            const rail = line(c.rail, 64);
            const copy = {
                ...(mastheadWord.length >= 3 ? { masthead: mastheadWord } : {}),
                ...(dateline ? { dateline } : {}),
                ...(feature ? { feature } : {}),
                ...(sub ? { sub } : {}),
                ...(teasers.length ? { teasers } : {}),
                ...(badge ? { badge } : {}),
                ...(rail ? { rail } : {}),
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
                    ...(dirNote && direction.note ? { note: direction.note } : {}),
                    ...(Object.keys(copy).length ? { copy } : {}),
                },
                // §12.5 GLASS PIPELINE — the debug payload the page prints in
                // the console trace: the assignment roll, the exact measured
                // facts string the model was told, the user's vibe input and
                // the RAW model output (unfiltered vision analysis). Blame
                // the stage, not the app.
                debug: {
                    assignment: analyzeAssignment,
                    facts: photoFacts,
                    vibe: imageContext,
                    raw: jsonText.slice(0, 3000),
                },
            });
        }

        return NextResponse.json({ success: true, layout: parsed, directives });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to generate layout' }, { status: 500 });
    }
}
