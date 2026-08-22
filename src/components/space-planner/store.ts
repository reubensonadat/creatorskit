import { create } from 'zustand';
import type { PlacedObject, CreatorTemplateId, ViewMode, Currency, ProjectInfo, SpacingWarning, WarningType, EquipmentId, WindowPlacement } from './types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import { COMPREHENSIVE_TEMPLATES } from './templates';

// Generate unique ID
let idCounter = 0;
function uid(): string {
  return `obj-${Date.now()}-${++idCounter}`;
}

// Clamp helper
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface StoreState {
  // Room
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;

  // Template & view
  templateId: CreatorTemplateId;
  viewMode: ViewMode;

  // Objects
  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  placingEquipmentId: EquipmentId | null;

  // Currency & budget
  currency: Currency;

  // Project info
  projectInfo: ProjectInfo;

  // Windows
  windows: WindowPlacement[];

  // UI state
  showBudgetPanel: boolean;
  showProjectInfo: boolean;
  showWarnings: boolean;
  showCameraPreview: boolean;
  showLuxHeatmap: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Actions
  setRoomDimensions: (width: number, depth: number) => void;
  setTemplateId: (id: CreatorTemplateId) => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrency: (c: Currency) => void;
  setPlacingEquipment: (id: EquipmentId | null) => void;
  placeObject: (equipmentId: EquipmentId, x: number, z: number, rotationY?: number, isMainCamera?: boolean) => string;
  replacePlacedObjects: (objects: PlacedObject[]) => void;
  updateObjectPosition: (id: string, x: number, z: number) => void;
  updateObjectRotation: (id: string, rotationY: number) => void;
  updateObjectLens: (id: string, lens: CameraLensPreset) => void;
  updateObjectLight: (id: string, settings: Partial<LightSettings>) => void;
  setSelectedObject: (id: string | null) => void;
  setMainCamera: (id: string) => void;
  setObjectParent: (id: string, parentId?: string) => void;
  setObjectElevation: (id: string, elevationY?: number) => void;
  deleteObject: (id: string) => void;
  clearAll: () => void;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  setCustomPrice: (id: string, currency: Currency, price: number) => void;
  addWindow: (wall: 'back' | 'left') => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowPlacement>) => void;
  toggleBudgetPanel: () => void;
  toggleProjectInfo: () => void;
  toggleWarnings: () => void;
  toggleCameraPreview: () => void;
  toggleLuxHeatmap: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadTemplate: (templateId: CreatorTemplateId) => void;
  getPowerTotal: () => number;
  getBudgetTotal: () => number;
  getWarnings: () => SpacingWarning[];
  getObjectY: (obj: PlacedObject) => number;
}

export const usePlannerStore = create<StoreState>((set, get) => ({
  roomWidth: 5,
  roomDepth: 4,
  roomHeight: 3.0,

  templateId: 'bedroom-studio',
  viewMode: 'perspective',

  placedObjects: [],
  selectedObjectId: null,
  placingEquipmentId: null,

  currency: 'USD',

  projectInfo: {
    name: 'My Creator Setup',
    location: '',
    notes: '',
    supplierContact: '',
  },

  windows: [
    { id: 'win-default-1', wall: 'back', xOffset: 0, width: 1.2, height: 1.0, heightOffset: 1.5 },
  ],

  showBudgetPanel: false,
  showProjectInfo: false,
  showWarnings: false,
  showCameraPreview: false,
  showLuxHeatmap: false,
  isOrbitPanning: false,
  leftPanelOpen: true,
  rightPanelOpen: true,

  setRoomDimensions: (width, depth) => set({
    roomWidth: clamp(width, 2, 20),
    roomDepth: clamp(depth, 2, 20),
  }),

  setTemplateId: (id) => set({ templateId: id }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setCurrency: (c) => set({ currency: c }),

  setPlacingEquipment: (id) => set({
    placingEquipmentId: id,
    selectedObjectId: null,
  }),

  placeObject: (equipmentId, x, z, rotationY = 0, isMainCamera = false, parentId?: string) => {
    const id = uid();
    const obj: PlacedObject = {
      id,
      equipmentId,
      x,
      z,
      rotationY,
      isMainCamera,
      parentId,
    };
    set((s) => ({
      placedObjects: [...s.placedObjects, obj],
    }));
    return id;
  },

  replacePlacedObjects: (objects) => set({
    placedObjects: objects,
    selectedObjectId: null,
    placingEquipmentId: null,
  }),

  updateObjectPosition: (id, x, z) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, x, z } : o
    ),
  })),

  updateObjectRotation: (id, rotationY) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, rotationY } : o
    ),
  })),

  updateObjectLens: (id, lens) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, lensPreset: lens } : o
    ),
  })),

  updateObjectLight: (id, settings) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id
        ? {
            ...o,
            lightSettings: {
              intensity: o.lightSettings?.intensity ?? 80,
              colorTempKelvin: o.lightSettings?.colorTempKelvin ?? 5600,
              colorHex: o.lightSettings?.colorHex ?? '#FFFFFF',
              beamAngle: o.lightSettings?.beamAngle ?? 60,
              ...settings,
            },
          }
        : o
    ),
  })),

  setSelectedObject: (id) => set({ selectedObjectId: id }),

  setMainCamera: (id) => set((s) => ({
    placedObjects: s.placedObjects.map((o) => ({
      ...o,
      isMainCamera: o.id === id,
    })),
  })),

  setObjectParent: (id, parentId) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, parentId } : o
    ),
  })),

  setObjectElevation: (id, elevationY) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, elevationY } : o
    ),
  })),

  deleteObject: (id) => set((s) => {
    // Find all children recursively
    const toDelete = new Set<string>();
    const findChildren = (parentId: string) => {
      s.placedObjects.forEach((o) => {
        if (o.parentId === parentId && !toDelete.has(o.id)) {
          toDelete.add(o.id);
          findChildren(o.id);
        }
      });
    };
    toDelete.add(id);
    findChildren(id);
    return {
      placedObjects: s.placedObjects.filter((o) => !toDelete.has(o.id)),
      selectedObjectId: toDelete.has(s.selectedObjectId ?? '') ? null : s.selectedObjectId,
    };
  }),

  clearAll: () => set({ placedObjects: [], selectedObjectId: null }),

  setProjectInfo: (info) => set((s) => ({
    projectInfo: { ...s.projectInfo, ...info },
  })),

  setCustomPrice: (id, currency, price) => set((s) => ({
    placedObjects: s.placedObjects.map((o) => {
      if (o.id !== id) return o;
      if (currency === 'USD') return { ...o, customPriceUSD: price };
      if (currency === 'EUR') return { ...o, customPriceEUR: price };
      if (currency === 'GBP') return { ...o, customPriceGBP: price };
      if (currency === 'GHS') return { ...o, customPriceGHS: price };
      return { ...o, customPriceNGN: price };
    }),
  })),

  toggleBudgetPanel: () => set((s) => ({ showBudgetPanel: !s.showBudgetPanel })),
  toggleProjectInfo: () => set((s) => ({ showProjectInfo: !s.showProjectInfo })),
  toggleWarnings: () => set((s) => ({ showWarnings: !s.showWarnings })),
  toggleCameraPreview: () => set((s) => ({ showCameraPreview: !s.showCameraPreview })),
  toggleLuxHeatmap: () => set((s) => ({ showLuxHeatmap: !s.showLuxHeatmap })),
  toggleOrbitPanning: () => set((s) => ({ isOrbitPanning: !s.isOrbitPanning })),
  setOrbitPanning: (panning: boolean) => set({ isOrbitPanning: panning }),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  addWindow: (wall) => set((s) => ({
    windows: [...s.windows, {
      id: `win-${Date.now()}`,
      wall,
      xOffset: 0,
      width: 1.0,
      height: 0.8,
      heightOffset: 1.4,
    }],
  })),

  removeWindow: (id) => set((s) => ({
    windows: s.windows.filter((w) => w.id !== id),
  })),

  updateWindow: (id, updates) => set((s) => ({
    windows: s.windows.map((w) => w.id === id ? { ...w, ...updates } : w),
  })),

  loadTemplate: (templateId) => {
    const tpl = COMPREHENSIVE_TEMPLATES[templateId];
    if (!tpl) return;
    // First pass: create objects without parentId
    const idMap: Record<number, string> = {};
    const objects: PlacedObject[] = tpl.items.map((item, idx) => {
      const id = uid();
      idMap[idx] = id;
      return {
        id,
        equipmentId: item.equipmentId,
        x: item.x,
        z: item.z,
        rotationY: item.rotationY,
        isMainCamera: item.isMainCamera,
      };
    });
    // Second pass: resolve parentId references
    tpl.items.forEach((item, idx) => {
      if (item.parentId !== undefined) {
        objects[idx].parentId = idMap[item.parentId];
      }
    });
    set({
      templateId,
      roomWidth: tpl.defaultRoom.width,
      roomDepth: tpl.defaultRoom.depth,
      placedObjects: objects,
      selectedObjectId: null,
      placingEquipmentId: null,
    });
  },

  getPowerTotal: () => {
    return get().placedObjects.reduce((sum, o) => {
      return sum + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts ?? 0);
    }, 0);
  },

  getBudgetTotal: () => {
    const state = get();
    return state.placedObjects.reduce((sum, o) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
      if (!def) return sum;
      if (state.currency === 'USD') {
        return sum + (o.customPriceUSD ?? def.defaultPriceUSD ?? Math.round(def.defaultPriceGHS / 15));
      }
      if (state.currency === 'EUR') {
        return sum + (o.customPriceEUR ?? def.defaultPriceEUR ?? Math.round(def.defaultPriceGHS / 16));
      }
      if (state.currency === 'GBP') {
        return sum + (o.customPriceGBP ?? def.defaultPriceGBP ?? Math.round(def.defaultPriceGHS / 19));
      }
      if (state.currency === 'GHS') {
        return sum + (o.customPriceGHS ?? def.defaultPriceGHS);
      }
      return sum + (o.customPriceNGN ?? def.defaultPriceNGN);
    }, 0);
  },

  getWarnings: () => {
    const state = get();
    const warnings: SpacingWarning[] = [];
    const objs = state.placedObjects;
    const hw = state.roomWidth / 2;
    const hd = state.roomDepth / 2;
    const wallThreshold = 0.3;

    // Equipment too close to wall
    objs.forEach((o) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
      if (!def) return;
      const halfW = def.dimensions.width / 2;
      const halfD = def.dimensions.depth / 2;
      if (Math.abs(o.x) + halfW > hw - wallThreshold ||
          Math.abs(o.z) + halfD > hd - wallThreshold) {
        warnings.push({
          type: 'equipment-near-wall',
          severity: 'warning',
          message: `${def.name} may be too close to a wall. Consider pulling it inward for better access.`,
          objectIds: [o.id],
        });
      }
    });

    // Camera too close to subject (backdrop)
    const cameras = objs.filter((o) => o.equipmentId === 'camera');
    const backdrops = objs.filter((o) => o.equipmentId === 'backdrop');
    cameras.forEach((cam) => {
      backdrops.forEach((bd) => {
        const dist = Math.sqrt((cam.x - bd.x) ** 2 + (cam.z - bd.z) ** 2);
        if (dist < 1.5) {
          warnings.push({
            type: 'camera-too-close',
            severity: 'danger',
            message: `Camera is only ${dist.toFixed(1)}m from the backdrop. Move it further back for a wider shot.`,
            objectIds: [cam.id, bd.id],
          });
        }
      });
    });

    // Lights too close together
    const lights = objs.filter((o) => o.equipmentId === 'led-light' || o.equipmentId === 'softbox');
    for (let i = 0; i < lights.length; i++) {
      for (let j = i + 1; j < lights.length; j++) {
        const dist = Math.sqrt((lights[i].x - lights[j].x) ** 2 + (lights[i].z - lights[j].z) ** 2);
        if (dist < 0.8) {
          warnings.push({
            type: 'lights-too-close',
            severity: 'warning',
            message: `Two lights are only ${dist.toFixed(1)}m apart. Spread them out for more even lighting.`,
            objectIds: [lights[i].id, lights[j].id],
          });
        }
      }
    }

    // Power load check (planning guidance only)
    const totalWatts = state.getPowerTotal();
    if (totalWatts > 0) {
      // Typical Ghana/Nigeria wall socket: 13A @ 220V = ~2860W
      const socketLimit = 2860;
      const hasGenerator = objs.some((o) => o.equipmentId === 'generator');
      const hasPowerStation = objs.some((o) => o.equipmentId === 'power-station');
      if (totalWatts > socketLimit && !hasGenerator && !hasPowerStation) {
        warnings.push({
          type: 'power-overload',
          severity: 'danger',
          message: `Total power draw is ~${totalWatts}W, which may exceed a single socket (~${socketLimit}W). Consider adding a generator or power station.`,
        });
      } else if (totalWatts > socketLimit * 0.8) {
        warnings.push({
          type: 'power-overload',
          severity: 'info',
          message: `Power draw is ~${totalWatts}W — getting close to socket limit. This is planning guidance only.`,
        });
      }
    }

    // Walking path check
    if (objs.length > 3) {
      const roomArea = state.roomWidth * state.roomDepth;
      const objectFootprint = objs.reduce((sum, o) => {
        const d = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.dimensions ?? { width: 0.5, depth: 0.5 };
        return sum + d.width * d.depth;
      }, 0);
      const usedRatio = objectFootprint / roomArea;
      if (usedRatio > 0.45) {
        warnings.push({
          type: 'no-walking-path',
          severity: 'warning',
          message: `Equipment covers ~${(usedRatio * 100).toFixed(0)}% of the floor. Make sure there is a clear path to move around.`,
        });
      }
    }

    return warnings;
  },

  getObjectY: (obj) => {
    let baseY = 0;
    if (obj.parentId) {
      const state = get();
      const parent = state.placedObjects.find((o) => o.id === obj.parentId);
      if (parent) {
        const parentDef = COMPREHENSIVE_EQUIPMENT_CATALOG[parent.equipmentId];
        const parentY = state.getObjectY(parent);
        baseY = parentY + (parentDef?.surfaceHeight ?? parentDef?.dimensions.height ?? 0.74);
      }
    }
    return baseY + (obj.elevationY ?? 0);
  },
}));
