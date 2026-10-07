'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredConsent, writeConsent, type ConsentChoice } from '@/lib/consent';

/**
 * ConsentGate — the accept/deny cookie banner (owner ruling 2026-10-07).
 *
 * Shown once per visitor until they choose. Until ACCEPT, GA4 Consent Mode
 * keeps analytics_storage/ad_storage DENIED (no cookies, no measurement
 * hits that store anything). DENY keeps everything off permanently but
 * still counts as a cookieless consent ping, so the accepted-vs-denied
 * ratio shows up in GA4's Consent Overview.
 */
export default function ConsentGate() {
    const [choice, setChoice] = useState<ConsentChoice | null | 'unresolved'>('unresolved');

    useEffect(() => {
        setChoice(getStoredConsent());
    }, []);

    // Don't render anything during SSR / before we know the stored state.
    if (choice !== null) return null;

    const decide = (c: ConsentChoice) => {
        writeConsent(c);
        setChoice(c);
    };

    return (
        <div
            role="dialog"
            aria-label="Cookie consent"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2147483000,
                background: '#ffffff',
                borderTop: '3px solid #000000',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.18)',
                padding: '14px clamp(14px, 4vw, 28px) calc(14px + env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(12px, 3vw, 22px)',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ maxWidth: 640, flex: '1 1 340px', minWidth: 240 }}>
                <div
                    style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        color: '#000',
                        marginBottom: 4,
                    }}
                >
                    Cookies — your call
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: '#3f3f46' }}>
                    Accept to let Google Analytics & ads remember anonymous stats (which pages, which tools) and set their cookies. Deny and
                    nothing is stored — the tools keep working exactly the same.{' '}
                    <Link href="/privacy" style={{ color: '#000', fontWeight: 800, textDecoration: 'underline' }}>
                        Privacy policy
                    </Link>
                </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flex: '0 0 auto' }}>
                <button
                    onClick={() => decide('denied')}
                    style={{
                        background: '#ffffff',
                        color: '#000000',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0 #000000',
                        padding: '10px 16px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                    }}
                >
                    Deny
                </button>
                <button
                    onClick={() => decide('granted')}
                    style={{
                        background: '#000000',
                        color: '#ffffff',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0 #000000',
                        padding: '10px 16px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                    }}
                >
                    Accept
                </button>
            </div>
        </div>
    );
}
