'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { putHandoffText, takeHandoffText } from '@/lib/tool-handoff';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeftRight,
  ArrowUpDown,
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
  Sparkles,
  Wand2,
  MonitorSmartphone,
  Video,
  VideoOff,
  RefreshCw,
} from 'lucide-react';
import { compressToEncodedURIComponent as lzCompress } from 'lz-string';
import { useRouter } from 'next/navigation';
import StudioToolsDropdown from '@/components/nav/SiteNav';
import { TactileScrubber } from '@/components/tactile-scrubber';
import { GOOGLE_FONTS_LIST } from '../match-cut/google-fonts';
import {
  embedMetadataIntoMediaBlob,
  saveHandoffSession,
  clearHandoffSession,
} from '@/lib/captions/project-metadata';
import {
  cleanWordForMatch,
  createVoiceMatchEngine,
  type TranscriptHypothesis,
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
Introducing CreatorsKit — the all-in-one browser suite for modern storytellers. With zero subscriptions and instant client-side processing, you can edit, sync, and deliver faster than ever.

[CTA]
Get started today for free at CreatorsKit.win!`,
  },
];

/**
 * Copy-paste prompt for generating teleprompter-ready scripts with any AI
 * (ChatGPT / Claude / Gemini). It bakes in the exact bracket-cue grammar
 * the teleprompter parses ([HOOK], [PAUSE 2s], [POINT 1], [CTA], ...) so
 * AI-generated scripts work with voice-sync, chapters and cue markers
 * on the first try.
 */
const AI_SCRIPT_PROMPT = `Generate a teleprompter script for a ~60 second video about: [YOUR TOPIC HERE].

Format constraints (my teleprompter app parses these exactly):
1. Write it the way it is SPOKEN: short conversational sentences, contractions, plain words.
2. Every delivery cue goes on its OWN line in square brackets. Use ONLY these cues:
   [HOOK] - the attention-grabbing opener (place it right before your first sentence)
   [PAUSE 1s] / [PAUSE 2s] / [PAUSE 3s] - freeze the scroll for that long (use for emphasis)
   [SMILE] - smile at the camera
   [LOOK AT LENS] - hold eye contact with the lens
   [POINT 1], [POINT 2], [POINT 3] - start each key point with its numbered cue
   [CTA] - the call-to-action closer
3. One idea per line, maximum ~12 words per line (easy to read while scrolling).
4. Around 140-160 spoken words total (about 60 seconds at natural pace).
5. Plain text only: no markdown, no headings, no emojis - just lines and the bracket cues above.
6. The cue lines are stage directions - they are never read aloud.`;

/**
 * Brutalist custom player for the recorded voice take — replaces the
 * inconsistent native <audio controls> element with design-matched
 * play/pause, scrubbable progress bar and monospace time readout.
 */
function RecordedAudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const fmt = (t: number) => {
    if (!isFinite(t) || t < 0) t = 0;
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setProgress(ratio);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
          setCurrent(a.currentTime);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />
      <button
        onClick={toggle}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '2px solid #000',
          background: playing ? '#FFE500' : '#000',
          color: playing ? '#000' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title={playing ? 'Pause take' : 'Play take'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div
        onClick={seek}
        style={{ flex: 1, height: 14, background: '#fff', border: '1.5px solid #000', borderRadius: 99, cursor: 'pointer', overflow: 'hidden' }}
        title="Seek"
      >
        <div style={{ width: `${progress * 100}%`, height: '100%', background: '#d97706' }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.62rem', color: '#92400e', whiteSpace: 'nowrap' }}>
        {fmt(current)} / {fmt(duration)}
      </span>
    </div>
  );
}

export default function TeleprompterPage() {
  const router = useRouter();

  // Core Prompter State
  const [script, setScript] = useState(
    `[HOOK - LOOK DIRECTLY AT THE LENS]
Welcome to CreatorsKit Pro Teleprompter!

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
  const [fontSize, setFontSize] = useState(32);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textPaddingHorizontal, setTextPaddingHorizontal] = useState(20);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState<string>('"Inter", sans-serif');
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>('All');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // Text Column Width Customization (Default: 880px / 55ch Spacious Studio Desktop)
  const [widthUnit, setWidthUnit] = useState<'ch' | '%' | 'px'>('px');
  const [columnCharWidth, setColumnCharWidth] = useState<number>(55); // 15 to 80 chars
  const [columnPercentWidth, setColumnPercentWidth] = useState<number>(70); // 20% to 100%
  const [columnPixelWidth, setColumnPixelWidth] = useState<number>(880); // 260 to 1200 px
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

  const hasInitializedDefaultsRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
      setIsMobile(mobile);
      if (mobile) {
        setCameraLayout('full-bg');
        setShowSettings(false);
        setFontSize((f) => Math.max(32, Math.min(f, 56)));
        // Only default the eyeline OFF on first mobile init — after that the
        // user's EYELINE yes/no choice (and their saved setting) wins.
        if (!hasInitializedDefaultsRef.current) setShowEyelineGuide(false);
        setCircularFocusLens(false);
        setBgDimOpacity(0.45);
      }
      hasInitializedDefaultsRef.current = true;
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
  // Front/back lens for FILM MODE flip (owner ruling 2026-10-04).
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  // FILM MODE (owner ruling 2026-10-04): with the camera live, REC captures
  // video + mic (SOLO take); camera off keeps the classic voice-only take.
  const [takeIsVideo, setTakeIsVideo] = useState(false);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  // CREW MODE: payload-encoded link that opens this script + speed on a second
  // screen (laptop / friend's phone) while the phone films on the native
  // camera app — the only way to script + film simultaneously on iPhone.
  const mirrorLink = () =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://creatorskit.win'}/teleprompter/mirror?d=${lzCompress(
      JSON.stringify({ s: script, v: speed, f: fontSize, e: eyelinePercent / 100 }),
    )}`;

  // 1. Web Speech AI Auto-Scroll State
  const [speechFollowEnabled, setSpeechFollowEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'speaking' | 'paused' | 'blocked' | 'unsupported'>('idle');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [lastHeardWord, setLastHeardWord] = useState<string>('');
  const [speechDamping, setSpeechDamping] = useState<number>(0.07);
  const [autoPauseThresholdMs, setAutoPauseThresholdMs] = useState(2000);

  // 2. Live Web Audio VU Meter & Real-time Decibel Monitor State
  const [audioMeterActive, setAudioMeterActive] = useState(false);
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
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);

  // Adaptive Velocity & Cadence Learner Refs
  const learnedWpmRef = useRef<number>(135); // Default natural speaking pace (135 WPM)
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
  // Word-clock target: confirmed matches only move this; the virtual
  // timeline chases it continuously (see the animation loop) so the
  // highlight advances one word at a time instead of teleporting.
  const targetWordFloatRef = useRef<number>(0);
  const lastDisplayedWordRef = useRef<number>(-1);
  // Manual reading pace: the user seeds the AI learner with their own WPM so
  // it does not have to learn from scratch; the tracker keeps refining from it.
  const [manualWpm, setManualWpm] = useState<number>(135);
  const [learnedWpmDisplay, setLearnedWpmDisplay] = useState<number>(135);
  // Mic-gated pause detection: the live audio meter stamps the last moment
  // the room was actually loud. When it has been quiet for ~700ms the user
  // has genuinely paused, so the teleprompter glide freezes in place.
  const audioMeterActiveRef = useRef<boolean>(false);
  const noiseFloorDbRef = useRef<number>(-45);
  const lastLoudMicTimestampRef = useRef<number>(0);

  isPlayingRef.current = isPlaying;
  loopRef.current = loop;
  speechFollowRef.current = speechFollowEnabled;
  activeWordIndexRef.current = activeWordIndex;
  speechDampingRef.current = speechDamping;
  audioMeterActiveRef.current = audioMeterActive;
  noiseFloorDbRef.current = noiseFloorDb;

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    // 1. Load persisted script
    try {
      const savedScript = localStorage.getItem('creatorKit_teleprompter_script');
      if (savedScript && savedScript.trim().length > 0) {
        setScript(savedScript);
      }
      // §4: a pending hand-off (e.g. the sync-slate take rundown) wins over
      // the restored script — it is the user's most recent intent.
      takeHandoffText('teleprompter').then((incoming) => {
        if (incoming && incoming.trim().length > 0) setScript(incoming);
      });
      const savedSpeed = localStorage.getItem('creatorKit_teleprompter_speed');
      if (savedSpeed) setSpeed(parseFloat(savedSpeed) || 2.2);

      const savedFontSize = localStorage.getItem('creatorKit_teleprompter_fontSize');
      if (savedFontSize) {
        const parsed = parseInt(savedFontSize, 10);
        setFontSize(parsed === 42 ? 32 : (parsed || 32));
      } else {
        setFontSize(32);
      }

      const savedLineHeight = localStorage.getItem('creatorKit_teleprompter_lineHeight');
      if (savedLineHeight) setLineHeight(parseFloat(savedLineHeight) || 1.6);

      const savedLetterSpacing = localStorage.getItem('creatorKit_teleprompter_letterSpacing');
      if (savedLetterSpacing) setLetterSpacing(parseFloat(savedLetterSpacing) || 0);

      const savedTextColor = localStorage.getItem('creatorKit_teleprompter_textColor');
      if (savedTextColor) setTextColor(savedTextColor);

      const savedFontFamily = localStorage.getItem('creatorKit_teleprompter_fontFamily');
      if (savedFontFamily) setFontFamily(savedFontFamily);

      const savedTextAlign = localStorage.getItem('creatorKit_teleprompter_textAlign');
      if (savedTextAlign === 'left' || savedTextAlign === 'center' || savedTextAlign === 'right') {
        setTextAlign(savedTextAlign);
      }

      const savedWidthUnit = localStorage.getItem('creatorKit_teleprompter_widthUnit');
      if (savedWidthUnit === 'ch' || savedWidthUnit === '%' || savedWidthUnit === 'px') {
        setWidthUnit(savedWidthUnit);
      }

      const savedColumnCharWidth = localStorage.getItem('creatorKit_teleprompter_columnCharWidth');
      if (savedColumnCharWidth) setColumnCharWidth(parseInt(savedColumnCharWidth, 10) || 55);

      const savedColumnPercentWidth = localStorage.getItem('creatorKit_teleprompter_columnPercentWidth');
      if (savedColumnPercentWidth) setColumnPercentWidth(parseInt(savedColumnPercentWidth, 10) || 70);

      const savedColumnPixelWidth = localStorage.getItem('creatorKit_teleprompter_columnPixelWidth');
      if (savedColumnPixelWidth) setColumnPixelWidth(parseInt(savedColumnPixelWidth, 10) || 880);

      const savedEyelinePercent = localStorage.getItem('creatorKit_teleprompter_eyelinePercent');
      if (savedEyelinePercent) setEyelinePercent(parseInt(savedEyelinePercent, 10) || 38);

      const savedShowEyelineGuide = localStorage.getItem('creatorKit_teleprompter_showEyelineGuide');
      if (savedShowEyelineGuide !== null) setShowEyelineGuide(savedShowEyelineGuide === 'true');

      const savedBgDimOpacity = localStorage.getItem('creatorKit_teleprompter_bgDimOpacity');
      if (savedBgDimOpacity) setBgDimOpacity(parseFloat(savedBgDimOpacity) || 0.7);

      const savedCircularFocusLens = localStorage.getItem('creatorKit_teleprompter_circularFocusLens');
      if (savedCircularFocusLens !== null) setCircularFocusLens(savedCircularFocusLens === 'true');

      const savedFocusIntensity = localStorage.getItem('creatorKit_teleprompter_focusIntensity');
      if (savedFocusIntensity) setFocusIntensity(parseFloat(savedFocusIntensity) || 0.7);

      const savedAutoPause = localStorage.getItem('creatorKit_teleprompter_autoPauseThresholdMs');
      if (savedAutoPause) setAutoPauseThresholdMs(parseInt(savedAutoPause, 10) || 2000);

      const savedSpeechDamping = localStorage.getItem('creatorKit_teleprompter_speechDamping');
      if (savedSpeechDamping) setSpeechDamping(parseFloat(savedSpeechDamping) || 0.07);

      const savedManual = localStorage.getItem('creatorKit_manualWpm');
      if (savedManual) {
        const parsedManual = parseInt(savedManual, 10);
        if (!isNaN(parsedManual) && parsedManual >= 50 && parsedManual <= 200) {
          setManualWpm(parsedManual);
          setLearnedWpmDisplay(parsedManual);
          learnedWpmRef.current = parsedManual;
        }
      } else {
        const savedWpm = localStorage.getItem('creatorKit_learnedWpm');
        if (savedWpm) {
          const parsed = parseInt(savedWpm, 10);
          if (!isNaN(parsed) && parsed >= 50 && parsed <= 180) {
            learnedWpmRef.current = parsed;
            setLearnedWpmDisplay(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('Could not read teleprompter state from localStorage:', e);
    }
  }, []);

  // Persist script changes
  useEffect(() => {
    try {
      localStorage.setItem('creatorKit_teleprompter_script', script);
    } catch { }
  }, [script]);

  // Persist studio configurations
  useEffect(() => {
    try {
      localStorage.setItem('creatorKit_teleprompter_speed', speed.toString());
      localStorage.setItem('creatorKit_teleprompter_fontSize', fontSize.toString());
      localStorage.setItem('creatorKit_teleprompter_lineHeight', lineHeight.toString());
      localStorage.setItem('creatorKit_teleprompter_letterSpacing', letterSpacing.toString());
      localStorage.setItem('creatorKit_teleprompter_textColor', textColor);
      localStorage.setItem('creatorKit_teleprompter_fontFamily', fontFamily);
      localStorage.setItem('creatorKit_teleprompter_textAlign', textAlign);
      localStorage.setItem('creatorKit_teleprompter_widthUnit', widthUnit);
      localStorage.setItem('creatorKit_teleprompter_columnCharWidth', columnCharWidth.toString());
      localStorage.setItem('creatorKit_teleprompter_columnPercentWidth', columnPercentWidth.toString());
      localStorage.setItem('creatorKit_teleprompter_columnPixelWidth', columnPixelWidth.toString());
      localStorage.setItem('creatorKit_teleprompter_eyelinePercent', eyelinePercent.toString());
      localStorage.setItem('creatorKit_teleprompter_showEyelineGuide', showEyelineGuide.toString());
      localStorage.setItem('creatorKit_teleprompter_bgDimOpacity', bgDimOpacity.toString());
      localStorage.setItem('creatorKit_teleprompter_circularFocusLens', circularFocusLens.toString());
      localStorage.setItem('creatorKit_teleprompter_focusIntensity', focusIntensity.toString());
      localStorage.setItem('creatorKit_teleprompter_autoPauseThresholdMs', autoPauseThresholdMs.toString());
      localStorage.setItem('creatorKit_teleprompter_speechDamping', speechDamping.toString());
    } catch { }
  }, [
    speed,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    fontFamily,
    textAlign,
    widthUnit,
    columnCharWidth,
    columnPercentWidth,
    columnPixelWidth,
    eyelinePercent,
    showEyelineGuide,
    bgDimOpacity,
    circularFocusLens,
    focusIntensity,
    autoPauseThresholdMs,
    speechDamping,
  ]);

  const handleResetScroll = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    scrollPosRef.current = 0;
    targetScrollYRef.current = 0;
    setActiveWordIndex(-1);
    activeWordIndexRef.current = -1;
    virtualWordFloatRef.current = 0;
    targetWordFloatRef.current = 0;
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
    if (wordSpans && wordSpans.length > 0) {
      const clamped = Math.max(0, Math.min(wordIdx, wordSpans.length - 1));
      const targetSpan = wordSpans[clamped] as HTMLElement;
      // On mobile, anchor the active reading line at one-third screen height —
      // phones have less vertical real estate, so the line sits higher and the
      // reader keeps more upcoming script visible below it.
      // Owner ruling 2026-10-04: the mobile eyeline LEVEL is a setting now —
      // the scroll anchor follows it instead of a hardcoded 33%.
      const targetRatio = eyelinePercent / 100;
      const targetY = targetSpan.offsetTop - readerRef.current.clientHeight * targetRatio;
      targetScrollYRef.current = Math.max(0, targetY);
    }
  }, [eyelinePercent, isMobile]);

  // Recognition restart protocol: onend is the ONLY restart path, with
  // exponential backoff and a generation token that invalidates restarts
  // scheduled by sessions that have since been stopped/replaced. This
  // prevents competing recognition.start() calls from fighting each other
  // in an infinite 'aborted' error loop.
  const recognitionRestartRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number; gen: number }>({
    timer: null,
    attempt: 0,
    gen: 0,
  });

  // Mobile resilience: last session activity (watchdog fuel), current recognition
  // locale (language-not-supported fallback), screen WakeLock + its visibility
  // re-acquire listener, and the silent-death watchdog interval.
  const speechActivityRef = useRef<number>(0);
  const speechLangRef = useRef<string>('en-US');
  const wakeLockRef = useRef<any>(null);
  const wakeLockListenerRef = useRef<(() => void) | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const releaseAllAudioAndMic = useCallback(() => {
    // Invalidate any scheduled restarts from the session being stopped
    recognitionRestartRef.current.gen++;
    if (recognitionRestartRef.current.timer) {
      clearTimeout(recognitionRestartRef.current.timer);
      recognitionRestartRef.current.timer = null;
    }
    recognitionRestartRef.current.attempt = 0;
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (wakeLockListenerRef.current) {
      try { window.removeEventListener('visibilitychange', wakeLockListenerRef.current); } catch { }
      wakeLockListenerRef.current = null;
    }
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release().catch(() => { }); } catch { }
      wakeLockRef.current = null;
    }

    // 1. Abort and release SpeechRecognition instance immediately
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.abort();
      } catch { }
      speechRecognitionRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setSpeechStatus('idle');

    // 2. Stop and release audio meter mic tracks (unless currently recording a voice take)
    const isVoiceTakeRecording =
      mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording';

    if (!isVoiceTakeRecording && micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch { }
      micStreamRef.current = null;
    }

    if (!isVoiceTakeRecording && recordingStreamRef.current) {
      try {
        recordingStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch { }
      recordingStreamRef.current = null;
    }

    // 3. Suspend Web Audio Context so mobile OS (Android/Samsung Galaxy) completely exits in-call/telephony mode
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      try {
        audioContextRef.current.suspend().catch(() => { });
      } catch { }
    }
    audioMeterActiveRef.current = false;
    setAudioMeterActive(false);
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    releaseAllAudioAndMic();
  }, [releaseAllAudioAndMic]);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechStatus('unsupported');
      return;
    }

    stopSpeechRecognition();

    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const isAndroid =
      typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isMobileDevice =
      typeof window !== 'undefined' &&
      (window.innerWidth < 1024 || 'ontouchstart' in window || isAndroid || isIOS);

    // Mobile OS audio conflict mitigation: Release Web Audio mic capture completely
    // so mobile OS gives 100% exclusive microphone access to SpeechRecognition
    const isRecordingActive =
      mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording';

    if (!isRecordingActive && (isMobileDevice || micStreamRef.current)) {
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((t) => t.stop()); } catch { }
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend().catch(() => { });
      }
      audioMeterActiveRef.current = false;
      setAudioMeterActive(false);
    }

    // (Re)initialize the accent-aware matching engine with the persisted cadence.
    if (!voiceEngineRef.current || typeof voiceEngineRef.current.processAlternatives !== 'function') {
      voiceEngineRef.current = createVoiceMatchEngine({
        initialWpm: learnedWpmRef.current,
        confidenceThreshold: 0.50,
        baseLookahead: 8,
        maxLookahead: 30,
      });
    } else {
      voiceEngineRef.current.reset(Math.max(0, activeWordIndexRef.current), learnedWpmRef.current);
    }

    // Sync the karaoke word timeline to the current reading position
    virtualWordFloatRef.current = Math.max(0, activeWordIndexRef.current);
    targetWordFloatRef.current = virtualWordFloatRef.current;
    lastDisplayedWordRef.current = activeWordIndexRef.current;

    try {
      const recognition = new SpeechRecognitionClass();
      // Mobile keeps continuous: false — Android's engine goes DEAF inside a
      // continuous session after 5-10s (drops transcripts without ending), so
      // short utterance sessions + onend restarts are the reliable model there.
      // Desktop uses continuous: true (proven rock solid). What killed mobile
      // before was never this model — it was the 30ms restart cadence, which
      // stacked into dozens of start() calls/sec until Google's speech endpoint
      // throttled the tab into silent death. The delays below (fast mobile
      // base, backing off automatically on crash-streaks) keep the same
      // utterance-cycle model without ever tripping throttling.
      recognition.continuous = !isMobileDevice;
      recognition.interimResults = true;
      // Multi-hypothesis ASR feeds the accent-aware matcher; iOS serves 1 reliably.
      recognition.maxAlternatives = isIOS ? 1 : 5;
      // Locale risk: navigator.language can be a locale the speech backend refuses
      // (language-not-supported → fatal loop on Android). Only trust English locales.
      const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
      speechLangRef.current = /^en(-[A-Z]{2})?$/i.test(navLang) ? navLang : 'en-US';
      recognition.lang = speechLangRef.current;

      // Schedule a single backed-off restart; stale generations no-op.
      // Fast 20ms baseline delay so voice pick-up is immediate on pauses/interims.
      const scheduleRestart = (baseDelay: number) => {
        const restart = recognitionRestartRef.current;
        if (restart.timer) clearTimeout(restart.timer);
        const gen = restart.gen;
        const delay = Math.min(1000, Math.max(20, baseDelay) * Math.pow(1.3, Math.min(restart.attempt, 4)));
        restart.attempt++;
        restart.timer = setTimeout(() => {
          restart.timer = null;
          if (gen !== recognitionRestartRef.current.gen) return; // stale session
          if (!(speechFollowRef.current && isPlayingRef.current)) return;
          try {
            recognition.start();
          } catch { /* already started */ }
        }, delay);
      };

      recognition.onstart = () => {
        setSpeechStatus('listening');
        speechActivityRef.current = Date.now(); // watchdog fuel
        recognitionRestartRef.current.attempt = 0; // healthy start resets backoff
      };

      recognition.onresult = (event: any) => {
        setSpeechStatus('speaking');
        speechActivityRef.current = Date.now(); // watchdog fuel
        recognitionRestartRef.current.attempt = 0; // live transcripts reset backoff

        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
          setSpeechStatus('paused');
          isSpeakingCadenceActiveRef.current = false;
        }, autoPauseThresholdMs);

        // Multi-hypothesis transcription: collect EVERY ASR alternative and
        // let the engine pick whichever fits the script best.
        const hypotheses: TranscriptHypothesis[] = [];
        const maxAlts = isIOS ? 1 : 5;
        for (let alt = 0; alt < maxAlts; alt++) {
          let transcript = '';
          let hasAlt = false;
          let asrConfidence: number | undefined;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.length <= alt) {
              transcript = '';
              hasAlt = false;
              break;
            }
            transcript += result[alt].transcript;
            hasAlt = true;
            const conf = result[alt].confidence;
            if (typeof conf === 'number' && conf > 0) asrConfidence = conf;
          }
          if (!hasAlt || !transcript.trim()) break;
          const words = transcript
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          if (words.length === 0) break;
          hypotheses.push({ words, rank: alt, asrConfidence });
        }

        if (hypotheses.length === 0) return;

        const primaryWords = hypotheses[0].words;
        setLastHeardWord(primaryWords[primaryWords.length - 1]);

        const total = cleanWordsList.length;
        if (total === 0) return;

        // Context-aware voice matching engine.
        const engine = voiceEngineRef.current;
        if (engine && Math.abs(engine.currentIndex - activeWordIndexRef.current) > 20) {
          engine.seek(Math.max(0, activeWordIndexRef.current));
        }
        const phraseMatch = engine ? engine.processAlternatives(hypotheses, cleanWordsList) : null;

        if (phraseMatch && phraseMatch.matched) {
          learnedWpmRef.current = phraseMatch.learnedWpm;
          setLearnedWpmDisplay(phraseMatch.learnedWpm);
          localStorage.setItem('creatorKit_learnedWpm', phraseMatch.learnedWpm.toString());

          lastMatchTimestampRef.current = Date.now();
          lastMatchIndexRef.current = phraseMatch.matchIndex;
          isSpeakingCadenceActiveRef.current = true;

          // 3+ words = verified distinctive anchor (safe to catch up if speaker jumped ahead)
          // < 3 words = localized reading (leashed to max +4 words)
          const maxAdvance = phraseMatch.matchedWords >= 3 ? 25 : 4;
          const cappedTarget = Math.min(targetWordFloatRef.current + maxAdvance, phraseMatch.matchIndex);
          targetWordFloatRef.current = Math.max(targetWordFloatRef.current, cappedTarget);

          setScrollProgress(Math.round(((phraseMatch.matchIndex + 1) / total) * 100));
        }
      };

      recognition.onerror = (err: any) => {
        // Permission failures or service blockage: tear the whole session down
        // (so onend can't queue a restart loop) and tell the user explicitly.
        if (
          err.error === 'not-allowed' ||
          err.error === 'service-not-allowed'
        ) {
          console.warn('SpeechRecognition permission denied:', err.error);
          releaseAllAudioAndMic();
          setSpeechStatus('blocked');
          return;
        }
        if (err.error === 'language-not-supported') {
          // navigator.language was refused by the backend — fall back to en-US once.
          if (speechLangRef.current !== 'en-US') {
            speechLangRef.current = 'en-US';
            try { recognition.lang = 'en-US'; } catch { }
            scheduleRestart(isMobileDevice ? 20 : 50);
          } else {
            setSpeechStatus('unsupported');
          }
          return;
        }
        if (err.error === 'no-speech') {
          // Normal pause between words — 20ms quick restart so voice pickup is immediate
          scheduleRestart(isMobileDevice ? 20 : 40);
          return;
        }
        if (err.error === 'audio-capture') {
          // Mobile audio conflict recovery: release competing mic streams and retry
          if (micStreamRef.current) {
            try { micStreamRef.current.getTracks().forEach((t) => t.stop()); } catch { }
            micStreamRef.current = null;
          }
          audioMeterActiveRef.current = false;
          scheduleRestart(isMobileDevice ? 50 : 100);
          return;
        }
        if (err.error === 'network') {
          scheduleRestart(isMobileDevice ? 200 : 300);
          return;
        }
        if (err.error !== 'aborted') {
          console.warn('SpeechRecognition notice:', err.error);
          scheduleRestart(isMobileDevice ? 50 : 100);
        }
      };

      recognition.onend = () => {
        if (speechFollowRef.current && isPlayingRef.current) {
          scheduleRestart(isMobileDevice ? 20 : 40);
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

      // Silent-death watchdog: some Android builds let the session die WITHOUT
      // firing onend (throttled tab, OEM battery killers). No onstart/onresult
      // for 12s while follow is active → force-recycle (abort triggers the
      // backed-off onend restart path; the direct start() is belt-and-braces).
      speechActivityRef.current = Date.now();
      if (!watchdogTimerRef.current) {
        watchdogTimerRef.current = setInterval(() => {
          if (!(speechFollowRef.current && isPlayingRef.current)) return;
          if (Date.now() - speechActivityRef.current < 12000) return;
          speechActivityRef.current = Date.now(); // don't re-fire every 4s
          try { recognition.abort(); } catch { }
          try { recognition.start(); } catch { }
        }, 4000);
      }

      // Screen WakeLock: Android suspends microphone capture the moment the
      // screen dims — hold the screen awake for the whole take, and re-acquire
      // on visibility return (WakeLock auto-releases when the tab hides).
      if (isMobileDevice) {
        const wakeLockApi = (navigator as any).wakeLock;
        if (wakeLockApi && typeof wakeLockApi.request === 'function') {
          wakeLockApi
            .request('screen')
            .then((lock: any) => {
              if (!(speechFollowRef.current && isPlayingRef.current)) {
                try { lock.release().catch(() => { }); } catch { }
                return;
              }
              wakeLockRef.current = lock;
              if (!wakeLockListenerRef.current) {
                wakeLockListenerRef.current = () => {
                  if (document.visibilityState !== 'visible') return;
                  if (!(speechFollowRef.current && isPlayingRef.current)) return;
                  if (wakeLockRef.current) return;
                  try {
                    wakeLockApi.request('screen')
                      .then((l: any) => { wakeLockRef.current = l; })
                      .catch(() => { });
                  } catch { }
                };
                window.addEventListener('visibilitychange', wakeLockListenerRef.current);
              }
            })
            .catch(() => { /* WakeLock unavailable — recognition still runs */ });
        }
      }
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
    }
  }, [autoPauseThresholdMs, cleanWordsList, releaseAllAudioAndMic, stopSpeechRecognition, updateTargetScrollForWord]);

  useEffect(() => {
    // Owner ruling 2026-10-04 (mic fight): while the FILM MODE camera is
    // live, the take owns the mic — never let speech recognition start and
    // fight for it. Timed scroll drives the prompter instead.
    if (speechFollowEnabled && isPlaying && !cameraActive) {
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }
    return () => {
      stopSpeechRecognition();
    };
  }, [speechFollowEnabled, isPlaying, cameraActive, startSpeechRecognition, stopSpeechRecognition]);

  // ── LIFECYCLE & BACKGROUND MIC TEARDOWN ──
  // When leaving the tab, switching apps, locking the phone, or navigating away:
  // Immediately kill speech recognition and all microphone tracks so mobile OS
  // (Android / Samsung Galaxy, iOS) NEVER gets stuck in IN_CALL / telephony mode.
  useEffect(() => {
    // Owner ruling 2026-10-04: the camera must release the instant the app is
    // exited or backgrounded, exactly like the mic — no glowing indicator,
    // no camera locked away from the rest of the phone.
    const killCameraNow = () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        setCameraStream(null);
        setCameraActive(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPlaying(false);
        isPlayingRef.current = false;
        releaseAllAudioAndMic();
        killCameraNow();
      }
    };

    const handlePageLeave = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      releaseAllAudioAndMic();
      killCameraNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageLeave);
    window.addEventListener('beforeunload', handlePageLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageLeave);
      window.removeEventListener('beforeunload', handlePageLeave);
      releaseAllAudioAndMic();
      if (recordingStreamRef.current) {
        try {
          recordingStreamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch { }
        recordingStreamRef.current = null;
      }
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch { }
        micStreamRef.current = null;
      }
      // The lens dies with the page too — never leak the camera to the OS.
      if (cameraStream) {
        try {
          cameraStream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch { }
        setCameraStream(null);
        setCameraActive(false);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close().catch(() => { }); } catch { }
        audioContextRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.onend = null;
          speechRecognitionRef.current.onerror = null;
          speechRecognitionRef.current.onresult = null;
          speechRecognitionRef.current.abort();
        } catch { }
        speechRecognitionRef.current = null;
      }

      // Racing-restart guard: an onend/backoff timer that fires just after
      // this cleanup can resurrect the recognition session (or the VU mic)
      // in the background — the browser's mic indicator then stays lit on
      // the NEXT page (Auto Captions never touches the mic itself). Sweep
      // again shortly after teardown and stop anything that came back.
      setTimeout(() => {
        try {
          recognitionRestartRef.current.gen++;
          if (recognitionRestartRef.current.timer) {
            clearTimeout(recognitionRestartRef.current.timer);
            recognitionRestartRef.current.timer = null;
          }
          if (watchdogTimerRef.current) {
            clearInterval(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.onend = null;
              speechRecognitionRef.current.onerror = null;
              speechRecognitionRef.current.onresult = null;
              speechRecognitionRef.current.abort();
            } catch { }
            speechRecognitionRef.current = null;
          }
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop());
            micStreamRef.current = null;
          }
          if (recordingStreamRef.current) {
            recordingStreamRef.current.getTracks().forEach((t) => t.stop());
            recordingStreamRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close().catch(() => { }); } catch { }
            audioContextRef.current = null;
          }
        } catch { }
      }, 400);
    };
  }, [releaseAllAudioAndMic, cameraStream]);

  // ─────────────────────────────────────────────────────────────
  // 2. 60FPS EXQUISITE SMOOTH EASING ANIMATION LOOP
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
          const now = Date.now();
          // On mobile, or when audio meter is inactive, cadence is guided purely by speech recognition matches.
          // Never let background micQuiet freeze mobile speech scrolling.
          const micQuiet =
            !isMobile && audioMeterActiveRef.current && now - lastLoudMicTimestampRef.current > 700;
          // Dynamic speed ceiling: max ~500 px/s ensures organic, immediate catch-up without lag
          const maxStep = (500 * Math.min(delta, 50)) / 1000;

          // 1. Dual-Track follower: Exquisite continuous word interpolation
          if (!micQuiet && isSpeakingCadenceActiveRef.current) {
            const cruise = learnedWpmRef.current / 60; // words/sec at natural speaking cadence
            const gap = targetWordFloatRef.current - virtualWordFloatRef.current;
            if (gap > 0) {
              // Smooth, responsive velocity ramp to eliminate hesitation
              const catchUp = Math.min(gap * 2.8, Math.max(cruise * 2.2, 5.0));
              const advance = Math.min((cruise + catchUp) * (delta / 1000), gap);
              virtualWordFloatRef.current += advance;
            } else {
              // Smooth micro-advance while vocalizing so word transitions never freeze
              const microAdvance = Math.min(cruise * 0.35 * (delta / 1000), 0.05);
              virtualWordFloatRef.current = Math.min(virtualWordFloatRef.current + microAdvance, targetWordFloatRef.current + 0.6);
            }

            const displayWord = Math.floor(virtualWordFloatRef.current);
            if (displayWord !== lastDisplayedWordRef.current) {
              lastDisplayedWordRef.current = displayWord;
              setActiveWordIndex(displayWord);
              activeWordIndexRef.current = displayWord;
            }
          }

          // 2. Scroll: interpolate the pixel position along the word
          // timeline (between actual DOM word anchors) and ease toward
          // it with organic spring physics.
          const wordSpans = readerRef.current?.querySelectorAll('[data-word="1"]');
          if (wordSpans && wordSpans.length > 0) {
            const floorIdx = Math.min(Math.floor(virtualWordFloatRef.current), wordSpans.length - 1);
            const ceilIdx = Math.min(floorIdx + 1, wordSpans.length - 1);
            const frac = virtualWordFloatRef.current - floorIdx;
            const targetRatio = eyelinePercent / 100;
            const anchorY = (readerRef.current?.clientHeight || 0) * targetRatio;
            const y0 = Math.max(0, (wordSpans[floorIdx] as HTMLElement).offsetTop - anchorY);
            const y1 = Math.max(0, (wordSpans[ceilIdx] as HTMLElement).offsetTop - anchorY);
            targetScrollYRef.current = y0 + (y1 - y0) * frac;

            const diff = targetScrollYRef.current - currentScroll;
            if (Math.abs(diff) > 0.25) {
              // Natural exponential decay for instant, liquid-smooth scroll motion
              let decay = 1 - Math.exp(-9.0 * (Math.min(delta, 50) / 1000));
              let appliedDiff = diff;

              // Backward scroll dampening
              if (diff < 0) {
                if (diff > -100) {
                  appliedDiff = 0;
                } else {
                  decay = 1 - Math.exp(-4.5 * (Math.min(delta, 50) / 1000));
                }
              }

              if (appliedDiff !== 0) {
                const step = Math.max(-maxStep, Math.min(maxStep, appliedDiff * decay));
                el.scrollTop = currentScroll + step;
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
      const isMobileDevice =
        typeof window !== 'undefined' &&
        (window.innerWidth < 1024 || 'ontouchstart' in window || /android|iphone|ipad|ipod/i.test(navigator.userAgent));

      // On mobile devices (Samsung Galaxy, iPhone, etc.), do NOT start the Web Audio analyser.
      // Mobile operating systems require 100% exclusive microphone access for SpeechRecognition
      // to function accurately without audio hardware contention or lockups.
      if (isMobileDevice) {
        return;
      }

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

        // Pause detection: stamp the last moment the mic was actually loud
        // (above the calibrated noise floor + 6dB). The teleprompter glide
        // freezes when the room goes quiet, so pausing stops the scroll.
        if (rmsDb > Math.max(noiseFloorDbRef.current + 6, -50)) {
          lastLoudMicTimestampRef.current = Date.now();
        }

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
    const isMobileDevice =
      typeof window !== 'undefined' &&
      (window.innerWidth < 1024 || 'ontouchstart' in window || /android|iphone|ipad|ipod/i.test(navigator.userAgent));

    if (!isMobileDevice) {
      startAudioAnalysis(selectedAudioDeviceId);
    }

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

  const startCamera = async (deviceId?: string, facing?: 'user' | 'environment') => {
    try {
      const targetId = deviceId || selectedCameraId;
      // Acquire the NEW stream BEFORE stopping the old one (owner bug
      // report 2026-10-04: flipping to the back camera killed the preview —
      // stop-then-request leaves a dead stream when a phone can't hand the
      // lens over instantly). On failure the live preview survives.
      const constraints: MediaStreamConstraints = {
        video: targetId
          ? { deviceId: { exact: targetId } }
          : facing
            ? { facingMode: { ideal: facing } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
        // NEVER open audio here (owner ruling 2026-10-04): a second mic
        // stream would compete with AI voice listening and the dedicated
        // recording mic. Video takes merge the mic stream separately.
        audio: false,
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Retry unconstrained — single-webcam laptops and stubborn lens
        // switches fall back to "any camera" instead of going black.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(stream);
      setCameraActive(true);
      if (targetId) setSelectedCameraId(targetId);
      if (facing) setCameraFacing(facing);
    } catch (err: any) {
      console.warn('Camera initiation failed:', err);
      alert(err?.message ? `Camera access error: ${err.message}` : 'Camera access denied. Grant camera permission, then try again (HTTPS or localhost required).');
    }
  };

  const stopCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setCameraActive(false);
    setIsRecording(false);
  };

  // FILM MODE entry point (owner ruling 2026-10-04): one obvious tap toggles
  // the camera. While a take rolls we never rip tracks out of the recorder.
  const toggleFilmCamera = async () => {
    if (isRecording) return;
    if (cameraActive) {
      stopCamera();
      return;
    }
    await startCamera(undefined, cameraFacing);
    // Owner ruling 2026-10-04: the moment the camera is live, a line must
    // show where the eyes should sit — raise the eyeline with the camera.
    setShowEyelineGuide(true);
    // Owner ruling 2026-10-04 (mic fight): while the camera is live the take
    // owns the mic — AI voice sync is forced OFF so nothing fights over it.
    setSpeechFollowEnabled(false);
  };

  // Flip front/back camera (owner ruling 2026-10-04): native-camera feel —
  // the front lens previews mirrored like a selfie. Never flips mid-take.
  const flipCamera = () => {
    if (isRecording) return;
    // startCamera records the facing on success only — a failed flip keeps
    // the live lens and the honest UI state.
    startCamera(undefined, cameraFacing === 'user' ? 'environment' : 'user');
  };

  // ─────────────────────────────────────────────────────────────
  // VOICE AUDIO RECORDER (Pure Crystal-Clear Microphone Audio + Metadata Embedding)
  // ─────────────────────────────────────────────────────────────
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  // End-of-take prompt: the buried download dock made takes easy to lose
  // (refresh = gone forever). Ask DOWNLOAD / DISCARD the moment recording stops.
  const [showTakePrompt, setShowTakePrompt] = useState(false);
  const [handoffSuccessNotice, setHandoffSuccessNotice] = useState<boolean>(false);

  const handleOneClickCaptions = async () => {
    if (!recordedBlob) return;
    try {
      // 0. Kill every DESIRE for the mic before tearing it down. If the
      // reader is still playing with follow-mode armed, a racing
      // recognition restart can re-acquire the mic WHILE the navigation
      // to Auto Captions is in flight — the indicator then stays lit on
      // a page that never asked for the microphone.
      setIsPlaying(false);
      isPlayingRef.current = false;
      setSpeechFollowEnabled(false);
      speechFollowRef.current = false;

      // 1. Immediately turn off all microphone, recording streams and speech recognition
      if (recordingStreamRef.current) {
        try {
          // FILM MODE: never stop the camera preview's tracks — only tracks
          // this recorder owns (mic, or nothing when a video take is live).
          const camTracks = new Set(cameraStream ? cameraStream.getTracks() : []);
          recordingStreamRef.current.getTracks().forEach((track) => {
            if (camTracks.has(track)) return;
            track.stop();
            track.enabled = false;
          });
        } catch { }
        recordingStreamRef.current = null;
      }
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch { }
        micStreamRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.onend = null;
          speechRecognitionRef.current.onerror = null;
          speechRecognitionRef.current.onresult = null;
          speechRecognitionRef.current.abort();
        } catch { }
        speechRecognitionRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close().catch(() => { }); } catch { }
        audioContextRef.current = null;
      }
      stopAudioAnalysis();
      stopVoiceRecording();
      stopSpeechRecognition();

      await saveHandoffSession({
        script: script,
        mediaBlob: recordedBlob,
        fileName: `teleprompter_take_${Date.now()}.${recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`,
        title: 'Teleprompter Studio Take',
        wpm: Math.round(speed * 125),
      });
      router.push('/auto-captions?from=teleprompter&auto=true');
    } catch (err) {
      console.warn('1-Click handoff fallback:', err);
      if (recordingStreamRef.current) {
        try {
          const camTracks = new Set(cameraStream ? cameraStream.getTracks() : []);
          recordingStreamRef.current.getTracks().forEach((t) => {
            if (camTracks.has(t)) return;
            t.stop();
            t.enabled = false;
          });
        } catch { }
        recordingStreamRef.current = null;
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((t) => { t.stop(); t.enabled = false; }); } catch { }
        micStreamRef.current = null;
      }
      stopAudioAnalysis();
      stopVoiceRecording();
      stopSpeechRecognition();
      localStorage.setItem('creatorkit_teleprompter_script', script);
      router.push('/auto-captions?from=teleprompter&auto=true');
    }
  };

  const startVoiceRecording = async () => {
    try {
      // Clear previous take so stale buttons don't persist
      setRecordedAudioUrl(null);
      setRecordedBlob(null);
      setHandoffSuccessNotice(false);
      setShowTakePrompt(false);
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }
      // SOLO take when the camera is live, classic voice take otherwise.
      const wantVideo =
        cameraActive && cameraStream !== null && cameraStream.getVideoTracks().length > 0;
      setTakeIsVideo(wantVideo);

      let stream = recordingStreamRef.current;
      const isStreamActive =
        stream && stream.active &&
        stream.getAudioTracks().some((t) => t.readyState === 'live') &&
        (!wantVideo || stream.getVideoTracks().some((t) => t.readyState === 'live'));

      if (!isStreamActive) {
        const audioConstraints: MediaTrackConstraints = {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          ...(selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : {}),
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
        } catch (mediaErr) {
          console.warn('Strict mic constraints failed, attempting basic audio request:', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        }
        recordingStreamRef.current = stream;

        const isMobileDevice =
          typeof window !== 'undefined' &&
          (window.innerWidth < 1024 || 'ontouchstart' in window || /android|iphone|ipad|ipod/i.test(navigator.userAgent));
        if (!isMobileDevice && !micStreamRef.current) {
          micStreamRef.current = stream;
        }
        if (!isMobileDevice && !audioContextRef.current) {
          startAudioAnalysis(selectedAudioDeviceId).catch((err) => console.warn('VU meter analysis start warning:', err));
        }
      }

      if (!stream) {
        console.error('Cannot record: Microphone stream unavailable.');
        alert('Could not access microphone. Please allow microphone permissions in your browser.');
        return;
      }

      // SOLO take: merge the live camera video track(s) with the fresh mic
      // track into one recording stream. The preview <video> elements keep
      // playing cameraStream directly — the recorder gets its own stream.
      if (wantVideo && cameraStream) {
        const merged = new MediaStream([
          ...cameraStream.getVideoTracks(),
          ...stream.getAudioTracks(),
        ]);
        recordingStreamRef.current = merged;
        stream = merged;
      }

      if (typeof MediaRecorder === 'undefined') {
        alert('MediaRecorder is not supported in this browser environment.');
        return;
      }

      audioChunksRef.current = [];

      // Universal mime detection (Chrome, Firefox, Safari iOS & Android).
      // FILM MODE: video takes probe H.264/AAC mp4 first (iOS Safari) then
      // VP9/VP8 webm — at 8 Mbps, the fix for the mushy ~1-2 Mbps browser
      // default that made browser takes look unusable.
      const mimeCandidates = wantVideo
        ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/mp4',
          'video/webm',
        ]
        : [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg;codecs=opus',
        ];
      let mime = '';
      for (const cand of mimeCandidates) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(cand)) {
          mime = cand;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = wantVideo
        ? { videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000, ...(mime ? { mimeType: mime } : {}) }
        : { ...(mime ? { mimeType: mime } : {}) };
      const recorder = new MediaRecorder(stream, recorderOptions);
      const effectiveMime = mime || recorder.mimeType || (wantVideo ? 'video/webm' : 'audio/webm');

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: effectiveMime });

        // Embed script and metadata directly into media blob
        let finalBlob: Blob = rawBlob;
        try {
          finalBlob = await embedMetadataIntoMediaBlob(rawBlob, {
            version: '1.0',
            generator: 'creatorskit-teleprompter',
            script: script,
            createdAt: Date.now(),
            title: 'Teleprompter Take',
            wpm: Math.round(speed * 125),
          });
        } catch (embErr) {
          console.warn('Embedding metadata fallback:', embErr);
        }

        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setRecordedAudioUrl(url);
        if (wantVideo) setRecordedVideoUrl(url);
        setShowTakePrompt(true);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        // The take is finished — the mic dies NOW. The VU-meter stream and
        // any live speech-recognition session must not linger under the take
        // prompt (or bleed into the Auto Captions handoff): the browser's
        // "using your microphone" indicator stays lit until every track
        // stops, and the user has already given us everything we need.
        stopAudioAnalysis();
        releaseAllAudioAndMic();

        const ext = effectiveMime.includes('mp4') ? 'mp4' : effectiveMime.includes('aac') ? 'aac' : 'webm';
        saveHandoffSession({
          script: script,
          mediaBlob: finalBlob,
          fileName: `teleprompter_take_${Date.now()}.${ext}`,
          title: 'Teleprompter Studio Take',
          wpm: Math.round(speed * 125),
        }).catch((e) => console.warn('Pre-save handoff error:', e));

        // NO auto-download here: the take prompt IS the single decision
        // point (download / discard / continue to captions). Firing a
        // download AND asking the prompt makes two download requests at
        // once — the take is already safely pre-saved for the handoff
        // above, so nothing is lost by waiting for the user's choice.
        setHandoffSuccessNotice(true);
      };

      recorder.onerror = (recErr) => {
        console.error('MediaRecorder error occurred:', recErr);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Voice recording start failed:', err);
      alert(err?.message ? `Microphone access error: ${err.message}` : 'Microphone access denied. Please grant microphone permissions.');
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const stopVoiceRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingStreamRef.current) {
        try {
          // FILM MODE: the camera preview's tracks outlive the take — only
          // stop what this recorder owns.
          const camTracks = new Set(cameraStream ? cameraStream.getTracks() : []);
          recordingStreamRef.current.getTracks().forEach((t) => {
            if (camTracks.has(t)) return;
            t.stop();
            t.enabled = false;
          });
        } catch { }
        recordingStreamRef.current = null;
      }
    } catch (err) {
      console.warn('Error stopping MediaRecorder:', err);
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
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
                      : speechStatus === 'blocked'
                        ? 'MIC BLOCKED — ALLOW MIC'
                        : speechStatus === 'unsupported'
                          ? 'UNSUPPORTED'
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
                      : speechStatus === 'blocked'
                        ? 'MIC BLOCKED — ALLOW MIC'
                        : speechStatus === 'unsupported'
                          ? 'UNSUPPORTED'
                          : 'PAUSED'
                  : 'TIMED SCROLL'}
              </span>
            </button>

            {/* 2. Decibel & Waveform Box (Desktop only — mobile frees mic 100% for AI voice) */}
            {!isMobile && (
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
            )}
          </div>



          {/* 2. Eyeline Horizon Marker */}
          {showEyelineGuide && (
            <div
              style={{
                position: 'absolute',
                top: `${eyelinePercent}%`,
                left: 0,
                right: 0,
                // Owner ruling 2026-10-04: blend, don't shout — a thin,
                // translucent band so the script keeps all the attention.
                height: 24,
                transform: 'translateY(-50%)',
                background: 'rgba(255, 229, 0, 0.06)',
                borderBottom: '1.5px solid rgba(255, 229, 0, 0.42)',
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
                  fontSize: '0.56rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 229, 0, 0.75)',
                  background: 'rgba(0,0,0,0.72)',
                  padding: '1px 6px',
                  border: '1px solid rgba(255, 229, 0, 0.4)',
                  borderRadius: 3,
                }}
              >
                EYELINE {eyelinePercent}%
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

          {/* 5b. FILM MODE live camera — full-bleed behind the script.
              The srcObject wiring lives in the cameraStream effect. */}
          {cameraActive && cameraLayout === 'full-bg' && (
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
                // Selfie mirror on the front lens — preview only; the
                // recorded file stays true (unmirrored), like native apps.
                transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
                zIndex: 1,
                background: '#000',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* 5c. FILM MODE live camera — corner PiP: frame yourself while
              you read. Front lens mirrors like a native selfie preview. */}
          {cameraActive && cameraLayout === 'corner-pip' && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
                right: 14,
                width: 'clamp(96px, 24vw, 190px)',
                aspectRatio: '3 / 4',
                zIndex: 30,
                border: '2px solid #000',
                borderRadius: 10,
                boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
                background: '#000',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
              {/* Native-camera flip — one tap swaps front/back lens */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  flipCamera();
                }}
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1.5px solid #fff',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
                title="Flip camera (front / back)"
              >
                <RefreshCw size={13} />
              </button>
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

              {/* Eyeline guide: while a SOLO video take rolls, the lens sits at
                  the top of the screen — hold your eyes there. */}
              {isRecording && takeIsVideo && (
                <div
                  style={{
                    position: 'fixed',
                    top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 90,
                    pointerEvents: 'none',
                    background: '#FFE500',
                    border: '2px solid #000',
                    color: '#000',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.62rem',
                    padding: '3px 9px',
                    letterSpacing: '0.08em',
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  ▲ LOOK AT THE LENS
                </div>
              )}

              {/* Quick Record Button */}
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
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  border: '1.5px solid #000',
                  background: isRecording ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isRecording ? '0 0 12px rgba(239,68,68,0.7)' : 'none',
                  flexShrink: 0,
                  marginLeft: 4,
                  marginRight: 2,
                }}
                title={isRecording ? 'Stop Recording' : cameraActive ? 'Record Video Take (camera + mic)' : 'Record Audio Take'}
              >
                {cameraActive ? (
                  <Camera size={16} className={isRecording ? 'animate-pulse' : ''} />
                ) : (
                  <Mic size={16} className={isRecording ? 'animate-pulse' : ''} />
                )}
              </button>

              {/* CREW MODE: mirror the script to a second screen while the
                  phone films on the native camera app. */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMirrorOpen(true);
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  border: '1.5px solid #000',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginRight: 2,
                }}
                title="Send this script to a second screen (film on your camera app at full quality)"
              >
                <MonitorSmartphone size={16} />
              </button>

              {/* FILM MODE: camera on/off — while live, REC films video + mic */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilmCamera();
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  border: cameraActive ? '1.5px solid #FFE500' : '1.5px solid #000',
                  background: cameraActive ? '#FFE500' : 'rgba(255, 255, 255, 0.12)',
                  color: cameraActive ? '#000000' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginRight: 2,
                  boxShadow: cameraActive && isRecording ? '0 0 12px rgba(255,229,0,0.8)' : 'none',
                }}
                title={cameraActive ? 'Camera live — REC films video + mic. Tap to stop.' : 'FILM MODE: turn the camera on so REC films video + mic'}
              >
                {cameraActive ? <VideoOff size={16} /> : <Video size={16} />}
              </button>

              {/* Speed indicator */}
              <div style={{ padding: '0 8px', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.76rem', color: '#fff', whiteSpace: 'nowrap' }}>
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

                  {/* 0. FILM MODE — SOLO camera + CREW second screen (owner
                      ruling 2026-10-04: one obvious tap, mobile first) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: 10,
                      border: '2px solid #000',
                      borderRadius: 10,
                      background: cameraActive ? '#FEF9C3' : '#ffffff',
                    }}
                  >
                    <span style={{ fontSize: '0.64rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#71717a' }}>
                      Film Mode — Camera + Second Screen
                    </span>
                    <p style={{ margin: 0, fontSize: '0.62rem', fontFamily: 'monospace', color: '#52525b', lineHeight: 1.5 }}>
                      {cameraActive
                        ? 'CAMERA LIVE — REC films VIDEO + your mic (auto-saved like audio). Scroll runs TIMED while filming: the take owns the mic, so AI voice sync is off.'
                        : 'Tap CAMERA to film yourself reading — REC switches from mic-only to video + mic.'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFilmCamera();
                        }}
                        style={{
                          minHeight: 44,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: cameraActive ? '#FFE500' : '#ffffff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {cameraActive ? <VideoOff size={15} /> : <Video size={15} />}
                        {cameraActive ? 'CAMERA ON' : 'CAMERA'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileControlsOpen(false);
                          setMirrorOpen(true);
                        }}
                        style={{
                          minHeight: 44,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        title="Send this script to a second screen (film on your camera app at full quality)"
                      >
                        <MonitorSmartphone size={15} />
                        SECOND SCREEN
                      </button>
                    </div>
                    {cameraActive && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCameraLayout(cameraLayout === 'full-bg' ? 'corner-pip' : 'full-bg');
                          }}
                          style={{
                            width: '100%',
                            minHeight: 40,
                            border: '2px solid #000',
                            borderRadius: 8,
                            background: '#ffffff',
                            color: '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.62rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          {cameraLayout === 'full-bg' ? '▣ PIP CORNER' : '▣ FULL BG'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEyelineGuide((s) => !s);
                          }}
                          style={{
                            width: '100%',
                            minHeight: 40,
                            border: '2px solid #000',
                            borderRadius: 8,
                            background: showEyelineGuide ? '#FFE500' : '#ffffff',
                            color: '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.62rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                          title="Show the EYELINE HORIZON marker — hold your eyes on it while filming"
                        >
                          {showEyelineGuide ? 'EYELINE ON' : 'EYELINE OFF'}
                        </button>
                      </div>
                    )}
                    {cameraActive && showEyelineGuide && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.6rem', color: '#000', flexShrink: 0 }}>
                          EYELINE LEVEL
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEyelinePercent((p) => Math.max(15, p - 1)); }}
                          style={{ width: 42, minHeight: 40, border: '2px solid #000', borderRadius: 8, background: '#fff', color: '#000', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Lower the eyeline horizon"
                        >
                          −
                        </button>
                        <div
                          style={{ flex: 1, minHeight: 40, border: '1.5px solid #000', borderRadius: 8, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.74rem', color: '#000' }}
                          title="Where the read line sits — matches your camera height"
                        >
                          {eyelinePercent}%
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEyelinePercent((p) => Math.min(65, p + 1)); }}
                          style={{ width: 42, minHeight: 40, border: '2px solid #000', borderRadius: 8, background: '#fff', color: '#000', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Raise the eyeline horizon"
                        >
                          +
                        </button>
                      </div>
                    )}
                    {cameraActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          flipCamera();
                        }}
                        style={{
                          width: '100%',
                          minHeight: 40,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.62rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        title="Swap front / back camera"
                      >
                        ⟲ FLIP CAMERA ({cameraFacing === 'user' ? 'FRONT ⇄ BACK' : 'BACK ⇄ FRONT'})
                      </button>
                    )}
                    {cameraActive && cameras.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          e.stopPropagation();
                          // Never swap camera tracks while a take is recording.
                          if (!isRecording) startCamera(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          minHeight: 40,
                          border: '2px solid #000',
                          borderRadius: 8,
                          background: '#ffffff',
                          color: '#000',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.66rem',
                          padding: '0 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {cameras.map((c, i) => (
                          <option key={c.deviceId || i} value={c.deviceId}>
                            {c.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
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
                        {cameraActive ? <Camera size={16} /> : <Mic size={16} />}
                        {isRecording ? `REC (${formatTime(recordingSeconds)})` : cameraActive ? 'REC VIDEO' : 'RECORD MIC'}
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
                    <div style={{ background: '#fef3c7', border: '1.5px solid #d97706', padding: '8px 10px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {takeIsVideo && recordedVideoUrl && (
                        <video
                          src={recordedVideoUrl}
                          controls
                          playsInline
                          style={{ width: '100%', maxHeight: 200, border: '1.5px solid #000', background: '#000', display: 'block' }}
                        />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        {takeIsVideo ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.7rem' }}>VIDEO TAKE READY</span>
                        ) : (
                          <RecordedAudioPlayer url={recordedAudioUrl} />
                        )}
                        <a
                          href={recordedAudioUrl}
                          download={`creatorskit-take-${Date.now()}.${takeIsVideo && recordedBlob && recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}
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
                          title="Download Take with Embedded Script Metadata"
                        >
                          DOWNLOAD
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={handleOneClickCaptions}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: '#FFE500',
                          color: '#000',
                          border: '2px solid #000',
                          borderRadius: 6,
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '2px 2px 0 #000',
                        }}
                      >
                        <Wand2 size={13} strokeWidth={2.5} />
                        <span>✨ 1-CLICK: GENERATE STUDIO CAPTIONS</span>
                      </button>
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

          {/* End-of-take prompt (slide-up sheet, TOP-LEVEL so the save prompt
              opens even when the mobile Studio Controls sheet is closed) */}
          {showTakePrompt && recordedAudioUrl && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
              // NO backdrop-dismiss: an accidental tap outside used to kill
              // the ONLY download prompt (auto-download is gone by design),
              // leaving the user cooked with no way back. The prompt closes
              // exclusively through its own buttons (download / discard /
              // captions) and can always be re-opened from the TAKE chip in
              // the dock below.
            >
              <div
                style={{
                  background: '#fff',
                  color: '#000',
                  border: '2.5px solid #000',
                  borderBottom: 'none',
                  boxShadow: '4px 4px 0 #000',
                  padding: 20,
                  maxWidth: 480,
                  width: '100%',
                  maxHeight: '86vh',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderRadius: '18px 18px 0 0',
                  animation: 'ck-prompter-sheet-up 0.32s cubic-bezier(0.2,0.9,0.3,1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem' }}>
                  TAKE RECORDED — SAVE IT BEFORE IT'S LOST
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.55 }}>
                  The recording lives only in this browser tab. Download it now, discard it, or keep
                  it in the studio for the 1-click captions handoff.
                </p>
                {takeIsVideo && recordedVideoUrl && (
                  <video
                    src={recordedVideoUrl}
                    controls
                    playsInline
                    style={{ width: '100%', border: '2px solid #000', background: '#000', maxHeight: 240, display: 'block' }}
                  />
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={recordedAudioUrl}
                    download={`creatorskit-take-${Date.now()}.${takeIsVideo && recordedBlob && recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}
                    onClick={() => setShowTakePrompt(false)}
                    style={{
                      border: '2px solid #000',
                      background: '#FFE500',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    ⬇ DOWNLOAD TAKE
                  </a>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(recordedAudioUrl);
                      if (recordedVideoUrl) {
                        URL.revokeObjectURL(recordedVideoUrl);
                        setRecordedVideoUrl(null);
                      }
                      setRecordedAudioUrl(null);
                      setRecordedBlob(null);
                      setTakeIsVideo(false);
                      setHandoffSuccessNotice(false);
                      setShowTakePrompt(false);
                      // Also drop the pre-saved handoff so a discarded
                      // take can never resurrect inside Auto Captions.
                      clearHandoffSession().catch(() => { });
                    }}
                    style={{
                      border: '2px solid #000',
                      background: '#fff',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ DISCARD
                  </button>
                  <button
                    onClick={() => setShowTakePrompt(false)}
                    style={{
                      border: '2px solid #000',
                      background: '#f4f4f5',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    KEEP IN STUDIO
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CREW MODE (slide-up sheet, TOP-LEVEL so SECOND SCREEN works from
              the pill / dock without opening Studio Controls first) */}
          {mirrorOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
              onClick={() => setMirrorOpen(false)}
            >
              <div
                style={{
                  background: '#fff',
                  color: '#000',
                  border: '2.5px solid #000',
                  borderBottom: 'none',
                  boxShadow: '4px 4px 0 #000',
                  padding: 20,
                  maxWidth: 480,
                  width: '100%',
                  maxHeight: '86vh',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderRadius: '18px 18px 0 0',
                  animation: 'ck-prompter-sheet-up 0.32s cubic-bezier(0.2,0.9,0.3,1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem' }}>
                  SECOND SCREEN — CREW MODE
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', fontFamily: 'monospace', color: '#444', lineHeight: 1.55 }}>
                  Film on your phone's camera app at full quality while this script scrolls on a
                  laptop or second phone. Send this link there (WhatsApp it to yourself or type
                  it), open it, press play, then put the phone on the tripod and hit record.
                </p>
                <div
                  style={{
                    border: '1.5px dashed #000',
                    padding: '8px 10px',
                    fontFamily: 'monospace',
                    fontSize: '0.64rem',
                    wordBreak: 'break-all',
                    background: '#f4f4f5',
                  }}
                >
                  {mirrorLink()}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mirrorLink()).catch(() => { });
                    }}
                    style={{
                      border: '2px solid #000',
                      background: '#FFE500',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    COPY LINK
                  </button>
                  <button
                    onClick={() => window.open(mirrorLink(), '_blank')}
                    style={{
                      border: '2px solid #000',
                      background: '#fff',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    OPEN HERE
                  </button>
                  <button
                    onClick={() => setMirrorOpen(false)}
                    style={{
                      border: '2px solid #000',
                      background: '#f4f4f5',
                      color: '#000',
                      padding: '9px 14px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    DONE
                  </button>
                </div>
              </div>
            </div>
          )}

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
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              height: 58,
              minHeight: 58,
              maxHeight: 58,
              gap: 8,
              zIndex: 35,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '6px 14px 6px 8px',
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
                flexShrink: 0,
              }}
              title="Reset Scroll to Top (R / Home)"
            >
              <RotateCcw size={14} />
            </button>

            {/* 2b. FILM MODE: camera toggle — with the camera live, REC
                captures video + mic (SOLO MODE entry point) */}
            <button
              onClick={toggleFilmCamera}
              style={{
                height: 36,
                minHeight: 36,
                maxHeight: 36,
                minWidth: 86,
                padding: '0 10px',
                fontSize: '0.72rem',
                borderRadius: 18,
                border: '1.5px solid #000',
                background: cameraActive ? '#FFE500' : '#ffffff',
                color: '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: cameraActive ? '0 0 10px rgba(255,229,0,0.6)' : 'none',
              }}
              title={cameraActive ? 'Camera live — REC films video + mic. Click to stop the camera.' : 'FILM MODE: turn the camera on so REC films video + mic'}
            >
              {cameraActive ? <VideoOff size={14} /> : <Video size={14} />}
              <span>{cameraActive ? 'CAM ON' : 'CAM'}</span>
            </button>

            {/* 2c. CREW MODE: mirror this script to a second screen while the
                phone films on its native camera app */}
            <button
              onClick={() => setMirrorOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #000',
                background: '#fff',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="CREW MODE: send this script to a second screen (film on your camera app at full quality)"
            >
              <MonitorSmartphone size={14} />
            </button>

            {/* 3. Pure Voice Audio Recorder */}
            <button
              onClick={() => {
                if (isRecording) stopVoiceRecording();
                else startVoiceRecording();
              }}
              style={{
                height: 36,
                minHeight: 36,
                maxHeight: 36,
                minWidth: 68,
                padding: '0 10px',
                fontSize: '0.72rem',
                borderRadius: 18,
                border: '1.5px solid #000',
                background: isRecording ? '#ef4444' : '#ffffff',
                color: isRecording ? '#ffffff' : '#000000',
                fontFamily: 'monospace',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: isRecording ? '0 0 10px rgba(239,68,68,0.5)' : 'none',
              }}
              title={cameraActive ? 'Record Video Take (camera + mic)' : 'Record High-Quality Voice Track'}
            >
              {cameraActive ? (
                <Camera size={14} className={isRecording ? 'animate-pulse' : ''} />
              ) : (
                <Mic size={14} className={isRecording ? 'animate-pulse' : ''} />
              )}
              <span>{isRecording ? formatTime(recordingSeconds) : cameraActive ? 'REC VID' : 'REC'}</span>
            </button>

            {/* Recorded Audio Download & Captions (Compact, Never Balloons Dock) */}
            {recordedAudioUrl && !isRecording && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {/* TAKE chip — always-visible re-open for the end-of-take
                    decision sheet. There must be NO state where a finished
                    take exists but the user has no path to download it. */}
                <button
                  type="button"
                  onClick={() => setShowTakePrompt(true)}
                  style={{
                    height: 36,
                    padding: '0 10px',
                    background: '#fff',
                    color: '#000',
                    border: '1.5px solid #000',
                    borderRadius: 18,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '1px 1px 0 #000',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title="Reopen the take sheet (download / discard / captions)"
                >
                  <span>TAKE</span>
                </button>
                <button
                  type="button"
                  onClick={handleOneClickCaptions}
                  style={{
                    height: 36,
                    padding: '0 10px',
                    background: '#FFE500',
                    color: '#000',
                    border: '1.5px solid #000',
                    borderRadius: 18,
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '1px 1px 0 #000',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title="Open Take in 1-Click Auto-Captions"
                >
                  <Wand2 size={13} strokeWidth={2.5} />
                  <span>Captions</span>
                </button>
                <a
                  href={recordedAudioUrl}
                  download={`creatorskit-take-${Date.now()}.${takeIsVideo && recordedBlob && recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}
                  style={{
                    width: 36,
                    height: 36,
                    background: '#fff',
                    color: '#000',
                    border: '1.5px solid #000',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    textDecoration: 'none',
                  }}
                  title="Download Take Audio"
                >
                  <Download size={13} />
                </a>
              </div>
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

            {/* 6b. Mirror Vertical — the keyboard-only 'V' shortcut made
                visible and reversible from the UI */}
            <button
              onClick={() => setMirrorVertical((m) => !m)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #000',
                background: mirrorVertical ? '#000' : '#fff',
                color: mirrorVertical ? '#fff' : '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Flip Vertical (V)"
            >
              <ArrowUpDown size={14} />
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

                      {/* Manual Reading Pace — seeds the AI learner */}
                      <div style={{ padding: '8px 10px', background: '#fff', border: '2px solid #000', borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>
                          <span>Set Your Reading Pace</span>
                          <span style={{ color: '#000' }}>{manualWpm} WPM</span>
                        </div>
                        <TactileScrubber
                          min={80}
                          max={220}
                          step={5}
                          value={manualWpm}
                          onChange={(wpm) => {
                            setManualWpm(wpm);
                            setLearnedWpmDisplay(wpm);
                            learnedWpmRef.current = wpm;
                            localStorage.setItem('creatorKit_manualWpm', wpm.toString());
                            voiceEngineRef.current?.setPace?.(wpm);
                          }}
                          showValueBadge={false}
                          showSteppers={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', marginTop: 2 }}>
                          <span>🐢 80</span>
                          <span>AI LEARNED: {Math.round(learnedWpmDisplay)} WPM</span>
                          <span>220 🐇</span>
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
                      <TactileScrubber
                        label="Pause Freeze Time"
                        min={400}
                        max={1500}
                        step={50}
                        value={autoPauseThresholdMs}
                        onChange={(v) => setAutoPauseThresholdMs(v)}
                        formatValue={(v) => `${v}ms`}
                        showSteppers={false}
                      />
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
                        <TactileScrubber
                          label="Character Column Width"
                          min={15}
                          max={80}
                          step={1}
                          value={columnCharWidth}
                          onChange={(v) => setColumnCharWidth(v)}
                          formatValue={(v) => `${v} characters`}
                          showSteppers={false}
                        />
                      )}

                      {widthUnit === '%' && (
                        <TactileScrubber
                          label="Percentage Column Width"
                          min={20}
                          max={100}
                          step={2}
                          value={columnPercentWidth}
                          onChange={(v) => setColumnPercentWidth(v)}
                          formatValue={(v) => `${v}%`}
                          showSteppers={false}
                        />
                      )}

                      {widthUnit === 'px' && (
                        <TactileScrubber
                          label="Pixel Column Width"
                          min={240}
                          max={1200}
                          step={20}
                          value={columnPixelWidth}
                          onChange={(v) => setColumnPixelWidth(v)}
                          formatValue={(v) => `${v}px`}
                          showSteppers={false}
                        />
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

                        {/* Eyeline ON/OFF (owner ruling 2026-10-04): the
                           horizon marker needs a visible yes/no setting */}
                        <button
                          onClick={() => setShowEyelineGuide((s) => !s)}
                          style={{
                            minHeight: 38,
                            border: '2px solid #000',
                            borderRadius: 6,
                            background: showEyelineGuide ? '#FFE500' : '#ffffff',
                            color: '#000',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.66rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          {showEyelineGuide ? 'EYELINE: ON' : 'EYELINE: OFF'}
                        </button>

                        <TactileScrubber
                          label="Eyeline Horizon Height"
                          min={15}
                          max={65}
                          step={1}
                          value={eyelinePercent}
                          onChange={(v) => setEyelinePercent(v)}
                          formatValue={(v) => `${v}%`}
                          showSteppers={false}
                        />
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
                      <TactileScrubber
                        label="Font Size"
                        min={20}
                        max={96}
                        step={2}
                        value={fontSize}
                        onChange={(v) => setFontSize(v)}
                        formatValue={(v) => `${v}px`}
                        showSteppers={false}
                      />

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

            {/* §4 edge: "the script I just rehearsed = the caption script" */}
            <button
              type="button"
              className="brutalist-button"
              style={{ marginTop: 10, width: '100%', padding: '10px 14px', fontSize: '0.74rem', justifyContent: 'center' }}
              disabled={!script.trim()}
              onClick={async () => {
                if (!script.trim()) return;
                try {
                  await putHandoffText('auto-captions', script, { sourceTool: 'teleprompter' });
                  window.open('/auto-captions', '_blank');
                } catch (err) {
                  console.error('Script hand-off failed:', err);
                }
              }}
            >
              SEND TO AUTO CAPTIONS →
            </button>

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
                onClick={() => setScript(AI_SCRIPT_PROMPT)}
                style={{
                  padding: '8px 12px',
                  background: '#fef08a',
                  border: '1.5px solid #000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                ✨ GET AI PROMPT
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('creatorkit_teleprompter_script', script);
                  } catch (e) {
                    console.warn(e);
                  }
                  window.location.href = '/auto-captions';
                }}
                style={{
                  padding: '12px',
                  background: '#000000',
                  color: '#ffffff',
                  border: '2px solid #000',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                title="Transfer this script to Auto Captions for 100% accurate video overlay generation"
              >
                🎙️ SEND TO AUTO CAPTIONS
              </button>
              <button
                onClick={() => {
                  handleResetScroll();
                  setShowScriptModal(false);
                }}
                style={{
                  padding: '12px',
                  background: '#FFE500',
                  color: '#000',
                  border: '2px solid #000',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                DONE / START READING
              </button>
            </div>
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
