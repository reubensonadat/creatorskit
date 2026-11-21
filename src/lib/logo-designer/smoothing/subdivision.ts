import type { Point } from "./contour";

/**
 * Chaikin's corner-cutting subdivision algorithm.
 *
 * Each pass replaces every edge in the closed polygon with two new points
 * at positions `tension` and `1 - tension` along the edge, progressively
 * smoothing corners into curves.
 *
 * @param points  Closed polygon vertices
 * @param passes  Number of subdivision iterations (clamped to 0-6)
 * @param tension Cutting ratio, default 0.25 (classic Chaikin)
 * @returns       Subdivided polygon vertices
 */
export function chaikinSubdivide(
  points: Point[],
  passes: number,
  tension: number = 0.25,
): Point[] {
  const clampedPasses = Math.max(0, Math.min(6, Math.round(passes)));

  if (clampedPasses === 0) return [...points];

  let current = points;

  for (let pass = 0; pass < clampedPasses; pass++) {
    const n = current.length;
    const next: Point[] = [];

    for (let i = 0; i < n; i++) {
      const p0 = current[i]!;
      const p1 = current[(i + 1) % n]!;

      const t = tension;

      next.push({
        x: (1 - t) * p0.x + t * p1.x,
        y: (1 - t) * p0.y + t * p1.y,
      });

      next.push({
        x: t * p0.x + (1 - t) * p1.x,
        y: t * p0.y + (1 - t) * p1.y,
      });
    }

    current = next;
  }

  return current;
}
