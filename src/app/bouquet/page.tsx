'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { BouquetCard, NOTE_FONTS } from '@/components/bouquet/bouquet-card';
import {
  ReceiptPrinter,
  ReceiptPrinterStage,
} from '@/components/receipt-printer';
import { ALL_TOOLS } from '@/data/tools';
import { saveBouquetToDatabase } from '@/lib/supabase';
import {
  Shuffle,
  Printer,
  Download,
  Share2,
  Check,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Plus,
  Minus,
  X,
  Search,
  Home,
  LayoutTemplate,
} from 'lucide-react';
import { toPng } from 'html-to-image';

type StudioStep = 1 | 2 | 3 | 4;
type CardPlacement = 'right' | 'left' | 'bottom';

export default function BouquetStudioPage() {
  // Navigation & Drawer states
  const [toolsSidebarOpen, setToolsSidebarOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState('');

  // Collapsible Floating Control Panel state (user can hide completely to enjoy full canvas)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Studio Step: 1 = Greenery, 2 = Blooms, 3 = Write Card, 4 = Finalize
  const [activeStep, setActiveStep] = useState<StudioStep>(1);

  // Flower category: 'small' (Petite Blooms, 3 to 10) or 'big' (Grand Blooms, 3 to 5)
  const [flowerCategory, setFlowerCategory] = useState<'small' | 'big'>('small');

  // Greenery selection state: 1 backdrop for small flowers, 2 sets for big flowers
  const [selectedGreenery, setSelectedGreenery] = useState<string[]>([
    'fern-illustration',
  ]);

  // Flower selection state: 5 default petite blooms
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([
    'rose-pink',
    'sunflower-golden',
    'peony-blush',
    'carnation-blush',
    'daisy-cream',
  ]);

  // Note card content: starts empty so placeholder text shows and disappears on typing
  const [note, setNote] = useState({
    to: '',
    message: '',
    closing: 'Sincerely',
    from: '',
  });

  // Selected handwriting / card font
  const [cardFont, setCardFont] = useState<string>('space-mono');

  // Arrangement seed for auto-shuffle
  const [seed, setSeed] = useState<number>(1042);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keepsake layout choice in Step 4: 'right' | 'left' | 'bottom'
  const [cardPlacement, setCardPlacement] = useState<CardPlacement>('right');

  // Document Printer animation sequence
  const [printerStage, setPrinterStage] = useState<ReceiptPrinterStage>('processing');
  const printerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperHeight, setPaperHeight] = useState<number | null>(null);

  const maxAllowed = flowerCategory === 'big' ? 5 : 10;

  // Start animated document feed sequence
  const startPrintFeedSequence = () => {
    printerTimersRef.current.forEach(clearTimeout);
    setPrinterStage('processing');
    printerTimersRef.current = [
      setTimeout(() => setPrinterStage('printing'), 600),
      setTimeout(() => setPrinterStage('complete'), 2600),
    ];
  };

  // Trigger print sequence when switching to Step 4
  useEffect(() => {
    if (activeStep === 4) {
      startPrintFeedSequence();
    }
    return () => printerTimersRef.current.forEach(clearTimeout);
  }, [activeStep]);

  // Dynamically measure paper height for expandable printer tray
  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const measure = () => setPaperHeight(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardPlacement, activeStep]);

  // Close tools drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute arrangement from selected items and seed
  const arrangement = useMemo(() => {
    return generateBouquetArrangement(selectedFlowers, selectedGreenery, seed);
  }, [selectedFlowers, selectedGreenery, seed]);

  // Filtered greeneries strictly matched by flower category
  const visibleGreeneries = useMemo(() => {
    return GREENERY.filter((g) => g.greenerySize === flowerCategory);
  }, [flowerCategory]);

  // Filtered flowers strictly matched by category
  const visibleFlowers = useMemo(() => {
    return FLOWERS.filter((f) => f.flowerSize === flowerCategory);
  }, [flowerCategory]);

  // Filtered tools for the navigation drawer
  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return ALL_TOOLS;
    const q = toolSearch.toLowerCase();
    return ALL_TOOLS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.hint.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q)
    );
  }, [toolSearch]);

  // Physical shuffle handler: alters seed so flowers physically swap slots and drift naturally
  const handleAutoShuffle = () => {
    setSeed((prev) => prev + Math.floor(Math.random() * 888) + 17);
  };

  // Switch Category cleanly
  const handleCategoryChange = (category: 'small' | 'big') => {
    setFlowerCategory(category);
    if (category === 'big') {
      const hasBig = selectedFlowers.some(
        (id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'big'
      );
      if (!hasBig) {
        setSelectedFlowers(['net-tulip', 'net-rose', 'net-lily']);
      } else {
        setSelectedFlowers((prev) =>
          prev.filter((id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'big').slice(0, 5)
        );
      }
      const validBigGreeneries = selectedGreenery.filter(
        (id) => GREENERY.find((g) => g.id === id)?.greenerySize === 'big'
      );
      if (validBigGreeneries.length >= 2) {
        setSelectedGreenery(validBigGreeneries.slice(0, 2));
      } else if (validBigGreeneries.length === 1) {
        const other = validBigGreeneries[0] === 'net-fern' ? 'net-leafy' : 'net-fern';
        setSelectedGreenery([validBigGreeneries[0], other]);
      } else {
        setSelectedGreenery(['net-leafy', 'net-fern']);
      }
    } else {
      const hasSmall = selectedFlowers.some(
        (id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'small'
      );
      if (!hasSmall) {
        setSelectedFlowers([
          'sunflower-golden',
          'peony-blush',
          'african-daisy-coral',
          'rose-pink',
          'carnation-blush',
        ]);
      } else {
        setSelectedFlowers((prev) =>
          prev.filter((id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'small').slice(0, 10)
        );
      }
      const validSmallGreenery = selectedGreenery.find(
        (id) => GREENERY.find((g) => g.id === id)?.greenerySize === 'small'
      );
      setSelectedGreenery([validSmallGreenery || 'fern-illustration']);
    }
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Quick Random Mix bouquet generator
  const handleRandomMix = () => {
    const pool = visibleFlowers;
    const targetCount =
      flowerCategory === 'big'
        ? 3 + Math.floor(Math.random() * 3)
        : 4 + Math.floor(Math.random() * 5);

    const randomFlowers = [...pool]
      .sort(() => 0.5 - Math.random())
      .slice(0, targetCount)
      .map((f) => f.id);

    if (flowerCategory === 'big') {
      const bigG = GREENERY.filter((g) => g.greenerySize === 'big').map((g) => g.id);
      const shuffledG = [...bigG].sort(() => 0.5 - Math.random());
      setSelectedGreenery([shuffledG[0], shuffledG[1] || shuffledG[0]]);
    } else {
      const smallG = GREENERY.filter((g) => g.greenerySize === 'small').map((g) => g.id);
      const randomG = smallG[Math.floor(Math.random() * smallG.length)];
      setSelectedGreenery([randomG]);
    }

    setSelectedFlowers(randomFlowers);
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Select greenery
  const selectGreenery = (id: string) => {
    const item = GREENERY.find((g) => g.id === id);
    if (!item) return;

    if (item.greenerySize === 'small') {
      if (flowerCategory !== 'small') {
        setFlowerCategory('small');
        const hasSmallFlowers = selectedFlowers.some(
          (fid) => FLOWERS.find((f) => f.id === fid)?.flowerSize === 'small'
        );
        if (!hasSmallFlowers) {
          setSelectedFlowers([
            'rose-pink',
            'sunflower-golden',
            'peony-blush',
            'carnation-blush',
            'daisy-cream',
          ]);
        }
      }
      setSelectedGreenery([id]);
    } else {
      if (flowerCategory !== 'big') {
        setFlowerCategory('big');
        const hasBigFlowers = selectedFlowers.some(
          (fid) => FLOWERS.find((f) => f.id === fid)?.flowerSize === 'big'
        );
        if (!hasBigFlowers) {
          setSelectedFlowers(['net-tulip', 'net-rose', 'net-lily']);
        }
        const companion = id === 'net-fern' ? 'net-leafy' : 'net-fern';
        setSelectedGreenery([id, companion]);
      } else {
        setSelectedGreenery((prev) => {
          if (prev.includes(id)) {
            if (prev.length > 1) {
              return prev.filter((gId) => gId !== id);
            }
            return prev;
          }
          if (prev.length < 2) {
            return [...prev, id];
          }
          return [prev[0], id];
        });
      }
    }
    setSeed((prev) => prev + 1);
  };

  // Add 1 bloom
  const addFlower = (id: string) => {
    const flower = FLOWERS.find((f) => f.id === id);
    if (!flower) return;
    if (selectedFlowers.length >= maxAllowed) return;
    setSelectedFlowers((prev) => [...prev, id]);
  };

  // Remove 1 bloom
  const removeOneFlower = (id: string) => {
    if (selectedFlowers.length <= 1) return;
    setSelectedFlowers((prev) => {
      const idx = prev.lastIndexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  // Toggle flower on/off by clicking the card directly
  const toggleFlower = (id: string) => {
    const count = selectedFlowers.filter((fId) => fId === id).length;
    if (count > 0) {
      if (selectedFlowers.filter((fId) => fId !== id).length === 0) {
        // Preserve at least 1 bloom
        return;
      }
      setSelectedFlowers((prev) => prev.filter((fId) => fId !== id));
    } else {
      if (selectedFlowers.length >= maxAllowed) return;
      setSelectedFlowers((prev) => [...prev, id]);
    }
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
        senderName: note.from.trim() || 'Secret Admirer',
        recipientName: note.to.trim() || 'Beloved',
        message:
          note.message.trim() ||
          'I have so much to tell you, but only this much space on this card! Still, you must know...',
        audioEnabled: false,
        metadata: {
          flowers: selectedFlowers,
          greenery: selectedGreenery,
          seed,
          cardFont,
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

  // Real, native printing
  const handleNativePrint = () => {
    window.print();
  };

  // Direct PNG export of the keepsake sheet
  const handleExportPng = async () => {
    const el = document.getElementById('bouquet-document-sheet') || document.getElementById('bouquet-canvas-export');
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

  const stepsList = [
    { num: 1, label: 'GREENERY' },
    { num: 2, label: `BLOOMS (${selectedFlowers.length}/${maxAllowed})` },
    { num: 3, label: 'CARD' },
    { num: 4, label: 'FINALIZE' },
  ];

  return (
    <div
      suppressHydrationWarning
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#FAF7F2] select-none text-black font-sans"
    >
      {/* ── NATIVE PRINT DOCUMENT (REVEALED EXCLUSIVELY DURING BROWSER PRINT / PDF EXPORT) ── */}
      <div
        id="bouquet-print-document"
        className="hidden print:flex flex-col items-center justify-center p-8 bg-white min-h-screen text-black w-full"
      >
        <div className="w-full max-w-[760px] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[11px] font-mono font-black uppercase tracking-wider">
            <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
            <span className="text-stone-500">NO. BK-{seed}</span>
          </div>

          {/* Side by side: Bouquet on Left, Card on Right */}
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
                  note={{
                    to: note.to.trim() || 'Beloved',
                    message:
                      note.message.trim() ||
                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                    from: note.from.trim() || 'Secret Admirer',
                    closing: note.closing || 'Sincerely',
                  }}
                  cardFont={cardFont}
                  editable={false}
                  className="w-full aspect-[4/5] border border-stone-300"
                />
              </div>
            </div>
          )}

          {/* Side by side: Card on Left, Bouquet on Right */}
          {cardPlacement === 'left' && (
            <div className="grid grid-cols-2 gap-8 items-center">
              <div className="w-full flex items-center justify-center">
                <BouquetCard
                  note={{
                    to: note.to.trim() || 'Beloved',
                    message:
                      note.message.trim() ||
                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                    from: note.from.trim() || 'Secret Admirer',
                    closing: note.closing || 'Sincerely',
                  }}
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

          {/* Stacked: Bouquet on Top, Card at Bottom */}
          {cardPlacement === 'bottom' && (
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-[380px] aspect-[4/5] flex items-center justify-center">
                <BouquetCanvas
                  greeneryLayers={arrangement.greeneryLayers}
                  flowerLayers={arrangement.flowerLayers}
                  showRibbon={true}
                  borderless={true}
                  className="w-full h-full"
                />
              </div>
              <div className="w-full max-w-[460px] flex items-center justify-center">
                <BouquetCard
                  note={{
                    to: note.to.trim() || 'Beloved',
                    message:
                      note.message.trim() ||
                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                    from: note.from.trim() || 'Secret Admirer',
                    closing: note.closing || 'Sincerely',
                  }}
                  cardFont={cardFont}
                  editable={false}
                  className="w-full border border-stone-300"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-500 uppercase tracking-widest">
            <span>Hand-arranged organic botanicals</span>
            <span>Verified keepsake gift</span>
          </div>
        </div>
      </div>

      {/* ── FULLSCREEN INTERACTIVE STUDIO (HIDDEN ON PRINT) ── */}
      <div className="w-full h-full flex flex-col overflow-hidden print:hidden">
        {/* ── TOP UTILITY HUD BAR ── */}
        <header className="shrink-0 h-12 px-3 sm:px-5 flex items-center justify-between border-b-2 border-black bg-white z-30">
          {/* Left: Home link, Tools Navigation Toggle, Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="px-2.5 py-1 bg-white hover:bg-stone-100 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1"
              title="Return to CreatorKit Home"
            >
              <span>‹</span>
              <span>HOME</span>
            </Link>

            <button
              type="button"
              onClick={() => setToolsSidebarOpen(true)}
              className="px-2.5 py-1 bg-white hover:bg-stone-100 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
              title="Open CreatorKit Tools Menu"
            >
              <LayoutTemplate size={13} />
              <span>TOOLS</span>
            </button>

            <span className="font-mono text-xs font-black uppercase tracking-wider hidden lg:inline text-black pl-1 border-l-2 border-stone-200">
              DIGITAL BOUQUET
            </span>
          </div>

          {/* Center: Step Navigation Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {stepsList.map((step) => {
              const isActive = activeStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(step.num as StudioStep)}
                  className={`px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider transition-all border-2 border-black cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-[2px_2px_0_#000]'
                      : 'bg-white text-stone-700 hover:text-black hover:bg-stone-50'
                  }`}
                >
                  <span className="hidden sm:inline">0{step.num}. </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Category Toggle, Physical Shuffle Button & Collapsible Sidebar Toggle */}
          <div className="flex items-center gap-2">
            {activeStep <= 2 && (
              <div className="hidden sm:flex items-center bg-white border-2 border-black p-0.5 shadow-[2px_2px_0_#000]">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('small')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                    flowerCategory === 'small'
                      ? 'bg-black text-white'
                      : 'text-stone-600 hover:text-black'
                  }`}
                >
                  PETITE (1)
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('big')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                    flowerCategory === 'big'
                      ? 'bg-black text-white'
                      : 'text-stone-600 hover:text-black'
                  }`}
                >
                  GRAND (2)
                </button>
              </div>
            )}

            {activeStep <= 2 && (
              <button
                type="button"
                onClick={handleAutoShuffle}
                className="px-2.5 sm:px-3 py-1 bg-white hover:bg-stone-50 border-2 border-black rounded-none font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
                title="Physically shuffle floral arrangement"
              >
                <Shuffle size={13} />
                <span className="hidden sm:inline">SHUFFLE</span>
              </button>
            )}

            {/* Collapsible Panel Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`px-2.5 py-1 font-mono text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                sidebarOpen ? 'bg-white hover:bg-stone-50 text-black' : 'bg-black text-white'
              }`}
              title={sidebarOpen ? 'Hide controls to expand canvas view' : 'Open controls panel'}
            >
              {sidebarOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
              <span className="hidden md:inline">{sidebarOpen ? 'HIDE PANEL' : 'CONTROLS'}</span>
            </button>
          </div>
        </header>

        {/* ── RESPONSIVE STUDIO BODY (ZERO PAGE SCROLL) ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          {/* Floating trigger button to open sidebar when collapsed */}
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute right-4 top-4 z-40 px-3 py-1.5 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            >
              <PanelRightOpen size={14} />
              <span>OPEN CONTROLS</span>
            </button>
          )}

          {/* ── MAIN UNBLOCKED CANVAS STAGE (LEFT / CENTER) ── */}
          <main className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-2 sm:p-5">
            {/* Subtle warm center radial ambiance */}
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-stone-200/40" />

            {/* Steps 1 & 2: Full Majestic Bouquet Unblocked */}
            {(activeStep === 1 || activeStep === 2) && (
              <div className="relative z-10 w-full h-full max-h-[82vh] aspect-[4/5] flex items-center justify-center">
                <BouquetCanvas
                  greeneryLayers={arrangement.greeneryLayers}
                  flowerLayers={arrangement.flowerLayers}
                  showRibbon={true}
                  borderless={true}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Step 3: Full Size Card View directly in the center for writing */}
            {activeStep === 3 && (
              <div className="relative z-10 w-full max-w-[480px] max-h-[82vh] flex items-center justify-center">
                <BouquetCard
                  note={note}
                  onNoteChange={(updated) =>
                    setNote({
                      to: updated.to,
                      message: updated.message,
                      from: updated.from,
                      closing: updated.closing || 'Sincerely',
                    })
                  }
                  cardFont={cardFont}
                  editable={true}
                  className="w-full"
                />
              </div>
            )}

            {/* ── Step 4: The Official CreatorKit Keepsake Document Printer ── */}
            {activeStep === 4 && (
              <div className="relative z-10 w-full h-full max-h-[86vh] overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-4 select-text">
                {/* Layout Selector Bar */}
                <div className="mb-3 flex items-center gap-1 bg-white border-2 border-black p-1 shadow-[2px_2px_0_#000] shrink-0">
                  <span className="text-[10px] font-mono font-black uppercase px-2 text-stone-500 hidden sm:inline">
                    CARD PLACEMENT:
                  </span>
                  <button
                    type="button"
                    onClick={() => setCardPlacement('right')}
                    className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                      cardPlacement === 'right'
                        ? 'bg-black text-white'
                        : 'bg-white text-stone-700 hover:text-black'
                    }`}
                  >
                    RIGHT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardPlacement('bottom')}
                    className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                      cardPlacement === 'bottom'
                        ? 'bg-black text-white'
                        : 'bg-white text-stone-700 hover:text-black'
                    }`}
                  >
                    BOTTOM
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardPlacement('left')}
                    className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                      cardPlacement === 'left'
                        ? 'bg-black text-white'
                        : 'bg-white text-stone-700 hover:text-black'
                    }`}
                  >
                    LEFT
                  </button>
                  <button
                    type="button"
                    onClick={startPrintFeedSequence}
                    title="Replay printer feed animation"
                    className="ml-2 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span className="hidden sm:inline">REPRINT</span>
                  </button>
                </div>

                {/* Animated Document Printer Machine */}
                <ReceiptPrinter.Root
                  stage={printerStage}
                  feedMotion="stepped"
                  className="w-full max-w-2xl mx-auto"
                >
                  <ReceiptPrinter.Machine>
                    <ReceiptPrinter.Header>
                      <ReceiptPrinter.Status>
                        {printerStage === 'processing'
                          ? 'Preparing botanical keepsake…'
                          : printerStage === 'printing'
                          ? 'Printing keepsake document…'
                          : 'Keepsake document ready!'}
                      </ReceiptPrinter.Status>
                      <span className="rounded bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-950">
                        CREATORKIT
                      </span>
                    </ReceiptPrinter.Header>

                    <ReceiptPrinter.Screen>
                      <div className="flex items-baseline justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                        <span>TO: {note.to.trim() || 'BELOVED'}</span>
                        <span>{printerStage === 'complete' ? 'READY' : 'PRINTING'}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">
                        FROM: {note.from.trim() || 'SECRET ADMIRER'} · {selectedFlowers.length} BLOOMS · 1 BOTANICAL KEEPSAKE
                      </p>
                    </ReceiptPrinter.Screen>
                  </ReceiptPrinter.Machine>

                  {/* Output Tray with dynamic measured height */}
                  <ReceiptPrinter.Output
                    style={{
                      height:
                        printerStage === 'processing'
                          ? 240
                          : paperHeight
                          ? paperHeight + 24
                          : 580,
                      transition: 'height 1850ms linear',
                    }}
                  >
                    <div ref={paperRef}>
                      <ReceiptPrinter.Paper
                        variant="document"
                        className="p-5 sm:p-7 border border-stone-200 shadow-2xl bg-white text-black"
                      >
                        {/* The Keepsake Document Sheet that fits 1 A4 canvas */}
                        <div id="bouquet-document-sheet" className="w-full flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[10px] font-mono font-black uppercase tracking-wider">
                            <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
                            <span className="text-stone-500">NO. BK-{seed}</span>
                          </div>

                          {/* Layout Content */}
                          {cardPlacement === 'right' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
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
                                  note={{
                                    to: note.to.trim() || 'Beloved',
                                    message:
                                      note.message.trim() ||
                                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                                    from: note.from.trim() || 'Secret Admirer',
                                    closing: note.closing || 'Sincerely',
                                  }}
                                  cardFont={cardFont}
                                  editable={false}
                                  className="w-full aspect-[4/5] border border-stone-300 shadow-sm"
                                />
                              </div>
                            </div>
                          )}

                          {cardPlacement === 'left' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                              <div className="w-full flex items-center justify-center">
                                <BouquetCard
                                  note={{
                                    to: note.to.trim() || 'Beloved',
                                    message:
                                      note.message.trim() ||
                                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                                    from: note.from.trim() || 'Secret Admirer',
                                    closing: note.closing || 'Sincerely',
                                  }}
                                  cardFont={cardFont}
                                  editable={false}
                                  className="w-full aspect-[4/5] border border-stone-300 shadow-sm"
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
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-full max-w-[320px] aspect-[4/5] flex items-center justify-center">
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
                                  note={{
                                    to: note.to.trim() || 'Beloved',
                                    message:
                                      note.message.trim() ||
                                      'I have so much to tell you, but only this much space on this card! Still, you must know...',
                                    from: note.from.trim() || 'Secret Admirer',
                                    closing: note.closing || 'Sincerely',
                                  }}
                                  cardFont={cardFont}
                                  editable={false}
                                  className="w-full border border-stone-300 shadow-sm"
                                />
                              </div>
                            </div>
                          )}

                          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[9px] font-mono text-stone-500 uppercase tracking-widest">
                            <span>Hand-arranged organic botanicals</span>
                            <span>Verified keepsake gift</span>
                          </div>
                        </div>
                      </ReceiptPrinter.Paper>
                    </div>
                  </ReceiptPrinter.Output>
                </ReceiptPrinter.Root>

                {/* Bright action buttons beneath printer */}
                {printerStage === 'complete' && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 w-full max-w-xl pb-6">
                    <button
                      type="button"
                      onClick={handleNativePrint}
                      className="px-5 py-2.5 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Printer size={15} />
                      <span>PRINT / SAVE AS PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={isExporting}
                      className="px-5 py-2.5 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Download size={15} />
                      <span>{isExporting ? 'SAVING...' : 'SAVE PNG'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-5 py-2.5 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      {copied ? (
                        <>
                          <Check size={15} />
                          <span>LINK COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={15} />
                          <span>SHARE LINK</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* ── DEDICATED EDITING SIDEBAR (RIGHT ON DESKTOP, BOTTOM SHEET ON MOBILE) ── */}
          {sidebarOpen && (
            <aside className="w-full md:w-[360px] lg:w-[400px] shrink-0 border-t-2 md:border-t-0 md:border-l-2 border-black bg-white flex flex-col h-[45vh] md:h-full min-h-0 overflow-hidden z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.04)] animate-in slide-in-from-right duration-200">
              {/* Sidebar Header */}
              <div className="h-11 px-4 bg-stone-50 border-b-2 border-black flex items-center justify-between shrink-0">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
                  {activeStep === 1 && '01. CHOOSE GREENERY'}
                  {activeStep === 2 && `02. SELECT BLOOMS (${selectedFlowers.length}/${maxAllowed})`}
                  {activeStep === 3 && '03. NOTE CARD & TYPOGRAPHY'}
                  {activeStep === 4 && '04. FINALIZE & PRINT'}
                </span>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-stone-500 font-bold uppercase">
                    STEP {activeStep}/4
                  </span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 hover:bg-stone-200 text-stone-600 hover:text-black transition-colors cursor-pointer"
                    title="Collapse sidebar"
                  >
                    <PanelRightClose size={14} />
                  </button>
                </div>
              </div>

              {/* Sidebar Scrollable Controls */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 select-text flex flex-col gap-4">
                {/* ── STEP 1: GREENERY PICKER ── */}
                {activeStep === 1 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-stone-600 font-mono">
                      {flowerCategory === 'small'
                        ? 'Pick 1 botanical backdrop for petite flowers.'
                        : 'Pick 2 foliage sets (Upper Right + Lower Cradle) for big flowers.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {visibleGreeneries.map((item) => {
                        const isSelected = selectedGreenery.includes(item.id);
                        const selectionIndex = selectedGreenery.indexOf(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectGreenery(item.id)}
                            className={`p-2 border-2 transition-all flex flex-col items-center justify-center text-center relative cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-[2px_2px_0_#000]'
                                : 'bg-white hover:bg-stone-50 border-stone-300 text-black hover:border-black'
                            }`}
                          >
                            {flowerCategory === 'big' && isSelected && (
                              <span className="absolute top-1 right-1 text-[8px] font-mono font-black px-1 bg-white text-black">
                                SET {selectionIndex + 1}
                              </span>
                            )}
                            <div className="w-12 h-12 flex items-center justify-center mb-1">
                              <img
                                src={item.src}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold leading-tight">
                              {item.name}
                            </span>
                            <span
                              className={`text-[8px] line-clamp-1 mt-0.5 ${
                                isSelected ? 'text-stone-300' : 'text-stone-500'
                              }`}
                            >
                              {item.meaning}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── STEP 2: BLOOMS PICKER ── */}
                {activeStep === 2 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-stone-600 font-mono">
                        Tap (+) to add multiples. Snug bouquet clustering.
                      </p>
                      <button
                        type="button"
                        onClick={handleRandomMix}
                        className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-black font-mono text-[10px] font-black uppercase shadow-[1px_1px_0_#000] cursor-pointer"
                      >
                        RANDOM MIX
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {visibleFlowers.map((item) => {
                        const count = selectedFlowers.filter((id) => id === item.id).length;
                        const isSelected = count > 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleFlower(item.id)}
                            className={`p-2.5 border-2 transition-all flex flex-col items-center justify-between text-center relative cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-[2px_2px_0_#000]'
                                : 'bg-white hover:bg-stone-50 border-stone-300 hover:border-black text-black'
                            }`}
                          >
                            {count > 0 && (
                              <span className="absolute top-1 right-1 text-[9px] font-mono font-black px-1.5 py-0.5 bg-white text-black border border-black shadow-[1px_1px_0_#000]">
                                ×{count}
                              </span>
                            )}
                            <div className="w-12 h-12 flex items-center justify-center my-1 pointer-events-none">
                              <img
                                src={item.src}
                                alt={item.name}
                                className="w-full h-full object-contain transition-transform group-hover:scale-105"
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold leading-tight uppercase mb-1">
                              {item.name}
                            </span>

                            {/* Stepper controls if selected, or clean TAP TO ADD badge if unselected */}
                            {count > 0 ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-stone-800"
                              >
                                <button
                                  type="button"
                                  onClick={() => removeOneFlower(item.id)}
                                  disabled={selectedFlowers.length <= 1}
                                  className="flex-1 py-1 bg-stone-900 hover:bg-stone-700 text-white border border-stone-700 text-xs font-mono font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Decrease quantity (-)"
                                >
                                  -
                                </button>
                                <span className="text-[11px] font-mono font-black px-1 text-white">
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addFlower(item.id)}
                                  disabled={selectedFlowers.length >= maxAllowed}
                                  className="flex-1 py-1 bg-white hover:bg-stone-100 text-black border border-black text-xs font-mono font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Increase quantity (+)"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <div className="w-full pt-1 border-t border-stone-100 text-[9px] font-mono font-bold text-stone-400 group-hover:text-black">
                                + ADD
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── STEP 3: NOTE CARD & TYPOGRAPHY ── */}
                {activeStep === 3 && (
                  <div className="flex flex-col gap-4">
                    {/* Font Selector */}
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase mb-1.5">
                        Card Handwriting Font (8 Styles)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {NOTE_FONTS.map((font) => {
                          const isSelected = cardFont === font.id;
                          return (
                            <button
                              key={font.id}
                              type="button"
                              onClick={() => setCardFont(font.id)}
                              className={`p-2 border-2 border-black text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-black text-white shadow-[2px_2px_0_#000]'
                                  : 'bg-white hover:bg-stone-50 text-black'
                              }`}
                            >
                              <div className="text-xs sm:text-sm font-semibold truncate">
                                {font.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-stone-200">
                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase mb-1">
                          Recipient (To)
                        </label>
                        <input
                          type="text"
                          value={note.to}
                          onChange={(e) => setNote((prev) => ({ ...prev, to: e.target.value }))}
                          placeholder="Beloved"
                          maxLength={40}
                          className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-xs font-normal outline-none bg-stone-50 focus:bg-white placeholder:text-stone-400"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1 font-mono text-[10px] font-black uppercase">
                          <span>Message Body</span>
                          <span className="text-stone-500">{note.message.length} / 500</span>
                        </div>
                        <textarea
                          rows={4}
                          value={note.message}
                          onChange={(e) => setNote((prev) => ({ ...prev, message: e.target.value }))}
                          placeholder="I have so much to tell you, but only this much space on this card! Still, you must know..."
                          maxLength={500}
                          className="w-full p-2 border-2 border-black font-mono text-xs font-normal outline-none bg-stone-50 focus:bg-white resize-y placeholder:text-stone-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-black uppercase mb-1">
                          Sender (From)
                        </label>
                        <input
                          type="text"
                          value={note.from}
                          onChange={(e) => setNote((prev) => ({ ...prev, from: e.target.value }))}
                          placeholder="Secret Admirer"
                          maxLength={40}
                          className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-xs font-normal outline-none bg-stone-50 focus:bg-white placeholder:text-stone-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: FINALIZE & PRINT CONTROLS ── */}
                {activeStep === 4 && (
                  <div className="flex flex-col gap-3">
                    <p className="font-mono text-xs text-stone-600">
                      Your keepsake sheet is ready. Select layout and print or share.
                    </p>

                    {/* Layout Placement selector inside sidebar */}
                    <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                      <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                        SHEET CARD PLACEMENT
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setCardPlacement('right')}
                          className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                            cardPlacement === 'right' ? 'bg-black text-white' : 'bg-white text-black'
                          }`}
                        >
                          RIGHT
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardPlacement('bottom')}
                          className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                            cardPlacement === 'bottom' ? 'bg-black text-white' : 'bg-white text-black'
                          }`}
                        >
                          BOTTOM
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardPlacement('left')}
                          className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                            cardPlacement === 'left' ? 'bg-black text-white' : 'bg-white text-black'
                          }`}
                        >
                          LEFT
                        </button>
                      </div>
                    </div>

                    {/* Quick Edit Links */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className="text-black font-bold underline cursor-pointer hover:text-stone-700"
                      >
                        ← Edit Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-black font-bold underline cursor-pointer hover:text-stone-700"
                      >
                        Change Blooms →
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleNativePrint}
                      className="p-3 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Printer size={16} />
                      <span>PRINT / SAVE AS PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={isExporting}
                      className="p-3 bg-white text-black hover:bg-stone-50 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Download size={16} />
                      <span>{isExporting ? 'SAVING...' : 'DOWNLOAD HIGH-RES PNG'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="p-3 bg-white text-black hover:bg-stone-50 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Share2 size={16} />
                      <span>{copied ? 'LINK COPIED!' : 'COPY SHARE LINK'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar Footer Navigation: [ BACK ] and [ NEXT ] */}
              <div className="h-16 px-4 bg-stone-50 border-t-2 border-black flex items-center justify-between shrink-0">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev - 1) as StudioStep)}
                    className="px-5 py-2 bg-white hover:bg-stone-100 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                  >
                    ‹ BACK
                  </button>
                ) : (
                  <div />
                )}

                {activeStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev + 1) as StudioStep)}
                    className="px-6 py-2 bg-black hover:bg-neutral-800 text-white border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ml-auto"
                  >
                    NEXT ›
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNativePrint}
                    className="px-6 py-2 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ml-auto flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>PRINT / PDF</span>
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* ── TOOLS NAVIGATION SLIDE-OUT DRAWER ── */}
        {toolsSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setToolsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 transition-opacity backdrop-blur-xs"
            />

            {/* Slide-out Panel */}
            <aside className="fixed top-0 bottom-0 left-0 w-full max-w-[340px] bg-white border-r-2 border-black z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
              {/* Header */}
              <div className="h-14 px-4 bg-stone-50 border-b-2 border-black flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black uppercase tracking-wider">
                    CREATORKIT TOOLS
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black text-white font-bold">
                    {ALL_TOOLS.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setToolsSidebarOpen(false)}
                  className="w-7 h-7 flex items-center justify-center bg-white hover:bg-stone-100 border border-black font-mono text-xs font-bold cursor-pointer"
                  title="Close drawer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick Home Link & Search */}
              <div className="p-3 border-b-2 border-black bg-stone-50 flex flex-col gap-2 shrink-0">
                <Link
                  href="/"
                  onClick={() => setToolsSidebarOpen(false)}
                  className="flex items-center justify-between px-3 py-2 bg-black text-white border border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Home size={14} />
                    <span>CREATORKIT HOME</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-300">HUB</span>
                </Link>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Filter tools..."
                    className="w-full pl-8 pr-2.5 py-1.5 border border-black bg-white font-mono text-xs outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Tools List */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 select-text">
                {filteredTools.map((tool) => {
                  const isActive = tool.href === '/bouquet';
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={() => setToolsSidebarOpen(false)}
                      className={`flex items-center justify-between p-2.5 border-2 transition-all ${
                        isActive
                          ? 'bg-black text-white border-black shadow-[2px_2px_0_#000]'
                          : 'bg-white hover:bg-stone-50 text-black border-stone-200 hover:border-black'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-mono text-xs font-bold truncate">
                          {tool.label}
                        </span>
                        <span
                          className={`text-[9px] line-clamp-1 ${
                            isActive ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {tool.desc}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 shrink-0 ${
                          isActive ? 'bg-white text-black' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {tool.hint}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
