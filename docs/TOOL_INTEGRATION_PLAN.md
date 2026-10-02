# CreatorsKit — Tool Integration & Navigation Unification Plan

> **Last Updated:** 2026-10-02
> **Status:** Active · Companion to `docs/BUSINESS_MODEL_PLAN.md`
> **Scope:** audit every tool, connect everything, one navigation system, fix the name, kill the yellow.

---

## 0. TL;DR

1. **FREEZE new tools — confirmed by owner.** 20 tools exist. The next weeks are upgrades to existing tools, not new routes.
2. **The name is already decided by the URL bar:** the domain is `creatorskit.win` (`SITE_BASE_URL` in `src/lib/seo.ts`) but every brand string says "CreatorKit". Rebrand display strings to **CreatorsKit**. The "CK" logo abbreviation works for both — it stays.
3. **Navigation is 5+ systems.** Collapse to **one data source** (`tools.ts`) + **one nav component family** (bar mode + floating mode). Delete every hardcoded route list and every bespoke in-app tool switcher.
4. **Everything must connect to something.** Today only 3 hand-off edges exist. Target: every tool ≥1 in-edge and ≥1 out-edge (graph in §4).
5. **Yellow is allowed only where it means something** (audio meters). Everywhere else: black / white / zinc.
6. **Orphan ruling (owner, 2026-10-02; quote-card revised same day):** `/quote-card` lives on as its OWN tool — a text-behind fork minus the AI model (per-card background photos/colours, batch upload → card deck, one-click hand-off to text-behind for the AI sandwich) · promote palette-extractor, sync-slate, color-gradient · scrap exposure-monitor · `/overlay` KEPT (owner correction) (§5).
7. **Instant open is a feature, not a nice-to-have.** Nothing heavy loads before first paint — conversion engines lazy-load on first use (§9). That's the anti-Canva pitch: free, instant, in-browser.

---

## 1. What the Audit Found (the receipts)

### 1.1 Naming mismatch
| Where | Says | File |
|---|---|---|
| Production domain | `creatorskit.win` | `src/lib/seo.ts:12` (`SITE_BASE_URL`) |
| Cloudflare default | `creatorskit.pages.dev` | comment in `src/lib/seo.ts` |
| Site name constant | `CreatorKit` | `src/lib/seo.ts:13` (`SITE_NAME`) |
| Root metadata title/OG/Twitter | `CreatorKit — Tools for Creators who ship` | `src/app/layout.tsx:20` |
| PWA manifest | `CreatorKit — Creator Production Suite` | `src/app/manifest.ts:5` |
| Navbar logo text | `CK.win` | `src/components/Navbar.tsx:104` |
| Strategy docs | `CreatorKit.win` | `CREATORKIT_STRATEGY.md` |

**Decision: CreatorsKit.** You cannot beat the URL bar. Fighting it means every visitor sees one name and reads another — a small trust leak on every page.

### 1.2 Navigation is scattered (5 systems, 4 hardcoded route lists)
| # | System | Where | Route source |
|---|---|---|---|
| 1 | Navbar + dropdown | `src/components/Navbar.tsx` (home/blog) | `ALL_TOOLS` from `tools.ts` ✅ |
| 2 | ToolLayout sidebar | `src/components/ToolLayout.tsx` (embedded tools) | `ALL_TOOLS` + its own hardcoded `TOOL_ICONS` map (24 keys) |
| 3 | StudioToolsDropdown | `src/components/StudioToolsDropdown.tsx` (teleprompter, video-grabber, business, thumbnail-lab import it directly) | `ALL_TOOLS` ✅ |
| 4 | **Bespoke in-app switchers** | thumbnail-lab, text-behind, bouquet each hand-roll their own searchable `ALL_TOOLS` menu inside the page (~80 lines × 3, three different UIs) | `ALL_TOOLS` ✅ but re-implemented |
| 5 | Chrome router | `src/components/ClientLayout.tsx:10-28` | **two hardcoded lists** (`toolPaths` 16 entries, `fullscreenApps` 6 entries) that already disagree with `tools.ts` |

Plus the home page grid renders only `NATIVE_TOOLS` (`src/app/page.tsx:256`).

### 1.3 Six orphan tools (built, working, invisible)
Not in `tools.ts`, not on the home grid, not in the navbar, **no `layout.tsx` = no SEO metadata = invisible to Google**:

| Route | What it is | Chrome | Ruling (owner, 2026-10-02) |
|---|---|---|---|
| `/quote-card` | Quote Card Studio — full text-behind fork (canvas, fonts, shapes, grain) WITHOUT the AI bg-removal model | fullscreen (own nav entry) | **KEPT AS OWN TOOL** (owner revision 2026-10-02): own tools.ts entry + SEO (Instagram/Facebook quote cards), per-card bg photo + colour, batch upload → deck, hand-off → text-behind for the AI sandwich. Redirect to /text-behind REMOVED |
| `/palette-extractor` | Extract palette from image | ToolLayout | **Promote + make much better** — future Brand Kit feeder |
| `/sync-slate` | Film sync slate / clapper with mic levels | ToolLayout | **Promote as-is** — pairs with teleprompter (shoot-day kit) |
| `/exposure-monitor` | Video exposure / IRE analyzer | ToolLayout | **Scrap** — owner sees no user for it; 301 to home. Energy goes to resizer/converter instead |
| `/color-gradient` | Gradient/palette maker (in progress) | ToolLayout | **Keep + make THE palette maker** — usable palettes + killer feature: "test my colors on a live website preview" inside the tool |
| `/overlay` | Stream overlay studio (`OverlayStudio.tsx`) | ToolLayout | **Archive** — owner doesn't know what it is = it's already dead. 301 to home; code lives in git history |

Also invisible-but-fine: `/captions` (redirects to `/auto-captions`), `/agreement` (linked from Business hub), `/admin` + `/admin/write` (internal — add `noindex`), `/r/[id]` (shared receipts), `/bouquet/[id]` (shared bouquets), `/redirect` (ad bridge).

### 1.4 Stale system files
- `metadata.json` still describes the whole app as **"3D Space Planner"** — delete or fix.
- `src/app/manifest.ts` description advertises "3D studio space planner, teleprompter, sync slate" and ships a Space Planner shortcut — Space Planner is dead per the business plan. PWA `theme_color: #FFE500` (yellow).
- `src/app/layout.tsx` viewport `themeColor: #FFE500` (yellow browser chrome).

### 1.5 Yellow audit (grep receipts)
**Decorative yellow — kill (17 hits across 9 files):** quote-card primary button `#FFE500` + `hover:bg-yellow-300`; `globals.css` `.brutalist-button-primary:hover → #fde047`; CassettePlayer subtitle chips `yellow-400/500`; paused-status chips `#eab308` in match-cut, text-highlighter, auto-captions; sync-slate status badges; Space Planner ambers (tool is archived anyway); business suite "Gold `#eab308`" swatch option (this one is user-facing *content color* — keep, it's a palette choice, not UI).

**Semantic yellow — keep (encodes meaning):** teleprompter + sync-slate dB meters (red/green/yellow loudness thresholds), exposure-monitor IRE scale (yellow = 85–95 IRE near-clipping — that's the tool's whole point), `--warn` token in `globals.css`.

**Systemic yellow — change:** PWA `theme_color` + viewport `themeColor` `#FFE500` → `#000000`.

---

## 2. Naming Change List (CreatorsKit)

| File | Change |
|---|---|
| `src/lib/seo.ts:13` | `SITE_NAME = 'CreatorsKit'` |
| `src/app/layout.tsx:20-50` | title/OG/Twitter/authors/appleWebApp → `CreatorsKit` |
| `src/app/manifest.ts:5-6` | `name: 'CreatorsKit — Creator Production Suite'`, `short_name: 'CreatorsKit'`; drop Space Planner shortcut; description → "20 brutalist creator tools…" |
| `src/components/Navbar.tsx:104` | `CK.win` stays (CK = CreatorsKit) |
| `src/app/manifest.ts` + `layout.tsx` | `theme_color` / `themeColor` → `#000000` |
| `metadata.json` | replace with CreatorsKit app description (or delete if unused by tooling) |
| `CREATORKIT_STRATEGY.md` header | note domain is creatorskit.win |
| Blog posts / `src/data/blog-posts.ts` | grep `CreatorKit` → `CreatorsKit` (keep historical quotes) |

One rule after this lands: **grep for "CreatorKit" must return zero UI strings** (code comments are fine to sweep opportunistically).

---

## 3. Navigation Unification — One System

### 3.1 The single source of truth: `tools.ts`
Extend `ToolItem` (schema migration of `src/data/tools.ts`):

```ts
interface ToolItem {
  label: string;
  href: string;
  hint: string;
  desc: string;
  category: 'create' | 'enhance' | 'package' | 'video' | 'shoot' | 'business' | 'utility' | 'directory';
  chrome: 'embedded' | 'fullscreen';      // replaces ClientLayout's two hardcoded lists
  status: 'live' | 'beta' | 'archived';   // drives badges + sitemap filtering
  icon: string;                            // lucide name — replaces ToolLayout's TOOL_ICONS map
  handoffs?: string[];                     // hrefs this tool can send to (see §4)
  isFlagship?, isExternal?, externalUrl?, badge?  // unchanged
}
```

Every route decision in the app is derived from this file. No other component keeps a route list.

### 3.2 One nav component family: `SiteNav`
Build `src/components/nav/SiteNav.tsx` with **two render modes** (same component, same data, same search):

| Mode | Used by | Behavior |
|---|---|---|
| `bar` | Home, blog, business hub, all `chrome: 'embedded'` tools | Sticky top bar (black/white brutalist, current Navbar look) + collapsible category rail (ToolLayout's sidebar, restyled to match) |
| `floating` | All `chrome: 'fullscreen'` tools (teleprompter, thumbnail-lab, text-behind, bouquet, video-grabber) | A single floating pill button (bottom-right on mobile, top-right desktop) that opens the **same** searchable menu — full-screen tools keep their canvas, nav never steals layout space |

### 3.3 Deletions (this is where the "5 ways" die)
1. `ClientLayout.tsx` — delete `toolPaths` + `fullscreenApps`; derive from `tools.ts` (`chrome` field). Unknown routes default to `bar` mode.
2. `ToolLayout.tsx` — delete `TOOL_ICONS` (24 hardcoded keys); read `icon` from `tools.ts`. Its chrome becomes the `bar` mode of SiteNav.
3. `StudioToolsDropdown.tsx` — delete; fullscreen tools import `SiteNav mode="floating"` instead (consumers today: teleprompter, video-grabber, business, thumbnail-lab).
4. **Bespoke switchers inside thumbnail-lab, text-behind, bouquet** (each ~80 hand-rolled lines) — delete all three; they use `SiteNav` floating mode. This alone removes ~240 lines of triplicated UI.
5. `Navbar.tsx` — becomes a thin wrapper of `SiteNav` for marketing pages (or is deleted in favor of SiteNav directly in ClientLayout).

**Acceptance test:** `grep -r "ALL_TOOLS" src/` returns exactly two hits — `tools.ts` itself and `SiteNav.tsx`. Every other component navigates via SiteNav or plain Links.

### 3.4 Sitemap & home grid
- `src/app/sitemap.ts` + home grid iterate `NATIVE_TOOLS` filtered by `status !== 'archived'` — the 6 orphans become listed automatically once added to `tools.ts`.
- `/admin` routes: add `robots: noindex` via metadata.

---

## 4. Hand-off Graph — Everything Connects

Current reality: **3 edges** (`src/lib/tool-handoff.ts` consumers):
- text-behind → thumbnail-lab
- background-replace → text-behind
- background-replace → thumbnail-lab

### 4.1 The workflow spine (how a creator actually works)
```
CREATE  ──────────────► ENHANCE ──────────────► PACKAGE ──────────► SHIP
text-behind             background-replace      carousel-slicer      resizer v2
 (+ Card Studio:        thumbnail-lab           compress&convert     (image + video,
  posters AND cards)    watermark v2            resizer v2            blurred-fill)
color-gradient          text-behind                                  business (invoice
palette-extractor                                                    the client)
bouquet                                                              /receipt (get paid)
```

### 4.2 Target edge list (each row = one `putHandoffImage`/`takeHandoffImage` pair)
| From | To | Why (user story) |
|---|---|---|
| text-behind | thumbnail-lab ✅ exists | "test my poster as a thumbnail" |
| text-behind | **carousel-slicer** | "slice my poster into a carousel" |
| text-behind | **resizer** | "reformat for TikTok/X" |
| background-replace | text-behind ✅, thumbnail-lab ✅ | exists |
| background-replace | **watermark** | "stamp my cutout before publishing" |
| color-gradient | **text-behind (card studio)**, **watermark** | "use my gradient as a card/backdrop" |
| palette-extractor | **color-gradient** | "build gradients from my photo's palette" |
| palette-extractor | **(future) Brand Kit** | palette = the kit's colors (business-plan §5) |
| carousel-slicer | **resizer**, **compressor** | "resize + data-save each slide" |
| watermark | **compressor**, **resizer** | "compress stamped images in bulk" |
| compressor | **resizer** | rare but completes the cycle |
| bouquet | **(share link)** ✅ exists | viral loop, no handoff needed |
| video-grabber | **auto-captions** | "caption what I just grabbed" (when grabber revives) |
| auto-captions | **text-highlighter**, **match-cut** | "feed the .srt/transcript as the kinetic text source" |
| teleprompter | **auto-captions** | "the script I just rehearsed = the caption script" |
| match-cut / auto-captions | **resizer v2** | "reformat my rendered video for every platform" (video hand-off: pass source file, not canvas blob) |

**Minimum bar (from the business plan's ship rule):** a tool ships/integrates only with ≥1 in-edge and ≥1 out-edge in this table, or a share-link loop of its own (bouquet, receipt, space-planner-style). Link-only handoffs (open tool B after A) are acceptable v1; blob handoffs (image carries over) are the premium version — reuse `tool-handoff.ts` exactly as-is, it already handles consume-once semantics.

### 4.3 In-UI surface
Every tool's success state ("Export complete ✓") gains a **"NEXT →" row**: up to 3 relevant targets from its `handoffs` list + "Download". This is the integration users *feel* — and it doubles as the Pro-tier batch story later.

---

## 5. Orphan Decisions — Executed (owner ruling 2026-10-02)

**Promotion checklist** — every surviving orphan gets, in order:
1. Entry in `tools.ts` (label, desc, category, chrome, icon, status, handoffs)
2. `layout.tsx` with full SEO via `src/lib/seo.ts` factory (title, description, keywords, JSON-LD, OG)
3. ≥1 hand-off in + ≥1 out (§4 table)
4. `NEXT →` row in its success state
5. How-to content block + FAQ under the tool (same as flagship tools)
6. Black/white design pass (§6)

**The quote-card ruling (owner revision, 2026-10-02 — supersedes the original fold):**
- `/quote-card` is its OWN tool: a literal fork of text-behind's studio (same canvas, drag, fonts, shapes, grain, undo, persistence) with the AI bg-removal model REMOVED
- Card-deck model: multiple photos as layers, per-card background (photo or solid colour), batch background upload (first file → active card, extras → new cards), format templates (1:1 / 4:5 / 9:16), deck PNG export, whole-new-state reset alongside cached-work restore (owner: "we cache our quotes but we have to allow to create a whole new state")
- One-click hand-off → `/text-behind` (image carries via tool-handoff) when the user WANTS the AI sandwich effect; also → carousel-slicer, resizer, thumbnail-lab
- Positioning: Instagram & Facebook quote cards (SEO title/keywords/FAQ); owner's words, kept: *not fighting Canva — free enough, browser-native, so easy someone who doesn't know Canva disappears into it, and it opens instantly*

**Scraps:** `/exposure-monitor` and `/overlay` → 301 to home, delete routes. `/color-gradient`: finish to the checklist, including the live website-preview palette tester — that feature is its reason to exist.

---

## 6. Black & White Design Pass

**Principle: the UI is monochrome. Color appears only when it IS the content** (user's image, gradient being built, palette being extracted) **or when it encodes measurement** (dB meters, IRE scales, status).

### Kill list (decorative → monochrome)
| Location | Now | Becomes |
|---|---|---|
| `globals.css` `.brutalist-button-primary:hover` | `#fde047` | `#000` bg / `#fff` text inversion |
| quote-card export button | `#FFE500` + `hover:bg-yellow-300` | done — 2026-10-02 rebuild is monochrome from day one (route survives as its own tool) |
| CassettePlayer subtitle chips/text | `yellow-400/500` | white text, zinc-800 chip |
| Paused/status chips in match-cut, text-highlighter, auto-captions | `#eab308` | `#a1a1aa` (zinc-400) — green stays for "playing/ok" |
| sync-slate status badges (GOOD/NG/waiting) | yellow waiting | white/zinc for waiting; keep red NG, green GOOD |
| PWA `theme_color` + viewport `themeColor` | `#FFE500` | `#000000` |
| Space Planner ambers | — | moot (archived) |

### Keep list (semantic)
- `--warn: #eab308` token (used by meters)
- teleprompter + sync-slate dB meter segments (red ≥ −3 dB, yellow ≥ −18)
- exposure-monitor IRE color scale — the yellow IS the instrument
- Business suite content palette swatches (Terracotta/Gold/Emerald are user document colors, not UI)

Monochrome ramps: `#000000`, `#ffffff`, `#f4f4f5`, `#e4e4e7`, `#a1a1aa`, `#71717a`, `#3f3f46`, `#18181b`, `#09090b`. One accent for "this is interactive/primary": pure inversion (black↔white). No third color in chrome.

---

## 7. Per-Tool Scorecard (structural audit — hands-on QA still required)

*Grades are for structure: SEO, navigation, integration, share loop — not pixel polish. "Fix" = highest-leverage next action.*

| Tool | Grade | In nav? | SEO layout | Hand-offs | Share loop | Top fix |
|---|---|---|---|---|---|---|
| Text Behind Image | **A** | ✅ | ✅ | → lab ✅ | demo posters | absorb Card Studio (§5) + → carousel-slicer edge |
| Background Replace | **A−** | ✅ | ✅ | → text-behind, lab ✅ | — | → watermark edge |
| Business Suite (invoice/receipt/agreement) | **A−** | ✅ hub | ✅ | — | **✅ `/r/[id]` receipt links** (the launch wedge) | "Made with CreatorsKit" footer on shared pages |
| Thumbnail Lab | **A−** | ✅ | ✅ | in ✅ | — | delete bespoke switcher → SiteNav floating |
| Teleprompter | **A−** | ✅ | ✅ | — | — | → auto-captions script hand-off |
| Auto Captions | **B+** | ✅ | ✅ | — | — | out-edges to highlighter/match-cut |
| Match Cut | **B+** | ✅ | ✅ | — | — | accept transcript from auto-captions |
| Text Highlighter | **B+** | ✅ | ✅ | — | — | same transcript intake |
| Compress & Convert (was Compressor) | **B+ (rebuilt 2026-10-02)** | ✅ | ✅ (rewritten) | — | — | in-edges from carousel-slicer/watermark (§4) + FAQ/NEXT→ polish |
| Carousel Slicer | **B** | ✅ | ✅ | — | — | in-edges from text-behind (posters AND cards) — it's equal to text-behind structurally; what it lacks is connections, not quality |
| Resizer | **B− → v2** | ✅ | ✅ | — | — | v2: video reformat (portrait↔landscape, blurred-fill bg) rendered with `canvas-video-exporter` — the same engine match-cut/auto-captions already use |
| Watermark | **B− → v2-or-die** | ✅ | ✅ | — | — | v2: saved logo library (local), WYSIWYG placement, position memory across batch images — beat Canva's copy-paste trick or archive it |
| Bouquet | **B** | ✅ | ✅ | — | ✅ `/bouquet/[id]` share | keep as-is; it's its own world |
| Video Grabber | **C+** | ✅ "IN DEV" | ✅ | — | — | stays paused; restore per VPS plan only |
| Quote Card | **A− (rebuilt 2026-10-02)** | ✅ own entry | ✅ Instagram/FB quote SEO | → text-behind (AI sandwich), slicer, resizer, lab | — | live: watch real usage; v2 idea parking lot in INTEGRATION_PROGRESS |
| Palette Extractor | **B−** | ❌ orphan | ❌ none | — | — | **promote + make much better** → color-gradient + Brand Kit feeder |
| Sync Slate | **B−** | ❌ orphan | ❌ none | — | — | **promote as-is** — pairs with teleprompter |
| Exposure Monitor | **B−** | ❌ orphan | ❌ none | — | — | **scrap** — 301 to home |
| Color Gradient | **C+** | ❌ (mid-build) | ❌ none | — | — | finish: THE palette maker + live website-preview tester (§5) |
| Overlay Studio | **?** | ❌ orphan | ❌ none | — | — | **archive** — 301 to home |
| Space Planner | **archived** | ✅ (remove) | ✅ | — | share engine | 301 sunset per business plan |

---

## 8. Execution Order (each phase is shippable on its own)

**Phase 1 — Foundation (2-3 days): naming + nav unification**
- [ ] §2 naming change list (CreatorsKit everywhere user-visible)
- [ ] `tools.ts` schema extension (chrome/status/icon/handoffs) — all 14 listed tools migrated
- [ ] `SiteNav` component (bar + floating modes)
- [ ] ClientLayout derives chrome from tools.ts; delete StudioToolsDropdown + bespoke switchers ×3
- [ ] manifest + metadata.json cleanup; theme_color → #000
- [ ] `/admin` noindex; sitemap filters `status: archived`

**Phase 2 — Tool decisions (1-2 weeks): four upgrade workstreams + orphan ruling executed**
- [x] **Card Studio direction REVERSED (owner, 2026-10-02):** multi-card deck reverted OUT of text-behind (the AI tool stays single-canvas); `/quote-card` rebuilt as its own text-behind-style studio — no AI model, per-card bg photo/colour, batch upload → deck, deck PNG export, whole-new-state reset, own nav + sitemap + Instagram/FB quote SEO (§5 revision)
- [x] **Resizer v2**: video reformat with blurred-fill background via `src/lib/canvas-video-exporter.ts` — SHIPPED (trim, WebCodecs H.264 + audio, watermark stamp, ZIP; only §4 in-edge remains)
- [ ] **Watermark v2-or-die**: local logo library + position memory + true batch WYSIWYG; if it can't beat Canva's copy-paste flow, archive — NOTE: resizer already embeds batch WYSIWYG stamping
- [x] **Compress & Convert**: REBUILT 2026-10-02 — PDF→PNG/JPG/WebP (pdfjs-dist v6, every page its own image), images/SVG→PDF (pdf-lib, rasterize-first fallback), PNG⇄JPG⇄WebP±AVIF (Canvas, feature-detected), batch queue + per-file progress, debounced size estimates BEFORE convert, JSZip download-all, engines lazy-loaded; page + layout + tools.ts entry, tsc clean, build green
- [x] Promote survivors per §5 checklist: palette-extractor, sync-slate, color-gradient — layouts + tools.ts entries + handoffs done 2026-10-02; FAQ/NEXT→ rows ride with Step 3
- [x] Space Planner sunset: 301 → `/`, route + components + libs deleted 2026-10-02
- [x] Route removals executed: exposure-monitor 301 ✓ · Space Planner sunset ✓ · `/overlay` KEPT (owner correction) · `/quote-card` removed from the kill list (own tool per §5 revision)

*(These are upgrades to existing tools — the freeze holds. No new routes.)*

**Phase 3 — Hand-off graph (3-5 days): the spine**
- [ ] Priority edges: text-behind→carousel-slicer (carries posters AND cards), carousel-slicer→compress&convert, watermark→compress&convert, palette-extractor→color-gradient, match-cut/auto-captions→resizer v2 (video)
- [ ] `NEXT →` success row component (shared, driven by `handoffs`)
- [ ] Transcript edges: teleprompter→auto-captions→(match-cut | text-highlighter) — text hand-offs may need a small sibling util next to `tool-handoff.ts`

**Phase 4 — Black & white pass (1-2 days): §6 kill list**

**Phase 5 — QA + ship (1-2 days)**
- [ ] `grep "CreatorKit"` → 0 UI hits; `grep ALL_TOOLS` → 2 files
- [ ] Every listed tool: nav reachable in ≤1 tap from any other tool (bar and floating)
- [ ] Every tool has ≥1 in-edge or share loop (the "everything connects" bar)
- [ ] Lighthouse ≥ 90 on 3 promoted orphans; smoke-test on Android Chrome (majority audience)

**Phase 6 — Mobile navigation & swipe UX (planned; owner ruling 2026-10-02 — NOT in the current pass; finish the existing plan first)**
- Mobile-first navigation is "one of the biggest selling points": most users are non-technical creators on phones; if the builder finds it easy, that says nothing — the creator on a phone is the bar
- Bar to beat: TikTok — "all you do is swipe" — zero-learning-curve navigation
- Scope when it starts: mobile audit of every tool (switcher reachability, canvas gestures vs UI gestures, bottom-sheet inspectors instead of sidebars, swipe between cards in the quote-card deck, swipe-friendly NEXT→ row); ONE mobile nav pattern derived from tools.ts (bottom tab/sheet for `bar` chrome, floating pill stays for `fullscreen` chrome); thumb-zone placement for primary actions
- Success test: a first-time creator on Android Chrome goes tool → tool → export without a tutorial

**Freeze rule:** no new tool routes until Phases 1-3 are done. The only exception is finishing `/color-gradient`, already mid-flight. After that, a new tool must pass the §5 checklist on day one — including its two hand-off edges — or it doesn't merge.

---

## 9. Compress & Convert — the ImageMagick Question

**Reality check: ImageMagick is a native binary — it cannot run inside a browser tab.** The WASM port (`@imagemagick/magick-wasm`) exists but is a multi-megabyte download, which breaks the "opens instantly" selling point. The winget install stays on the dev machine for scripts; it does not ship in the app.

**The browser-native stack (all local, all on-device, lazy-loaded on first use):**

| Conversion | How | Payload |
|---|---|---|
| PDF → PNG/JPG (page render) | `pdfjs-dist` (pdf.js) | ~1 MB, lazy |
| PNG/JPG/WebP → PDF | `pdf-lib` (embeds images natively) | ~300 KB, lazy |
| SVG → PNG | Canvas `drawImage` (built into every browser) | $0 — `resvg-wasm` only if fidelity demands it |
| PNG ⇄ JPG ⇄ WebP (± AVIF where supported) | Canvas `toBlob` | $0, built-in |
| Batch + zip delivery | JSZip — already shipped in carousel-slicer | $0 |

**Rules:** engines load on demand, never in the page bundle · show **estimated output size before committing** (render to blob, read `.size` — trivial locally) · batch queue 5+ with per-file progress · everything stays on-device — the same privacy story as bg-removal. "Convert PDF to PNG free online no upload" is a huge search category, and it feeds §4's PACKAGE hub.

---

*Companion docs: `docs/BUSINESS_MODEL_PLAN.md` (monetization + stage gates), `CREATORKIT_STRATEGY.md` (original strategy, superseded on monetization).*
