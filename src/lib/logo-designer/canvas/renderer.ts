import type { Grid } from "../models/grid";
import type { LayerManager } from "../models/layers";

export function compositeRender(
  grid: Grid,
  layerManager: LayerManager,
): (string | null)[] {
  const n = grid.n;
  const result: (string | null)[] = new Array<string | null>(n * n).fill(null);

  const visibleLayers = layerManager.getVisibleLayers();

  for (const layer of visibleLayers) {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const cell = grid.getCell(layer.id, row, col);
        if (cell.filled && cell.color !== undefined) {
          result[row * n + col] = cell.color;
        }
      }
    }
  }

  return result;
}
