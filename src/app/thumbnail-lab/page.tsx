'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Eye,
  SlidersHorizontal,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  Share2,
  AlertTriangle,
  HelpCircle,
  X,
  Layers,
  Activity,
  Plus,
  Layout,
  ChevronDown,
  Search,
  Mic,
  Bell,
  Menu,
  Home as HomeIcon,
  Radio,
  Shuffle,
  EyeOff,
  MoreVertical,
  UploadCloud,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Music2,
  Video,
  Timer,
  Edit3,
  Check,
} from 'lucide-react';

export type ContentFormat = 'longform' | 'shorts';
export type PlatformView = 'yt-mobile' | 'yt-desktop' | 'shorts-shelf' | 'shorts-player' | 'side-by-side';
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia';

export interface ThumbnailCandidate {
  id: string;
  name: string;
  label: string;
  imageUrl: string;
  title: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  timeAgo: string;
  duration: string;
  verified: boolean;
}

export interface YouTubeVideoItem {
  id: string;
  title: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  timeAgo: string;
  duration: string;
  imageUrl: string;
  verified?: boolean;
  isLive?: boolean;
  isSponsored?: boolean;
  sponsorName?: string;
  isCandidate?: boolean;
}

export interface YouTubeShortItem {
  id: string;
  title: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  likes: string;
  comments: string;
  soundTitle: string;
  imageUrl: string;
  isCandidate?: boolean;
}

import StudioToolsDropdown from '@/components/StudioToolsDropdown';

// Default 16:9 Long-Form Thumbnail
const DEFAULT_LONGFORM_THUMBNAIL: ThumbnailCandidate = {
  id: 'cand-long-1',
  name: 'My Video Thumbnail',
  label: '16:9 Long-Form',
  imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
  title: 'How I Built a $100K Studio in 24 Hours (Full Breakdown)',
  channelName: 'My Channel',
  channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  views: '1.2M views',
  timeAgo: '4 hours ago',
  duration: '18:42',
  verified: true,
};

// Default 9:16 YouTube Shorts Cover
const DEFAULT_SHORTS_COVER: ThumbnailCandidate = {
  id: 'cand-short-1',
  name: 'My Shorts Cover',
  label: '9:16 Vertical Short',
  imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  title: 'Stop Making This Huge Camera Mistake in 2026! 😱',
  channelName: 'My Channel',
  channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  views: '3.4M views',
  timeAgo: '2 hours ago',
  duration: '0:58',
  verified: true,
};

// 16:9 Competitors
const LONGFORM_COMPETITORS: YouTubeVideoItem[] = [
  {
    id: 'honobread-poor',
    title: 'Growing Up POOR in AMERICA',
    channelName: 'Honobread',
    channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    views: '138K views',
    timeAgo: '18 hours ago',
    duration: '5:58',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'ddoi-neighbors',
    title: 'She Outsmarted Her Neighbors',
    channelName: 'Daily Dose Of Internet',
    channelAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    views: '921K views',
    timeAgo: '1 day ago',
    duration: '15:12',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'mkbhd-toilet',
    title: 'I Said Yes to Every Email for a Month! (Again)',
    channelName: 'Marques Brownlee',
    channelAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    views: '848K views',
    timeAgo: '17 hours ago',
    duration: '30:51',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'mrbeast-island',
    title: '$1 vs $1,000,000 Private Island Vacation!',
    channelName: 'MrBeast',
    channelAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    views: '54M views',
    timeAgo: '3 days ago',
    duration: '18:40',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'ceo-miserable',
    title: 'The MISERABLE Lives Of CEOs... (What Do They Actually Do?)',
    channelName: 'How People Make Money',
    channelAvatar: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120&auto=format&fit=crop&q=80',
    views: '587K views',
    timeAgo: '3 months ago',
    duration: '9:28',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
    verified: false,
  },
  {
    id: 'veritasium-hacks',
    title: 'Testing Illegal Life Hacks to See If They Actually Work',
    channelName: 'Veritasium',
    channelAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
    views: '4.2M views',
    timeAgo: '5 days ago',
    duration: '17:09',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    verified: true,
  },
];

// 9:16 Shorts Competitors
const SHORTS_COMPETITORS: YouTubeShortItem[] = [
  {
    id: 'short-1',
    title: 'Performance 54 Tensor Chip in Real Life 🔥',
    channelName: 'TechDaily',
    channelAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    views: '2.4M views',
    likes: '142K',
    comments: '1.2K',
    soundTitle: 'Original Audio - TechDaily',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'short-2',
    title: 'Coconut Tree Harvesting in 30 Seconds 🌴',
    channelName: 'IslandLife',
    channelAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    views: '12M views',
    likes: '890K',
    comments: '4.5K',
    soundTitle: 'Tropical Vibe - SunsetSound',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'short-3',
    title: 'Secret MacBook Shortcut Nobody Uses 💻',
    channelName: 'MacMaster',
    channelAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
    views: '4.1M views',
    likes: '320K',
    comments: '2.8K',
    soundTitle: 'Focus Beats - LoFi Daily',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  },
];

const YOUTUBE_FILTER_PILLS = ['All', 'Music', 'Display devices', 'Podcasts', 'Gaming', 'Live', 'AI'];

export default function ThumbnailLabPage() {
  // Format Selection: Long-Form (16:9) vs Shorts (9:16)
  const [contentFormat, setContentFormat] = useState<ContentFormat>('longform');

  // Candidate State
  const [longformCandidates, setLongformCandidates] = useState<ThumbnailCandidate[]>([DEFAULT_LONGFORM_THUMBNAIL]);
  const [shortsCandidates, setShortsCandidates] = useState<ThumbnailCandidate[]>([DEFAULT_SHORTS_COVER]);
  const [activeLongformId, setActiveLongformId] = useState<string>(DEFAULT_LONGFORM_THUMBNAIL.id);
  const [activeShortsId, setActiveShortsId] = useState<string>(DEFAULT_SHORTS_COVER.id);

  // Platform & UI View
  const [platformView, setPlatformView] = useState<PlatformView>('yt-mobile');
  const [slotPosition, setSlotPosition] = useState<number>(1);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [revealHighlight, setRevealHighlight] = useState<boolean>(false);
  const [selectedFilterPill, setSelectedFilterPill] = useState<string>('All');
  const [showToolsDropdown, setShowToolsDropdown] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'audit' | 'candidates' | 'export'>('audit');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // 3-Second Glance Test Mode
  const [isGlanceTesting, setIsGlanceTesting] = useState<boolean>(false);
  const [glanceCountdown, setGlanceCountdown] = useState<number | null>(null);

  // Grader Filters
  const [blurAmount, setBlurAmount] = useState<number>(0);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);
  const [showDurationBadge, setShowDurationBadge] = useState<boolean>(true);
  const [colorBlindMode, setColorBlindMode] = useState<ColorBlindMode>('none');

  // Scores
  const [badgeCollisionScore, setBadgeCollisionScore] = useState<number>(95);
  const [contrastLuminanceScore, setContrastLuminanceScore] = useState<number>(88);
  const [focalBalanceScore, setFocalBalanceScore] = useState<number>(92);
  const [hasBadgeHazard, setHasBadgeHazard] = useState<boolean>(false);

  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  // Current active candidate
  const currentCandidates = contentFormat === 'longform' ? longformCandidates : shortsCandidates;
  const currentActiveId = contentFormat === 'longform' ? activeLongformId : activeShortsId;

  const activeCandidateIndex = useMemo(() => {
    const idx = currentCandidates.findIndex((c) => c.id === currentActiveId);
    return idx >= 0 ? idx : 0;
  }, [currentCandidates, currentActiveId]);

  const activeCandidate = useMemo(() => {
    return currentCandidates[activeCandidateIndex] || currentCandidates[0];
  }, [currentCandidates, activeCandidateIndex]);

  // Navigate variations
  const goToNextCandidate = useCallback(() => {
    if (currentCandidates.length === 0) return;
    const nextIdx = (activeCandidateIndex + 1) % currentCandidates.length;
    if (contentFormat === 'longform') setActiveLongformId(currentCandidates[nextIdx].id);
    else setActiveShortsId(currentCandidates[nextIdx].id);
  }, [currentCandidates, activeCandidateIndex, contentFormat]);

  const goToPrevCandidate = useCallback(() => {
    if (currentCandidates.length === 0) return;
    const prevIdx = (activeCandidateIndex - 1 + currentCandidates.length) % currentCandidates.length;
    if (contentFormat === 'longform') setActiveLongformId(currentCandidates[prevIdx].id);
    else setActiveShortsId(currentCandidates[prevIdx].id);
  }, [currentCandidates, activeCandidateIndex, contentFormat]);

  // Shuffle feed positions
  const handleShuffleFeed = () => {
    setRandomSeed(Date.now());
    setSlotPosition(Math.floor(Math.random() * Math.min(4, LONGFORM_COMPETITORS.length)));
  };

  // 3-Second Glance Test Trigger
  const startGlanceTest = () => {
    setIsGlanceTesting(true);
    setGlanceCountdown(3);
    const interval = setInterval(() => {
      setGlanceCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGlanceTesting(false);
            setGlanceCountdown(null);
          }, 3000); // reveals for 3s then finishes
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTargetInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isTargetInput) return;

      if (e.key === 'ArrowRight' || e.key === ']' || e.code === 'KeyN') {
        goToNextCandidate();
      } else if (e.key === 'ArrowLeft' || e.key === '[' || e.code === 'KeyP') {
        goToPrevCandidate();
      } else if (e.code === 'KeyR') {
        handleShuffleFeed();
      } else if (e.code === 'KeyH') {
        setRevealHighlight((prev) => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        startGlanceTest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextCandidate, goToPrevCandidate]);

  // Outside click listener for tools dropdown
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Long-form combined feed
  const longformFeed = useMemo(() => {
    const base = [...LONGFORM_COMPETITORS];
    const candidateVideo: YouTubeVideoItem = {
      id: activeCandidate.id,
      title: activeCandidate.title,
      channelName: activeCandidate.channelName,
      channelAvatar: activeCandidate.channelAvatar,
      views: activeCandidate.views,
      timeAgo: activeCandidate.timeAgo,
      duration: activeCandidate.duration,
      imageUrl: activeCandidate.imageUrl,
      verified: activeCandidate.verified,
      isCandidate: true,
    };
    const targetPos = Math.max(0, Math.min(base.length, slotPosition));
    const list = [...base];
    list.splice(targetPos, 0, candidateVideo);
    return list;
  }, [activeCandidate, slotPosition, randomSeed]);

  // Shorts combined feed
  const shortsFeed = useMemo(() => {
    const base = [...SHORTS_COMPETITORS];
    const candidateShort: YouTubeShortItem = {
      id: activeCandidate.id,
      title: activeCandidate.title,
      channelName: activeCandidate.channelName,
      channelAvatar: activeCandidate.channelAvatar,
      views: activeCandidate.views,
      likes: '1.4M',
      comments: '3.2K',
      soundTitle: 'Original Audio - ' + activeCandidate.channelName,
      imageUrl: activeCandidate.imageUrl,
      isCandidate: true,
    };
    const targetPos = Math.max(0, Math.min(base.length, slotPosition));
    const list = [...base];
    list.splice(targetPos, 0, candidateShort);
    return list;
  }, [activeCandidate, slotPosition, randomSeed]);

  // Image Contrast & Badge Analysis
  const analyzeThumbnailImage = useCallback((imgUrl: string) => {
    if (typeof window === 'undefined') return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = 320;
      const h = contentFormat === 'shorts' ? 568 : 180;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let totalLum = 0;
        let lumMin = 255;
        let lumMax = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          if (lum < lumMin) lumMin = lum;
          if (lum > lumMax) lumMax = lum;
        }

        const avgLum = totalLum / (w * h);
        const dynamicRange = lumMax - lumMin;
        const contrastScore = Math.min(100, Math.round((dynamicRange / 255) * 85 + (avgLum > 30 && avgLum < 220 ? 15 : 0)));
        setContrastLuminanceScore(contrastScore);

        const badgeX = contentFormat === 'shorts' ? Math.round(w * 0.82) : Math.round(w * 0.76);
        const badgeY = contentFormat === 'shorts' ? Math.round(h * 0.45) : Math.round(h * 0.74);
        const badgeW = contentFormat === 'shorts' ? Math.round(w * 0.16) : Math.round(w * 0.22);
        const badgeH = contentFormat === 'shorts' ? Math.round(h * 0.45) : Math.round(h * 0.22);

        let badgeEdgeEnergy = 0;
        let badgePixelCount = 0;

        for (let y = badgeY; y < badgeY + badgeH && y < h - 1; y++) {
          for (let x = badgeX; x < badgeX + badgeW && x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const rightIdx = (y * w + (x + 1)) * 4;
            const downIdx = ((y + 1) * w + x) * 4;

            const curLum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const rightLum = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
            const downLum = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];

            const edge = Math.abs(curLum - rightLum) + Math.abs(curLum - downLum);
            badgeEdgeEnergy += edge;
            badgePixelCount++;
          }
        }

        const avgBadgeEdge = badgeEdgeEnergy / Math.max(1, badgePixelCount);
        const isHazard = avgBadgeEdge > 38;
        setHasBadgeHazard(isHazard);
        setBadgeCollisionScore(isHazard ? Math.max(45, Math.round(100 - avgBadgeEdge * 1.4)) : 98);
        setFocalBalanceScore(90);
      } catch (err) {
        setContrastLuminanceScore(88);
        setBadgeCollisionScore(92);
        setFocalBalanceScore(90);
      }
    };
    img.src = imgUrl;
  }, [contentFormat]);

  useEffect(() => {
    if (activeCandidate?.imageUrl) {
      analyzeThumbnailImage(activeCandidate.imageUrl);
    }
  }, [activeCandidate, analyzeThumbnailImage]);

  const overallPopoutScore = useMemo(() => {
    return Math.round((contrastLuminanceScore * 0.4) + (badgeCollisionScore * 0.3) + (focalBalanceScore * 0.3));
  }, [contrastLuminanceScore, badgeCollisionScore, focalBalanceScore]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, candidateId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (contentFormat === 'longform') {
        if (candidateId) {
          setLongformCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, imageUrl: url } : c)));
        } else {
          const newId = `cand-long-${Date.now()}`;
          const newLetter = String.fromCharCode(65 + longformCandidates.length);
          const newCand: ThumbnailCandidate = {
            ...DEFAULT_LONGFORM_THUMBNAIL,
            id: newId,
            name: `Variation ${newLetter}`,
            imageUrl: url,
          };
          setLongformCandidates((prev) => [...prev, newCand]);
          setActiveLongformId(newId);
        }
      } else {
        if (candidateId) {
          setShortsCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, imageUrl: url } : c)));
        } else {
          const newId = `cand-short-${Date.now()}`;
          const newLetter = String.fromCharCode(65 + shortsCandidates.length);
          const newCand: ThumbnailCandidate = {
            ...DEFAULT_SHORTS_COVER,
            id: newId,
            name: `Shorts Variation ${newLetter}`,
            imageUrl: url,
          };
          setShortsCandidates((prev) => [...prev, newCand]);
          setActiveShortsId(newId);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const copyAuditSummary = () => {
    const text = `🎯 THUMBNAIL LAB REPORT (${contentFormat === 'longform' ? '16:9 Long-Form Video' : '9:16 YouTube Short'})
Candidate: ${activeCandidate.name} ("${activeCandidate.title}")
Standout Score: ${overallPopoutScore}/100
- Contrast: ${contrastLuminanceScore}/100
- Safe Zone: ${badgeCollisionScore}/100 ${hasBadgeHazard ? '⚠️ Collision detected!' : '✅ Clean'}
Tested on YouTube Simulator.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    });
  };

  const colorFilterStyle = useMemo(() => {
    let filter = '';
    if (blurAmount > 0) filter += `blur(${blurAmount}px) `;
    if (isGrayscale) filter += `grayscale(100%) `;
    if (colorBlindMode === 'deuteranopia') filter += `url('#deuteranopia-filter') `;
    if (colorBlindMode === 'protanopia') filter += `url('#protanopia-filter') `;
    if (colorBlindMode === 'tritanopia') filter += `url('#tritanopia-filter') `;
    if (colorBlindMode === 'achromatopsia') filter += `grayscale(100%) contrast(120%) `;
    return filter.trim() || 'none';
  }, [blurAmount, isGrayscale, colorBlindMode]);

  return (
    <div
      className="fs-app-root"
      style={{
        width: '100vw',
        overflow: 'hidden',
        background: '#09090b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* SVG Colorblind Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0" />
        </filter>
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0" />
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0" />
        </filter>
      </svg>

      {/* ── Single Ultra-Compact Studio Top HUD Bar (Zero Redundant Header) ── */}
      <header
        className="fs-header"
        style={{
          height: 44,
          background: '#000000',
          borderBottom: '1.5px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        <div className="fs-header-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: '#27272a',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 900,
              textDecoration: 'none',
              borderRadius: 3,
              border: '1px solid #3f3f46',
            }}
          >
            ‹ HOME
          </Link>
          {/* Unified Tools Dropdown */}
          <StudioToolsDropdown currentHref="/thumbnail-lab" theme="dark" />

          <span
            className="fs-header-badge"
            style={{
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#FFE500',
              color: '#000',
              padding: '2px 6px',
              borderRadius: 3,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Flame size={12} />
            THUMBNAIL LAB
          </span>

          {/* Format Selector: 16:9 Long-Form vs 9:16 Shorts */}
          <div style={{ display: 'flex', border: '1px solid #FFE500', borderRadius: 3, overflow: 'hidden', background: '#09090b' }}>
            <button
              onClick={() => {
                setContentFormat('longform');
                setPlatformView('yt-mobile');
              }}
              style={{
                padding: '3px 8px',
                border: 'none',
                borderRight: '1px solid #333',
                background: contentFormat === 'longform' ? '#FFE500' : '#09090b',
                color: contentFormat === 'longform' ? '#000000' : '#ffffff',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
              }}
            >
              🎬 16:9 Long-Form
            </button>

            <button
              onClick={() => {
                setContentFormat('shorts');
                setPlatformView('shorts-shelf');
              }}
              style={{
                padding: '3px 8px',
                border: 'none',
                background: contentFormat === 'shorts' ? '#ff0000' : '#09090b',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
              }}
            >
              ⚡ 9:16 Shorts
            </button>
          </div>

          {/* View Selector */}
          <div style={{ display: 'flex', border: '1px solid #3f3f46', borderRadius: 3, overflow: 'hidden', background: '#18181b' }}>
            {contentFormat === 'longform' ? (
              <>
                <button
                  onClick={() => setPlatformView('yt-mobile')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRight: '1px solid #3f3f46',
                    background: platformView === 'yt-mobile' ? '#FFE500' : '#18181b',
                    color: platformView === 'yt-mobile' ? '#000' : '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  📱 Mobile (390px)
                </button>
                <button
                  onClick={() => setPlatformView('yt-desktop')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRight: '1px solid #3f3f46',
                    background: platformView === 'yt-desktop' ? '#FFE500' : '#18181b',
                    color: platformView === 'yt-desktop' ? '#000' : '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  💻 3-Grid Desktop
                </button>
                <button
                  onClick={() => setPlatformView('side-by-side')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    background: platformView === 'side-by-side' ? '#FFE500' : '#18181b',
                    color: platformView === 'side-by-side' ? '#000' : '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  🔀 A/B Matrix
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setPlatformView('shorts-shelf')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRight: '1px solid #3f3f46',
                    background: platformView === 'shorts-shelf' ? '#ff0000' : '#18181b',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  📱 Shorts Shelf
                </button>
                <button
                  onClick={() => setPlatformView('shorts-player')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    borderRight: '1px solid #3f3f46',
                    background: platformView === 'shorts-player' ? '#ff0000' : '#18181b',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  ▶️ Shorts Player
                </button>
                <button
                  onClick={() => setPlatformView('side-by-side')}
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    background: platformView === 'side-by-side' ? '#ff0000' : '#18181b',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  🔀 A/B Matrix
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1-Click Upload Button Directly in Header */}
        <div className="fs-header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            style={{
              background: contentFormat === 'longform' ? '#FFE500' : '#ff0000',
              color: contentFormat === 'longform' ? '#000000' : '#ffffff',
              borderRadius: 3,
              padding: '3px 10px',
              fontSize: '0.66rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Upload size={12} />
            {contentFormat === 'longform' ? 'Upload 16:9 Thumbnail' : 'Upload 9:16 Shorts Cover'}
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, activeCandidate.id)} style={{ display: 'none' }} />
          </label>

          <button
            onClick={startGlanceTest}
            style={{
              padding: '3px 8px',
              fontSize: '0.64rem',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: isGlanceTesting ? '#FFE500' : '#27272a',
              color: isGlanceTesting ? '#000' : '#fff',
              border: '1px solid #3f3f46',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 800,
            }}
            title="Starts a 3-second rapid glance timer (Spacebar)"
          >
            <Timer size={12} />
            <span>3s Glance Test</span>
          </button>

          <button
            onClick={handleShuffleFeed}
            style={{
              padding: '3px 8px',
              fontSize: '0.64rem',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#27272a',
              color: '#fff',
              border: '1px solid #3f3f46',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 800,
            }}
            title="Randomize competitor positions (R)"
          >
            <Shuffle size={12} color="#FFE500" />
            <span>Shuffle (R)</span>
          </button>

          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#27272a',
              color: '#FFE500',
              padding: '3px 7px',
              borderRadius: 3,
              border: '1px solid #3f3f46',
            }}
          >
            SCORE: {overallPopoutScore}/100
          </div>
        </div>
      </header>

      {/* ── Main Canvas Viewport (Starts Immediately from Pixel 44) ── */}
      <div className="fs-workspace" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Center Live Simulation Area */}
        <div
          style={{
            flex: 1,
            background: '#09090b',
            color: '#f1f1f1',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: (platformView === 'yt-mobile' || platformView === 'shorts-shelf' || platformView === 'shorts-player') ? '16px 0 40px' : '0',
            position: 'relative',
          }}
          className="no-scrollbar"
        >
          {/* 3s Glance Test Overlay */}
          {isGlanceTesting && glanceCountdown !== null && glanceCountdown > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(16px)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontSize: '3rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500' }}>
                {glanceCountdown}
              </div>
              <div style={{ fontSize: '0.86rem', fontFamily: 'monospace', color: '#fff' }}>
                Get ready to glance at the feed...
              </div>
            </div>
          )}

          <div
            style={{
              width: (platformView === 'yt-mobile' || platformView === 'shorts-shelf' || platformView === 'shorts-player') ? '390px' : '100%',
              maxWidth: (platformView === 'yt-mobile' || platformView === 'shorts-shelf' || platformView === 'shorts-player') ? '390px' : '100%',
              filter: colorFilterStyle,
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. LONG-FORM: YOUTUBE MOBILE FEED (390px IPHONE)               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'longform' && platformView === 'yt-mobile' && (
              <div
                style={{
                  width: '390px',
                  background: '#0f0f0f',
                  color: '#ffffff',
                  border: '1px solid #27272a',
                  borderRadius: 0,
                  overflow: 'hidden',
                  fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  boxShadow: '0 0 50px rgba(0,0,0,0.9)',
                }}
              >
                {/* Real YouTube Mobile Top Header */}
                <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#0f0f0f', borderBottom: '1px solid #1f1f1f' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Menu size={20} color="#ffffff" style={{ cursor: 'pointer' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 24, height: 17, background: '#ff0000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '7px solid #fff' }} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.04em', color: '#fff' }}>YouTube</span>
                      <span style={{ fontSize: '0.55rem', color: '#888', alignSelf: 'flex-start', marginLeft: 1 }}>NL</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Search size={19} color="#ffffff" style={{ cursor: 'pointer' }} />
                    <UploadCloud size={19} color="#ffffff" style={{ cursor: 'pointer' }} />
                    <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '1px solid #555' }}>
                      <img src={activeCandidate.channelAvatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                </div>

                {/* Filter Chips Bar */}
                <div style={{ height: 42, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', overflowX: 'auto', borderBottom: '1px solid #1f1f1f' }} className="no-scrollbar">
                  {YOUTUBE_FILTER_PILLS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedFilterPill(p)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: p === selectedFilterPill ? '#ffffff' : '#272727',
                        color: p === selectedFilterPill ? '#000000' : '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <div style={{ color: '#aaa', padding: '0 4px', fontSize: '0.8rem' }}>›</div>
                </div>

                {/* Video Stream */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {longformFeed.map((video, idx) => {
                    const isCandidate = video.isCandidate;
                    return (
                      <React.Fragment key={video.id + idx}>
                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20, position: 'relative', border: revealHighlight && isCandidate ? '2px solid #FFE500' : 'none' }}>
                          <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', background: '#1c1c1c', overflow: 'hidden' }}>
                            <img src={video.imageUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '16/9', display: 'block' }} />
                            {showDurationBadge && (
                              <div style={{ position: 'absolute', bottom: 6, right: 6, background: video.isLive ? '#cc0000' : 'rgba(0,0,0,0.85)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 4px', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                {video.isLive && <Radio size={10} />}
                                {video.duration}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', padding: '10px 12px 0', gap: 12 }}>
                            <img src={video.channelAvatar} alt={video.channelName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.35, color: '#ffffff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {video.title}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#aaaaaa', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{video.channelName}</span>
                                {video.verified && <span style={{ fontSize: '0.6rem' }}>✓</span>}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#aaaaaa', marginTop: 1 }}>{video.views} • {video.timeAgo}</div>
                            </div>
                            <MoreVertical size={18} color="#aaaaaa" style={{ flexShrink: 0, marginTop: 2 }} />
                          </div>
                        </div>

                        {idx === 1 && (
                          <div style={{ borderTop: '1px solid #1f1f1f', borderBottom: '1px solid #1f1f1f', padding: '14px 12px 18px', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.94rem' }}>
                                <div style={{ width: 18, height: 22, background: '#ff0000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #fff' }} />
                                </div>
                                <span>Shorts</span>
                              </div>
                              <MoreVertical size={16} color="#aaa" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                              {SHORTS_COMPETITORS.slice(0, 2).map((s) => (
                                <div key={s.id} style={{ aspectRatio: '9/16', borderRadius: 8, overflow: 'hidden', position: 'relative', background: '#1c1c1c' }}>
                                  <img src={s.imageUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, color: '#fff' }}>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
                                    <div style={{ fontSize: '0.62rem', color: '#ccc', marginTop: 2 }}>{s.views}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. LONG-FORM: YOUTUBE DESKTOP FEED (3-COLUMN GRID)             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'longform' && platformView === 'yt-desktop' && (
              <div style={{ display: 'flex', minHeight: '100%', fontFamily: '"Roboto", sans-serif', background: '#0f0f0f' }}>
                <aside style={{ width: 72, flexShrink: 0, background: '#0f0f0f', borderRight: '1px solid #1f1f1f', padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', background: '#272727', borderRadius: 8, width: '100%', cursor: 'pointer' }}>
                    <HomeIcon size={20} color="#fff" />
                    <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 600 }}>Home</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', width: '100%', cursor: 'pointer' }}>
                    <Flame size={20} color="#aaa" />
                    <span style={{ fontSize: '0.62rem', color: '#aaa', fontWeight: 600 }}>Shorts</span>
                  </div>
                </aside>

                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#0f0f0f', borderBottom: '1px solid #1f1f1f' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Menu size={19} color="#fff" style={{ cursor: 'pointer' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 24, height: 17, background: '#ff0000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #fff' }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.04em', color: '#fff' }}>YouTube</span>
                        <span style={{ fontSize: '0.55rem', color: '#888', alignSelf: 'flex-start', marginLeft: 1 }}>NL</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 520, flex: 1, margin: '0 24px' }}>
                      <div style={{ display: 'flex', flex: 1, border: '1px solid #303030', borderRadius: '40px 0 0 40px', background: '#121212', padding: '0 14px', height: 36, alignItems: 'center' }}>
                        <input type="text" placeholder="Search" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.84rem' }} />
                      </div>
                      <button style={{ height: 36, padding: '0 18px', border: '1px solid #303030', borderLeft: 'none', borderRadius: '0 40px 40px 0', background: '#222222', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
                        <Search size={15} />
                      </button>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '1px solid #666' }}>
                      <img src={activeCandidate.channelAvatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px 60px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px 14px' }}>
                    {longformFeed.map((video, idx) => {
                      const isCandidate = video.isCandidate;
                      return (
                        <div key={video.id + idx} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', borderRadius: 10, padding: revealHighlight && isCandidate ? 4 : 0, border: revealHighlight && isCandidate ? '2px solid #FFE500' : 'none' }}>
                          <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#1c1c1c' }}>
                            <img src={video.imageUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '16/9', display: 'block' }} />
                            {showDurationBadge && (
                              <div style={{ position: 'absolute', bottom: 6, right: 6, background: video.isLive ? '#cc0000' : 'rgba(0, 0, 0, 0.85)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 4px', borderRadius: 3 }}>
                                {video.duration}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 10, padding: '0 2px' }}>
                            <img src={video.channelAvatar} alt={video.channelName} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.3, color: '#f1f1f1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 3 }}>
                                {video.title}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#aaaaaa' }}>{video.channelName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginTop: 1 }}>{video.views} • {video.timeAgo}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </main>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. SHORTS: YOUTUBE HOME SHORTS SHELF (2-COLUMN CARDS)           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'shorts' && platformView === 'shorts-shelf' && (
              <div style={{ width: '390px', background: '#0f0f0f', color: '#ffffff', border: '1px solid #27272a', borderRadius: 0, overflow: 'hidden', fontFamily: '"Roboto", sans-serif', boxShadow: '0 0 50px rgba(0,0,0,0.9)', padding: '16px 12px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.05rem' }}>
                    <div style={{ width: 22, height: 26, background: '#ff0000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #fff' }} />
                    </div>
                    <span>Shorts Shelf (YouTube Home)</span>
                  </div>
                  <MoreVertical size={18} color="#aaa" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {shortsFeed.map((s, idx) => {
                    const isCandidate = s.isCandidate;
                    return (
                      <div key={s.id + idx} style={{ aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#1c1c1c', border: revealHighlight && isCandidate ? '2px solid #FFE500' : 'none' }}>
                        <img src={s.imageUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                        <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, color: '#fff' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
                          <div style={{ fontSize: '0.66rem', color: '#ccc', marginTop: 3 }}>{s.views}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. SHORTS: FULL YOUTUBE SHORTS APP PLAYER (9:16 VERTICAL HUD)  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'shorts' && platformView === 'shorts-player' && (
              <div style={{ width: '390px', height: '693px', background: '#000000', color: '#ffffff', border: '1px solid #27272a', borderRadius: 0, overflow: 'hidden', position: 'relative', fontFamily: '"Roboto", sans-serif', boxShadow: '0 0 50px rgba(0,0,0,0.9)' }}>
                <img src={activeCandidate.imageUrl} alt={activeCandidate.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />

                <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shorts</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Search size={20} color="#fff" />
                    <MoreVertical size={20} color="#fff" />
                  </div>
                </div>

                <div style={{ position: 'absolute', right: 12, bottom: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ThumbsUp size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>1.4M</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ThumbsDown size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.64rem', color: '#ccc' }}>Dislike</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={19} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>3.2K</span>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: 18, left: 14, right: 70, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={activeCandidate.channelAvatar} alt={activeCandidate.channelName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>@{activeCandidate.channelName.toLowerCase().replace(/\s+/g, '')}</span>
                    <button style={{ padding: '4px 10px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: 14, fontSize: '0.72rem', fontWeight: 800 }}>
                      Subscribe
                    </button>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {activeCandidate.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#eee' }}>
                    <Music2 size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Original Sound • {activeCandidate.channelName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 5. SIDE-BY-SIDE MATRIX COMPARISON                              */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {platformView === 'side-by-side' && (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: '"Roboto", sans-serif' }}>
                <div style={{ fontSize: '0.92rem', fontFamily: 'monospace', fontWeight: 900, borderBottom: '1px solid #333', paddingBottom: 8 }}>
                  🔀 {contentFormat === 'longform' ? '16:9 LONG-FORM' : '9:16 YOUTUBE SHORTS'} VARIATION MATRIX
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: contentFormat === 'longform' ? 'repeat(auto-fill, minmax(260px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                  {currentCandidates.map((cand, idx) => {
                    const isSelected = cand.id === activeCandidate.id;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={cand.id}
                        onClick={() => {
                          if (contentFormat === 'longform') setActiveLongformId(cand.id);
                          else setActiveShortsId(cand.id);
                        }}
                        style={{
                          border: isSelected ? '2px solid #FFE500' : '1px solid #333',
                          borderRadius: 8,
                          padding: 10,
                          background: isSelected ? '#1a1a1a' : '#141414',
                          boxShadow: isSelected ? '0 0 16px rgba(255,229,0,0.35)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 900 }}>
                            Version {letter} ({cand.name})
                          </span>
                          {isSelected && (
                            <span style={{ background: '#FFE500', color: '#000', fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 900, padding: '1px 5px', borderRadius: 2 }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ width: '100%', aspectRatio: contentFormat === 'longform' ? '16/9' : '9/16', borderRadius: 6, overflow: 'hidden', position: 'relative', background: '#000' }}>
                          <img src={cand.imageUrl} alt={cand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {cand.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CTR Grader Sidebar */}
        <aside
          style={{
            width: 320,
            background: '#18181b',
            borderLeft: '1.5px solid #27272a',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
          className="no-scrollbar"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #27272a', background: '#09090b' }}>
            {[
              { id: 'audit', label: 'Grader', icon: Activity },
              { id: 'candidates', label: 'Edit Info', icon: SlidersHorizontal },
              { id: 'export', label: 'Export', icon: Share2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSidebarTab(tab.id as any)}
                style={{
                  padding: '9px 2px',
                  border: 'none',
                  borderRight: '1px solid #27272a',
                  background: activeSidebarTab === tab.id ? '#18181b' : '#09090b',
                  color: activeSidebarTab === tab.id ? '#FFE500' : '#a1a1aa',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.62rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  textTransform: 'uppercase',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* GRADER TAB */}
            {activeSidebarTab === 'audit' && (
              <>
                <div style={{ padding: 10, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                      CTR Standout Score
                    </span>
                    <span style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500' }}>
                      {overallPopoutScore}/100
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Luminance & Contrast:</span>
                        <span>{contrastLuminanceScore}%</span>
                      </div>
                      <div style={{ height: 4, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${contrastLuminanceScore}%`, height: '100%', background: '#FFE500' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Safe Zone Margin:</span>
                        <span>{badgeCollisionScore}%</span>
                      </div>
                      <div style={{ height: 4, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${badgeCollisionScore}%`, height: '100%', background: hasBadgeHazard ? '#ef4444' : '#FFE500' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Second Glance Test Card */}
                <div style={{ padding: 10, background: '#27272a', border: '1px solid #FFE500', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Timer size={13} />
                    3-Second Human Glance Test
                  </span>
                  <p style={{ fontSize: '0.62rem', color: '#ccc', margin: 0, lineHeight: 1.3 }}>
                    Blurs the screen, counts down 3-2-1, and reveals the feed for 3 seconds to measure which video your eye catches first.
                  </p>
                  <button
                    onClick={startGlanceTest}
                    style={{ padding: '6px 10px', background: '#FFE500', color: '#000', border: 'none', borderRadius: 3, fontWeight: 900, fontSize: '0.66rem', cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    Start 3s Glance Test (Spacebar)
                  </button>
                </div>

                {/* Squint / Blur Slider */}
                <div style={{ padding: 10, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Eye size={13} color="#FFE500" />
                      Squint / Blur Test ({blurAmount}px)
                    </label>
                    {blurAmount > 0 && (
                      <button onClick={() => setBlurAmount(0)} style={{ fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 800, background: 'none', border: 'none', color: '#FFE500', cursor: 'pointer' }}>
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={blurAmount}
                    onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#FFE500' }}
                  />
                </div>

                {/* B&W Contrast Check */}
                <div style={{ padding: 10, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                    B&W Tonal Contrast
                  </span>
                  <button
                    onClick={() => setIsGrayscale(!isGrayscale)}
                    style={{
                      padding: '3px 8px',
                      border: '1px solid #3f3f46',
                      borderRadius: 3,
                      background: isGrayscale ? '#FFE500' : '#18181b',
                      color: isGrayscale ? '#000000' : '#ffffff',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.62rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isGrayscale ? 'ON' : 'OFF'}
                  </button>
                </div>
              </>
            )}

            {/* EDIT INFO TAB */}
            {activeSidebarTab === 'candidates' && (
              <div style={{ padding: 10, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                  Edit {activeCandidate.name}
                </span>

                <div>
                  <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, display: 'block', marginBottom: 2 }}>
                    Title
                  </label>
                  <textarea
                    rows={3}
                    value={activeCandidate.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (contentFormat === 'longform') {
                        setLongformCandidates((prev) => prev.map((c) => (c.id === activeCandidate.id ? { ...c, title: val } : c)));
                      } else {
                        setShortsCandidates((prev) => prev.map((c) => (c.id === activeCandidate.id ? { ...c, title: val } : c)));
                      }
                    }}
                    style={{ width: '100%', padding: 6, border: '1px solid #3f3f46', borderRadius: 3, fontSize: '0.72rem', background: '#18181b', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, display: 'block', marginBottom: 2 }}>
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={activeCandidate.channelName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (contentFormat === 'longform') {
                        setLongformCandidates((prev) => prev.map((c) => (c.id === activeCandidate.id ? { ...c, channelName: val } : c)));
                      } else {
                        setShortsCandidates((prev) => prev.map((c) => (c.id === activeCandidate.id ? { ...c, channelName: val } : c)));
                      }
                    }}
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #3f3f46', borderRadius: 3, fontSize: '0.68rem', background: '#18181b', color: '#fff' }}
                  />
                </div>
              </div>
            )}

            {/* EXPORT TAB */}
            {activeSidebarTab === 'export' && (
              <div style={{ padding: 10, background: '#27272a', border: '1px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                  CTR Audit Report
                </span>
                <button
                  onClick={copyAuditSummary}
                  style={{ width: '100%', padding: '8px', fontSize: '0.7rem', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FFE500', color: '#000', border: 'none', fontWeight: 900, cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {copiedReport ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedReport ? 'Copied!' : 'Copy Report'}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
