import type { Grid } from "../models/grid";
import type { LayerManager } from "../models/layers";
import type { PaddedGrid } from "./padding";
import { extractContours, type Contour } from "./contour";

export interface ColoredContour extends Contour {
  color: string;
}

export interface LayerContours {
  layerId: string;
  contours: ColoredContour[];
}

/**
 * Create a padded grid view that only considers cells of a specific color.
 */
function padGridForColor(grid: Grid, layerId: string, color: string): PaddedGrid {
  const n = grid.n;
  const width = n + 2;
  const height = n + 2;

  return {
    width,
    height,
    get(row: number, col: number): boolean {
      if (row <= 0 || row > n || col <= 0 || col > n) return false;
      const cell = grid.getCell(layerId, row - 1, col - 1);
      return cell.filled && cell.color === color;
    },
    getColor(row: number, col: number): string | undefined {
      if (row <= 0 || row > n || col <= 0 || col > n) return undefined;
      const cell = grid.getCell(layerId, row - 1, col - 1);
      if (cell.filled && cell.color === color) return cell.color;
      return undefined;
    },
  };
}

/**
 * Extract contours per color from a single layer.
 */
export function extractColorContours(
  grid: Grid,
  layerId: string,
): ColoredContour[] {
  const n = grid.n;
  const colors = new Set<string>();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = grid.getCell(layerId, r, c);
      if (cell.filled && cell.color !== undefined) {
        colors.add(cell.color);
      }
    }
  }

  const result: ColoredContour[] = [];

  for (const color of colors) {
    const padded = padGridForColor(grid, layerId, color);
    const contours = extractContours(padded);
    for (const contour of contours) {
      result.push({ ...contour, color });
    }
  }

  return result;
}

/**
 * Extract contours for all visible layers, grouped by layer.
 * Hidden layers are excluded.
 */
export function extractAllLayerContours(
  grid: Grid,
  layerManager: LayerManager,
): LayerContours[] {
  const result: LayerContours[] = [];

  for (const layer of layerManager.getVisibleLayers()) {
    const contours = extractColorContours(grid, layer.id);
    result.push({ layerId: layer.id, contours });
  }

  return result;
}
