'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { StoredBouquet } from '@/lib/supabase';
import { generateBouquetArrangement } from '@/lib/bouquet/arrangement';
import { BouquetCanvas } from '@/components/bouquet/bouquet-canvas';
import { BouquetCard } from '@/components/bouquet/bouquet-card';
import {
  Printer,
  Download,
  Share2,
  Check,
  RotateCcw,
  PlusCircle,
  Volume2,
  VolumeX,
  FileText,
  Sparkles,
  Layout,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Flower2,
  Mail,
  Layers,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { soundEngine, SOUND_PRESETS } from '@/lib/bouquet/soundscapes';
import { getBouquetFontEmbedCSS, prefetchBouquetFonts, normalizeFontId } from '@/lib/bouquet/font-embed';

interface BouquetViewerProps {
  initialBouquet: StoredBouquet;
}

export default function BouquetViewer({ initialBouquet }: BouquetViewerProps) {
  // Extract parameters from initialBouquet and its metadata
  const flowers = useMemo(() => {
    return (
      initialBouquet.metadata?.flowers || [
        'rose-pink',
        'sunflower-golden',
        'peony-blush',
        'tulip-rose',
        'lily-ivory',
      ]
    );
  }, [initialBouquet.metadata?.flowers]);

  const greenery = useMemo(() => {
    return initialBouquet.metadata?.greenery || ['fern-illustration', 'olive-spray'];
  }, [initialBouquet.metadata?.greenery]);

  const seed = useMemo(() => {
    return initialBouquet.metadata?.seed || 1042;
  }, [initialBouquet.metadata?.seed]);

  const cardTemplateId = useMemo(() => {
    return initialBouquet.metadata?.cardTemplateId || 'classic-cream';
  }, [initialBouquet.metadata?.cardTemplateId]);

  const cardFont = useMemo(() => {
    return normalizeFontId(initialBouquet.metadata?.cardFont || 'caveat');
  }, [initialBouquet.metadata?.cardFont]);

  const cardPlacement = useMemo(() => {
    return (initialBouquet.metadata?.cardPlacement as 'right' | 'left' | 'bottom') || 'right';
  }, [initialBouquet.metadata?.cardPlacement]);

  const giftFormat = useMemo(() => {
    return (initialBouquet.gift_format as 'both' | 'flower' | 'card') || 'both';
  }, [initialBouquet.gift_format]);

  const greeting = useMemo(() => {
    return initialBouquet.metadata?.greeting || 'Dear';
  }, [initialBouquet.metadata?.greeting]);

  const closing = useMemo(() => {
    return initialBouquet.metadata?.closing || 'Sincerely,';
  }, [initialBouquet.metadata?.closing]);

  const note = useMemo(
    () => ({
      greeting,
      to: initialBouquet.recipient_name || 'Beloved',
      message:
        initialBouquet.message ||
        'Thinking of you and sending this freshly picked bouquet to brighten your day.',
      from: initialBouquet.sender_name || 'Secret Admirer',
      closing,
    }),
    [
      greeting,
      initialBouquet.recipient_name,
      initialBouquet.message,
      initialBouquet.sender_name,
      closing,
    ]
  );

  // Sound preset
  const soundPresetId = useMemo(() => {
    return (
      initialBouquet.sound_preset ||
      initialBouquet.metadata?.soundPreset ||
      'music-box'
    );
  }, [initialBouquet.sound_preset, initialBouquet.metadata?.soundPreset]);

  const activeSoundPreset = useMemo(() => {
    return SOUND_PRESETS.find((p) => p.id === soundPresetId);
  }, [soundPresetId]);

  // Pre-cache base64 font data so PNG export contains exact fonts with zero delay
  useEffect(() => {
    prefetchBouquetFonts(cardFont);
  }, [cardFont]);

  // States
  const [typewriterKey, setTypewriterKey] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportBg, setExportBg] = useState<'white' | 'clear'>('white');
  const [activeView, setActiveView] = useState<'display' | 'sheet'>('display');
  const [mobileTab, setMobileTab] = useState<'both' | 'flower' | 'card'>('both');

  // Sound playback state
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Compute arrangement
  const arrangement = useMemo(() => {
    return generateBouquetArrangement(flowers, greenery, seed);
  }, [flowers, greenery, seed]);

  // Handle Audio playback on reveal
  useEffect(() => {
    if (!soundPresetId || soundPresetId === 'none') return;

    // Start audio
    const startAudio = () => {
      try {
        const ok = soundEngine.play(soundPresetId);
        if (ok) {
          setIsPlayingSound(true);
        }
      } catch (err) {
        console.warn('Audio auto-start waiting for user interaction:', err);
      }
    };

    startAudio();

    // Browser autoplay policy: unlock on first user gesture anywhere if blocked
    const handleFirstGesture = () => {
      startAudio();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      soundEngine.stop();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [soundPresetId]);

  const handleToggleSound = () => {
    if (!isPlayingSound) {
      soundEngine.play(soundPresetId || 'music-box');
      setIsPlayingSound(true);
      setIsMuted(false);
    } else {
      const nextMuted = !isMuted;
      soundEngine.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const handleReplayWriting = () => {
    setTypewriterKey((k) => k + 1);
  };

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Image Export: Always renders the high-res desktop A4 keepsake sheet regardless of user device
  const handleExportPng = async () => {
    // If standalone flower with clear background, export flower canvas; otherwise export the desktop A4 keepsake sheet
    const standaloneFlower = giftFormat === 'flower' && exportBg === 'clear';
    const wrapper = document.getElementById('bouquet-a4-export-wrapper');
    const el = standaloneFlower
      ? document.getElementById('bouquet-canvas-export')
      : document.getElementById('bouquet-a4-export-node') || document.getElementById('bouquet-printable-preview');
    if (!el) return;

    try {
      setIsExporting(true);

      if (wrapper && !standaloneFlower) {
        wrapper.style.opacity = '1';
        wrapper.style.zIndex = '-50';
        wrapper.style.overflow = 'visible';
      }

      // Save styles for clean reset
      const originalBg = el.style.backgroundColor;
      const originalBorder = el.style.border;
      const originalShadow = el.style.boxShadow;

      if (exportBg === 'clear') {
        el.style.backgroundColor = 'transparent';
        el.style.boxShadow = 'none';
        if (giftFormat === 'flower') {
          el.style.border = 'none';
        }
      } else {
        el.style.backgroundColor = '#ffffff';
      }

      // Prepare font embedding so custom fonts render identically in exported image
      const fontEmbedCSS = await getBouquetFontEmbedCSS(cardFont);

      const options = {
        cacheBust: false,
        pixelRatio: 2,
        fontEmbedCSS: fontEmbedCSS || undefined,
        skipFonts: !fontEmbedCSS,
        backgroundColor: exportBg === 'white' ? '#ffffff' : undefined,
        style: {
          opacity: '1',
          visibility: 'visible',
          transform: 'none',
          position: 'static',
          left: '0',
          top: '0',
          margin: '0',
        },
      };

      let dataUrl: string;
      try {
        dataUrl = await toPng(el, options);
      } catch (e) {
        console.warn('Retrying toPng with standard resolution:', e);
        dataUrl = await toPng(el, {
          cacheBust: false,
          fontEmbedCSS: fontEmbedCSS || undefined,
          skipFonts: !fontEmbedCSS,
          pixelRatio: 1.5,
          backgroundColor: exportBg === 'white' ? '#ffffff' : undefined,
          style: {
            opacity: '1',
            visibility: 'visible',
            transform: 'none',
            position: 'static',
            left: '0',
            top: '0',
            margin: '0',
          },
        });
      }

      // Restore styles
      el.style.backgroundColor = originalBg;
      el.style.border = originalBorder;
      el.style.boxShadow = originalShadow;

      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 500) {
        throw new Error('Image generation produced empty data');
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `bouquet-for-${(note.to || 'special-someone')
        .toLowerCase()
        .replace(/\s+/g, '-')}-${exportBg}.png`;
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      if (wrapper && !standaloneFlower) {
        wrapper.style.opacity = '0';
        wrapper.style.zIndex = '-9999';
        wrapper.style.overflow = 'hidden';
      }
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* ── HIGH-RES A4 KEEPSAKE EXPORT NODE (FIXED DESKTOP/A4 GEOMETRY REGARDLESS OF USER DEVICE) ── */}
      <div
        id="bouquet-a4-export-wrapper"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '840px',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: -9999,
          opacity: 0,
        }}
      >
        <div
          id="bouquet-a4-export-node"
          style={{
            width: '840px',
            minWidth: '840px',
            maxWidth: '840px',
            position: 'relative',
            left: 0,
            top: 0,
            backgroundColor: '#ffffff',
          }}
          className="bg-white p-8 flex flex-col gap-6 text-black border-2 border-black h-auto min-h-[580px]"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[11px] font-mono font-black uppercase tracking-wider">
            <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
            <span className="text-stone-500">NO. BK-{initialBouquet.id.toUpperCase()}</span>
          </div>

        {/* PRINT FORMAT: FLOWER ONLY */}
        {giftFormat === 'flower' && (
          <div className="flex flex-col items-center justify-center py-6 gap-6">
            <div className="w-[480px] aspect-[4/5] flex items-center justify-center">
              <BouquetCanvas
                greeneryLayers={arrangement.greeneryLayers}
                flowerLayers={arrangement.flowerLayers}
                showRibbon={true}
                borderless={true}
                className="w-full h-full"
              />
            </div>
            <div className="text-center font-mono">
              <div className="text-sm font-bold uppercase tracking-wider">
                FOR: {note.to}
              </div>
              <div className="text-xs text-stone-500 uppercase mt-0.5">
                FROM: {note.from} · {flowers.length} BOTANICAL BLOOMS
              </div>
            </div>
          </div>
        )}

        {/* PRINT FORMAT: CARD ONLY */}
        {giftFormat === 'card' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-[520px]">
              <BouquetCard
                note={note}
                cardFont={cardFont}
                editable={false}
                className="w-full border-2 border-black shadow-sm"
              />
            </div>
          </div>
        )}

        {/* PRINT FORMAT: BOTH (Fixed desktop A4 side-by-side or stacked layout!) */}
        {giftFormat === 'both' && (
          <div className={`w-full items-center ${cardPlacement === 'bottom' ? 'flex flex-col gap-6' : 'grid grid-cols-2 gap-8'}`}>
            <div className="w-full aspect-[4/5] flex items-center justify-center">
              <BouquetCanvas
                greeneryLayers={arrangement.greeneryLayers}
                flowerLayers={arrangement.flowerLayers}
                showRibbon={true}
                borderless={true}
                className="w-full h-full"
              />
            </div>
            <div className="w-full flex items-center justify-center">
              <BouquetCard
                note={note}
                cardFont={cardFont}
                editable={false}
                className="w-full aspect-[4/5] border border-stone-300"
              />
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-500 uppercase tracking-widest">
          <span>
            {giftFormat === 'card'
              ? 'Handcrafted personal stationery'
              : 'Hand-arranged organic botanicals'}
          </span>
          <span>Verified keepsake #{initialBouquet.id.toUpperCase()}</span>
        </div>
      </div>
    </div>

      {/* ── NATIVE PRINT DOCUMENT (REVEALED EXCLUSIVELY ON BROWSER PRINT) ── */}
      <div
        id="bouquet-print-document"
        className="hidden print:flex flex-col items-center justify-center p-8 bg-white min-h-screen text-black w-full"
      >
        <div className="w-full max-w-[760px] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[11px] font-mono font-black uppercase tracking-wider">
            <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
            <span className="text-stone-500">NO. BK-{initialBouquet.id.toUpperCase()}</span>
          </div>

          {/* PRINT FORMAT: FLOWER ONLY */}
          {giftFormat === 'flower' && (
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="w-full max-w-[480px] aspect-[4/5] flex items-center justify-center">
                <BouquetCanvas
                  greeneryLayers={arrangement.greeneryLayers}
                  flowerLayers={arrangement.flowerLayers}
                  showRibbon={true}
                  borderless={true}
                  className="w-full h-full"
                />
              </div>
              <div className="text-center font-mono">
                <div className="text-sm font-bold uppercase tracking-wider">
                  FOR: {note.to}
                </div>
                <div className="text-xs text-stone-500 uppercase mt-0.5">
                  FROM: {note.from} · {flowers.length} BOTANICAL BLOOMS
                </div>
              </div>
            </div>
          )}

          {/* PRINT FORMAT: CARD ONLY */}
          {giftFormat === 'card' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-full max-w-[500px]">
                <BouquetCard
                  note={note}
                  cardFont={cardFont}
                  editable={false}
                  className="w-full border-2 border-black shadow-sm"
                />
              </div>
            </div>
          )}

          {/* PRINT FORMAT: BOTH */}
          {giftFormat === 'both' && (
            <>
              {cardPlacement === 'right' && (
                <div className="grid grid-cols-2 gap-8 items-center">
                  <div className="w-full aspect-[4/5] flex items-center justify-center">
                    <BouquetCanvas
                      greeneryLayers={arrangement.greeneryLayers}
                      flowerLayers={arrangement.flowerLayers}
                      showRibbon={true}
                      borderless={true}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="w-full flex items-center justify-center">
                    <BouquetCard
                      note={note}
                      cardFont={cardFont}
                      editable={false}
                      className="w-full aspect-[4/5] border border-stone-300"
                    />
                  </div>
                </div>
              )}

              {cardPlacement === 'left' && (
                <div className="grid grid-cols-2 gap-8 items-center">
                  <div className="w-full flex items-center justify-center">
                    <BouquetCard
                      note={note}
                      cardFont={cardFont}
                      editable={false}
                      className="w-full aspect-[4/5] border border-stone-300"
                    />
                  </div>
                  <div className="w-full aspect-[4/5] flex items-center justify-center">
                    <BouquetCanvas
                      greeneryLayers={arrangement.greeneryLayers}
                      flowerLayers={arrangement.flowerLayers}
                      showRibbon={true}
                      borderless={true}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {cardPlacement === 'bottom' && (
                <div className="flex flex-col gap-6 items-center">
                  <div className="w-full max-w-[340px] aspect-[4/5] flex items-center justify-center">
                    <BouquetCanvas
                      greeneryLayers={arrangement.greeneryLayers}
                      flowerLayers={arrangement.flowerLayers}
                      showRibbon={true}
                      borderless={true}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="w-full max-w-[420px] flex items-center justify-center">
                    <BouquetCard
                      note={note}
                      cardFont={cardFont}
                      editable={false}
                      className="w-full aspect-[4/3] border border-stone-300"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            <span>
              {giftFormat === 'card'
                ? 'Handcrafted personal stationery'
                : 'Hand-arranged organic botanicals'}
            </span>
            <span>Verified keepsake #{initialBouquet.id.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ── RECIPIENT CANVAS ── */}
      <div className="relative w-screen min-h-screen bg-[#FAF7F2] text-black font-sans flex flex-col print:hidden selection:bg-rose-200">
        {/* Subtle Ambient Radial Light */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50/50 via-transparent to-stone-200/30" />

        {/* ── STICKY TOP HEADER: GIVES PHYSICAL SPACE, NEVER OVERLAPS CONTENT UNDER IT ── */}
        <header className="sticky top-0 z-30 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-black/10 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between shrink-0 shadow-xs">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0_#000] shrink-0">
              <img src="/logo.png" alt="CK" className="w-full h-full object-cover" />
            </div>
            <span className="font-mono font-black text-sm tracking-tight text-black">
              CK<span className="text-stone-500">.win</span>
            </span>
          </Link>

          <Link
            href="/bouquet"
            className="px-3 py-1.5 bg-white hover:bg-stone-50 text-black border-2 border-black rounded font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle size={13} />
            <span>CREATE BOUQUET</span>
          </Link>
        </header>

        {/* ── MAIN FULLSCREEN STAGE: GIVES AMPLE SPACE SO DOCK NEVER OVERLAPS CONTENT ── */}
        <main className="flex-1 w-full flex flex-col items-center justify-start p-4 sm:p-8 pb-36 sm:pb-40 overflow-y-auto select-text">
          {/* VIEW MODE 1: INTERACTIVE CARD & BOUQUET DISPLAY */}
          {activeView === 'display' && (
            <div className="w-full max-w-5xl flex items-center justify-center my-auto">
              {/* FORMAT: FLOWER ONLY */}
              {giftFormat === 'flower' && (
                <div className="w-full flex flex-col items-center justify-center max-w-md mx-auto">
                  <div
                    id="bouquet-canvas-export"
                    className="w-full aspect-[4/5] flex items-center justify-center p-3 bg-white border-2 border-black rounded shadow-[6px_6px_0_#000] relative"
                  >
                    <BouquetCanvas
                      greeneryLayers={arrangement.greeneryLayers}
                      flowerLayers={arrangement.flowerLayers}
                      showRibbon={true}
                      borderless={true}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* FORMAT: CARD ONLY (With typewriter replay) */}
              {giftFormat === 'card' && (
                <div className="w-full flex flex-col items-center justify-center max-w-lg mx-auto">
                  <div id="bouquet-canvas-export" className="w-full relative">
                    <BouquetCard
                      key={`card-viewer-${typewriterKey}`}
                      cardTemplateId={cardTemplateId}
                      cardFont={cardFont}
                      note={note}
                      editable={false}
                      isSelfWriting={true}
                      className="w-full aspect-[4/3.5] border-2 border-black rounded shadow-[6px_6px_0_#000]"
                    />

                    {/* Replay Writing Button */}
                    <button
                      type="button"
                      onClick={handleReplayWriting}
                      title="Replay note writing animation"
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white hover:bg-stone-100 text-black border border-black rounded font-mono text-[9px] font-bold uppercase tracking-wider shadow-[1px_1px_0_#000] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      <span>REPLAY</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FORMAT: BOTH (Bouquet + Note Card) */}
              {giftFormat === 'both' && (
                <div className="w-full flex flex-col items-center">
                  {/* On Mobile: Segmented Tab Switcher (Together / Bouquet / Letter) */}
                  <div className="md:hidden flex items-center justify-center mb-3.5 shrink-0">
                    <div className="inline-flex border-2 border-black bg-stone-100 rounded p-0.5 shadow-[2px_2px_0_#000]">
                      <button
                        type="button"
                        onClick={() => setMobileTab('both')}
                        className={`px-3 py-1 font-mono text-[10px] font-black uppercase rounded transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          mobileTab === 'both'
                            ? 'bg-black text-white shadow-xs'
                            : 'text-stone-600 hover:text-black'
                        }`}
                      >
                        <Layers size={11} />
                        <span>TOGETHER</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileTab('flower')}
                        className={`px-3 py-1 font-mono text-[10px] font-black uppercase rounded transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          mobileTab === 'flower'
                            ? 'bg-black text-white shadow-xs'
                            : 'text-stone-600 hover:text-black'
                        }`}
                      >
                        <Flower2 size={11} />
                        <span>BOUQUET</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileTab('card')}
                        className={`px-3 py-1 font-mono text-[10px] font-black uppercase rounded transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          mobileTab === 'card'
                            ? 'bg-black text-white shadow-xs'
                            : 'text-stone-600 hover:text-black'
                        }`}
                      >
                        <Mail size={11} />
                        <span>LETTER</span>
                      </button>
                    </div>
                  </div>

                  <div
                    id="bouquet-canvas-export"
                    className={`w-full items-center justify-center ${
                      cardPlacement === 'bottom'
                        ? 'flex flex-col gap-4 max-w-xl'
                        : 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl'
                    }`}
                  >
                    {/* Bouquet Container */}
                    <div
                      className={`w-full aspect-[4/5] mx-auto flex items-center justify-center p-3 bg-white border-2 border-black rounded shadow-[6px_6px_0_#000] ${
                        mobileTab === 'card' ? 'hidden md:flex' : 'flex'
                      } ${
                        cardPlacement === 'bottom'
                          ? 'max-w-[270px] sm:max-w-[320px]'
                          : cardPlacement === 'left'
                          ? 'max-w-[270px] sm:max-w-[380px] md:order-2'
                          : 'max-w-[270px] sm:max-w-[380px]'
                      }`}
                    >
                      <BouquetCanvas
                        greeneryLayers={arrangement.greeneryLayers}
                        flowerLayers={arrangement.flowerLayers}
                        showRibbon={true}
                        borderless={true}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Note Card Container */}
                    <div
                      className={`w-full mx-auto relative ${
                        mobileTab === 'flower' ? 'hidden md:block' : 'block'
                      } ${
                        cardPlacement === 'bottom'
                          ? 'max-w-[350px] sm:max-w-[460px]'
                          : cardPlacement === 'left'
                          ? 'max-w-[350px] sm:max-w-[390px] md:order-1'
                          : 'max-w-[350px] sm:max-w-[390px]'
                      }`}
                    >
                      <BouquetCard
                        key={`both-card-viewer-${typewriterKey}`}
                        cardTemplateId={cardTemplateId}
                        cardFont={cardFont}
                        note={note}
                        editable={false}
                        isSelfWriting={true}
                        className={`w-full border-2 border-black rounded shadow-[6px_6px_0_#000] ${
                          cardPlacement === 'bottom' ? 'aspect-[4/3]' : 'aspect-[4/5]'
                        }`}
                      />

                      {/* Replay Writing Button */}
                      <button
                        type="button"
                        onClick={handleReplayWriting}
                        title="Replay note writing animation"
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white hover:bg-stone-100 text-black border border-black rounded font-mono text-[9px] font-bold uppercase tracking-wider shadow-[1px_1px_0_#000] flex items-center gap-1 cursor-pointer z-10"
                      >
                        <RotateCcw size={10} />
                        <span>REPLAY</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Quick Action Buttons below isolated views */}
                  {mobileTab === 'flower' && (
                    <div className="md:hidden flex justify-center mt-3">
                      <button
                        type="button"
                        onClick={() => setMobileTab('card')}
                        className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded border border-black shadow-[2px_2px_0_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
                      >
                        <span>READ LETTER</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {mobileTab === 'card' && (
                    <div className="md:hidden flex justify-center mt-3">
                      <button
                        type="button"
                        onClick={() => setMobileTab('flower')}
                        className="px-4 py-1.5 bg-white hover:bg-stone-50 text-black border border-black font-mono text-[11px] font-black uppercase tracking-wider rounded shadow-[2px_2px_0_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
                      >
                        <ArrowLeft size={12} />
                        <span>VIEW BOUQUET</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: PRINTABLE KEEPSAKE SHEET PREVIEW */}
          {activeView === 'sheet' && (
            <div className="w-full max-w-2xl mx-auto my-auto animate-in fade-in duration-200">
              <div
                id="bouquet-printable-preview"
                className="w-full bg-white border-2 border-black rounded-lg shadow-[8px_8px_0_#000] p-4 sm:p-8 md:p-10 flex flex-col gap-5 sm:gap-6"
              >
                <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider">
                  <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
                  <span className="text-stone-500">NO. BK-{initialBouquet.id.toUpperCase()}</span>
                </div>

                {giftFormat === 'flower' && (
                  <div className="flex flex-col items-center justify-center py-4 gap-4">
                    <div className="w-full max-w-[340px] sm:max-w-[380px] aspect-[4/5] flex items-center justify-center">
                      <BouquetCanvas
                        greeneryLayers={arrangement.greeneryLayers}
                        flowerLayers={arrangement.flowerLayers}
                        showRibbon={true}
                        borderless={true}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-center font-mono">
                      <div className="text-sm font-bold uppercase tracking-wider">
                        FOR: {note.to}
                      </div>
                      <div className="text-xs text-stone-500 uppercase mt-0.5">
                        FROM: {note.from} · {flowers.length} BOTANICAL BLOOMS
                      </div>
                    </div>
                  </div>
                )}

                {giftFormat === 'card' && (
                  <div className="flex flex-col items-center justify-center py-4 sm:py-6 gap-4">
                    <div className="w-full max-w-[460px]">
                      <BouquetCard
                        note={note}
                        cardFont={cardFont}
                        editable={false}
                        className="w-full border-2 border-black rounded shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {giftFormat === 'both' && (
                  <div
                    className={`grid items-center gap-5 sm:gap-6 ${
                      cardPlacement === 'bottom'
                        ? 'grid-cols-1 max-w-[420px] mx-auto'
                        : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                  >
                    <div className="w-full max-w-[300px] sm:max-w-none mx-auto aspect-[4/5] flex items-center justify-center">
                      <BouquetCanvas
                        greeneryLayers={arrangement.greeneryLayers}
                        flowerLayers={arrangement.flowerLayers}
                        showRibbon={true}
                        borderless={true}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="w-full max-w-[380px] sm:max-w-none mx-auto flex items-center justify-center">
                      <BouquetCard
                        note={note}
                        cardFont={cardFont}
                        editable={false}
                        className="w-full aspect-[4/5] border border-stone-300 rounded"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                  <span>
                    {giftFormat === 'card'
                      ? 'Handcrafted personal stationery'
                      : 'Hand-arranged organic botanicals'}
                  </span>
                  <span>Verified keepsake #{initialBouquet.id.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── FLOATING BOTTOM CONTROLS DOCK (ONE SINGLE ROW ON BOTH MOBILE & DESKTOP) ── */}
        <footer className="fixed bottom-2.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[98vw] sm:max-w-fit px-1 sm:px-2 pointer-events-auto flex justify-center">
          <div className="bg-white/95 backdrop-blur-md border-2 border-black rounded-lg p-1 sm:p-1.5 shadow-[3px_3px_0_#000] flex items-center justify-center gap-1 sm:gap-2 flex-nowrap shrink-0">
            {/* 1. View Mode: Display vs Sheet */}
            <div className="inline-flex border border-black bg-stone-100 rounded p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('display')}
                className={`px-1.5 sm:px-2.5 py-1 font-mono text-[9px] sm:text-[11px] font-black uppercase rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  activeView === 'display'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-stone-600 hover:text-black'
                }`}
                title="Display view"
              >
                <Layout size={10} className="sm:w-[11px] sm:h-[11px]" />
                <span>DISPLAY</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('sheet')}
                className={`px-1.5 sm:px-2.5 py-1 font-mono text-[9px] sm:text-[11px] font-black uppercase rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  activeView === 'sheet'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-stone-600 hover:text-black'
                }`}
                title="Printable keepsake sheet view"
              >
                <FileText size={10} className="sm:w-[11px] sm:h-[11px]" />
                <span>SHEET</span>
              </button>
            </div>

            {/* 2. PNG Background: White vs Clear */}
            <div className="inline-flex border border-black bg-stone-100 rounded p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setExportBg('white')}
                title="Solid White PNG Background"
                className={`px-1 sm:px-2 py-1 text-[9px] sm:text-[11px] font-mono font-black uppercase rounded transition-colors cursor-pointer ${
                  exportBg === 'white'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-stone-600 hover:text-black'
                }`}
              >
                WHITE
              </button>
              <button
                type="button"
                onClick={() => setExportBg('clear')}
                title="Clear Transparent PNG Background"
                className={`px-1 sm:px-2 py-1 text-[9px] sm:text-[11px] font-mono font-black uppercase rounded transition-colors cursor-pointer ${
                  exportBg === 'clear'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-stone-600 hover:text-black'
                }`}
              >
                CLEAR
              </button>
            </div>

            {/* 3. Sound / Music Toggle Button */}
            {soundPresetId && soundPresetId !== 'none' && (
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1 sm:p-1.5 border border-black rounded font-mono text-xs cursor-pointer shadow-[1px_1px_0_#000] transition-colors shrink-0 ${
                  isMuted || !isPlayingSound
                    ? 'bg-stone-100 text-stone-400 hover:text-black'
                    : 'bg-black text-white'
                }`}
                title={
                  isMuted || !isPlayingSound
                    ? `Play audio (${activeSoundPreset?.name || 'Ambience'})`
                    : `Mute audio (${activeSoundPreset?.name || 'Ambience'})`
                }
              >
                {isMuted || !isPlayingSound ? (
                  <VolumeX size={11} className="sm:w-[13px] sm:h-[13px]" />
                ) : (
                  <Volume2 size={11} className="sm:w-[13px] sm:h-[13px]" />
                )}
              </button>
            )}

            {/* Divider visible on sm+ */}
            <div className="hidden sm:block w-[1px] h-4 bg-stone-300 shrink-0" />

            {/* 4. Desktop-only PRINT (Mobile users use SAVE PNG) */}
            <button
              type="button"
              onClick={handleNativePrint}
              className="hidden sm:flex px-2.5 sm:px-3 py-1 bg-white hover:bg-stone-50 text-black border border-black rounded font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] cursor-pointer items-center gap-1 shrink-0 active:translate-x-0.5 active:translate-y-0.5"
              title="Print or Save as PDF"
            >
              <Printer size={11} />
              <span>PRINT</span>
            </button>

            {/* 5. SAVE PNG */}
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="px-1.5 sm:px-3 py-1 bg-white hover:bg-stone-50 text-black border border-black rounded font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] cursor-pointer flex items-center gap-1 shrink-0 active:translate-x-0.5 active:translate-y-0.5"
              title={`Download PNG with ${exportBg} background`}
            >
              <Download size={10} className="sm:w-[11px] sm:h-[11px]" />
              <span>{isExporting ? 'SAVING...' : 'SAVE'}</span>
            </button>

            {/* 6. SHARE */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-1.5 sm:px-3 py-1 bg-white hover:bg-stone-50 text-black border border-black rounded font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] cursor-pointer flex items-center gap-1 shrink-0 active:translate-x-0.5 active:translate-y-0.5"
              title="Copy share link"
            >
              {copied ? (
                <Check size={10} className="sm:w-[11px] sm:h-[11px]" />
              ) : (
                <Share2 size={10} className="sm:w-[11px] sm:h-[11px]" />
              )}
              <span>{copied ? 'COPIED' : 'SHARE'}</span>
            </button>

            {/* 7. REPLY */}
            <Link
              href={`/bouquet?replyTo=${encodeURIComponent(note.from)}`}
              className="px-2 sm:px-3 py-1 bg-black hover:bg-neutral-800 text-white border border-black rounded font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] flex items-center gap-1 shrink-0 active:translate-x-0.5 active:translate-y-0.5 transition-colors whitespace-nowrap"
              title={`Reply to ${note.from}`}
            >
              <MessageCircle size={10} className="sm:w-[11px] sm:h-[11px]" />
              <span>REPLY</span>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
