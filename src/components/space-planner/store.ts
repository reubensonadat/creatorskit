import { create } from 'zustand';
import type { PlacedObject, CreatorTemplateId, ViewMode, Currency, ProjectInfo, SpacingWarning, WarningType, EquipmentId } from './types';
import { EQUIPMENT_CATALOG } from './equipment';
import { CREATOR_TEMPLATES } from './templates';

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

  // UI state
  showBudgetPanel: boolean;
  showProjectInfo: boolean;
  showWarnings: boolean;
  showCameraPreview: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Actions
  setRoomDimensions: (width: number, depth: number) => void;
  setTemplateId: (id: CreatorTemplateId) => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrency: (c: Currency) => void;
  setPlacingEquipment: (id: EquipmentId | null) => void;
  placeObject: (equipmentId: EquipmentId, x: number, z: number, rotationY?: number, isMainCamera?: boolean) => string;
  updateObjectPosition: (id: string, x: number, z: number) => void;
  updateObjectRotation: (id: string, rotationY: number) => void;
  setSelectedObject: (id: string | null) => void;
  setMainCamera: (id: string) => void;
  deleteObject: (id: string) => void;
  clearAll: () => void;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  setCustomPrice: (id: string, currency: Currency, price: number) => void;
  toggleBudgetPanel: () => void;
  toggleProjectInfo: () => void;
  toggleWarnings: () => void;
  toggleCameraPreview: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadTemplate: (templateId: CreatorTemplateId) => void;
  getPowerTotal: () => number;
  getBudgetTotal: () => number;
  getWarnings: () => SpacingWarning[];
}

export const usePlannerStore = create<StoreState>((set, get) => ({
  roomWidth: 5,
  roomDepth: 4,
  roomHeight: 3.0,

  templateId: 'podcast',
  viewMode: 'perspective',

  placedObjects: [],
  selectedObjectId: null,
  placingEquipmentId: null,

  currency: 'GHS',

  projectInfo: {
    name: 'My Creator Setup',
    location: '',
    notes: '',
    supplierContact: '',
  },

  showBudgetPanel: false,
  showProjectInfo: false,
  showWarnings: false,
  showCameraPreview: false,
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

  placeObject: (equipmentId, x, z, rotationY = 0, isMainCamera = false) => {
    const id = uid();
    const obj: PlacedObject = {
      id,
      equipmentId,
      x,
      z,
      rotationY,
      isMainCamera,
    };
    set((s) => ({
      placedObjects: [...s.placedObjects, obj],
    }));
    return id;
  },

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

  setSelectedObject: (id) => set({ selectedObjectId: id }),

  setMainCamera: (id) => set((s) => ({
    placedObjects: s.placedObjects.map((o) => ({
      ...o,
      isMainCamera: o.id === id,
    })),
  })),

  deleteObject: (id) => set((s) => ({
    placedObjects: s.placedObjects.filter((o) => o.id !== id),
    selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
  })),

  clearAll: () => set({ placedObjects: [], selectedObjectId: null }),

  setProjectInfo: (info) => set((s) => ({
    projectInfo: { ...s.projectInfo, ...info },
  })),

  setCustomPrice: (id, currency, price) => set((s) => ({
    placedObjects: s.placedObjects.map((o) => {
      if (o.id !== id) return o;
      return currency === 'GHS'
        ? { ...o, customPriceGHS: price }
        : { ...o, customPriceNGN: price };
    }),
  })),

  toggleBudgetPanel: () => set((s) => ({ showBudgetPanel: !s.showBudgetPanel })),
  toggleProjectInfo: () => set((s) => ({ showProjectInfo: !s.showProjectInfo })),
  toggleWarnings: () => set((s) => ({ showWarnings: !s.showWarnings })),
  toggleCameraPreview: () => set((s) => ({ showCameraPreview: !s.showCameraPreview })),
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),

  loadTemplate: (templateId) => {
    const tpl = CREATOR_TEMPLATES[templateId];
    if (!tpl) return;
    const objects: PlacedObject[] = tpl.items.map((item) => ({
      id: uid(),
      equipmentId: item.equipmentId,
      x: item.x,
      z: item.z,
      rotationY: item.rotationY,
      isMainCamera: item.isMainCamera,
    }));
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
      return sum + EQUIPMENT_CATALOG[o.equipmentId].watts;
    }, 0);
  },

  getBudgetTotal: () => {
    const state = get();
    return state.placedObjects.reduce((sum, o) => {
      const def = EQUIPMENT_CATALOG[o.equipmentId];
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
      const def = EQUIPMENT_CATALOG[o.equipmentId];
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
        const d = EQUIPMENT_CATALOG[o.equipmentId].dimensions;
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
}));
