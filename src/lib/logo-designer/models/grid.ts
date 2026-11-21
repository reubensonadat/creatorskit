export const GRID_MIN = 8;
export const GRID_MAX = 128;

export function clampGridSize(n: number): number {
  return Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(n)));
}

export function assertValidGridSize(n: number): void {
  if (!Number.isInteger(n) || n < GRID_MIN || n > GRID_MAX) {
    throw new RangeError(
      `Grid size must be an integer between ${GRID_MIN} and ${GRID_MAX}, got ${n}`,
    );
  }
}

export interface CellData {
  filled: boolean;
  color: string | undefined;
}

export type LayerCells = CellData[];

export class Grid {
  private _n: number;
  private _layers: Map<string, LayerCells>;

  constructor(n: number) {
    assertValidGridSize(n);
    this._n = n;
    this._layers = new Map();
  }

  get n(): number {
    return this._n;
  }

  resize(n: number): void {
    assertValidGridSize(n);
    this._n = n;
    for (const layerId of this._layers.keys()) {
      this._layers.set(layerId, this._emptyLayer());
    }
  }

  initLayer(layerId: string): void {
    if (!this._layers.has(layerId)) {
      this._layers.set(layerId, this._emptyLayer());
    }
  }

  removeLayer(layerId: string): void {
    this._layers.delete(layerId);
  }

  getCell(layerId: string, row: number, col: number): CellData {
    this._assertInBounds(row, col);
    const cells = this._layers.get(layerId);
    if (!cells) {
      return { filled: false, color: undefined };
    }
    return cells[row * this._n + col]!;
  }

  setCell(
    layerId: string,
    row: number,
    col: number,
    data: CellData,
  ): void {
    this._assertInBounds(row, col);
    if (!this._layers.has(layerId)) {
      this._layers.set(layerId, this._emptyLayer());
    }
    this._layers.get(layerId)![row * this._n + col] = { ...data };
  }

  fillCell(layerId: string, row: number, col: number, color: string): void {
    this.setCell(layerId, row, col, { filled: true, color });
  }

  eraseCell(layerId: string, row: number, col: number): void {
    this.setCell(layerId, row, col, { filled: false, color: undefined });
  }

  getLayerCells(layerId: string): LayerCells {
    if (!this._layers.has(layerId)) {
      this.initLayer(layerId);
    }
    return [...this._layers.get(layerId)!];
  }

  private _emptyLayer(): LayerCells {
    return Array.from({ length: this._n * this._n }, () => ({
      filled: false,
      color: undefined,
    }));
  }

  private _assertInBounds(row: number, col: number): void {
    if (row < 0 || row >= this._n || col < 0 || col >= this._n) {
      throw new RangeError(
        `Cell (${row}, ${col}) is out of bounds for grid of size ${this._n}`,
      );
    }
  }
}
