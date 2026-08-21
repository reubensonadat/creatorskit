"use client";

import { useCallback, useState } from "react";
import type {
  WebRendererContainer,
  WebRendererVideoCodec,
} from "@remotion/web-renderer";
import { MatchCutComposition, type MatchCutProps } from "@/remotion/MatchCutComposition";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&display=swap";

const FONT_FAMILY = '"Playfair Display"';

async function ensureFont(): Promise<boolean> {
  try {
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
    if (typeof document.fonts?.load === "function") {
      await document.fonts.load(`900 100px ${FONT_FAMILY}`);
    }
    return true;
  } catch {
    return false;
  }
}

export type RenderProgress = {
  progress: number;
  encodedFrames: number;
};

export type MatchCutExportOptions = MatchCutProps & {
  width?: number;
  height?: number;
  fps?: number;
  container?: WebRendererContainer;
  videoCodec?: WebRendererVideoCodec | null;
  onProgress?: (p: RenderProgress) => void;
};

/**
 * Programmatic export — returns the video Blob without UI.
 * Call `URL.createObjectURL(blob)` + trigger a download anchor yourself.
 */
export async function renderMatchCut(
  options: MatchCutExportOptions
): Promise<Blob> {
  const {
    fullText,
    highlightWord,
    sceneType = "paper",
    backgroundImageUrl = null,
    zoomLevel = 3.2,
    highlightColor = "#FFE500",
    subtitleTop = "THE DAILY MURMUR",
    subtitleBottom = "\u2014\u2009Investigative Team (Reduced)",
    durationInFrames = 150,
    width = 1080,
    height = 1080,
    fps = 30,
    container = "mp4",
    videoCodec = null,
    onProgress,
  } = options;

  await ensureFont();

  // Lazy-load the browser-only renderer so it never touches SSR/prerender.
  const { canRenderMediaOnWeb, renderMediaOnWeb } = await import(
    "@remotion/web-renderer"
  );

  const canRender = await canRenderMediaOnWeb({
    container,
    width,
    height,
    muted: true,
  });

  if (!canRender.canRender) {
    const reasons = canRender.issues
      .map((i) => i.message)
      .join("; ");
    throw new Error(`Browser cannot render video: ${reasons}`);
  }

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: "MatchCut",
      component: MatchCutComposition,
      width,
      height,
      fps,
      durationInFrames,
      defaultProps: { fullText, highlightWord, sceneType, backgroundImageUrl, zoomLevel, highlightColor, subtitleTop, subtitleBottom },
    },
    inputProps: { fullText, highlightWord, sceneType, backgroundImageUrl, zoomLevel, highlightColor, subtitleTop, subtitleBottom },
    container,
    videoCodec,
    muted: true,
    hardwareAcceleration: "prefer-hardware",
    onProgress: (p) =>
      onProgress?.({
        progress: p.progress,
        encodedFrames: p.encodedFrames,
      }),
  });

  return getBlob();
}

// ── Button component ───────────────────────────────────────

export type MatchCutExportButtonProps = MatchCutExportOptions & {
  label?: string;
  className?: string;
  onDone?: (blob: Blob) => void;
  onError?: (err: unknown) => void;
};

export default function MatchCutExportButton({
  label = "Export MP4",
  className = "",
  onDone,
  onError,
  ...options
}: MatchCutExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  const handleExport = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setPct(0);
    try {
      const blob = await renderMatchCut({
        ...options,
        onProgress: (p) => {
          setPct(Math.round(p.progress * 100));
          options.onProgress?.(p);
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `match-cut-${Date.now()}.${options.container ?? "mp4"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      onDone?.(blob);
    } catch (err) {
      onError?.(err);
    } finally {
      setBusy(false);
    }
  }, [busy, onDone, onError, options]);

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "13px 26px",
        border: "3px solid #000",
        background: busy ? "var(--text-hint)" : "var(--accent)",
        color: "#ffffff",
        fontWeight: 900,
        fontSize: "0.85rem",
        fontFamily: "monospace",
        textTransform: "uppercase",
        cursor: busy ? "not-allowed" : "pointer",
        boxShadow: "5px 5px 0 #000",
        opacity: busy ? 0.65 : 1,
        transition: "background 0.15s",
      }}
    >
      {busy
        ? pct > 0
          ? `Rendering ${pct}%`
          : "Rendering…"
        : label}
    </button>
  );
}