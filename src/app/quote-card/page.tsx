'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import {
  Type,
  Download,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Layers,
  Check,
  RotateCcw,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  FileSpreadsheet,
  Zap,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck,
  FolderArchive,
  Grid,
  Maximize2,
  Ratio,
  Palette,
  MoveVertical,
  MoveHorizontal,
  Bold,
  Italic,
  Monitor,
  Link2,
  Hash,
  Share2,
  MessageSquare,
  BookOpen,
  Camera,
  ExternalLink,
  Flame,
  CheckCircle,
  Settings2,
  ArrowLeft,
  ArrowRight,
  Heart,
  Bookmark,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';

// Standard Aspect Ratio Presets
const ASPECT_RATIO_PRESETS = [
  { id: '4:5', label: '4:5 · Instagram Feed Portrait (Recommended)', width: 1080, height: 1350, aspect: '4/5' },
  { id: '1:1', label: '1:1 · Square Post', width: 1080, height: 1080, aspect: '1/1' },
  { id: '9:16', label: '9:16 · Story / Reels / TikTok', width: 1080, height: 1920, aspect: '9/16' },
  { id: '16:9', label: '16:9 · YouTube / Landscape', width: 1920, height: 1080, aspect: '16/9' },
  { id: '3:4', label: '3:4 · Editorial / Pinterest', width: 1080, height: 1440, aspect: '3/4' },
  { id: 'original', label: '📸 Match Photo Ratio', width: 1920, height: 1080, aspect: 'auto' },
];

// 5 Main Creator Archetypes
const CREATOR_MODES = [
  {
    id: 'studio-carousel',
    name: '🚀 Studio Carousel (Craftwork Style)',
    desc: 'Gradient backgrounds, device window mockup frames, slide counter, and link pills',
    icon: Sparkles,
  },
  {
    id: 'photo-quote',
    name: '📸 Photo & Cinematic Quote',
    desc: 'Upload photo with elegant typography, dimming, author line, and zero forced boxes',
    icon: Camera,
  },
  {
    id: 'social-tweet',
    name: '💬 Twitter / X Verified Card',
    desc: 'Profile avatar, display name, handle, verified blue checkmark, and social metrics',
    icon: MessageSquare,
  },
  {
    id: 'editorial-book',
    name: '📜 Kinfolk / Editorial Book Card',
    desc: 'Giant quotation marks, serif literature typography, divider line, and book source',
    icon: BookOpen,
  },
  {
    id: 'cyber-brutalist',
    name: '⚡ Cyber Brutalist & Meme Graphic',
    desc: 'High-impact geometric font, sticker tags, high-contrast black box with drop shadow',
    icon: Flame,
  },
];

// Rich Studio Gradients
const STUDIO_GRADIENTS = [
  {
    id: 'emerald-neon-silk',
    name: 'Liquid Silk Emerald & Coral',
    colors: ['#00A86B', '#FF2A85', '#FFB800', '#0052D4'],
  },
  {
    id: 'espresso-amber',
    name: 'Espresso Amber Glow',
    colors: ['#1A0B05', '#582C12', '#9A3412', '#2A1208'],
  },
  {
    id: 'forest-pine-jade',
    name: 'Forest Pine & Jade Aura',
    colors: ['#064E3B', '#047857', '#022C22', '#10B981'],
  },
  {
    id: 'cobalt-sapphire-cyan',
    name: 'Cobalt Sapphire & Cyber Cyan',
    colors: ['#0B192C', '#1E3E62', '#00D2DF', '#000000'],
  },
  {
    id: 'sunset-violet-peach',
    name: 'Sunset Lavender & Tangerine',
    colors: ['#7C3AED', '#EC4899', '#F97316', '#FEF08A'],
  },
  {
    id: 'pure-midnight-noir',
    name: 'Studio Midnight Carbon',
    colors: ['#18181B', '#09090B', '#000000'],
  },
];

export interface SlideItem {
  id: string;
  categoryBadge: string;
  eyebrowText: string;
  heroTitle: string;
  subtitleText: string;
  authorName: string;
  authorHandle: string;
  linkPillText: string;
  swipePrompt: string;
  screenshotUrl?: string;
  screenshotImgEl?: HTMLImageElement | null;
  bgType: 'gradient' | 'photo' | 'solid' | 'custom-gradient';
  gradientId: string;
  customGradColors: [string, string, string];
  customGradAngle: number;
  photoUrl?: string;
  photoImgEl?: HTMLImageElement | null;
  solidColor: string;
}

export default function QuoteCardPage() {
  // Creator Mode State
  const [creatorMode, setCreatorMode] = useState<'studio-carousel' | 'photo-quote' | 'social-tweet' | 'editorial-book' | 'cyber-brutalist'>('studio-carousel');

  // Carousel Slides (1 to 10 slides) - Creator First Content
  const [slides, setSlides] = useState<SlideItem[]>([
    {
      id: 'slide-1',
      categoryBadge: '@creator.studio · FILMMAKING',
      eyebrowText: 'Pro Creator Guide',
      heroTitle: '10 Video Editing Hacks',
      subtitleText: 'To 10x Watch Time & Viewer Retention',
      authorName: 'Alex Filmmaker',
      authorHandle: '@alexcreator',
      linkPillText: '',
      swipePrompt: 'Swipe for start 👆',
      bgType: 'gradient',
      gradientId: 'emerald-neon-silk',
      customGradColors: ['#00A86B', '#FF2A85', '#0052D4'],
      customGradAngle: 135,
      solidColor: '#09090b',
    },
    {
      id: 'slide-2',
      categoryBadge: '@creator.studio',
      eyebrowText: '',
      heroTitle: 'DaVinci Color Grading',
      subtitleText: 'Mastering Cine-Look Curves & Natural Skin Tones',
      authorName: 'Colorist Team',
      authorHandle: '@colorist',
      linkPillText: 'creator.tips',
      swipePrompt: '',
      bgType: 'gradient',
      gradientId: 'espresso-amber',
      customGradColors: ['#1A0B05', '#9A3412', '#2A1208'],
      customGradAngle: 180,
      solidColor: '#09090b',
    },
    {
      id: 'slide-3',
      categoryBadge: '@creator.studio',
      eyebrowText: '',
      heroTitle: 'Loudness Normalizer',
      subtitleText: 'Integrated -14 LUFS Audio for YouTube & Spotify',
      authorName: 'Audio Studio',
      authorHandle: '@audiokit',
      linkPillText: 'audiokit.io',
      swipePrompt: '',
      bgType: 'gradient',
      gradientId: 'forest-pine-jade',
      customGradColors: ['#064E3B', '#10B981', '#011812'],
      customGradAngle: 135,
      solidColor: '#09090b',
    },
  ]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = slides[activeSlideIndex] || slides[0];

  // Optional Element Visibility Toggles (Counter OFF by default for clean look)
  const [showCounter, setShowCounter] = useState(false);
  const [counterPosition, setCounterPosition] = useState<'top-right' | 'top-left' | 'bottom-center'>('top-right');
  const [showCategoryBadge, setShowCategoryBadge] = useState(true);
  const [showEyebrow, setShowEyebrow] = useState(true);
  const [showHeroTitle, setShowHeroTitle] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showAppWindowFrame, setShowAppWindowFrame] = useState(true);
  const [showLinkPill, setShowLinkPill] = useState(true);
  const [showAuthorBlock, setShowAuthorBlock] = useState(false);
  const [showQuoteMarks, setShowQuoteMarks] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showInstagramMockup, setShowInstagramMockup] = useState(false);

  // Global Visual Controls
  const [aspectRatioId, setAspectRatioId] = useState('4:5');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [eyebrowFontFamily, setEyebrowFontFamily] = useState('Caveat');
  const [heroFontSize, setHeroFontSize] = useState(68);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState('#FFE500');
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [textVerticalPos, setTextVerticalPos] = useState<'center' | 'top' | 'bottom'>('center');
  const [bgBlur, setBgBlur] = useState(0);
  const [bgDimness, setBgDimness] = useState(0);
  const [bgGrain, setBgGrain] = useState(15);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [windowTheme, setWindowTheme] = useState<'dark' | 'light'>('dark');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Compute Target Canvas Dimensions based on selected Aspect Ratio
  const currentDimensions = useMemo(() => {
    if (aspectRatioId === 'original' && activeSlide.photoImgEl) {
      const nw = activeSlide.photoImgEl.naturalWidth || 1920;
      const nh = activeSlide.photoImgEl.naturalHeight || 1080;
      return { width: nw, height: nh, aspect: `${nw}/${nh}`, label: `Original (${nw} × ${nh})` };
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

  // Add Slide
  const handleAddSlide = () => {
    if (slides.length >= 10) return;
    const newSlide: SlideItem = {
      id: `slide-${Date.now()}`,
      categoryBadge: activeSlide.categoryBadge || '@brand.studio',
      eyebrowText: '',
      heroTitle: `Point ${slides.length + 1}`,
      subtitleText: 'Description or key takeaway',
      authorName: activeSlide.authorName || 'Creator',
      authorHandle: activeSlide.authorHandle || '@creator',
      linkPillText: 'mysite.com',
      swipePrompt: '',
      bgType: activeSlide.bgType,
      gradientId: STUDIO_GRADIENTS[(slides.length) % STUDIO_GRADIENTS.length].id,
      customGradColors: ['#064E3B', '#10B981', '#011812'],
      customGradAngle: 135,
      solidColor: '#09090b',
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

  // Switch Creator Mode and set smart defaults
  const handleSelectCreatorMode = (modeId: any) => {
    setCreatorMode(modeId);
    if (modeId === 'photo-quote') {
      setShowAppWindowFrame(false);
      setShowCounter(false);
      setShowCategoryBadge(false);
      setShowLinkPill(false);
      setShowAuthorBlock(true);
      setShowQuoteMarks(false);
      setTextAlign('center');
      setFontFamily('Playfair Display');
      updateActiveSlide({ bgType: 'photo' });
    } else if (modeId === 'studio-carousel') {
      setShowAppWindowFrame(true);
      setShowCounter(true);
      setShowCategoryBadge(true);
      setShowLinkPill(true);
      setShowAuthorBlock(false);
      setShowQuoteMarks(false);
      setTextAlign('center');
      setFontFamily('Inter');
      updateActiveSlide({ bgType: 'gradient' });
    } else if (modeId === 'social-tweet') {
      setShowAppWindowFrame(false);
      setShowCounter(false);
      setShowCategoryBadge(false);
      setShowLinkPill(false);
      setShowAuthorBlock(true);
      setShowQuoteMarks(false);
      setTextAlign('left');
      setFontFamily('Inter');
    } else if (modeId === 'editorial-book') {
      setShowAppWindowFrame(false);
      setShowCounter(false);
      setShowCategoryBadge(false);
      setShowLinkPill(false);
      setShowAuthorBlock(true);
      setShowQuoteMarks(true);
      setTextAlign('center');
      setFontFamily('Playfair Display');
    } else if (modeId === 'cyber-brutalist') {
      setShowAppWindowFrame(false);
      setShowCounter(true);
      setShowCategoryBadge(true);
      setShowLinkPill(true);
      setShowAuthorBlock(false);
      setShowQuoteMarks(false);
      setTextAlign('center');
      setFontFamily('Syne');
    }
  };

  // Upload Screenshot / App Image
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

  // Upload Background Photo
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

  // Handle Drag & Drop on Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (showAppWindowFrame) {
        handleUploadScreenshot(file);
      } else {
        handleUploadBackgroundPhoto(file);
      }
    }
  };

  // Render Slide to Canvas
  const renderSlideToCanvas = useCallback(
    (canvas: HTMLCanvasElement, slide: SlideItem, slideNum: number, totalSlides: number, drawGuides = false) => {
      const W = currentDimensions.width;
      const H = currentDimensions.height;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background
      if (slide.bgType === 'photo' && slide.photoImgEl && slide.photoImgEl.complete) {
        ctx.save();
        if (bgBlur > 0) ctx.filter = `blur(${bgBlur}px)`;
        const imgRatio = slide.photoImgEl.naturalWidth / slide.photoImgEl.naturalHeight;
        const canvasRatio = W / H;
        let dw = W, dh = H, dx = 0, dy = 0;
        if (imgRatio > canvasRatio) {
          dh = H;
          dw = H * imgRatio;
          dx = (W - dw) / 2;
        } else {
          dw = W;
          dh = W / imgRatio;
          dy = (H - dh) / 2;
        }
        ctx.drawImage(slide.photoImgEl, dx, dy, dw, dh);
        ctx.restore();
      } else if (slide.bgType === 'solid') {
        ctx.fillStyle = slide.solidColor || '#09090b';
        ctx.fillRect(0, 0, W, H);
      } else if (slide.bgType === 'custom-gradient') {
        const rad = (slide.customGradAngle * Math.PI) / 180;
        const x1 = W / 2 - (Math.cos(rad) * W) / 2;
        const y1 = H / 2 - (Math.sin(rad) * H) / 2;
        const x2 = W / 2 + (Math.cos(rad) * W) / 2;
        const y2 = H / 2 + (Math.sin(rad) * H) / 2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, slide.customGradColors[0]);
        grad.addColorStop(0.5, slide.customGradColors[1]);
        grad.addColorStop(1, slide.customGradColors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Gradient Preset Mode
        const gradPreset = STUDIO_GRADIENTS.find((g) => g.id === slide.gradientId) || STUDIO_GRADIENTS[0];
        const grad = ctx.createLinearGradient(0, 0, W, H);
        if (gradPreset.colors.length >= 4) {
          grad.addColorStop(0, gradPreset.colors[0]);
          grad.addColorStop(0.38, gradPreset.colors[1]);
          grad.addColorStop(0.72, gradPreset.colors[2]);
          grad.addColorStop(1, gradPreset.colors[3]);
        } else {
          grad.addColorStop(0, gradPreset.colors[0]);
          grad.addColorStop(1, gradPreset.colors[gradPreset.colors.length - 1]);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Dim Overlay
      if (bgDimness > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgDimness / 100})`;
        ctx.fillRect(0, 0, W, H);
      }

      // 3. Film Grain Noise Texture
      if (bgGrain > 0) {
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 200;
        grainCanvas.height = 200;
        const gCtx = grainCanvas.getContext('2d');
        if (gCtx) {
          const imgData = gCtx.createImageData(200, 200);
          for (let i = 0; i < imgData.data.length; i += 4) {
            const v = Math.random() * 255;
            imgData.data[i] = v;
            imgData.data[i + 1] = v;
            imgData.data[i + 2] = v;
            imgData.data[i + 3] = (bgGrain / 100) * 45;
          }
          gCtx.putImageData(imgData, 0, 0);
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat') || 'transparent';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      const padX = W * 0.07;
      const topY = H * 0.06;

      // 4. Optional Top Brand Badge (Left)
      if (showCategoryBadge && slide.categoryBadge) {
        ctx.save();
        ctx.font = `800 ${Math.round(W * 0.024)}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(slide.categoryBadge.toUpperCase(), padX, topY);
        ctx.restore();
      }

      // 5. Optional Slide Counter Badge (Positionable)
      if (showCounter) {
        ctx.save();
        const counterStr = `${slideNum}/${totalSlides}`;
        ctx.font = `900 ${Math.round(W * 0.024)}px monospace`;
        const pillWidth = ctx.measureText(counterStr).width + 24;
        const pillHeight = Math.round(W * 0.046);

        let pillX = W - padX - pillWidth;
        let pillY = topY - pillHeight / 2;

        if (counterPosition === 'top-left') {
          pillX = padX;
        } else if (counterPosition === 'bottom-center') {
          pillX = (W - pillWidth) / 2;
          pillY = H * 0.92;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(counterStr, pillX + pillWidth / 2, pillY + pillHeight / 2);
        ctx.restore();
      }

      // 6. Optional Giant Quotation Marks (Editorial / Kinfolk)
      if (showQuoteMarks) {
        ctx.save();
        ctx.font = `italic 900 ${Math.round(W * 0.16)}px 'Playfair Display', serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('“', W / 2, H * 0.18);
        ctx.restore();
      }

      // 7. Core Content Rendering
      if (showAppWindowFrame) {
        // --- DEVICE / APP WINDOW SHOWCASE MODE ---
        let currentY = H * 0.14;

        if (showHeroTitle && slide.heroTitle) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.font = `${isBold ? '900' : '700'} ${Math.round(W * 0.068)}px '${fontFamily}', sans-serif`;
          ctx.fillStyle = textColor;
          ctx.fillText(slide.heroTitle, W / 2, currentY);
          currentY += Math.round(W * 0.075);
          ctx.restore();
        }

        if (showSubtitle && slide.subtitleText) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = `500 ${Math.round(W * 0.03)}px '${fontFamily}', sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
          ctx.fillText(slide.subtitleText, W / 2, currentY);
          currentY += Math.round(W * 0.045);
          ctx.restore();
        }

        // App Window Mockup Box
        const winWidth = W * 0.84;
        const winHeight = H * 0.54;
        const winX = (W - winWidth) / 2;
        const winY = currentY + 16;
        const isDarkWin = windowTheme === 'dark';

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = isDarkWin ? '#18181b' : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(winX, winY, winWidth, winHeight, 16);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = isDarkWin ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const headerHeight = Math.round(winHeight * 0.09);
        ctx.save();
        ctx.fillStyle = isDarkWin ? '#27272a' : '#f4f4f5';
        ctx.beginPath();
        ctx.roundRect(winX, winY, winWidth, headerHeight, [16, 16, 0, 0]);
        ctx.fill();

        // 🔴 🟡 🟢 Traffic Lights
        const dotRadius = 5.5;
        const dotY = winY + headerHeight / 2;
        const dotStartX = winX + 18;
        ctx.fillStyle = '#FF5F56';
        ctx.beginPath();
        ctx.arc(dotStartX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFBD2E';
        ctx.beginPath();
        ctx.arc(dotStartX + 16, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#27C93F';
        ctx.beginPath();
        ctx.arc(dotStartX + 32, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `600 ${Math.round(headerHeight * 0.38)}px 'Inter', sans-serif`;
        ctx.fillStyle = isDarkWin ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(slide.heroTitle, W / 2, dotY);
        ctx.restore();

        const bodyX = winX + 8;
        const bodyY = winY + headerHeight + 6;
        const bodyW = winWidth - 16;
        const bodyH = winHeight - headerHeight - 14;

        if (slide.screenshotImgEl && slide.screenshotImgEl.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 8);
          ctx.clip();
          ctx.drawImage(slide.screenshotImgEl, bodyX, bodyY, bodyW, bodyH);
          ctx.restore();
        } else {
          ctx.fillStyle = isDarkWin ? '#09090b' : '#fafafa';
          ctx.beginPath();
          ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 8);
          ctx.fill();
          ctx.font = `700 ${Math.round(bodyW * 0.04)}px 'Inter', sans-serif`;
          ctx.fillStyle = isDarkWin ? '#52525b' : '#a1a1aa';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📸 Drag & Drop Screenshot Here', W / 2, bodyY + bodyH / 2);
        }

        // Direct Link Pill
        if (showLinkPill && slide.linkPillText) {
          const btmY = H * 0.92;
          const linkStr = `🔗 ${slide.linkPillText}`;
          ctx.save();
          ctx.font = `800 ${Math.round(W * 0.032)}px 'Inter', sans-serif`;
          const lWidth = ctx.measureText(linkStr).width + 36;
          const lHeight = Math.round(W * 0.072);
          const lX = (W - lWidth) / 2;
          const lY = btmY - lHeight / 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.beginPath();
          ctx.roundRect(lX, lY, lWidth, lHeight, lHeight / 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(linkStr, W / 2, btmY);

          ctx.font = `700 ${Math.round(W * 0.03)}px 'Caveat', cursive, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.textAlign = 'right';
          ctx.fillText('Direct link ⤹', lX - 12, btmY);
          ctx.restore();
        }
      } else {
        // --- PURE TYPOGRAPHY & QUOTE CARD MODE ---
        let centerY = textVerticalPos === 'center' ? H * 0.48 : textVerticalPos === 'top' ? H * 0.32 : H * 0.64;
        const textX = textAlign === 'center' ? W / 2 : textAlign === 'left' ? W * 0.1 : W * 0.9;

        ctx.save();
        ctx.textAlign = textAlign;

        // Eyebrow
        if (showEyebrow && slide.eyebrowText) {
          ctx.font = `700 ${Math.round(heroFontSize * 0.55)}px '${eyebrowFontFamily}', cursive, sans-serif`;
          ctx.fillStyle = accentColor;
          ctx.fillText(slide.eyebrowText, textX, centerY - heroFontSize * 1.25);
        }

        // Hero Title / Quote Body
        if (showHeroTitle && slide.heroTitle) {
          ctx.font = `${isBold ? '900' : '700'} ${isItalic ? 'italic ' : ''}${heroFontSize}px '${fontFamily}', sans-serif`;
          ctx.fillStyle = textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 6;

          // Multi-line wrap
          const maxLineWidth = W * 0.82;
          const words = slide.heroTitle.split(' ');
          let line = '';
          const lines: string[] = [];

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxLineWidth && n > 0) {
              lines.push(line.trim());
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());

          const lineHeight = heroFontSize * 1.25;
          const totalTextHeight = lines.length * lineHeight;
          const startY = centerY - totalTextHeight / 2;

          lines.forEach((l, i) => {
            ctx.fillText(l, textX, startY + i * lineHeight);
          });
          ctx.shadowColor = 'transparent';
          centerY = startY + totalTextHeight + 20;
        }

        // Subtitle / Note
        if (showSubtitle && slide.subtitleText) {
          ctx.font = `600 ${Math.round(heroFontSize * 0.42)}px '${fontFamily}', sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(slide.subtitleText, textX, centerY + 14);
        }

        // Author / Creator Block
        if (showAuthorBlock && slide.authorName) {
          const authY = H * 0.82;
          ctx.font = `800 ${Math.round(W * 0.034)}px 'Inter', sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`— ${slide.authorName}`, textX, authY);
          if (slide.authorHandle) {
            ctx.font = `500 ${Math.round(W * 0.026)}px 'Inter', sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.fillText(slide.authorHandle, textX, authY + 28);
          }
        }

        // Swipe Prompt Callout
        if (slide.swipePrompt) {
          ctx.font = `700 ${Math.round(W * 0.032)}px 'Inter', sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(slide.swipePrompt, W / 2, H * 0.92);
        }
        ctx.restore();
      }

      // Safe Zone Overlay
      if (drawGuides) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        const feedH = W * (5 / 4);
        const feedTop = (H - feedH) / 2;
        ctx.strokeRect(0, feedTop, W, feedH);
        ctx.font = '900 20px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('INSTAGRAM FEED CROP (4:5 SAFE ZONE)', 24, feedTop + 32);
        ctx.restore();
      }
    },
    [
      currentDimensions,
      showCounter,
      counterPosition,
      showCategoryBadge,
      showEyebrow,
      showHeroTitle,
      showSubtitle,
      showAppWindowFrame,
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
      isBold,
      isItalic,
      windowTheme,
    ]
  );

  // Redraw preview canvas on change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    renderSlideToCanvas(canvas, activeSlide, activeSlideIndex + 1, slides.length, showSafeZones);
  }, [activeSlide, activeSlideIndex, slides.length, showSafeZones, renderSlideToCanvas]);

  // Export Single Slide as 4K PNG
  const handleExportSingleSlide = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    renderSlideToCanvas(exportCanvas, activeSlide, activeSlideIndex + 1, slides.length, false);

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
        renderSlideToCanvas(exportCanvas, slide, i + 1, slides.length, false);

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
      link.download = `instagram-carousel-${slides.length}-slides.zip`;
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
        ref={fileInputRef}
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

      {/* Top Header */}
      <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.68rem',
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
            STUDIO POST & CAROUSEL CREATOR
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#666', fontFamily: 'monospace' }}>
            5 CREATOR FORMATS · 4K PNG / MULTI-SLIDE ZIP
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#000', textTransform: 'uppercase', margin: 0 }}>
            Visual Post & Carousel Studio
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#555', maxWidth: 720, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            Fully modifiable studio for carousels, photo quotes, Twitter/X cards, and book quotes with complete toggle control over every element.
          </p>
        </div>
      </div>

      {/* 5 Creator Format Switcher Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        {CREATOR_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = creatorMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleSelectCreatorMode(mode.id)}
              style={{
                padding: '10px 12px',
                border: '2px solid #000',
                borderRadius: 6,
                background: isActive ? '#09090b' : '#ffffff',
                color: isActive ? '#ffffff' : '#000000',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: isActive ? '3px 3px 0 #000' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} style={{ color: isActive ? '#FFE500' : '#000' }} />
                <span style={{ fontWeight: 900, fontSize: '0.74rem' }}>{mode.name}</span>
              </div>
              <span style={{ fontSize: '0.62rem', color: isActive ? 'rgba(255, 255, 255, 0.7)' : '#666', lineHeight: 1.3 }}>
                {mode.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Multi-Slide Navigation with Reorder & Duplicate Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#666' }}>
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
                fontSize: '0.74rem',
                cursor: 'pointer',
                boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: isActive ? '#FFE500' : '#888' }}>#{idx + 1}</span>
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.heroTitle || 'Slide'}
              </span>
            </button>
          );
        })}

        {/* Slide Management Buttons */}
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
              style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, background: '#fff' }}
            >
              <Plus size={14} /> Add Slide
            </button>
          </>
        )}

        {slides.length > 1 && (
          <button
            onClick={() => handleDeleteSlide(activeSlideIndex)}
            className="brutalist-button"
            style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', marginLeft: 'auto' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      {/* Main Workspace 2-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(380px, 460px)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Stage Canvas & Exports */}
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
              minHeight: 560,
              position: 'relative',
              boxShadow: '6px 6px 0 #000',
              border: isDraggingOver ? '3px dashed #FFE500' : '3px solid #000',
              transition: 'border 0.15s',
            }}
          >
            {/* Live Instagram Feed Mockup Wrapper (Toggleable) */}
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
                  <strong style={{ color: '#fff' }}>3,605 likes</strong> · Tools devs use, designers approve...
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
                  boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                  aspectRatio: currentDimensions.aspect,
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Canvas Bottom Tooling Row */}
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

              {/* Safe Zone & Instagram Mockup Toggles */}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
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

        {/* RIGHT COLUMN: Highly Modifiable Controls Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Element Visibility Toggles Matrix */}
          <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              ⚙️ Element Visibility (100% Optional)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.72rem', fontWeight: 800 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showCounter} onChange={(e) => setShowCounter(e.target.checked)} />
                Slide Counter ({activeSlideIndex + 1}/{slides.length})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showCategoryBadge} onChange={(e) => setShowCategoryBadge(e.target.checked)} />
                Brand / Category Badge
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} />
                Eyebrow Script Text
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showAppWindowFrame} onChange={(e) => setShowAppWindowFrame(e.target.checked)} />
                Mac Device Window Frame
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showLinkPill} onChange={(e) => setShowLinkPill(e.target.checked)} />
                Direct Link Pill (Bottom)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showAuthorBlock} onChange={(e) => setShowAuthorBlock(e.target.checked)} />
                Author / Profile Block
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showQuoteMarks} onChange={(e) => setShowQuoteMarks(e.target.checked)} />
                Large Quotation Marks (“”)
              </label>
            </div>
          </div>

          {/* Background Source Studio & Color Gradient Integration */}
          <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                🎨 Background Studio
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['gradient', 'custom-gradient', 'photo', 'solid'] as const).map((bType) => (
                  <button
                    key={bType}
                    onClick={() => updateActiveSlide({ bgType: bType })}
                    style={{
                      padding: '3px 7px',
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
                    {bType === 'custom-gradient' ? 'Custom' : bType}
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient Preset Selector */}
            {activeSlide.bgType === 'gradient' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {STUDIO_GRADIENTS.map((g) => {
                  const isActive = activeSlide.gradientId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => updateActiveSlide({ gradientId: g.id })}
                      style={{
                        height: 48,
                        background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
                        border: isActive ? '3px solid #000' : '1.5px solid rgba(0,0,0,0.3)',
                        borderRadius: 4,
                        boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 3px', borderRadius: 2 }}>
                        {g.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Multi-Stop Gradient Generator */}
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
                <Link
                  href="/color-gradient"
                  target="_blank"
                  className="brutalist-button"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    borderRadius: 4,
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textDecoration: 'none',
                    color: '#000000',
                  }}
                >
                  <Sparkles size={14} style={{ color: '#FFE500' }} />
                  <span>Open Color Gradient Studio ↗</span>
                </Link>
                <p style={{ fontSize: '0.62rem', color: '#666', margin: 0, lineHeight: 1.4 }}>
                  💡 Tip: Generate ultra-rich organic mesh gradients in <Link href="/color-gradient" style={{ color: '#2563eb', fontWeight: 800 }}>Color Gradient Studio</Link> and click export to use them in your posts.
                </p>
              </div>
            )}

            {/* Photo Upload & Adjustments */}
            {activeSlide.bgType === 'photo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="brutalist-button"
                  style={{ padding: '8px 12px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff' }}
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

            {/* Solid Studio Color */}
            {activeSlide.bgType === 'solid' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={activeSlide.solidColor || '#09090b'}
                  onChange={(e) => updateActiveSlide({ solidColor: e.target.value })}
                  style={{ width: 42, height: 36, border: '2px solid #000', borderRadius: 4, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 800 }}>
                  Color: {activeSlide.solidColor || '#09090b'}
                </span>
              </div>
            )}
          </div>

          {/* Slide Text Content Editor */}
          <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              ✍️ Content Fields (Slide #{activeSlideIndex + 1})
            </span>

            {/* Category Badge */}
            {showCategoryBadge && (
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  BRAND / CATEGORY BADGE:
                </label>
                <input
                  type="text"
                  value={activeSlide.categoryBadge}
                  onChange={(e) => updateActiveSlide({ categoryBadge: e.target.value })}
                  placeholder="@mybrand.design · DESIGN ASSETS"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
            )}

            {/* Eyebrow */}
            {showEyebrow && (
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  EYEBROW (SCRIPT / HIGHLIGHT):
                </label>
                <input
                  type="text"
                  value={activeSlide.eyebrowText}
                  onChange={(e) => updateActiveSlide({ eyebrowText: e.target.value })}
                  placeholder="Rare / Pro Tip / Quote"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
            )}

            {/* Main Headline */}
            <div>
              <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                MAIN HEADLINE / QUOTE BODY:
              </label>
              <textarea
                rows={3}
                value={activeSlide.heroTitle}
                onChange={(e) => updateActiveSlide({ heroTitle: e.target.value })}
                placeholder="Dev tools / Inspiring Quote / Key Message"
                style={{ width: '100%', padding: '8px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.85rem', fontWeight: 900, resize: 'none' }}
              />
            </div>

            {/* Subtitle */}
            {showSubtitle && (
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  SUBTITLE / DESCRIPTION:
                </label>
                <input
                  type="text"
                  value={activeSlide.subtitleText}
                  onChange={(e) => updateActiveSlide({ subtitleText: e.target.value })}
                  placeholder="Part 2 / Additional context"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}
                />
              </div>
            )}

            {/* App Window Screenshot Upload Button */}
            {showAppWindowFrame && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="brutalist-button"
                style={{
                  padding: '9px 12px',
                  fontSize: '0.76rem',
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
            )}

            {/* Direct Link Pill */}
            {showLinkPill && (
              <div>
                <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                  DIRECT LINK PILL:
                </label>
                <input
                  type="text"
                  value={activeSlide.linkPillText}
                  onChange={(e) => updateActiveSlide({ linkPillText: e.target.value })}
                  placeholder="ship.studio / link.bio"
                  style={{ width: '100%', padding: '6px 10px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
            )}

            {/* Author Block */}
            {showAuthorBlock && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 2 }}>
                    AUTHOR NAME:
                  </label>
                  <input
                    type="text"
                    value={activeSlide.authorName}
                    onChange={(e) => updateActiveSlide({ authorName: e.target.value })}
                    placeholder="Steve Jobs"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem' }}
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
                    placeholder="@stevejobs"
                    style={{ width: '100%', padding: '6px 8px', border: '2px solid #000', borderRadius: 4, fontSize: '0.78rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Typography & Position Customizer */}
          <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              🔤 Typography & Position
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>FONT:</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '2px solid #000', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800 }}
                >
                  {GOOGLE_FONTS_LIST.slice(0, 30).map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
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

            {/* Font Size & Grain */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>SIZE: {heroFontSize}px</span>
                <input type="range" min={32} max={110} value={heroFontSize} onChange={(e) => setHeroFontSize(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>GRAIN: {bgGrain}%</span>
                <input type="range" min={0} max={40} value={bgGrain} onChange={(e) => setBgGrain(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}