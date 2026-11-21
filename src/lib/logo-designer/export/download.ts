import type { PngScale } from "./png";

/**
 * Trigger a browser file download for text content (SVG).
 */
export function downloadSvg(svgString: string, filename: string = "logo.svg"): void {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, filename);
}

/**
 * Trigger a browser file download for a PNG blob.
 */
export function downloadPng(
  blob: Blob,
  scale: PngScale,
  baseName: string = "logo",
): void {
  const filename = `${baseName}-${scale}x.png`;
  triggerDownload(blob, filename);
}

/**
 * Create and trigger a download link.
 * Works entirely client-side — no server round-trip.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a descriptive filename for exports.
 */
export function generateFilename(
  format: "svg" | "png",
  options?: {
    scale?: PngScale;
    mode?: "light" | "dark" | "adaptive";
    baseName?: string;
  },
): string {
  const base = options?.baseName ?? "logo";
  const mode = options?.mode ? `-${options.mode}` : "";
  const scale = options?.scale ? `-${options.scale}x` : "";
  return `${base}${mode}${scale}.${format}`;
}
