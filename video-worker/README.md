# Video Worker — the Phase-2 muscle

This service runs **yt-dlp** (armed with the [bgutil PO-token
provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) so YouTube
doesn't block its datacenter IP). The supervisor Edge Function
(`supabase/functions/video-grab`) calls it when someone pastes a platform
link (YouTube/TikTok/…):

| Route | What it does |
|---|---|
| `POST /formats` | free peek — which resolutions are downloadable (powers the bottom sheet) |
| `POST /resolve` | fetch + merge the chosen variant → one-time `/file/<id>` URL |
| `GET /file/<id>?t=` | the bytes (Range supported; files auto-delete after 15 min) |
| `GET /health` | keep-alive ping target (open, no token) |

All protected routes need the `X-Worker-Token` header (the `WORKER_TOKEN`
secret). Nothing here stores anything long-term — files vanish after 15 min.

> Hugging Face note: HF moved Docker Spaces behind a paid PRO plan, so we
> deploy on **Render (free, 24/7)** or **your own computer (free, zero
> signup)** instead. Same code everywhere.

---

## Option A — Your own computer, right now ($0, no signup, no card)

Works whenever the machine is on — perfect for building, testing, and
proving the whole grandma flow.

1. Install the Python deps (Python 3.11+ needed — you have it):
   ```bat
   cd video-worker
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
   - **Root Directory: `video-worker` — type this FIRST.** Before you do,
     Render scans the repo root, guesses "Python 3", and shows a start
     command like `gunicorn …` — ignore all of that. The moment the root
     directory is set, Render re-scans, finds the **Dockerfile**, switches
     Language to Docker, and hides the build/start commands (the Dockerfile
     installs ffmpeg + the PO-token provider for you — native Python mode
     would skip both).
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
