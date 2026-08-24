// ============================================================
// Creator Space Planner — Type Definitions
// ============================================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'GHS' | 'NGN';

export type ViewMode = 'perspective' | 'top' | 'camera-pov' | 'walkthrough';

export type CameraLensPreset = '16mm' | '24mm' | '35mm' | '50mm' | '85mm' | '105mm';

export type CameraSensorSize = 'full-frame' | 'aps-c' | 'micro-four-thirds' | 'smartphone';

export type CameraAperture = 'f/1.4' | 'f/1.8' | 'f/2.8' | 'f/4.0' | 'f/5.6';

export type FloorFinish = 'oak-parquet' | 'dark-epoxy' | 'acoustic-carpet' | 'concrete-loft';

export interface AffiliateLinks {
  amazon?: string;
  bhPhoto?: string;
  sweetwater?: string;
  brandUrl?: string;
  affiliateTag?: string;
}

export interface LightSettings {
  intensity: number; // 0 to 100%
  colorTempKelvin?: number; // 2700 to 6500
  colorHex?: string; // for RGB lights
  beamAngle?: number; // 15 to 120 degrees
}

export type CreatorTemplateId =
  | 'diy-bedroom-phone'
  | 'bedroom-studio'
  | 'podcast'
  | 'product-photography'
  | 'tech-review'
  | 'streaming-battlestation'
  | 'interview'
  | 'fashion-lookbook'
  | 'green-screen-vfx'
  | 'culinary-kitchen'
  | 'music-vocal-booth'
  | 'fitness-dance'
  | 'craft-flatlay'
  | 'asmr-sound'
  | 'executive-webinar'
  | 'live-dj-booth'
  | 'makeup-beauty-vanity'
  | 'unboxing-3cam'
  | 'voiceover-booth'
  | 'mobile-vlog-station'
  | 'gaming-dual-host'
  | 'home-studio';

export interface CreatorTemplate {
  id: CreatorTemplateId;
  name: string;
  icon: string;
  category?: string;
  description: string;
  defaultRoom: { width: number; depth: number };
  items: TemplateItemPlacement[];
}

export interface TemplateItemPlacement {
  equipmentId: EquipmentId;
  x: number;
  z: number;
  rotationY: number;
  isMainCamera?: boolean;
  lensPreset?: CameraLensPreset;
  lightSettings?: LightSettings;
  parentId?: number; // Index reference to parent item in the same template
}

// ============================================================
// 42 Equipment IDs — Comprehensive studio catalog
// ============================================================

export type EquipmentId =
  // Batch 1 — Camera & Support
  | 'camera'
  | 'phone-gimbal'
  | 'phone-tripod-mirror'
  | 'ring-light'
  | 'camera-slider'
  | 'webcam'
  | 'drone'
  | 'overhead-rig'
  | 'floor-monitor'
  | 'multi-cam-switcher'
  // Batch 2 — Lighting
  | 'led-light'
  | 'softbox'
  | 'fresnel'
  | 'rgb-tube'
  | 'desk-lamp'
  | 'clamp-desk-lamp'
  | 'beauty-dish'
  | 'barndoor-light'
  | 'beauty-mirror'
  | 'c-stand-flag'
  // Batch 3 — Audio
  | 'microphone'
  | 'lavalier'
  | 'budget-wireless-lav'
  | 'audio-recorder'
  | 'studio-monitor'
  | 'podcast-mic'
  | 'acoustic-panel'
  | 'binaural-mic'
  | 'vocal-booth-screen'
  | 'shotgun-mic'
  // Batch 4 — Furniture & Props
  | 'tripod'
  | 'content-table'
  | 'chair'
  | 'sofa'
  | 'bed-furniture'
  | 'closet-wardrobe'
  | 'product-stand'
  | 'backdrop'
  | 'shelf-props'
  | 'keyboard-synth'
  | 'dj-deck'
  | 'fog-machine'
  // Batch 5 — Power & Accessories
  | 'power-station'
  | 'generator'
  | 'power-strip'
  | 'green-screen'
  | 'teleprompter';

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  brand?: string;
  model?: string;
  icon: string;
  category: 'camera' | 'lighting' | 'audio' | 'furniture' | 'power' | 'props';
  dimensions: { width: number; depth: number; height: number };
  watts: number;
  defaultPriceUSD?: number;
  defaultPriceEUR?: number;
  defaultPriceGBP?: number;
  defaultPriceGHS: number;
  defaultPriceNGN: number;
  color: number;
  description: string;
  surfaceHeight?: number; // If set, objects can be placed on top at this Y offset
  isMountableOnTable?: boolean;
  affiliateLinks?: AffiliateLinks;
  compatibilityType?: 'xlr-mic' | 'usb-mic' | 'audio-interface' | 'heavy-camera' | 'desk-arm' | 'high-power-light' | 'acoustic-treatment';
  opticalSpecs?: {
    defaultSensor?: CameraSensorSize;
    defaultLens?: CameraLensPreset;
    defaultAperture?: CameraAperture;
  };
}

export interface PlacedObject {
  id: string;
  equipmentId: EquipmentId;
  x: number;
  z: number;
  rotationY: number;
  isMainCamera?: boolean;
  lensPreset?: CameraLensPreset; // 16mm, 24mm, 35mm, 50mm, 85mm, 105mm
  sensorSize?: CameraSensorSize; // full-frame, aps-c, micro-four-thirds, smartphone
  aperture?: CameraAperture; // f/1.4 to f/5.6
  lightSettings?: LightSettings; // intensity, kelvin, color
  parentId?: string; // If set, object is placed on top of this parent object
  elevationY?: number; // Custom Y elevation offset (if any)
  customPriceUSD?: number;
  customPriceEUR?: number;
  customPriceGBP?: number;
  customPriceGHS?: number;
  customPriceNGN?: number;
  customAffiliateUrl?: string;
}

export type WarningType =
  | 'camera-too-close'
  | 'camera-lens-mismatch'
  | 'equipment-near-wall'
  | 'no-walking-path'
  | 'lights-too-close'
  | 'shadow-spill-backdrop'
  | 'window-backlight-silhouette'
  | 'xlr-missing-interface'
  | 'acoustic-reverb-high'
  | 'heavy-camera-on-light-arm'
  | 'power-overload';

export interface SpacingWarning {
  type: WarningType;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  objectIds?: string[];
  actionLabel?: string;
  actionEquipmentId?: EquipmentId;
}

export interface ProjectInfo {
  name: string;
  location: string;
  notes: string;
  supplierContact: string;
}

export type WallDisplayMode = 'auto-cutaway' | 'all-4' | 'corner-2' | 'u-shape-3' | 'floor-only';

export interface WindowPlacement {
  id: string;
  wall: 'back' | 'left' | 'right' | 'front';
  xOffset: number; // -1 to 1, position along wall
  width: number;
  height: number;
  heightOffset: number; // Y position from floor
}

export interface PlannerState {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  templateId: CreatorTemplateId;
  viewMode: ViewMode;
  wallDisplayMode: WallDisplayMode;
  floorFinish: FloorFinish;
  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  placingEquipmentId: EquipmentId | null;
  currency: Currency;
  projectInfo: ProjectInfo;
  userAffiliateTag: string;
  windows: WindowPlacement[];
  timeOfDay: 'daylight' | 'golden-hour' | 'overcast' | 'night';
  showBudgetPanel: boolean;
  showProjectInfo: boolean;
  showWarnings: boolean;
  showCameraPreview: boolean;
  showLuxHeatmap: boolean;
  showAcousticRays: boolean;
  isOrbitPanning: boolean;
  isZenMode: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  setRoomDimensions: (width: number, depth: number, height?: number) => void;
  setWallDisplayMode: (mode: WallDisplayMode) => void;
  setFloorFinish: (finish: FloorFinish) => void;
  setUserAffiliateTag: (tag: string) => void;
  setTemplateId: (id: CreatorTemplateId) => void;
  setViewMode: (mode: ViewMode) => void;
  setTimeOfDay: (time: 'daylight' | 'golden-hour' | 'overcast' | 'night') => void;
  toggleOrbitPanning: () => void;
  setOrbitPanning: (panning: boolean) => void;
  toggleZenMode: () => void;
  setCurrency: (currency: Currency) => void;
  setPlacingEquipment: (id: EquipmentId | null) => void;
  placeObject: (obj: PlacedObject) => void;
  updateObjectPosition: (id: string, x: number, z: number) => void;
  updateObjectRotation: (id: string, rotationY: number) => void;
  updateObjectLens: (id: string, lens: CameraLensPreset) => void;
  updateObjectSensor: (id: string, sensor: CameraSensorSize) => void;
  updateObjectAperture: (id: string, aperture: CameraAperture) => void;
  updateObjectLight: (id: string, settings: Partial<LightSettings>) => void;
  setSelectedObject: (id: string | null) => void;
  setMainCamera: (id: string) => void;
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
  toggleAcousticRays: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadTemplate: (templateId: CreatorTemplateId) => void;
  getPowerTotal: () => number;
  getBudgetTotal: () => number;
  getWarnings: () => SpacingWarning[];
  getObjectY: (obj: PlacedObject) => number;
}