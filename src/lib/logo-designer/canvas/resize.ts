import { Grid, assertValidGridSize } from "../models/grid";
import type { LayerManager } from "../models/layers";

export function resizeGrid(
  grid: Grid,
  layerManager: LayerManager,
  newN: number,
): Grid {
  assertValidGridSize(newN);

  const oldN = grid.n;
  const newGrid = new Grid(newN);

  for (const layer of layerManager.layers) {
    newGrid.initLayer(layer.id);

    for (let row = 0; row < newN; row++) {
      const srcRow = Math.min(Math.floor((row / newN) * oldN), oldN - 1);
      for (let col = 0; col < newN; col++) {
        const srcCol = Math.min(Math.floor((col / newN) * oldN), oldN - 1);
        const cell = grid.getCell(layer.id, srcRow, srcCol);
        if (cell.filled && cell.color !== undefined) {
          newGrid.fillCell(layer.id, row, col, cell.color);
        }
      }
    }
  }

  return newGrid;
}
