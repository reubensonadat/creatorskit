import type { Point } from "./contour";

/**
 * Perpendicular distance from point `p` to the line through `a` and `b`.
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  return (
    Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) /
    Math.sqrt(lenSq)
  );
}

/**
 * Standard Ramer-Douglas-Peucker on an open polyline.
 */
function rdpOpen(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  const first = points[0]!;
  const last = points[points.length - 1]!;

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i]!, first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpOpen(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpOpen(points.slice(maxIndex), epsilon);
    // Remove duplicate point at the join
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Ramer-Douglas-Peucker simplification for closed polygons.
 *
 * Finds the point farthest from the centroid, uses it as the split point,
 * then runs RDP on the "opened" polygon from that point. Preserves at
 * least 3 points.
 *
 * @param points  Closed polygon vertices
 * @param epsilon Distance threshold for point elimination
 * @returns       Simplified polygon vertices (minimum 3 points)
 */
export function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 3) return [...points];

  // Find centroid
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Find the point farthest from the centroid
  let maxDist = 0;
  let splitIndex = 0;
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(points[i]!.x - cx, points[i]!.y - cy);
    if (d > maxDist) {
      maxDist = d;
      splitIndex = i;
    }
  }

  // Open the polygon at the split point so it appears as start and end
  const opened: Point[] = [];
  for (let i = 0; i <= points.length; i++) {
    opened.push(points[(splitIndex + i) % points.length]!);
  }

  const simplified = rdpOpen(opened, epsilon);

  // Remove the duplicate closing point (first === last)
  const result = simplified.slice(0, -1);

  // Ensure at least 3 points
  if (result.length < 3) return [...points];

  return result;
}
