import * as THREE from 'three';
import type { EquipmentDefinition, EquipmentId } from './types';

// ============================================================
// Equipment Catalog — 12 creator equipment types
// Prices in GHS and NGN (approximate local market values)
// ============================================================

export const EQUIPMENT_CATALOG: Record<EquipmentId, EquipmentDefinition> = {
  camera: {
    id: 'camera',
    name: 'Phone / Camera',
    icon: '📷',
    category: 'camera',
    dimensions: { width: 0.15, depth: 0.1, height: 0.12 },
    watts: 0,
    defaultPriceGHS: 3200,
    defaultPriceNGN: 165000,
    color: 0x2a2826,
    description: 'Smartphone or dedicated camera for recording',
  },
  tripod: {
    id: 'tripod',
    name: 'Tripod',
    icon: '📐',
    category: 'camera',
    dimensions: { width: 0.12, depth: 0.12, height: 1.5 },
    watts: 0,
    defaultPriceGHS: 450,
    defaultPriceNGN: 23000,
    color: 0x4a4744,
    description: 'Camera or phone tripod stand',
  },
  'led-light': {
    id: 'led-light',
    name: 'LED Light',
    icon: '💡',
    category: 'lighting',
    dimensions: { width: 0.3, depth: 0.2, height: 0.35 },
    watts: 60,
    defaultPriceGHS: 350,
    defaultPriceNGN: 18000,
    color: 0xfff5e0,
    description: 'LED panel or ring light',
  },
  softbox: {
    id: 'softbox',
    name: 'Softbox',
    icon: '🔲',
    category: 'lighting',
    dimensions: { width: 0.6, depth: 0.15, height: 0.8 },
    watts: 100,
    defaultPriceGHS: 500,
    defaultPriceNGN: 26000,
    color: 0xf5f1ea,
    description: 'Softbox light diffuser on stand',
  },
  microphone: {
    id: 'microphone',
    name: 'Microphone',
    icon: '🎙️',
    category: 'audio',
    dimensions: { width: 0.08, depth: 0.08, height: 0.25 },
    watts: 0,
    defaultPriceGHS: 280,
    defaultPriceNGN: 14500,
    color: 0x2a2826,
    description: 'Condenser or dynamic microphone',
  },
  backdrop: {
    id: 'backdrop',
    name: 'Backdrop',
    icon: '🎭',
    category: 'props',
    dimensions: { width: 2.0, depth: 0.05, height: 2.2 },
    watts: 0,
    defaultPriceGHS: 200,
    defaultPriceNGN: 10500,
    color: 0xc4baa8,
    description: 'Fabric or paper backdrop on stand',
  },
  'content-table': {
    id: 'content-table',
    name: 'Content Table',
    icon: '🪑',
    category: 'furniture',
    dimensions: { width: 1.2, depth: 0.6, height: 0.74 },
    watts: 0,
    defaultPriceGHS: 380,
    defaultPriceNGN: 19500,
    color: 0x8b6f47,
    description: 'Table for products, notes, or equipment',
  },
  chair: {
    id: 'chair',
    name: 'Chair',
    icon: '💺',
    category: 'furniture',
    dimensions: { width: 0.45, depth: 0.45, height: 0.85 },
    watts: 0,
    defaultPriceGHS: 250,
    defaultPriceNGN: 13000,
    color: 0x2a2826,
    description: 'Seating for host, guest, or subject',
  },
  'product-stand': {
    id: 'product-stand',
    name: 'Product Stand',
    icon: '📱',
    category: 'props',
    dimensions: { width: 0.3, depth: 0.3, height: 0.15 },
    watts: 0,
    defaultPriceGHS: 120,
    defaultPriceNGN: 6200,
    color: 0xc4baa8,
    description: 'Small stand or riser for product display',
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
    description: 'Portable power station / lithium battery pack',
  },
  generator: {
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
  'shelf-props': {
    id: 'shelf-props',
    name: 'Shelf & Props',
    icon: '📚',
    category: 'props',
    dimensions: { width: 0.8, depth: 0.3, height: 1.4 },
    defaultPriceGHS: 300,
    defaultPriceNGN: 15500,
    color: 0x8b6f47,
    description: 'Shelving unit with props and decorations',
  },
};

export const EQUIPMENT_IDS: EquipmentId[] = [
  'camera', 'tripod', 'led-light', 'softbox', 'microphone',
  'backdrop', 'content-table', 'chair', 'product-stand',
  'power-station', 'generator', 'shelf-props',
];

// ============================================================
// 3D Model Factory Functions
// Each returns a THREE.Group positioned at origin (y=0)
// ============================================================

export function createEquipmentModel(equipmentId: EquipmentId): THREE.Group {
  switch (equipmentId) {
    case 'camera': return createCameraModel();
    case 'tripod': return createTripodModel();
    case 'led-light': return createLEDLightModel();
    case 'softbox': return createSoftboxModel();
    case 'microphone': return createMicrophoneModel();
    case 'backdrop': return createBackdropModel();
    case 'content-table': return createTableModel();
    case 'chair': return createChairModel();
    case 'product-stand': return createProductStandModel();
    case 'power-station': return createPowerStationModel();
    case 'generator': return createGeneratorModel();
    case 'shelf-props': return createShelfPropsModel();
  }
}

function makeMat(color: number, roughness = 0.7, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createCameraModel(): THREE.Group {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), makeMat(0x2a2826, 0.4, 0.3));
  body.position.y = 0.12;
  body.castShadow = true;
  g.add(body);
  // Lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.08, 16), makeMat(0x1a1a1a, 0.3, 0.5));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.12, 0.09);
  lens.castShadow = true;
  g.add(lens);
  // Screen (back)
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.005), makeMat(0x1f3a5f, 0.2, 0.4));
  screen.position.set(0, 0.13, -0.055);
  g.add(screen);
  // Record indicator (red dot)
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshBasicMaterial({ color: 0xcc3333 }));
  dot.position.set(0.05, 0.16, 0.052);
  g.add(dot);
  return g;
}

function createTripodModel(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = makeMat(0x4a4744, 0.4, 0.5);
  // Center pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.4, 8), poleMat);
  pole.position.y = 0.7;
  pole.castShadow = true;
  g.add(pole);
  // Head mount
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.06, 12), poleMat);
  head.position.y = 1.42;
  head.castShadow = true;
  g.add(head);
  // Three legs
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 1.2, 6), poleMat);
    leg.position.set(Math.cos(angle) * 0.25, 0.3, Math.sin(angle) * 0.25);
    leg.rotation.z = Math.cos(angle) * 0.35;
    leg.rotation.x = Math.sin(angle) * 0.35;
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

function createLEDLightModel(): THREE.Group {
  const g = new THREE.Group();
  // Stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.2, 8), makeMat(0x4a4744, 0.4, 0.5));
  stand.position.y = 0.6;
  stand.castShadow = true;
  g.add(stand);
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), makeMat(0x2a2826, 0.5));
  base.position.y = 0.01;
  g.add(base);
  // Light panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.22, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xfff5e0, emissive: 0xffd5a0, emissiveIntensity: 0.8, roughness: 0.2 })
  );
  panel.position.y = 1.32;
  panel.castShadow = true;
  g.add(panel);
  // Frame
   const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.01), makeMat(0x2a2826, 0.4, 0.4));
  frame.position.y = 1.32;
  frame.position.z = 0.02;
  g.add(frame);
  return g;
}

function createSoftboxModel(): THREE.Group {
  const g = new THREE.Group();
  // Stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.6, 8), makeMat(0x4a4744, 0.4, 0.5));
  stand.position.y = 0.8;
  stand.castShadow = true;
  g.add(stand);
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), makeMat(0x2a2826, 0.5));
  base.position.y = 0.01;
  g.add(base);
  // Softbox panel
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.12), makeMat(0xf5f1ea, 0.9));
  box.position.y = 1.75;
  box.castShadow = true;
  g.add(box);
  // Front diffuser (glowing)
  const diffuser = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xfff8f0, emissive: 0xffe8c8, emissiveIntensity: 0.6, side: THREE.DoubleSide })
  );
  diffuser.position.set(0, 1.75, 0.065);
  g.add(diffuser);
  return g;
}

function createMicrophoneModel(): THREE.Group {
  const g = new THREE.Group();
  // Stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.6, 8), makeMat(0x4a4744, 0.4, 0.5));
  stand.position.y = 0.3;
  stand.castShadow = true;
  g.add(stand);
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 16), makeMat(0x2a2826, 0.5));
  base.position.y = 0.008;
  g.add(base);
  // Mic body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 16), makeMat(0x6b6863, 0.3, 0.6));
  body.position.y = 0.66;
  body.castShadow = true;
  g.add(body);
  // Mic head (grill)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.5, metalness: 0.4 })
  );
  head.position.y = 0.72;
  head.castShadow = true;
  g.add(head);
  return g;
}

function createBackdropModel(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = makeMat(0x4a4744, 0.4, 0.5);
  // Two vertical poles
  [-0.9, 0.9].forEach(x => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 8), poleMat);
    pole.position.set(x, 1.2, 0);
    pole.castShadow = true;
    g.add(pole);
  });
  // Crossbar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.0, 8), poleMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.35;
  g.add(bar);
  // Backdrop cloth
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xc4baa8, roughness: 0.95, side: THREE.DoubleSide })
  );
  cloth.position.set(0, 1.25, 0.02);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  g.add(cloth);
  return g;
}

function createTableModel(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = makeMat(0x8b6f47, 0.5);
  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.035, 0.6), woodMat);
  top.position.y = 0.74;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  // Legs
  const legMat = makeMat(0x2a2826, 0.4, 0.3);
  [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.74, 0.04), legMat);
    leg.position.set(x, 0.37, z);
    leg.castShadow = true;
    g.add(leg);
  });
  return g;
}

function createChairModel(): THREE.Group {
  const g = new THREE.Group();
  const seatMat = makeMat(0x2a2826, 0.7);
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), seatMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  seat.receiveShadow = true;
  g.add(seat);
  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.035), seatMat);
  back.position.set(0, 0.67, -0.19);
  back.castShadow = true;
  g.add(back);
  // Legs
  const legMat = makeMat(0x4a4744, 0.4, 0.3);
  [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.45, 0.035), legMat);
    leg.position.set(x, 0.225, z);
    leg.castShadow = true;
    g.add(leg);
  });
  return g;
}

function createProductStandModel(): THREE.Group {
  const g = new THREE.Group();
  // Platform
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24), makeMat(0xc4baa8, 0.5));
  platform.position.y = 0.12;
  platform.castShadow = true;
  platform.receiveShadow = true;
  g.add(platform);
  // Stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), makeMat(0x4a4744, 0.3, 0.5));
  stem.position.y = 0.06;
  g.add(stem);
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16), makeMat(0x2a2826, 0.5));
  base.position.y = 0.008;
  g.add(base);
  return g;
}

function createPowerStationModel(): THREE.Group {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.18), makeMat(0x3f6b5c, 0.6, 0.2));
  body.position.y = 0.13;
  body.castShadow = true;
  g.add(body);
  // Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 12, Math.PI), makeMat(0x2a2826, 0.3, 0.4));
  handle.position.set(0, 0.25, 0);
  handle.rotation.z = Math.PI;
  g.add(handle);
  // Power indicator
  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x6b8e4e })
  );
  indicator.position.set(0.1, 0.2, 0.095);
  g.add(indicator);
  return g;
}

function createGeneratorModel(): THREE.Group {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.32), makeMat(0x6b6863, 0.7, 0.2));
  body.position.y = 0.22;
  body.castShadow = true;
  g.add(body);
  // Top handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.06), makeMat(0x2a2826, 0.4, 0.3));
  handle.position.set(0, 0.42, 0);
  g.add(handle);
  // Exhaust
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), makeMat(0x2a2826, 0.3, 0.5));
  exhaust.position.set(0.2, 0.42, 0.08);
  g.add(exhaust);
  // Panel
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.005), makeMat(0x2a2826, 0.3));
  panel.position.set(-0.12, 0.3, 0.165);
  g.add(panel);
  return g;
}

function createShelfPropsModel(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = makeMat(0x8b6f47, 0.6);
  // Side panels
  [-0.38, 0.38].forEach(x => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 0.28), woodMat);
    side.position.set(x, 0.7, 0);
    side.castShadow = true;
    g.add(side);
  });
  // Shelves
  [0.02, 0.45, 0.88, 1.3].forEach(y => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.025, 0.28), woodMat);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    g.add(shelf);
  });
  // Decorative items on shelves
  const colors = [0xc75d3f, 0x4a6741, 0xc4baa8, 0x2a2826];
  [0.27, 0.7, 1.13].forEach((y, idx) => {
    for (let i = 0; i < 2; i++) {
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.12),
        makeMat(colors[(idx + i) % colors.length], 0.6)
      );
      item.position.set(-0.15 + i * 0.3, y + 0.1, 0);
      item.castShadow = true;
      g.add(item);
    }
  });
  return g;
}
