import * as THREE from 'three';
import type { EquipmentDefinition, EquipmentId } from './types';

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
};

export const EQUIPMENT_IDS: EquipmentId[] = [
  'camera', 'phone-gimbal', 'ring-light', 'camera-slider', 'webcam', 'drone', 'led-light', 'softbox', 'fresnel', 'rgb-tube', 'desk-lamp', 'beauty-dish', 'microphone', 'lavalier', 'audio-recorder', 'studio-monitor', 'podcast-mic', 'acoustic-panel', 'tripod', 'content-table', 'chair', 'sofa', 'product-stand', 'backdrop', 'shelf-props', 'power-station', 'generator', 'power-strip', 'green-screen', 'teleprompter',
];

// ============================================================
// 3D Model Factory Functions
// Each returns a THREE.Group positioned at origin (y=0)
// ============================================================

export function createEquipmentModel(equipmentId: EquipmentId): THREE.Group {
  switch (equipmentId) {

    case 'camera': return createCameraModel();
    case 'phone-gimbal': return createPhoneGimbalModel();
    case 'ring-light': return createRingLightModel();
    case 'camera-slider': return createCameraSliderModel();
    case 'webcam': return createWebcamModel();
    case 'drone': return createDroneModel();
    case 'led-light': return createLedLightModel();
    case 'softbox': return createSoftboxModel();
    case 'fresnel': return createFresnelModel();
    case 'rgb-tube': return createRgbTubeModel();
    case 'desk-lamp': return createDeskLampModel();
    case 'beauty-dish': return createBeautyDishModel();
    case 'microphone': return createMicrophoneModel();
    case 'lavalier': return createLavalierModel();
    case 'audio-recorder': return createAudioRecorderModel();
    case 'studio-monitor': return createStudioMonitorModel();
    case 'podcast-mic': return createPodcastMicModel();
    case 'acoustic-panel': return createAcousticPanelModel();
    case 'tripod': return createTripodModel();
    case 'content-table': return createContentTableModel();
    case 'chair': return createChairModel();
    case 'sofa': return createSofaModel();
    case 'product-stand': return createProductStandModel();
    case 'backdrop': return createBackdropModel();
    case 'shelf-props': return createShelfPropsModel();
    case 'power-station': return createPowerStationModel();
    case 'generator': return createGeneratorModel();
    case 'power-strip': return createPowerStripModel();
    case 'green-screen': return createGreenScreenModel();
    case 'teleprompter': return createTeleprompterModel();
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
// ================================================================
// BATCH 1 — Camera & Support (6 models)
// ================================================================

function createCameraModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x2a2826, gy = 0x4a4744, sl = 0x888888;
  // --- Tripod ---
  addCyl(g, 0.012, 0.016, 1.1, gy, 0, 0.55, 0, 20, { metalness: 0.5, roughness: 0.4 });
  addCyl(g, 0.03, 0.025, 0.05, gy, 0, 1.12, 0, 20, { metalness: 0.5, roughness: 0.4 });
  addBox(g, 0.05, 0.015, 0.04, dk, 0, 1.1, 0, { metalness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(a), cz = Math.sin(a);
    addCyl(g, 0.008, 0.01, 0.65, gy, cx * 0.12, 0.42, cz * 0.12, 12, { metalness: 0.5, roughness: 0.4, rz: cx * 0.32, rx: cz * 0.32 });
    addCyl(g, 0.006, 0.008, 0.6, gy, cx * 0.25, 0.12, cz * 0.25, 12, { metalness: 0.5, roughness: 0.4, rz: cx * 0.32, rx: cz * 0.32 });
    addSphere(g, 0.012, 0x1a1a1a, cx * 0.32, 0.01, cz * 0.32, 12);
  }
  addCyl(g, 0.12, 0.12, 0.008, dk, 0, 0.15, 0, 3);
  // --- Camera body ---
  const camY = 1.18;
  addBox(g, 0.14, 0.095, 0.1, dk, 0, camY, 0, { metalness: 0.3, roughness: 0.4 });
  addBox(g, 0.035, 0.1, 0.07, 0x1f1f1f, 0.085, camY + 0.005, 0, { roughness: 0.9 });
  addCyl(g, 0.022, 0.035, 0.09, 0x1a1a1a, 0, camY, 0.095, 16, { rx: Math.PI / 2, metalness: 0.5, roughness: 0.3 });
  addCyl(g, 0.036, 0.036, 0.012, dk, 0, camY, 0.14, 16, { rx: Math.PI / 2, metalness: 0.4 });
  addCyl(g, 0.02, 0.02, 0.003, 0x334455, 0, camY, 0.145, 16, { rx: Math.PI / 2, roughness: 0.1, metalness: 0.2 });
  addBox(g, 0.04, 0.035, 0.035, dk, -0.02, camY + 0.06, -0.035, { metalness: 0.3 });
  addCyl(g, 0.015, 0.015, 0.012, dk, -0.045, camY + 0.055, 0, 12, { metalness: 0.4 });
  addBox(g, 0.03, 0.008, 0.02, sl, 0, camY + 0.052, 0, { metalness: 0.6, roughness: 0.2 });
  addBox(g, 0.09, 0.058, 0.004, 0x1a2a3a, 0, camY + 0.01, -0.053, { roughness: 0.15, metalness: 0.3 });
  addSphere(g, 0.005, 0xcc3333, 0.055, camY + 0.04, 0.052, 12, { emissive: 0xcc3333, emissiveIntensity: 0.8 });
  return g;
}

function createPhoneGimbalModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, dk = 0x1a1a1a;
  addBox(g, 0.035, 0.18, 0.035, 0x1a1a1a, 0, 0.09, 0, { roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.036, 0.003, 0.036, 0x333333, 0, 0.04 + i * 0.03, 0, { roughness: 0.95, castShadow: false });
  }
  addBox(g, 0.015, 0.008, 0.01, 0x555555, 0.018, 0.12, 0, { metalness: 0.3 });
  addCyl(g, 0.018, 0.018, 0.04, dk, 0, 0.2, 0, 12, { metalness: 0.5, roughness: 0.3 });
  addBox(g, 0.015, 0.08, 0.015, dk, 0, 0.26, 0, { metalness: 0.4 });
  addCyl(g, 0.016, 0.016, 0.03, dk, 0, 0.31, 0, 12, { rx: Math.PI / 2, metalness: 0.5, roughness: 0.3 });
  addBox(g, 0.06, 0.012, 0.015, dk, 0, 0.31, 0, { metalness: 0.4 });
  addCyl(g, 0.016, 0.016, 0.025, dk, 0.032, 0.31, 0, 12, { metalness: 0.5, roughness: 0.3 });
  addBox(g, 0.008, 0.1, 0.04, dk, 0.065, 0.31, 0, { metalness: 0.4 });
  addBox(g, 0.008, 0.1, 0.04, dk, -0.065, 0.31, 0, { metalness: 0.4 });
  addBox(g, 0.12, 0.065, 0.008, 0x0a0a0a, 0, 0.31, 0);
  addBox(g, 0.11, 0.058, 0.002, 0x223344, 0, 0.313, 0.005, { roughness: 0.1, metalness: 0.2 });
  addBox(g, 0.025, 0.025, 0.005, dk, -0.035, 0.32, -0.006, { metalness: 0.3 });
  addCyl(g, 0.008, 0.008, 0.006, 0x222233, -0.035, 0.32, -0.009, 20, { roughness: 0.1, metalness: 0.3 });
  return g;
}

function createRingLightModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, gy = 0x4a4744;
  addCyl(g, 0.02, 0.025, 1.5, gy, 0, 0.75, 0, 20, { metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cx = Math.cos(a) * 0.22, cz = Math.sin(a) * 0.22;
    addCyl(g, 0.007, 0.009, 1.2, gy, cx, 0.35, cz, 12, { metalness: 0.5, roughness: 0.4, rz: cx * 0.35, rx: cz * 0.35 });
    addSphere(g, 0.01, 0x1a1a1a, Math.cos(a) * 0.3, 0.01, Math.sin(a) * 0.3, 20);
  }
  addCyl(g, 0.025, 0.02, 0.04, gy, 0, 1.52, 0, 20, { metalness: 0.5 });
  const ringMat = makeMat(bk, 0.4, 0.3);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 12, 32), ringMat);
  ring.position.set(0, 1.72, 0);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  g.add(ring);
  const diffMat = emissive(0xffffff, 0xfff0d0, 0.9, 0.2);
  const diff = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 12, 32), diffMat);
  diff.position.set(0, 1.72, 0);
  diff.rotation.x = Math.PI / 2;
  g.add(diff);
  addBox(g, 0.1, 0.005, 0.015, bk, 0, 1.5, 0, { metalness: 0.3 });
  addBox(g, 0.005, 0.14, 0.01, bk, 0.048, 1.57, 0, { metalness: 0.3 });
  addBox(g, 0.005, 0.14, 0.01, bk, -0.048, 1.57, 0, { metalness: 0.3 });
  addBox(g, 0.06, 0.035, 0.03, 0x333333, 0, 1.72, -0.22, { metalness: 0.3 });
  return g;
}

function createCameraSliderModel(): THREE.Group {
  const g = new THREE.Group();
  const sl = 0x888888, bk = 0x2a2826, gy = 0x4a4744;
  addBox(g, 0.8, 0.02, 0.02, 0x555555, 0, 0.1, 0.04, { metalness: 0.6, roughness: 0.3 });
  addBox(g, 0.8, 0.02, 0.02, 0x555555, 0, 0.1, -0.04, { metalness: 0.6, roughness: 0.3 });
  addBox(g, 0.01, 0.015, 0.08, gy, -0.35, 0.09, 0, { metalness: 0.5 });
  addBox(g, 0.01, 0.015, 0.08, gy, 0.35, 0.09, 0, { metalness: 0.5 });
  addBox(g, 0.1, 0.025, 0.1, sl, 0, 0.12, 0, { metalness: 0.5, roughness: 0.3 });
  addBox(g, 0.06, 0.01, 0.06, bk, 0, 0.14, 0, { metalness: 0.3 });
  addCyl(g, 0.006, 0.006, 0.015, sl, 0, 0.15, 0, 20, { metalness: 0.6 });
  addBox(g, 0.04, 0.04, 0.06, 0x333333, 0.38, 0.1, 0, { metalness: 0.3 });
  addCyl(g, 0.008, 0.008, 0.02, sl, 0.38, 0.1, 0.04, 20, { metalness: 0.5, rx: Math.PI / 2 });
  addBox(g, 0.75, 0.002, 0.005, 0x222222, 0, 0.115, 0, { castShadow: false });
  for (const xPos of [-0.35, 0.35]) {
    addCyl(g, 0.01, 0.012, 0.08, gy, xPos, 0.04, 0, 12, { metalness: 0.5, roughness: 0.4 });
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2;
      addCyl(g, 0.005, 0.005, 0.04, gy, xPos + Math.cos(a) * 0.03, 0.02, Math.sin(a) * 0.03, 8, { metalness: 0.5, rz: Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5 });
    }
  }
  return g;
}

function createWebcamModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826;
  addBox(g, 0.06, 0.12, 0.008, 0x222222, 0, 0.06, -0.005, { metalness: 0.3 });
  addBox(g, 0.07, 0.04, 0.045, bk, 0, 0.14, 0, { roughness: 0.5, metalness: 0.3 });
  addCyl(g, 0.012, 0.014, 0.015, 0x1a1a1a, 0, 0.14, 0.03, 12, { rx: Math.PI / 2, metalness: 0.5, roughness: 0.2 });
  addCyl(g, 0.008, 0x008, 0.003, 0x223344, 0, 0.14, 0.038, 20, { rx: Math.PI / 2, roughness: 0.1 });
  addSphere(g, 0.003, 0x44aa44, 0.03, 0.16, 0.023, 12, { emissive: 0x44aa44, emissiveIntensity: 0.9 });
  addBox(g, 0.03, 0.015, 0.025, 0x333333, 0, 0.115, 0, { metalness: 0.4 });
  addCyl(g, 0.004, 0.004, 0.05, 0x222222, -0.02, 0.1, -0.015, 12);
  addCyl(g, 0.004, 0.004, 0.04, 0x222222, -0.025, 0.06, -0.02, 12);
  return g;
}

function createDroneModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x3a3a3a, bk = 0x1a1a1a;
  addCyl(g, 0.22, 0.22, 0.005, 0x444444, 0, 0.0025, 0, 24, { roughness: 0.9 });
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.005, 12, 32), makeMat(0xffffff, 0.8));
  padRing.position.set(0, 0.006, 0);
  padRing.rotation.x = Math.PI / 2;
  g.add(padRing);
  addBox(g, 0.08, 0.025, 0.05, dk, 0, 0.035, 0, { metalness: 0.3, roughness: 0.5 });
  addSphere(g, 0.012, bk, 0.02, 0.022, 0, 20);
  addCyl(g, 0.008, 0.008, 0.015, 0x333333, 0.02, 0.025, 0, 12);
  const armAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
  for (const a of armAngles) {
    const cx = Math.cos(a), cz = Math.sin(a);
    addBox(g, 0.17, 0.012, 0.015, dk, cx * 0.1, 0.035, cz * 0.1, { rz: -cz * 0.02, rx: cx * 0.02, metalness: 0.3 });
    addCyl(g, 0.015, 0.015, 0.02, 0x444444, cx * 0.19, 0.045, cz * 0.19, 20, { metalness: 0.4 });
    addCyl(g, 0.06, 0.06, 0.002, 0x222222, cx * 0.19, 0.058, cz * 0.19, 16, { roughness: 0.9 });
  }
  addBox(g, 0.14, 0.005, 0.005, 0x333333, 0, 0.02, 0.03, { metalness: 0.4 });
  addBox(g, 0.14, 0.005, 0.005, 0x333333, 0, 0.02, -0.03, { metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    addSphere(g, 0.003, i < 3 ? 0x44cc44 : 0xcccc44, 0.04 + i * 0.012, 0.04, 0.026, 8, { emissive: i < 3 ? 0x44cc44 : 0xcccc44, emissiveIntensity: 0.7 });
  }
  return g;
}
// ================================================================
// BATCH 2 — Lighting (6 models)
// ================================================================

function createLedLightModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, gy = 0x4a4744;
  addCyl(g, 0.06, 0.06, 0.008, bk, 0, 0.004, 0, 16);
  addCyl(g, 0.012, 0.014, 0.2, gy, 0, 0.108, 0, 20, { metalness: 0.5, roughness: 0.4 });
  addSphere(g, 0.018, gy, 0, 0.22, 0, 20, { metalness: 0.5 });
  addBox(g, 0.32, 0.22, 0.018, bk, 0, 0.33, 0, { metalness: 0.3 });
  addBox(g, 0.29, 0.19, 0.005, 0xfff5e0, 0, 0.33, 0.012, { emissive: 0xffd5a0, emissiveIntensity: 0.8, roughness: 0.15 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      addSphere(g, 0.004, 0xfff8dd, -0.1 + c * 0.04, 0.39 - r * 0.045, 0.016, 8, { emissive: 0xfff0c0, emissiveIntensity: 0.5 });
    }
  }
  addCyl(g, 0.01, 0.01, 0.01, 0x555555, -0.08, 0.28, -0.012, 20, { rx: Math.PI / 2, metalness: 0.4 });
  addCyl(g, 0.01, 0.01, 0.01, 0x555555, 0.08, 0.28, -0.012, 20, { rx: Math.PI / 2, metalness: 0.4 });
  addBox(g, 0.08, 0.04, 0.015, 0x333333, 0, 0.26, -0.016, { metalness: 0.3 });
  return g;
}

function createSoftboxModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, gy = 0x4a4744;
  addCyl(g, 0.015, 0.02, 1.6, gy, 0, 0.8, 0, 20, { metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addCyl(g, 0.006, 0.008, 0.6, gy, Math.cos(a) * 0.12, 0.15, Math.sin(a) * 0.12, 12, { metalness: 0.5, roughness: 0.4, rz: Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 });
  }
  addCyl(g, 0.04, 0.04, 0.03, gy, 0, 1.62, 0, 12, { metalness: 0.5 });
  addBox(g, 0.6, 0.5, 0.14, bk, 0, 1.82, 0.03, { roughness: 0.85 });
  addBox(g, 0.56, 0.46, 0.003, 0xf0e8d8, 0, 1.82, -0.065, { roughness: 0.9, castShadow: false });
  addBox(g, 0.56, 0.46, 0.008, 0xfff8f0, 0, 1.82, 0.105, { emissive: 0xffe8c8, emissiveIntensity: 0.6, roughness: 0.9 });
  addBox(g, 0.4, 0.35, 0.004, 0xfff5ee, 0, 1.82, 0.07, { emissive: 0xffddbb, emissiveIntensity: 0.3, roughness: 0.95, castShadow: false });
  const corners = [[-0.27, -0.22], [0.27, -0.22], [-0.27, 0.22], [0.27, 0.22]];
  for (const [cx, cz] of corners) {
    addCyl(g, 0.004, 0.004, 0.55, gy, cx, 1.58, cz + 0.08, 8, { rz: cx > 0 ? -0.45 : 0.45, rx: 0.2, metalness: 0.5 });
  }
  return g;
}

function createFresnelModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, sl = 0x999999;
  addCyl(g, 0.15, 0.15, 0.015, bk, 0, 0.0075, 0, 16);
  addCyl(g, 0.018, 0.022, 1.4, bk, 0, 0.72, 0, 20, { metalness: 0.4, roughness: 0.5 });
  addBox(g, 0.35, 0.012, 0.012, bk, 0.18, 0.02, 0, { metalness: 0.4 });
  addCyl(g, 0.015, 0.015, 0.02, bk, 0.35, 0.03, 0, 20);
  addBox(g, 0.04, 0.2, 0.04, bk, -0.08, 1.45, 0, { metalness: 0.4 });
  addBox(g, 0.04, 0.2, 0.04, bk, 0.08, 1.45, 0, { metalness: 0.4 });
  addCyl(g, 0.012, 0.012, 0.2, sl, 0, 1.45, 0, 20, { rz: Math.PI / 2, metalness: 0.6 });
  addCyl(g, 0.1, 0.12, 0.15, bk, 0, 1.45, 0.04, 16, { rx: Math.PI / 2, metalness: 0.3, roughness: 0.6 });
  addCyl(g, 0.09, 0.09, 0.01, sl, 0, 1.45, 0.1, 16, { rx: Math.PI / 2, metalness: 0.7, roughness: 0.2, castShadow: false });
  addCyl(g, 0.085, 0.085, 0.005, 0xfffff0, 0, 1.45, 0.12, 16, { rx: Math.PI / 2, emissive: 0xffeebb, emissiveIntensity: 0.7, roughness: 0.1 });
  addBox(g, 0.2, 0.16, 0.004, 0x333333, 0, 1.45, 0.14, { metalness: 0.3 });
  addBox(g, 0.2, 0.16, 0.004, 0x333333, 0, 1.45, -0.06, { metalness: 0.3 });
  addBox(g, 0.004, 0.16, 0.2, 0x333333, 0.1, 1.45, 0.04, { metalness: 0.3 });
  addBox(g, 0.004, 0.16, 0.2, 0x333333, -0.1, 1.45, 0.04, { metalness: 0.3 });
  addSphere(g, 0.006, 0x555555, 0.1, 1.53, 0.14, 12, { metalness: 0.4 });
  addSphere(g, 0.006, 0x555555, -0.1, 1.53, 0.14, 12, { metalness: 0.4 });
  return g;
}

function createRgbTubeModel(): THREE.Group {
  const g = new THREE.Group();
  addCyl(g, 0.05, 0.05, 0.008, 0x2a2826, 0, 0.004, 0, 12);
  addCyl(g, 0.008, 0.01, 0.1, 0x4a4744, 0, 0.058, 0, 12, { metalness: 0.5, roughness: 0.4 });
  addBox(g, 0.025, 0.04, 0.025, 0x2a2826, 0, 0.12, 0, { metalness: 0.3 });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xff4488, emissive: 0xff4488, emissiveIntensity: 0.5, roughness: 0.3, transparent: true, opacity: 0.85,
  });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12, 16), tubeMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, 0.15, 0);
  tube.castShadow = true;
  g.add(tube);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xff66aa, emissiveIntensity: 0.8, roughness: 0.1, transparent: true, opacity: 0.4,
  });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.88, 20), innerMat);
  inner.rotation.z = Math.PI / 2;
  inner.position.set(0, 0.15, 0);
  g.add(inner);
  addCyl(g, 0.021, 0.021, 0.02, 0x1a1a1a, 0.46, 0.15, 0, 20, { rz: Math.PI / 2, metalness: 0.4 });
  addCyl(g, 0.021, 0.021, 0.02, 0x1a1a1a, -0.46, 0.15, 0, 20, { rz: Math.PI / 2, metalness: 0.4 });
  addSphere(g, 0.005, 0x4444ff, -0.44, 0.15, 0.015, 12, { emissive: 0x4444ff, emissiveIntensity: 0.6 });
  addSphere(g, 0.005, 0x44ff44, -0.44, 0.15, 0, 12, { emissive: 0x44ff44, emissiveIntensity: 0.6 });
  return g;
}

function createDeskLampModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826;
  addCyl(g, 0.07, 0.075, 0.015, bk, 0, 0.0075, 0, 16, { metalness: 0.4, roughness: 0.5 });
  addCyl(g, 0.012, 0.014, 0.04, bk, 0, 0.035, 0, 20, { metalness: 0.5 });
  addBox(g, 0.014, 0.15, 0.014, bk, 0, 0.13, 0, { rz: 0.15, metalness: 0.4 });
  addSphere(g, 0.016, 0x555555, 0, 0.21, 0, 20, { metalness: 0.5 });
  addBox(g, 0.012, 0.14, 0.012, bk, 0, 0.29, 0, { rz: -0.3, metalness: 0.4 });
  addSphere(g, 0.013, 0x555555, 0, 0.37, 0, 20, { metalness: 0.5 });
  const shadeGeo = new THREE.CylinderGeometry(0.06, 0.035, 0.07, 24, 1, true);
  const shade = new THREE.Mesh(shadeGeo, makeMat(bk, 0.5, 0.4));
  shade.position.set(0, 0.41, 0);
  shade.castShadow = true;
  g.add(shade);
  const innerShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.03, 0.065, 24, 1, true),
    emissive(0xfff0d0, 0xffcc66, 0.6, 0.5)
  );
  innerShade.position.set(0, 0.41, 0);
  g.add(innerShade);
  addSphere(g, 0.015, 0xfff5e0, 0, 0.385, 0, 20, { emissive: 0xffdd88, emissiveIntensity: 0.9 });
  addBox(g, 0.02, 0.008, 0.01, 0x555555, 0.04, 0.025, 0, { metalness: 0.3 });
  return g;
}

function createBeautyDishModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, sl = 0x999999;
  addCyl(g, 0.018, 0.022, 1.45, bk, 0, 0.725, 0, 20, { metalness: 0.4, roughness: 0.5 });
  addCyl(g, 0.15, 0.15, 0.015, bk, 0, 0.0075, 0, 16);
  addBox(g, 0.03, 0.18, 0.03, bk, -0.07, 1.47, 0, { metalness: 0.4 });
  addBox(g, 0.03, 0.18, 0.03, bk, 0.07, 1.47, 0, { metalness: 0.4 });
  const dishGeo = new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35);
  const dishMat = makeMat(0xf5f0e8, 0.6, 0.1);
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 1.47, 0.02);
  dish.rotation.x = Math.PI / 2 + 0.3;
  dish.castShadow = true;
  g.add(dish);
  const rimGeo = new THREE.TorusGeometry(0.2, 0.006, 12, 32);
  const rim = new THREE.Mesh(rimGeo, makeMat(bk, 0.4, 0.3));
  rim.position.set(0, 1.47, 0.02);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  addCyl(g, 0.04, 0.04, 0.005, 0xf5f0e8, 0, 1.47, 0.06, 12, { rx: Math.PI / 2, emissive: 0xfff8f0, emissiveIntensity: 0.3 });
  addCyl(g, 0.003, 0.003, 0.06, sl, 0, 1.47, 0.09, 8, { metalness: 0.5, castShadow: false });
  addCyl(g, 0.008, 0.008, 0.03, sl, 0, 1.55, -0.02, 12, { metalness: 0.6 });
  return g;
}// ================================================================
// BATCH 3 — Audio (6 models)
// ================================================================

function createMicrophoneModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, sl = 0x999999;
  // Desk clamp
  addBox(g, 0.06, 0.03, 0.05, bk, 0, 0.015, 0, { metalness: 0.3 });
  addBox(g, 0.015, 0.04, 0.06, bk, 0, 0.035, 0, { metalness: 0.3 });
  addCyl(g, 0.008, 0.008, 0.03, sl, 0.035, 0.035, 0, 12, { rx: Math.PI / 2, metalness: 0.5 });
  // Boom arm section 1
  addCyl(g, 0.01, 0.01, 0.35, bk, 0, 0.06, 0.15, 12, { rz: Math.PI / 2, metalness: 0.4 });
  addSphere(g, 0.018, sl, 0, 0.06, 0.32, 20, { metalness: 0.5 });
  // Boom arm section 2 (angled)
  addCyl(g, 0.009, 0.009, 0.3, bk, 0, 0.21, 0.44, 12, { rz: -0.7, metalness: 0.4 });
  // Shock mount
  addCyl(g, 0.028, 0.028, 0.04, sl, 0, 0.36, 0.56, 20, { metalness: 0.4 });
  const bandMat = makeMat(0x444444, 0.9);
  const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.002, 8, 20), bandMat);
  band1.position.set(0, 0.385, 0.56);
  g.add(band1);
  const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.002, 8, 20), bandMat);
  band2.position.set(0, 0.355, 0.56);
  g.add(band2);
  // Mic body
  addCyl(g, 0.02, 0.022, 0.12, 0x6b6863, 0, 0.4, 0.56, 12, { metalness: 0.5, roughness: 0.4 });
  // Mic grille (wireframe dome)
  const grillGeo = new THREE.SphereGeometry(0.024, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.5, wireframe: true });
  const grill = new THREE.Mesh(grillGeo, grillMat);
  grill.position.set(0, 0.46, 0.56);
  g.add(grill);
  addCyl(g, 0.015, 0.024, 0.015, 0x555555, 0, 0.48, 0.56, 20, { metalness: 0.4 });
  // XLR cable
  addCyl(g, 0.004, 0.004, 0.15, 0x222222, 0, 0.28, 0.56, 8);
  // Pop filter
  addCyl(g, 0.003, 0.003, 0.15, 0x333333, 0.08, 0.38, 0.5, 8, { rz: 0.3 });
  addCyl(g, 0.05, 0.05, 0.003, 0x444444, 0.13, 0.44, 0.56, 12);
  return g;
}

function createLavalierModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x1a1a1a;
  // Bodypack 1
  addBox(g, 0.04, 0.06, 0.015, bk, -0.06, 0.03, 0, { roughness: 0.8, metalness: 0.2 });
  addBox(g, 0.005, 0.05, 0.018, 0x333333, -0.082, 0.03, 0, { metalness: 0.3 });
  addCyl(g, 0.002, 0.001, 0.04, 0x444444, -0.04, 0.08, 0, 8);
  addSphere(g, 0.002, 0x44cc44, -0.06, 0.062, 0.008, 8, { emissive: 0x44cc44, emissiveIntensity: 0.8 });
  addCyl(g, 0.005, 0.005, 0.02, 0x222222, -0.06, 0.008, 0.04, 12);
  addSphere(g, 0.008, 0x333333, -0.06, 0.008, 0.055, 12, { roughness: 0.95 });
  addCyl(g, 0.002, 0.002, 0.03, 0x222222, -0.06, 0.018, 0.03, 8);
  // Bodypack 2
  addBox(g, 0.04, 0.06, 0.015, bk, 0.06, 0.03, 0, { roughness: 0.8, metalness: 0.2 });
  addBox(g, 0.005, 0.05, 0.018, 0x333333, 0.082, 0.03, 0, { metalness: 0.3 });
  addCyl(g, 0.002, 0.001, 0.04, 0x444444, 0.04, 0.08, 0, 8);
  addSphere(g, 0.002, 0x44cc44, 0.06, 0.062, 0.008, 8, { emissive: 0x44cc44, emissiveIntensity: 0.8 });
  addCyl(g, 0.005, 0.005, 0.02, 0x222222, 0.06, 0.008, 0.04, 12);
  addSphere(g, 0.008, 0x333333, 0.06, 0.008, 0.055, 12, { roughness: 0.95 });
  addCyl(g, 0.002, 0.002, 0.03, 0x222222, 0.06, 0.018, 0.03, 8);
  return g;
}

function createAudioRecorderModel(): THREE.Group {
  const g = new THREE.Group();
  const dk = 0x3a3a3a, sl = 0x888888;
  addBox(g, 0.065, 0.12, 0.035, dk, 0, 0.06, 0, { metalness: 0.2, roughness: 0.6 });
  addBox(g, 0.063, 0.005, 0.033, 0x444444, 0, 0.122, 0, { metalness: 0.3, castShadow: false });
  // XY stereo mics
  addCyl(g, 0.006, 0.006, 0.03, sl, -0.015, 0.14, 0.008, 12, { rz: -0.3, metalness: 0.4, roughness: 0.3 });
  addCyl(g, 0.006, 0.006, 0.03, sl, 0.015, 0.14, 0.008, 12, { rz: 0.3, metalness: 0.4, roughness: 0.3 });
  addSphere(g, 0.007, 0x666666, -0.018, 0.156, 0.014, 12, { roughness: 0.5, metalness: 0.3 });
  addSphere(g, 0.007, 0x666666, 0.018, 0.156, 0.014, 12, { roughness: 0.5, metalness: 0.3 });
  // LCD screen
  addBox(g, 0.04, 0.025, 0.002, 0x1a2a3a, 0, 0.09, 0.018, { roughness: 0.15, metalness: 0.2 });
  // Track buttons
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.008, 0.008, 0.004, 0x555555, -0.015 + i * 0.01, 0.07, 0.019, { metalness: 0.3 });
  }
  // Transport controls
  addBox(g, 0.01, 0.01, 0.004, 0xcc3333, -0.02, 0.04, 0.019, { emissive: 0xcc3333, emissiveIntensity: 0.4 });
  addBox(g, 0.01, 0.01, 0.004, 0x555555, 0, 0.04, 0.019, { metalness: 0.3 });
  addBox(g, 0.01, 0.01, 0.004, 0x555555, 0.02, 0.04, 0.019, { metalness: 0.3 });
  // Input jacks
  addCyl(g, 0.004, 0.004, 0.008, 0x222222, -0.015, 0.005, 0.02, 12);
  addCyl(g, 0.004, 0.004, 0.008, 0x222222, 0.015, 0.005, 0.02, 12);
  // Volume wheel
  addCyl(g, 0.006, 0.006, 0.012, sl, 0.036, 0.08, 0, 20, { rz: Math.PI / 2, metalness: 0.4 });
  return g;
}

function createStudioMonitorModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x1a1a1a, gy = 0x6b6863;
  addBox(g, 0.18, 0.28, 0.22, bk, 0, 0.14, 0, { roughness: 0.7, metalness: 0.1 });
  addBox(g, 0.17, 0.27, 0.005, 0x222222, 0, 0.14, 0.113, { roughness: 0.6, castShadow: false });
  // Tweeter
  addCyl(g, 0.015, 0.015, 0.008, 0xcccccc, 0, 0.24, 0.12, 12, { rz: Math.PI / 2, metalness: 0.6, roughness: 0.15 });
  addCyl(g, 0.018, 0.018, 0.005, 0x333333, 0, 0.24, 0.116, 12, { rz: Math.PI / 2, castShadow: false });
  // Woofer
  addCyl(g, 0.055, 0.055, 0.008, gy, 0, 0.14, 0.12, 16, { rz: Math.PI / 2, roughness: 0.5, metalness: 0.1 });
  addCyl(g, 0.06, 0.06, 0.004, 0x2a2a2a, 0, 0.14, 0.117, 16, { rz: Math.PI / 2, roughness: 0.95, castShadow: false });
  addCyl(g, 0.02, 0.02, 0.005, 0x555555, 0, 0.14, 0.12, 20, { rz: Math.PI / 2, roughness: 0.4, metalness: 0.2, castShadow: false });
  // Bass port
  addCyl(g, 0.025, 0.025, 0.02, 0x0a0a0a, 0, 0.04, 0.12, 20, { rz: Math.PI / 2 });
  // Power LED
  addSphere(g, 0.002, 0x44aa44, 0.07, 0.26, 0.12, 8, { emissive: 0x44aa44, emissiveIntensity: 0.8 });
  // Rear
  addBox(g, 0.17, 0.27, 0.003, 0x151515, 0, 0.14, -0.112, { roughness: 0.8, castShadow: false });
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.06, 0.003, 0.008, 0x333333, 0, 0.08 + i * 0.04, -0.115, { metalness: 0.5, castShadow: false });
  }
  return g;
}

function createPodcastMicModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, dk = 0x1a1a1a;
  // Desk clamp
  addBox(g, 0.06, 0.025, 0.05, bk, 0, 0.0125, 0, { metalness: 0.3 });
  addCyl(g, 0.008, 0.008, 0.03, 0x555555, 0.035, 0.025, 0, 12, { rx: Math.PI / 2, metalness: 0.5 });
  // Boom arm
  addCyl(g, 0.01, 0.01, 0.4, bk, 0, 0.05, 0.18, 12, { rz: Math.PI / 2, metalness: 0.4 });
  // Spring section
  addCyl(g, 0.016, 0.016, 0.08, 0x444444, 0, 0.06, 0.38, 20, { rz: -0.15, metalness: 0.5 });
  // Yoke mount
  addBox(g, 0.04, 0.04, 0.06, dk, 0, 0.1, 0.42, { metalness: 0.4 });
  // Mic body
  addCyl(g, 0.022, 0.024, 0.16, bk, 0, 0.2, 0.42, 14, { metalness: 0.3, roughness: 0.6 });
  // Mic grille (wireframe)
  const micHeadGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.1, 14, 12);
  const micHeadMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.4, wireframe: true });
  const micHead = new THREE.Mesh(micHeadGeo, micHeadMat);
  micHead.position.set(0, 0.33, 0.42);
  g.add(micHead);
  // Solid inner
  addCyl(g, 0.022, 0.022, 0.09, 0x333333, 0, 0.33, 0.42, 12, { castShadow: false });
  addCyl(g, 0.023, 0.023, 0.008, bk, 0, 0.38, 0.42, 12, { metalness: 0.3 });
  // Switch
  addBox(g, 0.012, 0.006, 0.008, 0x555555, 0.025, 0.16, 0.044, { metalness: 0.3 });
  // XLR connector
  addCyl(g, 0.008, 0.01, 0.02, 0x888888, 0, 0.11, 0.42, 12);
  // Pop filter
  addCyl(g, 0.003, 0.003, 0.2, 0x333333, 0.06, 0.15, 0.38, 8, { rz: 0.5 });
  addCyl(g, 0.06, 0.06, 0.003, 0x444444, 0.1, 0.2, 0.42, 12, { castShadow: false });
  return g;
}

function createAcousticPanelModel(): THREE.Group {
  const g = new THREE.Group();
  const foam = 0x3a3a3a;
  // Backing
  addBox(g, 0.6, 0.6, 0.012, 0x2a2a2a, 0, 0.306, 0, { roughness: 0.9 });
  // Foam base
  addBox(g, 0.58, 0.58, 0.04, foam, 0, 0.305, 0, { roughness: 0.95 });
  // Pyramid pattern
  const pyrSize = 0.058;
  const grid = 8;
  const off = -(grid - 1) * pyrSize / 2;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const pyrGeo = new THREE.ConeGeometry(pyrSize * 0.4, 0.025, 8);
      const pyr = new THREE.Mesh(pyrGeo, makeMat(foam, 0.95));
      pyr.position.set(off + c * pyrSize, 0.335, off + r * pyrSize + 0.025);
      pyr.rotation.y = Math.PI / 4;
      g.add(pyr);
    }
  }
  return g;
}
// ================================================================
// BATCH 4 — Furniture & Props (7 models)
// ================================================================

function createTripodModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x4a4744;
  addCyl(g, 0.012, 0.018, 1.2, gy, 0, 0.6, 0, 20, { metalness: 0.5, roughness: 0.4 });
  addCyl(g, 0.02, 0.02, 0.02, 0x555555, 0, 0.95, 0, 20, { metalness: 0.4 });
  addCyl(g, 0.035, 0.03, 0.06, gy, 0, 1.23, 0, 12, { metalness: 0.5, roughness: 0.4 });
  addBox(g, 0.05, 0.01, 0.04, 0x333333, 0, 1.27, 0, { metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(a), cz = Math.sin(a);
    addCyl(g, 0.008, 0.01, 0.6, gy, cx * 0.1, 0.45, cz * 0.1, 12, { metalness: 0.5, roughness: 0.4, rz: cx * 0.35, rx: cz * 0.35 });
    addCyl(g, 0.012, 0.012, 0.015, 0x555555, cx * 0.2, 0.25, cz * 0.2, 12, { rz: cx * 0.35, rx: cz * 0.35, metalness: 0.4 });
    addCyl(g, 0.006, 0.008, 0.55, gy, cx * 0.28, 0.1, cz * 0.28, 12, { metalness: 0.5, roughness: 0.4, rz: cx * 0.35, rx: cz * 0.35 });
    addCyl(g, 0.009, 0.011, 0.02, 0x1a1a1a, cx * 0.34, 0.02, cz * 0.34, 12, { rz: cx * 0.35, rx: cz * 0.35, roughness: 0.95 });
  }
  const spreader = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.28, 3), makeMat(0x333333, 0.8));
  spreader.position.set(0, 0.12, 0);
  spreader.rotation.x = Math.PI / 2;
  g.add(spreader);
  return g;
}

function createContentTableModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8b6f47, bk = 0x2a2826;
  addBox(g, 1.2, 0.035, 0.6, wood, 0, 0.74, 0, { roughness: 0.45, receiveShadow: true });
  addBox(g, 1.22, 0.005, 0.02, 0x7a5f3a, 0, 0.72, 0.29, { roughness: 0.5, castShadow: false });
  addBox(g, 1.22, 0.005, 0.02, 0x7a5f3a, 0, 0.72, -0.29, { roughness: 0.5, castShadow: false });
  // A-frame legs
  addBox(g, 0.04, 0.7, 0.04, bk, -0.52, 0.35, 0.24, { metalness: 0.4 });
  addBox(g, 0.04, 0.7, 0.04, bk, -0.52, 0.35, -0.24, { metalness: 0.4 });
  addBox(g, 0.04, 0.04, 0.48, bk, -0.52, 0.04, 0, { metalness: 0.4 });
  addBox(g, 0.04, 0.7, 0.04, bk, 0.52, 0.35, 0.24, { metalness: 0.4 });
  addBox(g, 0.04, 0.7, 0.04, bk, 0.52, 0.35, -0.24, { metalness: 0.4 });
  addBox(g, 0.04, 0.04, 0.48, bk, 0.52, 0.04, 0, { metalness: 0.4 });
  // Crossbar for cable management
  addBox(g, 0.96, 0.03, 0.03, bk, 0, 0.15, -0.26, { metalness: 0.4 });
  addBox(g, 0.6, 0.025, 0.12, 0x333333, 0, 0.12, -0.2, { metalness: 0.2, roughness: 0.7 });
  addCyl(g, 0.025, 0.025, 0.04, 0x222222, 0.2, 0.76, 0, 20);
  return g;
}

function createChairModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826, gy = 0x4a4744;
  // 5-star base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addBox(g, 0.28, 0.02, 0.03, gy, Math.cos(a) * 0.14, 0.02, Math.sin(a) * 0.14, { rz: -a, metalness: 0.4 });
    addSphere(g, 0.015, 0x222222, Math.cos(a) * 0.26, 0.01, Math.sin(a) * 0.26, 12, { roughness: 0.9 });
    addBox(g, 0.008, 0.015, 0.04, gy, Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22, { rz: -a, metalness: 0.4, castShadow: false });
  }
  // Gas lift
  addCyl(g, 0.02, 0.025, 0.35, 0x888888, 0, 0.2, 0, 20, { metalness: 0.6, roughness: 0.3 });
  addCyl(g, 0.04, 0.05, 0.06, bk, 0, 0.4, 0, 12, { metalness: 0.2, roughness: 0.7 });
  // Seat
  addBox(g, 0.44, 0.05, 0.42, bk, 0, 0.44, 0, { roughness: 0.8, receiveShadow: true });
  addBox(g, 0.42, 0.03, 0.4, 0x333333, 0, 0.475, 0, { roughness: 0.9 });
  // Backrest frame
  addBox(g, 0.04, 0.45, 0.04, bk, -0.2, 0.72, 0, { metalness: 0.3 });
  addBox(g, 0.04, 0.45, 0.04, bk, 0.2, 0.72, 0, { metalness: 0.3 });
  addBox(g, 0.38, 0.4, 0.008, 0x3a3a3a, 0, 0.72, 0, { roughness: 0.9 });
  addBox(g, 0.3, 0.1, 0.02, 0x333333, 0, 0.6, 0.01, { roughness: 0.9 });
  // Headrest
  addBox(g, 0.22, 0.1, 0.03, bk, 0, 1.0, 0, { roughness: 0.7 });
  addBox(g, 0.2, 0.08, 0.015, 0x3a3a3a, 0, 1.0, 0.01, { roughness: 0.9, castShadow: false });
  // Armrests
  for (const side of [-1, 1]) {
    addBox(g, 0.06, 0.02, 0.08, 0x444444, side * 0.24, 0.55, 0, { roughness: 0.9 });
    addBox(g, 0.02, 0.08, 0.02, gy, side * 0.24, 0.51, 0, { metalness: 0.4 });
    addBox(g, 0.02, 0.02, 0.08, gy, side * 0.24, 0.47, 0, { metalness: 0.4 });
  }
  return g;
}

function createSofaModel(): THREE.Group {
  const g = new THREE.Group();
  const fabric = 0x5a5550;
  addBox(g, 1.4, 0.2, 0.6, fabric, 0, 0.3, 0, { roughness: 0.9, receiveShadow: true });
  addBox(g, 1.3, 0.08, 0.5, 0x655f5a, 0, 0.44, 0, { roughness: 0.95 });
  addBox(g, 0.01, 0.08, 0.5, 0x504a45, 0, 0.44, 0, { roughness: 0.95, castShadow: false });
  addBox(g, 1.4, 0.35, 0.12, fabric, 0, 0.58, -0.24, { roughness: 0.9 });
  addBox(g, 1.2, 0.28, 0.08, 0x655f5a, 0, 0.56, -0.18, { roughness: 0.95 });
  addBox(g, 0.12, 0.25, 0.6, fabric, -0.64, 0.42, 0, { roughness: 0.9 });
  addBox(g, 0.12, 0.25, 0.6, fabric, 0.64, 0.42, 0, { roughness: 0.9 });
  addBox(g, 0.1, 0.04, 0.5, 0x655f5a, -0.64, 0.56, 0, { roughness: 0.95 });
  addBox(g, 0.1, 0.04, 0.5, 0x655f5a, 0.64, 0.56, 0, { roughness: 0.95 });
  for (const [lx, lz] of [[-0.6, 0.22], [0.6, 0.22], [-0.6, -0.22], [0.6, -0.22]]) {
    addBox(g, 0.04, 0.1, 0.04, 0x3a3530, lx, 0.05, lz, { metalness: 0.3, roughness: 0.6 });
  }
  return g;
}

function createProductStandModel(): THREE.Group {
  const g = new THREE.Group();
  addCyl(g, 0.1, 0.1, 0.04, 0x2a2826, 0, 0.02, 0, 16, { metalness: 0.3, roughness: 0.5 });
  const ringMat = makeMat(0x555555, 0.4, 0.4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.004, 12, 32), ringMat);
  ring.position.set(0, 0.042, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  addCyl(g, 0.14, 0.14, 0.012, 0xe8e8e8, 0, 0.057, 0, 24, { roughness: 0.15, metalness: 0.1, receiveShadow: true });
  addCyl(g, 0.145, 0.145, 0.003, 0xcccccc, 0, 0.065, 0, 24, { metalness: 0.2, roughness: 0.3, castShadow: false });
  addCyl(g, 0.008, 0.008, 0.06, 0x444444, 0, 0.03, 0, 20, { metalness: 0.5 });
  addBox(g, 0.03, 0.02, 0.025, 0x333333, 0.06, 0.02, 0, { metalness: 0.3 });
  addSphere(g, 0.002, 0x44cc44, 0.06, 0.035, 0.013, 8, { emissive: 0x44cc44, emissiveIntensity: 0.8 });
  return g;
}

function createBackdropModel(): THREE.Group {
  const g = new THREE.Group();
  const gy = 0x4a4744;
  for (const xPos of [-0.9, 0.9]) {
    addBox(g, 0.3, 0.01, 0.3, 0x333333, xPos, 0.005, 0, { metalness: 0.3 });
    addCyl(g, 0.015, 0.015, 0.025, 0x555555, xPos, 0.0225, 0.08, 12, { metalness: 0.5 });
  }
  for (const xPos of [-0.9, 0.9]) {
    addCyl(g, 0.014, 0.014, 2.4, gy, xPos, 1.22, 0.08, 20, { metalness: 0.5, roughness: 0.4 });
    addCyl(g, 0.02, 0.02, 0.03, 0x555555, xPos, 2.43, 0.08, 12, { metalness: 0.4 });
  }
  addCyl(g, 0.01, 0.01, 2.0, gy, 0, 2.4, 0.08, 20, { rz: Math.PI / 2, metalness: 0.5, roughness: 0.4 });
  addBox(g, 1.9, 2.2, 0.008, 0xc4baa8, 0, 1.22, 0.08, { roughness: 0.95, receiveShadow: true });
  for (let i = -4; i <= 4; i++) {
    addBox(g, 0.002, 2.1, 0.002, 0xb0a698, i * 0.2, 1.22, 0.087, { castShadow: false });
  }
  return g;
}

function createShelfPropsModel(): THREE.Group {
  const g = new THREE.Group();
  const wood = 0x8b6f47, frame = 0x2a2826;
  for (const xPos of [-0.38, 0.38]) {
    addBox(g, 0.025, 1.4, 0.28, wood, xPos, 0.7, 0, { roughness: 0.55 });
  }
  for (const xPos of [-0.39, 0.39]) {
    addBox(g, 0.008, 1.4, 0.008, frame, xPos, 0.7, 0.135, { metalness: 0.4 });
    addBox(g, 0.008, 1.4, 0.008, frame, xPos, 0.7, -0.135, { metalness: 0.4 });
  }
  for (const y of [0.02, 0.45, 0.88, 1.3]) {
    addBox(g, 0.735, 0.02, 0.28, wood, 0, y, 0, { roughness: 0.55, receiveShadow: true });
  }
  addBox(g, 0.76, 0.015, 0.29, wood, 0, 1.41, 0, { roughness: 0.5 });
  addBox(g, 0.74, 1.38, 0.005, 0x7a6040, 0, 0.7, -0.14, { roughness: 0.7, castShadow: false });
  // Books on shelf 1
  addBox(g, 0.08, 0.16, 0.14, 0xc75d3f, -0.22, 0.12, 0, { roughness: 0.8 });
  addBox(g, 0.06, 0.14, 0.13, 0x3a5f8a, -0.14, 0.11, 0.01, { roughness: 0.8 });
  addBox(g, 0.07, 0.15, 0.12, 0x4a6741, -0.06, 0.115, -0.01, { roughness: 0.8 });
  // Plant and frame on shelf 2
  addBox(g, 0.06, 0.08, 0.06, 0xc4baa8, -0.2, 0.5, 0.05, { roughness: 0.8 });
  addCyl(g, 0.025, 0.03, 0.04, 0x8b4513, -0.2, 0.56, 0.05, 20, { roughness: 0.8 });
  addSphere(g, 0.03, 0x4a7a3a, -0.2, 0.62, 0.05, 12);
  addBox(g, 0.1, 0.12, 0.01, 0x2a2826, 0.15, 0.53, 0.06, { metalness: 0.2 });
  addBox(g, 0.08, 0.1, 0.003, 0x888888, 0.15, 0.53, 0.066, { roughness: 0.5, castShadow: false });
  // Decorative objects on shelf 3
  addCyl(g, 0.03, 0.03, 0.08, 0xddcc88, 0.1, 0.94, 0, 20, { roughness: 0.4, metalness: 0.3 });
  addBox(g, 0.05, 0.06, 0.05, 0x666666, -0.15, 0.91, 0.05, { metalness: 0.3, roughness: 0.5 });
  return g;
}// ================================================================
// BATCH 5 — Power & Accessories (5 models)
// ================================================================

function createPowerStationModel(): THREE.Group {
  const g = new THREE.Group();
  const body = 0x3f6b5c;
  addBox(g, 0.28, 0.2, 0.18, body, 0, 0.13, 0, { roughness: 0.6, metalness: 0.15 });
  addBox(g, 0.27, 0.008, 0.17, 0x4a7a6a, 0, 0.234, 0, { roughness: 0.5, castShadow: false });
  // Handle
  const handleMat = makeMat(0x2a2826, 0.4, 0.3);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 12, 20, Math.PI), handleMat);
  handle.position.set(0, 0.25, 0);
  handle.rotation.z = Math.PI;
  g.add(handle);
  addBox(g, 0.02, 0.03, 0.03, 0x2a2826, -0.06, 0.24, 0, { metalness: 0.3 });
  addBox(g, 0.02, 0.03, 0.03, 0x2a2826, 0.06, 0.24, 0, { metalness: 0.3 });
  // Front panel
  addBox(g, 0.24, 0.14, 0.005, 0x222222, 0, 0.13, 0.093, { roughness: 0.8, castShadow: false });
  // AC outlets
  for (const xPos of [-0.05, 0.05]) {
    addBox(g, 0.035, 0.04, 0.008, 0x333333, xPos, 0.17, 0.098, { metalness: 0.2 });
    addCyl(g, 0.004, 0.004, 0.006, 0x111111, xPos - 0.006, 0.175, 0.103, 8);
    addCyl(g, 0.004, 0.004, 0.006, 0x111111, xPos + 0.006, 0.175, 0.103, 8);
  }
  // USB ports
  addBox(g, 0.012, 0.02, 0.006, 0x333333, -0.03, 0.11, 0.098, { metalness: 0.2 });
  addBox(g, 0.012, 0.02, 0.006, 0x333333, 0.01, 0.11, 0.098, { metalness: 0.2 });
  addBox(g, 0.014, 0.012, 0.006, 0x444444, 0.06, 0.11, 0.098, { metalness: 0.2 });
  // LED display
  addBox(g, 0.06, 0.03, 0.003, 0x0a1a0a, 0, 0.08, 0.097, { emissive: 0x44cc44, emissiveIntensity: 0.15, roughness: 0.1 });
  addCyl(g, 0.012, 0.012, 0.008, 0x555555, 0.08, 0.08, 0.098, 20, { rx: Math.PI / 2, metalness: 0.3 });
  // Battery LEDs
  for (let i = 0; i < 4; i++) {
    addSphere(g, 0.003, 0x44cc44, -0.08 + i * 0.015, 0.19, 0.097, 8, { emissive: 0x44cc44, emissiveIntensity: 0.7 });
  }
  // Ventilation
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.003, 0.1, 0.005, 0x2a5a4a, 0.142, 0.13, 0, { castShadow: false });
  }
  return g;
}

function createGeneratorModel(): THREE.Group {
  const g = new THREE.Group();
  const body = 0x6b6863, dk = 0x2a2826;
  addBox(g, 0.48, 0.38, 0.32, body, 0, 0.22, 0, { roughness: 0.7, metalness: 0.15 });
  addBox(g, 0.46, 0.04, 0.3, 0x5a5853, 0, 0.43, 0, { roughness: 0.75, castShadow: false });
  addBox(g, 0.18, 0.025, 0.05, dk, 0, 0.455, 0, { metalness: 0.3, roughness: 0.5 });
  addBox(g, 0.04, 0.02, 0.045, 0x333333, -0.07, 0.445, 0, { roughness: 0.9 });
  addBox(g, 0.04, 0.02, 0.045, 0x333333, 0.07, 0.445, 0, { roughness: 0.9 });
  // Control panel
  addBox(g, 0.2, 0.15, 0.005, 0x222222, -0.08, 0.3, 0.163, { roughness: 0.8, castShadow: false });
  addCyl(g, 0.015, 0.015, 0.01, 0x444444, -0.12, 0.33, 0.168, 20, { rx: Math.PI / 2, metalness: 0.3 });
  addCyl(g, 0.015, 0.015, 0.01, 0x444444, -0.06, 0.33, 0.168, 20, { rx: Math.PI / 2, metalness: 0.3 });
  addBox(g, 0.015, 0.025, 0.01, 0xcc3333, -0.02, 0.3, 0.168, { metalness: 0.2 });
  // Fuel cap
  addCyl(g, 0.02, 0.02, 0.015, dk, 0.15, 0.44, 0, 20, { metalness: 0.3 });
  addBox(g, 0.03, 0.02, 0.005, 0x1a2a1a, 0.15, 0.38, 0.163, { emissive: 0x44aa44, emissiveIntensity: 0.15, roughness: 0.1 });
  // Exhaust
  addCyl(g, 0.018, 0.018, 0.08, dk, 0.2, 0.47, 0.08, 20, { metalness: 0.4, roughness: 0.4 });
  addCyl(g, 0.022, 0.022, 0.005, 0x444444, 0.2, 0.51, 0.08, 20, { metalness: 0.3 });
  // Ventilation grille
  for (let i = 0; i < 6; i++) {
    addBox(g, 0.003, 0.2, 0.003, 0x555555, 0.242, 0.22, -0.1 + i * 0.04, { castShadow: false });
  }
  // Wheels
  for (const zPos of [-0.1, 0.1]) {
    addCyl(g, 0.035, 0.035, 0.02, 0x222222, 0, 0.035, zPos, 20, { rz: Math.PI / 2, roughness: 0.9 });
  }
  for (const zPos of [-0.12, 0.12]) {
    addBox(g, 0.03, 0.015, 0.03, dk, -0.255, 0.008, zPos, { roughness: 0.9 });
  }
  return g;
}

function createPowerStripModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826;
  addBox(g, 0.38, 0.035, 0.06, bk, 0, 0.025, 0, { roughness: 0.7, metalness: 0.1 });
  addBox(g, 0.37, 0.005, 0.055, 0x333333, 0, 0.045, 0, { roughness: 0.6, castShadow: false });
  // 6 AC outlets
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -0.1 + col * 0.1;
      const z = -0.012 + row * 0.024;
      addBox(g, 0.025, 0.004, 0.018, 0x444444, x, 0.048, z, { metalness: 0.2, castShadow: false });
      addCyl(g, 0.003, 0.003, 0.005, 0x111111, x - 0.005, 0.051, z, 8);
      addCyl(g, 0.003, 0.003, 0.005, 0x111111, x + 0.005, 0.051, z, 8);
    }
  }
  // USB ports
  addBox(g, 0.025, 0.01, 0.03, 0x444444, 0.15, 0.048, 0, { metalness: 0.2, castShadow: false });
  addBox(g, 0.015, 0.008, 0.012, 0x333333, 0.15, 0.048, -0.006, { metalness: 0.2, castShadow: false });
  addBox(g, 0.015, 0.008, 0.012, 0x555555, 0.15, 0.048, 0.006, { metalness: 0.2, castShadow: false });
  // Switch and LED
  addBox(g, 0.015, 0.012, 0.008, 0xcc3333, -0.17, 0.048, 0, { metalness: 0.2 });
  addSphere(g, 0.002, 0x44cc44, -0.17, 0.05, 0.025, 8, { emissive: 0x44cc44, emissiveIntensity: 0.8 });
  // Cable
  addCyl(g, 0.005, 0.005, 0.08, 0x222222, -0.2, 0.025, 0, 12);
  addBox(g, 0.025, 0.02, 0.02, 0x333333, -0.24, 0.025, 0, { metalness: 0.2 });
  addBox(g, 0.004, 0.015, 0.004, 0x888888, -0.26, 0.03, 0, { metalness: 0.6 });
  return g;
}

function createGreenScreenModel(): THREE.Group {
  const g = new THREE.Group();
  const green = 0x00cc44, bk = 0x2a2826;
  for (const xPos of [-0.65, 0.65]) {
    addBox(g, 0.2, 0.01, 0.3, bk, xPos, 0.005, 0, { metalness: 0.3 });
  }
  for (const xPos of [-0.65, 0.65]) {
    addCyl(g, 0.015, 0.015, 2.1, bk, xPos, 1.06, 0, 20, { metalness: 0.4, roughness: 0.5 });
  }
  addCyl(g, 0.012, 0.012, 1.4, bk, 0, 2.12, 0, 20, { rz: Math.PI / 2, metalness: 0.4, roughness: 0.5 });
  // Green fabric
  addBox(g, 1.35, 2.0, 0.008, green, 0, 1.1, 0.005, { roughness: 0.95, receiveShadow: true });
  for (let i = -5; i <= 5; i++) {
    addBox(g, 0.002, 1.95, 0.002, 0x00bb3a, i * 0.12, 1.1, 0.01, { castShadow: false });
  }
  // Back struts
  for (const xPos of [-0.3, 0.3]) {
    addBox(g, 0.02, 0.02, 0.4, 0x444444, xPos, 0.6, -0.2, { rz: 0.6, metalness: 0.4 });
  }
  return g;
}

function createTeleprompterModel(): THREE.Group {
  const g = new THREE.Group();
  const bk = 0x2a2826;
  // Base mount
  addCyl(g, 0.03, 0.03, 0.02, 0x888888, 0, 0.01, 0, 20, { metalness: 0.5 });
  addBox(g, 0.04, 0.04, 0.06, bk, 0, 0.04, 0, { metalness: 0.3 });
  // Hood
  addBox(g, 0.18, 0.01, 0.12, bk, 0, 0.06, 0, { metalness: 0.3 });
  addBox(g, 0.18, 0.01, 0.12, bk, 0, 0.18, 0, { metalness: 0.3 });
  addBox(g, 0.01, 0.12, 0.12, bk, -0.09, 0.12, 0, { metalness: 0.3 });
  addBox(g, 0.01, 0.12, 0.12, bk, 0.09, 0.12, 0, { metalness: 0.3 });
  // Beam-splitter glass
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.3 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), glassMat);
  glass.position.set(0, 0.12, 0);
  glass.rotation.y = Math.PI / 4;
  g.add(glass);
  // Glass frame edges
  const gfMat = makeMat(0x333333, 0.4, 0.3);
  const gfTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.006), gfMat);
  gfTop.position.set(0, 0.175, 0);
  gfTop.rotation.y = Math.PI / 4;
  g.add(gfTop);
  const gfBot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.006), gfMat);
  gfBot.position.set(0, 0.065, 0);
  gfBot.rotation.y = Math.PI / 4;
  g.add(gfBot);
  // Phone holder
  addBox(g, 0.14, 0.005, 0.08, 0x333333, 0, 0.19, 0, { metalness: 0.3, rz: -0.15 });
  addBox(g, 0.005, 0.04, 0.015, bk, -0.068, 0.22, 0, { metalness: 0.3 });
  addBox(g, 0.005, 0.04, 0.015, bk, 0.068, 0.22, 0, { metalness: 0.3 });
  addBox(g, 0.11, 0.06, 0.006, 0x0a0a0a, 0, 0.24, 0, { rz: -0.15 });
  addBox(g, 0.1, 0.05, 0.002, 0x223344, 0, 0.245, -0.003, { rz: -0.15, roughness: 0.1, metalness: 0.2 });
  return g;
}