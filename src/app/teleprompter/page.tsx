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
  Disc,
  Eye,
  Sparkles,
  Clock,
  FileText,
  Mic,
  Camera,
  HelpCircle,
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Share2,
  Flame,
  Volume2,
  Zap,
  Smartphone,
  Video,
  Radio,
  Bookmark,
  ChevronRight,
  Sliders,
  ListOrdered,
  Gauge,
} from 'lucide-react';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  right: number;
}

const SAFE_AREA_PRESETS: Record<
  'tiktok' | 'reels' | 'shorts' | 'custom',
  { label: string; top: number; bottom: number; right: number }
> = {
  tiktok: { label: 'TikTok', top: 12, bottom: 34, right: 24 },
  reels: { label: 'Instagram Reels', top: 12, bottom: 30, right: 22 },
  shorts: { label: 'YouTube Shorts', top: 10, bottom: 28, right: 16 },
  custom: { label: 'Custom', top: 12, bottom: 30, right: 20 },
};

const PROMPTER_WIDTH_PRESETS = [
  { id: 'portrait', label: '📱 Portrait (9:16 Phone)', width: '380px' },
  { id: 'standard', label: '📷 Prompter (4:3)', width: '560px' },
  { id: 'cinema', label: '💻 Wide (16:9)', width: '780px' },
  { id: 'full', label: '↔️ Full Screen (100%)', width: '100%' },
];

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
    name: '🎬 YouTube Viral Video (Hook + 3 Steps + CTA)',
    category: 'YouTube Long-form',
    text: `[HOOK - LOOK DIRECTLY AT CAMERA]
If you are still struggling to grow your channel in 2026, you are making this one critical mistake.

[SMILE - INTRO]
Welcome back creators. Today I am breaking down the exact 3-part framework that doubled our audience in under 90 days.

[STEP 1 - THE CORE PROBLEM]
First, stop spending 80% of your time on editing and only 20% on your packaging. The thumbnail and the first 5 seconds determine 90% of your video's reach.

[PAUSE - 2 SECONDS]

[STEP 2 - RETENTION PACING]
Second, cut the fluff. Never introduce yourself for 30 seconds. Dive straight into the promised value with dynamic cuts and visual pattern interrupts.

[STEP 3 - THE CLIFFHANGER HOOK]
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

// Split script tokens & colorize stage cues [HOOK], [PAUSE], [SMILE], etc.
function renderReaderTokens(text: string, activeIndex: number) {
  let wordCounter = 0;
  return text.split(/(\s+)/).map((tok, i) => {
    if (/^\s+$/.test(tok)) {
      if (tok.includes('\n')) return <span key={i}><br /></span>;
      return <span key={i}>{tok}</span>;
    }
    const isCue = /^[(\[].*[)\]]$/.test(tok);
    if (isCue) {
      return (
        <span
          key={i}
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
          {tok}
        </span>
      );
    }

    const currentIdx = wordCounter++;
    const isCurrentWord = currentIdx === activeIndex;

    return (
      <span
        key={i}
        data-word="1"
        data-index={currentIdx}
        style={{
          background: isCurrentWord ? '#FFE500' : 'transparent',
          color: isCurrentWord ? '#000000' : 'inherit',
          padding: isCurrentWord ? '1px 4px' : '0',
          borderRadius: isCurrentWord ? 3 : 0,
          transition: 'all 0.12s ease',
        }}
      >
        {tok}
      </span>
    );
  });
}

function SafeAreaGuide({ insets, mirrored }: { insets: SafeAreaInsets; mirrored: boolean }) {
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${insets.top}%`, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${insets.bottom}%`, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', top: `${insets.top}%`, bottom: `${insets.bottom}%`, right: 0, width: `${insets.right}%`, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', top: `${insets.top}%`, left: 0, right: `${insets.right}%`, bottom: `${insets.bottom}%`, border: '1.5px solid rgba(255,255,255,0.75)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }} />
    </div>
  );
}

export default function TeleprompterPage() {
  // Core Prompter State
  const [script, setScript] = useState(
    `[HOOK - LOOK DIRECTLY AT LENS]
Welcome to CreatorKit Professional Studio Teleprompter!

[SMILE - INTRO]
Paste or type your video script here, choose from 52 Google Fonts, adjust your reading width, and hit SPACE to play.

[READING COLUMN]
You can adjust the reading column width to 9:16 Portrait so your eyes stay locked under your camera lens without darting side-to-side!

[EYELINE TARGET]
The eyeline guide height can be positioned anywhere from 20% to 65% of the screen to match your physical webcam height.

[SMART SPEED]
Enable Smart Speed to let the teleprompter listen to your voice and auto-pause whenever you pause or take a breath.

[STAGE CUES]
Use bracketed cues like [PAUSE], [SMILE], or [B-ROLL] to guide your pacing.`
  );

  // Playback & Speed Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2.2); // Speed multiplier
  const [fontSize, setFontSize] = useState(44); // px
  const [lineHeight, setLineHeight] = useState(1.6);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('"Inter", sans-serif');
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>('All');
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');

  // Reading Column Geometry & Eyeline Height
  const [readingWidthPreset, setReadingWidthPreset] = useState<'portrait' | 'standard' | 'cinema' | 'full' | 'custom'>('standard');
  const [readingWidthPercent, setReadingWidthPercent] = useState(55); // 30% to 100%
  const [eyelinePercent, setEyelinePercent] = useState(45); // 20% to 65% of screen height
  const [bgDimOpacity, setBgDimOpacity] = useState(0.7); // Background video darkness

  // Mirror Controls (Dual Mirroring)
  const [mirrorHorizontal, setMirrorHorizontal] = useState(false); // scaleX(-1) for beam-splitter glass
  const [mirrorVertical, setMirrorVertical] = useState(false); // scaleY(-1) for inverted rigs
  const [loop, setLoop] = useState(false);

  // Circular Lens Focus & Eyeline Styles
  const [circularFocusLens, setCircularFocusLens] = useState<boolean>(true);
  const [focusIntensity, setFocusIntensity] = useState<number>(0.65);
  const [readingHighlightStyle, setReadingHighlightStyle] = useState<'laser' | 'marker' | 'box' | 'underline' | 'neon'>('marker');

  // Sidebar & Layout State
  const [showSettings, setShowSettings] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'prompter' | 'format' | 'audio' | 'camera' | 'scripts' | 'chapters'>('prompter');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Web Camera & Video Recording State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraAspectRatio, setCameraAspectRatio] = useState<'original' | '1:1' | '16:9' | '9:16'>('original');
  const [previewMode, setPreviewMode] = useState<'overlay' | 'background'>('overlay');
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [safeAreaPreset, setSafeAreaPreset] = useState<'tiktok' | 'reels' | 'shorts' | 'custom'>('tiktok');

  // Speech Recognition & Smart Speed State
  const [smartSpeedMode, setSmartSpeedMode] = useState<'voice-sync' | 'vad'>('voice-sync');
  const [smartSpeedOn, setSmartSpeedOn] = useState(false);
  const [smartSpeedThreshold, setSmartSpeedThreshold] = useState(15); // 0-100 threshold scale
  const [audioInputLevel, setAudioInputLevel] = useState(0); // 0-100 live VU meter
  const [smartSpeedStatus, setSmartSpeedStatus] = useState<'idle' | 'listening' | 'talking' | 'silence-paused'>('idle');
  const [lastHeardWord, setLastHeardWord] = useState<string>('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 100%

  // Parse Chapters and Stage Cues for 1-Click Jump
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

  // Computed Script Telemetry
  const wordTokens = useMemo(() => script.trim().split(/\s+/).filter(Boolean), [script]);
  const wordCount = wordTokens.length;
  const estimatedWpm = Math.max(60, Math.round(speed * 60));
  const estimatedTotalDurationSec = wordCount > 0 ? Math.round((wordCount / estimatedWpm) * 60) : 0;

  // Refs
  const readerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);
  const loopRef = useRef(loop);
  const currentVelocityRef = useRef<number>(0);
  const targetVelocityRef = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Audio Context Refs for Smart Speed VAD
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);

  isPlayingRef.current = isPlaying;
  loopRef.current = loop;

  // Format MM:SS helper
  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Reset Prompter Scroll
  const handleResetScroll = useCallback(() => {
    setIsPlaying(false);
    currentVelocityRef.current = 0;
    targetVelocityRef.current = 0;
    scrollPosRef.current = 0;
    setActiveWordIndex(-1);
    setLastHeardWord('');
    setScrollProgress(0);
    if (readerRef.current) readerRef.current.scrollTop = 0;
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, []);

  // Jump to specific chapter/cue
  const handleJumpToChapter = (cueTitle: string) => {
    const el = isPlaying ? readerRef.current : textareaRef.current;
    if (!el) return;
    const cueSpans = el.querySelectorAll('[data-cue="1"]');
    for (let i = 0; i < cueSpans.length; i++) {
      if (cueSpans[i].textContent?.includes(cueTitle)) {
        const target = cueSpans[i] as HTMLElement;
        const targetY = target.offsetTop - el.clientHeight * (eyelinePercent / 100);
        el.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        scrollPosRef.current = el.scrollTop;
        break;
      }
    }
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // 3-2-1 Countdown Trigger
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
    }, 900);
  };

  // Enumerate all cameras on load
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        const videoDevs = devs.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevs);
        if (videoDevs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevs[0].deviceId);
        }
      }).catch(() => {});
    }
  }, [selectedCameraId]);

  // Retain exact scroll position on play/pause transition
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

  // Main Smooth Inertia Scrolling Animation Engine
  useEffect(() => {
    let active = true;

    const tick = (time: number) => {
      if (!active) return;
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const el = isPlayingRef.current ? readerRef.current : textareaRef.current;
      if (el) {
        const baseSpeed = (speed * fontSize * delta) / 3800;
        targetVelocityRef.current = isPlayingRef.current ? baseSpeed : 0;
        currentVelocityRef.current += (targetVelocityRef.current - currentVelocityRef.current) * 0.14;

        if (currentVelocityRef.current > 0.01) {
          const maxScroll = el.scrollHeight - el.clientHeight;

          if (el.scrollTop + currentVelocityRef.current >= maxScroll) {
            if (loopRef.current) {
              el.scrollTop = 0;
              scrollPosRef.current = 0;
            } else {
              setIsPlaying(false);
            }
          } else {
            el.scrollTop += currentVelocityRef.current;
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

  // Attach Camera Stream to Video Element
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream && cameraActive) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [cameraStream, cameraActive, previewMode]);

  // 1. AI Speech Recognition Engine (Tracks exact spoken words and scrolls to them)
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition not supported in this browser, falling back to VAD');
      setSmartSpeedMode('vad');
      return;
    }

    try {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setSmartSpeedStatus('listening');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }

        const spokenWords = interimTranscript
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim()
          .split(/\s+/);

        const latestWord = spokenWords[spokenWords.length - 1];
        if (latestWord && latestWord.length > 2) {
          setLastHeardWord(latestWord);
          setSmartSpeedStatus('talking');

          const cleanTokens = wordTokens.map((w) => w.toLowerCase().replace(/[^\w\s]/g, ''));
          const foundIndex = cleanTokens.findIndex(
            (token, idx) => idx >= activeWordIndex - 2 && token.startsWith(latestWord.slice(0, 3))
          );

          if (foundIndex !== -1) {
            setActiveWordIndex(foundIndex);

            if (readerRef.current) {
              const wordSpans = readerRef.current.querySelectorAll('[data-word="1"]');
              if (wordSpans && wordSpans[foundIndex]) {
                const targetSpan = wordSpans[foundIndex] as HTMLElement;
                const targetY = targetSpan.offsetTop - readerRef.current.clientHeight * (eyelinePercent / 100);
                readerRef.current.scrollTo({
                  top: Math.max(0, targetY),
                  behavior: 'smooth',
                });
                scrollPosRef.current = readerRef.current.scrollTop;
              }
            }
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('SpeechRecognition error:', err);
      };

      recognition.onend = () => {
        if (smartSpeedOn && smartSpeedMode === 'voice-sync') {
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
  }, [activeWordIndex, eyelinePercent, smartSpeedMode, smartSpeedOn, wordTokens]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
    }
  }, []);

  // 2. Audio VAD Engine
  const startMicAnalysis = useCallback(async () => {
    try {
      if (!micStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamRef.current = stream;
      }

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(micStreamRef.current);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1850;
      bandpass.Q.value = 0.8;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.35;

      source.connect(bandpass);
      bandpass.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceCount = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 110) * 100));
        setAudioInputLevel(normalized);

        if (smartSpeedOn && smartSpeedMode === 'vad') {
          if (normalized >= smartSpeedThreshold) {
            silenceCount = 0;
            setSmartSpeedStatus('talking');
            setIsPlaying(true);
          } else {
            silenceCount++;
            if (silenceCount > 18 && isPlayingRef.current) {
              setSmartSpeedStatus('silence-paused');
              setIsPlaying(false);
            }
          }
        }

        audioAnimFrameRef.current = requestAnimationFrame(checkVolume);
      };

      audioAnimFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn('Microphone stream access error:', err);
    }
  }, [smartSpeedMode, smartSpeedOn, smartSpeedThreshold]);

  const stopMicAnalysis = useCallback(() => {
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
    setAudioInputLevel(0);
    setSmartSpeedStatus('idle');
  }, []);

  // Room Noise Auto-Calibration
  const calibrateNoiseFloor = async () => {
    setIsCalibrating(true);
    const samples: number[] = [];
    const interval = setInterval(() => {
      samples.push(audioInputLevel);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setIsCalibrating(false);
      if (samples.length > 0) {
        const avgNoise = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
        const calibrated = Math.min(75, Math.max(8, avgNoise + 8));
        setSmartSpeedThreshold(calibrated);
      }
    }, 1200);
  };

  // Smart Speed Lifecycle Manager
  useEffect(() => {
    if (smartSpeedOn) {
      startMicAnalysis();
      if (smartSpeedMode === 'voice-sync') {
        startSpeechRecognition();
      } else {
        stopSpeechRecognition();
      }
    } else {
      stopSpeechRecognition();
      if (!cameraActive) stopMicAnalysis();
    }
    return () => {
      stopSpeechRecognition();
      if (!smartSpeedOn && !cameraActive) stopMicAnalysis();
    };
  }, [smartSpeedOn, smartSpeedMode, cameraActive, startMicAnalysis, stopMicAnalysis, startSpeechRecognition, stopSpeechRecognition]);

  // Global Keyboard Shortcuts Takeover
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
          setSmartSpeedOn((prev) => !prev);
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

  // Web Camera Lifecycle
  const startCamera = async (deviceId?: string) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const targetId = deviceId || selectedCameraId;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: targetId ? { deviceId: { exact: targetId } } : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (targetId) setSelectedCameraId(targetId);

      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevs);
    } catch (err) {
      console.warn('Camera initiation failed:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setCameraStream(null);
    setCameraActive(false);
    setIsRecording(false);
  };

  // Video Recording Controls
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

  // Click-to-Scrub on Eyeline
  const handleScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clickedY = el.scrollTop + (e.clientY - rect.top);
    const target = clickedY - el.clientHeight * (eyelinePercent / 100);
    el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, target));
    scrollPosRef.current = el.scrollTop;
  };

  // Calculate Reading Container Width
  const containerMaxWidth =
    readingWidthPreset === 'portrait'
      ? '380px'
      : readingWidthPreset === 'standard'
      ? '560px'
      : readingWidthPreset === 'cinema'
      ? '780px'
      : readingWidthPreset === 'full'
      ? '100%'
      : `${readingWidthPercent}%`;

  const mirrorTransform = `${mirrorHorizontal ? 'scaleX(-1)' : ''} ${mirrorVertical ? 'scaleY(-1)' : ''}`.trim() || 'none';

  // Filter Google Fonts
  const filteredFonts =
    selectedFontCategory === 'All'
      ? GOOGLE_FONTS_LIST
      : GOOGLE_FONTS_LIST.filter((f) => f.category === selectedFontCategory);

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
          padding: '0 16px',
          zIndex: 50,
          flexShrink: 0,
          color: '#000000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            }}
          >
            PRO STUDIO TELEPROMPTER
          </span>

          {/* Quick Chapter Pill Navigator */}
          {chapters.length > 0 && (
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', maxWidth: 380 }} className="no-scrollbar">
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

        {/* Center Live Pacing & Script Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#666' }}>SPEED:</span>
            <span style={{ color: '#d97706', background: '#fef3c7', padding: '1px 6px', border: '1.5px solid #000', borderRadius: 4 }}>
              {speed.toFixed(1)}x ({estimatedWpm} WPM)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#666' }}>EST. TIME:</span>
            <span style={{ color: '#000', background: '#f4f4f5', padding: '1px 6px', border: '1.5px solid #000', borderRadius: 4 }}>
              {formatTime(estimatedTotalDurationSec)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#666' }}>PROGRESS:</span>
            <span>{scrollProgress}%</span>
          </div>

          {/* Recording Timer Indicator */}
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fee2e2', border: '1.5px solid #ef4444', padding: '2px 8px', borderRadius: 4, color: '#b91c1c' }}>
              <Radio size={14} className="animate-pulse" />
              <span>REC {formatTime(recordingSeconds)}</span>
            </div>
          )}

          {/* Smart Speed Mic Status Indicator */}
          {smartSpeedOn && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                border: '1.5px solid #000',
                borderRadius: 4,
                background: smartSpeedStatus === 'talking' ? '#dcfce7' : '#fee2e2',
                color: smartSpeedStatus === 'talking' ? '#15803d' : '#b91c1c',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: smartSpeedStatus === 'talking' ? '#22c55e' : '#ef4444',
                }}
              />
              <span style={{ fontSize: '0.66rem' }}>
                {smartSpeedStatus === 'talking' ? 'VOICE (SCROLLING)' : 'SILENCE (PAUSED)'}
              </span>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            {showSettings ? 'Hide Panel' : 'Settings'}
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
            background: cameraActive && previewMode === 'background' ? 'transparent' : '#000000',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* Background Fullscreen Video Feed (If in background mode) */}
          {cameraActive && previewMode === 'background' && (
            <>
              <video
                ref={videoPreviewRef}
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
              {/* Dimming Layer on Top of Camera */}
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

          {/* 3-2-1 Countdown Overlay */}
          {countdown !== null && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
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
                  animation: 'pulse 0.8s infinite',
                }}
              >
                {countdown}
              </div>
            </div>
          )}

          {/* Eyeline Horizon Marker */}
          {(!cameraActive || previewMode === 'overlay') && (
            <div
              style={{
                position: 'absolute',
                top: `${eyelinePercent}%`,
                left: 0,
                right: 0,
                height: readingHighlightStyle === 'marker' ? 32 : readingHighlightStyle === 'box' ? 44 : 2,
                transform: readingHighlightStyle === 'marker' || readingHighlightStyle === 'box' ? 'translateY(-50%)' : 'none',
                background:
                  readingHighlightStyle === 'marker'
                    ? 'rgba(255, 229, 0, 0.25)'
                    : readingHighlightStyle === 'box'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : readingHighlightStyle === 'underline'
                    ? 'rgba(0, 240, 255, 0.85)'
                    : readingHighlightStyle === 'neon'
                    ? 'rgba(255, 42, 133, 0.85)'
                    : 'rgba(239, 68, 68, 0.75)',
                borderTop: readingHighlightStyle === 'box' ? '1.5px solid rgba(255,255,255,0.4)' : undefined,
                borderBottom:
                  readingHighlightStyle === 'marker'
                    ? '2.5px solid rgba(255, 229, 0, 0.85)'
                    : readingHighlightStyle === 'box'
                    ? '1.5px solid rgba(255,255,255,0.4)'
                    : undefined,
                zIndex: 15,
                boxShadow:
                  readingHighlightStyle === 'neon'
                    ? '0 0 20px rgba(255, 42, 133, 0.6)'
                    : readingHighlightStyle === 'underline'
                    ? '0 0 16px rgba(0, 240, 255, 0.5)'
                    : '0 0 16px rgba(239, 68, 68, 0.5)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Circular Optical Lens Spotlight */}
          {circularFocusLens && (!cameraActive || previewMode === 'overlay') && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 14,
                background: `radial-gradient(ellipse 70% 32% at 50% ${eyelinePercent}%, rgba(0,0,0,0) 0%, rgba(0,0,0,${focusIntensity * 0.72}) 72%, rgba(0,0,0,${Math.min(0.96, focusIntensity * 0.95)}) 100%)`,
              }}
            />
          )}

          {/* Reading Column Mask / Dimming Bounds */}
          <div
            style={{
              width: '100%',
              maxWidth: containerMaxWidth,
              height: '100%',
              position: 'relative',
              zIndex: 6,
              transform: mirrorTransform,
              borderLeft: readingWidthPreset !== 'full' ? '1px dashed rgba(255,255,255,0.15)' : 'none',
              borderRight: readingWidthPreset !== 'full' ? '1px dashed rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {/* Text Area Reader (Active Playing Mode) vs Text Area Editor (Pause Mode) */}
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
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  letterSpacing: '-0.01em',
                  padding: `calc(${eyelinePercent}vh - 40px) 24px 60vh`,
                  whiteSpace: 'pre-wrap',
                  cursor: 'pointer',
                  textShadow: cameraActive && previewMode === 'background' ? '0 2px 14px rgba(0,0,0,0.95)' : 'none',
                }}
              >
                {renderReaderTokens(script, activeWordIndex)}
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
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  letterSpacing: '-0.01em',
                  padding: `calc(${eyelinePercent}vh - 40px) 24px 60vh`,
                  caretColor: '#FFE500',
                  cursor: 'text',
                  overflowY: 'auto',
                  position: 'relative',
                  textShadow: cameraActive && previewMode === 'background' ? '0 2px 14px rgba(0,0,0,0.95)' : 'none',
                }}
              />
            )}
          </div>

          {/* Floating PiP Camera Feed (overlay mode) */}
          {cameraActive && previewMode === 'overlay' && (
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 240,
                aspectRatio: cameraAspectRatio === '1:1' ? '1/1' : cameraAspectRatio === '16:9' ? '16/9' : cameraAspectRatio === '9:16' ? '9/16' : '4/3',
                border: '3px solid #ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 30,
                borderRadius: 4,
                overflow: 'hidden',
                background: '#000',
                transform: mirrorTransform,
              }}
            >
              <video ref={videoPreviewRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {showSafeAreas && <SafeAreaGuide insets={SAFE_AREA_PRESETS[safeAreaPreset]} mirrored={false} />}
            </div>
          )}

          {/* ── Floating Transport Controls Floater Bar ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              zIndex: 35,
              background: '#ffffff',
              padding: '10px 20px',
              border: '3px solid #000000',
              borderRadius: 4,
              boxShadow: '6px 6px 0 #000000',
              color: '#000000',
            }}
          >
            <button
              onClick={handleResetScroll}
              className="brutalist-button"
              style={{ padding: '8px 10px', fontSize: '0.74rem', borderRadius: 4 }}
              title="Reset Scroll to Beginning (R / Home)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={triggerPlaybackWithCountdown}
              className={`brutalist-button ${isPlaying ? 'brutalist-button-primary' : ''}`}
              style={{
                padding: '10px 24px',
                fontSize: '0.82rem',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              title="Play / Pause (SPACE)"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>

            <button
              onClick={() => setLoop((v) => !v)}
              className="brutalist-button"
              style={{
                padding: '8px 10px',
                fontSize: '0.74rem',
                borderRadius: 4,
                background: loop ? '#000' : '#fff',
                color: loop ? '#fff' : '#000',
              }}
              title="Loop script playback"
            >
              <Sparkles size={16} />
            </button>

            <button
              onClick={() => setMirrorHorizontal((m) => !m)}
              className="brutalist-button"
              style={{
                padding: '8px 10px',
                fontSize: '0.74rem',
                borderRadius: 4,
                background: mirrorHorizontal ? '#000' : '#fff',
                color: mirrorHorizontal ? '#fff' : '#000',
              }}
              title="Mirror / Horizontal Flip for Teleprompter Glass (M)"
            >
              <ArrowLeftRight size={16} />
            </button>

            <div style={{ width: 1, height: 24, background: '#ddd' }} />

            <button
              onClick={handleToggleFullscreen}
              className="brutalist-button"
              style={{ padding: '8px 10px', fontSize: '0.74rem', borderRadius: 4 }}
              title="Fullscreen Mode (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* ── Right Settings & Script Assistant Drawer ── */}
        {showSettings && (
          <aside
            className="no-scrollbar"
            style={{
              width: 380,
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '2px solid #000', background: '#f4f4f5' }}>
              {[
                { id: 'prompter', label: 'Speed', icon: SlidersHorizontal },
                { id: 'format', label: 'Format', icon: Smartphone },
                { id: 'audio', label: 'Audio', icon: Mic },
                { id: 'camera', label: 'Camera', icon: Camera },
                { id: 'chapters', label: 'Cues', icon: Bookmark },
                { id: 'scripts', label: 'Templates', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSidebarTab(tab.id as any)}
                  style={{
                    padding: '10px 1px',
                    border: 'none',
                    borderRight: '1px solid #000',
                    background: activeSidebarTab === tab.id ? '#000' : '#f4f4f5',
                    color: activeSidebarTab === tab.id ? '#fff' : '#000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.58rem',
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
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* TAB 1: PROMPTER SPEED & FONTS */}
              {activeSidebarTab === 'prompter' && (
                <>
                  {/* Speed & Font Size Sliders */}
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>SCROLL SPEED:</span>
                        <span style={{ color: '#d97706' }}>{speed.toFixed(1)}x ({estimatedWpm} WPM)</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>

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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>LINE SPACING:</span>
                        <span>{lineHeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="1.2"
                        max="2.5"
                        step="0.1"
                        value={lineHeight}
                        onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>
                  </div>

                  {/* 52 Google Fonts Typography Suite */}
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Type size={14} />
                        Typography (52 Google Fonts)
                      </label>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, background: '#FFE500', padding: '2px 6px', border: '1px solid #000', borderRadius: 4 }}>
                        {GOOGLE_FONTS_LIST.find((f) => f.fontFamily === fontFamily)?.name || 'Custom'}
                      </span>
                    </div>

                    {/* Category Filter */}
                    <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: 4, background: '#fff', overflow: 'hidden' }}>
                      {['All', 'Serif', 'Typewriter', 'Tabloid', 'Sans', 'Display'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFontCategory(cat)}
                          style={{
                            flex: 1,
                            padding: '4px 2px',
                            border: 'none',
                            borderRight: cat !== 'Display' ? '1px solid #000' : 'none',
                            background: selectedFontCategory === cat ? '#000' : '#fff',
                            color: selectedFontCategory === cat ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.56rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

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

                    {/* Text Color Swatches */}
                    <div>
                      <label style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Text Color
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

              {/* TAB 2: FORMAT & READING COLUMN GEOMETRY */}
              {activeSidebarTab === 'format' && (
                <>
                  {/* Reading Width Presets */}
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                      Reading Column Width
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {PROMPTER_WIDTH_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setReadingWidthPreset(p.id as any)}
                          style={{
                            padding: '8px 6px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: readingWidthPreset === p.id ? '#000' : '#fff',
                            color: readingWidthPreset === p.id ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Width Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>CUSTOM COLUMN WIDTH:</span>
                        <span>{readingWidthPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="100"
                        step="5"
                        value={readingWidthPercent}
                        onChange={(e) => {
                          setReadingWidthPercent(parseInt(e.target.value));
                          setReadingWidthPreset('custom');
                        }}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>
                  </div>

                  {/* Eyeline Height Slider & Mirror Controls */}
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                        <span>EYELINE HEIGHT POSITION:</span>
                        <span style={{ color: '#d97706' }}>{eyelinePercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="65"
                        step="1"
                        value={eyelinePercent}
                        onChange={(e) => setEyelinePercent(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                      <p style={{ fontSize: '0.6rem', color: '#666', margin: '4px 0 0', lineHeight: 1.3 }}>
                        Move the eyeline target up or down to align with wherever your physical webcam or phone lens is mounted!
                      </p>
                    </div>

                    {/* Dual Mirror Toggles */}
                    <div style={{ paddingTop: 8, borderTop: '1.5px solid #eee' }}>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 6 }}>
                        Hardware Glass Mirroring
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button
                          onClick={() => setMirrorHorizontal(!mirrorHorizontal)}
                          style={{
                            padding: '8px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: mirrorHorizontal ? '#000' : '#fff',
                            color: mirrorHorizontal ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                          }}
                        >
                          ↔️ Horizontal Flip
                        </button>

                        <button
                          onClick={() => setMirrorVertical(!mirrorVertical)}
                          style={{
                            padding: '8px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: mirrorVertical ? '#000' : '#fff',
                            color: mirrorVertical ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                          }}
                        >
                          ↕️ Vertical Invert
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Circular Optical Lens Spotlight */}
                  <div className="brutalist-card" style={{ padding: 12, background: circularFocusLens ? '#fef08a' : '#f4f4f5', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={circularFocusLens}
                          onChange={(e) => setCircularFocusLens(e.target.checked)}
                          style={{ width: 14, height: 14, accentColor: '#000' }}
                        />
                        <Disc size={13} />
                        Circular Eyeline Spotlight
                      </label>
                      <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900 }}>
                        {circularFocusLens ? `${Math.round(focusIntensity * 100)}%` : 'OFF'}
                      </span>
                    </div>

                    {circularFocusLens && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700 }}>SOFT</span>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={focusIntensity}
                          onChange={(e) => setFocusIntensity(parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: '#000' }}
                        />
                        <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700 }}>STRONG</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 3: AUDIO & SMART SPEED */}
              {activeSidebarTab === 'audio' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: smartSpeedOn ? '#fef08a' : '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mic size={14} />
                        Smart Speed Voice Engine
                      </label>
                      <button
                        onClick={() => setSmartSpeedOn(!smartSpeedOn)}
                        style={{
                          padding: '4px 10px',
                          border: '2px solid #000',
                          borderRadius: 4,
                          background: smartSpeedOn ? '#000' : '#fff',
                          color: smartSpeedOn ? '#fff' : '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                        }}
                      >
                        {smartSpeedOn ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}
                      </button>
                    </div>

                    {/* Engine Mode Switcher */}
                    <div>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Tracking Mode
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button
                          onClick={() => setSmartSpeedMode('voice-sync')}
                          style={{
                            padding: '6px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: smartSpeedMode === 'voice-sync' ? '#000' : '#fff',
                            color: smartSpeedMode === 'voice-sync' ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textAlign: 'center',
                          }}
                        >
                          🧠 Speech-to-Word
                        </button>
                        <button
                          onClick={() => setSmartSpeedMode('vad')}
                          style={{
                            padding: '6px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: smartSpeedMode === 'vad' ? '#000' : '#fff',
                            color: smartSpeedMode === 'vad' ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textAlign: 'center',
                          }}
                        >
                          🎚️ Voice Energy VAD
                        </button>
                      </div>
                      <p style={{ fontSize: '0.6rem', color: '#555', margin: '4px 0 0', lineHeight: 1.3 }}>
                        {smartSpeedMode === 'voice-sync'
                          ? '✨ Listens to the exact words you say and automatically jumps the matching line to the eyeline!'
                          : '⚡ Tracks voice volume with a human frequency bandpass filter and scrolls smoothly with inertia.'}
                      </p>
                    </div>

                    {/* Live Word Feedback in Voice-Sync Mode */}
                    {smartSpeedMode === 'voice-sync' && smartSpeedOn && (
                      <div style={{ padding: '6px 8px', background: '#fff', border: '1.5px solid #000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>HEARD WORD:</span>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, background: '#FFE500', padding: '1px 6px', border: '1px solid #000', borderRadius: 3 }}>
                          {lastHeardWord ? `"${lastHeardWord}"` : 'Listening...'}
                        </span>
                      </div>
                    )}

                    {/* Live Audio Decibel VU Meter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900 }}>
                        <span>VOICE ENERGY METER:</span>
                        <span>{audioInputLevel}%</span>
                      </div>
                      <div style={{ height: 16, background: '#eee', border: '1.5px solid #000', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${audioInputLevel}%`,
                            background: audioInputLevel >= smartSpeedThreshold ? '#22c55e' : '#f59e0b',
                            transition: 'width 0.08s ease',
                          }}
                        />
                        {/* Threshold Marker */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${smartSpeedThreshold}%`,
                            width: 2,
                            background: '#ef4444',
                            zIndex: 2,
                          }}
                        />
                      </div>
                    </div>

                    {/* Auto-Calibrate Noise Floor Button & Threshold Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900 }}>
                          NOISE GATE THRESHOLD: {smartSpeedThreshold}%
                        </span>
                        <button
                          onClick={calibrateNoiseFloor}
                          disabled={isCalibrating}
                          style={{
                            padding: '2px 6px',
                            border: '1px solid #000',
                            borderRadius: 3,
                            background: isCalibrating ? '#ef4444' : '#fff',
                            color: isCalibrating ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {isCalibrating ? 'Calibrating Room...' : '⚡ Auto-Calibrate'}
                        </button>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={smartSpeedThreshold}
                        onChange={(e) => setSmartSpeedThreshold(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#000' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 4: CAMERA & RECORDING */}
              {activeSidebarTab === 'camera' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={14} />
                        Webcam & Video Studio
                      </label>
                      <button
                        onClick={cameraActive ? stopCamera : () => startCamera()}
                        className={`brutalist-button ${cameraActive ? 'brutalist-button-primary' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '0.68rem', borderRadius: 4 }}
                      >
                        {cameraActive ? 'Turn Off' : 'Turn On Camera'}
                      </button>
                    </div>

                    {/* Camera Device Selector Dropdown */}
                    <div>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                        Choose Camera Device ({cameras.length} Detected)
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

                    {/* Layout Mode (PiP vs Background) */}
                    <div>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                        Camera Display Layout
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <button
                          onClick={() => setPreviewMode('overlay')}
                          style={{
                            padding: '6px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: previewMode === 'overlay' ? '#000' : '#fff',
                            color: previewMode === 'overlay' ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                          }}
                        >
                          Floating PiP
                        </button>
                        <button
                          onClick={() => setPreviewMode('background')}
                          style={{
                            padding: '6px',
                            border: '1.5px solid #000',
                            borderRadius: 4,
                            background: previewMode === 'background' ? '#000' : '#fff',
                            color: previewMode === 'background' ? '#fff' : '#000',
                            fontFamily: 'monospace',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                          }}
                        >
                          Full Background
                        </button>
                      </div>
                    </div>

                    {/* Background Darkness Opacity Slider */}
                    {previewMode === 'background' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                          <span>BACKGROUND VIDEO DIMNESS:</span>
                          <span>{Math.round(bgDimOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.95"
                          step="0.05"
                          value={bgDimOpacity}
                          onChange={(e) => setBgDimOpacity(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#000' }}
                        />
                      </div>
                    )}

                    {/* Video Recording Panel */}
                    {cameraActive && (
                      <div style={{ paddingTop: 8, borderTop: '1.5px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, display: 'block' }}>
                          Video Take Recording
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

              {/* TAB 5: CHAPTERS & STAGE CUES JUMP LIST */}
              {activeSidebarTab === 'chapters' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bookmark size={14} />
                      Script Chapters & Stage Cues ({chapters.length})
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
                        Add bracketed cues like <code style={{ background: '#eee', padding: '1px 4px' }}>[HOOK]</code>, <code style={{ background: '#eee', padding: '1px 4px' }}>[STEP 1]</code>, <code style={{ background: '#eee', padding: '1px 4px' }}>[CTA]</code> into your script to generate 1-click jump markers.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* TAB 6: SCRIPT TEMPLATES */}
              {activeSidebarTab === 'scripts' && (
                <>
                  <div className="brutalist-card" style={{ padding: 12, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase' }}>
                      Creator Video Templates
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

                    <div style={{ paddingTop: 8, borderTop: '1.5px solid #eee' }}>
                      <label style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 4 }}>
                        Stage Cue Shortcuts (Click to Insert)
                      </label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['[HOOK]', '[PAUSE]', '[SMILE]', '[POINT 1]', '[POINT 2]', '[CTA]', '[LOOK AT LENS]'].map((cue) => (
                          <button
                            key={cue}
                            onClick={() => setScript((prev) => `${prev}\n\n${cue}\n`)}
                            style={{
                              padding: '3px 6px',
                              border: '1px solid #000',
                              borderRadius: 4,
                              background: '#FFE500',
                              color: '#000',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '0.62rem',
                              cursor: 'pointer',
                            }}
                          >
                            + {cue}
                          </button>
                        ))}
                      </div>
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
                { key: '↑ / ↓ or PageUp/Down', desc: 'Scroll Up / Down' },
                { key: '[ / ]', desc: 'Decrease / Increase Speed' },
                { key: '- / +', desc: 'Smaller / Larger Font Size' },
                { key: 'R / Home', desc: 'Reset Scroll to Top' },
                { key: 'M', desc: 'Horizontal Mirror (Glass)' },
                { key: 'V', desc: 'Vertical Invert (Overhead)' },
                { key: 'F', desc: 'Toggle Fullscreen' },
                { key: 'S', desc: 'Toggle Voice Smart Speed' },
                { key: 'H', desc: 'Toggle Settings Drawer' },
                { key: 'SHIFT + ?', desc: 'Show this Cheat Sheet' },
                { key: 'ESC', desc: 'Exit Fullscreen / Close Modal' },
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
