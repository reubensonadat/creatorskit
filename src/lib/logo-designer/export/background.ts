import type { SmoothedLayerResult } from "../smoothing/slider";
import { pathToSvgD } from "../smoothing/bezier";

export type BackgroundOption =
  | { type: "transparent" }
  | { type: "solid"; color: string }
  | { type: "image"; dataUrl: string };

export function generateSvgWithBackground(
  width: number,
  height: number,
  layers: SmoothedLayerResult[],
  background: BackgroundOption,
): string {
  let bgElement = "";
  if (background.type === "solid") {
    bgElement = `  <rect width="100%" height="100%" fill="${background.color}" />`;
  } else if (background.type === "image") {
    bgElement = `  <image href="${background.dataUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />`;
  }

  const groups = layers.map((layer) => {
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
    return `  <g data-layer="${layer.layerId}">\n${paths}\n  </g>`;
  });

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
  ];
  if (bgElement) parts.push(bgElement);
  parts.push(...groups);
  parts.push(`</svg>`);

  return parts.join("\n");
}
