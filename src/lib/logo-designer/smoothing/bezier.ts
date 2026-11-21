import type { Point, Contour } from "./contour";
import { chaikinSubdivide } from "./subdivision";
import { rdpSimplify } from "./simplify";
import { fitCubicBeziers } from "./curveFit";

export interface BezierSegment {
  p0: Point;
  c1: Point;
  c2: Point;
  p3: Point;
}

export interface SmoothedPath {
  segments: BezierSegment[];
  isHole: boolean;
}

/**
 * Remove collinear points from a contour, keeping only corner vertices.
 */
function simplifyContour(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  const simplified: Point[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!;
    const curr = points[i]!;
    const next = points[(i + 1) % n]!;

    const cross =
      (curr.x - prev.x) * (next.y - curr.y) -
      (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 1e-10) {
      simplified.push(curr);
    }
  }

  return simplified.length >= 3 ? simplified : [...points];
}

/**
 * Create a straight-line bezier segment (degenerate cubic with control
 * points on the line).
 */
function lineBezier(p0: Point, p3: Point): BezierSegment {
  const dx = (p3.x - p0.x) / 3;
  const dy = (p3.y - p0.y) / 3;
  return {
    p0,
    c1: { x: p0.x + dx, y: p0.y + dy },
    c2: { x: p3.x - dx, y: p3.y - dy },
    p3,
  };
}

// Apple squircle bezier handle ratio — approximates a superellipse with n≈5.
// Standard circular arc uses κ≈0.5523; higher values keep edges straight
// longer before curving, producing the characteristic squircle shape.
const SQUIRCLE_KAPPA = 0.82;

/**
 * Convert a polygon contour to smooth cubic Bezier curves using squircle-like
 * corner rounding (continuous curvature, matching Apple's iOS icon shape).
 *
 * The algorithm:
 * 1. Collapse collinear marching-squares midpoints to corner vertices
 * 2. At each corner, inset along both edges by `radius` (controlled by alpha)
 * 3. Place bezier handles using a superellipse-derived kappa, creating curves
 *    that hug straight edges before smoothly rounding the corner
 *
 * alpha=0: sharp polygon corners (no rounding)
 * alpha=1: maximum squircle-style smoothing
 */
export function smoothContour(contour: Contour, alpha: number): SmoothedPath {
  const raw = contour.points;
  if (raw.length < 3) {
    return { segments: [], isHole: contour.isHole };
  }

  const a = Math.max(0, Math.min(1, alpha));
  const pts = simplifyContour(raw);
  const n = pts.length;

  if (n < 3) {
    return { segments: [], isHole: contour.isHole };
  }

  // alpha=0: return the simplified polygon as straight segments
  if (a < 1e-6) {
    const segments: BezierSegment[] = [];
    for (let i = 0; i < n; i++) {
      segments.push(lineBezier(pts[i]!, pts[(i + 1) % n]!));
    }
    return { segments, isHole: contour.isHole };
  }

  // Pre-compute edge lengths
  const edgeLengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const curr = pts[i]!;
    const next = pts[(i + 1) % n]!;
    edgeLengths.push(Math.hypot(next.x - curr.x, next.y - curr.y));
  }

  // For each corner vertex, compute the squircle arc endpoints and handles
  interface CornerArc {
    start: Point; // where the arc begins (on the incoming edge)
    end: Point; // where the arc ends (on the outgoing edge)
    c1: Point; // handle near start
    c2: Point; // handle near end
  }

  const corners: CornerArc[] = [];

  for (let i = 0; i < n; i++) {
    const curr = pts[i]!;
    const prev = pts[(i - 1 + n) % n]!;
    const next = pts[(i + 1) % n]!;

    const inLen = edgeLengths[(i - 1 + n) % n]!;
    const outLen = edgeLengths[i]!;

    const dirIn = {
      x: (prev.x - curr.x) / inLen,
      y: (prev.y - curr.y) / inLen,
    };
    const dirOut = {
      x: (next.x - curr.x) / outLen,
      y: (next.y - curr.y) / outLen,
    };

    // Rounding radius: up to half the shorter adjacent edge
    const maxRadius = Math.min(inLen, outLen) * 0.5;
    const radius = maxRadius * a;

    const start: Point = {
      x: curr.x + dirIn.x * radius,
      y: curr.y + dirIn.y * radius,
    };
    const end: Point = {
      x: curr.x + dirOut.x * radius,
      y: curr.y + dirOut.y * radius,
    };

    const handleLen = radius * SQUIRCLE_KAPPA;
    const c1: Point = {
      x: start.x - dirIn.x * handleLen,
      y: start.y - dirIn.y * handleLen,
    };
    const c2: Point = {
      x: end.x - dirOut.x * handleLen,
      y: end.y - dirOut.y * handleLen,
    };

    corners.push({ start, end, c1, c2 });
  }

  // Build path: corner curve, then straight line to next corner
  const segments: BezierSegment[] = [];

  for (let i = 0; i < n; i++) {
    const corner = corners[i]!;
    const nextCorner = corners[(i + 1) % n]!;

    // Squircle corner arc
    segments.push({
      p0: corner.start,
      c1: corner.c1,
      c2: corner.c2,
      p3: corner.end,
    });

    // Straight edge to next corner (skip if zero-length)
    const dist = Math.hypot(
      nextCorner.start.x - corner.end.x,
      nextCorner.start.y - corner.end.y,
    );
    if (dist > 1e-6) {
      segments.push(lineBezier(corner.end, nextCorner.start));
    }
  }

  return { segments, isHole: contour.isHole };
}

/**
 * Convert a polygon contour to smooth cubic Bezier curves using Chaikin
 * subdivision, RDP simplification, and Catmull-Rom curve fitting.
 *
 * This pipeline produces genuinely smooth curves from staircase polygons,
 * unlike squircle corner rounding which only rounds corners.
 *
 * alpha controls overall smoothness:
 *   - More subdivision passes at higher alpha
 *   - Less RDP simplification at higher alpha (preserve detail)
 *   - Higher Catmull-Rom tension at higher alpha (smoother curves)
 */
export function smoothContourSubdivision(
  contour: Contour,
  alpha: number,
): SmoothedPath {
  const raw = contour.points;
  if (raw.length < 3) {
    return { segments: [], isHole: contour.isHole };
  }

  const a = Math.max(0, Math.min(1, alpha));

  // Step 1: Remove collinear points
  const simplified = simplifyContour(raw);
  if (simplified.length < 3) {
    return { segments: [], isHole: contour.isHole };
  }

  // Step 2: Chaikin subdivision — more passes at higher alpha
  let passes: number;
  if (a < 0.2) passes = 1;
  else if (a < 0.4) passes = 2;
  else if (a < 0.6) passes = 3;
  else if (a < 0.8) passes = 4;
  else passes = 5;

  const subdivided = chaikinSubdivide(simplified, passes);

  // Step 3: RDP simplification — less aggressive at higher alpha
  const epsilon = 0.02 + (1 - a) * 0.08;
  const rdpResult = rdpSimplify(subdivided, epsilon);

  // Step 4: Catmull-Rom curve fitting — higher tension at higher alpha
  const tension = 0.4 + a * 0.2;
  const segments = fitCubicBeziers(rdpResult, tension);

  return { segments, isHole: contour.isHole };
}

/**
 * Convert a SmoothedPath to an SVG path data string.
 */
export function pathToSvgD(path: SmoothedPath): string {
  if (path.segments.length === 0) return "";

  const first = path.segments[0]!;
  let d = `M ${first.p0.x} ${first.p0.y}`;

  for (const seg of path.segments) {
    d += ` C ${seg.c1.x} ${seg.c1.y}, ${seg.c2.x} ${seg.c2.y}, ${seg.p3.x} ${seg.p3.y}`;
  }

  d += " Z";
  return d;
}
