'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import {
  RiArrowRightLine,
  RiArrowLeftLine,
  RiDownload2Line,
  RiFolderZipLine,
  RiFileLine,
  RiAddLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiImageAddLine,
  RiPaletteLine,
  RiFontSize,
  RiLayoutMasonryLine,
  RiSearchLine,
  RiFolder3Line,
  RiCheckLine,
  RiShieldCheckLine,
  RiRefreshLine,
  RiExternalLinkLine,
  RiCloseLine,
  RiCropLine,
  RiText,
  RiCheckboxCircleFill,
  RiPlaneLine,
  RiAwardLine,
} from '@remixicon/react';

import {
  SlideItem,
  LayoutMode,
  BackgroundType,
  SwipePromptType,
  HighlightStyle,
  AspectRatioPreset,
  SlideImageSlot,
} from './types';
import { renderSlideToCanvas, CanvasRenderOptions } from './canvas-renderer';
import { REMIX_ICONS_LIST, getRemixIconComponent } from './icon-helper';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';

// Standard Aspect Ratio Presets
const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '4:5', label: '4:5 · Instagram Feed / LinkedIn (Best)', width: 1080, height: 1350, aspect: '4/5' },
  { id: '1:1', label: '1:1 · Square Post', width: 1080, height: 1080, aspect: '1/1' },
  { id: '9:16', label: '9:16 · Story / Reels / TikTok', width: 1080, height: 1920, aspect: '9/16' },
  { id: '16:9', label: '16:9 · YouTube / Banner', width: 1920, height: 1080, aspect: '16/9' },
  { id: '3:4', label: '3:4 · Pinterest / Portrait', width: 1080, height: 1440, aspect: '3/4' },
];

// 6 Viral Creator Templates (Directly matched to modern high-converting carousels)
const VIRAL_TEMPLATES = [
  {
    id: 'cobalt-hook',
    name: 'Electric Cobalt Hook',
    tag: 'AI / Tech Hook',
    desc: 'Solid cobalt blue, bold white headline, search bar mockup & top edit pill',
    previewColor: '#0047FF',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'hero-hook',
      bgType: 'solid',
      solidColor: '#0047FF',
      textColor: '#FFFFFF',
      accentColor: '#00E5FF',
      titleFontFamily: 'Inter',
      bodyFontFamily: 'Inter',
      eyebrowText: 'UNLOCK LASTING RESULTS',
      heroTitle: '4 Strategies that drive AI Success',
      highlightWords: 'AI Success',
      highlightStyle: 'pill',
      highlightBgColor: '#002B99',
      highlightTextColor: '#FFFFFF',
      topTagPill: 'Click Here to Edit Files',
      swipePromptType: 'search-bar',
      swipeSearchPlaceholder: "I'm looking for...",
      dottedDivider: false,
      sectionNumber: '01',
    }),
  },
  {
    id: 'editorial-linen',
    name: 'Warm Linen Brand',
    tag: 'Personal Brand',
    desc: 'Warm paper texture, highlighted orange keyword pill, dashed box & swipe pill',
    previewColor: '#F4EFEA',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'hero-hook',
      bgType: 'graph-grid',
      solidColor: '#F4EFEA',
      textColor: '#1E293B',
      accentColor: '#E05638',
      titleFontFamily: 'DM Sans',
      bodyFontFamily: 'Inter',
      brandLogoText: 'Brand',
      heroTitle: 'Build Your Personal Brand as a Graphic Designer',
      highlightWords: 'as a',
      highlightStyle: 'pill',
      highlightBgColor: '#E05638',
      highlightTextColor: '#FFFFFF',
      secondaryHighlightWords: 'Graphic Designer',
      secondaryHighlightBox: true,
      dottedDivider: true,
      sectionNumber: 'PAGE 01',
      swipePromptType: 'pill-arrow',
      swipePromptText: 'SWIPE ➔',
    }),
  },
  {
    id: 'dark-notes',
    name: 'Obsidian Tweet / Notes',
    tag: 'Social Authority',
    desc: 'Deep dark card, verified avatar chip, highlight badge & folder prompt button',
    previewColor: '#12151B',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'tweet-card',
      bgType: 'halftone-dither',
      solidColor: '#12151B',
      textColor: '#FFFFFF',
      accentColor: '#2563EB',
      titleFontFamily: 'Inter',
      bodyFontFamily: 'Inter',
      authorName: 'Justas Markus',
      authorHandle: '@JustasMarkus',
      authorVerified: true,
      heroTitle: 'Scaling With AI Planning',
      highlightWords: "It's Replacing How You Work.",
      highlightStyle: 'pill',
      highlightBgColor: '#2563EB',
      highlightTextColor: '#FFFFFF',
      topTagPill: 'Click Here to Edit Files',
      swipePromptType: 'notes-folder',
      swipePromptSubtext: '📁 Swipe to view notes 4 >',
    }),
  },
  {
    id: 'marigold-display',
    name: 'Marigold & Purple Editorial',
    tag: 'Thought Leadership',
    desc: 'High-contrast yellow canvas, elegant serif italic & minimal arrow footer',
    previewColor: '#FFB800',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'editorial-quote',
      bgType: 'solid',
      solidColor: '#FFB800',
      textColor: '#2C0A3E',
      accentColor: '#2C0A3E',
      titleFontFamily: 'Playfair Display',
      bodyFontFamily: 'Inter',
      heroTitle: 'Consistency Over Creativity',
      titleItalic: true,
      subtitleText: 'Why staying consistent in marketing matters more than being "brilliant" once in a while.',
      swipePromptType: 'minimal-arrow',
      watermarkText: 'creatorkit.studio',
      dottedDivider: false,
    }),
  },
  {
    id: 'dual-comparison',
    name: 'Before / After Comparison',
    tag: 'Visual Proof',
    desc: 'Side-by-side dual image slots with customizable comparison tags & headline',
    previewColor: '#181A24',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'dual-comparison',
      bgType: 'solid',
      solidColor: '#0E1015',
      textColor: '#FFFFFF',
      accentColor: '#2ED573',
      titleFontFamily: 'Inter',
      heroTitle: '48-Hour Manual Effort vs Instant 1-Click Studio',
      images: [
        { id: '1', label: 'BEFORE: Manual', fit: 'cover' },
        { id: '2', label: 'AFTER: Instant', fit: 'cover' },
      ],
      swipePromptType: 'connected-arc',
    }),
  },
  {
    id: 'trio-showcase',
    name: '3-Step Tool Showcase',
    tag: 'Step-by-Step',
    desc: '3 image cards in a row with numbered step badges, title & take-action pill',
    previewColor: '#0A0C10',
    apply: (slide: SlideItem): SlideItem => ({
      ...slide,
      layoutMode: 'trio-gallery',
      bgType: 'solid',
      solidColor: '#0A0C10',
      textColor: '#FFFFFF',
      accentColor: '#FFE500',
      titleFontFamily: 'Inter',
      heroTitle: '3-Step Framework to Drive 10x More Engagement',
      images: [
        { id: '1', label: 'Step 01', fit: 'cover' },
        { id: '2', label: 'Step 02', fit: 'cover' },
        { id: '3', label: 'Step 03', fit: 'cover' },
      ],
      swipePromptType: 'pill-arrow',
      swipePromptText: 'NEXT STEP ➔',
    }),
  },
];

// Initial default slide
function createInitialSlide(index: number = 1): SlideItem {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    layoutMode: 'hero-hook',
    categoryBadge: 'CONTENT STRATEGY',
    categoryBadgeIcon: 'arrow-right',
    topTagPill: 'Click Here to Edit Files',
    eyebrowText: 'UNLOCK LASTING RESULTS',
    sectionNumber: `0${index}`,
    brandLogoText: '',
    heroTitle: '4 Strategies that drive AI Success',
    highlightWords: 'AI Success',
    highlightStyle: 'pill',
    highlightBgColor: '#002B99',
    highlightTextColor: '#FFFFFF',
    subtitleText: "We're moving from clicks to connection. From impressions to high impact.",
    titleFontFamily: 'Inter',
    bodyFontFamily: 'Inter',
    titleFontSize: 100,
    textColor: '#FFFFFF',
    accentColor: '#FFE500',
    textAlign: 'left',
    titleItalic: false,
    titleTracking: 0,
    images: [],
    dottedDivider: false,
    swipePromptType: 'search-bar',
    swipePromptText: 'SWIPE ➔',
    swipeSearchPlaceholder: "I'm looking for...",
    showAuthorBlock: false,
    authorName: 'Reuben Sonada',
    authorHandle: '@reubensonada',
    authorVerified: true,
    bgType: 'solid',
    solidColor: '#0047FF',
    presetGradientId: 'electric-cobalt',
    customGradColors: ['#0047FF', '#002699', '#00114D'],
    customGradAngle: 135,
    bgBlur: 0,
    bgDimness: 0,
    meshPins: [
      { id: 1, color: '#0047FF', x: 20, y: 20 },
      { id: 2, color: '#00E5FF', x: 80, y: 80 },
    ],
    meshWarpSize: 75,
    meshDiffusion: 65,
    gridColor: 'rgba(0, 0, 0, 0.06)',
    gridSize: 45,
  };
}

export default function QuoteCardPage() {
  // Slides State
  const [slides, setSlides] = useState<SlideItem[]>([
    createInitialSlide(1),
    {
      ...createInitialSlide(2),
      heroTitle: 'Step 1: Focus On Direct Outcomes',
      highlightWords: 'Direct Outcomes',
      eyebrowText: 'STRATEGY 01',
      sectionNumber: '02',
      swipePromptType: 'connected-arc',
    },
    {
      ...createInitialSlide(3),
      heroTitle: 'Consistency Over Sporadic Genius',
      highlightWords: 'Consistency',
      eyebrowText: 'STRATEGY 02',
      sectionNumber: '03',
      swipePromptType: 'pill-arrow',
    },
  ]);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeRatio, setActiveRatio] = useState<AspectRatioPreset>(ASPECT_RATIO_PRESETS[0]);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'layout' | 'typography' | 'badges' | 'background' | 'swipe'>('layout');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Icon Selector Modal State
  const [isIconModalOpen, setIsIconModalOpen] = useState<boolean>(false);
  const [iconModalTarget, setIconModalTarget] = useState<'badge' | 'swipe' | 'brand'>('badge');
  const [iconSearchQuery, setIconSearchQuery] = useState<string>('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('all');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Current Slide
  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Helper to update current slide
  const updateCurrentSlide = useCallback((patch: Partial<SlideItem>) => {
    setSlides((prev) => {
      const next = [...prev];
      if (next[activeSlideIndex]) {
        next[activeSlideIndex] = { ...next[activeSlideIndex], ...patch };
      }
      return next;
    });
  }, [activeSlideIndex]);

  // Render options
  const renderOptions: CanvasRenderOptions = {
    width: activeRatio.width,
    height: activeRatio.height,
    showCounter: true,
    counterPosition: 'top-right',
    counterStyle: 'pill',
    showCategoryBadge: true,
    showEyebrow: true,
    showHeroTitle: true,
    showSubtitle: true,
    showAuthorBlock: currentSlide.showAuthorBlock,
    showQuoteMarks: true,
    fontFamily: currentSlide.titleFontFamily || 'Inter',
    heroFontSize: currentSlide.titleFontSize || 100,
    textColor: currentSlide.textColor || '#ffffff',
    accentColor: currentSlide.accentColor || '#FFE500',
    textAlign: currentSlide.textAlign || 'left',
    bgBlur: currentSlide.bgBlur || 0,
    bgDimness: currentSlide.bgDimness || 0,
    bgGrain: 12,
    bgVignette: 15,
    isBold: true,
    isItalic: currentSlide.titleItalic || false,
  };

  // Render to canvas on slide / option change
  useEffect(() => {
    if (!canvasRef.current || !currentSlide) return;
    renderSlideToCanvas(
      canvasRef.current,
      currentSlide,
      activeSlideIndex + 1,
      slides.length,
      renderOptions
    );
  }, [currentSlide, activeSlideIndex, slides.length, activeRatio, renderOptions]);

  // Single Slide 4K Lossless PNG Export
  const exportSingleSlidePNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `carousel-slide-0${activeSlideIndex + 1}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('Single slide exported as high-resolution PNG!');
  };

  // All Slides Sequential ZIP Export
  const exportAllSlidesZIP = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const tempCanvas = document.createElement('canvas');
        renderSlideToCanvas(tempCanvas, slides[i], i + 1, slides.length, {
          ...renderOptions,
          width: activeRatio.width,
          height: activeRatio.height,
        });
        const dataUrl = tempCanvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(`slide-0${i + 1}.png`, base64Data, { base64: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carousel-pack-all-slides.zip`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Exported all ${slides.length} slides in full-res ZIP!`);
    } catch (err) {
      console.error('ZIP Export Error', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Multi-Page LinkedIn PDF Export
  const exportLinkedInPDF = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);
    try {
      const isPortrait = activeRatio.height >= activeRatio.width;
      const doc = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'px',
        format: [activeRatio.width, activeRatio.height],
      });

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) {
          doc.addPage([activeRatio.width, activeRatio.height], isPortrait ? 'portrait' : 'landscape');
        }
        const tempCanvas = document.createElement('canvas');
        renderSlideToCanvas(tempCanvas, slides[i], i + 1, slides.length, {
          ...renderOptions,
          width: activeRatio.width,
          height: activeRatio.height,
        });
        const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, activeRatio.width, activeRatio.height);
      }
      doc.save(`linkedin-carousel-document.pdf`);
      showToast('LinkedIn Multi-Page Carousel PDF exported successfully!');
    } catch (err) {
      console.error('PDF Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const showToast = (msg: string) => {
    setExportSuccessMessage(msg);
    setTimeout(() => setExportSuccessMessage(null), 3500);
  };

  // Slide Management Helpers
  const handleAddSlide = () => {
    const newSlide = createInitialSlide(slides.length + 1);
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  };

  const handleDuplicateSlide = (idx: number) => {
    const target = slides[idx];
    if (!target) return;
    const duplicated: SlideItem = {
      ...target,
      id: `slide-${Date.now()}`,
      sectionNumber: `0${slides.length + 1}`,
    };
    const next = [...slides];
    next.splice(idx + 1, 0, duplicated);
    setSlides(next);
    setActiveSlideIndex(idx + 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setActiveSlideIndex(Math.max(0, idx - 1));
  };

  const handleMoveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSlides(next);
    setActiveSlideIndex(to);
  };

  // Image Upload Handlers
  const handleImageSlotUpload = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const currentImages = [...(currentSlide.images || [])];
        while (currentImages.length <= slotIndex) {
          currentImages.push({ id: `img-${Date.now()}-${currentImages.length}` });
        }
        currentImages[slotIndex] = {
          ...currentImages[slotIndex],
          url,
          imgEl: img,
          fit: currentImages[slotIndex]?.fit || 'cover',
        };
        updateCurrentSlide({ images: currentImages });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImageSlot = (slotIndex: number) => {
    const currentImages = [...(currentSlide.images || [])];
    currentImages.splice(slotIndex, 1);
    updateCurrentSlide({ images: currentImages });
  };

  // Background Photo Upload
  const handleBackgroundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        updateCurrentSlide({
          bgType: 'photo',
          photoUrl: url,
          photoImgEl: img,
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Filtered Remix Icons for Modal
  const filteredIcons = REMIX_ICONS_LIST.filter((icon) => {
    const matchesSearch =
      icon.name.toLowerCase().includes(iconSearchQuery.toLowerCase()) ||
      icon.id.toLowerCase().includes(iconSearchQuery.toLowerCase());
    const matchesCat = selectedIconCategory === 'all' || icon.category === selectedIconCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-black flex flex-col font-sans">
      {/* Toast Notification */}
      {exportSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#FFE500] text-black border-2 border-black px-5 py-3 font-mono font-bold shadow-[4px_4px_0px_#000] flex items-center gap-3">
          <RiCheckboxCircleFill className="w-5 h-5 text-black" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="border-b-2 border-black bg-white px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_2px_0px_#000]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#F5F5F0] border-2 border-black hover:bg-[#FFE500] transition-colors shadow-[2px_2px_0px_#000]"
          >
            <RiArrowLeftLine className="w-3.5 h-3.5" />
            <span>HOME</span>
          </Link>
          <div className="h-6 w-0.5 bg-black" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FFE500] border border-black" />
            <h1 className="text-base lg:text-lg font-black tracking-tight font-mono">
              QUOTE CARD & CAROUSEL STUDIO
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white font-bold">
              PRO STUDIO
            </span>
          </div>
        </div>

        {/* TOP ACTION BAR: ASPECT RATIOS & EXPORT BUTTONS */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1 bg-[#F5F5F0] border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
            {ASPECT_RATIO_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveRatio(p)}
                className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${activeRatio.id === p.id ? 'bg-[#FFE500] text-black border border-black' : 'hover:bg-white text-black'
                  }`}
              >
                {p.id}
              </button>
            ))}
          </div>

          {/* Export Actions */}
          <button
            onClick={exportSingleSlidePNG}
            className="px-3.5 py-1.5 bg-white border-2 border-black text-black font-mono font-black text-xs flex items-center gap-1.5 hover:bg-[#FFE500] transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RiDownload2Line className="w-3.5 h-3.5" />
            <span>SLIDE PNG</span>
          </button>

          <button
            onClick={exportAllSlidesZIP}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-white border-2 border-black text-black font-mono font-black text-xs flex items-center gap-1.5 hover:bg-[#FFE500] transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RiFolderZipLine className="w-3.5 h-3.5" />
            <span>ALL ZIP ({slides.length})</span>
          </button>

          <button
            onClick={exportLinkedInPDF}
            disabled={isExporting}
            className="px-4 py-1.5 bg-[#FFE500] border-2 border-black text-black font-mono font-black text-xs flex items-center gap-1.5 hover:bg-yellow-300 transition-all shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RiFileLine className="w-3.5 h-3.5" />
            <span>LINKEDIN PDF</span>
          </button>
        </div>
      </header>

      {/* 1-CLICK VIRAL TEMPLATES BAR */}
      <div className="border-b-2 border-black bg-[#EFEFEA] px-4 lg:px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-mono font-black uppercase text-gray-700 mr-2 flex items-center gap-1">
            <RiLayoutMasonryLine className="w-3.5 h-3.5" />
            VIRAL PRESETS:
          </span>
          {VIRAL_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => updateCurrentSlide(tmpl.apply(currentSlide))}
              className="px-3 py-1 bg-white border-2 border-black text-xs font-mono font-bold hover:bg-[#FFE500] transition-all shadow-[2px_2px_0px_#000] flex items-center gap-2 group"
            >
              <div
                className="w-3 h-3 border border-black"
                style={{ backgroundColor: tmpl.previewColor }}
              />
              <span>{tmpl.name}</span>
              <span className="text-[9px] bg-black text-white px-1 py-0.2 uppercase">
                {tmpl.tag}
              </span>
            </button>
          ))}
          <a
            href="https://dynamo.castos.com/quote-cards"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-[#FFFBEB] border-2 border-black text-xs font-mono font-bold hover:bg-[#FFE500] transition-all shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ml-auto text-black"
            title="Looking for animated podcast waveform quote cards?"
          >
            <span>🎙️</span>
            <span>Castos Podcast Cards ↗</span>
          </a>
        </div>
      </div>

      {/* MAIN TWO-COLUMN STUDIO WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* LEFT COLUMN: LIVE 4K PREVIEW STAGE + SLIDE TIMELINE */}
        <div className="lg:col-span-7 bg-[#E8E8E2] border-b-2 lg:border-b-0 lg:border-r-2 border-black flex flex-col justify-between p-4 lg:p-6 overflow-y-auto">
          {/* Top Stage Control Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black px-2 py-0.5 bg-black text-white">
                STAGE · 4K PREVIEW
              </span>
              <span className="text-xs font-mono text-gray-600">
                Slide {activeSlideIndex + 1} of {slides.length} ({activeRatio.id})
              </span>
            </div>
            <div className="text-xs font-mono text-gray-500">
              {activeRatio.width} × {activeRatio.height}px
            </div>
          </div>

          {/* Centered Scaled Canvas Preview */}
          <div className="flex-1 flex items-center justify-center min-h-[380px] lg:min-h-[520px] p-2">
            <div
              className="border-3 border-black shadow-[8px_8px_0px_#000] bg-black transition-all max-w-full max-h-[68vh] flex items-center justify-center overflow-hidden"
              style={{
                aspectRatio: activeRatio.aspect === 'auto' ? '4/5' : activeRatio.aspect,
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>
          </div>

          {/* BOTTOM SLIDE CAROUSEL TIMELINE STRIP */}
          <div className="mt-4 pt-3 border-t-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black">CAROUSEL TIMELINE</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FFE500] border border-black font-bold">
                  {slides.length} SLIDES
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMoveSlide(activeSlideIndex, activeSlideIndex - 1)}
                  disabled={activeSlideIndex === 0}
                  className="px-2 py-0.5 bg-[#F5F5F0] border border-black text-xs font-mono font-bold hover:bg-[#FFE500] disabled:opacity-30"
                  title="Move slide left"
                >
                  ◀
                </button>
                <button
                  onClick={() => handleMoveSlide(activeSlideIndex, activeSlideIndex + 1)}
                  disabled={activeSlideIndex === slides.length - 1}
                  className="px-2 py-0.5 bg-[#F5F5F0] border border-black text-xs font-mono font-bold hover:bg-[#FFE500] disabled:opacity-30"
                  title="Move slide right"
                >
                  ▶
                </button>
                <button
                  onClick={() => handleDuplicateSlide(activeSlideIndex)}
                  className="px-2 py-0.5 bg-[#F5F5F0] border border-black text-xs font-mono font-bold hover:bg-[#FFE500] flex items-center gap-1"
                  title="Duplicate Slide"
                >
                  <RiFileCopyLine className="w-3 h-3" />
                  <span>DUPLICATE</span>
                </button>
                <button
                  onClick={() => handleDeleteSlide(activeSlideIndex)}
                  disabled={slides.length <= 1}
                  className="px-2 py-0.5 bg-red-100 border border-black text-xs font-mono font-bold hover:bg-red-300 disabled:opacity-30 flex items-center gap-1 text-red-900"
                  title="Delete Slide"
                >
                  <RiDeleteBinLine className="w-3 h-3" />
                  <span>DELETE</span>
                </button>
              </div>
            </div>

            {/* Slide Thumbnails List */}
            <div className="flex items-center gap-2.5 overflow-x-auto py-1">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`flex-shrink-0 w-24 h-28 border-2 transition-all p-1 flex flex-col justify-between text-left ${activeSlideIndex === idx
                      ? 'border-black bg-[#FFE500] shadow-[3px_3px_0px_#000] translate-y-[-2px]'
                      : 'border-gray-400 bg-[#F9F9F7] hover:border-black'
                    }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-black">
                    <span>#{idx + 1}</span>
                    <span className="text-[9px] uppercase px-1 bg-black text-white">
                      {s.layoutMode.replace('hero-', '')}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold line-clamp-2 leading-tight">
                    {s.heroTitle || 'Untitled Slide'}
                  </div>
                  <div
                    className="h-2 w-full border border-black"
                    style={{ backgroundColor: s.solidColor || '#0047FF' }}
                  />
                </button>
              ))}

              {/* Add New Slide Button */}
              <button
                onClick={handleAddSlide}
                className="flex-shrink-0 w-24 h-28 border-2 border-dashed border-black bg-white hover:bg-[#FFE500] transition-colors flex flex-col items-center justify-center gap-1 font-mono text-xs font-bold shadow-[2px_2px_0px_#000]"
              >
                <RiAddLine className="w-5 h-5 text-black" />
                <span>+ SLIDE</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TABBED INSPECTOR CONTROLS */}
        <div className="lg:col-span-5 bg-white flex flex-col h-full overflow-y-auto">
          {/* TAB HEADERS */}
          <div className="grid grid-cols-5 border-b-2 border-black bg-[#F5F5F0] sticky top-0 z-20">
            {[
              { id: 'layout', label: 'Layout & Media', icon: RiLayoutMasonryLine },
              { id: 'typography', label: 'Typography', icon: RiFontSize },
              { id: 'badges', label: 'Badges & Icons', icon: RiAwardLine },
              { id: 'background', label: 'Background', icon: RiPaletteLine },
              { id: 'swipe', label: 'Swipe & Cues', icon: RiArrowRightLine },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInspectorTab(tab.id as any)}
                  className={`py-3 px-1 text-center font-mono text-xs font-black border-r-2 border-black last:border-r-0 transition-colors flex flex-col items-center gap-1 ${activeInspectorTab === tab.id
                      ? 'bg-white text-black shadow-[inset_0_-3px_0px_#FFE500]'
                      : 'hover:bg-[#EFEFEA] text-gray-700'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] uppercase truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT PANELS */}
          <div className="p-4 lg:p-6 space-y-6">
            {/* ======================================================== */}
            {/* TAB 1: LAYOUT & IMAGE SLOTS */}
            {/* ======================================================== */}
            {activeInspectorTab === 'layout' && (
              <div className="space-y-6">
                {/* Layout Archetype Picker */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-2">
                    Slide Layout Archetype
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'hero-hook', name: 'Hero Hook & Pill', desc: 'Display headline with tag pill & swipe' },
                      { id: 'single-image', name: 'Single Image Slot', desc: 'Contained screenshot / photo with text' },
                      { id: 'dual-comparison', name: 'Dual Comparison', desc: 'Side-by-side Before/After dual slots' },
                      { id: 'trio-gallery', name: '3-Slot Trio Grid', desc: '3 images in a row with step badges' },
                      { id: 'tweet-card', name: 'Tweet / Notes Card', desc: 'Social profile chip, verified mark & pill' },
                      { id: 'editorial-quote', name: 'Editorial Quote', desc: 'Large quote marks, serif typography' },
                      { id: 'desktop-window', name: 'Mac Window Mockup', desc: 'Browser window chrome frame' },
                      { id: 'mobile-phone', name: 'Mobile Phone Frame', desc: 'Smartphone frame mockup' },
                      { id: 'color-swatches', name: 'Color Swatches', desc: 'Curated 5 color harmony cards' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => updateCurrentSlide({ layoutMode: mode.id as LayoutMode })}
                        className={`p-2.5 text-left border-2 transition-all font-mono ${currentSlide.layoutMode === mode.id
                            ? 'border-black bg-[#FFE500] shadow-[3px_3px_0px_#000]'
                            : 'border-gray-300 bg-[#F9F9F7] hover:border-black'
                          }`}
                      >
                        <div className="text-xs font-black">{mode.name}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Image Slots (When applicable) */}
                <div className="border-2 border-black p-4 bg-[#F9F9F7] shadow-[3px_3px_0px_#000]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-black uppercase flex items-center gap-1.5">
                      <RiImageAddLine className="w-4 h-4" />
                      IMAGE & SCREENSHOT SLOTS
                    </span>
                    <button
                      onClick={() => {
                        const imgs = [...(currentSlide.images || [])];
                        imgs.push({ id: `img-${Date.now()}`, label: `Slot ${imgs.length + 1}` });
                        updateCurrentSlide({ images: imgs });
                      }}
                      className="px-2 py-0.5 bg-white border border-black text-xs font-mono font-bold hover:bg-[#FFE500]"
                    >
                      + ADD SLOT
                    </button>
                  </div>

                  {(!currentSlide.images || currentSlide.images.length === 0) && (
                    <div className="text-xs font-mono text-gray-500 py-3 text-center border border-dashed border-gray-400">
                      No custom image slots active on this slide. Click &quot;Add Slot&quot; or choose a Multi-Image Layout.
                    </div>
                  )}

                  <div className="space-y-3">
                    {(currentSlide.images || []).map((slot, sIdx) => (
                      <div key={slot.id || sIdx} className="border-2 border-black bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black">IMAGE SLOT 0{sIdx + 1}</span>
                          <button
                            onClick={() => handleRemoveImageSlot(sIdx)}
                            className="text-xs text-red-600 hover:underline font-mono font-bold"
                          >
                            REMOVE
                          </button>
                        </div>

                        {/* File Upload Input */}
                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer bg-[#F5F5F0] border-2 border-dashed border-black px-3 py-2 text-center text-xs font-mono font-bold hover:bg-[#FFE500] transition-colors truncate">
                            <span>{slot.url ? '✓ Replace Image File' : '📁 Upload Photo / Screenshot'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageSlotUpload(e, sIdx)}
                            />
                          </label>
                        </div>

                        {/* Slot Label & Fit */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-mono font-bold text-gray-600 mb-1">
                              BADGE LABEL
                            </label>
                            <input
                              type="text"
                              value={slot.label || ''}
                              placeholder="e.g. BEFORE / STEP 01"
                              onChange={(e) => {
                                const imgs = [...(currentSlide.images || [])];
                                imgs[sIdx] = { ...imgs[sIdx], label: e.target.value };
                                updateCurrentSlide({ images: imgs });
                              }}
                              className="w-full text-xs font-mono p-1.5 border border-black bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold text-gray-600 mb-1">
                              IMAGE FIT
                            </label>
                            <select
                              value={slot.fit || 'cover'}
                              onChange={(e) => {
                                const imgs = [...(currentSlide.images || [])];
                                imgs[sIdx] = { ...imgs[sIdx], fit: e.target.value as any };
                                updateCurrentSlide({ images: imgs });
                              }}
                              className="w-full text-xs font-mono p-1.5 border border-black bg-white"
                            >
                              <option value="cover">Cover (Fill Card)</option>
                              <option value="contain">Contain (Fit Whole Image)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: TYPOGRAPHY & COPY */}
            {/* ======================================================== */}
            {activeInspectorTab === 'typography' && (
              <div className="space-y-5">
                {/* Hero Title Input */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1">
                    HERO HEADLINE (MAIN TEXT)
                  </label>
                  <textarea
                    rows={3}
                    value={currentSlide.heroTitle}
                    onChange={(e) => updateCurrentSlide({ heroTitle: e.target.value })}
                    placeholder="Enter main headline or statement..."
                    className="w-full p-2.5 text-sm font-mono border-2 border-black bg-white focus:outline-none focus:bg-[#FFE500]/10 shadow-[2px_2px_0px_#000]"
                  />
                </div>

                {/* Highlighted Words & Highlighting Style */}
                <div className="border-2 border-black p-3.5 bg-[#F9F9F7] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase">KEYWORD HIGHLIGHT PILL</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black text-white">AUTO-INLINE</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-700 mb-1">
                      Words to Highlight in Hero Title:
                    </label>
                    <input
                      type="text"
                      value={currentSlide.highlightWords || ''}
                      placeholder="e.g. AI Success or as a"
                      onChange={(e) => updateCurrentSlide({ highlightWords: e.target.value })}
                      className="w-full p-2 text-xs font-mono border border-black bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-600 mb-1">Pill Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentSlide.highlightBgColor || '#E05638'}
                          onChange={(e) => updateCurrentSlide({ highlightBgColor: e.target.value })}
                          className="w-8 h-8 border border-black cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={currentSlide.highlightBgColor || '#E05638'}
                          onChange={(e) => updateCurrentSlide({ highlightBgColor: e.target.value })}
                          className="w-full text-xs font-mono p-1 border border-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-600 mb-1">Pill Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentSlide.highlightTextColor || '#FFFFFF'}
                          onChange={(e) => updateCurrentSlide({ highlightTextColor: e.target.value })}
                          className="w-8 h-8 border border-black cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={currentSlide.highlightTextColor || '#FFFFFF'}
                          onChange={(e) => updateCurrentSlide({ highlightTextColor: e.target.value })}
                          className="w-full text-xs font-mono p-1 border border-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Highlight Selection Box Toggle */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!currentSlide.secondaryHighlightBox}
                        onChange={(e) => updateCurrentSlide({ secondaryHighlightBox: e.target.checked })}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-xs font-mono font-bold">
                        Add Designer Dashed Selection Box (like Reference 2)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Subtitle / Descriptive Copy */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1">
                    SUBTITLE / KEY TAKEAWAY
                  </label>
                  <textarea
                    rows={2}
                    value={currentSlide.subtitleText || ''}
                    onChange={(e) => updateCurrentSlide({ subtitleText: e.target.value })}
                    placeholder="Enter secondary takeaway or multi-line description..."
                    className="w-full p-2 text-xs font-mono border-2 border-black bg-white focus:outline-none"
                  />
                </div>

                {/* Google Fonts Selector */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1 flex items-center justify-between">
                    <span>HEADLINE FONT FAMILY</span>
                    <span className="text-[10px] text-gray-500 font-normal">Google Fonts</span>
                  </label>
                  <select
                    value={currentSlide.titleFontFamily || 'Inter'}
                    onChange={(e) => updateCurrentSlide({ titleFontFamily: e.target.value })}
                    className="w-full p-2 text-xs font-mono border-2 border-black bg-white font-bold"
                  >
                    {GOOGLE_FONTS_LIST.map((f) => (
                      <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Styling Adjusters */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-600 mb-1">SIZE ({currentSlide.titleFontSize || 100}%)</label>
                    <input
                      type="range"
                      min={70}
                      max={150}
                      value={currentSlide.titleFontSize || 100}
                      onChange={(e) => updateCurrentSlide({ titleFontSize: Number(e.target.value) })}
                      className="w-full accent-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-600 mb-1">ITALIC SERIF</label>
                    <button
                      onClick={() => updateCurrentSlide({ titleItalic: !currentSlide.titleItalic })}
                      className={`w-full py-1 text-xs font-mono font-bold border border-black ${currentSlide.titleItalic ? 'bg-[#FFE500]' : 'bg-white'
                        }`}
                    >
                      {currentSlide.titleItalic ? 'ITALIC ON' : 'REGULAR'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-600 mb-1">DOTTED DIVIDER</label>
                    <button
                      onClick={() => updateCurrentSlide({ dottedDivider: !currentSlide.dottedDivider })}
                      className={`w-full py-1 text-xs font-mono font-bold border border-black ${currentSlide.dottedDivider ? 'bg-[#FFE500]' : 'bg-white'
                        }`}
                    >
                      {currentSlide.dottedDivider ? 'DIVIDER ON' : 'NONE'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: BADGES & ICONS (REMIX ICONS) */}
            {/* ======================================================== */}
            {activeInspectorTab === 'badges' && (
              <div className="space-y-5">
                {/* Eyebrow / Super-Tag */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1">
                    EYEBROW / SECTION TAG
                  </label>
                  <input
                    type="text"
                    value={currentSlide.eyebrowText || ''}
                    placeholder="e.g. UNLOCK LASTING RESULTS or 3-Step Framework"
                    onChange={(e) => updateCurrentSlide({ eyebrowText: e.target.value })}
                    className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                  />
                </div>

                {/* Top Right Tag Pill */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1">
                    TOP RIGHT TAG PILL (REFERENCE 1)
                  </label>
                  <input
                    type="text"
                    value={currentSlide.topTagPill || ''}
                    placeholder="e.g. Click Here to Edit Files"
                    onChange={(e) => updateCurrentSlide({ topTagPill: e.target.value })}
                    className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                  />
                </div>

                {/* Brand Logo & Watermark */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      BRAND LOGO (TOP LEFT)
                    </label>
                    <input
                      type="text"
                      value={currentSlide.brandLogoText || ''}
                      placeholder="e.g. Brand / CreatorKit"
                      onChange={(e) => updateCurrentSlide({ brandLogoText: e.target.value })}
                      className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      SLIDE NUMBER CUE
                    </label>
                    <input
                      type="text"
                      value={currentSlide.sectionNumber || ''}
                      placeholder="e.g. PAGE 01 or 01"
                      onChange={(e) => updateCurrentSlide({ sectionNumber: e.target.value })}
                      className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                    />
                  </div>
                </div>

                {/* Remix Icon Selector Button */}
                <div className="border-2 border-black p-4 bg-[#F9F9F7]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-black uppercase">REMIX ICON LIBRARY</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFE500] border border-black font-bold">
                      PRO ICONS
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-600 mb-3">
                    Choose clean creator icons for your badges, swipe buttons, or watermark headers.
                  </p>
                  <button
                    onClick={() => {
                      setIconModalTarget('badge');
                      setIsIconModalOpen(true);
                    }}
                    className="w-full py-2 bg-white border-2 border-black font-mono font-black text-xs hover:bg-[#FFE500] transition-colors shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2"
                  >
                    <RiAwardLine className="w-4 h-4" />
                    <span>OPEN ICON SELECTOR MODAL</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: BACKGROUND & THEME */}
            {/* ======================================================== */}
            {activeInspectorTab === 'background' && (
              <div className="space-y-5">
                {/* Background Type Selector */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-2">
                    BACKGROUND TEXTURE & STYLE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'solid', label: 'Solid Color' },
                      { id: 'graph-grid', label: 'Linen & Grid' },
                      { id: 'halftone-dither', label: 'Halftone Retro' },
                      { id: 'preset-gradient', label: 'Gradient' },
                      { id: 'mesh', label: 'Mesh Glow' },
                      { id: 'photo', label: 'Custom Photo' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => updateCurrentSlide({ bgType: bg.id as BackgroundType })}
                        className={`py-2 px-1 text-center font-mono text-xs font-bold border-2 transition-all ${currentSlide.bgType === bg.id
                            ? 'border-black bg-[#FFE500] shadow-[2px_2px_0px_#000]'
                            : 'border-gray-300 bg-[#F9F9F7] hover:border-black'
                          }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Color Palette Swatches */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-1">
                    SOLID COLOR / BASE PALETTE
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={currentSlide.solidColor || '#0047FF'}
                      onChange={(e) => updateCurrentSlide({ solidColor: e.target.value })}
                      className="w-10 h-10 border-2 border-black cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={currentSlide.solidColor || '#0047FF'}
                      onChange={(e) => updateCurrentSlide({ solidColor: e.target.value })}
                      className="flex-1 p-2 text-xs font-mono border-2 border-black"
                    />
                  </div>

                  {/* Quick Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: '#0047FF', label: 'Cobalt' },
                      { hex: '#F4EFEA', label: 'Linen' },
                      { hex: '#12151B', label: 'Obsidian' },
                      { hex: '#FFB800', label: 'Marigold' },
                      { hex: '#10B981', label: 'Emerald' },
                      { hex: '#FFFFFF', label: 'White' },
                    ].map((sw) => (
                      <button
                        key={sw.hex}
                        onClick={() => updateCurrentSlide({ solidColor: sw.hex })}
                        className="flex-1 py-1 text-[10px] font-mono font-bold border border-black truncate"
                        style={{
                          backgroundColor: sw.hex,
                          color: sw.hex === '#FFFFFF' || sw.hex === '#F4EFEA' || sw.hex === '#FFB800' ? '#000' : '#FFF',
                        }}
                      >
                        {sw.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Color & Accent Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      TEXT COLOR
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentSlide.textColor || '#FFFFFF'}
                        onChange={(e) => updateCurrentSlide({ textColor: e.target.value })}
                        className="w-8 h-8 border border-black cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={currentSlide.textColor || '#FFFFFF'}
                        onChange={(e) => updateCurrentSlide({ textColor: e.target.value })}
                        className="w-full text-xs font-mono p-1 border border-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      ACCENT COLOR
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentSlide.accentColor || '#FFE500'}
                        onChange={(e) => updateCurrentSlide({ accentColor: e.target.value })}
                        className="w-8 h-8 border border-black cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={currentSlide.accentColor || '#FFE500'}
                        onChange={(e) => updateCurrentSlide({ accentColor: e.target.value })}
                        className="w-full text-xs font-mono p-1 border border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Photo Background Upload & Sliders */}
                {currentSlide.bgType === 'photo' && (
                  <div className="border-2 border-black p-3.5 bg-[#F9F9F7] space-y-3">
                    <label className="block text-xs font-mono font-black uppercase">
                      PHOTO BACKGROUND SETTINGS
                    </label>
                    <label className="block cursor-pointer bg-white border-2 border-dashed border-black p-2 text-center text-xs font-mono font-bold hover:bg-[#FFE500]">
                      <span>{currentSlide.photoUrl ? '✓ Replace Photo' : '📁 Upload Photo Background'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBackgroundPhotoUpload}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-gray-600 mb-1">
                          BLUR ({currentSlide.bgBlur || 0}px)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          value={currentSlide.bgBlur || 0}
                          onChange={(e) => updateCurrentSlide({ bgBlur: Number(e.target.value) })}
                          className="w-full accent-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-600 mb-1">
                          DIMNESS ({currentSlide.bgDimness || 0}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={90}
                          value={currentSlide.bgDimness || 0}
                          onChange={(e) => updateCurrentSlide({ bgDimness: Number(e.target.value) })}
                          className="w-full accent-black"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: SWIPE & MICRO-COMPONENTS */}
            {/* ======================================================== */}
            {activeInspectorTab === 'swipe' && (
              <div className="space-y-5">
                {/* Swipe Cue Type */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase mb-2">
                    BOTTOM SWIPE PROMPT STYLE
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'search-bar', name: 'Search Bar Mockup', desc: '🔍 I\'m looking for... ➔' },
                      { id: 'connected-arc', name: 'Connected Arc', desc: 'Sweeping arc with progress bar' },
                      { id: 'notes-folder', name: 'Notes Folder Pill', desc: '📁 Swipe to view notes 4 >' },
                      { id: 'pill-arrow', name: 'Minimal SWIPE Pill', desc: 'Bordered SWIPE ➔ pill' },
                      { id: 'minimal-arrow', name: 'Watermark Arrow Line', desc: 'creatorkit.studio ────➔' },
                      { id: 'none', name: 'No Swipe Prompt', desc: 'Clean minimal bottom' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => updateCurrentSlide({ swipePromptType: s.id as SwipePromptType })}
                        className={`p-2.5 text-left border-2 font-mono ${currentSlide.swipePromptType === s.id
                            ? 'border-black bg-[#FFE500] shadow-[3px_3px_0px_#000]'
                            : 'border-gray-300 bg-[#F9F9F7] hover:border-black'
                          }`}
                      >
                        <div className="text-xs font-black">{s.name}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Swipe Text Controls */}
                {currentSlide.swipePromptType === 'search-bar' && (
                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      SEARCH BAR PLACEHOLDER
                    </label>
                    <input
                      type="text"
                      value={currentSlide.swipeSearchPlaceholder || ''}
                      placeholder="e.g. I'm looking for..."
                      onChange={(e) => updateCurrentSlide({ swipeSearchPlaceholder: e.target.value })}
                      className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                    />
                  </div>
                )}

                {currentSlide.swipePromptType === 'notes-folder' && (
                  <div>
                    <label className="block text-xs font-mono font-black uppercase mb-1">
                      NOTES BUTTON TEXT
                    </label>
                    <input
                      type="text"
                      value={currentSlide.swipePromptSubtext || ''}
                      placeholder="e.g. 📁 Swipe to view notes 4 >"
                      onChange={(e) => updateCurrentSlide({ swipePromptSubtext: e.target.value })}
                      className="w-full p-2 text-xs font-mono border-2 border-black bg-white"
                    />
                  </div>
                )}

                {/* Author Profile Block */}
                <div className="border-2 border-black p-4 bg-[#F9F9F7] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase">AUTHOR PROFILE CHIP</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!currentSlide.showAuthorBlock || currentSlide.layoutMode === 'tweet-card'}
                        onChange={(e) => updateCurrentSlide({ showAuthorBlock: e.target.checked })}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-xs font-mono font-bold">ENABLE</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-600 mb-1">
                        AUTHOR NAME
                      </label>
                      <input
                        type="text"
                        value={currentSlide.authorName || ''}
                        placeholder="e.g. Justas Markus"
                        onChange={(e) => updateCurrentSlide({ authorName: e.target.value })}
                        className="w-full p-1.5 text-xs font-mono border border-black bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-600 mb-1">
                        @HANDLE
                      </label>
                      <input
                        type="text"
                        value={currentSlide.authorHandle || ''}
                        placeholder="e.g. @JustasMarkus"
                        onChange={(e) => updateCurrentSlide({ authorHandle: e.target.value })}
                        className="w-full p-1.5 text-xs font-mono border border-black bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!currentSlide.authorVerified}
                        onChange={(e) => updateCurrentSlide({ authorVerified: e.target.checked })}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-xs font-mono font-bold">Verified Checkmark Badge (✓)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ICON SELECTOR MODAL */}
      {isIconModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-3 border-black w-full max-w-xl max-h-[80vh] flex flex-col shadow-[8px_8px_0px_#000]">
            {/* Modal Header */}
            <div className="border-b-2 border-black bg-[#FFE500] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiAwardLine className="w-5 h-5 text-black" />
                <h3 className="font-mono font-black text-sm uppercase">SELECT REMIX ICON</h3>
              </div>
              <button
                onClick={() => setIsIconModalOpen(false)}
                className="p-1 hover:bg-white border border-black transition-colors"
              >
                <RiCloseLine className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-3 border-b-2 border-black bg-[#F5F5F0] space-y-2">
              <div className="flex items-center gap-2 bg-white border border-black px-2 py-1.5">
                <RiSearchLine className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search icons (e.g. arrow, fire, rocket, check, search)..."
                  value={iconSearchQuery}
                  onChange={(e) => setIconSearchQuery(e.target.value)}
                  className="w-full text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                {['all', 'arrows', 'media', 'creator', 'actions', 'badge'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedIconCategory(cat)}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold border border-black ${selectedIconCategory === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#FFE500]'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filteredIcons.map((ic) => {
                const IconComponent = ic.component;
                return (
                  <button
                    key={ic.id}
                    onClick={() => {
                      updateCurrentSlide({ categoryBadgeIcon: ic.id });
                      setIsIconModalOpen(false);
                    }}
                    className="p-2 border border-gray-300 hover:border-black hover:bg-[#FFE500] flex flex-col items-center justify-center gap-1 transition-all group"
                  >
                    <IconComponent className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-mono truncate w-full text-center text-gray-700">
                      {ic.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
