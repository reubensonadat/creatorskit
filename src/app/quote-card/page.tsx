'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import {
  Sparkles,
  Camera,
  BookOpen,
  Smartphone,
  Flame,
  Layers,
  Palette,
  Type,
  Upload,
  Download,
  FolderArchive,
  RefreshCw,
  Copy,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  Sliders,
  Maximize2,
  Monitor,
  ExternalLink,
  Split,
  Eye,
  EyeOff,
  User,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  Paintbrush,
  Search,
} from 'lucide-react';
import { SlideItem, CreatorModeId, BackgroundType, AssetFrameType, AspectRatioPreset } from './types';
import {
  generateSmartHarmoniousTheme,
  CURATED_STUDIO_GRADIENTS,
  COLOR_KEYWORD_MAP,
} from './gradient-engine';
import { renderSlideToCanvas, CanvasRenderOptions } from './canvas-renderer';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';

// Standard Aspect Ratio Presets
const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '4:5', label: '4:5 · Instagram Feed Portrait (Recommended)', width: 1080, height: 1350, aspect: '4/5' },
  { id: '1:1', label: '1:1 · Square Post', width: 1080, height: 1080, aspect: '1/1' },
  { id: '9:16', label: '9:16 · Story / Reels / TikTok', width: 1080, height: 1920, aspect: '9/16' },
  { id: '16:9', label: '16:9 · YouTube / Landscape', width: 1920, height: 1080, aspect: '16/9' },
  { id: '3:4', label: '3:4 · Editorial / Pinterest', width: 1080, height: 1440, aspect: '3/4' },
  { id: 'original', label: '📸 Match Photo Ratio', width: 1920, height: 1080, aspect: 'auto' },
];

// 5 Main Creator Archetypes
const CREATOR_ARCHETYPES = [
  {
    id: 'studio-carousel' as CreatorModeId,
    name: '🚀 Studio Carousel & App Showcase',
    badge: 'Craftwork / Originkit',
    desc: 'Fluid mesh gradients, Mac browser window mockup, direct link pill, and slide counter',
    icon: Sparkles,
  },
  {
    id: 'editorial-book' as CreatorModeId,
    name: '📰 Editorial Grid & Literature Post',
    badge: 'Color Psychology / Kinfolk',
    desc: 'Graph paper grid, elegant serif typography, color palette cards, and author footer',
    icon: BookOpen,
  },
  {
    id: 'cinematic-meme' as CreatorModeId,
    name: '📸 Cinematic Photo & Comparison Breakdown',
    badge: 'Before / After / Meme',
    desc: 'Split comparison card, dark vignette, high-impact bold typography, and prompt breakdown',
    icon: Camera,
  },
  {
    id: 'mobile-showcase' as CreatorModeId,
    name: '📱 Mobile App Showcase & Cards',
    badge: 'iOS / Android Mockup',
    desc: 'Modern iPhone frame mockup, highlight badges, modern sans, and feature takeaway points',
    icon: Smartphone,
  },
  {
    id: 'cyber-engagement' as CreatorModeId,
    name: '⚡ Retro Dither & Engagement Prompt',
    badge: 'DM Lead Gen / Dither',
    desc: 'Halftone dither textures, comment prompt sticker pill, and high-contrast callout boxes',
    icon: Flame,
  },
];

export default function QuoteCardPage() {
  const [creatorMode, setCreatorMode] = useState<CreatorModeId>('studio-carousel');
  const [activeTab, setActiveTab] = useState<'background' | 'mockup' | 'content' | 'author' | 'typography'>('background');

  // Carousel Slides (1 to 10 slides)
  const [slides, setSlides] = useState<SlideItem[]>([
    {
      id: 'slide-1',
      categoryBadge: '@creator.studio · DEV TOOLS',
      eyebrowText: 'Swipe for start 👆',
      heroTitle: 'Rare Dev Tools You Need In 2026',
      highlightWords: 'Rare, 2026',
      subtitleText: 'Curated workflow tools developers use and designers approve',
      sectionNumber: '01',
      linkPillText: 'originkit.dev',
      linkPillType: 'direct-link',
      swipePrompt: '',
      authorName: 'Alex Creator',
      authorHandle: '@alexcreator',
      authorVerified: true,
      bgType: 'mesh',
      presetGradientId: 'liquid-silk-emerald',
      customGradColors: ['#00A86B', '#FF2A85', '#0052D4'],
      customGradAngle: 135,
      solidColor: '#09090b',
      meshPins: [
        { id: 1, color: '#00A86B', x: 18, y: 22 },
        { id: 2, color: '#FF2A85', x: 82, y: 28 },
        { id: 3, color: '#FFB800', x: 50, y: 78 },
        { id: 4, color: '#0052D4', x: 85, y: 82 },
        { id: 5, color: '#022C22', x: 20, y: 80 },
      ],
      meshWarpSize: 75,
      meshDiffusion: 65,
      gridColor: 'rgba(0,0,0,0.08)',
      gridSize: 44,
      assetFrameType: 'desktop-window',
      windowTheme: 'dark',
      phoneTheme: 'dark',
      beforeLabel: 'BEFORE',
      afterLabel: 'AFTER',
    },
    {
      id: 'slide-2',
      categoryBadge: '@creator.studio · COLOR THEORY',
      eyebrowText: '',
      heroTitle: 'Psychology Of Colors Every Designer Should Know',
      highlightWords: 'Colors, Designer',
      subtitleText: 'How color harmony alters user perception and brand trust',
      sectionNumber: '02',
      linkPillText: 'creatorkit.io',
      linkPillType: 'direct-link',
      swipePrompt: 'Swipe ➔',
      authorName: 'Studio Design',
      authorHandle: '@studiodesign',
      authorVerified: true,
      bgType: 'graph-grid',
      presetGradientId: 'editorial-graph-linen',
      customGradColors: ['#FDFBF7', '#FAF7F0', '#E5E5DE'],
      customGradAngle: 180,
      solidColor: '#FDFBF7',
      meshPins: [
        { id: 1, color: '#FDFBF7', x: 20, y: 20 },
        { id: 2, color: '#FAF7F0', x: 80, y: 20 },
      ],
      meshWarpSize: 70,
      meshDiffusion: 50,
      gridColor: 'rgba(0, 0, 0, 0.08)',
      gridSize: 42,
      assetFrameType: 'color-swatches',
      windowTheme: 'light',
      phoneTheme: 'silver',
      colorSwatches: [
        { name: 'Emerald', hex: '#10B981', desc: 'Calming' },
        { name: 'Sapphire', hex: '#3B82F6', desc: 'Trust' },
        { name: 'Crimson', hex: '#EF4444', desc: 'Urgency' },
        { name: 'Amber', hex: '#F59E0B', desc: 'Warmth' },
        { name: 'Violet', hex: '#8B5CF6', desc: 'Luxury' },
      ],
    },
    {
      id: 'slide-3',
      categoryBadge: '@creator.studio · AI ENHANCE',
      eyebrowText: 'Prompt Tested',
      heroTitle: '10 Prompts That Consistently Work In 2026',
      highlightWords: '10 Prompts, Work',
      subtitleText: '4K Upscaling & Ultra-Detail Cine Prompts for Midjourney & FLUX',
      sectionNumber: '03',
      linkPillText: 'TOOLS',
      linkPillType: 'comment-dm',
      swipePrompt: '',
      authorName: 'AI Engineer',
      authorHandle: '@aiworkflow',
      authorVerified: true,
      bgType: 'mesh',
      presetGradientId: 'obsidian-midnight-noir',
      customGradColors: ['#18181B', '#27272A', '#000000'],
      customGradAngle: 180,
      solidColor: '#09090b',
      meshPins: [
        { id: 1, color: '#18181B', x: 30, y: 20 },
        { id: 2, color: '#27272A', x: 70, y: 30 },
        { id: 3, color: '#09090B', x: 50, y: 70 },
        { id: 4, color: '#000000', x: 50, y: 90 },
      ],
      meshWarpSize: 75,
      meshDiffusion: 60,
      gridColor: 'rgba(255,255,255,0.06)',
      gridSize: 44,
      assetFrameType: 'split-comparison',
      windowTheme: 'dark',
      phoneTheme: 'dark',
      beforeLabel: 'RAW 1080P',
      afterLabel: '4K ENHANCED',
    },
  ]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = slides[activeSlideIndex] || slides[0];

  // Smart Gradient Input
  const [smartSeedColor, setSmartSeedColor] = useState('#00A86B');

  // Element Visibility Toggles
  const [showCounter, setShowCounter] = useState(true);
  const [counterPosition, setCounterPosition] = useState<'top-right' | 'top-left' | 'bottom-center'>('top-right');
  const [counterStyle, setCounterStyle] = useState<'pill' | 'minimal' | 'badge'>('pill');
  const [showCategoryBadge, setShowCategoryBadge] = useState(true);
  const [showEyebrow, setShowEyebrow] = useState(true);
  const [showHeroTitle, setShowHeroTitle] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showLinkPill, setShowLinkPill] = useState(true);
  const [showAuthorBlock, setShowAuthorBlock] = useState(false);
  const [showQuoteMarks, setShowQuoteMarks] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showInstagramMockup, setShowInstagramMockup] = useState(false);

  // Global Visual Controls
  const [aspectRatioId, setAspectRatioId] = useState('4:5');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [eyebrowFontFamily, setEyebrowFontFamily] = useState('Caveat');
  const [heroFontSize, setHeroFontSize] = useState(64);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState('#FFE500');
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [textVerticalPos, setTextVerticalPos] = useState<'center' | 'top' | 'bottom'>('center');
  const [bgBlur, setBgBlur] = useState(0);
  const [bgDimness, setBgDimness] = useState(0);
  const [bgGrain, setBgGrain] = useState(14);
  const [bgVignette, setBgVignette] = useState(10);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const secondaryScreenshotInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Compute Target Canvas Dimensions based on selected Aspect Ratio
  const currentDimensions = useMemo(() => {
    if (aspectRatioId === 'original' && activeSlide.photoImgEl) {
      const nw = activeSlide.photoImgEl.naturalWidth || 1920;
      const nh = activeSlide.photoImgEl.naturalHeight || 1080;
      return { width: nw, height: nh, aspect: `${nw}/${nh}`, label: `Original (${nw} × ${nh})`, id: 'original' };
    }
    const found = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectRatioId);
    return found || ASPECT_RATIO_PRESETS[0];
  }, [aspectRatioId, activeSlide.photoImgEl]);

  // Update Active Slide
  const updateActiveSlide = (fields: Partial<SlideItem>) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, ...fields } : s))
    );
  };

  // 1-Click Smart Theme Generator based on Seed Color
  const handleApplySmartTheme = (seedColor: string, applyToAll = false) => {
    const theme = generateSmartHarmoniousTheme(seedColor);
    setTextColor(theme.textColor);
    setAccentColor(theme.accentColor);

    const updateObj: Partial<SlideItem> = {
      bgType: 'mesh',
      meshPins: theme.meshPins,
      customGradColors: theme.customGradColors,
      solidColor: theme.baseHex,
    };

    if (applyToAll) {
      setSlides((prev) => prev.map((s) => ({ ...s, ...updateObj })));
    } else {
      updateActiveSlide(updateObj);
    }
  };

  // Apply Preset Gradient
  const handleSelectPresetGradient = (presetId: string) => {
    const preset = CURATED_STUDIO_GRADIENTS.find((g) => g.id === presetId);
    if (!preset) return;

    if (preset.id === 'editorial-graph-linen') {
      updateActiveSlide({
        bgType: 'graph-grid',
        presetGradientId: presetId,
        solidColor: '#FDFBF7',
        gridColor: 'rgba(0,0,0,0.08)',
      });
      setTextColor('#09090B');
      setAccentColor('#F59E0B');
    } else if (preset.id === 'retro-halftone-cloud') {
      updateActiveSlide({
        bgType: 'halftone-dither',
        presetGradientId: presetId,
        solidColor: '#18181B',
      });
      setTextColor('#FFFFFF');
      setAccentColor('#FFE500');
    } else if (preset.meshNodes && preset.meshNodes.length > 0) {
      updateActiveSlide({
        bgType: 'mesh',
        presetGradientId: presetId,
        meshPins: preset.meshNodes,
      });
      if (preset.id === 'pastel-peach-cotton') {
        setTextColor('#18181B');
        setAccentColor('#EA580C');
      } else {
        setTextColor('#FFFFFF');
        setAccentColor(preset.colors[1] || '#FFE500');
      }
    } else {
      updateActiveSlide({
        bgType: 'preset-gradient',
        presetGradientId: presetId,
      });
    }
  };

  // Add Slide
  const handleAddSlide = () => {
    if (slides.length >= 10) return;
    const nextGrad = CURATED_STUDIO_GRADIENTS[(slides.length) % CURATED_STUDIO_GRADIENTS.length];
    const newSlide: SlideItem = {
      id: `slide-${Date.now()}`,
      categoryBadge: activeSlide.categoryBadge || '@creator.studio',
      eyebrowText: '',
      heroTitle: `Point ${slides.length + 1}`,
      highlightWords: '',
      subtitleText: 'Key takeaway or workflow description',
      sectionNumber: String(slides.length + 1).padStart(2, '0'),
      linkPillText: activeSlide.linkPillText || 'originkit.dev',
      linkPillType: activeSlide.linkPillType || 'direct-link',
      swipePrompt: '',
      authorName: activeSlide.authorName || 'Creator',
      authorHandle: activeSlide.authorHandle || '@creator',
      authorVerified: true,
      bgType: activeSlide.bgType,
      presetGradientId: nextGrad.id,
      customGradColors: activeSlide.customGradColors,
      customGradAngle: activeSlide.customGradAngle,
      solidColor: activeSlide.solidColor,
      meshPins: nextGrad.meshNodes || activeSlide.meshPins,
      meshWarpSize: activeSlide.meshWarpSize,
      meshDiffusion: activeSlide.meshDiffusion,
      gridColor: activeSlide.gridColor,
      gridSize: activeSlide.gridSize,
      assetFrameType: activeSlide.assetFrameType,
      windowTheme: activeSlide.windowTheme,
      phoneTheme: activeSlide.phoneTheme,
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  };

  // Duplicate Slide
  const handleDuplicateSlide = () => {
    if (slides.length >= 10) return;
    const clone: SlideItem = {
      ...activeSlide,
      id: `slide-${Date.now()}`,
      heroTitle: `${activeSlide.heroTitle} (Copy)`,
    };
    const updated = [...slides];
    updated.splice(activeSlideIndex + 1, 0, clone);
    setSlides(updated);
    setActiveSlideIndex(activeSlideIndex + 1);
  };

  // Move Slide Left / Right
  const handleMoveSlide = (direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? activeSlideIndex - 1 : activeSlideIndex + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const updated = [...slides];
    const [moved] = updated.splice(activeSlideIndex, 1);
    updated.splice(targetIdx, 0, moved);
    setSlides(updated);
    setActiveSlideIndex(targetIdx);
  };

  // Delete Slide
  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    setSlides(updated);
    setActiveSlideIndex(Math.max(0, idx - 1));
  };

  // 1-Click Switch Creator Mode Archetypes with curated presets
  const handleSelectCreatorMode = (modeId: CreatorModeId) => {
    setCreatorMode(modeId);
    if (modeId === 'studio-carousel') {
      updateActiveSlide({
        assetFrameType: 'desktop-window',
        bgType: 'mesh',
        presetGradientId: 'liquid-silk-emerald',
      });
      setShowAppWindow(true);
      setShowCategoryBadge(true);
      setShowEyebrow(true);
      setShowLinkPill(true);
      setShowAuthorBlock(false);
      setShowQuoteMarks(false);
      setShowCounter(true);
      setTextAlign('center');
      setFontFamily('Inter');
      setTextColor('#FFFFFF');
      setAccentColor('#FFE500');
    } else if (modeId === 'editorial-book') {
      updateActiveSlide({
        assetFrameType: 'color-swatches',
        bgType: 'graph-grid',
        solidColor: '#FDFBF7',
      });
      setShowCategoryBadge(true);
      setShowEyebrow(false);
      setShowLinkPill(false);
      setShowAuthorBlock(true);
      setShowQuoteMarks(false);
      setShowCounter(false);
      setTextAlign('left');
      setFontFamily('Playfair Display');
      setTextColor('#09090B');
      setAccentColor('#EA580C');
    } else if (modeId === 'cinematic-meme') {
      updateActiveSlide({
        assetFrameType: 'split-comparison',
        bgType: 'mesh',
        presetGradientId: 'obsidian-midnight-noir',
        beforeLabel: 'RAW PROMPT',
        afterLabel: '4K ENHANCED',
      });
      setShowCategoryBadge(true);
      setShowEyebrow(true);
      setShowLinkPill(true);
      setShowAuthorBlock(false);
      setShowQuoteMarks(false);
      setShowCounter(true);
      setTextAlign('center');
      setFontFamily('Bebas Neue');
      setHeroFontSize(78);
      setTextColor('#FFFFFF');
      setAccentColor('#00D2DF');
      setBgVignette(35);
    } else if (modeId === 'mobile-showcase') {
      updateActiveSlide({
        assetFrameType: 'mobile-phone',
        bgType: 'mesh',
        presetGradientId: 'sunset-lavender-tangerine',
      });
      setShowCategoryBadge(true);
      setShowEyebrow(false);
      setShowLinkPill(true);
      setShowAuthorBlock(false);
      setShowQuoteMarks(false);
      setShowCounter(true);
      setTextAlign('center');
      setFontFamily('Plus Jakarta Sans');
      setTextColor('#FFFFFF');
      setAccentColor('#FEF08A');
    } else if (modeId === 'cyber-engagement') {
      updateActiveSlide({
        assetFrameType: 'none',
        bgType: 'halftone-dither',
        linkPillType: 'comment-dm',
        linkPillText: 'TOOLS',
      });
      setShowCategoryBadge(true);
      setShowEyebrow(true);
      setShowLinkPill(true);
      setShowAuthorBlock(true);
      setShowQuoteMarks(false);
      setShowCounter(true);
      setCounterStyle('badge');
      setTextAlign('center');
      setFontFamily('Space Grotesk');
      setTextColor('#FFFFFF');
      setAccentColor('#84CC16');
      setBgGrain(25);
    }
  };

  const setShowAppWindow = (show: boolean) => {
    updateActiveSlide({ assetFrameType: show ? 'desktop-window' : 'none' });
  };

  // Upload Handlers
  const handleUploadScreenshot = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      updateActiveSlide({
        screenshotUrl: url,
        screenshotImgEl: img,
      });
    };
    img.src = url;
  };

  const handleUploadSecondaryScreenshot = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      updateActiveSlide({
        secondaryScreenshotUrl: url,
        secondaryScreenshotImgEl: img,
      });
    };
    img.src = url;
  };

  const handleUploadBackgroundPhoto = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      updateActiveSlide({
        bgType: 'photo',
        photoUrl: url,
        photoImgEl: img,
      });
    };
    img.src = url;
  };

  const handleUploadAvatar = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      updateActiveSlide({
        avatarUrl: url,
        avatarImgEl: img,
      });
    };
    img.src = url;
  };

  // Canvas Drag & Drop
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (activeSlide.assetFrameType !== 'none') {
        handleUploadScreenshot(file);
      } else {
        handleUploadBackgroundPhoto(file);
      }
    }
  };

  // Render Options
  const canvasRenderOptions: CanvasRenderOptions = useMemo(
    () => ({
      width: currentDimensions.width,
      height: currentDimensions.height,
      showCounter,
      counterPosition,
      counterStyle,
      showCategoryBadge,
      showEyebrow,
      showHeroTitle,
      showSubtitle,
      showLinkPill,
      showAuthorBlock,
      showQuoteMarks,
      fontFamily,
      eyebrowFontFamily,
      heroFontSize,
      textColor,
      accentColor,
      textAlign,
      textVerticalPos,
      bgBlur,
      bgDimness,
      bgGrain,
      bgVignette,
      isBold,
      isItalic,
      drawGuides: showSafeZones,
    }),
    [
      currentDimensions,
      showCounter,
      counterPosition,
      counterStyle,
      showCategoryBadge,
      showEyebrow,
      showHeroTitle,
      showSubtitle,
      showLinkPill,
      showAuthorBlock,
      showQuoteMarks,
      fontFamily,
      eyebrowFontFamily,
      heroFontSize,
      textColor,
      accentColor,
      textAlign,
      textVerticalPos,
      bgBlur,
      bgDimness,
      bgGrain,
      bgVignette,
      isBold,
      isItalic,
      showSafeZones,
    ]
  );

  // Redraw preview canvas whenever state updates
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    renderSlideToCanvas(canvas, activeSlide, activeSlideIndex + 1, slides.length, canvasRenderOptions);
  }, [activeSlide, activeSlideIndex, slides.length, canvasRenderOptions]);

  // Export Single Slide (4K PNG)
  const handleExportSingleSlide = () => {
    const exportCanvas = document.createElement('canvas');
    renderSlideToCanvas(exportCanvas, activeSlide, activeSlideIndex + 1, slides.length, {
      ...canvasRenderOptions,
      drawGuides: false,
    });

    const link = document.createElement('a');
    link.download = `slide-${activeSlideIndex + 1}-${activeSlide.heroTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'card'}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Export All Slides as ZIP (4K PNG Archive)
  const handleExportAllZip = async () => {
    setIsExporting(true);
    setExportProgress('Rendering 4K carousel slides...');

    try {
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        setExportProgress(`Rendering slide ${i + 1} of ${slides.length}...`);
        const slide = slides[i];
        const exportCanvas = document.createElement('canvas');
        renderSlideToCanvas(exportCanvas, slide, i + 1, slides.length, {
          ...canvasRenderOptions,
          drawGuides: false,
        });

        const dataUrl = exportCanvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        const fileName = `slide-${String(i + 1).padStart(2, '0')}-${slide.heroTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'post'}.png`;
        zip.file(fileName, base64Data, { base64: true });
      }

      setExportProgress('Compressing 4K ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `creatorkit-carousel-${slides.length}-slides.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
      setExportProgress(null);
    } catch (err) {
      console.error('ZIP Export failed:', err);
      setExportProgress('Failed to export ZIP.');
      setTimeout(() => setExportProgress(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100%', padding: '20px 24px 80px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Hidden File Inputs */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadScreenshot(e.target.files[0]);
          }
        }}
      />
      <input
        ref={secondaryScreenshotInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadSecondaryScreenshot(e.target.files[0]);
          }
        }}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadBackgroundPhoto(e.target.files[0]);
          }
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadAvatar(e.target.files[0]);
          }
        }}
      />

      {/* Top Header */}
      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.12em',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              background: '#09090b',
              padding: '3px 8px',
              border: '2px solid #000',
              borderRadius: 4,
            }}
          >
            VISUAL POST & CAROUSEL STUDIO
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#666', fontFamily: 'monospace' }}>
            5 CREATOR ARCHETYPES · 4K PNG / MULTI-SLIDE ZIP
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#000', textTransform: 'uppercase', margin: 0 }}>
            Visual Post & Quote Card Studio
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#555', maxWidth: 760, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            Create carousel covers, app mockups, editorial quotes, and comparison breakdowns with liquid mesh gradients and layer-by-layer control.
          </p>
        </div>
      </div>

      {/* 5 Creator Archetypes Switcher Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 18 }}>
        {CREATOR_ARCHETYPES.map((mode) => {
          const Icon = mode.icon;
          const isActive = creatorMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleSelectCreatorMode(mode.id)}
              style={{
                padding: '12px 14px',
                border: '2px solid #000',
                borderRadius: 6,
                background: isActive ? '#09090b' : '#ffffff',
                color: isActive ? '#ffffff' : '#000000',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: isActive ? '3px 3px 0 #000' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={15} style={{ color: isActive ? '#FFE500' : '#000' }} />
                  <span style={{ fontWeight: 900, fontSize: '0.78rem' }}>{mode.name.split('&')[0]}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.58rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 3,
                    background: isActive ? '#27272a' : '#f4f4f5',
                    color: isActive ? '#FFE500' : '#555',
                  }}
                >
                  {mode.badge}
                </span>
              </div>
              <span style={{ fontSize: '0.66rem', color: isActive ? 'rgba(255, 255, 255, 0.75)' : '#666', lineHeight: 1.35 }}>
                {mode.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Multi-Slide Navigation Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
          overflowX: 'auto',
          padding: '8px 12px',
          background: '#f4f4f5',
          border: '2px solid #000',
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#000', whiteSpace: 'nowrap' }}>
          Slides ({slides.length}/10):
        </span>
        {slides.map((s, idx) => {
          const isActive = activeSlideIndex === idx;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSlideIndex(idx)}
              style={{
                padding: '6px 12px',
                border: '2px solid #000',
                borderRadius: 4,
                background: isActive ? '#09090b' : '#ffffff',
                color: isActive ? '#ffffff' : '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: isActive ? '#FFE500' : '#777' }}>#{idx + 1}</span>
              <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.heroTitle || 'Slide'}
              </span>
            </button>
          );
        })}

        {/* Slide Management Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <button
            onClick={() => handleMoveSlide('left')}
            disabled={activeSlideIndex === 0}
            className="brutalist-button"
            style={{ padding: '6px 8px', fontSize: '0.72rem', borderRadius: 4, background: '#fff', opacity: activeSlideIndex === 0 ? 0.4 : 1 }}
            title="Move slide left"
          >
            <ArrowLeft size={13} />
          </button>
          <button
            onClick={() => handleMoveSlide('right')}
            disabled={activeSlideIndex === slides.length - 1}
            className="brutalist-button"
            style={{ padding: '6px 8px', fontSize: '0.72rem', borderRadius: 4, background: '#fff', opacity: activeSlideIndex === slides.length - 1 ? 0.4 : 1 }}
            title="Move slide right"
          >
            <ArrowRight size={13} />
          </button>

          {slides.length < 10 && (
            <>
              <button
                onClick={handleDuplicateSlide}
                className="brutalist-button"
                style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, background: '#fff' }}
                title="Duplicate current slide"
              >
                <Copy size={13} /> Duplicate
              </button>
              <button
                onClick={handleAddSlide}
                className="brutalist-button"
                style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, background: '#FFE500' }}
              >
                <Plus size={14} /> Add Slide
              </button>
            </>
          )}

          {slides.length > 1 && (
            <button
              onClick={() => handleDeleteSlide(activeSlideIndex)}
              className="brutalist-button"
              style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626' }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace 2-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.3fr) minmax(390px, 480px)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Stage Canvas & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            className="brutalist-card"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleCanvasDrop}
            style={{
              background: '#121215',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 580,
              position: 'relative',
              boxShadow: '6px 6px 0 #000',
              border: isDraggingOver ? '3px dashed #FFE500' : '3px solid #000',
              transition: 'border 0.15s',
            }}
          >
            {/* Live Instagram Feed Mockup Wrapper */}
            {showInstagramMockup ? (
              <div
                style={{
                  background: '#000000',
                  borderRadius: 16,
                  border: '3px solid #27272a',
                  padding: '12px 14px',
                  width: '100%',
                  maxWidth: 480,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                }}
              >
                {/* Instagram Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFE500', border: '1.5px solid #fff' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>craftwork.design</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800 }}>Following</span>
                </div>

                {/* Canvas Inside Mockup */}
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    aspectRatio: currentDimensions.aspect,
                    objectFit: 'contain',
                  }}
                />

                {/* Instagram Bottom Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Heart size={18} />
                    <MessageCircle size={18} />
                    <Share2 size={18} />
                  </div>
                  <Bookmark size={18} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  <strong style={{ color: '#fff' }}>3,605 likes</strong> · {activeSlide.heroTitle}
                </div>
              </div>
            ) : (
              /* Direct Canvas Stage */
              <canvas
                ref={previewCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  height: 'auto',
                  border: '3px solid #000',
                  borderRadius: 8,
                  boxShadow: '0 14px 40px rgba(0,0,0,0.6)',
                  aspectRatio: currentDimensions.aspect,
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Canvas Bottom Tooling Bar */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
              {/* Aspect Ratio Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {ASPECT_RATIO_PRESETS.map((a) => {
                  const isActive = aspectRatioId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAspectRatioId(a.id)}
                      style={{
                        padding: '5px 10px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: isActive ? '#09090b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#000000',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                      }}
                    >
                      {a.id}
                    </button>
                  );
                })}
              </div>

              {/* Safe Zone & Feed Preview Toggles */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setShowInstagramMockup(!showInstagramMockup)}
                  className="brutalist-button"
                  style={{
                    fontSize: '0.72rem',
                    padding: '6px 10px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: showInstagramMockup ? '#09090b' : '#ffffff',
                    color: showInstagramMockup ? '#ffffff' : '#000000',
                  }}
                >
                  <Smartphone size={13} /> Feed Preview
                </button>
                <button
                  onClick={() => setShowSafeZones(!showSafeZones)}
                  className="brutalist-button"
                  style={{
                    fontSize: '0.72rem',
                    padding: '6px 10px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: showSafeZones ? '#FFE500' : '#ffffff',
                  }}
                >
                  <ShieldCheck size={13} /> Safe Zones
                </button>
              </div>
            </div>

            {/* Export Progress Notification */}
            {exportProgress && (
              <div
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '10px 14px',
                  border: '2px solid #000',
                  borderRadius: 4,
                  background: '#fef08a',
                  color: '#000',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={15} />
                {exportProgress}
              </div>
            )}
          </div>

          {/* Quick Export Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 12 }}>
            <button
              onClick={handleExportSingleSlide}
              className="brutalist-button"
              style={{
                padding: '12px 18px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '4px 4px 0 #000',
                background: '#ffffff',
              }}
            >
              <Download size={17} />
              Export Slide #{activeSlideIndex + 1} (PNG)
            </button>

            <button
              onClick={handleExportAllZip}
              disabled={isExporting}
              className="brutalist-button brutalist-button-primary"
              style={{
                padding: '12px 18px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '4px 4px 0 #000',
              }}
            >
              <FolderArchive size={17} />
              Export All {slides.length} Slides (ZIP)
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabbed Studio Control Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sub-Tabs for Controls */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'background', label: '🎨 Background & Mesh', icon: Palette },
              { id: 'mockup', label: '🖼️ Asset & Mockups', icon: Layers },
              { id: 'content', label: '✍️ Content & Text', icon: Type },
              { id: 'author', label: '👤 Author & Badges', icon: User },
              { id: 'typography', label: '🔤 Font & Polish', icon: Sliders },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '7px 12px',
                    border: '2px solid #000',
                    borderRadius: 4,
                    background: isActive ? '#09090b' : '#ffffff',
                    color: isActive ? '#ffffff' : '#000000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Background & Smart Gradient Studio */}
          {activeTab === 'background' && (
            <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Background Source Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  Background Style
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(['mesh', 'preset-gradient', 'graph-grid', 'halftone-dither', 'custom-gradient', 'photo', 'solid'] as BackgroundType[]).map((bType) => (
                    <button
                      key={bType}
                      onClick={() => updateActiveSlide({ bgType: bType })}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.62rem',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        border: '1.5px solid #000',
                        borderRadius: 3,
                        background: activeSlide.bgType === bType ? '#09090b' : '#ffffff',
                        color: activeSlide.bgType === bType ? '#ffffff' : '#000000',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {bType === 'preset-gradient' ? 'Preset' : bType === 'custom-gradient' ? 'Linear' : bType}
                    </button>
                  ))}
                </div>
              </div>

              {/* ✨ Smart 1-Click Palette & Mesh Generator */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '2px solid #000',
                  borderRadius: 6,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace' }}>
                      SMART PALETTE & MESH GENERATOR
                    </span>
                  </div>
                  <Link
                    href="/color-gradient"
                    target="_blank"
                    style={{ fontSize: '0.65rem', fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                  >
                    Open Gradient Studio <ExternalLink size={11} />
                  </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={smartSeedColor}
                    onChange={(e) => setSmartSeedColor(e.target.value)}
                    style={{ width: 44, height: 34, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={smartSeedColor}
                    onChange={(e) => setSmartSeedColor(e.target.value)}
                    placeholder="Hex or color (e.g. #00A86B, amber, lavender)"
                    style={{ flex: 1, padding: '7px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <button
                    onClick={() => handleApplySmartTheme(smartSeedColor, false)}
                    className="brutalist-button brutalist-button-primary"
                    style={{ padding: '7px 12px', fontSize: '0.72rem', whiteSpace: 'nowrap', gap: 4 }}
                  >
                    <RefreshCw size={13} /> Generate Mesh
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.62rem', color: '#666' }}>
                    Calculates HSL physics, harmonious mesh pins & WCAG contrast text.
                  </span>
                  <button
                    onClick={() => handleApplySmartTheme(smartSeedColor, true)}
                    style={{ background: 'none', border: 'none', color: '#000', fontSize: '0.64rem', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Apply to all {slides.length} slides
                  </button>
                </div>
              </div>

              {/* Studio Curated Gradient Presets */}
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 6 }}>
                  CURATED STUDIO PRESETS:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {CURATED_STUDIO_GRADIENTS.map((g) => {
                    const isActive = activeSlide.presetGradientId === g.id && (activeSlide.bgType === 'mesh' || activeSlide.bgType === 'preset-gradient' || activeSlide.bgType === 'graph-grid');
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleSelectPresetGradient(g.id)}
                        style={{
                          height: 54,
                          background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1] || g.colors[0]})`,
                          border: isActive ? '3px solid #000' : '1.5px solid rgba(0,0,0,0.3)',
                          borderRadius: 6,
                          boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,0.65)', padding: '1px 5px', borderRadius: 3, width: 'fit-content' }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)', padding: '1px 4px', borderRadius: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {g.description.slice(0, 30)}...
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Upload Options */}
              {activeSlide.bgType === 'photo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="brutalist-button"
                    style={{ padding: '9px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff' }}
                  >
                    <Upload size={14} />
                    {activeSlide.photoUrl ? 'Replace Background Photo' : 'Upload Background Photo'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>BLUR: {bgBlur}px</span>
                      <input type="range" min={0} max={25} value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>DIM: {bgDimness}%</span>
                      <input type="range" min={0} max={85} value={bgDimness} onChange={(e) => setBgDimness(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Graph Grid / Solid controls */}
              {activeSlide.bgType === 'graph-grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>CANVAS COLOR:</span>
                    <input
                      type="color"
                      value={activeSlide.solidColor || '#FDFBF7'}
                      onChange={(e) => updateActiveSlide({ solidColor: e.target.value })}
                      style={{ width: '100%', height: 32, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>GRID SIZE: {activeSlide.gridSize || 44}px</span>
                    <input
                      type="range"
                      min={20}
                      max={80}
                      value={activeSlide.gridSize || 44}
                      onChange={(e) => updateActiveSlide({ gridSize: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Custom Linear Gradient */}
              {activeSlide.bgType === 'custom-gradient' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {activeSlide.customGradColors.map((col, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800 }}>Stop {idx + 1}</span>
                        <input
                          type="color"
                          value={col}
                          onChange={(e) => {
                            const newColors = [...activeSlide.customGradColors] as [string, string, string];
                            newColors[idx] = e.target.value;
                            updateActiveSlide({ customGradColors: newColors });
                          }}
                          style={{ width: '100%', height: 32, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800 }}>
                      <span>ANGLE:</span>
                      <span>{activeSlide.customGradAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={activeSlide.customGradAngle}
                      onChange={(e) => updateActiveSlide({ customGradAngle: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Asset & Mockups Layer */}
          {activeTab === 'mockup' && (
            <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                🖼️ Mockup & Asset Frame Layer
              </span>

              {/* Asset Frame Type Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { id: 'desktop-window', label: '🖥️ Desktop Window' },
                  { id: 'mobile-phone', label: '📱 Mobile Phone' },
                  { id: 'split-comparison', label: '⚖️ Split Before/After' },
                  { id: 'color-swatches', label: '🎨 Color Palette' },
                  { id: 'none', label: '🚫 Pure Typography' },
                ].map((af) => {
                  const isActive = activeSlide.assetFrameType === af.id;
                  return (
                    <button
                      key={af.id}
                      onClick={() => updateActiveSlide({ assetFrameType: af.id as AssetFrameType })}
                      style={{
                        padding: '10px 8px',
                        border: '2px solid #000',
                        borderRadius: 4,
                        background: isActive ? '#09090b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#000000',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                      }}
                    >
                      {af.label}
                    </button>
                  );
                })}
              </div>

              {/* Desktop Window Controls */}
              {activeSlide.assetFrameType === 'desktop-window' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => screenshotInputRef.current?.click()}
                    className="brutalist-button"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.78rem',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: activeSlide.screenshotUrl ? '#dcfce7' : '#ffffff',
                    }}
                  >
                    <Upload size={14} />
                    {activeSlide.screenshotUrl ? 'Replace App Screenshot' : 'Upload App Mockup Screenshot'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>WINDOW THEME:</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['dark', 'light', 'glass'] as const).map((wt) => (
                        <button
                          key={wt}
                          onClick={() => updateActiveSlide({ windowTheme: wt })}
                          style={{
                            padding: '4px 10px',
                            border: '1.5px solid #000',
                            borderRadius: 3,
                            background: activeSlide.windowTheme === wt ? '#09090b' : '#fff',
                            color: activeSlide.windowTheme === wt ? '#fff' : '#000',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            textTransform: 'capitalize',
                          }}
                        >
                          {wt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Phone Controls */}
              {activeSlide.assetFrameType === 'mobile-phone' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => screenshotInputRef.current?.click()}
                    className="brutalist-button"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.78rem',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: activeSlide.screenshotUrl ? '#dcfce7' : '#ffffff',
                    }}
                  >
                    <Upload size={14} />
                    {activeSlide.screenshotUrl ? 'Replace Mobile Screenshot' : 'Upload Mobile Screenshot'}
                  </button>
                </div>
              )}

              {/* Split Comparison Controls */}
              {activeSlide.assetFrameType === 'split-comparison' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>LEFT LABEL:</label>
                      <input
                        type="text"
                        value={activeSlide.beforeLabel || 'BEFORE'}
                        onChange={(e) => updateActiveSlide({ beforeLabel: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}
                      />
                      <button
                        onClick={() => screenshotInputRef.current?.click()}
                        className="brutalist-button"
                        style={{ width: '100%', marginTop: 6, padding: '6px 8px', fontSize: '0.68rem', background: '#fff' }}
                      >
                        <Upload size={12} style={{ display: 'inline', marginRight: 4 }} /> Left Image
                      </button>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>RIGHT LABEL:</label>
                      <input
                        type="text"
                        value={activeSlide.afterLabel || 'AFTER'}
                        onChange={(e) => updateActiveSlide({ afterLabel: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}
                      />
                      <button
                        onClick={() => secondaryScreenshotInputRef.current?.click()}
                        className="brutalist-button"
                        style={{ width: '100%', marginTop: 6, padding: '6px 8px', fontSize: '0.68rem', background: '#FFE500' }}
                      >
                        <Upload size={12} style={{ display: 'inline', marginRight: 4 }} /> Right Image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Color Palette Cards Controls */}
              {activeSlide.assetFrameType === 'color-swatches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                    PALETTE CARDS (5 SWATCHES):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {(activeSlide.colorSwatches || [
                      { name: 'Emerald', hex: '#10B981' },
                      { name: 'Sapphire', hex: '#3B82F6' },
                      { name: 'Crimson', hex: '#EF4444' },
                      { name: 'Amber', hex: '#F59E0B' },
                      { name: 'Violet', hex: '#8B5CF6' },
                    ]).map((swatch, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          type="color"
                          value={swatch.hex}
                          onChange={(e) => {
                            const newSwatches = [...(activeSlide.colorSwatches || [])];
                            newSwatches[idx] = { ...swatch, hex: e.target.value };
                            updateActiveSlide({ colorSwatches: newSwatches });
                          }}
                          style={{ width: '100%', height: 28, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={swatch.name}
                          onChange={(e) => {
                            const newSwatches = [...(activeSlide.colorSwatches || [])];
                            newSwatches[idx] = { ...swatch, name: e.target.value };
                            updateActiveSlide({ colorSwatches: newSwatches });
                          }}
                          style={{ width: '100%', padding: '2px 4px', border: '1.5px solid #000', borderRadius: 3, fontSize: '0.62rem', fontWeight: 800, textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Content & Text */}
          {activeTab === 'content' && (
            <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                ✍️ Content & Copy (Slide #{activeSlideIndex + 1})
              </span>

              {/* Main Headline */}
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  MAIN HEADLINE / QUOTE BODY:
                </label>
                <textarea
                  rows={3}
                  value={activeSlide.heroTitle}
                  onChange={(e) => updateActiveSlide({ heroTitle: e.target.value })}
                  placeholder="Dev Tools / Inspiring Quote / Main Takeaway"
                  style={{ width: '100%', padding: '8px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.85rem', fontWeight: 900, resize: 'none' }}
                />
              </div>

              {/* Highlight Words */}
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  ✨ HIGHLIGHT WORDS (ACCENT COLOR):
                </label>
                <input
                  type="text"
                  value={activeSlide.highlightWords || ''}
                  onChange={(e) => updateActiveSlide({ highlightWords: e.target.value })}
                  placeholder="e.g. Rare, 2026 (comma separated)"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  SUBTITLE / KEY TAKEAWAY:
                </label>
                <input
                  type="text"
                  value={activeSlide.subtitleText}
                  onChange={(e) => updateActiveSlide({ subtitleText: e.target.value })}
                  placeholder="Additional context or bullet takeaway"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}
                />
              </div>

              {/* Eyebrow & Category Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    CATEGORY BADGE:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.categoryBadge}
                    onChange={(e) => updateActiveSlide({ categoryBadge: e.target.value })}
                    placeholder="@brand · DEV TOOLS"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    EYEBROW SCRIPT / CUE:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.eyebrowText}
                    onChange={(e) => updateActiveSlide({ eyebrowText: e.target.value })}
                    placeholder="Swipe for start 👆"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Direct Link / Engagement Pill */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    DIRECT LINK / CALLOUT:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.linkPillText}
                    onChange={(e) => updateActiveSlide({ linkPillText: e.target.value })}
                    placeholder="originkit.dev or KEYWORD"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    PILL STYLE:
                  </label>
                  <select
                    value={activeSlide.linkPillType || 'direct-link'}
                    onChange={(e) => updateActiveSlide({ linkPillType: e.target.value as any })}
                    style={{ width: '100%', padding: '6px', border: '2px solid #000', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}
                  >
                    <option value="direct-link">🔗 Direct Link (🔗 site.com)</option>
                    <option value="comment-dm">💬 Comment Prompt (Comment for DM)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Author & Badges */}
          {activeTab === 'author' && (
            <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                👤 Author & Social Badges
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    AUTHOR / BRAND NAME:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.authorName}
                    onChange={(e) => updateActiveSlide({ authorName: e.target.value })}
                    placeholder="Alex Creator"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    HANDLE / TITLE:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.authorHandle}
                    onChange={(e) => updateActiveSlide({ authorHandle: e.target.value })}
                    placeholder="@alexcreator"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activeSlide.authorVerified}
                    onChange={(e) => updateActiveSlide({ authorVerified: e.target.checked })}
                  />
                  Verified Checkmark Badge (Blue Tick)
                </label>

                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="brutalist-button"
                  style={{ padding: '6px 10px', fontSize: '0.7rem', background: '#fff' }}
                >
                  <Upload size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {activeSlide.avatarUrl ? 'Replace Avatar' : 'Upload Avatar'}
                </button>
              </div>

              {/* Slide Counter Settings */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Slide Counter Options
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>POSITION:</label>
                    <select
                      value={counterPosition}
                      onChange={(e) => setCounterPosition(e.target.value as any)}
                      style={{ width: '100%', padding: '6px', border: '2px solid #000', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}
                    >
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="bottom-center">Bottom Center</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>STYLE:</label>
                    <select
                      value={counterStyle}
                      onChange={(e) => setCounterStyle(e.target.value as any)}
                      style={{ width: '100%', padding: '6px', border: '2px solid #000', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}
                    >
                      <option value="pill">Dark Glass Pill</option>
                      <option value="badge">Cyber Yellow Badge</option>
                      <option value="minimal">Minimal Text</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Typography & Polish */}
          {activeTab === 'typography' && (
            <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                🔤 Typography & Canvas Polish
              </span>

              {/* Font Family & Alignment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>PRIMARY FONT:</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    style={{ width: '100%', padding: '6px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}
                  >
                    {GOOGLE_FONTS_LIST.slice(0, 35).map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>ALIGNMENT:</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['left', 'center', 'right'] as const).map((al) => (
                      <button
                        key={al}
                        onClick={() => setTextAlign(al)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          border: '1.5px solid #000',
                          borderRadius: 3,
                          background: textAlign === al ? '#09090b' : '#fff',
                          color: textAlign === al ? '#fff' : '#000',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                        }}
                      >
                        {al}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Colors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>TEXT COLOR:</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{ width: 36, height: 30, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{ width: 75, padding: '4px', border: '1.5px solid #000', borderRadius: 3, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800 }}
                    />
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>ACCENT / HIGHLIGHT:</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: 36, height: 30, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: 75, padding: '4px', border: '1.5px solid #000', borderRadius: 3, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800 }}
                    />
                  </div>
                </div>
              </div>

              {/* Font Size & Grain */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>SIZE: {heroFontSize}px</span>
                  <input type="range" min={32} max={110} value={heroFontSize} onChange={(e) => setHeroFontSize(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>GRAIN NOISE: {bgGrain}%</span>
                  <input type="range" min={0} max={45} value={bgGrain} onChange={(e) => setBgGrain(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Vignette & Dimness */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>VIGNETTE: {bgVignette}%</span>
                  <input type="range" min={0} max={70} value={bgVignette} onChange={(e) => setBgVignette(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>DIM OVERLAY: {bgDimness}%</span>
                  <input type="range" min={0} max={75} value={bgDimness} onChange={(e) => setBgDimness(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Visibility Checklist */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Layer Element Visibility
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showCounter} onChange={(e) => setShowCounter(e.target.checked)} />
                    Slide Counter
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showCategoryBadge} onChange={(e) => setShowCategoryBadge(e.target.checked)} />
                    Category Badge
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} />
                    Eyebrow Cue
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showLinkPill} onChange={(e) => setShowLinkPill(e.target.checked)} />
                    Direct Link Pill
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showAuthorBlock} onChange={(e) => setShowAuthorBlock(e.target.checked)} />
                    Author Profile
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showQuoteMarks} onChange={(e) => setShowQuoteMarks(e.target.checked)} />
                    Quote Marks (“”)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
