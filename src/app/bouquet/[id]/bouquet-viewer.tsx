'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { StoredBouquet } from '@/lib/supabase';
import { generateBouquetArrangement } from '@/lib/bouquet/arrangement';
import { BouquetCanvas } from '@/components/bouquet/bouquet-canvas';
import { BouquetCard } from '@/components/bouquet/bouquet-card';
import {
  Printer,
  Share2,
  Check,
  Download,
  ArrowLeft,
  MessageCircle,
  PlusCircle,
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface BouquetViewerProps {
  initialBouquet: StoredBouquet;
}

export default function BouquetViewer({ initialBouquet }: BouquetViewerProps) {
  const metadata = initialBouquet.metadata || {};
  const flowers = metadata.flowers || [
    'rose-pink',
    'sunflower-golden',
    'peony-blush',
    'tulip-rose',
    'lily-ivory',
  ];
  const greenery = metadata.greenery || [
    'fern-illustration',
    'olive-spray',
  ];
  const cardTemplateId = metadata.cardTemplateId || 'classic-cream';
  const seed = metadata.seed || 1042;
  const cardFont = metadata.cardFont || 'space-mono';

  const giftFormat = (metadata.giftFormat as 'both' | 'flower' | 'card') || 'both';
  const cardPlacement = (metadata.cardPlacement as 'right' | 'left' | 'bottom') || 'right';

  const note = {
    to: initialBouquet.recipient_name || 'Beloved',
    message:
      initialBouquet.message ||
      'Thinking of you and sending this freshly picked bouquet to brighten your day.',
    from: initialBouquet.sender_name || 'Secret Admirer',
    closing: 'Sincerely',
  };

  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Compute arrangement
  const arrangement = useMemo(() => {
    return generateBouquetArrangement(flowers, greenery, seed);
  }, [flowers, greenery, seed]);

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

  const handleExportPng = async () => {
    const el = document.getElementById('bouquet-canvas-export');
    if (!el) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `bouquet-for-${(note.to || 'special-someone').toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error('Failed to export PNG', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* ── NATIVE PRINT DOCUMENT (REVEALED EXCLUSIVELY ON BROWSER PRINT) ── */}
      <div
        id="bouquet-print-document"
        className="hidden print:flex flex-col items-center justify-center p-8 bg-white min-h-screen text-black w-full"
      >
        <div className="w-full max-w-[760px] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[11px] font-mono font-black uppercase tracking-wider">
            <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
            <span className="text-stone-500">NO. BK-{seed}</span>
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
            <span>Verified keepsake gift</span>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE VIEWER (HIDDEN ON PRINT) ── */}
      <div className="min-h-screen bg-[#FAF7F2] text-black font-sans flex flex-col print:hidden">
        {/* Top Navigation Bar */}
        <header className="h-14 px-4 sm:px-8 border-b-2 border-black bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 bg-white hover:bg-stone-50 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>HOME</span>
            </Link>
            <span className="font-mono text-xs font-black uppercase tracking-wider text-stone-400 hidden sm:inline">
              /
            </span>
            <span className="font-mono text-xs font-black uppercase tracking-wider hidden sm:inline">
              BOTANICAL KEEPSAKE
            </span>
          </div>

          <Link
            href="/bouquet"
            className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
          >
            <PlusCircle size={13} />
            <span>MAKE A BOUQUET</span>
          </Link>
        </header>

        {/* Content Showcase */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-6xl mx-auto w-full">
          {/* Header Title */}
          <div className="text-center mb-6 sm:mb-8">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-black text-white mb-2 inline-block">
              {giftFormat === 'flower'
                ? 'PERSONAL BOTANICAL BOUQUET'
                : giftFormat === 'card'
                ? 'PERSONAL HANDWRITTEN LETTER'
                : 'PERSONAL BOTANICAL DELIVERY'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-black mt-1">
              For {note.to}
            </h1>
            <p className="font-mono text-xs text-stone-600 mt-1">
              {giftFormat === 'card'
                ? `Handwritten letter sent with love from `
                : `Hand-arranged with organic botanicals from `}
              <span className="font-bold text-black">{note.from}</span>
            </p>
          </div>

          {/* VIEW: FLOWER ONLY */}
          {giftFormat === 'flower' && (
            <div className="w-full flex flex-col items-center justify-center max-w-md mx-auto gap-6">
              <div
                id="bouquet-canvas-export"
                className="w-full aspect-[4/5] flex items-center justify-center p-2"
              >
                <BouquetCanvas
                  greeneryLayers={arrangement.greeneryLayers}
                  flowerLayers={arrangement.flowerLayers}
                  showRibbon={true}
                  borderless={true}
                  className="w-full h-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleNativePrint}
                    className="px-3 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>PRINT BOUQUET</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExporting}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>{isExporting ? 'SAVING...' : 'SAVE PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check size={13} />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>
                </div>

                <Link
                  href={`/bouquet?replyTo=${encodeURIComponent(note.from)}`}
                  className="w-full p-2.5 bg-stone-50 hover:bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] text-center flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  <span>SEND A BOUQUET BACK TO {note.from.toUpperCase()}</span>
                </Link>
              </div>
            </div>
          )}

          {/* VIEW: CARD ONLY */}
          {giftFormat === 'card' && (
            <div className="w-full flex flex-col items-center justify-center max-w-md mx-auto gap-6">
              <div
                id="bouquet-canvas-export"
                className="w-full"
              >
                <BouquetCard
                  cardTemplateId={cardTemplateId}
                  cardFont={cardFont}
                  note={note}
                  editable={false}
                  className="w-full aspect-[4/3.6] border-2 border-black shadow-[4px_4px_0_#000]"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleNativePrint}
                    className="px-3 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>PRINT CARD</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExporting}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>{isExporting ? 'SAVING...' : 'SAVE PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check size={13} />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>
                </div>

                <Link
                  href={`/bouquet?replyTo=${encodeURIComponent(note.from)}`}
                  className="w-full p-2.5 bg-stone-50 hover:bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] text-center flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  <span>REPLY WITH A BOUQUET TO {note.from.toUpperCase()}</span>
                </Link>
              </div>
            </div>
          )}

          {/* VIEW: FLOWER WITH CARD */}
          {giftFormat === 'both' && (
            <div
              className={`w-full items-center justify-center max-w-4xl ${
                cardPlacement === 'bottom'
                  ? 'flex flex-col gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 gap-8'
              }`}
            >
              {/* Bouquet Canvas */}
              <div
                id="bouquet-canvas-export"
                className={`w-full aspect-[4/5] mx-auto flex items-center justify-center p-2 ${
                  cardPlacement === 'bottom'
                    ? 'max-w-[360px]'
                    : cardPlacement === 'left'
                    ? 'max-w-[420px] md:order-2'
                    : 'max-w-[420px]'
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

              {/* Handwritten Note Card */}
              <div
                className={`w-full mx-auto flex flex-col gap-4 ${
                  cardPlacement === 'bottom'
                    ? 'max-w-[440px]'
                    : cardPlacement === 'left'
                    ? 'max-w-[380px] md:order-1'
                    : 'max-w-[380px]'
                }`}
              >
                <BouquetCard
                  cardTemplateId={cardTemplateId}
                  cardFont={cardFont}
                  note={note}
                  editable={false}
                  className={`w-full border-2 border-black shadow-[4px_4px_0_#000] ${
                    cardPlacement === 'bottom' ? 'aspect-[4/3]' : 'aspect-[4/5]'
                  }`}
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleNativePrint}
                    className="px-3 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>PRINT / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExporting}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>{isExporting ? 'SAVING...' : 'SAVE PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check size={13} />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Thank you reply link */}
                <Link
                  href={`/bouquet?replyTo=${encodeURIComponent(note.from)}`}
                  className="w-full p-2.5 bg-stone-50 hover:bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] text-center flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  <span>SEND A BOUQUET BACK TO {note.from.toUpperCase()}</span>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
