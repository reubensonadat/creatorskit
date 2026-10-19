# HANDOFF PROMPT — Text-Behind Magazine Cover Engine

> **How to use this file:** open a fresh chat, paste everything below the line as your first message. It contains the full project state, every architectural ruling, and every lesson paid for — a new engineer (human or AI) can continue at full speed with zero re-discovery.

---

You are continuing work on **Text-Behind**, a magazine-cover composition studio inside a Next.js app at:

```
/Users/user/Desktop/Everything /creaotrskit
```

NOTE THE SPACE in the path — always quote it in shell commands. When executing commands, use `cwd: "."`. The page lives at `src/app/text-behind/page.tsx` (route `/text-behind`); the engine lives in `src/lib/magazine/` (15 modules); the AI route is `src/app/api/ai/magazine-layout/route.ts`.

## 1 · WHAT THIS TOOL IS

The user uploads a photo (background + optional cutout). The app composes a real magazine cover over it: masthead, dateline, feature coverline, sub, teasers, badge, side rails, plates, barcode/QR, frames, grain, photo filters. Four paths produce covers:

1. **ASSEMBLE COVER** (no AI key needed) — a deterministic on-device solver composes the cover; every click is a new edition.
2. **AI COVER** — the AI route returns a full JSON layout spec.
3. **PRESETS** — 15 hand-authored editorial presets (the quality bar the user measures everything against).
4. **AI REFINE COPY** — rewrites only the words, geometry locked.

The UI is a 3-step flow: **1 Analyze** (AI reads the photo) → **2 Words** (AI writes the edition's copy) → **3 Assemble** (the solver builds the cover).

## 2 · THE ENGINE — 15 FILES, ONE ISSUE EACH

The user explicitly ruled: **do not build one monolith algorithm** ("we are trying to fit everything into one algorithm — that's why we are facing too many problems"). Every module owns exactly one issue:

| File | Section | Owns |
|---|---|---|
| `units.ts` | §0 | Pure math + `Rect` + `opticalSnap` + `DEV` flags + `rectOf`/`rectCx` |
| `debug.ts` | §0 | `devGuardUnits()` — the unit police |
| `types.ts` | — | `Grid` alias, `SolvedPlacement`, `SolverResult` (incl. `archetype?`, `plan?`) |
| `field.ts` | §1 | Measurement: 24×30 calm-field scan → `GridAnalysis` (rowProfile/colProfile/subjectBox/subjectCore/light) |
| `zones.ts` | §2 | Whitespace candidate zones from the field |
| `copy.ts` | §3 | `SolverSemantics` (summary/genre/mood/subjectFocus/archetypeHint/**copy**), `SolverCopy`, `fitCopyToZone`, `giantWordFrom` |
| `ladder.ts` | §4 | The type ladder (hierarchy ratios + scale exaggeration) |
| `assign.ts` | §5 | Hungarian assignment + k-best alternates |
| `archetypes.ts` | §6.5 | The brand library: ten ARCHETYPES, six masthead bands, `ARCHETYPE_OF_STYLE`, `inferComposition`, `mastheadBand`, `listArchetypes` |
| `signatures.ts` | §7 | Style signatures + `registerStyleSignature` (user presets) + `preset:*` tokens |
| `decorations.ts` | §8 | Decoration emitters (giant-type, crosshair, rails, frames — NO corner ticks) |
| `laws.ts` | §9 | The verifier: **twelve laws** L1–L12 + `formatSolverReport` |
| `skeleton.ts` | §10 | `applySolverToCover` + §10.5 weighted relaxation |
| `solver.ts` | §11 | The orchestrator: `solveEditorialCover` (~560 lines), archetype/plan resolution, cost hooks, materialize |
| `index.ts` | — | Barrel re-exports |

`solver.ts` resolves per solve: `hintArch` (AI hint) vs `styleArchId` (brand mapping) → `archetype`; `inferComposition(g)` → `plan`. The archetype steers masthead cost band-affinity, cluster stack bias, scan corner, and the materialized brand band; `verifyLaws` receives `(placements, ladder, g, signature, archetype, plan)`.

### HOUSE UNIT GRAMMAR (violations crash dev builds)

- `xPct` / `yPct` = **fractions 0–1** (centres).
- `widthPct` / `heightPct` / `wPct` / `hPct` = **percent 0–100**.
- Policed by `devGuardUnits()`. Never multiply x/y by 100.

## 3 · THE ANATOMY (from the user's 60-cover structural analysis)

**The ruling that organizes everything:** a magazine cover is a **FIXED BRAND SYSTEM** (masthead position + family + colour + barcode corner — chosen per brand, never per issue) into which a **VARIABLE COMPOSITION** is dropped. **The photograph's negative space selects the composition; the brand preset stays immutable.** The solver FITS the brand to the photo — it never invents brand identity per click.

- **7 atomic components**: masthead, dateline, feature coverline, sub, teasers, badge, barcode/QR (+ plates/rails/frames as devices).
- **6 masthead positions**: A full-width over-head (0.5/0.095/w92) · B deep-layer behind subject · C compact nameplate (0.5/0.075/w40) · D indie top-left (0.24/0.08/w44) · E vertical side rail (±90°, x 0.055/0.945, w58) · F bottom floor (0.5/0.925/w70). A shifts to side-strip 0.27/0.73 w44 when headroom < 0.5 && strip > 0.55 (strategy 4.3).
- **10 archetypes** (`ARCHETYPES`): classic-vogue, vogue-deep-layer, time-frame, natgeo-frame, bazaar-soft, indie-minimal, tabloid-stack, bottom-strip, inverted-commemorative, avant-garde.
- **Hierarchy ratios**: masthead ≥ 2× feature; feature ≥ 1.4× sub; sub ≥ 1.1× teaser. Exaggerate scale — don't be timid (Gestalt lesson: small differences read as mistakes).

## 4 · THE TWELVE LAWS (`laws.ts`)

L1 masthead leads the upper field (exempt: giant wordmarks, rotated rails, position-F brands) · L2 ladder monotonicity · L3 cluster breath · L4 edge safety · L5 plate justification · L6 scan corner · L7 spread balance · L8 rail alignment · **L9 Gestalt proximity** (groups must separate harder than their internal breaths) · **L10 Gestalt alignment** (cluster rungs share one axis, drift ≤ 0.02) · **L11 Gestalt focal** (feature needs plate or ≥2.5:1 tonal contrast) · **L12 brand fidelity** (masthead in its archetype's canonical band).

## 5 · THE NO-OVERLAP DOCTRINE (the user's loudest, most repeated demand)

> "I don't want to see it AT ALL — every text should be self-aware of its position so it doesn't go over a lap over another text. Please I beg you."
>
> "Auto layout should not lock things to specific positions. The only thing we should do should make sure text isn't on top of another text. Text on top of a rectangle on top of a square — it's not a problem. Text on top of another text is my biggest problem."

**SEPARATION ONLY is the governing rule.** Text overlapping shapes/plates is intended design — never separate, never prune, never pin. The ONLY automatic intervention permitted is **text×text separation**, plus plates following their words:

1. **Engine (§10.5, `skeleton.ts`)** — skeleton snapshot, sibling re-docking, weighted vertical relaxation, spec-overlap audit (solver-spec level).
2. **Page (`guaranteeNoTextOverlap`, `page.tsx` after `enforceLayoutLaws`)** — THE FINAL GUARANTEE, runs **unconditionally** (no toggle, every path) on: assemble, AI-generate, AI refine-copy, and the manual law button. Fixed-point solve (≤24 passes, every push rechecked against the whole list — global self-awareness), vertical-first (alignment axes survive), horizontal sidestep for same-band grazes, role weights mirror §4 hierarchy (masthead 5 · feature 4 · sub 2.5 · dateline 1.5 · teaser 1.2). Measurement is conservative: uppercase advance 0.74 / mixed 0.68 of cap height **plus letter-tracking** (a +0.14em masthead is ~15% wider than its character count suggests).
3. **Exemption (narrowed by ruling)** — only `sys-giant-*` (the solver's giant wordmark) and monumental scale (heightPct ≥ 20) are backdrop. **Depth alone exempts NOTHING**: a behind-depth masthead overlapping coverlines is a collision, not a sandwich.
4. **`reCutPlates(layers, shapes)`** — after separation moves or rewords a line, the plate serving it re-cuts to the new box. A rect SERVES the text whose centre it carries (largest overlap wins); plates already covering their text are untouched — authored geometry wins. This is cosmetic follow-up, never separation.
5. **`enforceLayoutLaws` is DEMOTED** — it survives ONLY behind the explicit manual law button. It must never run in the automatic paths again (it pruned shapes, pinned rails to centre bands, clamped to frames, and treated shapes as boulders — exactly the position-locking the user rejected).

## 6 · AI INTEGRATION (one round trip, trained on the anatomy)

The analyze mode (`route.ts`, `mode === 'analyze'`) is the perception+art-direction+copy layer — **the AI does the design work; the resolver resolves it**. Its system prompt teaches the ten-archetype anatomy (rendered live from `ARCHETYPES` — never hardcode ids), the full structural lawbook (hierarchy ratios, sandwich ≥70% legibility, face no-text zone, crop→template, Gestalt, colour intelligence), and the DIRECTION MENU rendered live from `ART_DIRECTION_MENU`. ONE response returns:

```json
{"summary", "genre", "mood[]", "subjectFocus", "archetype", "direction": {menu picks + tone + accent + mastheadScale + energy}, "note", "copy": {"masthead", "dateline", "feature", "sub", "teasers[]"}}
```

**§7.5 THE DESIGN BRIEF + §V THE EDITION VARIANT ROLL** (the one-centimetre-jitter fix):

- Every analyze call rolls a server-side **EDITION ASSIGNMENT** (family / treatment / masthead attitude / energy / wildcard — `rollAnalyzeAssignment()`) into the user prompt: re-analyzing art-directs a genuinely DIFFERENT edition of the same brand instead of converging on the same safe menu.
- The brief carries four taste decisions the composer materializes: `tone` (masthead ink, contrast-guarded), `accent` (ONE hex mined from the photo), `mastheadScale` (monumental/classic/compact → heightPct 20/16/11 + width/tracking), `energy` (grain/dim/teaser-density bias).
- **The variant roll** (`composeSystemCover`, §V): a direction pins the BRAND SYSTEM; within it the per-click seed rolls a different REALIZATION — feature placement band (high/mid/floor/statement), micro voice (rail vs dateline), badge spot, teaser density. The roll only spends freedom the AI left unpinned; an explicit pick always wins. Same click speed, zero extra round trips.

- The `archetype` id is **validated against `ARCHETYPE_IDS`** — hallucinated ids are dropped (free solve). Returns as `semantics.archetypeHint`.
- The copy is **budget-clamped server-side** (masthead 3–9 wordmark-safe uppercase letters, dateline ≤40, feature ≤44, sub ≤60, teasers ≤3×≤28) — the app trusts it verbatim. Returns as `semantics.copy`.
- The prompt demands fresh words: "if a phrase feels like the obvious first guess, write the second one."
- Page precedence for content: **user custom text (contract) → AI copy → canvas → vibe input → pools.**
- The AI's copy also feeds the solver's §3 fitness pass (`opts.copy`) — words are measured against real zones at real rungs BEFORE geometry is chosen.
- **The AI never emits a coordinate for the solver path.** It hints the brand; geometry stays deterministic.
- `ARCHETYPE_OF_STYLE` maps all 15 SystemStyleIds to brands (time→time-frame, eye→avant-garde, bazaar→bazaar-soft, fragments→avant-garde, food→classic-vogue, etc.).
- Refine mode (`mode === 'refine'`) rewrites only copy against the locked skeleton; the guarantee + `reCutPlates` then adapt (new word lengths can create new collisions).
- ⚙ readout (`formatSolverReport`) shows the brand that owned the solve: `brand classic-vogue (front / stack left)`.

## 7 · ASSEMBLE FLOW (page.tsx `handleAssembleSystemCover`)

1. `analyzeGridFromCanvas` → GridAnalysis → `gridToPhotoAnalysis` (one downsampled scan feeds everything).
2. `solveEditorialCover(grid, aiSemantics, {seed, style, copy})` → placements + ladder + decorations + violations + archetype/plan.
3. Content resolution (precedence chain above) → `composeSystemCover({style, analysis, content, layoutId, brand})`.
4. `applySolverToCover` is intentionally NOT called (collision history) — the composer owns clean positions; the solver contributes genre + decorations.
5. Solver decorations re-expand with full fidelity: giant-type → real TextLayer (`sys-giant-*`, fit-to-width, mask-in-type ghosting), crosshair → twin registration bars, else rect. `composed.shapes` drops `sys-decoration-*` prefixes first.
6. **Separation only** on the merged final list (`guaranteeNoTextOverlap` over composer text + solver texts), then `reCutPlates` — the law engine is never in the automatic path (ruling §5).
7. The LAYOUT POOL walks A1→A2→…→F12 per click (`assembleIdxRef`).

## 8 · USER RULINGS — WHAT WAS REJECTED (do not reintroduce)

1. **Corner triangles / tick marks** — removed from every emission path; the field is documented RESERVED. The user noticed four corner triangles immediately and hated them.
2. **Text on text** — the loudest complaint, repeated four times. See §5.
3. **Timid hierarchy** — "hierarchy hierarchy hierarchy"; scale differences must be exaggerated, not polite.
4. **The monolith** — one algorithm for everything caused the overlap bugs; 15 independent files was the explicit fix.
5. **Slow/AI-lazy UX** — "we shouldn't make life difficult with the user": one round trip for analysis+words; refine is optional.
6. **Stale words** — copy must be fresh per generation, never recycled from the canvas.
7. **Broken UI rewrites** — the 3-step flow (Analyze → Words → Assemble) was restored after a failed redesign; do not restructure it without asking.
8. **Position locking / over-enforcement** — automatic layout must never pin, prune, or clamp elements to "correct" positions. Text overlapping shapes/plates is intended design. The ONLY automatic intervention permitted is text×text separation (+ plates following their words).

## 9 · VERIFICATION GATE (run after every change)

```bash
cd "/Users/user/Desktop/Everything /creaotrskit" && npx tsc --noEmit 2>&1 | grep -E 'magazine|solver|text-behind'; echo "GREP_DONE:$?"
curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000/text-behind; echo " PAGE"
```

Expect `GREP_DONE:1` (grep found nothing — zero errors) and `200 PAGE`. The dev server runs on :3000.

## 10 · CURRENT STATE & OPEN WORK

**Green as of hand-off:** 15-file engine split · §6.5 archetypes wired end-to-end · L1–L12 · §10.5 + THE FINAL GUARANTEE · separation-only automatic paths with `reCutPlates` · AI one-round-trip semantics+archetype+copy · all gates GREP_DONE:1 / PAGE 200.

**Open:**
1. **Layout quality is still below the user's bar** — "even the AI gave us better answers." The machinery is correct; the *taste* of composed layouts needs the next push: better use of the anatomy's stack strategies, crop-aware composition, and preset-grade polish in `composeSystemCover`.
2. **User's preset pictures** — when the user provides reference images, register them via `registerStyleSignature` (signatures.ts) as `preset:*` tokens (decoration-only, never a composer genre — page guards with a `startsWith('preset:')` check).
3. **Preset path is not guarantee-wired** — `applyEditorialPreset` sets authored layers directly (fixed words, loved as-is). If overlap reports ever implicate presets, wrap their commits with `guaranteeNoTextOverlap` too (separation only — never `enforceLayoutLaws`).
4. **Solver route training data** — the analyze prompt renders anatomy live from `ARCHETYPES`; if archetypes change, the prompt follows automatically. Keep it that way.

**Reference docs:** `docs/MAGAZINE_COVER_SYSTEM.md` (component grammar) · this file (state + rulings). **Archives:** `scratch/solver-*.ts.txt` (history, excluded from tsc via `.ts.txt`).
