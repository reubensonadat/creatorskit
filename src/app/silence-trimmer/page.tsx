'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Music,
  Video as VideoIcon,
  Download,
  Play,
  Pause,
  Scissors,
  Sliders,
  PlayCircle,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Film,
  FileCode,
  FileSpreadsheet,
  Layers,
  Clock,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Check,
  ChevronLeft,
  Trash2,
  FileText,
  Upload,
  ArrowRight,
  Flame,
  Radio,
} from 'lucide-react';

const WINDOW_MS = 25; // 25ms time slices for sub-frame accuracy

interface CutRange {
  id: string;
  startMs: number;
  endMs: number;
}

interface KeptSegment {
  id: string;
  startMs: number;
  endMs: number;
}

const PACING_PRESETS = [
  {
    id: 'youtube-fast',
    name: '🚀 YouTube Viral Fast-Paced',
    desc: 'Tight, aggressive jump-cuts for high viewer retention (350ms gaps)',
    thresholdDb: -32,
    minGapMs: 350,
    paddingMs: 40,
  },
  {
    id: 'podcast-natural',
    name: '🎙️ Podcast & Interview Natural',
    desc: 'Removes awkward dead air while preserving natural speech cadence (700ms gaps)',
    thresholdDb: -38,
    minGapMs: 700,
    paddingMs: 90,
  },
  {
    id: 'lecture-clean',
    name: '🎓 Lecture / Tutorial Clean',
    desc: 'Removes long pauses and breathing breaks without clipping sentences (1100ms gaps)',
    thresholdDb: -42,
    minGapMs: 1100,
    paddingMs: 120,
  },
  {
    id: 'ultra-tight',
    name: '⚡ Ultra-Aggressive Jump Cut',
    desc: 'Cuts virtually all pauses for rapid-fire shorts & TikToks (250ms gaps)',
    thresholdDb: -28,
    minGapMs: 250,
    paddingMs: 25,
  },
];

// Helper: Format milliseconds to MM:SS.ms
const formatDuration = (ms: number): string => {
  const totalSec = Math.max(0, ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const millis = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
};

// Helper: Convert Decibels to Linear Amplitude (0 to 1)
const dbToLinear = (db: number) => Math.pow(10, db / 20);

// Helper: Encode AudioBuffer to Lossless WAV Blob
const encodeWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset + (i * numChannels + ch) * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

// Helper: Generate Adobe Premiere / DaVinci Resolve EDL File
const generateEDL = (fileName: string, segments: KeptSegment[], fps: number = 30): string => {
  const msToTc = (ms: number) => {
    const totalFrames = Math.round((ms / 1000) * fps);
    const f = totalFrames % fps;
    const s = Math.floor(totalFrames / fps) % 60;
    const m = Math.floor(totalFrames / (fps * 60)) % 60;
    const h = Math.floor(totalFrames / (fps * 3600));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  let edl = `TITLE: ${fileName.toUpperCase()} SILENCE CUT\nFCM: NON-DROP FRAME\n\n`;
  let recordCursorMs = 0;

  segments.forEach((seg, idx) => {
    const eventNum = String(idx + 1).padStart(3, '0');
    const srcIn = msToTc(seg.startMs);
    const srcOut = msToTc(seg.endMs);
    const recIn = msToTc(recordCursorMs);
    const durMs = seg.endMs - seg.startMs;
    recordCursorMs += durMs;
    const recOut = msToTc(recordCursorMs);

    edl += `${eventNum}  AX       AA/V  C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP NAME: ${fileName}\n\n`;
  });

  return edl;
};

// Helper: Generate Final Cut Pro FCPXML
const generateFCPXML = (fileName: string, segments: KeptSegment[], totalDurationMs: number): string => {
  const fps = 30;
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.9">\n  <resources>\n    <format id="r1" frameDuration="1/${fps}s" />\n    <asset id="r2" name="${fileName}" src="${fileName}" start="0s" duration="${(totalDurationMs / 1000).toFixed(3)}s" hasVideo="1" hasAudio="1" />\n  </resources>\n  <library>\n    <event name="Silence Cut">\n      <project name="${fileName} (Trimmed)">\n        <sequence format="r1">\n          <spine>\n`;

  segments.forEach((seg) => {
    const dur = ((seg.endMs - seg.startMs) / 1000).toFixed(3);
    const start = (seg.startMs / 1000).toFixed(3);
    xml += `            <clip name="${fileName}" offset="0s" duration="${dur}s" start="${start}s">\n              <video ref="r2" duration="${dur}s" start="${start}s" />\n            </clip>\n`;
  });

  xml += `          </spine>\n        </sequence>\n      </project>\n    </event>\n  </library>\n</fcpxml>`;
  return xml;
};

// Generate Synthetic Interactive Audio Buffers for 1-Click Demos
function createDemoAudioBuffer(type: 'podcast' | 'youtube' | 'tiktok'): AudioBuffer {
  const sampleRate = 44100;
  const durationSec = type === 'tiktok' ? 14 : type === 'youtube' ? 20 : 26;
  const totalSamples = sampleRate * durationSec;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const speechIntervals =
    type === 'tiktok'
      ? [[0.4, 2.5], [3.6, 5.8], [7.2, 9.8], [11.0, 13.5]] // fast speech
      : type === 'youtube'
      ? [[0.8, 3.8], [5.6, 9.0], [11.2, 15.0], [16.8, 19.5]] // youtube
      : [[1.0, 4.5], [7.0, 11.2], [13.8, 18.0], [20.5, 25.2]]; // podcast

  for (const [start, end] of speechIntervals) {
    const sIdx = Math.round(start * sampleRate);
    const eIdx = Math.round(end * sampleRate);
    for (let i = sIdx; i < eIdx; i++) {
      const t = (i - sIdx) / sampleRate;
      const voice =
        Math.sin(2 * Math.PI * 190 * t) * 0.45 +
        Math.sin(2 * Math.PI * 380 * t) * 0.25 +
        Math.sin(2 * Math.PI * 760 * t) * 0.15 +
        (Math.random() - 0.5) * 0.08;
      const envelope = Math.sin((t / (end - start)) * Math.PI);
      data[i] = voice * envelope * 0.85;
    }
  }

  return buffer;
}

export default function SilenceTrimmerPage() {
  // File & Media State
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [renderingVideo, setRenderingVideo] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Silence Detection Parameters
  const [thresholdDb, setThresholdDb] = useState<number>(-35); // -60dB to -15dB
  const [minGapMs, setMinGapMs] = useState<number>(450); // 150ms to 2500ms
  const [paddingMs, setPaddingMs] = useState<number>(60); // 10ms to 200ms
  const [crossfadeMs, setCrossfadeMs] = useState<number>(15); // 0ms to 50ms
  const [activePreset, setActivePreset] = useState<string>('custom');

  // Computed Cut Ranges & Segments
  const [cutRanges, setCutRanges] = useState<CutRange[]>([]);
  const [keptSegments, setKeptSegments] = useState<KeptSegment[]>([]);

  // Playback State
  const [isPlayingTrimmed, setIsPlayingTrimmed] = useState<boolean>(false);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [renderedCutVideoUrl, setRenderedCutVideoUrl] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Analyze & Compute Jump-Cut Ranges
  const computeSilenceCuts = useCallback((buf: AudioBuffer, threshDb: number, gapMs: number, padMs: number) => {
    const rawData = buf.getChannelData(0);
    const sampleRate = buf.sampleRate;
    const windowSize = Math.max(1, Math.round((WINDOW_MS / 1000) * sampleRate));
    const totalWindows = Math.floor(rawData.length / windowSize);
    const thresholdLin = dbToLinear(threshDb);

    const windowPeaks: number[] = new Array(totalWindows);
    for (let w = 0; w < totalWindows; w++) {
      let maxPeak = 0;
      const startIdx = w * windowSize;
      const endIdx = Math.min(startIdx + windowSize, rawData.length);
      for (let i = startIdx; i < endIdx; i++) {
        const absVal = Math.abs(rawData[i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
      windowPeaks[w] = maxPeak;
    }

    const isSpeech = (w: number) => windowPeaks[w] >= thresholdLin;
    const totalDurationMs = buf.duration * 1000;

    const firstSpeech = windowPeaks.findIndex(isSpeech);
    if (firstSpeech === -1) {
      return { cuts: [], kept: [{ id: 'seg-0', startMs: 0, endMs: totalDurationMs }] };
    }
    const lastSpeech = totalWindows - 1 - [...windowPeaks].reverse().findIndex(isSpeech);

    const cuts: CutRange[] = [];

    // Cut leading dead air
    const leadDeadMs = firstSpeech * WINDOW_MS;
    if (leadDeadMs > gapMs) {
      cuts.push({ id: `cut-lead`, startMs: 0, endMs: Math.max(0, leadDeadMs - padMs) });
    }

    // Detect internal pauses
    let silenceStartWindow = -1;
    for (let w = firstSpeech; w <= lastSpeech; w++) {
      if (!isSpeech(w)) {
        if (silenceStartWindow === -1) silenceStartWindow = w;
      } else {
        if (silenceStartWindow !== -1) {
          const pauseDurationMs = (w - silenceStartWindow) * WINDOW_MS;
          if (pauseDurationMs >= gapMs) {
            const rawCutStart = silenceStartWindow * WINDOW_MS + padMs;
            const rawCutEnd = w * WINDOW_MS - padMs;
            if (rawCutEnd > rawCutStart + 50) {
              cuts.push({ id: `cut-${cuts.length}`, startMs: rawCutStart, endMs: rawCutEnd });
            }
          }
          silenceStartWindow = -1;
        }
      }
    }

    // Cut trailing dead air
    const tailStartMs = (lastSpeech + 1) * WINDOW_MS + padMs;
    if (totalDurationMs - tailStartMs > gapMs) {
      cuts.push({ id: `cut-tail`, startMs: tailStartMs, endMs: totalDurationMs });
    }

    // Build kept segments
    const kept: KeptSegment[] = [];
    let currentCursor = 0;

    cuts.forEach((cut, idx) => {
      if (cut.startMs > currentCursor) {
        kept.push({ id: `seg-${idx}`, startMs: currentCursor, endMs: cut.startMs });
      }
      currentCursor = cut.endMs;
    });

    if (currentCursor < totalDurationMs) {
      kept.push({ id: `seg-${kept.length}`, startMs: currentCursor, endMs: totalDurationMs });
    }

    return { cuts, kept };
  }, []);

  // Update Segments on Parameter Change
  useEffect(() => {
    if (!audioBuffer) return;
    const { cuts, kept } = computeSilenceCuts(audioBuffer, thresholdDb, minGapMs, paddingMs);
    setCutRanges(cuts);
    setKeptSegments(kept);
  }, [audioBuffer, thresholdDb, minGapMs, paddingMs, computeSilenceCuts]);

  // Construct Trimmed AudioBuffer with Micro-Crossfades
  const trimmedAudioBuffer = useMemo(() => {
    if (!audioBuffer || keptSegments.length === 0) return null;

    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const totalTrimmedSamples = keptSegments.reduce(
      (sum, seg) => sum + Math.round(((seg.endMs - seg.startMs) / 1000) * sampleRate),
      0
    );

    const outBuf = new AudioBuffer({
      numberOfChannels: numChannels,
      length: totalTrimmedSamples,
      sampleRate: sampleRate,
    });

    let writeOffset = 0;
    const crossfadeSamples = Math.min(256, Math.round((crossfadeMs / 1000) * sampleRate));

    for (const seg of keptSegments) {
      const startSample = Math.round((seg.startMs / 1000) * sampleRate);
      const endSample = Math.round((seg.endMs / 1000) * sampleRate);
      const segLength = endSample - startSample;

      for (let ch = 0; ch < numChannels; ch++) {
        const srcData = audioBuffer.getChannelData(ch);
        const destData = outBuf.getChannelData(ch);
        const chunk = srcData.subarray(startSample, endSample);
        destData.set(chunk, writeOffset);

        // Fade in
        for (let f = 0; f < crossfadeSamples && f < segLength; f++) {
          destData[writeOffset + f] *= f / crossfadeSamples;
        }

        // Fade out
        for (let f = 0; f < crossfadeSamples && f < segLength; f++) {
          const idx = writeOffset + segLength - 1 - f;
          destData[idx] *= f / crossfadeSamples;
        }
      }

      writeOffset += segLength;
    }

    return outBuf;
  }, [audioBuffer, keptSegments, crossfadeMs]);

  // File Upload Handler
  const handleFileUpload = async (uploadedFile: File | undefined) => {
    if (!uploadedFile) return;
    setProcessing(true);
    setError('');
    setRenderedCutVideoUrl(null);
    setFile(uploadedFile);
    setFileName(uploadedFile.name);

    const isVid = uploadedFile.type.startsWith('video/');
    setIsVideo(isVid);

    if (isVid) {
      const url = URL.createObjectURL(uploadedFile);
      setVideoUrl(url);
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      audioCtxRef.current = ctx;

      const arrayBuf = await uploadedFile.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);

      const { cuts, kept } = computeSilenceCuts(decoded, thresholdDb, minGapMs, paddingMs);
      setCutRanges(cuts);
      setKeptSegments(kept);
    } catch (err) {
      console.error(err);
      setError('Could not decode audio track. Please upload a standard MP4, WebM, MOV, WAV, or MP3 file.');
    } finally {
      setProcessing(false);
    }
  };

  // Load Built-in Demo Samples
  const loadDemoSample = (type: 'podcast' | 'youtube' | 'tiktok') => {
    setProcessing(true);
    setError('');
    setRenderedCutVideoUrl(null);
    setFile(new File(['demo'], `${type}-studio-take.wav`, { type: 'audio/wav' }));
    setFileName(`${type.toUpperCase()}_STUDIO_TAKE.WAV`);
    setIsVideo(false);
    setVideoUrl(null);

    setTimeout(() => {
      const demoBuf = createDemoAudioBuffer(type);
      setAudioBuffer(demoBuf);
      const preset = type === 'tiktok' ? PACING_PRESETS[3] : type === 'youtube' ? PACING_PRESETS[0] : PACING_PRESETS[1];
      setThresholdDb(preset.thresholdDb);
      setMinGapMs(preset.minGapMs);
      setPaddingMs(preset.paddingMs);
      setActivePreset(preset.id);

      const { cuts, kept } = computeSilenceCuts(demoBuf, preset.thresholdDb, preset.minGapMs, preset.paddingMs);
      setCutRanges(cuts);
      setKeptSegments(kept);
      setProcessing(false);
    }, 150);
  };

  // Video Jump-Cutting Playback Engine (Skips silence ranges in real-time)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo || keptSegments.length === 0) return;

    const handleTimeUpdate = () => {
      const currentMs = video.currentTime * 1000;
      setCurrentTimeMs(currentMs);

      for (const cut of cutRanges) {
        if (currentMs >= cut.startMs && currentMs < cut.endMs) {
          video.currentTime = (cut.endMs + 10) / 1000;
          break;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isVideo, cutRanges, keptSegments]);

  // Draw Audio Waveform with Decibel Grid, Red Cut Zones & Green Kept Zones
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth * dpr;
    const H = 160 * dpr;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = audioBuffer.getChannelData(0);
    const durationMs = audioBuffer.duration * 1000;
    const samplesPerPixel = Math.max(1, Math.floor(data.length / W));
    const midY = H / 2;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    // Draw Decibel Grid Lines
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = `${9 * dpr}px monospace`;
    [-12, -24, -36, -48].forEach((db) => {
      const lin = dbToLinear(db);
      const yOffset = lin * midY * 0.95;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([2, 4]);

      ctx.beginPath();
      ctx.moveTo(0, midY - yOffset);
      ctx.lineTo(W, midY - yOffset);
      ctx.moveTo(0, midY + yOffset);
      ctx.lineTo(W, midY + yOffset);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(`${db} dB`, 8 * dpr, midY - yOffset - 3);
    });
    ctx.setLineDash([]);

    // Draw Red Cut Silence Zones
    ctx.fillStyle = 'rgba(239, 68, 68, 0.32)';
    for (const cut of cutRanges) {
      const x0 = (cut.startMs / durationMs) * W;
      const x1 = (cut.endMs / durationMs) * W;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), H);
    }

    // Draw Threshold Line in Bright Amber
    const threshLin = dbToLinear(thresholdDb);
    const threshY = threshLin * midY * 0.95;
    ctx.strokeStyle = '#FFE500';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY - threshY);
    ctx.lineTo(W, midY - threshY);
    ctx.moveTo(0, midY + threshY);
    ctx.lineTo(W, midY + threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Threshold Tag
    ctx.fillStyle = '#FFE500';
    ctx.fillRect(W - 85 * dpr, midY - threshY - 12 * dpr, 80 * dpr, 14 * dpr);
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${8 * dpr}px monospace`;
    ctx.fillText(`CUT: ${thresholdDb} dB`, W - 80 * dpr, midY - threshY - 2 * dpr);

    // Draw Audio Waveform Bars
    for (let x = 0; x < W; x++) {
      let maxPeak = 0;
      const startIdx = Math.floor((x / W) * data.length);
      const endIdx = Math.min(startIdx + samplesPerPixel, data.length);
      for (let i = startIdx; i < endIdx; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }

      const barHeight = Math.max(2, maxPeak * midY * 0.95);
      const currentMs = (x / W) * durationMs;

      const isInsideCut = cutRanges.some((c) => currentMs >= c.startMs && currentMs <= c.endMs);
      ctx.fillStyle = isInsideCut ? '#ef4444' : '#22c55e';

      ctx.fillRect(x, midY - barHeight, 1.2 * dpr, barHeight * 2);
    }

    // Draw Scissor Cut Borders
    ctx.fillStyle = '#ef4444';
    for (const cut of cutRanges) {
      const x0 = (cut.startMs / durationMs) * W;
      const x1 = (cut.endMs / durationMs) * W;
      ctx.fillRect(x0, 0, 2 * dpr, H);
      ctx.fillRect(x1 - 2 * dpr, 0, 2 * dpr, H);
    }

    // Draw Playhead
    if (currentTimeMs > 0) {
      const playheadX = (currentTimeMs / durationMs) * W;
      ctx.fillStyle = '#FFE500';
      ctx.fillRect(playheadX - 1.5, 0, 3 * dpr, H);
    }
  }, [audioBuffer, cutRanges, thresholdDb, currentTimeMs]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Audio Playback Controller
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    setIsPlayingOriginal(false);
    setIsPlayingTrimmed(false);
  };

  const playBuffer = (buf: AudioBuffer, mode: 'orig' | 'trim') => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    audioCtxRef.current.resume();

    stopAudio();

    if ((mode === 'orig' && isPlayingOriginal) || (mode === 'trim' && isPlayingTrimmed)) {
      return;
    }

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buf;
    source.connect(audioCtxRef.current.destination);
    source.onended = () => stopAudio();

    source.start(0);
    sourceNodeRef.current = source;

    if (mode === 'orig') setIsPlayingOriginal(true);
    if (mode === 'trim') setIsPlayingTrimmed(true);
  };

  // Video Render & Export with MediaRecorder
  const renderCutVideo = async () => {
    const video = videoRef.current;
    if (!video || !isVideo || keptSegments.length === 0) return;

    setRenderingVideo(true);
    setRenderProgress(0);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    const audioStream = (video as any).captureStream ? (video as any).captureStream().getAudioTracks() : [];
    if (audioStream.length > 0) stream.addTrack(audioStream[0]);

    // Check supported MIME types (MP4 first if browser supports it)
    const mimeTypesToTry = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264',
      'video/webm',
    ];
    let selectedMime = 'video/webm';
    for (const m of mimeTypesToTry) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    const isMp4 = selectedMime.includes('mp4');
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 10_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRenderedCutVideoUrl(url);
      setRenderingVideo(false);
    };

    recorder.start(200);

    const totalTrimmedDurationMs = keptSegments.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
    let processedMs = 0;

    for (const seg of keptSegments) {
      video.currentTime = seg.startMs / 1000;
      await new Promise((r) => setTimeout(r, 60));

      const segDurationMs = seg.endMs - seg.startMs;
      const stepFrames = Math.round((segDurationMs / 1000) * 30);

      for (let f = 0; f < stepFrames; f++) {
        video.currentTime = (seg.startMs + (f / 30) * 1000) / 1000;
        await new Promise((r) => setTimeout(r, 33));
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        processedMs += 33;
        setRenderProgress(Math.min(99, Math.round((processedMs / totalTrimmedDurationMs) * 100)));
      }
    }

    recorder.stop();
  };

  // Export Timeline Files
  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Telemetry Calculations
  const origDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 0;
  const trimmedDurationMs = trimmedAudioBuffer ? trimmedAudioBuffer.duration * 1000 : 0;
  const timeSavedMs = Math.max(0, origDurationMs - trimmedDurationMs);
  const timeSavedPercent = origDurationMs > 0 ? Math.round((timeSavedMs / origDurationMs) * 100) : 0;

  return (
    <div className="tool-page-padding" style={{ background: '#f4f4f5', minHeight: '100vh', color: '#000000', padding: '36px 24px 96px', overflow: 'hidden', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Top Studio Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  background: '#FFE500',
                  color: '#000',
                  padding: '3px 8px',
                  border: '2px solid #000',
                  borderRadius: 4,
                }}
              >
                STUDIO VIDEO & AUDIO CUTTER
              </span>
              <span style={{ fontSize: '0.68rem', color: '#666', fontFamily: 'monospace', fontWeight: 800 }}>
                ZERO QUALITY LOSS · CLIENT-SIDE NLE TIMELINES
              </span>
            </div>

            <h1 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
              Silence Trimmer & Jump-Cutter
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#555', maxWidth: 740, lineHeight: 1.5, margin: '8px 0 0', fontWeight: 500 }}>
              Instantly cut out dead pauses, breath pauses, and speech silence in videos or podcasts. Export clean trimmed video, master WAVs, or direct <strong>Premiere Pro / DaVinci Resolve EDL timelines</strong> without re-encoding!
            </p>
          </div>
        </div>

        {/* ── Standout Neo-Brutalist Upload Dropzone & Demo Cards ── */}
        {!file && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileUpload(e.dataTransfer.files?.[0]);
              }}
              style={{
                padding: '54px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                cursor: 'pointer',
                background: isDragOver ? '#fef08a' : '#ffffff',
                border: '4px solid #000000',
                borderRadius: 6,
                boxShadow: '8px 8px 0px #000000',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="file"
                accept="video/*,audio/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />

              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#FFE500',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0 #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scissors size={32} />
              </div>

              <div>
                <span style={{ fontWeight: 900, fontSize: '1.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                  Upload Raw Video or Audio File to Trim
                </span>
                <span style={{ fontSize: '0.82rem', color: '#666', fontFamily: 'monospace', fontWeight: 700, marginTop: 4, display: 'block' }}>
                  Supports MP4 · WebM · MOV · WAV · MP3 · M4A · OGG (Runs 100% locally in your browser)
                </span>
              </div>

              <div
                className="brutalist-button brutalist-button-primary"
                style={{ padding: '12px 28px', fontSize: '0.88rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Upload size={16} />
                Select File from Computer
              </div>
            </label>

            {/* 1-Click Interactive Demo Samples Grid */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <PlayCircle size={14} />
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', color: '#555' }}>
                  Don't have a file ready? Try a 1-Click Interactive Studio Sample:
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  {
                    id: 'youtube',
                    title: '🎬 YouTube Video Take',
                    sub: '20s clip with 4 awkward pauses and stutters',
                    badge: 'FAST PACING',
                  },
                  {
                    id: 'podcast',
                    title: '🎙️ Podcast Interview',
                    sub: '26s conversation with dead air pauses',
                    badge: 'NATURAL CADENCE',
                  },
                  {
                    id: 'tiktok',
                    title: '📱 TikTok / Reel Short',
                    sub: '14s fast speech with quick breath cuts',
                    badge: 'ULTRA-TIGHT',
                  },
                ].map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => loadDemoSample(sample.id as any)}
                    className="brutalist-card"
                    style={{
                      padding: 16,
                      background: '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.88rem', fontFamily: 'monospace' }}>{sample.title}</span>
                      <span style={{ fontSize: '0.58rem', background: '#FFE500', border: '1px solid #000', padding: '1px 5px', borderRadius: 3, fontWeight: 900 }}>
                        {sample.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#666', lineHeight: 1.3 }}>{sample.sub}</span>
                    <span style={{ fontSize: '0.66rem', fontWeight: 900, fontFamily: 'monospace', color: '#000', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      Load Sample Demo <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Studio Workspace After Upload */}
        {file && audioBuffer && (
          <div className="tool-inner-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
            {/* Left Column: Player, Timeline & Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Media Player Card */}
              <div className="brutalist-card" style={{ padding: 18, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 900, fontSize: '0.92rem', fontFamily: 'monospace' }}>{fileName}</span>
                    <span style={{ fontSize: '0.65rem', background: isVideo ? '#dcfce7' : '#e0e7ff', border: '1.5px solid #000', padding: '2px 8px', borderRadius: 3, fontWeight: 900 }}>
                      {isVideo ? 'VIDEO MEDIA' : 'AUDIO MASTER'}
                    </span>
                  </div>

                  <label
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      background: '#f4f4f5',
                      padding: '4px 10px',
                      border: '1.5px solid #000',
                      borderRadius: 4,
                    }}
                  >
                    Replace Clip
                    <input
                      type="file"
                      accept="video/*,audio/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>

                {/* Video Screen Preview (If video) */}
                {isVideo && videoUrl && (
                  <div style={{ position: 'relative', width: '100%', maxHeight: 380, background: '#000', borderRadius: 4, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      playsInline
                      style={{ maxHeight: 380, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}

                {/* High-Resolution Waveform Inspector with dB Grid */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span>AUDIO WAVEFORM & DECIBEL INSPECTOR:</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803d' }}>
                        <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} /> Kept Speech
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b91c1c' }}>
                        <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} /> Cut Silence ({cutRanges.length} zones)
                      </span>
                    </div>

                    <span>{formatDuration(currentTimeMs)} / {formatDuration(origDurationMs)}</span>
                  </div>

                  <canvas
                    ref={canvasRef}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const targetMs = (clickX / rect.width) * origDurationMs;
                      setCurrentTimeMs(targetMs);
                      if (videoRef.current) videoRef.current.currentTime = targetMs / 1000;
                    }}
                    style={{ width: '100%', height: 160, border: '3px solid #000', borderRadius: 4, background: '#09090b', cursor: 'crosshair' }}
                  />
                </div>

                {/* Playback Controls & Quick Trimming Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => {
                        if (trimmedAudioBuffer) playBuffer(trimmedAudioBuffer, 'trim');
                      }}
                      className="brutalist-button brutalist-button-primary"
                      style={{
                        padding: '10px 20px',
                        fontSize: '0.82rem',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0 #000',
                      }}
                    >
                      {isPlayingTrimmed ? <Pause size={17} /> : <Play size={17} />}
                      {isPlayingTrimmed ? 'Pause Trimmed' : 'Play Trimmed Preview'}
                    </button>

                    <button
                      onClick={() => {
                        if (audioBuffer) playBuffer(audioBuffer, 'orig');
                      }}
                      className="brutalist-button"
                      style={{
                        padding: '10px 20px',
                        fontSize: '0.82rem',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#ffffff',
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0 #000',
                      }}
                    >
                      {isPlayingOriginal ? <Pause size={17} /> : <Play size={17} />}
                      Play Original
                    </button>
                  </div>

                  <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                    Click waveform to scrub playhead
                  </span>
                </div>
              </div>

              {/* Real-Time Savings Telemetry Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div className="brutalist-card" style={{ padding: 14, background: '#ffffff', borderRadius: 4 }}>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>ORIGINAL DURATION</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace' }}>{formatDuration(origDurationMs)}</span>
                </div>

                <div className="brutalist-card" style={{ padding: 14, background: '#ffffff', borderRadius: 4 }}>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>NEW TRIMMED DURATION</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#15803d' }}>{formatDuration(trimmedDurationMs)}</span>
                </div>

                <div className="brutalist-card" style={{ padding: 14, background: '#FFE500', borderRadius: 4 }}>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', display: 'block' }}>TIME SAVED</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace' }}>-{formatDuration(timeSavedMs)} ({timeSavedPercent}%)</span>
                </div>

                <div className="brutalist-card" style={{ padding: 14, background: '#ffffff', borderRadius: 4 }}>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', display: 'block' }}>TOTAL JUMP CUTS</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace' }}>{cutRanges.length} Cuts</span>
                </div>
              </div>
            </div>

            {/* Right Column: Silence Controls & Export Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Pacing Presets */}
              <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} />
                  Pacing Presets
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PACING_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setThresholdDb(p.thresholdDb);
                        setMinGapMs(p.minGapMs);
                        setPaddingMs(p.paddingMs);
                        setActivePreset(p.id);
                      }}
                      style={{
                        padding: '8px 10px',
                        border: '1.5px solid #000',
                        borderRadius: 4,
                        background: activePreset === p.id ? '#000' : '#f4f4f5',
                        color: activePreset === p.id ? '#fff' : '#000',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', display: 'block' }}>{p.name}</span>
                      <span style={{ fontSize: '0.62rem', opacity: 0.8, display: 'block', marginTop: 2 }}>{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Parameters Slider Card */}
              <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={14} />
                  Silence Detection Engine
                </label>

                {/* Silence Threshold dB Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                    <span>SILENCE THRESHOLD:</span>
                    <span style={{ color: '#d97706' }}>{thresholdDb} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="-15"
                    step="1"
                    value={thresholdDb}
                    onChange={(e) => {
                      setThresholdDb(parseInt(e.target.value));
                      setActivePreset('custom');
                    }}
                    style={{ width: '100%', accentColor: '#000' }}
                  />
                  <span style={{ fontSize: '0.6rem', color: '#666', display: 'block', marginTop: 2 }}>
                    Lower dB = only detects dead silence. Higher dB = cuts soft breathing.
                  </span>
                </div>

                {/* Min Pause Length Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                    <span>MINIMUM SILENCE LENGTH:</span>
                    <span>{minGapMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="2000"
                    step="25"
                    value={minGapMs}
                    onChange={(e) => {
                      setMinGapMs(parseInt(e.target.value));
                      setActivePreset('custom');
                    }}
                    style={{ width: '100%', accentColor: '#000' }}
                  />
                  <span style={{ fontSize: '0.6rem', color: '#666', display: 'block', marginTop: 2 }}>
                    Pauses shorter than this duration are kept for natural breathing.
                  </span>
                </div>

                {/* Pre/Post Padding Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, marginBottom: 4 }}>
                    <span>SPEECH PADDING BUFFER:</span>
                    <span>{paddingMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={paddingMs}
                    onChange={(e) => {
                      setPaddingMs(parseInt(e.target.value));
                      setActivePreset('custom');
                    }}
                    style={{ width: '100%', accentColor: '#000' }}
                  />
                  <span style={{ fontSize: '0.6rem', color: '#666', display: 'block', marginTop: 2 }}>
                    Adds breathing margins before and after words so consonants are never clipped.
                  </span>
                </div>
              </div>

              {/* Pro Export Suite Card */}
              <div className="brutalist-card" style={{ padding: 16, background: '#ffffff', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} />
                  Export Trimmed Master & Timelines
                </label>

                {/* Export Lossless Master WAV */}
                {trimmedAudioBuffer && (
                  <button
                    onClick={() => {
                      const wavBlob = encodeWav(trimmedAudioBuffer);
                      const url = URL.createObjectURL(wavBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${fileName.replace(/\.[^/.]+$/, '')}-silence-trimmed.wav`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="brutalist-button brutalist-button-primary"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '0.82rem',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      border: '2px solid #000',
                      boxShadow: '3px 3px 0 #000',
                    }}
                  >
                    <Volume2 size={18} />
                    Download Trimmed WAV Audio
                  </button>
                )}

                {/* Render Cut Video (If Video) */}
                {isVideo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!renderingVideo ? (
                      <button
                        onClick={renderCutVideo}
                        className="brutalist-button"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '0.82rem',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: '#09090b',
                          color: '#ffffff',
                          border: '2px solid #000',
                          boxShadow: '3px 3px 0 #000',
                        }}
                      >
                        <Film size={18} style={{ color: '#FFE500' }} />
                        Render Trimmed Video (.WebM)
                      </button>
                    ) : (
                      <div style={{ padding: 12, background: '#fef08a', border: '2px solid #000', borderRadius: 4, textAlign: 'center', boxShadow: '2px 2px 0 #000' }}>
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 900 }}>
                          Rendering Jump-Cut Video: {renderProgress}%
                        </span>
                      </div>
                    )}

                    {renderedCutVideoUrl && (
                      <a
                        href={renderedCutVideoUrl}
                        download={`${fileName.replace(/\.[^/.]+$/, '')}-cut.webm`}
                        className="brutalist-button brutalist-button-primary"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          borderRadius: 4,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          border: '2px solid #000',
                          boxShadow: '3px 3px 0 #000',
                        }}
                      >
                        <Download size={16} />
                        Download Rendered Video (.WebM)
                      </a>
                    )}
                  </div>
                )}

                {/* Pro NLE Timelines Export (EDL / FCPXML / CSV) */}
                <div style={{ paddingTop: 10, borderTop: '2px solid #000', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                    LOSSLESS EDITING TIMELINES (PREMIERE / DAVINCI):
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => {
                        const edl = generateEDL(fileName, keptSegments, 30);
                        downloadFile(edl, `${fileName.replace(/\.[^/.]+$/, '')}-cuts.edl`, 'text/plain');
                      }}
                      className="brutalist-button"
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.72rem',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#ffffff',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0 #000',
                      }}
                      title="Adobe Premiere Pro & DaVinci Resolve EDL"
                    >
                      <FileCode size={15} />
                      Export .EDL
                    </button>

                    <button
                      onClick={() => {
                        const fcpxml = generateFCPXML(fileName, keptSegments, origDurationMs);
                        downloadFile(fcpxml, `${fileName.replace(/\.[^/.]+$/, '')}-cuts.fcpxml`, 'application/xml');
                      }}
                      className="brutalist-button"
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.72rem',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#ffffff',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0 #000',
                      }}
                      title="Final Cut Pro XML"
                    >
                      <FileCode size={15} />
                      Export .FCPXML
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const csvHeader = 'Segment #,Start Timecode,End Timecode,Duration (sec)\n';
                      const csvRows = keptSegments.map((s, idx) => `${idx + 1},${formatDuration(s.startMs)},${formatDuration(s.endMs)},${((s.endMs - s.startMs) / 1000).toFixed(2)}`).join('\n');
                      downloadFile(csvHeader + csvRows, `${fileName.replace(/\.[^/.]+$/, '')}-markers.csv`, 'text/csv');
                    }}
                    className="brutalist-button"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.72rem',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#ffffff',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    Export CSV Cut Marker Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}