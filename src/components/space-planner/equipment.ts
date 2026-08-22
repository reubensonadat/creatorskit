import * as THREE from 'three';
import type { EquipmentDefinition, EquipmentId } from './types';
import { createDetailedProceduralModel } from './procedural-models';

// ============================================================
// Equipment Catalog — 30 creator equipment types
// Prices in GHS and NGN (approximate local market values)
// ============================================================

export const EQUIPMENT_CATALOG: Record<EquipmentId, EquipmentDefinition> = {

  'camera': {
    id: 'camera',
    name: 'DSLR on Tripod',
    icon: '⭐',
    category: 'camera',
    dimensions: { width: 0.35, depth: 0.35, height: 1.5 },
    watts: 0,
    defaultPriceGHS: 3200,
    defaultPriceNGN: 165000,
    color: 0x2a2826,
    description: 'Professional DSLR camera on full-size aluminum tripod',
  },
  'phone-gimbal': {
    id: 'phone-gimbal',
    name: 'Phone on Gimbal',
    icon: '📱',
    category: 'camera',
    dimensions: { width: 0.15, depth: 0.15, height: 0.4 },
    watts: 0,
    defaultPriceGHS: 1200,
    defaultPriceNGN: 62000,
    color: 0x2a2826,
    description: 'Smartphone clamped in 3-axis gimbal stabilizer',
  },
  'ring-light': {
    id: 'ring-light',
    name: 'Ring Light',
    icon: '💡',
    category: 'lighting',
    dimensions: { width: 0.5, depth: 0.1, height: 1.8 },
    watts: 45,
    defaultPriceGHS: 280,
    defaultPriceNGN: 14500,
    color: 0xf5f1ea,
    description: 'Circular ring light with tripod stand and phone holder',
  },
  'camera-slider': {
    id: 'camera-slider',
    name: 'Camera Slider',
    icon: '🔲',
    category: 'camera',
    dimensions: { width: 0.15, depth: 0.8, height: 0.15 },
    watts: 10,
    defaultPriceGHS: 600,
    defaultPriceNGN: 31000,
    color: 0x4a4744,
    description: 'Motorized camera slider rail on short tripod legs',
  },
  'webcam': {
    id: 'webcam',
    name: 'Webcam',
    icon: '🖥️',
    category: 'camera',
    dimensions: { width: 0.08, depth: 0.08, height: 0.08 },
    watts: 5,
    defaultPriceGHS: 350,
    defaultPriceNGN: 18000,
    color: 0x2a2826,
    description: 'HD webcam clipped to monitor edge with USB cable',
  },
  'drone': {
    id: 'drone',
    name: 'Drone on Pad',
    icon: '🚁',
    category: 'camera',
    dimensions: { width: 0.4, depth: 0.4, height: 0.15 },
    watts: 0,
    defaultPriceGHS: 4500,
    defaultPriceNGN: 232000,
    color: 0x4a4744,
    description: 'Quadcopter drone on circular landing pad',
  },
  'led-light': {
    id: 'led-light',
    name: 'LED Panel Light',
    icon: '💡',
    category: 'lighting',
    dimensions: { width: 0.3, depth: 0.08, height: 0.35 },
    watts: 60,
    defaultPriceGHS: 350,
    defaultPriceNGN: 18000,
    color: 0xfff5e0,
    description: 'Bi-color LED panel on tabletop stand',
  },
  'softbox': {
    id: 'softbox',
    name: 'Softbox Light',
    icon: '🔲',
    category: 'lighting',
    dimensions: { width: 0.65, depth: 0.2, height: 1.7 },
    watts: 100,
    defaultPriceGHS: 500,
    defaultPriceNGN: 26000,
    color: 0xf5f1ea,
    description: 'Rectangular softbox on light stand with diffuser',
  },
  'fresnel': {
    id: 'fresnel',
    name: 'Fresnel Spotlight',
    icon: '🔦',
    category: 'lighting',
    dimensions: { width: 0.3, depth: 0.35, height: 1.5 },
    watts: 150,
    defaultPriceGHS: 800,
    defaultPriceNGN: 41000,
    color: 0x2a2826,
    description: 'Theatrical Fresnel spotlight with barn doors on C-stand',
  },
  'rgb-tube': {
    id: 'rgb-tube',
    name: 'RGB Tube Light',
    icon: '🌈',
    category: 'lighting',
    dimensions: { width: 0.04, depth: 1.0, height: 0.04 },
    watts: 40,
    defaultPriceGHS: 450,
    defaultPriceNGN: 23000,
    color: 0x3366ff,
    description: 'Cylindrical LED tube light with color gradient',
  },
  'desk-lamp': {
    id: 'desk-lamp',
    name: 'Desk Lamp',
    icon: '🔦',
    category: 'lighting',
    dimensions: { width: 0.15, depth: 0.15, height: 0.4 },
    watts: 15,
    defaultPriceGHS: 80,
    defaultPriceNGN: 4100,
    color: 0x2a2826,
    description: 'Adjustable arm desk lamp with cone shade',
  },
  'beauty-dish': {
    id: 'beauty-dish',
    name: 'Beauty Dish',
    icon: '💡',
    category: 'lighting',
    dimensions: { width: 0.45, depth: 0.1, height: 1.6 },
    watts: 75,
    defaultPriceGHS: 420,
    defaultPriceNGN: 21600,
    color: 0xf5f1ea,
    description: 'Circular beauty dish reflector with center deflector on C-stand',
  },
  'microphone': {
    id: 'microphone',
    name: 'Condenser Mic',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.15, depth: 0.15, height: 0.7 },
    watts: 0,
    defaultPriceGHS: 280,
    defaultPriceNGN: 14500,
    color: 0x4a4744,
    description: 'Large-diaphragm condenser mic on boom arm with shock mount',
  },
  'lavalier': {
    id: 'lavalier',
    name: 'Lavalier Mic Set',
    icon: '🎤',
    category: 'audio',
    dimensions: { width: 0.08, depth: 0.06, height: 0.03 },
    watts: 0,
    defaultPriceGHS: 180,
    defaultPriceNGN: 9300,
    color: 0x2a2826,
    description: 'Wireless lavalier microphone set with bodypack transmitters',
  },
  'audio-recorder': {
    id: 'audio-recorder',
    name: 'Audio Recorder',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.07, depth: 0.14, height: 0.15 },
    watts: 0,
    defaultPriceGHS: 520,
    defaultPriceNGN: 26800,
    color: 0x4a4744,
    description: 'Handheld stereo audio recorder with XY mics',
  },
  'studio-monitor': {
    id: 'studio-monitor',
    name: 'Studio Monitor',
    icon: '🔊',
    category: 'audio',
    dimensions: { width: 0.2, depth: 0.25, height: 0.3 },
    watts: 60,
    defaultPriceGHS: 650,
    defaultPriceNGN: 33500,
    color: 0x2a2826,
    description: 'Bookshelf studio monitor speaker pair',
  },
  'podcast-mic': {
    id: 'podcast-mic',
    name: 'Podcast Mic',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.12, depth: 0.12, height: 0.65 },
    watts: 0,
    defaultPriceGHS: 450,
    defaultPriceNGN: 23200,
    color: 0x2a2826,
    description: 'Broadcast dynamic microphone on desk boom arm',
  },
  'acoustic-panel': {
    id: 'acoustic-panel',
    name: 'Acoustic Panel',
    icon: '🔇',
    category: 'audio',
    dimensions: { width: 0.6, depth: 0.05, height: 0.6 },
    watts: 0,
    defaultPriceGHS: 45,
    defaultPriceNGN: 2300,
    color: 0x3a3a3a,
    description: 'Square acoustic foam panel with pyramid pattern',
  },
  'tripod': {
    id: 'tripod',
    name: 'Tripod Stand',
    icon: '📐',
    category: 'camera',
    dimensions: { width: 0.5, depth: 0.5, height: 1.5 },
    watts: 0,
    defaultPriceGHS: 250,
    defaultPriceNGN: 13000,
    color: 0x4a4744,
    description: 'Full-size camera tripod with adjustable legs',
  },
  'content-table': {
    id: 'content-table',
    name: 'Content Table',
    icon: '🦐',
    category: 'furniture',
    dimensions: { width: 1.2, depth: 0.6, height: 0.74 },
    watts: 0,
    defaultPriceGHS: 380,
    defaultPriceNGN: 19500,
    color: 0x8b6f47,
    description: 'Modern minimalist desk for content creation',
    surfaceHeight: 0.74,
  },
  'chair': {
    id: 'chair',
    name: 'Office Chair',
    icon: '💼',
    category: 'furniture',
    dimensions: { width: 0.55, depth: 0.55, height: 1.2 },
    watts: 0,
    defaultPriceGHS: 450,
    defaultPriceNGN: 23200,
    color: 0x2a2826,
    description: 'Ergonomic office chair with mesh back and 5-star base',
    surfaceHeight: 0.44,
  },
  'sofa': {
    id: 'sofa',
    name: 'Sofa / Loveseat',
    icon: '🛋️',
    category: 'furniture',
    dimensions: { width: 1.5, depth: 0.8, height: 0.8 },
    watts: 0,
    defaultPriceGHS: 1200,
    defaultPriceNGN: 62000,
    color: 0x5a5550,
    description: '2-seater sofa for interview and livestream guest areas',
    surfaceHeight: 0.3,
  },
  'product-stand': {
    id: 'product-stand',
    name: 'Display Turntable',
    icon: '📱',
    category: 'props',
    dimensions: { width: 0.3, depth: 0.3, height: 0.1 },
    watts: 2,
    defaultPriceGHS: 120,
    defaultPriceNGN: 6200,
    color: 0xc4baa8,
    description: 'Motorized rotating display turntable for products',
    surfaceHeight: 0.065,
  },
  'backdrop': {
    id: 'backdrop',
    name: 'Backdrop Stand',
    icon: '🎭',
    category: 'props',
    dimensions: { width: 2.0, depth: 0.1, height: 2.4 },
    watts: 0,
    defaultPriceGHS: 200,
    defaultPriceNGN: 10500,
    color: 0xc4baa8,
    description: 'Backdrop stand with crossbar and fabric drape',
  },
  'shelf-props': {
    id: 'shelf-props',
    name: 'Shelf & Props',
    icon: '📚',
    category: 'props',
    dimensions: { width: 0.8, depth: 0.3, height: 1.4 },
    watts: 0,
    defaultPriceGHS: 300,
    defaultPriceNGN: 15500,
    color: 0x8b6f47,
    description: 'Open shelving unit with decorative props',
    surfaceHeight: 0.88,
  },
  'power-station': {
    id: 'power-station',
    name: 'Power Station',
    icon: '🔋',
    category: 'power',
    dimensions: { width: 0.3, depth: 0.2, height: 0.25 },
    watts: 0,
    defaultPriceGHS: 1800,
    defaultPriceNGN: 92000,
    color: 0x3f6b5c,
    description: 'Portable lithium power station with multiple outlets',
  },
  'generator': {
    id: 'generator',
    name: 'Generator / Inverter',
    icon: '⚡',
    category: 'power',
    dimensions: { width: 0.5, depth: 0.35, height: 0.45 },
    watts: 0,
    defaultPriceGHS: 2500,
    defaultPriceNGN: 128000,
    color: 0x6b6863,
    description: 'Backup generator or inverter for power outages',
  },
  'power-strip': {
    id: 'power-strip',
    name: 'Power Strip',
    icon: '🔌',
    category: 'power',
    dimensions: { width: 0.4, depth: 0.08, height: 0.04 },
    watts: 0,
    defaultPriceGHS: 35,
    defaultPriceNGN: 1800,
    color: 0x2a2826,
    description: 'Power strip with 6 outlets and USB ports',
  },
  'green-screen': {
    id: 'green-screen',
    name: 'Green Screen',
    icon: '🟩',
    category: 'props',
    dimensions: { width: 1.5, depth: 0.1, height: 2.0 },
    watts: 0,
    defaultPriceGHS: 150,
    defaultPriceNGN: 7800,
    color: 0x00cc44,
    description: 'Collapsible freestanding chroma key green screen',
  },
  'teleprompter': {
    id: 'teleprompter',
    name: 'Teleprompter',
    icon: '📋',
    category: 'camera',
    dimensions: { width: 0.2, depth: 0.15, height: 0.2 },
    watts: 0,
    defaultPriceGHS: 600,
    defaultPriceNGN: 31000,
    color: 0x2a2826,
    description: 'Beam-splitter teleprompter with phone mount',
  },
  'overhead-rig': {
    id: 'overhead-rig',
    name: 'Overhead Boom Rig',
    icon: '📐',
    category: 'camera',
    dimensions: { width: 0.6, depth: 1.1, height: 2.3 },
    watts: 0,
    defaultPriceGHS: 850,
    defaultPriceNGN: 44000,
    color: 0x2a2826,
    description: 'Heavy-duty C-stand with telescoping boom arm for top-down shots',
  },
  'floor-monitor': {
    id: 'floor-monitor',
    name: 'Confidence Floor Monitor',
    icon: '🖥️',
    category: 'camera',
    dimensions: { width: 0.55, depth: 0.35, height: 0.32 },
    watts: 45,
    defaultPriceGHS: 750,
    defaultPriceNGN: 38500,
    color: 0x1e1c1a,
    description: 'Wedge-angled 45° stage floor preview display for live talent',
  },
  'barndoor-light': {
    id: 'barndoor-light',
    name: 'Barndoor Studio Light',
    icon: '🔦',
    category: 'lighting',
    dimensions: { width: 0.35, depth: 0.3, height: 1.7 },
    watts: 120,
    defaultPriceGHS: 620,
    defaultPriceNGN: 32000,
    color: 0xfff2dc,
    description: 'Studio LED spotlight with 4-way adjustable matte barn doors',
  },
  'binaural-mic': {
    id: 'binaural-mic',
    name: '3DIO Binaural ASMR Mic',
    icon: '👂',
    category: 'audio',
    dimensions: { width: 0.22, depth: 0.14, height: 0.28 },
    watts: 0,
    defaultPriceGHS: 950,
    defaultPriceNGN: 49000,
    color: 0xebe8e2,
    description: '3D binaural microphone with anatomical silicone ears for ASMR',
  },
  'vocal-booth-screen': {
    id: 'vocal-booth-screen',
    name: 'Acoustic Vocal Shield',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.45, depth: 0.3, height: 1.6 },
    watts: 0,
    defaultPriceGHS: 320,
    defaultPriceNGN: 16500,
    color: 0x282624,
    description: 'Curved multi-layer studio acoustic reflection filter shield on stand',
  },
  'keyboard-synth': {
    id: 'keyboard-synth',
    name: 'Studio Synthesizer Keyboard',
    icon: '🎹',
    category: 'furniture',
    dimensions: { width: 0.95, depth: 0.35, height: 0.85 },
    watts: 25,
    defaultPriceGHS: 1100,
    defaultPriceNGN: 57000,
    color: 0x1f1d1b,
    description: '61-key professional MIDI synthesizer keyboard on heavy-duty X-stand',
    surfaceHeight: 0.82,
  },
  'dj-deck': {
    id: 'dj-deck',
    name: 'Pioneer DJ Mixer Controller',
    icon: '🎛️',
    category: 'furniture',
    dimensions: { width: 0.72, depth: 0.38, height: 0.12 },
    watts: 35,
    defaultPriceGHS: 1450,
    defaultPriceNGN: 75000,
    color: 0x181716,
    description: '4-channel DJ controller console with dual illuminated jog wheels and fader mixer',
    isMountableOnTable: true,
  },
  'beauty-mirror': {
    id: 'beauty-mirror',
    name: 'Hollywood Vanity Mirror',
    icon: '🪞',
    category: 'lighting',
    dimensions: { width: 0.85, depth: 0.22, height: 0.75 },
    watts: 60,
    defaultPriceGHS: 580,
    defaultPriceNGN: 30000,
    color: 0xffffff,
    description: 'Dimmable glam vanity mirror with perimeter frosted spherical LED bulbs',
    isMountableOnTable: true,
  },
  'shotgun-mic': {
    id: 'shotgun-mic',
    name: 'Directional Shotgun Boom',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.35, depth: 0.85, height: 2.1 },
    watts: 0,
    defaultPriceGHS: 680,
    defaultPriceNGN: 35000,
    color: 0x222222,
    description: 'Hypercardioid shotgun microphone on overhead boom stand with blimp deadcat windscreen',
  },
  'multi-cam-switcher': {
    id: 'multi-cam-switcher',
    name: '4-Ch Video Switcher Console',
    icon: '🎚️',
    category: 'camera',
    dimensions: { width: 0.32, depth: 0.18, height: 0.08 },
    watts: 20,
    defaultPriceGHS: 820,
    defaultPriceNGN: 42500,
    color: 0x22201e,
    description: 'Live broadcast multi-camera switcher console with backlit program buttons and T-bar',
    isMountableOnTable: true,
  },
  'c-stand-flag': {
    id: 'c-stand-flag',
    name: 'Solid Black Cutter Flag',
    icon: '🏴',
    category: 'lighting',
    dimensions: { width: 0.75, depth: 0.45, height: 1.9 },
    watts: 0,
    defaultPriceGHS: 240,
    defaultPriceNGN: 12500,
    color: 0x111111,
    description: 'Heavy duvetyne light cutter flag on 40-inch grip arm to sculpt lighting and eliminate lens flares',
  },
  'fog-machine': {
    id: 'fog-machine',
    name: 'Atmospheric Stage Haze Machine',
    icon: '💨',
    category: 'props',
    dimensions: { width: 0.42, depth: 0.28, height: 0.26 },
    watts: 700,
    defaultPriceGHS: 490,
    defaultPriceNGN: 25500,
    color: 0x333333,
    description: 'Compact continuous atmospheric haze generator for cinematic light beam diffusion',
  },
};

export const EQUIPMENT_IDS: EquipmentId[] = [
  'camera', 'phone-gimbal', 'ring-light', 'camera-slider', 'webcam', 'drone', 'overhead-rig', 'floor-monitor', 'multi-cam-switcher',
  'led-light', 'softbox', 'fresnel', 'rgb-tube', 'desk-lamp', 'beauty-dish', 'barndoor-light', 'beauty-mirror', 'c-stand-flag',
  'microphone', 'lavalier', 'audio-recorder', 'studio-monitor', 'podcast-mic', 'acoustic-panel', 'binaural-mic', 'vocal-booth-screen', 'shotgun-mic',
  'tripod', 'content-table', 'chair', 'sofa', 'product-stand', 'backdrop', 'shelf-props', 'keyboard-synth', 'dj-deck', 'fog-machine',
  'power-station', 'generator', 'power-strip', 'green-screen', 'teleprompter',
];

// ============================================================
// 3D Model Factory Functions
// Each returns a THREE.Group positioned at origin (y=0)
// ============================================================

export function createEquipmentModel(equipmentId: EquipmentId | string): THREE.Group {
  switch (equipmentId) {
    case 'camera': return createCameraModel();
    case 'phone-gimbal': return createPhoneGimbalModel();
    case 'phone-tripod-mirror': return createPhoneTripodMirrorModel();
    case 'ring-light': return createRingLightModel();
    case 'camera-slider': return createCameraSliderModel();
    case 'webcam': return createWebcamModel();
    case 'drone': return createDroneModel();
    case 'overhead-rig': return createOverheadRigModel();
    case 'floor-monitor': return createFloorMonitorModel();
    case 'multi-cam-switcher': return createMultiCamSwitcherModel();
    case 'led-light': return createLedLightModel();
    case 'softbox': return createSoftboxModel();
    case 'fresnel': return createFresnelModel();
    case 'rgb-tube': return createRgbTubeModel();
    case 'desk-lamp': return createDeskLampModel();
    case 'clamp-desk-lamp': return createClampDeskLampModel();
    case 'beauty-dish': return createBeautyDishModel();
    case 'barndoor-light': return createBarndoorLightModel();
    case 'beauty-mirror': return createBeautyMirrorModel();
    case 'c-stand-flag': return createCStandFlagModel();
    case 'microphone': return createMicrophoneModel();
    case 'lavalier': return createLavalierModel();
    case 'budget-wireless-lav': return createBudgetWirelessLavModel();
    case 'audio-recorder': return createAudioRecorderModel();
    case 'studio-monitor': return createStudioMonitorModel();
    case 'podcast-mic': return createPodcastMicModel();
    case 'acoustic-panel': return createAcousticPanelModel();
    case 'binaural-mic': return createBinauralMicModel();
    case 'vocal-booth-screen': return createVocalBoothScreenModel();
    case 'shotgun-mic': return createShotgunMicModel();
    case 'tripod': return createTripodModel();
    case 'content-table': return createContentTableModel();
    case 'chair': return createChairModel();
    case 'sofa': return createSofaModel();
    case 'bed-furniture': return createBedFurnitureModel();
    case 'closet-wardrobe': return createClosetWardrobeModel();
    case 'product-stand': return createProductStandModel();
    case 'backdrop': return createBackdropModel();
    case 'shelf-props': return createShelfPropsModel();
    case 'keyboard-synth': return createKeyboardSynthModel();
    case 'dj-deck': return createDjDeckModel();
    case 'fog-machine': return createFogMachineModel();
    case 'power-station': return createPowerStationModel();
    case 'generator': return createGeneratorModel();
    case 'power-strip': return createPowerStripModel();
    case 'green-screen': return createGreenScreenModel();
    case 'teleprompter': return createTeleprompterModel();
    default: {
      return createDetailedProceduralModel(equipmentId);
    }
  }
}

function makeMat(color: number, roughness = 0.7, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function emissive(color: number, emissiveColor: number, intensity = 0.6, roughness = 0.3): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: emissiveColor, emissiveIntensity: intensity, roughness });
}

function addBox(g: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, opts?: { rx?: number; ry?: number; rz?: number; roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number; castShadow?: boolean; receiveShadow?: boolean }) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({ color, emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.6, roughness: opts.roughness ?? 0.3, metalness: opts.metalness ?? 0 })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.ry) m.rotation.y = opts.ry;
  if (opts?.rz) m.rotation.z = opts.rz;
  if (opts?.castShadow !== false) m.castShadow = true;
  if (opts?.receiveShadow) m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCyl(g: THREE.Group, rTop: number, rBot: number, h: number, color: number, x: number, y: number, z: number, segments = 24, opts?: { rx?: number; rz?: number; roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number; castShadow?: boolean; receiveShadow?: boolean }) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({ color, emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.6, roughness: opts.roughness ?? 0.3, metalness: opts.metalness ?? 0 })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.rz) m.rotation.z = opts.rz;
  if (opts?.castShadow !== false) m.castShadow = true;
  if (opts?.receiveShadow) m.receiveShadow = true;
  g.add(m);
  return m;
}

function addSphere(g: THREE.Group, r: number, color: number, x: number, y: number, z: number, segments = 20, opts?: { roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number }) {
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({ color, emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.6, roughness: opts.roughness ?? 0.3, metalness: opts.metalness ?? 0 })
    : makeMat(color, opts?.roughness, opts?.metalness);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, segments, Math.max(segments, 16)), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// Mathematically connects two 3D points with a cleanly oriented cylinder
function addStrut(
  g: THREE.Group,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  radius: number,
  color: number,
  opts?: { roughness?: number; metalness?: number; castShadow?: boolean; receiveShadow?: boolean; emissive?: number; emissiveIntensity?: number }
) {
  const p1 = new THREE.Vector3(x1, y1, z1);
  const p2 = new THREE.Vector3(x2, y2, z2);
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  if (len < 0.001) return null;

  const geom = new THREE.CylinderGeometry(radius, radius, len, 16);
  const mat = opts?.emissive !== undefined
    ? new THREE.MeshStandardMaterial({
        color,
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity ?? 0.6,
        roughness: opts.roughness ?? 0.4,
        metalness: opts.metalness ?? 0.3,
      })
    : makeMat(color, opts?.roughness ?? 0.5, opts?.metalness ?? 0.3);

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);

  const yAxis = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
  mesh.quaternion.copy(quat);

  if (opts?.castShadow !== false) mesh.castShadow = true;
  if (opts?.receiveShadow) mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

// Shared stable tripod base generator with connected hub, legs, collars, and rubber feet
function addTripodLegs(
  g: THREE.Group,
  hubY: number,
  spreadRadius: number,
  legRadius = 0.012,
  color = 0x4a4744,
  addSpreader = true,
  cx = 0,
  cz = 0
) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const fx = cx + Math.cos(a) * spreadRadius;
    const fz = cz + Math.sin(a) * spreadRadius;
    // Main leg extending from hub to floor
    addStrut(g, cx, hubY, cz, fx, 0.018, fz, legRadius, color, { metalness: 0.5, roughness: 0.4 });
    // Leg adjustment lock collar
    const mx = cx + (fx - cx) * 0.45;
    const my = hubY + (0.018 - hubY) * 0.45;
    const mz = cz + (fz - cz) * 0.45;
    addSphere(g, legRadius * 1.35, 0x222222, mx, my, mz, 12, { roughness: 0.8 });
    // Rubber foot on floor
    addSphere(g, legRadius * 1.5, 0x1a1a1a, fx, 0.015, fz, 12, { roughness: 0.95 });
    // Spreader strut connecting center column to mid-leg
    if (addSpreader && hubY > 0.4) {
      const spY = hubY * 0.28;
      const spLegX = cx + (fx - cx) * 0.6;
      const spLegY = hubY + (0.018 - hubY) * 0.6;
      const spLegZ = cz + (fz - cz) * 0.6;
      addStrut(g, cx, spY, cz, spLegX, spLegY, spLegZ, legRadius * 0.5, 0x333333, { metalness: 0.4, castShadow: false });
    }
  }
}

// ================================================================
// BATCH 1 — Camera & Support (6 models)
// ================================================================

function createCameraModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x1c1a18; // Magnesium black chassis
  const gy = 0x3d3a37; // Gunmetal aluminum / carbon
  const sl = 0xaaaaaa; // Polished chrome / steel
  const gold = 0xd4af37;
  const hubY = 1.14;

  // --- 1. PRO VIDEO TRIPOD BASE ---
  // Central column with knurled collar
  addCyl(g, 0.016, 0.016, hubY, gy, 0, hubY / 2, 0, 18, { metalness: 0.7, roughness: 0.3 });
  addCyl(g, 0.034, 0.03, 0.045, dk, 0, hubY, 0, 18, { metalness: 0.6, roughness: 0.4 });
  // Carbon fiber legs with twin tubes & mid-level spreader
  addTripodLegs(g, hubY, 0.4, 0.012, gy, true);

  // --- 2. PRO FLUID VIDEO HEAD ---
  const headY = hubY + 0.055;
  // Head base pan ring
  addCyl(g, 0.032, 0.034, 0.03, dk, 0, headY - 0.02, 0, 18, { metalness: 0.6, roughness: 0.3 });
  // Fluid cartridge body
  addCyl(g, 0.026, 0.028, 0.045, dk, 0, headY + 0.015, 0, 18, { metalness: 0.6, roughness: 0.3 });
  // Spirit bubble level (neon green)
  addCyl(g, 0.007, 0.007, 0.003, 0x33ff66, 0.022, headY + 0.038, 0.015, 12, { emissive: 0x33ff66, emissiveIntensity: 0.9 });
  // Pan-tilt lock knobs
  addCyl(g, 0.009, 0.009, 0.018, sl, -0.032, headY + 0.015, 0, 12, { rz: Math.PI / 2, metalness: 0.7 });
  addCyl(g, 0.009, 0.009, 0.018, sl, 0, headY + 0.015, -0.032, 12, { rx: Math.PI / 2, metalness: 0.7 });
  // Arca-Swiss quick release plate & safety pin
  addBox(g, 0.068, 0.012, 0.052, 0x141414, 0, headY + 0.042, 0, { metalness: 0.7, roughness: 0.3 });
  addSphere(g, 0.003, gold, 0.028, headY + 0.045, 0.02, 8, { metalness: 0.8 });

  // Telescopic Pan-Tilt Handle with foam grip
  addStrut(g, 0.025, headY + 0.02, -0.015, 0.12, headY - 0.02, -0.22, 0.006, gy, { metalness: 0.7 });
  addCyl(g, 0.011, 0.011, 0.09, 0x111111, 0.12, headY - 0.02, -0.22, 14, { roughness: 0.95 });

  // --- 3. DSLR CAMERA BODY ---
  const camY = headY + 0.11;
  // Main magnesium alloy chassis
  addBox(g, 0.138, 0.092, 0.076, dk, 0, camY, 0, { metalness: 0.4, roughness: 0.35 });

  // Right-hand Ergonomic Leatherette Grip with finger indentation
  addBox(g, 0.038, 0.088, 0.062, 0x111111, 0.078, camY - 0.002, 0.014, { roughness: 0.96 });
  // Iconic pro red slash accent on grip
  addBox(g, 0.004, 0.032, 0.012, 0xdd1122, 0.096, camY + 0.018, 0.036, { roughness: 0.5 });

  // Pentaprism / EVF Viewfinder Top Hump
  addBox(g, 0.052, 0.028, 0.048, dk, -0.005, camY + 0.055, -0.005, { metalness: 0.4, roughness: 0.35 });
  // Viewfinder rubber eyecup on rear
  addCyl(g, 0.012, 0.014, 0.008, 0x111111, -0.005, camY + 0.052, -0.046, 16, { rx: Math.PI / 2, roughness: 0.95 });
  // Hot-shoe flash mount bracket (silver rails)
  addBox(g, 0.024, 0.004, 0.024, sl, -0.005, camY + 0.071, -0.005, { metalness: 0.8, roughness: 0.2 });
  addSphere(g, 0.002, 0xffd700, -0.005, camY + 0.073, -0.005, 8, { metalness: 0.9 });

  // Top Controls: Mode Dial & Shutter Release & Command Dials
  // Mode dial (PASM) on left shoulder
  addCyl(g, 0.014, 0.014, 0.012, sl, -0.048, camY + 0.05, 0, 16, { metalness: 0.7, roughness: 0.2 });
  addBox(g, 0.012, 0.006, 0.012, 0x222222, -0.048, camY + 0.057, 0, { metalness: 0.5 });
  // Shutter button on angled forward finger deck
  addBox(g, 0.032, 0.015, 0.024, dk, 0.072, camY + 0.042, 0.026, { rx: -0.2, metalness: 0.4 });
  addCyl(g, 0.007, 0.007, 0.006, sl, 0.072, camY + 0.053, 0.032, 14, { rx: -0.2, metalness: 0.85, roughness: 0.1 });
  // Top illuminated status LCD
  addBox(g, 0.038, 0.002, 0.024, 0x182c20, 0.04, camY + 0.047, -0.01, { emissive: 0x225533, emissiveIntensity: 0.35, roughness: 0.2 });
  // Movie Record Red Button
  addSphere(g, 0.0035, 0xdd1122, 0.068, camY + 0.048, 0.004, 10, { emissive: 0xdd1122, emissiveIntensity: 0.8 });

  // Front Stainless Steel Lens Mount Flange Ring
  addCyl(g, 0.036, 0.036, 0.006, sl, -0.005, camY, 0.04, 24, { rx: Math.PI / 2, metalness: 0.9, roughness: 0.15 });

  // --- 4. PRO CINEMA / ZOOM LENS ---
  // Base lens barrel (anodized black)
  addCyl(g, 0.035, 0.036, 0.045, 0x181818, -0.005, camY, 0.062, 24, { rx: Math.PI / 2, metalness: 0.5, roughness: 0.3 });
  // Zoom ribbed rubber ring
  addCyl(g, 0.037, 0.037, 0.03, 0x0f0f0f, -0.005, camY, 0.09, 24, { rx: Math.PI / 2, roughness: 0.92 });
  // Distance scale window
  addBox(g, 0.024, 0.01, 0.004, 0x223344, -0.005, camY + 0.034, 0.108, { roughness: 0.1, metalness: 0.4 });
  // Focus ribbed rubber ring
  addCyl(g, 0.036, 0.036, 0.025, 0x0f0f0f, -0.005, camY, 0.125, 24, { rx: Math.PI / 2, roughness: 0.92 });
  // Signature Luxury Red Ring (Pro L-Series)
  addCyl(g, 0.0365, 0.0365, 0.004, 0xcc1122, -0.005, camY, 0.14, 24, { rx: Math.PI / 2, roughness: 0.4 });
  // Front filter thread ring
  addCyl(g, 0.038, 0.036, 0.016, 0x181818, -0.005, camY, 0.148, 24, { rx: Math.PI / 2, metalness: 0.6, roughness: 0.25 });
  // Deep Optical Convex Glass Element with multi-coated anti-reflective iridescence
  addSphere(g, 0.03, 0x112848, -0.005, camY, 0.138, 24, { roughness: 0.05, metalness: 0.7, emissive: 0x1a3355, emissiveIntensity: 0.3 });
  // Tulip / Petal Lens Hood
  addCyl(g, 0.042, 0.037, 0.025, 0x151515, -0.005, camY, 0.162, 24, { rx: Math.PI / 2, roughness: 0.85 });

  // --- 5. REAR ARTICULATED FLIP-OUT LCD VIEWFINDER ---
  // LCD monitor frame (swung slightly out on hinge)
  const lcdAngle = -0.15;
  const lcdX = -0.05;
  const lcdZ = -0.046;
  addBox(g, 0.088, 0.058, 0.006, dk, lcdX, camY, lcdZ, { ry: lcdAngle, metalness: 0.4, roughness: 0.4 });
  // Viewfinder Screen Glass
  addBox(g, 0.082, 0.052, 0.002, 0x0a1420, lcdX, camY, lcdZ - 0.004, { ry: lcdAngle, roughness: 0.1 });
  // Live Camera Viewfinder Graphic Overlay (Autofocus box, Rule of thirds, REC indicator)
  addBox(g, 0.078, 0.048, 0.001, 0x102233, lcdX, camY, lcdZ - 0.005, {
    ry: lcdAngle,
    emissive: 0x336699,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  // Green autofocus center box
  addBox(g, 0.016, 0.016, 0.001, 0x33ff66, lcdX, camY, lcdZ - 0.006, {
    ry: lcdAngle,
    emissive: 0x33ff66,
    emissiveIntensity: 0.8,
  });
  // Red Recording REC Dot on screen
  addSphere(g, 0.0025, 0xff2222, lcdX - 0.028, camY + 0.018, lcdZ - 0.006, 8, {
    emissive: 0xff2222,
    emissiveIntensity: 0.9,
  });

  // Front Active Recording Tally Light
  addSphere(g, 0.004, 0xff2222, 0.042, camY + 0.034, 0.038, 10, {
    emissive: 0xff2222,
    emissiveIntensity: 0.95,
  });

  return g;
}

function createPhoneGimbalModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, dk = 0x181818;
  // Handle
  addCyl(g, 0.018, 0.018, 0.16, dk, 0, 0.08, 0, 16, { roughness: 0.85, metalness: 0.2 });
  addBox(g, 0.012, 0.02, 0.006, 0x555555, 0, 0.12, 0.018, { metalness: 0.4 });
  // Gimbal base hub
  addCyl(g, 0.018, 0.018, 0.035, bk, 0, 0.18, 0, 14, { metalness: 0.5 });
  // Pan motor arm
  addBox(g, 0.015, 0.06, 0.015, bk, 0, 0.22, 0, { metalness: 0.4 });
  // Roll motor
  addCyl(g, 0.015, 0.015, 0.03, bk, 0, 0.25, 0, 12, { rx: Math.PI / 2, metalness: 0.5 });
  // Tilt arm & phone clamp
  addBox(g, 0.012, 0.08, 0.015, bk, -0.04, 0.28, 0, { metalness: 0.4 });
  addBox(g, 0.015, 0.02, 0.03, bk, 0, 0.28, 0, { metalness: 0.4 });
  // Clamped Smartphone
  addBox(g, 0.14, 0.07, 0.008, 0x111111, 0, 0.28, 0.01);
  addBox(g, 0.132, 0.064, 0.002, 0x223a50, 0, 0.28, 0.015, { roughness: 0.1, metalness: 0.2 });
  // Back camera bump
  addBox(g, 0.025, 0.025, 0.004, 0x222222, -0.045, 0.295, 0.004, { metalness: 0.4 });
  addCyl(g, 0.006, 0.006, 0.004, 0x334455, -0.045, 0.295, 0.001, 14, { rx: Math.PI / 2 });
  return g;
}

function createRingLightModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, gy = 0x4a4744;
  const standH = 1.48;

  // Sturdy stand
  addCyl(g, 0.014, 0.016, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.5, roughness: 0.4 });
  addTripodLegs(g, standH * 0.75, 0.32, 0.01, gy, true);

  // Stand collar
  addCyl(g, 0.024, 0.02, 0.04, gy, 0, standH + 0.02, 0, 16, { metalness: 0.5 });
  // Mount bracket
  addBox(g, 0.04, 0.06, 0.03, bk, 0, standH + 0.06, 0, { metalness: 0.4 });

  // Ring housing
  const ringY = standH + 0.26;
  const ringMat = makeMat(bk, 0.4, 0.3);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 16, 36), ringMat);
  ring.position.set(0, ringY, 0);
  ring.castShadow = true;
  g.add(ring);

  // Glowing diffused face
  const diffMat = emissive(0xffffff, 0xfff2e0, 0.85, 0.2);
  const diff = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 16, 36), diffMat);
  diff.position.set(0, ringY, 0.006);
  g.add(diff);

  // Center phone holder
  addStrut(g, 0, ringY - 0.18, 0, 0, ringY - 0.04, 0.02, 0.004, bk, { metalness: 0.5 });
  addBox(g, 0.07, 0.04, 0.008, 0x111111, 0, ringY - 0.02, 0.02);
  return g;
}

function createCameraSliderModel(): THREE.Group {
  const g = new THREE.Group();
  const sl = 0x888888, bk = 0x22201e, gy = 0x4a4744;
  const railLen = 0.8;

  // Dual precision rails
  addCyl(g, 0.008, 0.008, railLen, sl, 0, 0.065, 0.035, 16, { rz: Math.PI / 2, metalness: 0.7, roughness: 0.2 });
  addCyl(g, 0.008, 0.008, railLen, sl, 0, 0.065, -0.035, 16, { rz: Math.PI / 2, metalness: 0.7, roughness: 0.2 });

  // End support blocks with angled feet
  for (const side of [-1, 1]) {
    const x = side * (railLen / 2 - 0.03);
    addBox(g, 0.05, 0.04, 0.12, bk, x, 0.065, 0, { metalness: 0.4 });
    // Stable angled mini-feet
    addStrut(g, x, 0.06, 0.05, x + side * 0.04, 0.01, 0.08, 0.006, gy, { metalness: 0.5 });
    addStrut(g, x, 0.06, -0.05, x + side * 0.04, 0.01, -0.08, 0.006, gy, { metalness: 0.5 });
    addSphere(g, 0.008, 0x1a1a1a, x + side * 0.04, 0.01, 0.08, 10);
    addSphere(g, 0.008, 0x1a1a1a, x + side * 0.04, 0.01, -0.08, 10);
  }

  // Slider carriage block
  addBox(g, 0.1, 0.02, 0.11, bk, 0, 0.08, 0, { metalness: 0.5, roughness: 0.4 });
  // Fluid ball head on carriage
  addCyl(g, 0.02, 0.02, 0.03, sl, 0, 0.105, 0, 16, { metalness: 0.6 });
  addSphere(g, 0.018, sl, 0, 0.125, 0, 16, { metalness: 0.7 });
  addBox(g, 0.05, 0.01, 0.04, bk, 0, 0.145, 0, { metalness: 0.4 });

  // Motor drive unit on right side
  addBox(g, 0.06, 0.05, 0.07, 0x2a2a2a, 0.38, 0.08, 0, { metalness: 0.3 });
  return g;
}

function createWebcamModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e;
  // Monitor clip mount
  addBox(g, 0.05, 0.01, 0.04, 0x333333, 0, 0.01, 0, { metalness: 0.3 });
  addBox(g, 0.04, 0.04, 0.008, 0x333333, 0, 0.03, -0.02, { metalness: 0.3 });
  addCyl(g, 0.008, 0.008, 0.02, 0x555555, 0, 0.045, 0, 12);
  // Camera unit
  addBox(g, 0.08, 0.036, 0.03, bk, 0, 0.07, 0, { roughness: 0.5, metalness: 0.3 });
  // Lens element
  addCyl(g, 0.013, 0.015, 0.01, 0x111111, 0, 0.07, 0.016, 16, { rx: Math.PI / 2, metalness: 0.5, roughness: 0.2 });
  addCyl(g, 0.008, 0.008, 0.002, 0x224466, 0, 0.07, 0.022, 16, { rx: Math.PI / 2, roughness: 0.1 });
  // Green status LED
  addSphere(g, 0.003, 0x44cc44, 0.028, 0.07, 0.016, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  return g;
}

function createDroneModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x333333, bk = 0x1a1a1a;
  // Circular landing pad
  addCyl(g, 0.22, 0.22, 0.006, 0x2a2a2a, 0, 0.003, 0, 24, { roughness: 0.9 });
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.004, 12, 32), makeMat(0xf5a623, 0.8));
  padRing.position.set(0, 0.007, 0);
  padRing.rotation.x = Math.PI / 2;
  g.add(padRing);

  // Drone fuselage
  addBox(g, 0.09, 0.03, 0.06, dk, 0, 0.045, 0, { metalness: 0.4, roughness: 0.4 });
  // 4 Rotor arms with motors and props
  const armOffsets = [
    [0.11, 0.09],
    [-0.11, 0.09],
    [0.11, -0.09],
    [-0.11, -0.09],
  ];
  armOffsets.forEach(([ax, az]) => {
    addStrut(g, 0, 0.045, 0, ax, 0.05, az, 0.005, bk, { metalness: 0.5 });
    addCyl(g, 0.014, 0.014, 0.018, 0x555555, ax, 0.055, az, 14, { metalness: 0.6 });
    // Propeller rotor disc
    addCyl(g, 0.055, 0.055, 0.002, 0x222222, ax, 0.065, az, 14, { roughness: 0.9, castShadow: false });
  });

  // Gimbal camera underneath
  addSphere(g, 0.012, 0x111111, 0, 0.025, 0.02, 14, { metalness: 0.5 });
  addCyl(g, 0.006, 0.006, 0.005, 0x224466, 0, 0.025, 0.032, 12, { rx: Math.PI / 2 });

  // Navigation LEDs
  addSphere(g, 0.003, 0x44cc44, 0.08, 0.05, 0.08, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  addSphere(g, 0.003, 0x44cc44, -0.08, 0.05, 0.08, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  addSphere(g, 0.003, 0xdd3333, 0.08, 0.05, -0.08, 8, { emissive: 0xdd3333, emissiveIntensity: 0.9 });
  addSphere(g, 0.003, 0xdd3333, -0.08, 0.05, -0.08, 8, { emissive: 0xdd3333, emissiveIntensity: 0.9 });
  return g;
}

// ================================================================
// BATCH 2 — Lighting (6 models)
// ================================================================

function createLedLightModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, gy = 0x4a4744;
  // Tabletop / low stand base
  addCyl(g, 0.08, 0.085, 0.012, bk, 0, 0.006, 0, 16, { metalness: 0.4 });
  // Vertical stem & tilt yoke
  addCyl(g, 0.012, 0.014, 0.22, gy, 0, 0.12, 0, 16, { metalness: 0.5, roughness: 0.4 });
  addSphere(g, 0.016, gy, 0, 0.24, 0, 16, { metalness: 0.5 });
  // Yoke arms
  addStrut(g, -0.14, 0.24, 0, -0.14, 0.35, 0, 0.008, gy, { metalness: 0.5 });
  addStrut(g, 0.14, 0.24, 0, 0.14, 0.35, 0, 0.008, gy, { metalness: 0.5 });
  addStrut(g, -0.14, 0.24, 0, 0.14, 0.24, 0, 0.008, gy, { metalness: 0.5 });

  // LED Light Panel
  const panelY = 0.35;
  addBox(g, 0.28, 0.2, 0.02, bk, 0, panelY, 0, { metalness: 0.3, roughness: 0.4 });
  // Diffused front face
  addBox(g, 0.25, 0.17, 0.004, 0xfffaed, 0, panelY, 0.012, { emissive: 0xffeacc, emissiveIntensity: 0.75, roughness: 0.2 });
  // Back battery pack & control dial
  addBox(g, 0.1, 0.08, 0.025, 0x111111, 0, panelY, -0.018, { metalness: 0.4 });
  addCyl(g, 0.01, 0.01, 0.01, 0x666666, -0.08, panelY, -0.015, 12, { rx: Math.PI / 2, metalness: 0.5 });
  addCyl(g, 0.01, 0.01, 0.01, 0x666666, 0.08, panelY, -0.015, 12, { rx: Math.PI / 2, metalness: 0.5 });
  return g;
}

function createSoftboxModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, gy = 0x4a4744;
  const standH = 1.6;

  // Sturdy light stand with tripod legs
  addCyl(g, 0.016, 0.018, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.5, roughness: 0.4 });
  addTripodLegs(g, standH * 0.7, 0.36, 0.012, gy, true);

  // Stand top collar & tilt bracket
  addCyl(g, 0.026, 0.024, 0.05, gy, 0, standH + 0.025, 0, 16, { metalness: 0.5 });
  addBox(g, 0.04, 0.06, 0.04, bk, 0, standH + 0.07, 0, { metalness: 0.4 });

  // Softbox reflector enclosure
  const sbY = standH + 0.25;
  addBox(g, 0.52, 0.44, 0.16, bk, 0, sbY, 0.06, { roughness: 0.85 });
  // Front translucent diffusion panel
  addBox(g, 0.48, 0.4, 0.006, 0xffffff, 0, sbY, 0.142, { emissive: 0xfff4e2, emissiveIntensity: 0.8, roughness: 0.9 });
  // Softbox support rods connecting rear speedring
  const corners = [
    [-0.24, -0.19],
    [0.24, -0.19],
    [-0.24, 0.19],
    [0.24, 0.19],
  ];
  corners.forEach(([cx, cy]) => {
    addStrut(g, 0, sbY, -0.02, cx, sbY + cy, 0.135, 0.004, gy, { metalness: 0.5, castShadow: false });
  });
  return g;
}

function createFresnelModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, sl = 0x888888, gy = 0x4a4744;
  const standH = 1.45;

  // C-Stand / Studio heavy stand
  addCyl(g, 0.016, 0.02, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.5 });
  addTripodLegs(g, standH * 0.65, 0.35, 0.013, gy, true);

  // Mounting Yoke
  const headY = standH + 0.16;
  addStrut(g, -0.12, standH + 0.05, 0, -0.12, headY, 0, 0.01, bk, { metalness: 0.5 });
  addStrut(g, 0.12, standH + 0.05, 0, 0.12, headY, 0, 0.01, bk, { metalness: 0.5 });
  addStrut(g, -0.12, standH + 0.05, 0, 0.12, standH + 0.05, 0, 0.01, bk, { metalness: 0.5 });

  // Fresnel Fixture Housing (Cylinder)
  addCyl(g, 0.1, 0.11, 0.18, bk, 0, headY, 0.02, 20, { rx: Math.PI / 2, metalness: 0.4, roughness: 0.5 });
  // Ribbed heat sink rings
  addCyl(g, 0.106, 0.106, 0.01, sl, 0, headY, -0.04, 20, { rx: Math.PI / 2, metalness: 0.6, castShadow: false });
  // Stepped Fresnel Lens (glowing warm glass)
  addCyl(g, 0.088, 0.088, 0.008, 0xfffdf0, 0, headY, 0.115, 20, { rx: Math.PI / 2, emissive: 0xffdf99, emissiveIntensity: 0.85, roughness: 0.1 });

  // 4 Barn door flaps
  addBox(g, 0.2, 0.08, 0.004, 0x1a1a1a, 0, headY + 0.12, 0.13, { rx: -0.3, metalness: 0.4 });
  addBox(g, 0.2, 0.08, 0.004, 0x1a1a1a, 0, headY - 0.12, 0.13, { rx: 0.3, metalness: 0.4 });
  addBox(g, 0.08, 0.18, 0.004, 0x1a1a1a, 0.12, headY, 0.13, { ry: 0.3, metalness: 0.4 });
  addBox(g, 0.08, 0.18, 0.004, 0x1a1a1a, -0.12, headY, 0.13, { ry: -0.3, metalness: 0.4 });
  return g;
}

function createRgbTubeModel(): THREE.Group {
  const g = new THREE.Group();
  // Tabletop base plate
  addCyl(g, 0.06, 0.065, 0.01, 0x22201e, 0, 0.005, 0, 16, { metalness: 0.4 });
  // Stand clamp
  addCyl(g, 0.01, 0.01, 0.1, 0x4a4744, 0, 0.06, 0, 14, { metalness: 0.5 });
  addBox(g, 0.03, 0.04, 0.03, 0x22201e, 0, 0.12, 0, { metalness: 0.4 });

  // Frosted acrylic glowing tube
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xff0077,
    emissive: 0xff0066,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.88, 20), tubeMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, 0.15, 0);
  tube.castShadow = true;
  g.add(tube);

  // Inner core glow
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x9933ff,
    emissiveIntensity: 0.9,
    roughness: 0.1,
  });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 16), innerMat);
  inner.rotation.z = Math.PI / 2;
  inner.position.set(0, 0.15, 0);
  g.add(inner);

  // Tube end caps
  addCyl(g, 0.022, 0.022, 0.025, 0x111111, 0.45, 0.15, 0, 16, { rz: Math.PI / 2, metalness: 0.5 });
  addCyl(g, 0.022, 0.022, 0.025, 0x111111, -0.45, 0.15, 0, 16, { rz: Math.PI / 2, metalness: 0.5 });
  return g;
}

function createDeskLampModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, sl = 0x888888;
  // Heavy round base
  addCyl(g, 0.075, 0.08, 0.015, bk, 0, 0.0075, 0, 20, { metalness: 0.4, roughness: 0.4 });
  // Base swivel knuckle
  addCyl(g, 0.014, 0.014, 0.03, sl, 0, 0.025, 0, 14, { metalness: 0.6 });
  addSphere(g, 0.014, sl, 0, 0.045, 0, 14, { metalness: 0.6 });

  // Lower anglepoise arm
  addStrut(g, 0, 0.045, 0, 0.04, 0.22, 0, 0.006, bk, { metalness: 0.4 });
  addStrut(g, 0, 0.055, 0, 0.04, 0.23, 0, 0.006, bk, { metalness: 0.4 });
  // Elbow joint
  addSphere(g, 0.014, sl, 0.04, 0.225, 0, 14, { metalness: 0.6 });

  // Upper arm reaching to lamp head
  addStrut(g, 0.04, 0.225, 0, -0.03, 0.38, 0, 0.006, bk, { metalness: 0.4 });
  addSphere(g, 0.012, sl, -0.03, 0.38, 0, 14, { metalness: 0.6 });

  // Conical lampshade
  const shadeGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.08, 20);
  const shade = new THREE.Mesh(shadeGeo, makeMat(bk, 0.4, 0.3));
  shade.position.set(-0.03, 0.42, 0);
  shade.castShadow = true;
  g.add(shade);

  // Glowing bulb inside
  addSphere(g, 0.018, 0xfffae0, -0.03, 0.395, 0, 16, { emissive: 0xffdd88, emissiveIntensity: 0.9 });
  return g;
}

function createBeautyDishModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, sl = 0x888888, gy = 0x4a4744;
  const standH = 1.48;

  // Sturdy light stand
  addCyl(g, 0.016, 0.018, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.5 });
  addTripodLegs(g, standH * 0.7, 0.34, 0.012, gy, true);

  // Stand collar & bracket
  addCyl(g, 0.024, 0.02, 0.04, gy, 0, standH + 0.02, 0, 16, { metalness: 0.5 });
  addBox(g, 0.04, 0.08, 0.04, bk, 0, standH + 0.07, 0, { metalness: 0.4 });

  // Parabolic dish reflector
  const dishY = standH + 0.22;
  const dishGeo = new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.36);
  const dishMat = makeMat(0xf5f2ed, 0.4, 0.2);
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, dishY, 0.02);
  dish.rotation.x = Math.PI / 2 + 0.2;
  dish.castShadow = true;
  g.add(dish);

  // Dish outer rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.007, 12, 32), makeMat(bk, 0.4, 0.4));
  rim.position.set(0, dishY, 0.02);
  rim.rotation.x = Math.PI / 2 + 0.2;
  g.add(rim);

  // Center deflector plate & flash tube
  addCyl(g, 0.045, 0.045, 0.006, 0xf0ece1, 0, dishY, 0.07, 16, { rx: Math.PI / 2, emissive: 0xfff8e8, emissiveIntensity: 0.4 });
  addStrut(g, 0, dishY, 0, 0, dishY, 0.07, 0.003, sl, { metalness: 0.7, castShadow: false });
  return g;
}

// ================================================================
// BATCH 3 — Audio (6 models)
// ================================================================

function createMicrophoneModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, sl = 0x888888, gy = 0x4a4744;

  // Desk clamp base
  addBox(g, 0.05, 0.02, 0.05, bk, 0, 0.01, 0, { metalness: 0.4 });
  addBox(g, 0.015, 0.04, 0.05, bk, 0, 0.03, -0.02, { metalness: 0.4 });
  addCyl(g, 0.008, 0.008, 0.03, sl, 0, 0.035, 0, 12, { rx: Math.PI / 2, metalness: 0.6 });

  // Lower boom arm (dual struts)
  addStrut(g, -0.01, 0.04, 0, -0.01, 0.22, 0.12, 0.005, bk, { metalness: 0.4 });
  addStrut(g, 0.01, 0.04, 0, 0.01, 0.22, 0.12, 0.005, bk, { metalness: 0.4 });
  // Elbow joint with tension knob
  addSphere(g, 0.015, sl, 0, 0.22, 0.12, 14, { metalness: 0.6 });
  addCyl(g, 0.01, 0.01, 0.02, 0x111111, 0.018, 0.22, 0.12, 12, { rz: Math.PI / 2 });

  // Upper boom arm (dual struts)
  addStrut(g, -0.008, 0.22, 0.12, -0.008, 0.38, 0.26, 0.005, bk, { metalness: 0.4 });
  addStrut(g, 0.008, 0.22, 0.12, 0.008, 0.38, 0.26, 0.005, bk, { metalness: 0.4 });
  addSphere(g, 0.012, sl, 0, 0.38, 0.26, 14, { metalness: 0.6 });

  // Shockmount basket
  const micOriginY = 0.39;
  const micOriginZ = 0.26;
  const basket = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.003, 8, 24), makeMat(gy, 0.5, 0.4));
  basket.position.set(0, micOriginY, micOriginZ);
  g.add(basket);

  // Condenser microphone body
  addCyl(g, 0.018, 0.02, 0.11, 0x3a3836, 0, micOriginY + 0.03, micOriginZ, 16, { metalness: 0.5, roughness: 0.4 });
  // Metal mesh capsule grille
  addCyl(g, 0.019, 0.019, 0.06, sl, 0, micOriginY + 0.1, micOriginZ, 16, { metalness: 0.7, roughness: 0.3 });
  addSphere(g, 0.019, sl, 0, micOriginY + 0.13, micOriginZ, 16, { metalness: 0.7, roughness: 0.3 });

  // Pop filter on gooseneck
  addStrut(g, 0.025, micOriginY, micOriginZ - 0.02, 0.04, micOriginY + 0.08, micOriginZ + 0.04, 0.003, bk, { metalness: 0.4 });
  const popRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.003, 8, 24), makeMat(bk, 0.4, 0.3));
  popRing.position.set(0, micOriginY + 0.1, micOriginZ + 0.045);
  popRing.rotation.y = 0.1;
  g.add(popRing);
  return g;
}

function createLavalierModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x181818;
  // Transmitter Bodypack 1
  addBox(g, 0.045, 0.065, 0.016, bk, -0.06, 0.035, 0, { roughness: 0.8, metalness: 0.2 });
  addBox(g, 0.006, 0.05, 0.018, 0x444444, -0.084, 0.035, 0, { metalness: 0.5 });
  addCyl(g, 0.002, 0.001, 0.045, 0x333333, -0.04, 0.085, 0, 8);
  addSphere(g, 0.0025, 0x44cc44, -0.06, 0.066, 0.009, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  // Clip-on lav mic capsule with wire
  addCyl(g, 0.004, 0.004, 0.014, 0x111111, -0.06, 0.01, 0.045, 12);
  addSphere(g, 0.007, 0x222222, -0.06, 0.01, 0.055, 12, { roughness: 0.95 });

  // Receiver Bodypack 2
  addBox(g, 0.045, 0.065, 0.016, bk, 0.06, 0.035, 0, { roughness: 0.8, metalness: 0.2 });
  addBox(g, 0.006, 0.05, 0.018, 0x444444, 0.084, 0.035, 0, { metalness: 0.5 });
  addCyl(g, 0.002, 0.001, 0.045, 0x333333, 0.04, 0.085, 0, 8);
  addSphere(g, 0.0025, 0x44cc44, 0.06, 0.066, 0.009, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  addCyl(g, 0.004, 0.004, 0.014, 0x111111, 0.06, 0.01, 0.045, 12);
  addSphere(g, 0.007, 0x222222, 0.06, 0.01, 0.055, 12, { roughness: 0.95 });
  return g;
}

function createAudioRecorderModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x333333, sl = 0x888888;
  // Field recorder body
  addBox(g, 0.07, 0.13, 0.03, dk, 0, 0.065, 0, { metalness: 0.3, roughness: 0.5 });
  // Protective roll bars at top
  addStrut(g, -0.03, 0.12, 0.015, -0.03, 0.155, 0.015, 0.003, sl, { metalness: 0.7 });
  addStrut(g, 0.03, 0.12, 0.015, 0.03, 0.155, 0.015, 0.003, sl, { metalness: 0.7 });

  // XY Stereo condenser capsules
  addCyl(g, 0.007, 0.007, 0.028, sl, -0.014, 0.14, 0.008, 14, { rz: -0.4, metalness: 0.6 });
  addCyl(g, 0.007, 0.007, 0.028, sl, 0.014, 0.14, 0.008, 14, { rz: 0.4, metalness: 0.6 });
  addSphere(g, 0.008, 0x555555, -0.018, 0.154, 0.012, 14, { roughness: 0.5, metalness: 0.4 });
  addSphere(g, 0.008, 0x555555, 0.018, 0.154, 0.012, 14, { roughness: 0.5, metalness: 0.4 });

  // Backlit LCD display
  addBox(g, 0.046, 0.03, 0.002, 0x162436, 0, 0.09, 0.016, { roughness: 0.1, metalness: 0.3 });
  // Transport buttons & record LED
  addBox(g, 0.012, 0.012, 0.004, 0xdd2222, -0.018, 0.045, 0.016, { emissive: 0xdd2222, emissiveIntensity: 0.6 });
  addBox(g, 0.01, 0.01, 0.004, 0x555555, 0, 0.045, 0.016, { metalness: 0.4 });
  addBox(g, 0.01, 0.01, 0.004, 0x555555, 0.018, 0.045, 0.016, { metalness: 0.4 });
  return g;
}

function createStudioMonitorModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x1a1a1a, gy = 0x5a5752;
  // Speaker cabinet
  addBox(g, 0.19, 0.29, 0.21, bk, 0, 0.145, 0, { roughness: 0.6, metalness: 0.15 });
  // Front baffle
  addBox(g, 0.18, 0.28, 0.008, 0x242424, 0, 0.145, 0.108, { roughness: 0.5 });

  // Silk dome tweeter in waveguide
  addCyl(g, 0.024, 0.024, 0.006, 0x181818, 0, 0.23, 0.114, 20, { rx: Math.PI / 2, roughness: 0.8 });
  addSphere(g, 0.012, 0xcccccc, 0, 0.23, 0.116, 16, { metalness: 0.7, roughness: 0.2 });

  // Kevlar woofer cone
  addCyl(g, 0.056, 0.056, 0.008, gy, 0, 0.13, 0.114, 24, { rx: Math.PI / 2, roughness: 0.6, metalness: 0.1 });
  addSphere(g, 0.018, 0x1a1a1a, 0, 0.13, 0.118, 16, { roughness: 0.8 });

  // Bass reflex port
  addCyl(g, 0.018, 0.018, 0.02, 0x0a0a0a, 0, 0.045, 0.112, 20, { rx: Math.PI / 2 });
  // Power indicator LED
  addSphere(g, 0.0025, 0x44cc44, 0.07, 0.26, 0.114, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  return g;
}

function createPodcastMicModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, dk = 0x181818, sl = 0x888888;

  // Heavy broadcast desk stand / clamp
  addCyl(g, 0.08, 0.085, 0.014, bk, 0, 0.007, 0, 20, { metalness: 0.5, roughness: 0.4 });
  addCyl(g, 0.014, 0.014, 0.18, bk, 0, 0.1, 0, 16, { metalness: 0.5 });

  // Integrated swivel yoke
  const yokeY = 0.24;
  addStrut(g, -0.045, 0.19, 0, -0.045, yokeY, 0, 0.006, bk, { metalness: 0.5 });
  addStrut(g, 0.045, 0.19, 0, 0.045, yokeY, 0, 0.006, bk, { metalness: 0.5 });
  addStrut(g, -0.045, 0.19, 0, 0.045, 0.19, 0, 0.006, bk, { metalness: 0.5 });
  addCyl(g, 0.01, 0.01, 0.02, sl, 0.048, yokeY, 0, 12, { rz: Math.PI / 2, metalness: 0.6 });
  addCyl(g, 0.01, 0.01, 0.02, sl, -0.048, yokeY, 0, 12, { rz: Math.PI / 2, metalness: 0.6 });

  // Broadcast dynamic mic body (SM7B style)
  addCyl(g, 0.025, 0.025, 0.14, dk, 0, yokeY + 0.04, 0, 18, { metalness: 0.4, roughness: 0.5 });
  // Thick foam windscreen
  addCyl(g, 0.027, 0.027, 0.09, 0x111111, 0, yokeY + 0.14, 0, 18, { roughness: 0.95 });
  addSphere(g, 0.027, 0x111111, 0, yokeY + 0.185, 0, 18, { roughness: 0.95 });

  // Rear XLR jack & switches
  addCyl(g, 0.01, 0.01, 0.015, sl, 0, yokeY - 0.04, 0, 12, { metalness: 0.6 });
  return g;
}

function createAcousticPanelModel(): THREE.Group {
  const g = new THREE.Group();
  const foam = 0x333333;
  // Wooden frame backing
  addBox(g, 0.6, 0.6, 0.014, 0x22201e, 0, 0.3, 0, { roughness: 0.8 });
  // Acoustic foam core
  addBox(g, 0.58, 0.58, 0.035, foam, 0, 0.3, 0.018, { roughness: 0.95 });

  // 3D sculpted wedge / pyramid pattern
  const pyrSize = 0.07;
  const grid = 7;
  const off = -(grid - 1) * pyrSize / 2;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const wedge = new THREE.Mesh(new THREE.ConeGeometry(pyrSize * 0.45, 0.025, 4), makeMat(foam, 0.95));
      wedge.position.set(off + c * pyrSize, 0.3 + (off + r * pyrSize), 0.045);
      wedge.rotation.y = Math.PI / 4;
      wedge.castShadow = true;
      g.add(wedge);
    }
  }
  return g;
}

// ================================================================
// BATCH 4 — Furniture & Props (7 models)
// ================================================================

function createTripodModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x4a4744, bk = 0x22201e, sl = 0x888888;
  const standH = 1.25;

  // Center column
  addCyl(g, 0.014, 0.016, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.5, roughness: 0.4 });
  // Professional 3-stage tripod legs
  addTripodLegs(g, standH * 0.78, 0.42, 0.013, gy, false);

  // Center column collar & locking knob
  addCyl(g, 0.024, 0.024, 0.04, bk, 0, standH - 0.1, 0, 16, { metalness: 0.5 });
  addCyl(g, 0.008, 0.008, 0.02, sl, 0.025, standH - 0.1, 0, 12, { rz: Math.PI / 2, metalness: 0.6 });

  // Fluid Video Head
  const headY = standH + 0.05;
  addCyl(g, 0.032, 0.03, 0.06, bk, 0, headY, 0, 18, { metalness: 0.5, roughness: 0.4 });
  // Quick-release plate & clamp
  addBox(g, 0.06, 0.012, 0.045, 0x181818, 0, headY + 0.036, 0, { metalness: 0.6 });
  // Pan handle
  addStrut(g, 0.02, headY + 0.02, -0.01, 0.14, headY - 0.05, -0.22, 0.006, bk, { metalness: 0.5 });
  addCyl(g, 0.01, 0.01, 0.07, 0x111111, 0.14, headY - 0.05, -0.22, 12, { roughness: 0.9 });
  return g;
}

function createContentTableModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8b6f47, frame = 0x22201e;
  const deskW = 1.3, deskD = 0.65, deskH = 0.74;

  // Solid wood desktop
  addBox(g, deskW, 0.035, deskD, wood, 0, deskH, 0, { roughness: 0.45, receiveShadow: true });
  // Beveled edge trim
  addBox(g, deskW + 0.01, 0.006, deskD + 0.01, 0x6e5230, 0, deskH - 0.018, 0, { roughness: 0.5 });

  // Square steel frame legs
  const legX = deskW / 2 - 0.06;
  const legZ = deskD / 2 - 0.06;
  const legW = 0.04;
  const legH = deskH - 0.018;

  // 4 corner legs
  addBox(g, legW, legH, legW, frame, -legX, legH / 2, legZ, { metalness: 0.5, roughness: 0.4 });
  addBox(g, legW, legH, legW, frame, legX, legH / 2, legZ, { metalness: 0.5, roughness: 0.4 });
  addBox(g, legW, legH, legW, frame, -legX, legH / 2, -legZ, { metalness: 0.5, roughness: 0.4 });
  addBox(g, legW, legH, legW, frame, legX, legH / 2, -legZ, { metalness: 0.5, roughness: 0.4 });

  // Side foot braces
  addBox(g, legW, 0.03, deskD - 0.08, frame, -legX, 0.04, 0, { metalness: 0.5 });
  addBox(g, legW, 0.03, deskD - 0.08, frame, legX, 0.04, 0, { metalness: 0.5 });

  // Rear modesty/cable-tray bar
  addBox(g, deskW - 0.16, 0.03, 0.03, frame, 0, deskH * 0.7, -legZ, { metalness: 0.5 });
  // Desktop wire grommet
  addCyl(g, 0.024, 0.024, 0.04, 0x111111, 0.35, deskH + 0.005, -0.2, 16);
  return g;
}

function createChairModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, gy = 0x4a4744, sl = 0x888888;

  // 5-Star Caster Base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const rx = Math.cos(a) * 0.26;
    const rz = Math.sin(a) * 0.26;
    addStrut(g, 0, 0.05, 0, rx, 0.03, rz, 0.012, gy, { metalness: 0.6, roughness: 0.3 });
    // Dual caster wheels
    addSphere(g, 0.016, 0x111111, rx, 0.016, rz, 12, { roughness: 0.9 });
  }

  // Pneumatic gas lift cylinder
  addCyl(g, 0.022, 0.025, 0.36, sl, 0, 0.22, 0, 16, { metalness: 0.7, roughness: 0.2 });
  addCyl(g, 0.038, 0.042, 0.08, bk, 0, 0.4, 0, 16, { metalness: 0.3 });

  // Contoured Seat Cushion
  addBox(g, 0.46, 0.06, 0.44, bk, 0, 0.45, 0, { roughness: 0.8, receiveShadow: true });
  addBox(g, 0.42, 0.03, 0.4, 0x333333, 0, 0.485, 0, { roughness: 0.9 });

  // Ergonomic Mesh Backrest
  addBox(g, 0.4, 0.46, 0.025, 0x2a2826, 0, 0.73, -0.2, { roughness: 0.9 });
  // Lumbar support pad
  addBox(g, 0.32, 0.1, 0.02, 0x111111, 0, 0.6, -0.18, { roughness: 0.95 });

  // Headrest
  addStrut(g, 0, 0.95, -0.2, 0, 1.02, -0.2, 0.01, sl, { metalness: 0.6 });
  addBox(g, 0.24, 0.11, 0.04, bk, 0, 1.04, -0.19, { roughness: 0.85 });

  // 3D Adjustable Armrests
  [-0.25, 0.25].forEach((sx) => {
    addStrut(g, sx, 0.44, 0, sx, 0.56, 0, 0.012, sl, { metalness: 0.6 });
    addBox(g, 0.07, 0.025, 0.2, 0x111111, sx, 0.58, 0.02, { roughness: 0.85 });
  });
  return g;
}

function createSofaModel(): THREE.Group {
  const g = new THREE.Group();
  const fabric = 0x4f4b46, cushion = 0x5a554f;

  // Main sofa base frame
  addBox(g, 1.45, 0.2, 0.65, fabric, 0, 0.26, 0, { roughness: 0.9, receiveShadow: true });

  // Twin thick seat cushions
  addBox(g, 0.66, 0.1, 0.54, cushion, -0.34, 0.41, 0.03, { roughness: 0.95 });
  addBox(g, 0.66, 0.1, 0.54, cushion, 0.34, 0.41, 0.03, { roughness: 0.95 });

  // Sofa Backrest
  addBox(g, 1.45, 0.4, 0.16, fabric, 0, 0.56, -0.24, { roughness: 0.9 });
  // Twin back cushions
  addBox(g, 0.64, 0.32, 0.1, cushion, -0.34, 0.58, -0.15, { roughness: 0.95 });
  addBox(g, 0.64, 0.32, 0.1, cushion, 0.34, 0.58, -0.15, { roughness: 0.95 });

  // Armrests
  addBox(g, 0.14, 0.28, 0.65, fabric, -0.72, 0.45, 0, { roughness: 0.9 });
  addBox(g, 0.14, 0.28, 0.65, fabric, 0.72, 0.45, 0, { roughness: 0.9 });

  // 4 Mid-century tapered wooden legs with brass tips
  const legs = [
    [-0.64, 0.24],
    [0.64, 0.24],
    [-0.64, -0.24],
    [0.64, -0.24],
  ];
  legs.forEach(([lx, lz]) => {
    addCyl(g, 0.02, 0.012, 0.16, 0x6e4e2a, lx, 0.08, lz, 12, { roughness: 0.6 });
    addCyl(g, 0.013, 0.011, 0.03, 0xd4af37, lx, 0.015, lz, 12, { metalness: 0.8, roughness: 0.3 });
  });
  return g;
}

function createProductStandModel(): THREE.Group {
  const g = new THREE.Group();
  // Motorized turntable base
  addCyl(g, 0.12, 0.125, 0.04, 0x22201e, 0, 0.02, 0, 24, { metalness: 0.4, roughness: 0.4 });
  // Accent metal ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.003, 12, 32), makeMat(0xd4af37, 0.7, 0.2));
  ring.position.set(0, 0.04, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Rotating frosted acrylic display plate
  addCyl(g, 0.15, 0.15, 0.01, 0xf0f0f0, 0, 0.048, 0, 32, { roughness: 0.1, metalness: 0.1, receiveShadow: true });
  // Rotation LED indicator
  addSphere(g, 0.003, 0x44cc44, 0.09, 0.025, 0.08, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });
  return g;
}

function createBackdropModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x3d3a37, bk = 0x1c1a18, sl = 0xaaaaaa;
  const standH = 2.4;
  const width = 2.0;

  // Left & Right Pro C-Stands with Turtle Bases
  [-width / 2, width / 2].forEach((xPos) => {
    // Riser Main Column
    addCyl(g, 0.016, 0.018, standH, gy, xPos, standH / 2, 0, 18, { metalness: 0.6, roughness: 0.35 });

    // 3 Telescopic Riser Locking Collars with T-handles
    [0.75, 1.45, 2.15].forEach((collarY) => {
      addCyl(g, 0.024, 0.024, 0.035, bk, xPos, collarY, 0, 16, { metalness: 0.5 });
      addCyl(g, 0.005, 0.005, 0.028, sl, xPos + 0.024, collarY, 0, 10, { rz: Math.PI / 2, metalness: 0.8 });
    });

    // 3-Tier Staggered Turtle Base Legs under each stand
    addTripodLegs(g, 0.42, 0.32, 0.012, gy, false, xPos, 0);

    // Studio Sandbag at stand base
    addBox(g, 0.16, 0.06, 0.12, 0x222222, xPos, 0.035, 0, { roughness: 0.95 });
    addBox(g, 0.14, 0.02, 0.02, 0x444444, xPos, 0.07, 0, { roughness: 0.9 });

    // Top 2.5" Grip Head Knuckle
    addBox(g, 0.045, 0.045, 0.045, bk, xPos, standH + 0.01, 0, { metalness: 0.6 });
    addCyl(g, 0.006, 0.006, 0.032, sl, xPos + (xPos > 0 ? 0.03 : -0.03), standH + 0.01, 0, 12, {
      rz: Math.PI / 2,
      metalness: 0.8,
    });
  });

  // Top Telescoping Crossbar
  addCyl(g, 0.015, 0.015, width + 0.16, sl, 0, standH + 0.01, 0, 20, { rz: Math.PI / 2, metalness: 0.7, roughness: 0.25 });

  // Seamless Seamless Paper Roll Core
  const rollR = 0.038;
  addCyl(g, rollR, rollR, width - 0.04, 0xd8d0c2, 0, standH, 0, 24, { rz: Math.PI / 2, roughness: 0.9 });
  // Paper Roll Side End Caps & Core Tubes
  [-width / 2 + 0.04, width / 2 - 0.04].forEach((rx) => {
    addCyl(g, 0.042, 0.042, 0.012, bk, rx, standH, 0, 16, { rz: Math.PI / 2 });
    addCyl(g, 0.018, 0.018, 0.02, 0x664422, rx + (rx > 0 ? 0.01 : -0.01), standH, 0, 12, { rz: Math.PI / 2 });
  });

  // Seamless Paper Sweep (Hanging Vertical Sheet)
  const sweepMat = { roughness: 0.92, receiveShadow: true };
  const paperW = width - 0.08;
  addBox(g, paperW, standH - 0.04, 0.006, 0xd8d0c2, 0, standH / 2, 0, sweepMat);

  // Curved transition quadrant on floor
  addCyl(g, 0.08, 0.08, paperW, 0xd8d0c2, 0, 0.04, 0.04, 20, {
    rz: Math.PI / 2,
    roughness: 0.92,
    receiveShadow: true,
  });

  // Floor Sweep Section extending forward
  addBox(g, paperW, 0.004, 0.7, 0xd8d0c2, 0, 0.002, 0.42, sweepMat);
  return g;
}

function createShelfPropsModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8b6f47, frame = 0x22201e;
  const h = 1.4, w = 0.78, d = 0.28;

  // Metal ladder frame uprights
  [-w / 2, w / 2].forEach((xPos) => {
    addBox(g, 0.02, h, 0.02, frame, xPos, h / 2, d / 2 - 0.01, { metalness: 0.5 });
    addBox(g, 0.02, h, 0.02, frame, xPos, h / 2, -d / 2 + 0.01, { metalness: 0.5 });
  });

  // 4 Shelves
  const shelfY = [0.04, 0.46, 0.88, 1.3];
  shelfY.forEach((y) => {
    addBox(g, w, 0.022, d, wood, 0, y, 0, { roughness: 0.55, receiveShadow: true });
  });

  // Props on Shelf 1 (Books)
  addBox(g, 0.06, 0.16, 0.14, 0xc75d3f, -0.22, 0.13, 0, { roughness: 0.8 });
  addBox(g, 0.05, 0.14, 0.13, 0x3a5f8a, -0.16, 0.12, 0.01, { roughness: 0.8 });
  addBox(g, 0.06, 0.15, 0.12, 0x4a6741, -0.1, 0.125, -0.01, { roughness: 0.8 });

  // Props on Shelf 2 (Succulent in ceramic pot + framed art)
  addCyl(g, 0.03, 0.025, 0.05, 0xe8e2d5, -0.18, 0.5, 0.03, 16, { roughness: 0.6 });
  addSphere(g, 0.028, 0x4a7a3a, -0.18, 0.54, 0.03, 12);
  addBox(g, 0.12, 0.15, 0.012, frame, 0.14, 0.55, -0.02, { metalness: 0.3 });
  addBox(g, 0.1, 0.13, 0.002, 0xffffff, 0.14, 0.55, -0.013, { roughness: 0.5 });

  // Props on Shelf 3 (Modern geometric sculpture)
  addCyl(g, 0.035, 0.035, 0.08, 0xd4af37, 0.1, 0.93, 0, 16, { metalness: 0.7, roughness: 0.2 });
  addBox(g, 0.05, 0.05, 0.05, 0x333333, -0.14, 0.91, 0.02, { metalness: 0.4, roughness: 0.5 });
  return g;
}

// ================================================================
// BATCH 5 — Power & Accessories (5 models)
// ================================================================

function createPowerStationModel(): THREE.Group {
  const g = new THREE.Group();
  const body = 0x2e5446, dk = 0x1a1a1a;
  // Main generator / battery housing
  addBox(g, 0.28, 0.2, 0.18, body, 0, 0.13, 0, { roughness: 0.5, metalness: 0.2 });
  addBox(g, 0.27, 0.01, 0.17, 0x3b6957, 0, 0.235, 0, { roughness: 0.4 });

  // Rugged molded top handle
  addStrut(g, -0.07, 0.23, 0, -0.07, 0.27, 0, 0.01, dk, { metalness: 0.4 });
  addStrut(g, 0.07, 0.23, 0, 0.07, 0.27, 0, 0.01, dk, { metalness: 0.4 });
  addStrut(g, -0.07, 0.27, 0, 0.07, 0.27, 0, 0.012, dk, { metalness: 0.4 });

  // Front control panel
  addBox(g, 0.24, 0.14, 0.006, 0x1f1f1f, 0, 0.13, 0.093, { roughness: 0.7 });

  // Informative LCD Display
  addBox(g, 0.07, 0.035, 0.002, 0x0c1e14, 0, 0.16, 0.097, { roughness: 0.1 });
  // Battery status LEDs
  for (let i = 0; i < 4; i++) {
    addSphere(g, 0.003, 0x33dd55, -0.02 + i * 0.013, 0.16, 0.099, 8, { emissive: 0x33dd55, emissiveIntensity: 0.8 });
  }

  // Dual AC Inverter Sockets
  [-0.06, 0.06].forEach((xPos) => {
    addBox(g, 0.036, 0.04, 0.006, 0x333333, xPos, 0.09, 0.097, { metalness: 0.3 });
    addCyl(g, 0.003, 0.003, 0.006, 0x111111, xPos - 0.006, 0.095, 0.101, 8);
    addCyl(g, 0.003, 0.003, 0.006, 0x111111, xPos + 0.006, 0.095, 0.101, 8);
  });

  // Fast-charge USB Ports
  addBox(g, 0.012, 0.02, 0.006, 0x333333, 0, 0.09, 0.097, { metalness: 0.3 });
  return g;
}

function createGeneratorModel(): THREE.Group {
  const g = new THREE.Group();
  const body = 0x5a5853, dk = 0x1a1a1a, sl = 0x888888;

  // Heavy duty generator housing
  addBox(g, 0.46, 0.36, 0.3, body, 0, 0.22, 0, { roughness: 0.6, metalness: 0.2 });
  // Top tubular roll cage frame
  addStrut(g, -0.22, 0.38, -0.14, 0.22, 0.38, -0.14, 0.012, dk, { metalness: 0.5 });
  addStrut(g, -0.22, 0.38, 0.14, 0.22, 0.38, 0.14, 0.012, dk, { metalness: 0.5 });

  // Fuel tank cap
  addCyl(g, 0.025, 0.025, 0.02, dk, 0.12, 0.41, 0, 16, { metalness: 0.5 });

  // Front control panel
  addBox(g, 0.22, 0.16, 0.006, 0x222222, -0.08, 0.24, 0.153, { roughness: 0.7 });
  // Sockets & circuit breakers
  addCyl(g, 0.014, 0.014, 0.01, sl, -0.12, 0.26, 0.158, 16, { rx: Math.PI / 2, metalness: 0.6 });
  addCyl(g, 0.014, 0.014, 0.01, sl, -0.06, 0.26, 0.158, 16, { rx: Math.PI / 2, metalness: 0.6 });
  addBox(g, 0.015, 0.02, 0.008, 0xdd2222, -0.02, 0.23, 0.158, { emissive: 0xdd2222, emissiveIntensity: 0.5 });

  // Exhaust muffler
  addCyl(g, 0.022, 0.022, 0.08, dk, 0.18, 0.32, 0.12, 16, { metalness: 0.6 });

  // Heavy duty wheels
  [-0.14, 0.14].forEach((zPos) => {
    addCyl(g, 0.045, 0.045, 0.025, 0x111111, -0.18, 0.045, zPos, 20, { rx: Math.PI / 2, roughness: 0.95 });
  });
  return g;
}

function createPowerStripModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e;

  // Power strip housing
  addBox(g, 0.36, 0.035, 0.06, bk, 0, 0.02, 0, { roughness: 0.7, metalness: 0.2 });

  // 6 AC Sockets
  for (let c = 0; c < 5; c++) {
    const x = -0.11 + c * 0.055;
    addBox(g, 0.024, 0.004, 0.03, 0x333333, x, 0.038, 0, { metalness: 0.3 });
    addCyl(g, 0.003, 0.003, 0.005, 0x111111, x - 0.006, 0.04, 0, 8);
    addCyl(g, 0.003, 0.003, 0.005, 0x111111, x + 0.006, 0.04, 0, 8);
  }

  // Lighted Rocker Switch
  addBox(g, 0.016, 0.01, 0.012, 0xdd2222, 0.14, 0.04, 0, { emissive: 0xdd2222, emissiveIntensity: 0.6 });
  // Surge LED
  addSphere(g, 0.0025, 0x44cc44, 0.14, 0.04, 0.018, 8, { emissive: 0x44cc44, emissiveIntensity: 0.9 });

  // Heavy duty power cord
  addCyl(g, 0.005, 0.005, 0.1, 0x111111, -0.22, 0.02, 0, 12, { rz: Math.PI / 2 });
  return g;
}

function createGreenScreenModel(): THREE.Group {
  const g = new THREE.Group();
  const green = 0x00c844, gy = 0x3d3a37, bk = 0x1c1a18, sl = 0xaaaaaa;
  const standH = 2.3;
  const width = 1.8;

  // Dual C-Stands at ends
  [-width / 2, width / 2].forEach((xPos) => {
    addCyl(g, 0.015, 0.017, standH, gy, xPos, standH / 2, 0, 18, { metalness: 0.6, roughness: 0.35 });

    [0.75, 1.5].forEach((collarY) => {
      addCyl(g, 0.022, 0.022, 0.03, bk, xPos, collarY, 0, 16, { metalness: 0.5 });
      addCyl(g, 0.005, 0.005, 0.024, sl, xPos + 0.022, collarY, 0, 10, { rz: Math.PI / 2 });
    });

    addTripodLegs(g, 0.4, 0.3, 0.011, gy, false, xPos, 0);

    // Grip Head
    addBox(g, 0.04, 0.04, 0.04, bk, xPos, standH + 0.01, 0, { metalness: 0.6 });
  });

  // Top crossbar
  addCyl(g, 0.014, 0.014, width + 0.12, sl, 0, standH + 0.01, 0, 18, { rz: Math.PI / 2, metalness: 0.7 });

  // Wrinkle-resistant Chroma Green Fabric
  const chromaMat = { roughness: 0.95, receiveShadow: true };
  const clothW = width - 0.06;
  addBox(g, clothW, standH - 0.04, 0.006, green, 0, standH / 2, 0.005, chromaMat);

  // Curved transition to floor sweep
  addCyl(g, 0.06, 0.06, clothW, green, 0, 0.03, 0.035, 18, {
    rz: Math.PI / 2,
    roughness: 0.95,
    receiveShadow: true,
  });

  // Floor sweep
  addBox(g, clothW, 0.004, 0.6, green, 0, 0.002, 0.34, chromaMat);
  return g;
}

function createTeleprompterModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, sl = 0x888888;

  // Base mount & 15mm rail block
  addBox(g, 0.08, 0.02, 0.12, bk, 0, 0.01, 0, { metalness: 0.4 });
  addStrut(g, -0.03, 0.01, -0.08, -0.03, 0.01, 0.12, 0.007, sl, { metalness: 0.7 });
  addStrut(g, 0.03, 0.01, -0.08, 0.03, 0.01, 0.12, 0.007, sl, { metalness: 0.7 });

  // Trapezoidal Matte Box Hood
  const hoodY = 0.14;
  addBox(g, 0.18, 0.14, 0.14, bk, 0, hoodY, 0, { roughness: 0.7, metalness: 0.3 });

  // 70/30 Beam Splitter Glass angled at 45 degrees
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99bbdd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.6,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.12), glassMat);
  glass.position.set(0, hoodY, 0);
  glass.rotation.x = -Math.PI / 4;
  g.add(glass);

  // Glass bevel bezel frame
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.154, 0.124, 0.006), makeMat(bk, 0.4, 0.4));
  bezel.position.set(0, hoodY, 0);
  bezel.rotation.x = -Math.PI / 4;
  g.add(bezel);

  // Prompter Tablet Display Tray underneath
  addBox(g, 0.16, 0.006, 0.12, 0x181818, 0, 0.06, 0.02, { metalness: 0.5 });
  // Glowing prompter text preview
  addBox(g, 0.14, 0.002, 0.1, 0x112233, 0, 0.064, 0.02, { emissive: 0x5599dd, emissiveIntensity: 0.4, roughness: 0.2 });
  return g;
}

function createOverheadRigModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x3d3a37, bk = 0x1c1a18, sl = 0xaaaaaa;
  const standH = 2.2;

  // Heavy duty upright C-stand riser column
  addCyl(g, 0.016, 0.018, standH, gy, -0.25, standH / 2, 0, 18, { metalness: 0.6, roughness: 0.35 });
  [0.75, 1.45, 2.05].forEach((collarY) => {
    addCyl(g, 0.024, 0.024, 0.035, bk, -0.25, collarY, 0, 16, { metalness: 0.5 });
    addCyl(g, 0.005, 0.005, 0.028, sl, -0.226, collarY, 0, 10, { rz: Math.PI / 2, metalness: 0.8 });
  });

  // Turtle base with sandbag
  addTripodLegs(g, 0.42, 0.34, 0.012, gy, false, -0.25, 0);
  addBox(g, 0.16, 0.06, 0.12, 0x222222, -0.25, 0.035, 0, { roughness: 0.95 });

  // 4.5" Grip Head knuckle at top
  addBox(g, 0.05, 0.05, 0.05, bk, -0.25, standH, 0, { metalness: 0.6 });
  addCyl(g, 0.006, 0.006, 0.035, sl, -0.25, standH, 0.03, 10, { rx: Math.PI / 2, metalness: 0.8 });

  // Horizontal Telescoping Boom Arm extending forward over the workspace
  const armY = standH;
  addStrut(g, -0.25, armY, -0.35, -0.25, armY, 0.55, 0.013, sl, { metalness: 0.7, roughness: 0.3 });

  // Counterweight Lead Sandbag/Weights at rear of boom
  addCyl(g, 0.055, 0.055, 0.14, 0x1f1f1f, -0.25, armY, -0.32, 20, { rx: Math.PI / 2, metalness: 0.4 });
  addBox(g, 0.12, 0.08, 0.1, 0x2e2b28, -0.25, armY - 0.08, -0.32, { roughness: 0.9 });

  // Drop-Down Ball Head at front tip of boom
  const camX = -0.25, camZ = 0.52, camY = armY - 0.18;
  addStrut(g, camX, armY, camZ, camX, camY + 0.08, camZ, 0.009, gy, { metalness: 0.6 });
  addSphere(g, 0.02, 0x222222, camX, camY + 0.07, camZ, 14, { metalness: 0.7 });

  // Top-Down DSLR Camera Body pointing directly downwards (-Y)
  addBox(g, 0.14, 0.09, 0.09, bk, camX, camY, camZ, { metalness: 0.3, roughness: 0.5 });
  addBox(g, 0.04, 0.08, 0.06, 0x282828, camX + 0.06, camY + 0.005, camZ, { roughness: 0.8 }); // Hand grip

  // Downward facing prime lens barrel
  addCyl(g, 0.038, 0.036, 0.09, 0x161616, camX, camY - 0.08, camZ, 24, { metalness: 0.5 });
  addCyl(g, 0.035, 0.035, 0.005, 0x1e3a5f, camX, camY - 0.125, camZ, 24, { emissive: 0x1e3a5f, emissiveIntensity: 0.4 });

  return g;
}

function createFloorMonitorModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x1c1a18, sl = 0x666666;

  // 45-degree wedge stage chassis
  const wedgeMat = makeMat(bk, 0.5, 0.4);
  const w = 0.52, d = 0.34, h = 0.28;
  addBox(g, w, h * 0.4, d, bk, 0, h * 0.2, 0, { roughness: 0.6 });
  
  // Angled 45° monitor face
  const screenGeom = new THREE.PlaneGeometry(0.46, 0.26);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x182434,
    emissive: 0x2d4868,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.1,
  });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 0.16, 0.04);
  screen.rotation.x = -Math.PI / 4;
  g.add(screen);

  // Bezel border
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.015), makeMat(0x222222, 0.6, 0.3));
  bezel.position.set(0, 0.16, 0.035);
  bezel.rotation.x = -Math.PI / 4;
  g.add(bezel);

  // Protective steel corner caps
  [-w / 2 + 0.02, w / 2 - 0.02].forEach((cx) => {
    [-d / 2 + 0.02, d / 2 - 0.02].forEach((cz) => {
      addBox(g, 0.035, 0.035, 0.035, sl, cx, 0.02, cz, { metalness: 0.8 });
    });
  });

  // Bottom rubber stage feet
  [-w / 2 + 0.05, w / 2 - 0.05].forEach((fx) => {
    [-d / 2 + 0.05, d / 2 - 0.05].forEach((fz) => {
      addCyl(g, 0.015, 0.015, 0.015, 0x111111, fx, 0.007, fz, 12, { roughness: 0.95 });
    });
  });

  return g;
}

function createBarndoorLightModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x3d3a37, bk = 0x181818, sl = 0xaaaaaa;
  const standH = 1.65;

  // Upright stand with tripod legs
  addCyl(g, 0.014, 0.016, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.6, roughness: 0.35 });
  addTripodLegs(g, standH * 0.4, 0.32, 0.011, gy, true);

  // U-shaped metal yoke bracket
  const yokeY = standH + 0.08;
  addBox(g, 0.32, 0.02, 0.03, bk, 0, yokeY - 0.07, 0, { metalness: 0.6 });
  addBox(g, 0.02, 0.16, 0.03, bk, -0.15, yokeY, 0, { metalness: 0.6 });
  addBox(g, 0.02, 0.16, 0.03, bk, 0.15, yokeY, 0, { metalness: 0.6 });
  // Side rosette locking knobs
  addCyl(g, 0.018, 0.018, 0.02, sl, -0.165, yokeY, 0, 16, { rz: Math.PI / 2, metalness: 0.8 });
  addCyl(g, 0.018, 0.018, 0.02, sl, 0.165, yokeY, 0, 16, { rz: Math.PI / 2, metalness: 0.8 });

  // Main square LED spotlight housing
  const headW = 0.26, headH = 0.26, headD = 0.08;
  addBox(g, headW, headH, headD, bk, 0, yokeY, 0, { metalness: 0.5, roughness: 0.4 });

  // Heat sink cooling fins on back
  for (let f = -0.09; f <= 0.09; f += 0.03) {
    addBox(g, headW - 0.04, 0.008, 0.035, 0x2a2a2a, 0, yokeY + f, -headD / 2 - 0.018, { metalness: 0.7 });
  }

  // Glowing Diffused LED Array Face
  addBox(g, headW - 0.03, headH - 0.03, 0.01, 0xfff0d0, 0, yokeY, headD / 2 + 0.005, {
    emissive: 0xfff4d6,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // 4 Adjustable Matte Black Barndoor Flags
  const doorMat = { roughness: 0.6, metalness: 0.4 };
  // Top Barn Door (angled up & out)
  const topDoor = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.02, 0.12, 0.004), makeMat(bk, 0.6, 0.4));
  topDoor.position.set(0, yokeY + headH / 2 + 0.05, headD / 2 + 0.04);
  topDoor.rotation.x = -Math.PI / 6;
  g.add(topDoor);

  // Bottom Barn Door (angled down & out)
  const botDoor = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.02, 0.12, 0.004), makeMat(bk, 0.6, 0.4));
  botDoor.position.set(0, yokeY - headH / 2 - 0.05, headD / 2 + 0.04);
  botDoor.rotation.x = Math.PI / 6;
  g.add(botDoor);

  // Left Barn Door
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, headH, 0.004), makeMat(bk, 0.6, 0.4));
  leftDoor.position.set(-headW / 2 - 0.05, yokeY, headD / 2 + 0.04);
  leftDoor.rotation.y = Math.PI / 6;
  g.add(leftDoor);

  // Right Barn Door
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, headH, 0.004), makeMat(bk, 0.6, 0.4));
  rightDoor.position.set(headW / 2 + 0.05, yokeY, headD / 2 + 0.04);
  rightDoor.rotation.y = -Math.PI / 6;
  g.add(rightDoor);

  return g;
}

function createBinauralMicModel(): THREE.Group {
  const g = new THREE.Group();
  const wh = 0xf0ece1, bk = 0x222222, sl = 0xbbbbbb;

  // Mini Desktop Tripod Base
  addTripodLegs(g, 0.1, 0.12, 0.006, bk, false);
  addCyl(g, 0.008, 0.008, 0.12, sl, 0, 0.08, 0, 14, { metalness: 0.8 });

  // 3DIO Aluminum Central Enclosure
  const bodyY = 0.18;
  addBox(g, 0.14, 0.07, 0.09, wh, 0, bodyY, 0, { roughness: 0.4, metalness: 0.15 });

  // Top Brushed Aluminum Plate with 3DIO Branding
  addBox(g, 0.136, 0.004, 0.086, 0xded9cf, 0, bodyY + 0.036, 0, { metalness: 0.5 });
  addBox(g, 0.05, 0.002, 0.02, bk, 0, bodyY + 0.039, 0, { metalness: 0.3 });

  // Left & Right Anatomical Silicone Ears
  [-0.076, 0.076].forEach((ex) => {
    const isRight = ex > 0;
    // Silicone ear base flange
    addBox(g, 0.012, 0.065, 0.05, 0xe5ded3, ex, bodyY, 0, { roughness: 0.9 });
    // Outer Ear Auricle Helix Curvature
    addCyl(g, 0.022, 0.022, 0.01, 0xebdccf, ex + (isRight ? 0.008 : -0.008), bodyY + 0.005, 0, 16, {
      rz: Math.PI / 2,
      roughness: 0.92,
    });
    // Ear Canal Acoustic Microphone Port
    addCyl(g, 0.004, 0.004, 0.014, 0x111111, ex, bodyY, 0, 10, { rz: Math.PI / 2 });
  });

  // XLR output sockets on back
  [-0.035, 0.035].forEach((xx) => {
    addCyl(g, 0.008, 0.008, 0.01, sl, xx, bodyY - 0.01, -0.048, 12, { rx: Math.PI / 2, metalness: 0.8 });
  });

  return g;
}

function createVocalBoothScreenModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x22201e, gy = 0x3d3a37, sl = 0xaaaaaa, gold = 0xd4af37;
  const standH = 1.55;

  // Upright stand with tripod legs
  addCyl(g, 0.014, 0.016, standH, gy, 0, standH / 2, 0, 16, { metalness: 0.6 });
  addTripodLegs(g, standH * 0.38, 0.32, 0.011, gy, true);

  // Curved Vocal Shield Arc
  const shieldY = standH + 0.05;
  const numPanels = 7;
  const arcRadius = 0.22;
  for (let p = 0; p < numPanels; p++) {
    const angle = ((p - (numPanels - 1) / 2) / (numPanels - 1)) * (Math.PI * 0.65);
    const px = Math.sin(angle) * arcRadius;
    const pz = -Math.cos(angle) * arcRadius + arcRadius * 0.5;

    // Perforated aluminum exterior shell
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.32, 0.006), makeMat(0x444444, 0.4, 0.7));
    shell.position.set(px, shieldY, pz);
    shell.rotation.y = angle;
    g.add(shell);

    // Dark charcoal high-density acoustic pyramid foam interior
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.31, 0.02), makeMat(0x282624, 0.95, 0.05));
    foam.position.set(px - Math.sin(angle) * 0.012, shieldY, pz + Math.cos(angle) * 0.012);
    foam.rotation.y = angle;
    g.add(foam);
  }

  // Heavy Metal Mounting Bar holding mic capsule in center
  addBox(g, 0.015, 0.015, 0.16, sl, 0, shieldY - 0.14, 0.05, { metalness: 0.8 });

  // Large-Diaphragm Studio Condenser Mic in Center
  const micY = shieldY;
  // Shockmount basket ring
  addCyl(g, 0.035, 0.035, 0.015, bk, 0, micY - 0.04, 0.08, 18, { metalness: 0.5 });
  // Gold-sputtered mic body
  addCyl(g, 0.022, 0.022, 0.09, bk, 0, micY, 0.08, 18, { metalness: 0.4 });
  // Gold mesh grille
  addCyl(g, 0.02, 0.02, 0.05, gold, 0, micY + 0.05, 0.08, 18, { metalness: 0.8, roughness: 0.3 });

  // Articulated Gooseneck Dual-layer Pop Filter
  addStrut(g, -0.04, micY - 0.12, 0.08, -0.05, micY + 0.02, 0.15, 0.005, bk, { metalness: 0.5 });
  // Circular Pop Filter Ring
  const popRing = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.006, 24), makeMat(bk, 0.5, 0.4));
  popRing.position.set(-0.02, micY + 0.04, 0.15);
  popRing.rotation.x = Math.PI / 2;
  g.add(popRing);
  // Nylon Mesh Filter
  const popMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.044, 24),
    new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.6, roughness: 0.9 })
  );
  popMesh.position.set(-0.02, micY + 0.04, 0.15);
  g.add(popMesh);

  return g;
}

function createKeyboardSynthModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x1a1816, sl = 0x888888, ivory = 0xf5f3ea, ebony = 0x111111;
  const standH = 0.72;
  const w = 0.92, d = 0.32, h = 0.09;

  // Dual-X Tubular Steel Keyboard Stand
  const legRadius = 0.012;
  // Front X
  addStrut(g, -w * 0.32, 0.015, -0.12, w * 0.32, standH, -0.12, legRadius, bk, { metalness: 0.6 });
  addStrut(g, w * 0.32, 0.015, -0.12, -w * 0.32, standH, -0.12, legRadius, bk, { metalness: 0.6 });
  // Rear X
  addStrut(g, -w * 0.32, 0.015, 0.12, w * 0.32, standH, 0.12, legRadius, bk, { metalness: 0.6 });
  addStrut(g, w * 0.32, 0.015, 0.12, -w * 0.32, standH, 0.12, legRadius, bk, { metalness: 0.6 });
  // Center pivot bolt
  addCyl(g, 0.016, 0.016, 0.28, sl, 0, standH * 0.5, 0, 12, { rx: Math.PI / 2, metalness: 0.8 });

  // Top & Bottom Horizontal Support Tubes with rubber endcaps
  [-w * 0.34, w * 0.34].forEach((tx) => {
    addStrut(g, tx, standH, -0.16, tx, standH, 0.16, 0.014, bk, { metalness: 0.5 });
    addStrut(g, tx, 0.015, -0.16, tx, 0.015, 0.16, 0.014, bk, { metalness: 0.5 });
  });

  // Synthesizer Main Chassis
  const synthY = standH + h / 2 + 0.01;
  addBox(g, w, h, d, bk, 0, synthY, 0, { roughness: 0.45, metalness: 0.3 });

  // Side Wooden / Metallic Cheek Panels
  [-w / 2 + 0.01, w / 2 - 0.01].forEach((cx) => {
    addBox(g, 0.018, h + 0.005, d + 0.005, 0x4a2a18, cx, synthY, 0, { roughness: 0.7 });
  });

  // Top Control Panel Section (Angled back half)
  const ctrlZ = -d * 0.18;
  addBox(g, w - 0.06, 0.01, d * 0.45, 0x22201d, 0, synthY + h / 2 + 0.004, ctrlZ, { metalness: 0.4 });

  // Backlit Blue LCD Screen
  addBox(g, 0.14, 0.004, 0.05, 0x112233, -0.05, synthY + h / 2 + 0.01, ctrlZ, {
    emissive: 0x3388ff,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  // Rotary encoder knobs and buttons
  for (let k = 0; k < 6; k++) {
    const kx = 0.08 + k * 0.045;
    addCyl(g, 0.01, 0.01, 0.012, 0x333333, kx, synthY + h / 2 + 0.012, ctrlZ - 0.01, 14, { metalness: 0.7 });
    addCyl(g, 0.003, 0.003, 0.014, 0x88bbff, kx, synthY + h / 2 + 0.013, ctrlZ - 0.01, 6, { emissive: 0x88bbff, emissiveIntensity: 0.6 });
  }

  // Pitch Bend and Modulation Wheels on Left Cheek
  const wheelX = -w * 0.42, wheelZ = d * 0.15;
  addBox(g, 0.014, 0.03, 0.04, 0x333333, wheelX - 0.015, synthY + h / 2 + 0.008, wheelZ, { roughness: 0.8 });
  addBox(g, 0.014, 0.03, 0.04, 0x333333, wheelX + 0.015, synthY + h / 2 + 0.008, wheelZ, { roughness: 0.8 });

  // 61-Key Keyboard Bed (Front half of synth)
  const keyBedW = w * 0.78;
  const keyBedZ = d * 0.18;
  const numWhiteKeys = 36;
  const keyW = keyBedW / numWhiteKeys;

  // White Natural Keys
  for (let wk = 0; wk < numWhiteKeys; wk++) {
    const kx = -keyBedW / 2 + wk * keyW + keyW / 2 + 0.03;
    addBox(g, keyW - 0.0015, 0.012, d * 0.42, ivory, kx, synthY + h / 2 + 0.006, keyBedZ, { roughness: 0.35 });
  }

  // Black Sharp/Flat Keys
  for (let bkIdx = 0; bkIdx < numWhiteKeys - 1; bkIdx++) {
    const octaveStep = bkIdx % 7;
    // Only place black keys between C-D, D-E, F-G, G-A, A-B (skip indices 2 and 6)
    if (octaveStep !== 2 && octaveStep !== 6) {
      const kx = -keyBedW / 2 + (bkIdx + 1) * keyW + 0.03;
      addBox(g, keyW * 0.6, 0.018, d * 0.26, ebony, kx, synthY + h / 2 + 0.012, keyBedZ - d * 0.08, {
        roughness: 0.4,
        metalness: 0.2,
      });
    }
  }

  return g;
}

// ------------------------------------------------------------
// DJ Controller / Mixer Console Model
// ------------------------------------------------------------
function createDjDeckModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.72, d = 0.38, h = 0.055;
  const chassis = 0x181716, metal = 0x2e2c2a, cyanGlow = 0x00f0ff, orangeGlow = 0xff5500;

  // Main console chassis
  addBox(g, w, h, d, chassis, 0, h / 2, 0, { roughness: 0.5, metalness: 0.4 });
  // Brushed aluminum top faceplate
  addBox(g, w * 0.98, 0.005, d * 0.96, metal, 0, h + 0.002, 0, { roughness: 0.3, metalness: 0.7 });

  // Center mixer channel section
  const mixerW = 0.22;
  addBox(g, mixerW, 0.008, d * 0.88, 0x121110, 0, h + 0.004, 0, { roughness: 0.6 });

  // Crossfader and channel faders
  addBox(g, 0.08, 0.012, 0.015, 0xffffff, 0, h + 0.012, d * 0.28, { roughness: 0.2 }); // Crossfader
  for (let ch = -1.5; ch <= 1.5; ch += 1) {
    const fx = ch * 0.045;
    addBox(g, 0.008, 0.012, 0.025, 0xdddddd, fx, h + 0.012, d * 0.08, { roughness: 0.2 });
    // VU meter LEDs
    for (let vu = 0; vu < 5; vu++) {
      const vcol = vu === 4 ? 0xff2222 : vu >= 3 ? 0xffaa00 : 0x00ff66;
      addBox(g, 0.004, 0.003, 0.008, vcol, fx, h + 0.008, -d * 0.15 + vu * 0.012, { emissive: vcol, emissiveIntensity: 0.8 });
    }
  }

  // Dual Large Jog Wheels (Left Deck A & Right Deck B)
  const deckOffsetX = w * 0.28;
  [-deckOffsetX, deckOffsetX].forEach((dx, idx) => {
    // Outer platter ring
    addCyl(g, 0.11, 0.11, 0.012, 0x222222, dx, h + 0.008, -0.02, 28, { metalness: 0.6, roughness: 0.4 });
    // Touch sensitive capacitive top with glow ring
    const glowCol = idx === 0 ? cyanGlow : orangeGlow;
    addCyl(g, 0.095, 0.095, 0.016, 0x0a0a0a, dx, h + 0.01, -0.02, 28, { metalness: 0.8, roughness: 0.2 });
    addCyl(g, 0.097, 0.097, 0.004, glowCol, dx, h + 0.012, -0.02, 28, { emissive: glowCol, emissiveIntensity: 0.9 });
    // Center display ring
    addCyl(g, 0.035, 0.035, 0.018, 0x151515, dx, h + 0.013, -0.02, 20, { metalness: 0.5 });
    addCyl(g, 0.012, 0.012, 0.02, glowCol, dx, h + 0.014, -0.02, 12, { emissive: glowCol, emissiveIntensity: 0.8 });

    // 8 Performance RGB Pads under each jog wheel
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const px = dx - 0.065 + c * 0.043;
        const pz = 0.11 + r * 0.042;
        const padCol = (r + c) % 2 === 0 ? 0x00ffff : 0xff00ff;
        addBox(g, 0.036, 0.008, 0.036, padCol, px, h + 0.007, pz, { emissive: padCol, emissiveIntensity: 0.7, roughness: 0.5 });
      }
    }
  });

  return g;
}

// ------------------------------------------------------------
// Hollywood Illuminated Vanity Mirror Model
// ------------------------------------------------------------
function createBeautyMirrorModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.85, h = 0.75, d = 0.22;
  const frameCol = 0xf5f3ee, mirrorCol = 0xdde5ee, bulbCol = 0xfff3db;

  // Heavy weighted desk base
  addBox(g, w * 0.8, 0.025, d, frameCol, 0, 0.012, 0, { roughness: 0.3, metalness: 0.2 });

  // Upright mirror frame
  const frameY = 0.025 + h / 2;
  addBox(g, w, h, 0.04, frameCol, 0, frameY, 0, { roughness: 0.3, metalness: 0.2 });

  // Ultra-reflective mirror glass pane in center
  addBox(g, w * 0.82, h * 0.82, 0.008, mirrorCol, 0, frameY, 0.022, { roughness: 0.05, metalness: 0.95 });

  // 12 Spherical frosted globe bulbs around border
  const bulbRadius = 0.024;
  const xOffset = w * 0.44;
  const yOffset = h * 0.44;

  // Top & bottom bulbs
  for (let i = -2; i <= 2; i++) {
    const bx = (i / 2) * (w * 0.38);
    // Top row
    addSphere(g, bulbRadius, bulbCol, bx, frameY + yOffset, 0.032, 14, { emissive: bulbCol, emissiveIntensity: 0.85 });
    // Bottom row (skip center for touch button)
    if (i !== 0) {
      addSphere(g, bulbRadius, bulbCol, bx, frameY - yOffset, 0.032, 14, { emissive: bulbCol, emissiveIntensity: 0.85 });
    }
  }

  // Side bulbs
  for (let i = -1; i <= 1; i++) {
    const by = frameY + i * (h * 0.26);
    addSphere(g, bulbRadius, bulbCol, -xOffset, by, 0.032, 14, { emissive: bulbCol, emissiveIntensity: 0.85 });
    addSphere(g, bulbRadius, bulbCol, xOffset, by, 0.032, 14, { emissive: bulbCol, emissiveIntensity: 0.85 });
  }

  // Touch power icon on bottom center
  addCyl(g, 0.012, 0.012, 0.004, 0x88ccff, 0, frameY - yOffset, 0.028, 12, { emissive: 0x88ccff, emissiveIntensity: 0.7 });

  return g;
}

// ------------------------------------------------------------
// Directional Shotgun Microphone with Boom Pole Model
// ------------------------------------------------------------
function createShotgunMicModel(): THREE.Group {
  const g = new THREE.Group();
  const metal = 0x282624, rubber = 0x151413, windscreen = 0x3d3a36;

  // C-Stand Tripod Base
  const baseRadius = 0.35;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const legLen = baseRadius;
    const lx = Math.cos(a) * (legLen / 2);
    const lz = Math.sin(a) * (legLen / 2);
    addBox(g, 0.024, 0.018, legLen, metal, lx, 0.02, lz, { ry: -a + Math.PI / 2, roughness: 0.4, metalness: 0.8 });
  }

  // Vertical Telescoping Riser
  const standH = 1.7;
  addCyl(g, 0.022, 0.022, standH, metal, 0, standH / 2, 0, 14, { metalness: 0.85, roughness: 0.3 });

  // Grip Head Knuckles
  addCyl(g, 0.04, 0.04, 0.06, rubber, 0, standH, 0, 14, { metalness: 0.4 });

  // Extended Boom Arm
  const armLen = 0.95;
  const armAngle = -0.3; // Angled forward down towards subject
  const armZ = 0.35;
  const armY = standH + 0.15;
  addCyl(g, 0.014, 0.014, armLen, metal, 0, armY, armZ, 12, { rx: armAngle, metalness: 0.85, roughness: 0.3 });

  // Counterweight on back of boom
  addCyl(g, 0.05, 0.05, 0.12, 0x111111, 0, armY + 0.12, -0.32, 16, { metalness: 0.3 });

  // Shockmount basket & Pistol Grip at tip
  const micZ = armZ + 0.42;
  const micY = armY - 0.14;
  addCyl(g, 0.028, 0.028, 0.14, rubber, 0, micY, micZ, 12, { rx: Math.PI / 2, metalness: 0.2 });

  // Long Shotgun Capsule with Furry Blimp / Deadcat Windscreen
  addCyl(g, 0.038, 0.038, 0.28, windscreen, 0, micY, micZ + 0.08, 16, { rx: Math.PI / 2, roughness: 0.95 });
  addSphere(g, 0.038, windscreen, 0, micY, micZ + 0.22, 14, { roughness: 0.95 });

  return g;
}

// ------------------------------------------------------------
// 4-Ch Video Switcher Console Model (ATEM Mini Style)
// ------------------------------------------------------------
function createMultiCamSwitcherModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.32, d = 0.18, h = 0.045;
  const chassis = 0x22201e, topMat = 0x161514;

  // Angled wedge desktop console
  addBox(g, w, h, d, chassis, 0, h / 2, 0, { roughness: 0.6, metalness: 0.3 });
  addBox(g, w * 0.96, 0.004, d * 0.94, topMat, 0, h + 0.002, 0, { roughness: 0.4, metalness: 0.6 });

  // 4 Large Camera Input Program & Preview Buttons (Numbered 1-4)
  for (let ch = 0; ch < 4; ch++) {
    const bx = -w * 0.35 + ch * 0.055;
    // Top preview row (Green backlit)
    const prevCol = ch === 1 ? 0x00ff44 : 0x444444;
    addBox(g, 0.04, 0.008, 0.03, prevCol, bx, h + 0.007, -d * 0.18, { emissive: prevCol, emissiveIntensity: ch === 1 ? 0.8 : 0.2 });
    // Bottom live program row (Red backlit)
    const progCol = ch === 0 ? 0xff2222 : 0x444444;
    addBox(g, 0.04, 0.008, 0.03, progCol, bx, h + 0.007, d * 0.15, { emissive: progCol, emissiveIntensity: ch === 0 ? 0.8 : 0.2 });
  }

  // T-Bar Transition Lever on Right Side
  const tbarX = w * 0.32;
  addBox(g, 0.01, 0.004, d * 0.6, 0x111111, tbarX, h + 0.004, 0, { roughness: 0.7 });
  addCyl(g, 0.006, 0.006, 0.035, 0xaaaaaa, tbarX, h + 0.02, 0.02, 10, { metalness: 0.9 });
  addBox(g, 0.045, 0.012, 0.016, 0xdddddd, tbarX, h + 0.038, 0.02, { roughness: 0.2, metalness: 0.5 });

  // Cut & Auto Transition Buttons
  addBox(g, 0.038, 0.008, 0.028, 0xffaa00, w * 0.12, h + 0.007, -d * 0.18, { emissive: 0xffaa00, emissiveIntensity: 0.7 });
  addBox(g, 0.038, 0.008, 0.028, 0xff3300, w * 0.12, h + 0.007, d * 0.15, { emissive: 0xff3300, emissiveIntensity: 0.7 });

  return g;
}

// ------------------------------------------------------------
// Solid Black Cutter Flag on C-Stand Model
// ------------------------------------------------------------
function createCStandFlagModel(): THREE.Group {
  const g = new THREE.Group();
  const chrome = 0x333333, flagCloth = 0x0f0f0f;

  // Heavy turtle base with 3 stepped legs
  const baseR = 0.38;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const lx = Math.cos(a) * (baseR / 2);
    const lz = Math.sin(a) * (baseR / 2);
    addBox(g, 0.025, 0.025, baseR, chrome, lx, 0.03 + i * 0.012, lz, { ry: -a + Math.PI / 2, metalness: 0.9, roughness: 0.2 });
  }

  // 40" C-Stand Riser Pole
  const riserH = 1.6;
  addCyl(g, 0.022, 0.022, riserH, chrome, 0, riserH / 2, 0, 14, { metalness: 0.9, roughness: 0.2 });

  // 2.5" Grip Head Knuckle
  addCyl(g, 0.045, 0.045, 0.07, 0x222222, 0, riserH, 0, 14, { metalness: 0.6 });

  // 40" Extension Grip Arm
  const armLen = 0.75;
  addCyl(g, 0.012, 0.012, armLen, chrome, 0.25, riserH + 0.1, 0, 12, { rz: Math.PI / 2, metalness: 0.9 });

  // Black Duvetyne Rectangular Flag (24" x 36")
  const flagW = 0.75, flagH = 0.55;
  const flagX = 0.55, flagY = riserH + 0.1;
  // Stainless steel wire perimeter frame
  addBox(g, flagW, 0.012, 0.012, chrome, flagX, flagY + flagH / 2, 0, { metalness: 0.9 });
  addBox(g, flagW, 0.012, 0.012, chrome, flagX, flagY - flagH / 2, 0, { metalness: 0.9 });
  addBox(g, 0.012, flagH, 0.012, chrome, flagX - flagW / 2, flagY, 0, { metalness: 0.9 });
  addBox(g, 0.012, flagH, 0.012, chrome, flagX + flagW / 2, flagY, 0, { metalness: 0.9 });
  // Heavy solid black fabric panel
  addBox(g, flagW - 0.01, flagH - 0.01, 0.005, flagCloth, flagX, flagY, 0, { roughness: 0.98, metalness: 0 });

  return g;
}

// ------------------------------------------------------------
// Atmospheric Stage Haze Machine Model
// ------------------------------------------------------------
function createFogMachineModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 0.42, d = 0.28, h = 0.24;
  const chassis = 0x282624, steel = 0x444444;

  // Main metal body casing
  addBox(g, w, h, d, chassis, 0, h / 2 + 0.015, 0, { roughness: 0.5, metalness: 0.5 });
  // 4 Rubber foot pegs
  [-w * 0.42, w * 0.42].forEach((fx) => {
    [-d * 0.42, d * 0.42].forEach((fz) => {
      addCyl(g, 0.018, 0.018, 0.015, 0x111111, fx, 0.0075, fz, 10);
    });
  });

  // Carrying Top Handle
  const handleY = h + 0.05;
  addBox(g, w * 0.5, 0.015, 0.02, steel, 0, handleY, 0, { metalness: 0.8 });
  addBox(g, 0.015, 0.04, 0.02, steel, -w * 0.24, handleY - 0.02, 0, { metalness: 0.8 });
  addBox(g, 0.015, 0.04, 0.02, steel, w * 0.24, handleY - 0.02, 0, { metalness: 0.8 });

  // Brass Fog Output Nozzle in Front
  addCyl(g, 0.03, 0.02, 0.04, 0xcc9933, 0, h * 0.55, d / 2 + 0.015, 16, { rx: Math.PI / 2, metalness: 0.8 });

  // Translucent Fluid Tank Window on Top
  addBox(g, w * 0.28, 0.008, d * 0.35, 0x55aaee, -w * 0.25, h + 0.018, 0, { emissive: 0x2266aa, emissiveIntensity: 0.6, roughness: 0.2 });

  // LED Ready Indicator on Rear Panel
  addCyl(g, 0.008, 0.008, 0.005, 0x00ff44, w * 0.32, h * 0.7, -d / 2 - 0.002, 10, { rx: Math.PI / 2, emissive: 0x00ff44, emissiveIntensity: 0.9 });

  return g;
}

// ------------------------------------------------------------
// Smartphone on Desk Mini Tripod with Rear Inspection Mirror
// Allows using high-quality 4K rear cameras while checking framing!
// ------------------------------------------------------------
function createPhoneTripodMirrorModel(): THREE.Group {
  const g = new THREE.Group();
  const matBlack = 0x18181b, chrome = 0x71717a, phoneBody = 0x09090b, lensCol = 0x0284c7, mirrorGlass = 0xe0f2fe;

  // Mini foldable desktop tripod base (3 legs)
  const legLen = 0.12;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const lx = Math.cos(a) * (legLen / 2);
    const lz = Math.sin(a) * (legLen / 2);
    addBox(g, 0.012, 0.008, legLen, matBlack, lx, 0.005, lz, { ry: -a + Math.PI / 2, metalness: 0.6 });
  }

  // Center column riser
  const poleH = 0.16;
  addCyl(g, 0.01, 0.01, poleH, chrome, 0, poleH / 2, 0, 12, { metalness: 0.8 });

  // Ball head mount
  addSphere(g, 0.016, chrome, 0, poleH, 0, 12, { metalness: 0.8 });

  // Smartphone Clamp & Phone body (portrait/landscape mount)
  const phoneH = 0.15, phoneW = 0.075, phoneD = 0.009;
  const phoneY = poleH + phoneH / 2 + 0.02;
  addBox(g, phoneW, phoneH, phoneD, phoneBody, 0, phoneY, 0, { roughness: 0.2, metalness: 0.8 });

  // Triple Rear Camera Island (facing forward towards creator)
  addBox(g, 0.028, 0.032, 0.003, 0x18181b, -phoneW / 2 + 0.018, phoneY + phoneH / 2 - 0.02, 0.005, { metalness: 0.7 });
  // 3 lenses
  addCyl(g, 0.006, 0.006, 0.004, lensCol, -phoneW / 2 + 0.018, phoneY + phoneH / 2 - 0.014, 0.006, 12, { rx: Math.PI / 2, emissive: 0x0284c7, emissiveIntensity: 0.5 });
  addCyl(g, 0.006, 0.006, 0.004, lensCol, -phoneW / 2 + 0.018, phoneY + phoneH / 2 - 0.026, 0.006, 12, { rx: Math.PI / 2, emissive: 0x0284c7, emissiveIntensity: 0.5 });
  addCyl(g, 0.006, 0.006, 0.004, lensCol, -phoneW / 2 + 0.028, phoneY + phoneH / 2 - 0.02, 0.006, 12, { rx: Math.PI / 2, emissive: 0x0284c7, emissiveIntensity: 0.5 });

  // Angled Rear Viewfinder Mirror (angled at 45 deg behind the phone so talent can see the screen)
  const mirrorW = 0.08, mirrorH = 0.06;
  const mirrorY = phoneY + 0.02;
  addBox(g, mirrorW, mirrorH, 0.004, mirrorGlass, 0, mirrorY, -0.04, { rx: -0.55, metalness: 0.95, roughness: 0.05 });
  // Mirror clip bracket
  addBox(g, 0.008, 0.06, 0.035, matBlack, 0, mirrorY - 0.02, -0.02, { metalness: 0.5 });

  return g;
}

// ------------------------------------------------------------
// DIY Desk Clamp Gooseneck Lamp with Parchment Diffuser
// ------------------------------------------------------------
function createClampDeskLampModel(): THREE.Group {
  const g = new THREE.Group();
  const metal = 0x27272a, silver = 0xa1a1aa, diffuser = 0xfef08a;

  // Heavy C-Clamp base for table edge
  addBox(g, 0.045, 0.05, 0.04, metal, 0, 0.025, 0, { metalness: 0.7, roughness: 0.4 });
  // Clamp tightening screw knob underneath
  addCyl(g, 0.008, 0.008, 0.03, silver, 0, -0.015, 0, 10, { metalness: 0.9 });

  // Flexible metal gooseneck arm (ribbed curve)
  const armH = 0.28;
  addCyl(g, 0.009, 0.009, armH, silver, 0.04, armH / 2 + 0.03, 0.04, 12, { rz: -0.2, rx: 0.2, metalness: 0.85 });

  // Lamp Bell Hood / Shade
  const hoodX = 0.08, hoodY = armH + 0.06, hoodZ = 0.08;
  addCyl(g, 0.045, 0.025, 0.07, metal, hoodX, hoodY, hoodZ, 16, { rx: 0.6, metalness: 0.6 });

  // Parchment / Baking Paper DIY Diffuser Sheet taped on front
  addBox(g, 0.09, 0.09, 0.002, diffuser, hoodX + 0.01, hoodY - 0.02, hoodZ + 0.03, {
    rx: 0.6,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.85,
    roughness: 0.9,
  });

  return g;
}

// ------------------------------------------------------------
// Plug & Play Smartphone Wireless Lapel Microphone & Receiver
// ------------------------------------------------------------
function createBudgetWirelessLavModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x0f172a, meshCol = 0x334155;

  // Tiny Transmitter Clip with Foam Windscreen
  addBox(g, 0.022, 0.038, 0.014, bk, -0.02, 0.019, 0, { roughness: 0.4 });
  // Lapel Spring Clip on back
  addBox(g, 0.008, 0.03, 0.005, 0x1e293b, -0.02, 0.019, -0.009, { metalness: 0.8 });
  // Top foam mic capsule
  addSphere(g, 0.009, meshCol, -0.02, 0.042, 0, 10, { roughness: 0.95 });
  // Green active pairing status LED
  addBox(g, 0.003, 0.003, 0.002, 0x22c55e, -0.02, 0.025, 0.008, { emissive: 0x22c55e, emissiveIntensity: 0.9 });

  // Direct Phone Receiver Dongle (Lighting / USB-C)
  addBox(g, 0.032, 0.014, 0.008, bk, 0.03, 0.007, 0, { roughness: 0.4 });
  // Metal connector pin
  addBox(g, 0.008, 0.006, 0.002, 0x94a3b8, 0.03, 0.017, 0, { metalness: 0.9 });

  return g;
}

// ------------------------------------------------------------
// Double Bed Furniture (Owned Home Asset & Natural Acoustic Absorption)
// ------------------------------------------------------------
function createBedFurnitureModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 1.4, d = 2.0, h = 0.55;
  const wood = 0x473322, mattress = 0xf1f5f9, duvet = 0x334155, pillowCol = 0xffffff;

  // Wooden Bed Frame & 4 corner legs
  addBox(g, w, 0.12, d, wood, 0, 0.2, 0, { roughness: 0.7 });
  [-w / 2 + 0.04, w / 2 - 0.04].forEach((lx) => {
    [-d / 2 + 0.04, d / 2 - 0.04].forEach((lz) => {
      addBox(g, 0.07, 0.2, 0.07, wood, lx, 0.1, lz, { roughness: 0.7 });
    });
  });

  // Tall Wooden Headboard at Z -d/2
  const headboardH = 0.95;
  addBox(g, w + 0.04, headboardH, 0.06, wood, 0, headboardH / 2, -d / 2 + 0.03, { roughness: 0.6 });

  // Thick Foam Mattress
  addBox(g, w - 0.04, 0.22, d - 0.06, mattress, 0, 0.35, 0.01, { roughness: 0.9 });

  // Cozy Duvet / Bedspread (covers 70% of bed)
  addBox(g, w - 0.02, 0.14, d * 0.7, duvet, 0, 0.42, 0.25, { roughness: 0.85 });

  // 2 Fluffy Pillows against headboard
  [-0.32, 0.32].forEach((px) => {
    addBox(g, 0.5, 0.1, 0.35, pillowCol, px, 0.48, -d / 2 + 0.26, { rx: 0.2, roughness: 0.95 });
  });

  return g;
}

// ------------------------------------------------------------
// Bedroom Wardrobe / Closet Cabinet (Owned Home Furniture)
// ------------------------------------------------------------
function createClosetWardrobeModel(): THREE.Group {
  const g = new THREE.Group();
  const w = 1.0, d = 0.6, h = 1.9;
  const body = 0x334155, handle = 0xe2e8f0;

  // Main cabinet box
  addBox(g, w, h, d, body, 0, h / 2, 0, { roughness: 0.6, metalness: 0.1 });

  // Dual closet doors seam
  addBox(g, 0.004, h - 0.08, d + 0.002, 0x1e293b, 0, h / 2, 0);

  // Modern vertical bar handles
  [-0.04, 0.04].forEach((hx) => {
    addCyl(g, 0.008, 0.008, 0.32, handle, hx, h * 0.52, d / 2 + 0.018, 10, { metalness: 0.9 });
  });

  // Base plinth
  addBox(g, w, 0.06, d, 0x1e293b, 0, 0.03, 0);

  return g;
}