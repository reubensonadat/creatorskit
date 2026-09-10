'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import VoxelDiorama, { type VoxelDioramaRef } from '@/components/tree-qr/voxel-diorama';
import { SeasonType, SceneType, PRESET_PALETTES, FoliagePalette } from '@/lib/tree-qr/tree-generator';
import { getBouquetByShortId, StoredBouquet } from '@/lib/supabase';
import { ambientSoundscape, AMBIENT_SOUND_TYPES, type AmbientSoundType } from '@/lib/tree-qr/audio-ambient';
import {
    Sparkles,
    Volume2,
    VolumeX,
    RotateCcw,
    Box,
    QrCode,
    ExternalLink,
    Heart,
    ArrowRight,
    MessageSquare,
    Gift,
    X,
    ScanLine,
} from 'lucide-react';

interface BouquetViewerProps {
    initialBouquet?: StoredBouquet | null;
}

function BouquetViewerInner({ initialBouquet }: BouquetViewerProps) {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const dioramaRef = useRef<VoxelDioramaRef>(null);

    const [bouquet, setBouquet] = useState<StoredBouquet | null>(initialBouquet || null);
    const [loading, setLoading] = useState(!initialBouquet);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [currentSound, setCurrentSound] = useState<AmbientSoundType>('breeze');
    const [cardOpen, setCardOpen] = useState(true);

    useEffect(() => {
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const msgParam = searchParams.get('msg');
        const sceneParam = searchParams.get('scene') as SceneType;
        const palParam = searchParams.get('pal');
        const urlParam = searchParams.get('u');
        const audioParam = searchParams.get('audio');

        if (initialBouquet) {
            // Apply any query param overrides if present
            const merged = {
                ...initialBouquet,
                sender_name: fromParam || initialBouquet.sender_name,
                recipient_name: toParam || initialBouquet.recipient_name,
                message: msgParam || initialBouquet.message,
                scene_type: sceneParam || initialBouquet.scene_type,
                palette_id: palParam || initialBouquet.palette_id,
                target_url: urlParam ? decodeURIComponent(urlParam) : initialBouquet.target_url,
            };
            setBouquet(merged);
            if (merged.audio_enabled || audioParam === '1') {
                setIsAudioActive(ambientSoundscape.toggle());
            }
            setLoading(false);
            return;
        }

        async function fetchBouquet() {
            if (!params?.id) return;

            try {
                const data = await getBouquetByShortId(params.id);
                if (data) {
                    const merged = {
                        ...data,
                        sender_name: fromParam || data.sender_name,
                        recipient_name: toParam || data.recipient_name,
                        message: msgParam || data.message,
                        scene_type: sceneParam || data.scene_type,
                        palette_id: palParam || data.palette_id,
                        target_url: urlParam ? decodeURIComponent(urlParam) : data.target_url,
                    };
                    setBouquet(merged);
                    if (merged.audio_enabled || audioParam === '1') {
                        setIsAudioActive(ambientSoundscape.toggle());
                    }
                } else {
                    setBouquet({
                        id: params.id,
                        scene_type: sceneParam || 'sakura',
                        season: 'spring',
                        palette_id: palParam || 'sakura',
                        target_url: urlParam ? decodeURIComponent(urlParam) : 'https://creatorkit.app',
                        sender_name: fromParam || 'A Friend',
                        recipient_name: toParam || 'You',
                        message: msgParam || 'Here is a living 3D oasis just for you. Rotate it around, watch the petals drift, and tap to reveal the hidden QR surprise!',
                        audio_enabled: audioParam === '1',
                    });
                }
            } catch (err) {
                setBouquet({
                    id: params.id,
                    scene_type: sceneParam || 'sakura',
                    season: 'spring',
                    palette_id: palParam || 'sakura',
                    target_url: urlParam ? decodeURIComponent(urlParam) : 'https://creatorkit.app',
                    sender_name: fromParam || 'A Friend',
                    recipient_name: toParam || 'You',
                    message: msgParam || 'A serene Japanese garden to brighten your day.',
                    audio_enabled: false,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchBouquet();
    }, [params?.id, initialBouquet, searchParams]);

    const toggleAudio = () => {
        if (!isAudioActive) {
            ambientSoundscape.setType(currentSound);
            ambientSoundscape.start();
            setIsAudioActive(true);
        } else {
            ambientSoundscape.stop();
            setIsAudioActive(false);
        }
    };

    const cycleSound = () => {
        if (!isAudioActive) {
            toggleAudio();
            return;
        }
        const currentIndex = AMBIENT_SOUND_TYPES.indexOf(currentSound);
        const nextSound = AMBIENT_SOUND_TYPES[(currentIndex + 1) % AMBIENT_SOUND_TYPES.length];
        setCurrentSound(nextSound);
        ambientSoundscape.setType(nextSound);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center justify-center p-6 font-mono">
                <div className="flex flex-col items-center gap-3 bg-white border-3 border-black p-8 shadow-[6px_6px_0_#000]">
                    <div className="w-8 h-8 border-4 border-black border-t-[#FFE500] rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">
                        Unwrapping Living 3D Gift...
                    </span>
                </div>
            </div>
        );
    }

    const sceneType: SceneType = (bouquet?.scene_type as SceneType) || 'sakura';
    const season: SeasonType = (bouquet?.season as SeasonType) || 'spring';
    const palette: FoliagePalette = PRESET_PALETTES[bouquet?.palette_id || 'sakura'] || PRESET_PALETTES.sakura;
    const targetUrl = bouquet?.target_url || 'https://creatorkit.app';

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#f4f1ea] select-none font-sans">
            {/* Fullscreen 3D Voxel Diorama Viewport */}
            <div className="absolute inset-0 w-full h-full">
                <VoxelDiorama
                    ref={dioramaRef}
                    urlText={targetUrl}
                    season={season}
                    sceneType={sceneType}
                    palette={palette}
                    onViewModeChange={(m) => setViewMode(m)}
                    className="w-full h-full"
                />
            </div>

            {/* Top Navigation & Controls */}
            <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
                {/* Brand Pill */}
                <Link
                    href="/tree-qr"
                    className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border-2 border-black px-3 py-1.5 shadow-[3px_3px_0_#000] hover:bg-[#FFE500] transition-colors"
                >
                    <Gift size={15} />
                    <span className="text-xs font-mono font-black uppercase tracking-wider">
                        Living 3D Gift
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#FFE500] border border-black px-1">
                        CreatorsKit
                    </span>
                </Link>

                {/* Interactive Action Controls */}
                <div className="pointer-events-auto flex items-center gap-2">
                    {/* View mode toggle button */}
                    <button
                        onClick={() => dioramaRef.current?.toggleViewMode()}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase shadow-[3px_3px_0_#000] transition-colors ${
                            viewMode === '2d' ? 'bg-[#FFE500]' : 'bg-white hover:bg-neutral-100'
                        }`}
                        title={viewMode === '2d' ? 'Return to 3D Orbit' : 'Flatten to 2D QR Code'}
                    >
                        {viewMode === '2d' ? (
                            <>
                                <Box size={14} />
                                <span className="hidden sm:inline">3D View</span>
                            </>
                        ) : (
                            <>
                                <ScanLine size={14} />
                                <span className="hidden sm:inline">Reveal QR</span>
                            </>
                        )}
                    </button>

                    {/* Audio Soundscape Toggle */}
                    <div className="flex items-center">
                        <button
                            onClick={toggleAudio}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black border-r-0 text-xs font-mono font-bold shadow-[3px_3px_0_#000] transition-colors ${
                                isAudioActive ? 'bg-[#FFE500]' : 'bg-white hover:bg-neutral-100'
                            }`}
                            title={isAudioActive ? 'Mute Soundscape' : 'Play Ambient Audio'}
                        >
                            {isAudioActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        </button>
                        <button
                            onClick={cycleSound}
                            className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-bold shadow-[3px_3px_0_#000] transition-colors capitalize ${
                                isAudioActive ? 'bg-[#FFE500]' : 'bg-white hover:bg-neutral-100'
                            }`}
                            title="Cycle Ambient Soundscape"
                        >
                            {isAudioActive ? currentSound : 'Audio OFF'}
                        </button>
                    </div>

                    {/* Reset Camera Angle */}
                    <button
                        onClick={() => dioramaRef.current?.resetCamera()}
                        className="p-1.5 bg-white border-2 border-black shadow-[3px_3px_0_#000] hover:bg-neutral-100 transition-colors"
                        title="Reset Camera Angle"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Mode Banner notification when in 2D QR view */}
            {viewMode === '2d' && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                        onClick={() => dioramaRef.current?.toggleViewMode()}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-[#FFE500] border-2 border-black shadow-[4px_4px_0_#FFE500] font-mono text-xs font-black uppercase hover:scale-105 transition-transform"
                    >
                        <QrCode size={16} />
                        <span>Scannable QR Mode · Tap anywhere to return to 3D</span>
                    </button>
                </div>
            )}

            {/* Floating Gift Keepsake Card / Envelope */}
            {cardOpen ? (
                <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-30 pointer-events-auto">
                    <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0_#000] flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Minimize card button */}
                        <button
                            onClick={() => setCardOpen(false)}
                            className="absolute top-3 right-3 p-1 text-neutral-500 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-black transition-colors"
                            title="Minimize Keepsake Note"
                        >
                            <X size={16} />
                        </button>

                        {/* Gift Header & Dedication */}
                        <div className="flex items-center gap-2.5">
                            <span className="p-1.5 bg-[#FFE500] border-2 border-black shadow-[2px_2px_0_#000]">
                                <Heart size={15} className="text-black fill-black" />
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 tracking-wide">
                                    A Living 3D Gift From {bouquet?.sender_name || 'Someone Special'}
                                </span>
                                {bouquet?.recipient_name && (
                                    <span className="text-xs font-mono font-black uppercase text-black">
                                        For {bouquet.recipient_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Personalized Gift Note */}
                        {bouquet?.message && (
                            <div className="bg-[#faf8f5] border-2 border-black/80 p-3.5 text-xs font-serif text-neutral-900 leading-relaxed italic rounded-none">
                                &ldquo;{bouquet.message}&rdquo;
                            </div>
                        )}

                        {/* Interaction Prompt */}
                        <div className="flex items-center gap-2 bg-[#FFE500]/25 border border-black/40 p-2 text-[11px] font-mono text-neutral-800">
                            <Sparkles size={13} className="text-amber-600 flex-shrink-0" />
                            <span>
                                {viewMode === '3d'
                                    ? 'Tap the diorama to flatten it into a scannable QR code & unlock the surprise!'
                                    : 'Scan with your phone camera or tap to explore in 3D.'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 pt-1 border-t border-neutral-200">
                            {/* Direct destination link */}
                            <a
                                href={targetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3.5 py-2.5 bg-black text-white hover:bg-[#FFE500] hover:text-black border-2 border-black text-xs font-mono font-black uppercase transition-colors group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <ExternalLink size={14} className="flex-shrink-0" />
                                    <span className="truncate">
                                        Open Embedded Link
                                    </span>
                                </div>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform flex-shrink-0" />
                            </a>

                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {/* Send a Reply Note */}
                                <Link
                                    href={`/bouquet/response?to=${encodeURIComponent(bouquet?.sender_name || 'Sender')}&from=${encodeURIComponent(bouquet?.recipient_name || 'Recipient')}`}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f4f4f5] hover:bg-black hover:text-white border-2 border-black text-xs font-mono font-bold uppercase transition-colors text-center"
                                >
                                    <Heart size={13} />
                                    <span>Send a Reply</span>
                                </Link>

                                {/* Viral Growth Loop: Plant your own 3D gift */}
                                <Link
                                    href="/tree-qr"
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f4f4f5] hover:bg-[#FFE500] border-2 border-black text-xs font-mono font-bold uppercase transition-colors text-center"
                                >
                                    <Gift size={13} />
                                    <span>Create Your Own</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Minimized Keepsake Toggle Button */
                <button
                    onClick={() => setCardOpen(true)}
                    className="absolute bottom-6 right-6 z-30 pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-[#FFE500] hover:bg-white border-3 border-black shadow-[4px_4px_0_#000] text-xs font-mono font-black uppercase transition-all"
                >
                    <MessageSquare size={16} />
                    <span>View Keepsake Note ({bouquet?.sender_name || 'Friend'})</span>
                </button>
            )}

            {/* Bottom Interaction Hint */}
            <div className="absolute bottom-4 left-6 z-20 pointer-events-none hidden md:flex items-center gap-2 bg-white/90 backdrop-blur-sm border-2 border-black px-3 py-1.5 text-[10px] font-mono font-bold text-neutral-800 shadow-[2px_2px_0_#000]">
                <span>🖱️ Drag to orbit 360° · Scroll to zoom · Tap tree to morph into QR</span>
            </div>
        </div>
    );
}

export default function BouquetViewer(props: BouquetViewerProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center justify-center p-6 font-mono">
                <div className="flex flex-col items-center gap-3 bg-white border-3 border-black p-8 shadow-[6px_6px_0_#000]">
                    <div className="w-8 h-8 border-4 border-black border-t-[#FFE500] rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">
                        Unwrapping Living 3D Gift...
                    </span>
                </div>
            </div>
        }>
            <BouquetViewerInner {...props} />
        </Suspense>
    );
}
