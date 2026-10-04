'use client';

/**
 * src/app/teleprompter/mirror/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CREW MODE — the second screen (owner ruling 2026-10-04).
 *
 * The teleprompter compresses {script, speed, fontSize} into the ?d= query
 * param (lz-string, payload-encoded URL — same pattern as the receipt share
 * links; nothing ever touches a server). The creator opens this link on a
 * laptop or second phone, puts the FIRST phone on a tripod, and films with
 * the native camera app at full quality while this page scrolls the script.
 *
 * This is the only way to read a script AND film simultaneously on an iPhone
 * (no split-screen, no overlay) — the design stops fighting that wall and
 * gives the second job to a second screen.
 *
 * Tap anywhere to pause/resume. Speed and restart live in the top-right HUD;
 * the yellow read-line marks where to aim your eyes.
 */

import { useEffect, useRef, useState } from 'react';
import { decompressFromEncodedURIComponent as lzDecompress } from 'lz-string';

interface MirrorPayload {
    s: string;
    v: number;
    f: number;
}

const BASE_FONT = 32; // the teleprompter's default font size — mirror scales relative to it
const PX_PER_SPEED = 38; // px/second at speed 1.0

export default function TeleprompterMirrorPage() {
    const [payload, setPayload] = useState<MirrorPayload | null>(null);
    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(2.2);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastTsRef = useRef<number>(0);
    const offsetRef = useRef<number>(0);

    // Parse the payload-encoded link (window.location — no useSearchParams, so
    // the page stays statically prerenderable).
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('d');
            if (raw) {
                const parsed = lzDecompress(raw);
                if (parsed) {
                    const obj = JSON.parse(parsed) as Partial<MirrorPayload>;
                    if (typeof obj.s === 'string' && obj.s.trim().length > 0) {
                        setPayload({ s: obj.s, v: obj.v ?? 2.2, f: obj.f ?? BASE_FONT });
                        if (typeof obj.v === 'number' && obj.v > 0) setSpeed(obj.v);
                    }
                }
            }
        } catch {
            /* invalid link → the empty state explains what to do */
        }
        setReady(true);
    }, []);

    // Auto-scroll loop — requestAnimationFrame keeps the crawl perfectly smooth
    // and pausable; dt-based so speed changes don't jump.
    useEffect(() => {
        const step = (ts: number) => {
            const last = lastTsRef.current || ts;
            const dt = (ts - last) / 1000;
            lastTsRef.current = ts;
            if (playing && payload) {
                offsetRef.current += speed * PX_PER_SPEED * dt;
                if (scrollRef.current) scrollRef.current.scrollTop = offsetRef.current;
            }
            rafRef.current = requestAnimationFrame(step);
        };
        lastTsRef.current = 0;
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [playing, speed, payload]);

    const fontScale = payload && payload.f ? Math.max(0.7, Math.min(1.6, payload.f / BASE_FONT)) : 1;

    const hudButton: React.CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '2px solid #000',
        background: '#fff',
        color: '#000',
        fontFamily: 'monospace',
        fontWeight: 900,
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#0a0a0a',
                color: '#fafafa',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
            onClick={() => setPlaying((p) => !p)}
        >
            {/* Read-line: aim your eyes here */}
            <div
                style={{
                    position: 'absolute',
                    top: '30%',
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#FFE500',
                    zIndex: 2,
                    pointerEvents: 'none',
                    boxShadow: '0 0 12px rgba(255,229,0,0.85)',
                }}
            />

            {/* HUD */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
                    right: 10,
                    zIndex: 3,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                }}
            >
                <button style={hudButton} onClick={() => setSpeed((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))} title="Slower">
                    −
                </button>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.8rem', minWidth: 42, textAlign: 'center' }}>
                    {speed.toFixed(1)}×
                </span>
                <button style={hudButton} onClick={() => setSpeed((s) => Math.min(6, +(s + 0.2).toFixed(1)))} title="Faster">
                    +
                </button>
                <button
                    style={{ ...hudButton, fontSize: '0.9rem' }}
                    onClick={() => {
                        offsetRef.current = 0;
                        if (scrollRef.current) scrollRef.current.scrollTop = 0;
                    }}
                    title="Restart from the top"
                >
                    ↺
                </button>
                <span
                    style={{
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.62rem',
                        letterSpacing: '0.06em',
                        padding: '6px 10px',
                        border: '2px solid #000',
                        background: playing ? '#FFE500' : '#3f3f46',
                        color: playing ? '#000' : '#fafafa',
                    }}
                >
                    {playing ? 'SCROLLING' : 'PAUSED'}
                </span>
            </div>

            {/* The script */}
            <div
                ref={scrollRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'auto',
                    paddingTop: '34vh',
                    paddingBottom: '75vh',
                    paddingLeft: 16,
                    paddingRight: 16,
                }}
            >
                {ready && !payload ? (
                    <div
                        style={{
                            fontFamily: 'monospace',
                            fontSize: 'clamp(0.9rem, 2.2vw, 1.1rem)',
                            color: '#a1a1aa',
                            maxWidth: 560,
                            margin: '8vh auto 0',
                            textAlign: 'center',
                            lineHeight: 1.7,
                            border: '2px dashed #3f3f46',
                            padding: '22px 18px',
                        }}
                    >
                        NO SCRIPT IN THIS LINK
                        <br />
                        <br />
                        Open the CreatorsKit teleprompter on your phone, tap the second-screen
                        button (the monitor icon) and send a fresh link to this device.
                    </div>
                ) : (
                    <div
                        style={{
                            fontSize: `calc(clamp(26px, 5.4vw, 58px) * ${fontScale})`,
                            fontWeight: 800,
                            lineHeight: 1.85,
                            whiteSpace: 'pre-wrap',
                            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                            opacity: playing ? 1 : 0.85,
                            transition: 'opacity 0.2s',
                            paddingBottom: 8,
                        }}
                    >
                        {payload?.s ?? ''}
                    </div>
                )}
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    color: '#a1a1aa',
                    pointerEvents: 'none',
                    zIndex: 2,
                }}
            >
                TAP ANYWHERE TO PAUSE / RESUME · CK.WIN SCRIPT MIRROR
            </div>
        </div>
    );
}
