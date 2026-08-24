import { create } from 'zustand';
import type {
  PlacedObject,
  CreatorTemplateId,
  ViewMode,
  Currency,
  ProjectInfo,
  SpacingWarning,
  EquipmentId,
  WindowPlacement,
  CameraLensPreset,
  CameraSensorSize,
  CameraAperture,
  FloorFinish,
  LightSettings,
  WallDisplayMode,
} from './types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import { COMPREHENSIVE_TEMPLATES } from './templates';
import { validateGearCompatibility, calculateRoomAcoustics, analyzeStudioLighting } from '@/lib/space-planner/acoustics-lighting-engine';
import { evaluateFramingQuality } from '@/lib/space-planner/optical-engine';

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
  wallDisplayMode: WallDisplayMode;
  floorFinish: FloorFinish;

  // Objects
  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  placingEquipmentId: EquipmentId | null;

  // Currency & budget & affiliate
  currency: Currency;
  userAffiliateTag: string;

  // Project info
  projectInfo: ProjectInfo;

  // Windows & Natural Lighting
  windows: WindowPlacement[];
  timeOfDay: 'daylight' | 'golden-hour' | 'overcast' | 'night';

  // Measurement Tool State
  isMeasuring: boolean;
  measureStart: { x: number; y?: number; z: number; name?: string } | null;
  measureEnd: { x: number; y?: number; z: number; name?: string } | null;

  // Active Camera & Light Cones & Acoustics
  activeCameraId: string | null;
  showLightBeams: boolean;
  showAcousticRays: boolean;

  // UI state
  showBudgetPanel: boolean;
  showProjectInfo: boolean;
  showWarnings: boolean;
  showCameraPreview: boolean;
  showLuxHeatmap: boolean;
  isOrbitPanning: boolean;
  isZenMode: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Actions
  setRoomDimensions: (width: number, depth: number, height?: number) => void;
  setWallDisplayMode: (mode: WallDisplayMode) => void;
  setFloorFinish: (finish: FloorFinish) => void;
  setUserAffiliateTag: (tag: string) => void;
  setTemplateId: (id: CreatorTemplateId) => void;
  setViewMode: (mode: ViewMode) => void;
  setTimeOfDay: (time: 'daylight' | 'golden-hour' | 'overcast' | 'night') => void;
  setCurrency: (c: Currency) => void;
  setPlacingEquipment: (id: EquipmentId | null) => void;
  toggleMeasuring: () => void;
  setMeasurePoints: (start: { x: number; y?: number; z: number; name?: string } | null, end: { x: number; y?: number; z: number; name?: string } | null) => void;
  toggleLightBeams: () => void;
  toggleAcousticRays: () => void;
  setActiveCameraId: (id: string | null) => void;
  optimizeStudioErgonomics: () => void;
  toggleZenMode: () => void;
  placeObject: (
    equipmentOrObject: EquipmentId | (Partial<PlacedObject> & { equipmentId: EquipmentId }),
    x?: number,
    z?: number,
    rotationY?: number,
    isMainCamera?: boolean
  ) => string;
  replacePlacedObjects: (objects: PlacedObject[]) => void;
  updateObjectPosition: (id: string, x: number, z: number) => void;
  updateObjectRotation: (id: string, rotationY: number) => void;
  updateObjectLens: (id: string, lens: CameraLensPreset) => void;
  updateObjectSensor: (id: string, sensor: CameraSensorSize) => void;
  updateObjectAperture: (id: string, aperture: CameraAperture) => void;
  updateObjectLight: (id: string, settings: Partial<LightSettings>) => void;
  setSelectedObject: (id: string | null) => void;
  setMainCamera: (id: string) => void;
  setObjectParent: (id: string, parentId?: string) => void;
  setObjectElevation: (id: string, elevationY?: number) => void;
  deleteObject: (id: string) => void;
  clearAll: () => void;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  setCustomPrice: (id: string, currency: Currency, price: number) => void;
  addWindow: (wall: 'back' | 'left' | 'right' | 'front') => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowPlacement>) => void;
  toggleBudgetPanel: () => void;
  toggleProjectInfo: () => void;
  toggleWarnings: () => void;
  toggleCameraPreview: () => void;
  toggleLuxHeatmap: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleOrbitPanning: () => void;
  setOrbitPanning: (panning: boolean) => void;
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
  wallDisplayMode: 'auto-cutaway',
  floorFinish: 'oak-parquet',
  placedObjects: [],
  selectedObjectId: null,
  placingEquipmentId: null,

  currency: 'USD',
  userAffiliateTag: '',

  projectInfo: {
    name: 'My Creator Studio',
    location: '',
    notes: '',
    supplierContact: '',
  },

  windows: [
    { id: 'win-default-1', wall: 'back', xOffset: 0, width: 1.2, height: 1.0, heightOffset: 1.5 },
  ],
  timeOfDay: 'daylight',

  isMeasuring: false,
  measureStart: null,
  measureEnd: null,
  activeCameraId: null,
  showLightBeams: false,
  showAcousticRays: false,

  showBudgetPanel: false,
  showProjectInfo: false,
  showWarnings: false,
  showCameraPreview: false,
  showLuxHeatmap: false,
  isOrbitPanning: false,
  isZenMode: false,
  leftPanelOpen: true,
  rightPanelOpen: true,

  setRoomDimensions: (width, depth, height) => set({
    roomWidth: clamp(width, 2.0, 20.0),
    roomDepth: clamp(depth, 2.0, 20.0),
    roomHeight: height ? clamp(height, 2.2, 6.0) : 3.0,
  }),

  setWallDisplayMode: (wallDisplayMode) => set({ wallDisplayMode }),
  setFloorFinish: (floorFinish) => set({ floorFinish }),
  setUserAffiliateTag: (userAffiliateTag) => set({ userAffiliateTag }),

  setTemplateId: (templateId) => set({ templateId }),

  setViewMode: (viewMode) => set({ viewMode }),

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  setCurrency: (currency) => set({ currency }),

  setPlacingEquipment: (placingEquipmentId) => set({ placingEquipmentId }),

  toggleMeasuring: () => set((s) => ({
    isMeasuring: !s.isMeasuring,
    measureStart: null,
    measureEnd: null,
  })),

  setMeasurePoints: (start, end) => set({ measureStart: start, measureEnd: end }),

  toggleLightBeams: () => set((s) => ({ showLightBeams: !s.showLightBeams })),
  toggleAcousticRays: () => set((s) => ({ showAcousticRays: !s.showAcousticRays })),

  setActiveCameraId: (activeCameraId) => set({ activeCameraId }),

  optimizeStudioErgonomics: () => {
    const s = get();
    const objs = [...s.placedObjects];
    const hw = s.roomWidth / 2;
    const hd = s.roomDepth / 2;

    const adjusted = objs.map((o) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
      if (!def) return o;
      const marginX = def.dimensions.width / 2 + 0.35;
      const marginZ = def.dimensions.depth / 2 + 0.35;
      return {
        ...o,
        x: clamp(o.x, -hw + marginX, hw - marginX),
        z: clamp(o.z, -hd + marginZ, hd - marginZ),
      };
    });

    set({ placedObjects: adjusted });
  },

  toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),
  setZenMode: (zen) => set({ isZenMode: zen }),

  placeObject: (equipmentOrObject: any, argX?: number, argZ?: number, argRot = 0, argMainCam = false) => {
    let eqId: EquipmentId;
    let posX = 0;
    let posZ = 0;
    let rotY = 0;
    let isMainCam = false;
    let customId: string | undefined;
    let customElevation: number | undefined;

    if (typeof equipmentOrObject === 'object' && equipmentOrObject !== null) {
      eqId = equipmentOrObject.equipmentId;
      posX = equipmentOrObject.x ?? 0;
      posZ = equipmentOrObject.z ?? 0;
      rotY = equipmentOrObject.rotationY ?? 0;
      isMainCam = equipmentOrObject.isMainCamera ?? false;
      customId = equipmentOrObject.id;
      customElevation = equipmentOrObject.elevationY;
    } else {
      eqId = equipmentOrObject;
      posX = argX ?? 0;
      posZ = argZ ?? 0;
      rotY = argRot ?? 0;
      isMainCam = argMainCam ?? false;
    }

    const id = customId || uid();
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[eqId];
    const eqStr = typeof eqId === 'string' ? eqId.toLowerCase() : '';
    const newObj: PlacedObject = {
      id,
      equipmentId: eqId,
      x: posX,
      z: posZ,
      rotationY: rotY,
      isMainCamera: isMainCam,
      elevationY: customElevation,
      lensPreset: def?.opticalSpecs?.defaultLens || '24mm',
      sensorSize: def?.opticalSpecs?.defaultSensor || (eqStr.includes('phone') ? 'smartphone' : 'full-frame'),
      aperture: def?.opticalSpecs?.defaultAperture || 'f/2.8',
      lightSettings: def?.category === 'lighting' ? {
        intensity: 80,
        colorTempKelvin: 5600,
        colorHex: '#FFFFFF',
        beamAngle: 60,
      } : undefined,
    };

    set((s) => ({
      placedObjects: [...s.placedObjects, newObj],
      selectedObjectId: id,
      placingEquipmentId: null,
      activeCameraId: isMainCam ? id : s.activeCameraId,
    }));
    return id;
  },

  replacePlacedObjects: (objects) => {
    const mainCam = objects.find((o) => o.isMainCamera);
    set({
      placedObjects: objects,
      activeCameraId: mainCam ? mainCam.id : null,
      selectedObjectId: null,
    });
  },

  updateObjectPosition: (id, x, z) => set((s) => {
    const target = s.placedObjects.find((o) => o.id === id);
    if (!target) return s;
    const dx = x - target.x;
    const dz = z - target.z;

    // Find all children recursively
    const childIds = new Set<string>();
    const findChildren = (pId: string) => {
      s.placedObjects.forEach((o) => {
        if (o.parentId === pId && !childIds.has(o.id)) {
          childIds.add(o.id);
          findChildren(o.id);
        }
      });
    };
    findChildren(id);

    return {
      placedObjects: s.placedObjects.map((o) => {
        if (o.id === id) return { ...o, x, z };
        if (childIds.has(o.id)) return { ...o, x: o.x + dx, z: o.z + dz };
        return o;
      }),
    };
  }),

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

  updateObjectSensor: (id, sensorSize) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, sensorSize } : o
    ),
  })),

  updateObjectAperture: (id, aperture) => set((s) => ({
    placedObjects: s.placedObjects.map((o) =>
      o.id === id ? { ...o, aperture } : o
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
    activeCameraId: id,
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
    const remaining = s.placedObjects.filter((o) => !toDelete.has(o.id));
    const hasCam = remaining.some((o) => {
      const eqId = typeof o.equipmentId === 'string' ? o.equipmentId.toLowerCase() : '';
      return eqId === 'camera' || eqId.startsWith('cam') || eqId.includes('phone') || eqId.includes('webcam') || eqId.includes('prompter');
    });
    return {
      placedObjects: remaining,
      selectedObjectId: toDelete.has(s.selectedObjectId ?? '') ? null : s.selectedObjectId,
      viewMode: s.viewMode === 'camera-pov' && !hasCam ? 'perspective' : s.viewMode,
    };
  }),

  clearAll: () => set({ placedObjects: [], selectedObjectId: null, activeCameraId: null }),

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

  addWindow: (wall) => {
    const id = `win-${Date.now()}`;
    set((s) => ({
      windows: [...s.windows, { id, wall, xOffset: 0, width: 1.2, height: 1.0, heightOffset: 1.5 }],
    }));
  },

  removeWindow: (id) => set((s) => ({
    windows: s.windows.filter((w) => w.id !== id),
  })),

  updateWindow: (id, updates) => set((s) => ({
    windows: s.windows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
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

  loadTemplate: (templateId) => {
    const tpl = COMPREHENSIVE_TEMPLATES[templateId];
    if (!tpl) return;

    const baseTimestamp = Date.now();
    const generatedIds = tpl.items.map((_, idx) => `tpl-${baseTimestamp}-${idx}`);

    let mainCam: PlacedObject | null = null;
    const objects: PlacedObject[] = tpl.items.map((item, idx) => {
      const id = generatedIds[idx];
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[item.equipmentId];
      const isMain = Boolean(item.isMainCamera);
      const parentId = typeof item.parentId === 'number' && generatedIds[item.parentId]
        ? generatedIds[item.parentId]
        : undefined;

      const obj: PlacedObject = {
        id,
        equipmentId: item.equipmentId,
        x: item.x,
        z: item.z,
        rotationY: item.rotationY,
        isMainCamera: isMain,
        parentId,
        lensPreset: item.lensPreset || def?.opticalSpecs?.defaultLens || '24mm',
        sensorSize: def?.opticalSpecs?.defaultSensor || (typeof item.equipmentId === 'string' && item.equipmentId.includes('phone') ? 'smartphone' : 'full-frame'),
        aperture: def?.opticalSpecs?.defaultAperture || 'f/2.8',
        lightSettings: item.lightSettings || (def?.category === 'lighting' ? {
          intensity: 80,
          colorTempKelvin: 5600,
          colorHex: '#FFFFFF',
          beamAngle: 60,
        } : undefined),
      };
      if (isMain) mainCam = obj;
      return obj;
    });

    set({
      templateId,
      roomWidth: tpl.defaultRoom.width,
      roomDepth: tpl.defaultRoom.depth,
      placedObjects: objects,
      activeCameraId: mainCam ? (mainCam as PlacedObject).id : (objects.find(o => o.equipmentId.includes('cam') || o.equipmentId.includes('phone'))?.id ?? null),
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

    // 1. Equipment too close to room walls (exclude flush-mounted fixtures)
    const WALL_CLEARANCE_EXCLUDED = new Set([
      'acoustic-panel',
      'closet-wardrobe',
      'bed-furniture',
      'backdrop',
      'green-screen',
      'furn-door-swing',
    ]);

    objs.forEach((o) => {
      const eqIdStr = String(o.equipmentId);
      if (WALL_CLEARANCE_EXCLUDED.has(eqIdStr) || eqIdStr.includes('panel') || eqIdStr.includes('wall') || eqIdStr.includes('backdrop')) {
        return;
      }
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
      if (!def) return;
      const halfW = def.dimensions.width / 2;
      const halfD = def.dimensions.depth / 2;
      if (
        Math.abs(o.x) + halfW > hw - wallThreshold ||
        Math.abs(o.z) + halfD > hd - wallThreshold
      ) {
        warnings.push({
          type: 'equipment-near-wall',
          severity: 'warning',
          message: `${def.name} may be too close to a wall. Pull inward for clearance.`,
          objectIds: [o.id],
        });
      }
    });

    // 2. Optical & Camera Distance Evaluation
    const cameras = objs.filter((o) => o.equipmentId === 'camera' || o.equipmentId.startsWith('cam') || o.equipmentId.includes('phone'));
    const subjectTarget = objs.find((o) => o.equipmentId.includes('chair') || o.equipmentId.includes('desk') || o.equipmentId === 'content-table' || o.equipmentId.includes('human'));

    cameras.forEach((cam) => {
      if (subjectTarget) {
        const dist = Math.hypot(cam.x - subjectTarget.x, cam.z - subjectTarget.z);
        const evalResult = evaluateFramingQuality(dist, cam.lensPreset, cam.sensorSize);
        if (evalResult.status === 'too-close') {
          warnings.push({
            type: 'camera-too-close',
            severity: 'danger',
            message: `Camera is only ${dist.toFixed(1)}m from subject for ${cam.lensPreset || '24mm'} lens. Lens will produce wide-angle facial distortion. Move camera back to ~1.6m.`,
            objectIds: [cam.id, subjectTarget.id],
          });
        }
      }
    });

    // 3. 3-Point Lighting & Shadow Spill Evaluation
    const lightingDiag = analyzeStudioLighting(objs, state.roomDepth);
    if (lightingDiag.shadowSpillRisk === 'high') {
      warnings.push({
        type: 'shadow-spill-backdrop',
        severity: 'warning',
        message: `Talent is too close to the back wall (${lightingDiag.subjectToBackdropDistM}m). Key lights will cast distracting dark shadows on the backdrop. Pull desk 0.5m forward.`,
      });
    }

    // 4. Acoustic Room Reverb & Echo Analysis
    const acousticDiag = calculateRoomAcoustics(state.roomWidth, state.roomDepth, state.roomHeight, state.floorFinish, objs);
    if (acousticDiag.rt60Seconds > 0.65) {
      warnings.push({
        type: 'acoustic-reverb-high',
        severity: 'warning',
        message: `Room reverberation is high (${acousticDiag.rt60Seconds}s RT60). Audio will sound hollow on studio condenser microphones. Add acoustic foam panels or sound-absorbing carpet.`,
        actionLabel: '+ Add Acoustic Panels',
        actionEquipmentId: 'acoustic-panel',
      });
    }

    // 5. Gear Compatibility Engine (e.g. XLR mics requiring interface)
    const compatWarnings = validateGearCompatibility(objs);
    compatWarnings.forEach((w) => warnings.push(w));

    // 6. Power Load & Circuit Check
    const totalWatts = state.getPowerTotal();
    if (totalWatts > 0) {
      const socketLimit = 2860; // 13A @ 220V standard household socket
      const hasGenerator = objs.some((o) => o.equipmentId === 'generator' || o.equipmentId.includes('generator'));
      const hasPowerStation = objs.some((o) => o.equipmentId === 'power-station' || o.equipmentId.includes('pwr'));
      if (totalWatts > socketLimit && !hasGenerator && !hasPowerStation) {
        warnings.push({
          type: 'power-overload',
          severity: 'danger',
          message: `Total studio power draw (${totalWatts}W) exceeds single wall circuit capacity (${socketLimit}W). Add a power station or separate breaker line.`,
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
