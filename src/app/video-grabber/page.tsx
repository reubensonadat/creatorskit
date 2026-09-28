'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdBanner from '@/components/AdBanner';
import { Download, Film } from 'lucide-react';
import {
  detectPlatform,
  fetchMetadata,
  createChallenge,
  claimDownload,
  PLATFORM_LABELS,
  type GrabMetadata,
  type ClaimResult,
  type Platform,
} from '@/lib/video-grabber';

type Phase = 'idle' | 'adgate' | 'claiming' | 'ready' | 'error';

const BLACK = '#000000';
const YELLOW = '#FFDD00';
const GREEN = '#16A34A';
const RED = '#DC2626';

function formatBytes(n: number): string {
  if (!n) return '0 MB';
  const mb = n / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
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
  const [dl, setDl] = useState<{ state: 'idle' | 'downloading' | 'done' | 'failed'; received: number; total: number }>({
    state: 'idle',
    received: 0,
    total: 0,
  });
  const dlTickRef = useRef(0);

  const platform: Platform | null = url.trim() ? detectPlatform(url.trim()) : null;
  const pct = dl.total > 0 ? Math.min(100, Math.floor((dl.received / dl.total) * 100)) : 0;

  // ── Auto-fetch metadata (debounced) ──────────────────────
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setMeta(null);
      return;
    }
    const t = setTimeout(async () => {
      const m = await fetchMetadata(trimmed);
      setMeta(m);
    }, 500);
    return () => clearTimeout(t);
  }, [url]);

  // ── Start the ad-gated unlock ────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!url.trim() || phase !== 'idle') return;
    setError('');
    setResult(null);
    setDl({ state: 'idle', received: 0, total: 0 });
    claimStartedRef.current = false;
    try {
      const ch = await createChallenge(url.trim());
      setChallengeId(ch.challengeId);
      setRemainingToday(ch.remainingToday);
      setCountdown(ch.waitSeconds);
      setPhase('adgate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the unlock.');
      setPhase('error');
    }
  }, [url, phase]);

  // ── Countdown ticker + auto-claim ────────────────────────
  useEffect(() => {
    if (phase !== 'adgate') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (claimStartedRef.current) return;
    claimStartedRef.current = true;
    (async () => {
      setPhase('claiming');
      try {
        const res = await claimDownload(url.trim(), challengeId);
        setResult(res);
        setTicketSeconds(res.expiresInSeconds);
        setPhase('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not unlock the download.');
        setPhase('error');
      }
    })();
  }, [phase, countdown, url, challengeId]);

  // ── Ticket expiry ticker ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready' || ticketSeconds <= 0) return;
    const t = setTimeout(() => setTicketSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, ticketSeconds]);

  // ── Streamed download with real progress ─────────────────
  const startDownload = useCallback(async () => {
    if (!result || dl.state === 'downloading' || dl.state === 'done') return;
    setDl({ state: 'downloading', received: 0, total: 0 });
    dlTickRef.current = 0;
    try {
      const res = await fetch(result.streamUrl);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const total = Number(res.headers.get('content-length') ?? 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported in this browser');
      const chunks: BlobPart[] = [];
      let received = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as unknown as BlobPart);
          received += value.length;
          if (received - dlTickRef.current > 200_000) {
            dlTickRef.current = received;
            setDl({ state: 'downloading', received, total });
          }
        }
      }
      setDl({ state: 'downloading', received, total });
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      try {
        const upstream = new URL(result.streamUrl).searchParams.get('u');
        const name = upstream ? new URL(upstream).pathname.split('/').filter(Boolean).pop() : '';
        if (name) a.download = decodeURIComponent(name);
      } catch {
        /* keep default filename */
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      setDl({ state: 'done', received, total });
    } catch (e) {
      setDl({ state: 'failed', received: 0, total: 0 });
      setError(e instanceof Error ? e.message : 'Download failed.');
    }
  }, [result, dl.state]);

  const reset = useCallback(() => {
    setPhase('idle');
    setCountdown(0);
    setChallengeId('');
    setResult(null);
    setError('');
    claimStartedRef.current = false;
    setDl({ state: 'idle', received: 0, total: 0 });
  }, []);

  const statusColor = phase === 'error' || dl.state === 'failed' ? RED : dl.state === 'done' ? GREEN : phase === 'ready' ? GREEN : YELLOW;

  return (
    <div style={{ background: '#F4F4F5', minHeight: '100vh', padding: '16px 16px 80px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Minimal top bar — standalone page, no global header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 auto 20px' }}>
          <Link
            href="/"
            className="brutalist-button"
            style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-block' }}
          >
            ‹ HOME
          </Link>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '4px 10px',
              border: `2px solid ${BLACK}`,
              background: YELLOW,
              color: BLACK,
              fontFamily: 'monospace',
            }}
          >
            CREATOR ENGINE
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '4px 10px',
                border: `2px solid ${BLACK}`,
                background: YELLOW,
                color: BLACK,
                fontFamily: 'monospace',
              }}
            >
              VIDEO GRABBER
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#666', fontFamily: 'monospace' }}>
              ANY PUBLIC LINK · ONE AD · SAVES TO DEVICE
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: BLACK,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Video Grabber
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5, fontWeight: 500, margin: '6px 0 0', maxWidth: 640 }}>
            Paste a video or audio link, watch one short ad, save the file straight to your device. No accounts, no watermarks.
          </p>
        </div>

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
                <span style={{ color: BLACK, fontWeight: 900 }}>LINK STAGE</span>
                <span style={{ color: '#aaa' }}>|</span>
                <span style={{ color: '#333', fontWeight: 800, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {platform ? PLATFORM_LABELS[platform] : 'WAITING'}
                </span>
              </div>
              {remainingToday !== null && <span style={{ color: '#333', fontWeight: 800 }}>{remainingToday} LEFT TODAY</span>}
            </div>

            {/* Preview area */}
            {meta?.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.thumbnail}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', border: `2px solid ${BLACK}`, background: '#FAFAFA' }}
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
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', color: '#71717A' }}>
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
                      background: dl.state === 'failed' ? RED : dl.state === 'done' ? GREEN : YELLOW,
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
                      color: BLACK,
                    }}
                  >
                    {dl.state === 'failed'
                      ? 'DOWNLOAD FAILED'
                      : dl.state === 'done'
                        ? `SAVED TO DEVICE · ${formatBytes(dl.received)}`
                        : dl.total > 0
                          ? `${pct}% · ${formatBytes(dl.received)} / ${formatBytes(dl.total)}`
                          : `${formatBytes(dl.received)} DOWNLOADED`}
                  </span>
                </div>
                {dl.state === 'done' && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.7rem', fontWeight: 700, color: '#3F3F46' }}>
                    The file saved automatically — check your device's downloads.
                  </p>
                )}
                {dl.state === 'failed' && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.7rem', fontWeight: 700, color: RED }}>
                    The one-time ticket was used up. Unlock again to retry.
                  </p>
                )}
              </div>
            )}

            {/* Error strip */}
            {phase === 'error' && (
              <div style={{ border: `2px solid ${RED}`, background: '#FEF2F2', padding: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: RED, letterSpacing: '0.06em' }}>
                  UNLOCK FAILED
                </p>
                <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: '#3F3F46' }}>{error}</p>
                <button
                  onClick={reset}
                  style={{
                    padding: '8px 14px',
                    border: `2px solid ${BLACK}`,
                    background: YELLOW,
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

            {/* Action row */}
            {phase === 'ready' && result && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={startDownload}
                  disabled={dl.state === 'downloading' || dl.state === 'done'}
                  style={{
                    padding: '13px 22px',
                    border: `2px solid ${BLACK}`,
                    background: dl.state === 'downloading' || dl.state === 'done' ? '#E4E4E7' : BLACK,
                    color: YELLOW,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    letterSpacing: '0.08em',
                    cursor: dl.state === 'downloading' || dl.state === 'done' ? 'not-allowed' : 'pointer',
                    boxShadow: '4px 4px 0 #000',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Download size={15} />
                  {dl.state === 'downloading' ? `DOWNLOADING ${pct}%` : dl.state === 'done' ? 'SAVED' : 'SAVE TO DEVICE'}
                </button>
                {(dl.state === 'done' || dl.state === 'failed') && (
                  <button
                    onClick={reset}
                    style={{
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
                {dl.state === 'idle' && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, fontFamily: 'monospace', color: ticketSeconds < 60 ? RED : '#71717A' }}>
                    TICKET EXPIRES IN {ticketSeconds}S
                  </span>
                )}
              </div>
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
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="https://example.com/video.mp4"
                spellCheck={false}
                disabled={phase !== 'idle' && phase !== 'error'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  border: `2px solid ${BLACK}`,
                  background: '#FAFAFA',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />

              {platform && (
                <p style={{ margin: '10px 0 0', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', color: '#71717A', letterSpacing: '0.06em' }}>
                  DETECTED · {PLATFORM_LABELS[platform].toUpperCase()}
                  {platform !== 'direct' && ' · PLATFORM ENGINE CONNECTS SOON — DIRECT FILE LINKS WORK NOW'}
                </p>
              )}

              <button
                onClick={handleUnlock}
                disabled={!url.trim() || (phase !== 'idle' && phase !== 'error')}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 14,
                  padding: '13px 16px',
                  border: `2px solid ${BLACK}`,
                  background: !url.trim() || (phase !== 'idle' && phase !== 'error') ? '#E4E4E7' : YELLOW,
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  cursor: !url.trim() || (phase !== 'idle' && phase !== 'error') ? 'not-allowed' : 'pointer',
                  boxShadow: '4px 4px 0 #000',
                }}
              >
                {phase === 'claiming' ? 'VERIFYING AD WATCH…' : 'UNLOCK DOWNLOAD'}
              </button>
            </div>

            <div className="brutalist-card" style={{ padding: 18 }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                HOW IT WORKS
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Paste any public video or audio link', 'Watch one short ad — 5 seconds', 'Save the file to your device'].map((line, i) => (
                  <div key={line} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 900, color: '#A1A1AA' }}>0{i + 1}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3F3F46' }}>{line}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: '14px 0 0', paddingTop: 12, borderTop: '1.5px solid #E4E4E7', fontSize: '0.68rem', fontWeight: 600, color: '#71717A', lineHeight: 1.6 }}>
                One ad unlocks one download. Tickets expire in 10 minutes. Only save content you own or have rights to — files stream straight
                through and are never stored.
              </p>
            </div>

            <AdBanner slot="rectangle" />
          </div>
        </div>
      </div>

      {/* ── AD-GATE OVERLAY ── */}
      {(phase === 'adgate' || phase === 'claiming') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 100,
          }}
        >
          <div
            className="brutalist-card"
            style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, textAlign: 'center' }}
          >
            <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
              {phase === 'claiming' ? 'VERIFYING AD WATCH…' : 'AD PLAYING — DOWNLOAD UNLOCKS IN'}
            </p>
            <div
              style={{
                fontSize: '3.4rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                background: BLACK,
                color: YELLOW,
                display: 'inline-block',
                padding: '6px 26px',
                margin: '14px 0',
                border: `2px solid ${BLACK}`,
              }}
            >
              {phase === 'claiming' ? '·' : countdown}
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '0.72rem', fontWeight: 700, color: '#71717A' }}>
              Keep this tab open — the ad below pays for your download.
            </p>
            <AdBanner slot="leaderboard" />
          </div>
        </div>
      )}
    </div>
  );
}
