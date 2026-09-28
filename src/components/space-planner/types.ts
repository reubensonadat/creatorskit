// ============================================================
// Creator Space Planner — Type Definitions
// ============================================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'GHS' | 'NGN';

export type ViewMode = '2d' | '3d' | 'perspective' | 'top' | 'camera-pov' | 'walkthrough';

export type CameraLensPreset = '16mm' | '24mm' | '35mm' | '50mm' | '85mm' | '105mm';

export type CameraSensorSize = 'full-frame' | 'aps-c' | 'micro-four-thirds' | 'smartphone';

export type CameraAperture = 'f/1.4' | 'f/1.8' | 'f/2.8' | 'f/4.0' | 'f/5.6';

export type FloorFinish =
  | 'oak-parquet'
  | 'dark-epoxy'
  | 'acoustic-carpet'
  | 'concrete-loft'
  | 'porcelain-cream'
  | 'porcelain-grey'
  | 'marble-white'
  | 'hardwood-teak'
  | 'terrazzo-polish'
  | 'bathroom-tile'
  | 'pavement-blocks'
  | 'grass-lawn'
  | 'stamped-concrete';

// ============================================================
// Ghanaian & Modern Architectural Types
// ============================================================

export type FloorLevel = 'ground' | 'first';

export type PlotPresetId = '100x80' | '100x70' | '100x50' | '70x50' | 'custom';

export type CompoundFinish = 'pavement-blocks' | 'grass-lawn' | 'stamped-concrete' | 'mixed';

export interface PlotConfig {
  preset: PlotPresetId;
  name: string;
  widthFt: number;  // e.g. 100 ft
  depthFt: number;  // e.g. 80 ft
  widthM: number;   // calculated in meters
  depthM: number;
  compoundFinish: CompoundFinish;
  showPerimeterFence: boolean;
  fenceHeightM: number; // default 2.2m for Ghanaian standard perimeter
  frontSetbackFt: number; // typically 15-20 ft from road
  rearSetbackFt: number;  // 10 ft
  sideSetbackFt: number;  // 6-10 ft
}

export type WallThickness = '5-inch' | '6-inch' | '9-inch';

export interface WallSegment {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  thickness: WallThickness; // 5" (0.13m), 6" (0.15m), 9" (0.23m)
  height: number;           // standard 3.0m ceiling
  floor: FloorLevel;
  isPerimeter?: boolean;
}

export type OpeningType =
  | 'door-single'
  | 'door-double'
  | 'door-sliding'
  | 'window-sliding'
  | 'window-casement'
  | 'window-louver'
  | 'archway';

export interface HouseOpening {
  id: string;
  type: OpeningType;
  x: number;
  z: number;
  rotationY: number;
  width: number;
  height: number;
  floor: FloorLevel;
  wallId?: string;
  label?: string;
}

export type RoomType =
  | 'master-suite'
  | 'bedroom'
  | 'living-hall'
  | 'dining'
  | 'kitchen'
  | 'pantry-store'
  | 'bathroom'
  | 'porch-terrace'
  | 'balcony'
  | 'carport'
  | 'corridor';

export interface RoomZone {
  id: string;
  name: string;
  type: RoomType;
  x: number; // center or top-left
  z: number;
  width: number;
  depth: number;
  floor: FloorLevel;
  floorFinish: FloorFinish;
  color?: string;
}

export type RoofType = 'hidden-parapet' | 'hip' | 'monoslope' | 'flat-terrace' | 'open-cutaway';

export interface RoofConfig {
  type: RoofType;
  visible: boolean;
  parapetHeightM: number; // 0.8m default for hidden parapet
  pitchDegrees: number;   // 15 deg aluzinc slope or 25 deg hip
  material: 'aluzinc' | 'concrete-slab' | 'shingle';
  colorHex: string;
}

export interface MaterialUnitRates {
  cementBagGHS: number;          // 50kg bag (GH₵ 98)
  sandcrete6InchBlockGHS: number; // Standard wall block (GH₵ 8.50)
  sandcrete5InchBlockGHS: number; // Partition block (GH₵ 7.50)
  sandcrete9InchBlockGHS: number; // Foundation/Fence block (GH₵ 12.00)
  sandTripGHS: number;           // Coarse river sand 20-tonne trip (GH₵ 1,900)
  chippingsTripGHS: number;      // Granite chippings trip (GH₵ 2,400)
  rebarTonGHS: number;           // High-tensile iron rods per ton (GH₵ 14,500)
  roofingSheetM2GHS: number;     // Aluzinc roofing sheet per m² (GH₵ 120)
  exchangeRateGHSPerUSD: number; // GH₵ per USD (15.5)
}

export interface ConstructionBoQ {
  grossWallAreaM2: number;
  openingsAreaM2: number;
  netWallAreaM2: number;
  
  // Sandcrete blocks
  blocks6InchCount: number;
  blocks5InchCount: number;
  blocks9InchCount: number;
  totalBlocksCount: number;
  blocksWastagePct: number; // 8%

  // Cement (50kg bags)
  cementLayingBags: number;
  cementPlasteringBags: number; // internal + external
  cementGermanFloorBags: number; // oversite concrete slab
  cementBeamsLintelsBags: number;
  totalCementBags: number;

  // Aggregates
  sandTrips: number;
  chippingsTrips: number;

  // Structural & Roofing
  rebarTons: number;
  roofingAreaM2: number;

  // Total built footprint & floor area
  builtFootprintM2: number;
  totalFloorAreaM2: number;
  plotCoveragePct: number;

  // Costs
  totalCostGHS: number;
  totalCostUSD: number;
  itemizedCostsGHS: {
    blocks: number;
    cement: number;
    sandChippings: number;
    rebar: number;
    roofing: number;
    estimatedLabor: number;
  };
}

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
  | 'preset-3bed-bungalow'
  | 'preset-4bed-villa'
  | 'preset-2bed-halfplot'
  | 'preset-custom-blank'
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
  plotConfig?: Partial<PlotConfig>;
  roofConfig?: Partial<RoofConfig>;
  wallSegments?: WallSegment[];
  openings?: HouseOpening[];
  roomZones?: RoomZone[];
  hasFirstFloor?: boolean;
}

export interface TemplateItemPlacement {
  equipmentId: EquipmentId;
  x: number;
  z: number;
  rotationY: number;
  floor?: FloorLevel;
  isMainCamera?: boolean;
  lensPreset?: CameraLensPreset;
  lightSettings?: LightSettings;
  parentId?: number; // Index reference to parent item in the same template
}

// ============================================================
// 42 Equipment IDs — Comprehensive studio catalog
// ============================================================

export type EquipmentCategory = 'camera' | 'lighting' | 'audio' | 'furniture' | 'power' | 'props' | 'tech';

export type EquipmentId = string;

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  brand?: string;
  model?: string;
  icon: string;
  category: EquipmentCategory;
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
  floor?: FloorLevel;
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
  | 'chair-clearance'
  | 'no-walking-path'
  | 'lights-too-close'
  | 'shadow-spill-backdrop'
  | 'window-backlight-silhouette'
  | 'xlr-missing-interface'
  | 'acoustic-reverb-high'
  | 'acoustic-echo'
  | 'audio-noise'
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