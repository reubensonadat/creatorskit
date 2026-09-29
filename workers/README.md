# Workers — the app's $0 backend (one Docker service)

This folder is the **Root Directory Render deploys**. Free tier = 750
instance-hours/month = exactly ONE always-on box, so every server-side
function lives here as its OWN sub-package with isolated routes, job
stores and models:

```
workers/
├─ Dockerfile        # bakes every module's models at build (disk is ephemeral)
├─ start.sh          # PO-token supervisor + uvicorn entrypoint
├─ app.py            # FastAPI shell + /health + the VIDEO routes
└─ captions/         # AUTO-CAPTIONS module (Whisper base.en int8)
   ├─ engine.py      # the only file that touches faster-whisper
   └─ routes.py      # POST /transcribe (+ one-time tickets) + job polling
```

**Video module** — yt-dlp (armed with the [bgutil PO-token
provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)) driven
by the `supabase/functions/video-grab` Edge Function:

| Route | What it does |
|---|---|
| `POST /formats` | free peek — which resolutions are downloadable (powers the bottom sheet) |
| `POST /resolve` | fetch + merge the chosen variant → one-time `/file/<id>` URL |
| `GET /file/<id>?t=` | the bytes (Range supported; files auto-delete after 15 min) |

**Captions module** — details in `docs/AUDIO_TRANSCRIPTION_PLAN.md`:

| Route | What it does |
|---|---|
| `POST /transcribe/ticket` | X-Worker-Token → one-time browser upload grant (real token never reaches client code) |
| `POST /transcribe` | multipart audio + ticket (or X-Worker-Token) → `{jobId, token}` instantly |
| `GET /transcribe/job/<id>?t=` | `{status, text, language, duration, words[]}` |

`GET /health` (open, no token) is the keep-alive ping + diagnostics
window: pot status, last yt-dlp error, and the `captions` block (model
loaded? baked at build? last error?).

**Isolation contract**: a module crash (missing wheel, bad model) only
fails its own routes — app.py imports each package in a try/except and
reports it via `/health` instead of taking the service down.

Protected routes need the `X-Worker-Token` header (the `WORKER_TOKEN`
secret) or a one-time ticket (captions uploads). Nothing stores anything
long-term — files vanish after their TTL.

> Hugging Face note: HF moved Docker Spaces behind a paid PRO plan, so we
> deploy on **Render (free, 24/7)** or **your own computer (free, zero
> signup)** instead. Same code everywhere.

---

## Option A — Your own computer, right now ($0, no signup, no card)

Works whenever the machine is on — perfect for building, testing, and
proving the whole grandma flow.

1. Install the Python deps (Python 3.11+ needed — you have it):
   ```bat
   cd workers
   python -m pip install -r requirements.txt
   ```
   (ffmpeg isn't installed on Windows by default — the app auto-uses a
   pip-bundled copy via `imageio-ffmpeg`, so you don't have to install anything else.)
2. Start the worker:
   ```bat
   python app.py
   ```
   → it listens on `http://localhost:8000`. Visit `/health` to see
   `{"ok": true, ...}`.
3. Make it public with a free Cloudflare quick tunnel (**no account needed**):
   ```bat
   winget install --id Cloudflare.cloudflared
   cloudflared tunnel --url http://localhost:8000
   ```
   It prints a `https://random-words.trycloudflare.com` URL — that's your
   live worker address while this window stays open.
4. Point the supervisor at it (Supabase dashboard → Edge Functions →
   video-grab → Secrets):
   ```
   VIDEO_WORKER_URL=https://random-words.trycloudflare.com
   VIDEO_WORKER_TOKEN=any-long-random-string-you-invent
   ```
   Also set that same string as an env var before starting the worker next
   time: `set WORKER_TOKEN=same-string` then `python app.py`.
5. Paste a YouTube link in /video-grabber → the sheet lists real resolutions.

## Option B — Render.com, free 24/7 ($0, no card)

1. Push this repo to GitHub (free account if you don't have one).
2. [render.com](https://render.com) → sign up **with GitHub** (no card asked
   for free services).
3. Dashboard → **New +** → **Web Service** → connect the repo.
4. Settings that matter — **in this order**:
   - **Root Directory: `workers` — type this FIRST.** Before you do,
     Render scans the repo root, guesses "Python 3", and shows a start
     command like `gunicorn …` — ignore all of that. The moment the root
     directory is set, Render re-scans, finds the **Dockerfile**, switches
     Language to Docker, and hides the build/start commands (the Dockerfile
     installs ffmpeg + the PO-token provider + bakes the Whisper model for
     you — native Python mode would skip all of it).
   - **Migrating the EXISTING service** (folder was renamed `video-worker/`
     → `workers/`): dashboard → your service → **Settings** → **Build &
     Deploy** → **Root Directory** → change to `workers` → save →
     **Manual Deploy → Deploy latest commit**. Nothing else changes: same
     URL (video-worker-xwv9.onrender.com), same `WORKER_TOKEN` env var,
     same Secret Files, same cron-job.org ping. If the field refuses to
     edit on an older service: create a NEW Web Service pointed at
     `workers/`, re-add `WORKER_TOKEN` + the cookies secret file, and
     delete the old service after the new one goes green.
   - The Compute list **pre-selects a $7/month plan** — that's a default,
     not a requirement. Click **Free · $0/month · 0.1 CPU · 512 MB** in the
     list before deploying. No card is ever asked for Free.
   - The pre-filled `PORT=10000` env var is Render's own injection — leave
     it alone (our start.sh listens on `$PORT` whatever it is).
   - Environment → **Add** Environment Variable: `WORKER_TOKEN` = a long
     random string you invent (save a copy — the worker is on the public
     internet now; this is its door key)
5. **Create Web Service** → wait for the build (~5 min) → you get
   `https://something.onrender.com`.
6. Supabase secrets:
   ```
   VIDEO_WORKER_URL=https://something.onrender.com
   VIDEO_WORKER_TOKEN=same-string-as-on-render
   ```
7. Keep-awake: free Render services sleep after 15 min idle. Make a free
   [cron-job.org](https://cron-job.org) job pinging
   `https://something.onrender.com/health` **every 10 minutes**. (If it ever
   did sleep anyway, the first paste takes ~1 minute to wake it — after
   that it's instant.)

## Option C — a real VPS later

When the ads have earned ~$10–15, rent a $4/mo box (Hetzner/RackNerd/
Hostinger), `curl -fsSL https://get.docker.com | sh`, run this same image,
and just update the two Supabase secrets.

---

## Maintenance

- **YouTube breaks yt-dlp every few weeks.** Fix on Render: edit
  `requirements.txt` (add a space, commit) → auto-rebuild pulls fresh
  yt-dlp. Locally: `python -m pip install -U yt-dlp`.
- One download runs at a time (serialized) — plenty for an ad-gated,
  quota-limited tool.
- Job files auto-delete after 15 minutes; nothing persists across restarts.
