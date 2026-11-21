import type { PaddedGrid } from "./padding";

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
  isHole: boolean;
}

/**
 * Extract contour polygons from a binary grid using marching squares.
 * Uses 8-connectivity with corner-average disambiguation for saddle cases (5, 10).
 *
 * Returns an array of closed contours. Each contour's points follow cell
 * boundaries with no gaps. Outer contours have isHole=false; inner contours
 * (holes) have isHole=true.
 */
export function extractContours(grid: PaddedGrid): Contour[] {
  const h = grid.height;
  const w = grid.width;

  // Build the marching squares field: (h-1) x (w-1) cases
  // Each case is determined by 4 corners: TL, TR, BR, BL
  const rows = h - 1;
  const cols = w - 1;

  // Track which edges have been traversed
  // Edge key: "row,col,dir" where dir is 'T','R','B','L' of a case cell
  const visited = new Set<string>();
  const contours: Contour[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const caseIndex = getCaseIndex(grid, r, c);
      if (caseIndex === 0 || caseIndex === 15) continue;

      // Try to trace from each edge of this cell
      const edges = getEdgesForCase(caseIndex, grid, r, c);
      for (const [startEdge] of edges) {
        const key = edgeKey(r, c, startEdge);
        if (visited.has(key)) continue;

        const points = traceContour(grid, r, c, startEdge, visited, rows, cols);
        if (points.length >= 3) {
          const isHole = !isClockwise(points);
          contours.push({ points, isHole });
        }
      }
    }
  }

  return contours;
}

function getCaseIndex(grid: PaddedGrid, r: number, c: number): number {
  const tl = grid.get(r, c) ? 1 : 0;
  const tr = grid.get(r, c + 1) ? 1 : 0;
  const br = grid.get(r + 1, c + 1) ? 1 : 0;
  const bl = grid.get(r + 1, c) ? 1 : 0;
  return (tl << 3) | (tr << 2) | (br << 1) | bl;
}

type Edge = "T" | "R" | "B" | "L";

function getEdgePoint(r: number, c: number, edge: Edge): Point {
  switch (edge) {
    case "T": return { x: c + 0.5, y: r };
    case "R": return { x: c + 1, y: r + 0.5 };
    case "B": return { x: c + 0.5, y: r + 1 };
    case "L": return { x: c, y: r + 0.5 };
  }
}

// Returns pairs of [entry, exit] edges for a given case
function getEdgesForCase(
  caseIndex: number,
  grid: PaddedGrid,
  r: number,
  c: number,
): [Edge, Edge][] {
  // Saddle disambiguation for cases 5 and 10
  if (caseIndex === 5) {
    const avg = cornerAverage(grid, r, c);
    if (avg > 0.5) {
      return [["T", "R"], ["B", "L"]];
    }
    return [["T", "L"], ["B", "R"]];
  }
  if (caseIndex === 10) {
    const avg = cornerAverage(grid, r, c);
    if (avg > 0.5) {
      return [["L", "T"], ["R", "B"]];
    }
    return [["L", "B"], ["R", "T"]];
  }

  return CASE_EDGES[caseIndex] ?? [];
}

function cornerAverage(grid: PaddedGrid, r: number, c: number): number {
  const tl = grid.get(r, c) ? 1 : 0;
  const tr = grid.get(r, c + 1) ? 1 : 0;
  const br = grid.get(r + 1, c + 1) ? 1 : 0;
  const bl = grid.get(r + 1, c) ? 1 : 0;
  return (tl + tr + br + bl) / 4;
}

// For non-saddle cases, map case index to [entry, exit] edge pairs
const CASE_EDGES: Record<number, [Edge, Edge][]> = {
  0: [],
  1: [["B", "L"]],
  2: [["R", "B"]],
  3: [["R", "L"]],
  4: [["T", "R"]],
  5: [], // handled by saddle disambiguation
  6: [["T", "B"]],
  7: [["T", "L"]],
  8: [["L", "T"]],
  9: [["B", "T"]],
  10: [], // handled by saddle disambiguation
  11: [["R", "T"]],
  12: [["L", "R"]],
  13: [["B", "R"]],
  14: [["L", "B"]],
  15: [],
};

function oppositeEdge(edge: Edge): Edge {
  switch (edge) {
    case "T": return "B";
    case "B": return "T";
    case "L": return "R";
    case "R": return "L";
  }
}

function neighborCell(r: number, c: number, edge: Edge): [number, number] {
  switch (edge) {
    case "T": return [r - 1, c];
    case "B": return [r + 1, c];
    case "L": return [r, c - 1];
    case "R": return [r, c + 1];
  }
}

function edgeKey(r: number, c: number, edge: Edge): string {
  return `${r},${c},${edge}`;
}

function traceContour(
  grid: PaddedGrid,
  startR: number,
  startC: number,
  startEdge: Edge,
  visited: Set<string>,
  rows: number,
  cols: number,
): Point[] {
  const points: Point[] = [];
  let r = startR;
  let c = startC;
  let entryEdge = startEdge;
  let iterations = 0;
  const maxIterations = rows * cols * 4;

  do {
    const caseIndex = getCaseIndex(grid, r, c);
    const edges = getEdgesForCase(caseIndex, grid, r, c);

    // Find the exit edge for our entry
    let exitEdge: Edge | null = null;
    for (const [entry, exit] of edges) {
      if (entry === entryEdge) {
        exitEdge = exit;
        break;
      }
    }

    if (exitEdge === null) break;

    visited.add(edgeKey(r, c, entryEdge));
    visited.add(edgeKey(r, c, exitEdge));

    points.push(getEdgePoint(r, c, exitEdge));

    // Move to neighbor cell through the exit edge
    const [nr, nc] = neighborCell(r, c, exitEdge);
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;

    r = nr;
    c = nc;
    entryEdge = oppositeEdge(exitEdge);

    iterations++;
    if (iterations > maxIterations) break;
  } while (!(r === startR && c === startC && entryEdge === startEdge));

  return points;
}

function isClockwise(points: Point[]): boolean {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += (b.x - a.x) * (b.y + a.y);
  }
  return sum > 0;
}
