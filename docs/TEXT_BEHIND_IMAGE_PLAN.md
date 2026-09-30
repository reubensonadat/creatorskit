# Text Behind Image — Implementation Plan

The viral "text behind subject" effect (textbehindimage.com style): giant
cinematic typography that sits **behind** the photo's subject, so the subject
partially occludes the letters — instant movie-poster depth.

## 1. The effect, decomposed

From the two references:

- **EGYPT poster** — "EGYPT" in huge semi-transparent capitals stretched
  nearly full-width; storm clouds show *through* the letters (low alpha /
  blend mode), and the pyramid apexes overlap the "G"/"Y" — the type is
  integrated into the scene, not floating on top.
- **textbehindimage.com grid** — MUSTANG behind a car, MAUI behind a whale
  fluke, HUSTLE behind a diving player, BEHIND behind a yacht: in every case
  the **subject's silhouette clips the text**. The illusion = layering, not
  editing.

Core trick — a three-layer sandwich:

```
Layer 0 (bottom):  original photo (background)
Layer 1 (middle):  the TEXT
Layer 2 (top):     the SUBJECT CUTOUT (transparent-background PNG)
```

Everything in this tool is: get a cutout (or accept one), composite the
sandwich, let the user art-direct the text, export.

## 2. Four input modes (the auto-captions fallback philosophy)

Exactly like captions (SERVER → BROWSER → BYO KEY → MANUAL), best-first:

| Mode | How | Cost | Quality | Latency |
|---|---|---|---|---|
| A. **BOTH-IMAGES UPLOAD** | user already has bg + cutout PNG; upload both, skip AI entirely | free, offline | perfect (user's own) | instant |
| B. **BROWSER PERSON-SEG** | MediaPipe Selfie Segmentation (WASM, ~2 MB) in a Web Worker; persons only | free, offline | very good for people | ~1 s |
| C. **SERVER MATTE** | POST image → worker `/matte` (rembg **u2netp**, 5 MB weights) → alpha PNG | free (our Render box) | good, any subject | 2–6 s |
| D. **BYO API KEY** | remove.bg / Replicate key stored like Groq/OpenAI keys | user's key | premium, hair-level | ~3 s |
| E. **MANUAL REFINE** | brush paint/erase on the mask, always available on top of A–D | free | as good as the user's hand | — |

Mode A is a first-class citizen (the user explicitly wants "upload the two of
them together"): it makes the tool useful with ZERO AI on day one.

## 3. Worker `/matte` route (Mode C) — RAM-safe design

Constraint: the free Render box (512 MB) already hosts Whisper (~180 MB
resident when loaded). u2netp via `rembg` needs ~120–200 MB while inferring.

- New module `workers/captions/matte.py` — the ONLY file importing rembg.
- `rembg.new_session('u2netp')` created **per request** inside a dedicated
  `_MATTE_LOCK`, then dropped + `gc.collect()` — no idle residency.
- Shared RAM guard: before matte, if the whisper model is loaded and idle,
  unload it first (reuse `engine`'s `_model_lock` discipline). One heavy
  model at a time, always.
- Accept `multipart/form-data` image (≤ 99 MB like audio), downscale to
  max 2048 px long-edge before inference (speed + RAM), return
  `image/png` with alpha. Same one-time-ticket pattern as `/transcribe`
  (real worker token stays server-side in the edge function).
- `GET /matte/health`-style fields folded into the existing `/` health.

## 4. Negative-space auto-placement (the "AI places it beautifully" bit)

No vision API needed — **the mask IS the vision**. Once we have the subject
alpha mask, placement is deterministic scoring:

1. Rasterize the mask at low res (e.g. 128 px wide grid) → occupancy grid.
2. Candidate text bands: for each `y` in grid rows × scale in {0.8 … 1.6} ×
   full-width assumption, simulate the text's bounding band (height ≈
   `fontSize` estimated from scale).
3. Score each band:
   - **occlusion drama** — fraction of band cells whose bottom half touches
     subject cells (letters clipped by the silhouette = the effect),
   - **legibility** — fraction of band cells over low-detail background
     (variance of luminance under the band from the photo grid),
   - **composition** — penalty near frame edges; bonus for golden-ratio
     y-positions (~0.33 / 0.62) and for hugging the subject's top edge.
4. Pick argmax, emit `{ yPct, scalePct }`, animate the text there.
   Keep ≥ ~55 % of glyphs visible (legibility floor) — drama without
   losing the word.

This runs in <10 ms client-side and explains itself: draw the chosen band as
a ghost overlay for one second after auto-place.

## 5. Text rendering & art-direction controls

- **Text**: multi-line input, uppercase toggle.
- **Font**: reuse the existing font-picker/popular-fonts pattern (Google
  Fonts, `ensureFontReady`-style load-before-draw so export matches preview).
  Curate a poster preset list: condensed giants (Archivo Black, Anton,
  Bebas Neue), slabs, scripts (for the MAUI vibe).
- **Style**: size (fit-to-width default — the EGYPT look), letter-spacing,
  color, **opacity/alpha (clouds-through-letters)**, **blend modes**
  (normal / multiply / overlay / screen — cheap cinematic integration),
  rotation, subtle text-shadow.
- **Drag**: pointer-capture drag on the text (the cue-timeline pattern:
  pointerdown → setPointerCapture → move → up, <4 px = tap = deselect);
  resize via corner handle + wheel/pinch for scale. Snap guides (center X,
  thirds) at <2 px distance.
- **Depth swap**: one tap flips text fully behind / fully in front /
  behind-with-shadow — instant A/B for the user's eye.

## 6. Export

- PNG (default, lossless) + JPEG (quality 0.92) via `canvas.toBlob` +
  the shared `downloadBlob` helper.
- Optional 2× resolution render (draw at 2× canvas, same sandwich).
- No video in v1 — keep the tool one-trick-perfect like the reference site.

## 7. Route & UI

- Retrofit the existing `/text-behind` page (audit first — Phase 0).
- Brutalist layout like auto-captions: left = viewport canvas (checkered
  alpha backdrop), right = control stack (INPUT MODE chips → TEXT → FONT →
  STYLE → AUTO-PLACE → EXPORT). Mobile: viewport top, controls scroll under.
- **Engine-source chip** like captions: `CUTOUT: UPLOADED / PERSON (BROWSER)
  / SERVER (u2netp) / BYO API / MANUAL`.
- Session persistence: IndexedDB (image blobs) + localStorage (settings),
  same keys/hygiene as captions sessions.

## 8. Milestones

- **M0 — audit** existing `src/app/text-behind/page.tsx`; decide keep vs
  rebuild (expect rebuild of the canvas core, keep route + layout shell).
- **M1 — static sandwich (no AI)**: both-images upload (Mode A), text layer,
  drag + style controls, PNG export. *Tool is already useful here.*
- **M2 — server matte**: worker `/matte` + ticket + progress UI (Mode C),
  auto-place algorithm, engine chip.
- **M3 — person-in-browser** (Mode B) + manual refine brush (Mode E).
- **M4 — polish**: blend modes, snap guides, 2× export, BYO API (Mode D),
  presets gallery (EGYPT / MUSTANG / MAUI recipes), landing examples grid.

## 9. Risks & mitigations

- **Worker RAM (whisper + rembg)** → one-heavy-model-at-a-time locks; matte
  session per request; downscale before inference; hard 2048 px cap.
- **rembg wheel size on Render image** → u2netp only (5 MB); onnxruntime
  CPU build; verify in the Docker bake like the whisper model.
- **Font not loaded at export** → await `document.fonts.ready`-style gate
  before the export draw (lesson from overlay presets).
- **Cutout edge halos** → 1 px alpha erode/feather toggle on the cutout
  layer before compositing.

## 10. Standalone Background Remover tool (shared engine)

The matte engine is a product of its own, not just text-behind plumbing:

- Audit the existing `/background-replace` page + `api/remove-background`
  route first; rebuild on the SAME four-mode pipeline (§2) so there is ONE
  cutout engine in the codebase, used by both tools.
- UX: drop image → cutout → transparent-PNG export, plus "preview on
  background" (solid color / custom image / blur) and the manual refine
  brush. CUTOUT engine chip like everywhere else.

## 11. Free-canvas principle (no forced sizes)

- The text-behind editor canvas takes the **uploaded image's native
  dimensions** — never a forced 16:9/9:16/1:1. Zoom-to-fit for display;
  export at native resolution (optional 2×).
- "Done? Change the size?" → **hand-off, not built-in**: an explicit
  "RESIZE / REFORMAT →" button routes the finished PNG (or the project) to
  the Photo Media Resizer (§12). One tool, one job — the CapCut lesson.

## 12. Photo Media Resizer — client-side video reformat (NEW SCOPE)

Portrait video → landscape (or any ratio) with the blurred-background-fill
look, **100% client-side, no server**:

1. Decode the uploaded video frame-by-frame in-browser (WebCodecs
   `VideoDecoder` / HTMLVideoElement seek — MediaStagePlayer patterns).
2. Per output frame, draw the sandwich: scaled-up + gaussian-blurred copy
   of the frame filling the target canvas, then the sharp video centered.
   Blend controls: blur strength, background scale, dim/vignette, custom
   color fill instead of blur.
3. Encode with the existing `exportCanvasVideoToMp4` (WebCodecs + mp4-muxer)
   and mux the original audio track with the existing `muxAudioTrack`.
4. Classic photo sizes (1:1, 4:5, 16:9, 9:16, custom) share the same
   fill engine; presets remember last-used ratio per user.
5. Upgrade the existing `/resizer` page; keep server out of the path.

## 13. Why matting does NOT go on the Supabase edge function

Question on the table: "run the model on the Supabase edge function — we
have the power there?" Honest answer — no, for four hard reasons:

1. **Runtime mismatch**: rembg is Python + native ONNX wheels; Supabase
   edge functions are Deno isolates that cannot load native modules. Only
   WASM inference is even theoretically possible there.
2. **CPU/memory caps**: isolates get soft CPU limits (~2 s CPU) and ~400 MB
   memory. u2net inference is multiple CPU-seconds; u2netp barely fits,
   u2net does not. Requests would die mid-inference.
3. **"<10 ms" is not achievable anywhere free**: even dedicated GPUs take
   ~50–300 ms for u2net-class models. Realistic latencies: browser WASM
   person-seg ~1 s, worker u2netp ~2–6 s. Any tool claiming instant is
   caching or lying.
4. **The edge's real job** stays what it already does well: instant,
   cheap orchestration — minting one-time tickets, proxying secrets. Heavy
   compute lives on Render (worker) or the client.

So the tiering in §2 stands: browser (instant-ish) → Render worker (free,
any subject) → BYO API (premium quality). The edge never runs the model.

## 14. Updated milestones (superset)

- **M0 — audit** `/text-behind`, `/background-replace`, `/resizer` pages.
- **M1 — static sandwich (no AI)** + free-canvas + PNG export.
- **M2 — server `/matte`** + auto-place + engine chip.
- **M3 — person-in-browser + manual refine brush.**
- **M4 — polish**: blend modes, snap guides, 2× export, BYO API,
  preset gallery (EGYPT / MUSTANG / MAUI recipes).
- **M5 — standalone Background Remover tool** (shared engine).
- **M6 — Photo Media Resizer video reformat** (blur-fill + audio mux,
  client-side) + text-behind → resizer hand-off button.
