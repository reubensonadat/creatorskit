// ============================================================
// Creator Space Planner — Type Definitions
// ============================================================

export type Currency = 'GHS' | 'NGN';

export type ViewMode = 'perspective' | 'top';

export type CreatorTemplateId =
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
  parentId?: number; // Index reference to parent item in the same template
}

// ============================================================
// 42 Equipment IDs — Comprehensive studio catalog
// ============================================================

export type EquipmentId =
  // Batch 1 — Camera & Support
  | 'camera'
  | 'phone-gimbal'
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
  | 'beauty-dish'
  | 'barndoor-light'
  | 'beauty-mirror'
  | 'c-stand-flag'
  // Batch 3 — Audio
  | 'microphone'
  | 'lavalier'
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
  icon: string;
  category: 'camera' | 'lighting' | 'audio' | 'furniture' | 'power' | 'props';
  dimensions: { width: number; depth: number; height: number };
  watts: number;
  defaultPriceGHS: number;
  defaultPriceNGN: number;
  color: number;
  description: string;
  surfaceHeight?: number; // If set, objects can be placed on top at this Y offset
}

export interface PlacedObject {
  id: string;
  equipmentId: EquipmentId;
  x: number;
  z: number;
  rotationY: number;
  isMainCamera?: boolean;
  parentId?: string; // If set, object is placed on top of this parent object
  elevationY?: number; // Custom Y elevation offset (if any)
  customPriceGHS?: number;
  customPriceNGN?: number;
}

export type WarningType =
  | 'camera-too-close'
  | 'equipment-near-wall'
  | 'no-walking-path'
  | 'lights-too-close'
  | 'power-overload';

export interface SpacingWarning {
  type: WarningType;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  objectIds?: string[];
}

export interface ProjectInfo {
  name: string;
  location: string;
  notes: string;
  supplierContact: string;
}

export interface WindowPlacement {
  id: string;
  wall: 'back' | 'left';
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
  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  placingEquipmentId: EquipmentId | null;
  currency: Currency;
  projectInfo: ProjectInfo;
  windows: WindowPlacement[];
  showBudgetPanel: boolean;
  showProjectInfo: boolean;
  showWarnings: boolean;
  showCameraPreview: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  setRoomDimensions: (width: number, depth: number) => void;
  setTemplateId: (id: CreatorTemplateId) => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrency: (currency: Currency) => void;
  setPlacingEquipment: (id: EquipmentId | null) => void;
  placeObject: (obj: PlacedObject) => void;
  updateObjectPosition: (id: string, x: number, z: number) => void;
  updateObjectRotation: (id: string, rotationY: number) => void;
  setSelectedObject: (id: string | null) => void;
  setMainCamera: (id: string) => void;
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
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadTemplate: (templateId: CreatorTemplateId) => void;
  getPowerTotal: () => number;
  getBudgetTotal: () => number;
  getWarnings: () => SpacingWarning[];
  getObjectY: (obj: PlacedObject) => number;
}