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
`video-worker/app.py`.

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

## Phase 2 (free upgrade path, ALSO $0): Hugging Face Space as the big engine

HF Spaces free tier = **2 vCPU + 16 GB RAM** (noisy neighbors, sleeps after
48h idle — first request re-wakes it in ~30–60s).

- A tiny Space (Gradio/FastAPI) running `faster-whisper small.en` int8
  (or even multilingual `small`) — better accents/quality than base.en,
  impossible on Render's 512MB.
- The Render worker proxies to it (browser only ever knows the worker URL +
  token): try Space → if asleep/slow, use local base.en. Zero new accounts
  for end users; the Space stays private-ish behind the worker.
- HF is also where the model weights already live — "create a new repository"
  on HF is literally one `git push` of a 3-file Space.

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

## Build-order proposal

1. Worker `/transcribe` + base.en int8 baked + captions fallback wiring. ← next session
2. Worker `/matte` (u2netp) + text-behind/background-replace "server mode".
3. Caption preset expansion (more artistic overlays/textures — applies to
   match-cut + text-highlighter too).
4. HF Space small.en upgrade + proxy.
