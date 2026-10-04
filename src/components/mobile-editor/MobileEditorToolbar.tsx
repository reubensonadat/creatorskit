'use client';

import * as React from 'react';

/**
 * Phase-6 Canva-pattern toolbar (docs/TOOL_INTEGRATION_PLAN.md §8):
 * a fixed bottom bar of icon+label category chips — horizontally
 * scrollable, safe-area aware, monochrome brutalist. The host page keeps
 * its canvas in normal flow above the bar, so the canvas NEVER sits under
 * it. Tapping a chip opens that category's slide-up sheet; tapping the
 * active chip again closes it.
 *
 * Visibility gating is intentionally left to the host page (CSS breakpoint)
 * so each studio keeps its own desktop/mobile boundary — SSR-safe.
 */

export interface MobileEditorCategory {
    id: string;
    label: string;
    icon: React.ReactNode;
}

export default function MobileEditorToolbar({
    categories,
    active,
    onSelect,
    theme = 'light',
}: {
    categories: MobileEditorCategory[];
    /** id of the open sheet, or null when every sheet is closed */
    active: string | null;
    /** called with the newly selected id, or null when the sheet should close */
    onSelect: (id: string | null) => void;
    /**
     * Visual theme. 'light' (default) is white paper + black chips — the standard
     * brutalist studios. 'dark' matches the fullscreen dark studios (thumbnail-lab:
     * #09090b chrome, #18181b chips, #FFE500 active accent) so the bar no longer
     * glows white against a black page.
     */
    theme?: 'light' | 'dark';
}) {
    const dark = theme === 'dark';
    return (
        <div
            className={`ck-mobile-editor-toolbar${dark ? ' ck-mobile-editor-toolbar--dark' : ''}`}
            role="tablist"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 60,
                display: 'flex',
                gap: 6,
                alignItems: 'stretch',
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                padding: '8px 10px calc(8px + env(safe-area-inset-bottom, 0px))',
                background: dark ? '#09090b' : '#fff',
                borderTop: dark ? '2.5px solid #FFE500' : '2.5px solid #000',
                boxSizing: 'border-box',
            }}
        >
            {categories.map((cat) => {
                const isActive = active === cat.id;
                return (
                    <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(isActive ? null : cat.id)}
                        style={{
                            flex: '1 0 auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            minWidth: 72,
                            padding: '8px 10px',
                            background: isActive ? (dark ? '#FFE500' : '#000') : dark ? '#18181b' : '#fff',
                            color: isActive ? (dark ? '#000' : '#fff') : dark ? '#fff' : '#000',
                            border: dark ? '2px solid #3f3f46' : '2px solid #000',
                            boxShadow: isActive ? 'none' : dark ? '2px 2px 0 rgba(255, 229, 0, 0.35)' : '2px 2px 0 #000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.56rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {cat.icon}
                        <span>{cat.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
