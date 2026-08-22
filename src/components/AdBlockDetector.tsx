'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, X, HelpCircle } from 'lucide-react';

export default function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkAdBlocker = () => {
    // Check if user already dismissed this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('adblock_dismissed') === 'true') {
      return;
    }

    // High-accuracy DOM bait check: only triggers if an ad blocker extension actively hides or removes ad containers
    try {
      const bait = document.createElement('div');
      bait.className = 'adsbox ad-placement doubleclick-ad pub_300x250';
      bait.style.position = 'absolute';
      bait.style.left = '-9999px';
      bait.style.top = '-9999px';
      bait.style.width = '100px';
      bait.style.height = '100px';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);

      setTimeout(() => {
        const isHidden =
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.offsetLeft === 0 ||
          window.getComputedStyle(bait).display === 'none' ||
          window.getComputedStyle(bait).visibility === 'hidden';

        if (isHidden && !dismissed) {
          setAdBlockDetected(true);
        }

        if (document.body.contains(bait)) {
          document.body.removeChild(bait);
        }
      }, 500);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Delay check slightly to prevent race conditions during hydration
    const timer = setTimeout(() => {
      checkAdBlocker();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setAdBlockDetected(false);
    sessionStorage.setItem('adblock_dismissed', 'true');
  };

  if (!adBlockDetected || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '4px solid #000000',
          boxShadow: '10px 10px 0 #000000',
          maxWidth: '540px',
          width: '100%',
          padding: '32px 28px',
          color: '#000000',
          position: 'relative',
        }}
      >
        {/* Dismiss X button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: '2px solid #000',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss notice"
        >
          <X size={16} />
        </button>

        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: '#FFDD00',
              border: '3px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '3px 3px 0 #000000',
            }}
          >
            <ShieldAlert size={24} style={{ color: '#000000' }} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'monospace',
                fontWeight: 900,
                background: '#000000',
                color: '#ffffff',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              Notice
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '4px 0 0' }}>
              Ad blocker detected
            </h2>
          </div>
        </div>

        {/* Friendly Explanation */}
        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#333333', fontWeight: 500, marginBottom: 20 }}>
          It looks like you are using an ad blocker. Running and maintaining these free tools comes with real costs, and ads are what allow us to keep them available to everyone at no charge. Please consider whitelisting our site—it only takes a few seconds and truly helps support us. 🙏
        </p>

        {/* Step-by-Step Whitelist Instructions */}
        <div
          style={{
            background: '#F9F9F9',
            border: '2px solid #000000',
            padding: '16px 18px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={14} /> How to whitelist this site:
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.7, color: '#222222', fontWeight: 600 }}>
            <li>Click the ad blocker icon in your browser toolbar.</li>
            <li>Select <b>&quot;Disable on this site&quot;</b> or <b>&quot;Whitelist&quot;</b>.</li>
            <li>Reload the page.</li>
          </ol>
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#666666', fontStyle: 'italic' }}>
            This banner will disappear automatically once your ad blocker is disabled.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => window.location.reload()}
            className="brutalist-button brutalist-button-primary"
            style={{
              flex: 1,
              padding: '12px 18px',
              fontSize: '0.85rem',
              justifyContent: 'center',
              fontWeight: 900,
            }}
          >
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            Reload Page
          </button>
          <button
            onClick={handleDismiss}
            className="brutalist-button"
            style={{
              padding: '12px 18px',
              fontSize: '0.85rem',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
