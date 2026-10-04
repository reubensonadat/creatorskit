# Integration Progress Log & Session Handoff

> **Updated:** 2026-10-04 (FILM MODE SHIPPED in the teleprompter: SOLO video takes at 8 Mbps + CREW second-screen script mirror (/teleprompter/mirror) · hand-off wiring + /api/demystify edge fix done2026-10-03 — **next: Stage-0 launch checklist**)
> **Governing plans:** `docs/TOOL_INTEGRATION_PLAN.md` (integration + nav) · `docs/BUSINESS_MODEL_PLAN.md` (monetization + stage gates)
> **Purpose:** survive conversation compaction. Read this + the two plans to resume work.

---

## ✅ COMPLETED — Phase 1 Foundation (2026-10-02 session)

### 1. `src/data/tools.ts` — single source of truth (REWRITTEN)
- `ToolItem` now carries: `chrome: 'embedded' | 'fullscreen'`, `status: 'live' | 'beta' | 'archived'`, `icon` (lucide name string), `handoffs?: string[]`
- New exports: `HIDDEN_TOOLS` (quote-card, overlay, space-planner), `EVERY_TOOL`, `TOOL_CHROME` (href→chrome map), `VISIBLE_TOOLS` (live+beta filter)
- Promoted into `NATIVE_TOOLS` (now visible in nav/home): `/palette-extractor` (beta), `/sync-slate` (live), `/color-gradient` (beta)
- `space-planner` = `status: 'archived'` (kept in `HIDDEN_TOOLS` so its route keeps fullscreen chrome)
- Hand-off edges pre-declared on: auto-captions, compressor, resizer, watermark, carousel-slicer, text-behind, background-replace, palette-extractor, sync-slate, color-gradient

### 2. Navigation
- **`src/components/nav/SiteNav.tsx` — NEW.** The one nav component. Floating-pill mode shipped (search + category groups + active tool + external arrows, monochrome black/white/zinc). Exports `resolveToolIcon()` = the ONLY icon map in the codebase. Props: `currentHref, theme ('dark'|'light'), align, label` (API-compatible with old StudioToolsDropdown).
- **`src/components/StudioToolsDropdown.tsx` — now a one-line shim** re-exporting SiteNav. Consumers (teleprompter, video-grabber, business, thumbnail-lab) migrated automatically. Delete the shim once consumers import SiteNav directly.
- **`src/components/ClientLayout.tsx` — REWRITTEN.** The hardcoded `toolPaths` (16) and `fullscreenApps` (6) lists are GONE. Chrome derives from `TOOL_CHROME` (exact + subpath prefix match). Unknown routes → marketing Navbar (default).

### 3. Naming rebrand: CreatorKit → CreatorsKit (domain truth: creatorskit.win)
- `src/lib/seo.ts`: `SITE_NAME = 'CreatorsKit'`
- Swept 145 strings across 57 files via `scratch/rebrand.cjs` (regex `/CreatorKit(?!ProjectMetadata)/g`)
- **The ONLY allowed remaining `CreatorKit` token:** the TS identifier `CreatorKitProjectMetadata` (project-metadata.ts + auto-captions import) — do not rebrand it; imports would break
- `src/app/manifest.ts` REWRITTEN: CreatorsKit name, `theme_color: '#000000'`, Space Planner shortcut removed, description de-planner-ized
- `src/app/layout.tsx`: metadata → CreatorsKit, viewport `themeColor: '#000000'`
- `metadata.json`: no longer claims the app is "3D Space Planner"

### 4. Route rulings executed
- **`/exposure-monitor` DELETED**, 301 → `/` (in `next.config.ts` redirects)
- **`/overlay` KEPT** (owner correction): it renders the full captions app with `initialDeck="overlay"` (`src/app/overlay/page.tsx`) = refresh-proof standalone URL for the overlay deck. Registered in `HIDDEN_TOOLS`. The redirect for it was REMOVED from next.config.ts.
- `/quote-card` still live but marked for **fold into /text-behind Card Studio** (Phase 2), then 301 + delete
- `src/app/admin/layout.tsx` — NEW: `robots noindex`

### 5. SEO
- `src/app/sitemap.ts`: added `/palette-extractor`, `/sync-slate`, `/color-gradient`

---

## 🔨 BUILD VERIFICATION STATUS

`npm run build` (Next.js 16.3.2 Turbopack):
- **Compiles successfully + generates all 48/48 static pages** — verified 4× runs
- **2026-10-02 (post Step-1): full clean run — exit 0, standalone copy + postbuild strip completed, no EBUSY.**
- **2026-10-02 (session 3, post quote-card + Compress & Convert): exit 0 — 47/47 pages, `/quote-card` + `/compressor` both static routes; first attempt hit EBUSY once, immediate retry was clean. tsc: zero errors on touched files.**
- **KNOWN NON-CODE FAILURE (intermittent):** final `output: "standalone"` copy step can throw `EBUSY: resource busy or locked` (Windows Defender/sync-tool locks `.next` files). Different file each run, never a compile error. Cloudflare Pages CI (Linux) is unaffected. Do not "fix" app code for this; if local standalone output is needed, exclude `.next` from real-time antivirus scanning.

---

## 🚧 NEXT STEPS (in order)

### Step 1 — Finish nav unification ✅ DONE (2026-10-02)
All bespoke switchers replaced with `SiteNav` / `SiteNavList`; build green (48/48, exit 0).
1. `src/app/thumbnail-lab/page.tsx` — deleted 113-line drawer + `toolsSidebarOpen` state + yellow `#FFE500` active style; header now renders `<SiteNav mode="floating" currentHref="/thumbnail-lab" theme="dark" align="left" />`; removed dead `StudioToolsDropdown` import, `ALL_TOOLS` import, `PanelLeftOpen` icon.
2. `src/app/text-behind/page.tsx` — deleted drawer JSX (~52 lines) + all `text-behind-tools-*` CSS (~126 lines) + `toolsOpen`/`toolSearch` state + `filteredTools` memo; header now renders `<SiteNav mode="floating" currentHref="/text-behind" theme="light" align="left" label="TOOLS" />`; removed `LayoutTemplate`/`Home` icons (`Search`/`X` kept — other usages).
3. `src/app/bouquet/page.tsx` — deleted Tailwind drawer (~98 lines) + state + memo; header renders `<SiteNav … theme="light" align="left" label="TOOLS" />`; removed `X`/`Search`/`Home` icons (`LayoutTemplate` kept — used by CARD VIEW buttons).
4. **SiteNav.tsx new exports:** `SiteNavList` (shared list renderer, variants `compact|roomy|rail|drawer`, external-link + badge + active handling), `SITE_TOOL_COUNT`, `findTool(href)`. Popover untouched.
5. **Navbar.tsx** — desktop dropdown + mobile menu lists → `<SiteNavList>` (`compact`/`roomy`); counts → `SITE_TOOL_COUNT`; `ALL_TOOLS` import removed. Mobile badge chip yellow `#FFE500` → black/white.
6. **ToolLayout.tsx** — legacy href-keyed `TOOL_ICONS` map (24 keys) DELETED; desktop icon rail + mobile drawer lists → `<SiteNavList variant="rail|drawer">` (icons via `resolveToolIcon(tool.icon)`); `currentTool` → `findTool(pathname)`; active item yellow `#FFE500` text → white; topbar CK.win button yellow → black/white.
7. **Shim deleted:** `src/components/StudioToolsDropdown.tsx` removed. Its 4 consumers (`video-grabber`, `teleprompter/page.tsx`, `teleprompter/page.archive.tsx`, `business`) now `import StudioToolsDropdown from '@/components/nav/SiteNav'` (local name kept; props identical).
**ACCEPTANCE TEST PASSED:** `ALL_TOOLS` code references exist ONLY in `tools.ts` (definition) + `SiteNav.tsx` (comment); `TOOL_ICONS` — 0 hits; grep verified post-build.
**Note:** `align="left"` is required for pills anchored at the far left of a header (default `right` popover would overflow off-screen).

### Step 2 — Phase 2 workstreams (docs/TOOL_INTEGRATION_PLAN.md §8) — ✅ DONE (sessions 2-3, 2026-10-02)
1. **Text-Behind Card Studio** — ✅ CLOSED (direction reversed, owner 2026-10-02):
    - `kind: 'button'` shape (editable pill label, default `NEXT`) shipped in session 2 and STAYS in text-behind.
    - Multi-card pages were REVERTED out of text-behind (owner: the AI tool stays single-canvas; text-behind restored to its pre-deck state, tsc clean). The card deck lives in `/quote-card` instead — see Step 2b.
2. **Resizer v2** — ✅ ALREADY COMPLETE (found built in `src/app/resizer/page.tsx`): image+video intake, platform presets w/ safe zones, fit modes incl. `blur-fill`, trim in/out, frame-accurate WebCodecs H.264 MP4 with original audio via `exportCanvasVideoToMp4`, watermark stamping with remembered position, ZIP batches. Nothing left except the §4 in-edge (match-cut/auto-captions → resizer "reformat this render" button passing the source FILE).
3. **Watermark v2-or-die** — ⏳ NOT STARTED. Note for the verdict: resizer now embeds WYSIWYG batch stamping (drawWatermark + position memory) where outputs actually live; the standalone tool must justify itself or archive (owner call).
4. **Compress & Convert** — ✅ SHIPPED (session 3): see Step 2b below.
5. Survivor promotion — ✅ layouts done: created `src/app/{palette-extractor,sync-slate,color-gradient}/layout.tsx` (toolMetadata + buildKeywords + softwareAppJsonLd + breadcrumb). tools.ts entries + handoffs existed from Phase 1. Remaining nice-to-haves: in-page FAQ blocks + NEXT→ rows (Step 3 covers globally).
6. **Space Planner sunset** — ✅ DONE: `/space-planner` 301 → `/` (next.config.ts), `src/app/space-planner/` + `src/components/space-planner/` + `src/lib/space-planner/` DELETED (three.js now unreferenced in src; dep left in package.json — prune later), HIDDEN_TOOLS entry removed. Build confirms 47/47 pages (was 48).
Build after session 2: compiles + 47/47 pages ✓; standalone copy hit the KNOWN EBUSY again (see verification section) — not code.

### Step 2b — Session 3 (2026-10-02): /quote-card rework + Compress & Convert — ✅ DONE
1. **/quote-card = Quote Card Studio (OWN tool, owner revision):** built via `scratch/patch-quote-card.cjs` (54 exactly-once replacements against a text-behind snapshot, DRY-run verified 54/54 first). Fork keeps: canvas + drag + font stack + shapes (incl. button) + grain + undo + IndexedDB persistence + SiteNav header. Fork removes: ALL AI machinery (model cache, worker, prewarm, ThinkingOrb, auto-cutout, remove-background). Fork adds: card deck (`cards: CardDeckItem[]`, per-card bg photo via in-memory `cardBgRef`, per-card bg colour, `stashWorkingPhoto`/`applyCardPhoto`/`switchCard`), batch bg upload (first → active card, extras → new cards), format templates 1:1/4:5/9:16, deck PNG export, whole-new-state reset (`handleResetAll` wipes deck + layers + shapes + grain + localStorage keys; popover "START FRESH?" offers NEW PHOTOS ONLY vs WHOLE NEW STATE; owner: "we cache our quotes but we have to allow to create a whole new state"). Hand-offs: → text-behind (AI sandwich, blob via tool-handoff), carousel-slicer, resizer, thumbnail-lab.
2. **Route/nav/SEO restore:** /quote-card → /text-behind redirect REMOVED from next.config.ts · own NATIVE_TOOLS entry (label 'Quote Card Studio', hint 'INSTAGRAM & FACEBOOK QUOTES', badge 'NEW') · `/quote-card` added to hardcoded sitemap.ts (0.8) · `src/app/quote-card/layout.tsx` rewritten with Instagram/Facebook quote-card SEO · export filename base 'card'.
3. **Compress & Convert rebuild:** `src/app/compressor/page.tsx` fully rewritten (~560 lines) + `src/app/compressor/layout.tsx` created + tools.ts entry updated ('Compress & Convert', 'PDF ⇄ IMAGES · SAVE DATA'). PDF → images via lazy pdfjs-dist v6 (`page.render({ canvas, viewport })` — v6 REQUIRES `canvas`, not `canvasContext`); images/SVG → PDF via lazy pdf-lib (rasterize-to-PNG fallback for WebP/SVG); PNG⇄JPG⇄WebP ± AVIF via Canvas (AVIF feature-detected); debounced size estimates BEFORE convert; batch convert with per-item progress; JSZip download-all (lazy). pdf.worker.min.mjs already in public/.
4. **Verification:** `npx tsc --noEmit` → zero errors for quote-card + compressor · `npm run build` → exit 0, 47/47 pages, `/quote-card` + `/compressor` both static.

**Quote Card v2 idea parking lot (owner asked "what wow functionality can we add?" — proposals, NOT approved/started):**
- Quote templates gallery (viral layouts: bold-centre, split-band, sticky-note, mirror) one tap from empty state
- Swipeable card deck on mobile (ties into Phase 6 swipe UX)
- "Quote bank": paste a script/transcript → auto-split into one card per line (feeds from teleprompter/auto-captions scripts)
- Audio quote cards (podcast-clip waveform quote card) — pairs with the Castos Dynamo directory entry
- Brand kit: saved fonts + colours applied to every card in the deck in one tap (palette-extractor feeder)
- Attribution/signature strip on all deck exports
- Multi-format deck export: IG 4:5 + story 9:16 + FB square in one click

### Step 3 — Phase 3/4 per plan — ✅ DONE (2026-10-02): hand-off edges + "NEXT →" row shipped; yellow kill list executed (§6; semantic yellows kept)

---

## 📌 KEY DECISIONS LEDGER (owner rulings — do not relitigate)

| Topic | Decision |
|---|---|
| Brand name | **CreatorsKit** (domain `creatorskit.win` rules). "CK.win" logo text stays |
| Space Planner | Dead. No 3D house builder. Affiliate is never a pillar |
| Quote-card | **OWN tool at `/quote-card`** (owner revision 2026-10-02, supersedes the fold): text-behind fork minus AI, per-card bg photo/colour, batch upload → deck, hand-off → text-behind for AI sandwich. Instagram/Facebook quote positioning. Not fighting Canva — free + instant + easy |
| Exposure-monitor | Scrapped |
| `/overlay` | KEPT — refresh-proof URL for captions overlay deck (`initialDeck="overlay"`) |
| Watermark | v2 SHIPPED 2026-10-02 (logo library + position memory + WYSIWYG + hand-offs) — passed its one chance |
| Compressor | Becomes Compress & Convert (batches, PDF/SVG/WebP). ImageMagick = dev machine only |
| Storage | Zero server-side user data. Local-first (IndexedDB). Cloud sync only for paying Pro (future) |
| Monetization | Stage-gated: launch + validation gates BEFORE any pricing page/Stripe (`docs/BUSINESS_MODEL_PLAN.md` §8). Invoice/receipt share links = launch wedge + "Made with CreatorsKit" footer |
| Design | Monochrome; yellow only where it encodes measurement (meters, IRE). `#FFE500` theme colors already → `#000000` |
| Freeze | No new tools. Everything ahead upgrades/connects existing routes |
| Yellow accents | Kill decorative; keep semantic (dB meters, IRE scale, --warn token) |
| Mobile UX | Phase 6 FULLY SHIPPED incl. roll-out extension (2026-10-02, session 5): shared `src/components/mobile-editor/` (MobileEditorToolbar + CategorySheet); text-behind (PHOTO·TEXT·SHAPES·EFFECTS·NEXT), quote-card (CARDS·PHOTO·TEXT·SHAPES·NEXT + mobile-only deck-manager card, per-card canvas sizes), bouquet (GREENERY·FLOWERS·CARD·MESSAGE·PREVIEW, chips map to wizard steps), thumbnail-lab (FEED·GRADER·A/B VARS·EXPORT, bespoke top bar removed, EXPORT reachable on mobile for the first time), business (INVOICE·RECEIPT·AGREEMENT·LETTERHEAD bottom bar, tab cards desktop-only). AUDIT CLOSED: all remaining tools already stack (globals.css `1fr !important` rules / isNarrow gates / single-column flows). NO sparkles in bouquet studio UI (owner ruling) |
| Local memory | Phase 7.1 SHIPPED (2026-10-02, session 7): shared `src/lib/local-memory.ts` (IndexedDB `ck_local_memory`: assets + states stores, replace-all saves, `listMemory()` for /your-data, private-mode safe) + SIX tools wired — watermark queue, palette-extractor source, carousel-slicer source + slide layout (auto re-slice), compressor queue + settings, resizer source + formatting presets, thumbnail-lab full candidate canvas (`mem:<slot>` blob markers, debounced). Rulings: deliberate clear = wipe; §4 hand-off wins over restore; `hydratedRef` gates persist effects. 7.2 + 7.3 SHIPPED same session: batch watermark takes `image/*,video/*` (video helpers promoted into canvas-video-exporter and shared with resizer; per-clip MP4 pipeline + ZIP-all) and `/your-data` transparency page (view/delete/export-all ZIP, sitemap'd). 7.4 audit SHIPPED same session (every batch surface already one-tap ZIP; JSZip made lazy in watermark/resizer/carousel/match-cut; Phase-1 brand sweep: all user-visible `creatorkit-` names → `creatorskit-`, back-compat parser widening). PHASE 7 COMPLETE. |

---

## Step 2c — Session 4 (2026-10-02, later): §4.2 hand-off graph CLOSED + watermark v2 + mobile foundation fixes

**Verification:** `npx tsc --noEmit` clean for every touched file · `npm run build` **exit 0, 47/47 pages** (one known Windows EBUSY retry on `.next\standalone` copyfile — not code) · postbuild strip-ort-wasm clean.

**Hand-off edges shipped (Phase 3 ✅ CLOSED):**
- text-behind → resizer (clean-canvas blob; Option-4 "Reformat For Every Platform" modal button; modal chips monochromed)
- quote-card → resizer (same pattern; + consumer `takeHandoffImage('quote-card')` → card background)
- background-replace → watermark (BATCH WATERMARK button; badge monochrome)
- **watermark v2 (FULL REBUILD ~520 lines):** logo library `ck_wm_logos_v1` (save/apply/delete, dedupe, cap 12) · settings+position+last-logo memory `ck_wm_settings_v1` · live WYSIWYG preview (first image ≤720px + shared `drawWatermark`) · intake from background-replace/color-gradient · first stamped output → compressor/resizer · ZIP re-download · §7 scorecard → **A−**
- carousel-slicer → compressor/resizer (`sendFirstSliceTo` + NEXT→ row; badge/dropzone/generate button monochromed)
- compressor → resizer (`handoffFirst` first output blob) + compressor INTAKE (image handoffs from watermark/carousel-slicer land in the queue) + NEXT→ row + badge monochrome
- palette-extractor → color-gradient ("Find Gradients" button ships hexes via `putHandoffText`) + badge monochrome
- color-gradient → quote-card/watermark (`renderHandoffBlob`: selected combo → 1440² linear-gradient PNG or the mesh composition; buttons in BOTH tabs) + badge/pins-badge/tab-chips monochromed (#FFE500 → #fff)
- auto-captions → text-highlighter/match-cut (NEXT→ `onBeforeNavigate` text branches, cue text joined `\n`)
- text-highlighter + match-cut consumers: `takeHandoffText` → longest ≤23-char opening phrase → `setAnchorPhrase` + `generateCutsForPhrase` (fresh cuts on load)

**Dep prune:** `three` + `@types/three` removed (grep-verified 0 imports in src) — 7 packages gone.

**Mobile foundation fixes (owner bug reports, shipped same session):**
- **Circle is now a TRUE circle** in text-behind + quote-card: `drawShapeLayer` clamps to the smaller axis (independent wPct/hPct rendered an oval on any non-square canvas); circle inspector shows ONE **DIAMETER** scrubber driving both axes
- **Everything movable on touch:** fat-finger grab zones (`hitTestLayers/hitTestShapes` take a `touch` flag — bigger pads for `pointerType === 'touch'`), `setPointerCapture` guarded for old browsers, and **colour cards are now draggable** in quote-card (the pointer guards blocked no-photo cards even though repaint allowed them)
- **Shape chips wrap:** add-shape rows `repeat(6,1fr)` → `repeat(auto-fit, minmax(84px,1fr))` — icons intact, no more squashed single line
- **Deck strip (1 2 3 4):** floats at the card's bottom edge inside the canvas viewport (absolute, bottom 10, centred chip) — never crowds the header, never under START EDITING (first relocation below the canvas landed under the sticky button; final position per owner feedback)

**Open (owner's new focus):** Phase 6 Canva-pattern spec written into plan §8 — bottom category bar + slide-up sheets (DONE / tap-canvas-close) for text-behind, quote-card, bouquet viewer. **Awaiting owner sign-off, then implementation.**

---

## Step 2c — Session 5 (2026-10-02, evening): Phase 6 Canva pattern SHIPPED (3 studios) + Phase 7 written into plan

**Verification:** filtered `npx tsc --noEmit` clean (text-behind / quote-card / bouquet / mobile-editor) · `npm run build` **exit 0, 47/47 pages** · postbuild strip-ort-wasm clean.

**Phase 6 shipped (desktop layouts untouched in all three — 980px CSS gates / md: prefixes):**
- **Shared shell:** `src/components/mobile-editor/MobileEditorToolbar.tsx` (fixed bottom h-scroll category bar, z-60, safe-area, toggle-on-re-tap, host-CSS-gated visibility → SSR-safe) + `CategorySheet.tsx` (generic slide-up sheet: peek 60vh w/ transparent tap-canvas backdrop vs full 85vh dimmed, drag handle + title + DONE, Esc — the shell for the remaining studios)
- **text-behind** PHOTO·TEXT·SHAPES·EFFECTS·NEXT: the existing desktop controls column restyled (≤980px) into the fixed bottom sheet via `data-ck-cat` attributes + `[data-ck-cat~=]` selectors — zero JSX duplication; the Advanced card splits SHAPES (`.ck-cat-shapeui`) vs EFFECTS (`.ck-cat-grain`); `ckSheetUp` 220ms animation; viewport bottom padding reserves the toolbar lane
- **quote-card** CARDS·PHOTO·TEXT·SHAPES·NEXT: same surgery + a mobile-only CARDS deck-manager card (`data-ck-cat="cards"` — switch/delete/add reusing deck state; hidden ≥981px so desktop visuals unchanged)
- **bouquet studio** GREENERY·FLOWERS·CARD·MESSAGE·PREVIEW: chips map onto the wizard steps (greenery→1, flowers→2, card/message→3 split via `.ck-bq-card`/`.ck-bq-message` @media ≤767px, preview→4); `useIsMobile` turns the `<aside>` into a fixed 85vh sheet (z-80) + dimmed backdrop (z-70); DONE in the sheet header; the stage keeps 100% of the screen with paddingBottom 84
- **Owner rulings folded in:** NO SPARKLES in the bouquet studio (MESSAGE chip = Mail, CARD chip = LayoutTemplate, "PREVIEW RECIPIENT PAGE" link = Eye)
- **Quote-card deck: per-card canvas size (owner ruling, same evening):** every `CardDeckItem` now carries its own `format {w,h}` — **+ ADD CARD inherits the ACTIVE card's effective size** (the photo's dimensions, or the SIZE chip for colour cards), so a 16:9 / 9:16 deck stays that way instead of snapping back to the default; switching/deleting restores each card's own format; multi-photo intake stamps every new card with its own photo's dimensions; deck ZIP export renders each card at its own size (state swap per card + working card restored after); persisted decks load with a 4:5 fallback for pre-format saves. Verified: tsc clean, build exit 0 47/47

**Phase 7 written into plan §8** (owner direction, queued): everything-local → IndexedDB memory per studio; batch watermark VIDEO; `/your-data` page (view/delete/export-all, zero server); one-tap download-all (ZIP) on every batch surface.

**Phase 6 roll-out extension SHIPPED (same session, owner "proceed with all that"):**
- **thumbnail-lab:** bespoke top tabs bar replaced by the shared bottom bar — FEED (Radio) · GRADER (Activity) · A/B VARS (Layout) · EXPORT (UploadCloud); `mobileActiveView` union extended with `'export'` so the export panel renders on mobile for the first time; feed column + grader sidebar get `paddingBottom 84` when mobile so nothing hides under the bar
- **business:** bottom bar INVOICE (FileText) · RECEIPT (Receipt) · AGREEMENT (ShieldCheck) · LETTERHEAD (Award) switches `activeTab`; the receipt-index tab card grid (`ck-tab-grid`) hides ≤900px; the bar (`ck-mobile-nav ck-noprint`) hides ≥901px and never prints; the existing 96px mobile page padding reserves the lane
- **Audit verdict — nothing left to convert:** color-gradient / match-cut / sync-slate already stack via globals.css `.tool-inner-grid` / `.gradient-workspace-grid` → `1fr !important` (beats inline grids); teleprompter already hides `prompter-desktop-sidebar` on mobile + has a controls drawer; background-replace has an isNarrow gate; watermark / resizer / compressor / carousel-slicer / palette-extractor / text-highlighter / auto-captions are single-column flows
- Verified: filtered tsc clean (thumbnail-lab / business) · `npm run build` exit 0, 47/47 pages

**Next:** Phase 7.1 — IndexedDB memory rule across every studio (working state, uploads, logos survive app close), then 7.2 batch watermark VIDEO → 7.3 `/your-data` → 7.4 one-tap download-all; plus the Phase 1/4/5 residue (CreatorKit→CreatorsKit sweep, B&W kill list, QA greps).

---

## Step 2d — Session 6 (2026-10-02): MOBILE RIGHT-SIDE CUTOFF FIXED EVERYWHERE (measured, not eyeballed)

**Owner bug report:** every tool page except /business was cut off on the right half on phones; /business perfect.

**Method — headless measurement, not guessing:** `scratch/mobile-audit.mjs` + probes (puppeteer-core + system Edge, 390×844, 21 routes) flag every element whose right edge crosses the viewport while NOT living inside an intended `overflow-x:auto` strip / fixed bar / invisible export node. `scratch/desktop-check.mjs` guards 1280px.

**Root cause (why /business worked but tools didn't):** /business grids are `repeat(auto-fit, minmax(min(100%, Npx), 1fr))` — capped by container. Tool pages collapsed their grids to plain `1fr !important`, but `1fr` = `minmax(auto, 1fr)` — the track still grows to the largest child's **min-content**, and `overflow-x:hidden` (html/body/tool-page-padding) then CLIPS it:
- match-cut + text-highlighter: preview `<canvas>` (intrinsic 1080/1920, `width:auto`) inside a shrink-to-fit flex card → 515-537px columns (+141-163px cut)
- resizer: 9-thumb strip (canvas `height:110px;width:auto` → ~210px each) → 1111px row (+723px cut; its own overflow-x:auto never engaged because the track fed it a full-width parent)
- sync-slate: 3.6rem mono timecode (~375px nowrap) + 96px lip-sync dial in one space-between row (+142-174px cut)
- False positives confirmed OK: bouquet 840px A4 node (opacity:0 z-9999 export only), thumbnail-lab category strip + text-behind demo posters + mobile-editor toolbar (all real scroll strips)

**Fixes (all inside the existing `@media (max-width:768px)` block — desktop untouched):**
1. grids → `minmax(0,1fr) !important` + `> * { min-width:0; max-width:100% }` (matchcut-workspace-grid, tool-inner-grid, resizer/gradient variants)
2. canvas chain: `.tool-canvas-frame`/`.tool-canvas-viewport` `width:100%; min-width:0` + canvas `max-width:100%; height:auto; margin:0 auto` (aspect preserved by attr ratio + max-height 38vh)
3. `.tool-transport-bar` nowrap→wrap (play/sound row + centered speed row; sound chip +121px was clipped)
4. sync-slate: `.syncslate-tc-row` class added (timecode 2.2rem, dial wraps) — page.tsx edit
5. resizer polish (owner feedback): canvas max-height 38vw→56vh (was unreadably ~150px), monitor header stacks tidily (`.resizer-monitor-head`, `.resizer-src-info` ellipsis) — page.tsx edits
6. export/download buttons compact one-per-line (`.tool-export-grid`/`.resizer-action-buttons`: 0.7rem, 8-10px pad, nowrap) — owner feedback "1 line 1 line"

**Verification:** 21/21 routes ✅ at 390px AND 1280px (desktop-check strips scroll-strips). tsc: only pre-existing unrelated errors (remotion types, teleprompter archive). Audit scripts stay in scratch/ for future layout QA.

---

## Step 2e — Session 7 (2026-10-02): Phase 7.1 LOCAL MEMORY SHIPPED — nothing local is throwaway

**Owner direction (plan §8):** "close the app, come back, and your thumbnail is still sitting there waiting for you."

**Shipped:**
- **`src/lib/local-memory.ts` (NEW):** one shared IndexedDB home — DB `ck_local_memory` v1, `assets` store (keyPath `key` = `tool:slot`; records carry tool/slot/label/name/blob/updatedAt) + `states` store (keyPath `tool`, JSON state). `saveAssets` = replace-all semantics (a deliberate clear is an empty-array write); `clearTool` = the /your-data delete; `listMemory()` groups per tool for the /your-data page. Best-effort try/catch everywhere (private-mode safe).
- **Wiring pattern (proven on watermark, repeated everywhere):** capture the blob on EVERY intake path (upload + §4 hand-off) → restore in the mount IIFE BEFORE the hand-off consumption (hand-off wins) → `hydratedRef` gates the persist effects so a restore can never be mistaken for a wipe → persists mirror the visible state INCLUDING empty (deliberate clear wipes memory).
- **watermark:** queue restored with a "Restored N photo(s) from your last visit" note + blob captured on hand-off intake; settings + logo library were already on localStorage.
- **palette-extractor:** last source photo persists; palette recomputed on restore (deterministic quantization — no state store needed).
- **carousel-slicer:** source blob + slide layout (`saveState`); restore decodes → setNumSlides/setPreview/setImage → auto re-slice via a committed-state `autoSliceRef` effect (sliceImage reads render scope — a direct call would slice with stale state); RESET wipes memory.
- **compressor:** whole queue (Items carry their File) + target/quality/pdfScale restored; CLEAR ALL / removing every file wipes memory (mirror-empty ruling).
- **resizer:** source file (image OR video) persisted at the single `handleFileUpload` choke point + formatting presets (platform/fit/gradient/letterbox/blur/format/quality) in the state store; transform (zoom/pan) session-only BY DESIGN — handleFileUpload resets it, so persisting it would fight the restore; brand watermark kit already on localStorage.
- **thumbnail-lab:** the full canvas survives — both candidate arrays + active ids + contentFormat; data-URL thumbs stashed as blobs with `mem:<slot>` markers in the state (JSON stays small), debounced 400ms; restore revives markers via FileReader; §4 hand-off still appends on top.

**Verification:** filtered tsc clean (local-memory + all six wired pages) · `npm run build` exit 0, 47/47 pages · postbuild strip-ort-wasm clean.

**Next:** Phase 7.2 batch watermark VIDEO (canvas-video-exporter pipeline) → 7.3 `/your-data` (listMemory-driven) → 7.4 one-tap download-all; plus the Phase 1/4/5 residue (CreatorKit→CreatorsKit sweep, B&W kill list, QA greps).

---

## Step 2e — Session 7, continued (2026-10-02): Phase 7.2 VIDEO batch watermark + 7.3 `/your-data` SHIPPED

**7.2 — batch watermark VIDEO:**
- `src/lib/canvas-video-exporter.ts`: `seekVideo` (seeked-listener + 800ms safety net), `sliceAudioBuffer`, `decodeAudioFromFile` (widened to `File | Blob | null`) promoted out of resizer's page-local helpers → ONE shared video pipeline; resizer refactored to import them (behavior unchanged).
- `src/app/watermark/page.tsx`: every intake path (upload, hand-off, memory restore) branches on type via module-level `loadVideoItem(file)` — decodes the clip, grabs a poster-frame canvas → `HTMLImageElement`, so ALL existing UI (WYSIWYG preview, queue grid, logo/position/opacity scrubbers) works unchanged; `Item.isVideo` + `Film` badge in the queue label.
- Per-clip render `renderVideoWatermarked(item, index)`: on-demand `HTMLVideoElement` on an objectURL → `exportCanvasVideoToMp4` with `renderFrameAsync` (seekVideo per frame → drawImage → `drawWatermark`, identical settings to photos) + original audio muxed back via `decodeAudioFromFile` (best-effort — silent on failure); fractional progress `setProgress(index + p)` keeps the batch bar smooth.
- Outputs: videos → MP4; photos → PNG/JPG as before; ZIP-all `watermarked-N-files.zip` (both fresh + re-download); results grid plays `<video>` for clips; dropzone/labels updated ("Drop images or videos…", "FORMAT (VIDEOS STAMP AS MP4)").

**7.3 — `/your-data`:**
- `src/app/your-data/page.tsx` + `layout.tsx` (toolMetadata SEO) + sitemap entry (0.5, monthly). Pure client page over `listMemory()`.
- Tool cards: label, N files, bytes, SETTINGS badge, last-updated, VIEW (expands to image thumbnails via objectURLs — revoked on switch/unmount — + truncated state-JSON preview) and DELETE (`clearTool`).
- localStorage `ck_*` section with per-key DELETE (watermark settings/logo lib, resizer brand kit, etc. — the tools not yet on IndexedDB).
- **EXPORT ALL**: lazy-loaded JSZip → `creatorkit-your-data-YYYY-MM-DD.zip` — `manifest.json` (exportedAt, device-only note, tool inventory) + per-tool folder (asset blobs as `slot-name.ext` + `state.json`).
- Privacy banner leads the page: "Your name is your name — we don't store your name."

**Verification:** filtered tsc clean (your-data, watermark, canvas-video-exporter, resizer, sitemap; the two transient `.next/dev/types/validator.ts` errors were stale generated route types — cleared by the build's regeneration) · `npm run build` exit 0, **48/48** pages incl. `/your-data` · postbuild strip-ort-wasm clean.

**Next:** Phase 7.4 one-tap download-all audit (watermark ZIP exists; verify compressor/carousel-slicer/resizer get ONE primary DOWNLOAD → ZIP) → then the Phase 1/4/5 residue (CreatorKit→CreatorsKit sweep, B&W kill list, QA greps).

---

## Step 2e — Session 7, final (2026-10-02): Phase 7.4 download-all audit + Phase-1 brand sweep — PHASE 7 COMPLETE

**7.4 audit verdict — every batch surface already ships ONE primary ZIP:** watermark STAMP → `watermarked-N-files.zip` (7.2), compressor DOWNLOAD ALL (lazy JSZip, per-item folders, `creatorskit-convert-N-files.zip`), carousel-slicer ZIP, resizer "Export All 9 Formats (ZIP)". Bonus surfaces covered too: quote-card EXPORT DECK (ZIP), match-cut PNG Sequence (ZIP), /your-data EXPORT ALL (ZIP). No new buttons needed.

**Audit residue fixed:**
- **§7 lazy-load:** JSZip was statically imported in watermark/resizer/carousel-slicer/match-cut → all four now `(await import("jszip")).default` inside their async handlers; page bundles no longer carry the zip lib.
- **Phase-1 brand sweep (flushed out by the audit's filename grep):** every user-visible `creatorkit-` string → `creatorskit-` — carousel-slicer ZIP, /your-data export ZIP, video-grabber fallback filename, color-gradient PNG, teleprompter ×4 take downloads, bouquet/[id] twitter `@creatorskit`, teleprompter + auto-captions project-package `generator` fields.
- **Backward compat:** `project-metadata.ts` generator type widened to accept BOTH old `creatorkit-*` and new `creatorskit-*` values — old exported packages still open; writers emit the new values. Deliberately KEPT: localStorage/IndexedDB key names (`creatorkit_*`, `creatorkit:*`, `creatorkit_captions_db`) — renaming would orphan existing user data and break the Phase-7.1 restore promise; the internal `CreatorKitProjectMetadata` type identifier; `teleprompter/page.archive.tsx` (dead, unrouted).

**QA grep:** `creatorkit-` / `CreatorKit` across src → only the back-compat parser values, the internal type name, and the archive file. **0 UI hits. ✓**

**Verification:** filtered tsc clean (all touched files) · `npm run build` exit 0, 48/48 pages · postbuild strip-ort-wasm clean.

**Phase 4/5 residue — CLOSED (same session):**
- **§6 B&W kill list, last items:** CassettePlayer subtitle chip/text → monochrome (icon zinc-400, CC-ON zinc-800/white, caption text white); sync-slate paused-run button `#fef08a` → zinc-400 + HOLD tally `#fef08a` → zinc-200 (GOOD green / NG red semantics kept; per-row toggles were already compliant). Verified already-done: globals.css has no `#fde047`, no `#eab308` chips in match-cut/text-highlighter/auto-captions, PWA theme_color `#000000` in manifest + viewport.
- **Phase-5 QA greps:** `CreatorKit`/`creatorkit-` → **0 UI hits** (internal type name + back-compat parser values + dead archive only); `ALL_TOOLS` → exactly 2 files (`tools.ts`, `SiteNav.tsx`); nav ≤1 tap = SiteNav architecture (standing); every tool ≥1 in-edge/share loop = Phase-3 spine (shipped session 4).
- **Outstanding (owner-side):** Lighthouse ≥ 90 on the three promoted orphans + Android Chrome smoke — owner's probe suite re-run in flight during this session.

**Verification:** filtered tsc clean (CassettePlayer, sync-slate). PHASES 1–7 ALL CLOSED except the owner-side Lighthouse smoke.

---

## Step 2e — Session 8 (2026-10-02): mobile QA to the edges — 320/360/768 sweep, thumbnail-lab tools menu, compressor rows

**Width sweep (extends Session 6's 390px audit; scripts live in `scratch/`):**
- New `scratch/width-sweep.mjs` — same false-positive-filtering clip audit as mobile-audit, parametric widths (default 320/360/768, single via argv[2]).
- 360px + 768px: 21/21 clean immediately. 320px had 3 real offenders, all fixed:
  1. **Homepage blog card** (`src/app/page.tsx`): `minmax(300px,1fr)` forced a 300px track into a 234px container → `minmax(min(100%,300px),1fr)` (desktop-identical); video caption bar got `flexWrap:wrap + gap` so FORMULA/formula-text stack instead of overflowing.
  2. **Business receipt preview** (`src/app/business/page.tsx` `#receipt-capture-root`): fixed 355px thermal paper in a 296px column → added `maxWidth:'100%'`. SAFE for exports: `exportDocumentAsImage` clones the node off-screen and force-sets `width: designWidth (355)` + `maxWidth:none` — capture never depended on the live width.
  3. **Color-gradient filter card**: search wrapper had inline `minWidth:260` > 240px card → class hook `.gradient-filter-search` + mobile `min-width:100%` (takes its own wrapped row).
- `/receipt` note: client-redirects to `/business?tab=receipt`; an "Execution context destroyed" during evaluate is the redirect racing the audit, NOT an overflow — probe with a settle wait measures the destination clean.

**Touch interaction polish (taste-skill `redesign-existing-projects` applied, mobile block only):** brutalist press physics on `.brutalist-button/-dark` (`:active` → translate(2px,2px) + shadow collapse), `:focus-visible` dashed rings, scroll-snap paging on `.ck-mobile-editor-toolbar`, `text-wrap:balance` on tool h1. Desktop untouched.

**Thumbnail-lab mobile (owner feedback):**
- **TOOLS dropdown restored.** `showToolsDropdown`/`toolsDropdownRef` state existed but NO UI ever opened it (dead code). New TOOLS chip in `fs-header-right` opens a fixed-position dark menu (below the 52px header, zIndex 200) with: 3-Second Glance Test (SPACE), Shuffle Feed (R), Edit Tag toggle, Import from YouTube. Panel is `position:fixed` because the header scrolls (`overflow-x:auto` would clip an absolute child); DOM stays inside `toolsDropdownRef` so the pre-existing outside-pointerdown closer just works. Hit-test verified: all 4 items are the topmost elements at their centers.
- **Bottom bar matches the dark studio.** `MobileEditorToolbar` gains `theme?: 'light'|'dark'` (default light — other 5 host pages unchanged). Dark: #09090b bar, #FFE500 top border, #18181b chips, #FFE500 active. thumbnail-lab passes `theme="dark"`. Chip press physics + focus rings (yellow in dark) added in the mobile CSS block.
- Chips verified at 390px: Grader/A-B Vars/Export taps flip the inspector aside correctly.

**Compressor file rows (owner feedback):** name+size crammed one line at ~280px row width. Class hooks `compressor-file-row/-name/-size`; mobile CSS: name `flex:1 1 100%` (owns line 1, ellipsized), size flows below with `word-break`. Verified with a simulated long-filename upload: name bottom 577 / size top 583 → stacked.

**Bottom-nav ruling (owner):** the Canva-pattern `MobileEditorToolbar` must NOT spread to `/teleprompter` and `/video-grabber` — they keep their own fullscreen navigation (mobile pill HUD / fs chrome). Confirmed: neither imports it (hosts are thumbnail-lab, text-behind, quote-card, business, bouquet only).

**Verification:** filtered tsc clean (thumbnail-lab, compressor, MobileEditorToolbar, business, color-gradient, page, globals) · width-sweep 320/360/768 → ALL CLEAN · probe-320 → 0 offenders · toolbar/menu/chip/row functional tests green · desktop 1280px regression check clean.

---

## Step 2e — Session 9 (2026-10-02, agent): transcription fallback audit — AUDIO_TRANSCRIPTION_PLAN build-order item 1 CLOSED as already shipped

User directive "next phases". TOOL_INTEGRATION_PLAN is 100% executed (Phases 1–7); the AUDIO_TRANSCRIPTION_PLAN build order defines what's next, and its item 1 ("← THE next task") is the captions UI server-fallback wiring. Full audit of the chain found it ALREADY IMPLEMENTED end-to-end — the plan's NEXT paragraph was stale:

- **Ticket mint (edge):** `supabase/functions/video-grab/index.ts` action `captions-ticket` → `handleCaptionsTicket()` — WORKER_TOKEN never enters client code; mints the worker's one-time 10-min upload grant.
- **Client pipeline:** `src/lib/captions/worker-transcribe.ts` (363 lines) — ticket → direct browser upload (16k-mono Float32 → 16-bit WAV via `encodeWav16kMono`, ~32KB/s; raw-file fallback for undecodable codecs; 99MB guard) → poll `/transcribe/job/{id}` every 2.5s (15-min deadline; 45s CONTACT_GRACE rides out free-tier container reboots that surface as CORS-less TypeErrors; 404-after-hold = job_lost) → ONE automatic re-upload on upload_lost/job_lost/lost_contact → words mapped through the SAME `groupWordsIntoSingleLineCues` as the browser engine (`TranscriptionResult` contract identical).
- **Page wiring:** auto-captions `activeEngine === 'server'` is the DEFAULT — decodes via `processAudioForWhisper` first (PCM upgrade), calls `transcribeOnWorker`, and on failure silently falls back to browser whisper (MAX_AUTO_RETRIES=2, chip visibly flips to Local, progress restarts at 0%); too_large/edge_offline never fall back (pointless). LOCAL engine keeps browser-first with server rescue. `warmCaptionsWorker()` on mount eats the ~50s Render cold start during file-pick.
- **Note:** `prefersServerTranscription()` is exported but currently unused — the page went server-first for everyone (stronger than the plan's mobile-only split). Kept for a future per-device split.

**Action:** docs-only change (this record + AUDIO_TRANSCRIPTION_PLAN NEXT→DONE). No code touched → no build required (last build green 48/48 included all these files). **Build-order pointer now: item 2 — caption preset expansion.**

**Item 2 SHIPPED (same session): caption preset expansion.**
- `overlay-renderer.ts`: new `ActiveWordEffect` (`'fill' | 'marker' | 'box' | 'underline' | 'glow'`) + `glowColor` + `tapeBackdrop` on `OverlayTypographyOptions`/`CaptionStylePresetConfig`; kinetic-pop now draws a marker swipe-in bar, dashed hand-box, growing swipe underline, dual-pass neon glow halo, and a tilted masking-tape backdrop band. All deterministic canvas draws — exports stay frame-exact.
- `CAPTION_STYLE_PRESETS` 6 → 14 (Marker Swipe, Neon Sign, Coach Box, Swipe Underline, Tape Label, Karaoke Pop, Clean Studio, Ember Glow) — includes the FIRST teleprompter-mode and minimal-mode presets (the original six were all kinetic-pop).
- auto-captions page + OverlayStudio: state, preset application, preview + export typography literals, "Active word" chip row, "Tape backdrop" toggle — fully mirrored in both surfaces.
- Cross-tool cohesion per the plan's "applies to match-cut + text-highlighter too": the new effects reuse THOSE tools' marker/box/underline/tape vocabulary rather than inventing a new one (their own preset sets were already rich — left untouched).

**Owner mid-session feedback (sync-slate mobile):** calibration section header collapsed to ONE line on ≤768px (`.slate-cal-sub` hides the DAVINCI/PREMIERE footnote), strip confirmed at two rows of 5 (pre-existing rule), and the STRIKE CLAPPER (SPACEBAR) row is now mobile-hidden (`.slate-strike-actions { display:none }`) — the tappable clapper head is the mobile strike; SPACEBAR / 3-2-1 head leader stay desktop affordances.

**Verification:** filtered tsc clean (overlay-renderer, auto-captions, OverlayStudio, sync-slate) · `npm run build` GREEN 48/48 (one EBUSY standalone-copy retry — stale `.next\standalone` lock cleared by removing the dir; compile + static generation were clean both times).

**Plan true-up (same session, user steered the frame: "we are doing tool integration… making the tools look nice and be much more responsive"):** TOOL_INTEGRATION_PLAN §8 Phase 1 checklist was stale-unchecked — all six items verified shipped and ticked with evidence: naming sweep = Session 7 grep (0 UI hits); tools.ts schema + SiteNav = Phase 1 architecture, `ALL_TOOLS` grep still exactly 2 files; ClientLayout/StudioToolsDropdown item closed by the Session-8 owner ruling (fullscreen tools — teleprompter, video-grabber, business — deliberately keep their own chrome; `page.archive.tsx` is dead and unrouted); manifest/metadata cleanup + theme_color #000 done with §6; `/admin` noindex verified present in `src/app/admin/layout.tsx` (`robots: { index: false, follow: false }`) — sitemap archived-filter moot since zero `archived` tools exist in tools.ts. Phase 1 header marked ✅ DONE.

**Frame status after true-up: every phase of TOOL_INTEGRATION_PLAN (1–7) is CLOSED.** The single remaining open line in the whole plan is §8 Phase 5's Lighthouse ≥ 90 + Android Chrome smoke — owner-side. Look-nice/responsiveness work continues live via owner probe feedback (this session's sync-slate pass is the pattern).


## Step 2f — Session 9b (2026-10-02, agent): external-link standardization + mobile ad gate, sync-slate persistence/z-fix, LCP WebP, nav + save-image polish

1. EXTERNAL LINKS + MOBILE AD FLOW (owner ask: standardize; on mobile show a full-screen ad, close it -> proceed, then a bottom slide-up banner):
- SiteNavList isExt branch rewritten for all four variants — rail = 36x36 icon-only with absolute EXT-arrow badge (fits the 52px rail), drawer/compact/roomy = internal-matching rows + ArrowUpRight / EXTERNAL chip. Links keep href=/redirect?url=... bridge so DESKTOP flow is unchanged.
- NEW src/components/ExternalAdGate.tsx: module bus (externalLinkClick intercepts only <=768px via matchMedia) + ExternalAdGateHost mounted once in ClientLayout. Mobile interstitial = brutalist SPONSORED card, 3s countdown before CONTINUE (opens the real site; window.open called directly in the click handler = popup-blocker-safe), then a once-per-session bottom slide-up banner promoting in-house tools (lifts above MobileEditorToolbar via body:has(.ck-mobile-editor-toolbar) rule).
2. TOOLAYOUT DRAWER Z-FIX: mobile drawer overlay/drawer z 45/46 -> 240/241 — the sync-slate camera rig (z60) no longer paints over the nav drawer (3-point hit-test verified through the rig).
3. SYNC-SLATE PERSISTENCE (owner ask: save to IndexedDB, RESET button to clear): saveState/loadState/clearTool via local-memory; hydrate-on-mount gate + debounced 600ms autosave of the full slate (production/scene/take/roll/camera/personal timecode/takes log/theme); take-log header shows "N Takes - Autosaved" + RESET (confirm -> clearTool -> defaults; survives reload). B-suite: type marker -> strike -> reload = marker back; RESET -> reload = wiped.
4. LCP IMAGE (owner ask: compress demo-cruise-poster, use WebP): all 4 text-behind demo posters re-encoded via headless Edge canvas (webp q0.85 maxW800) 4139KB -> 232KB (-94%); page refs swapped to .webp + loading=eager on the cruise poster; OG/twitter stay .jpg for crawler compat.
5. NAV + SAVE POLISH (owner feedback, same session):
- Floating SiteNav dropdown on <=768px is now a CENTERED FIXED SHEET (.sitenav-drop, top 58px, width min(420px, 100vw-24px)) — previously pill-anchored absolute 320px panel hugged/overflowed the right edge (bouquet at 360px: left 39 + 328 = 367 > 360). Verified centered 12px/12px at 390 AND 360 on text-behind/thumbnail-lab/quote-card/bouquet; desktop 1440px regression = still pill-anchored absolute.
- Castos Podcast Quote Cards EXTERNAL entry removed from tools.ts (superseded by in-house /quote-card) — gone from tools menus AND home curated directory (rendered-HTML grep 0 hits).
- Home section titles (.home-sec-title) on <=768px: nowrap + font-size min(1.4rem, 4.8vw) + square-dot flexShrink 0 — CREATORSKIT IN-HOUSE TOOLS / RECOMMENDED EXTERNAL TOOLS stay single-line with the dot perfectly centered (centerDelta 0) at 360 and 320.
- Receipt viewer footer (/r/[id]): flexWrap wrap + center — "MADE WITH [CREATORSKIT] — FREE CREATOR TOOLS" no longer wraps ragged on phones; desktop unchanged (fits one line).
- SAVE PICTURE = DOWNLOAD, NEVER SHARE (owner ruling): exportDocumentAsImage Web Share branch deleted — mobile now gets the same direct PNG download as desktop (lands in Downloads/gallery). Covers receipts, invoices, contracts, letterheads (client-document-printer + business suite); bouquet already used direct anchor downloads.

VERIFICATION: filtered tsc clean (only the 4 pre-existing archive/remotion errors elsewhere); scratch/verify-session9.mjs 24/24 PASS (drawer z + hit-test, persistence reload/wipe, mobile gate flow incl. skip->proceed + banner-once, desktop rail ext icon-only + bridge, cal-strip/strike rows); probe-sitenav mobile+desktop clean; home-header single-line probe clean; background width sweep 0 offenders.


## Step 2g — Session 10 (2026-10-03, agent): DEMYSTIFY shipped — the suite's front door (BYOK AI planner → step chips → tool hand-offs)

Origin: the owner's pre-CreatorsKit "Demystifying You" idea, ruled in as a CreatorsKit TOOL (not standalone, not a feature). One plan per idea; the moat is plan→execute in the same tab. Full architecture + all ten owner rulings live in **docs/DEMYSTIFY_TOOL_PLAN.md** (authoritative). Highlights of the final live-tested state:

1. BYOK PLANNER: `/demystify` page + `/api/demystify` proxy (keys per-request only; groq/openai keyring SHARED with auto-captions via whisper-cloud; gemini own slot). Raw-JSON plan schema (5–9 steps, first steps must SHRINK a big/procrastinated task), 18-slug allowlist validated client-side (`demystifyToolLink` vs NATIVE_TOOLS — hallucinated links never render); match-cut/text-highlighter chips stash via putHandoffText, rest open plain.
2. FRIENDLY ERRORS (owner ruling, live-confirmed on a real Gemini 503): `friendlyProviderError()` in the route translates every provider failure — retired-model 404 names the provider's suggested replacement + FETCH MODELS path, 503/429/401-403/network each get one actionable sentence; raw JSON only ever hits server console.
3. MODEL AUTOPILOT (owner rulings "never hard-code", "auto going through models till it makes a proper response"): RECOMMENDED_MODELS + live `listDemystifyModels` fetch that AUTO-RUNS on landing/provider-switch/key-save; generate auto-cycles pick → modelList → recommended (≤4 tries, non-model errors break the loop) and reports the switch in a green note. Defaults on gemini-3.8-flash (2.5-flash AND 2.5-pro both retired for new users, observed live; /api/transcribe bumped too).
4. THINKING-ORB JOURNEY (owner ruling): staged busy card — working→searching→solving→connecting→composing with narrated captions + progress pips; button orb mirrors the stage; empty state breathes.
5. MIND MAPS ARE OURS — INFINITE DRILL-DOWN (owner reversal after live review: "do you know what a mind map looks like… it's just boring"): mermaid + radial pinwheel both rejected. We template the tree from the plan text ourselves (lesser models can't draw maps): root LEFT → steps → sentence points + TOOLS nodes cascading RIGHT, children fanning up/down around the parent's midline; square brutalist boxes, CLICK to open sub-sections, scrollable dot-grid canvas, per-branch accent colors, 4px hard shadows, numbered chips turn ✓ when ticked, pop-in animation (ck-mm-node). Mermaid machinery removed from the page (dep stays installed).
6. MEMORY: provider/idea/plan/checked/planMeta/modelPick persisted via local-memory and restored on return.
7. SEO INTENT: layout title/desc/keywords now target "how to stop procrastinating", "make a big task look small", "how to start when you dont feel like it", notebooklm-alternative mind maps; tools.ts hint/desc carry the same intent; sitemap `/demystify` 0.8 weekly (landed by the parallel session, verified).
8. MOBILE: inner column on the shared `tool-inner-container` gutter system (same one-class fix as compressor this session); bottom leaderboard AdBanner.

NOTE: a parallel editor (Antigravity tab) co-wrote the base files mid-session — final state merges both (their lib/route/page architecture + the deltas above). Two apply_diff rounds reconciled after line-drift.

VERIFICATION: filtered tsc clean on demystify/tools surfaces (stale .next/dev LayoutRoutes artifact clears at build); `npm run build` GREEN 50/50 routes incl. /demystify + /api/demystify; mermaid + thinking-orbs bundle clean.

---

## Step 2h — Session 11 (2026-10-03, agent): DEMYSTIFY v2 PLAN WRITTEN — Cloudflare Workers AI unlock + "more than ChatGPT" spec

**Owner direction:** free AI via our Cloudflare Workers AI key at ~5 prompts/day (BYOK today = locked front door), and the tool must do MORE than ChatGPT, integrated per `docs/BUSINESS_MODEL_PLAN.md`.

**Docs-only session — no code touched, no build required** (last build green 50/50 covers the live v1). `docs/DEMYSTIFY_TOOL_PLAN.md` fully rewritten as the v2 spec (authoritative):

1. **Zero-setup AI:** new default provider `cloudflare` — Workers AI REST run endpoint, our key, fail-closed env guards (`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` / `DEMYSTIFY_QUOTA_SECRET`), `runtime='edge'` for Pages parity. Models: llama-3.3-70b-fp8-fast default → 8b-fast fallback (cost ladder), list via `/ai/models/search` (ruling #3 preserved).
2. **Quota = 5 AI actions/day**, stateless: HMAC-signed envelope `{deviceId, day, n, max}` verified + re-issued server-side (Web Crypto), zero DB/KV, day-rollover reset, client can't forge. BYOK relabeled UNLIMITED MODE (unmetered). Rewarded-ad +1 and Pro raises spec'd but Stage-2/3 BLOCKED per business plan §8/§9.
3. **More than ChatGPT stack:** one-shot TRANSFORMS (DEEPEN step → sub-plan grafts into the mind map · REGROUP re-plans unchecked steps · RESCOPE constraint chips) — ruling #2 "no chat" preserved; SEED PLAN LIBRARY (`src/data/demystify-seeds.ts`, ~10 deterministic instant plans, PERSONALIZE WITH AI, SEO intents, $0 neurons); artifacts (PRINT CHECKLIST via client-document-printer, TELEPROMPTER "rehearse this plan", QUOTE-CARD "poster this step" hand-offs); MY PLANS multi-plan vault (local-memory → /your-data).
4. **Cost guardrails (failure-mode #4):** max_tokens 1600, 1 free retry, 5/day/device cap, neuron-burn ladder (70b → 8b → paid → tighten), KPIs + kill-criteria incl. hand-off click-through ≥ 25% (the moat metric) and quota-wall ≤ 30%.
5. Build order T1–T8 in plan §5 (T1–T3 = the unlock; T4–T5 = the "more"; T6–T8 = surface + SEO + this log). Open questions for owner in plan §11 (seed list, free count confirm, benchmarks counter defers to the Data Decision).

**RULING UPDATE (same day, later — owner): DEMYSTIFY v2 FROZEN as spec — no tickets start.** The owner's own doubt, upheld against the owner's own framework: zero users, "not more useful than ChatGPT right now" (agents do the work), "using AI to build AI" = the Space-Planner clause firing. v1 stays live as-is (BYOK, $0 running cost, SEO surface). Recorded in the plan header for the unfreeze: (a) ~50MB HF local models can't follow the plan schema — first viable local tier ≈500MB–1GB via WebLLM/WebGPU, desktop-only, still worse than the CF 70B default → LOCAL MODE is an opt-in tier at best, never the engine; (b) POS-for-Ghanaian-shops pivot idea autopsied and NOT pursued (free incumbent Loyverse, zero demand evidence, feeds no Passport/Benchmarks/SEO flywheel) — if ever revisited, 10 shop-owner conversations precede any code. Reactivation = §8 pull signals on live v1, or owner call to ship the seed library standalone.

**NEXT SESSION: Stage-0 launch checklist** (`docs/BUSINESS_MODEL_PLAN.md` §8): invoice share-link demo video (the "wow" flow — demo it, don't describe it), WhatsApp creator groups + X Ghana/Nigeria circles, Product Hunt / Show HN / r/SideProject / r/SmallBusiness, 15-second tool screen-clips. Show, don't build.

**ADDENDUM (same day, later — owner market research + final ruling):** owner searched the free-POS market and found saturation, not a gap — Loyverse (350k+ merchants, free, offline, add-ons paid), Zobaze (free tier incl. inventory, WhatsApp receipts, Khata credit-book — already localized for our market), Square/Elementary/PosVox/Labtech. Confirms the POS autopsy; the "pricing pages everywhere" observation = the freemium shape of our own BUSINESS_MODEL_PLAN (free core, paid scale). Owner then floated an **"inventory tracking system" reframe** ("more of what I want us to do anyways"). Analysis: as a company/product it is the same red ocean (free incumbents include inventory); as a **CreatorsKit TOOL** — a local-first "stock book" (products, stock in/out, low-stock list, WhatsApp export, chains into the existing Business Suite receipt flow) — it passes the single-player + SEO-surface tests but had zero demand evidence.

**OWNER RULING (2026-10-03): DROP.** The POS autopsy stands — inventory/stock-book included. No validation track, no MVP, no interview script; the idea space is closed until the §8 Stage gates say otherwise. **All energy → the Stage-0 launch checklist (the NEXT SESSION directive above is the single open thread).**

---

## Step 2i — Session 12 (2026-10-03, agent): TRUST SURFACE SHIPPED — /privacy, /terms, /about + homepage footer + /your-data discoverability

Owner asks: (1) "there's nothing on the home page where I can physically navigate to" /your-data; (2) "we need privacy policy + terms of service pages with real documentable information — like a real real real page"; Roommate Link (`~/Desktop/Roomate_link/src/pages/{Privacy,Terms}Page.tsx`) as the template. Mid-session rulings: support email = **creatorskit26@gmail.com**; "longer, more detailed, cover more"; "there is no about page" → /about shipped too.

1. **NEW `src/components/LegalPage.tsx`** — shared brutalist renderer (badge row + LAST UPDATED, h1, "THE SHORT VERSION" card, numbered sections with label/text items, 2px rules, footer cross-links: sibling legal page + /your-data + ALL TOOLS). Server component, zero client JS; monochrome house style (matches /your-data).
2. **`/privacy` (16 sections)** — every claim documented from the codebase: who we are; what we NEVER collect (accounts/files/tracking/selling); what stays on-device (IndexedDB `ck_local_memory`, `ck_*` localStorage, BYOK keys, PWA cache); what plain page-loads send (hosting/CDN/Google Fonts); optional cloud features itemized honestly (BYOK proxy mechanics — key per-request only, never stored/logged; cloud transcription discard; video grabber; bg-remove model download; YouTube oEmbed; bouquet gifting); share links BOTH modes (payload-encoded URL never touches server vs /r/<id> stored in Supabase + email-to-remove); analytics ("count pages, never people"); cookies/DNT; advertising (networks' own cookies, mobile sponsored screens, rewarded-ads future disclosure); third parties w/ what-each-gets; security (nothing-to-breach architecture); children 13+; rights self-serve at /your-data + DPC complaints; retention; international transfers + Ghana Act 843; changes/contact.
3. **`/terms` (14 sections)** — acceptance/eligibility; service described (tool list, local-first, availability as-is); no-accounts implications (back up via /your-data, device limits); full content ownership (no license claimed — share-link hosting the sole exception; no watermarks); business documents = templates-not-advice (accuracy, signatures, MoMo details caution, currency checks); share links (forwarding caveat, encoded links unrevokable, stored removable, lawful-only); BYOK AI (your key/cost/provider terms, output imperfection, no training); acceptable use (no harm to people/service, rights-respecting uploads, enforcement); fees (zero today, explicit-checkout promise, ads why); IP; disclaimers; liability cap ($0 while free) + indemnity; termination; Ghana law + general clauses.
4. **`/about` (5 sections)** — why CreatorsKit exists (real-need origin, Ghana conditions → DATA SAVER positioning, solo/no-investors); the five promises (on-device first, no accounts, files stay yours, clean exports, free core); what's inside grouped by job (get paid / make the video / ship it everywhere / plan it / give something); pointers to privacy+terms+AI note; contact.
5. **Discoverability wiring:** homepage gained a SITE FOOTER (ABOUT · YOUR DATA · PRIVACY POLICY · TERMS OF SERVICE, monospace underline links, mobile-wrap) — first physical nav path to /your-data; /your-data privacy banner now links "FULL PRIVACY POLICY →"; sitemap +/about (0.5) +/privacy (0.4) +/terms (0.3).

**Verification:** filtered `npx tsc --noEmit` — zero errors on all touched files (only the 4 pre-existing archive/remotion noise). `npm run build` — first run hit the KNOWN EBUSY standalone-copy after 52/52 pages generated (non-code; stale `.next\standalone` cleared); immediate re-run **exit 0, 53/53 routes** incl. /about /privacy /terms (all static) + postbuild ORT strip clean.

**Pre-launch gap audit (owner Q: "anything else worth building?") — answer: nothing to BUILD, two cheap audits remain:** (a) verify the "Made with CreatorsKit" footer renders on ALL shared document kinds (invoice/receipt/agreement/letterhead/bouquet) — it's the Stage-0 launch wedge; (b) check WhatsApp/X share-preview cards (OG images) for the invoice demo + homepage — the launch channels sell the click. Everything else on the Stage-0 checklist is content/distribution (demo video, posts), not code.

---

## Step 2j — Session 13 (2026-10-03, agent): LANDING ⇄ APP-HOME SPLIT — /app launcher + PWA start_url + gooey mobile bottom bar

**Owner direction (voice, live-session rulings stacked):** current `/` stays the marketing landing; NEW app home = "you come, you click, you use your tool"; the installed PWA should land there; make navigating between the two dead-simple for first-timers. Then mid-session: mobile bottom button nav (Campus-guide TabBar behavior), last-3 recents with icons, long-press-to-pin, haptics on mobile taps, NO sparkles anywhere; bar = exactly 4 items (3 tool slots + PLUS on the right opening a pop-up attach drawer); gooey spring physics via `liquid-gooey` (Libraries.dev); bar FULL-BLEED flush to both screen edges + slimmer height (floating-island look struck); empty-slot state struck ("looks very bad") → redesigned.

1. **NEW `/app`** (`src/app/app/page.tsx` + `layout.tsx`) — the launcher: own sticky header (logo + APP HOME chip + BACK TO SITE), "What are you making?" hero, instant search ("/" focuses, Enter opens first match, ESC clears, empty-state suggestion chips), **JUMP BACK IN** (last 3 tools actually used), grouped grid (Business & Money / Studio / Motion / Utility & Data Savers — derived from tools.ts, zero hardcoded routes), Around the Web (curated externals), slim footer (YOUR DATA · PRIVACY · TERMS + install tip). Registered in `HIDDEN_TOOLS` with `chrome: 'fullscreen'` → ClientLayout renders it bare (no marketing Navbar); hidden from nav grids because it IS the nav. `layout.tsx` = `toolMetadata` **noindex** — search signals consolidate on `/`; sitemap documents the deliberate exclusion.
2. **PWA lands on the app home:** `manifest.ts` `start_url: '/app'` — installed apps open straight into the launcher. (PwaInstallPrompt self-hides in standalone mode; no collision with the bar.)
3. **Cross-nav on every surface:** landing hero gained a black/yellow **OPEN THE APP** button; Navbar desktop CTA (was "All Tools" → /#tools) is now the yellow **Open the App** → /app; Navbar mobile menu leads with a black Open the App block; /app header + drawer link BACK TO SITE.
4. **Quick-tool engine** (`src/lib/app-home.ts`, 100% local under `ck_app_recent_v1` / `ck_app_pins_v1` → visible in /your-data): `recordVisitForPath` wired into ClientLayout (records every tool route visited from ANY entry surface), pins cap at `QUICK_SLOTS = 3`, `pinToolEvicting` = drawer-add when full (newest in, oldest out, no dead-end).
5. **Mobile bottom bar** — mobile-only (`.app-bottomnav` media rule, same convention as the navbars) and rendered ONLY on /app, so it vanishes the moment you enter any tool. Owner-struck looks recorded: floating centered island ✗, tall bar ✗, gooey empty blobs ✗. Final: **full-bleed system bar** (flush to both screen edges, slim 40px nodes, flat 2px top rule). Filled quick-tool slots = black **liquid-gooey** nodes (`Liquid.Item`, blur 5 / contrast 16 / fill #000, press-in y+3 scale .92 + drawer-open lift −14 staggered, `transition="bouncy"` spring); springy yellow **PLUS** (rotates to × while open) opens the attach drawer; empty slots = crisp dashed sockets with a gray + (tap = drawer). **Attach drawer** = springy bottom sheet (`.app-drawer` overshoot keyframes in globals.css): CUSTOMIZE YOUR BAR n/3, every tool row with IN BAR / + ADD chips (tap toggles; full → evict oldest + toast), footer YOUR DATA · BACK TO SITE · DONE.
6. **Long-press-to-pin everywhere:** hold ~480 ms any tool card (cancels on scroll/drag, suppresses the follow-up click) or any filled bar slot → pin/unpin, PINNED chip on the card, teaching toast. **Haptics** (`src/lib/haptics.ts`: hapticTap/hapticOpen/hapticPin — Android vibration, harmless no-op on iOS) wired on every /app tap surface + Navbar + landing OPEN THE APP. Zero sparkles in the UI, per ruling.

**Verification:** filtered `npx tsc --noEmit` — source clean (only the stale `.next/dev` LayoutRoutes artifact, cleared before build; known archive/remotion noise filtered). `npm run build` **exit 0, 54/54 routes** incl. `/app ○ (Static)`; postbuild ORT strip clean; no EBUSY this run.

**Still open (unchanged):** the Stage-0 launch checklist remains THE next-session directive. Pre-launch audits unchanged: (a) "Made with CreatorsKit" footer on all shared document kinds, (b) OG share previews for WhatsApp/X.

---

## Step 2l — Session 15 (2026-10-04, agent): FILM MODE SHIPPED — SOLO video takes + CREW second-screen mirror in the teleprompter

**Owner rulings that shaped it (voice, live):** (1) the parked background recorder "wasn't good enough" — browser recording felt like "absolute ****"; (2) the mobile layout is zero-sum ("see yourself more, see the text less — defeats the point of the teleprompter"); (3) iPhone-market reality: Ghana creators are iPhone-majority, mostly iPhone 11s — no split-screen, no overlay, so script+native-camera on one iPhone is impossible; (4) green light: "try your implementation, do it very well… or I'll remove everything"; (5) mid-build: video takes must AUTO-SAVE exactly like audio takes, and "the integration must be so tight" or it's not worth doing.

1. **SOLO MODE — real video takes** (`src/app/teleprompter/page.tsx`): when the camera is live, REC now merges the camera video track + fresh mic track into one MediaStream and records via MediaRecorder with **explicit `videoBitsPerSecond: 8 Mbps` / `audioBitsPerSecond: 128 kbps`** (the fix for the mushy ~1-2 Mbps browser default that got the old attempt parked) and a video mime probe ordered H.264/AAC mp4 → VP9 → VP8 webm (iOS Safari gets mp4). Camera off = the classic voice-only take, untouched. The camera preview's tracks are never stopped by the recorder (all three cleanup sites guard `cameraStream` tracks) — preview survives the take.
2. **Identical auto-save semantics (owner ruling #5):** video takes ride the SAME onstop pipeline as audio — AUTO-DOWNLOAD the instant recording stops (`creatorskit-take-*.mp4|.webm`, ext from blob type) + `saveHandoffSession` pre-save to IndexedDB so the 1-Click Captions handoff (script + media + wpm) works even if the tab closes; `handleOneClickCaptions` fileName ext now derives from `recordedBlob.type`. Take prompt, studio panel, and mobile dock all render a **video preview player** for video takes (never a dead audio player) with correct download extensions.
3. **Camera-aware REC labeling:** all three REC controls (HUD quick button, settings button, mobile dock) show a Camera icon + "REC VIDEO"/"REC VID" when the camera is live, Mic + "RECORD MIC"/"REC" otherwise; tooltips updated. During a video take a fixed **"▲ LOOK AT THE LENS"** yellow eyeline chip pins at the top of the screen (safe-area aware, pointer-events none).
4. **CREW MODE — second-screen script mirror** (the only script+native-camera flow that works on iPhone): new monitor-icon button in the HUD opens the CREW modal — builds a payload-encoded link (`lz-string` compressToEncodedURIComponent of {script, speed, fontSize}; nothing touches a server) to **`/teleprompter/mirror`** (NEW page + noindex layout): dark full-screen auto-scroller with yellow read-line at 30%, tap-anywhere pause/resume, speed −/+/restart HUD, dt-based rAF crawl (px/s = speed×38), empty state explaining how to generate a fresh link. Flow: send the link to a laptop/second phone (WhatsApp/AirDrop), press play, put the iPhone on the tripod, film at native quality. `/teleprompter/mirror` inherits fullscreen chrome via the `/teleprompter` prefix match; noindex → sitemap untouched.

**Rationale recorded (owner's own analysis, upheld):** browser recording never beats the iPhone camera — so SOLO is honestly labeled draft-tier browser quality, and CREW removes the quality fight entirely by letting the native camera record while CreatorsKit owns the script.

**Verification:** filtered `npx tsc --noEmit` — only the4 known pre-existing errors (stale `.next/dev` validator lines cleared pre-build). `npm run build` **exit 0, 54/54 pages** incl. new `/teleprompter/mirror ○ (Static)`; postbuild ORT strip clean; no EBUSY.

**Still open (unchanged):** the Stage-0 launch checklist remains THE next-session directive. Pre-launch audits unchanged: (a) "Made with CreatorsKit" footer on all shared document kinds, (b) OG share previews for WhatsApp/X.

### Step 2l (continued) — DISCOVERABILITY FIX + three live rulings (owner tested the build)

**Owner report (voice):** "Turbopack's filesystem cache has been deleted… And I cannot see any difference at all — how would I initiate the [mode], and is it on mobile? It was a small bar where this would be most useful — but is it on mobile?" then (laptop): "I press the button and it doesn't do anything."

**Root cause (hard fact, not cache):** `startCamera()`/`stopCamera()` had **zero call sites** — no button anywhere turned the camera on — and the live-preview `<video>` elements didn't exist in the JSX at all (refs were only ever assigned by the srcObject effect). FILM MODE was uninitiatable: REC always fell through to audio-only, so nothing visibly changed on any device. Fixes in `src/app/teleprompter/page.tsx`:

1. **Live camera preview layers on the stage:** corner-PiP (`zIndex 30`, safe-area-aware top, `clamp(96px,24vw,190px)`, 3:4, brutalist border) and full-bleed background (`zIndex 1`, behind the text column) — both `muted playsInline pointerEvents:none`, driven by the existing cameraStream effect. Mobile defaults full-bg (unchanged), toggle switches PIP ↔ FULL BG.
2. **CAM toggle — one obvious tap, everywhere:** `toggleFilmCamera()` (no-ops while a take records) wired to (a) the **mobile floating pill** — round Video/VideoOff button, yellow when live, sits between CREW and the speed chip; (b) the **desktop transport dock** — labeled `CAM`/`CAM ON` pill before REC plus a round **CREW MonitorSmartphone button** (CREW was mobile-pill-only before); (c) the mobile Studio Controls sheet.
3. **Mobile bottom sheet "FILM MODE — Camera + Second Screen" section (first thing in the sheet):** CAMERA + SECOND SCREEN action grid, PIP/FULL BG layout toggle, EYELINE ON/OFF toggle, camera-device `<select>` when >1 camera (switching is suppressed mid-take), one-line explainer ("REC now films VIDEO + your mic and auto-saves exactly like an audio take"), sheet tints yellow while the camera is live. `startCamera` failures now `alert()` like the mic path instead of console-only.

**Rulings folded in mid-verification (owner, live voice):**

- **Camera lifecycle = mic lifecycle:** "the way immediately when you exit the application the mic stops interfering with everything on your phone — the camera should also do the same thing." → new `killCameraNow()` (stops tracks + clears `cameraActive`/`cameraStream` so no zombie state) fires on `visibilitychange→hidden`, `pagehide`/`beforeunload`, AND the unmount cleanup (which previously never stopped `cameraStream` — the lens could stay on after leaving the page).
- **EYELINE is a setting:** "do you want your eyeline to show or not — a setting, eyeline yes, eyeline no" + "there should be a line to show where your eye should be looking." → EYELINE ON/OFF buttons in the mobile FILM MODE section and the desktop LAYOUT tab (above the height scrubber); the mobile resize handler now only defaults it OFF on FIRST mobile init (`hasInitializedDefaultsRef` guard) — the user's choice and saved setting win thereafter; and **turning the camera ON auto-raises the eyeline** so a look-line always appears the moment filming starts.
- **AI voice listening is sacred:** "make sure the video rendering in no way possible ever stops Teleprompter from doing its job of the AI voice listening." → `startCamera` getUserMedia is now `audio: false` (never open a second mic to compete with Web Speech recognition and the dedicated recording mic — video takes merge the mic stream separately; previews are muted elements, decode is off-main-thread).

**Verification:** filtered `npx tsc --noEmit` — only the 4 known pre-existing errors, zero new. `npm run build` **exit 0, 54/54 pages** (`/teleprompter` + `/teleprompter/mirror` both Static), ORT strip clean, no EBUSY. Owner was ALSO looking at a stale dev preview (Turbopack cache had been wiped after an internal error) — advised a hard reload / dev-server restart alongside this fix. **Commit + push still pending for Cloudflare** (carries the Session 14 edge-runtime fix and all of FILM MODE).

**Post-test additions (owner, live voice):**

- **Corrupted Turbopack dev cache crashed the dev server** (turbo-tasks panic: LevelDB `00000010.meta` referenced a missing `00000003.sst`). Wiped `.next\dev`, cleared the orphaned process holding port 3000, restarted dev clean. Root cause of BOTH the earlier "cache has been deleted" warning and the owner's "I cannot see any difference at all".
- **Camera FLIP setting (front ⇄ back):** `startCamera(deviceId?, facing?)` now accepts `facingMode` (`ideal`, so single-webcam laptops fall back gracefully); new `flipCamera()` (no-op mid-take) surfaced as (a) a one-tap ⟲ button ON the corner PiP itself — native camera-app feel — and (b) a full-width `⟲ FLIP CAMERA` row in the FILM MODE sheet. Front-lens previews are **mirrored like a native selfie view** (`scaleX(-1)` when facing 'user', preview-only — the recorded file stays true), on both PiP and full-bleed layouts.
- **Mic-fight ruling (owner: "two things fighting… who would win?"):** answer — on iPhone it's a coin flip (speech recognition + simultaneous capture is unreliable on iOS, and the owner confirmed voice sync "wasn't working on mobile"), so FILM MODE removes the gamble entirely: turning the camera ON force-switches to **TIMED SCROLL** (`setSpeechFollowEnabled(false)`) and the recognition-start effect is hard-guarded with `!cameraActive` — the video take OWNS the mic, no co-tenant, ever. The sheet explainer states this in plain words ("Scroll runs TIMED while filming: the take owns the mic, so AI voice sync is off").

**Re-verification:** filtered `tsc` — 4 known only; `npm run build` **exit 0, 54/54**. Dev server serving the updated page live.

---

## Step 2k — Session 14 (2026-10-03, later, agent): HAND-OFF WIRING COMPLETED — every declared §4 edge now carries the work (Ship-It Pack STRUCK)

**Owner ruling (voice):** the pre-launch recommendation had led with a "Ship-It Pack" orchestrator tool + hand-off wiring as complement. Owner struck the new tool: *"Ignore Ship-It and make the workflow between moving the thing you're doing from here to here… so good that we don't need a separate directory or tool to do all of it — the shepherds live inside these individual tools. Better than a whole new [tool], and it even helps the SEO of our tools."* → Build = last-mile hand-off wiring only; no new route; SEO consolidates on existing tool pages.

**Audit first (the wiring was already ~80% live):** receivers were wired on all 11 target tools (`takeHandoffImage/Text` consume-once on mount); most exporters already carried payloads via `NextStepRow.onBeforeNavigate` (auto-captions, match-cut, watermark, carousel-slicer, text-behind, quote-card, color-gradient, palette-extractor, teleprompter→captions script). The REAL gaps — edges declared in tools.ts but dead, or broken flow:

1. **text-highlighter → /resizer** (`src/app/text-highlighter/page.tsx`): the NextStepRow rendered but carried NOTHING. Now `lastExportBlob` state captures the exported MP4/WebM in `handleExportVideo` and `onBeforeNavigate` puts it → resizer opens with the rendered video pre-loaded (format for platform cropping).
2. **resizer → /compressor** (`src/app/resizer/page.tsx`): same — row rendered, nothing carried. Now `lastImageBlob` captured in `downloadSingle`'s `canvas.toBlob` and carried to the compressor (image-only: the compressor receiver's `image/` type check would silently drop videos, so video outputs navigate as a plain link — noted in-code). Row visibility for images extended past the 1.6s "Saved!" flash (`downloaded || lastImageBlob`).
3. **sync-slate → /teleprompter** (`src/app/sync-slate/page.tsx`): declared edge had NO code at all. New NextStepRow "WRAPPED — REHEARSE THE SCRIPT" under the Director Take Log: builds a shot rundown (`production — SHOT RUNDOWN` + `SCENE x · TAKE n · STATUS` + notes per take) as a text hand-off; **teleprompter** (`src/app/teleprompter/page.tsx`) now consumes it — `takeHandoffText('teleprompter')` after the localStorage restore, hand-off wins over the saved script (most recent intent). Row's download slot reuses the existing EDL export.
4. **background-replace 3× `window.open(_blank)` → `window.location.assign`** (`src/app/background-replace/page.tsx`): the blobs were already put, but a new tab breaks out of the installed PWA (standalone mode) and abandons the session — the anti-pattern the ruling targets. All three sends (text-behind / thumbnail-lab / watermark) now navigate same-tab, matching the NextStepRow convention everywhere else.

Net effect: **every `handoffs` edge declared in tools.ts now actually moves the work** — the "one tool flows into the next" §4 contract is fully honored, no orchestrator page needed, and the NextStepRow chips remain crawlable internal links between tool pages (the SEO point of the ruling).

**Cloudflare Pages deploy blocker FIXED (owner pasted the failed deploy log):** next-on-pages rejected the build — `/api/demystify` was the ONE dynamic route missing `export const runtime = 'edge'` (every other /api route carries it; see /api/youtube-oembed line4). Added to `src/app/api/demystify/route.ts` with a comment naming the convention. The route is a pure fetch-proxy (BYOK) — fully edge-compatible. Non-fatal noise in the same log (not blockers): `Invalid prerender config for /blog/[slug]` adapter warnings and Next16's "Edge Runtime is deprecated" advisories. NOTE: Cloudflare builds from the GitHub repo — **commit + push required** for the redeploy to pick this up. Local rebuild after the fix: exit 0, full route table intact (53/53 pages — one generated page fewer than the pre-fix run because the route now builds edge-only; route serves as `ƒ /api/demystify` exactly as in Cloudflare's own route table).

**Verification:** filtered `npx tsc --noEmit` — only the 4 known pre-existing errors (page.archive characterWidth, MatchCutExportButton ×2, MatchCutComposition remotion), zero new. `npm run build` — first run hit the KNOWN EBUSY standalone-copy flake AFTER 54/54 pages generated (non-code); immediate re-run **exit 0, 54/54 routes**, postbuild ORT strip clean.

**Still open (unchanged):** the Stage-0 launch checklist remains THE next-session directive. Pre-launch audits unchanged: (a) "Made with CreatorsKit" footer on all shared document kinds, (b) OG share previews for WhatsApp/X.
