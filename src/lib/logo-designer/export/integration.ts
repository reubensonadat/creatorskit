import type { SmoothedLayerResult } from "../smoothing/slider";
import type { BackgroundOption } from "./background";
import { generateSvgWithBackground } from "./background";
import { generateAdaptiveSvg, generateModeSvg } from "./svg";
import { rasterizeSvgToPng, type PngScale } from "./png";

export interface ExportConfig {
  width: number;
  height: number;
  layers: SmoothedLayerResult[];
  background: BackgroundOption;
  mode: "light" | "dark" | "adaptive";
  lightBg: string;
  darkBg: string;
  lightFg: string;
  darkFg: string;
}

/**
 * Generate SVG string respecting mode and background settings.
 */
export function exportSvg(config: ExportConfig): string {
  if (config.mode === "adaptive") {
    return generateAdaptiveSvg(
      { width: config.width, height: config.height, layers: config.layers },
      config.lightBg, config.darkBg, config.lightFg, config.darkFg,
    );
  }

  const bg = config.mode === "light" ? config.lightBg : config.darkBg;
  const fg = config.mode === "light" ? config.lightFg : config.darkFg;

  if (config.background.type !== "transparent") {
    return generateSvgWithBackground(
      config.width, config.height, config.layers, config.background,
    );
  }

  return generateModeSvg(
    { width: config.width, height: config.height, layers: config.layers },
    config.mode, bg, fg,
  );
}

/**
 * Generate PNG blob respecting mode and background settings.
 */
export async function exportPng(
  config: ExportConfig,
  scale: PngScale,
): Promise<Blob> {
  const svgString = exportSvg(config);
  return rasterizeSvgToPng(svgString, config.width, config.height, scale);
}
