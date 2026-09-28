# Video Grabber — Supervisor Edge Function

Ad-gated media downloads for CreatorKit. This function is the **supervisor**:
it enforces the ad-wait, mints one-time tickets, applies daily quotas, and
streams direct media files. It never stores video files.

## Architecture

```
Browser (/video-grabber)
  1. paste URL → metadata preview (noembed, client-side)
  2. AD GATE → POST { action:"challenge" }  → wait N seconds (ads shown)
  3. POST { action:"claim" } → ticket minted (quota counted)
       direct link  → streamUrl points back at this function (Range proxy)
       platform URL → VIDEO_WORKER_URL/resolve (Phase 2: yt-dlp + POT provider)
  4. GET ?tq=TICKET&u=URL → bytes streamed to the user's device
```

Tables (see `supabase/migrations/20260928000000_video_grabber.sql`):
`ad_challenges`, `download_tickets`, `download_quota`, `download_events`.
All are service-role only (RLS on, no policies) — anon keys can't touch them.

## Deploy

```bash
# 1. Run the migration (SQL editor or CLI)
supabase db push
#    …or paste supabase/migrations/20260928000000_video_grabber.sql into the SQL editor

# 2. Set the service-role secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role

# 3. Optional tuning
supabase secrets set WAIT_SECONDS=5 DAILY_LIMIT=15 TICKET_TTL_SECONDS=600
supabase secrets set APP_ORIGIN=https://creatorkit.win  # lock CORS in production

# 4. Deploy
supabase functions deploy video-grab --no-verify-jwt
```

`--no-verify-jwt` is required: the browser calls this with the anon key only,
and auth happens via the ad-challenge + ticket flow.

## Cloudflare notes (frontend hosting)

- The Next.js app deploys to **Cloudflare Pages** (`npm run pages:build` — the
  `@cloudflare/next-on-pages` script already exists in package.json).
- Cloudflare Pages/Workers **cannot run yt-dlp** (no subprocess). That's why
  the supervisor lives here on Supabase Edge, DB-adjacent.
- **Phase 2 muscle**: deploy a yt-dlp resolver (e.g. a Docker container on
  Cloudflare Containers, or any small VPS) and register it with:
  `supabase secrets set VIDEO_WORKER_URL=https://your-resolver.example`
  It must expose `POST /resolve` → `{ "streamUrl": "https://..." }`.
  Arm it with grqz's `bgutil-ytdlp-pot-provider` for YouTube PO tokens.

## Security

- SSRF guard: private/loopback hosts rejected; http(s) only.
- Anti-skip ad gate: tickets are minted only when `now >= not_before`
  (server clock, not client).
- One-time tickets: consumed atomically on first stream; 10-min TTL.
- Media-only proxy: HTML responses are refused (415) so this can't mirror sites.
- Quotas: hashed IPs, N downloads/day (atomic SQL upsert), full audit trail in
  `download_events`.
