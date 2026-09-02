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
  PanelLeftOpen,
  Link2,
} from 'lucide-react';
import { ALL_TOOLS } from '@/data/tools';
import { fetchCompetitorsFromDatabase, saveCompetitorToDatabase } from '@/lib/supabase';

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
  category?: string;
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
  category?: string;
  isCandidate?: boolean;
}

import StudioToolsDropdown from '@/components/StudioToolsDropdown';
import { TactileScrubber } from '@/components/tactile-scrubber';

export const PRESET_CATEGORIES = [
  'All',
  'Technology & AI',
  'Business & Finance',
  'Education & Science',
  'Gaming & Esports',
  'Entertainment & Comedy',
  'Podcasts & Interviews',
  'Africa & Diaspora',
  'Storytelling & Animation',
  'Lifestyle & Fitness',
  'News & Documentaries',
] as const;

// Default 16:9 Long-Form Thumbnail
const DEFAULT_LONGFORM_THUMBNAIL: ThumbnailCandidate = {
  id: 'cand-long-1',
  name: 'My Video Thumbnail',
  label: '16:9 Long-Form',
  imageUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  title: 'How I Built a $100K Studio in 24 Hours (Full Breakdown)',
  channelName: 'My Channel',
  channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=MyChannel',
  views: '1.2M views',
  timeAgo: '4 hours ago',
  duration: '14:20',
  verified: true,
};

// Default 9:16 YouTube Shorts Cover
const DEFAULT_SHORTS_COVER: ThumbnailCandidate = {
  id: 'cand-short-1',
  name: 'My Shorts Cover',
  label: '9:16 Vertical Short',
  imageUrl: 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg',
  title: 'Stop Making This Huge Camera Mistake in 2026! 😱',
  channelName: 'My Channel',
  channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=MyShorts',
  views: '3.4M views',
  timeAgo: '2 hours ago',
  duration: '0:58',
  verified: true,
};

// Curated 16:9 Competitors (Real YouTube Thumbnails)
const LONGFORM_COMPETITORS: YouTubeVideoItem[] = [
  {
    id: 'kX3nB4PpJko',
    title: '$1 vs $1,000,000 Private Island Vacation!',
    channelName: 'MrBeast',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=MrBeast',
    views: '64M views',
    timeAgo: '3 days ago',
    duration: '18:40',
    imageUrl: 'https://img.youtube.com/vi/kX3nB4PpJko/hqdefault.jpg',
    category: 'Entertainment & Comedy',
    verified: true,
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'Nigeria is Now So Much Worse Than You Think',
    channelName: 'Places',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=PlacesChannel',
    views: '242K views',
    timeAgo: '22 hours ago',
    duration: '59:38',
    imageUrl: 'https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg',
    category: 'Africa & Diaspora',
    verified: true,
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Inside America\'s Richest Black Suburbs',
    channelName: 'RocaNews',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=RocaNews',
    views: '1.1M views',
    timeAgo: '2 days ago',
    duration: '21:31',
    imageUrl: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    category: 'News & Documentaries',
    verified: true,
  },
  {
    id: '9bZkp7q19f0',
    title: 'Testing Counterintuitive Physics Experiments!',
    channelName: 'Veritasium',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Veritasium',
    views: '4.9M views',
    timeAgo: '5 days ago',
    duration: '17:09',
    imageUrl: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg',
    category: 'Education & Science',
    verified: true,
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'We\'re Dumb (Animation Collab)',
    channelName: 'BrodyAnimates & Haminations',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=BrodyAnimates',
    views: '1.3M views',
    timeAgo: '3 days ago',
    duration: '9:50',
    imageUrl: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    category: 'Storytelling & Animation',
    verified: true,
  },
];

// Curated 9:16 Shorts Competitors (Real YouTube Shorts)
const SHORTS_COMPETITORS: YouTubeShortItem[] = [
  {
    id: 'hT_nvWreIhg',
    title: 'How The Flow State Works 🧠',
    channelName: 'Zack D. Films',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=ZackDFilms',
    views: '4.1M views',
    likes: '480K',
    comments: '3.4K',
    soundTitle: 'Original Audio - Zack D. Films',
    imageUrl: 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg',
    category: 'Education & Science',
  },
  {
    id: '60ItHLz5WEA',
    title: 'Can You Hear This Silent Frequency? 🎧',
    channelName: 'SoundLab',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=SoundLab',
    views: '6.8M views',
    likes: '890K',
    comments: '5.2K',
    soundTitle: 'Original Audio - SoundLab',
    imageUrl: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg',
    category: 'Technology & AI',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'The First Video Ever Uploaded to YouTube 🐘',
    channelName: 'jawed',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Jawed',
    views: '340M views',
    likes: '16M',
    comments: '11M',
    soundTitle: 'Original Audio - jawed',
    imageUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    category: 'Entertainment & Comedy',
  },
];

const YOUTUBE_FILTER_PILLS = PRESET_CATEGORIES;

export default function ThumbnailLabPage() {
  // Format Selection: Long-Form (16:9) vs Shorts (9:16)
  const [contentFormat, setContentFormat] = useState<ContentFormat>('longform');
  const [selectedFilterPill, setSelectedFilterPill] = useState<string>('All');
  const [importCategory, setImportCategory] = useState<string>('Technology & AI');
  const [importFormat, setImportFormat] = useState<ContentFormat>('longform');

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
  const [showToolsDropdown, setShowToolsDropdown] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'audit' | 'candidates' | 'export'>('audit');
  const [mobileActiveView, setMobileActiveView] = useState<'feed' | 'grader' | 'variations'>('feed');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [toolsSidebarOpen, setToolsSidebarOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth <= 860;
      setIsMobileScreen(isMob);
      if (isMob) {
        setPlatformView((prev) => {
          if (contentFormat === 'longform') return 'yt-mobile';
          return 'shorts-shelf';
        });
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [contentFormat]);

  // 3-Second Glance Test Mode (Phases: idle -> countdown -> glancing -> finished)
  const [glanceState, setGlanceState] = useState<'idle' | 'countdown' | 'glancing' | 'finished'>('idle');
  const [glanceCountdown, setGlanceCountdown] = useState<number>(3);
  const [glanceSecondsLeft, setGlanceSecondsLeft] = useState<number>(3);
  const glanceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const startGlanceTest = useCallback(() => {
    if (glanceTimerRef.current) clearInterval(glanceTimerRef.current);

    // If on mobile, immediately switch to the Feed Simulator
    if (isMobileScreen) {
      setMobileActiveView('feed');
    }
    setGlanceState('countdown');
    setGlanceCountdown(3);

    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setGlanceCountdown(count);
      } else {
        clearInterval(countInterval);
        setGlanceState('glancing');
        setGlanceSecondsLeft(3);

        let sec = 3;
        const glanceInterval = setInterval(() => {
          sec -= 1;
          if (sec > 0) {
            setGlanceSecondsLeft(sec);
          } else {
            clearInterval(glanceInterval);
            setGlanceState('finished');
          }
        }, 1000);
        glanceTimerRef.current = glanceInterval;
      }
    }, 1000);
    glanceTimerRef.current = countInterval;
  }, [isMobileScreen]);

  const stopGlanceTest = useCallback(() => {
    if (glanceTimerRef.current) clearInterval(glanceTimerRef.current);
    setGlanceState('idle');
  }, []);

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

  // Dynamic Competitors & YouTube Importer
  const [dbLongformCompetitors, setDbLongformCompetitors] = useState<YouTubeVideoItem[]>(LONGFORM_COMPETITORS);
  const [dbShortsCompetitors, setDbShortsCompetitors] = useState<YouTubeShortItem[]>(SHORTS_COMPETITORS);
  const [youtubeImportOpen, setYoutubeImportOpen] = useState<boolean>(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Fetch initial competitors from Supabase
  useEffect(() => {
    async function loadSupabaseCompetitors() {
      const stored = await fetchCompetitorsFromDatabase();
      if (stored && stored.length > 0) {
        const lf = stored
          .filter((c) => c.format === 'longform')
          .map((c) => ({
            id: c.id || c.youtube_video_id,
            title: c.title,
            channelName: c.channel_name,
            channelAvatar: c.channel_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.channel_name)}`,
            views: c.views || '1.2M views',
            timeAgo: c.time_ago || '2 days ago',
            duration: c.duration || '14:20',
            imageUrl: c.thumbnail_url || `https://img.youtube.com/vi/${c.youtube_video_id}/maxresdefault.jpg`,
            verified: c.verified ?? true,
          }));
        const sh = stored
          .filter((c) => c.format === 'shorts')
          .map((c) => ({
            id: c.id || c.youtube_video_id,
            title: c.title,
            channelName: c.channel_name,
            channelAvatar: c.channel_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.channel_name)}`,
            views: c.views || '2.4M views',
            likes: '140K',
            comments: '1.2K',
            soundTitle: 'Original Audio',
            imageUrl: c.thumbnail_url || `https://img.youtube.com/vi/${c.youtube_video_id}/maxresdefault.jpg`,
          }));
        if (lf.length > 0) setDbLongformCompetitors(lf);
        if (sh.length > 0) setDbShortsCompetitors(sh);
      }
    }
    loadSupabaseCompetitors();
  }, []);

  const handleImportYouTubeUrl = async () => {
    if (!youtubeUrlInput.trim()) return;
    setIsImporting(true);
    setImportStatus('Extracting YouTube thumbnail & metadata...');
    try {
      const res = await fetch('/api/youtube-oembed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setImportStatus(`Error: ${data.error || 'Failed to fetch'}`);
        setIsImporting(false);
        return;
      }

      const isShortVideo = data.isShort;

      if (isShortVideo) {
        const newShort: YouTubeShortItem = {
          id: data.videoId,
          title: data.title,
          channelName: data.authorName,
          channelAvatar: data.channelAvatar,
          views: data.views || '1.4M views',
          likes: '85K',
          comments: '940',
          soundTitle: `Original sound - ${data.authorName}`,
          imageUrl: data.thumbnailUrl,
          category: importCategory,
        };
        setDbShortsCompetitors((prev) => [newShort, ...prev.filter((item) => item.id !== data.videoId)]);
        setContentFormat('shorts');
        setSelectedFilterPill('All');
        setPlatformView((prev) => (isMobileScreen ? 'shorts-shelf' : prev === 'yt-desktop' ? 'shorts-shelf' : prev));

        const saveRes = await saveCompetitorToDatabase({
          youtube_video_id: data.videoId,
          title: data.title,
          channel_name: data.authorName,
          views: data.views,
          duration: data.duration,
          category: importCategory,
          format: 'shorts',
          thumbnail_url: data.thumbnailUrl,
        });
        if (saveRes.alreadyExists) {
          setImportStatus('✓ Video already in database! Feed updated.');
        } else {
          setImportStatus('✓ Saved to database & feed refreshed!');
        }
      } else {
        const newLong: YouTubeVideoItem = {
          id: data.videoId,
          title: data.title,
          channelName: data.authorName,
          channelAvatar: data.channelAvatar,
          views: data.views || '840K views',
          timeAgo: data.timeAgo || '1 day ago',
          duration: data.duration || '14:20',
          imageUrl: data.thumbnailUrl,
          category: importCategory,
          verified: true,
        };
        setDbLongformCompetitors((prev) => [newLong, ...prev.filter((item) => item.id !== data.videoId)]);
        setContentFormat('longform');
        setSelectedFilterPill('All');
        setPlatformView((prev) => (isMobileScreen ? 'yt-mobile' : prev));

        const saveRes = await saveCompetitorToDatabase({
          youtube_video_id: data.videoId,
          title: data.title,
          channel_name: data.authorName,
          views: data.views,
          duration: data.duration,
          category: importCategory,
          format: 'longform',
          thumbnail_url: data.thumbnailUrl,
        });
        if (saveRes.alreadyExists) {
          setImportStatus('✓ Video already in database! Feed updated.');
        } else {
          setImportStatus('✓ Saved to database & feed refreshed!');
        }
      }

      setTimeout(() => {
        setYoutubeImportOpen(false);
        setYoutubeUrlInput('');
        setImportStatus(null);
      }, 700);
    } catch (e: any) {
      setImportStatus(`Error: ${e?.message || 'Network error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Long-form combined feed
  const longformFeed = useMemo(() => {
    let base = [...dbLongformCompetitors];
    if (selectedFilterPill !== 'All') {
      base = base.filter((v) => v.category === selectedFilterPill || !v.category);
    }
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
      category: selectedFilterPill !== 'All' ? selectedFilterPill : 'Technology & AI',
      isCandidate: true,
    };
    const targetPos = Math.max(0, Math.min(base.length, slotPosition));
    const list = [...base];
    list.splice(targetPos, 0, candidateVideo);
    return list;
  }, [activeCandidate, slotPosition, randomSeed, dbLongformCompetitors, selectedFilterPill]);

  // Shorts combined feed
  const shortsFeed = useMemo(() => {
    let base = [...dbShortsCompetitors];
    if (selectedFilterPill !== 'All') {
      base = base.filter((v) => v.category === selectedFilterPill || !v.category);
    }
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
      category: selectedFilterPill !== 'All' ? selectedFilterPill : 'Technology & AI',
      isCandidate: true,
    };
    const targetPos = Math.max(0, Math.min(base.length, slotPosition));
    const list = [...base];
    list.splice(targetPos, 0, candidateShort);
    return list;
  }, [activeCandidate, slotPosition, randomSeed, dbShortsCompetitors, selectedFilterPill]);

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

  if (!mounted) {
    return (
      <div
        className="fs-app-root"
        style={{
          width: '100vw',
          height: '100vh',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFE500',
          fontFamily: 'monospace',
          fontWeight: 900,
          fontSize: '0.86rem',
        }}
      >
        INITIALIZING THUMBNAIL LAB...
      </div>
    );
  }

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

      {/* ── Single Ultra-Compact Studio Top HUD Bar (Fluid & Mobile Optimized) ── */}
      <header
        className="fs-header no-scrollbar"
        style={{
          minHeight: 44,
          background: '#000000',
          borderBottom: '1.5px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          zIndex: 50,
          flexShrink: 0,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          gap: 8,
        }}
      >
        <div className="fs-header-left" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Standard Sidebar Drawer Toggle Button */}
          <button
            onClick={() => setToolsSidebarOpen((v) => !v)}
            aria-label={toolsSidebarOpen ? 'Close tools navigation' : 'Open tools navigation'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              background: toolsSidebarOpen ? '#FFE500' : '#27272a',
              color: toolsSidebarOpen ? '#000000' : '#ffffff',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 900,
              borderRadius: 3,
              border: '1.5px solid #000',
              boxShadow: '1.5px 1.5px 0 #000',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Tools Navigation"
          >
            <PanelLeftOpen size={15} />
          </button>

          {/* Standard Home Back Button */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              background: '#27272a',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 900,
              textDecoration: 'none',
              borderRadius: 3,
              border: '1.5px solid #000',
              boxShadow: '1.5px 1.5px 0 #000',
              flexShrink: 0,
            }}
            title="Home"
          >
            ‹
          </Link>

          <span
            className="fs-header-badge"
            style={{
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#FFE500',
              color: '#000',
              padding: '4px 6px',
              borderRadius: 3,
              textTransform: 'uppercase',
              border: '1.5px solid #000',
              boxShadow: '1.5px 1.5px 0 #000',
            }}
          >
            THUMBNAIL LAB
          </span>

          {/* Format Selector: 16:9 Long-Form vs 9:16 Shorts */}
          <div style={{ display: 'flex', border: '1px solid #FFE500', borderRadius: 3, overflow: 'hidden', background: '#09090b', flexShrink: 0 }}>
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
              16:9 LONG
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
              9:16 SHORTS
            </button>
          </div>

          {/* View Selector: Desktop screens only. Mobile devices are locked to mobile feed */}
          {!isMobileScreen && (
            <div style={{ display: 'flex', border: '1px solid #3f3f46', borderRadius: 3, overflow: 'hidden', background: '#18181b', flexShrink: 0 }}>
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
                    MOBILE
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
                    DESKTOP
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
                    A/B MATRIX
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
                    SHELF
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
                    PLAYER
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
                    A/B MATRIX
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 1-Click Upload Button Directly in Header */}
        <div className="fs-header-right" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <label
            style={{
              background: contentFormat === 'longform' ? '#FFE500' : '#ff0000',
              color: contentFormat === 'longform' ? '#000000' : '#ffffff',
              borderRadius: 3,
              padding: '3px 8px',
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span>UPLOAD {contentFormat === 'longform' ? '16:9' : '9:16'}</span>
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, activeCandidate.id)} style={{ display: 'none' }} />
          </label>

          <button
            onClick={startGlanceTest}
            style={{
              padding: '3px 7px',
              fontSize: '0.62rem',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: glanceState !== 'idle' ? '#FFE500' : '#27272a',
              color: glanceState !== 'idle' ? '#000' : '#fff',
              border: '1px solid #3f3f46',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 800,
              flexShrink: 0,
            }}
            title="Starts a 3-second rapid glance timer (Spacebar)"
          >
            <span>3S GLANCE</span>
          </button>

          <button
            onClick={handleShuffleFeed}
            style={{
              padding: '3px 7px',
              fontSize: '0.62rem',
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
              flexShrink: 0,
            }}
            title="Randomize competitor positions (R)"
          >
            <span>SHUFFLE</span>
          </button>

          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#FFE500',
              color: '#000',
              padding: '2px 6px',
              borderRadius: 3,
              border: '1px solid #000',
              flexShrink: 0,
            }}
          >
            {overallPopoutScore}/100
          </div>
        </div>
      </header>

      {/* ── Mobile 1-Line Neo-Brutalist Tabs Bar ── */}
      <div
        className="mobile-only-tabs-bar"
        style={{
          display: isMobileScreen ? 'flex' : 'none',
          background: '#000000',
          borderBottom: '2px solid #FFE500',
          padding: '4px 8px',
          gap: 4,
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        {[
          { id: 'feed' as const, label: 'FEED SIMULATOR' },
          { id: 'grader' as const, label: `CTR GRADER (${overallPopoutScore})` },
          { id: 'variations' as const, label: `A/B VARS (${currentCandidates.length})` },
        ].map((tab) => {
          const isActive = mobileActiveView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setMobileActiveView(tab.id);
                if (tab.id === 'grader') setActiveSidebarTab('audit');
                if (tab.id === 'variations') setActiveSidebarTab('candidates');
              }}
              style={{
                flex: 1,
                padding: '7px 3px',
                border: '1.5px solid #000',
                borderRadius: 3,
                background: isActive ? '#FFE500' : '#18181b',
                color: isActive ? '#000000' : '#ffffff',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                transition: 'all 0.1s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Quick Candidate Variation Strip Above Feed ── */}
      <div
        style={{
          display: !isMobileScreen || mobileActiveView === 'feed' ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 12px',
          background: '#141416',
          borderBottom: '1.5px solid #27272a',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          gap: 6,
          flexShrink: 0,
        }}
        className="no-scrollbar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', textTransform: 'uppercase' }}>
            A/B VARS:
          </span>
          {currentCandidates.map((cand, idx) => {
            const isSelected = cand.id === currentActiveId;
            return (
              <button
                key={cand.id}
                onClick={() => {
                  if (contentFormat === 'longform') setActiveLongformId(cand.id);
                  else setActiveShortsId(cand.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: isSelected ? '1.5px solid #FFE500' : '1px solid #3f3f46',
                  background: isSelected ? '#FFE500' : '#27272a',
                  color: isSelected ? '#000000' : '#ffffff',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.62rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <img
                  src={cand.imageUrl}
                  alt=""
                  onError={(e) => { e.currentTarget.src = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'; }}
                  style={{ width: 14, height: 14, borderRadius: 2, objectFit: 'cover' }}
                />
                <span>Var {String.fromCharCode(65 + idx)} {isSelected ? '★' : ''}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setYoutubeImportOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 3,
              border: '1px solid #FFE500',
              background: '#FFE500',
              color: '#000000',
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '0.62rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '1.5px 1.5px 0 #000',
            }}
            title="Import any real YouTube thumbnail by URL"
          >
            <Link2 size={11} />
            <span>+ YOUTUBE URL</span>
          </button>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 3,
              border: '1px dashed #FFE500',
              background: 'transparent',
              color: '#FFE500',
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '0.62rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Plus size={11} />
            <span>+ UPLOAD VAR</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e)}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* ── YouTube Link Importer Modal ── */}
      {youtubeImportOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#18181b',
              border: '2px solid #FFE500',
              borderRadius: 6,
              padding: 20,
              boxShadow: '6px 6px 0 #000',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #27272a', paddingBottom: 10 }}>
              <div style={{ fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={16} />
                <span>Import YouTube Competitor</span>
              </div>
              <button
                onClick={() => {
                  setYoutubeImportOpen(false);
                  setImportStatus(null);
                }}
                style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#ccc', margin: 0, lineHeight: 1.4 }}>
              Paste any YouTube video or Shorts link (e.g. <code>youtube.com/watch?v=...</code> or <code>youtu.be/...</code>). We automatically extract the 1080p high-res thumbnail, title, and channel name into your feed!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
                YouTube Video or Shorts URL
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrlInput}
                onChange={(e) => setYoutubeUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImportYouTubeUrl()}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#09090b',
                  border: '1.5px solid #3f3f46',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {importStatus && (
              <div
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: importStatus.startsWith('Error') ? '#ef4444' : '#FFE500',
                  padding: '6px 10px',
                  background: '#09090b',
                  borderRadius: 3,
                  border: '1px solid #27272a',
                }}
              >
                {importStatus}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => {
                  setYoutubeImportOpen(false);
                  setImportStatus(null);
                }}
                style={{
                  padding: '8px 14px',
                  background: '#27272a',
                  color: '#fff',
                  border: '1px solid #3f3f46',
                  borderRadius: 3,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleImportYouTubeUrl}
                disabled={isImporting || !youtubeUrlInput.trim()}
                style={{
                  padding: '8px 18px',
                  background: isImporting || !youtubeUrlInput.trim() ? '#52525b' : '#FFE500',
                  color: '#000000',
                  border: '1.5px solid #000',
                  borderRadius: 3,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  cursor: isImporting || !youtubeUrlInput.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                {isImporting ? 'FETCHING...' : 'FETCH & ADD TO FEED'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Canvas Viewport (Starts Immediately from Pixel 44) ── */}
      <div className="fs-workspace" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Center Live Simulation Area */}
        <div
          style={{
            flex: 1,
            background: '#09090b',
            color: '#f1f1f1',
            overflowY: 'auto',
            display: !isMobileScreen || mobileActiveView === 'feed' ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: (platformView === 'yt-mobile' || platformView === 'shorts-shelf' || platformView === 'shorts-player') ? '16px 0 40px' : '0',
            position: 'relative',
          }}
          className="no-scrollbar"
        >
          {/* 3s Glance Test: 1. COUNTDOWN MODAL */}
          {glanceState === 'countdown' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(20px)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 20,
              }}
            >
              <div style={{ fontSize: '5rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', textShadow: '4px 4px 0 #000' }}>
                {glanceCountdown}
              </div>
              <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#fff', letterSpacing: '0.05em' }}>
                PREPARING 3-SECOND GLANCE TEST...
              </div>
              <p style={{ fontSize: '0.74rem', color: '#aaa', maxWidth: 320, textAlign: 'center', margin: 0 }}>
                Look at the screen naturally. In a moment, the feed will reveal for 3 seconds. Notice which thumbnail your eye hits first.
              </p>
              <button
                onClick={stopGlanceTest}
                style={{
                  marginTop: 10,
                  padding: '6px 14px',
                  background: '#27272a',
                  color: '#fff',
                  border: '1px solid #52525b',
                  borderRadius: 3,
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </div>
          )}

          {/* 3s Glance Test: 2. LIVE GLANCE HUD FLOATING BANNER */}
          {glanceState === 'glancing' && (
            <div
              style={{
                position: 'fixed',
                top: 44,
                left: 0,
                right: 0,
                width: '100vw',
                zIndex: 9998,
                background: '#FFE500',
                color: '#000000',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.78rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
              }}
            >
              <span>GLANCE NOW: {glanceSecondsLeft}S REMAINING</span>
              <button
                onClick={stopGlanceTest}
                style={{
                  padding: '3px 10px',
                  background: '#000000',
                  color: '#FFE500',
                  border: 'none',
                  borderRadius: 2,
                  fontWeight: 900,
                  fontSize: '0.64rem',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                STOP
              </button>
            </div>
          )}

          {/* 3s Glance Test: 3. FINISHED / RE-TEST MODAL */}
          {glanceState === 'finished' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(20px)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div style={{ background: '#FFE500', color: '#000', padding: '4px 10px', borderRadius: 3, fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem' }}>
                TIME&apos;S UP!
              </div>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>
                3-Second Glance Test Complete
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#d4d4d8', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
                Be honest: Did your candidate thumbnail pop out first among the competitor videos?
              </p>

              <div style={{ background: '#18181b', border: '1.5px solid #3f3f46', padding: '10px 16px', borderRadius: 4, display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontFamily: 'monospace', fontWeight: 800 }}>CTR STANDOUT SCORE:</span>
                <span style={{ fontSize: '1rem', color: '#FFE500', fontFamily: 'monospace', fontWeight: 900 }}>{overallPopoutScore}/100</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={startGlanceTest}
                  style={{
                    padding: '8px 16px',
                    background: '#FFE500',
                    color: '#000',
                    border: '2px solid #000',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  RETEST 3S GLANCE
                </button>
                <button
                  onClick={() => setGlanceState('idle')}
                  style={{
                    padding: '8px 16px',
                    background: '#27272a',
                    color: '#fff',
                    border: '1px solid #52525b',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  BACK TO LAB
                </button>
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
                {/* Real YouTube Mobile Top Header (Sticky Top) */}
                <div style={{ position: 'sticky', top: 0, zIndex: 20, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: '#0f0f0f', borderBottom: '1px solid #1f1f1f' }}>
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

                {/* Filter Chips Bar (Sticky Top below header) */}
                <div style={{ position: 'sticky', top: 48, zIndex: 19, background: '#0f0f0f', height: 42, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', overflowX: 'auto', borderBottom: '1px solid #1f1f1f' }} className="no-scrollbar">
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
                            <img
                              src={video.imageUrl}
                              alt={video.title}
                              onError={(e) => { e.currentTarget.src = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'; }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '16/9', display: 'block' }}
                            />
                            {showDurationBadge && (
                              <div style={{ position: 'absolute', bottom: 6, right: 6, background: video.isLive ? '#cc0000' : 'rgba(0,0,0,0.85)', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 4px', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                {video.isLive && <Radio size={10} />}
                                {video.duration}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', padding: '10px 12px 0', gap: 12 }}>
                            <img
                              src={video.channelAvatar}
                              alt={video.channelName}
                              onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(video.channelName)}`; }}
                              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
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
                                  <Zap size={13} color="#ffffff" />
                                </div>
                                <span>Shorts</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }} className="no-scrollbar">
                              {SHORTS_COMPETITORS.slice(0, 3).map((short) => (
                                <div key={short.id} style={{ width: 140, flexShrink: 0 }}>
                                  <div style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', background: '#272727', position: 'relative' }}>
                                    <img
                                      src={short.imageUrl}
                                      alt={short.title}
                                      onError={(e) => { e.currentTarget.src = 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg'; }}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.66rem', fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                                      {short.views}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 6, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25 }}>
                                    {short.title}
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

                {/* Mobile Bottom Navigation Bar (Sticky to bottom) */}
                <div
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 48,
                    background: '#0f0f0f',
                    borderTop: '1px solid #1f1f1f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    zIndex: 30,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                    <HomeIcon size={18} color="#ffffff" />
                    <span style={{ fontSize: '0.55rem' }}>Home</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                    <Zap size={18} color="#aaaaaa" />
                    <span style={{ fontSize: '0.55rem', color: '#aaa' }}>Shorts</span>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={20} color="#ffffff" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                    <Radio size={18} color="#aaaaaa" />
                    <span style={{ fontSize: '0.55rem', color: '#aaa' }}>Subscriptions</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ff0000', overflow: 'hidden' }}>
                      <img src={activeCandidate.channelAvatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '0.55rem', color: '#aaa' }}>You</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. LONG-FORM: YOUTUBE DESKTOP FEED (3-GRID BROWSE)             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'longform' && platformView === 'yt-desktop' && (
              <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '20px 24px', background: '#0f0f0f', minHeight: '100vh', fontFamily: '"Roboto", sans-serif' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px 16px' }}>
                  {longformFeed.map((video, idx) => {
                    const isCandidate = video.isCandidate;
                    return (
                      <div key={video.id + idx} style={{ display: 'flex', flexDirection: 'column', position: 'relative', border: revealHighlight && isCandidate ? '2px solid #FFE500' : 'none', borderRadius: 8, padding: 4 }}>
                        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#272727' }}>
                          <img src={video.imageUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {showDurationBadge && (
                            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                              {video.duration}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                          <img src={video.channelAvatar} alt={video.channelName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {video.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 4 }}>{video.channelName} {video.verified && '✓'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{video.views} • {video.timeAgo}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. SHORTS: DEDICATED VERTICAL SHELF VIEW (390px)               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'shorts' && platformView === 'shorts-shelf' && (
              <div style={{ width: '390px', background: '#0f0f0f', color: '#fff', border: '1px solid #27272a', padding: '16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Zap size={20} color="#ff0000" />
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>YouTube Shorts Shelf</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {shortsFeed.map((short, idx) => (
                    <div key={short.id + idx} style={{ width: '100%', position: 'relative', border: revealHighlight && short.isCandidate ? '2px solid #FFE500' : 'none', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: 260, background: '#1c1c1c', position: 'relative' }}>
                        <img src={short.imageUrl} alt={short.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {short.title}
                          </div>
                          <div style={{ fontSize: '0.66rem', opacity: 0.85, marginTop: 4 }}>{short.views}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. SHORTS: FULL IMMERSIVE SHORTS PLAYER (390px)                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {contentFormat === 'shorts' && platformView === 'shorts-player' && (
              <div style={{ width: '390px', height: '690px', background: '#000000', position: 'relative', overflow: 'hidden', border: '1px solid #27272a', boxShadow: '0 0 50px rgba(0,0,0,0.9)' }}>
                <img src={activeCandidate.imageUrl} alt={activeCandidate.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                {/* UI Overlay */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>Shorts</span>
                    <Search size={20} color="#fff" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <img src={activeCandidate.channelAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{activeCandidate.channelName}</span>
                        <button style={{ padding: '4px 10px', background: '#cc0000', color: '#fff', border: 'none', borderRadius: 16, fontSize: '0.7rem', fontWeight: 700 }}>
                          Subscribe
                        </button>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                        {activeCandidate.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <ThumbsUp size={22} color="#fff" />
                        <span style={{ fontSize: '0.65rem', color: '#fff', marginTop: 4 }}>142K</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <ThumbsDown size={22} color="#fff" />
                        <span style={{ fontSize: '0.65rem', color: '#fff', marginTop: 4 }}>Dislike</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <MessageSquare size={22} color="#fff" />
                        <span style={{ fontSize: '0.65rem', color: '#fff', marginTop: 4 }}>1.2K</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Share2 size={22} color="#fff" />
                        <span style={{ fontSize: '0.65rem', color: '#fff', marginTop: 4 }}>Share</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 5. A/B MATRIX: SIDE-BY-SIDE ALL CANDIDATES                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {platformView === 'side-by-side' && (
              <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', padding: '24px', background: '#09090b', minHeight: '100vh' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFE500', margin: 0 }}>
                      A/B VARIATIONS COMPARISON MATRIX
                    </h2>
                    <p style={{ fontSize: '0.72rem', color: '#aaa', margin: '4px 0 0' }}>
                      Simultaneously compare thumbnail brightness, text readability, and focal points across variations.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  {currentCandidates.map((cand, idx) => {
                    const isSelected = cand.id === currentActiveId;
                    return (
                      <div
                        key={cand.id}
                        onClick={() => {
                          if (contentFormat === 'longform') setActiveLongformId(cand.id);
                          else setActiveShortsId(cand.id);
                        }}
                        style={{
                          background: '#18181b',
                          border: isSelected ? '2px solid #FFE500' : '1px solid #27272a',
                          borderRadius: 8,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 20px rgba(255, 229, 0, 0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, color: isSelected ? '#FFE500' : '#fff' }}>
                            {cand.name}
                          </span>
                          {isSelected && (
                            <span style={{ background: '#FFE500', color: '#000', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: 3 }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ width: '100%', aspectRatio: contentFormat === 'longform' ? '16/9' : '9/16', borderRadius: 6, overflow: 'hidden', position: 'relative', background: '#000' }}>
                          <img src={cand.imageUrl} alt={cand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CTR Grader Sidebar / Mobile Inspector */}
        <aside
          style={{
            width: isMobileScreen ? '100%' : 340,
            background: '#18181b',
            borderLeft: isMobileScreen ? 'none' : '1.5px solid #27272a',
            display: !isMobileScreen || mobileActiveView !== 'feed' ? 'flex' : 'none',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
            flex: isMobileScreen ? 1 : 'none',
          }}
          className="no-scrollbar"
        >
          {/* Desktop Sub-Tabs */}
          {!isMobileScreen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #27272a', background: '#09090b' }}>
              {[
                { id: 'audit', label: 'GRADER' },
                { id: 'candidates', label: 'EDIT INFO' },
                { id: 'export', label: 'EXPORT' },
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
                    fontSize: '0.66rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* GRADER TAB */}
            {(activeSidebarTab === 'audit' || (isMobileScreen && mobileActiveView === 'grader')) && (
              <>
                <div style={{ padding: 12, background: '#27272a', border: '1.5px solid #000', boxShadow: '3px 3px 0 #000', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                      CTR Standout Score
                    </span>
                    <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 900, color: '#FFE500', background: '#000', padding: '2px 8px', borderRadius: 3, border: '1px solid #FFE500' }}>
                      {overallPopoutScore}/100
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 800 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Luminance & Contrast:</span>
                        <span>{contrastLuminanceScore}%</span>
                      </div>
                      <div style={{ height: 5, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${contrastLuminanceScore}%`, height: '100%', background: '#FFE500' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>Safe Zone Margin:</span>
                        <span>{badgeCollisionScore}%</span>
                      </div>
                      <div style={{ height: 5, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${badgeCollisionScore}%`, height: '100%', background: hasBadgeHazard ? '#ef4444' : '#FFE500' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Second Glance Test Card */}
                <div style={{ padding: 12, background: '#27272a', border: '1.5px solid #FFE500', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '3px 3px 0 #000' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                    3-Second Human Glance Test
                  </span>
                  <p style={{ fontSize: '0.64rem', color: '#ccc', margin: 0, lineHeight: 1.4 }}>
                    Blurs the screen, counts down 3-2-1, and reveals the feed for 3 seconds to test what catches the eye first.
                  </p>
                  <button
                    onClick={startGlanceTest}
                    style={{ padding: '8px 12px', background: '#FFE500', color: '#000', border: '1.5px solid #000', borderRadius: 3, fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'monospace', boxShadow: '2px 2px 0 #000' }}
                  >
                    Start 3s Glance Test (Spacebar)
                  </button>
                </div>

                {/* Squint / Blur Test using TactileScrubber */}
                <div style={{ padding: 12, background: '#27272a', border: '1.5px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '2px 2px 0 #000' }}>
                  <TactileScrubber
                    label="Squint / Blur Test"
                    value={blurAmount}
                    min={0}
                    max={10}
                    step={1}
                    stepDelta={1}
                    onChange={setBlurAmount}
                    formatValue={(v) => `${v}px`}
                    presetsLayout="below"
                    presets={[
                      { label: '0px (Clear)', value: 0 },
                      { label: '3px (Glance)', value: 3 },
                      { label: '6px (Squint)', value: 6 },
                      { label: '10px (Max)', value: 10 },
                    ]}
                  />
                </div>

                {/* Accessibility Color Vision Chips */}
                <div style={{ padding: 12, background: '#27272a', border: '1.5px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '2px 2px 0 #000' }}>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                    Color Vision Accessibility
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                    {[
                      { id: 'none' as const, label: 'Normal' },
                      { id: 'deuteranopia' as const, label: 'Deuteranopia' },
                      { id: 'protanopia' as const, label: 'Protanopia' },
                      { id: 'tritanopia' as const, label: 'Tritanopia' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setColorBlindMode(mode.id)}
                        style={{
                          padding: '6px 4px',
                          border: '1.5px solid #000',
                          borderRadius: 3,
                          background: colorBlindMode === mode.id ? '#FFE500' : '#18181b',
                          color: colorBlindMode === mode.id ? '#000000' : '#ffffff',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.62rem',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* B&W Tonal Contrast Check */}
                <div style={{ padding: 10, background: '#27272a', border: '1.5px solid #3f3f46', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '2px 2px 0 #000' }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                    B&W Tonal Contrast
                  </span>
                  <button
                    onClick={() => setIsGrayscale(!isGrayscale)}
                    style={{
                      padding: '4px 10px',
                      border: '1.5px solid #000',
                      borderRadius: 3,
                      background: isGrayscale ? '#FFE500' : '#18181b',
                      color: isGrayscale ? '#000000' : '#ffffff',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '0.64rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isGrayscale ? 'ON' : 'OFF'}
                  </button>
                </div>
              </>
            )}

            {/* EDIT INFO / VARIATIONS TAB */}
            {(activeSidebarTab === 'candidates' || (isMobileScreen && mobileActiveView === 'variations')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, background: '#27272a', border: '1.5px solid #3f3f46', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '3px 3px 0 #000' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                      Edit {activeCandidate.name}
                    </span>
                    <label
                      style={{
                        padding: '3px 8px',
                        background: '#FFE500',
                        color: '#000',
                        border: '1px solid #000',
                        borderRadius: 3,
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      Replace Image
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, activeCandidate.id)} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                      Video Title
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
                      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #000', borderRadius: 3, fontSize: '0.76rem', background: '#141416', color: '#fff', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
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
                      style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #000', borderRadius: 3, fontSize: '0.72rem', background: '#141416', color: '#fff' }}
                    />
                  </div>
                </div>

                {/* Candidate Variations List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#FFE500' }}>
                    All Variations ({currentCandidates.length})
                  </span>

                  {currentCandidates.map((cand, idx) => {
                    const isSelected = cand.id === currentActiveId;
                    return (
                      <div
                        key={cand.id}
                        onClick={() => {
                          if (contentFormat === 'longform') setActiveLongformId(cand.id);
                          else setActiveShortsId(cand.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: 8,
                          background: '#27272a',
                          border: isSelected ? '2px solid #FFE500' : '1px solid #3f3f46',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <img src={cand.imageUrl} alt="" style={{ width: 44, height: 28, borderRadius: 2, objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', color: isSelected ? '#FFE500' : '#fff' }}>
                            Var {String.fromCharCode(65 + idx)} {isSelected ? '★ ACTIVE' : ''}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cand.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

      {/* ── Tools Navigation Sidebar Drawer Overlay ── */}
      {toolsSidebarOpen && (
        <div
          onClick={() => setToolsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9900,
          }}
        />
      )}

      {/* ── Tools Navigation Sidebar Drawer ── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: toolsSidebarOpen ? 0 : '-300px',
          width: 280,
          bottom: 0,
          background: '#141416',
          borderRight: '2px solid #000',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9901,
          boxShadow: toolsSidebarOpen ? '6px 0 25px rgba(0,0,0,0.9)' : 'none',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '2px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#09090b',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#FFE500', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            TOOLS NAVIGATION
          </div>
          <button
            onClick={() => setToolsSidebarOpen(false)}
            aria-label="Close tools navigation"
            style={{
              background: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: 3,
              cursor: 'pointer',
              color: '#fff',
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ALL_TOOLS.map((tool) => {
            const isActive = tool.href === '/thumbnail-lab';
            return (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setToolsSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  background: isActive ? '#FFE500' : 'transparent',
                  color: isActive ? '#000000' : '#e4e4e7',
                  fontWeight: isActive ? 900 : 700,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  border: isActive ? '1.5px solid #000' : '1.5px solid transparent',
                  boxShadow: isActive ? '2px 2px 0 #000' : 'none',
                  transition: 'all 0.1s ease',
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.label}</span>
                <span
                  style={{
                    fontSize: '0.55rem',
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: isActive ? '#000000' : '#27272a',
                    color: isActive ? '#FFE500' : '#a1a1aa',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {tool.hint}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
