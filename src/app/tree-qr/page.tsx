'use client';

import React, { useState, useRef, useEffect } from 'react';
import VoxelDiorama, { type VoxelDioramaRef } from '@/components/tree-qr/voxel-diorama';
import {
    SeasonType,
    SceneType,
    FoliagePalette,
    PRESET_PALETTES,
} from '@/lib/tree-qr/tree-generator';
import { ambientSoundscape } from '@/lib/tree-qr/audio-ambient';
import { encodeReceipt, ReceiptPayload } from '@/lib/receipt/receipt-link';
import { saveBouquetToDatabase } from '@/lib/supabase';
import {
    RotateCcw,
    RotateCw,
    Crosshair,
    Download,
    Share2,
    Check,
    Volume2,
    VolumeX,
    Copy,
    X,
    SlidersHorizontal,
    ChevronRight,
    ArrowLeft,
    QrCode,
    TreePine,
} from 'lucide-react';

// ─── Brutalist vocabulary ─────────────────────────────────────────────────────

const BRUT_LABEL: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 900,
    fontFamily: 'monospace, system-ui, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#000',
};

const BRUT_INPUT: React.CSSProperties = {
    padding: '8px 12px',
    border: '2px solid #000',
    borderRadius: 4,
    background: '#f4f4f5',
    fontSize: '0.84rem',
    fontWeight: 600,
    color: '#000',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

function brutChip(active: boolean): React.CSSProperties {
    return {
        padding: '6px 12px',
        border: '2px solid #000',
        borderRadius: 4,
        background: active ? '#FFE500' : '#ffffff',
        color: '#000',
        fontFamily: 'monospace, system-ui, sans-serif',
        fontWeight: 900,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: active ? '2px 2px 0 #000' : 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.12s',
    };
}

const PRESET_SCENE_IDS = [
    'sakura', 'tree', 'maple', 'ginkgo', 'magnolia', 'hydrangea',
    'frost', 'oak', 'rose', 'wisteria', 'bonsai', 'pine', 'house',
] as const;

// Centerpiece catalog — emoji glyph + display name + growth-rule blurb.
const SCENE_CATALOG: Array<{ id: SceneType; glyph: string; label: string; hint: string }> = [
    { id: 'sakura', glyph: '🌸', label: 'Sakura', hint: 'Wide round blossom cloud' },
    { id: 'maple', glyph: '🍁', label: 'Crimson Maple', hint: 'Dense spreading dome' },
    { id: 'ginkgo', glyph: '🍂', label: 'Ginkgo', hint: 'Boxy architectural canopy' },
    { id: 'magnolia', glyph: '🌺', label: 'Magnolia', hint: 'Loose puffy clumps' },
    { id: 'hydrangea', glyph: '💠', label: 'Hydrangea', hint: 'Rolled bloom clusters' },
    { id: 'frost', glyph: '❄️', label: 'Winter Frost', hint: 'Sparse icy gaps' },
    { id: 'oak', glyph: '🌳', label: 'Summer Oak', hint: 'Broad heavy crown' },
    { id: 'rose', glyph: '🌹', label: 'Rose Bouquet', hint: 'Compact tight puffs' },
    { id: 'wisteria', glyph: '💜', label: 'Wisteria', hint: 'Weeping hanging trails' },
    { id: 'bonsai', glyph: '🪴', label: 'Zen Bonsai', hint: 'Tiered cloud pads' },
    { id: 'pine', glyph: '🌲', label: 'Pagoda Pine', hint: 'Tall tapered spire' },
    { id: 'house', glyph: '🏡', label: 'Cottage House', hint: 'Cozy home centerpiece' },
];

// Ready-made dedication notes — the kinds of messages a living QR can carry.
const MESSAGE_PRESETS: Array<{ label: string; glyph: string; text: string }> = [
    {
        label: 'Birthday',
        glyph: '🎂',
        text: 'Happy birthday! I grew this little world for you — tap the tree and scan the code when you\'re ready to celebrate.',
    },
    {
        label: 'Love Note',
        glyph: '❤️',
        text: 'Every leaf in this garden hides a piece of my heart. Scan the tree to find what I left underneath it for you.',
    },
    {
        label: 'Thank You',
        glyph: '🙌',
        text: 'Thank you for everything you do. There\'s a small surprise waiting under this tree — scan it to open it.',
    },
    {
        label: 'Invitation',
        glyph: '✉️',
        text: 'You\'re invited! Scan the tree to unwrap your personal invitation and all the details.',
    },
    {
        label: 'Just Because',
        glyph: '🌱',
        text: 'No occasion — I just felt like sending you a living garden. Tap it, explore it, enjoy it.',
    },
];

export default function TreeQRPage() {
    const dioramaRef = useRef<VoxelDioramaRef>(null);

    // State
    const [urlInput, setUrlInput] = useState('https://creatorkit.app/');
    const [activeUrl, setActiveUrl] = useState('https://creatorkit.app/');
    const [sceneType, setSceneType] = useState<SceneType>('sakura');
    // Seasons retired — the botanical palette alone drives the whole world.
    const season: SeasonType = 'spring';
    const [paletteId, setPaletteId] = useState<string>('sakura');
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [controlsOpen, setControlsOpen] = useState(true);

    // Digital Bouquet / Gift fields
    const [senderName, setSenderName] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [giftMessage, setGiftMessage] = useState('');
    const [isSavingBouquet, setIsSavingBouquet] = useState(false);
    const [bouquetSavedModal, setBouquetSavedModal] = useState<{ id: string; url: string } | null>(null);
    const [bouquetCopied, setBouquetCopied] = useState(false);

    // Choosing a centerpiece syncs the world palette to its native bloom
    const SCENE_PALETTE: Partial<Record<SceneType, string>> = {
        sakura: 'sakura',
        maple: 'maple',
        ginkgo: 'ginkgo',
        magnolia: 'magnolia',
        hydrangea: 'hydrangea',
        frost: 'frost',
        oak: 'lush',
        rose: 'rose',
        wisteria: 'wisteria',
        house: 'autumn',
    };

    const handlePaletteSelect = (palId: string) => {
        setPaletteId(palId);
    };

    const handleUrlSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = urlInput.trim();
        if (trimmed) {
            setActiveUrl(trimmed);
        }
    };

    // Toggle Audio
    const toggleAudio = () => {
        const nextState = ambientSoundscape.toggle();
        setIsAudioActive(nextState);
    };

    // Quick preset link chips
    const applyPreset = (presetUrl: string) => {
        setUrlInput(presetUrl);
        setActiveUrl(presetUrl);
    };

    // Export pure scannable 2D QR
    const handleDownload2D = async () => {
        if (!dioramaRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await dioramaRef.current.captureSnapshot(true);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `digital-bouquet-qr-2d-${Date.now()}.png`;
            a.click();
        } finally {
            setIsExporting(false);
        }
    };

    // Export 3D Isometric Snapshot
    const handleDownload3D = async () => {
        if (!dioramaRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await dioramaRef.current.captureSnapshot(false);
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `digital-bouquet-3d-${Date.now()}.png`;
            a.click();
        } finally {
            setIsExporting(false);
        }
    };

    // Copy Share Link
    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/tree-qr?url=${encodeURIComponent(
            activeUrl
        )}&palette=${paletteId}&scene=${sceneType}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Save & Share as a Living 3D Gift
    const handleCreateBouquet = async () => {
        setIsSavingBouquet(true);
        try {
            const shortId = await saveBouquetToDatabase({
                sceneType,
                season,
                paletteId,
                targetUrl: activeUrl,
                senderName: senderName.trim() || undefined,
                recipientName: recipientName.trim() || undefined,
                message: giftMessage.trim() || undefined,
                audioEnabled: isAudioActive,
            });

            const finalId = shortId || 'bq_' + Math.random().toString(36).substring(2, 8);

            // Build self-contained query parameters so the gift card renders with 100% fidelity
            const qp = new URLSearchParams();
            if (senderName.trim()) qp.set('from', senderName.trim());
            if (recipientName.trim()) qp.set('to', recipientName.trim());
            if (giftMessage.trim()) qp.set('msg', giftMessage.trim());
            if (sceneType !== 'sakura') qp.set('scene', sceneType);
            if (paletteId !== 'sakura') qp.set('pal', paletteId);
            if (activeUrl && activeUrl !== 'https://creatorkit.app/') qp.set('u', activeUrl);
            if (isAudioActive) qp.set('audio', '1');

            const qs = qp.toString();
            const shareableUrl = `${window.location.origin}/bouquet/${finalId}${qs ? '?' + qs : ''}`;
            setBouquetSavedModal({ id: finalId, url: shareableUrl });
            navigator.clipboard.writeText(shareableUrl);
            setBouquetCopied(true);
            setTimeout(() => setBouquetCopied(false), 3000);
        } catch (err) {
            console.error('Error saving bouquet:', err);
        } finally {
            setIsSavingBouquet(false);
        }
    };

    // Open physical thermal receipt pass in /receipt
    const handleOpenReceiptPass = () => {
        const receiptPayload: ReceiptPayload = {
            n: 'CREATORKIT STUDIOS',
            h: '@creatorkit',
            e: 'studio@creatorkit.app',
            p: '+233 24 000 0000',
            l: 'DIGITAL / ACCRA',
            c: recipientName || 'COLLECTOR',
            a: senderName || 'DIORAMA PASS',
            cu: 'USD',
            rn: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
            dt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            it: [
                { d: `3D Digital Bouquet (${sceneType.toUpperCase()})`, q: 1, r: 0 },
                { d: `Palette: ${currentPalette.name}`, q: 1, r: 0 },
                { d: `Target: ${activeUrl.replace(/^https?:\/\//, '').slice(0, 26)}`, q: 1, r: 0 },
            ],
            da: 0,
            tp: 0,
            ap: 0,
            pt: 'momo',
            mn: 'MTN',
            mu: 'TREE-PASS',
            bn: 'DIORAMA VAULT',
            ba: 'PASS-TOKEN',
        };

        const encoded = encodeReceipt(receiptPayload);
        window.open(`/receipt?r=${encoded}`, '_blank');
    };

    // Read query params on mount if any (deferred one frame so the effect
    // body itself stays side-effect free and SSR HTML stays stable)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qUrl = params.get('url');
        const qSeason = params.get('season') as SeasonType | null;
        const qPalette = params.get('palette');
        const qScene = params.get('scene') as SceneType | null;

        const restore = () => {
            if (qUrl) {
                setUrlInput(qUrl);
                setActiveUrl(qUrl);
            }
            // Legacy share links encoded a season — map it onto its palette
            if (qSeason === 'summer') setPaletteId('lush');
            else if (qSeason === 'autumn') setPaletteId('autumn');
            else if (qSeason === 'winter') setPaletteId('frost');
            if (qPalette && PRESET_PALETTES[qPalette]) {
                setPaletteId(qPalette);
            }
            if (qScene && PRESET_SCENE_IDS.includes(qScene)) {
                setSceneType(qScene);
            }
        };

        const raf = requestAnimationFrame(restore);
        return () => cancelAnimationFrame(raf);
    }, []);

    // Start with the studio panel closed on narrow screens; ESC toggles it.
    useEffect(() => {
        if (window.innerWidth < 760) setControlsOpen(false);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setControlsOpen((o) => !o);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const currentPalette: FoliagePalette = PRESET_PALETTES[paletteId] || PRESET_PALETTES.sakura;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                overflow: 'hidden',
                background: '#f6f3ec',
                fontFamily: 'monospace, system-ui, sans-serif',
            }}
        >
            {/* ─── FULL-PAGE LIVING CANVAS ─────────────────────────────── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <VoxelDiorama
                    ref={dioramaRef}
                    urlText={activeUrl}
                    season={season}
                    sceneType={sceneType}
                    palette={currentPalette}
                    sidebarInset={controlsOpen ? 416 : 0}
                    onViewModeChange={(mode) => setViewMode(mode)}
                />
            </div>

            {/* Soft scrim so the top overlay chips stay legible over the diorama */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 110,
                    zIndex: 5,
                    pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, rgba(246,243,236,0.92), rgba(246,243,236,0))',
                }}
            />

            {/* ─── TOP-LEFT: identity + live status ─────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    pointerEvents: 'none',
                    maxWidth: 'calc(100vw - 160px)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', pointerEvents: 'auto' }}>
                    <a
                        href="/"
                        className="brutalist-button"
                        style={{ padding: '6px 10px', fontSize: '0.66rem', gap: 6, textDecoration: 'none' }}
                        title="Back to CreatorKit"
                    >
                        <ArrowLeft size={13} />
                        CK
                    </a>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#000',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            background: '#FFE500',
                            padding: '5px 10px',
                            border: '2px solid #000',
                            boxShadow: '2px 2px 0 #000',
                        }}
                    >
                        Living 3D QR Studio
                    </span>
                </div>
                <div
                    style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#555',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                    }}
                >
                    <span style={{ color: '#000' }}>{viewMode === '3d' ? `${sceneType.toUpperCase()} · 3D` : '2D · QR'}</span>
                    <span style={{ color: '#bbb' }}>·</span>
                    <span>{currentPalette.name}</span>
                    <span style={{ color: '#bbb' }}>·</span>
                    <span>QR-Synced</span>
                </div>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#8a8a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Drag orbits · Scroll zooms · Tap the tree to morph
                </div>
            </div>

            {/* ─── BOTTOM-CENTER: floating transport ────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 20,
                    left: controlsOpen ? 'calc(50% - 208px)' : '50%',
                    transform: 'translateX(-50%)',
                    transition: 'left 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    maxWidth: 'calc(100vw - 24px)',
                    padding: 8,
                    background: '#ffffff',
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0 #000',
                }}
            >
                <button
                    onClick={() => dioramaRef.current?.rotateView90(-1)}
                    className="brutalist-button"
                    style={{ padding: '9px 10px' }}
                    title="Rotate view 90° left"
                >
                    <RotateCcw size={15} />
                </button>
                <button
                    onClick={() => dioramaRef.current?.toggleViewMode()}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: '9px 16px', fontSize: '0.74rem', fontWeight: 900, gap: 8, display: 'flex', alignItems: 'center' }}
                >
                    {viewMode === '3d' ? <QrCode size={15} /> : <TreePine size={15} />}
                    {viewMode === '3d' ? 'Tap to see QR code' : 'Tap to see 3D'}
                </button>
                <button
                    onClick={() => dioramaRef.current?.rotateView90(1)}
                    className="brutalist-button"
                    style={{ padding: '9px 10px' }}
                    title="Rotate view 90° right"
                >
                    <RotateCw size={15} />
                </button>
                <span style={{ width: 2, alignSelf: 'stretch', background: '#000', opacity: 0.15, margin: '0 2px' }} />
                <button
                    onClick={toggleAudio}
                    className={`brutalist-button${isAudioActive ? ' brutalist-button-primary' : ''}`}
                    style={{ padding: '9px 10px' }}
                    title={isAudioActive ? 'Sound On — click to mute' : 'Sound Off — click for ambient breeze'}
                >
                    {isAudioActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button
                    onClick={() => dioramaRef.current?.resetCamera()}
                    className="brutalist-button"
                    style={{ padding: '9px 10px' }}
                    title="Reset Camera"
                >
                    <Crosshair size={15} />
                </button>
                <button
                    onClick={handleCopyShareLink}
                    className="brutalist-button"
                    style={{ padding: '9px 10px' }}
                    title="Copy Shareable Link"
                >
                    {copied ? <Check size={15} /> : <Share2 size={15} />}
                </button>
            </div>

            {/* ─── CONTROLS TOGGLE (always reachable, floats over the dock) ── */}
            <button
                onClick={() => setControlsOpen((o) => !o)}
                className="brutalist-button"
                style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    zIndex: 40,
                    padding: '8px 12px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
                title="Toggle studio controls (Esc)"
            >
                {controlsOpen ? <ChevronRight size={14} /> : <SlidersHorizontal size={14} />}
                {controlsOpen ? 'Hide Studio' : 'Studio'}
            </button>

            {/* ─── RIGHT DOCK: toggleable studio controls ───────────────── */}
            <aside
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 'min(416px, 100vw)',
                    zIndex: 30,
                    background: '#ffffff',
                    borderLeft: '3px solid #000',
                    boxShadow: '-8px 0 0 rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: controlsOpen ? 'translateX(0)' : 'translateX(101%)',
                    transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            >
                {/* Dock header */}
                <div
                    style={{
                        padding: '14px 64px 12px 16px',
                        borderBottom: '3px solid #000',
                        background: '#FFE500',
                        flexShrink: 0,
                    }}
                >
                    <div style={{ ...BRUT_LABEL, fontSize: '0.8rem' }}>Studio Controls</div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                        Presets · Message · Palette · Export
                    </div>
                </div>

                {/* Scrollable control deck */}
                <div
                    style={{
                        overflowY: 'auto',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {/* Centerpiece Model — growth-rule presets */}
                    <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>Centerpiece</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    background: '#000',
                                    color: '#FFE500',
                                    fontFamily: 'monospace',
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {sceneType}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {SCENE_CATALOG.map(({ id, glyph, label, hint }) => {
                                const active = sceneType === id || (id === 'sakura' && sceneType === 'tree');
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            setSceneType(id);
                                            const native = SCENE_PALETTE[id];
                                            if (native) setPaletteId(native);
                                        }}
                                        title={hint}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '10px 4px 8px',
                                            border: '2px solid #000',
                                            borderRadius: 4,
                                            background: active ? '#FFE500' : '#fff',
                                            cursor: 'pointer',
                                            boxShadow: active ? '2px 2px 0 #000' : 'none',
                                            transition: 'all 0.12s',
                                            minWidth: 0,
                                        }}
                                    >
                                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{glyph}</span>
                                        <span
                                            style={{
                                                fontSize: '0.56rem',
                                                fontWeight: 900,
                                                color: '#000',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                                textAlign: 'center',
                                                lineHeight: 1.25,
                                            }}
                                        >
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>
                            Each preset regrows the tree — grouping, spread & density change, not just colors.
                        </span>
                    </div>

                    {/* QR Target URL */}
                    <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>QR Target</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    background: '#f4f4f5',
                                    border: '1.5px solid #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.6rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    color: '#333',
                                }}
                            >
                                Encodes in Ground
                            </span>
                        </div>

                        <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="Enter destination URL or text..."
                                style={{ ...BRUT_INPUT, flex: 1 }}
                            />
                            <button
                                type="submit"
                                className="brutalist-button brutalist-button-dark"
                                style={{ padding: '8px 14px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                            >
                                Apply
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ ...BRUT_LABEL, fontSize: '0.6rem', color: '#888' }}>Quick Links</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {[
                                    { label: 'CreatorsKit', url: 'https://creatorkit.app/' },
                                    { label: 'YouTube Studio', url: 'https://youtube.com/@creatorkit' },
                                    { label: 'Portfolio Pass', url: 'https://creatorkit.app/business' },
                                ].map((chip) => (
                                    <button key={chip.label} onClick={() => applyPreset(chip.url)} style={brutChip(activeUrl === chip.url)}>
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Personalize Living 3D Gift Card */}
                    <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>Gift Message</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    background: '#fbcfe8',
                                    border: '2px solid #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.6rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Dedication Note
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input
                                type="text"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                placeholder="From (e.g. Sarah)"
                                style={BRUT_INPUT}
                            />
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="To (e.g. Alex)"
                                style={BRUT_INPUT}
                            />
                        </div>

                        <textarea
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            rows={3}
                            placeholder="Write your heartfelt message (reveals when they scan their card)..."
                            style={{ ...BRUT_INPUT, resize: 'none' }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ ...BRUT_LABEL, fontSize: '0.6rem', color: '#888' }}>Message Presets</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {MESSAGE_PRESETS.map((mp) => (
                                    <button
                                        key={mp.label}
                                        onClick={() => setGiftMessage(mp.text)}
                                        style={brutChip(giftMessage === mp.text)}
                                        title={mp.text}
                                    >
                                        {mp.glyph} {mp.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCreateBouquet}
                            disabled={isSavingBouquet}
                            className="brutalist-button brutalist-button-primary"
                            style={{ padding: '10px 14px', fontSize: '0.74rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            {isSavingBouquet ? (
                                <>
                                    <span
                                        className="animate-spin"
                                        style={{
                                            width: 12,
                                            height: 12,
                                            border: '2px solid #000',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                        }}
                                    />
                                    Packaging Living Gift...
                                </>
                            ) : (
                                'Create & Share Living 3D Gift Link'
                            )}
                        </button>
                    </div>

                    {/* Botanical Palette */}
                    <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>Botanical Palette</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    background: '#bbf7d0',
                                    border: '2px solid #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.6rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Syncs Tree · Court · QR
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                            {Object.values(PRESET_PALETTES).map((pal) => (
                                <button
                                    key={pal.id}
                                    onClick={() => handlePaletteSelect(pal.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '6px 8px',
                                        border: `2px solid ${paletteId === pal.id ? '#000' : '#ccc'}`,
                                        borderRadius: 4,
                                        background: paletteId === pal.id ? '#FFE500' : '#fff',
                                        color: '#000',
                                        fontFamily: 'monospace, system-ui, sans-serif',
                                        fontWeight: 900,
                                        fontSize: '0.62rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        boxShadow: paletteId === pal.id ? '2px 2px 0 #000' : 'none',
                                        transition: 'all 0.12s',
                                        minWidth: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 16,
                                            height: 16,
                                            background: pal.primary,
                                            border: '2px solid #000',
                                            borderRadius: 2,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pal.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export Studio */}
                    <div className="brutalist-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <span style={BRUT_LABEL}>Export Studio</span>

                        <button
                            onClick={handleDownload2D}
                            disabled={isExporting}
                            className="brutalist-button brutalist-button-primary"
                            style={{ padding: '10px 14px', fontSize: '0.74rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Download size={14} />
                            2D Scannable QR (PNG)
                        </button>
                        <button
                            onClick={handleDownload3D}
                            disabled={isExporting}
                            className="brutalist-button"
                            style={{ padding: '10px 14px', fontSize: '0.74rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Download size={14} />
                            3D Diorama Snapshot (PNG)
                        </button>
                        <button
                            onClick={handleOpenReceiptPass}
                            className="brutalist-button brutalist-button-dark"
                            style={{ padding: '10px 14px', fontSize: '0.74rem', width: '100%' }}
                        >
                            Print Thermal Receipt Pass
                        </button>
                        <span
                            style={{
                                fontSize: '0.6rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: '#999',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                            }}
                        >
                            Orthographic print file · Isometric snapshot · Thermal pass
                        </span>
                    </div>
                </div>
            </aside>

            {/* ─── MODAL: BOUQUET CREATED ─────────────────────────────── */}
            {bouquetSavedModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 60,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        background: 'rgba(0,0,0,0.6)',
                    }}
                >
                    <div
                        className="brutalist-card"
                        style={{
                            padding: 24,
                            boxShadow: '8px 8px 0 #000',
                            maxWidth: 520,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            position: 'relative',
                        }}
                    >
                        <button
                            onClick={() => setBouquetSavedModal(null)}
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                padding: 4,
                                background: '#fff',
                                border: '2px solid #000',
                                cursor: 'pointer',
                                display: 'flex',
                                color: '#000',
                            }}
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 32 }}>
                            <span
                                style={{
                                    padding: '8px 10px',
                                    background: '#FFE500',
                                    border: '2px solid #000',
                                    boxShadow: '2px 2px 0 #000',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    fontSize: '0.72rem',
                                    textTransform: 'uppercase',
                                }}
                            >
                                QR
                            </span>
                            <div>
                                <h3 style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', margin: 0 }}>
                                    Living 3D Gift Ready
                                </h3>
                                <p style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#666', margin: 0, marginTop: 4 }}>
                                    Link copied to clipboard! Anyone who scans or clicks will explore your 3D diorama and tap to reveal the hidden surprise.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #000', padding: 8, background: '#f4f4f5' }}>
                            <input
                                type="text"
                                readOnly
                                value={bouquetSavedModal.url}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: '#000',
                                    minWidth: 0,
                                }}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(bouquetSavedModal.url);
                                    setBouquetCopied(true);
                                    setTimeout(() => setBouquetCopied(false), 2000);
                                }}
                                className={`brutalist-button${bouquetCopied ? ' brutalist-button-primary' : ''}`}
                                style={{ padding: '6px 10px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                            >
                                {bouquetCopied ? <Check size={13} /> : <Copy size={13} />}
                                {bouquetCopied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a
                                href={bouquetSavedModal.url}
                                target="_blank"
                                rel="noreferrer"
                                className="brutalist-button brutalist-button-dark"
                                style={{ flex: 1, padding: '10px 14px', fontSize: '0.72rem', textAlign: 'center', textDecoration: 'none' }}
                            >
                                View Recipient Experience →
                            </a>
                            <button
                                onClick={() => setBouquetSavedModal(null)}
                                className="brutalist-button"
                                style={{ padding: '10px 14px', fontSize: '0.72rem' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
