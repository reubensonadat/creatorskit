'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TreeDiorama, TreeDioramaRef } from '@/components/tree-qr/tree-diorama';
import { SeasonType, SceneType, PRESET_PALETTES, FoliagePalette } from '@/lib/tree-qr/tree-generator';
import { getBouquetByShortId, StoredBouquet } from '@/lib/supabase';
import { ambientSoundscape } from '@/lib/tree-qr/audio-ambient';
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
} from 'lucide-react';

export default function BouquetViewer() {
    const params = useParams<{ id: string }>();
    const dioramaRef = useRef<TreeDioramaRef>(null);

    const [bouquet, setBouquet] = useState<StoredBouquet | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [cardOpen, setCardOpen] = useState(true);

    useEffect(() => {
        async function fetchBouquet() {
            if (!params?.id) return;

            try {
                const data = await getBouquetByShortId(params.id);
                if (data) {
                    setBouquet(data);
                    if (data.audio_enabled) {
                        // Attempt to enable audio
                        setIsAudioActive(ambientSoundscape.toggle());
                    }
                } else {
                    // Fallback demo bouquet so the link is always delightful to view
                    setBouquet({
                        id: params.id,
                        scene_type: 'tree',
                        season: 'spring',
                        palette_id: 'sakura',
                        target_url: 'https://creatorkit.app',
                        sender_name: 'A Friend',
                        recipient_name: 'You',
                        message: 'Here is a little digital oasis just for you. Rotate it around, watch the petals drift, and enjoy a mindful moment.',
                        audio_enabled: false,
                    });
                }
            } catch (err) {
                // Graceful fallback
                setBouquet({
                    id: params.id,
                    scene_type: 'tree',
                    season: 'spring',
                    palette_id: 'sakura',
                    target_url: 'https://creatorkit.app',
                    sender_name: 'A Friend',
                    recipient_name: 'You',
                    message: 'A serene Japanese garden to brighten your day.',
                    audio_enabled: false,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchBouquet();
    }, [params?.id]);

    const toggleAudio = () => {
        const nextState = ambientSoundscape.toggle();
        setIsAudioActive(nextState);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f5ee] flex flex-col items-center justify-center p-6 font-mono">
                <div className="flex flex-col items-center gap-3 bg-white border-2 border-black p-8 shadow-[6px_6px_0_#000]">
                    <div className="w-8 h-8 border-4 border-black border-t-[#FFE500] rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">
                        Summoning Digital Bouquet...
                    </span>
                </div>
            </div>
        );
    }

    const sceneType: SceneType = (bouquet?.scene_type as SceneType) || 'tree';
    const season: SeasonType = (bouquet?.season as SeasonType) || 'spring';
    const palette: FoliagePalette = PRESET_PALETTES[bouquet?.palette_id || 'sakura'] || PRESET_PALETTES.sakura;
    const targetUrl = bouquet?.target_url || 'https://creatorkit.app';

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#f4f1ea] select-none font-sans">
            {/* Fullscreen 3D Scene Viewport */}
            <div className="absolute inset-0 w-full h-full">
                <TreeDiorama
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
                    className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md border-2 border-black px-3 py-1.5 shadow-[3px_3px_0_#000] hover:bg-[#FFE500] transition-colors"
                >
                    <Gift size={15} />
                    <span className="text-xs font-mono font-black uppercase">
                        Digital Bouquet
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#FFE500] border border-black px-1">
                        CreatorsKit
                    </span>
                </Link>

                {/* Control Action Buttons */}
                <div className="pointer-events-auto flex items-center gap-2">
                    {/* View mode toggle */}
                    <button
                        onClick={() => dioramaRef.current?.toggleViewMode()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-black text-xs font-mono font-black uppercase shadow-[3px_3px_0_#000] hover:bg-neutral-100 transition-colors"
                    >
                        {viewMode === '2d' ? (
                            <>
                                <Box size={14} />
                                <span className="hidden sm:inline">3D View</span>
                            </>
                        ) : (
                            <>
                                <QrCode size={14} />
                                <span className="hidden sm:inline">2D QR</span>
                            </>
                        )}
                    </button>

                    {/* Audio Soundscape Toggle */}
                    <button
                        onClick={toggleAudio}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono font-bold shadow-[3px_3px_0_#000] transition-colors ${
                            isAudioActive ? 'bg-[#FFE500]' : 'bg-white hover:bg-neutral-100'
                        }`}
                        title={isAudioActive ? 'Mute Atmosphere' : 'Play Breeze Audio'}
                    >
                        {isAudioActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        <span className="hidden sm:inline">
                            {isAudioActive ? 'Audio ON' : 'Audio OFF'}
                        </span>
                    </button>

                    {/* Reset Camera */}
                    <button
                        onClick={() => dioramaRef.current?.resetCamera()}
                        className="p-1.5 bg-white border-2 border-black shadow-[3px_3px_0_#000] hover:bg-neutral-100 transition-colors"
                        title="Reset Camera Angle"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Floating Gift Message Envelope / Card */}
            {cardOpen ? (
                <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-30 pointer-events-auto">
                    <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0_#000] flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Close / Minimize card */}
                        <button
                            onClick={() => setCardOpen(false)}
                            className="absolute top-3 right-3 p-1 text-neutral-500 hover:text-black hover:bg-neutral-100 border border-transparent hover:border-black transition-colors"
                            title="Minimize Message"
                        >
                            <X size={16} />
                        </button>

                        {/* Card Header */}
                        <div className="flex items-center gap-2">
                            <span className="p-1 bg-[#FFE500] border border-black">
                                <Heart size={14} className="text-black fill-black" />
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                                    A Gift From {bouquet?.sender_name || 'Someone Special'}
                                </span>
                                {bouquet?.recipient_name && (
                                    <span className="text-xs font-mono font-black uppercase text-black">
                                        For {bouquet.recipient_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Gift Note */}
                        {bouquet?.message && (
                            <div className="bg-[#fcfaf7] border-2 border-black/80 p-3.5 text-xs font-sans text-neutral-900 leading-relaxed italic">
                                &ldquo;{bouquet.message}&rdquo;
                            </div>
                        )}

                        {/* Destination Action Link */}
                        <div className="flex flex-col gap-2 pt-1 border-t border-neutral-200">
                            <a
                                href={targetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3 py-2 bg-black text-white hover:bg-[#FFE500] hover:text-black border-2 border-black text-xs font-mono font-black uppercase transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <ExternalLink size={14} />
                                    <span>Open Embedded Link</span>
                                </div>
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </a>

                            <Link
                                href="/tree-qr"
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f4f4f5] hover:bg-white border-2 border-black text-xs font-mono font-bold uppercase transition-colors"
                            >
                                <Sparkles size={13} className="text-amber-500" />
                                <span>Create Your Own 3D Bouquet</span>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                /* Minimized Card Toggle Button */
                <button
                    onClick={() => setCardOpen(true)}
                    className="absolute bottom-6 right-6 z-30 pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-[#FFE500] hover:bg-white border-3 border-black shadow-[4px_4px_0_#000] text-xs font-mono font-black uppercase transition-all"
                >
                    <MessageSquare size={16} />
                    <span>View Gift Note ({bouquet?.sender_name || 'Friend'})</span>
                </button>
            )}

            {/* Bottom Interaction Hint */}
            <div className="absolute bottom-4 left-6 z-20 pointer-events-none hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-black/40 px-2.5 py-1 text-[10px] font-mono text-neutral-700">
                <span>🖱️ Drag around to rotate · Scroll to zoom</span>
            </div>
        </div>
    );
}
