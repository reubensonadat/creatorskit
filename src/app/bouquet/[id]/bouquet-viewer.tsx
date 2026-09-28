'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { StoredBouquet } from '@/lib/supabase';
import { generateBouquetArrangement } from '@/lib/bouquet/arrangement';
import { BouquetCanvas } from '@/components/bouquet/bouquet-canvas';
import { BouquetCard } from '@/components/bouquet/bouquet-card';
import { BouquetPrinterModal } from '@/components/bouquet/bouquet-printer-modal';
import {
  ReceiptPrinter,
  ReceiptPrinterStage,
} from '@/components/receipt-printer';
import {
  Printer,
  Heart,
  Share2,
  Check,
  Download,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Eye,
  RotateCcw,
  Gift,
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
  const cardPlacement = metadata.cardPlacement || 'right';

  const note = {
    to: initialBouquet.recipient_name || 'Someone Special',
    message:
      initialBouquet.message ||
      'Thinking of you and sending this freshly picked bouquet to brighten your day.',
    from: initialBouquet.sender_name || 'A Friend',
  };

  // Two-phase recipient experience:
  // Phase 1: 'unboxing' (Physical printer feeds out message card, text decodes, images preload)
  // Phase 2: 'revealed' ("Boom!" Bouquet canvas and card shown together in full glory)
  const [phase, setPhase] = useState<'unboxing' | 'revealed'>('unboxing');
  const [printerStage, setPrinterStage] = useState<ReceiptPrinterStage>('processing');
  const [isDecoding, setIsDecoding] = useState(false);
  const [isDecodeComplete, setIsDecodeComplete] = useState(false);

  const [printerOpen, setPrinterOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Compute arrangement
  const arrangement = useMemo(() => {
    return generateBouquetArrangement(flowers, greenery, seed);
  }, [flowers, greenery, seed]);

  // Silent Background Preloader: caches flower and greenery images while note is decoding
  useEffect(() => {
    const urlsToPreload = [
      ...arrangement.greeneryLayers.map((l) => l.item.src),
      ...arrangement.flowerLayers.map((l) => l.item.src),
    ];

    urlsToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [arrangement]);

  // Handle printer feed and decoding sequence on load
  useEffect(() => {
    if (phase !== 'unboxing') return;

    setPrinterStage('processing');
    const t1 = setTimeout(() => {
      setPrinterStage('printing');
    }, 700);

    const t2 = setTimeout(() => {
      setPrinterStage('complete');
      setIsDecoding(true);
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  const handleRevealBouquet = () => {
    setPhase('revealed');
  };

  const handleReplayUnboxing = () => {
    setIsDecodeComplete(false);
    setIsDecoding(false);
    setPhase('unboxing');
  };

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPng = async () => {
    const el = document.getElementById('bouquet-canvas-export');
    if (!el) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `bouquet-gift-for-${(note.to || 'special-someone').toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error('Failed to export PNG', e);
    } finally {
      setIsExporting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: THE UNBOXING EXPERIENCE (Printer Dispatch & Text Decoding)
  // ═══════════════════════════════════════════════════════════════
  if (phase === 'unboxing') {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', padding: '24px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Dispatch Notice Header */}
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                background: '#FFE500',
                color: '#000',
                fontSize: '0.68rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                padding: '3px 10px',
                border: '1.5px solid #000',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: 2,
              }}
            >
              SPECIAL BOTANICAL DISPATCH
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '10px 0 4px', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Gift Delivery for {note.to || 'You'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: 0 }}>
              Sent with love by <strong style={{ color: '#fff' }}>{note.from || 'A Friend'}</strong>.
            </p>
          </div>

          {/* Official Animated Receipt Printer feeding out the message sheet */}
          <ReceiptPrinter.Root
            stage={printerStage}
            feedMotion="stepped"
            className="w-full max-w-md mx-auto"
          >
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <ReceiptPrinter.Status>
                  {printerStage === 'processing'
                    ? 'Receiving message dispatch…'
                    : printerStage === 'printing'
                    ? 'Printing personal note sheet…'
                    : isDecodeComplete
                    ? 'Gift attachment ready!'
                    : 'Decoding personal message…'}
                </ReceiptPrinter.Status>
                <span className="rounded bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                  CREATORKIT
                </span>
              </ReceiptPrinter.Header>

              <ReceiptPrinter.Screen>
                <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                  <span>To: {note.to || 'Someone'}</span>
                  <span>{isDecodeComplete ? 'READY' : 'DECODING'}</span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">
                  From: {note.from || 'A Friend'} · 1 Botanical Bouquet Attached
                </p>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>

            {/* Output slot where card feeds out */}
            <ReceiptPrinter.Output className="h-[27rem] sm:h-[30rem]">
              <ReceiptPrinter.Paper
                variant="document"
                className="p-3 sm:p-4 rounded-lg border border-stone-300 shadow-xl"
              >
                {/* The Structured Card with live text decoding */}
                <BouquetCard
                  cardTemplateId={cardTemplateId}
                  note={note}
                  isDecoding={isDecoding}
                  onDecodeComplete={() => setIsDecodeComplete(true)}
                  className="w-full aspect-[4/5] border-2 border-black"
                />
              </ReceiptPrinter.Paper>
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>

          {/* Reveal Button (Activates as message decodes / is ready) */}
          <div style={{ width: '100%', maxWidth: 420, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleRevealBouquet}
              className="brutalist-button brutalist-button-primary animate-bounce"
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '0.86rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#FFE500',
                color: '#000',
                border: '2px solid #000',
                boxShadow: '4px 4px 0 #ffffff',
                cursor: 'pointer',
              }}
            >
              <Gift size={18} />
              <span>VIEW BOUQUET &amp; GIFT ATTACHED →</span>
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#71717a', fontFamily: 'monospace' }}>
              Images preloaded silently in background · Zero loading delay
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: THE REVEALED BOUQUET SHOWCASE ("BOOM!")
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#F4F4F5', color: '#000', padding: '16px 16px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top Minimal Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 auto 20px' }}>
          <Link
            href="/bouquet"
            className="brutalist-button"
            style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>MAKE YOUR OWN BOUQUET</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleReplayUnboxing}
              className="brutalist-button"
              style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Watch unboxing and message decoding again"
            >
              <RotateCcw size={13} />
              <span>REPLAY DISPATCH</span>
            </button>

            <button
              onClick={() => setPrinterOpen(true)}
              className="brutalist-button brutalist-button-primary"
              style={{ padding: '6px 14px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={14} />
              <span>PRINT KEEPSAKE</span>
            </button>
          </div>
        </div>

        {/* Recipient Greeting Banner */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '3px 8px',
                border: '1.5px solid #000',
                background: '#FFE500',
                fontFamily: 'monospace',
              }}
            >
              SPECIAL DELIVERY VERIFIED
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.7rem, 4vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              margin: '0 0 6px',
            }}
          >
            {note.to ? `${note.to}, Your Bouquet Is In Bloom!` : 'Your Bouquet Is In Bloom!'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#555', margin: 0, fontWeight: 500 }}>
            Handcrafted with love and organic care by <strong style={{ color: '#000' }}>{note.from || 'a friend'}</strong>.
          </p>
        </div>

        {/* The Showcase Stage: Bouquet Canvas + Separate Keepsake Card */}
        <div
          className="brutalist-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            marginBottom: 24,
            background: '#ffffff',
          }}
        >
          <div
            className={`w-full flex items-center justify-center gap-8 ${
              cardPlacement === 'bottom'
                ? 'flex-col'
                : cardPlacement === 'left'
                ? 'flex-col lg:flex-row-reverse'
                : 'flex-col lg:flex-row'
            }`}
          >
            {/* 1. Pristine Bouquet Canvas (Completely unblocked!) */}
            <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  BOTANICAL CANVAS · {flowers.length} BLOOMS · {greenery.length} GREENERY BACKDROP
                </span>
              </div>
              <BouquetCanvas
                greeneryLayers={arrangement.greeneryLayers}
                flowerLayers={arrangement.flowerLayers}
                showRibbon={true}
              />
            </div>

            {/* 2. Structured Keepsake Card (Separated from the canvas!) */}
            <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                  PERSONAL DEDICATION LETTER CARD
                </span>
              </div>
              <BouquetCard
                cardTemplateId={cardTemplateId}
                note={note}
                onClick={() => setPrinterOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Action Controls for Recipient */}
        <div
          className="brutalist-card"
          style={{
            padding: 14,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#ffffff',
          }}
        >
          <button
            onClick={() => setPrinterOpen(true)}
            className="brutalist-button brutalist-button-primary"
            style={{ padding: '10px 18px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={15} />
            <span>PRINT OFFICIAL KEEPSAKE</span>
          </button>

          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="brutalist-button"
            style={{ padding: '10px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            <span>{isExporting ? 'SAVING...' : 'SAVE IMAGE'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="brutalist-button"
            style={{ padding: '10px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, background: copied ? '#86efac' : '#fff' }}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>LINK COPIED!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>SHARE THIS GIFT</span>
              </>
            )}
          </button>

          <Link
            href={`/bouquet/response?to=${encodeURIComponent(note.from)}&from=${encodeURIComponent(note.to)}`}
            className="brutalist-button"
            style={{ padding: '10px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <MessageCircle size={14} />
            <span>SEND A THANK YOU NOTE</span>
          </Link>
        </div>
      </div>

      {/* Real-time Physical Card & Bouquet Printer Modal */}
      <BouquetPrinterModal
        isOpen={printerOpen}
        onClose={() => setPrinterOpen(false)}
        greeneryLayers={arrangement.greeneryLayers}
        flowerLayers={arrangement.flowerLayers}
        cardTemplateId={cardTemplateId}
        note={note}
        cardPlacement={cardPlacement}
      />
    </div>
  );
}
