# CreatorKit — When & Why To Use It

> **The one-rule summary:** Reach for CreatorKit whenever a creative task can be done *in a browser tab, in under two minutes, for free, on any device* — and reach for a desktop suite only when you genuinely need a timeline, RAW files, or team collaboration.

---

## 1. What CreatorKit Is

CreatorKit (creatorkit.win) is a suite of **14+ free, no-signup, in-browser tools** for video, photo, audio, and design work. Every tool runs 100% client-side — files never leave the device — and the whole thing installs as a **PWA that works offline** (`public/sw.js`, `src/app/manifest.ts`).

| Fact | Detail |
|---|---|
| **Cost** | Free. No subscriptions, no accounts, no watermarks on your work |
| **Privacy** | 100% local processing — AI models (background removal, speech-to-text) run via WebAssembly in your browser |
| **Platforms** | Any modern browser; mobile-first (≈80% of creator traffic is mobile) |
| **Stack** | Next.js 15 App Router · TypeScript · Tailwind CSS · Canvas/WASM/Three.js |

The full tool catalog lives in [`src/data/tools.ts`](../src/data/tools.ts); the product thesis lives in [`CREATORKIT_STRATEGY.md`](../CREATORKIT_STRATEGY.md).

---

## 2. The Best Times To Use CreatorKit

### 2.1 The "best time" is really a *best situation*

Use CreatorKit when **any** of these are true:

1. **You're on a phone or a borrowed/shared computer** — nothing to install, nothing to license.
2. **You're on expensive or slow mobile data** — the Image & Video Compressor exists specifically to shrink uploads before they eat your data plan.
3. **You need one specific output, once** — a sliced carousel, a watermarked batch, an invoice — not a workflow.
4. **You have two minutes, not two evenings** — every tool is upload → tweak → download.
5. **You can't (or won't) upload private footage to a cloud service** — nothing is uploaded anywhere.
6. **You're offline or on flaky connectivity** — the PWA keeps working after first load.

### 2.2 Best time to use it *in the content lifecycle*

| Phase | Reach for | Why it's the right moment |
|---|---|---|
| **Planning a studio/room** | 3D Space Planner (`/space-planner`) | Before buying gear — model acoustics, lighting, and budget first |
| **Scripting & rehearsal** | Studio Teleprompter (`/teleprompter`) | Voice-synced scrolling, eyeline spotlight, mobile mode for phone rigs |
| **Shooting** | Sync Slate (`/sync-slate`), Exposure Monitor (`/exposure-monitor`) | On-set utilities that replace single-purpose hardware apps |
| **Editing short-form** | Text Match CUT (`/match-cut`), Text Highlighter (`/text-highlighter`), Silence Trimmer | The kinetic-typography and cleanup passes that make TikToks/Reels/Shorts pop |
| **Captioning** | Auto Captions (`/auto-captions`) | Whisper-class transcription runs locally; export timestamped subtitles free |
| **Formatting & delivery** | Resizer, Carousel Slicer, Compressor, Watermark | The "make it fit platform X" endgame — 1-click batch crops, seamless slide slicing, data-saving WebP, anti-theft stamps |
| **Packaging the story** | Quote Cards, Receipts, Keepsakes, Bouquets, Tree QR (`/tree-qr`) | Shareable artifacts: podcast quote cards, scannable 3D voxel-tree QR art |
| **Getting paid** | Creator Business & Legal Suite (`/business`) | Brand-deal invoices (Mobile Money **or** bank), sponsorship agreements, payment receipts, pitch letterheads |
| **Growing** | Thumbnail Lab (`/thumbnail-lab`) | *Before* publishing — simulate YouTube feeds and 3-second glance tests to benchmark CTR |

### 2.3 When CreatorKit is the *wrong* tool (honest limits)

- **Multi-track timeline editing** — color grading a 40-minute documentary, keyframed audio mixing, multicam. Use Premiere/DaVinci.
- **RAW / 16-bit photo pipelines** — batch print mastering. Use Lightroom.
- **Team collaboration & cloud sync** — there are no accounts and no servers holding your files by design.
- **Files bigger than your device RAM** — everything runs in-browser, so an 8 GB video on a 4 GB phone won't end well. Compress or trim first (that's what the Compressor is for).
- **Always-on background rendering** — close the tab and rendering stops.

---

## 3. The Exciting Stuff (With Receipts)

Each claim below is grounded in the actual codebase:

| # | Feature | Why it's exciting | Where it lives |
|---|---|---|---|
| 1 | **AI with zero cloud bills** | Background removal and speech-to-text run as WASM models in the visitor's browser — server costs stay at ~$0 | `@imgly/background-removal`, `@huggingface/transformers` in [`package.json`](../package.json); [`src/lib/captions/whisper-worker.ts`](../src/lib/captions/whisper-worker.ts) |
| 2 | **Offline PWA** | After first visit, tools keep working with no network — huge in low-connectivity regions | `public/sw.js`, [`src/app/manifest.ts`](../src/app/manifest.ts) |
| 3 | **52+ pro fonts, non-blocking** | A curated Google Fonts catalog (Anton, Bebas Neue, Playfair…) loads asynchronously so first paint is never blocked | [`src/app/layout.tsx`](../src/app/layout.tsx), [`src/components/AsyncFontLoader.tsx`](../src/components/AsyncFontLoader.tsx) |
| 4 | **3D scannable QR art** | Any URL becomes a voxel 3D tree diorama that *still scans* — a shareable growth loop | [`src/lib/tree-qr/`](../src/lib/tree-qr) with Three.js presets (sakura, wisteria, zen bonsai) |
| 5 | **Cinematic word-anchored match cuts** | Kinetic typography engine with Remotion-grade rendering in a free web tool | [`src/app/match-cut/match-cut-engine.ts`](../src/app/match-cut/match-cut-engine.ts), [`src/remotion/MatchCutComposition.tsx`](../src/remotion/MatchCutComposition.tsx) |
| 6 | **Mobile Money-native invoicing** | Brand-deal invoices that speak MoMo/Bank — built for creators in cash/mobile-money markets (e.g., Ghana), not just Stripe countries | Business suite entries in [`src/data/tools.ts`](../src/data/tools.ts) |
| 7 | **Thumbnail CTR science** | Feed simulation + 3-second glance tests reproduce how viewers actually decide | `/thumbnail-lab` (flagship "GROWTH" badge) |
| 8 | **A design language you can steal** | A complete, self-contained Neo-Brutalist design system — documented separately so it can be transplanted into other products | [`docs/CREATORKIT_DESIGN_SYSTEM.md`](./CREATORKIT_DESIGN_SYSTEM.md) |

---

## 4. Quick Decision Table

| You need to… | Use | Takes about |
|---|---|---|
| Read a script while filming | `/teleprompter` | 30 s setup |
| Caption a video | `/auto-captions` | 1–3 min |
| Slice one wide image into an IG carousel | `/carousel-slicer` | 20 s |
| Fit a video/image to TikTok/YouTube/X | `/resizer` | 15 s |
| Shrink files before uploading on mobile data | `/compressor` | 30 s |
| Make text-behind-subject art | `/text-behind` | 2 min |
| Punch up talking-head edits | `/match-cut` + `/text-highlighter` | 5 min |
| Invoice a brand (MoMo or bank) | `/business` | 2 min |
| Test a thumbnail before publishing | `/thumbnail-lab` | 3 min |
| Turn a link into 3D QR art | `/tree-qr` | 1 min |
| Plan a studio on a budget | `/space-planner` | 15–30 min |

---

*Companion document: [`docs/CREATORKIT_DESIGN_SYSTEM.md`](./CREATORKIT_DESIGN_SYSTEM.md) — the portable design system extracted from this app.*
