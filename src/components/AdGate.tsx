'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { recordGateShown, gateOnCooldown } from '@/lib/ad-gate';

/**
 * AdGate — the action sponsor screen (owner ruling 2026-10-07).
 *
 * Gates a key action (Generate / Download) behind a short SPONSORED pause:
 * a 4-second countdown, then CONTINUE. Policy-safe by design
 * (owner asked "is this illegal on Google?"): this is a HOUSE interstitial —
 * it shows in-house cross-promos / a reserved AdSense slot AROUND the
 * countdown, never requires clicking an ad, and the action always completes.
 * That keeps it inside AdSense placement policy (no forced ad interaction,
 * no click-to-continue-with-ad). Cooldown lives in src/lib/ad-gate.ts.
 *
 * Usage:
 *   import { gateAction } from '@/components/AdGate';
 *   onClick={() => gateAction('match-cut', 'Generate', 'generate', 120000, () => doGenerate())}
 *
 * Mount <AdGateHost /> once (ClientLayout renders it).
 */

type GateRequest = {
    tool: string;
    label: string;
    action: 'generate' | 'download';
    cooldownMs: number;
    then: () => void;
};

type Listener = (req: GateRequest) => void;
const listeners = new Set<Listener>();

const COUNTDOWN_SECONDS = 4;

/** Call before a gated action. Runs immediately when the cooldown is live. */
export function gateAction(
    tool: string,
    label: string,
    action: 'generate' | 'download',
    cooldownMs: number,
    then: () => void,
): void {
    if (gateOnCooldown(tool, cooldownMs)) {
        then();
        return;
    }
    let handled = false;
    listeners.forEach((l) => {
        handled = true;
        l({ tool, label, action, cooldownMs, then });
    });
    // No host mounted (SSR edge, fullscreen page without host) → never block.
    if (!handled) then();
}

export function AdGateHost() {
    const [req, setReq] = useState<GateRequest | null>(null);
    const [left, setLeft] = useState(COUNTDOWN_SECONDS);
    const timerRef = useRef<number | null>(null);

    const finish = useCallback(
        (run: boolean) => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            const r = req;
            setReq(null);
            if (r && run) {
                recordGateShown(r.tool);
                r.then();
            }
        },
        [req],
    );

    useEffect(() => {
        const l: Listener = (r) => {
            setReq(r);
            setLeft(COUNTDOWN_SECONDS);
        };
        listeners.add(l);
        return () => {
            listeners.delete(l);
        };
    }, []);

    useEffect(() => {
        if (!req) return;
        timerRef.current = window.setInterval(() => {
            setLeft((s) => (s <= 1 ? 0 : s - 1));
        }, 1000);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [req]);

    // Escape = dismiss without running (user can re-trigger the action).
    useEffect(() => {
        if (!req) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finish(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [req, finish]);

    if (!req) return null;

    const verb = req.action === 'generate' ? 'GENERATING' : 'PREPARING DOWNLOAD';

    return (
        <div
            role="dialog"
            aria-label="Sponsored pause"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 2147482000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) finish(false);
            }}
        >
            <div
                style={{
                    width: 'min(420px, 94vw)',
                    background: '#fff',
                    border: '3px solid #000',
                    boxShadow: '6px 6px 0 #000',
                    padding: '18px 18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                        style={{
                            fontSize: '0.58rem',
                            fontWeight: 900,
                            background: '#000',
                            color: '#fff',
                            padding: '3px 7px',
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em',
                        }}
                    >
                        SPONSORED PAUSE
                    </span>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#71717a', fontWeight: 700 }}>
                        {req.label.toUpperCase()} · KEEPING THE TOOLS FREE
                    </span>
                </div>

                {/* Reserved ad slot — in-house promo now, AdSense unit later. */}
                <div
                    style={{
                        border: '2px dashed #000',
                        background: '#fafafa',
                        height: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textAlign: 'center',
                        padding: 10,
                    }}
                >
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace' }}>MORE FREE CREATOR TOOLS</span>
                    <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', color: '#71717a' }}>
                        Invoices & brand deals · Teleprompter · Quote cards · Thumbnail A/B lab
                    </span>
                </div>

                <button
                    onClick={() => finish(true)}
                    disabled={left > 0}
                    style={{
                        background: left > 0 ? '#e4e4e7' : '#000',
                        color: left > 0 ? '#71717a' : '#fff',
                        border: '2px solid #000',
                        boxShadow: left > 0 ? 'none' : '3px 3px 0 #000',
                        padding: '12px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: left > 0 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {left > 0 ? `${verb} IN ${left}s…` : `CONTINUE — ${req.label}`}
                </button>
            </div>
        </div>
    );
}
