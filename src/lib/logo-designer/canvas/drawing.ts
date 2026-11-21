import type { Grid } from "../models/grid";

export interface CellCoord {
  row: number;
  col: number;
}

export type StrokeMode = "paint" | "erase";

export interface Stroke {
  mode: StrokeMode;
  visited: Set<string>;
  startedInsideGrid: boolean;
}

export function toggleCell(
  grid: Grid,
  layerId: string,
  row: number,
  col: number,
  color: string,
): void {
  const cell = grid.getCell(layerId, row, col);
  if (cell.filled) {
    grid.eraseCell(layerId, row, col);
  } else {
    grid.fillCell(layerId, row, col, color);
  }
}

export function createStroke(
  mode: StrokeMode,
  startCoord: CellCoord | null,
): Stroke {
  return {
    mode,
    visited: new Set<string>(),
    startedInsideGrid: startCoord !== null,
  };
}

export function applyStrokeStep(
  grid: Grid,
  layerId: string,
  stroke: Stroke,
  row: number,
  col: number,
  color: string,
): void {
  if (!stroke.startedInsideGrid) return;

  const key = `${row},${col}`;
  if (stroke.visited.has(key)) return;
  stroke.visited.add(key);

  if (stroke.mode === "paint") {
    grid.fillCell(layerId, row, col, color);
  } else {
    grid.eraseCell(layerId, row, col);
  }
}

export function applyStroke(
  grid: Grid,
  layerId: string,
  stroke: Stroke,
  cells: CellCoord[],
  color: string,
): void {
  for (const { row, col } of cells) {
    applyStrokeStep(grid, layerId, stroke, row, col, color);
  }
}
