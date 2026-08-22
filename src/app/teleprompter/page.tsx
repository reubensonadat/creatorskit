'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Type,
  Sparkles,
  FileText,
  Mic,
  Camera,
  HelpCircle,
  X,
  Radio,
  Bookmark,
  ChevronRight,
  Download,
  Activity,
  Shield,
  MoveHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Zap,
  Layout,
  ChevronDown,
  Pipette,
} from 'lucide-react';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';

const ALL_CREATORKIT_TOOLS = [
  { label: 'Studio Teleprompter', href: '/teleprompter', icon: '🎙️', hint: 'AI SPEECH SYNC' },
  { label: 'Thumbnail Lab & Split-Tester', href: '/thumbnail-lab', icon: '🔥', hint: 'CTR GRADER' },
  { label: 'Exposure & False Color', href: '/exposure-monitor', icon: '📊', hint: 'SCOPES & IRE' },
  { label: 'Text Match CUT', href: '/match-cut', icon: '✂️', hint: 'WORD ANCHOR' },
  { label: 'Text Behind Image', href: '/text-behind', icon: '🖼️', hint: 'AI LAYERING' },
  { label: 'Text Highlighter', href: '/text-highlighter', icon: '🖍️', hint: 'ANIMATED SWEEPS' },
  { label: 'Production Sync Slate', href: '/sync-slate', icon: '🎬', hint: 'SMPTE CLAPPER' },
  { label: 'Creator Space Planner', href: '/space-planner', icon: '📐', hint: '3D STUDIO' },
  { label: 'Auto-Captions', href: '/auto-captions', icon: '💬', hint: 'WHISPER AI' },
  { label: 'Carousel Slicer', href: '/carousel-slicer', icon: '📱', hint: 'MULTI-SLIDES' },
  { label: 'Quote Card Maker', href: '/quote-card', icon: '📝', hint: 'POST GRAPHICS' },
  { label: 'Platform Resizer', href: '/resizer', icon: '📐', hint: 'AUTO SIZES' },
  { label: 'Palette Extractor', href: '/palette-extractor', icon: '🎨', hint: 'COLORS' },
  { label: 'Image Compressor', href: '/compressor', icon: '⚡', hint: 'WEBP / JPEG' },
  { label: 'Watermark Batch', href: '/watermark', icon: '🔒', hint: 'BULK ZIP' },
  { label: 'Background Replace', href: '/background-replace', icon: '✨', hint: 'AI REMOVE' },
  { label: 'Silence Trimmer', href: '/silence-trimmer', icon: '🔇', hint: 'AUDIO CUT' },
  { label: 'Color Gradient', href: '/color-gradient', icon: '🌈', hint: 'CSS GRADIENTS' },
];

export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5' | '4:3';
export type CameraLayoutMode = 'corner-pip' | 'full-bg' | 'off';
export type PipCornerPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface SafeAreaConfig {
  label: string;
  top: number;
  bottom: number;
  right: number;
  left: number;
  description: string;
}

const SMART_SAFE_AREAS: Record<string, SafeAreaConfig> = {
  '9:16': {
    label: '9:16 TikTok / Reels / Shorts',
    top: 14,
    bottom: 34,
    right: 22,
    left: 0,
    description: 'Protects against TikTok right side action icons, bottom captions/sound, and top header.',
  },
  '16:9': {
    label: '16:9 YouTube / Broadcast Landscape',
    top: 5,
    bottom: 5,
    right: 5,
    left: 5,
    description: 'Wide safe area — 90% action safe & 80% title safe guides with maximum screen visibility.',
  },
  '1:1': {
    label: '1:1 Square Feed Post',
    top: 4,
    bottom: 12,
    right: 4,
    left: 4,
    description: 'Safe for Instagram square feed with subtle bottom username & caption allowance.',
  },
  '4:5': {
    label: '4:5 Instagram Portrait Post',
    top: 6,
    bottom: 16,
    right: 4,
    left: 4,
    description: 'Optimized for Instagram portrait timeline posts.',
  },
  '4:3': {
    label: '4:3 Broadcast / Prompter Standard',
    top: 6,
    bottom: 8,
    right: 6,
    left: 6,
    description: 'Standard 4:3 studio beam-splitter safe zone.',
  },
};

const TEXT_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Cyber Amber', hex: '#FFE500' },
  { name: 'Electric Cyan', hex: '#00F0FF' },
  { name: 'Neon Green', hex: '#00FF66' },
  { name: 'High-Vis Yellow', hex: '#FFFF00' },
  { name: 'Warm Paper', hex: '#F3E8D6' },
];

const CREATOR_SCRIPT_TEMPLATES = [
  {
    id: 'youtube-viral',
    name: '🎬 YouTube Viral Hook + 3 Frameworks + CTA',
    category: 'YouTube Long-form',
    text: `[HOOK - LOOK DIRECTLY INTO LENS]
If you are still struggling to grow your channel in 2026, you are making this one critical mistake.

[SMILE - INTRO]
Welcome back creators. Today I am breaking down the exact 3-part framework that doubled our audience in under 90 days.

[STEP 1 - PACKAGING FIRST]
First, stop spending 80% of your time on editing and only 20% on your packaging. The thumbnail and the first 5 seconds determine 90% of your video reach.

[PAUSE - 2 SECONDS]

[STEP 2 - RETENTION PACING]
Second, cut the fluff. Never introduce yourself for 30 seconds. Dive straight into the promised value with dynamic cuts and visual pattern interrupts.

[STEP 3 - OPEN LOOPS]
Third, always create open loops. Tease the best takeaway right before your mid-roll to keep viewer retention rock solid throughout.

[CALL TO ACTION]
If this gave you value, hit subscribe and check the link in the description for our free creator blueprint!`,
  },
  {
    id: 'tiktok-60s',
    name: '📱 60-Second Viral Short / Reel',
    category: 'Short-Form',
    text: `[EXPLOSIVE HOOK]
Do NOT buy expensive camera gear until you know these 3 free lighting tricks!

[POINT 1]
Trick number one: Place your key light at a 45-degree angle right above eye level. This creates cinematic Rembrandt lighting instantly.

[POINT 2]
Trick number two: Use practical lamps in the background to separate yourself from the room and add warm depth.

[POINT 3]
Trick number three: Diffuse harsh daylight through a simple white sheet for soft, flattering Hollywood tones.

[CTA]
Save this video for your next shoot and drop a follow for daily creator hacks!`,
  },
  {
    id: 'podcast-intro',
    name: '🎙️ Podcast / Interview Episode Intro',
    category: 'Podcast',
    text: `[PODCAST INTRO - HIGH ENERGY]
Welcome to another episode of Creator Kit Unfiltered! 

[GUEST INTRO]
Today we are joined by one of the top content strategists in the industry who scaled from zero to over 1 million subscribers in just 14 months.

[CORE TEASER]
We are discussing the future of AI production, building sustainable sponsorships, and how to avoid creator burnout.

[PAUSE]
Grab your headphones and let's jump right in!`,
  },
  {
    id: 'product-pitch',
    name: '🚀 Product Launch & Feature Demo',
    category: 'Business',
    text: `[ATTENTION HOOK]
What if you could produce high-converting video content in half the time without hiring an expensive production team?

[SOLUTION DEMO]
Introducing CreatorKit — the all-in-one browser suite for modern storytellers. With zero subscriptions and instant client-side processing, you can edit, sync, and deliver faster than ever.

[CTA]
Get started today for free at CreatorKit.win!`,
  },
];

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with']);

function cleanWordForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

function SafeAreaGuideOverlay({
  aspectRatio,
  mirrored,
}: {
  aspectRatio: AspectRatioType;
  mirrored: boolean;
}) {
  const config = SMART_SAFE_AREAS[aspectRatio] || SMART_SAFE_AREAS['9:16'];
  const is916 = aspectRatio === '9:16';
  const is169 = aspectRatio === '16:9';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        transform: mirrored ? 'scaleX(-1)' : 'none',
        transformOrigin: '50% 50%',
        zIndex: 20,
      }}
    >
      {is916 ? (
        <>
          {/* Top Danger */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${config.top}%`,
              background: 'linear-gradient(to bottom, rgba(239,68,68,0.45) 0%, transparent 100%)',
              borderBottom: '1px dashed rgba(239,68,68,0.8)',
            }}
          />
          {/* Bottom Danger */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${config.bottom}%`,
              background: 'linear-gradient(to top, rgba(239,68,68,0.5) 0%, transparent 100%)',
              borderTop: '1px dashed rgba(239,68,68,0.8)',
            }}
          />
          {/* Right Icons Danger */}
          <div
            style={{
              position: 'absolute',
              top: `${config.top}%`,
              bottom: `${config.bottom}%`,
              right: 0,
              width: `${config.right}%`,
              background: 'rgba(239,68,68,0.25)',
              borderLeft: '1px dashed rgba(239,68,68,0.8)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              padding: 2,
              fontSize: '0.45rem',
            }}
          >
            <div>❤️</div>
            <div>💬</div>
            <div>↗️</div>
          </div>
          {/* Safe Box */}
          <div
            style={{
              position: 'absolute',
              top: `${config.top}%`,
              bottom: `${config.bottom}%`,
              left: 0,
              right: `${config.right}%`,
              border: '1.5px solid #22c55e',
            }}
          />
        </>
      ) : is169 ? (
        <div
          style={{
            position: 'absolute',
            top: '5%',
            bottom: '5%',
            left: '5%',
            right: '5%',
            border: '1.5px solid rgba(34,197,94,0.7)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            top: `${config.top}%`,
            bottom: `${config.bottom}%`,
            left: `${config.left}%`,
            right: `${config.right}%`,
            border: '1.5px solid #22c55e',
          }}
        />
      )}
    </div>
  );
}

export default function TeleprompterPage() {
  // Core Prompter State
  const [script, setScript] = useState(
    `[HOOK - LOOK DIRECTLY AT THE LENS]
Welcome to CreatorKit Pro Teleprompter!

[CORNER CAMERA PIP]
You can now see yourself cleanly in the top-right corner, or switch to full background whenever you like!

[SMOOTH AI SYNC]
Start reading aloud and notice how the prompter glides gently with your natural speaking cadence.

[PAUSE TEST]
When you pause to take a breath or emphasize a point, the auto-scroll smoothly freezes immediately.

[CUSTOM TEXT WIDTH]
Adjust your reading width to 28 or 32 characters in the Width tab so your eyes stay centered directly beneath your camera lens!`
  );

  // Playback & Speed Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2.2);
  const [fontSize, setFontSize] = useState(42);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textPaddingHorizontal, setTextPaddingHorizontal] = useState(20);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('"Inter", sans-serif');
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>('All');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // Text Column Width Customization (Default: 30ch Lens-Contact)
  const [widthUnit, setWidthUnit] = useState<'ch' | '%' | 'px'>('ch');
  const [columnCharWidth, setColumnCharWidth] = useState<number>(30); // 15 to 80 chars
  const [columnPercentWidth, setColumnPercentWidth] = useState<number>(55); // 20% to 100%
  const [columnPixelWidth, setColumnPixelWidth] = useState<number>(560); // 260 to 1200 px
  const [eyelinePercent, setEyelinePercent] = useState(38); // 15% to 65% height
  const [showEyelineGuide, setShowEyelineGuide] = useState(true);
  const [bgDimOpacity, setBgDimOpacity] = useState(0.7);

  // Camera & Layout Controls
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLayout, setCameraLayout] = useState<CameraLayoutMode>('corner-pip'); // 'corner-pip' | 'full-bg' | 'off'
  const [pipPosition, setPipPosition] = useState<PipCornerPosition>('top-right');
  const [pipSize, setPipSize] = useState<'sm' | 'md' | 'lg'>('md'); // sm=180px, md=240px, lg=320px
  const [cameraAspectRatio, setCameraAspectRatio] = useState<AspectRatioType>('9:16');
  const [showSafeAreas, setShowSafeAreas] = useState(true);

  // Mirror Controls
  const [mirrorHorizontal, setMirrorHorizontal] = useState(false);
  const [mirrorVertical, setMirrorVertical] = useState(false);
  const [loop, setLoop] = useState(false);

  // Optical Lens Focus Spotlight
  const [circularFocusLens, setCircularFocusLens] = useState<boolean>(true);
  const [focusIntensity, setFocusIntensity] = useState<number>(0.7);

  // Sidebar & Layout State
  const [showSettings, setShowSettings] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'camera' | 'speech' | 'width' | 'audio' | 'fonts' | 'cues' | 'templates'>('camera');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // 1. Web Speech AI Auto-Scroll State
  const [speechFollowEnabled, setSpeechFollowEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'speaking' | 'paused' | 'unsupported'>('idle');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [lastHeardWord, setLastHeardWord] = useState<string>('');
  const [speechDamping, setSpeechDamping] = useState<number>(0.07);
  const [autoPauseThresholdMs, setAutoPauseThresholdMs] = useState(750);

  // 2. Live Web Audio VU Meter & Real-time Decibel Monitor State
  const [, setAudioMeterActive] = useState(false);
  const [rmsDecibels, setRmsDecibels] = useState<number>(-60);
  const [peakDecibels, setPeakDecibels] = useState<number>(-60);
  const [isClipping, setIsClipping] = useState<boolean>(false);
  const [noiseFloorDb, setNoiseFloorDb] = useState<number>(-45);
  const [isCalibratingNoise, setIsCalibratingNoise] = useState<boolean>(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Tokenize script into word array
  const scriptTokens = useMemo(() => {
    const tokens: { id: number; raw: string; isCue: boolean; clean: string; isBreak: boolean }[] = [];
    const splits = script.split(/(\s+)/);
    let wordIdx = 0;

    splits.forEach((tok) => {
      if (/^\s+$/.test(tok)) {
        if (tok.includes('\n')) {
          tokens.push({ id: -1, raw: tok, isCue: false, clean: '', isBreak: true });
        } else {
          tokens.push({ id: -1, raw: tok, isCue: false, clean: '', isBreak: false });
        }
      } else {
        const isCue = /^[(\[].*[)\]]$/.test(tok);
        if (isCue) {
          tokens.push({ id: -1, raw: tok, isCue: true, clean: '', isBreak: false });
        } else {
          tokens.push({
            id: wordIdx++,
            raw: tok,
            isCue: false,
            clean: cleanWordForMatch(tok),
            isBreak: false,
          });
        }
      }
    });
    return tokens;
  }, [script]);

  const cleanWordsList = useMemo(() => {
    return scriptTokens.filter((t) => t.id >= 0).map((t) => t.clean);
  }, [scriptTokens]);

  const totalWords = cleanWordsList.length;
  const estimatedWpm = Math.max(60, Math.round(speed * 60));

  // Chapters & Stage Cues
  const chapters = useMemo(() => {
    const list: { title: string; lineIndex: number; raw: string }[] = [];
    const lines = script.split('\n');
    lines.forEach((line, idx) => {
      const match = line.match(/^\[(.*?)\]/);
      if (match) {
        list.push({ title: match[1], lineIndex: idx, raw: line });
      }
    });
    return list;
  }, [script]);

  // Refs
  const readerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);
  const targetScrollYRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);
  const loopRef = useRef(loop);
  const speechFollowRef = useRef(speechFollowEnabled);
  const activeWordIndexRef = useRef(activeWordIndex);
  const speechDampingRef = useRef(speechDamping);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  // Audio Context & Analyser Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudWaveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakHoldRef = useRef<{ level: number; time: number }>({ level: -60, time: 0 });

  // Video recording refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const bgVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  isPlayingRef.current = isPlaying;
  loopRef.current = loop;
  speechFollowRef.current = speechFollowEnabled;
  activeWordIndexRef.current = activeWordIndex;
  speechDampingRef.current = speechDamping;

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleResetScroll = useCallback(() => {
    setIsPlaying(false);
    scrollPosRef.current = 0;
    targetScrollYRef.current = 0;
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    setLastHeardWord('');
    setScrollProgress(0);
    if (readerRef.current) readerRef.current.scrollTop = 0;
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, []);

  const handleJumpToChapter = (cueTitle: string) => {
    const el = isPlaying ? readerRef.current : textareaRef.current;
    if (!el) return;
    const cueSpans = el.querySelectorAll('[data-cue="1"]');
    for (let i = 0; i < cueSpans.length; i++) {
      if (cueSpans[i].textContent?.includes(cueTitle)) {
        const target = cueSpans[i] as HTMLElement;
        const targetY = target.offsetTop - el.clientHeight * (eyelinePercent / 100);
        targetScrollYRef.current = Math.max(0, targetY);
        el.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        scrollPosRef.current = el.scrollTop;
        break;
      }
    }
  };

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const triggerPlaybackWithCountdown = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsPlaying(true);
          return null;
        }
        return prev - 1;
      });
    }, 850);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. BUTTER-SMOOTH AI SPEECH ENGINE
  // ─────────────────────────────────────────────────────────────
  const updateTargetScrollForWord = useCallback((wordIdx: number) => {
    if (!readerRef.current) return;
    const wordSpans = readerRef.current.querySelectorAll('[data-word="1"]');
    if (wordSpans && wordSpans[wordIdx]) {
      const targetSpan = wordSpans[wordIdx] as HTMLElement;
      const targetY = targetSpan.offsetTop - readerRef.current.clientHeight * (eyelinePercent / 100);
      targetScrollYRef.current = Math.max(0, targetY);
    }
  }, [eyelinePercent]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    setSpeechStatus('idle');
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechStatus('unsupported');
      return;
    }

    stopSpeechRecognition();

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setSpeechStatus('listening');
      };

      recognition.onresult = (event: any) => {
        setSpeechStatus('speaking');

        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
          setSpeechStatus('paused');
        }, autoPauseThresholdMs);

        let latestTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          latestTranscript += event.results[i][0].transcript;
        }

        const spokenWords = latestTranscript
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        if (spokenWords.length === 0) return;

        const recentSpoken = spokenWords.slice(-3);
        const lastSpoken = recentSpoken[recentSpoken.length - 1];
        setLastHeardWord(lastSpoken);

        const curIdx = activeWordIndexRef.current;
        const total = cleanWordsList.length;
        if (total === 0) return;

        let foundNextIdx = -1;

        for (let offset = 1; offset <= 4; offset++) {
          const checkIdx = curIdx + offset;
          if (checkIdx < 0 || checkIdx >= total) continue;

          const targetScriptWord = cleanWordsList[checkIdx];
          if (!targetScriptWord) continue;

          for (let s = 0; s < recentSpoken.length; s++) {
            const spoken = recentSpoken[s];
            if (!spoken || spoken.length < 2) continue;

            const isStopWord = STOP_WORDS.has(spoken);
            if (isStopWord && offset > 1) continue;

            if (
              targetScriptWord === spoken ||
              (spoken.length >= 4 && targetScriptWord.startsWith(spoken)) ||
              (targetScriptWord.length >= 4 && spoken.startsWith(targetScriptWord))
            ) {
              foundNextIdx = checkIdx;
              break;
            }
          }
          if (foundNextIdx !== -1) break;
        }

        if (foundNextIdx !== -1 && foundNextIdx > curIdx) {
          setActiveWordIndex(foundNextIdx);
          activeWordIndexRef.current = foundNextIdx;
          updateTargetScrollForWord(foundNextIdx);
          setScrollProgress(Math.round(((foundNextIdx + 1) / total) * 100));
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('SpeechRecognition notice:', err);
        }
      };

      recognition.onend = () => {
        if (speechFollowRef.current && isPlayingRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
    }
  }, [autoPauseThresholdMs, cleanWordsList, stopSpeechRecognition, updateTargetScrollForWord]);

  useEffect(() => {
    if (speechFollowEnabled && isPlaying) {
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }
    return () => {
      stopSpeechRecognition();
    };
  }, [speechFollowEnabled, isPlaying, startSpeechRecognition, stopSpeechRecognition]);

  // ─────────────────────────────────────────────────────────────
  // 2. 60FPS SMOOTH EASING ANIMATION LOOP
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const tick = (time: number) => {
      if (!active) return;
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const el = isPlayingRef.current ? readerRef.current : textareaRef.current;
      if (el) {
        if (speechFollowRef.current && isPlayingRef.current) {
          const currentScroll = el.scrollTop;
          const targetScroll = targetScrollYRef.current;
          const diff = targetScroll - currentScroll;

          if (Math.abs(diff) > 0.5) {
            const step = diff * speechDampingRef.current;
            el.scrollTop = currentScroll + step;
            scrollPosRef.current = el.scrollTop;
          }
        } else if (!speechFollowRef.current && isPlayingRef.current) {
          const baseSpeed = (speed * fontSize * delta) / 3800;
          const maxScroll = el.scrollHeight - el.clientHeight;

          if (el.scrollTop + baseSpeed >= maxScroll) {
            if (loopRef.current) {
              el.scrollTop = 0;
              scrollPosRef.current = 0;
            } else {
              setIsPlaying(false);
            }
          } else {
            el.scrollTop += baseSpeed;
            scrollPosRef.current = el.scrollTop;
          }

          if (maxScroll > 0) {
            setScrollProgress(Math.round((el.scrollTop / maxScroll) * 100));
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [speed, fontSize]);

  // ─────────────────────────────────────────────────────────────
  // 3. LIVE WEB AUDIO VU METER & REAL-TIME DECIBEL MONITOR
  // ─────────────────────────────────────────────────────────────
  const stopAudioAnalysis = useCallback(() => {
    if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setAudioMeterActive(false);
    setRmsDecibels(-60);
    setPeakDecibels(-60);
    setIsClipping(false);
  }, []);

  const startAudioAnalysis = useCallback(async (deviceId?: string) => {
    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      analyserRef.current = analyser;

      setAudioMeterActive(true);

      const bufferLength = analyser.frequencyBinCount;
      const timeDomainData = new Float32Array(bufferLength);
      let clipTimer = 0;

      const drawWaveform = (canvas: HTMLCanvasElement | null, data: Float32Array, color: string) => {
        if (!canvas) return;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        const width = canvas.width;
        const height = canvas.height;
        cCtx.clearRect(0, 0, width, height);

        cCtx.lineWidth = 2;
        cCtx.strokeStyle = color;
        cCtx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = data[i];
          const y = ((v + 1) / 2) * height;

          if (i === 0) {
            cCtx.moveTo(x, y);
          } else {
            cCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        cCtx.lineTo(width, height / 2);
        cCtx.stroke();
      };

      const renderAudioLoop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeDomainData);

        let sumSquares = 0;
        let peakAmp = 0;

        for (let i = 0; i < bufferLength; i++) {
          const sample = Math.abs(timeDomainData[i]);
          sumSquares += sample * sample;
          if (sample > peakAmp) peakAmp = sample;
        }

        const rms = Math.sqrt(sumSquares / bufferLength);
        const rmsDb = rms > 0.0001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;
        const peakDb = peakAmp > 0.0001 ? Math.max(-60, Math.min(0, 20 * Math.log10(peakAmp))) : -60;

        setRmsDecibels(Math.round(rmsDb));

        const now = Date.now();
        if (peakDb >= peakHoldRef.current.level || now - peakHoldRef.current.time > 1200) {
          peakHoldRef.current = { level: peakDb, time: now };
          setPeakDecibels(Math.round(peakDb));
        } else {
          peakHoldRef.current.level = Math.max(-60, peakHoldRef.current.level - 0.5);
          setPeakDecibels(Math.round(peakHoldRef.current.level));
        }

        if (peakDb >= -2.0) {
          setIsClipping(true);
          clipTimer = 35;
        } else {
          if (clipTimer > 0) {
            clipTimer--;
          } else {
            setIsClipping(false);
          }
        }

        const waveColor = peakDb >= -2.0 ? '#ef4444' : peakDb >= -18 ? '#22c55e' : '#f59e0b';
        drawWaveform(waveformCanvasRef.current, timeDomainData, waveColor);
        drawWaveform(hudWaveformCanvasRef.current, timeDomainData, waveColor);

        audioAnimFrameRef.current = requestAnimationFrame(renderAudioLoop);
      };

      audioAnimFrameRef.current = requestAnimationFrame(renderAudioLoop);
    } catch (err) {
      console.warn('Microphone stream access error:', err);
      setAudioMeterActive(false);
    }
  }, []);

  const calibrateNoiseFloor = () => {
    setIsCalibratingNoise(true);
    const samples: number[] = [];

    const interval = setInterval(() => {
      samples.push(rmsDecibels);
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      setIsCalibratingNoise(false);
      if (samples.length > 0) {
        const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
        setNoiseFloorDb(Math.min(-25, Math.max(-55, avg)));
      }
    }, 1400);
  };

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        const videoDevs = devs.filter((d) => d.kind === 'videoinput');
        const audioDevs = devs.filter((d) => d.kind === 'audioinput');
        setCameras(videoDevs);
        setAudioInputDevices(audioDevs);

        if (videoDevs.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevs[0].deviceId);
        if (audioDevs.length > 0 && !selectedAudioDeviceId) setSelectedAudioDeviceId(audioDevs[0].deviceId);
      }).catch(() => {});
    }
  }, [selectedAudioDeviceId, selectedCameraId]);

  useEffect(() => {
    startAudioAnalysis(selectedAudioDeviceId);
    return () => {
      stopAudioAnalysis();
    };
  }, [selectedAudioDeviceId, startAudioAnalysis, stopAudioAnalysis]);

  useEffect(() => {
    const el = isPlaying ? readerRef.current : textareaRef.current;
    if (el && scrollPosRef.current > 0) {
      el.scrollTop = scrollPosRef.current;
    }
  }, [isPlaying]);

  const handleContainerScroll = (e: React.UIEvent<HTMLElement>) => {
    scrollPosRef.current = e.currentTarget.scrollTop;
    const maxScroll = e.currentTarget.scrollHeight - e.currentTarget.clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(Math.round((e.currentTarget.scrollTop / maxScroll) * 100));
    }
  };

  // Attach camera stream to both PiP and Background video elements
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream && cameraActive) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.play().catch(() => {});
    }
    if (bgVideoPreviewRef.current && cameraStream && cameraActive) {
      bgVideoPreviewRef.current.srcObject = cameraStream;
      bgVideoPreviewRef.current.play().catch(() => {});
    }
  }, [cameraStream, cameraActive, cameraLayout]);

  const startCamera = async (deviceId?: string) => {
    try {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      const targetId = deviceId || selectedCameraId;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: targetId ? { deviceId: { exact: targetId } } : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (targetId) setSelectedCameraId(targetId);
    } catch (err) {
      console.warn('Camera initiation failed:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setCameraActive(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!cameraStream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTargetTextarea = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (isTargetTextarea) {
          (e.target as HTMLElement).blur();
          return;
        }
      }

      if (isTargetTextarea && !e.ctrlKey && !e.metaKey) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          triggerPlaybackWithCountdown();
          break;

        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          if (readerRef.current) readerRef.current.scrollTop -= 120;
          if (textareaRef.current) textareaRef.current.scrollTop -= 120;
          break;

        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          if (readerRef.current) readerRef.current.scrollTop += 120;
          if (textareaRef.current) textareaRef.current.scrollTop += 120;
          break;

        case 'Home':
          e.preventDefault();
          handleResetScroll();
          break;

        case 'BracketLeft':
          e.preventDefault();
          setSpeed((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(1))));
          break;

        case 'BracketRight':
          e.preventDefault();
          setSpeed((s) => Math.min(8.0, parseFloat((s + 0.1).toFixed(1))));
          break;

        case 'Minus':
          e.preventDefault();
          setFontSize((f) => Math.max(20, f - 2));
          break;

        case 'Equal':
          e.preventDefault();
          setFontSize((f) => Math.min(96, f + 2));
          break;

        case 'KeyR':
          e.preventDefault();
          handleResetScroll();
          break;

        case 'KeyM':
          e.preventDefault();
          setMirrorHorizontal((m) => !m);
          break;

        case 'KeyV':
          e.preventDefault();
          setMirrorVertical((m) => !m);
          break;

        case 'KeyF':
          e.preventDefault();
          handleToggleFullscreen();
          break;

        case 'KeyS':
          e.preventDefault();
          setSpeechFollowEnabled((prev) => !prev);
          break;

        case 'KeyH':
          e.preventDefault();
          setShowSettings((prev) => !prev);
          break;

        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcutsModal((prev) => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcutsModal, handleResetScroll, handleToggleFullscreen, isPlaying]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clickedY = el.scrollTop + (e.clientY - rect.top);
    const target = clickedY - el.clientHeight * (eyelinePercent / 100);
    targetScrollYRef.current = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, target));
    el.scrollTop = targetScrollYRef.current;
    scrollPosRef.current = el.scrollTop;
  };

  const containerMaxWidth = useMemo(() => {
    if (widthUnit === 'ch') return `${columnCharWidth}ch`;
    if (widthUnit === '%') return `${columnPercentWidth}%`;
    return `${columnPixelWidth}px`;
  }, [widthUnit, columnCharWidth, columnPercentWidth, columnPixelWidth]);

  // Corner PiP Dimensions
  const pipWidth = pipSize === 'sm' ? 180 : pipSize === 'md' ? 240 : 320;
  const pipAspectRatioValue =
    cameraAspectRatio === '9:16'
      ? '9/16'
      : cameraAspectRatio === '16:9'
      ? '16/9'
      : cameraAspectRatio === '1:1'
      ? '1/1'
      : cameraAspectRatio === '4:5'
      ? '4/5'
      : '4/3';

  const pipPositionStyle: React.CSSProperties = useMemo(() => {
    const margin = 20;
    switch (pipPosition) {
      case 'top-left':
        return { top: margin, left: margin };
      case 'bottom-right':
        return { bottom: 80, right: margin };
      case 'bottom-left':
        return { bottom: 80, left: margin };
      case 'top-right':
      default:
        return { top: margin, right: margin };
    }
  }, [pipPosition]);

  const mirrorTransform = `${mirrorHorizontal ? 'scaleX(-1)' : ''} ${mirrorVertical ? 'scaleY(-1)' : ''}`.trim() || 'none';

  const filteredFonts =
    selectedFontCategory === 'All'
      ? GOOGLE_FONTS_LIST
      : GOOGLE_FONTS_LIST.filter((f) => f.category === selectedFontCategory);

  const renderTokens = () => {
    return scriptTokens.map((tok, idx) => {
      if (tok.isBreak) {
        return <br key={idx} />;
      }
      if (tok.id === -1 && !tok.isCue) {
        return <span key={idx}>{tok.raw}</span>;
      }
      if (tok.isCue) {
        return (
          <span
            key={idx}
            data-cue="1"
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              margin: '0 4px',
              background: '#FFE500',
              color: '#000000',
              borderRadius: 4,
              fontWeight: 900,
              fontSize: '0.72em',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: '1.5px solid #000000',
              verticalAlign: 'middle',
            }}
          >
            {tok.raw}
          </span>
        );
      }

      const isCurrent = tok.id === activeWordIndex;
      const isPast = activeWordIndex >= 0 && tok.id < activeWordIndex;

      return (
        <span
          key={idx}
          data-word="1"
          data-index={tok.id}
          style={{
            background: isCurrent ? '#FFE500' : 'transparent',
            color: isCurrent ? '#000000' : isPast ? 'rgba(255,255,255,0.45)' : 'inherit',
            padding: isCurrent ? '2px 6px' : '0 1px',
            borderRadius: isCurrent ? 4 : 0,
            fontWeight: isCurrent ? 900 : 'inherit',
            boxShadow: isCurrent ? '0 0 16px rgba(255, 229, 0, 0.8)' : 'none',
            transition: 'all 0.15s ease',
            display: 'inline-block',
          }}
        >
          {tok.raw}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ── Top Brutalist Studio Header HUD Bar ── */}
      <header
        style={{
          height: 48,
          background: '#ffffff',
          borderBottom: '3px solid #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 50,
          flexShrink: 0,
          color: '#000000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            href="/"
            className="brutalist-button"
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              borderRadius: 4,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ChevronLeft size={13} />
            Dashboard
          </Link>

          {/* Quick Tool Switcher Dropdown */}
          <div ref={toolsDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="brutalist-button"
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: showToolsDropdown ? '#000' : '#fff',
                color: showToolsDropdown ? '#FFE500' : '#000',
              }}
              title="Navigate to all CreatorKit tools"
            >
              <Layout size={13} />
              <span style={{ fontWeight: 900 }}>Tools</span>
              <ChevronDown size={12} />
            </button>

            {/* Dropdown Menu */}
            {showToolsDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 6,
                  width: 320,
                  maxHeight: 460,
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '3px solid #000000',
                  borderRadius: 4,
                  boxShadow: '6px 6px 0 #000000',
                  zIndex: 120,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
                className="no-scrollbar"
              >
                <div style={{ padding: '4px 6px', fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, color: '#888', textTransform: 'uppercase', borderBottom: '1.5px solid #eee' }}>
                  All CreatorKit Tools (18)
                </div>
                {ALL_CREATORKIT_TOOLS.map((t) => {
                  const isCurrent = t.href === '/teleprompter';
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={() => setShowToolsDropdown(false)}
                      style={{
                        padding: '6px 8px',
                        border: isCurrent ? '1.5px solid #000' : '1px solid transparent',
                        borderRadius: 3,
                        background: isCurrent ? '#FFE500' : '#f4f4f5',
                        color: '#000',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        fontWeight: isCurrent ? 900 : 700,
                        fontFamily: 'monospace',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </div>
                      <span style={{ fontSize: '0.55rem', color: isCurrent ? '#000' : '#666', background: isCurrent ? 'rgba(0,0,0,0.1)' : '#eee', padding: '1px 4px', borderRadius: 2 }}>
                        {t.hint}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: '#FFE500',
              padding: '3px 8px',
              border: '2px solid #000',
              borderRadius: 4,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkles size={12} />
            STUDIO PROMPTER
          </span>

          {/* Quick Camera Layout Toggle: Corner PiP vs Full Background vs Off */}
          <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
            <button
              onClick={() => {
                if (!cameraActive) startCamera();
                setCameraLayout('corner-pip');
              }}
              style={{
                padding: '3px 8px',
                border: 'none',
                borderRight: '1px solid #000',
                background: cameraActive && cameraLayout === 'corner-pip' ? '#000' : '#fff',
                color: cameraActive && cameraLayout === 'corner-pip' ? '#FFE500' : '#000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
              }}
              title="Camera in Top-Right Corner (PiP)"
            >
              ↘️ Corner PiP
            </button>

            <button
              onClick={() => {
                if (!cameraActive) startCamera();
                setCameraLayout('full-bg');
              }}
              style={{
                padding: '3px 8px',
                border: 'none',
                borderRight: '1px solid #000',
                background: cameraActive && cameraLayout === 'full-bg' ? '#000' : '#fff',
                color: cameraActive && cameraLayout === 'full-bg' ? '#FFE500' : '#000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
              }}
              title="Camera in Full Screen Background"
            >
              🖼️ Background
            </button>

            <button
              onClick={() => {
                stopCamera();
                setCameraLayout('off');
              }}
              style={{
                padding: '3px 7px',
                border: 'none',
                background: !cameraActive || cameraLayout === 'off' ? '#000' : '#fff',
                color: !cameraActive || cameraLayout === 'off' ? '#fff' : '#000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
              }}
              title="Turn Camera Off"
            >
              Off
            </button>
          </div>

          {/* Quick Chapter Markers */}
          {chapters.length > 0 && (
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', maxWidth: 180 }} className="no-scrollbar">
              {chapters.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => handleJumpToChapter(ch.title)}
                  style={{
                    padding: '2px 6px',
                    background: '#f4f4f5',
                    border: '1px solid #000',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  title={`Jump to [${ch.title}]`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Speech AI & VU Meter Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 900 }}>
          {speechFollowEnabled ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                border: '1.5px solid #000',
                borderRadius: 4,
                background: speechStatus === 'speaking' ? '#dcfce7' : speechStatus === 'listening' ? '#fef3c7' : '#fee2e2',
                color: speechStatus === 'speaking' ? '#15803d' : speechStatus === 'listening' ? '#b45309' : '#b91c1c',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: speechStatus === 'speaking' ? '#22c55e' : speechStatus === 'listening' ? '#f59e0b' : '#ef4444',
                }}
                className={speechStatus === 'speaking' ? 'animate-pulse' : ''}
              />
              <span style={{ fontSize: '0.64rem' }}>
                {speechStatus === 'speaking'
                  ? `AI SYNC: "${lastHeardWord || 'Speaking'}"`
                  : speechStatus === 'listening'
                  ? 'AI LISTENING (SPEAK TO GLIDE)'
                  : 'PAUSED (STOPPED ON SILENCE)'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
              <span>SPEED:</span>
              <span style={{ color: '#d97706', background: '#fef3c7', padding: '1px 6px', border: '1.5px solid #000', borderRadius: 4 }}>
                {speed.toFixed(1)}x
              </span>
            </div>
          )}

          {/* Mini Waveform in HUD */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#f4f4f5',
              padding: '2px 6px',
              border: '1.5px solid #000',
              borderRadius: 4,
            }}
          >
            <canvas ref={hudWaveformCanvasRef} width={45} height={15} style={{ background: '#000', borderRadius: 2 }} />
            <span style={{ fontSize: '0.62rem', color: isClipping ? '#dc2626' : '#000' }}>
              {isClipping ? 'CLIP!' : `${rmsDecibels}dB`}
            </span>
          </div>

          {/* Recording Timer */}
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fee2e2', border: '1.5px solid #ef4444', padding: '2px 6px', borderRadius: 4, color: '#b91c1c' }}>
              <Radio size={12} className="animate-pulse" />
              <span>REC {formatTime(recordingSeconds)}</span>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="brutalist-button"
            style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
            title="View Keyboard Shortcuts (Shift + ?)"
          >
            <HelpCircle size={13} />
            Shortcuts
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`brutalist-button ${showSettings ? 'brutalist-button-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.68rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <SlidersHorizontal size={13} />
            {showSettings ? 'Hide Controls' : 'Controls'}
          </button>
        </div>
      </header>

      {/* ── Main Prompter Screen + Sidebar Layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Prompter Canvas Viewport */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#000000',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* 1. Fullscreen Background Camera Feed (If camera is in 'full-bg' mode) */}
          {cameraActive && cameraLayout === 'full-bg' && (
            <>
              <video
                ref={bgVideoPreviewRef}
                autoPlay
                muted
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 1,
                  transform: mirrorTransform,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `rgba(0,0,0,${bgDimOpacity})`,
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* 2. Eyeline Horizon Marker */}
          {showEyelineGuide && (
            <div
              style={{
                position: 'absolute',
                top: `${eyelinePercent}%`,
                left: 0,
                right: 0,
                height: 38,
                transform: 'translateY(-50%)',
                background: 'rgba(255, 229, 0, 0.14)',
                borderBottom: '2.5px solid rgba(255, 229, 0, 0.85)',
                zIndex: 15,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: 'monospace',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  color: '#FFE500',
                  background: 'rgba(0,0,0,0.85)',
                  padding: '2px 8px',
                  border: '1px solid #FFE500',
                  borderRadius: 3,
                }}
              >
                👁️ EYELINE HORIZON ({eyelinePercent}%)
              </div>
            </div>
          )}

          {/* 3. Circular Optical Lens Spotlight */}
          {circularFocusLens && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 14,
                background: `radial-gradient(ellipse 60% 34% at 50% ${eyelinePercent}%, rgba(0,0,0,0) 0%, rgba(0,0,0,${focusIntensity * 0.75}) 70%, rgba(0,0,0,${Math.min(0.98, focusIntensity * 0.96)}) 100%)`,
              }}
            />
          )}

          {/* 4. 3-2-1 Countdown Overlay */}
          {countdown !== null && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '8rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: '#FFE500',
                  textShadow: '0 0 40px rgba(255, 229, 0, 0.8)',
                }}
              >
                {countdown}
              </div>
            </div>
          )}

          {/* 5. Main Prompter Reading Column */}
          <div
            style={{
              width: '100%',
              maxWidth: containerMaxWidth,
              height: '100%',
              position: 'relative',
              zIndex: 16,
              transform: mirrorTransform,
              borderLeft: '1.5px dashed rgba(255,255,255,0.2)',
              borderRight: '1.5px dashed rgba(255,255,255,0.2)',
            }}
          >
            {isPlaying ? (
              <div
                ref={readerRef}
                className="no-scrollbar"
                onPointerDown={handleScrub}
                onScroll={handleContainerScroll}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflowY: 'auto',
                  width: '100%',
                  height: '100%',
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}px`,
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  padding: `calc(${eyelinePercent}vh - 30px) ${textPaddingHorizontal}px 60vh`,
                  whiteSpace: 'pre-wrap',
                  cursor: 'pointer',
                  textShadow: cameraActive && cameraLayout === 'full-bg' ? '0 2px 14px rgba(0,0,0,0.95)' : 'none',
                }}
              >
                {renderTokens()}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                onScroll={handleContainerScroll}
                placeholder="Paste or type your video script here..."
                className="no-scrollbar"
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}px`,
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  padding: `calc(${eyelinePercent}vh - 30px) ${textPaddingHorizontal}px 60vh`,
                  caretColor: '#FFE500',
                  cursor: 'text',
                  overflowY: 'auto',
                  position: 'relative',
                  textShadow: cameraActive && cameraLayout === 'full-bg' ? '0 2px 14px rgba(0,0,0,0.95)' : 'none',
                }}
              />
            )}
          </div>

          {/* 6. Clean Floating Corner PiP Camera Window (Top-Right / selectable corner) */}
          {cameraActive && cameraLayout === 'corner-pip' && (
            <div
              style={{
                position: 'absolute',
                ...pipPositionStyle,
                width: pipWidth,
                aspectRatio: pipAspectRatioValue,
                border: '3px solid #ffffff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px #000',
                zIndex: 35,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: mirrorTransform,
                  }}
                />

                {/* Safe Area Guide Overlay inside PiP */}
                {showSafeAreas && (
                  <SafeAreaGuideOverlay aspectRatio={cameraAspectRatio} mirrored={mirrorHorizontal} />
                )}

                {/* PiP Floating Badge Header */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    zIndex: 25,
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      color: '#FFE500',
                      border: '1px solid #FFE500',
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontSize: '0.55rem',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                    }}
                  >
                    {cameraAspectRatio} PiP
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Floating Transport Controls Floater Bar ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 35,
              background: '#ffffff',
              padding: '6px 14px',
              border: '3px solid #000000',
              borderRadius: 4,
              boxShadow: '6px 6px 0 #000000',
              color: '#000000',
            }}
          >
            <button
              onClick={handleResetScroll}
              className="brutalist-button"
              style={{ padding: '7px 9px', fontSize: '0.74rem', borderRadius: 4 }}
              title="Reset Scroll to Beginning (R / Home)"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={triggerPlaybackWithCountdown}
              className={`brutalist-button ${isPlaying ? 'brutalist-button-primary' : ''}`}
              style={{
                padding: '8px 20px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Play / Pause (SPACE)"
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>

            <button
              onClick={() => setSpeechFollowEnabled(!speechFollowEnabled)}
              className="brutalist-button"
              style={{
                padding: '7px 9px',
                fontSize: '0.74rem',
                borderRadius: 4,
                background: speechFollowEnabled ? '#000' : '#fff',
                color: speechFollowEnabled ? '#FFE500' : '#000',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Toggle Speech-Follow AI Auto-Scroll (S)"
            >
              <Mic size={14} />
              <span style={{ fontSize: '0.66rem', fontWeight: 900 }}>AI SYNC</span>
            </button>

            <div style={{ width: 1, height: 22, background: '#ddd' }} />

            <button
              onClick={() => setMirrorHorizontal((m) => !m)}
              className="brutalist-button"
              style={{
                padding: '7px 9px',
                fontSize: '0.74rem',
                borderRadius: 4,
                background: mirrorHorizontal ? '#000' : '#fff',
                color: mirrorHorizontal ? '#fff' : '#000',
              }}
              title="Mirror Horizontal (M)"
            >
              <ArrowLeftRight size={15} />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="brutalist-button"
              style={{ padding: '7px 9px', fontSize: '0.74rem', borderRadius: 4 }}
              title="Fullscreen Mode (F)"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* ── Right Settings & Studio Control Drawer ── */}
        {showSettings && (
          <aside
            className="no-scrollbar"
            style={{
              width: 390,
              background: '#ffffff',
              borderLeft: '3px solid #000000',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 40,
              color: '#000000',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {/* Drawer Category Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #000', background: '#f4f4f5' }}>
              {[
                { id: 'camera', label: 'Camera', icon: Camera },
                { id: 'speech', label: 'AI Sync', icon: Mic },
                { id: 'width', label: 'Width', icon: MoveHorizontal },
                { id: 'audio', label: 'VU Meter', icon: Activity },
                { id: 'fonts', label: 'Fonts', icon: Type },
                { id: 'cues', label: 'Cues', icon: Bookmark },
                { id: 'templates', label: 'Scripts', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSidebarTab(tab.id as any)}
                  style={{
                    padding: '8px 1px',
                    border: 'none',
                    borderRight: '1px solid #000',
                    background: activeSidebarTab === tab.id ? '#000' : '#f4f4f5',
                    color: activeSidebarTab === tab.id ? '#fff' : '#000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.54rem',
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

            {/* Drawer Body Contents */}
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* TAB 1: CAMERA & CORNER PIP / BACKGROUND SETTINGS */}
              {activeSidebarTab === 'camera' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={15} />
                        Camera Display & Position
                      </label>
                      <button
                        onClick={cameraActive ? stopCamera : () => startCamera()}
                        className={`brutalist-button ${cameraActive ? 'brutalist-button-primary' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '0.68rem', borderRadius: 4 }}
                      >
                        {cameraActive ? 'Turn Off' : 'Turn On Camera'}
                      </button>
                    </div>

                    {/* Camera Mode Selector */}
                    <div>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Display Mode
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button
                          onClick={() => {
                            if (!cameraActive) startCamera();
                            setCameraLayout('corner-pip');
                          }}
                          style={{
                            padding: '8px 4px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: cameraActive && cameraLayout === 'corner-pip' ? '#000' : '#fff',
                            color: cameraActive && cameraLayout === 'corner-pip' ? '#FFE500' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.66rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          ↘️ Corner Picture-in-Picture
                        </button>

                        <button
                          onClick={() => {
                            if (!cameraActive) startCamera();
                            setCameraLayout('full-bg');
                          }}
                          style={{
                            padding: '8px 4px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: cameraActive && cameraLayout === 'full-bg' ? '#000' : '#fff',
                            color: cameraActive && cameraLayout === 'full-bg' ? '#FFE500' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.66rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          🖼️ Full Background Feed
                        </button>
                      </div>
                    </div>

                    {/* Corner Position Selector for PiP */}
                    {cameraLayout === 'corner-pip' && (
                      <div style={{ padding: 10, background: '#f4f4f5', border: '1.5px solid #000', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                          Corner Position & Size
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                          {[
                            { id: 'top-right', label: 'Top Right' },
                            { id: 'top-left', label: 'Top Left' },
                            { id: 'bottom-right', label: 'Btm Right' },
                            { id: 'bottom-left', label: 'Btm Left' },
                          ].map((pos) => (
                            <button
                              key={pos.id}
                              onClick={() => setPipPosition(pos.id as any)}
                              style={{
                                padding: '5px 2px',
                                border: '1px solid #000',
                                borderRadius: 3,
                                background: pipPosition === pos.id ? '#000' : '#fff',
                                color: pipPosition === pos.id ? '#FFE500' : '#000',
                                fontFamily: 'monospace',
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>

                        {/* PiP Size */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { id: 'sm', label: 'Small (180px)' },
                            { id: 'md', label: 'Medium (240px)' },
                            { id: 'lg', label: 'Large (320px)' },
                          ].map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setPipSize(s.id as any)}
                              style={{
                                flex: 1,
                                padding: '5px 2px',
                                border: '1px solid #000',
                                borderRadius: 3,
                                background: pipSize === s.id ? '#000' : '#fff',
                                color: pipSize === s.id ? '#FFE500' : '#000',
                                fontFamily: 'monospace',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Camera Aspect Ratio Switcher */}
                    <div>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Camera Aspect Ratio & Safe Zone
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                        {[
                          { id: '9:16', label: '9:16' },
                          { id: '16:9', label: '16:9' },
                          { id: '1:1', label: '1:1' },
                          { id: '4:5', label: '4:5' },
                          { id: '4:3', label: '4:3' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setCameraAspectRatio(item.id as any)}
                            style={{
                              padding: '6px 2px',
                              border: '1.5px solid #000',
                              borderRadius: 4,
                              background: cameraAspectRatio === item.id ? '#000' : '#fff',
                              color: cameraAspectRatio === item.id ? '#FFE500' : '#000',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '0.64rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Safe Area Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #eee' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={showSafeAreas}
                          onChange={(e) => setShowSafeAreas(e.target.checked)}
                          style={{ width: 14, height: 14, accentColor: '#000' }}
                        />
                        <Shield size={13} />
                        Show Safe Zone Guides ({cameraAspectRatio})
                      </label>
                    </div>

                    {/* Background Darkness (if in full-bg mode) */}
                    {cameraLayout === 'full-bg' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>BACKGROUND DIMMING:</span>
                          <span>{Math.round(bgDimOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="0.95"
                          step="0.05"
                          value={bgDimOpacity}
                          onChange={(e) => setBgDimOpacity(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    )}

                    {/* Camera Device Selector */}
                    <div>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                        Camera Input ({cameras.length} Detected)
                      </label>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                          if (cameraActive) startCamera(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {cameras.length > 0 ? (
                          cameras.map((c, idx) => (
                            <option key={c.deviceId || idx} value={c.deviceId}>
                              {c.label || `Camera ${idx + 1}`}
                            </option>
                          ))
                        ) : (
                          <option value="">Default Front Camera</option>
                        )}
                      </select>
                    </div>

                    {/* Video Recording Panel */}
                    {cameraActive && (
                      <div style={{ paddingTop: 8, borderTop: '1.5px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, display: 'block' }}>
                          Take Recording
                        </label>
                        {!isRecording ? (
                          <button
                            onClick={startRecording}
                            className="brutalist-button brutalist-button-primary"
                            style={{ padding: '8px', fontSize: '0.74rem', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <Radio size={14} />
                            Start Recording Take
                          </button>
                        ) : (
                          <button
                            onClick={stopRecording}
                            style={{
                              padding: '8px',
                              border: '2px solid #ef4444',
                              borderRadius: 4,
                              background: '#ef4444',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <Radio size={14} className="animate-pulse" />
                            Stop Recording ({formatTime(recordingSeconds)})
                          </button>
                        )}

                        {recordedVideoUrl && (
                          <a
                            href={recordedVideoUrl}
                            download={`teleprompter-take-${Date.now()}.webm`}
                            className="brutalist-button"
                            style={{ padding: '6px', fontSize: '0.7rem', borderRadius: 4, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <Download size={13} />
                            Download Recorded Take (.WebM)
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: SPEECH AI AUTO-SCROLL */}
              {activeSidebarTab === 'speech' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: speechFollowEnabled ? '#fef08a' : '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={15} />
                        AI Speech-Sync Glide Engine
                      </label>
                      <button
                        onClick={() => setSpeechFollowEnabled(!speechFollowEnabled)}
                        style={{
                          padding: '4px 10px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: speechFollowEnabled ? '#000' : '#fff',
                          color: speechFollowEnabled ? '#fff' : '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                        }}
                      >
                        {speechFollowEnabled ? 'ACTIVE (ON)' : 'DISABLED'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.68rem', color: '#222', lineHeight: 1.4 }}>
                      Follows your voice with <strong>continuous smooth easing</strong>, preventing abrupt jumps and <strong>freezing automatically the exact instant you pause</strong>.
                    </p>

                    {/* Live Word Feedback Badge */}
                    <div style={{ padding: '8px 10px', background: '#fff', border: '2px solid #000', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                        <span>FOLLOWING SPOKEN WORD:</span>
                        <span>STATUS: {speechStatus.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: '0.86rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: '#FFE500', padding: '2px 8px', border: '1.5px solid #000', borderRadius: 4 }}>
                          {lastHeardWord ? `"${lastHeardWord}"` : 'Listening for your voice...'}
                        </span>
                        {activeWordIndex >= 0 && (
                          <span style={{ fontSize: '0.65rem', color: '#666' }}>
                            ({activeWordIndex + 1}/{totalWords} words)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pacing Smoothness Presets */}
                    <div>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Glide Smoothness & Responsiveness
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                        {[
                          { val: 0.05, label: '🧈 Butter Smooth' },
                          { val: 0.08, label: '⚡ Natural Paced' },
                          { val: 0.12, label: '🎯 Tight Lock' },
                        ].map((m) => (
                          <button
                            key={m.val}
                            onClick={() => setSpeechDamping(m.val)}
                            style={{
                              padding: '6px 2px',
                              border: '1.5px solid #000',
                              borderRadius: 4,
                              background: Math.abs(speechDamping - m.val) < 0.01 ? '#000' : '#fff',
                              color: Math.abs(speechDamping - m.val) < 0.01 ? '#FFE500' : '#000',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '0.62rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Silence Auto-Pause Sensitivity */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>PAUSE FREEZE TIME:</span>
                        <span>{autoPauseThresholdMs}ms</span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="1500"
                        step="50"
                        value={autoPauseThresholdMs}
                        onChange={(e) => setAutoPauseThresholdMs(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: TEXT WIDTH & READING SPACE CONTROL */}
              {activeSidebarTab === 'width' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MoveHorizontal size={15} />
                      Text Width & Spacing Control
                    </label>

                    {/* Unit Switcher */}
                    <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
                      {[
                        { id: 'ch', label: 'Characters (ch)' },
                        { id: '%', label: 'Percentage (%)' },
                        { id: 'px', label: 'Exact Pixels (px)' },
                      ].map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setWidthUnit(u.id as any)}
                          style={{
                            flex: 1,
                            padding: '5px 2px',
                            border: 'none',
                            borderRight: u.id !== 'px' ? '1px solid #000' : 'none',
                            background: widthUnit === u.id ? '#000' : '#fff',
                            color: widthUnit === u.id ? '#FFE500' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                          }}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>

                    {/* Width Preset Chips */}
                    <div>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block', marginBottom: 4 }}>
                        QUICK WIDTH PRESETS
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                        {[
                          { chars: 25, label: '🎯 25ch (Eye Lock)' },
                          { chars: 30, label: '🎯 30ch (Lens)' },
                          { chars: 45, label: '📱 45ch (Phone)' },
                          { chars: 65, label: '💻 65ch (Wide)' },
                        ].map((p) => (
                          <button
                            key={p.chars}
                            onClick={() => {
                              setWidthUnit('ch');
                              setColumnCharWidth(p.chars);
                            }}
                            style={{
                              padding: '6px 2px',
                              border: '1.5px solid #000',
                              borderRadius: 4,
                              background: widthUnit === 'ch' && columnCharWidth === p.chars ? '#000' : '#fff',
                              color: widthUnit === 'ch' && columnCharWidth === p.chars ? '#FFE500' : '#000',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '0.62rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {p.chars} Chars
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Width Slider */}
                    {widthUnit === 'ch' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>CHARACTER COLUMN WIDTH:</span>
                          <span style={{ color: '#d97706' }}>{columnCharWidth} characters</span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="80"
                          step="1"
                          value={columnCharWidth}
                          onChange={(e) => setColumnCharWidth(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    )}

                    {widthUnit === '%' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>PERCENTAGE COLUMN WIDTH:</span>
                          <span style={{ color: '#d97706' }}>{columnPercentWidth}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          step="2"
                          value={columnPercentWidth}
                          onChange={(e) => setColumnPercentWidth(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    )}

                    {widthUnit === 'px' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>PIXEL COLUMN WIDTH:</span>
                          <span style={{ color: '#d97706' }}>{columnPixelWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="240"
                          max="1200"
                          step="20"
                          value={columnPixelWidth}
                          onChange={(e) => setColumnPixelWidth(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    )}

                    {/* Alignment & Eyeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900 }}>TEXT ALIGNMENT:</span>
                        <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden' }}>
                          {[
                            { id: 'left', icon: AlignLeft },
                            { id: 'center', icon: AlignCenter },
                            { id: 'right', icon: AlignRight },
                          ].map((a) => (
                            <button
                              key={a.id}
                              onClick={() => setTextAlign(a.id as any)}
                              style={{
                                padding: '4px 8px',
                                border: 'none',
                                borderRight: a.id !== 'right' ? '1px solid #000' : 'none',
                                background: textAlign === a.id ? '#000' : '#fff',
                                color: textAlign === a.id ? '#fff' : '#000',
                                cursor: 'pointer',
                              }}
                            >
                              <a.icon size={13} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>EYELINE HORIZON HEIGHT:</span>
                          <span>{eyelinePercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="65"
                          step="1"
                          value={eyelinePercent}
                          onChange={(e) => setEyelinePercent(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 4: VU METER & AUDIO TELEMETRY */}
              {activeSidebarTab === 'audio' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={15} />
                        Web Audio VU Meter & Waveform
                      </label>
                      <span
                        style={{
                          fontSize: '0.64rem',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          background: isClipping ? '#fee2e2' : '#dcfce7',
                          color: isClipping ? '#dc2626' : '#15803d',
                          padding: '2px 8px',
                          border: '1px solid #000',
                          borderRadius: 4,
                        }}
                      >
                        {isClipping ? 'CLIPPING WARN' : 'INPUT OK'}
                      </span>
                    </div>

                    {/* Waveform Canvas */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>LIVE AUDIO WAVEFORM:</span>
                        <span>{rmsDecibels} dBFS (Peak {peakDecibels} dBFS)</span>
                      </div>
                      <canvas
                        ref={waveformCanvasRef}
                        width={330}
                        height={60}
                        style={{
                          width: '100%',
                          height: 60,
                          background: '#000000',
                          border: '2px solid #000000',
                          borderRadius: 4,
                          display: 'block',
                        }}
                      />
                    </div>

                    {/* Studio Segmented VU Meter */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>DECIBEL LEVEL METER:</span>
                        <span style={{ color: isClipping ? '#dc2626' : rmsDecibels > -18 ? '#15803d' : '#d97706' }}>
                          {rmsDecibels} dBFS
                        </span>
                      </div>

                      <div style={{ height: 20, background: '#111', border: '2px solid #000', borderRadius: 4, position: 'relative', overflow: 'hidden', padding: '2px 3px', display: 'flex', gap: 2 }}>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const segDb = -60 + i * 2.5;
                          const isActive = rmsDecibels >= segDb;
                          const isPeakHold = Math.abs(peakDecibels - segDb) < 2.5;
                          const segColor = segDb >= -3 ? '#ef4444' : segDb >= -18 ? '#22c55e' : '#eab308';

                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: '100%',
                                background: isActive ? segColor : isPeakHold ? '#ffffff' : 'rgba(255,255,255,0.08)',
                                borderRadius: 1,
                                boxShadow: isActive ? `0 0 4px ${segColor}` : 'none',
                              }}
                            />
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontFamily: 'monospace', color: '#777', marginTop: 3 }}>
                        <span>-60 dB</span>
                        <span>-36 dB</span>
                        <span style={{ color: '#15803d', fontWeight: 900 }}>-18 dB (TARGET)</span>
                        <span style={{ color: '#dc2626', fontWeight: 900 }}>0 dB (CLIP)</span>
                      </div>
                    </div>

                    {/* Noise Floor Auto-Calibration */}
                    <div style={{ padding: '8px 10px', background: '#f4f4f5', border: '1.5px solid #000', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900 }}>
                          ROOM NOISE FLOOR: {noiseFloorDb} dB
                        </span>
                        <button
                          onClick={calibrateNoiseFloor}
                          disabled={isCalibratingNoise}
                          className="brutalist-button"
                          style={{ padding: '3px 8px', fontSize: '0.62rem', borderRadius: 3 }}
                        >
                          {isCalibratingNoise ? 'Sampling...' : '⚡ Calibrate'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 5: FONTS & TYPOGRAPHY */}
              {activeSidebarTab === 'fonts' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>FONT SIZE:</span>
                        <span>{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="96"
                        step="2"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Font Family (52 Google Fonts)
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: '#fff',
                          color: '#000',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {filteredFonts.map((f) => (
                          <option key={f.id} value={f.fontFamily}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Text Colors */}
                    <div>
                      <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Text Color Swatch
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => setTextColor(c.hex)}
                            style={{
                              width: 24,
                              height: 24,
                              background: c.hex,
                              border: textColor === c.hex ? '3px solid #000' : '1.5px solid #000',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 6: CHAPTERS & CUES */}
              {activeSidebarTab === 'cues' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bookmark size={14} />
                      Script Chapters & Cues ({chapters.length})
                    </label>

                    {chapters.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {chapters.map((ch, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleJumpToChapter(ch.title)}
                            style={{
                              padding: '8px 10px',
                              border: '1.5px solid #000',
                              borderRadius: 4,
                              background: '#f4f4f5',
                              color: '#000',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace' }}>[{ch.title}]</span>
                            <ChevronRight size={13} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.68rem', color: '#666', lineHeight: 1.4 }}>
                        Add bracketed cues like <code style={{ background: '#eee', padding: '1px 4px' }}>[HOOK]</code>, <code style={{ background: '#eee', padding: '1px 4px' }}>[POINT 1]</code>, <code style={{ background: '#eee', padding: '1px 4px' }}>[CTA]</code> into your script to generate 1-click jump markers.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* TAB 7: SCRIPT TEMPLATES */}
              {activeSidebarTab === 'templates' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                      Creator Script Templates
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {CREATOR_SCRIPT_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => {
                            setScript(tmpl.text);
                            handleResetScroll();
                          }}
                          style={{
                            padding: '8px 10px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: '#f4f4f5',
                            color: '#000',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace' }}>{tmpl.name}</span>
                          <span style={{ fontSize: '0.62rem', color: '#666', fontFamily: 'monospace' }}>{tmpl.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Keyboard Shortcuts Cheat Sheet Modal ── */}
      {showShortcutsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="brutalist-card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#ffffff',
              padding: 24,
              borderRadius: 4,
              color: '#000',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={16} />
                Keyboard Shortcuts (Studio Controller)
              </span>
              <button onClick={() => setShowShortcutsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {[
                { key: 'SPACE', desc: 'Play / Pause Prompter' },
                { key: 'S', desc: 'Toggle Speech-Follow AI' },
                { key: '↑ / ↓', desc: 'Scroll Up / Down' },
                { key: '[ / ]', desc: 'Speed Multiplier' },
                { key: '- / +', desc: 'Font Size' },
                { key: 'R / Home', desc: 'Reset Scroll to Top' },
                { key: 'M', desc: 'Horizontal Mirror (Glass)' },
                { key: 'V', desc: 'Vertical Invert' },
                { key: 'F', desc: 'Toggle Fullscreen' },
                { key: 'H', desc: 'Toggle Settings Drawer' },
                { key: 'SHIFT + ?', desc: 'Show Cheat Sheet' },
              ].map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#f4f4f5', border: '1px solid #000', borderRadius: 4 }}>
                  <span style={{ fontWeight: 900, background: '#FFE500', padding: '1px 5px', border: '1px solid #000', borderRadius: 3 }}>
                    {item.key}
                  </span>
                  <span style={{ color: '#444' }}>{item.desc}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="brutalist-button brutalist-button-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: 4 }}
            >
              Got it, Close (ESC)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
