'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { X, ArrowUpRight } from 'lucide-react';

/**
 * ExternalAdGate — the mobile ad bridge for curated external links
 * (src/data/tools.ts §3).
 *
 * Desktop (unchanged): external links navigate to the /redirect ad-bridge
 * page, which counts down and forwards to the destination.
 *
 * Mobile (≤768px): tapping an external link opens a full-screen SPONSORED
 * interstitial instead. Closing it (✕ or CONTINUE once the countdown
 * finishes) opens the destination in a new tab and slides a dismissable
 * bottom banner ad onto the current page (once per session).
 *
 * Usage: mount <ExternalAdGateHost /> once (ClientLayout) and wrap link
 * clicks with externalLinkClick(e, url, label).
 */

export interface ExternalGateRequest {
  url: string;
  label: string;
}

type GateListener = (req: ExternalGateRequest) => void;

const listeners = new Set<GateListener>();
let bannerShownThisSession = false;

const GATE_COUNTDOWN_SECONDS = 3;

// In-house cross-promos until real AdSense units ship (mirrors AdBanner /
// ToolLayout side-ad placeholders — same "ready for AdSense" contract).
const BANNER_PROMOS = [
  { title: 'THUMBNAIL A/B LAB', sub: 'Glance-test covers against real feed comps', href: '/thumbnail-lab' },
  { title: 'BULK RESIZER', sub: 'One export, every platform size', href: '/resizer' },
  { title: 'SMART COMPRESSOR', sub: 'Shrink files without the mush', href: '/compressor' },
  { title: 'QUOTE CARDS', sub: 'Turn soundbites into shareable cards', href: '/quote-card' },
  { title: 'BUSINESS SUITE', sub: 'Invoices, contracts and receipts', href: '/business' },
];

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width:768px)').matches;
}

/** Open the full-screen interstitial from anywhere (module event bus). */
export function openExternalGate(url: string, label: string): void {
  listeners.forEach((l) => l({ url, label }));
}

/**
 * onClick handler for external anchors. Desktop → default navigation
 * (the /redirect bridge page). Mobile → full-screen ad interstitial.
 */
export function externalLinkClick(e: MouseEvent<HTMLAnchorElement>, url: string, label: string): void {
  if (isMobileViewport()) {
    e.preventDefault();
    openExternalGate(url, label);
  }
}

export function ExternalAdGateHost() {
  const [gate, setGate] = useState<ExternalGateRequest | null>(null);
  const [countdown, setCountdown] = useState(GATE_COUNTDOWN_SECONDS);
  const [banner, setBanner] = useState(false);
  const [bannerPromo, setBannerPromo] = useState(BANNER_PROMOS[0]);
  const latestReq = useRef<ExternalGateRequest | null>(null);

  useEffect(() => {
    const listener: GateListener = (req) => {
      latestReq.current = req;
      setCountdown(GATE_COUNTDOWN_SECONDS);
      setGate(req);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Countdown ticker — CONTINUE unlocks at 0.
  useEffect(() => {
    if (!gate || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gate, countdown]);

  // Lock body scroll while the interstitial is up.
  useEffect(() => {
    if (!gate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gate]);

  const proceed = useCallback((openSite: boolean) => {
    const req = latestReq.current;
    setGate(null);
    if (req && openSite) {
      window.open(req.url, '_blank', 'noopener,noreferrer');
    }
    if (!bannerShownThisSession) {
      bannerShownThisSession = true;
      setBannerPromo(BANNER_PROMOS[Math.floor(Math.random() * BANNER_PROMOS.length)]);
      setBanner(true);
    }
  }, []);

  // Esc = skip the wait, same as ✕.
  useEffect(() => {
    if (!gate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') proceed(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate, proceed]);

  return (
    <>
      {gate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sponsored message before leaving Creator's Kit"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'ck-ad-gate-in 0.18s ease both',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '6px 6px 0 #000000',
              borderRadius: 6,
              overflow: 'hidden',
              animation: 'ck-ad-gate-card-in 0.22s cubic-bezier(0.2,0.8,0.2,1) both',
            }}
          >
            {/* Header strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: '#000000',
                color: '#ffffff',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.14em' }}>
                SPONSORED · AD BREAK
              </span>
              <button
                autoFocus
                onClick={() => proceed(true)}
                aria-label="Skip ad and continue"
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: 2 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Ad unit placeholder (AdSense-ready, mirrors AdBanner contract) */}
            <div
              id="ck-ad-gate-slot"
              style={{
                margin: 12,
                height: 220,
                border: '2px dashed #000000',
                background: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                textAlign: 'center',
                padding: 12,
              }}
            >
              <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#000', color: '#fff', padding: '2px 8px', fontFamily: 'monospace' }}>
                ADVERTISEMENT
              </span>
              <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace' }}>
                [ 320×480 Mobile Interstitial / AdSense ]
              </span>
            </div>

            {/* Destination chip — where "continue" actually goes */}
            <div
              style={{
                margin: '0 12px',
                padding: '6px 8px',
                border: '1.5px solid #000',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <ArrowUpRight size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>NEXT UP: {gate.label}</span>
            </div>

            {/* Footer */}
            <div style={{ padding: 12 }}>
              <button
                disabled={countdown > 0}
                onClick={() => proceed(true)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: countdown > 0 ? '#e4e4e7' : '#FFE500',
                  color: '#000000',
                  border: '2.5px solid #000000',
                  boxShadow: countdown > 0 ? 'none' : '3px 3px 0 #000000',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  letterSpacing: '0.06em',
                  cursor: countdown > 0 ? 'default' : 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                {countdown > 0 ? `CONTINUE IN ${countdown}…` : 'CONTINUE ↗'}
              </button>
            </div>
          </div>
        </div>
      )}

      {banner && (
        <div
          className="ck-mobile-ad-banner"
          role="complementary"
          aria-label="Sponsored banner"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 70,
            background: '#ffffff',
            borderTop: '3px solid #000000',
            padding: '8px 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'ck-ad-banner-up 0.28s cubic-bezier(0.2,0.8,0.2,1) both',
          }}
        >
          <span
            style={{
              fontSize: '0.55rem',
              fontWeight: 900,
              background: '#000',
              color: '#fff',
              padding: '2px 6px',
              fontFamily: 'monospace',
              flexShrink: 0,
              letterSpacing: '0.1em',
            }}
          >
            AD
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bannerPromo.title}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bannerPromo.sub}
            </div>
          </div>
          <a
            href={bannerPromo.href}
            style={{
              flexShrink: 0,
              padding: '6px 10px',
              background: '#FFE500',
              border: '2px solid #000',
              boxShadow: '2px 2px 0 #000',
              fontFamily: 'monospace',
              fontSize: '0.6rem',
              fontWeight: 900,
              textDecoration: 'none',
              color: '#000',
              borderRadius: 3,
            }}
          >
            OPEN
          </a>
          <button
            aria-label="Dismiss ad"
            onClick={() => setBanner(false)}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#000' }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
