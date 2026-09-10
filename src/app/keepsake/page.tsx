'use client';

/**
 * THE BOTANICAL KEEEPSAKE — a living 3D gift for someone you love.
 * Choose the tree, engrave the brass dedication, and send a garden
 * that will bloom for her forever.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeepsakeDiorama, KeepsakeDioramaRef } from '@/components/keepsake/keepsake-diorama';
import {
    KeepsakePresetId,
    KEEPSAKE_PALETTES,
    KeepsakeConfig,
} from '@/lib/keepsake/types';
import { Download, RefreshCw, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';

// The six synchronized world themes (matching the classic theme table),
// plus Zen Bonsai as the seventh keepsake. No seasons — a theme simply
// recolors the whole living world: tree, carpet, pavers, sky and breeze.
const PRESET_ORDER: KeepsakePresetId[] = [
    'sakura',
    'wisteria',
    'rose',
    'ginkgo',
    'hydrangea',
    'frost',
    'bonsai',
];

const PRESET_EMOJI: Record<KeepsakePresetId, string> = {
    sakura: '🌸',
    wisteria: '💜',
    rose: '🌹',
    ginkgo: '🍂',
    hydrangea: '💙',
    frost: '❄️',
    bonsai: '🌾',
};

const SERIF = "'Cormorant Garamond', Georgia, serif";
const CURSIVE = "'Caveat', 'Segoe Script', cursive";

export default function KeepsakePage() {
    const dioramaRef = useRef<KeepsakeDioramaRef>(null);

    const [presetId, setPresetId] = useState<KeepsakePresetId>('sakura');
    const [seed, setSeed] = useState('for-mom-with-love');
    const [title, setTitle] = useState('Happy Birthday Mom');
    const [subtitle, setSubtitle] = useState('May you forever bloom');
    const [signature, setSignature] = useState('');
    const [autoRotate, setAutoRotate] = useState(true);
    const [panelOpen, setPanelOpen] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Shareable links: /keepsake?preset=wisteria&title=…&subtitle=…&seed=…
    useEffect(() => {
        // Deferred one tick so hydration completes with the default garden,
        // then the shared link's garden blooms in.
        const apply = () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const p = params.get('preset') as KeepsakePresetId | null;
                if (p && KEEPSAKE_PALETTES[p]) setPresetId(p);
                if (params.get('seed')) setSeed(params.get('seed')!);
                if (params.get('title')) setTitle(params.get('title')!);
                if (params.get('subtitle')) setSubtitle(params.get('subtitle')!);
                if (params.get('signature')) setSignature(params.get('signature')!);
            } catch {
                /* private browsing etc. */
            }
        };
        const t = window.setTimeout(apply, 0);
        return () => window.clearTimeout(t);
    }, []);

    useEffect(() => {
        dioramaRef.current?.setAutoRotate(autoRotate);
    }, [autoRotate]);

    const config: KeepsakeConfig = useMemo(
        () => ({
            presetId,
            seed,
            plaque: {
                title: title.trim() || 'Happy Birthday Mom',
                subtitle: subtitle.trim() || 'May you forever bloom',
                signature: signature.trim() || undefined,
            },
        }),
        [presetId, seed, title, subtitle, signature]
    );

    const shuffleSeed = useCallback(() => {
        const tokens = ['bloom', 'garden', 'beloved', 'petal', 'grace', 'joy', 'eden', 'blossom', 'heart', 'forever'];
        const t = () => tokens[Math.floor(Math.random() * tokens.length)];
        const n = Math.floor(Math.random() * 900 + 100);
        setSeed(`${t()}-${t()}-${n}`);
    }, []);

    const handleDownload = useCallback(async () => {
        if (!dioramaRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await dioramaRef.current.captureSnapshot();
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `keepsake-${presetId}-${Date.now()}.png`;
            a.click();
        } finally {
            setIsExporting(false);
        }
    }, [presetId]);

    const palette = KEEPSAKE_PALETTES[presetId];

    const inputStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1px solid rgba(122,90,53,0.35)',
        borderRadius: 10,
        background: 'rgba(255,252,246,0.85)',
        color: '#3a2c1a',
        fontSize: '0.9rem',
        outline: 'none',
        fontFamily: SERIF,
        boxShadow: 'inset 0 1px 3px rgba(122,90,53,0.08)',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '0.66rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#8a6a45',
        marginBottom: 5,
        fontFamily: 'ui-monospace, monospace',
    };

    return (
        <main className="fixed inset-0 overflow-hidden bg-[#f6efe2]">
            {/* ─── The living diorama ─── */}
            <div className="absolute inset-0">
                <KeepsakeDiorama ref={dioramaRef} config={config} />
            </div>

            {/* ─── Title crest ─── */}
            <header className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10 px-4">
                <div
                    className="text-3xl sm:text-4xl leading-none"
                    style={{ fontFamily: CURSIVE, color: '#5a3f22', textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}
                >
                    The Botanical Keepsake
                </div>
                <div
                    className="mt-1 text-[0.6rem] sm:text-[0.66rem] tracking-[0.34em] uppercase"
                    style={{ fontFamily: 'ui-monospace, monospace', color: '#a3814f' }}
                >
                    A living garden, engraved for her
                </div>
            </header>

            {/* ─── Rotation hint ─── */}
            <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-[0.64rem] tracking-[0.16em] uppercase pointer-events-none"
                style={{
                    fontFamily: 'ui-monospace, monospace',
                    color: '#6d5330',
                    background: 'rgba(250,244,232,0.72)',
                    border: '1px solid rgba(163,129,79,0.35)',
                    backdropFilter: 'blur(6px)',
                    whiteSpace: 'nowrap',
                }}
            >
                drag to rotate · scroll to zoom
            </div>

            {/* ─── Control panel ─── */}
            <div className="absolute top-16 left-3 z-20" style={{ maxWidth: 'min(92vw, 300px)' }}>
                {/* Collapse toggle */}
                <button
                    onClick={() => setPanelOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[0.68rem] font-bold uppercase tracking-[0.12em]"
                    style={{
                        fontFamily: 'ui-monospace, monospace',
                        color: '#5a3f22',
                        background: 'rgba(252,246,235,0.88)',
                        border: '1px solid rgba(163,129,79,0.4)',
                        boxShadow: '0 8px 24px rgba(90,63,34,0.14)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <Sparkles size={13} style={{ color: '#c9a24b' }} />
                    Arrange the gift
                    <ChevronDown
                        size={14}
                        style={{ transform: panelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
                    />
                </button>

                {panelOpen && (
                    <div
                        className="mt-2 p-4 rounded-2xl overflow-y-auto"
                        style={{
                            maxHeight: 'calc(100vh - 150px)',
                            background: 'rgba(252,246,235,0.9)',
                            border: '1px solid rgba(163,129,79,0.4)',
                            boxShadow: '0 18px 50px rgba(90,63,34,0.2)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {/* Presets */}
                        <div style={labelStyle}>The tree</div>
                        <div className="grid grid-cols-1 gap-1.5 mb-4">
                            {PRESET_ORDER.map((id) => {
                                const p = KEEPSAKE_PALETTES[id];
                                const active = id === presetId;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setPresetId(id)}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150"
                                        style={{
                                            background: active
                                                ? `linear-gradient(120deg, ${p.canopy.primary}26, ${p.canopy.secondary}14)`
                                                : 'rgba(255,255,255,0.5)',
                                            border: `1.5px solid ${active ? p.canopy.primary : 'rgba(163,129,79,0.28)'}`,
                                            boxShadow: active ? `0 4px 14px ${p.canopy.primary}33` : 'none',
                                        }}
                                    >
                                        <span
                                            className="w-4 h-4 rounded-full shrink-0"
                                            style={{
                                                background: `radial-gradient(circle at 32% 30%, ${p.canopy.highlight}, ${p.canopy.primary} 62%, ${p.canopy.deep})`,
                                                boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.18)',
                                            }}
                                        />
                                        <span
                                            className="text-[0.86rem]"
                                            style={{ fontFamily: SERIF, color: active ? '#3a2c1a' : '#6d5330', fontWeight: active ? 700 : 500 }}
                                        >
                                            {PRESET_EMOJI[id]} {p.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Engraving */}
                        <div style={labelStyle}>Brass engraving</div>
                        <div className="space-y-2 mb-4">
                            <input
                                style={{ ...inputStyle, fontFamily: CURSIVE, fontSize: '1.05rem' }}
                                value={title}
                                maxLength={42}
                                placeholder="Happy Birthday Mom"
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <input
                                style={inputStyle}
                                value={subtitle}
                                maxLength={52}
                                placeholder="May you forever bloom"
                                onChange={(e) => setSubtitle(e.target.value)}
                            />
                            <input
                                style={{ ...inputStyle, fontStyle: 'italic' }}
                                value={signature}
                                maxLength={40}
                                placeholder="— with love, Emma"
                                onChange={(e) => setSignature(e.target.value)}
                            />
                        </div>

                        {/* Seed */}
                        <div style={labelStyle}>Garden seed — hers alone</div>
                        <div className="flex gap-1.5 mb-4">
                            <input
                                style={{ ...inputStyle, flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem' }}
                                value={seed}
                                maxLength={48}
                                onChange={(e) => setSeed(e.target.value.replace(/\s+/g, '-'))}
                            />
                            <button
                                onClick={shuffleSeed}
                                title="Grow a new unique garden"
                                className="shrink-0 px-3 rounded-[10px] flex items-center"
                                style={{
                                    border: '1px solid rgba(163,129,79,0.4)',
                                    background: 'linear-gradient(160deg, #f7e3b2, #e6c37a)',
                                    color: '#5a3f22',
                                }}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <p
                            className="text-[0.66rem] leading-relaxed mb-4"
                            style={{ fontFamily: SERIF, color: '#8a6a45', fontStyle: 'italic' }}
                        >
                            The same seed always grows the same garden — every tree as
                            singular and reproducible as the person it's for.
                        </p>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => dioramaRef.current?.resetCamera()}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.68rem] font-bold uppercase tracking-[0.1em]"
                                style={{
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#5a3f22',
                                    border: '1px solid rgba(163,129,79,0.4)',
                                    background: 'rgba(255,255,255,0.55)',
                                }}
                            >
                                <RotateCcw size={13} /> View
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isExporting}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[0.68rem] font-bold uppercase tracking-[0.1em] disabled:opacity-60"
                                style={{
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#fff8ea',
                                    background: `linear-gradient(150deg, ${palette.canopy.secondary}, ${palette.canopy.deep})`,
                                    boxShadow: `0 6px 18px ${palette.canopy.secondary}55`,
                                }}
                            >
                                <Download size={13} /> {isExporting ? 'Framing…' : 'Keep it'}
                            </button>
                        </div>

                        <button
                            onClick={() => setAutoRotate((v) => !v)}
                            className="mt-1.5 w-full px-3 py-2 rounded-xl text-[0.66rem] font-bold uppercase tracking-[0.12em]"
                            style={{
                                fontFamily: 'ui-monospace, monospace',
                                color: autoRotate ? '#8a6a45' : '#b09468',
                                border: '1px dashed rgba(163,129,79,0.4)',
                                background: 'transparent',
                            }}
                        >
                            {autoRotate ? '◉ slow turn: on' : '○ slow turn: off'}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
