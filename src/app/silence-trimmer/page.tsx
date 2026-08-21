"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Music,
  Download,
  Play,
  Pause,
  Scissors,
} from "lucide-react";

const WINDOW_MS = 50;
const MIN_GAP_MS = 700;

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

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset + (i * numChannels + ch) * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
};

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}.${String(Math.round((ms % 1000) / 10)).padStart(2, "0")}`;
};

const seconds = (ms: number) => ms / 1000;

export default function SilenceTrimmerPage() {
  const [audioName, setAudioName] = useState("");
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState(0.004);
  const [minGapMs, setMinGapMs] = useState(MIN_GAP_MS);
  const [segments, setSegments] = useState<Array<{ start: number; end: number }>>([]);
  const [cutRanges, setCutRanges] = useState<Array<{ start: number; end: number }>>([]);
  const [playState, setPlayState] = useState<"orig" | "trim" | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const trimmedBuffer = useMemo(() => {
    if (!buffer || segments.length === 0) return null;
    const totalSamples = segments.reduce(
      (acc, seg) => acc + Math.round(seconds(seg.end - seg.start) * buffer.sampleRate),
      0
    );
    const out = new AudioBuffer({
      numberOfChannels: buffer.numberOfChannels,
      length: totalSamples,
      sampleRate: buffer.sampleRate,
    });
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) channels.push(out.getChannelData(ch));

    let write = 0;
    for (const seg of segments) {
      const start = Math.round(seconds(seg.start) * buffer.sampleRate);
      const end = Math.round(seconds(seg.end) * buffer.sampleRate);
      const len = end - start;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        channels[ch].set(buffer.getChannelData(ch).subarray(start, end), write);
      }
      write += len;
    }
    return out;
  }, [buffer, segments]);

  const analyze = (audioBuffer: AudioBuffer) => {
    setProcessing(true);
    try {
      const result = computeCuts(audioBuffer, threshold, minGapMs);
      setSegments(result.kept);
      setCutRanges(result.cuts);
      setError("");
    } catch {
      setError("Could not analyze this audio file.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(await reader.result as ArrayBuffer);
        setAudioName(file.name);
        setBuffer(decoded);
        setPlayState(null);
        stopPlayback();
        analyze(decoded);
      } catch {
        setError("Unsupported or corrupted audio file — try WAV, MP3 or M4A.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const stopPlayback = () => {
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    setPlayState(null);
  };

  const play = (src: AudioBuffer, kind: "orig" | "trim") => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    audioCtxRef.current.resume();
    if (playState === kind) {
      stopPlayback();
      return;
    }
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = src;
    source.connect(audioCtxRef.current.destination);
    source.onended = () => {
      sourceRef.current = null;
      setPlayState(null);
    };
    source.start();
    sourceRef.current = source;
    setPlayState(kind);
  };

  // Waveform with removed regions shaded
  const drawWave = (audioBuffer: AudioBuffer, cuts: Array<{ start: number; end: number }>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth * dpr;
    const H = 88 * dpr;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    const samplesPerPx = Math.max(1, Math.floor(data.length / W));
    const mid = H / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Cut shading
    ctx.fillStyle = "rgba(185, 28, 28, 0.14)";
    for (const cut of cuts) {
      const x0 = (cut.start / 1000 / duration) * W;
      const x1 = (cut.end / 1000 / duration) * W;
      ctx.fillRect(x0, 0, x1 - x0, H);
    }

    ctx.strokeStyle = "#1E2224";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      let peak = 0;
      const start = Math.floor((x / W) * data.length);
      for (let i = start; i < Math.min(start + samplesPerPx, data.length); i++) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
      const h = Math.max(1, (peak || 0.004) * mid * 0.95);
      ctx.moveTo(x, mid - h);
      ctx.lineTo(x, mid + h);
    }
    ctx.stroke();

    // Cut markers
    ctx.fillStyle = "#b91c1c";
    for (const cut of cuts) {
      const x0 = (cut.start / 1000 / duration) * W;
      const x1 = (cut.end / 1000 / duration) * W;
      ctx.fillRect(x0, 0, 2 * dpr, H);
      ctx.fillRect(x1 - 2 * dpr, 0, 2 * dpr, H);
    }
  };

  // Re-draw when buffer/threshold/segments change
  useEffect(() => {
    if (!buffer) return;
    const raf = requestAnimationFrame(() => drawWave(buffer, cutRanges));
    return () => cancelAnimationFrame(raf);
  }, [buffer, cutRanges, threshold]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "var(--accent)", letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Audio Cut
        </span>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#000", textTransform: "uppercase", marginBottom: 10 }}>
          Silence Trimmer
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", maxWidth: 640, lineHeight: 1.6, fontWeight: 500, marginBottom: 36 }}>
          Cut leading dead air, trailing tail and long mid-pauses out of a voiceover or podcast clip,
          then export a tight WAV. All analysis and trimming happen locally in your browser.
        </p>

        <label
          className="dropzone-panel"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", textAlign: "center" }}
        >
          <input
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          <Music size={40} style={{ color: "var(--accent)" }} />
          <span style={{ fontWeight: 900, fontSize: "1.02rem", color: "#000" }}>
            {buffer ? "Choose another clip…" : "Drop an audio clip"}
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-hint)", fontWeight: 600, fontFamily: "monospace" }}>
            WAV · MP3 · M4A — stays on this device
          </span>
        </label>

        {error && (
          <div className="brutalist-card" style={{ marginTop: 20, padding: "14px 18px", background: "#fef2f2", color: "#b91c1c", fontWeight: 800, fontSize: "0.82rem" }}>
            {error}
          </div>
        )}

        {buffer && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="brutalist-card" style={{ padding: 20, gap: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#000" }}>
                  {audioName || "Clip"} <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem", color: "var(--text-hint)", marginLeft: 8 }}>
                    {processing ? "Analyzing…" : formatDuration(buffer.duration * 1000)}
                  </span>
                </div>
                <button className="brutalist-button" onClick={() => play(buffer, "orig")} style={{ fontSize: "0.74rem", padding: "8px 12px" }}>
                  {playState === "orig" ? (
                    <>
                      <Pause size={12} style={{ marginRight: 6 }} />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={12} style={{ marginRight: 6 }} />
                      Listen to original
                    </>
                  )}
                </button>
              </div>

              <canvas ref={canvasRef} style={{ width: "100%", height: 88, border: "2px solid #000", background: "#fff" }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <div className="ctrl-label" style={{ margin: 0 }}>
                  <label htmlFor="threshold" className="ctrl-label">Silence level (loudness threshold)</label>
                  <input
                    id="threshold"
                    type="range"
                    min={0.001}
                    max={0.02}
                    step={0.0005}
                    value={threshold}
                    onChange={(e) => {
                      setThreshold(Number(e.target.value));
                      if (buffer) {
                        const result = computeCuts(buffer, Number(e.target.value), minGapMs);
                        setSegments(result.kept);
                        setCutRanges(result.cuts);
                      }
                    }}
                  />
                  <span className="ctrl-label" style={{ margin: 0, fontFamily: "monospace", fontSize: "0.72rem" }}>
                    {Math.round(threshold * 1000) * 10}‰ peak
                  </span>
                </div>
                <div className="ctrl-label" style={{ margin: 0 }}>
                  <label htmlFor="mingap" className="ctrl-label">Cut pauses longer than…</label>
                  <input
                    id="mingap"
                    type="range"
                    min={300}
                    max={2500}
                    step={50}
                    value={minGapMs}
                    onChange={(e) => {
                      setMinGapMs(Number(e.target.value));
                      if (buffer) {
                        const result = computeCuts(buffer, threshold, Number(e.target.value));
                        setSegments(result.kept);
                        setCutRanges(result.cuts);
                      }
                    }}
                  />
                  <span className="ctrl-label" style={{ margin: 0, fontFamily: "monospace", fontSize: "0.72rem" }}>
                    {minGapMs} ms
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: "0.78rem", fontWeight: 800, fontFamily: "monospace" }}>
                <span className="stat-chip">Original {formatDuration(buffer.duration * 1000)}</span>
                {trimmedBuffer && (
                  <span className="stat-chip">Trimmed {formatDuration(trimmedBuffer.duration * 1000)} (−{Math.round((1 - trimmedBuffer.duration / buffer.duration) * 100)}%)</span>
                )}
                <span className="stat-chip">
                  <Scissors size={12} style={{ marginRight: 4, display: "inline-block", verticalAlign: "-2px" }} />
                  {Math.max(0, segments.length - 1)} cut{segments.length - 1 === 1 ? "" : "s"}
                </span>
              </div>

              {trimmedBuffer && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="brutalist-button" onClick={() => play(trimmedBuffer, "trim")} style={{ fontSize: "0.8rem", padding: "10px 16px" }}>
                    {playState === "trim" ? (
                      <>
                        <Pause size={14} style={{ marginRight: 6 }} />
                        Pause trimmed
                      </>
                    ) : (
                      <>
                        <Play size={14} style={{ marginRight: 6 }} />
                        Listen to trimmed
                      </>
                    )}
                  </button>
                  <button
                    className="brutalist-button brutalist-button-primary"
                    onClick={() => {
                      const blob = encodeWav(trimmedBuffer);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${(audioName || "clip").replace(/\.\w+$/, "")}-trimmed.wav`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setDownloaded(true);
                      window.setTimeout(() => setDownloaded(false), 1600);
                    }}
                    style={{ fontSize: "0.8rem", padding: "10px 16px" }}
                  >
                    <Download size={14} style={{ marginRight: 6 }} />
                    {downloaded ? "Downloaded!" : "Download trimmed WAV"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Pure helper shared by analyze and slider re-runs
function computeCuts(
  audioBuffer: AudioBuffer,
  threshold: number,
  minGapMs: number
): { cuts: Array<{ start: number; end: number }>; kept: Array<{ start: number; end: number }> } {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const winSize = Math.round((WINDOW_MS / 1000) * sampleRate);
  const nWindows = Math.floor(data.length / winSize);
  const peaks: number[] = [];
  for (let w = 0; w < nWindows; w++) {
    let peak = 0;
    for (let i = w * winSize; i < (w + 1) * winSize; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
  }

  const isLive = (w: number) => peaks[w] >= threshold;
  const firstLive = peaks.findIndex(isLive);
  if (firstLive === -1) return { cuts: [], kept: [{ start: 0, end: audioBuffer.duration * 1000 }] };
  const lastLive = peaks.length - 1 - [...peaks].reverse().findIndex(isLive);
  const firstMs = firstLive * WINDOW_MS;
  const lastMs = (lastLive + 1) * WINDOW_MS;
  const totalMs = audioBuffer.duration * 1000;

  const cuts: Array<{ start: number; end: number }> = [];
  let gapStart = -1;
  for (let w = firstLive; w <= lastLive; w++) {
    if (!isLive(w)) {
      if (gapStart === -1) gapStart = w;
    } else {
      if (gapStart !== -1) {
        if ((w - gapStart) * WINDOW_MS >= minGapMs) {
          cuts.push({ start: gapStart * WINDOW_MS, end: Math.min(w * WINDOW_MS, totalMs) });
        }
        gapStart = -1;
      }
    }
  }

  const kept: Array<{ start: number; end: number }> = [];
  let cursor = firstMs;
  for (const cut of cuts) {
    if (cut.start > cursor) kept.push({ start: cursor, end: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < lastMs) kept.push({ start: cursor, end: lastMs });
  return { cuts, kept };
}