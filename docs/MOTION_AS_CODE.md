# Motion as Code — CreatorsKit Engine Mapping

This document maps the **"Motion as Code" engineering blueprint** (programmatic
motion design where every visual state is a deterministic pure function of
time, `S(t) = f(t)`) onto CreatorsKit, and records what was implemented.

## The big discovery

CreatorsKit was **already most of the way there architecturally**. The
captions pipeline is a faithful — if implicit — implementation of the
blueprint:

| Blueprint concept | CreatorsKit equivalent | Status |
|---|---|---|
| `align_vo.py` → `data/word_timings.json` | Whisper transcription ([`whisper-client.ts`](../src/lib/captions/whisper-client.ts), [`whisper-worker.ts`](../src/lib/captions/whisper-worker.ts)) + script forced-alignment ([`script-aligner.ts`](../src/lib/captions/script-aligner.ts)) → `SubtitleCue.words` | ✅ existed |
| Scene plates, `S(t) = f(t)` | [`drawCaptionFrame(ctx, w, h, t, cues, …)`](../src/lib/captions/overlay-renderer.ts) — the whole caption render is a pure function of time | ✅ existed |
| Interactive client mode (Vite, 60 FPS) | OverlayStudio live preview canvas + rAF playback loop | ✅ existed |
| Headless production mode (Chrome + ffmpeg) | [`exportCanvasVideoToMp4`](../src/lib/canvas-video-exporter.ts) — deterministic frame-stepped WebCodecs H.264 (no wall clock, no dropped frames) | ✅ existed |
| Procedural SFX cue sheet + offline mix | [`studio-sounds.ts`](../src/lib/studio-sounds.ts) `synthesizeCutSound` + [`renderOfflineAudio`](../src/lib/canvas-video-exporter.ts) | ✅ existed |
| `wordOf()` / `lineOf()` timing queries | — | 🆕 **built** |
| Decaying-sine camera shake on a spoken word | — | 🆕 **built & wired** |
| Sub-frame temporal motion blur (Δt = 1/(fps·samples)) | — | 🆕 **built & wired** |
| Shared easing / spring math | inline, per-tool | 🆕 **unified** |

## What was added

### 1. Shared motion core — `src/lib/motion/`

The blueprint's engine, extracted into one deterministic, dependency-free
library used by every studio tool:

- **[`easing.ts`](../src/lib/motion/easing.ts)** — pure curves
  (`smoothstep`, `easeInOutSine`, `easeOutExpo`, `easeOutBack`, …), scalar
  helpers (`clamp01`, `lerp`, `progressSince`), the unified damped-spring
  pop (`springScale`), and `impactShake(ageSec, opts)` — the decaying-sine
  `amplitude · e^(−λ·age) · sin(2π·f·age)` camera flinch.
- **[`timing.ts`](../src/lib/motion/timing.ts)** — `WordTimingIndex`, the
  queryable form of `word_timings.json`, built from any `SubtitleCue[]`:
  - `wordOf("code")` → exact timing of a spoken word
  - `wordOf("code", 1)` → the **second** occurrence of a repeated word
  - `lineOf("creates motion")` → contiguous phrase span (the recommended
    disambiguator)
  - `wordAt(t)`, `nextWord(t)`, `progressOf(word, t)`
  - `onsetNear(t, maxAgeSec)` → latest word onset for impulse effects
- **[`timeline.ts`](../src/lib/motion/timeline.ts)** — `MotionTimeline`,
  the plate system (`{ id, start, end, draw(ctx, info) }`, visibility
  decided by time alone), plus `accumulateMotionBlur(...)` — the Canvas 2D
  version of the blueprint's offscreen accumulator: samples N sub-frames
  across a frame's exposure window and averages them with the exact
  progressive-mean compositing trick (`globalAlpha = 1/(k+1)`).

### 2. Auto Captions overlay — impact shake + motion blur

In [`overlay-renderer.ts`](../src/lib/captions/overlay-renderer.ts) and
[`OverlayStudio.tsx`](../src/components/OverlayStudio.tsx):

- **Impact shake** (`shakeIntensity`, 0 = off): on every active-word onset
  the whole caption group flinches with a decaying sine (26 Hz, ~5% of the
  font size, dead after ~350 ms). Anchored to the word's acoustic start
  time — a pure function of `(t, word timings)`, so the live preview and
  the deterministic export agree exactly. Skipped in minimal mode.
- **Motion blur** (`motionBlurSamples`, 1 = off): at export time each
  output frame averages `samples` sub-frames across its exposure window
  (`Δt = 1/(fps·samples)`), exactly the blueprint's Phase-5 behavior.
  Paid only in the headless render, never in the live preview.
- **UI**: two new toggles in *Motion & effects* — **Impact shake** and
  **Motion blur** — plus the one-tap **Impact Shake** preset that combines
  both. All default to off: existing styles render pixel-identically to
  before.
- `calculateSpringScale` now delegates to the shared `springScale` (same
  curve, one source of truth).

### 3. Match cut / text highlighter — shared curve

[`easeHighlightSweep`](../src/lib/studio-sounds.ts) (the hand-stroke
highlighter sweep used by both newspaper tools, preview and export) now
delegates to the shared `easeInOutSine`. Identical output; the curve is
defined once for the whole suite.

## Recipes (the blueprint's prompts, answered)

**"When word X is spoken, add a shake"** — already wired for captions; for
any custom scene:

```ts
import { WordTimingIndex, impactShake, progressSince } from '@/lib/motion';

const idx = WordTimingIndex.fromCues(cues);
const hit = idx.onsetNear(t, 0.35);           // freshest word onset
const s = hit ? impactShake(t - hit.start, { amplitudePx: 12 }) : null;
// → ctx.translate(s.x, s.y); ctx.rotate(s.rot);
```

**"Key an animation between the timestamps of a phrase":**

```ts
const span = idx.lineOf('without opening After Effects')!;
const p = progressSince(t, span.start, span.end - span.start); // 0..1
// → mesh.rotation.y = easeOutExpo(p) * Math.PI;
```

**"Re-sync everything after re-recording the voiceover":** re-run
transcription/alignment in the captions tool — every shake, highlight and
blur re-anchors automatically. No keyframe numbers are ever edited.

**Determinism contract:** nothing in `src/lib/motion` reads a clock,
`Math.random()`, or frame counters. Identical `t` in, identical pixels out —
that is what lets the rAF preview and the WebCodecs frame-stepped exporter
stay in lockstep (and why motion blur lives only in the export path, where
sub-frame times are explicitly supplied).
