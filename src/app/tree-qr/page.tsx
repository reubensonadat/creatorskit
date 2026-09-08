'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    TreeDiorama,
    TreeDioramaRef,
} from '@/components/tree-qr/tree-diorama';
import {
    SeasonType,
    FoliagePalette,
    PRESET_PALETTES,
} from '@/lib/tree-qr/tree-generator';
import { ambientSoundscape } from '@/lib/tree-qr/audio-ambient';
import { encodeReceipt, ReceiptPayload } from '@/lib/receipt/receipt-link';
import {
    ArrowLeft,
    RotateCcw,
    Download,
    Printer,
    Share2,
    Copy,
    Check,
    Volume2,
    VolumeX,
    Sun,
    CloudRain,
    Snowflake,
    Flower2,
    Box,
    QrCode,
    Sparkles,
    ExternalLink,
    Wand2,
} from 'lucide-react';

export default function TreeQRPage() {
    const dioramaRef = useRef<TreeDioramaRef>(null);

    // State
    const [urlInput, setUrlInput] = useState('https://tree.icqr.com/');
    const [activeUrl, setActiveUrl] = useState('https://tree.icqr.com/');
    const [season, setSeason] = useState<SeasonType>('summer');
    const [paletteId, setPaletteId] = useState<string>('lush');
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Sync palette with season if not manually changed
    const handleSeasonChange = (s: SeasonType) => {
        setSeason(s);
        if (s === 'spring') setPaletteId('sakura');
        else if (s === 'summer') setPaletteId('lush');
        else if (s === 'autumn') setPaletteId('autumn');
        else if (s === 'winter') setPaletteId('frost');
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
            a.download = `tree-qr-2d-${Date.now()}.png`;
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
            a.download = `tree-diorama-3d-${Date.now()}.png`;
            a.click();
        } finally {
            setIsExporting(false);
        }
    };

    // Copy Share Link
    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/tree-qr?url=${encodeURIComponent(
            activeUrl
        )}&season=${season}&palette=${paletteId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open physical thermal receipt pass in /receipt
    const handleOpenReceiptPass = () => {
        const treeShareUrl = `${window.location.origin}/tree-qr?url=${encodeURIComponent(
            activeUrl
        )}&season=${season}&palette=${paletteId}`;

        const receiptPayload: ReceiptPayload = {
            n: 'CREATORKIT STUDIOS',
            h: '@creatorkit',
            e: 'studio@creatorkit.app',
            p: '+233 24 000 0000',
            l: 'DIGITAL / ACCRA',
            c: 'COLLECTOR',
            a: 'DIORAMA PASS',
            cu: 'USD',
            rn: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
            dt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            it: [
                { d: '3D Procedural Voxel Tree Diorama', q: 1, r: 0 },
                { d: `Atmosphere: ${season.toUpperCase()} (${currentPalette.name})`, q: 1, r: 0 },
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
            an: 'COLLECTIBLE',
            note: 'Scan QR code with your phone camera to view and rotate this 3D procedural tree diorama.',
        };

        const encoded = encodeReceipt(receiptPayload);
        window.open(`/receipt?r=${encoded}`, '_blank');
    };

    // Read query params on mount if any
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const qUrl = params.get('url');
            const qSeason = params.get('season') as SeasonType | null;
            const qPalette = params.get('palette');

            if (qUrl) {
                setUrlInput(qUrl);
                setActiveUrl(qUrl);
            }
            if (qSeason && ['spring', 'summer', 'autumn', 'winter'].includes(qSeason)) {
                setSeason(qSeason);
            }
            if (qPalette && PRESET_PALETTES[qPalette]) {
                setPaletteId(qPalette);
            }
        }
    }, []);

    const currentPalette: FoliagePalette = PRESET_PALETTES[paletteId] || PRESET_PALETTES.lush;

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f4f4f5] text-black select-none">
            {/* ─── 1. TOP APP BAR ────────────────────────────────────────── */}
            <header className="h-14 border-b-2 border-black bg-white px-4 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black border-2 border-black bg-[#FFE500] hover:bg-black hover:text-white transition-colors uppercase tracking-wider"
                    >
                        <ArrowLeft size={14} />
                        <span>Tools</span>
                    </Link>
                    <div className="h-4 w-[2px] bg-neutral-300" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-black tracking-tight uppercase font-mono">
                                3D Tree QR Diorama
                            </h1>
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-black text-[#FFE500] uppercase">
                                Scannable Art
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Action Controls */}
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <button
                        onClick={() => dioramaRef.current?.toggleViewMode()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border-2 border-black bg-white hover:bg-neutral-100 transition-colors"
                        title="Toggle 2D / 3D Mode"
                    >
                        {viewMode === '2d' ? (
                            <>
                                <Box size={14} />
                                <span className="hidden sm:inline">3D DIORAMA</span>
                            </>
                        ) : (
                            <>
                                <QrCode size={14} />
                                <span className="hidden sm:inline">2D QR SCANNER</span>
                            </>
                        )}
                    </button>

                    {/* Reset Camera */}
                    <button
                        onClick={() => dioramaRef.current?.resetCamera()}
                        className="p-1.5 text-xs font-mono font-bold border-2 border-black bg-white hover:bg-neutral-100 transition-colors"
                        title="Reset Camera Angle"
                    >
                        <RotateCcw size={15} />
                    </button>

                    {/* Ambient Soundscape */}
                    <button
                        onClick={toggleAudio}
                        className={`p-1.5 text-xs font-mono font-bold border-2 border-black transition-colors ${
                            isAudioActive
                                ? 'bg-[#FFE500] text-black'
                                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                        }`}
                        title={isAudioActive ? 'Mute Atmosphere' : 'Play Gentle Ambient Breeze'}
                    >
                        {isAudioActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>

                    {/* Share / Copy */}
                    <button
                        onClick={handleCopyShareLink}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold border-2 border-black bg-white hover:bg-neutral-100 transition-colors"
                        title="Copy Shareable Link"
                    >
                        {copied ? (
                            <>
                                <Check size={14} className="text-green-600" />
                                <span className="hidden sm:inline text-green-700">COPIED!</span>
                            </>
                        ) : (
                            <>
                                <Share2 size={14} />
                                <span className="hidden sm:inline">SHARE</span>
                            </>
                        )}
                    </button>

                    {/* Export Dropdown Trigger */}
                    <button
                        onClick={() => setShowExportModal(!showExportModal)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black border-2 border-black bg-black text-white hover:bg-[#FFE500] hover:text-black transition-colors uppercase tracking-wider"
                    >
                        <Download size={14} />
                        <span>EXPORT</span>
                    </button>
                </div>
            </header>

            {/* ─── 2. MAIN 3D WORKSPACE CANVAS ───────────────────────────── */}
            <main className="relative flex-1 w-full h-full overflow-hidden bg-[#f6f5f0]">
                <TreeDiorama
                    ref={dioramaRef}
                    urlText={activeUrl}
                    season={season}
                    palette={currentPalette}
                    onViewModeChange={(mode) => setViewMode(mode)}
                />

                {/* Quick Presets Float (Top-Left) */}
                <div className="absolute top-4 left-4 z-20 hidden md:flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                        Quick Links
                    </span>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                        {[
                            { label: 'Original Tree', url: 'https://tree.icqr.com/' },
                            { label: 'YouTube', url: 'https://youtube.com/@creatorkit' },
                            { label: 'Instagram', url: 'https://instagram.com/creatorkit' },
                            { label: 'Shop / Deals', url: 'https://creatorkit.app/business' },
                        ].map((chip) => (
                            <button
                                key={chip.label}
                                onClick={() => applyPreset(chip.url)}
                                className={`text-[10px] font-mono px-2 py-1 border border-black bg-white hover:bg-[#FFE500] transition-colors ${
                                    activeUrl === chip.url ? 'bg-[#FFE500] font-black' : 'font-medium'
                                }`}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── 3. BOTTOM CONTROL DOCK (MATCHING VIDEO LAYOUT) ─────── */}
                <div className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-md border-2 border-black p-3 shadow-[4px_4px_0_#000] flex flex-col gap-3">
                        {/* URL / Text Input Bar */}
                        <form onSubmit={handleUrlSubmit} className="flex gap-2 items-center w-full">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="Enter URL or text to encode..."
                                    className="w-full bg-[#f4f4f5] border-2 border-black px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:bg-white transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#FFE500] hover:bg-black hover:text-white border-2 border-black text-xs font-mono font-black transition-colors uppercase"
                            >
                                GENERATE
                            </button>
                        </form>

                        {/* Seasons Switcher Tabs */}
                        <div className="grid grid-cols-4 gap-1 border-t border-neutral-200 pt-2">
                            <button
                                onClick={() => handleSeasonChange('spring')}
                                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold transition-all border ${
                                    season === 'spring'
                                        ? 'bg-[#fbcfe8] text-black border-black font-black shadow-[2px_2px_0_#000]'
                                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                                }`}
                            >
                                <Flower2 size={13} className="text-pink-600" />
                                <span>Spring</span>
                            </button>

                            <button
                                onClick={() => handleSeasonChange('summer')}
                                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold transition-all border ${
                                    season === 'summer'
                                        ? 'bg-[#bbf7d0] text-black border-black font-black shadow-[2px_2px_0_#000]'
                                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                                }`}
                            >
                                <Sun size={13} className="text-green-600" />
                                <span>Summer</span>
                            </button>

                            <button
                                onClick={() => handleSeasonChange('autumn')}
                                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold transition-all border ${
                                    season === 'autumn'
                                        ? 'bg-[#fde68a] text-black border-black font-black shadow-[2px_2px_0_#000]'
                                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                                }`}
                            >
                                <CloudRain size={13} className="text-amber-600" />
                                <span>Autumn</span>
                            </button>

                            <button
                                onClick={() => handleSeasonChange('winter')}
                                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold transition-all border ${
                                    season === 'winter'
                                        ? 'bg-[#e2e8f0] text-black border-black font-black shadow-[2px_2px_0_#000]'
                                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                                }`}
                            >
                                <Snowflake size={13} className="text-sky-600" />
                                <span>Winter</span>
                            </button>
                        </div>

                        {/* Circular Palette Color Swatches */}
                        <div className="flex items-center justify-center gap-2 pt-1 border-t border-neutral-100">
                            {Object.values(PRESET_PALETTES).map((pal) => (
                                <button
                                    key={pal.id}
                                    onClick={() => handlePaletteSelect(pal.id)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                        paletteId === pal.id
                                            ? 'scale-125 border-black ring-2 ring-black/20 shadow-md'
                                            : 'border-white hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: pal.primary }}
                                    title={pal.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── 4. EXPORT MODAL POPUP ───────────────────────────────── */}
                {showExportModal && (
                    <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white border-2 border-black shadow-[6px_6px_0_#000] w-full max-w-md p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b-2 border-black pb-3">
                                <div>
                                    <h2 className="font-mono font-black text-base uppercase">
                                        Export 3D Tree QR
                                    </h2>
                                    <p className="text-xs font-mono text-neutral-500">
                                        High-resolution digital outputs & thermal receipt formats
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="p-1 border border-black hover:bg-black hover:text-white font-mono text-xs"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                {/* Option 1: 2D Scannable QR Code */}
                                <button
                                    onClick={handleDownload2D}
                                    disabled={isExporting}
                                    className="flex items-center justify-between p-3 border-2 border-black hover:bg-[#FFE500] transition-colors text-left font-mono group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 border border-black bg-white">
                                            <QrCode size={18} />
                                        </div>
                                        <div>
                                            <div className="font-black text-xs uppercase">
                                                Download 2D Scannable QR (PNG)
                                            </div>
                                            <div className="text-[11px] text-neutral-600">
                                                Crisp top-down orthographic view verified for cameras
                                            </div>
                                        </div>
                                    </div>
                                    <Download size={16} />
                                </button>

                                {/* Option 2: 3D Diorama Snapshot */}
                                <button
                                    onClick={handleDownload3D}
                                    disabled={isExporting}
                                    className="flex items-center justify-between p-3 border-2 border-black hover:bg-[#FFE500] transition-colors text-left font-mono group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 border border-black bg-white">
                                            <Box size={18} />
                                        </div>
                                        <div>
                                            <div className="font-black text-xs uppercase">
                                                Capture 3D Diorama Art (PNG)
                                            </div>
                                            <div className="text-[11px] text-neutral-600">
                                                Isometric perspective with volumetric tree & floating base
                                            </div>
                                        </div>
                                    </div>
                                    <Download size={16} />
                                </button>

                                {/* Option 3: Receipt Printer Integration */}
                                <button
                                    onClick={handleOpenReceiptPass}
                                    className="flex items-center justify-between p-3 border-2 border-black hover:bg-[#FFE500] transition-colors text-left font-mono group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 border border-black bg-white">
                                            <Printer size={18} />
                                        </div>
                                        <div>
                                            <div className="font-black text-xs uppercase">
                                                Print on Thermal Receipt Pass
                                            </div>
                                            <div className="text-[11px] text-neutral-600">
                                                Embeds this code into the CreatorKit physical receipt printer
                                            </div>
                                        </div>
                                    </div>
                                    <ExternalLink size={16} />
                                </button>
                            </div>

                            <div className="pt-2 border-t border-neutral-200 flex justify-end">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2 text-xs font-mono font-bold border border-black hover:bg-neutral-100"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
