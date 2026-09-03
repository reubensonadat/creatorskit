// Shared brand-watermark engine.
//
// Single source of truth for stamping a handle or logo onto any canvas —
// used by the Batch Watermark tool and baked into every Social Platform
// Resizer export (preview, thumbnails, ZIP batch and MP4 render), so a
// watermark looks identical everywhere it appears.

export type WatermarkMode = "text" | "logo";

export type WatermarkPosition =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "center" | "mid-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export const WATERMARK_POSITIONS: { key: WatermarkPosition; label: string }[] = [
  { key: "top-left", label: "TL" },
  { key: "top-center", label: "TC" },
  { key: "top-right", label: "TR" },
  { key: "mid-left", label: "ML" },
  { key: "center", label: "C" },
  { key: "mid-right", label: "MR" },
  { key: "bottom-left", label: "BL" },
  { key: "bottom-center", label: "BC" },
  { key: "bottom-right", label: "BR" },
];

export interface WatermarkOptions {
  mode: WatermarkMode;
  text: string;
  textColor: string;
  logo: HTMLImageElement | null;
  /** Watermark height as a percentage of canvas height (2–15). */
  sizePct: number;
  /** 0.1 – 1 */
  opacity: number;
  position: WatermarkPosition;
}

/** Draws the watermark onto a 2D context at full output resolution. No-op when misconfigured. */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  o: WatermarkOptions
): void {
  if (o.mode === "text" && !o.text.trim()) return;
  if (o.mode === "logo" && !o.logo) return;

  const padding = Math.max(12, Math.round(H * 0.03));
  const wmH = Math.max(8, Math.round((H * o.sizePct) / 100));
  let wmW: number;

  if (o.mode === "text") {
    ctx.font = `800 ${wmH}px Inter, sans-serif, system-ui`;
    wmW = ctx.measureText(o.text).width;
  } else {
    const ratio = (o.logo as HTMLImageElement).naturalWidth / (o.logo as HTMLImageElement).naturalHeight || 1;
    wmW = wmH * ratio;
  }

  // Never let the mark overflow the frame
  wmW = Math.min(wmW, W - padding * 2);

  const col = o.position.endsWith("left") ? "left" : o.position.endsWith("right") ? "right" : "center";
  const row = o.position.startsWith("top") ? "top" : o.position.startsWith("bottom") ? "bottom" : "mid";
  const posX = col === "left" ? padding : col === "center" ? (W - wmW) / 2 : W - wmW - padding;
  const posY = row === "top" ? padding : row === "mid" ? (H - wmH) / 2 : H - wmH - padding;

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, o.opacity));
  if (o.mode === "text") {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const maxW = Math.max(1, W - posX - padding);
    // Soft dark offset pass for readability on any background, then the crisp fill.
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    const off = Math.max(1, wmH * 0.045);
    ctx.fillText(o.text, posX + off, posY + off, maxW);
    ctx.fillStyle = o.textColor;
    ctx.fillText(o.text, posX, posY, maxW);
  } else if (o.logo) {
    ctx.drawImage(o.logo, posX, posY, wmW, wmH);
  }
  ctx.restore();
}

/** Reads an image file into an <img> element (data URL, stays on-device). */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${file.name}`));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}
