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
import StudioToolsDropdown from '@/components/StudioToolsDropdown';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';
import {
  cleanWordForMatch,
  createVoiceMatchEngine,
  type VoiceMatchEngine,
} from '@/lib/teleprompter/voice-matching-engine';

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

export default function TeleprompterPage() {
  // Core Prompter State
  const [script, setScript] = useState(
    `[HOOK - LOOK DIRECTLY AT THE LENS]
Welcome to CreatorKit Pro Teleprompter!

[HIGH-FIDELITY AUDIO RECORDING]
Record crystal-clear voiceovers with real-time decibel monitoring right at the top of your screen.

[SMOOTH AI SPEECH SYNC]
Start reading aloud and notice how the prompter glides gently with your natural speaking cadence.

[PAUSE TEST - TAKE A BREATH]
When you pause to take a breath or emphasize a point, the auto-scroll smoothly freezes immediately.

[EFFORTLESS PACING]
Control your speed, adjust your font size, and download your voice recording in one tap!`
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
  const [showSettings, setShowSettings] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'speech' | 'width' | 'audio' | 'fonts' | 'cues' | 'templates'>('speech');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto Mobile Screen State Detection
  const [isMobile, setIsMobile] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
      setIsMobile(mobile);
      if (mobile) {
        setCameraLayout('full-bg');
        setShowSettings(false);
        setFontSize((f) => Math.max(32, Math.min(f, 56)));
        setShowEyelineGuide(false);
        setCircularFocusLens(false);
        setBgDimOpacity(0.45);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Tokenize script into word array — handles multi-word cues like [HOOK - LOOK AT LENS]
  const scriptTokens = useMemo(() => {
    const tokens: { id: number; raw: string; isCue: boolean; clean: string; isBreak: boolean }[] = [];
    // Split by bracket groups first, preserving them
    const segments = script.split(/(\[[^\]]*\])/g);
    let wordIdx = 0;

    segments.forEach((segment) => {
      // Check if this segment is a bracket cue like [HOOK] or [SMOOTH AI SYNC]
      if (/^\[.*\]$/.test(segment.trim()) && segment.trim().length > 2) {
        tokens.push({ id: -1, raw: segment.trim(), isCue: true, clean: '', isBreak: false });
        return;
      }

      // Otherwise, split by whitespace as before
      const splits = segment.split(/(\s+)/);
      splits.forEach((tok) => {
        if (/^\s+$/.test(tok)) {
          if (tok.includes('\n')) {
            tokens.push({ id: -1, raw: tok, isCue: false, clean: '', isBreak: true });
          } else {
            tokens.push({ id: -1, raw: tok, isCue: false, clean: '', isBreak: false });
          }
        } else if (tok.length > 0) {
          tokens.push({
            id: wordIdx++,
            raw: tok,
            isCue: false,
            clean: cleanWordForMatch(tok),
            isBreak: false,
          });
        }
      });
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
  const mobileHudWaveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakHoldRef = useRef<{ level: number; time: number }>({ level: -60, time: 0 });

  // Voice & Video recording refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const bgVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);

  // Adaptive Velocity & Cadence Learner Refs
  const learnedWpmRef = useRef<number>(130); // Default natural speaking pace (130 WPM)
  const lastMatchTimestampRef = useRef<number>(Date.now());
  const lastMatchIndexRef = useRef<number>(0);
  const speechVelocityPxPerSecRef = useRef<number>(0);
  const isSpeakingCadenceActiveRef = useRef<boolean>(false);
  // Ghanaian-optimized voice matching engine (src/lib/teleprompter/voice-matching-engine.ts)
  const voiceEngineRef = useRef<VoiceMatchEngine | null>(null);
  // Word-timeline karaoke tracking: a float word position that advances at
  // the learned WPM between confirmed speech matches, so highlighting and
  // scrolling progress word-by-word on a smooth timeline instead of jumping.
  const virtualWordFloatRef = useRef<number>(0);
  const lastDisplayedWordRef = useRef<number>(-1);

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

  useEffect(() => {
    const savedWpm = localStorage.getItem('creatorKit_learnedWpm');
    if (savedWpm) {
      const parsed = parseInt(savedWpm, 10);
      if (!isNaN(parsed) && parsed >= 50 && parsed <= 300) {
        learnedWpmRef.current = parsed;
      }
    }
  }, []);

  const handleResetScroll = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    scrollPosRef.current = 0;
    targetScrollYRef.current = 0;
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    virtualWordFloatRef.current = 0;
    lastDisplayedWordRef.current = -1;
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

  const [tapToast, setTapToast] = useState<'PLAY' | 'PAUSE' | null>(null);
  const tapToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showTapToast = (action: 'PLAY' | 'PAUSE') => {
    if (tapToastTimerRef.current) clearTimeout(tapToastTimerRef.current);
    setTapToast(action);
    tapToastTimerRef.current = setTimeout(() => {
      setTapToast(null);
    }, 700);
  };

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  }, []);

  const triggerPlaybackWithCountdown = () => {
    if (isPlaying) {
      setIsPlaying(false);
      showTapToast('PAUSE');
      return;
    }
    showTapToast('PLAY');
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
      // On mobile, position active reading line comfortably at 45% screen height
      const targetRatio = isMobile ? 0.45 : (eyelinePercent / 100);
      const targetY = targetSpan.offsetTop - readerRef.current.clientHeight * targetRatio;
      targetScrollYRef.current = Math.max(0, targetY);
    }
  }, [eyelinePercent, isMobile]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch { }
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

    // (Re)initialize the accent-aware matching engine with the persisted cadence
    if (!voiceEngineRef.current) {
      voiceEngineRef.current = createVoiceMatchEngine({ initialWpm: learnedWpmRef.current });
    } else {
      voiceEngineRef.current.reset(Math.max(0, activeWordIndexRef.current), learnedWpmRef.current);
    }

    // Sync the karaoke word timeline to the current reading position
    virtualWordFloatRef.current = Math.max(0, activeWordIndexRef.current);
    lastDisplayedWordRef.current = activeWordIndexRef.current;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Ghanaian English is non-rhotic like British English, so the en-GB
      // acoustic model transcribes Ghanaian accents noticeably better.
      recognition.lang = 'en-GB';

      recognition.onstart = () => {
        setSpeechStatus('listening');
      };

      recognition.onresult = (event: any) => {
        setSpeechStatus('speaking');

        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
          setSpeechStatus('paused');
          isSpeakingCadenceActiveRef.current = false;
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

        // Use more recent words for better matching (up to 6 words)
        const recentSpoken = spokenWords.slice(-6);
        const lastSpoken = recentSpoken[recentSpoken.length - 1];
        setLastHeardWord(lastSpoken);

        const total = cleanWordsList.length;
        if (total === 0) return;

        // Ghanaian-optimized, context-aware voice matching engine.
        // Tracks reading position, adapts its search window to speed,
        // tolerates re-reads, and learns the speaker's natural WPM.
        const engine = voiceEngineRef.current;
        if (engine && Math.abs(engine.currentIndex - activeWordIndexRef.current) > 20) {
          // Follow manual navigation (chapter jumps / scrubbing)
          engine.seek(Math.max(0, activeWordIndexRef.current));
        }
        const phraseMatch = engine ? engine.process(recentSpoken, cleanWordsList) : null;

        if (phraseMatch && phraseMatch.matched) {
          // Sync the engine's learned cadence into the persisted ref that
          // drives the scroll-prediction animation loop
          learnedWpmRef.current = phraseMatch.learnedWpm;
          localStorage.setItem('creatorKit_learnedWpm', phraseMatch.learnedWpm.toString());

          lastMatchTimestampRef.current = Date.now();
          lastMatchIndexRef.current = phraseMatch.matchIndex;
          isSpeakingCadenceActiveRef.current = true;

          setActiveWordIndex(phraseMatch.matchIndex);
          activeWordIndexRef.current = phraseMatch.matchIndex;
          // Snap the karaoke timeline to the confirmed match
          virtualWordFloatRef.current = phraseMatch.matchIndex;
          lastDisplayedWordRef.current = phraseMatch.matchIndex;
          updateTargetScrollForWord(phraseMatch.matchIndex);
          setScrollProgress(Math.round(((phraseMatch.matchIndex + 1) / total) * 100));
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          console.warn('SpeechRecognition notice:', err);
        }
        // If aborted or interrupted on mobile, auto restart if still playing
        if (speechFollowRef.current && isPlayingRef.current) {
          setTimeout(() => {
            try {
              if (speechFollowRef.current && isPlayingRef.current) {
                recognition.start();
              }
            } catch { }
          }, 300);
        }
      };

      recognition.onend = () => {
        if (speechFollowRef.current && isPlayingRef.current) {
          setTimeout(() => {
            try {
              if (speechFollowRef.current && isPlayingRef.current) {
                recognition.start();
              }
            } catch { }
          }, 200);
        } else {
          setSpeechStatus('idle');
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn('Recognition start already active:', e);
      }
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
          const now = Date.now();
          const timeSinceLastMatch = now - lastMatchTimestampRef.current;

          // 1. Anchor Word Spring Easing: If there is a target position difference, ease into it smoothly
          if (Math.abs(diff) > 0.5) {
            let decay = 1 - Math.exp(-4.5 * (Math.min(delta, 50) / 1000));
            let appliedDiff = diff;

            // Dampen backwards snapping (text moving down) to prevent erratic "going down down" behavior
            if (diff < -2) {
              // If the overshoot is small (less than roughly one line height), don't snap back at all.
              // Just pause and wait for the natural scroll target to catch up.
              if (diff > -(fontSize * 1.5)) {
                appliedDiff = 0;
              } else {
                // If it's a huge jump backwards, ease it much slower so it's not jarring
                decay = 1 - Math.exp(-1.5 * (Math.min(delta, 50) / 1000));
              }
            }

            if (appliedDiff !== 0) {
              el.scrollTop = currentScroll + (appliedDiff * decay);
              scrollPosRef.current = el.scrollTop;
            }
          }
          // 2. Word-Timeline Karaoke Glide: advance a virtual word position
          // at the learned WPM between anchors so the highlight moves
          // word-by-word and the scroll follows the actual word positions.
          else if (timeSinceLastMatch < 1200 && isSpeakingCadenceActiveRef.current) {
            const wordsPerSec = learnedWpmRef.current / 60;
            const maxLead = 8; // never drift far ahead of the last confirmed match
            const nextVirtual = Math.min(
              virtualWordFloatRef.current + wordsPerSec * (delta / 1000),
              lastMatchIndexRef.current + maxLead
            );
            virtualWordFloatRef.current = Math.max(virtualWordFloatRef.current, nextVirtual);

            // Karaoke highlight: advance the active word along the timeline
            const displayWord = Math.round(virtualWordFloatRef.current);
            if (displayWord !== lastDisplayedWordRef.current) {
              lastDisplayedWordRef.current = displayWord;
              setActiveWordIndex(displayWord);
              activeWordIndexRef.current = displayWord;
            }

            // Timeline scroll: interpolate pixels between actual word anchors
            const wordSpans = readerRef.current?.querySelectorAll('[data-word="1"]');
            if (wordSpans && wordSpans.length > 0) {
              const floorIdx = Math.min(Math.floor(virtualWordFloatRef.current), wordSpans.length - 1);
              const ceilIdx = Math.min(floorIdx + 1, wordSpans.length - 1);
              const frac = virtualWordFloatRef.current - floorIdx;
              const targetRatio = isMobile ? 0.45 : eyelinePercent / 100;
              const anchorY = (readerRef.current?.clientHeight || 0) * targetRatio;
              const y0 = Math.max(0, (wordSpans[floorIdx] as HTMLElement).offsetTop - anchorY);
              const y1 = Math.max(0, (wordSpans[ceilIdx] as HTMLElement).offsetTop - anchorY);
              targetScrollYRef.current = y0 + (y1 - y0) * frac;

              const glideDiff = targetScrollYRef.current - currentScroll;
              if (Math.abs(glideDiff) > 0.5) {
                const glideDecay = 1 - Math.exp(-3.2 * (Math.min(delta, 50) / 1000));
                el.scrollTop = currentScroll + glideDiff * glideDecay;
                scrollPosRef.current = el.scrollTop;
              }
            }
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
  }, [speed, fontSize, isMobile, eyelinePercent]);

  // ─────────────────────────────────────────────────────────────
  // 3. LIVE WEB AUDIO VU METER & REAL-TIME DECIBEL MONITOR
  // ─────────────────────────────────────────────────────────────
  const stopAudioAnalysis = useCallback(() => {
    if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch { }
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

      const audioConstraints: MediaTrackConstraints = {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      micStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Studio Vocal Clarity Filter (High-pass at 85Hz to cut low rumble/AC hum)
      const highPassFilter = ctx.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 85;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;

      source.connect(highPassFilter);
      highPassFilter.connect(analyser);
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
          // Amplify sensitivity by 3.5x so voice dynamics produce clear visible waveforms
          const v = (data[i] - 0) * 3.5;
          const clamped = Math.max(-1, Math.min(1, v));
          const y = ((clamped + 1) / 2) * height;

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

        // Dynamic Waveform Colors:
        // Peak >= -10dB -> Red (#ef4444)
        // Normal Speech (-45dB to -10dB) -> Vibrant Green (#22c55e)
        // Background noise (< -45dB) -> Amber / Golden Brown (#f59e0b)
        const waveColor = peakDb >= -10.0 ? '#ef4444' : peakDb >= -45.0 ? '#22c55e' : '#f59e0b';
        drawWaveform(waveformCanvasRef.current, timeDomainData, waveColor);
        drawWaveform(hudWaveformCanvasRef.current, timeDomainData, waveColor);
        drawWaveform(mobileHudWaveformCanvasRef.current, timeDomainData, waveColor);

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
      }).catch(() => { });
    }
  }, [selectedAudioDeviceId, selectedCameraId]);

  useEffect(() => {
    startAudioAnalysis(selectedAudioDeviceId);

    const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => { });
      }
    };
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });

    return () => {
      stopAudioAnalysis();
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
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
      videoPreviewRef.current.play().catch(() => { });
    }
    if (bgVideoPreviewRef.current && cameraStream && cameraActive) {
      bgVideoPreviewRef.current.srcObject = cameraStream;
      bgVideoPreviewRef.current.play().catch(() => { });
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

  // ─────────────────────────────────────────────────────────────
  // VOICE AUDIO RECORDER (Pure Crystal-Clear Microphone Audio)
  // ─────────────────────────────────────────────────────────────
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const startVoiceRecording = () => {
    if (!micStreamRef.current) {
      startAudioAnalysis(selectedAudioDeviceId);
    }
    const stream = micStreamRef.current;
    if (!stream) return;

    audioChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/mp4';

    try {
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
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
    } catch (err) {
      console.warn('Voice recording start failed:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
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
              display: 'block',
              margin: '10px 0 2px',
              color: '#FFE500',
              fontSize: '0.45em',
              fontWeight: 700,
              letterSpacing: '0.05em',
              lineHeight: 1.3,
              textAlign: textAlign,
              textShadow: 'none',
              userSelect: 'none',
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
            backgroundColor: isCurrent ? 'rgba(255, 229, 0, 0.25)' : 'transparent',
            color: isCurrent ? '#FFE500' : isPast ? 'rgba(255,255,255,0.45)' : 'inherit',
            borderBottom: isCurrent ? '2px solid #FFE500' : '2px solid transparent',
            borderRadius: 2,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
            padding: '0 2px 1px',
            margin: 0,
            transition: 'color 0.16s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.16s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
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
        height: '100dvh',
        minHeight: '-webkit-fill-available',
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
      {/* ── Top Floating Studio Header HUD Bar (Desktop Only) ── */}
      {!isMobile && (
        <header
          className="fs-header prompter-desktop-header"
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 1120,
            height: 46,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2.5px solid #000000',
            borderRadius: 12,
            boxShadow: '0 6px 25px rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            zIndex: 50,
            flexShrink: 0,
            color: '#000000',
            transition: 'opacity 0.4s ease',
            opacity: isPlaying ? 0.35 : 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { if (isPlaying) e.currentTarget.style.opacity = '0.35'; }}
        >
          <div className="fs-header-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/"
              className="brutalist-button"
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                borderRadius: 6,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ‹ HOME
            </Link>

            <StudioToolsDropdown currentHref="/teleprompter" theme="light" />

            <button
              onClick={() => setShowScriptModal(true)}
              style={{
                padding: '5px 10px',
                background: '#FFE500',
                color: '#000000',
                border: '2px solid #000000',
                borderRadius: 6,
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <FileText size={12} />
              SCRIPT
            </button>

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

          {/* Center Read Telemetry & Audio Meter */}
          <div className="fs-header-center" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'monospace', fontSize: '0.74rem', fontWeight: 900 }}>
            {/* AI Voice Sync / Timed Scroll Toggle Badge (Strict Single Line) */}
            <button
              onClick={() => setSpeechFollowEnabled(!speechFollowEnabled)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                border: '1.5px solid #000',
                borderRadius: 6,
                background: speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? '#dcfce7'
                    : speechStatus === 'listening'
                      ? '#fef3c7'
                      : '#fee2e2'
                  : '#ffffff',
                color: speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? '#15803d'
                    : speechStatus === 'listening'
                      ? '#b45309'
                      : '#b91c1c'
                  : '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.68rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: '1.5px 1.5px 0 #000',
              }}
              title="Click to toggle AI Voice Sync vs Timed Scroll (S)"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: speechFollowEnabled
                    ? speechStatus === 'speaking'
                      ? '#22c55e'
                      : speechStatus === 'listening'
                        ? '#f59e0b'
                        : '#ef4444'
                    : '#71717a',
                }}
                className={speechStatus === 'speaking' && speechFollowEnabled ? 'animate-pulse' : ''}
              />
              <span style={{ whiteSpace: 'nowrap' }}>
                {speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? `AI: "${lastHeardWord || 'SPEAKING'}"`
                    : speechStatus === 'listening'
                      ? 'AI LISTENING'
                      : 'PAUSED'
                  : `TIMED SCROLL (${speed.toFixed(1)}x)`}
              </span>
            </button>

            {/* Desktop Decibel & Waveform Box */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ffffff',
                padding: '3px 8px',
                border: '1.5px solid #000',
                borderRadius: 6,
                boxShadow: '1.5px 1.5px 0 #000',
              }}
            >
              <canvas ref={hudWaveformCanvasRef} width={50} height={15} style={{ background: '#000', borderRadius: 2 }} />
              <span style={{ fontSize: '0.68rem', color: isClipping ? '#dc2626' : '#000', whiteSpace: 'nowrap' }}>
                {isClipping ? 'CLIP!' : `${rmsDecibels}dB`}
              </span>
            </div>

            {isRecording && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fee2e2', border: '1.5px solid #ef4444', padding: '3px 8px', borderRadius: 6, color: '#b91c1c', boxShadow: '1.5px 1.5px 0 #000' }}>
                <Radio size={12} className="animate-pulse" />
                <span>REC {formatTime(recordingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="fs-header-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleToggleFullscreen}
              className="brutalist-button"
              style={{ padding: '5px 8px', fontSize: '0.68rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            <button
              onClick={() => setShowShortcutsModal(true)}
              className="brutalist-button"
              style={{ padding: '5px 8px', fontSize: '0.68rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
              title="View Keyboard Shortcuts (Shift + ?)"
            >
              <HelpCircle size={13} />
              Shortcuts
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`brutalist-button ${showSettings ? 'brutalist-button-primary' : ''}`}
              style={{ padding: '5px 10px', fontSize: '0.68rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <SlidersHorizontal size={13} />
              {showSettings ? 'Hide' : 'Controls'}
            </button>
          </div>
        </header>
      )}

      {/* ── Main Prompter Screen + Sidebar Layout ── */}
      <div className="fs-workspace" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
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
          {/* ── MOBILE: Top Telemetry Bar (AI Sync Status + Separated dB Box) ── */}
          <div
            className="prompter-mobile-top-hud"
            style={{
              position: 'absolute',
              top: 'max(8px, env(safe-area-inset-top, 8px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 35,
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              pointerEvents: 'auto',
              width: 'max-content',
              maxWidth: '92vw',
            }}
          >
            {/* 1. AI Voice Sync Toggle Badge (Flexible width, strictly 1 single horizontal line) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSpeechFollowEnabled(!speechFollowEnabled);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                border: '1.5px solid #000',
                borderRadius: 4,
                background: speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? '#dcfce7'
                    : speechStatus === 'listening'
                      ? '#fef3c7'
                      : '#fee2e2'
                  : '#ffffff',
                color: speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? '#15803d'
                    : speechStatus === 'listening'
                      ? '#b45309'
                      : '#b91c1c'
                  : '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.64rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: '1.5px 1.5px 0 #000',
                flexShrink: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title="Tap to toggle AI Voice Sync vs Auto Scroll"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: speechFollowEnabled
                    ? speechStatus === 'speaking'
                      ? '#22c55e'
                      : speechStatus === 'listening'
                        ? '#f59e0b'
                        : '#ef4444'
                    : '#71717a',
                  flexShrink: 0,
                }}
                className={speechStatus === 'speaking' && speechFollowEnabled ? 'animate-pulse' : ''}
              />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {speechFollowEnabled
                  ? speechStatus === 'speaking'
                    ? `AI: "${lastHeardWord || 'SPEAKING'}"`
                    : speechStatus === 'listening'
                      ? 'AI LISTENING'
                      : 'PAUSED'
                  : 'TIMED SCROLL'}
              </span>
            </button>

            {/* 2. Decibel & Waveform Box (Separated Desktop Style Box) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ffffff',
                padding: '3px 8px',
                border: '1.5px solid #000',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontWeight: 900,
                boxShadow: '1.5px 1.5px 0 #000',
                flexShrink: 0,
              }}
            >
              {/* Dynamic Live Color VU Canvas */}
              <canvas
                ref={mobileHudWaveformCanvasRef}
                width={80}
                height={28}
                style={{
                  width: 44,
                  height: 14,
                  background: '#000000',
                  borderRadius: 2,
                  display: 'block',
                }}
              />
              <span
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: rmsDecibels >= -12 ? '#dc2626' : rmsDecibels >= -45 ? '#16a34a' : '#d97706',
                  whiteSpace: 'nowrap',
                }}
              >
                {isClipping ? 'CLIP!' : `${rmsDecibels}dB`}
              </span>
            </div>
          </div>



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
                EYELINE HORIZON ({eyelinePercent}%)
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
                  fontSize: '7.5rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: '#FFE500',
                  textShadow: '0 0 35px rgba(255, 229, 0, 0.75)',
                  transform: 'translateY(-10%)',
                }}
              >
                {countdown}
              </div>
            </div>
          )}

          {/* 5. Mobile Tap Feedback Toast */}
          {tapToast && (
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 48,
                background: tapToast === 'PLAY' ? '#FFE500' : '#ffffff',
                color: '#000000',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0 #000000',
                padding: '10px 24px',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '1.2rem',
                letterSpacing: '0.04em',
                pointerEvents: 'none',
              }}
            >
              {tapToast === 'PLAY' ? 'STARTING...' : 'PAUSED'}
            </div>
          )}

          {/* 6. Main Prompter Reading Column */}
          <div
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
                showTapToast('PAUSE');
              } else {
                triggerPlaybackWithCountdown();
              }
            }}
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : containerMaxWidth,
              height: '100%',
              position: 'relative',
              zIndex: 16,
              transform: mirrorTransform,
              borderLeft: isMobile ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
              borderRight: isMobile ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}
          >
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
                padding: isMobile ? '28vh 14px 80vh' : `calc(${eyelinePercent}vh - 30px) ${textPaddingHorizontal}px 60vh`,
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                textShadow: (cameraActive || isMobile) ? '0 2px 12px rgba(0,0,0,0.98), 0 0 6px #000, 0 0 20px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.6)' : 'none',
              }}
            >
              {renderTokens()}
            </div>

            {/* Top Fade Bleed — subtle 8% top gradient so text is never obscured */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '8%',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
                zIndex: 17,
                pointerEvents: 'none',
              }}
            />

            {/* Bottom Fade Bleed — subtle bottom fade */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '14%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                zIndex: 17,
                pointerEvents: 'none',
              }}
            />
          </div>



          {/* ── Transport Controls: Mobile Floating Pill + Bottom Sheet + Desktop Studio Dock ── */}
          <>
            {/* ── MOBILE: Bottom Floating Control Pill ── */}
            <div
              className={mobileControlsOpen ? '' : 'prompter-mobile-pill'}
              style={{
                position: 'fixed',
                bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 60,
                display: 'none',
                alignItems: 'center',
                gap: 0,
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 50,
                padding: '3px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                transition: 'opacity 0.5s ease',
                opacity: isPlaying ? 0.65 : 1,
              }}
              onTouchStart={(e) => { e.currentTarget.style.opacity = '1'; }}
              onTouchEnd={(e) => { const el = e.currentTarget; if (isPlaying) setTimeout(() => { try { el.style.opacity = '0.65'; } catch { } }, 2000); }}
            >
              {/* Play / Pause button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlaying) {
                    setIsPlaying(false);
                    showTapToast('PAUSE');
                  } else {
                    triggerPlaybackWithCountdown();
                  }
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: 'none',
                  background: isPlaying ? '#FFE500' : '#ffffff',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {isPlaying ? <Pause size={20} strokeWidth={3} /> : <Play size={20} strokeWidth={3} />}
              </button>

              {/* Speed indicator */}
              <div style={{ padding: '0 10px', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.76rem', color: '#fff', whiteSpace: 'nowrap' }}>
                {speed.toFixed(1)}x
              </div>

              {/* Settings Gear */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileControlsOpen(true);
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* ── MOBILE: Bottom Sheet Controls ── */}
            {mobileControlsOpen && (
              <>
                <div onClick={() => setMobileControlsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70, backdropFilter: 'blur(4px)' }} />
                <div
                  style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 71,
                    background: '#ffffff', borderRadius: '24px 24px 0 0',
                    padding: `16px 16px max(20px, env(safe-area-inset-bottom, 20px))`,
                    color: '#000', display: 'flex', flexDirection: 'column', gap: 12,
                    maxHeight: '75dvh', overflowY: 'auto',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Drag Handle */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: -4 }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d4d4d8' }} />
                  </div>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Studio Controls
                    </span>
                    <button
                      onClick={() => setMobileControlsOpen(false)}
                      style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #000', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* 1. Voice Recording & AI Voice Follow Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Voice Recording Action */}
                    <div>
                      <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>
                        Voice Recorder
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isRecording) {
                            stopVoiceRecording();
                          } else {
                            startVoiceRecording();
                          }
                        }}
                        style={{
                          width: '100%',
                          minHeight: 44,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: isRecording ? '#ef4444' : '#ffffff',
                          color: isRecording ? '#ffffff' : '#000000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: isRecording ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
                        }}
                      >
                        <Mic size={16} />
                        {isRecording ? `REC (${formatTime(recordingSeconds)})` : 'RECORD MIC'}
                      </button>
                    </div>

                    {/* AI Speech Voice Follow Toggle */}
                    <div>
                      <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>
                        Scroll Mode
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpeechFollowEnabled(!speechFollowEnabled);
                        }}
                        style={{
                          width: '100%',
                          minHeight: 44,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: speechFollowEnabled ? '#FFE500' : '#fff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {speechFollowEnabled ? 'AI VOICE SYNC' : 'TIMED SCROLL'}
                      </button>
                    </div>
                  </div>

                  {/* Recorded Audio Download / Preview Player (If available) */}
                  {recordedAudioUrl && (
                    <div style={{ background: '#fef3c7', border: '1.5px solid #d97706', padding: '8px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <audio src={recordedAudioUrl} controls style={{ height: 28, flex: 1 }} />
                      <a
                        href={recordedAudioUrl}
                        download={`creatorkit-voice-${Date.now()}.webm`}
                        style={{
                          padding: '6px 10px',
                          background: '#000',
                          color: '#FFE500',
                          border: '1.5px solid #000',
                          borderRadius: 6,
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.65rem',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        DOWNLOAD
                      </a>
                    </div>
                  )}

                  {/* 2. Speed Stepper */}
                  <div>
                    <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>Speed</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={(e) => { e.stopPropagation(); setSpeed((s) => Math.max(0.5, parseFloat((s - 0.2).toFixed(1)))); }} style={{ flex: 1, minHeight: 44, border: 'none', background: '#fff', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer' }}>−</button>
                      <span style={{ flex: 1.6, textAlign: 'center', fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace', background: '#f4f4f5' }}>{speed.toFixed(1)}x</span>
                      <button onClick={(e) => { e.stopPropagation(); setSpeed((s) => Math.min(8.0, parseFloat((s + 0.2).toFixed(1)))); }} style={{ flex: 1, minHeight: 44, border: 'none', background: '#fff', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* 3. Font Size & Family */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>Text Size</label>
                      <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={(e) => { e.stopPropagation(); setFontSize((f) => Math.max(22, f - 4)); }} style={{ flex: 1, minHeight: 44, border: 'none', background: '#fff', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer' }}>−</button>
                        <span style={{ flex: 1.4, textAlign: 'center', fontSize: '0.95rem', fontWeight: 900, fontFamily: 'monospace', background: '#f4f4f5' }}>{fontSize}px</span>
                        <button onClick={(e) => { e.stopPropagation(); setFontSize((f) => Math.min(72, f + 4)); }} style={{ flex: 1, minHeight: 44, border: 'none', background: '#fff', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>Font Family</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{
                          width: '100%',
                          height: 44,
                          border: '2px solid #000',
                          borderRadius: 8,
                          padding: '0 8px',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          background: '#fff',
                          color: '#000',
                          cursor: 'pointer',
                        }}
                      >
                        <option value='"Inter", sans-serif'>Inter (Default)</option>
                        <option value='"Roboto", sans-serif'>Roboto</option>
                        <option value='"Outfit", sans-serif'>Outfit</option>
                        <option value='"Montserrat", sans-serif'>Montserrat</option>
                        <option value='"Cinzel", serif'>Cinzel (Cinematic)</option>
                        <option value='"Space Mono", monospace'>Space Mono</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. Secondary Action Buttons: Safe Zone, Script, Reset */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); setShowSafeAreas((s) => !s); }} style={{ minHeight: 42, border: '2px solid #000', borderRadius: 8, background: showSafeAreas ? '#FFE500' : '#fff', color: '#000', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Shield size={14} /> {showSafeAreas ? '9:16 ON' : 'Safe Area'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMobileControlsOpen(false); setShowScriptModal(true); }} style={{ minHeight: 42, border: '2px solid #000', borderRadius: 8, background: '#fff', color: '#000', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <FileText size={14} /> Script
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleResetScroll(); setMobileControlsOpen(false); }} style={{ minHeight: 42, border: '2px solid #000', borderRadius: 8, background: '#f4f4f5', color: '#000', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>

                  {/* Telemetry info */}
                  <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.65rem', fontWeight: 700, color: '#a1a1aa' }}>
                    {totalWords} words · ~{Math.max(10, Math.ceil((totalWords / Math.max(60, speed * 120)) * 60))}s read time
                  </div>

                  {/* Big Start / Pause Reading Action */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMobileControlsOpen(false); if (isPlaying) { setIsPlaying(false); } else { triggerPlaybackWithCountdown(); } }}
                    style={{
                      width: '100%', minHeight: 50, border: '2.5px solid #000', borderRadius: 10,
                      background: isPlaying ? '#000' : '#FFE500', color: isPlaying ? '#FFE500' : '#000',
                      fontFamily: 'monospace', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.06em',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '2px 2px 0 #000',
                    }}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    {isPlaying ? 'PAUSE PROMPTER' : 'START READING'}
                  </button>
                </div>
              </>
            )}
          </>

          {/* ── Desktop Studio Floating Transport Dock ── */}
          <div
            className="prompter-desktop-dock"
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 35,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '5px 12px 5px 6px',
              border: '2.5px solid #000000',
              borderRadius: 50,
              boxShadow: '0 10px 35px rgba(0,0,0,0.5)',
              color: '#000000',
              transition: 'opacity 0.4s ease',
              opacity: isPlaying ? 0.45 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (isPlaying) e.currentTarget.style.opacity = '0.45'; }}
          >
            {/* 1. Big Play / Pause Action */}
            <button
              onClick={triggerPlaybackWithCountdown}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '2px solid #000',
                background: isPlaying ? '#000000' : '#FFE500',
                color: isPlaying ? '#FFE500' : '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '1.5px 1.5px 0 #000',
                flexShrink: 0,
              }}
              title="Play / Pause (SPACE)"
            >
              {isPlaying ? <Pause size={18} strokeWidth={3} /> : <Play size={18} strokeWidth={3} />}
            </button>

            {/* 2. Reset */}
            <button
              onClick={handleResetScroll}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #000',
                background: '#f4f4f5',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Reset Scroll to Top (R / Home)"
            >
              <RotateCcw size={14} />
            </button>

            {/* 3. Pure Voice Audio Recorder */}
            <button
              onClick={() => {
                if (isRecording) stopVoiceRecording();
                else startVoiceRecording();
              }}
              style={{
                padding: '6px 12px',
                fontSize: '0.72rem',
                borderRadius: 20,
                border: '1.5px solid #000',
                background: isRecording ? '#ef4444' : '#ffffff',
                color: isRecording ? '#ffffff' : '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: isRecording ? '0 0 10px rgba(239,68,68,0.5)' : 'none',
              }}
              title="Record High-Quality Voice Track"
            >
              <Mic size={14} />
              <span>{isRecording ? `REC (${formatTime(recordingSeconds)})` : 'REC'}</span>
            </button>

            {/* Recorded Audio Download (If Available) */}
            {recordedAudioUrl && (
              <a
                href={recordedAudioUrl}
                download={`creatorkit-voice-${Date.now()}.webm`}
                style={{
                  padding: '5px 10px',
                  background: '#FFE500',
                  color: '#000',
                  border: '1.5px solid #000',
                  borderRadius: 20,
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Download Recorded Voice Audio"
              >
                <Download size={13} /> AUDIO
              </a>
            )}

            <div style={{ width: 1, height: 20, background: '#d4d4d8', margin: '0 2px' }} />

            {/* 4. Speed Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #000', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
              <button
                onClick={() => setSpeed((s) => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))))}
                style={{ padding: '4px 8px', border: 'none', background: '#fff', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer' }}
                title="Decrease Speed ([)"
              >
                −
              </button>
              <span style={{ padding: '0 6px', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', background: '#f4f4f5' }}>
                {speed.toFixed(1)}x
              </span>
              <button
                onClick={() => setSpeed((s) => Math.min(8.0, parseFloat((s + 0.2).toFixed(1))))}
                style={{ padding: '4px 8px', border: 'none', background: '#fff', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer' }}
                title="Increase Speed (])"
              >
                +
              </button>
            </div>

            {/* 5. Text Size Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #000', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
              <button
                onClick={() => setFontSize((f) => Math.max(20, f - 4))}
                style={{ padding: '4px 8px', border: 'none', background: '#fff', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer' }}
                title="Smaller Font (-)"
              >
                A−
              </button>
              <span style={{ padding: '0 6px', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', background: '#f4f4f5' }}>
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((f) => Math.min(96, f + 4))}
                style={{ padding: '4px 8px', border: 'none', background: '#fff', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer' }}
                title="Larger Font (+)"
              >
                A+
              </button>
            </div>

            <div style={{ width: 1, height: 20, background: '#d4d4d8', margin: '0 2px' }} />

            {/* 6. Mirror Horizontal */}
            <button
              onClick={() => setMirrorHorizontal((m) => !m)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #000',
                background: mirrorHorizontal ? '#000' : '#fff',
                color: mirrorHorizontal ? '#fff' : '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Mirror Horizontal Beam-Splitter (M)"
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* 7. Controls drawer toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #000',
                background: showSettings ? '#FFE500' : '#fff',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Studio Settings & Controls (H)"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* ── Right Settings & Studio Control Slide-Over Drawer (Desktop Only) ── */}
        {showSettings && !isMobile && (
          <>
            <div
              onClick={() => setShowSettings(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 80,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />
            <aside
              className="no-scrollbar prompter-desktop-sidebar"
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 400,
                maxWidth: '90vw',
                background: '#ffffff',
                borderLeft: '3px solid #000000',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 85,
                color: '#000000',
                overflowY: 'auto',
                boxShadow: '-10px 0 35px rgba(0,0,0,0.4)',
              }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '12px 14px', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.84rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SlidersHorizontal size={15} />
                  Studio Settings
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '2px solid #000',
                    background: '#f4f4f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Drawer Category Tabs (6 categories) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '2px solid #000', background: '#f4f4f5' }}>
                {[
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
          </>
        )}
      </div>

      {/* ── Quick Script Paste & Template Modal (Grandma Simple Mode) ── */}
      {showScriptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowScriptModal(false)}
        >
          <div
            className="brutalist-card"
            style={{
              background: '#fff',
              border: '3px solid #000',
              boxShadow: '6px 6px 0 #000',
              width: '100%',
              maxWidth: 560,
              padding: 20,
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              color: '#000',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                PASTE YOUR SCRIPT
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={8}
              placeholder="Paste or type your video script here..."
              style={{
                width: '100%',
                padding: 12,
                border: '2px solid #000',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: 'sans-serif',
                resize: 'vertical',
              }}
            />

            {/* Stage Direction / Cues Quick Helper */}
            <div style={{ background: '#f4f4f5', padding: '10px 12px', borderRadius: 6, border: '1.5px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', color: '#52525b' }}>
                  Stage Direction / Cue Tags (Not read aloud):
                </span>
                <span style={{ fontSize: '0.58rem', fontFamily: 'monospace', color: '#71717a' }}>Tap to insert:</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['[HOOK]', '[PAUSE 2s]', '[SMILE]', '[LOOK AT LENS]', '[POINT 1]', '[CTA]'].map((cueTag) => (
                  <button
                    key={cueTag}
                    onClick={() => setScript((prev) => `${prev}\n\n${cueTag}\n`)}
                    style={{
                      padding: '3px 8px',
                      background: '#fff',
                      color: '#000',
                      border: '1.5px solid #000',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.62rem',
                      cursor: 'pointer',
                    }}
                  >
                    + {cueTag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setScript(text);
                  } catch (err) { }
                }}
                style={{
                  padding: '8px 12px',
                  background: '#f4f4f5',
                  border: '1.5px solid #000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                PASTE CLIPBOARD
              </button>
              <button
                onClick={() =>
                  setScript(
                    `[HOOK - 3 SECONDS]\nStop scrolling! If you are a creator in Ghana or Nigeria, here is the #1 mistake you might be making.\n\n[VALUE DELIVERY]\nNever start a brand shoot without a 50% deposit and clear usage terms.\n\n[CALL TO ACTION]\nDrop your thoughts in the comments and share with a fellow creator!`
                  )
                }
                style={{
                  padding: '8px 12px',
                  background: '#f4f4f5',
                  border: '1.5px solid #000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                VIRAL HOOK TEMPLATE
              </button>
              <button
                onClick={() => setScript('')}
                style={{
                  padding: '8px 12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1.5px solid #dc2626',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                CLEAR
              </button>
            </div>

            <button
              onClick={() => {
                handleResetScroll();
                setShowScriptModal(false);
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: '#FFE500',
                color: '#000',
                border: '2px solid #000',
                fontWeight: 900,
                fontSize: '0.95rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              DONE / START READING
            </button>
          </div>
        </div>
      )}

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
