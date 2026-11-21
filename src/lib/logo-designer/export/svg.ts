import { pathToSvgD } from "../smoothing/bezier";
import type { SmoothedLayerResult } from "../smoothing/slider";

export interface SvgExportOptions {
  width: number;
  height: number;
  layers: SmoothedLayerResult[];
}

function buildLayerGroups(layers: SmoothedLayerResult[], cx: number, cy: number): string[] {
  return layers.map((layer) => {
    // Group path data by color so holes (evenodd) subtract correctly
    const byColor = new Map<string, string[]>();
    for (const p of layer.paths) {
      const d = pathToSvgD(p);
      if (!d) continue;
      const arr = byColor.get(p.color);
      if (arr) arr.push(d);
      else byColor.set(p.color, [d]);
    }

    const paths = [...byColor.entries()]
      .map(([color, ds]) =>
        `    <path d="${ds.join(" ")}" fill="${color}" fill-rule="evenodd" />`,
      )
      .join("\n");

    const rot = layer.rotation ?? 0;
    const transformAttr = rot !== 0 ? ` transform="rotate(${rot}, ${cx}, ${cy})"` : "";
    return `  <g data-layer="${layer.layerId}"${transformAttr}>\n${paths}\n  </g>`;
  });
}

/**
 * Generate a self-contained SVG document from smoothed paths.
 * Each layer's paths are wrapped in a <g> element.
 * Layer groups appear in stack order (first = bottom).
 */
export function generateSvg(options: SvgExportOptions): string {
  const { width, height, layers } = options;
  const groups = buildLayerGroups(layers, width / 2, height / 2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    ...groups,
    `</svg>`,
  ].join("\n");
}

/**
 * Generate an adaptive SVG with light/dark mode media query.
 */
export function generateAdaptiveSvg(
  options: SvgExportOptions,
  lightBg: string,
  darkBg: string,
  lightFg: string,
  darkFg: string,
): string {
  const { width, height, layers } = options;

  const style = `  <style>
    :root { --bg: ${lightBg}; --fg: ${lightFg}; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: ${darkBg}; --fg: ${darkFg}; }
    }
  </style>`;

  const bgRect = `  <rect width="100%" height="100%" fill="var(--bg)" />`;

  const groups = buildLayerGroups(layers, width / 2, height / 2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    style,
    bgRect,
    ...groups,
    `</svg>`,
  ].join("\n");
}

/**
 * Generate an SVG with explicit light or dark mode (no media queries).
 */
export function generateModeSvg(
  options: SvgExportOptions,
  _mode: "light" | "dark",
  bg: string,
  _fg: string,
): string {
  const { width, height, layers } = options;
  const bgRect = `  <rect width="100%" height="100%" fill="${bg}" />`;
  const groups = buildLayerGroups(layers, width / 2, height / 2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    bgRect,
    ...groups,
    `</svg>`,
  ].join("\n");
}
