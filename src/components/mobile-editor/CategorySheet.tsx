'use client';

import * as React from 'react';

/**
 * Phase-6 Canva-pattern bottom sheet (docs/TOOL_INTEGRATION_PLAN.md §8):
 * one slide-up sheet per category.
 *
 * - `peek` (~60vh): the canvas stays visible above the sheet — the
 *   backdrop is transparent, and tapping the visible canvas closes it.
 * - `full` (~85vh): a dimmed backdrop; DONE (top right) or a backdrop
 *   tap closes it.
 *
 * Drag handle + title + DONE header, scrollable body, safe-area aware.
 * Visibility gating is left to the host page (CSS breakpoint).
 */

export default function CategorySheet({
    open,
    title,
    size = 'peek',
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    size?: 'peek' | 'full';
    onClose: () => void;
    children: React.ReactNode;
}) {
    const [shown, setShown] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setShown(false);
            return;
        }
        // Mount first, then flip the transform on the next frame so the
        // slide-up transition actually plays.
        const raf = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf);
    }, [open]);

    // Escape hatch — keyboard users close with Esc just like DONE.
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const height = size === 'full' ? '85vh' : 'min(60vh, 560px)';

    return (
        <>
            {/* Tap-catcher: transparent in peek mode (canvas fully visible —
                tap it to get back), dimmed in full mode. */}
            <div
                onClick={onClose}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 70,
                    background: size === 'full' ? 'rgba(0, 0, 0, 0.45)' : 'transparent',
                }}
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 80,
                    height,
                    maxHeight: height,
                    background: '#fff',
                    borderTop: '3px solid #000',
                    boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.28)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: shown ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                }}
            >
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 2, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 5, borderRadius: 999, background: '#000', opacity: 0.35 }} />
                </div>
                {/* Header: title + DONE */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '6px 14px 10px',
                        flexShrink: 0,
                        borderBottom: '2px solid #000',
                    }}
                >
                    <div
                        style={{
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#000',
                        }}
                    >
                        {title}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#000',
                            color: '#fff',
                            border: '2px solid #000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.66rem',
                            letterSpacing: '0.08em',
                            padding: '7px 14px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        DONE
                    </button>
                </div>
                {/* Scrollable body */}
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        padding: '12px 14px calc(24px + env(safe-area-inset-bottom, 0px))',
                    }}
                >
                    {children}
                </div>
            </section>
        </>
    );
}
