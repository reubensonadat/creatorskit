'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    TreeDiorama,
    TreeDioramaRef,
} from '@/components/tree-qr/tree-diorama';
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
    Download,
    Share2,
    Check,
    Volume2,
    VolumeX,
    Copy,
    X,
} from 'lucide-react';

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

function brutModeButton(active: boolean): React.CSSProperties {
    return {
        padding: '10px 8px',
        border: '2px solid #000',
        borderRadius: 4,
        background: active ? '#000' : '#fff',
        color: active ? '#FFE500' : '#000',
        fontFamily: 'monospace, system-ui, sans-serif',
        fontWeight: 900,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        boxShadow: active ? '2px 2px 0 #000' : 'none',
        transition: 'all 0.12s',
    };
}

const PRESET_SCENE_IDS = [
    'sakura', 'tree', 'maple', 'ginkgo', 'magnolia', 'hydrangea',
    'frost', 'oak', 'rose', 'wisteria', 'bonsai', 'pine', 'house',
] as const;

export default function TreeQRPage() {
    const dioramaRef = useRef<TreeDioramaRef>(null);

    // State
    const [urlInput, setUrlInput] = useState('https://creatorkit.app/');
    const [activeUrl, setActiveUrl] = useState('https://creatorkit.app/');
    const [sceneType, setSceneType] = useState<SceneType>('sakura');
    // Seasons retired — the botanical palette alone drives the whole world:
    // tree, courtyard cobbles, wildflowers, drifting petals and the QR colors.
    const season: SeasonType = 'spring';
    const [paletteId, setPaletteId] = useState<string>('sakura');
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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

    // Save & Share as a Digital Bouquet
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
            const shareableUrl = `${window.location.origin}/bouquet/${finalId}`;
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

    const currentPalette: FoliagePalette = PRESET_PALETTES[paletteId] || PRESET_PALETTES.sakura;

    return (
        <div
            className="tool-page-padding"
            style={{
                position: 'relative',
                minHeight: '100%',
                padding: '20px 16px 80px',
                maxWidth: 1380,
                margin: '0 auto',
                boxSizing: 'border-box',
                width: '100%',
            }}
        >
            {/* ─── HEADER ─────────────────────────────────────────────── */}
            <div className="tool-page-header" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#000',
                            letterSpacing: '0.14em',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            background: '#FFE500',
                            padding: '3px 8px',
                            border: '2px solid #000',
                            boxShadow: '2px 2px 0 #000',
                        }}
                    >
                        3D QR DIORAMA STUDIO
                    </span>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#666',
                            fontFamily: 'monospace',
                        }}
                    >
                        DIGITAL BOUQUET · SCANNABLE GIFTS · 4K CINEMATIC
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                    <h1
                        style={{
                            fontSize: '1.85rem',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: '#000',
                            textTransform: 'uppercase',
                            margin: 0,
                        }}
                    >
                        Digital Bouquet
                    </h1>
                    <p
                        style={{
                            fontSize: '0.85rem',
                            color: '#555',
                            maxWidth: 720,
                            lineHeight: 1.5,
                            fontWeight: 500,
                            margin: 0,
                        }}
                    >
                        Grow a scannable QR code into a living 3D diorama. Pick a centerpiece, choose a living palette that recolors the tree, courtyard and QR itself, then share it as a link anyone can unfold.
                    </p>
                </div>
            </div>

            {/* ─── MAIN 2-COLUMN WORKSPACE ────────────────────────────── */}
            <div
                className="matchcut-workspace-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.28fr) minmax(360px, 440px)',
                    gap: 20,
                    alignItems: 'start',
                }}
            >
                {/* LEFT: Diorama Viewport & Transport */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                        className="brutalist-card tool-canvas-frame"
                        style={{
                            padding: 14,
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            width: '100%',
                        }}
                    >
                        {/* Viewport Meta Bar */}
                        <div
                            className="tool-viewport-meta"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 10,
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: '#666',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ color: '#000', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {viewMode === '3d' ? `${sceneType.toUpperCase()} 3D` : '2D QR'}
                                </span>
                                <span style={{ color: '#aaa' }}>·</span>
                                <span
                                    style={{
                                        textTransform: 'uppercase',
                                        color: '#555',
                                        fontWeight: 800,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {currentPalette.name} · QR-SYNCED
                                </span>
                            </div>
                        </div>

                        {/* Diorama Stage */}
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: 'clamp(380px, calc(100vh - 380px), 560px)',
                                background: '#f8f5ee',
                                border: '3px solid #000',
                                overflow: 'hidden',
                            }}
                        >
                            <TreeDiorama
                                ref={dioramaRef}
                                urlText={activeUrl}
                                season={season}
                                sceneType={sceneType}
                                palette={currentPalette}
                                onViewModeChange={(mode) => setViewMode(mode)}
                            />
                        </div>

                        {/* Transport Bar */}
                        <div
                            className="tool-transport-bar"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                                width: '100%',
                                marginTop: 12,
                            }}
                        >
                            <button
                                onClick={() => dioramaRef.current?.toggleViewMode()}
                                className="brutalist-button brutalist-button-primary"
                                style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 900 }}
                            >
                                {viewMode === '2d' ? 'Tap to see the tree' : 'Tap the tree to see QR code'}
                            </button>
                            <button
                                onClick={toggleAudio}
                                className={`brutalist-button${isAudioActive ? ' brutalist-button-primary' : ''}`}
                                style={{ padding: '8px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                title={isAudioActive ? 'Mute Atmosphere' : 'Play Gentle Ambient Breeze'}
                            >
                                {isAudioActive ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                {isAudioActive ? 'Sound On' : 'Sound Off'}
                            </button>
                            <button
                                onClick={handleCopyShareLink}
                                className="brutalist-button"
                                style={{ padding: '8px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                title="Copy Shareable Link"
                            >
                                {copied ? <Check size={14} /> : <Share2 size={14} />}
                                {copied ? 'Copied' : 'Share Config'}
                            </button>
                            <button
                                onClick={() => dioramaRef.current?.resetCamera()}
                                className="brutalist-button"
                                style={{ padding: '8px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6 }}
                                title="Reset Camera"
                            >
                                <RotateCcw size={14} />
                                Reset Cam
                            </button>
                            <span
                                style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.64rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#999',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Drag · Scroll · 30% Resilience
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Studio Controls */}
                <div className="tool-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                    {/* Centerpiece Model */}
                    <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>Centerpiece Model</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    background: '#FFE500',
                                    border: '2px solid #000',
                                    fontFamily: 'monospace',
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {sceneType}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 8 }}>
                            {(
                                [
                                    ['sakura', 'Sakura'],
                                    ['maple', 'Crimson Maple'],
                                    ['ginkgo', 'Ginkgo'],
                                    ['magnolia', 'Magnolia'],
                                    ['hydrangea', 'Hydrangea'],
                                    ['frost', 'Winter Frost'],
                                    ['oak', 'Summer Oak'],
                                    ['rose', 'Rose Bouquet'],
                                    ['wisteria', 'Wisteria'],
                                    ['bonsai', 'Zen Bonsai'],
                                    ['pine', 'Pagoda Pine'],
                                ] as [SceneType, string][]
                            ).map(([id, label]) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        setSceneType(id);
                                        const native = SCENE_PALETTE[id];
                                        if (native) setPaletteId(native);
                                    }}
                                    style={brutModeButton(sceneType === id || (id === 'sakura' && sceneType === 'tree'))}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* QR Target URL */}
                    <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>QR Target URL</span>
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
                            <span style={{ ...BRUT_LABEL, fontSize: '0.6rem', color: '#888' }}>Quick Presets</span>
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

                    {/* Personalize Gift Card */}
                    <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={BRUT_LABEL}>Personalize Gift Card</span>
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
                                Surprise Note
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
                            rows={2}
                            placeholder="Write your heartfelt message (reveals when scanned on their card)..."
                            style={{ ...BRUT_INPUT, resize: 'none' }}
                        />

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
                                    Packaging Bouquet...
                                </>
                            ) : (
                                'Create & Share Digital Bouquet Link'
                            )}
                        </button>
                    </div>

                    {/* Botanical Palette — the one true world selector */}
                    <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ ...BRUT_LABEL, fontSize: '0.6rem', color: '#888' }}>Recolors the Entire World — Including the QR Code</span>
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
                    </div>

                    {/* Export Studio */}
                    <div className="brutalist-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            </div>

            {/* ─── MODAL: BOUQUET CREATED ─────────────────────────────── */}
            {bouquetSavedModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
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
                                    Digital Bouquet Ready
                                </h3>
                                <p style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#666', margin: 0, marginTop: 4 }}>
                                    Link copied to your clipboard. Anyone who scans or clicks will see your 3D diorama unfold.
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
