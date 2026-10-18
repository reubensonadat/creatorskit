# The Magazine Cover System — Technical Component Grammar

This is the design-engineering spec behind Text-Behind's presets and AI Auto-Cover.
It describes covers the way a production designer specifies them: **components,
zones, hierarchy weights, contrast strategies, and placement rules** — never
"what the photo shows." Every rule here is already encoded in
[`src/app/api/ai/magazine-layout/route.ts`](../src/app/api/ai/magazine-layout/route.ts)
and rendered by [`src/app/text-behind/page.tsx`](../src/app/text-behind/page.tsx).

---

## 1. The Component Inventory

Every cover, from Vogue to a photocopied zine, is assembled from the same nine
components. Genres differ only in how they deploy them.

| # | Component | Job | Hierarchy weight | Contrast strategy |
|---|-----------|-----|------------------|-------------------|
| 1 | **Masthead** | Brand. The one word everyone recognizes at 3 meters. | 10 — dominant | Behind the subject (the sandwich effect) or plated if it crosses the face |
| 2 | **Dateline** | Metadata: cities, issue N°, price, date. | 3 | Top band, un-plated white on dim |
| 3 | **Feature coverline** | The story being sold. One line, intrigue only. | 6-8 | Plated ink-on-paper when crossing the subject; clean white in bands |
| 4 | **Sub-coverline** | Second read. Echoes the feature at ~60% of its weight. | 4-5 | Same treatment as its parent, lighter weight |
| 5 | **Side rail** | Vertical spine text running an edge. Fills calm edges with structure. | 2-3 | rotationDeg ±90, xPct 0.05 / 0.945, opacity 0.75-0.9 |
| 6 | **Badge / stamp** | A self-contained strip: plate + label in one atom. | 3-4 | White plate / black ink (or inverse); cornerPct 0 |
| 7 | **Plate** | A solid rect whose only job is to guarantee legibility. | 0 — servant | Always under text (front shapes render beneath front text) |
| 8 | **Barcode / QR** | Retail/scannable proof-of-print. Signals "real object." | 1 | Bottom corners; EAN-13 computed from digits; QR encodes a real link |
| 9 | **Frame** | Full-bleed border. Turns any photo into a document. | 1 | strokeW 1.5-3.5, genre accent or ivory |

**Rule of voices:** each component speaks ONCE. Two badges = zero badges.
Maximum per cover: 1 masthead, 1 dateline (or rail), 2 coverlines, 1 rail,
1 badge, 1 barcode (or QR), 1 frame.

---

## 2. The Zone System (vertical bands)

The cover is a stack of horizontal bands measured in `yPct` (0-1, from top):

```
0.00-0.05   edge margin (never place type — print bleed lives here)
0.05-0.12   DATELINE BAND    — dateline, badge, or top of a rail
0.14-0.36   MASTHEAD BAND    — the brand word, behind the subject
0.35-0.74   SUBJECT ZONE     — the photo owns it. Two exceptions:
             a) the BEHIND layer (masthead may rise through it)
             b) a STATEMENT coverline — allowed ONLY when ink-on-paper plated
0.76-0.90   COVERLINE BAND   — feature + sub cluster, bottom-left or bottom-right
0.90-0.97   FOLIO BAND       — barcode, QR, price, second folio line
```

**Vertical gap law:** any two front elements keep ≥ 0.05 of canvas height
between their boxes. The app enforces this mechanically via
`resolveFrontCollisions()` — the AI designs to it, the solver guarantees it.

**Corner counterweight law:** the four bottom/top corners work as a system.
Barcode bottom-right ⇒ badge or coverline anchor bottom-left. A filled corner
demands an answered diagonal corner, never an adjacent one.

---

## 3. The Horizontal Placement Logic (whitespace-driven)

Placement is decided by **where the photo is calm**, in this priority:

1. **Detect negative space.** Portrait subject centered → calm flanks.
   Subject left-of-frame → calm right. Sky/ground → calm top/bottom.
2. **Masthead** goes where it can be BIG: behind the subject's torso/chin
   (yPct 0.22-0.34) when the sandwich effect is wanted; in the calm flank
   (xPct 0.28-0.36 as a stacked block) when the subject is off-center.
3. **Coverline cluster** anchors to the calm bottom quadrant DIAGONALLY
   OPPOSITE the visual weight of the subject.
4. **Side rails** fill whichever edge is calm and otherwise empty. Left rail
   reads bottom-to-top (rotationDeg -90); right rail top-to-bottom (+90).
   Rails run 55-75% of canvas width as their vertical length.
5. **Never center everything.** A centered masthead demands asymmetric
   coverlines; a stacked-left masthead permits centered kickers. One axis
   of symmetry maximum per cover.

---

## 4. Hierarchy Rules

1. **Size ordering is absolute:** masthead ≥ 2.5× the feature coverline's
   cap height. If the coverline competes, it is wrong, not bold.
2. **Weight, then color, then case — in that order** when stepping down
   hierarchy. Step 1: same font, weight 900 → 700. Step 2: color → 0.8 opacity
   or an accent. Step 3: case or size change. Never skip two steps at once.
3. **One accent color maximum** per cover (gold, signal yellow, terminal
   green), and only when the genre's playbook allows it. Paper #FFFFFF,
   ink #000000, bone #F7F6F0 are neutrals, not accents.
4. **One rotated element maximum** (±2-6° hand-set tilt), OR one side rail —
   never both. Rotation is spice, not sauce.
5. **Tracking encodes role:** masthead 0.08-0.14em (monumental), metadata
   0.10-0.18em (machine), coverlines 0.06-0.10em (voice). Script faces:
   0.04-0.08em only.

---

## 5. Contrast & Legibility Devices (ordered by print authenticity)

1. **The plate** — ink-on-paper. Text over subject/busy zones MUST sit on a
   solid rect (same xPct/yPct, wPct = text + 8, hPct = text + 1.2, sharp
   corners) with inverse-contrast type. This is the user-facing "black text
   on a white rectangle at this position."
2. **The badge** — a plate with its label baked in (fillColor = plate,
   strokeColor = label ink). Auto-fits; label hides rather than squashes.
3. **The dim** — bgDim 0.12-0.32 darkens the photo so un-plated white type
   reads in the calm bands. dimWholePhoto for full-sandwich dimming.
4. **The filter** — mono / vintage / noir re-grades the photo toward the
   palette when color fights the type.
5. **Grain** — opacity 0.10 (glossy) → 0.42 (photocopy). Unifies photo and
   type into one printed object.
6. **Never shadows.** Print type is crisp. Contrast comes from geometry
   (plates) and light (dim), never blur.

---

## 6. Movement & Statement Devices

- **The sandwich:** masthead behind the subject (depth "behind") is the
  signature move — the subject overlapping letterforms is what makes it a
  *text-behind-image* cover, not a captioned photo.
- **The statement:** one coverline crossing the subject on a plate, at
  feature weight. Bold, legal, rare (≤ 1 per cover).
- **The spine:** the side rail adds a z-axis, implying a physical object.
- **The bleed frame:** turns the cover into a document/exhibit.
- **The scan:** real EAN-13 barcodes (digits drive the bars) and real QR
  codes (label = encoded link) assert physicality.

---

## 7. Genre Deployments (same grammar, different settings)

| Genre | Masthead | Signature move | Accent | Grain |
|-------|----------|----------------|--------|-------|
| Vogue/Fashion | Didone (cinzel/bodoni) 700-900, symmetric top | Paris folio + barcode, clean white | none | 0.10-0.14 |
| Zine/Street | archivo/anton 900, tight tracking | White badge stamp + barcode bottom-LEFT + **left spine rail** | none | 0.24-0.30 |
| Quiet Luxury | cinzel 400, tracking 0.12-0.16 | Ivory bleed frame, italic playfair kicker | bone | 0.14-0.18 |
| 35mm Noir | playfair 900 | noir filter, heavy grain, archive badge | none | 0.34-0.42 |
| GQ | bebas-neue | Gold sub-coverline (the one accent) | #D4AF37 | 0.12-0.16 |
| Dazed/Culture | syne 800 | mono dateline + **right spine rail** + RAW CUT badge | none | 0.28-0.36 |
| Discovery | playfair 700 | Yellow bleed frame + yellow dateline | #FFE500 | 0.14-0.18 |
| Cyber | space-mono 700 | Terminal green dateline, DECLASSIFIED badge | #00FF88 | 0.26-0.32 |
| Vinyl | playball script | STEREO 33⅓ badge, sleeve credits | none | 0.12-0.18 |
| Architecture | bodoni/cinzel 700 | White frame, monograph numbering, strict grid | none | 0.10-0.14 |

---

## 8. Mapping to the App Schema

- Every text component → `TextLayer` (`xPct`/`yPct` = box center, `widthPct`
  scales the type when `fitToWidth`, `depth` picks the sandwich layer,
  `rotationDeg` ±90 = side rail, `letterSpacingEm` = tracking device).
- Plates/badges/barcodes/QR/frames → `ShapeLayer` (front shapes render
  beneath front text — that ordering IS the plating system).
- Photo treatment → `photoStyle` (bgDim, dimWholePhoto, photoFilter, grain).
- The collision solver (`resolveFrontCollisions`) enforces the vertical gap
  law after every AI layout; AUTO-LAYOUT OFF hands that control to the user.

---

## 9. Adding Reference Covers

When analyzing inspiration covers, decompose each one into this table —
component → zone → hierarchy weight → contrast device → movement device.
That decomposition (never a subject description) is the input the AI prompt
system and new presets should be built from.
