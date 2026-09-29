# Video Grabber — Full State Handoff (2026-09-29)

> Purpose: complete memory transfer for a fresh chat session. Read this top to
> bottom before touching anything. The user is a Ghana-based student on a $0
> budget (no card). Keep suggestions free-tier only unless they say otherwise.

## 1. What this system is (plain language)

The Video Grabber lets a user paste a YouTube link, watch one ad, and download
the file. Pipeline:

```
Browser (creatorskit.pages.dev)
  → Supabase Edge Function "video-grab" (the supervisor, rate-limits + ads)
  → Render Docker worker (video-worker-xwv9.onrender.com)
      → yt-dlp + ffmpeg (does the actual YouTube download)
```

- Edge function: `https://lnfzixiwmdxoqoueadkq.supabase.co/functions/v1/video-grab`
  Actions: `challenge` → `claim` → `formats` (plain JSON POST bodies, no auth
  headers; JWT verify off). Source: `supabase/functions/video-grab/index.ts`.
- Worker: FastAPI, source `video-worker/app.py`, Dockerfile `video-worker/Dockerfile`,
  boot script `video-worker/start.sh`. Protected by `X-Worker-Token` header
  (the token lives in Supabase secrets + Render env; we do NOT have it in chat).
- Deploy path: push to GitHub main → Render **Manual Deploy** (auto-deploy has
  repeatedly NOT fired — always remind the user to deploy manually).
- IMPORTANT: the browser console always shows these as "502 Bad Gateway".
  Our supervisor intentionally returns HTTP 502 with a JSON body containing the
  real yt-dlp error. Read the JSON body, not the status code.

## 2. The entire problem in one paragraph

YouTube bot-walls known datacenter IPs (Render = AWS). yt-dlp from that IP gets
interstitials instead of video data. We mounted browser cookies (a Render
Secret File) so YouTube sees a logged-in real account — that WORKED (one full
live download confirmed). But YouTube keeps serving alternating interstitials
to the session. The two observed errors:

1. `ERROR: [youtube] ...: Sign in to confirm you're not a bot` — auth/session
   rejection (bot wall).
2. `ERROR: [youtube] ...: The page needs to be reloaded` — playability
   interstitial (auth passed; the page state is rejected).

The error FLIP-FLOPS between the two on consecutive attempts. That alternation
is typical for a flagged datacenter session and is exactly what the remaining
counters (below) target.

## 3. Current exact state

Deployed on Render (live, healthy): commit `c245e01` —
`/health` returns `{"ok":true,"ytdlp":"2026.08.19","pot":"down","cookies":true}`.
`cookies:true` = Secret File mounted and the writable-copy mechanism works.
`pot:"down"` = the bgutil PO-token provider is not running (build silently
failed; see §5).

Sitting in the local working tree, **py_compile OK, NOT yet pushed/deployed**:

1. `video-worker/app.py`
   - `_cookie_args()` (line ~112): working copy at `/tmp/grab/cookies.txt` is
     re-copied from the Secret File on EVERY call (no mtime gate — a poisoned
     rotation can never outlive a re-paste).
   - `_CLIENT_FALLBACKS` + `_is_playability_wall()` + `_run_ytdlp(args, url,
     timeout)` (line ~146): on a playability wall, retries via
     `youtube:player_client=tv` then `web_embedded`. `_probe_meta()` uses the
     same ladder. Resolve call site passes `url` separately now.
2. `video-worker/Dockerfile` pot-build step now prints `POT_BUILD_OK` /
   `POT_BUILD_FAILED` and busts the cached layer, so the next deploy SHOWS the
   tsc errors that `|| true` used to swallow. That output is the root cause of
   `pot:"down"` — capture it from the Render build log.

Also unpushed (frontend): `public/sw.js` v5 (respondWith never resolves
undefined) and `src/app/teleprompter/page.tsx` (mobile voice-recognition
hardening + mobile eyeline at 1/3 screen height). These ride the same push.

**THE ONE PENDING ACTION: commit + push everything above, Render Manual
Deploy, watch the build log for POT_BUILD_OK/FAILED.**

## 4. What has been tried (so we never re-litigate)

| Attempt | Result |
|---|---|
| Bare yt-dlp from Render | Bot wall, instantly |
| bgutil pip plugin (`bgutil-ytdlp-pot-provider` in requirements.txt — name is CORRECT, verified vs upstream README; do not "fix" it) | Installed, but the Node server half never built → pot:down |
| cookies.txt as Render Secret File at `/etc/secrets/cookies.txt`, passed with `--cookies` | First run: full successful live download ("Live & successful"). Second run: `OSError: [Errno 30] Read-only file system` (yt-dlp writes rotated cookies back) |
| Writable /tmp copy + mtime re-sync | Deployed; worked, but a poisoned rotation had newer mtime than the secret, so bad tokens outlived every re-paste |
| Always re-copy from secret (current tree) | Not yet deployed |
| Fresh cookie re-export (user re-pasted Secret File, manual deploy c245e01) | Auth PASSED — error changed to "The page needs to be reloaded", then flip-flopped back to bot wall on next try |
| Client fallback ladder (current tree) | Not yet deployed |

## 5. The two remaining moves, in order

**Move A — deploy the pending tree (§3) and read the pot build log.**
If `POT_BUILD_OK` appears and `/health` shows `pot:up`, the bgutil provider
generates PO tokens server-side and is THE documented cure for both walls on
datacenter IPs. If `POT_BUILD_FAILED`, the compiler errors printed above the
marker are the next fix (upstream repo: Brainicism/bgutil-ytdlp-pot-provider;
server lives at /pot, must produce /pot/build/main.js, start.sh boots it on
127.0.0.1:4416, plugin calls it automatically).

**Move B — User-Agent match (documented in yt-dlp FAQ, not yet tried).**
The FAQ section on Cloudflare 403s says: cookies must be fresh (<30 min from a
live browser session) AND yt-dlp must send the SAME User-Agent as the browser
that exported them (`--user-agent "Mozilla/5.0 ... Chrome/<exact>"`). We never
passed a UA. Implementation: add `['--user-agent', UA]` inside `_cookie_args()`
or next to it in the arg builders, with UA = the user's Chrome-on-Windows
string (get it from chrome://version on their machine — we have shell access).
Combine with one more fresh cookie export.

**If both fail:** the Render datacenter IP itself is flagged. Stop retrying
(spamming deepens session flags and can burn the spare Google account). The
endgame the user already scoped: a Hostinger ~$7/mo VPS (4GB, dedicated IP,
SSH, same Docker image) — migration is just: run the same container, set
`VIDEO_WORKER_URL` in Supabase secrets to the VPS URL. The user is $0-budget,
so present it as their decision, not a push.

## 6. Test video + verification sequence

- Test URL: `https://youtu.be/hpizhAkXQJw` ("He Was Racially Profiled")
- Health: `curl -s https://video-worker-xwv9.onrender.com/health`
- Formats: POST `{"action":"formats","url":"https://www.youtube.com/watch?v=hpizhAkXQJw"}` to the edge endpoint
  (success = real ladder 1080p/720p/...; failure = best+MP3-only in UI)
- Full claim: POST `action:challenge` → wait `waitSeconds` → POST
  `action:claim` with challengeId + variantId `"best"`.
- Windows cmd quirks: escape JSON quotes as `\"`; `ping -n N 127.0.0.1 >nul`
  as sleep; curl needs `-m` timeouts; never pass `cwd: "null"`.

## 7. Guardrails learned the hard way

- Never put `continuous:true` on mobile speech recognition (user's proven
  model: `continuous = !isMobileDevice` + ~20ms restarts — do not touch).
- Render auto-deploy is unreliable → always Manual Deploy.
- The user watches their commit history — never break staged work; check
  `git log`/`git status` before claiming a regression.
- Cookie tokens have passed through chat → user should rotate that spare
  account's session when this saga ends.
- next.config.ts has `typescript.ignoreBuildErrors: true`; TS1005 parse errors
  still break builds; lucide `Image` must be aliased (`Image as ImageIcon`).
- Browser 502s from our edge function CARRY the real error in the JSON body.
- The user is tired and wants plain language: explain WHAT each step is for
  before doing it.
