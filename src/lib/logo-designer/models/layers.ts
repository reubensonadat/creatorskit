export const LAYER_MIN_COUNT = 2;
export const LAYER_MAX_COUNT = 3;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  rotation: number;
}

let _nextId = 1;
function generateLayerId(): string {
  return `layer-${_nextId++}`;
}

export class LayerManager {
  private _layers: Layer[];
  private _activeLayerId: string;

  constructor(initialLayers?: Layer[]) {
    if (initialLayers) {
      if (
        initialLayers.length < LAYER_MIN_COUNT ||
        initialLayers.length > LAYER_MAX_COUNT
      ) {
        throw new RangeError(
          `Layer count must be between ${LAYER_MIN_COUNT} and ${LAYER_MAX_COUNT}`,
        );
      }
      this._layers = initialLayers.map((l) => ({ ...l }));
    } else {
      this._layers = [
        { id: generateLayerId(), name: "Layer 1", visible: true, rotation: 0 },
        { id: generateLayerId(), name: "Layer 2", visible: true, rotation: 0 },
      ];
    }
    this._activeLayerId = this._layers[this._layers.length - 1]!.id;
  }

  get layers(): readonly Layer[] {
    return this._layers;
  }

  get activeLayerId(): string {
    return this._activeLayerId;
  }

  getLayer(id: string): Layer | undefined {
    return this._layers.find((l) => l.id === id);
  }

  getActiveLayer(): Layer {
    const layer = this.getLayer(this._activeLayerId);
    if (!layer) {
      throw new Error(`Active layer ${this._activeLayerId} not found`);
    }
    return layer;
  }

  setActiveLayer(id: string): void {
    if (!this.getLayer(id)) {
      throw new Error(`Layer ${id} does not exist`);
    }
    this._activeLayerId = id;
  }

  toggleVisibility(id: string): void {
    const layer = this._requireLayer(id);
    layer.visible = !layer.visible;
  }

  setVisibility(id: string, visible: boolean): void {
    const layer = this._requireLayer(id);
    layer.visible = visible;
  }

  addLayer(name?: string): Layer {
    if (this._layers.length >= LAYER_MAX_COUNT) {
      throw new Error(
        `Cannot add layer: maximum of ${LAYER_MAX_COUNT} layers reached`,
      );
    }
    const layer: Layer = {
      id: generateLayerId(),
      name: name ?? `Layer ${this._layers.length + 1}`,
      visible: true,
      rotation: 0,
    };
    this._layers.push(layer);
    return layer;
  }

  removeLayer(id: string): void {
    if (this._layers.length <= LAYER_MIN_COUNT) {
      throw new Error(
        `Cannot remove layer: minimum of ${LAYER_MIN_COUNT} layers required`,
      );
    }
    const idx = this._layerIndex(id);
    this._layers.splice(idx, 1);
    if (this._activeLayerId === id) {
      this._activeLayerId = this._layers[this._layers.length - 1]!.id;
    }
  }

  moveLayerUp(id: string): void {
    const idx = this._layerIndex(id);
    if (idx < this._layers.length - 1) {
      const tmp = this._layers[idx]!;
      this._layers[idx] = this._layers[idx + 1]!;
      this._layers[idx + 1] = tmp;
    }
  }

  moveLayerDown(id: string): void {
    const idx = this._layerIndex(id);
    if (idx > 0) {
      const tmp = this._layers[idx]!;
      this._layers[idx] = this._layers[idx - 1]!;
      this._layers[idx - 1] = tmp;
    }
  }

  setRotation(id: string, degrees: number): void {
    const layer = this._requireLayer(id);
    layer.rotation = degrees;
  }

  getVisibleLayers(): readonly Layer[] {
    return this._layers.filter((l) => l.visible);
  }

  private _requireLayer(id: string): Layer {
    const layer = this.getLayer(id);
    if (!layer) {
      throw new Error(`Layer ${id} does not exist`);
    }
    return layer;
  }

  private _layerIndex(id: string): number {
    const idx = this._layers.findIndex((l) => l.id === id);
    if (idx === -1) {
      throw new Error(`Layer ${id} does not exist`);
    }
    return idx;
  }
}
