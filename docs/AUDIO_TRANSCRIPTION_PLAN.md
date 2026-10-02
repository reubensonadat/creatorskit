# Server-side Transcription on $0 Compute — Decision Plan (2026-09-29)

> Context: video grabber is PAUSED (YouTube bot-walls the Render datacenter IP;
> see VIDEO_GRABBER_HANDOFF.md §8). The Render Docker service
> (video-worker-xwv9.onrender.com) stays up and is now the app's free backend
> muscle. This plan answers: "can I run a Hugging Face transcription model on
> free compute so auto-captions don't rely on the browser or paid Whisper?"

## The constraints (why this isn't a normal server)

| Limit | Value | Consequence |
|---|---|---|
| Render free RAM | **512 MB total** | uvicorn (~60MB) + ffmpeg + ONE model. Model must be ≤ ~250MB resident |
| Render free CPU | ~1 shared vCPU | base.en int8 transcribes ≈ 2–3× faster than realtime (10-min audio ≈ 3–5 min) |
| Render free hours | 750 instance-h/month | ≈ one always-on service. Keep everything in the ONE worker (cron-job.org already keeps it awake) |
| Disk | ephemeral | Models must be BAKED INTO the Docker image at build time (download during docker build), not fetched per-boot |
| Concurrency | just us | One transcription job at a time (reuse the existing job-lock pattern) |

## What fits in 512MB (measured ballparks, int8 quantized)

| Model | Weights | Peak RAM | Quality (English) | Fits worker? |
|---|---|---|---|---|
| whisper tiny.en | 42 MB | ~90 MB | rough | yes, easily |
| **whisper base.en (int8)** | 78 MB | **~150–180 MB** | good, = current browser model | **YES — recommended Phase 1** |
| whisper small.en (int8) | 250 MB | ~350–450 MB | clearly better, handles accents better | risky alongside uvicorn+ffmpeg → Phase 2 (HF Space) |
| whisper medium+ / LLMs / image-gen | GBs | — | — | no |

## Phase 1 (recommended): /transcribe on the existing Render worker

Stack: `faster-whisper` (pip, prebuilt CPU wheels, CTranslate2 int8) inside
the worker as its own isolated module: `workers/captions/` (engine.py +
routes.py) — see IMPLEMENTED below.

- **Bake at build time**: Dockerfile downloads `base.en` int8 from HuggingFace
  during `docker build` (same trick as the pot server — no per-boot download).
- **Endpoint**: `POST /transcribe` (X-Worker-Token, same as /formats) —
  browser uploads the EXTRACTED AUDIO ONLY (16k mono wav/mp3, ~10MB per
  10 min — the browser already decodes audio via WebAudio in the captions
  flow; uploading audio instead of video keeps payloads tiny).
- **Job pattern**: reuse the /resolve pattern — instant `{jobId, token}`,
  background thread, `GET /job/{id}` polling, TTL cleanup. One job at a time
  (lock) to protect the RAM ceiling.
- **Returns**: word-level `[{word, start, end}]` + text → feeds the EXISTING
  cue grouping (`groupWordsIntoSingleLineCues`) + `overlay-renderer` presets
  unchanged. Browser stays the compositor; the worker is just the engine.
- **Fallback wiring**: captions UI tries browser whisper first (fast on
  desktop, already cached), auto-falls back to worker on timeout/weak device
  (isMobile → go straight to server). This is the "browser fails → server"
  flow requested.
- **RAM guard**: lazy-load model on first request, unload after ~10 min idle
  so rembg (below) can use the slot later.

Why faster-whisper and not whisper.cpp: pure pip install (no compile step in
Docker on Render), same int8 sizes, CPU speed within ~20% — and one fewer
build thing to break (see: the pot saga).

## DECISION (2026-09-29): Render-only. HF is the model LIBRARY, not the runtime

User explored Hugging Face and found its runtime story (Docker Spaces /
persistent hardware) drifting behind paid/PRO tiers — trust confirmed low.
Model *downloads* from the HF hub remain free and stable, and that is ALL we
use HF for: the Dockerfile pulls weights at build time, exactly like the pot
server pulls its repo. No HF account, quota, wake-up, or pricing change can
break a running feature.

| | HF Space (runtime) | Render worker (chosen) |
|---|---|---|
| RAM | up to 16 GB free CPU | 512 MB hard ceiling |
| Trust | terms shifted before; Docker/persistence moving paid; PRO-gates | we control it; already deployed, monitored, token-protected |
| Sleep | sleeps after 48h idle; ~1 min re-wake | kept awake 24/7 by cron-job.org pings |
| Hours cost | separate quota | the same 750 h/month we already spend |
| Failure domain | another account + endpoint to babysit | one place, `/health` diagnostics |
| Best model | small.en / multilingual | base.en int8 (good, = current browser model) |

If quality later demands `small.en`, the upgrade is infrastructure-free:
swap the baked model on the worker for `tiny.en`+VAD chunking, or revisit a
VPS (the grabber handoff §8 endgame) — not an HF dependency.

## One service or several? (fault isolation on $0)

Render free = **750 instance-hours/month TOTAL**. One always-on service
consumes exactly that; two always-on services starve mid-month. So:

- **One Docker service, strictly separated route-modules** is the $0 answer:
  `/transcribe`, `/matte`, `/formats`/`/resolve` each get their own lock,
  job queue, model slot, and per-job error state. A failure in one route
  returns that job's error — it does not touch the others (the existing
  job pattern already behaves this way).
- The ONE shared-fate risk on 512MB is memory: therefore **at most one AI
  model resident at a time** (LRU unload after ~10 min idle). Transcription
  and matting never hold models simultaneously.
- If a service must be split later (real VPS), each route-module lifts out
  as its own container unchanged — the separation is in the code, so the
  migration is a copy, not a rewrite.

## Build order (user priority: auto-captions FIRST, everything after)

1. `/transcribe` on the worker + base.en baked at build + captions UI
   server-fallback wiring. ← THE next task
2. Caption preset expansion (more artistic overlays/textures; applies to
   match-cut + text-highlighter too) — user explicitly wants this after
   captions are solid.
3. `/matte` (rembg u2netp) for text-behind / background-replace.
4. ffmpeg offload for slicer/trimmer/match-cut exports; non-YouTube
   whitelist for the paused grabber.

## Same worker, other $0 services that fit the app's vision ("good enough" tools)

1. **/matte — background removal server-side** (fixes S21-freeze in
   text-behind / background-replace): `rembg` + `u2netp` (4.7MB model!) or
   `isnet-general-use` (~170MB). Browser POSTs the image, gets PNG-with-alpha
   back, all compositing/text-layering stays in canvas client-side.
   One-model-resident-at-a-time alongside whisper (LRU unload).
2. **ffmpeg offload** for carousel-slicer / silence-trimmer / match-cut
   exports on weak phones (encode server-side, stream back via the existing
   /file range-streaming).
3. **Non-YouTube downloads still work today**: the bot wall is YouTube-on-
   datacenter-IP specific. TikTok / Instagram / X / Facebook links can be
   whitelisted in the grabber UI right now with zero infra changes — the
   paused worker can still earn its keep.
4. **Piper TTS** (~60MB per voice) for teleprompter scratch voice-overs —
   optional, later.
5. Not feasible on 512MB: LLMs, Stable Diffusion, voice cloning. Don't try.

## Space Planner size (asked)

- `src/components/space-planner`: 26 files, ~587 KB
- `src/lib/space-planner`: 8 files, ~85 KB; page: ~2 KB → **~675 KB source
  (~20% of src/)**, no public assets (textures are procedural).
- Next.js route-splitting means it ships ONLY to visitors of /space-planner —
  it adds nothing to any other tool's bundle. Growing it into the
  architecture/building platform costs nothing elsewhere. Keep it.

## IMPLEMENTED (2026-09-29, later the same day) — worker side DONE

The repo folder `video-worker/` is now **`workers/`** — Render's Root
Directory must be changed to match (exact steps: workers/README.md
Option B "Migrating the EXISTING service").

- `workers/captions/engine.py` — lazy `WhisperModel('base.en', int8)`,
  `download_root=/models/captions` (baked at build; marker
  `CAPTIONS_MODEL_BAKED` in the Render build log; runtime-download
  fallback if the bake failed — the dir is chowned to uid 1000 for that).
  One lock serializes load+inference; idle unload after 600s
  (`WHISPER_IDLE_UNLOAD`); 30s fail-fast cooldown after a failed load so
  queued jobs don't hammer a dead Hugging Face; `.en` models skip language
  auto-detect (saves seconds); if word timestamps come back empty, segment-
  level pseudo-words keep the presets' cue generation alive.
- `workers/captions/routes.py` — instant-job pattern with its OWN store +
  sweeper (zero shared state with the video routes): `POST
  /transcribe/ticket` (X-Worker-Token → one-time 10-min browser upload
  grant, so the real token never reaches client code), `POST /transcribe`
  (multipart, streamed to disk in 1MB chunks — never held in RAM, 100MB
  cap ≈ 52 min of 16k mono, fast-429 backpressure at 3 unfinished jobs,
  client filename sanitized to a bare extension), `GET
  /transcribe/job/{id}?t=` → `{status, text, language, duration, words[]}`.
- `workers/app.py` — CORS now allows POST (browser uploads direct);
  imports the captions package inside a try/except (a module bug can't
  break the video routes); `/health` gains the `captions` block:
  `{loaded, model, baked, load_s, load_cooling_down, last_used_ago_s,
  last_error, dir}`.
- `workers/requirements.txt` — + `faster-whisper`, + `python-multipart`.
- Verified locally: `py_compile` on every file, `sh -n` on the Docker RUN
  mirror (scratch/capbake.sh) + start.sh, and a real import-boot test
  (routes registered, CAPTIONS_OK true, /health shape correct).

**Deploy checklist**: Root Directory → `workers` → Manual Deploy →
build log must print `CAPTIONS_MODEL_BAKED` → `/health` shows
`captions.baked: true`. Curl smoke test (token = your WORKER_TOKEN):

```bat
curl -s -X POST https://video-worker-xwv9.onrender.com/transcribe/ticket -H "X-Worker-Token: <token>"
curl -s -X POST "https://video-worker-xwv9.onrender.com/transcribe?ticket=<ticket>" -F "file=@clip.wav"
curl -s "https://video-worker-xwv9.onrender.com/transcribe/job/<jobId>?t=<jobToken>"
```

DONE (2026-10-02 audit — Session 9): the frontend wiring described below
is SHIPPED end-to-end; verified in code:

- `supabase/functions/video-grab/index.ts` — router action
  `captions-ticket` → `handleCaptionsTicket()`: WORKER_TOKEN stays
  server-side, mints the worker's one-time 10-min upload grant.
- `src/lib/captions/worker-transcribe.ts` — full client pipeline:
  ticket → DIRECT browser upload to the worker (decoded 16k-mono PCM
  re-encoded to 16-bit WAV ~32KB/s; raw-file fallback when the browser
  can't decode) → 2.5s job polling (15-min deadline, 45s contact-grace
  riding out free-tier container reboots, ONE automatic re-upload on
  upload_lost/job_lost/lost_contact) → words mapped through the SAME
  `groupWordsIntoSingleLineCues` (identical engine contract).
- `src/app/auto-captions/page.tsx` — SERVER is the DEFAULT engine;
  browser whisper is the silent fallback (2 auto-retries with the chip
  visibly flipping to Local); the LOCAL engine keeps browser-first with
  server rescue; `warmCaptionsWorker()` pings /health on mount so the
  ~50s cold start happens while the user picks a file. (Evolution of the
  plan's "desktop browser-first": server-first everywhere, since it's
  free and skips the model download; `prefersServerTranscription()`
  remains exported for any future per-device split.)
- Build-order item 1 of 4 CLOSED.

## Item 2 SHIPPED (2026-10-02, Session 9): caption preset expansion

`src/lib/captions/overlay-renderer.ts` gained an artistic active-word
vocabulary (kinetic-pop): `ActiveWordEffect = 'fill' | 'marker' | 'box'
| 'underline' | 'glow'` + `glowColor` + `tapeBackdrop` (translucent
masking-tape band behind the word window). The marker/box/underline/tape
treatments deliberately mirror match-cut's highlight styles and
text-highlighter's vocabulary — the suite reads as one design language.
`CAPTION_STYLE_PRESETS` grew 6 → 14: Marker Swipe, Neon Sign, Coach Box,
Swipe Underline, Tape Label, Karaoke Pop (teleprompter + wordPop), Clean
Studio (minimal mode's first preset), Ember Glow. Both studios
(auto-captions page + OverlayStudio) expose an "Active word" chip row
and a Tape backdrop toggle; presets carry the new fields through preview
AND export. Filtered tsc clean; build green 48/48.

Next per build order: item 3 — /matte (rembg u2netp) for
text-behind / background-replace (fixes S21-freeze).

Local-dev note: `workers/.venv` still carries its old absolute path in
`activate` (harmless — call `workers\.venv\Scripts\python.exe` directly, or
recreate the venv if `activate` complains).
