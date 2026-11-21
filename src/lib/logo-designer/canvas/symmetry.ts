import type { SymmetryMode } from "../models/tools";

export interface CellCoord {
  row: number;
  col: number;
}

/**
 * Expands each input cell into a size x size block, clamped to the
 * grid bounds. Returns deduplicated coordinates.
 *
 * - size=1: no expansion (identity)
 * - size=2: expands (r,c) to (r,c), (r,c+1), (r+1,c), (r+1,c+1)
 * - size=3: expands to 3x3 centered on the original cell
 */
export function expandBrush(
  cells: CellCoord[],
  size: number,
  gridN: number,
): CellCoord[] {
  if (size <= 1) return cells;

  const offset = Math.floor((size - 1) / 2);
  const seen = new Set<string>();
  const result: CellCoord[] = [];

  for (const { row, col } of cells) {
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        const r = row - offset + dr;
        const c = col - offset + dc;

        if (r < 0 || r >= gridN || c < 0 || c >= gridN) continue;

        const key = `${r},${c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ row: r, col: c });
      }
    }
  }

  return result;
}

/**
 * Mirrors cells according to the symmetry mode. Always includes the
 * original cells. Returns deduplicated coordinates.
 *
 * - 'none': identity
 * - 'horizontal': mirrors across the vertical center (col' = gridN - 1 - col)
 * - 'vertical': mirrors across the horizontal center (row' = gridN - 1 - row)
 * - 'both': applies horizontal, vertical, and diagonal (both flipped) mirrors
 */
export function mirrorCells(
  cells: CellCoord[],
  gridN: number,
  mode: SymmetryMode,
): CellCoord[] {
  if (mode === "none") return cells;

  const seen = new Set<string>();
  const result: CellCoord[] = [];

  function add(row: number, col: number): void {
    const key = `${row},${col}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ row, col });
    }
  }

  for (const { row, col } of cells) {
    add(row, col);

    if (mode === "horizontal" || mode === "both") {
      add(row, gridN - 1 - col);
    }

    if (mode === "vertical" || mode === "both") {
      add(gridN - 1 - row, col);
    }

    if (mode === "both") {
      add(gridN - 1 - row, gridN - 1 - col);
    }
  }

  return result;
}
