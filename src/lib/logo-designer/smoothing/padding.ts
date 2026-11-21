import type { Grid } from "../models/grid";

export interface PaddedGrid {
  width: number;
  height: number;
  get(row: number, col: number): boolean;
  getColor(row: number, col: number): string | undefined;
}

export function padGrid(grid: Grid, layerId: string): PaddedGrid {
  const n = grid.n;
  const width = n + 2;
  const height = n + 2;

  return {
    width,
    height,
    get(row: number, col: number): boolean {
      if (row <= 0 || row > n || col <= 0 || col > n) return false;
      return grid.getCell(layerId, row - 1, col - 1).filled;
    },
    getColor(row: number, col: number): string | undefined {
      if (row <= 0 || row > n || col <= 0 || col > n) return undefined;
      return grid.getCell(layerId, row - 1, col - 1).color;
    },
  };
}
