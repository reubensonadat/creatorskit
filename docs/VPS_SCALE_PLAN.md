# VPS Scale Plan — when the free tier dies and a KVM box takes over

The question: at ~1,000 users, does a cheap KVM VPS work? Which tier? What
runs simultaneously? And what better models does it unlock? This doc is the
decision sheet + the deployment architecture.

## 0. The premise that changes everything: browser-first

The architecture we already ship is **client-heavy**:

- Browser Whisper (WASM) absorbs most transcription attempts — the free
  fallback BEFORE the server.
- @imgly browser matting absorbs most cutouts (M3) — again before the server.
- Resizer, text-behind compositing, exports: 100% client-side already.

So 1,000 users ≠ 1,000 server jobs. Realistic server load at 1,000 MAU:
only the users whose browser failed, or who picked the server engine
deliberately. Expect **5–15% server hit-rate** → ~50–150 server jobs/month
peak-day bursts of maybe 3–8 **simultaneous**. That is the number the VPS
must survive — not 1,000.

## 1. The workloads (measured constraints)

| Job | Model | RAM per worker | CPU per job | Wall time (1 vCPU) |
|---|---|---|---|---|
| Transcribe | whisper base.en int8 | ~0.3 GB | 1 core | ~0.6–1.2× clip length |
| Transcribe | whisper **small.en** int8 | ~0.5 GB | 1 core | ~1.5–2.5× clip length |
| Transcribe | whisper **medium.en** int8 | ~1.0 GB | 1 core | ~4–6× clip length |
| Transcribe | whisper **large-v3-turbo** int8 | ~1.3 GB | 1 core | ~2–3.5× clip length |
| Matte | rembg **u2netp** (5 MB) | ~0.25 GB | 1 core | 1–3 s / image |
| Matte | rembg **u2net / isnet** (better edges) | ~0.7–1.0 GB | 1 core | 3–8 s / image |
| YouTube grab | yt-dlp + ffmpeg | ~0.3 GB | 1 core | 1–5 min |

Rules that fall out:

- **1 simultaneous action ≈ 1 vCPU + (0.3–1.3 GB depending on model).**
- One WhisperModel instance serializes (model lock) — concurrency = number
  of worker **processes** = RAM × processes ≤ tier RAM.
- Video-grab streaming is the **bandwidth** eater (GBs per job), not audio/
  images. NVMe holds the models + temp files comfortably on every tier.

## 2. Tier sheet — simultaneous actions & what unlocks

The user's exact scenario — **5 people at once: 3 transcribing + 2 matting**
— plus the 1,000-user burst target (up to ~8 simultaneous):

| Tier | Cores/RAM | Simultaneous actions (comfortable) | The 5-people scenario | Model ceiling | Verdict |
|---|---|---|---|---|---|
| KVM 1 — $6.49/mo | 1 / 4 GB | **1** (one whisper-base OR 1 matte, serialized queue) | ❌ 4 of 5 wait minutes | base/small; u2netp only | never buy — single core = single lane |
| KVM 2 — $8.99/mo | 2 / 8 GB | **2–3** (2 whisper-small workers, or 1 transcribe + 1–2 matte) | ⚠️ short queue, all finish <5 min | small; u2netp; full u2net barely | fine to start, ~≤2k MAU |
| KVM 4 — $12.99/mo | 4 / 16 GB | **4–6** (3–4 transcribe + 2 matte lanes) | ✅ yes, with headroom | **medium.en**, **large-v3-turbo**; u2net/isnet | **the 1,000-user tier** |
| KVM 8 — $25.99/mo | 8 / 32 GB | **8–12** (6 transcribe + 4 matte) | ✅ yes + bursts to 12 | everything CPU-sane at full quality | ~10k+ MAU / paying users |

Sweet spot: **KVM 4**. large-v3-turbo int8 on 4 cores ≈ today's quality ×2 at
small-model speed — captions quality jumps without a GPU. And u2net (not
u2netp) means hair-level cutouts for text-behind.

**Text-to-image: still no.** SDXL/Flux-class T2I needs a GPU; on CPU it is
minutes per image and would starve every other lane. T2I stays BYO-API
(Gemini via the existing `@google/genai` / user keys) even on KVM 8.

## 3. The architecture (VPS target state)

Same codebase, promoted from "one Render free service" to a compose stack:

```
                    ┌──────────────── Supabase edge (unchanged) ───────────────┐
                    │  tickets, secrets, rate-limit gate. Zero compute.        │
                    └───────┬───────────────────────────────────┬──────────────┘
                            │ one-time ticket                   │ worker URL
                            ▼                                   ▼
┌──────── KVM VPS (Ubuntu 24.04, Docker compose) ───────────────────────────────┐
│                                                                               │
│  caddy (443)  ── automatic TLS, reverse proxy, gzip                           │
│    ├─ /api/captions/*  → captions-worker  (uvicorn ×N, small/medium)          │
│    ├─ /api/matte/*     → matte-worker     (uvicorn ×M, u2net/isnet)           │
│    └─ /api/grab/*      → grab-worker      (app.py + pot server, unchanged)    │
│                                                                               │
│  N = floor((RAM − 2 GB OS/caddy) / model RAM)   ← scale by editing one env    │
│  M = 1–4 depending on tier                                                     │
│                                                                               │
│  Persistence: /models on NVMe (baked at boot if missing — the Dockerfile      │
│  already does this), /tmp/grab job files with the existing sweeper TTL.       │
└───────────────────────────────────────────────────────────────────────────────┘
```

Key points:

- **No new queue infra.** The ticket + job-poll pattern (`routes.py`) already
  IS a queue with TTL + sweeper. At ≤12 simultaneous, Postgres/Redis/RabbitMQ
  would be pure operational cost. Revisit only past ~15 concurrent.
- **Process pools, not threads** — one uvicorn process per model copy;
  `_model_lock` already serializes inside each process.
- **Workers stay stateless** — the VPS can die and be recreated from the
  Dockerfile + compose file in minutes (the Render decision doc constraint,
  preserved).
- **Rolling migration:** the edge function's worker URL is already a config
  value. Point it at `https://workers.yourdomain.com` — the site code doesn't
  change at all. Keep the Render free box deployed as a cold fallback (DNS
  flip back if the VPS ever dies).
- **The wake-ping** (`warmCaptionsWorker`) becomes unnecessary on the VPS —
  it never sleeps. Delete the cold-start UX once migrated.

## 4. compose sketch (KVM 4 example)

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data]

  captions:
    build: ./workers
    deploy:
      replicas: 3                      # 3 × small.en ≈ 1.5 GB
    environment:
      WHISPER_MODEL: small.en          # medium.en also fits on 16 GB
    command: uvicorn captions_api:app --host 0.0.0.0 --port 7860

  matte:
    build: ./workers
    deploy:
      replicas: 2                      # 2 × u2net ≈ 1.6 GB peak
    environment:
      MATTE_MODEL: u2net
    command: uvicorn matte_api:app --host 0.0.0.0 --port 7861

  grab:
    build: ./workers
    command: ./start.sh                # app.py + pot provider, unchanged
```

(M2's `matte.py` is written worker-agnostic — one module, mounted by either
the captions service or its own, so this split costs nothing later.)

## 5. Buy triggers — when to actually pay

Do NOT buy a VPS because the roadmap looks big. Buy when a **measured**
threshold trips:

1. **Render free hours exhausted** (750/mo) — check the Render dashboard.
2. **/health shows OOM or near-OOM** after M2 lands (matte + whisper
   contention on 512 MB).
3. **Queue wait > 60 s** at real traffic (users complaining in feedback).
4. **You ship a paid tier** — paying users cannot sit behind a 50 s cold
   start; that alone justifies KVM 2 at any traffic level.

Until one of those fires: Render free + browser-first is genuinely enough
for thousands of MAU, because the browser does the heavy lifting.

## 6. Recommendation

- **Today (launch, $0):** Render free + browser-first. No change.
- **First paying users:** KVM 2 ($8.99) — kills cold starts, 2–3 lanes.
- **~1,000 users (the stated scenario): KVM 4 ($12.99)** — 4–6 simultaneous
  actions (covers 3 transcribing + 2 matting with headroom), unlocks
  large-v3-turbo captions + u2net-quality cutouts, 16 TB bandwidth swallows
  the video-grab streaming.
- KVM 8 only when concurrent > 10 sustained or revenue pays for it.
- Renews jump (e.g. KVM 4 → $28.99 after 2 years): budget for it or plan to
  re-shop providers every renewal cycle — these deals are loss-leaders.

One VPS is one box — it can die. The architecture above keeps the Render
box warm as an instant DNS-fallback, exactly how the whisper bake survives
Render's ephemeral disk today.
