import * as THREE from 'three';
import type { EquipmentDefinition, EquipmentId } from './types';

export interface ArchitecturalItemDef extends EquipmentDefinition {
  isArchitectural?: boolean;
  architecturalCategory?: 'bedroom' | 'living' | 'dining' | 'kitchen' | 'bathroom' | 'doors-windows' | 'outdoor';
}

export const ARCHITECTURAL_CATALOG: Record<string, ArchitecturalItemDef> = {
  // ─── BEDROOM ──────────────────────────────────────────────
  'arch-bed-king': {
    id: 'arch-bed-king',
    name: 'Master King Bed with Headboard',
    icon: '🛏️',
    category: 'furniture',
    dimensions: { width: 2.0, depth: 2.1, height: 1.1 },
    watts: 0,
    defaultPriceGHS: 6500,
    defaultPriceNGN: 340000,
    color: 0xe0dbd1,
    description: '2.0m x 2.1m king size bed with upholstered headboard, duvet & pillows',
    isArchitectural: true,
    architecturalCategory: 'bedroom',
  },
  'arch-bed-queen': {
    id: 'arch-bed-queen',
    name: 'Queen Bed with Nightstands',
    icon: '🛏️',
    category: 'furniture',
    dimensions: { width: 1.6, depth: 2.0, height: 0.95 },
    watts: 0,
    defaultPriceGHS: 4800,
    defaultPriceNGN: 250000,
    color: 0xd5d0c5,
    description: '1.6m x 2.0m queen bed with side tables',
    isArchitectural: true,
    architecturalCategory: 'bedroom',
  },
  'arch-wardrobe': {
    id: 'arch-wardrobe',
    name: 'Built-in Wardrobe / Closet',
    icon: '🚪',
    category: 'furniture',
    dimensions: { width: 2.4, depth: 0.6, height: 2.4 },
    watts: 0,
    defaultPriceGHS: 5200,
    defaultPriceNGN: 270000,
    color: 0x4a4640,
    description: 'Full-height built-in bedroom wardrobe with sliding mirror doors',
    isArchitectural: true,
    architecturalCategory: 'bedroom',
  },
  'arch-nightstand': {
    id: 'arch-nightstand',
    name: 'Bedside Nightstand',
    icon: '🗄️',
    category: 'furniture',
    dimensions: { width: 0.5, depth: 0.45, height: 0.55 },
    watts: 0,
    defaultPriceGHS: 850,
    defaultPriceNGN: 45000,
    color: 0x8a7f72,
    description: 'Modern 2-drawer wooden nightstand',
    isArchitectural: true,
    architecturalCategory: 'bedroom',
  },

  // ─── LIVING ROOM ──────────────────────────────────────────
  'arch-sofa-sectional': {
    id: 'arch-sofa-sectional',
    name: 'Modern L-Shape Sectional Couch',
    icon: '🛋️',
    category: 'furniture',
    dimensions: { width: 2.8, depth: 2.0, height: 0.82 },
    watts: 0,
    defaultPriceGHS: 7800,
    defaultPriceNGN: 410000,
    color: 0x3d4147,
    description: 'Expansive contemporary sectional couch with chaise lounge & throw cushions',
    isArchitectural: true,
    architecturalCategory: 'living',
  },
  'arch-sofa-3seat': {
    id: 'arch-sofa-3seat',
    name: '3-Seater Minimalist Sofa',
    icon: '🛋️',
    category: 'furniture',
    dimensions: { width: 2.2, depth: 0.9, height: 0.8 },
    watts: 0,
    defaultPriceGHS: 4200,
    defaultPriceNGN: 220000,
    color: 0x6e6b66,
    description: 'Clean Scandinavian-style 3-seater sofa in warm grey fabric',
    isArchitectural: true,
    architecturalCategory: 'living',
  },
  'arch-coffee-table': {
    id: 'arch-coffee-table',
    name: 'Architectural Coffee Table',
    icon: '🪑',
    category: 'furniture',
    dimensions: { width: 1.2, depth: 0.65, height: 0.42 },
    watts: 0,
    defaultPriceGHS: 1400,
    defaultPriceNGN: 73000,
    color: 0x2b2723,
    description: 'Low-profile tempered glass and natural oak coffee table',
    isArchitectural: true,
    architecturalCategory: 'living',
  },
  'arch-tv-console': {
    id: 'arch-tv-console',
    name: 'Media Console & Wall TV Unit',
    icon: '📺',
    category: 'furniture',
    dimensions: { width: 2.0, depth: 0.45, height: 1.6 },
    watts: 180,
    defaultPriceGHS: 5500,
    defaultPriceNGN: 290000,
    color: 0x1f2022,
    description: 'Floating timber media console with 75" wall-mounted smart display',
    isArchitectural: true,
    architecturalCategory: 'living',
  },
  'arch-armchair': {
    id: 'arch-armchair',
    name: 'Modern Lounge Armchair',
    icon: '🪑',
    category: 'furniture',
    dimensions: { width: 0.85, depth: 0.85, height: 0.82 },
    watts: 0,
    defaultPriceGHS: 2100,
    defaultPriceNGN: 110000,
    color: 0xbf823b,
    description: 'Warm tan leather lounge chair',
    isArchitectural: true,
    architecturalCategory: 'living',
  },

  // ─── DINING ───────────────────────────────────────────────
  'arch-dining-6seat': {
    id: 'arch-dining-6seat',
    name: '6-Seater Modern Dining Set',
    icon: '🍽️',
    category: 'furniture',
    dimensions: { width: 1.8, depth: 0.95, height: 0.76 },
    watts: 0,
    defaultPriceGHS: 5800,
    defaultPriceNGN: 305000,
    color: 0x36322d,
    description: 'Solid hardwood dining table with 6 ergonomic upholstered dining chairs',
    isArchitectural: true,
    architecturalCategory: 'dining',
  },
  'arch-dining-8seat': {
    id: 'arch-dining-8seat',
    name: '8-Seater Formal Dining Set',
    icon: '🍽️',
    category: 'furniture',
    dimensions: { width: 2.4, depth: 1.05, height: 0.76 },
    watts: 0,
    defaultPriceGHS: 8200,
    defaultPriceNGN: 430000,
    color: 0x262320,
    description: 'Grand dining table with seating for 8 guests',
    isArchitectural: true,
    architecturalCategory: 'dining',
  },

  // ─── KITCHEN ──────────────────────────────────────────────
  'arch-kitchen-island': {
    id: 'arch-kitchen-island',
    name: 'Kitchen Island with Bar Stools',
    icon: '🍳',
    category: 'furniture',
    dimensions: { width: 2.2, depth: 1.0, height: 0.9 },
    watts: 0,
    defaultPriceGHS: 7500,
    defaultPriceNGN: 395000,
    color: 0xf0ede6,
    description: 'Quartz-top kitchen preparation island with 3 breakfast bar stools',
    isArchitectural: true,
    architecturalCategory: 'kitchen',
  },
  'arch-kitchen-counter': {
    id: 'arch-kitchen-counter',
    name: 'L-Shape Kitchen Counter & Sink',
    icon: '🚰',
    category: 'furniture',
    dimensions: { width: 3.0, depth: 2.0, height: 0.9 },
    watts: 0,
    defaultPriceGHS: 12000,
    defaultPriceNGN: 630000,
    color: 0x2e3033,
    description: 'Fitted kitchen cabinetry with undermount double sink, induction cooktop & granite counter',
    isArchitectural: true,
    architecturalCategory: 'kitchen',
  },
  'arch-refrigerator': {
    id: 'arch-refrigerator',
    name: 'French Door Smart Refrigerator',
    icon: '🧊',
    category: 'furniture',
    dimensions: { width: 0.92, depth: 0.85, height: 1.82 },
    watts: 150,
    defaultPriceGHS: 9800,
    defaultPriceNGN: 515000,
    color: 0x8a8e94,
    description: 'Double-door stainless steel refrigerator with ice/water dispenser',
    isArchitectural: true,
    architecturalCategory: 'kitchen',
  },

  // ─── BATHROOM / SANITARY ──────────────────────────────────
  'arch-toilet': {
    id: 'arch-toilet',
    name: 'Ceramic Water Closet (WC)',
    icon: '🚽',
    category: 'furniture',
    dimensions: { width: 0.42, depth: 0.7, height: 0.8 },
    watts: 0,
    defaultPriceGHS: 1800,
    defaultPriceNGN: 95000,
    color: 0xfcfcfc,
    description: 'Modern dual-flush ceramic toilet with soft-close seat',
    isArchitectural: true,
    architecturalCategory: 'bathroom',
  },
  'arch-shower': {
    id: 'arch-shower',
    name: 'Glass Shower Cubicle',
    icon: '🚿',
    category: 'furniture',
    dimensions: { width: 1.0, depth: 1.0, height: 2.1 },
    watts: 0,
    defaultPriceGHS: 3500,
    defaultPriceNGN: 185000,
    color: 0x90c4de,
    description: '1.0m x 1.0m frameless tempered glass shower enclosure with rain shower head',
    isArchitectural: true,
    architecturalCategory: 'bathroom',
  },
  'arch-vanity': {
    id: 'arch-vanity',
    name: 'Bathroom Vanity & Basin Mirror',
    icon: '🪞',
    category: 'furniture',
    dimensions: { width: 1.0, depth: 0.52, height: 1.8 },
    watts: 20,
    defaultPriceGHS: 2800,
    defaultPriceNGN: 147000,
    color: 0x5a544b,
    description: 'Wall-hung vanity cabinet with vessel sink and illuminated LED mirror',
    isArchitectural: true,
    architecturalCategory: 'bathroom',
  },
  'arch-bathtub': {
    id: 'arch-bathtub',
    name: 'Freestanding Soaking Bathtub',
    icon: '🛁',
    category: 'furniture',
    dimensions: { width: 1.7, depth: 0.8, height: 0.6 },
    watts: 0,
    defaultPriceGHS: 5500,
    defaultPriceNGN: 290000,
    color: 0xfaf8f5,
    description: 'Contemporary oval acrylic freestanding bath',
    isArchitectural: true,
    architecturalCategory: 'bathroom',
  },

  // ─── DOORS & WINDOWS ──────────────────────────────────────
  'arch-door-single': {
    id: 'arch-door-single',
    name: 'Solid Wooden Entrance Door',
    icon: '🚪',
    category: 'furniture',
    dimensions: { width: 1.0, depth: 0.15, height: 2.1 },
    watts: 0,
    defaultPriceGHS: 2400,
    defaultPriceNGN: 125000,
    color: 0x543d2b,
    description: '1.0m hardwood panel security door with mortise lockset',
    isArchitectural: true,
    architecturalCategory: 'doors-windows',
  },
  'arch-door-double': {
    id: 'arch-door-double',
    name: 'Double French Entrance Door',
    icon: '🚪',
    category: 'furniture',
    dimensions: { width: 1.8, depth: 0.15, height: 2.2 },
    watts: 0,
    defaultPriceGHS: 4500,
    defaultPriceNGN: 235000,
    color: 0x3d2c1e,
    description: '1.8m grand double pivot entrance door with glazed sidelights',
    isArchitectural: true,
    architecturalCategory: 'doors-windows',
  },
  'arch-door-sliding': {
    id: 'arch-door-sliding',
    name: 'Aluminium Sliding Glass Patio Door',
    icon: '🪟',
    category: 'furniture',
    dimensions: { width: 2.4, depth: 0.15, height: 2.2 },
    watts: 0,
    defaultPriceGHS: 4200,
    defaultPriceNGN: 220000,
    color: 0x222222,
    description: '2.4m heavy-duty black aluminium sliding door to terrace or garden',
    isArchitectural: true,
    architecturalCategory: 'doors-windows',
  },
  'arch-window-sliding': {
    id: 'arch-window-sliding',
    name: 'Aluminium Glazed Sliding Window',
    icon: '🪟',
    category: 'furniture',
    dimensions: { width: 1.5, depth: 0.15, height: 1.4 },
    watts: 0,
    defaultPriceGHS: 1600,
    defaultPriceNGN: 84000,
    color: 0x2b2b2b,
    description: '1.5m wide glazed sliding window with integrated burglar proofing bars',
    isArchitectural: true,
    architecturalCategory: 'doors-windows',
  },
  'arch-window-casement': {
    id: 'arch-window-casement',
    name: 'Casement Architectural Window',
    icon: '🪟',
    category: 'furniture',
    dimensions: { width: 1.2, depth: 0.15, height: 1.4 },
    watts: 0,
    defaultPriceGHS: 1400,
    defaultPriceNGN: 73000,
    color: 0x333333,
    description: '1.2m twin casement side-hung window with tinted security glass',
    isArchitectural: true,
    architecturalCategory: 'doors-windows',
  },

  // ─── EXTERIOR & COMPOUND ──────────────────────────────────
  'arch-car-suv': {
    id: 'arch-car-suv',
    name: 'SUV / 4x4 Vehicle for Driveway',
    icon: '🚙',
    category: 'furniture',
    dimensions: { width: 2.0, depth: 4.8, height: 1.75 },
    watts: 0,
    defaultPriceGHS: 0,
    defaultPriceNGN: 0,
    color: 0x1a2332,
    description: 'Full-size SUV for compound scale and parking clearance testing',
    isArchitectural: true,
    architecturalCategory: 'outdoor',
  },
  'arch-car-sedan': {
    id: 'arch-car-sedan',
    name: 'Executive Sedan Car',
    icon: '🚗',
    category: 'furniture',
    dimensions: { width: 1.85, depth: 4.6, height: 1.48 },
    watts: 0,
    defaultPriceGHS: 0,
    defaultPriceNGN: 0,
    color: 0x3a3a3a,
    description: 'Sedan vehicle for garage and parking layout planning',
    isArchitectural: true,
    architecturalCategory: 'outdoor',
  },
  'arch-palm-tree': {
    id: 'arch-palm-tree',
    name: 'Tropical Royal Palm / Garden Tree',
    icon: '🌴',
    category: 'furniture',
    dimensions: { width: 1.5, depth: 1.5, height: 4.2 },
    watts: 0,
    defaultPriceGHS: 650,
    defaultPriceNGN: 34000,
    color: 0x2e5e32,
    description: 'Mature tropical palm tree for compound garden landscaping',
    isArchitectural: true,
    architecturalCategory: 'outdoor',
  },
  'arch-outdoor-patio': {
    id: 'arch-outdoor-patio',
    name: 'Outdoor Patio Table & Chairs',
    icon: '🏖️',
    category: 'furniture',
    dimensions: { width: 1.6, depth: 1.6, height: 0.8 },
    watts: 0,
    defaultPriceGHS: 2400,
    defaultPriceNGN: 125000,
    color: 0x52483d,
    description: 'Weather-resistant rattan outdoor table with 4 armchairs for porch or terrace',
    isArchitectural: true,
    architecturalCategory: 'outdoor',
  },
  'arch-gate-main': {
    id: 'arch-gate-main',
    name: 'Perimeter Main Entrance Gate',
    icon: '⛩️',
    category: 'furniture',
    dimensions: { width: 4.2, depth: 0.18, height: 2.3 },
    watts: 0,
    defaultPriceGHS: 8500,
    defaultPriceNGN: 445000,
    color: 0x1f1f20,
    description: '4.2m modern steel sliding compound gate with pedestrian wicket door',
    isArchitectural: true,
    architecturalCategory: 'outdoor',
  },
};

/**
 * Creates clean, lightweight architectural 3D procedural meshes for house elements
 */
export function createArchitectural3DModel(equipmentId: string): THREE.Group {
  const group = new THREE.Group();
  const def = ARCHITECTURAL_CATALOG[equipmentId];
  if (!def) return group;

  const w = def.dimensions.width;
  const d = def.dimensions.depth;
  const h = def.dimensions.height;

  switch (equipmentId) {
    // ─── KING / QUEEN BED ───
    case 'arch-bed-king':
    case 'arch-bed-queen': {
      // Base frame
      const frameGeo = new THREE.BoxGeometry(w, 0.25, d);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.7 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 0.125;
      group.add(frame);

      // Mattress
      const matGeo = new THREE.BoxGeometry(w * 0.96, 0.25, d * 0.96);
      const matMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.9 });
      const mattress = new THREE.Mesh(matGeo, matMat);
      mattress.position.y = 0.375;
      group.add(mattress);

      // Duvet fold
      const duvetGeo = new THREE.BoxGeometry(w * 0.98, 0.12, d * 0.7);
      const duvetMat = new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.85 });
      const duvet = new THREE.Mesh(duvetGeo, duvetMat);
      duvet.position.set(0, 0.52, d * 0.12);
      group.add(duvet);

      // Headboard
      const headGeo = new THREE.BoxGeometry(w, h, 0.12);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x322d28, roughness: 0.7 });
      const headboard = new THREE.Mesh(headGeo, headMat);
      headboard.position.set(0, h / 2, -d / 2 + 0.06);
      group.add(headboard);

      // Pillows (2 or 4)
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      [-w * 0.25, w * 0.25].forEach((px) => {
        const pillowGeo = new THREE.BoxGeometry(w * 0.38, 0.1, 0.45);
        const pillow = new THREE.Mesh(pillowGeo, pillowMat);
        pillow.position.set(px, 0.55, -d * 0.32);
        group.add(pillow);
      });
      break;
    }

    // ─── WARDROBE ───
    case 'arch-wardrobe': {
      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e2b27, roughness: 0.6 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = h / 2;
      group.add(body);

      // Sliding door handles / detail line
      const lineGeo = new THREE.BoxGeometry(0.02, h * 0.9, 0.02);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, h / 2, d / 2 + 0.01);
      group.add(line);
      break;
    }

    // ─── L-SHAPE SECTIONAL SOFA ───
    case 'arch-sofa-sectional': {
      const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.85 });
      // Main seating block
      const mainSeatGeo = new THREE.BoxGeometry(w, 0.42, 0.9);
      const mainSeat = new THREE.Mesh(mainSeatGeo, sofaMat);
      mainSeat.position.set(0, 0.21, -0.45);
      group.add(mainSeat);

      // Chaise lounge extension
      const chaiseGeo = new THREE.BoxGeometry(1.0, 0.42, d - 0.9);
      const chaise = new THREE.Mesh(chaiseGeo, sofaMat);
      chaise.position.set(-w / 2 + 0.5, 0.21, (d - 0.9) / 2);
      group.add(chaise);

      // Backrest
      const backGeo = new THREE.BoxGeometry(w, 0.45, 0.22);
      const back = new THREE.Mesh(backGeo, sofaMat);
      back.position.set(0, 0.62, -0.9 + 0.11);
      group.add(back);

      // Chaise side backrest
      const sideBackGeo = new THREE.BoxGeometry(0.22, 0.45, d);
      const sideBack = new THREE.Mesh(sideBackGeo, sofaMat);
      sideBack.position.set(-w / 2 + 0.11, 0.62, 0);
      group.add(sideBack);
      break;
    }

    // ─── 3-SEATER SOFA ───
    case 'arch-sofa-3seat': {
      const sofaMat = new THREE.MeshStandardMaterial({ color: 0x524f4b, roughness: 0.85 });
      // Seat
      const seatGeo = new THREE.BoxGeometry(w, 0.42, d);
      const seat = new THREE.Mesh(seatGeo, sofaMat);
      seat.position.y = 0.21;
      group.add(seat);

      // Backrest
      const backGeo = new THREE.BoxGeometry(w, 0.45, 0.2);
      const back = new THREE.Mesh(backGeo, sofaMat);
      back.position.set(0, 0.62, -d / 2 + 0.1);
      group.add(back);

      // Armrests
      [-w / 2 + 0.1, w / 2 - 0.1].forEach((ax) => {
        const armGeo = new THREE.BoxGeometry(0.2, 0.26, d);
        const arm = new THREE.Mesh(armGeo, sofaMat);
        arm.position.set(ax, 0.55, 0);
        group.add(arm);
      });
      break;
    }

    // ─── DINING TABLE ───
    case 'arch-dining-6seat':
    case 'arch-dining-8seat': {
      // Tabletop
      const topGeo = new THREE.BoxGeometry(w, 0.05, d);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 0.5 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = h - 0.025;
      group.add(top);

      // 4 Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
      const legPositions = [
        [-w / 2 + 0.08, -d / 2 + 0.08],
        [w / 2 - 0.08, -d / 2 + 0.08],
        [-w / 2 + 0.08, d / 2 - 0.08],
        [w / 2 - 0.08, d / 2 - 0.08],
      ];
      legPositions.forEach(([lx, lz]) => {
        const legGeo = new THREE.CylinderGeometry(0.035, 0.035, h - 0.05, 8);
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, (h - 0.05) / 2, lz);
        group.add(leg);
      });

      // Simplified chair indications
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x47423c, roughness: 0.7 });
      const chairSeats = [
        [-w * 0.3, -d * 0.7],
        [0, -d * 0.7],
        [w * 0.3, -d * 0.7],
        [-w * 0.3, d * 0.7],
        [0, d * 0.7],
        [w * 0.3, d * 0.7],
      ];
      chairSeats.forEach(([cx, cz]) => {
        const chairGeo = new THREE.BoxGeometry(0.42, 0.45, 0.42);
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(cx, 0.225, cz);
        group.add(chair);
      });
      break;
    }

    // ─── KITCHEN COUNTER & ISLAND ───
    case 'arch-kitchen-counter':
    case 'arch-kitchen-island': {
      // Counter body
      const bodyGeo = new THREE.BoxGeometry(w, h - 0.04, d);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x212326, roughness: 0.7 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = (h - 0.04) / 2;
      group.add(body);

      // Quartz top
      const topGeo = new THREE.BoxGeometry(w * 1.02, 0.04, d * 1.02);
      const topMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.3 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = h - 0.02;
      group.add(top);

      // Sink indication
      const sinkGeo = new THREE.BoxGeometry(w * 0.3, 0.01, d * 0.4);
      const sinkMat = new THREE.MeshStandardMaterial({ color: 0x9fa4aa, metalness: 0.9, roughness: 0.2 });
      const sink = new THREE.Mesh(sinkGeo, sinkMat);
      sink.position.set(-w * 0.25, h + 0.005, 0);
      group.add(sink);
      break;
    }

    // ─── REFRIGERATOR ───
    case 'arch-refrigerator': {
      const fridgeGeo = new THREE.BoxGeometry(w, h, d);
      const fridgeMat = new THREE.MeshStandardMaterial({ color: 0x82878d, metalness: 0.6, roughness: 0.3 });
      const fridge = new THREE.Mesh(fridgeGeo, fridgeMat);
      fridge.position.y = h / 2;
      group.add(fridge);

      // Door split line
      const splitGeo = new THREE.BoxGeometry(0.01, h * 0.95, 0.01);
      const splitMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const split = new THREE.Mesh(splitGeo, splitMat);
      split.position.set(0, h / 2, d / 2 + 0.01);
      group.add(split);
      break;
    }

    // ─── TOILET WC ───
    case 'arch-toilet': {
      const bowlGeo = new THREE.BoxGeometry(w, 0.42, d * 0.65);
      const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const bowl = new THREE.Mesh(bowlGeo, ceramicMat);
      bowl.position.set(0, 0.21, d * 0.15);
      group.add(bowl);

      // Cistern tank
      const tankGeo = new THREE.BoxGeometry(w * 0.95, h - 0.42, d * 0.35);
      const tank = new THREE.Mesh(tankGeo, ceramicMat);
      tank.position.set(0, 0.42 + (h - 0.42) / 2, -d * 0.32);
      group.add(tank);
      break;
    }

    // ─── SHOWER ───
    case 'arch-shower': {
      // Tray
      const trayGeo = new THREE.BoxGeometry(w, 0.06, d);
      const trayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const tray = new THREE.Mesh(trayGeo, trayMat);
      tray.position.y = 0.03;
      group.add(tray);

      // Glass enclosure panels
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xcde5ed,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        transmission: 0.9,
      });
      const glassGeo1 = new THREE.BoxGeometry(w, h - 0.06, 0.02);
      const glass1 = new THREE.Mesh(glassGeo1, glassMat);
      glass1.position.set(0, h / 2, d / 2);
      group.add(glass1);

      const glassGeo2 = new THREE.BoxGeometry(0.02, h - 0.06, d);
      const glass2 = new THREE.Mesh(glassGeo2, glassMat);
      glass2.position.set(w / 2, h / 2, 0);
      group.add(glass2);
      break;
    }

    // ─── VANITY BASIN ───
    case 'arch-vanity': {
      const cabinetGeo = new THREE.BoxGeometry(w, 0.85, d);
      const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x423d37, roughness: 0.7 });
      const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
      cabinet.position.y = 0.425;
      group.add(cabinet);

      // Basin
      const basinGeo = new THREE.BoxGeometry(w * 0.6, 0.14, d * 0.7);
      const basinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.set(0, 0.85 + 0.07, 0);
      group.add(basin);

      // Wall Mirror
      const mirrorGeo = new THREE.BoxGeometry(w * 0.8, 0.8, 0.03);
      const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe0e6eb, metalness: 0.95, roughness: 0.05 });
      const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
      mirror.position.set(0, 1.4, -d / 2 + 0.02);
      group.add(mirror);
      break;
    }

    // ─── SUV / 4X4 VEHICLE ───
    case 'arch-car-suv': {
      const carMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.3 });
      // Lower body
      const bodyGeo = new THREE.BoxGeometry(w, h * 0.48, d);
      const body = new THREE.Mesh(bodyGeo, carMat);
      body.position.y = h * 0.35;
      group.add(body);

      // Cabin / Roof
      const cabinGeo = new THREE.BoxGeometry(w * 0.88, h * 0.42, d * 0.58);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.2 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, h * 0.75, -d * 0.05);
      group.add(cabin);

      // 4 Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      [
        [-w / 2, -d * 0.32],
        [w / 2, -d * 0.32],
        [-w / 2, d * 0.32],
        [w / 2, d * 0.32],
      ].forEach(([wx, wz]) => {
        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 12);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, 0.38, wz);
        group.add(wheel);
      });
      break;
    }

    // ─── SEDAN CAR ───
    case 'arch-car-sedan': {
      const carMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, roughness: 0.3 });
      const bodyGeo = new THREE.BoxGeometry(w, h * 0.45, d);
      const body = new THREE.Mesh(bodyGeo, carMat);
      body.position.y = h * 0.32;
      group.add(body);

      const cabinGeo = new THREE.BoxGeometry(w * 0.85, h * 0.4, d * 0.52);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, h * 0.7, -d * 0.02);
      group.add(cabin);
      break;
    }

    // ─── TROPICAL PALM TREE ───
    case 'arch-palm-tree': {
      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, h * 0.75, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4d3c, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = (h * 0.75) / 2;
      group.add(trunk);

      // Palm fronds crown
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x226b28, roughness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const frondGeo = new THREE.BoxGeometry(0.25, 0.04, 1.4);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.position.set(Math.sin(angle) * 0.6, h * 0.75, Math.cos(angle) * 0.6);
        frond.rotation.y = angle;
        frond.rotation.x = 0.35;
        group.add(frond);
      }
      break;
    }

    // ─── DOORS (SINGLE, DOUBLE, SLIDING) ───
    case 'arch-door-single':
    case 'arch-door-double':
    case 'arch-door-sliding': {
      const doorGeo = new THREE.BoxGeometry(w, h, 0.08);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.y = h / 2;
      group.add(door);

      // Handle
      const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(w * 0.35, 1.0, 0.06);
      group.add(handle);
      break;
    }

    // ─── WINDOWS ───
    case 'arch-window-sliding':
    case 'arch-window-casement': {
      const frameGeo = new THREE.BoxGeometry(w, h, 0.08);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = h / 2 + 0.9; // Window sill at 0.9m
      group.add(frame);

      // Glass pane
      const glassGeo = new THREE.BoxGeometry(w * 0.9, h * 0.88, 0.02);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xb4d2e7,
        transparent: true,
        opacity: 0.5,
        transmission: 0.85,
        roughness: 0.1,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, h / 2 + 0.9, 0);
      group.add(glass);
      break;
    }

    // Default fallback box
    default: {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x888888, roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      group.add(mesh);
    }
  }

  return group;
}
