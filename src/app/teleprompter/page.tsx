"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  ArrowLeftRight, 
  SlidersHorizontal, 
  ChevronLeft,
  Maximize2,
  Minimize2,
} from "lucide-react";
import Link from "next/link";
import BrutalistSelect from "@/components/BrutalistSelect";
import AudioLevelMeter from "@/components/AudioLevelMeter";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  right: number;
}

const SAFE_AREA_PRESETS: Record<
  "tiktok" | "reels" | "shorts" | "custom",
  { label: string; top: number; bottom: number; right: number }
> = {
  tiktok: { label: "TikTok", top: 12, bottom: 34, right: 24 },
  reels: { label: "Instagram Reels", top: 12, bottom: 30, right: 22 },
  shorts: { label: "YouTube Shorts", top: 10, bottom: 28, right: 16 },
  custom: { label: "Custom", top: 12, bottom: 30, right: 20 },
};

const HATCH_BG =
  "repeating-linear-gradient(45deg, rgba(239,68,68,0.35) 0px, rgba(239,68,68,0.35) 6px, transparent 6px, transparent 12px)";

// ─── Post Pack generator (caption + hashtags from the script) ────────────
const STOP_WORDS = new Set([
  "a","an","and","are","as","at","be","been","but","by","can","did","do","for","from",
  "get","got","had","has","have","he","her","his","how","i","if","in","into","is","it",
  "its","just","like","me","more","most","my","no","not","now","of","on","one","or",
  "our","out","over","really","say","she","so","some","than","that","the","their","them",
  "then","there","these","they","this","those","to","two","up","us","use","very","was",
  "we","were","what","when","where","which","who","why","will","with","you","your",
  "going","want","need","know","think","thing","things","way","make","making","take",
  "much","many","also","even","still","good","great","best","new","first","last","about",
  "after","before","right","work","works","working","day","time","people","actually",
  "basically","pretty","kind","bit","lot","check","watch","video","videos",
]);

function buildPostPack(scriptText: string) {
  const clean = scriptText.replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const hookRaw = sentences[0] ?? "";
  const hook =
    hookRaw.length > 92
      ? hookRaw.slice(0, 92).replace(/\s+\S*$/, "") + "..."
      : hookRaw;

  const bodySentences = sentences
    .slice(1, -1)
    .filter((s) => s.length > 2 && s.length <= 170);
  let body = bodySentences.join(" ");
  if (body.length > 260) body = body.slice(0, 260).replace(/\s+\S*$/, "") + "...";
  const cta = "Save this for your next video and follow for more creator tips.";

  const caption = [hook, body, cta].filter(Boolean).join("\n\n");

  const words = clean.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length < 4 || STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  const tags = ranked.map(
    (w) => "#" + w.replace(/'/g, "").charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
  tags.push("#CreatorTips");
  const hashtags = [...new Set(tags)].slice(0, 12).join(" ");

  return { caption, hashtags, combined: caption + "\n\n" + hashtags };
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

const CUE_WORD_STYLE: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
  fontStyle: "italic",
  fontWeight: 600,
};

// Split the script into word / whitespace / cue tokens for the karaoke reader
function renderReaderTokens(text: string) {
  return text.split(/(\s+)/).map((tok, i) => {
    if (/^\s+$/.test(tok)) {
      if (tok.includes("\n")) return <span key={i}><br /></span>;
      return <span key={i}>{tok}</span>;
    }
    const isCue = /^[(\[].*[)\]]$/.test(tok);
    return (
      <span
        key={i}
        data-word="1"
        data-cue={isCue ? "1" : "0"}
        style={isCue ? CUE_WORD_STYLE : undefined}
      >
        {tok}
      </span>
    );
  });
}

const LIBRARY_KEY = "teleprompter-scripts-v1";

const GUIDE_LABEL: React.CSSProperties = {
  position: "absolute",
  top: 6,
  left: 6,
  background: "#ffffff",
  color: "#000000",
  fontFamily: "monospace",
  fontWeight: 900,
  fontSize: "0.55rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "3px 6px",
  whiteSpace: "nowrap",
  boxShadow: "2px 2px 0 #000000",
  zIndex: 2,
};

function SafeAreaGuide({
  insets,
  mirrored,
}: {
  insets: SafeAreaInsets;
  mirrored: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        transform: mirrored ? "scaleX(-1)" : "none",
        transformOrigin: "50% 50%",
        zIndex: 20,
      }}
    >
      {/* Top: platform profile / title zone */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${insets.top}%`,
          background: "rgba(0,0,0,0.48)",
        }}
      />

      {/* Bottom: platform caption / buttons zone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${insets.bottom}%`,
          background: "rgba(0,0,0,0.48)",
        }}
      />

      {/* Right: platform like / comment / share rail */}
      <div
        style={{
          position: "absolute",
          top: `${insets.top}%`,
          bottom: `${insets.bottom}%`,
          right: 0,
          width: `${insets.right}%`,
          background: "rgba(0,0,0,0.48)",
        }}
      />

      {/* Safe zone white border outline */}
      <div
        style={{
          position: "absolute",
          top: `${insets.top}%`,
          left: 0,
          right: `${insets.right}%`,
          bottom: `${insets.bottom}%`,
          border: "1.5px solid rgba(255,255,255,0.75)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

// ─── Quality Presets ────────────────────────────────────────────────────────
const QUALITY_PRESETS = {
  low:    { label: "Low (480p)",    width: 854,  height: 480,  frameRate: 24, videoBitsPerSecond: 1_500_000  },
  medium: { label: "Medium (720p)", width: 1280, height: 720,  frameRate: 30, videoBitsPerSecond: 4_000_000  },
  high:   { label: "High (1080p)",  width: 1920, height: 1080, frameRate: 30, videoBitsPerSecond: 10_000_000 },
  max:    { label: "Max (Native)",  width: 3840, height: 2160, frameRate: 60, videoBitsPerSecond: 25_000_000 },
} as const;
type QualityPreset = keyof typeof QUALITY_PRESETS;

export default function TeleprompterPage() {
  const [script, setScript] = useState(
    "Welcome to CreatorKit Teleprompter.\n\nPaste your script here, adjust the speed and font size, then press Play.\n\nThe red line marks your eyeline — keep your gaze there for natural eye contact with the camera.\n\nYou can use Mirror Mode if you're reading from a physical teleprompter glass."
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2.5);
  const [fontSize, setFontSize] = useState(42);
  const [mirrored, setMirrored] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Web Camera & Video Recording state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedMimeType, setRecordedMimeType] = useState<string>("video/webm");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraAspectRatio, setCameraAspectRatio] = useState<"original" | "1:1" | "16:9" | "9:16">("original");
  const [previewMode, setPreviewMode] = useState<"overlay" | "background">("overlay");
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("high");
  const [cameraCapabilities, setCameraCapabilities] = useState<{ maxWidth: number; maxHeight: number } | null>(null);
  const [cameraIsLandscape, setCameraIsLandscape] = useState<boolean>(true);

  // Safe area guide state
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [safeAreaPreset, setSafeAreaPreset] = useState<"tiktok" | "reels" | "shorts" | "custom">("tiktok");
  const [customSafeInsets, setCustomSafeInsets] = useState({ top: 12, bottom: 30, right: 20 });

  // Smart Speed (mic-driven auto pause / resume)
  const [smartSpeedOn, setSmartSpeedOn] = useState(false);
  const [smartSpeedSensitivity, setSmartSpeedSensitivity] = useState<"sensitive" | "normal" | "relaxed">("normal");
  const [smartSpeedStatus, setSmartSpeedStatus] = useState<"idle" | "listening" | "paused">("idle");

  // Post Pack (generated caption + hashtags)
  const [postPack, setPostPack] = useState<{ caption: string; hashtags: string; combined: string } | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<"" | "caption" | "hashtags" | "all">("");

  // Read-along / playback extras
  const [loop, setLoop] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Script library (localStorage)
  const [savedScripts, setSavedScripts] = useState<{ id: string; name: string; body: string; savedAt: number }[]>([]);
  const [libraryDraft, setLibraryDraft] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Smart Speed internals
  const smartMicStreamRef = useRef<MediaStream | null>(null);
  const smartAudioCtxRef = useRef<AudioContext | null>(null);
  const smartAnalyserRef = useRef<AnalyserNode | null>(null);
  const smartLoopRef = useRef<number | null>(null);
  const smartQuietSinceRef = useRef<number | null>(null);
  const smartLoudSinceRef = useRef<number | null>(null);
  const smartAutoPausedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const loopRef = useRef(false);
  const countdownRef = useRef<number | null>(null);

  // Karaoke reader internals
  const readerRef = useRef<HTMLDivElement>(null);
  const wordNodesRef = useRef<HTMLSpanElement[]>([]);
  const wordMetricsRef = useRef<{ mid: number; isCue: boolean }[]>([]);
  const curWordIdxRef = useRef(-1);
  const highlightRef = useRef<() => void>(() => {});
  const scrollPosRef = useRef(0); // Persists scroll across reader/textarea swap

  // Latest-actions container so global hotkeys never go stale
  const actionsRef = useRef<{
    toggleFullscreen: () => void;
    reset: () => void;
    stopRecording: () => void;
    beginRecording: () => void;
    scrubBy: (ms: number) => void;
    startRecording: () => void;
  }>({
    toggleFullscreen: () => {},
    reset: () => {},
    stopRecording: () => {},
    beginRecording: () => {},
    scrubBy: () => {},
    startRecording: () => {},
  });

  const tickRef = useRef<(time: number) => void>(() => {});

  useEffect(() => {
    tickRef.current = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // The reader (karaoke spans) while playing, the textarea otherwise
      const el = isPlayingRef.current ? readerRef.current : textareaRef.current;
      if (!el) return;

      // Automatically scale scroll velocity by speed factor & fontSize for natural pacing
      const velocity = (speed * fontSize * delta) / 4000;
      const max = el.scrollHeight - el.clientHeight;

      if (el.scrollTop + velocity >= max) {
        if (loopRef.current) {
          el.scrollTop = 0;
          scrollPosRef.current = 0;
          lastTimeRef.current = time;
          return;
        }
        el.scrollTop = max;
        scrollPosRef.current = max;
        smartAutoPausedRef.current = false;
        setIsPlaying(false);
        return;
      }
      el.scrollTop += velocity;
      scrollPosRef.current = el.scrollTop;
    };
  }, [speed, fontSize]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  // Karaoke highlight: light the word sitting on the 45% eye line
  useEffect(() => {
    highlightRef.current = () => {
      const reader = readerRef.current;
      const metrics = wordMetricsRef.current;
      const nodes = wordNodesRef.current;
      if (!reader || metrics.length === 0 || nodes.length === 0) return;

      const eyeY = reader.scrollTop + reader.clientHeight * 0.45;
      let idx = metrics.length - 1;
      let lo = 0;
      let hi = metrics.length - 1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (metrics[m].mid >= eyeY) {
          idx = m;
          hi = m - 1;
        } else {
          lo = m + 1;
        }
      }
      if (metrics[idx].isCue) idx = -1; // never spotlight direction cues

      if (idx === curWordIdxRef.current) return;
      if (curWordIdxRef.current >= 0 && curWordIdxRef.current < nodes.length) {
        const prev = nodes[curWordIdxRef.current];
        prev.style.background = "";
        prev.style.color = "";
      }
      curWordIdxRef.current = idx;
      if (idx >= 0 && idx < nodes.length) {
        const cur = nodes[idx];
        cur.style.background = "var(--accent)";
        cur.style.color = "#000000";
      }
    };
  }, []);

  // Surface sync: seeding the karaoke reader from the textarea and back
  useEffect(() => {
    if (isPlaying) {
      const reader = readerRef.current;
      const ta = textareaRef.current;
      if (reader) {
        if (ta) reader.scrollTop = scrollPosRef.current;
        const nodes = Array.from(reader.querySelectorAll<HTMLSpanElement>("span[data-word]"));
        wordNodesRef.current = nodes;
        wordMetricsRef.current = nodes.map((n) => ({
          mid: n.offsetTop + n.offsetHeight / 2,
          isCue: n.dataset.cue === "1",
        }));
        curWordIdxRef.current = -1;
      }
    } else {
      const reader = readerRef.current;
      const ta = textareaRef.current;
      if (reader && ta) {
        ta.scrollTop = scrollPosRef.current;
        scrollPosRef.current = ta.scrollTop;
      }
    }
  }, [isPlaying, script, fontSize]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      const loop = (time: number) => {
        tickRef.current(time);
        highlightRef.current();
        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Recording elapsed timer
  useEffect(() => {
    if (!isRecording || recordingPaused) return;
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording, recordingPaused]);

  // Keep playback / recording flags mirrored into refs for the Smart Speed loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Smart Speed engine: listen to the mic and auto-pause on silence,
  // auto-resume when the presenter starts talking again
  useEffect(() => {
    if (!smartSpeedOn) {
      if (smartLoopRef.current !== null) cancelAnimationFrame(smartLoopRef.current);
      smartLoopRef.current = null;
      if (smartAudioCtxRef.current) {
        smartAudioCtxRef.current.close().catch(() => {});
        smartAudioCtxRef.current = null;
      }
      if (smartMicStreamRef.current) {
        smartMicStreamRef.current.getTracks().forEach((t) => t.stop());
        smartMicStreamRef.current = null;
      }
      smartAnalyserRef.current = null;
      smartQuietSinceRef.current = null;
      smartLoudSinceRef.current = null;
      smartAutoPausedRef.current = false;
      return;
    }

    let cancelled = false;
    const thresholds = {
      sensitive: { quietMs: 500, resumeMs: 350, silenceFloor: 0.02, speechGate: 0.05 },
      normal: { quietMs: 700, resumeMs: 450, silenceFloor: 0.018, speechGate: 0.055 },
      relaxed: { quietMs: 1000, resumeMs: 600, silenceFloor: 0.015, speechGate: 0.06 },
    }[smartSpeedSensitivity];

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        smartMicStreamRef.current = stream;

        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        smartAudioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        smartAnalyserRef.current = analyser;

        setSmartSpeedStatus("listening");
        smartQuietSinceRef.current = null;
        smartLoudSinceRef.current = null;
        smartAutoPausedRef.current = false;

        const timeData = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(timeData);
          let sum = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeData.length);
          const now = performance.now();

          if (rms < thresholds.silenceFloor) {
            smartLoudSinceRef.current = null;
            if (smartQuietSinceRef.current === null) smartQuietSinceRef.current = now;
            else if (
              now - smartQuietSinceRef.current > thresholds.quietMs &&
              isPlayingRef.current
            ) {
              smartAutoPausedRef.current = true;
              setIsPlaying(false);
              setSmartSpeedStatus("paused");
            }
          } else if (rms > thresholds.speechGate) {
            smartQuietSinceRef.current = null;
            if (smartLoudSinceRef.current === null) smartLoudSinceRef.current = now;
            else if (
              now - smartLoudSinceRef.current > thresholds.resumeMs &&
              smartAutoPausedRef.current &&
              !isPlayingRef.current &&
              !isRecordingRef.current
            ) {
              smartAutoPausedRef.current = false;
              setIsPlaying(true);
              setSmartSpeedStatus("listening");
            }
          }
          smartLoopRef.current = requestAnimationFrame(tick);
        };
        smartLoopRef.current = requestAnimationFrame(tick);
      } catch {
        alert("Microphone access blocked — Smart Speed needs mic permission to listen for pauses.");
        setSmartSpeedOn(false);
        setSmartSpeedStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
      if (smartLoopRef.current !== null) cancelAnimationFrame(smartLoopRef.current);
      smartLoopRef.current = null;
      if (smartMicStreamRef.current) {
        smartMicStreamRef.current.getTracks().forEach((t) => t.stop());
        smartMicStreamRef.current = null;
      }
      if (smartAudioCtxRef.current) {
        smartAudioCtxRef.current.close().catch(() => {});
        smartAudioCtxRef.current = null;
      }
      smartAnalyserRef.current = null;
      smartQuietSinceRef.current = null;
      smartLoudSinceRef.current = null;
      smartAutoPausedRef.current = false;
    };
  }, [smartSpeedOn, smartSpeedSensitivity]);

  // Global hotkeys: Space play/pause · F fullscreen · R reset · L loop ·
  // S record · arrow up/down speed · arrow left/right jump 5s
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          smartAutoPausedRef.current = false;
          setIsPlaying((p) => !p);
          break;
        case "KeyF":
          actionsRef.current.toggleFullscreen();
          break;
        case "KeyR":
          actionsRef.current.reset();
          break;
        case "KeyL":
          setLoop((v) => !v);
          break;
        case "KeyS":
          actionsRef.current.beginRecording();
          break;
        case "ArrowUp":
          e.preventDefault();
          setSpeed((s) => Math.min(8, +(s + 0.1).toFixed(1)));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSpeed((s) => Math.max(0.5, +(s - 0.1).toFixed(1)));
          break;
        case "ArrowLeft":
          actionsRef.current.scrubBy(-5000);
          break;
        case "ArrowRight":
          actionsRef.current.scrubBy(5000);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // HTML5 Fullscreen API state sync listeners
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Studio layout: hide the site footer + lock page scroll so the whole
  // prompter fits the viewport (header fixed, sidebar scrolls internally)
  useEffect(() => {
    document.body.classList.add("teleprompter-studio");
    return () => document.body.classList.remove("teleprompter-studio");
  }, []);

  // Sync video preview ref stream object when camera stream changes
  useEffect(() => {
    if (cameraActive && cameraStreamRef.current && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraActive, selectedCameraId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Camera permissions and stream acquisition
  const startCamera = async () => {
    try {
      if (isRecording) {
        alert("Stop the current recording before switching the camera.");
        return;
      }
      // First prompt for permission to ensure labels are visible
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      tempStream.getTracks().forEach((t) => t.stop());

      // Enumerate available cameras (front / back / ultra-wide lenses)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoCams = allDevices.filter((d) => d.kind === "videoinput");
      setCameras(videoCams);

      if (videoCams.length > 0) {
        // Prefer user facing/front camera by default
        const front = videoCams.find(
          c => c.label.toLowerCase().includes("front") || c.label.toLowerCase().includes("user")
        );
        const initialCam = front || videoCams[0];
        setSelectedCameraId(initialCam.deviceId);

        const q = QUALITY_PRESETS[qualityPreset];
        const finalStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: initialCam.deviceId },
            width: { ideal: q.width },
            height: { ideal: q.height },
            frameRate: { ideal: q.frameRate },
          },
          audio: true
        });
        cameraStreamRef.current = finalStream;
        setCameraStream(finalStream);

        // Read actual capabilities and orientation from the track
        const track = finalStream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          const isLandscape = (settings.width ?? 1) >= (settings.height ?? 1);
          setCameraIsLandscape(isLandscape);
          const caps = (track as MediaStreamTrack & { getCapabilities?: () => { width?: { max?: number }; height?: { max?: number } } }).getCapabilities?.();
          if (caps) {
            setCameraCapabilities({ maxWidth: caps.width?.max ?? q.width, maxHeight: caps.height?.max ?? q.height });
          }
        }

        setCameraActive(true);
      }
    } catch (err) {
      alert("Could not access camera or microphone. Please check your browser permissions.");
      console.error(err);
    }
  };

  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (!cameraActive) return;

    if (isRecording) {
      alert("Stop the current recording before switching the camera.");
      return;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const q = QUALITY_PRESETS[qualityPreset];
      const finalStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: q.width },
          height: { ideal: q.height },
          frameRate: { ideal: q.frameRate },
        },
        audio: true
      });
      cameraStreamRef.current = finalStream;
      setCameraStream(finalStream);

      // Update capabilities + orientation for the new camera
      const track = finalStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        setCameraIsLandscape((settings.width ?? 1) >= (settings.height ?? 1));
        const caps = (track as MediaStreamTrack & { getCapabilities?: () => { width?: { max?: number }; height?: { max?: number } } }).getCapabilities?.();
        if (caps) setCameraCapabilities({ maxWidth: caps.width?.max ?? q.width, maxHeight: caps.height?.max ?? q.height });
      }
    } catch (err) {
      console.error("Failed to switch camera source", err);
    }
  };

  const stopCamera = () => {
    stopRecording();
    setCountdown(null);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
  };

  // Pick the best container/codec the browser actually supports
  const pickRecordingMimeType = (): string => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264",
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) ?? "";
  };

  // Video recording controls
  const startRecording = () => {
    if (!cameraStreamRef.current || isRecording) return;
    if (typeof MediaRecorder === "undefined") {
      alert("Recording is not supported by this browser.");
      return;
    }

    const mimeType = pickRecordingMimeType();
    const targetBitrate = QUALITY_PRESETS[qualityPreset].videoBitsPerSecond;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(cameraStreamRef.current, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: targetBitrate,
      });
    } catch {
      recorder = new MediaRecorder(cameraStreamRef.current, {
        videoBitsPerSecond: targetBitrate,
      });
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    setRecordedMimeType(mimeType || (typeof MediaRecorder !== "undefined" ? recorder.mimeType : "video/webm"));
    setRecordingSeconds(0);
    setRecordingPaused(false);
    setIsRecording(true);
    setIsPlaying(true); // Auto scroll text on recording launch

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onpause = () => {
      setRecordingPaused(true);
      setIsPlaying(false);
    };

    recorder.onresume = () => {
      setRecordingPaused(false);
      setIsPlaying(true);
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      setRecordedMimeType(type);
      setRecordedVideoUrl(url); // Assign to trigger playback review modal
    };

    recorder.start(1000); // timeslice flushes data so the timer stays in sync
  };

  const togglePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
    } else if (recorder.state === "paused") {
      recorder.resume();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingPaused(false);
    setIsPlaying(false);
  };

  // ─── Smart effective insets based on recording orientation ───────────────
  // Landscape ratios (16:9, 4:3, or original landscape camera) → whole frame
  // is safe: no platform UI covers it. Portrait (9:16) → show platform zones.
  // Square (1:1) → light insets (platforms still cover top/bottom slightly).
  const recordingIsLandscape =
    cameraAspectRatio === "16:9" ||
    (cameraAspectRatio === "original" && cameraIsLandscape);
  const recordingIsSquare = cameraAspectRatio === "1:1";

  const SQUARE_INSETS = { top: 6, bottom: 6, right: 0 };
  const NO_INSETS     = { top: 0, bottom: 0, right: 0 };

  const platformPreset =
    safeAreaPreset === "custom" ? customSafeInsets : SAFE_AREA_PRESETS[safeAreaPreset];

  const effectiveInsets = recordingIsLandscape
    ? NO_INSETS
    : recordingIsSquare
    ? SQUARE_INSETS
    : platformPreset;

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const reset = () => {
    smartAutoPausedRef.current = false;
    setIsPlaying(false);
    scrollPosRef.current = 0;
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  };

  const copyText = (text: string, target: "" | "caption" | "hashtags" | "all") => {
    const done = () => {
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(""), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        if (fallbackCopy(text)) done();
      });
    } else if (fallbackCopy(text)) done();
  };

  const generatePostPack = () => {
    if (!script.trim()) {
      alert("Add a script first — the post pack is generated from it.");
      return;
    }
    const pack = buildPostPack(script);
    setPostPack(pack);
    copyText(pack.combined, "all");
  };

  // Click anywhere to place that spot on the eye line (scrubbing)
  const handleScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clickedY = el.scrollTop + (e.clientY - rect.top);
    const target = clickedY - el.clientHeight * 0.45;
    el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, target));
    scrollPosRef.current = el.scrollTop;
  };

  const scrubBy = (ms: number) => {
    const el = isPlayingRef.current ? readerRef.current : textareaRef.current;
    if (!el) return;
    const px = (speed * fontSize * ms) / 4000;
    el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + px));
    scrollPosRef.current = el.scrollTop;
  };

  // 3-2-1 countdown before the actual recorder starts
  const beginRecording = () => {
    if (countdownRef.current !== null || isRecordingRef.current) return;
    if (!cameraActive) {
      startCamera();
      return;
    }
    setCountdown(3);
  };

  // Script library
  const saveScriptToLibrary = () => {
    const name =
      (libraryDraft.trim() || script.split(/\s+/).slice(0, 5).join(" ") || "Untitled").slice(0, 40);
    setSavedScripts((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, body: script, savedAt: Date.now() },
      ...prev,
    ].slice(0, 20));
    setLibraryDraft("");
  };

  const loadScriptFromLibrary = (id: string) => {
    const entry = savedScripts.find((s) => s.id === id);
    if (!entry) return;
    reset();
    setScript(entry.body);
  };

  const deleteSavedScript = (id: string) => {
    setSavedScripts((prev) => prev.filter((s) => s.id !== id));
  };

  // Keep global hotkeys pointing at the freshest handlers
  useEffect(() => {
    actionsRef.current = {
      toggleFullscreen,
      reset,
      stopRecording,
      beginRecording,
      scrubBy,
      startRecording,
    };
  });

  // 3-2-1 countdown: at zero the recorder fires
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const id = window.setTimeout(() => {
        setCountdown(null);
        actionsRef.current.startRecording();
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setCountdown((c) => (c ?? 0) - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  // Script library persistence
  useEffect(() => {
    let cancelled = false;
    window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        if (raw) setSavedScripts(JSON.parse(raw));
      } catch {
        /* private mode / blocked storage — ignore */
      }
    }, 0);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(savedScripts));
    } catch {
      /* ignore */
    }
  }, [savedScripts]);

  return (
    <div
      style={{
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div className="grid-bg" style={{ opacity: isPlaying ? 0.02 : 1, transition: "opacity 0.5s ease" }} />

      {/* Top Header Navigation */}
      {!isFullscreen && (
        <div
          style={{
            padding: "20px 32px",
            borderBottom: "4px solid #000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            position: "relative",
            zIndex: 10,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
              <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
            </Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
                  Studio Teleprompter
                </h1>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                  Speech Lab
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-hint)", marginTop: 4 }}>
                Record directly inside the browser using the Web Camera recorder (great for iPhone).
              </p>
            </div>
          </div>
          <button
            className="brutalist-button"
            onClick={() => setShowSettings((s) => !s)}
            style={{ padding: "8px 16px" }}
          >
            <SlidersHorizontal size={16} style={{ marginRight: 4 }} /> Configure Settings
          </button>
        </div>
      )}

      {/* Workspace Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", zIndex: 5 }}>
        {/* Teleprompter Screen */}
        <div
          style={{
            flex: 1,
            position: "relative",
            background: "#000000",
            display: "flex",
            flexDirection: "column",
            borderRight: showSettings ? "4px solid #000000" : "none",
          }}
        >
          {/* ── Full-Screen Background Video Feed with Safe Zone Overlay ── */}
          {cameraActive && previewMode === "background" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 2, overflow: "hidden" }}>
              {/* Camera video fills entire background */}
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: mirrored ? "scaleX(-1)" : "none",
                }}
              />

              {/* Safe Zone cutout: box-shadow creates the gray mask OUTSIDE this box */}
              {cameraAspectRatio !== "original" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 4,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      ...(cameraAspectRatio === "9:16"
                        ? { height: "100%", aspectRatio: "9/16", maxWidth: "100%" }
                        : cameraAspectRatio === "1:1"
                        ? { height: "100%", aspectRatio: "1/1", maxWidth: "100%", maxHeight: "100%" }
                        : cameraAspectRatio === "16:9"
                        ? { width: "100%", aspectRatio: "16/9", maxHeight: "100%" }
                        : { width: "100%", height: "100%" }),
                      // The infinite box-shadow is the gray overlay outside the safe zone
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.58)",
                      border: "2px solid rgba(255,255,255,0.7)",
                      flexShrink: 0,
                    }}
                  />
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    zIndex: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(0,0,0,0.65)",
                    padding: "6px 12px",
                    border: "2px solid #ef4444",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 8px #ef4444",
                      animation: "dotLabelPulse 1s ease-in-out infinite",
                    }}
                  />
                  <span style={{ color: "#ffffff", fontFamily: "monospace", fontWeight: 900, fontSize: "0.75rem", letterSpacing: "0.1em" }}>
                    REC {formatTime(recordingSeconds)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Eye Target Indicator — only in text-only mode */}
          {(!cameraActive || previewMode === "overlay") && (
            <div
              style={{
                position: "absolute",
                top: "45%",
                left: 0,
                right: 0,
                height: 2,
                background: "rgba(239, 68, 68, 0.75)",
                zIndex: 15,
                boxShadow: "0 0 16px rgba(239, 68, 68, 0.5)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Depth/Vignette fading — only when NOT in camera background mode */}
          {(!cameraActive || previewMode === "overlay") && (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 160,
                  background: "linear-gradient(to bottom, #000 20%, transparent 100%)",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 160,
                  background: "linear-gradient(to top, #000 20%, transparent 100%)",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />
            </>
          )}

          {/* Floating Web Camera Picture-in-Picture Preview Overlay */}
          {cameraActive && previewMode === "overlay" && (
            <div
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                width: 200,
                aspectRatio: cameraAspectRatio === "1:1" ? "1/1" : cameraAspectRatio === "16:9" ? "16/9" : cameraAspectRatio === "9:16" ? "9/16" : "4/3",
                border: "4px solid #ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                zIndex: 30,
                overflow: "hidden",
                background: "#000",
                transform: mirrored ? "scaleX(-1)" : "none",
                transition: "all 0.3s ease",
              }}
            >
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {isRecording && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ef4444",
                    boxShadow: "0 0 8px #ef4444",
                    animation: "dotLabelPulse 1s ease-in-out infinite",
                  }}
                />
              )}

              {/* Safe area guide: gray overlay + white border — smart: hidden for landscape/4:3, shown for portrait */}
              {showSafeAreas && (
                <SafeAreaGuide insets={effectiveInsets} mirrored={false} />
              )}

            </div>
          )}

          {/* Single Text Area Reader & Editor — while playing, a word-level karaoke
              reader takes over so the spoken word lights up on the eye line */}
          {isPlaying ? (
            <div
              ref={readerRef}
              className="no-scrollbar"
              onPointerDown={handleScrub}
              style={{
                position: "absolute",
                inset: 0,
                overflowY: "auto",
                width: "100%",
                height: "100%",
                background: cameraActive && previewMode === "background" ? "transparent" : "#000000",
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.6,
                fontFamily: "var(--font-inter), sans-serif",
                letterSpacing: "-0.01em",
                padding: "42vh 12% 42vh",
                whiteSpace: "pre-wrap",
                transform: mirrored ? "scaleX(-1)" : "none",
                cursor: "pointer",
                zIndex: 6,
                textShadow: cameraActive && previewMode === "background" ? "0 2px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)" : "none",
              }}
            >
              {renderReaderTokens(script)}
              {/* Dim everything already read (above the eye line) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "calc(45% - 1px)",
                  pointerEvents: "none",
                  zIndex: 12,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.08))",
                }}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              readOnly={isPlaying}
              placeholder="Insert script content here..."
              className="no-scrollbar"
              style={{
                width: "100%",
                height: "100%",
                background: cameraActive && previewMode === "background" ? "transparent" : "#000000",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.6,
                fontFamily: "var(--font-inter), sans-serif",
                letterSpacing: "-0.01em",
                padding: "42vh 12% 42vh",
                transform: mirrored ? "scaleX(-1)" : "none",
                caretColor: "#ffffff",
                cursor: "text",
                overflowY: "auto",
                position: "relative",
                zIndex: 6,
                // Subtle text shadow so letters pop against any camera background
                textShadow: cameraActive && previewMode === "background" ? "0 2px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)" : "none",
              }}
            />
          )}

          {/* Bottom Control Floater Bar */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              zIndex: 25,
              background: "#ffffff",
              padding: "12px 24px",
              border: "3px solid #000000",
              boxShadow: "6px 6px 0 #000000",
            }}
          >
            {/* Reset */}
            <button
              onClick={reset}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 6,
                display: "flex",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
              title="Reset Scroll"
            >
              <RefreshCw size={18} />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={() => { smartAutoPausedRef.current = false; setIsPlaying((p) => !p); }}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: isPlaying ? "#ef4444" : "#000000",
                border: "3px solid #000000",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "3px 3px 0 #000000",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              {isPlaying ? <Pause size={24} style={{ color: "white" }} /> : <Play size={24} style={{ color: "white" }} />}
            </button>

            {/* Loop Toggle */}
            <button
              onClick={() => setLoop((v) => !v)}
              title={loop ? "Looping — stop at end" : "Loop playback"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: loop ? "var(--accent)" : "var(--text-muted)",
                padding: 6,
                display: "flex",
                transition: "color 0.15s",
              }}
            >
              <RefreshCw size={18} />
            </button>

            {/* Mirror Toggle */}
            <button
              onClick={() => setMirrored((m) => !m)}
              title="Flip display mirror"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: mirrored ? "var(--accent)" : "var(--text-muted)",
                padding: 6,
                display: "flex",
                transition: "color 0.15s",
              }}
            >
              <ArrowLeftRight size={18} />
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.15)" }} />

            {/* HTML5 Fullscreen Trigger */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isFullscreen ? "var(--accent)" : "var(--text-muted)",
                padding: 6,
                display: "flex",
                transition: "color 0.15s",
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* Sidebar Settings panels (stays open even while playing/recording) */}
        {showSettings && (
          <div
            className="brutalist-card no-scrollbar"
            style={{
              width: 280,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 28,
              border: "none",
              background: "#ffffff",
              overflowY: "auto",
            }}
          >
            {/* Camera Overlay Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="label" style={{ display: "block", fontFamily: "monospace", fontWeight: 800 }}>Direct Recording</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "3px solid #000000",
                      background: "#ffffff",
                      color: "#000000",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      boxShadow: "3px 3px 0 #000000",
                    }}
                  >
                    Enable Camera overlay
                  </button>
                ) : (
                  <>
                    <button
                      onClick={isRecording ? stopRecording : beginRecording}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "3px solid #000000",
                        background: isRecording ? "#ef4444" : "var(--accent)",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        boxShadow: "3px 3px 0 #000000",
                      }}
                    >
                      {isRecording ? "Stop Recording" : "Record Video File"}
                    </button>
                    <button
                      onClick={stopCamera}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "2px solid #ef4444",
                        background: "#fef2f2",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.78rem",
                      }}
                    >
                      Disable Camera
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Camera selection dropdown (all lenses: front / back / ultra-wide) */}
            {cameraActive && cameras.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Select Camera Lens</label>
                <BrutalistSelect
                  id="camera-lens-select"
                  value={selectedCameraId}
                  options={cameras.map((cam) => ({
                    value: cam.deviceId,
                    label: cam.label || `Camera ${cam.deviceId.slice(0, 5)}`,
                  }))}
                  onChange={handleSwitchCamera}
                />
              </div>
            )}

            {/* Camera Layout Mode */}
            {cameraActive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Preview Layout</label>
                <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                  {(["overlay", "background"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPreviewMode(mode)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "none",
                        borderRight: mode === "overlay" ? "2px solid #000" : "none",
                        background: previewMode === mode ? "var(--accent)" : "#ffffff",
                        color: previewMode === mode ? "#ffffff" : "#000000",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "0.78rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Aspect Ratio selector (Only visible in Floating Overlay Mode) */}
            {cameraActive && previewMode === "overlay" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Preview Aspect Ratio</label>
                <BrutalistSelect
                  id="camera-aspect-select"
                  value={cameraAspectRatio}
                  options={[
                    { value: "original", label: "Original" },
                    { value: "1:1", label: "1:1 (Square)" },
                    { value: "16:9", label: "16:9 (Landscape)" },
                    { value: "9:16", label: "9:16 (Portrait)" },
                  ]}
                  onChange={(value) => setCameraAspectRatio(value as "original" | "1:1" | "16:9" | "9:16")}
                />
              </div>
            )}

            {/* Recording Quality Preset */}
            {cameraActive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Recording Quality</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((key) => {
                    const preset = QUALITY_PRESETS[key];
                    const isActive = qualityPreset === key;
                    return (
                      <button
                        key={key}
                        disabled={isRecording}
                        onClick={() => setQualityPreset(key)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: `2px solid ${isActive ? "var(--accent)" : "#000000"}`,
                          background: isActive ? "var(--accent)" : "#ffffff",
                          color: isActive ? "#ffffff" : "#000000",
                          cursor: isRecording ? "not-allowed" : "pointer",
                          fontWeight: 800,
                          fontSize: "0.78rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          opacity: isRecording ? 0.5 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        <span>{preset.label}</span>
                        <span style={{ fontFamily: "monospace", fontSize: "0.68rem", opacity: 0.8 }}>
                          {(preset.videoBitsPerSecond / 1_000_000).toFixed(1)}Mbps
                        </span>
                      </button>
                    );
                  })}
                </div>
                {cameraCapabilities && (
                  <div style={{
                    padding: "8px 10px",
                    border: "2px dashed rgba(0,0,0,0.2)",
                    background: "rgba(0,0,0,0.02)",
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    color: "var(--text-hint)",
                    lineHeight: 1.5,
                  }}>
                    📷 Camera max: {cameraCapabilities.maxWidth}×{cameraCapabilities.maxHeight}px
                  </div>
                )}
                {isRecording && (
                  <p style={{ fontSize: "0.7rem", color: "#ef4444", fontFamily: "monospace", margin: 0 }}>
                    Stop recording to change quality.
                  </p>
                )}
              </div>
            )}

            {/* Safe Zone Guide */}
            {cameraActive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Safe Zone Guide</label>
                  <button
                    onClick={() => setShowSafeAreas((v) => !v)}
                    style={{
                      padding: "4px 10px",
                      border: "2px solid #000000",
                      background: showSafeAreas ? "var(--accent)" : "#ffffff",
                      color: showSafeAreas ? "#ffffff" : "#000000",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {showSafeAreas ? "ON" : "OFF"}
                  </button>
                </div>
                {showSafeAreas && !recordingIsLandscape && (
                  <BrutalistSelect
                    id="safe-area-preset"
                    value={safeAreaPreset}
                    options={[
                      { value: "tiktok", label: "TikTok" },
                      { value: "reels", label: "Instagram Reels" },
                      { value: "shorts", label: "YouTube Shorts" },
                    ]}
                    onChange={(value) => setSafeAreaPreset(value as "tiktok" | "reels" | "shorts" | "custom")}
                  />
                )}
                <p style={{ fontSize: "0.68rem", color: "var(--text-hint)", lineHeight: 1.5, fontWeight: 600 }}>
                  {recordingIsLandscape
                    ? "✅ Landscape — your whole frame is safe. No platform UI will cover it."
                    : recordingIsSquare
                    ? "Square format — slight top/bottom coverage. Keep key content centered."
                    : "Gray zones = covered by platform UI. Keep your face inside the white border."}
                </p>
              </div>
            )}

            {/* Scroll Speed Custom Slider */}
            <div className="slider-row">
              <label>Speed Rate</label>
              <div className="slider-content" style={{ boxShadow: "none", border: "3px solid #000" }}>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.1}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
                <div className="slider-divider" />
                <span className="slider-value">{speed.toFixed(1)}x</span>
              </div>
            </div>

            {/* Font scaling slider */}
            <div className="slider-row">
              <label>Font Size</label>
              <div className="slider-content" style={{ boxShadow: "none", border: "3px solid #000" }}>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={2}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
                <div className="slider-divider" />
                <span className="slider-value">{fontSize}px</span>
              </div>
            </div>

            {/* Smart Speed — mic-driven auto pause */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "monospace" }}>Smart Speed</label>
                <button
                  onClick={() => setSmartSpeedOn((v) => !v)}
                  style={{
                    padding: "4px 10px",
                    border: "2px solid #000000",
                    background: smartSpeedOn ? "var(--accent)" : "#ffffff",
                    color: smartSpeedOn ? "#ffffff" : "#000000",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {smartSpeedOn ? "ON" : "OFF"}
                </button>
              </div>

              {smartSpeedOn && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.72rem",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                      color: smartSpeedStatus === "paused" ? "#ef4444" : "#2f9e44",
                      textTransform: "uppercase",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: smartSpeedStatus === "paused" ? "#ef4444" : "#2f9e44",
                        boxShadow: `0 0 6px ${smartSpeedStatus === "paused" ? "#ef4444" : "#2f9e44"}`,
                        animation: smartSpeedStatus === "idle" ? "none" : "dotLabelPulse 1.2s ease-in-out infinite",
                      }}
                    />
                    {smartSpeedStatus === "paused"
                      ? "Paused on silence — keep talking"
                      : smartSpeedStatus === "listening"
                      ? "Listening — pauses on silence"
                      : "Waiting for mic..."}
                  </div>
                  <BrutalistSelect
                    id="smart-speed-sensitivity"
                    value={smartSpeedSensitivity}
                    options={[
                      { value: "sensitive", label: "Sensitive (short pauses)" },
                      { value: "normal", label: "Normal" },
                      { value: "relaxed", label: "Relaxed (long pauses)" },
                    ]}
                    onChange={(value) => setSmartSpeedSensitivity(value as "sensitive" | "normal" | "relaxed")}
                  />
                </>
              )}

              <p style={{ fontSize: "0.68rem", color: "var(--text-hint)", lineHeight: 1.5, fontWeight: 600 }}>
                Listens to your mic and pauses the scroll when you stop talking; resumes when you speak again.
              </p>
            </div>

            {/* Mirror trigger */}
            <div>
              <label className="label" style={{ display: "block", marginBottom: 10, fontFamily: "monospace", fontWeight: 800 }}>Mirror Projection</label>
              <button
                onClick={() => setMirrored((m) => !m)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: `3px solid #000000`,
                  background: mirrored ? "var(--accent)" : "#ffffff",
                  color: mirrored ? "#ffffff" : "#000000",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  transition: "all 0.15s",
                  boxShadow: "3px 3px 0 #000000",
                }}
              >
                <ArrowLeftRight size={14} />
                {mirrored ? "Mirror mode active" : "Default reading"}
              </button>
            </div>

            {/* Clear & Clipboard helpers */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setScript("")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "2px solid #ef4444",
                  background: "#fef2f2",
                  color: "#ef4444",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Clear Script
              </button>
              <button
                onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText();
                    if (txt) setScript(txt);
                  } catch {
                    alert("Clipboard permission blocked. Please paste manually.");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "2px solid #000000",
                  background: "#ffffff",
                  color: "#000000",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Paste Clip
              </button>
            </div>

            {/* Post Pack — caption + hashtags generated from the script */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "block", fontFamily: "monospace", fontWeight: 800, fontSize: "0.75rem" }}>Post Pack</label>
              <button
                onClick={generatePostPack}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "3px solid #000000",
                  background: copiedTarget === "all" ? "#2f9e44" : "var(--accent)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  boxShadow: "3px 3px 0 #000000",
                  transition: "background 0.15s",
                }}
              >
                {copiedTarget === "all" ? "Copied to clipboard!" : "Generate Caption + Hashtags"}
              </button>

              {postPack && (
                <>
                  <div
                    style={{
                      border: "2px solid #000000",
                      background: "#ffffff",
                      padding: 10,
                      fontSize: "0.78rem",
                      lineHeight: 1.55,
                      color: "var(--text-primary)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {postPack.caption}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {postPack.hashtags.split(" ").map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          background: "#ffffff",
                          border: "1.5px solid #000000",
                          padding: "2px 6px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => copyText(postPack.caption, "caption")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "2px solid #000000",
                        background: copiedTarget === "caption" ? "#2f9e44" : "#ffffff",
                        color: copiedTarget === "caption" ? "#ffffff" : "#000000",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {copiedTarget === "caption" ? "Copied!" : "Copy Caption"}
                    </button>
                    <button
                      onClick={() => copyText(postPack.hashtags, "hashtags")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: "2px solid #000000",
                        background: copiedTarget === "hashtags" ? "#2f9e44" : "#ffffff",
                        color: copiedTarget === "hashtags" ? "#ffffff" : "#000000",
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {copiedTarget === "hashtags" ? "Copied!" : "Copy Hashtags"}
                    </button>
                  </div>
                </>
              )}
              <p style={{ fontSize: "0.68rem", color: "var(--text-hint)", lineHeight: 1.5, fontWeight: 600 }}>
                Built from your script: a hook, the key points and ready-to-post hashtags — copied to your clipboard in one click.
              </p>
            </div>

            {/* Info panel */}
            <div
              style={{
                padding: 16,
                border: "3px solid #000000",
                background: "rgba(15,23,42,0.02)",
                boxShadow: "4px 4px 0 #000000",
                fontSize: "0.78rem",
                color: "var(--text-hint)",
                lineHeight: 1.6,
                marginTop: "auto",
              }}
            >
              <strong style={{ color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Hotkeys
              </strong>
              {(
                [
                  ["Play / Pause", "Space"],
                  ["Speed", "\u2191 \u2193"],
                  ["Jump 5s", "\u2190 \u2192"],
                  ["Record", "S"],
                  ["Fullscreen", "F"],
                  ["Reset", "R"],
                  ["Loop", "L"],
                ] as const
              ).map(([label, key]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{label}</span>
                  <kbd style={{ background: "#ffffff", padding: "2px 6px", borderRadius: 4, fontSize: "0.72rem", color: "#000000", border: "2px solid #000000", fontFamily: "monospace" }}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Script Library */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "block", fontFamily: "monospace", fontWeight: 800, fontSize: "0.75rem" }}>Script Library</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={libraryDraft}
                  onChange={(e) => setLibraryDraft(e.target.value)}
                  placeholder="Name this take (optional)"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "2px solid #000000",
                    padding: "8px",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    background: "#ffffff",
                    color: "#000000",
                    outline: "none",
                  }}
                />
                <button
                  onClick={saveScriptToLibrary}
                  style={{
                    padding: "8px 12px",
                    border: "2px solid #000000",
                    background: "var(--accent)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  Save
                </button>
              </div>
              {savedScripts.length > 0 ? (
                savedScripts.map((s) => (
                  <div key={s.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => loadScriptFromLibrary(s.id)}
                      title="Load this script"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        border: "2px solid #000000",
                        background: "#ffffff",
                        padding: "6px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => deleteSavedScript(s.id)}
                      title="Delete"
                      style={{
                        border: "2px solid #ef4444",
                        background: "#fef2f2",
                        color: "#ef4444",
                        padding: "6px 10px",
                        fontWeight: 900,
                        fontSize: "0.7rem",
                        cursor: "pointer",
                      }}
                    >
                      x
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "0.68rem", color: "var(--text-hint)", lineHeight: 1.5, fontWeight: 600 }}>
                  Nothing saved yet — save your first take above. Saved locally in your browser.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3-2-1 countdown before recording */}
      {countdown !== null && countdown > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "rgba(0,0,0,0.72)",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontFamily: "monospace",
              fontWeight: 900,
              fontSize: "0.9rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Get Ready
          </span>
          <span
            key={countdown}
            style={{
              color: "#ffffff",
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 900,
              fontSize: "7rem",
              lineHeight: 1,
              animation: "dotLabelPulse 0.9s ease-out infinite",
            }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Audio level meter (presenter only — never recorded) */}
          {cameraActive && (
            <AudioLevelMeter stream={cameraStream} />
          )}

          {/* Floating Recording Control Bar — always visible while recording */}
      {isRecording && (
        <div
          style={{
            position: "fixed",
            bottom: 128,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "#ffffff",
            padding: "10px 16px",
            border: "3px solid #000000",
            boxShadow: "6px 6px 0 #000000",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "monospace",
              fontWeight: 900,
              fontSize: "0.85rem",
              letterSpacing: "0.05em",
              color: "#000000",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: recordingPaused ? "#f59e0b" : "#ef4444",
                boxShadow: `0 0 8px ${recordingPaused ? "#f59e0b" : "#ef4444"}`,
                animation: recordingPaused ? "none" : "dotLabelPulse 1s ease-in-out infinite",
              }}
            />
            {recordingPaused ? "PAUSED" : "REC"} {formatTime(recordingSeconds)}
          </span>

          <div style={{ width: 1, height: 22, background: "rgba(0,0,0,0.15)" }} />

          <button
            onClick={togglePauseRecording}
            title={recordingPaused ? "Resume Recording" : "Pause Recording"}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: recordingPaused ? "#2f9e44" : "#000000",
              border: "3px solid #000000",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {recordingPaused ? (
              <Play size={20} style={{ color: "#ffffff" }} />
            ) : (
              <Pause size={20} style={{ color: "#ffffff" }} />
            )}
          </button>

          <button
            onClick={stopRecording}
            title="Stop Recording"
            style={{
              height: 40,
              padding: "0 16px",
              background: "#ef4444",
              color: "#ffffff",
              border: "3px solid #000000",
              cursor: "pointer",
              fontWeight: 900,
              textTransform: "uppercase",
              fontSize: "0.78rem",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              boxShadow: "3px 3px 0 #000000",
              transition: "all 0.2s",
            }}
          >
            Stop
          </button>
        </div>
      )}

      {/* Recorded Video Playback Modal Overlay */}
      {recordedVideoUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            className="brutalist-card"
            style={{
              maxWidth: 600,
              width: "100%",
              background: "#ffffff",
              padding: 24,
              border: "4px solid #000000",
              boxShadow: "8px 8px 0 #000000",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", fontFamily: "monospace" }}>
              Review Your Performance
            </h3>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: "var(--text-hint)" }}>
              Duration {formatTime(recordingSeconds)} · {recordedMimeType.includes("mp4") ? "MP4" : "WEBM"} · High quality
            </span>
            
            <div
              style={{
                width: "100%",
                background: "#000000",
                border: "3px solid #000000",
                aspectRatio: "16/9",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                src={recordedVideoUrl}
                controls
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  const ext = recordedMimeType.includes("mp4") ? "mp4" : "webm";
                  a.href = recordedVideoUrl;
                  a.download = `creatorkit-teleprompter-recording-${Date.now()}.${ext}`;
                  a.click();
                }}
                className="brutalist-button brutalist-button-primary"
                style={{ flex: 1, padding: "12px 0", fontWeight: 900, textTransform: "uppercase" }}
              >
                Download Recording
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(recordedVideoUrl);
                  setRecordedVideoUrl(null);
                }}
                className="brutalist-button brutalist-button-red"
                style={{ flex: 1, padding: "12px 0", fontWeight: 900, textTransform: "uppercase" }}
              >
                Discard & Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
