import type { Point } from "../smoothing/contour";

/**
 * Rotate a point around a center by the given angle in degrees.
 */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): Point {
  if (degrees === 0) return { x, y };

  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/**
 * Inverse-rotate a point around a center (for mapping screen coords
 * back to grid coords when the canvas is rotated).
 */
export function inverseRotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): Point {
  return rotatePoint(x, y, cx, cy, -degrees);
}

/** Preset rotation angles. */
export const ROTATION_PRESETS = [0, 45, 90] as const;
