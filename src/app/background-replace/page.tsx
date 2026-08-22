'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';

const TARGET_URL = 'https://fileconv.online/remove-bg';

export default function BackgroundReplaceBridgePage() {
  const [alreadyRedirected, setAlreadyRedirected] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const storageKey = `ck_redirected_${encodeURIComponent(TARGET_URL)}`;
    const hasRedirected = typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === 'true';

    if (hasRedirected) {
      setAlreadyRedirected(true);
      setSecondsLeft(null);
    } else {
      setAlreadyRedirected(false);
      setSecondsLeft(5);
    }
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
      return () => clearTimeout(timer);
    } else if (secondsLeft === 0) {
      const storageKey = `ck_redirected_${encodeURIComponent(TARGET_URL)}`;
      sessionStorage.setItem(storageKey, 'true');
      window.location.href = TARGET_URL;
    }
  }, [secondsLeft]);

  const handleManualProceed = () => {
    const storageKey = `ck_redirected_${encodeURIComponent(TARGET_URL)}`;
    sessionStorage.setItem(storageKey, 'true');
    window.location.href = TARGET_URL;
  };

  const handleRestartTimer = () => {
    setAlreadyRedirected(false);
    setSecondsLeft(5);
  };

  const progressPercent = secondsLeft !== null ? ((5 - secondsLeft) / 5) * 100 : 100;

  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F5', padding: '24px 16px 60px' }}>
      {/* Top Header Bar */}
      <div style={{ maxWidth: 1280, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="brutalist-button" style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}>
          ‹ HOME
        </Link>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 900,
            padding: '4px 10px',
            border: '2px solid #000',
            background: '#FFDD00',
            color: '#000',
            fontFamily: 'monospace',
          }}
        >
          CREATOR ENGINE
        </span>
      </div>

      {/* TOP AD SECTOR (Google Adsense Leaderboard) */}
      <div style={{ maxWidth: 1280, margin: '0 auto 20px' }}>
        <div
          id="ad-sector-top"
          style={{
            width: '100%',
            minHeight: 110,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0 #000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#000', color: '#fff', padding: '2px 8px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
            ADVERTISEMENT · TOP BANNER
          </span>
          <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace' }}>
            [ 728x90 Leaderboard / 970x90 Google AdSense Placement ]
          </span>
        </div>
      </div>

      {/* 3-COLUMN AD & REDIRECT STAGE */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '220px 1fr 220px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* LEFT SKYSCRAPER AD SECTOR (Google Adsense) */}
        <div
          id="ad-sector-left"
          style={{
            minHeight: 480,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0 #000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#000', color: '#fff', padding: '2px 6px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
            ADVERTISEMENT
          </span>
          <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace', writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '16px 0' }}>
            [ 160x600 / 300x600 Google AdSense Skyscraper ]
          </span>
        </div>

        {/* CENTER INTERSTITIAL BOX */}
        <div
          className="brutalist-card"
          style={{
            padding: '40px 32px',
            background: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '8px 8px 0 #000000',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Badge Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: alreadyRedirected ? '#22c55e' : '#FFDD00',
              border: '4px solid #000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 0 #000',
              color: alreadyRedirected ? '#fff' : '#000',
            }}
          >
            {alreadyRedirected ? (
              <CheckCircle2 size={36} />
            ) : (
              <>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                  {secondsLeft}
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  SEC
                </span>
              </>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              {alreadyRedirected ? 'AI Background Cutout Studio Ready' : 'Launching AI Background Cutout Studio'}
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#555', maxWidth: 460, margin: '0 auto', lineHeight: 1.5, fontWeight: 500 }}>
              {alreadyRedirected
                ? 'Your session is prepared. Click below whenever you are ready to continue to the tool.'
                : 'Preparing high-precision AI subject isolation and transparent PNG export session.'}
            </p>
          </div>

          {/* Progress Bar (if active countdown) */}
          {!alreadyRedirected && secondsLeft !== null && (
            <div style={{ width: '100%', maxWidth: 440, height: 12, background: '#eee', border: '2px solid #000', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: '#FFDD00',
                  transition: 'width 1s linear',
                }}
              />
            </div>
          )}

          {/* Direct Proceed Button */}
          <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleManualProceed}
              className="brutalist-button brutalist-button-primary"
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '0.95rem',
                justifyContent: 'center',
                boxShadow: '4px 4px 0 #000',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Launch Tool Immediately <ArrowRight size={16} style={{ marginLeft: 6 }} />
            </button>

            {alreadyRedirected && (
              <button
                onClick={handleRestartTimer}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  textDecoration: 'underline',
                }}
              >
                <RotateCcw size={12} /> Restart 5-second countdown
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#777', fontFamily: 'monospace' }}>
            <ShieldCheck size={14} style={{ color: '#22c55e' }} />
            {alreadyRedirected
              ? 'Previous session remembered · Ads active'
              : `Opening session in ${secondsLeft} seconds...`}
          </div>
        </div>

        {/* RIGHT SKYSCRAPER AD SECTOR (Google Adsense) */}
        <div
          id="ad-sector-right"
          style={{
            minHeight: 480,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0 #000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#000', color: '#fff', padding: '2px 6px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
            ADVERTISEMENT
          </span>
          <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace', writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '16px 0' }}>
            [ 160x600 / 300x600 Google AdSense Skyscraper ]
          </span>
        </div>
      </div>

      {/* BOTTOM AD SECTOR (Google Adsense Leaderboard) */}
      <div style={{ maxWidth: 1280, margin: '20px auto 0' }}>
        <div
          id="ad-sector-bottom"
          style={{
            width: '100%',
            minHeight: 110,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0 #000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#000', color: '#fff', padding: '2px 8px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
            ADVERTISEMENT · BOTTOM BANNER
          </span>
          <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace' }}>
            [ 728x90 Leaderboard / Responsive Google AdSense Slot ]
          </span>
        </div>
      </div>
    </div>
  );
}