'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdBanner from '@/components/AdBanner';
import StudioToolsDropdown from '@/components/StudioToolsDropdown';
import MediaStagePlayer from '@/components/MediaStagePlayer';
import { Film, X } from 'lucide-react';
import {
  detectPlatform,
  fetchMetadata,
  createChallenge,
  claimDownload,
  fetchFormats,
  probeMedia,
  PLATFORM_LABELS,
  type GrabMetadata,
  type ClaimResult,
  type GrabVariant,
  type Platform,
} from '@/lib/video-grabber';

type Phase = 'idle' | 'adgate' | 'claiming' | 'ready' | 'error';

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GREEN = '#16A34A';
const RED = '#DC2626';
const GRAY = '#71717A';
const DARK_FILL = '#18181B';

function formatBytes(n: number): string {
  if (!n) return '0 MB';
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

function sanitizeName(raw: string, fallbackExt: string): string {
  const cleaned = raw.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!cleaned) return `creatorkit-download.${fallbackExt}`;
  return /\.[a-z0-9]{2,5}$/i.test(cleaned) ? cleaned : `${cleaned}.${fallbackExt}`;
}

export default function VideoGrabberPage() {
  const [url, setUrl] = useState('');
  const [meta, setMeta] = useState<GrabMetadata | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [challengeId, setChallengeId] = useState('');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string>('');
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [ticketSeconds, setTicketSeconds] = useState(0);
  const claimStartedRef = useRef(false);
  const [dl, setDl] = useState<{ state: 'idle' | 'downloading' | 'done' | 'failed'; received: number; total: number; speed: number }>({
    state: 'idle',
    received: 0,
    total: 0,
    speed: 0,
  });
  const dlTickRef = useRef(0);
  const [variants, setVariants] = useState<GrabVariant[]>([]);
  const [variantId, setVariantId] = useState('');
  const [filename, setFilename] = useState('');
  const [preference, setPreference] = useState<'video' | 'audio'>('video');
  const [filenameTouched, setFilenameTouched] = useState(false);
  const [history, setHistory] = useState<{ name: string; size: number; at: number; blobUrl?: string; kind?: 'video' | 'audio' }[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  const [playerKind, setPlayerKind] = useState<'video' | 'audio'>('video');
  const autoDlRef = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVariants, setSheetVariants] = useState<GrabVariant[]>([]);
  const [chosenFormatId, setChosenFormatId] = useState('');

  const platform: Platform | null = url.trim() ? detectPlatform(url.trim()) : null;
  const pct = dl.total > 0 ? Math.min(100, Math.floor((dl.received / dl.total) * 100)) : 0;
  const activeVariant = result ? (variants.find((v) => v.id === (variantId || 'original')) ?? null) : null;
  const etaSec = dl.state === 'downloading' && dl.speed > 0 && dl.total > dl.received ? Math.max(1, Math.round((dl.total - dl.received) / dl.speed)) : null;
  const statusColor = phase === 'error' || dl.state === 'failed' ? RED : dl.state === 'done' ? GREEN : dl.state === 'downloading' ? BLACK : GRAY;

  // ── Auto-fetch metadata + first-frame preview (debounced) ─
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setMeta(null);
      setPreviewUrl('');
      setSheetOpen(false);
      setSheetVariants([]);
      setChosenFormatId('');
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const m = await fetchMetadata(trimmed);
      if (!cancelled) setMeta(m);
      // Platform links (YouTube etc.) → slide up the format sheet immediately.
      if (!cancelled) setSheetOpen(detectPlatform(trimmed) !== 'direct');
      if (detectPlatform(trimmed) === 'direct') {
        try {
          const res = await fetch(probeMedia(trimmed));
          if (!res.ok) return;
          const blob = await res.blob();
          if (!cancelled) setPreviewUrl(URL.createObjectURL(blob));
        } catch {
          /* preview is best-effort */
        }
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [url]);

  // Revoke the old preview blob whenever it is replaced or cleared.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // Sheet open → ask the supervisor which resolutions are actually downloadable.
  useEffect(() => {
    if (!sheetOpen || phase !== 'idle') return;
    const trimmed = url.trim();
    if (!trimmed || detectPlatform(trimmed) === 'direct') return;
    let cancelled = false;
    setSheetVariants([]);
    fetchFormats(trimmed).then((vs) => {
      if (!cancelled) setSheetVariants(vs);
    });
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, phase, url]);

  // Auto-fill the file name from the link (or page title) until the user types one.
  useEffect(() => {
    if (filenameTouched) return;
    let guess = '';
    try {
      guess = decodeURIComponent(new URL(url.trim()).pathname.split('/').filter(Boolean).pop() ?? '');
    } catch {
      /* not a URL yet */
    }
    if (!guess && meta?.title) guess = `${meta.title.replace(/[^\w\-. ]+/g, '').trim().slice(0, 60) || 'video'}.${preference === 'audio' ? 'mp3' : 'mp4'}`;
    setFilename(guess);
  }, [url, meta, preference, filenameTouched]);

  // ── Press DOWNLOAD → open the fullscreen ad ────────────────
  const handleStart = useCallback(async () => {
    if (!url.trim() || phase !== 'idle') return;
    setSheetOpen(false);
    setError('');
    setResult(null);
    setPlayerUrl('');
    setDl({ state: 'idle', received: 0, total: 0, speed: 0 });
    claimStartedRef.current = false;
    try {
      const ch = await createChallenge(url.trim());
      setChallengeId(ch.challengeId);
      setRemainingToday(ch.remainingToday);
      setCountdown(ch.waitSeconds);
      setPhase('adgate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the download.');
      setPhase('error');
    }
  }, [url, phase]);

  // ── Countdown ticker (the X button appears when it hits 0) ─
  useEffect(() => {
    if (phase !== 'adgate' || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Tap X → verify the ad watch → claim the ticket ────────
  const doClaim = useCallback(async () => {
    if (claimStartedRef.current) return;
    claimStartedRef.current = true;
    setPhase('claiming');
    try {
      const res = await claimDownload(url.trim(), challengeId);
      setResult(res);
      setVariants(res.variants ?? []);
      const wanted = chosenFormatId ? (res.variants ?? []).find((v) => v.id === chosenFormatId) : undefined;
      const preferred = wanted ?? (res.variants ?? []).find((v) => v.kind === preference) ?? (res.variants ?? [])[0];
      setVariantId(preferred?.id ?? 'original');
      setTicketSeconds(res.expiresInSeconds);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock the download.');
      setPhase('error');
    }
  }, [url, challengeId, preference, chosenFormatId]);

  // ── Ticket expiry ticker ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready' || ticketSeconds <= 0) return;
    const t = setTimeout(() => setTicketSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, ticketSeconds]);

  // ── Streamed download with real progress + speed/ETA ─────
  const startDownload = useCallback(async () => {
    if (!result || dl.state === 'downloading' || dl.state === 'done') return;
    const activeVariant = variants.find((v) => v.id === variantId);
    const streamUrl = activeVariant?.streamUrl ?? result.streamUrl;
    const kind: 'video' | 'audio' = activeVariant?.kind ?? preference;
    const finalName = sanitizeName(filename, kind === 'audio' ? 'mp3' : 'mp4');
    const startedAt = Date.now();
    setDl({ state: 'downloading', received: 0, total: 0, speed: 0 });
    dlTickRef.current = 0;
    try {
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const total = Number(res.headers.get('content-length') ?? 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported in this browser');
      const chunks: BlobPart[] = [];
      let received = 0;
      const tick = (r: number) => {
        const elapsed = (Date.now() - startedAt) / 1000 || 1;
        setDl({ state: 'downloading', received: r, total, speed: r / elapsed });
      };
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as unknown as BlobPart);
          received += value.length;
          if (received - dlTickRef.current > 200_000) {
            dlTickRef.current = received;
            tick(received);
          }
        }
      }
      setDl({ state: 'downloading', received, total, speed: received / ((Date.now() - startedAt) / 1000 || 1) });
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDl({ state: 'done', received, total, speed: 0 });
      setPlayerUrl(blobUrl);
      setPlayerKind(kind);
      setHistory((h) => [{ name: finalName, size: received, at: Date.now(), blobUrl, kind }, ...h].slice(0, 5));
    } catch (e) {
      setDl({ state: 'failed', received: 0, total: 0, speed: 0 });
      setError(e instanceof Error ? e.message : 'Download failed.');
    }
  }, [result, dl.state, variants, variantId, filename, preference]);

  // ── The ad paid for it — the file downloads itself ────────
  useEffect(() => {
    if (phase !== 'ready' || !result || dl.state !== 'idle' || autoDlRef.current) return;
    autoDlRef.current = true;
    startDownload();
  }, [phase, result, dl.state, startDownload]);

  const reset = useCallback(() => {
    setPhase('idle');
    setCountdown(0);
    setChallengeId('');
    setResult(null);
    setError('');
    claimStartedRef.current = false;
    autoDlRef.current = false;
    setDl({ state: 'idle', received: 0, total: 0, speed: 0 });
    setVariants([]);
    setVariantId('');
    setFilename('');
    setPreference('video');
    setFilenameTouched(false);
    setPlayerUrl('');
    setChosenFormatId('');
    setSheetVariants([]);
    setSheetOpen(false);
  }, []);

  const progressFill = dl.state === 'failed' ? RED : dl.state === 'done' ? GREEN : DARK_FILL;
  const progressTextDark = dl.state === 'downloading';

  return (
    <div style={{ background: '#F4F4F5', minHeight: '100vh', padding: '16px 16px 80px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Top bar — home + tools navigation (works on mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 auto 18px' }}>
          <Link
            href="/"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              textDecoration: 'none',
              color: BLACK,
              border: '2px solid #000',
              background: '#fff',
              display: 'inline-block',
            }}
          >
            ‹ HOME
          </Link>
          <StudioToolsDropdown currentHref="/video-grabber" theme="light" />
        </div>

        {/* One-line header */}
        <h1
          style={{
            fontSize: '1.7rem',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: BLACK,
            textTransform: 'uppercase',
            margin: '0 0 4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Video Grabber
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#555', fontWeight: 500, margin: '0 0 20px' }}>
          Paste a link. Watch one ad. The file saves itself.
        </p>

        {/* Workspace split */}
        <div className="matchcut-workspace-grid">
          {/* ── LEFT · Stage ── */}
          <div
            className="brutalist-card"
            style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}
          >
            {/* Meta bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#666',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    background: statusColor,
                    border: '1.5px solid #000',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: BLACK, fontWeight: 900 }}>{dl.state === 'downloading' ? 'DOWNLOADING' : dl.state === 'done' ? 'SAVED' : 'LINK STAGE'}</span>
                <span style={{ color: '#aaa' }}>|</span>
                <span style={{ color: '#333', fontWeight: 800, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {platform ? PLATFORM_LABELS[platform] : 'WAITING'}
                </span>
              </div>
              {remainingToday !== null && <span style={{ color: '#333', fontWeight: 800 }}>{remainingToday} LEFT TODAY</span>}
            </div>

            {/* Preview / player area */}
            {playerUrl ? (
              <MediaStagePlayer
                key={playerUrl}
                src={playerUrl}
                kind={playerKind}
                title={filename || meta?.title || 'Your Download'}
                downloadName={history.find((h) => h.blobUrl === playerUrl)?.name}
              />
            ) : meta?.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.thumbnail}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', border: `2px solid ${BLACK}`, background: '#FAFAFA' }}
              />
            ) : previewUrl ? (
              <video
                src={previewUrl}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  try {
                    e.currentTarget.currentTime = 0.1;
                  } catch {
                    /* some partial blobs refuse seeking — still shows a frame */
                  }
                }}
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', border: `2px solid ${BLACK}`, background: '#000', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  border: `2px solid ${BLACK}`,
                  background: '#FAFAFA',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#A1A1AA',
                }}
              >
                <Film size={26} strokeWidth={1.75} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                  PASTE A LINK TO BEGIN
                </span>
              </div>
            )}

            {/* Title line */}
            {(meta?.title || url.trim()) && (
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    color: BLACK,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {meta?.title ?? url.trim()}
                </p>
                {meta?.provider && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', color: GRAY }}>
                    VIA {meta.provider.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {/* Progress / status */}
            {(dl.state === 'downloading' || dl.state === 'done' || dl.state === 'failed') && (
              <div>
                <div style={{ border: `2px solid ${BLACK}`, background: '#fff', height: 26, position: 'relative' }}>
                  <div
                    style={{
                      width: dl.state === 'done' ? '100%' : `${pct}%`,
                      height: '100%',
                      background: progressFill,
                      transition: 'width 0.25s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      color: progressTextDark ? WHITE : BLACK,
                    }}
                  >
                    {dl.state === 'failed'
                      ? 'DOWNLOAD FAILED'
                      : dl.state === 'done'
                        ? `SAVED TO DEVICE · ${formatBytes(dl.received)}`
                        : dl.total > 0
                          ? `${pct}% · ${formatBytes(dl.received)} / ${formatBytes(dl.total)}${etaSec !== null ? ` · ${etaSec}S LEFT` : ''}`
                          : `${formatBytes(dl.received)} DOWNLOADED`}
                  </span>
                </div>
                {dl.state === 'done' && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#3F3F46' }}>
                    Saved automatically — check your downloads. It's playing above too.
                  </p>
                )}
                {dl.state === 'failed' && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.7rem', fontWeight: 700, color: RED }}>
                    {error || 'The one-time ticket was used up. Try again.'}
                  </p>
                )}
                {(dl.state === 'done' || dl.state === 'failed') && (
                  <button
                    onClick={reset}
                    style={{
                      marginTop: 10,
                      padding: '11px 16px',
                      border: `2px solid ${BLACK}`,
                      background: '#fff',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    GRAB ANOTHER
                  </button>
                )}
              </div>
            )}

            {/* Error strip */}
            {phase === 'error' && (
              <div style={{ border: `2px solid ${RED}`, background: '#FEF2F2', padding: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: RED, letterSpacing: '0.06em' }}>
                  DOWNLOAD FAILED
                </p>
                <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: '#3F3F46' }}>{error}</p>
                <button
                  onClick={reset}
                  style={{
                    padding: '8px 14px',
                    border: `2px solid ${BLACK}`,
                    background: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  TRY AGAIN
                </button>
              </div>
            )}

            {phase === 'ready' && dl.state === 'idle' && (
              <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', color: GRAY, letterSpacing: '0.05em' }}>
                STARTING YOUR DOWNLOAD…
              </p>
            )}
          </div>

          {/* ── RIGHT · Controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="brutalist-card" style={{ padding: 18 }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                PASTE LINK
              </p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="Paste any video or audio link"
                spellCheck={false}
                disabled={phase !== 'idle' && phase !== 'error'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 14px',
                  border: `2px solid ${BLACK}`,
                  background: '#FAFAFA',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />

              {platform && (
                <p style={{ margin: '10px 0 0', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', color: GRAY, letterSpacing: '0.06em' }}>
                  DETECTED · {PLATFORM_LABELS[platform].toUpperCase()}
                  {platform !== 'direct' && ' · PLATFORM ENGINE CONNECTS SOON — DIRECT FILE LINKS WORK NOW'}
                </p>
              )}

              <button
                onClick={handleStart}
                disabled={!url.trim() || (phase !== 'idle' && phase !== 'error')}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 14,
                  padding: '15px 16px',
                  border: `2px solid ${BLACK}`,
                  background: !url.trim() || (phase !== 'idle' && phase !== 'error') ? '#E4E4E7' : BLACK,
                  color: !url.trim() || (phase !== 'idle' && phase !== 'error') ? '#71717A' : WHITE,
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  letterSpacing: '0.1em',
                  cursor: !url.trim() || (phase !== 'idle' && phase !== 'error') ? 'not-allowed' : 'pointer',
                  boxShadow: '4px 4px 0 #000',
                }}
              >
                {phase === 'adgate' || phase === 'claiming' ? 'WATCHING AD…' : 'DOWNLOAD'}
              </button>
            </div>

            {platform && (
              <div className="brutalist-card" style={{ padding: 18 }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                  QUALITY / FORMAT
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(phase === 'ready' && result
                    ? variants.length
                      ? variants
                      : [{ id: 'original', label: 'Original', kind: 'video' as const, streamUrl: result.streamUrl }]
                    : platform === 'direct'
                      ? /\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(url.trim())
                        ? [{ id: 'audio', label: 'Audio · MP3', kind: 'audio' as const }]
                        : [
                          { id: 'video', label: 'Video · MP4', kind: 'video' as const },
                          { id: 'audio', label: 'Audio track · MP3', kind: 'audio' as const },
                        ]
                      : [
                        { id: 'video', label: 'Best video · Auto', kind: 'video' as const },
                        { id: 'audio', label: 'Audio only · MP3', kind: 'audio' as const },
                      ]
                  ).map((v) => {
                    const ready = phase === 'ready' && result;
                    const selected = v.id === (ready ? variantId || 'original' : preference);
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          if (ready) setVariantId(v.id);
                          else setPreference(v.id as 'video' | 'audio');
                        }}
                        disabled={dl.state === 'downloading' || dl.state === 'done'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          border: `2px solid ${selected ? BLACK : '#E4E4E7'}`,
                          background: selected ? '#FAFAFA' : '#fff',
                          cursor: dl.state === 'downloading' || dl.state === 'done' ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          boxShadow: selected ? '3px 3px 0 #000' : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            border: `2px solid ${BLACK}`,
                            background: selected ? BLACK : 'transparent',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.72rem', color: BLACK, letterSpacing: '0.04em' }}>
                          {v.label.toUpperCase()}
                        </span>
                        {typeof v.sizeBytes === 'number' && v.sizeBytes > 0 && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: GRAY, flexShrink: 0 }}>
                            {formatBytes(v.sizeBytes)}
                          </span>
                        )}
                        {v.kind === 'audio' && (
                          <span style={{ marginLeft: typeof v.sizeBytes === 'number' ? 8 : 'auto', fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800, color: GRAY, flexShrink: 0 }}>
                            AUDIO
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {phase !== 'ready' && platform !== 'direct' && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.66rem', fontWeight: 600, color: GRAY, lineHeight: 1.5 }}>
                      Your pick is locked in before the ad — exact resolutions confirm when the platform engines connect.
                    </p>
                  )}
                  {phase === 'ready' && result && variants.length > 1 && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.66rem', fontWeight: 600, color: GRAY, lineHeight: 1.5 }}>
                      AUDIO saves the file named as .mp3 — it plays like a music file on most devices.
                    </p>
                  )}
                </div>

                <p style={{ margin: '14px 0 6px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                  FILE NAME
                </p>
                <input
                  value={filename}
                  onChange={(e) => {
                    setFilename(e.target.value);
                    setFilenameTouched(true);
                  }}
                  disabled={dl.state === 'downloading' || dl.state === 'done'}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    border: `2px solid ${BLACK}`,
                    background: '#FAFAFA',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {history.length > 0 && (
              <div className="brutalist-card" style={{ padding: 18 }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                  SESSION SAVES · {history.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((h) => (
                    <button
                      key={h.at}
                      onClick={() => {
                        if (!h.blobUrl) return;
                        setPlayerUrl(h.blobUrl);
                        setPlayerKind(h.kind ?? 'video');
                      }}
                      title="Click to play again"
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 10,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: h.blobUrl ? 'pointer' : 'default',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#3F3F46',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {h.blobUrl === playerUrl ? '● ' : ''}
                        {h.name}
                      </span>
                      <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: GRAY, flexShrink: 0 }}>
                        {formatBytes(h.size)} · {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AdBanner slot="rectangle" />

            <p style={{ margin: 0, fontSize: '0.66rem', fontWeight: 600, color: '#A1A1AA', lineHeight: 1.5, textAlign: 'center' }}>
              One ad per download · only save content you own or have rights to.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SHEET · pick resolution before the ad (platform links) ── */}
      {sheetOpen && platform && platform !== 'direct' && (phase === 'idle' || phase === 'error') && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 90 }} />
          <div
            className="vg-sheet"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 0,
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              border: `2px solid ${BLACK}`,
              borderBottom: 'none',
              borderRadius: '14px 14px 0 0',
              padding: '18px 18px 26px',
              maxHeight: '85vh',
              overflowY: 'auto',
              zIndex: 95,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ width: 44, height: 4, background: '#D4D4D8', borderRadius: 99, margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: BLACK,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  minWidth: 0,
                }}
              >
                {meta?.title ?? url.trim()}
              </p>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  border: `2px solid ${BLACK}`,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
              CHOOSE YOUR DOWNLOAD
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {(sheetVariants.length
                ? sheetVariants
                : [
                    { id: 'video', label: 'Best video · MP4', kind: 'video' as const },
                    { id: 'audio', label: 'Audio only · MP3', kind: 'audio' as const },
                  ]
              ).map((v) => {
                const selected = chosenFormatId ? v.id === chosenFormatId : v.id === preference;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setChosenFormatId(v.id);
                      setPreference(v.kind);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      border: `2px solid ${selected ? BLACK : '#E4E4E7'}`,
                      background: selected ? '#FAFAFA' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: selected ? '3px 3px 0 #000' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: `2px solid ${BLACK}`,
                        background: selected ? BLACK : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.76rem', color: BLACK, letterSpacing: '0.04em' }}>
                      {v.label.toUpperCase()}
                    </span>
                    {typeof v.sizeBytes === 'number' && v.sizeBytes > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: GRAY, flexShrink: 0 }}>
                        {formatBytes(v.sizeBytes)}
                      </span>
                    )}
                    {v.kind === 'audio' && (
                      <span style={{ marginLeft: typeof v.sizeBytes === 'number' ? 8 : 'auto', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: GRAY, flexShrink: 0 }}>
                        AUDIO
                      </span>
                    )}
                  </button>
                );
              })}
              {!sheetVariants.length && (
                <p style={{ margin: '4px 0 0', fontSize: '0.66rem', fontWeight: 600, color: GRAY, lineHeight: 1.5 }}>
                  Every resolution YouTube allows will be listed here the moment the platform engine connects. For now: best MP4 or MP3.
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setSheetOpen(false);
                handleStart();
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '15px 16px',
                border: `2px solid ${BLACK}`,
                background: BLACK,
                color: WHITE,
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                boxShadow: '4px 4px 0 #000',
              }}
            >
              DOWNLOAD
            </button>
          </div>
        </>
      )}

      {/* ── FULLSCREEN AD — watch 5s, tap X, file downloads itself ── */}
      {(phase === 'adgate' || phase === 'claiming') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
          }}
        >
          {/* Status strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '2px solid #1F1F1F',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.12em', color: WHITE }}>
              {phase === 'claiming'
                ? 'VERIFYING…'
                : countdown > 0
                  ? `YOUR DOWNLOAD STARTS IN ${countdown}S`
                  : 'TAP THE X TO GET YOUR FILE'}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.1em', color: '#52525B' }}>
              CREATOR ENGINE · ONE AD PER DOWNLOAD
            </span>
          </div>

          {/* Full-bleed ad stage */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 16px 28px', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 920, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  border: '2px solid #FFFFFF',
                  background: '#0A0A0A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <AdBanner slot="leaderboard" />
                {countdown > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '1.6rem',
                      color: BLACK,
                      background: WHITE,
                      border: `2px solid ${WHITE}`,
                      padding: '2px 12px',
                      lineHeight: 1.3,
                    }}
                  >
                    {countdown}
                  </span>
                ) : (
                  phase === 'adgate' && (
                    <button
                      onClick={doClaim}
                      aria-label="Close ad and start download"
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 52,
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: WHITE,
                        border: `2px solid ${BLACK}`,
                        color: BLACK,
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0 #000',
                      }}
                    >
                      <X size={26} strokeWidth={3} />
                    </button>
                  )
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA', textAlign: 'center' }}>
                {countdown > 0 ? 'Keep this tab open — this ad pays for your download.' : 'The ad is done. Tap the X and your file saves itself.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
