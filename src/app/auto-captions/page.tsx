"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileText,
  Video,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface TranscriptChunk {
  start: number;
  end: number;
  text: string;
}
interface TranscriptResult {
  text: string;
  chunks: TranscriptChunk[];
}

type CaptionStyle = "box" | "stroke" | "glow";
type CaptionPosition = "bottom" | "top";

// ─── helpers ──────────────────────────────────────────────────────────────

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

async function decodeToBuffer(file: File): Promise<AudioBuffer> {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    ctx.close().catch(() => {});
  }
}

function audioBufferToWav(decoded: AudioBuffer, targetRate: number): ArrayBuffer {
  const ratio = decoded.sampleRate / targetRate;
  const length = Math.round(decoded.length / ratio);
  const mono = new Float32Array(length);
  const channel = decoded.getChannelData(0);
  for (let i = 0; i < length; i++) {
    mono[i] = channel[Math.min(channel.length - 1, Math.floor(i * ratio))];
  }
  return encodeWav(mono, targetRate);
}

function srtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}

function chunksToSrt(chunks: TranscriptChunk[]): string {
  return chunks
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copyTextToClipboard(text: string, onDone: () => void) {
  const done = () => onDone();
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else done();
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function drawCaption(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  timeMs: number,
  chunks: TranscriptChunk[],
  style: CaptionStyle,
  color: string,
  position: CaptionPosition
) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const gradient = ctx.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h * 0.42, h * 0.9);
  gradient.addColorStop(0, "rgba(255,255,255,0.10)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const current = chunks.find((c) => timeMs >= c.start * 1000 && timeMs < c.end * 1000);

  if (!current) {
    ctx.font = `600 ${Math.round(w * 0.028)}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "center";
    ctx.fillText("Captions appear here", w / 2, position === "bottom" ? h * 0.88 : h * 0.12);
    return;
  }

  const fontSize = Math.round(w * 0.05);
  ctx.font = `800 ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const y = position === "bottom" ? h * 0.88 : h * 0.12;

  if (style === "box") {
    const padX = fontSize * 0.6;
    const padY = fontSize * 0.35;
    const width = ctx.measureText(current.text).width + padX * 2;
    const height = fontSize + padY * 2;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(w / 2 - width / 2, y - height / 2, width, height);
    ctx.fillStyle = color;
    ctx.fillText(current.text, w / 2, y + fontSize * 0.06);
  } else if (style === "stroke") {
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(current.text, w / 2, y);
    ctx.fillStyle = color;
    ctx.fillText(current.text, w / 2, y);
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = fontSize * 0.35;
    ctx.fillStyle = color;
    ctx.fillText(current.text, w / 2, y);
    ctx.shadowBlur = 0;
  }
}

// ─── page ─────────────────────────────────────────────────────────────────

export default function AutoCaptionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "decoding" | "transcribing" | "done" | "error">("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [copied, setCopied] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("box");
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("bottom");
  const [previewOn, setPreviewOn] = useState(false);
  const [exporting, setExporting] = useState(false);

  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewLoopRef = useRef<number | null>(null);
  const previewStartRef = useRef<number>(0);

  // Live caption preview clock
  useEffect(() => {
    if (!previewOn) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const loop = (time: number) => {
      const ctx = canvas.getContext("2d");
      if (canvas && ctx) {
        drawCaption(canvas, ctx, time - previewStartRef.current, result?.chunks ?? [], captionStyle, captionColor, captionPosition);
      }
      previewLoopRef.current = requestAnimationFrame(loop);
    };
    previewStartRef.current = performance.now();
    previewLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (previewLoopRef.current !== null) cancelAnimationFrame(previewLoopRef.current);
      previewLoopRef.current = null;
    };
  }, [previewOn, result, captionStyle, captionColor, captionPosition]);

  const pickFile = async (f: File) => {
    setFile(f);
    setStatus("decoding");
    setStatusLabel("Decoding audio…");
    setError("");
    setResult(null);
    setPreviewOn(false);

    try {
      const decoded = await decodeToBuffer(f);
      audioBufferRef.current = decoded;
      const wav = audioBufferToWav(decoded, 16000);
      setStatus("transcribing");
      setStatusLabel("Whisper is listening… (free Hugging Face inference)");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: BufferToBase64(wav) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Transcription failed.");
      }
      if (!data.text && (!data.chunks || data.chunks.length === 0)) {
        throw new Error("No speech detected in this file. Try a louder or longer clip.");
      }
      setResult(data);
      setStatus("done");
      setStatusLabel(`Done — ${formatDuration(data.chunks?.at(-1)?.end ?? 0)} of audio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      setStatusLabel("");
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="grid-bg" />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/" className="brutalist-button" style={{ padding: "8px 16px" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} /> Dashboard
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                Auto-Captions
              </h1>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", border: "2px solid #000", background: "#fff", color: "#000", fontFamily: "monospace" }}>
                Whisper AI
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-hint)", marginTop: 2 }}>
              Upload audio or video — Whisper (free Hugging Face inference) transcribes it into an
              accurate transcript, an SRT file, and styled burned-in subtitles.
            </p>
          </div>
        </div>

        {/* Upload */}
        {!file && (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) pickFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className="brutalist-card"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "100px 40px",
              textAlign: "center",
              cursor: "pointer",
              border: `4px dashed ${isDragging ? "var(--accent)" : "#000000"}`,
              background: isDragging ? "rgba(94, 155, 198, 0.02)" : "#ffffff",
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
                marginBottom: 24,
                background: "#ffffff",
                boxShadow: "4px 4px 0 #000000",
              }}
            >
              <Video size={32} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 8, color: "#000000" }}>
              Drop audio or video here
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              MP3 · WAV · M4A · MP4 · MOV — decoded locally, then sent as 16kHz WAV
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        )}

        {/* Status */}
        {status !== "idle" && status !== "done" && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 18px",
              border: "3px solid #000",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: status === "error" ? "#ef4444" : "var(--accent)",
                boxShadow: status === "error" ? "0 0 8px #ef4444" : "0 0 8px var(--accent)",
                animation: status === "error" ? "none" : "dotLabelPulse 1s ease-in-out infinite",
              }}
            />
            <span style={{ fontWeight: 800, fontSize: "0.85rem", fontFamily: "monospace" }}>
              {status === "decoding"
                ? "DECODING AUDIO…"
                : status === "transcribing"
                ? "TRANSCRIBING — free HF inference (can take a minute)…"
                : "ERROR"}
            </span>
            {statusLabel && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-hint)", fontWeight: 600 }}>{statusLabel}</span>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 18px",
              border: "3px solid #ef4444",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "0.85rem",
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 900, display: "block", marginBottom: 4, fontFamily: "monospace" }}>
              TRANSCRIPTION FAILED
            </span>
            {error}
            <div style={{ marginTop: 10 }}>
              <button
                className="brutalist-button"
                onClick={() => setError("")}
                style={{ fontSize: "0.72rem", padding: "6px 12px" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && status === "done" && (
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Transcript */}
            <div className="brutalist-card" style={{ padding: 24, gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={18} style={{ color: "var(--accent)" }} />
                  <span style={{ fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.82rem" }}>
                    Transcript
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="brutalist-button"
                    onClick={() => copyTextToClipboard(result.text, () => setCopied("transcript"))}
                    style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                  >
                    {copied === "transcript" ? "Copied!" : "Copy"}
                  </button>
                  <button
                    className="brutalist-button"
                    onClick={() => downloadText("transcript.txt", result.text)}
                    style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                  >
                    <Download size={14} style={{ marginRight: 4 }} /> TXT
                  </button>
                  <button
                    className="brutalist-button brutalist-button-primary"
                    onClick={() => downloadText("captions.srt", chunksToSrt(result.chunks), "application/x-subrip")}
                    style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                  >
                    <Download size={14} style={{ marginRight: 4 }} /> SRT
                  </button>
                </div>
              </div>
              <div
                style={{
                  border: "2px solid #000",
                  background: "#fff",
                  padding: 16,
                  fontSize: "0.9rem",
                  lineHeight: 1.7,
                  color: "var(--text-primary)",
                  maxHeight: 240,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                }}
              >
                {result.text}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-hint)", fontWeight: 600, fontFamily: "monospace" }}>
                {result.chunks.length} caption lines · {formatDuration(result.chunks[0]?.start ?? 0)} – {formatDuration(result.chunks.at(-1)?.end ?? 0)}
              </div>
            </div>

            {/* Burn-in preview + export */}
            <div className="brutalist-card" style={{ padding: 24, gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Video size={18} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.82rem" }}>
                  Burned-in captions
                </span>
              </div>

              <canvas
                ref={previewCanvasRef}
                width={640}
                height={360}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: "3px solid #000",
                  boxShadow: "4px 4px 0 rgba(0,0,0,0.14)",
                  background: "#000",
                  cursor: "pointer",
                }}
                onClick={() => setPreviewOn((v) => !v)}
                title="Click to start/stop the caption preview"
              />

              {/* Style controls */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>
                    Style
                  </label>
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["box", "stroke", "glow"] as CaptionStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setCaptionStyle(s)}
                        style={{
                          padding: "7px 12px",
                          border: "none",
                          borderRight: s !== "glow" ? "2px solid #000" : "none",
                          background: captionStyle === s ? "var(--accent)" : "#fff",
                          color: captionStyle === s ? "#fff" : "#000",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                    style={{
                      width: 56,
                      height: 34,
                      border: "2px solid #000",
                      background: "#fff",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 900, fontFamily: "monospace", textTransform: "uppercase" }}>
                    Position
                  </label>
                  <div style={{ display: "flex", border: "2px solid #000", background: "#fff" }}>
                    {(["bottom", "top"] as CaptionPosition[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCaptionPosition(p)}
                        style={{
                          padding: "7px 12px",
                          border: "none",
                          borderRight: p !== "top" ? "2px solid #000" : "none",
                          background: captionPosition === p ? "var(--accent)" : "#fff",
                          color: captionPosition === p ? "#fff" : "#000",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="brutalist-button brutalist-button-primary"
                  disabled={exporting}
                  onClick={exportBurnIn}
                  style={{ fontSize: "0.78rem", padding: "9px 16px" }}
                >
                  {exporting ? (
                    <>
                      <RefreshCw size={14} style={{ marginRight: 6, animation: "dotLabelPulse 1s ease-in-out infinite" }} />
                      Recording… {file ? file.name.split(".").slice(0, -1).join(".").slice(0, 24) : ""} (captions).mp4
                    </>
                  ) : (
                    <>
                      <Download size={14} style={{ marginRight: 6 }} />
                      Export Burned-In Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function exportBurnIn() {
    if (exporting || !audioBufferRef.current) return;
    setExporting(true);
    try {
      const W = 1280;
      const H = 720;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");

      const ac = new AudioContext();
      const source = ac.createBufferSource();
      source.buffer = audioBufferRef.current;
      const dest = ac.createMediaStreamDestination();
      source.connect(dest);
      source.connect(ac.destination);

      const video = canvas.captureStream(30);
      video.addTrack(dest.stream.getAudioTracks()[0]);
      const mime = MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
      const recorder = new MediaRecorder(video, mime ? { mimeType: mime } : undefined);
      const collected: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) collected.push(e.data);
      };
      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const chunks = result?.chunks ?? [];
      const style = captionStyle;
      const color = captionColor;
      const position = captionPosition;
      const startAt = performance.now();
      const tick = () => {
        const t = performance.now() - startAt;
        drawCaption(canvas, ctx, t, chunks, style, color, position);
        if (t < (audioBufferRef.current?.duration ?? 0) * 1000 + 900) {
          requestAnimationFrame(tick);
        } else {
          recorder.stop();
        }
      };

      recorder.start(250);
      source.start(0);
      requestAnimationFrame(tick);
      await done;
      ac.close().catch(() => {});

      const type = recorder.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(collected, { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(file?.name.split(".")[0] ?? "captions").slice(0, 40)}-captions.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      setExporting(false);
    }
  }
}

// Base64 conversion for the WAV buffer (kept at bottom, used by pickFile)
function BufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}