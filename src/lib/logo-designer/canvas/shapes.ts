import type { Grid } from "../models/grid";

export interface CellCoord {
  row: number;
  col: number;
}

/**
 * Bresenham's line algorithm. Returns all cells along the line
 * from (r0, c0) to (r1, c1).
 */
export function bresenhamLine(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): CellCoord[] {
  const cells: CellCoord[] = [];

  let dr = Math.abs(r1 - r0);
  let dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  let r = r0;
  let c = c0;

  for (;;) {
    cells.push({ row: r, col: c });
    if (r === r1 && c === c1) break;

    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r += sr;
    }
    if (e2 < dr) {
      err += dr;
      c += sc;
    }
  }

  return cells;
}

/**
 * Returns all cells forming a rectangle defined by opposite corners
 * (r0, c0) and (r1, c1). If `filled` is true, returns every cell in
 * the bounding box; otherwise returns only perimeter cells.
 */
export function rectangleCells(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  filled: boolean,
): CellCoord[] {
  const minR = Math.min(r0, r1);
  const maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1);
  const maxC = Math.max(c0, c1);

  const cells: CellCoord[] = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (filled || r === minR || r === maxR || c === minC || c === maxC) {
        cells.push({ row: r, col: c });
      }
    }
  }

  return cells;
}

/**
 * Returns all cells forming an ellipse inscribed in the bounding box
 * defined by opposite corners (r0, c0) and (r1, c1).
 *
 * Uses the midpoint ellipse algorithm for the outline. For filled
 * ellipses, fills each scanline between the ellipse boundaries.
 */
export function ellipseCells(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  filled: boolean,
): CellCoord[] {
  const minR = Math.min(r0, r1);
  const maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1);
  const maxC = Math.max(c0, c1);

  const a = (maxC - minC) / 2;
  const b = (maxR - minR) / 2;
  const cx = (minC + maxC) / 2;
  const cy = (minR + maxR) / 2;

  // Degenerate: point
  if (a === 0 && b === 0) {
    return [{ row: Math.round(cy), col: Math.round(cx) }];
  }

  // Degenerate: horizontal line
  if (b === 0) {
    const cells: CellCoord[] = [];
    const row = Math.round(cy);
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row, col: c });
    }
    return cells;
  }

  // Degenerate: vertical line
  if (a === 0) {
    const cells: CellCoord[] = [];
    const col = Math.round(cx);
    for (let r = minR; r <= maxR; r++) {
      cells.push({ row: r, col });
    }
    return cells;
  }

  // Use a Set to deduplicate
  const seen = new Set<string>();
  const cells: CellCoord[] = [];

  function add(row: number, col: number): void {
    const key = `${row},${col}`;
    if (!seen.has(key)) {
      seen.add(key);
      cells.push({ row, col });
    }
  }

  function plotSymmetric(dr: number, dc: number): void {
    const rTop = Math.round(cy - dr);
    const rBot = Math.round(cy + dr);
    const cLeft = Math.round(cx - dc);
    const cRight = Math.round(cx + dc);

    if (filled) {
      for (let c = cLeft; c <= cRight; c++) {
        add(rTop, c);
        add(rBot, c);
      }
    } else {
      add(rTop, cLeft);
      add(rTop, cRight);
      add(rBot, cLeft);
      add(rBot, cRight);
    }
  }

  // Region 1: |slope| < 1
  let dr = 0;
  let dc = a;
  let d1 = b * b - a * a * b + 0.25 * a * a;

  plotSymmetric(dr, dc);

  while (2 * b * b * dc > 2 * a * a * dr) {
    if (d1 < 0) {
      dr++;
      d1 += 2 * b * b * dr + b * b;
    } else {
      dr++;
      dc--;
      d1 += 2 * b * b * dr - 2 * a * a * dc + b * b;
    }
    plotSymmetric(dr, dc);
  }

  // Region 2: |slope| >= 1
  let d2 =
    b * b * (dr + 0.5) * (dr + 0.5) +
    a * a * (dc - 1) * (dc - 1) -
    a * a * b * b;

  while (dc >= 0) {
    plotSymmetric(dr, dc);
    if (d2 > 0) {
      dc--;
      d2 += a * a - 2 * a * a * dc;
    } else {
      dc--;
      dr++;
      d2 += 2 * b * b * dr - 2 * a * a * dc + a * a;
    }
  }

  return cells;
}

/**
 * BFS-based flood fill. Returns all cells that should be changed,
 * without mutating the grid.
 *
 * Fills all connected cells (4-connected) that match the target state
 * at (startRow, startCol).
 */
export function floodFill(
  grid: Grid,
  layerId: string,
  startRow: number,
  startCol: number,
  newColor: string,
): CellCoord[] {
  const n = grid.n;

  if (startRow < 0 || startRow >= n || startCol < 0 || startCol >= n) {
    return [];
  }

  const target = grid.getCell(layerId, startRow, startCol);

  // If the target is already the new color and filled, nothing to do
  if (target.filled && target.color === newColor) {
    return [];
  }

  const result: CellCoord[] = [];
  const visited = new Set<string>();
  const queue: CellCoord[] = [{ row: startRow, col: startCol }];
  const startKey = `${startRow},${startCol}`;
  visited.add(startKey);

  function matches(row: number, col: number): boolean {
    const cell = grid.getCell(layerId, row, col);
    return cell.filled === target.filled && cell.color === target.color;
  }

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    result.push({ row, col });

    const neighbors: [number, number][] = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      if (!matches(nr, nc)) continue;
      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  return result;
}
