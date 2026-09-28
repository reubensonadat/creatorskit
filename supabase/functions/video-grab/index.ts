// =============================================================
// CreatorKit · Video Grabber — SUPERVISOR Edge Function
// Deployed manually via Supabase Dashboard (CLI gave up on us).
// Flow (ad-gated downloads):
//   1. POST { action: "challenge", url }  → quota check + issue ad challenge (wait 5 seconds)
//   2. POST { action: "claim", url, challengeId } → verify wait elapsed → mint one-time ticket
//        · direct file links  → returns a self-stream URL (this function proxies the bytes)
//        · platform links     → if VIDEO_WORKER_URL is set (Phase 2 yt-dlp muscle),
//                               asks the worker to resolve; else returns 501 worker_offline
//   3. GET  ?tq=TICKET&u=URL → validate ticket → stream bytes with Range support
// Env: SUPABASE_SERVICE_ROLE_KEY (required), APP_ORIGIN, WAIT_SECONDS,
//      DAILY_LIMIT, TICKET_TTL_SECONDS, VIDEO_WORKER_URL (all optional)
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const WAIT_SECONDS = parseInt(Deno.env.get('WAIT_SECONDS') ?? '5', 10);
const DAILY_LIMIT = parseInt(Deno.env.get('DAILY_LIMIT') ?? '15', 10);
const TICKET_TTL = parseInt(Deno.env.get('TICKET_TTL_SECONDS') ?? '600', 10);
const CHALLENGE_TTL = 180;
const WORKER_URL = (Deno.env.get('VIDEO_WORKER_URL') ?? '').replace(/\/+$/, '');
const WORKER_TOKEN = Deno.env.get('VIDEO_WORKER_TOKEN') ?? '';
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? '*';

// Public origin of this function. Do NOT use req.url inside edge runtime —
// it reflects the internal gateway (http:// + path without /functions/v1).
const FN_ORIGIN = (SUPABASE_URL || 'https://lnfzixiwmdxoqoueadkq.supabase.co').replace(/\/+$/, '');

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ── helpers ─────────────────────────────────────────────────

const cors = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
}

const IP_SALT = SUPABASE_URL || 'creatorkit-local';
const hashIp = (ip: string) => sha256(`ip:${IP_SALT}:${ip}`);
const hashUrl = (url: string) => sha256(`url:${url.trim().toLowerCase()}`);

function detectPlatform(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  })();
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
  if (/tiktok\.com$/.test(host)) return 'tiktok';
  if (/instagram\.com$/.test(host)) return 'instagram';
  if (/twitter\.com$|x\.com$/.test(host)) return 'x';
  if (/facebook\.com$|fb\.watch$/.test(host)) return 'facebook';
  if (/vimeo\.com$/.test(host)) return 'vimeo';
  if (/reddit\.com$|redd\.it$/.test(host)) return 'reddit';
  if (/soundcloud\.com$/.test(host)) return 'soundcloud';
  if (/\.(mp4|webm|m4v|mov|mkv|mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(url)) return 'direct';
  return 'other';
}

/** Basic SSRF guard: block private/loopback targets & non-HTTP(S) schemes. */
function isSafeUpstream(rawUrl: string): { ok: boolean; url?: URL; reason?: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'bad_scheme' };
  const h = url.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return { ok: false, reason: 'private_host' };
  }
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')
  ) {
    return { ok: false, reason: 'private_host' };
  }
  return { ok: true, url };
}

function randomTicket(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeFilename(url: URL, contentType: string): string {
  const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
  const cleaned = last.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  if (cleaned && /\.[a-z0-9]{2,5}$/i.test(cleaned)) return cleaned;
  const ext = (contentType.split('/')[1] ?? 'bin').split(';')[0].replace('quicktime', 'mov');
  return `creatorkit-download.${ext || 'bin'}`;
}

async function logEvent(outcome: string, opts: { platform?: string; urlHash?: string; ipHash?: string; bytes?: number } = {}) {
  try {
    await admin.from('download_events').insert({
      outcome,
      platform: opts.platform ?? null,
      url_hash: opts.urlHash ?? null,
      ip_hash: opts.ipHash ?? null,
      bytes: opts.bytes ?? 0,
    });
  } catch { /* analytics must never break the pipeline */ }
}

// ── actions ─────────────────────────────────────────────────

type VariantLike = { id: string; label: string; kind: 'video' | 'audio'; streamUrl?: string; sizeBytes?: number };

/** Normalize a resolver's format list into safe variant objects.
 * streamUrl is optional: /formats lists resolutions BEFORE they exist. */
function sanitizeVariants(list: unknown): VariantLike[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((v: any) => v && (typeof v.id === 'string' || typeof v.label === 'string'))
    .slice(0, 12)
    .map((v: any, i: number) => ({
      id: typeof v.id === 'string' ? v.id : `v${i}`,
      label: typeof v.label === 'string' ? v.label : `Option ${i + 1}`,
      kind: v.kind === 'audio' ? ('audio' as const) : ('video' as const),
      streamUrl: typeof v.streamUrl === 'string' ? v.streamUrl : undefined,
      sizeBytes: typeof v.sizeBytes === 'number' ? v.sizeBytes : undefined,
    }));
}

async function handleChallenge(req: Request, body: { url?: string }) {
  const ipHash = await hashIp(clientIp(req));
  const check = isSafeUpstream(body.url ?? '');
  if (!check.ok) {
    await logEvent('denied_bad_url', { ipHash });
    return json({ error: 'That link is not a valid public media URL.', code: check.reason }, 400);
  }
  const url = check.url!;
  const urlHash = await hashUrl(url.toString());

  // Daily quota
  const { data: quota } = await admin
    .from('download_quota')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('day', new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const used = quota?.count ?? 0;
  if (used >= DAILY_LIMIT) {
    await logEvent('denied_quota', { ipHash, urlHash });
    return json({ error: `Daily limit reached (${DAILY_LIMIT} downloads/day). Come back tomorrow.`, code: 'quota' }, 429);
  }

  // Housekeeping: sweep stale challenges
  await admin.from('ad_challenges').delete().lt('expires_at', new Date(Date.now() - 86_400_000).toISOString());

  const now = Date.now();
  const { data: challenge, error } = await admin
    .from('ad_challenges')
    .insert({
      url_hash: urlHash,
      ip_hash: ipHash,
      // Ad-wait is advisory with grace: the frontend locks 5s, the server
      // forgives 2 — a clock/network race must NEVER lock a real user out.
      not_before: new Date(now + Math.max(1, WAIT_SECONDS - 2) * 1000).toISOString(),
      expires_at: new Date(now + CHALLENGE_TTL * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (error || !challenge) return json({ error: 'Could not create challenge. Try again.', code: 'db' }, 500);

  return json({
    challengeId: challenge.id,
    waitSeconds: WAIT_SECONDS,
    remainingToday: Math.max(0, DAILY_LIMIT - used - 1),
  });
}

async function handleClaim(req: Request, body: { url?: string; challengeId?: string; variantId?: string }) {
  const ipHash = await hashIp(clientIp(req));
  const check = isSafeUpstream(body.url ?? '');
  if (!check.ok) return json({ error: 'Invalid URL.', code: check.reason }, 400);
  const url = check.url!;
  const urlHash = await hashUrl(url.toString());

  if (!body.challengeId) return json({ error: 'Missing challenge.', code: 'challenge' }, 400);

  const { data: challenge } = await admin
    .from('ad_challenges')
    .select('id, url_hash, not_before, expires_at, claimed, claimed_at')
    .eq('id', body.challengeId)
    .eq('ip_hash', ipHash)
    .maybeSingle();

  const now = new Date();
  if (!challenge) return json({ error: 'Challenge not found. Restart the download.', code: 'challenge' }, 410);
  // A used challenge may be RE-CLAIMED for a short window: if the engine
  // hiccuped (530/524/…) the user already paid the ad — retrying must never
  // force them to watch it again. Trust the frontend, count quota on success.
  const reclaim = !!challenge.claimed;
  if (reclaim) {
    const claimedAt = challenge.claimed_at ? new Date(challenge.claimed_at).getTime() : 0;
    if (claimedAt && now.getTime() - claimedAt > 10 * 60_000) {
      return json({ error: 'This unlock expired. Restart the download.', code: 'challenge' }, 410);
    }
  }
  if (now > new Date(challenge.expires_at)) return json({ error: 'Challenge expired. Restart the download.', code: 'challenge' }, 410);
  if (now < new Date(challenge.not_before)) {
    // The ad-wait was skipped — refuse early claims.
    return json({ error: 'Ad watch not completed yet.', code: 'too_early' }, 425);
  }
  if (challenge.url_hash !== urlHash) return json({ error: 'Challenge does not match this URL.', code: 'challenge' }, 400);

  // Consume challenge (first claim only — re-claims skip this)
  if (!reclaim) {
    const { error: consumeErr } = await admin
      .from('ad_challenges')
      .update({ claimed: true, claimed_at: now.toISOString() })
      .eq('id', challenge.id)
      .eq('claimed', false);
    if (consumeErr) return json({ error: 'Challenge conflict. Restart.', code: 'challenge' }, 409);
  }

  // (quota is counted only on SUCCESS — see both return paths below)

  const platform = detectPlatform(url.toString());

  // ── Platform links (YouTube/TikTok/…) need the Phase 2 muscle ──
  if (platform !== 'direct') {
    if (!WORKER_URL) {
      await logEvent('worker_offline', { platform, urlHash, ipHash });
      return json({
        error: 'Platform engines are not connected yet. Direct file links (.mp4/.webm/.mp3) work right now.',
        code: 'worker_offline',
      }, 501);
    }
    try {
      // Kick off the job — the worker answers instantly and finishes in the
      // background. (A held-open request dies at ~100s behind Cloudflare
      // proxies: that was the 524.)
      let startRes = await fetch(`${WORKER_URL}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WORKER_TOKEN ? { 'X-Worker-Token': WORKER_TOKEN } : {}),
        },
        body: JSON.stringify({ url: url.toString(), platform, variantId: body.variantId }),
      });
      if (!startRes.ok) {
        // Transient tunnel error (530 etc.)? One immediate retry before failing.
        await new Promise((r) => setTimeout(r, 2000));
        startRes = await fetch(`${WORKER_URL}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(WORKER_TOKEN ? { 'X-Worker-Token': WORKER_TOKEN } : {}),
          },
          body: JSON.stringify({ url: url.toString(), platform, variantId: body.variantId }),
        });
        if (!startRes.ok) throw new Error(`worker_${startRes.status}`);
      }
      const start = await startRes.json();
      // Poll every 2s (typical resolve: 10–90s; datacenter hosts are faster).
      // TIME budget, not an iteration count: the platform kills this function
      // at ~150s wall clock and each poll round-trip costs 2–3s — a fixed
      // 65-iteration loop overran it (that was the user's 504). Stop polling
      // at 100s and hand the job to the browser (pending), which can wait
      // as long as the worker needs.
      const deadline = Date.now() + 100_000;
      let data: any = null;
      let misses = 0;
      let tick = 0;
      while (Date.now() < deadline) {
        // Adaptive backoff: quick ticks at first (datacenter hosts answer in
        // 5–30s), then gentler — polite to free tiers under load.
        await new Promise((r) => setTimeout(r, tick < 10 ? 2000 : tick < 30 ? 3000 : 5000));
        tick++;
        const poll = await fetch(
          `${WORKER_URL}/job/${start.jobId}?t=${encodeURIComponent(start.token)}`,
          { headers: { ...(WORKER_TOKEN ? { 'X-Worker-Token': WORKER_TOKEN } : {}) } },
        );
        if (!poll.ok) {
          // A single tunnel hiccup (530/502) must not kill the claim — the
          // job keeps running on the worker. Only give up after a streak.
          misses++;
          if (misses >= 5) throw new Error(`worker_${poll.status}`);
          continue;
        }
        misses = 0;
        const j = await poll.json();
        if (j.status === 'failed') throw new Error(String(j.error ?? 'worker_failed').slice(0, 200));
        if (j.status === 'ready') { data = j; break; }
      }
      if (!data) {
        // Still processing after ~130s of polling — the platform kills this
        // function at 150s, so waiting longer here is impossible. Instead of
        // failing, HAND THE JOB TO THE BROWSER: the page polls the worker
        // directly (its per-job token is the credential) and downloads the
        // moment the file is ready. Slow home-hosted workers survive this
        // way; a Render datacenter usually finishes long before this branch.
        await logEvent('worker_pending', { platform, urlHash, ipHash });
        await admin.rpc('increment_download_quota', { p_ip_hash: ipHash });
        return json({
          mode: 'worker',
          pending: true,
          jobId: start.jobId,
          jobToken: start.token,
          workerBase: WORKER_URL.replace(/\/+$/, ''),
          platform,
          expiresInSeconds: 600,
        });
      }
      if (!data.streamUrl) throw new Error('engine busy — pick a smaller resolution and retry');
      await logEvent('worker_pass', { platform, urlHash, ipHash });
      await admin.rpc('increment_download_quota', { p_ip_hash: ipHash });
      // Resolution selector: the resolver may return several formats
      // (e.g. 1080p / 720p / audio-only). Pass them through when present.
      const variants = sanitizeVariants(data.variants);
      return json({
        mode: 'worker',
        streamUrl: data.streamUrl,
        variants: variants.length ? variants : [{ id: 'original', label: 'Original', kind: 'video', streamUrl: data.streamUrl }],
        platform,
        expiresInSeconds: TICKET_TTL,
      });
    } catch (err) {
      await logEvent('stream_error', { platform, urlHash, ipHash });
      return json({ error: `Resolver failed: ${(err as Error).message}`, code: 'worker_error' }, 502);
    }
  }

  // ── Direct links: mint a one-time ticket streamed by this function ──
  const ticket = randomTicket();
  const { error: ticketErr } = await admin.from('download_tickets').insert({
    ticket,
    url_hash: urlHash,
    ip_hash: ipHash,
    expires_at: new Date(Date.now() + TICKET_TTL * 1000).toISOString(),
  });
  if (ticketErr) return json({ error: 'Could not mint ticket.', code: 'db' }, 500);

  await logEvent('granted', { platform, urlHash, ipHash });
  await admin.rpc('increment_download_quota', { p_ip_hash: ipHash });

  const streamUrl = `${FN_ORIGIN}/functions/v1/video-grab?tq=${ticket}&u=${encodeURIComponent(url.toString())}`;
  // Best-effort size probe (HEAD) so the page can show size + time estimates.
  let sizeBytes: number | undefined;
  try {
    const head = await fetch(url.toString(), { method: 'HEAD' });
    const cl = head.headers.get('content-length');
    if (cl && Number(cl) > 0) sizeBytes = Number(cl);
  } catch {
    /* size simply stays unknown */
  }

  // Direct files ship in exactly one quality. Video files additionally offer
  // an "audio" pick — same stream, saved by the browser with an .mp3 name.
  const ext = (url.pathname.match(/\.([a-z0-9]{2,5})$/i) ?? [])[1] ?? 'mp4';
  const isAudioFile = /\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(url.pathname);
  const variants = isAudioFile
    ? [{ id: 'original', label: `Audio · ${ext.toUpperCase()}`, kind: 'audio', streamUrl, sizeBytes }]
    : [
      { id: 'original', label: `Video · ${ext.toUpperCase()}`, kind: 'video', streamUrl, sizeBytes },
      { id: 'audio', label: 'Audio track · MP3', kind: 'audio', streamUrl, sizeBytes },
    ];
  return json({ mode: 'direct', streamUrl, variants, platform, expiresInSeconds: TICKET_TTL });
}

// ── Pre-ad format peek: which resolutions CAN be downloaded? ──
// Free metadata call (no challenge, no quota) — powers the bottom sheet.
async function handleFormats(req: Request, body: { url?: string }) {
  const check = isSafeUpstream(body.url ?? '');
  if (!check.ok) return json({ error: 'Invalid URL.', code: check.reason }, 400);
  const url = check.url!;
  const platform = detectPlatform(url.toString());

  if (platform === 'direct') {
    const ext = (url.pathname.match(/\.([a-z0-9]{2,5})$/i) ?? [])[1] ?? 'mp4';
    const isAudio = /\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(url.pathname);
    return json({
      platform,
      variants: isAudio
        ? [{ id: 'audio', label: `Audio · ${ext.toUpperCase()}`, kind: 'audio' }]
        : [{ id: 'video', label: `Video · ${ext.toUpperCase()}`, kind: 'video' }],
    });
  }
  if (!WORKER_URL) return json({ error: 'Platform engines not connected yet.', code: 'worker_offline' }, 501);
  try {
    const res = await fetch(`${WORKER_URL}/formats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_TOKEN ? { 'X-Worker-Token': WORKER_TOKEN } : {}),
      },
      body: JSON.stringify({ url: url.toString(), platform }),
    });
    if (!res.ok) throw new Error(`worker_${res.status}`);
    const data = await res.json();
    await logEvent('formats', { platform });
    return json({ platform, variants: sanitizeVariants(data.variants) });
  } catch (err) {
    return json({ error: `Could not read formats: ${(err as Error).message}`, code: 'worker_error' }, 502);
  }
}

// ── Free preview: first 256KB so the page can paint the opening frame ──
// No ticket, no quota — a tiny capped slice, media types only.
async function handleProbe(rawUrl: string): Promise<Response> {
  const check = isSafeUpstream(rawUrl);
  if (!check.ok) return json({ error: 'Invalid URL.', code: check.reason }, 400);
  const target = check.url!;
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { headers: { Range: 'bytes=0-262143' }, redirect: 'follow' });
  } catch {
    return json({ error: 'Could not reach the file host.', code: 'upstream' }, 502);
  }
  const contentType = upstream.headers.get('content-type') ?? '';
  const media = /^(video\/|audio\/|application\/octet-stream)/.test(contentType);
  if ((!upstream.ok && upstream.status !== 206) || !media) {
    return json({ error: 'No preview available for this link.', code: 'not_media' }, 415);
  }
  const out = new Headers();
  out.set('Content-Type', contentType);
  out.set('Accept-Ranges', 'bytes');
  out.set('Cache-Control', 'public, max-age=3600');
  const cl = upstream.headers.get('content-length');
  if (cl) out.set('Content-Length', cl);
  const cr = upstream.headers.get('content-range');
  if (cr) out.set('Content-Range', cr);
  for (const [k, v] of Object.entries(cors)) out.set(k, v);
  out.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  await logEvent('probe', {});
  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers: out });
}

async function handleStream(req: Request): Promise<Response> {
  const self = new URL(req.url);
  const ticketId = self.searchParams.get('tq') ?? '';
  const rawUrl = self.searchParams.get('u') ?? '';
  if (self.searchParams.get('probe') === '1') return await handleProbe(rawUrl);
  if (!ticketId || !rawUrl) return json({ error: 'Missing ticket or url.', code: 'stream' }, 400);

  const check = isSafeUpstream(rawUrl);
  if (!check.ok) return json({ error: 'Invalid URL.', code: check.reason }, 400);
  const target = check.url!;
  const urlHash = await hashUrl(target.toString());

  const { data: ticket } = await admin
    .from('download_tickets')
    .select('ticket, url_hash, status, expires_at')
    .eq('ticket', ticketId)
    .maybeSingle();

  if (!ticket || ticket.status !== 'active') return json({ error: 'Ticket invalid or already used.', code: 'ticket' }, 403);
  if (new Date() > new Date(ticket.expires_at)) {
    await admin.from('download_tickets').update({ status: 'expired' }).eq('ticket', ticketId);
    return json({ error: 'Ticket expired. Unlock again.', code: 'ticket' }, 403);
  }
  if (ticket.url_hash !== urlHash) return json({ error: 'Ticket does not match this URL.', code: 'ticket' }, 403);

  // Burn the ticket (one download per ad watch)
  const { error: burnErr } = await admin
    .from('download_tickets')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('ticket', ticketId)
    .eq('status', 'active');
  if (burnErr) return json({ error: 'Ticket conflict.', code: 'ticket' }, 409);

  // Fetch upstream with Range passthrough
  const headers: Record<string, string> = {};
  const range = req.headers.get('range');
  if (range) headers['Range'] = range;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { headers, redirect: 'follow' });
  } catch {
    await logEvent('stream_error', { urlHash });
    return json({ error: 'Could not reach the file host.', code: 'upstream' }, 502);
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const mediaOk = /^(video\/|audio\/|application\/octet-stream)/.test(contentType) || upstream.status === 206;
  if (!upstream.ok && upstream.status !== 206) {
    await logEvent('stream_error', { urlHash });
    return json({ error: `File host returned ${upstream.status}.`, code: 'upstream' }, 502);
  }
  if (!mediaOk) {
    await logEvent('stream_error', { urlHash });
    return json({ error: 'That URL is not a direct media file. Paste a link ending in .mp4/.webm/.mp3 (or use a platform engine).', code: 'not_media' }, 415);
  }

  const bytes = Number(upstream.headers.get('content-length') ?? 0);
  await logEvent('stream_start', { urlHash, bytes });

  const out = new Headers();
  out.set('Content-Type', contentType);
  out.set('Content-Disposition', `attachment; filename="${safeFilename(target, contentType)}"`);
  out.set('Accept-Ranges', 'bytes');
  const len = upstream.headers.get('content-length');
  if (len) out.set('Content-Length', len);
  const cr = upstream.headers.get('content-range');
  if (cr) out.set('Content-Range', cr);
  out.set('Cache-Control', 'no-store');
  // CORS: the streamed bytes must be readable from the browser too, not just
  // our JSON replies — without ACAO on this response the download fetch is blocked.
  for (const [k, v] of Object.entries(cors)) out.set(k, v);
  out.set('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition, Content-Range');

  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers: out });
}

// ── router ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    if (req.method === 'GET') return await handleStream(req);

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body?.action === 'challenge') return await handleChallenge(req, body);
      if (body?.action === 'claim') return await handleClaim(req, body);
      if (body?.action === 'formats') return await handleFormats(req, body);
      return json({ error: 'Unknown action. Use "challenge" or "claim".', code: 'action' }, 400);
    }

    return json({ error: 'Method not allowed.', code: 'method' }, 405);
  } catch (err) {
    console.error('video-grab error:', err);
    return json({ error: 'Supervisor error. Try again.', code: 'internal' }, 500);
  }
});
