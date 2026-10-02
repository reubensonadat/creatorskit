"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Download, RefreshCw, Droplets, Trash2, Save, Image as ImageIcon, Film } from "lucide-react";
import Link from "next/link";
import {
  drawWatermark,
  loadImageFromFile,
  WATERMARK_POSITIONS,
  type WatermarkMode,
  type WatermarkPosition,
} from "@/lib/watermark";
import { putHandoffImage, takeHandoffImage } from "@/lib/tool-handoff";
import { loadAssets, saveAssets } from "@/lib/local-memory";
import { exportCanvasVideoToMp4, seekVideo, decodeAudioFromFile } from "@/lib/canvas-video-exporter";
import { TactileScrubber } from "@/components/tactile-scrubber";
import NextStepRow from "@/components/NextStepRow";

interface Item {
  id: string;
  name: string;
  /** Decoded image, or the video's poster frame when isVideo. */
  img: HTMLImageElement;
  /** The ORIGINAL file — persisted to local memory (Phase 7.1). */
  blob?: Blob;
  /** Video clip: rendered frame-by-frame at stamp time (Phase 7.2). */
  isVideo?: boolean;
}

interface SavedLogo {
  name: string;
  dataUrl: string;
}

interface SavedSettings {
  mode: WatermarkMode;
  text: string;
  textColor: string;
  sizePct: number;
  opacity: number;
  position: WatermarkPosition;
  format: "png" | "jpg";
  lastLogoName?: string;
  lastLogoDataUrl?: string;
}

// Watermark v2 (docs/TOOL_INTEGRATION_PLAN.md §8): local logo library +
// settings/position memory + true batch WYSIWYG — beat Canva's copy-paste
// flow. Everything persists locally; nothing leaves the device.
const SETTINGS_KEY = "ck_wm_settings_v1";
const LOGO_LIB_KEY = "ck_wm_logos_v1";

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = dataUrl;
  });

/** Loads a video File into a queue Item — poster frame only, no live element. */
const loadVideoItem = async (file: File): Promise<Item | null> => {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = await loadImageFromDataUrl(canvas.toDataURL("image/jpeg", 0.8));
    return {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      img,
      blob: file,
      isVideo: true,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export default function WatermarkPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [text, setText] = useState("@creatorskit");
  const [textColor, setTextColor] = useState("#ffffff");
  const [sizePct, setSizePct] = useState(5);
  const [opacity, setOpacity] = useState(0.8);
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState("");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneLabel, setDoneLabel] = useState("");
  const [results, setResults] = useState<{ name: string; url: string; blob: Blob; video?: boolean }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [logoLib, setLogoLib] = useState<SavedLogo[]>([]);
  const [libNote, setLibNote] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const zipBlobRef = useRef<Blob | null>(null);
  const hydratedRef = useRef(false);

  const flashLibNote = (msg: string) => {
    setLibNote(msg);
    window.setTimeout(() => setLibNote(""), 1800);
  };

  // ── Restore saved settings + logo library, then consume any pending
  //    cross-tool hand-off image (e.g. a cutout from background-replace).
  useEffect(() => {
    try {
      const savedLib = JSON.parse(window.localStorage.getItem(LOGO_LIB_KEY) ?? "[]");
      if (Array.isArray(savedLib)) {
        setLogoLib(savedLib.filter((l) => l && typeof l.dataUrl === "string" && typeof l.name === "string"));
      }
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedSettings;
        if (s.mode === "text" || s.mode === "logo") setMode(s.mode);
        if (typeof s.text === "string") setText(s.text);
        if (typeof s.textColor === "string") setTextColor(s.textColor);
        if (typeof s.sizePct === "number") setSizePct(s.sizePct);
        if (typeof s.opacity === "number") setOpacity(s.opacity);
        if (typeof s.position === "string") setPosition(s.position as WatermarkPosition);
        if (s.format === "png" || s.format === "jpg") setFormat(s.format);
        if (s.lastLogoDataUrl) {
          setLogoName(s.lastLogoName ?? "logo");
          loadImageFromDataUrl(s.lastLogoDataUrl).then(setLogo).catch(() => setLogo(null));
        }
      }
    } catch {
      /* corrupted storage — start fresh */
    }
    (async () => {
      // Phase 7.1 — restore the last batch queue from local memory (on-device).
      const stored = await loadAssets("watermark");
      if (stored.length > 0) {
        const restored: Item[] = [];
        for (const mem of stored) {
          try {
            const f = new File([mem.blob], mem.name ?? "photo", { type: mem.blob.type });
            if (f.type.startsWith("video/")) {
              const vid = await loadVideoItem(f);
              if (vid) restored.push(vid);
            } else {
              const img = await loadImageFromFile(f);
              restored.push({ id: `${Date.now()}-mem-${restored.length}`, name: mem.name ?? `photo-${restored.length + 1}`, img, blob: mem.blob });
            }
          } catch {
            /* skip unreadable */
          }
        }
        if (restored.length > 0) {
          setItems(restored);
          flashLibNote(`Restored ${restored.length} photo${restored.length === 1 ? "" : "s"} from your last visit`);
        }
      }
      hydratedRef.current = true;
      const rec = await takeHandoffImage("watermark");
      if (rec && rec.blob.type.startsWith("image/")) {
        try {
          const img = await loadImageFromFile(new File([rec.blob], rec.name ?? "handoff.png", { type: rec.blob.type }));
          setItems([
            {
              id: `${Date.now()}-handoff`,
              name: (rec.name ?? "handoff").replace(/\.[^.]+$/, ""),
              img,
              blob: rec.blob,
            },
          ]);
        } catch {
          /* skip unreadable hand-off */
        }
      }
    })();
  }, []);

  // Settings memory — every change is remembered for the next visit.
  useEffect(() => {
    const s: SavedSettings = { mode, text, textColor, sizePct, opacity, position, format };
    const logoSrc = logo?.src;
    if (mode === "logo" && logoSrc && logoSrc.startsWith("data:")) {
      s.lastLogoName = logoName;
      s.lastLogoDataUrl = logoSrc;
    }
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* quota — non-fatal */
    }
  }, [mode, text, textColor, sizePct, opacity, position, format, logo, logoName]);

  // Logo library persistence.
  useEffect(() => {
    try {
      window.localStorage.setItem(LOGO_LIB_KEY, JSON.stringify(logoLib));
    } catch {
      /* quota — non-fatal */
    }
  }, [logoLib]);

  // Phase 7.1 — the uploaded queue survives app close (IndexedDB, on-device
  // only). A deliberate clear persists too: memory mirrors the visible queue.
  useEffect(() => {
    if (!hydratedRef.current) return; // never wipe before the restore lands
    const withBlobs = items.filter((it) => it.blob);
    if (items.length > 0 && withBlobs.length === 0) return;
    void saveAssets(
      "watermark",
      "Batch Watermark",
      withBlobs.map((it, i) => ({ slot: String(i), blob: it.blob as Blob, name: it.name }))
    );
  }, [items]);

  // ── WYSIWYG: live preview of the watermark exactly as it will be stamped.
  useEffect(() => {
    const canvas = previewRef.current;
    const first = items[0];
    if (!canvas || !first) return;
    const maxW = 720;
    const scale = Math.min(1, maxW / first.img.naturalWidth);
    canvas.width = Math.round(first.img.naturalWidth * scale);
    canvas.height = Math.round(first.img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(first.img, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height, { mode, text, textColor, logo, sizePct, opacity, position });
  }, [items, mode, text, textColor, logo, sizePct, opacity, position]);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    const loaded: Item[] = [];
    for (const file of list) {
      try {
        if (file.type.startsWith("video/")) {
          const vid = await loadVideoItem(file);
          if (vid) loaded.push(vid);
        } else if (file.type.startsWith("image/")) {
          const img = await loadImageFromFile(file);
          loaded.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name.replace(/\.[^.]+$/, ""), img, blob: file });
        }
      } catch {
        /* skip unreadable */
      }
    }
    setItems((prev) => [...prev, ...loaded]);
    setResults([]);
    zipBlobRef.current = null;
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setLogo(img);
      setLogoName(file.name.replace(/\.[^.]+$/, ""));
      setMode("logo");
    } catch {
      flashLibNote("Could not read that logo.");
    }
  };

  const saveLogoToLib = () => {
    const src = logo?.src;
    if (!src || !src.startsWith("data:")) {
      flashLibNote("Pick a logo PNG first.");
      return;
    }
    setLogoLib((prev) => {
      const next = prev.filter((l) => l.dataUrl !== src);
      next.unshift({ name: logoName || "logo", dataUrl: src });
      return next.slice(0, 12);
    });
    flashLibNote("Logo saved to library.");
  };

  const applyLibLogo = (l: SavedLogo) => {
    loadImageFromDataUrl(l.dataUrl)
      .then((img) => {
        setLogo(img);
        setLogoName(l.name);
        setMode("logo");
      })
      .catch(() => flashLibNote("Could not load that logo."));
  };

  const deleteLibLogo = (dataUrl: string) => {
    setLogoLib((prev) => prev.filter((l) => l.dataUrl !== dataUrl));
  };

  const drawWatermarked = (item: Item): Promise<Blob> =>
    new Promise((resolve) => {
      const W = item.img.naturalWidth;
      const H = item.img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(new Blob());
        return;
      }
      ctx.drawImage(item.img, 0, 0);
      // Shared engine — identical output to the Social Platform Resizer
      drawWatermark(ctx, W, H, { mode, text, textColor, logo, sizePct, opacity, position });
      canvas.toBlob(
        (blob) => resolve(blob ?? new Blob()),
        format === "png" ? "image/png" : "image/jpeg",
        format === "jpg" ? 0.92 : undefined
      );
    });

  // Phase 7.2 — video clips get the SAME stamp (logo/position/opacity/size),
  // rendered frame-by-frame through the deterministic WebCodecs exporter with
  // the original audio muxed back in (best effort). 100% on-device.
  const renderVideoWatermarked = async (item: Item, index: number): Promise<Blob> => {
    const blob = item.blob ?? new Blob();
    const file = new File([blob], `${item.name}.mp4`, { type: blob.type || "video/mp4" });
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("decode failed"));
      });
      const duration = video.duration || 0;
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("bad duration");
      const fps = 30;
      const totalFrames = Math.max(1, Math.round(duration * fps));
      const W = video.videoWidth || 1280;
      const H = video.videoHeight || 720;
      const audioBuffer = await decodeAudioFromFile(file, 0, duration);
      const result = await exportCanvasVideoToMp4({
        width: W,
        height: H,
        fps,
        totalFrames,
        audioBuffer,
        renderFrameAsync: async (i, ctx) => {
          await seekVideo(video, i / fps);
          ctx.drawImage(video, 0, 0, W, H);
          drawWatermark(ctx, W, H, { mode, text, textColor, logo, sizePct, opacity, position });
        },
        onProgress: (p) => setProgress(index + p),
      });
      return result.blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const runBatch = async (zip: boolean) => {
    if (items.length === 0) return;
    setBusy(true);
    setProgress(0);
    setDoneLabel("");
    const out: { name: string; url: string; blob: Blob; video?: boolean }[] = [];
    const JSZip = (await import("jszip")).default; // lazy per §7 — never in the page bundle
    const zipped = new JSZip();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const blob = it.isVideo ? await renderVideoWatermarked(it, i) : await drawWatermarked(it);
      const ext = it.isVideo ? "mp4" : format === "png" ? "png" : "jpg";
      const name = `${it.name}-watermarked.${ext}`;
      zipped.file(name, blob);
      out.push({ name, url: URL.createObjectURL(blob), blob, video: it.isVideo });
      setProgress(i + 1);
    }
    setResults(out);

    if (zip) {
      const zblob = await zipped.generateAsync({ type: "blob" });
      zipBlobRef.current = zblob;
      const url = URL.createObjectURL(zblob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked-${items.length}-files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDoneLabel(zip ? `Done! ZIP with ${items.length} file(s) downloaded.` : `${items.length} file(s) ready below.`);
    setBusy(false);
  };

  const downloadZipAgain = () => {
    const z = zipBlobRef.current;
    if (!z) return;
    const url = URL.createObjectURL(z);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watermarked-${items.length}-files.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setItems([]);
    setResults([]);
    setDoneLabel("");
    setProgress(0);
    zipBlobRef.current = null;
  };

  // §4 edges: carry the first stamped image straight into the next tool.
  const handoffFirst = async (href: string) => {
    const first = results[0];
    if (!first) return;
    await putHandoffImage(href.replace(/^\//, ""), first.blob, {
      sourceTool: "watermark",
      name: first.name,
    });
  };

  const label = { fontSize: "0.66rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.04em", textTransform: "uppercase" as const };

  return (
    <div className="tool-page-padding" style={{ position: "relative", minHeight: "100vh", overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      <div className="grid-bg" />
      <div className="tool-inner-container" style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px 96px", position: "relative", zIndex: 1 }}>
        {/* Top Title Section */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 8px", border: "2px solid #000", background: "#000", color: "#fff", fontFamily: "monospace" }}>
              BATCH WATERMARK PRO
            </span>
            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>
              LOGO LIBRARY · POSITION MEMORY · LIVE PREVIEW · 100% LOCAL
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, textTransform: "uppercase" }}>
            Batch Watermark & Protection
          </h1>
        </div>

        {/* Upload Zone */}
        {!items.length ? (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
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
              border: `4px dashed ${isDragging ? "#000" : "#000000"}`,
              background: isDragging ? "#f4f4f5" : "#ffffff",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ width: 64, height: 64, border: "3px solid #000", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, background: "#fff", boxShadow: "4px 4px 0 #000" }}>
              <Camera size={30} style={{ color: "#000" }} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 8, color: "#000" }}>Drop images or videos to watermark in bulk</h3>
            <p style={{ fontSize: "0.88rem", color: "#666", maxWidth: 440, lineHeight: 1.6, fontWeight: 500 }}>
              JPG · PNG · WEBP · MP4 — batch stamp your logo or handle, keep thieves away. Your settings, logo library and position are remembered.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* WYSIWYG live preview */}
            <div className="brutalist-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...label, color: "#000", display: "flex", alignItems: "center", gap: 6 }}>
                <Droplets size={14} /> LIVE PREVIEW — WHAT GETS STAMPED
              </div>
              <div style={{ display: "flex", justifyContent: "center", background: "#09090b", padding: 12, border: "2px solid #000" }}>
                <canvas ref={previewRef} style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain", display: "block" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 800, color: "#666", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {items.some((it) => it.isVideo) && <Film size={12} />}
                  {items.length} FILE{items.length > 1 ? "S" : ""} QUEUED — PREVIEW SHOWS THE FIRST ONE
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="brutalist-button" onClick={reset} style={{ fontSize: "0.74rem", padding: "7px 12px" }}>
                    <RefreshCw size={13} style={{ transform: "none" }} /> RESET
                  </button>
                  <button className="brutalist-button" onClick={() => fileRef.current?.click()} style={{ fontSize: "0.74rem", padding: "7px 12px" }}>
                    <Camera size={13} style={{ transform: "none" }} /> ADD MORE
                  </button>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {/* Controls */}
            <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Mode */}
              <div style={{ display: "flex", gap: 8 }}>
                {(["text", "logo"] as WatermarkMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "2px solid #000",
                      background: mode === m ? "#000" : "#fff",
                      color: mode === m ? "#fff" : "#000",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      fontSize: "0.74rem",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {m === "text" ? "TEXT HANDLE" : "LOGO"}
                  </button>
                ))}
              </div>

              {mode === "text" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="@yourhandle"
                    style={{ flex: 1, minWidth: 200, padding: "10px 12px", border: "2px solid #000", fontWeight: 800, fontFamily: "monospace", fontSize: "0.9rem" }}
                  />
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: 46, height: 42, border: "2px solid #000", background: "#fff", cursor: "pointer" }} />
                  {["#ffffff", "#000000", "#FFE500"].map((c) => (
                    <button key={c} onClick={() => setTextColor(c)} style={{ width: 34, height: 34, background: c, border: `2px solid ${textColor === c ? "#000" : "#bbb"}`, cursor: "pointer" }} title={c} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="brutalist-button" onClick={() => logoInputRef.current?.click()} style={{ fontSize: "0.74rem", padding: "8px 12px" }}>
                      <ImageIcon size={13} style={{ transform: "none" }} /> {logo ? `LOGO: ${logoName}` : "PICK LOGO PNG"}
                    </button>
                    <button className="brutalist-button" onClick={saveLogoToLib} style={{ fontSize: "0.74rem", padding: "8px 12px" }}>
                      <Save size={13} style={{ transform: "none" }} /> SAVE TO LIBRARY
                    </button>
                    {libNote && <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 800, color: "#666" }}>{libNote}</span>}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        pickLogo(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {/* Logo library — saved locally, one tap to re-apply */}
                  {logoLib.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ ...label, color: "#666" }}>LOGO LIBRARY:</span>
                      {logoLib.map((l) => (
                        <span key={l.name + l.dataUrl.slice(-16)} style={{ display: "inline-flex", border: "2px solid #000", background: "#fff" }}>
                          <button onClick={() => applyLibLogo(l)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: 800, fontSize: "0.7rem" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.dataUrl} alt={l.name} style={{ height: 22, maxWidth: 70, objectFit: "contain" }} />
                            {l.name.slice(0, 12)}
                          </button>
                          <button onClick={() => deleteLibLogo(l.dataUrl)} style={{ border: "none", borderLeft: "2px solid #000", background: "#000", color: "#fff", cursor: "pointer", padding: "0 6px" }} title="Remove">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Position grid — remembered across visits */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ ...label, color: "#666" }}>POSITION (REMEMBERED)</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gap: 4 }}>
                  {WATERMARK_POSITIONS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPosition(p.key)}
                      style={{
                        height: 36,
                        border: `2px solid ${position === p.key ? "#000" : "#bbb"}`,
                        background: position === p.key ? "#000" : "#fff",
                        color: position === p.key ? "#fff" : "#000",
                        fontFamily: "monospace",
                        fontWeight: 900,
                        fontSize: "0.66rem",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <TactileScrubber
                label="Size"
                min={2}
                max={15}
                step={0.5}
                value={sizePct}
                onChange={setSizePct}
                formatValue={(v) => `${v}%`}
              />
              <TactileScrubber
                label="Opacity"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={setOpacity}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />

              {/* Output format */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ ...label, color: "#666" }}>FORMAT (VIDEOS STAMP AS MP4):</span>
                {(["png", "jpg"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      padding: "6px 14px",
                      border: "2px solid #000",
                      background: format === f ? "#000" : "#fff",
                      color: format === f ? "#fff" : "#000",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Batch actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="brutalist-button" disabled={busy} onClick={() => runBatch(false)} style={{ flex: 1, justifyContent: "center", minWidth: 200, cursor: busy ? "wait" : "pointer" }}>
                  <Download size={14} /> STAMP {items.length} FILE{items.length > 1 ? "S" : ""}
                </button>
                <button className="brutalist-button" disabled={busy} onClick={() => runBatch(true)} style={{ flex: 1, justifyContent: "center", minWidth: 200, cursor: busy ? "wait" : "pointer" }}>
                  <Download size={14} /> STAMP + ZIP
                </button>
              </div>
              {busy && (
                <div style={{ height: 10, border: "2px solid #000", background: "#fff" }}>
                  <div style={{ height: "100%", width: `${(progress / items.length) * 100}%`, background: "#000", transition: "width 0.15s ease" }} />
                </div>
              )}
              {doneLabel && <div style={{ fontSize: "0.76rem", fontFamily: "monospace", fontWeight: 800, color: "#000" }}>{doneLabel}</div>}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="brutalist-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ ...label, color: "#000" }}>STAMPED ({results.length})</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {results.map((r) => (
                    <a key={r.name} href={r.url} download={r.name} style={{ border: "2px solid #000", background: "#fff", textDecoration: "none" }}>
                      {r.video ? (
                        <video src={r.url} muted playsInline style={{ width: "100%", height: 120, objectFit: "cover", display: "block", borderBottom: "2px solid #000" }} />
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.url} alt={r.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block", borderBottom: "2px solid #000" }} />
                        </>
                      )}
                      <span style={{ display: "block", padding: "6px 8px", fontSize: "0.64rem", fontFamily: "monospace", fontWeight: 800, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.name}
                      </span>
                    </a>
                  ))}
                </div>
                {/* §4: keep the workflow moving — first stamped image carries over */}
                <NextStepRow
                  currentHref="/watermark"
                  heading="STAMPED — KEEP GOING"
                  onDownload={zipBlobRef.current ? downloadZipAgain : undefined}
                  downloadLabel="ZIP"
                  onBeforeNavigate={(href) => handoffFirst(href)}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link href="/" className="brutalist-button" style={{ fontSize: "0.78rem", padding: "8px 16px", textDecoration: "none" }}>
            ‹ ALL TOOLS
          </Link>
        </div>
      </div>
    </div>
  );
}
