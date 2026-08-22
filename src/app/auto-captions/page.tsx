"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  FileText,
  Video,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Sliders,
  Type,
  Eye,
  Settings2,
  ChevronLeft,
  Wand2,
  Clock,
  Tv,
  Smartphone,
  Square,
  Flame,
  Zap,
  Mic,
  Cpu,
  Share2,
} from "lucide-react";
import Link from "next/link";

interface TranscriptChunk {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface TranscriptResult {
  text: string;
  chunks: TranscriptChunk[];
}

type CaptionPreset = "hormozi" | "ali-pill" | "neon" | "box" | "typewriter" | "karaoke";
type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";
type EngineMode = "whisper-wasm" | "web-speech" | "srt-import";

// ─── Web Worker Code for In-Browser Whisper via Transformers.js ─────────────
const WORKER_SCRIPT = `
let pipelineModule = null;
let transcriber = null;
let currentModel = 'Xenova/whisper-tiny.en';

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'init' || type === 'transcribe') {
    try {
      if (!pipelineModule) {
        self.postMessage({ type: 'progress', status: 'loading-runtime', text: 'Initializing WebAssembly AI Runtime...', progress: 5 });
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        pipelineModule = pipeline;
      }

      const modelName = data?.modelName || currentModel;
      if (!transcriber || currentModel !== modelName) {
        self.postMessage({ type: 'progress', status: 'downloading-model', text: 'Downloading Whisper AI model (~39MB, cached locally)...', progress: 15 });
        currentModel = modelName;
        transcriber = await pipelineModule('automatic-speech-recognition', modelName, {
          progress_callback: (p) => {
            if (p.status === 'progress') {
              const pct = Math.round((p.loaded / (p.total || 1)) * 100);
              self.postMessage({
                type: 'progress',
                status: 'downloading-model',
                text: \`Downloading \${p.file || 'model'} (\${pct}%)...\`,
                progress: Math.min(85, 15 + Math.round(pct * 0.7))
              });
            } else if (p.status === 'done') {
              self.postMessage({ type: 'progress', status: 'ready-model', text: 'Model loaded in browser memory.', progress: 88 });
            }
          }
        });
      }

      if (type === 'init') {
        self.postMessage({ type: 'ready' });
        return;
      }

      if (type === 'transcribe') {
        self.postMessage({ type: 'progress', status: 'transcribing', text: 'Transcribing speech in browser WebAssembly...', progress: 90 });
        
        const audioData = data.audio; // Float32Array
        const output = await transcriber(audioData, {
          language: data.language || 'english',
          task: 'transcribe',
          return_timestamps: true,
          chunk_length_s: 30,
          stride_length_s: 5,
        });

        self.postMessage({
          type: 'complete',
          result: output
        });
      }
    } catch (err) {
      self.postMessage({
        type: 'error',
        error: err.message || String(err)
      });
    }
  }
};
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).substring(2, 9);
}

function srtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}

function vttTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function chunksToSrt(chunks: TranscriptChunk[]): string {
  return chunks
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}\n`)
    .join("\n");
}

function chunksToVtt(chunks: TranscriptChunk[]): string {
  return (
    "WEBVTT\n\n" +
    chunks
      .map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text.trim()}\n`)
      .join("\n")
  );
}

function chunksToAss(chunks: TranscriptChunk[], fontName: string, fontSize: number, primaryColor: string): string {
  // Convert hex color to ASS BGR format &H00BBGGRR
  const hex = primaryColor.replace("#", "");
  const r = hex.substring(0, 2) || "FF";
  const g = hex.substring(2, 4) || "FF";
  const b = hex.substring(4, 6) || "FF";
  const assColor = `&H00${b}${g}${r}`;

  const header = `[Script Info]
Title: CreatorKit Studio Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${Math.round(fontSize * 1.5)},${assColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = chunks.map((c) => {
    const sTime = srtTime(c.start).replace(",", ".").substring(1); // H:MM:SS.ms
    const eTime = srtTime(c.end).replace(",", ".").substring(1);
    return `Dialogue: 0,${sTime},${eTime},Default,,0,0,0,,${c.text.trim()}`;
  });

  return header + events.join("\n");
}

function parseSrtOrVtt(text: string): TranscriptChunk[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = clean.split(/\n\s*\n/);
  const chunks: TranscriptChunk[] = [];

  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (!lines.length) continue;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(timeRegex);
      if (match) {
        const startH = parseInt(match[1] || "0", 10);
        const startM = parseInt(match[2], 10);
        const startS = parseInt(match[3], 10);
        const startMs = parseInt(match[4], 10);
        const start = startH * 3600 + startM * 60 + startS + startMs / 1000;

        const endH = parseInt(match[5] || "0", 10);
        const endM = parseInt(match[6], 10);
        const endS = parseInt(match[7], 10);
        const endMs = parseInt(match[8], 10);
        const end = endH * 3600 + endM * 60 + endS + endMs / 1000;

        const captionText = lines.slice(i + 1).join(" ").replace(/<[^>]*>/g, "").trim();
        if (captionText) {
          chunks.push({
            id: uid(),
            start,
            end,
            text: captionText,
          });
        }
        break;
      }
    }
  }

  return chunks;
}

async function decodeAudioDataFromBlob(blob: Blob): Promise<{ audioBuffer: AudioBuffer; float32_16k: Float32Array }> {
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close().catch(() => {});

  // Resample to 16000Hz mono for Whisper
  const targetRate = 16000;
  const ratio = decoded.sampleRate / targetRate;
  const length = Math.round(decoded.length / ratio);
  const mono = new Float32Array(length);
  const channelData = decoded.getChannelData(0);

  for (let i = 0; i < length; i++) {
    mono[i] = channelData[Math.min(channelData.length - 1, Math.floor(i * ratio))];
  }

  return { audioBuffer: decoded, float32_16k: mono };
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const GOOGLE_FONTS = [
  "Inter",
  "Outfit",
  "Archivo Black",
  "Bebas Neue",
  "Montserrat",
  "Space Grotesk",
  "Anton",
  "Poppins",
  "Fira Code",
];

export default function AutoCaptionsPage() {
  // File & Media State
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Engine & Progress
  const [engineMode, setEngineMode] = useState<EngineMode>("whisper-wasm");
  const [whisperModel, setWhisperModel] = useState<"Xenova/whisper-tiny.en" | "Xenova/whisper-tiny" | "Xenova/whisper-base.en">("Xenova/whisper-tiny.en");
  const [status, setStatus] = useState<"idle" | "decoding" | "loading-worker" | "transcribing" | "done" | "error">("idle");
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Transcripts & Timeline
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(-1);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  // Styling & Presets
  const [preset, setPreset] = useState<CaptionPreset>("hormozi");
  const [fontFamily, setFontFamily] = useState<string>("Archivo Black");
  const [fontSize, setFontSize] = useState<number>(36);
  const [textColor, setTextColor] = useState<string>("#FFFFFF");
  const [highlightColor, setHighlightColor] = useState<string>("#FFDD00");
  const [boxBgColor, setBoxBgColor] = useState<string>("#000000");
  const [yPosition, setYPosition] = useState<number>(80); // percentage from top (80% = bottom third)
  const [isUppercase, setIsUppercase] = useState<boolean>(true);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState<number>(4);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);

  // Playback & Export
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [exportingVideo, setExportingVideo] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string>("");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const videoMediaRef = useRef<HTMLVideoElement>(null);
  const audioMediaRef = useRef<HTMLAudioElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Worker for client-side Whisper
  useEffect(() => {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, data, progress, text, result, error } = e.data;
        if (type === "progress") {
          setProgressPct(progress || 0);
          setProgressMsg(text || "Processing...");
        } else if (type === "complete") {
          setStatus("done");
          setProgressPct(100);
          setProgressMsg("Transcription complete!");

          if (result && result.chunks) {
            const parsedChunks: TranscriptChunk[] = result.chunks
              .map((c: { timestamp?: [number, number]; text?: string }) => ({
                id: uid(),
                start: c.timestamp?.[0] ?? 0,
                end: c.timestamp?.[1] ?? 0,
                text: (c.text ?? "").trim(),
              }))
              .filter((c: TranscriptChunk) => c.text.length > 0);

            // If chunks are long, split into punchy 3-5 word phrases for social videos
            const refined = splitIntoPunchyPhrases(parsedChunks, maxWordsPerLine);
            setChunks(refined);
          } else if (result && result.text) {
            // Fallback if no chunks
            setChunks([
              {
                id: uid(),
                start: 0,
                end: duration || 5,
                text: result.text.trim(),
              },
            ]);
          }
        } else if (type === "error") {
          setStatus("error");
          setErrorMsg(error || "Worker transcription error");
        }
      };

      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (err) {
      console.warn("Web worker init failed:", err);
    }
  }, [maxWordsPerLine, duration]);

  // Split long sentences into punchy, short subtitle segments
  function splitIntoPunchyPhrases(originalChunks: TranscriptChunk[], wordsLimit: number): TranscriptChunk[] {
    const result: TranscriptChunk[] = [];

    for (const chunk of originalChunks) {
      const words = chunk.text.split(/\s+/).filter(Boolean);
      if (words.length <= wordsLimit) {
        result.push(chunk);
        continue;
      }

      const totalWords = words.length;
      const totalDuration = Math.max(0.4, chunk.end - chunk.start);
      const timePerWord = totalDuration / totalWords;

      for (let i = 0; i < totalWords; i += wordsLimit) {
        const sliceWords = words.slice(i, i + wordsLimit);
        const start = chunk.start + i * timePerWord;
        const end = chunk.start + Math.min(totalWords, i + wordsLimit) * timePerWord;
        result.push({
          id: uid(),
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
          text: sliceWords.join(" "),
        });
      }
    }

    return result;
  }

  // Handle media file upload
  const handleFileUpload = async (f: File) => {
    setFile(f);
    setErrorMsg("");
    setStatus("decoding");
    setProgressPct(5);
    setProgressMsg("Decoding media audio locally in browser...");

    const isVid = f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(f.name);
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(f);
    setMediaUrl(objectUrl);

    try {
      const { audioBuffer, float32_16k } = await decodeAudioDataFromBlob(f);
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);

      if (engineMode === "whisper-wasm") {
        if (!workerRef.current) {
          throw new Error("Local Web Worker could not be started in this browser.");
        }
        setStatus("transcribing");
        setProgressPct(10);
        setProgressMsg("Starting in-browser Whisper WebAssembly engine...");

        workerRef.current.postMessage({
          type: "transcribe",
          data: {
            audio: float32_16k,
            modelName: whisperModel,
            language: whisperModel.includes(".en") ? "english" : "auto",
          },
        });
      } else if (engineMode === "web-speech") {
        runWebSpeechRecognition(f, audioBuffer.duration);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  // Web Speech API fallback
  const runWebSpeechRecognition = (f: File, mediaDuration: number) => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Your browser does not support Web Speech API. Switched to Whisper WASM mode.");
      setEngineMode("whisper-wasm");
      return;
    }

    setStatus("transcribing");
    setProgressMsg("Listening via native Browser Speech Recognition...");
    setProgressPct(40);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const speechChunks: TranscriptChunk[] = [];
    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      const isFinal = event.results[current].isFinal;

      if (isFinal) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const startSec = Math.max(0, elapsedSec - 2.5);
        speechChunks.push({
          id: uid(),
          start: Number(startSec.toFixed(2)),
          end: Number(elapsedSec.toFixed(2)),
          text: transcript.trim(),
        });
        setChunks([...speechChunks]);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e);
      if (speechChunks.length > 0) {
        setStatus("done");
      } else {
        setErrorMsg("Web Speech encountered an issue. Try Whisper WebAssembly mode.");
        setStatus("error");
      }
    };

    recognition.onend = () => {
      setStatus("done");
      setProgressPct(100);
      setProgressMsg("Finished transcription.");
    };

    try {
      recognition.start();
      // Stop recognition after audio duration + buffer
      setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }, Math.min(60000, mediaDuration * 1000 + 2000));
    } catch {
      setStatus("done");
    }
  };

  // Handle SRT or VTT direct upload
  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const srtFile = e.target.files?.[0];
    if (!srtFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseSrtOrVtt(text);
        if (parsed.length > 0) {
          setChunks(parsed);
          setStatus("done");
          setProgressMsg(`Loaded ${parsed.length} captions from ${srtFile.name}`);
        } else {
          setErrorMsg("Could not parse valid SRT/VTT timestamps from file.");
        }
      }
    };
    reader.readAsText(srtFile);
    e.target.value = "";
  };

  // Media sync loop
  const updateCurrentTime = useCallback(() => {
    const el = isVideo ? videoMediaRef.current : audioMediaRef.current;
    if (!el) return;

    const t = el.currentTime;
    setCurrentTime(t);

    // Find active chunk
    const idx = chunks.findIndex((c) => t >= c.start && t <= c.end);
    setActiveChunkIndex(idx);

    if (idx !== -1) {
      const chunk = chunks[idx];
      const words = chunk.text.split(/\s+/).filter(Boolean);
      const dur = Math.max(0.1, chunk.end - chunk.start);
      const elapsed = t - chunk.start;
      const wordProgress = Math.floor((elapsed / dur) * words.length);
      setActiveWordIndex(Math.min(words.length - 1, Math.max(0, wordProgress)));
    } else {
      setActiveWordIndex(-1);
    }

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
  }, [chunks, isPlaying, isVideo]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateCurrentTime);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, updateCurrentTime]);

  // Render Subtitles onto Canvas
  const renderSubtitleToCanvas = useCallback(
    (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      t: number,
      sourceVideo?: HTMLVideoElement | null
    ) => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw video frame or background
      if (sourceVideo && sourceVideo.readyState >= 2) {
        ctx.drawImage(sourceVideo, 0, 0, w, h);
      } else {
        // Dark aesthetic gradient backdrop for audio clips
        ctx.fillStyle = "#0A0A0E";
        ctx.fillRect(0, 0, w, h);

        const radial = ctx.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h * 0.45, h * 0.8);
        radial.addColorStop(0, "rgba(255, 221, 0, 0.12)");
        radial.addColorStop(0.5, "rgba(94, 155, 198, 0.06)");
        radial.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, w, h);

        // Sound waveform bars in background
        const numBars = 32;
        const barW = (w * 0.6) / numBars;
        const startX = w * 0.2;
        const centerY = h * 0.45;
        for (let i = 0; i < numBars; i++) {
          const barH = 15 + Math.sin((t * 5 + i * 0.6)) * 25 + Math.cos((t * 2 + i * 0.3)) * 15;
          ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
          ctx.fillRect(startX + i * barW, centerY - barH / 2, barW - 3, barH);
        }
      }

      // 2. Safe-zone overlays (optional)
      if (showSafeZones && aspectRatio === "9:16") {
        ctx.fillStyle = "rgba(255, 0, 50, 0.15)";
        // TikTok bottom caption danger zone
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
        // TikTok right-side icon zone
        ctx.fillRect(w * 0.84, h * 0.35, w * 0.16, h * 0.45);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(w * 0.06, h * 0.1, w * 0.88, h * 0.72);
        ctx.setLineDash([]);

        ctx.font = `700 ${Math.round(w * 0.03)}px monospace`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText("SAFE CONTENT AREA", w * 0.08, h * 0.14);
      }

      // 3. Find current caption
      const currentChunk = chunks.find((c) => t >= c.start && t <= c.end);
      if (!currentChunk) return;

      const rawText = isUppercase ? currentChunk.text.toUpperCase() : currentChunk.text;
      const words = rawText.split(/\s+/).filter(Boolean);
      if (!words.length) return;

      const dur = Math.max(0.1, currentChunk.end - currentChunk.start);
      const elapsed = t - currentChunk.start;
      const wordProgress = Math.floor((elapsed / dur) * words.length);
      const currentWordIdx = Math.min(words.length - 1, Math.max(0, wordProgress));

      // Calculate Font Scaling relative to Canvas Width
      const baseScale = w / 720;
      const targetFontSize = Math.round(fontSize * baseScale);
      ctx.font = `900 ${targetFontSize}px "${fontFamily}", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const targetY = h * (yPosition / 100);

      // Render preset styles
      if (preset === "hormozi") {
        // Hormozi Style: Giant punchy words with active word colored & bouncing
        const wordMetrics = words.map((word) => ctx.measureText(word + " "));
        const totalW = wordMetrics.reduce((sum, m) => sum + m.width, 0);
        let startX = w / 2 - totalW / 2;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const isActive = i === currentWordIdx;
          const wordW = wordMetrics[i].width;
          const posX = startX + wordW / 2;
          const scale = isActive ? 1.08 : 1.0;
          const wordY = isActive ? targetY - 4 : targetY;

          ctx.save();
          ctx.translate(posX, wordY);
          ctx.scale(scale, scale);

          // Heavy Drop Shadow & Stroke
          ctx.lineJoin = "miter";
          ctx.miterLimit = 2;
          ctx.lineWidth = Math.round(targetFontSize * 0.18);
          ctx.strokeStyle = "#000000";
          ctx.strokeText(word, 0, 0);

          ctx.fillStyle = isActive ? highlightColor : textColor;
          ctx.fillText(word, 0, 0);

          ctx.restore();
          startX += wordW;
        }
      } else if (preset === "ali-pill") {
        // Ali Abdaal Pill Style: Rounded background badge around caption
        const textToDraw = words.join(" ");
        const textMetrics = ctx.measureText(textToDraw);
        const padX = targetFontSize * 0.6;
        const padY = targetFontSize * 0.35;
        const boxW = textMetrics.width + padX * 2;
        const boxH = targetFontSize + padY * 2;
        const radius = boxH / 2;

        ctx.save();
        ctx.fillStyle = boxBgColor;
        ctx.beginPath();
        ctx.roundRect(w / 2 - boxW / 2, targetY - boxH / 2, boxW, boxH, radius);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.fillText(textToDraw, w / 2, targetY + targetFontSize * 0.04);
        ctx.restore();
      } else if (preset === "neon") {
        // Cyberpunk Neon Glow
        const textToDraw = words.join(" ");
        ctx.save();
        ctx.shadowColor = highlightColor;
        ctx.shadowBlur = targetFontSize * 0.45;
        ctx.lineWidth = Math.round(targetFontSize * 0.1);
        ctx.strokeStyle = highlightColor;
        ctx.strokeText(textToDraw, w / 2, targetY);

        ctx.fillStyle = textColor;
        ctx.fillText(textToDraw, w / 2, targetY);
        ctx.restore();
      } else if (preset === "box") {
        // Broadcast Semi-Transparent Box
        const textToDraw = words.join(" ");
        const textMetrics = ctx.measureText(textToDraw);
        const padX = targetFontSize * 0.45;
        const padY = targetFontSize * 0.25;
        const boxW = textMetrics.width + padX * 2;
        const boxH = targetFontSize + padY * 2;

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(w / 2 - boxW / 2, targetY - boxH / 2, boxW, boxH);

        ctx.fillStyle = textColor;
        ctx.fillText(textToDraw, w / 2, targetY + targetFontSize * 0.05);
        ctx.restore();
      } else if (preset === "typewriter") {
        // Retro Monospace Typewriter
        ctx.font = `700 ${targetFontSize}px "Fira Code", monospace`;
        const textToDraw = words.join(" ") + (Math.floor(t * 3) % 2 === 0 ? "█" : "");
        ctx.lineWidth = Math.round(targetFontSize * 0.12);
        ctx.strokeStyle = "#000000";
        ctx.strokeText(textToDraw, w / 2, targetY);
        ctx.fillStyle = textColor;
        ctx.fillText(textToDraw, w / 2, targetY);
      } else if (preset === "karaoke") {
        // Karaoke Word Progress
        const wordMetrics = words.map((word) => ctx.measureText(word + " "));
        const totalW = wordMetrics.reduce((sum, m) => sum + m.width, 0);
        let startX = w / 2 - totalW / 2;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const isPast = i <= currentWordIdx;
          const wordW = wordMetrics[i].width;
          const posX = startX + wordW / 2;

          ctx.lineWidth = Math.round(targetFontSize * 0.14);
          ctx.strokeStyle = "#000000";
          ctx.strokeText(word, posX, targetY);

          ctx.fillStyle = isPast ? highlightColor : textColor;
          ctx.fillText(word, posX, targetY);
          startX += wordW;
        }
      }
    },
    [
      chunks,
      preset,
      fontFamily,
      fontSize,
      textColor,
      highlightColor,
      boxBgColor,
      yPosition,
      isUppercase,
      showSafeZones,
      aspectRatio,
    ]
  );

  // Live Canvas Animation Frame
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let targetW = 720;
    let targetH = 1280;
    if (aspectRatio === "16:9") {
      targetW = 1280;
      targetH = 720;
    } else if (aspectRatio === "1:1") {
      targetW = 1080;
      targetH = 1080;
    } else if (aspectRatio === "4:5") {
      targetW = 1080;
      targetH = 1350;
    }

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    renderSubtitleToCanvas(canvas, ctx, currentTime, isVideo ? videoMediaRef.current : null);
  }, [currentTime, aspectRatio, renderSubtitleToCanvas, isVideo]);

  // Play / Pause Toggle
  const togglePlay = () => {
    const el = isVideo ? videoMediaRef.current : audioMediaRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  // Seek timeline
  const handleSeek = (newTime: number) => {
    const el = isVideo ? videoMediaRef.current : audioMediaRef.current;
    if (!el) return;
    el.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Export Burned-In MP4/WebM
  const exportBurnedInVideo = async () => {
    if (exportingVideo) return;
    setExportingVideo(true);
    setExportProgress(0);

    const el = isVideo ? videoMediaRef.current : audioMediaRef.current;
    if (!el) {
      setExportingVideo(false);
      return;
    }

    const wasPlaying = isPlaying;
    el.pause();
    setIsPlaying(false);
    el.currentTime = 0;

    try {
      const renderCanvas = document.createElement("canvas");
      let w = 720;
      let h = 1280;
      if (aspectRatio === "16:9") {
        w = 1280;
        h = 720;
      } else if (aspectRatio === "1:1") {
        w = 1080;
        h = 1080;
      } else if (aspectRatio === "4:5") {
        w = 1080;
        h = 1350;
      }
      renderCanvas.width = w;
      renderCanvas.height = h;
      const ctx = renderCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize 2D context");

      // Setup Web Audio recording destination
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const dest = audioCtx.createMediaStreamDestination();

      if (audioBufferRef.current) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(dest);
        source.connect(audioCtx.destination);
        source.start(0);
      }

      const stream = renderCanvas.captureStream(30);
      if (dest.stream.getAudioTracks().length > 0) {
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      }

      const mimeCandidates = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: chosenMime });
      const chunksData: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksData.push(e.data);
      };

      const recordDone = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(100);
      await el.play();

      const totalDur = duration || el.duration || 10;
      const interval = setInterval(() => {
        if (el.ended || el.currentTime >= totalDur) {
          clearInterval(interval);
          recorder.stop();
          el.pause();
        } else {
          renderSubtitleToCanvas(renderCanvas, ctx, el.currentTime, isVideo ? videoMediaRef.current : null);
          setExportProgress(Math.min(99, Math.round((el.currentTime / totalDur) * 100)));
        }
      }, 1000 / 30);

      await recordDone;
      audioCtx.close().catch(() => {});

      const blob = new Blob(chunksData, { type: chosenMime });
      const ext = chosenMime.includes("mp4") ? "mp4" : "webm";
      const baseName = file ? file.name.replace(/\.[^/.]+$/, "") : "creator-captions";
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${baseName}_captioned.${ext}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setExportProgress(100);
    } catch (err) {
      console.error("Export error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Video export failed.");
    } finally {
      setExportingVideo(false);
      if (wasPlaying && el) {
        el.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  // Caption Editing actions
  const handleUpdateChunkText = (id: string, newText: string) => {
    setChunks((prev) => prev.map((c) => (c.id === id ? { ...c, text: newText } : c)));
  };

  const handleUpdateChunkTiming = (id: string, field: "start" | "end", delta: number) => {
    setChunks((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = Math.max(0, Number((c[field] + delta).toFixed(2)));
          return { ...c, [field]: updated };
        }
        return c;
      })
    );
  };

  const handleDeleteChunk = (id: string) => {
    setChunks((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddChunk = () => {
    const last = chunks[chunks.length - 1];
    const newStart = last ? last.end + 0.1 : currentTime;
    const newEnd = newStart + 2.0;
    const newChunk: TranscriptChunk = {
      id: uid(),
      start: Number(newStart.toFixed(2)),
      end: Number(newEnd.toFixed(2)),
      text: "New subtitle line",
    };
    setChunks([...chunks, newChunk]);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
              <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
            </Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
                  Auto-Captions Studio
                </h1>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    padding: "3px 8px",
                    border: "2px solid #000",
                    background: "#FFDD00",
                    color: "#000",
                    fontFamily: "monospace",
                    boxShadow: "2px 2px 0 #000",
                  }}
                >
                  100% IN-BROWSER AI
                </span>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--text-hint)", marginTop: 4, margin: 0 }}>
                Zero API keys, zero limits. Transcribe audio/video locally via WebAssembly Whisper & burn viral animated subtitles.
              </p>
            </div>
          </div>

          {/* Engine Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "2px solid #000", padding: 4 }}>
            <button
              onClick={() => setEngineMode("whisper-wasm")}
              style={{
                padding: "6px 12px",
                border: "none",
                background: engineMode === "whisper-wasm" ? "#000" : "transparent",
                color: engineMode === "whisper-wasm" ? "#fff" : "#000",
                fontWeight: 800,
                fontSize: "0.74rem",
                fontFamily: "monospace",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Cpu size={14} /> Whisper WASM
            </button>
            <button
              onClick={() => setEngineMode("web-speech")}
              style={{
                padding: "6px 12px",
                border: "none",
                background: engineMode === "web-speech" ? "#000" : "transparent",
                color: engineMode === "web-speech" ? "#fff" : "#000",
                fontWeight: 800,
                fontSize: "0.74rem",
                fontFamily: "monospace",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Mic size={14} /> Web Speech API
            </button>
          </div>
        </div>

        {/* Hidden Audio & Video Elements for Sync */}
        {mediaUrl && (
          <>
            <video
              ref={videoMediaRef}
              src={mediaUrl}
              style={{ display: "none" }}
              muted={isMuted}
              playsInline
              onEnded={() => setIsPlaying(false)}
            />
            <audio
              ref={audioMediaRef}
              src={mediaUrl}
              style={{ display: "none" }}
              muted={isMuted}
              onEnded={() => setIsPlaying(false)}
            />
          </>
        )}

        {/* File Dropzone */}
        {!file && (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFileUpload(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="brutalist-card"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 40px",
              textAlign: "center",
              cursor: "pointer",
              border: `4px dashed ${isDragging ? "var(--accent)" : "#000000"}`,
              background: isDragging ? "rgba(94, 155, 198, 0.04)" : "#ffffff",
              boxShadow: "6px 6px 0 #000",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                border: "3px solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                background: "#FFDD00",
                boxShadow: "4px 4px 0 #000000",
              }}
            >
              <Video size={36} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Drop your Video or Audio here
            </h3>
            <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", maxWidth: 480, lineHeight: 1.5, fontWeight: 600 }}>
              MP4 · MOV · WebM · MP3 · WAV · M4A — Transcribed 100% locally on your machine.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button className="brutalist-button brutalist-button-primary" style={{ pointerEvents: "none" }}>
                Select File
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  srtInputRef.current?.click();
                }}
                className="brutalist-button"
              >
                Import Existing .SRT / .VTT
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={srtInputRef}
              type="file"
              accept=".srt,.vtt"
              style={{ display: "none" }}
              onChange={handleSrtUpload}
            />
          </div>
        )}

        {/* Progress & Status Banner */}
        {status !== "idle" && status !== "done" && (
          <div
            style={{
              marginBottom: 24,
              padding: "16px 20px",
              border: "3px solid #000",
              background: "#fff",
              boxShadow: "5px 5px 0 #000",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RefreshCw size={18} style={{ animation: "spin 1.5s linear infinite" }} />
                <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {progressMsg.toUpperCase()}
                </span>
              </div>
              <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.9rem" }}>{progressPct}%</span>
            </div>
            <div style={{ width: "100%", height: 12, border: "2px solid #000", background: "#f0f0f0" }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "#FFDD00",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              marginBottom: 24,
              padding: "16px 20px",
              border: "3px solid #ef4444",
              background: "#fef2f2",
              color: "#b91c1c",
              boxShadow: "4px 4px 0 #ef4444",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 4, fontFamily: "monospace" }}>ERROR OCCURRED</div>
            <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600 }}>{errorMsg}</p>
            <button
              onClick={() => setErrorMsg("")}
              className="brutalist-button"
              style={{ marginTop: 10, fontSize: "0.72rem", padding: "4px 10px" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Studio Workspace */}
        {file && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 480px) 1fr", gap: 24, alignItems: "start" }}>
            {/* Left Column: Video & Subtitle Preview Canvas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Eye size={18} />
                    <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                      LIVE PREVIEW & BURN-IN
                    </span>
                  </div>
                  {/* Aspect Ratio Switcher */}
                  <div style={{ display: "flex", border: "2px solid #000" }}>
                    {(["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        style={{
                          padding: "4px 8px",
                          border: "none",
                          background: aspectRatio === ar ? "#000" : "#fff",
                          color: aspectRatio === ar ? "#fff" : "#000",
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          fontFamily: "monospace",
                          cursor: "pointer",
                        }}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas Player */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxHeight: "520px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#000",
                    border: "3px solid #000",
                    boxShadow: "4px 4px 0 #000",
                    overflow: "hidden",
                  }}
                >
                  <canvas
                    ref={previewCanvasRef}
                    onClick={togglePlay}
                    style={{
                      maxHeight: "520px",
                      maxWidth: "100%",
                      objectFit: "contain",
                      cursor: "pointer",
                      display: "block",
                    }}
                  />
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 64,
                        height: 64,
                        border: "3px solid #000",
                        background: "#FFDD00",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "4px 4px 0 #000",
                      }}
                    >
                      <Play size={28} style={{ color: "#000", marginLeft: 4 }} />
                    </button>
                  )}
                </div>

                {/* Timeline Player Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={togglePlay}
                      className="brutalist-button"
                      style={{ padding: "8px 12px", background: isPlaying ? "#FFDD00" : "#fff" }}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={duration || 10}
                      step={0.05}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "#000", cursor: "pointer" }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 800 }}>
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                    <button
                      onClick={() => setIsMuted((v) => !v)}
                      className="brutalist-button"
                      style={{ padding: "8px" }}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                </div>

                {/* Export Burned-In Button */}
                <button
                  onClick={exportBurnedInVideo}
                  disabled={exportingVideo}
                  className="brutalist-button brutalist-button-primary"
                  style={{ width: "100%", padding: "12px 18px", fontSize: "0.85rem", justifyContent: "center" }}
                >
                  {exportingVideo ? (
                    <>
                      <RefreshCw size={16} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
                      Rendering Subtitles ({exportProgress}%)...
                    </>
                  ) : (
                    <>
                      <Download size={16} style={{ marginRight: 8 }} />
                      Burn & Export MP4 Video (100% In-Browser)
                    </>
                  )}
                </button>
              </div>

              {/* Viral Subtitle Presets Card */}
              <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "#FFDD00" }} />
                  <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                    VIRAL CAPTION PRESETS
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { id: "hormozi", name: "⚡ Hormozi Pop", font: "Archivo Black", color: "#FFDD00" },
                    { id: "ali-pill", name: "🟡 Ali Pill", font: "Inter", color: "#FFFFFF" },
                    { id: "neon", name: "🟣 Neon Glow", font: "Outfit", color: "#A855F7" },
                    { id: "karaoke", name: "🔤 Karaoke Sync", font: "Montserrat", color: "#22C55E" },
                    { id: "box", name: "🔲 Classic Box", font: "Inter", color: "#FFFFFF" },
                    { id: "typewriter", name: "🖋️ Typewriter", font: "Fira Code", color: "#E2E8F0" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPreset(p.id as CaptionPreset);
                        setFontFamily(p.font);
                        if (p.id === "hormozi") setHighlightColor("#FFDD00");
                        if (p.id === "neon") setHighlightColor("#A855F7");
                        if (p.id === "karaoke") setHighlightColor("#22C55E");
                      }}
                      className="brutalist-button"
                      style={{
                        padding: "10px",
                        fontSize: "0.76rem",
                        background: preset === p.id ? "#000" : "#fff",
                        color: preset === p.id ? "#fff" : "#000",
                        justifyContent: "flex-start",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Controls */}
              <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sliders size={18} />
                  <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                    TYPOGRAPHY & POSITIONING
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                      FONT FAMILY
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      style={{ width: "100%", padding: "6px", border: "2px solid #000", fontWeight: 800, fontSize: "0.75rem" }}
                    >
                      {GOOGLE_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                      FONT SIZE ({fontSize}px)
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={72}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      style={{ width: "100%", accentColor: "#000", cursor: "pointer" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                      Y POSITION ({yPosition}%)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={95}
                      value={yPosition}
                      onChange={(e) => setYPosition(parseInt(e.target.value, 10))}
                      style={{ width: "100%", accentColor: "#000", cursor: "pointer" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                        TEXT
                      </label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        style={{ width: 44, height: 32, border: "2px solid #000", cursor: "pointer" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                        HIGHLIGHT
                      </label>
                      <input
                        type="color"
                        value={highlightColor}
                        onChange={(e) => setHighlightColor(e.target.value)}
                        style={{ width: 44, height: 32, border: "2px solid #000", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #e5e5e5" }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isUppercase}
                      onChange={(e) => setIsUppercase(e.target.checked)}
                      style={{ accentColor: "#000" }}
                    />
                    ALL CAPS
                  </label>
                  <label style={{ fontSize: "0.74rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={showSafeZones}
                      onChange={(e) => setShowSafeZones(e.target.checked)}
                      style={{ accentColor: "#000" }}
                    />
                    TikTok / Reels Safe-Zones
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Editable Transcript Timeline & Export Hub */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Export Formats Hub */}
              <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Download size={18} />
                    <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                      EXPORT SUBTITLE FILES
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", fontFamily: "monospace", fontWeight: 800 }}>
                    {chunks.length} Lines Total
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                  <button
                    onClick={() => downloadFile("captions.srt", chunksToSrt(chunks), "application/x-subrip")}
                    className="brutalist-button"
                    style={{ fontSize: "0.74rem", padding: "8px 12px", justifyContent: "center" }}
                  >
                    <Download size={13} style={{ marginRight: 4 }} /> .SRT (Premiere)
                  </button>
                  <button
                    onClick={() => downloadFile("captions.vtt", chunksToVtt(chunks), "text/vtt")}
                    className="brutalist-button"
                    style={{ fontSize: "0.74rem", padding: "8px 12px", justifyContent: "center" }}
                  >
                    <Download size={13} style={{ marginRight: 4 }} /> .VTT (Web)
                  </button>
                  <button
                    onClick={() => downloadFile("captions.ass", chunksToAss(chunks, fontFamily, fontSize, textColor), "text/x-ssa")}
                    className="brutalist-button"
                    style={{ fontSize: "0.74rem", padding: "8px 12px", justifyContent: "center" }}
                  >
                    <Download size={13} style={{ marginRight: 4 }} /> .ASS (Styles)
                  </button>
                  <button
                    onClick={() => downloadFile("transcript.txt", chunks.map((c) => c.text).join(" "), "text/plain")}
                    className="brutalist-button"
                    style={{ fontSize: "0.74rem", padding: "8px 12px", justifyContent: "center" }}
                  >
                    <Download size={13} style={{ marginRight: 4 }} /> .TXT
                  </button>
                  <button
                    onClick={() => copyToClipboard(chunks.map((c) => c.text).join(" "), "transcript")}
                    className="brutalist-button"
                    style={{ fontSize: "0.74rem", padding: "8px 12px", justifyContent: "center" }}
                  >
                    {copiedKey === "transcript" ? <Check size={13} style={{ marginRight: 4 }} /> : <Copy size={13} style={{ marginRight: 4 }} />}
                    {copiedKey === "transcript" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Interactive Timeline Editor */}
              <div className="brutalist-card" style={{ padding: 18, background: "#fff", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={18} />
                    <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.84rem" }}>
                      INTERACTIVE TRANSCRIPT EDITOR
                    </span>
                  </div>
                  <button
                    onClick={handleAddChunk}
                    className="brutalist-button"
                    style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Line
                  </button>
                </div>

                {/* Subtitle List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: "560px",
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                >
                  {chunks.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.86rem", fontWeight: 600 }}>
                      No subtitle lines generated yet. Drop a file or click &quot;Add Line&quot;.
                    </div>
                  ) : (
                    chunks.map((chunk, index) => {
                      const isActive = index === activeChunkIndex;
                      return (
                        <div
                          key={chunk.id}
                          style={{
                            border: `2px solid ${isActive ? "#000" : "#e5e5e5"}`,
                            background: isActive ? "#FFFBEB" : "#FAFAFA",
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            boxShadow: isActive ? "3px 3px 0 #000" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {/* Timing Adjusters */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => handleSeek(chunk.start)}
                                className="brutalist-button"
                                style={{ padding: "2px 6px", fontSize: "0.68rem" }}
                                title="Jump to timestamp"
                              >
                                <Play size={10} style={{ marginRight: 2 }} />
                                {srtTime(chunk.start).substring(3, 8)}
                              </button>
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-hint)" }}>➔</span>
                              <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 800 }}>
                                {srtTime(chunk.end).substring(3, 8)}
                              </span>

                              {/* Fine-tuning nudges */}
                              <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
                                <button
                                  onClick={() => handleUpdateChunkTiming(chunk.id, "start", -0.1)}
                                  style={{ padding: "1px 4px", fontSize: "0.65rem", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                  title="-0.1s start"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleUpdateChunkTiming(chunk.id, "start", 0.1)}
                                  style={{ padding: "1px 4px", fontSize: "0.65rem", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                  title="+0.1s start"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Delete Line */}
                            <button
                              onClick={() => handleDeleteChunk(chunk.id)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: 2,
                              }}
                              title="Delete line"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Editable Text Area */}
                          <input
                            type="text"
                            value={chunk.text}
                            onChange={(e) => handleUpdateChunkText(chunk.id, e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid #000",
                              fontSize: "0.86rem",
                              fontWeight: 700,
                              background: "#fff",
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}