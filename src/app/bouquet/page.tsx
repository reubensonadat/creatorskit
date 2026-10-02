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
import { BouquetCard, NOTE_FONTS, getDynamicNameFontSize } from '@/components/bouquet/bouquet-card';
import {
  ReceiptPrinter,
  ReceiptPrinterStage,
} from '@/components/receipt-printer';
import SiteNav from '@/components/nav/SiteNav';
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
  LayoutTemplate,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Square,
  Layers,
  Flower2,
  Mail,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { soundEngine, SOUND_PRESETS } from '@/lib/bouquet/soundscapes';
import { getBouquetFontEmbedCSS, prefetchBouquetFonts } from '@/lib/bouquet/font-embed';

type StudioStep = 1 | 2 | 3 | 4;
type CardPlacement = 'right' | 'left' | 'bottom' | 'top';
export type GiftFormat = 'both' | 'flower' | 'card';

export default function BouquetStudioPage() {

  // Soundscape Preset State & Audio Preview
  const [selectedSoundPreset, setSelectedSoundPreset] = useState<string>('music-box');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);

  // Image Export Background State ('white' or 'clear')
  const [exportBg, setExportBg] = useState<'white' | 'clear'>('white');

  // Collapsible Floating Control Panel state (user can hide completely to enjoy full canvas)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Mobile Studio View Mode: 'stage' (Full Canvas Preview) vs 'sidebar' (Full Controls Panel)
  const [mobileStudioTab, setMobileStudioTab] = useState<'stage' | 'sidebar'>('stage');

  // Studio Step: 1 = Greenery, 2 = Blooms, 3 = Write Card, 4 = Finalize
  const [activeStep, setActiveStep] = useState<StudioStep>(1);

  // Flower category: 'small' (Petite Blooms, 3 to 10) or 'big' (Grand Blooms, 3 to 5)
  const [flowerCategory, setFlowerCategory] = useState<'small' | 'big'>('small');

  // Greenery selection state: starts empty, no forced presets on entry
  const [selectedGreenery, setSelectedGreenery] = useState<string[]>([]);

  // Flower selection state: starts empty, no forced presets on entry
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([]);

  // URL state persistence hydration flag
  const [isUrlHydrated, setIsUrlHydrated] = useState(false);

  // Note card content: starts empty so placeholder text shows and disappears on typing
  const [note, setNote] = useState({
    greeting: 'Dear',
    to: '',
    message: '',
    closing: 'Sincerely,',
    from: '',
  });

  // Selected handwriting / card font
  const [cardFont, setCardFont] = useState<string>('space-mono');

  // Arrangement seed for auto-shuffle
  const [seed, setSeed] = useState<number>(1042);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Gift format choice: 'both' (Flower & Card), 'flower' (Flower Only), 'card' (Card Only)
  const [giftFormat, setGiftFormat] = useState<GiftFormat>('both');

  // Keepsake layout choice in Step 4: 'right' | 'left' | 'bottom'
  const [cardPlacement, setCardPlacement] = useState<CardPlacement>('right');
  const [finalizeView, setFinalizeView] = useState<'printer' | 'presentation'>('presentation');

  // Document Printer animation sequence
  const [printerStage, setPrinterStage] = useState<ReceiptPrinterStage>('processing');
  const printerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperHeight, setPaperHeight] = useState<number | null>(null);

  const minAllowed = flowerCategory === 'big' ? 2 : 3;
  const maxAllowed = flowerCategory === 'big' ? 3 : 10;

  // 1. Read URL Query Parameters on initial load / refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const gParam = params.get('greenery') || params.get('g');
      const bParam = params.get('blooms') || params.get('flowers') || params.get('b');
      const catParam = params.get('cat');
      const stepParam = params.get('step');
      const placeParam = params.get('placement');
      const fontParam = params.get('font');
      const seedParam = params.get('seed');
      const soundParam = params.get('sound');
      const toParam = params.get('to');
      const fromParam = params.get('from');
      const msgParam = params.get('msg');
      const greetParam = params.get('greeting');
      const closeParam = params.get('closing');

      if (gParam !== null && gParam.trim().length > 0) {
        const list = gParam.split(',').map((s) => s.trim()).filter((id) => GREENERY.some((g) => g.id === id));
        setSelectedGreenery(list);
      }
      if (bParam !== null && bParam.trim().length > 0) {
        const list = bParam.split(',').map((s) => s.trim()).filter((id) => FLOWERS.some((f) => f.id === id));
        setSelectedFlowers(list);
        if (!catParam && list.length > 0) {
          const firstBloom = FLOWERS.find((f) => f.id === list[0]);
          if (firstBloom && firstBloom.flowerSize) setFlowerCategory(firstBloom.flowerSize);
        }
      }
      if (catParam === 'big' || catParam === 'small') {
        setFlowerCategory(catParam);
      }
      if (stepParam) {
        const s = parseInt(stepParam, 10);
        if (s >= 1 && s <= 4) setActiveStep(s as StudioStep);
      }
      if (placeParam && ['right', 'left', 'bottom', 'top'].includes(placeParam)) {
        setCardPlacement(placeParam as CardPlacement);
      }
      if (fontParam && NOTE_FONTS.some((f) => f.id === fontParam)) {
        setCardFont(fontParam);
      }
      if (seedParam) {
        const parsedSeed = parseInt(seedParam, 10);
        if (!isNaN(parsedSeed)) setSeed(parsedSeed);
      }
      if (soundParam && SOUND_PRESETS.some((s) => s.id === soundParam || soundParam === 'none')) {
        setSelectedSoundPreset(soundParam);
      }
      if (toParam !== null || fromParam !== null || msgParam !== null || greetParam !== null || closeParam !== null) {
        setNote((prev) => ({
          greeting: greetParam !== null ? greetParam : prev.greeting,
          to: toParam !== null ? toParam : prev.to,
          message: msgParam !== null ? msgParam : prev.message,
          closing: closeParam !== null ? closeParam : prev.closing,
          from: fromParam !== null ? fromParam : prev.from,
        }));
      }
    } catch (e) {
      console.error('Error hydrating bouquet studio from URL:', e);
    } finally {
      setIsUrlHydrated(true);
    }
  }, []);

  // 2. Synchronize active state changes back to URL without page reload
  useEffect(() => {
    if (!isUrlHydrated || typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams();
      if (selectedGreenery.length > 0) {
        params.set('greenery', selectedGreenery.join(','));
      }
      if (selectedFlowers.length > 0) {
        params.set('blooms', selectedFlowers.join(','));
      }
      if (flowerCategory !== 'small') {
        params.set('cat', flowerCategory);
      }
      if (activeStep > 1) {
        params.set('step', String(activeStep));
      }
      if (cardPlacement !== 'right') {
        params.set('placement', cardPlacement);
      }
      if (cardFont !== 'space-mono') {
        params.set('font', cardFont);
      }
      if (seed !== 1042) {
        params.set('seed', String(seed));
      }
      if (selectedSoundPreset !== 'music-box') {
        params.set('sound', selectedSoundPreset);
      }
      if (note.to) params.set('to', note.to);
      if (note.from) params.set('from', note.from);
      if (note.message) params.set('msg', note.message);

      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : '');
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      console.error('Error synchronizing bouquet studio to URL:', e);
    }
  }, [
    isUrlHydrated,
    selectedGreenery,
    selectedFlowers,
    flowerCategory,
    activeStep,
    cardPlacement,
    cardFont,
    seed,
    selectedSoundPreset,
    note.to,
    note.from,
    note.message,
  ]);

  // Selected handwriting font style
  const selectedFontFamily = useMemo(() => {
    return NOTE_FONTS.find((f) => f.id === cardFont)?.fontFamily || '"Space Mono", monospace';
  }, [cardFont]);

  // Pre-cache base64 font data so PNG export contains exact fonts with zero delay
  useEffect(() => {
    prefetchBouquetFonts(cardFont);
  }, [cardFont]);

  // Normalized note object for preview cards & print sheets
  const fullNote = useMemo(() => ({
    greeting: note.greeting !== undefined ? note.greeting : 'Dear',
    to: note.to.trim() || 'Beloved',
    message:
      note.message.trim() ||
      'I have so much to tell you, but only this much space on this card! Still, you must know...',
    closing: note.closing !== undefined ? note.closing : 'Sincerely,',
    from: note.from.trim() || 'Secret Admirer',
  }), [note]);

  // Start animated document feed sequence
  const startPrintFeedSequence = () => {
    printerTimersRef.current.forEach(clearTimeout);
    setPrinterStage('processing');
    printerTimersRef.current = [
      setTimeout(() => setPrinterStage('printing'), 600),
      setTimeout(() => setPrinterStage('complete'), 2600),
    ];
  };

  useEffect(() => {
    if (activeStep === 4 && finalizeView === 'printer') {
      startPrintFeedSequence();
    }
    return () => printerTimersRef.current.forEach(clearTimeout);
  }, [activeStep, finalizeView]);

  // Dynamically measure paper height for expandable printer tray
  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const measure = () => {
      if (el.scrollHeight > 0) {
        setPaperHeight(el.scrollHeight);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardPlacement, activeStep, giftFormat, note, selectedFlowers.length, printerStage]);

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


  // Physical shuffle handler: alters seed so flowers physically swap slots and drift naturally
  const handleAutoShuffle = () => {
    setSeed((prev) => prev + Math.floor(Math.random() * 888) + 17);
  };

  // Switch Category cleanly without forcing defaults onto fresh canvas
  const handleCategoryChange = (category: 'small' | 'big') => {
    setFlowerCategory(category);
    if (category === 'big') {
      setSelectedFlowers((prev) =>
        prev.filter((id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'big').slice(0, 3)
      );
      const validBigGreeneries = selectedGreenery.filter(
        (id) => GREENERY.find((g) => g.id === id)?.greenerySize === 'big'
      );
      setSelectedGreenery(validBigGreeneries.slice(0, 2));
    } else {
      setSelectedFlowers((prev) =>
        prev.filter((id) => FLOWERS.find((f) => f.id === id)?.flowerSize === 'small').slice(0, 10)
      );
      const validSmallGreenery = selectedGreenery.find(
        (id) => GREENERY.find((g) => g.id === id)?.greenerySize === 'small'
      );
      setSelectedGreenery(validSmallGreenery ? [validSmallGreenery] : []);
    }
    setSeed(Math.floor(Math.random() * 9999));
  };

  // Quick Random Mix bouquet generator
  const handleRandomMix = () => {
    const pool = visibleFlowers;
    const targetCount =
      flowerCategory === 'big'
        ? (Math.random() > 0.5 ? 3 : 2)
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
        setSelectedFlowers((prev) =>
          prev.filter((fid) => FLOWERS.find((f) => f.id === fid)?.flowerSize === 'small')
        );
      }
      setSelectedGreenery((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      if (flowerCategory !== 'big') {
        setFlowerCategory('big');
        setSelectedFlowers((prev) =>
          prev.filter((fid) => FLOWERS.find((f) => f.id === fid)?.flowerSize === 'big')
        );
      }
      setSelectedGreenery((prev) => {
        if (prev.includes(id)) {
          return prev.filter((gId) => gId !== id);
        }
        if (prev.length < 2) {
          return [...prev, id];
        }
        return [prev[0], id];
      });
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
    if (selectedFlowers.length === 0) return;
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
      setSelectedFlowers((prev) => prev.filter((fId) => fId !== id));
    } else {
      if (selectedFlowers.length >= maxAllowed) return;
      setSelectedFlowers((prev) => [...prev, id]);
    }
  };

  // Save creation directly to Supabase and obtain verified 6-digit short link
  const saveAndBuildShareLink = async (): Promise<string> => {
    const sender = note.from.trim() || 'Secret Admirer';
    const recipient = note.to.trim() || 'Beloved';
    const msg =
      note.message.trim() ||
      'I have so much to tell you, but only this much space on this card! Still, you must know...';

    // 1. Save directly into Supabase database
    const shortId = await saveBouquetToDatabase({
      sceneType: 'botanical-2d',
      season: 'spring',
      paletteId: 'minimalist-letterhead',
      targetUrl: typeof window !== 'undefined' ? window.location.origin : '',
      senderName: sender,
      recipientName: recipient,
      message: msg,
      giftFormat,
      soundPreset: selectedSoundPreset,
      audioEnabled: selectedSoundPreset !== 'none',
      metadata: {
        flowers: selectedFlowers,
        greenery: selectedGreenery,
        seed,
        cardFont,
        cardPlacement,
        giftFormat,
        greeting: note.greeting || 'Dear',
        closing: note.closing || 'Sincerely,',
        soundPreset: selectedSoundPreset,
      },
    });

    // 2. Link is derived directly from the Supabase record ID
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanUrl = `${origin}/bouquet/${shortId}`;
    setShareUrl(cleanUrl);

    return cleanUrl;
  };

  const handleGenerateShareLink = async (): Promise<string> => {
    if (shareUrl) return shareUrl;
    setIsSavingLink(true);
    try {
      return await saveAndBuildShareLink();
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleCopyLink = async () => {
    setIsSavingLink(true);
    try {
      // Save directly to Supabase and get the clean 6-character short code link
      const url = await saveAndBuildShareLink();

      // Copy verified Supabase link to clipboard
      if (typeof window !== 'undefined') {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
    } finally {
      setIsSavingLink(false);
    }
  };

  // Soundscape preview toggle
  const handlePreviewSound = (presetId: string) => {
    if (previewingSound === presetId) {
      soundEngine.stop();
      setPreviewingSound(null);
    } else {
      soundEngine.play(presetId);
      setPreviewingSound(presetId);
    }
  };

  useEffect(() => {
    return () => {
      soundEngine.stop();
    };
  }, []);

  // Real, native printing
  const handleNativePrint = () => {
    window.print();
  };

  // Direct PNG export: Always renders the high-res desktop A4 keepsake sheet regardless of user device
  const handleExportPng = async () => {
    const standaloneFlower = giftFormat === 'flower' && exportBg === 'clear';
    const wrapper = document.getElementById('bouquet-a4-export-wrapper');
    const el = standaloneFlower
      ? document.getElementById('bouquet-canvas-export')
      : document.getElementById('bouquet-a4-export-node') || document.getElementById('bouquet-document-sheet');
    if (!el) return;

    try {
      setIsExporting(true);

      // Temporarily reveal wrapper behind the screen so the browser renders real layout & pixels
      if (wrapper && !standaloneFlower) {
        wrapper.style.opacity = '1';
        wrapper.style.zIndex = '-50';
        wrapper.style.overflow = 'visible';
      }

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

      // Options for html-to-image:
      // Note: cacheBust MUST be false because cacheBust appends query param which breaks WebP mime detection
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
        console.warn('First toPng attempt failed, retrying with pixelRatio 1.5:', e);
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

      // Restore original styles
      el.style.backgroundColor = originalBg;
      el.style.border = originalBorder;
      el.style.boxShadow = originalShadow;

      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 500) {
        throw new Error('Image generation produced empty data');
      }

      // Download via Blob for 100% reliability on mobile and desktop
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `bouquet-${(note.to || 'keepsake').toLowerCase().replace(/\s+/g, '-')}-${exportBg}.png`;
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err2) {
      console.error('Failed to export image', err2);
    } finally {
      if (wrapper && !standaloneFlower) {
        wrapper.style.opacity = '0';
        wrapper.style.zIndex = '-9999';
        wrapper.style.overflow = 'hidden';
      }
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
      {/* Google Fonts for card handwriting styles and preset swatch previews */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Courier+Prime:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Indie+Flower&family=Kalam:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Shadows+Into+Light&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap"
      />

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
            <span className="text-stone-500">NO. BK-{seed}</span>
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
                FOR: {note.to.trim() || 'BELOVED'}
              </div>
              <div className="text-xs text-stone-500 uppercase mt-0.5">
                FROM: {note.from.trim() || 'SECRET ADMIRER'} · {selectedFlowers.length} BOTANICAL BLOOMS
              </div>
            </div>
          </div>
        )}

        {/* PRINT FORMAT: CARD ONLY */}
        {giftFormat === 'card' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-[520px]">
              <BouquetCard
                note={fullNote}
                cardFont={cardFont}
                editable={false}
                className="w-full border-2 border-black shadow-sm"
              />
            </div>
          </div>
        )}

        {/* PRINT FORMAT: BOTH (Respects cardPlacement: right, left, bottom, top) */}
        {giftFormat === 'both' && (
          <div className="w-full">
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
                    note={fullNote}
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
                    note={fullNote}
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
                    note={fullNote}
                    cardFont={cardFont}
                    editable={false}
                    className="w-full border border-stone-300"
                  />
                </div>
              </div>
            )}
            {cardPlacement === 'top' && (
              <div className="flex flex-col gap-6 items-center">
                <div className="w-full max-w-[460px] flex items-center justify-center">
                  <BouquetCard
                    note={fullNote}
                    cardFont={cardFont}
                    editable={false}
                    className="w-full border border-stone-300"
                  />
                </div>
                <div className="w-full max-w-[380px] aspect-[4/5] flex items-center justify-center">
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
          </div>
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

          {/* FORMAT: FLOWER ONLY (Centred Large Bouquet) */}
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
                  FOR: {note.to.trim() || 'BELOVED'}
                </div>
                <div className="text-xs text-stone-500 uppercase mt-0.5">
                  FROM: {note.from.trim() || 'SECRET ADMIRER'} · {selectedFlowers.length} BOTANICAL BLOOMS
                </div>
              </div>
            </div>
          )}

          {/* FORMAT: CARD ONLY (Centred Elegant Stationery Note) */}
          {giftFormat === 'card' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-full max-w-[500px]">
                <BouquetCard
                  note={fullNote}
                  cardFont={cardFont}
                  editable={false}
                  className="w-full border-2 border-black shadow-sm"
                />
              </div>
            </div>
          )}

          {/* FORMAT: FLOWER WITH CARD */}
          {giftFormat === 'both' && (
            <>
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
                      note={fullNote}
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
                      note={fullNote}
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
                      note={fullNote}
                      cardFont={cardFont}
                      editable={false}
                      className="w-full border border-stone-300"
                    />
                  </div>
                </div>
              )}

              {/* Stacked: Card on Top, Bouquet at Bottom */}
              {cardPlacement === 'top' && (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full max-w-[460px] flex items-center justify-center">
                    <BouquetCard
                      note={fullNote}
                      cardFont={cardFont}
                      editable={false}
                      className="w-full border border-stone-300"
                    />
                  </div>
                  <div className="w-full max-w-[380px] aspect-[4/5] flex items-center justify-center">
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

      {/* ── FULLSCREEN INTERACTIVE STUDIO (HIDDEN ON PRINT) ── */}
      <div className="w-full h-full flex flex-col overflow-hidden print:hidden">
        {/* ── TOP UTILITY HUD BAR ── */}
        <header className="shrink-0 h-12 px-2 sm:px-5 flex items-center justify-between border-b-2 border-black bg-white z-30">
          {/* Left: Home link, Tools Navigation Toggle, Title */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="px-2 sm:px-2.5 py-1 bg-white hover:bg-stone-100 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1"
              title="Return to CreatorsKit Home"
            >
              <span>‹</span>
              <span className="hidden sm:inline">HOME</span>
            </Link>

            {/* Searchable tool menu — single source of truth (src/components/nav/SiteNav.tsx) */}
            <SiteNav mode="floating" currentHref="/bouquet" theme="light" align="left" label="TOOLS" />

            <span className="font-mono text-xs font-black uppercase tracking-wider hidden lg:inline text-black pl-1 border-l-2 border-stone-200">
              DIGITAL BOUQUET
            </span>
          </div>

          {/* Center: Step Navigation Pills (Single row, horizontally scrollable, zero line wrap) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mx-1 sm:mx-2 py-1 shrink">
            {stepsList.map((step) => {
              const isActive = activeStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(step.num as StudioStep)}
                  className={`px-2.5 sm:px-3 py-1 font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border-2 border-black cursor-pointer shrink-0 whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5 ${
                    isActive
                      ? 'bg-black text-white shadow-[2px_2px_0_#000]'
                      : 'bg-white text-stone-700 hover:text-black hover:bg-stone-50'
                  }`}
                >
                  0{step.num}. {step.label}
                </button>
              );
            })}
          </div>

          {/* Right: Desktop Controls Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeStep <= 2 && (
              <button
                type="button"
                onClick={handleAutoShuffle}
                className="hidden sm:flex px-2.5 sm:px-3 py-1 bg-white hover:bg-stone-50 border-2 border-black rounded-none font-mono text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 items-center gap-1.5"
                title="Physically shuffle floral arrangement"
              >
                <Shuffle size={13} />
                <span>SHUFFLE</span>
              </button>
            )}

            {/* Desktop Collapsible Panel Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className={`hidden md:flex px-2.5 py-1 font-mono text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer items-center gap-1.5 shadow-[1.5px_1.5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                sidebarOpen ? 'bg-white hover:bg-stone-50 text-black' : 'bg-black text-white'
              }`}
              title={sidebarOpen ? 'Hide controls to expand canvas view' : 'Open controls panel'}
            >
              {sidebarOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
              <span>{sidebarOpen ? 'HIDE PANEL' : 'CONTROLS'}</span>
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
          <main className={`flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-2 sm:p-5 ${
            mobileStudioTab === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Subtle warm center radial ambiance */}
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-stone-200/40" />

            {/* Steps 1 & 2: Full Majestic Bouquet Unblocked */}
            {(activeStep === 1 || activeStep === 2) && (
              <div className="relative z-10 w-full h-full max-h-[82vh] aspect-[4/5] flex items-center justify-center">
                <BouquetCanvas
                  greeneryLayers={arrangement.greeneryLayers}
                  flowerLayers={arrangement.flowerLayers}
                  showRibbon={true}
                  borderless={false}
                  className="w-full h-full"
                  onPromptClick={() => {
                    setSidebarOpen(true);
                    setMobileStudioTab('sidebar');
                  }}
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
                      greeting: updated.greeting !== undefined ? updated.greeting : 'Dear',
                      to: updated.to,
                      message: updated.message,
                      from: updated.from,
                      closing: updated.closing !== undefined ? updated.closing : 'Sincerely,',
                    })
                  }
                  cardFont={cardFont}
                  editable={true}
                  className="w-full"
                />
              </div>
            )}

            {/* ── Step 4: Animated Document Printer Machine (or Card View) ── */}
            {activeStep === 4 && (
              <div className="relative z-10 w-full h-full max-h-[86vh] overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-4 pb-32 md:pb-12 select-text">
                {/* Mode & Choice Switcher Bar: Hidden on mobile to prevent duplicate controls */}
                <div className="mb-3 hidden md:flex flex-wrap items-center justify-center gap-2 bg-white border-2 border-black p-1.5 shadow-[2px_2px_0_#000] shrink-0 z-20">
                  {/* Format Selector: Flower & Card | Flower Only | Card Only */}
                  <div className="flex items-center bg-stone-100 p-0.5 border border-black">
                    <button
                      type="button"
                      onClick={() => {
                        setGiftFormat('both');
                        setShareUrl('');
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        giftFormat === 'both'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-stone-700 hover:text-black'
                      }`}
                    >
                      <Layers size={11} />
                      <span>FLOWER & CARD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftFormat('flower');
                        setShareUrl('');
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        giftFormat === 'flower'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-stone-700 hover:text-black'
                      }`}
                    >
                      <Flower2 size={11} />
                      <span>FLOWER ONLY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftFormat('card');
                        setShareUrl('');
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        giftFormat === 'card'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-stone-700 hover:text-black'
                      }`}
                    >
                      <Mail size={11} />
                      <span>CARD ONLY</span>
                    </button>
                  </div>

                  {/* View Selector: As It Is vs Animated Printer */}
                  <div className="flex items-center bg-stone-100 p-0.5 border border-black">
                    <button
                      type="button"
                      onClick={() => setFinalizeView('presentation')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        finalizeView === 'presentation'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-stone-700 hover:text-black'
                      }`}
                    >
                      <LayoutTemplate size={12} />
                      <span>CARD VIEW (AS IT IS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFinalizeView('printer');
                        startPrintFeedSequence();
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        finalizeView === 'printer'
                          ? 'bg-black text-white shadow-xs'
                          : 'text-stone-700 hover:text-black'
                      }`}
                    >
                      <Printer size={12} />
                      <span>PRINTER ANIMATION</span>
                    </button>
                  </div>

                  {/* Sheet Card Layout Placement (Only when Format is BOTH and in Printer View) */}
                  {finalizeView === 'printer' && giftFormat === 'both' && (
                    <div className="flex items-center gap-1 pl-1 border-l border-stone-300">
                      <span className="text-[10px] font-mono font-black uppercase px-1 text-stone-500 hidden sm:inline">
                        LAYOUT:
                      </span>
                      <button
                        type="button"
                        onClick={() => setCardPlacement('right')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                          cardPlacement === 'right'
                            ? 'bg-black text-white'
                            : 'bg-white text-stone-700 hover:text-black'
                        }`}
                      >
                        RIGHT
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardPlacement('top')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                          cardPlacement === 'top'
                            ? 'bg-black text-white'
                            : 'bg-white text-stone-700 hover:text-black'
                        }`}
                      >
                        TOP
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardPlacement('bottom')}
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
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
                        className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                          cardPlacement === 'left'
                            ? 'bg-black text-white'
                            : 'bg-white text-stone-700 hover:text-black'
                        }`}
                      >
                        LEFT
                      </button>
                    </div>
                  )}

                  {finalizeView === 'printer' && (
                    <button
                      type="button"
                      onClick={startPrintFeedSequence}
                      title="Replay printer feed animation"
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer border border-stone-300"
                    >
                      <RotateCcw size={11} />
                      <span className="hidden sm:inline">REPRINT</span>
                    </button>
                  )}
                </div>

                {/* VIEW 1: ANIMATED DOCUMENT PRINTER */}
                {finalizeView === 'printer' && (
                  <div className="w-full flex flex-col items-center">
                    <ReceiptPrinter.Root
                      stage={printerStage}
                      feedMotion="stepped"
                      className="w-full max-w-2xl mx-auto"
                    >
                      <ReceiptPrinter.Machine>
                        <ReceiptPrinter.Header>
                          <ReceiptPrinter.Status>
                            {printerStage === 'processing'
                              ? 'Preparing keepsake sheet…'
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

                      <ReceiptPrinter.Output
                        className={printerStage === 'complete' ? '!overflow-visible' : 'overflow-hidden'}
                        style={{
                          height:
                            printerStage === 'complete'
                              ? 'auto'
                              : printerStage === 'processing'
                              ? 240
                              : paperHeight
                              ? Math.max(paperHeight + 36, 680)
                              : 780,
                          overflow: printerStage === 'complete' ? 'visible' : 'hidden',
                          transition: printerStage === 'complete' ? 'none' : 'height 1850ms linear',
                        }}
                      >
                        <div ref={paperRef}>
                          <ReceiptPrinter.Paper
                            variant="document"
                            className="p-5 sm:p-7 border border-stone-200 shadow-2xl bg-white text-black"
                          >
                            <div id="bouquet-document-sheet" className="w-full flex flex-col gap-4">
                              <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[10px] font-mono font-black uppercase tracking-wider">
                                <span>BOTANICAL KEEPSAKE · CREATORKIT</span>
                                <span className="text-stone-500">NO. BK-{seed}</span>
                              </div>

                              {/* FORMAT: FLOWER ONLY (Centred Large Bouquet on Sheet) */}
                              {giftFormat === 'flower' && (
                                <div className="flex flex-col items-center justify-center py-4 gap-3">
                                  <div className="w-full max-w-[360px] aspect-[4/5] flex items-center justify-center">
                                    <BouquetCanvas
                                      greeneryLayers={arrangement.greeneryLayers}
                                      flowerLayers={arrangement.flowerLayers}
                                      showRibbon={true}
                                      borderless={true}
                                      className="w-full h-full"
                                    />
                                  </div>
                                  <div className="text-center font-mono">
                                    <div className="text-xs font-bold uppercase tracking-wider text-black">
                                      FOR: {note.to.trim() || 'BELOVED'}
                                    </div>
                                    <div className="text-[9px] text-stone-500 uppercase mt-0.5">
                                      FROM: {note.from.trim() || 'SECRET ADMIRER'} · {selectedFlowers.length} BOTANICAL BLOOMS
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* FORMAT: CARD ONLY (Centred Elegant Note Card on Sheet) */}
                              {giftFormat === 'card' && (
                                <div className="flex flex-col items-center justify-center py-4 gap-3">
                                  <div className="w-full max-w-[420px] flex items-center justify-center">
                                    <BouquetCard
                                      note={fullNote}
                                      cardFont={cardFont}
                                      editable={false}
                                      className="w-full border border-stone-300 shadow-sm"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* FORMAT: FLOWER WITH CARD */}
                              {giftFormat === 'both' && (
                                <>
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
                                          note={fullNote}
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
                                          note={fullNote}
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
                                          note={fullNote}
                                          cardFont={cardFont}
                                          editable={false}
                                          className="w-full border border-stone-300 shadow-sm"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {cardPlacement === 'top' && (
                                    <div className="flex flex-col items-center gap-4">
                                      <div className="w-full max-w-[420px] flex items-center justify-center">
                                        <BouquetCard
                                          note={fullNote}
                                          cardFont={cardFont}
                                          editable={false}
                                          className="w-full border border-stone-300 shadow-sm"
                                        />
                                      </div>
                                      <div className="w-full max-w-[320px] aspect-[4/5] flex items-center justify-center">
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
                                </>
                              )}

                              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[9px] font-mono text-stone-500 uppercase tracking-widest">
                                <span>
                                  {giftFormat === 'card'
                                    ? 'Handcrafted personal stationery'
                                    : 'Hand-arranged organic botanicals'}
                                </span>
                                <span>Verified keepsake gift</span>
                              </div>
                            </div>
                          </ReceiptPrinter.Paper>
                        </div>
                      </ReceiptPrinter.Output>
                    </ReceiptPrinter.Root>

                    {printerStage === 'complete' && (
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-xl pb-24">
                        <button
                          type="button"
                          onClick={() => setFinalizeView('presentation')}
                          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <LayoutTemplate size={14} />
                          <span>CARD VIEW (AS IT IS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNativePrint}
                          className="px-5 py-2.5 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <Printer size={15} />
                          <span>PRINT / SAVE AS PDF</span>
                        </button>
                        {/* PNG Background selector */}
                        <div className="inline-flex border-2 border-black bg-stone-100 rounded p-0.5 shadow-[2px_2px_0_#000]">
                          <button
                            type="button"
                            onClick={() => setExportBg('white')}
                            className={`px-2 py-1 text-[10px] font-mono font-black uppercase rounded cursor-pointer ${
                              exportBg === 'white' ? 'bg-white text-black shadow-[1px_1px_0_#000]' : 'text-stone-600'
                            }`}
                          >
                            WHITE
                          </button>
                          <button
                            type="button"
                            onClick={() => setExportBg('clear')}
                            className={`px-2 py-1 text-[10px] font-mono font-black uppercase rounded cursor-pointer ${
                              exportBg === 'clear' ? 'bg-black text-white shadow-[1px_1px_0_#000]' : 'text-stone-600'
                            }`}
                          >
                            CLEAR
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleExportPng}
                          disabled={isExporting}
                          className="min-w-[195px] px-5 py-2.5 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                        >
                          <Download size={15} className="shrink-0" />
                          <span>{isExporting ? 'SAVING...' : `SAVE PNG (${exportBg.toUpperCase()})`}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          disabled={isSavingLink}
                          className="px-5 py-2.5 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 min-w-[145px] shrink-0 disabled:opacity-50"
                        >
                          {isSavingLink ? (
                            <span>SAVING TO CLOUD...</span>
                          ) : copied ? (
                            <>
                              <Check size={15} className="text-green-600 shrink-0" />
                              <span>LINK COPIED!</span>
                            </>
                          ) : (
                            <>
                              <Share2 size={15} className="shrink-0" />
                              <span>SHARE LINK</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: DIGIBOUQUET CLEAN CARD PRESENTATION (AS IT IS RIGHT NOW) */}
                {finalizeView === 'presentation' && (
                  <div className="w-full flex flex-col items-center justify-center relative">
                    <div className="absolute w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />

                    {/* FORMAT: FLOWER ONLY (Centred Majestic Bouquet) */}
                    {giftFormat === 'flower' && (
                      <div className="w-full flex flex-col items-center justify-center relative">
                        <div
                          id="bouquet-canvas-export"
                          className="relative z-10 w-full max-w-[420px] aspect-[4/5] flex items-center justify-center pointer-events-none"
                        >
                          <BouquetCanvas
                            greeneryLayers={arrangement.greeneryLayers}
                            flowerLayers={arrangement.flowerLayers}
                            showRibbon={true}
                            borderless={true}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="mt-3 text-center font-mono z-20">
                          <div className="text-sm font-bold uppercase tracking-wider text-black">
                            FOR: {note.to.trim() || 'BELOVED'}
                          </div>
                          <div className="text-xs text-stone-500 uppercase mt-0.5">
                            FROM: {note.from.trim() || 'SECRET ADMIRER'} · {selectedFlowers.length} BOTANICAL BLOOMS
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMAT: CARD ONLY (Centred Personal Handwritten Note Card) */}
                    {giftFormat === 'card' && (
                      <div className="w-full flex flex-col items-center justify-center relative py-6">
                        <div
                          id="bouquet-canvas-export"
                          className="relative z-10 w-full max-w-[460px] px-3"
                        >
                          <div
                            style={{ fontFamily: selectedFontFamily }}
                            className="w-full bg-white border-2 border-black p-6 sm:p-8 shadow-[4px_4px_0_#000]"
                          >
                            <div className="text-left text-base sm:text-lg mb-2 text-black flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-bold">{note.greeting || 'Dear'}</span>{' '}
                              <span
                                className="font-normal"
                                style={{
                                  fontSize: getDynamicNameFontSize(note.to.trim() || 'Beloved', 1.15, 0.75),
                                }}
                              >
                                {note.to.trim() || 'Beloved'}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base leading-relaxed font-normal my-2 text-black whitespace-pre-wrap break-words">
                              {note.message.trim() ||
                                'I have so much to tell you, but only this much space on this card! Still, you must know...'}
                            </p>
                            <div className="text-right text-base sm:text-lg mt-3 text-black flex flex-col items-end">
                              <span className="font-bold">{note.closing || 'Sincerely,'}</span>
                              <div
                                className="font-normal"
                                style={{
                                  fontSize: getDynamicNameFontSize(note.from.trim() || 'Secret Admirer', 1.1, 0.72),
                                }}
                              >
                                {note.from.trim() || 'Secret Admirer'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMAT: FLOWER WITH CARD (Bouquet with Card nestled at lower stems) */}
                    {giftFormat === 'both' && (
                      <div className="w-full flex flex-col items-center justify-center relative">
                        <div
                          id="bouquet-canvas-export"
                          className="relative z-10 w-full max-w-[400px] aspect-[4/5] flex items-center justify-center pointer-events-none"
                        >
                          <BouquetCanvas
                            greeneryLayers={arrangement.greeneryLayers}
                            flowerLayers={arrangement.flowerLayers}
                            showRibbon={true}
                            borderless={true}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="relative w-full max-w-[400px] -mt-14 sm:-mt-18 z-20 px-3">
                          <div
                            style={{ fontFamily: selectedFontFamily }}
                            className="w-full bg-white border-2 border-black p-5 sm:p-7 shadow-[4px_4px_0_#000] rotate-[-1.5deg]"
                          >
                            <div className="text-left text-base sm:text-lg mb-2 text-black flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-bold">{note.greeting || 'Dear'}</span>{' '}
                              <span
                                className="font-normal"
                                style={{
                                  fontSize: getDynamicNameFontSize(note.to.trim() || 'Beloved', 1.15, 0.75),
                                }}
                              >
                                {note.to.trim() || 'Beloved'}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base leading-relaxed font-normal my-2 text-black whitespace-pre-wrap break-words">
                              {note.message.trim() ||
                                'I have so much to tell you, but only this much space on this card! Still, you must know...'}
                            </p>
                            <div className="text-right text-base sm:text-lg mt-3 text-black flex flex-col items-end">
                              <span className="font-bold">{note.closing || 'Sincerely,'}</span>
                              <div
                                className="font-normal"
                                style={{
                                  fontSize: getDynamicNameFontSize(note.from.trim() || 'Secret Admirer', 1.1, 0.72),
                                }}
                              >
                                {note.from.trim() || 'Secret Admirer'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 z-30 pb-4">
                      {/* CHOICE 1: PRINT WITH PRINTER ANIMATION */}
                      <button
                        type="button"
                        onClick={() => {
                          setFinalizeView('printer');
                          startPrintFeedSequence();
                        }}
                        className="px-6 py-2.5 bg-[#FFE500] hover:bg-[#FDD800] text-black font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Printer size={15} />
                        <span>PRINT WITH PRINTER ANIMATION</span>
                      </button>

                      {/* CHOICE 2: DIRECT PRINT / PDF */}
                      <button
                        type="button"
                        onClick={handleNativePrint}
                        className="px-5 py-2.5 bg-white hover:bg-stone-50 text-black font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000] cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Printer size={15} />
                        <span>
                          {giftFormat === 'flower'
                            ? 'PRINT BOUQUET / PDF'
                            : giftFormat === 'card'
                            ? 'PRINT CARD / PDF'
                            : 'DIRECT PRINT / PDF'}
                        </span>
                      </button>

                      {/* SHARE LINK */}
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        disabled={isSavingLink}
                        className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 min-w-[155px] shrink-0 disabled:opacity-50"
                      >
                        {isSavingLink ? (
                          <span>SAVING...</span>
                        ) : copied ? (
                          <>
                            <Check size={13} className="text-green-400 shrink-0" />
                            <span>COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={13} className="shrink-0" />
                            <span>
                              {giftFormat === 'flower'
                                ? 'SHARE BOUQUET'
                                : giftFormat === 'card'
                                ? 'SHARE CARD'
                                : 'SHARE GIFT'}
                            </span>
                          </>
                        )}
                      </button>

                      {/* PNG Background Toggle & Save Button */}
                      <div className="inline-flex border-2 border-black bg-stone-100 rounded p-0.5 shadow-[2px_2px_0_#000]">
                        <button
                          type="button"
                          onClick={() => setExportBg('white')}
                          className={`px-2 py-1 text-[10px] font-mono font-black uppercase rounded cursor-pointer ${
                            exportBg === 'white' ? 'bg-white text-black shadow-[1px_1px_0_#000]' : 'text-stone-600'
                          }`}
                        >
                          WHITE
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportBg('clear')}
                          className={`px-2 py-1 text-[10px] font-mono font-black uppercase rounded cursor-pointer ${
                            exportBg === 'clear' ? 'bg-black text-white shadow-[1px_1px_0_#000]' : 'text-stone-600'
                          }`}
                        >
                          CLEAR
                        </button>
                      </div>

                      {/* SAVE PNG */}
                      <button
                        type="button"
                        onClick={handleExportPng}
                        disabled={isExporting}
                        className="min-w-[195px] px-5 py-2.5 bg-white hover:bg-stone-50 text-black font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                      >
                        <Download size={13} className="shrink-0" />
                        <span>{isExporting ? 'SAVING...' : `SAVE PNG (${exportBg.toUpperCase()})`}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}


          </main>

          {/* ── DEDICATED EDITING SIDEBAR (RIGHT ON DESKTOP, FULL SCREEN TAB ON MOBILE) ── */}
          {sidebarOpen && (
            <aside className={`w-full md:w-[360px] lg:w-[400px] shrink-0 border-t-2 md:border-t-0 md:border-l-2 border-black bg-white flex flex-col h-full min-h-0 overflow-hidden z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.04)] animate-in slide-in-from-right duration-200 ${
              mobileStudioTab === 'stage' ? 'hidden md:flex' : 'flex'
            }`}>
              {/* Sidebar Header */}
              <div className="h-11 px-3 sm:px-4 bg-stone-50 border-b-2 border-black flex items-center justify-between shrink-0">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-black whitespace-nowrap truncate mr-2">
                  {activeStep === 1 && '01. CHOOSE GREENERY'}
                  {activeStep === 2 && `02. SELECT BLOOMS (${selectedFlowers.length}/${maxAllowed})`}
                  {activeStep === 3 && '03. NOTE CARD & TYPOGRAPHY'}
                  {activeStep === 4 && '04. FINALIZE & PRINT'}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-stone-500 font-bold uppercase whitespace-nowrap">
                    {activeStep}/4
                  </span>

                  {/* Mobile Compact Navigation directly in header: zero vertical waste */}
                  {activeStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveStep((prev) => (prev - 1) as StudioStep)}
                      className="md:hidden px-2 py-1 bg-white hover:bg-stone-100 text-black border border-black font-mono text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] cursor-pointer whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5"
                    >
                      ‹
                    </button>
                  )}

                  {activeStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setActiveStep((prev) => (prev + 1) as StudioStep)}
                      disabled={
                        (activeStep === 1 && flowerCategory === 'big' && selectedGreenery.length < 2) ||
                        (activeStep === 2 && selectedFlowers.length < minAllowed)
                      }
                      className="md:hidden px-2.5 py-1 bg-black hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-black font-mono text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] cursor-pointer whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5"
                    >
                      NEXT ›
                    </button>
                  ) : null}

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
              <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-28 md:pb-4 select-text flex flex-col gap-4">
                {/* ── STEP 1: GREENERY PICKER ── */}
                {activeStep === 1 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-black uppercase text-black">
                          {flowerCategory === 'small' ? 'Petite Foliage (1 Backdrop)' : 'Grand Foliage (2 Sets)'}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {flowerCategory === 'small'
                            ? 'Delicate single layer for cottage blooms'
                            : 'Upper-right + lower cradle for large blooms'}
                        </span>
                      </div>
                      <div className="inline-flex items-center bg-stone-100 border border-black p-0.5 shadow-[1px_1px_0_#000] shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCategoryChange('small')}
                          className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                            flowerCategory === 'small'
                              ? 'bg-black text-white shadow-xs'
                              : 'text-stone-600 hover:text-black'
                          }`}
                        >
                          PETITE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCategoryChange('big')}
                          className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                            flowerCategory === 'big'
                              ? 'bg-black text-white shadow-xs'
                              : 'text-stone-600 hover:text-black'
                          }`}
                        >
                          GRAND
                        </button>
                      </div>
                    </div>

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
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-black uppercase text-black">
                          {flowerCategory === 'big' ? 'Grand Statement Blooms' : 'Petite Cottage Blooms'}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {flowerCategory === 'big'
                            ? 'Pick 2 to 3 statement blooms'
                            : 'Pick 3 to 10 snug garden blooms'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="inline-flex items-center bg-stone-100 border border-black p-0.5 shadow-[1px_1px_0_#000]">
                          <button
                            type="button"
                            onClick={() => handleCategoryChange('small')}
                            className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                              flowerCategory === 'small'
                                ? 'bg-black text-white shadow-xs'
                                : 'text-stone-600 hover:text-black'
                            }`}
                          >
                            PETITE
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCategoryChange('big')}
                            className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                              flowerCategory === 'big'
                                ? 'bg-black text-white shadow-xs'
                                : 'text-stone-600 hover:text-black'
                            }`}
                          >
                            GRAND
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleRandomMix}
                          className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-black font-mono text-[9px] font-black uppercase shadow-[1px_1px_0_#000] cursor-pointer"
                        >
                          RANDOM
                        </button>
                      </div>
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
                                  disabled={selectedFlowers.length <= minAllowed}
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
                              className={`p-2.5 border-2 border-black text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px] ${
                                isSelected
                                  ? 'bg-black text-white shadow-[2px_2px_0_#000]'
                                  : 'bg-white hover:bg-stone-50 text-black shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span
                                  style={{ fontFamily: font.fontFamily }}
                                  className={`font-semibold truncate ${
                                    font.category === 'handwriting'
                                      ? 'text-[15px] sm:text-base leading-tight'
                                      : 'text-xs sm:text-[13px] leading-tight'
                                  }`}
                                >
                                  {font.name}
                                </span>
                                <span
                                  style={{ fontFamily: font.fontFamily }}
                                  className={`text-xs font-bold opacity-75 ml-1 shrink-0 ${
                                    isSelected ? 'text-stone-300' : 'text-stone-500'
                                  }`}
                                >
                                  Aa
                                </span>
                              </div>
                              <div
                                style={{ fontFamily: font.fontFamily }}
                                className={`text-[11px] truncate leading-tight mt-0.5 ${
                                  isSelected ? 'text-stone-300' : 'text-stone-600'
                                }`}
                              >
                                Beloved, with love
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-2.5 pt-2 border-t border-stone-200">
                      {/* Greeting & Recipient Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-mono font-black uppercase mb-1">
                            Greeting
                          </label>
                          <input
                            type="text"
                            value={note.greeting !== undefined ? note.greeting : 'Dear'}
                            onChange={(e) => setNote((prev) => ({ ...prev, greeting: e.target.value }))}
                            placeholder="Dear"
                            maxLength={20}
                            className="w-full px-2 py-1.5 border-2 border-black font-mono text-xs font-bold outline-none bg-stone-50 focus:bg-white placeholder:text-stone-400"
                          />
                        </div>
                        <div className="col-span-2">
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
                      </div>

                      {/* Message Body */}
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

                      {/* Closing & Sender Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-mono font-black uppercase mb-1">
                            Sign-off
                          </label>
                          <input
                            type="text"
                            value={note.closing !== undefined ? note.closing : 'Sincerely,'}
                            onChange={(e) => setNote((prev) => ({ ...prev, closing: e.target.value }))}
                            placeholder="Sincerely,"
                            maxLength={24}
                            className="w-full px-2 py-1.5 border-2 border-black font-mono text-xs font-bold outline-none bg-stone-50 focus:bg-white placeholder:text-stone-400"
                          />
                        </div>
                        <div className="col-span-2">
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
                  </div>
                )}

                {/* ── STEP 4: FINALIZE & PRINT CONTROLS ── */}
                {activeStep === 4 && (
                  <div className="flex flex-col gap-3">
                    <p className="font-mono text-xs text-stone-600">
                      Your botanical keepsake is ready! Choose what to share or print and how to display it.
                    </p>

                    {/* Gift Format Choice: Flower & Card vs Flower Only vs Card Only */}
                    <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                      <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                        GIFT FORMAT (WHAT TO SHARE / PRINT)
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setGiftFormat('both');
                            setShareUrl('');
                            // keep in sidebar
                          }}
                          className={`p-2 text-[9px] font-mono font-black uppercase border border-black cursor-pointer flex flex-col items-center gap-1 transition-all whitespace-nowrap ${
                            giftFormat === 'both'
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <Layers size={14} className="shrink-0" />
                          <span>BOTH</span>
                          <span className="text-[8px] opacity-70">FLOWER & CARD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGiftFormat('flower');
                            setShareUrl('');
                            // keep in sidebar
                          }}
                          className={`p-2 text-[9px] font-mono font-black uppercase border border-black cursor-pointer flex flex-col items-center gap-1 transition-all whitespace-nowrap ${
                            giftFormat === 'flower'
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <Flower2 size={14} className="shrink-0" />
                          <span>FLOWER ONLY</span>
                          <span className="text-[8px] opacity-70">PURE BOUQUET</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGiftFormat('card');
                            setShareUrl('');
                            // keep in sidebar
                          }}
                          className={`p-2 text-[9px] font-mono font-black uppercase border border-black cursor-pointer flex flex-col items-center gap-1 transition-all whitespace-nowrap ${
                            giftFormat === 'card'
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <Mail size={14} className="shrink-0" />
                          <span>CARD ONLY</span>
                          <span className="text-[8px] opacity-70">LETTER ONLY</span>
                        </button>
                      </div>
                    </div>

                    {/* Choice between As It Is vs Animated Printer */}
                    <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                      <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                        DISPLAY & PRINT VIEW
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFinalizeView('presentation');
                            // keep in sidebar
                          }}
                          className={`p-2 text-[10px] font-mono font-black uppercase border border-black cursor-pointer flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                            finalizeView === 'presentation'
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <LayoutTemplate size={12} />
                          <span>CARD VIEW (AS IT IS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFinalizeView('printer');
                            startPrintFeedSequence();
                            // keep in sidebar
                          }}
                          className={`p-2 text-[10px] font-mono font-black uppercase border border-black cursor-pointer flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                            finalizeView === 'printer'
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <Printer size={12} />
                          <span>PRINTER ANIMATION</span>
                        </button>
                      </div>
                    </div>

                    {/* If in printer view AND format is BOTH, show sheet card placement & replay */}
                    {finalizeView === 'printer' && giftFormat === 'both' && (
                      <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                            SHEET CARD PLACEMENT
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              startPrintFeedSequence();
                              // keep in sidebar
                            }}
                            title="Replay printer feed animation"
                            className="text-[9px] font-mono font-bold text-stone-700 hover:text-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw size={11} />
                            <span>REPRINT</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCardPlacement('right');
                              // keep in sidebar
                            }}
                            className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer whitespace-nowrap ${
                              cardPlacement === 'right' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                          >
                            RIGHT
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCardPlacement('top');
                              // keep in sidebar
                            }}
                            className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer whitespace-nowrap ${
                              cardPlacement === 'top' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                          >
                            TOP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCardPlacement('bottom');
                              // keep in sidebar
                            }}
                            className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer whitespace-nowrap ${
                              cardPlacement === 'bottom' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                          >
                            BOTTOM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCardPlacement('left');
                              // keep in sidebar
                            }}
                            className={`p-1.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer whitespace-nowrap ${
                              cardPlacement === 'left' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                          >
                            LEFT
                          </button>
                        </div>
                      </div>
                    )}

                    {finalizeView === 'printer' && giftFormat !== 'both' && (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            startPrintFeedSequence();
                            // keep in sidebar
                          }}
                          title="Replay printer feed animation"
                          className="text-[10px] font-mono font-bold text-stone-700 hover:text-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw size={11} />
                          <span>REPRINT ANIMATION</span>
                        </button>
                      </div>
                    )}

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

                    {/* Soundscape Ambient Music Preset */}
                    <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                          REVEAL SOUNDTRACK
                        </span>
                        <span className="text-[9px] font-mono text-stone-400 font-bold uppercase">
                          AUDIO AMBIENCE
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {SOUND_PRESETS.map((preset) => {
                          const isSelected = selectedSoundPreset === preset.id;
                          const isPlayingThis = previewingSound === preset.id;
                          return (
                            <div
                              key={preset.id}
                              className={`p-2 border border-black flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-black text-white' : 'bg-white text-black hover:bg-stone-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedSoundPreset(preset.id)}
                                className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                              >
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-current rounded opacity-60 shrink-0">
                                  {preset.trackNumber}
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs font-black uppercase tracking-wider">
                                    {preset.name}
                                  </span>
                                  <span
                                    className={`text-[10px] ${
                                      isSelected ? 'text-stone-300' : 'text-stone-500'
                                    }`}
                                  >
                                    {preset.description}
                                  </span>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePreviewSound(preset.id)}
                                title={isPlayingThis ? 'Stop preview' : 'Play preview'}
                                className={`px-2 py-1 border border-black text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1 ${
                                  isPlayingThis
                                    ? 'bg-[#FFE500] text-black shadow-[1px_1px_0_#000]'
                                    : isSelected
                                    ? 'bg-stone-800 text-white hover:bg-stone-700'
                                    : 'bg-stone-100 text-black hover:bg-stone-200'
                                }`}
                              >
                                {isPlayingThis ? <Square size={10} /> : <Play size={10} />}
                                <span>{isPlayingThis ? 'STOP' : 'TEST'}</span>
                              </button>
                            </div>
                          );
                        })}

                        {/* None / Muted Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSoundPreset('none');
                            if (previewingSound) {
                              soundEngine.stop();
                              setPreviewingSound(null);
                            }
                          }}
                          className={`p-2 border border-black text-left flex items-center gap-2 cursor-pointer transition-colors ${
                            selectedSoundPreset === 'none'
                              ? 'bg-black text-white'
                              : 'bg-white text-black hover:bg-stone-50'
                          }`}
                        >
                          <VolumeX size={14} className="shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-black uppercase tracking-wider">
                              None (Muted)
                            </span>
                            <span
                              className={`text-[10px] ${
                                selectedSoundPreset === 'none' ? 'text-stone-300' : 'text-stone-500'
                              }`}
                            >
                              Silent reveal with no background music
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* PNG Export Background Option */}
                    <div className="p-3 bg-stone-50 border-2 border-black flex flex-col gap-2 shadow-[2px_2px_0_#000]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-stone-600">
                          PNG BACKGROUND
                        </span>
                        <span className="text-[9px] font-mono text-stone-400 font-bold uppercase">
                          IMAGE SAVE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExportBg('white')}
                          className={`p-2 font-mono text-xs font-black uppercase border border-black rounded cursor-pointer flex items-center justify-center gap-1.5 ${
                            exportBg === 'white'
                              ? 'bg-black text-white shadow-[1px_1px_0_#000]'
                              : 'bg-white text-black hover:bg-stone-50'
                          }`}
                        >
                          <span>WHITE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportBg('clear')}
                          className={`p-2 font-mono text-xs font-black uppercase border border-black rounded cursor-pointer flex items-center justify-center gap-1.5 ${
                            exportBg === 'clear'
                              ? 'bg-black text-white shadow-[1px_1px_0_#000]'
                              : 'bg-white text-black hover:bg-stone-50'
                          }`}
                        >
                          <span>CLEAR</span>
                        </button>
                      </div>
                    </div>

                    {/* Primary Print with Printer Animation Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setFinalizeView('printer');
                        startPrintFeedSequence();
                        // keep in sidebar
                      }}
                      className="p-3 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap"
                    >
                      <Printer size={16} />
                      <span>PRINT WITH PRINTER ANIMATION</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativePrint}
                      className="p-3 bg-white hover:bg-stone-50 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Printer size={16} />
                      <span>
                        {giftFormat === 'flower'
                          ? 'PRINT BOUQUET / PDF'
                          : giftFormat === 'card'
                          ? 'PRINT CARD / PDF'
                          : 'DIRECT PRINT / SAVE AS PDF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={isExporting}
                      className="w-full min-h-[46px] p-3 bg-white text-black hover:bg-stone-50 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Download size={16} className="shrink-0" />
                      <span>{isExporting ? 'SAVING...' : `DOWNLOAD PNG (${exportBg.toUpperCase()})`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={isSavingLink}
                      className="p-3 bg-white text-black hover:bg-stone-50 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 min-h-[46px] disabled:opacity-50"
                    >
                      {isSavingLink ? (
                        <span>SAVING TO CLOUD...</span>
                      ) : copied ? (
                        <>
                          <Check size={16} className="text-green-600 shrink-0" />
                          <span>LINK COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={16} className="shrink-0" />
                          <span>
                            {giftFormat === 'flower'
                              ? 'COPY BOUQUET LINK'
                              : giftFormat === 'card'
                              ? 'COPY CARD LINK'
                              : 'COPY SHARE LINK'}
                          </span>
                        </>
                      )}
                    </button>

                    {shareUrl && (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 text-center"
                      >
                        <Sparkles size={15} />
                        <span>PREVIEW RECIPIENT PAGE ↗</span>
                      </a>
                    )}
                  </div>

                )}
              </div>

              {/* Desktop Sidebar Footer Navigation: Hidden on mobile to grant 100% vertical space to sidebar controls */}
              <div className="hidden md:flex h-14 px-4 bg-stone-50 border-t-2 border-black items-center justify-between shrink-0">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev - 1) as StudioStep)}
                    className="px-4 py-2 bg-white hover:bg-stone-100 text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap"
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
                    disabled={
                      (activeStep === 1 && flowerCategory === 'big' && selectedGreenery.length < 2) ||
                      (activeStep === 2 && selectedFlowers.length < minAllowed)
                    }
                    className="px-5 py-2 bg-black hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ml-auto whitespace-nowrap"
                  >
                    NEXT ›
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (finalizeView === 'presentation') {
                        setFinalizeView('printer');
                        startPrintFeedSequence();
                      } else {
                        handleNativePrint();
                      }
                    }}
                    className="px-5 py-2 bg-[#FFE500] hover:bg-[#FDD800] text-black border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ml-auto flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Printer size={13} />
                    <span>{finalizeView === 'presentation' ? 'PRINT ANIMATION ›' : 'PRINT / PDF'}</span>
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* ── MOBILE PERSISTENT FLOATING NAVIGATION TOGGLE (EDIT CHOICES <-> VIEW CREATION) ── */}
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          {mobileStudioTab === 'stage' ? (
            <button
              type="button"
              onClick={() => setMobileStudioTab('sidebar')}
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000] flex items-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
            >
              {selectedGreenery.length === 0 && selectedFlowers.length === 0 ? (
                <>
                  <Plus size={14} />
                  <span>SELECT A FOLIAGE</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={14} />
                  <span>{activeStep === 4 ? 'OPTIONS & SOUND' : 'EDIT CHOICES'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileStudioTab('stage')}
              className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000] flex items-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
            >
              <Eye size={14} />
              <span>VIEW CREATION</span>
            </button>
          )}
        </div>



      </div>
    </div>
  );
}
