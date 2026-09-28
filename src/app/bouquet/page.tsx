'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FLOWERS,
  GREENERY,
  BotanicalItem,
} from '@/lib/bouquet/constants';
import {
  generateBouquetArrangement,
  BOUQUET_PRESETS,
  BouquetPreset,
} from '@/lib/bouquet/arrangement';
import { BouquetCanvas } from '@/components/bouquet/bouquet-canvas';
import { BouquetCard } from '@/components/bouquet/bouquet-card';
import { BouquetPrinterModal } from '@/components/bouquet/bouquet-printer-modal';
import { saveBouquetToDatabase } from '@/lib/supabase';
import {
  Shuffle,
  Printer,
  Download,
  Share2,
  Check,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Bookmark,
} from 'lucide-react';
import { toPng } from 'html-to-image';

const BLACK = '#000000';
const YELLOW = '#FFE500';

type StudioStep = 1 | 2 | 3 | 4;

export default function DigitalBouquetPage() {
  // Stepper state: 1: Greenery -> 2: Blooms -> 3: Note -> 4: Finalize
  const [currentStep, setCurrentStep] = useState<StudioStep>(1);

  // Greenery selection state: 1 primary grand backdrop (up to 3)
  const [selectedGreenery, setSelectedGreenery] = useState<string[]>([
    'fern-illustration',
  ]);

  // Flower category: 'small' (Petite Blooms, 3 to 10) or 'big' (Grand Blooms, 3 to 5)
  const [flowerCategory, setFlowerCategory] = useState<'small' | 'big'>('small');

  // Flower selection state: 5 default petite blooms
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([
    'rose-pink',
    'sunflower-golden',
    'peony-blush',
    'carnation-blush',
    'daisy-cream',
  ]);

  // Personal Note (Minimalist Authentic Letterhead)
  const [note, setNote] = useState({
    to: 'Sarah',
    message:
      'Sending you a burst of fresh blooms to brighten your desk. Wishing you the happiest and most wonderful week ahead!',
    from: 'Alex',
  });

  // Arrangement seed for auto-shuffle
  const [seed, setSeed] = useState<number>(1042);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardPlacement, setCardPlacement] = useState<'right' | 'left' | 'bottom'>('right');

  // Compute arrangement from selected items and seed
  const arrangement = useMemo(() => {
    return generateBouquetArrangement(selectedFlowers, selectedGreenery, seed);
  }, [selectedFlowers, selectedGreenery, seed]);

  // Quick Auto Shuffle handler
  const handleAutoShuffle = () => {
    setSeed((prev) => prev + Math.floor(Math.random() * 50) + 1);
  };

  // Switch Category cleanly without mixing
  const handleCategoryChange = (category: 'small' | 'big') => {
    setFlowerCategory(category);
    if (category === 'big') {
      const hasBig = selectedFlowers.some(id => FLOWERS.find(f => f.id === id)?.flowerSize === 'big');
      if (!hasBig) {
        setSelectedFlowers(['net-tulip', 'net-rose', 'net-lily']);
      } else {
        setSelectedFlowers(prev => prev.filter(id => FLOWERS.find(f => f.id === id)?.flowerSize === 'big').slice(0, 5));
      }
    } else {
      const hasSmall = selectedFlowers.some(id => FLOWERS.find(f => f.id === id)?.flowerSize === 'small');
      if (!hasSmall) {
        setSelectedFlowers(['sunflower-golden', 'peony-blush', 'african-daisy-coral', 'rose-pink', 'carnation-blush']);
      } else {
        setSelectedFlowers(prev => prev.filter(id => FLOWERS.find(f => f.id === id)?.flowerSize === 'small').slice(0, 10));
      }
    }
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Quick Random Mix bouquet generator (NO SPARKLES!)
  const handleRandomMix = () => {
    const pool = FLOWERS.filter(f => f.flowerSize === flowerCategory);
    const targetCount = flowerCategory === 'big'
      ? (3 + Math.floor(Math.random() * 3)) // 3 to 5 blooms
      : (4 + Math.floor(Math.random() * 5)); // 4 to 8 blooms

    const randomFlowers = [...pool]
      .sort(() => 0.5 - Math.random())
      .slice(0, targetCount)
      .map((f) => f.id);

    const randomGreenery = [
      GREENERY[Math.floor(Math.random() * GREENERY.length)].id,
    ];

    setSelectedFlowers(randomFlowers);
    setSelectedGreenery(randomGreenery);
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Apply a curated floral preset
  const handleApplyPreset = (preset: BouquetPreset) => {
    setFlowerCategory(preset.type);
    setSelectedGreenery([preset.greeneryId]);
    setSelectedFlowers([...preset.flowerIds]);
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Toggle greenery selection: 1 to 3
  const toggleGreenery = (id: string) => {
    setSelectedGreenery((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter((g) => g !== id);
      } else {
        if (prev.length >= 3) return [id]; // Set as primary
        return [...prev, id];
      }
    });
  };

  // Toggle flower selection: Strictly MIN 3, MAX 5 (big) or MAX 10 (small)
  const toggleFlower = (id: string) => {
    const flower = FLOWERS.find(f => f.id === id);
    if (!flower) return;
    const isBig = flower.flowerSize === 'big';
    const maxAllowed = isBig ? 5 : 10;

    setSelectedFlowers((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 3) return prev; // Cannot go below min 3
        return prev.filter((f) => f !== id);
      } else {
        if (prev.length >= maxAllowed) return prev; // Cannot exceed max
        return [...prev, id];
      }
    });
  };

  // Save to DB and generate short link
  const handleGenerateShareLink = async (): Promise<string> => {
    if (shareUrl) return shareUrl;

    try {
      const shortId = await saveBouquetToDatabase({
        sceneType: 'botanical-2d',
        season: 'spring',
        paletteId: 'minimalist-letterhead',
        targetUrl: typeof window !== 'undefined' ? window.location.origin : '',
        senderName: note.from,
        recipientName: note.to,
        message: note.message,
        audioEnabled: false,
        metadata: {
          flowers: selectedFlowers,
          greenery: selectedGreenery,
          seed,
          cardPlacement,
        },
      });

      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/bouquet/${shortId}`;
      setShareUrl(url);
      return url;
    } catch (e) {
      console.error('Failed to generate bouquet link', e);
      return '';
    }
  };

  const handleCopyLink = async () => {
    const url = await handleGenerateShareLink();
    if (url) {
      await navigator.clipboard.writeText(url);
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
      a.download = `bouquet-${(note.to || 'keepsake').toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error('Failed to export image', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ background: '#F4F4F5', minHeight: '100vh', padding: '16px 16px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top Minimal Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 auto 20px' }}>
          <Link
            href="/"
            className="brutalist-button"
            style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            ‹ HOME
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '4px 10px',
                border: `2px solid ${BLACK}`,
                background: YELLOW,
                color: BLACK,
                fontFamily: 'monospace',
                boxShadow: '2px 2px 0 #000000',
              }}
            >
              CREATOR STUDIO // DIGITAL BOUQUET
            </span>

            <button
              onClick={() => setPrinterOpen(true)}
              className="brutalist-button brutalist-button-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={14} />
              <span>PRINT KEEPSAKE</span>
            </button>
          </div>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '3px 8px',
                border: `2px solid ${BLACK}`,
                background: '#ffffff',
                color: BLACK,
                fontFamily: 'monospace',
              }}
            >
              STEP-BY-STEP BUILDER
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#555', fontFamily: 'monospace' }}>
              ENCAPSULATING GARDEN GREENERY ➔ NESTLED BLOOMS ➔ MINIMALIST LETTERHEAD
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: BLACK,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Digital Bouquet Studio
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5, fontWeight: 500, margin: '6px 0 0', maxWidth: 720 }}>
            Large garden greenery encapsulates your hand-picked blooms, paired with an authentic minimalist letterhead.
          </p>
        </div>

        {/* ── CURATED FLORAL PRESETS BAR ── */}
        <div
          className="brutalist-card"
          style={{
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflowX: 'auto',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Bookmark size={14} />
            <span style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              PRESETS:
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
            {BOUQUET_PRESETS.map((preset) => {
              const isSelected =
                preset.flowerIds.length === selectedFlowers.length &&
                preset.flowerIds.every((id) => selectedFlowers.includes(id));

              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="brutalist-button"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.68rem',
                    whiteSpace: 'nowrap',
                    background: isSelected ? YELLOW : '#ffffff',
                    fontWeight: isSelected ? 900 : 700,
                  }}
                  title={preset.tagline}
                >
                  {preset.type === 'big' ? '🌺 ' : '🌸 '}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEPPER NAVIGATION BAR ── */}
        <div
          className="brutalist-card"
          style={{
            padding: 8,
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {[
              { num: 1, label: '01. GREENERY', sub: `${selectedGreenery.length} selected` },
              { num: 2, label: '02. BLOOMS', sub: `${selectedFlowers.length}/${flowerCategory === 'big' ? 5 : 10} blooms` },
              { num: 3, label: '03. NOTE CARD', sub: `To: ${note.to || 'Someone'}` },
              { num: 4, label: '04. FINALIZE & SHARE', sub: 'Preview & Link' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num as StudioStep)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    background: isActive ? YELLOW : isPast ? '#f4f4f5' : '#ffffff',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    boxShadow: isActive ? '3px 3px 0 #000' : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 2,
                      background: isActive ? '#000' : '#fff',
                      color: isActive ? '#fff' : '#000',
                      border: '1px solid #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                    }}
                  >
                    {isPast ? '✓' : step.num}
                  </span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.1 }}>{step.label}</div>
                    <div style={{ fontSize: '0.6rem', color: '#666', fontWeight: 600 }}>{step.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step Quick Navigation */}
          <div style={{ display: 'flex', gap: 6 }}>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((prev) => (prev - 1) as StudioStep)}
                className="brutalist-button"
                style={{ padding: '7px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ArrowLeft size={13} />
                <span>BACK</span>
              </button>
            )}
            {currentStep < 4 && (
              <button
                onClick={() => setCurrentStep((prev) => (prev + 1) as StudioStep)}
                className="brutalist-button brutalist-button-primary"
                style={{ padding: '7px 14px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span>NEXT STEP</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Main Step Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN: Active Step Controls (5 cols) ─── */}
          <div className="lg:col-span-5 flex flex-col gap-5 order-2 lg:order-1">
            {/* STEP 1: GREENERY BACKDROP */}
            {currentStep === 1 && (
              <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: '2px solid #000', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                      STEP 01 // GARDEN GREENERY
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        background: YELLOW,
                        color: '#000',
                        border: '1.5px solid #000',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedGreenery.length} SELECTED
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#666', marginTop: 4, fontFamily: 'monospace' }}>
                    Choose your main garden greenery. It scales up big to encapsulate and cradle the entire flower bouquet.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {GREENERY.map((g) => {
                    const isSelected = selectedGreenery.includes(g.id);

                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGreenery(g.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: isSelected ? '#15803D' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#000000',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '3px 3px 0 #000' : 'none',
                          transition: 'all 0.12s ease',
                          textAlign: 'left',
                        }}
                      >
                        <img src={g.src} alt={g.name} className="w-8 h-8 object-contain shrink-0" draggable={false} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 900, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.name}
                          </span>
                          <span style={{ fontSize: '0.62rem', opacity: 0.85, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.meaning}
                          </span>
                        </div>
                        {isSelected && <Check size={16} className="text-white shrink-0" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, borderTop: '2px solid #000' }}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: '10px 20px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>NEXT: PICK BLOOMS</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: BLOOM SELECTION */}
            {currentStep === 2 && (
              <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Category Switcher Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => handleCategoryChange('small')}
                    className="brutalist-button"
                    style={{
                      padding: '10px 8px',
                      background: flowerCategory === 'small' ? YELLOW : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      border: '2px solid #000',
                      boxShadow: flowerCategory === 'small' ? '3px 3px 0 #000' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#000' }}>
                      🌸 PETITE BLOOMS
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#444' }}>
                      12 Flowers · Pick 3 to 10
                    </span>
                  </button>

                  <button
                    onClick={() => handleCategoryChange('big')}
                    className="brutalist-button"
                    style={{
                      padding: '10px 8px',
                      background: flowerCategory === 'big' ? YELLOW : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      border: '2px solid #000',
                      boxShadow: flowerCategory === 'big' ? '3px 3px 0 #000' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#000' }}>
                      🌺 GRAND STATEMENT
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#444' }}>
                      8 Big Flowers · Pick 3 to 5
                    </span>
                  </button>
                </div>

                {/* Quick Presets for this Category */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#F8FAFC',
                    border: '1.5px solid #000',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: '0.64rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#555' }}>
                    CURATED PRESETS ({flowerCategory === 'big' ? 'GRAND STATEMENT' : 'PETITE GARDEN'}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {BOUQUET_PRESETS.filter(p => p.type === flowerCategory).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="brutalist-button"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          background: '#FFFFFF',
                        }}
                        title={preset.tagline}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderBottom: '2px solid #000', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                      {flowerCategory === 'big' ? 'GRAND STATEMENT BLOOMS' : 'PETITE GARDEN BLOOMS'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        background: selectedFlowers.length >= (flowerCategory === 'big' ? 5 : 10) ? '#ef4444' : selectedFlowers.length <= 3 ? '#eab308' : YELLOW,
                        color: '#000',
                        border: '1.5px solid #000',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedFlowers.length} OF {flowerCategory === 'big' ? 5 : 10} SELECTED
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: '#666', fontFamily: 'monospace' }}>
                      MIN 3 · MAX {flowerCategory === 'big' ? 5 : 10} ({flowerCategory === 'big' ? 'WIDE SPACING' : 'BALANCED CLUSTER'})
                    </span>
                    <button
                      onClick={handleRandomMix}
                      className="brutalist-button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#FFE500',
                      }}
                    >
                      <Shuffle size={12} />
                      <span>RANDOM MIX</span>
                    </button>
                  </div>
                </div>

                {/* Flowers Grid with Fixed Normalized Squares */}
                <div className="grid grid-cols-4 gap-2">
                  {FLOWERS.filter(f => f.flowerSize === flowerCategory).map((flower) => {
                    const isSelected = selectedFlowers.includes(flower.id);
                    const maxAllowed = flowerCategory === 'big' ? 5 : 10;
                    const isMax = selectedFlowers.length >= maxAllowed && !isSelected;
                    const isMin = selectedFlowers.length <= 3 && isSelected;

                    return (
                      <button
                        key={flower.id}
                        onClick={() => toggleFlower(flower.id)}
                        disabled={isMax}
                        title={isMax ? `Max ${maxAllowed} blooms reached` : isMin ? 'Min 3 blooms required' : flower.name}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '10px 4px 8px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: isSelected ? YELLOW : '#FFFFFF',
                          cursor: isMax ? 'not-allowed' : 'pointer',
                          opacity: isMax ? 0.4 : 1,
                          boxShadow: isSelected ? '3px 3px 0 #000' : 'none',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div className="w-12 h-12 flex items-center justify-center mb-1.5">
                          <img
                            src={flower.src}
                            alt={flower.name}
                            className="w-11 h-11 object-contain drop-shadow-sm"
                            draggable={false}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            textAlign: 'center',
                            color: '#000',
                            lineHeight: 1.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            padding: '0 2px',
                          }}
                        >
                          {flower.name}
                        </span>

                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 14,
                              height: 14,
                              background: '#000000',
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                            }}
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid #000' }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="brutalist-button"
                    style={{ padding: '8px 16px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK: GREENERY</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: '8px 18px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>NEXT: NOTE CARD</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: MINIMALIST AUTHENTIC LETTERHEAD NOTE */}
            {currentStep === 3 && (
              <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: '2px solid #000', paddingBottom: 12 }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                    STEP 03 // MINIMALIST LETTERHEAD NOTE
                  </span>
                  <p style={{ fontSize: '0.72rem', color: '#666', marginTop: 4, fontFamily: 'monospace' }}>
                    Authentic stationery card with pink corner brackets, handwritten calligraphy, and clear structure.
                  </p>
                </div>

                {/* Structured Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                      Recipient Name (To)
                    </label>
                    <input
                      type="text"
                      value={note.to}
                      onChange={(e) => setNote((prev) => ({ ...prev, to: e.target.value }))}
                      placeholder="e.g. Sarah"
                      maxLength={40}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: '#fff',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                      Your Personal Message
                    </label>
                    <textarea
                      rows={4}
                      value={note.message}
                      onChange={(e) => setNote((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Write your note..."
                      maxLength={200}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: '#fff',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'none',
                        fontFamily: '"Caveat", "Playfair Display", "Brush Script MT", cursive',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#666', fontFamily: 'monospace', marginTop: 2 }}>
                      <span>Decodes dynamically on recipient arrival</span>
                      <span>{note.message.length}/200</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                      Your Name (From)
                    </label>
                    <input
                      type="text"
                      value={note.from}
                      onChange={(e) => setNote((prev) => ({ ...prev, from: e.target.value }))}
                      placeholder="e.g. Alex"
                      maxLength={40}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: '#fff',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid #000' }}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="brutalist-button"
                    style={{ padding: '8px 16px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ArrowLeft size={14} />
                    <span>BACK: BLOOMS</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: '8px 18px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>REVIEW &amp; FINALIZE</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: FINALIZE, PREVIEW & SHARE */}
            {currentStep === 4 && (
              <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: '2px solid #000', paddingBottom: 12 }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                    STEP 04 // READY TO SEND &amp; PRINT
                  </span>
                  <p style={{ fontSize: '0.72rem', color: '#666', marginTop: 4, fontFamily: 'monospace' }}>
                    Your custom bouquet and letterhead are assembled. Share the unboxing link or print as a physical card.
                  </p>
                </div>

                {/* Quick Edit Shortcuts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="brutalist-button"
                    style={{ padding: '6px 10px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Edit3 size={12} />
                    <span>Edit Greenery</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="brutalist-button"
                    style={{ padding: '6px 10px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Edit3 size={12} />
                    <span>Edit Blooms ({selectedFlowers.length})</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="brutalist-button"
                    style={{ padding: '6px 10px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Edit3 size={12} />
                    <span>Edit Letterhead</span>
                  </button>
                </div>

                {/* Print Placement preference */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>
                    Printed Card Attachment Placement
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['right', 'left', 'bottom'] as const).map((placement) => (
                      <button
                        key={placement}
                        onClick={() => setCardPlacement(placement)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: cardPlacement === placement ? YELLOW : '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          boxShadow: cardPlacement === placement ? '2px 2px 0 #000' : 'none',
                        }}
                      >
                        {placement}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '2px solid #000' }}>
                  <button
                    onClick={handleCopyLink}
                    className="brutalist-button brutalist-button-primary"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: copied ? '#86efac' : YELLOW,
                    }}
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        <span>RECIPIENT LINK COPIED TO CLIPBOARD!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        <span>GET SHAREABLE RECIPIENT LINK</span>
                      </>
                    )}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleAutoShuffle}
                      className="brutalist-button"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Shuffle size={14} />
                      <span>AUTO SHUFFLE</span>
                    </button>

                    <button
                      onClick={handleExportPng}
                      disabled={isExporting}
                      className="brutalist-button"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Download size={14} />
                      <span>{isExporting ? 'SAVING...' : 'PNG'}</span>
                    </button>

                    <button
                      onClick={() => setPrinterOpen(true)}
                      className="brutalist-button"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '0.74rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Printer size={14} />
                      <span>PRINT</span>
                    </button>
                  </div>

                  {shareUrl && (
                    <div
                      style={{
                        padding: 10,
                        border: '1.5px solid #000',
                        borderRadius: 4,
                        background: '#ffffff',
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                      }}
                    >
                      <span style={{ fontWeight: 900, display: 'block', marginBottom: 2 }}>DISPATCH LINK:</span>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'underline' }}>
                        {shareUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN: Live Stage (7 cols) ─── */}
          <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2 lg:sticky lg:top-6">
            {/* Live Canvas View */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Stage Top Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '2px solid #000',
                  borderRadius: 4,
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      padding: '2px 6px',
                      background: YELLOW,
                      border: '1px solid #000',
                      fontFamily: 'monospace',
                    }}
                  >
                    LIVE CANVAS
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedFlowers.length} BLOOMS · ENCAPSULATING GREENERY
                  </span>
                </div>

                <button
                  onClick={handleAutoShuffle}
                  className="brutalist-button"
                  style={{ padding: '3px 8px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Re-roll organic tilts"
                >
                  <Shuffle size={11} />
                  <span>SHUFFLE</span>
                </button>
              </div>

              {/* 1. Pristine Bouquet Canvas (Encapsulated by big greenery, snug flower bunch) */}
              <BouquetCanvas
                greeneryLayers={arrangement.greeneryLayers}
                flowerLayers={arrangement.flowerLayers}
              />

              {/* 2. Companion Minimalist Letterhead Card (Clean, Authentic, Separate from canvas) */}
              <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000' }}>
                    ACCOMPANYING LETTERHEAD CARD
                  </span>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#666' }}>
                    MINIMALIST STATIONERY
                  </span>
                </div>

                <BouquetCard
                  note={note}
                  onClick={() => setCurrentStep(3)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Card Printer Modal (Using official ReceiptPrinter) */}
      <BouquetPrinterModal
        isOpen={printerOpen}
        onClose={() => setPrinterOpen(false)}
        greeneryLayers={arrangement.greeneryLayers}
        flowerLayers={arrangement.flowerLayers}
        cardTemplateId="minimalist-letterhead"
        note={note}
        shareUrl={shareUrl}
        onShare={handleGenerateShareLink}
        cardPlacement={cardPlacement}
      />
    </div>
  );
}
