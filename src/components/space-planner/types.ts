// ============================================================
// Creator Space Planner — Type Definitions
// ============================================================

export type Currency = 'GHS' | 'NGN';

export type ViewMode = 'perspective' | 'top';

export type CreatorTemplateId =
  | 'podcast'
  | 'product-photography'
  | 'fashion-lookbook'
  | 'livestream'
  | 'interview'
  | 'home-studio';

export interface CreatorTemplate {
  id: CreatorTemplateId;
  name: string;
  icon: string;
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
}

export type EquipmentId =
  | 'camera'
  | 'tripod'
  | 'led-light'
  | 'softbox'
  | 'microphone'
  | 'backdrop'
  | 'content-table'
  | 'chair'
  | 'product-stand'
  | 'power-station'
  | 'generator'
  | 'shelf-props';

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  icon: string;
  category: 'camera' | 'lighting' | 'audio' | 'furniture' | 'power' | 'props';
  dimensions: { width: number; depth: number; height: number }; // metres
  watts: number;
  defaultPriceGHS: number;
  defaultPriceNGN: number;
  color: number; // Three.js hex color
  description: string;
}

export interface PlacedObject {
  id: string;
  equipmentId: EquipmentId;
  x: number;
  z: number;
  rotationY: number;
  isMainCamera?: boolean;
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

export interface PlannerState {
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
