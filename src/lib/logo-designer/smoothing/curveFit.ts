import type { Point } from "./contour";
import type { BezierSegment } from "./bezier";

/**
 * Convert a closed polygon to cubic Bezier segments using Catmull-Rom
 * to cubic Bezier conversion.
 *
 * For each segment (P[i], P[i+1]):
 *   c1 = P[i]   + (P[i+1] - P[i-1]) / (6 * tension)
 *   c2 = P[i+1] - (P[i+2] - P[i])   / (6 * tension)
 *
 * @param points  Closed polygon vertices (minimum 3)
 * @param tension Catmull-Rom tension parameter, default 0.5
 * @returns       Array of cubic Bezier segments forming a closed curve
 */
export function fitCubicBeziers(
  points: Point[],
  tension: number = 0.5,
): BezierSegment[] {
  const n = points.length;
  if (n < 3) return [];

  const segments: BezierSegment[] = [];
  const t6 = 6 * tension;

  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n]!;
    const pCurr = points[i]!;
    const pNext = points[(i + 1) % n]!;
    const pNext2 = points[(i + 2) % n]!;

    const c1: Point = {
      x: pCurr.x + (pNext.x - pPrev.x) / t6,
      y: pCurr.y + (pNext.y - pPrev.y) / t6,
    };

    const c2: Point = {
      x: pNext.x - (pNext2.x - pCurr.x) / t6,
      y: pNext.y - (pNext2.y - pCurr.y) / t6,
    };

    segments.push({ p0: pCurr, c1, c2, p3: pNext });
  }

  return segments;
}
