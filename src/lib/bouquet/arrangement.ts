import { FLOWERS, GREENERY, BotanicalItem } from './constants';

export interface ArrangedElement {
  id: string;
  item: BotanicalItem;
  xPercent: number;    // % offset from center of canvas (-50 to 50)
  yPercent: number;    // % offset from center of canvas (-50 to 50)
  rotationDeg: number; // -35 to 35
  scale: number;       // Visual scale normalization so all blooms appear EQUAL size
  zIndex: number;
}

export interface BouquetArrangement {
  greeneryLayers: ArrangedElement[];
  flowerLayers: ArrangedElement[];
  seed: number;
  collectionType: 'big' | 'small';
}

// Measured Visual scale normalizer: balances source asset padding so all flowers in their group have EQUAL diameter
export const FLOWER_VISUAL_SCALES: Record<string, number> = {
  // ── Small Flowers Normalization (Target visible diameter: ~80-96px) ──
  'rose-pink': 1.05,
  'sunflower-golden': 1.00,
  'peony-blush': 0.95,
  'ranunculus-blush': 1.00,
  'carnation-blush': 1.05,
  'camellia-pink': 1.00,
  'african-daisy-coral': 1.05,
  'daisy-cream': 1.05,
  'tulip-rose': 1.00,
  'lily-ivory': 1.00,
  'orchid-lilac': 1.05,
  'lotus-blush': 1.00,

  // ── Big Flowers Normalization (Target visible diameter: ~115-128px) ──
  'net-rose': 1.00,
  'net-peony': 1.00,
  'net-camellia': 1.00,
  'net-daisy': 1.00,
  'net-tulip': 1.05,
  'net-lily': 1.05,
  'net-orchid': 1.05,
  'net-lotus': 1.00,
};

// Curated floral presets of combinations that look breathtaking together
export interface BouquetPreset {
  id: string;
  name: string;
  tagline: string;
  type: 'big' | 'small';
  greeneryId: string;
  flowerIds: string[];
}

export const BOUQUET_PRESETS: BouquetPreset[] = [
  // ── Big Flowers Presets (Pick 3 to 5 Statement Blooms) ──
  {
    id: 'grand-elegance',
    name: 'Grand Elegance (Big)',
    tagline: 'Stately ruby tulips, stargazer lilies & royal orchids',
    type: 'big',
    greeneryId: 'fern-fan',
    flowerIds: ['net-tulip', 'net-lily', 'net-orchid', 'net-lotus', 'net-peony'],
  },
  {
    id: 'pure-serenity',
    name: 'Pure Serenity (Big)',
    tagline: 'Sacred lotus, stargazer lilies & classic camellias',
    type: 'big',
    greeneryId: 'olive-spray',
    flowerIds: ['net-lotus', 'net-lily', 'net-orchid', 'net-camellia'],
  },
  {
    id: 'tulip-trio',
    name: 'Velvet Trio (Big)',
    tagline: 'Ruby tulip, velvet rose & stargazer lily',
    type: 'big',
    greeneryId: 'fern-illustration',
    flowerIds: ['net-tulip', 'net-rose', 'net-lily'],
  },
  {
    id: 'royal-meadow',
    name: 'Royal Meadow (Big)',
    tagline: 'Velvet rose, imperial peony & meadow daisy',
    type: 'big',
    greeneryId: 'net-leafy',
    flowerIds: ['net-rose', 'net-orchid', 'net-peony', 'net-daisy'],
  },

  // ── Small Flowers Presets (Pick 3 to 10 Petite Blooms) ──
  {
    id: 'sunset-radiance',
    name: 'Sunset Radiance (Small)',
    tagline: 'Warm golden sunflowers, coral daisies & blush peonies',
    type: 'small',
    greeneryId: 'fern-fan',
    flowerIds: ['sunflower-golden', 'peony-blush', 'african-daisy-coral', 'rose-pink', 'carnation-blush'],
  },
  {
    id: 'wildflower-meadow',
    name: 'Wildflower Meadow (Small)',
    tagline: 'Lush countryside daisies, sunflowers & ranunculus',
    type: 'small',
    greeneryId: 'curled-frond',
    flowerIds: ['daisy-cream', 'sunflower-golden', 'ranunculus-blush', 'rose-pink', 'carnation-blush', 'tulip-rose'],
  },
  {
    id: 'secret-garden',
    name: 'Secret Garden (Small)',
    tagline: '7-bloom royal cottage garden bunch with every flower visible',
    type: 'small',
    greeneryId: 'fern-illustration',
    flowerIds: ['peony-blush', 'rose-pink', 'sunflower-golden', 'camellia-pink', 'carnation-blush', 'lily-ivory', 'lotus-blush'],
  },
  {
    id: 'spring-cottage',
    name: 'Spring Cottage (Small)',
    tagline: 'Grand 9-bloom cottage garden arrangement',
    type: 'small',
    greeneryId: 'fern-fan',
    flowerIds: ['rose-pink', 'sunflower-golden', 'peony-blush', 'ranunculus-blush', 'carnation-blush', 'camellia-pink', 'african-daisy-coral', 'daisy-cream', 'tulip-rose'],
  },
];

// Simple deterministic PRNG based on Mulberry32
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateBouquetArrangement(
  selectedFlowerIds: string[],
  selectedGreeneryIds: string[],
  seed: number = 42
): BouquetArrangement {
  const rand = mulberry32(seed);

  // 1. Determine collection type: 'big' or 'small'
  const activeItems = selectedFlowerIds
    .map(id => FLOWERS.find(f => f.id === id))
    .filter((f): f is BotanicalItem => !!f);

  const bigCount = activeItems.filter(f => f.flowerSize === 'big').length;
  const isBigCollection = bigCount > 0 && bigCount >= activeItems.filter(f => f.flowerSize === 'small').length;
  const collectionType: 'big' | 'small' = isBigCollection ? 'big' : 'small';

  // STRICT RULE: Big flowers and Small flowers can NEVER be seen together!
  // Filter activeFlowers to ONLY contain flowers of collectionType:
  const validFlowers = activeItems.filter(f => f.flowerSize === collectionType);

  const maxAllowed = isBigCollection ? 5 : 10;
  const activeFlowers = validFlowers.slice(0, maxAllowed);

  if (activeFlowers.length < 3) {
    const defaults = isBigCollection
      ? ['net-rose', 'net-tulip', 'net-lily']
      : ['rose-pink', 'sunflower-golden', 'peony-blush'];
    for (const defId of defaults) {
      if (activeFlowers.length >= 3) break;
      const found = FLOWERS.find(f => f.id === defId);
      if (found && !activeFlowers.some(f => f.id === found.id)) {
        activeFlowers.push(found);
      }
    }
  }

  // 2. GREENERY:
  // For Big Flowers: User specified 2 or 3 greenery layers so greenery encapsulates the big blooms!
  // For Small Flowers: 1 grand encapsulating garden cradle.
  const activeGreenery = selectedGreeneryIds
    .map(id => GREENERY.find(g => g.id === id))
    .filter((g): g is BotanicalItem => !!g);

  const primaryGreenery = activeGreenery[0] || GREENERY.find(g => g.id === 'fern-fan') || GREENERY[0];
  const greeneryLayers: ArrangedElement[] = [];

  if (isBigCollection) {
    // 2-3 Lush Greenery layers for Big Flowers
    const wingLeft = activeGreenery[1] || GREENERY.find(g => g.id === 'fern-illustration') || primaryGreenery;
    const wingRight = activeGreenery[2] || GREENERY.find(g => g.id === 'olive-spray') || primaryGreenery;

    greeneryLayers.push(
      {
        id: `${primaryGreenery.id}-center`,
        item: primaryGreenery,
        xPercent: 0,
        yPercent: -4,
        rotationDeg: 0,
        scale: 1.52,
        zIndex: 1,
      },
      {
        id: `${wingLeft.id}-wing-left`,
        item: wingLeft,
        xPercent: -20,
        yPercent: -2,
        rotationDeg: -22,
        scale: 1.35,
        zIndex: 2,
      },
      {
        id: `${wingRight.id}-wing-right`,
        item: wingRight,
        xPercent: 20,
        yPercent: -2,
        rotationDeg: 22,
        scale: 1.35,
        zIndex: 3,
      }
    );
  } else {
    // 1 Grand foliage backdrop for Small Flowers
    greeneryLayers.push({
      id: `${primaryGreenery.id}-main`,
      item: primaryGreenery,
      xPercent: 0,
      yPercent: 0,
      rotationDeg: 0,
      scale: 1.38,
      zIndex: 1,
    });

    if (activeGreenery.length > 1) {
      greeneryLayers.push({
        id: `${activeGreenery[1].id}-accent-left`,
        item: activeGreenery[1],
        xPercent: -12,
        yPercent: -2,
        rotationDeg: -15,
        scale: 1.1,
        zIndex: 2,
      });
    }
  }

  // 3. FLOWER SLOTS: Unified florist bouquet dome nestled right in the greenery!
  const flowerLayers: ArrangedElement[] = [];
  const fCount = activeFlowers.length;

  // ── A. BIG FLOWERS SLOTS (Max 5 · Spacious, yet cohesive florist bunch) ──
  const bigSlotLayouts: Record<number, Array<{ x: number; y: number; rot: number; z: number }>> = {
    3: [
      { x: 0, y: -7, rot: 0, z: 10 },
      { x: -9, y: 6, rot: -8, z: 12 },
      { x: 9, y: 6, rot: 8, z: 12 },
    ],
    4: [
      { x: 0, y: -9, rot: 0, z: 10 },
      { x: -10, y: 0, rot: -8, z: 11 },
      { x: 10, y: 0, rot: 8, z: 11 },
      { x: 0, y: 9, rot: 0, z: 13 },
    ],
    5: [
      { x: -8, y: -8, rot: -8, z: 10 },
      { x: 8, y: -8, rot: 8, z: 10 },
      { x: 0, y: 0, rot: 0, z: 14 },
      { x: -9, y: 8, rot: -7, z: 12 },
      { x: 9, y: 8, rot: 7, z: 12 },
    ],
  };

  // ── B. SMALL FLOWERS SLOTS (Max 10 · Snug, cohesive florist bunch) ──
  const smallSlotLayouts: Record<number, Array<{ x: number; y: number; rot: number; z: number }>> = {
    3: [
      { x: 0, y: -6, rot: 0, z: 10 },
      { x: -7, y: 5, rot: -7, z: 12 },
      { x: 7, y: 5, rot: 7, z: 12 },
    ],
    4: [
      { x: 0, y: -8, rot: 0, z: 10 },
      { x: -8, y: 0, rot: -7, z: 11 },
      { x: 8, y: 0, rot: 7, z: 11 },
      { x: 0, y: 8, rot: 0, z: 13 },
    ],
    5: [
      { x: -7, y: -7, rot: -7, z: 10 },
      { x: 7, y: -7, rot: 7, z: 10 },
      { x: 0, y: 1, rot: 0, z: 14 },
      { x: -8, y: 8, rot: -6, z: 12 },
      { x: 8, y: 8, rot: 6, z: 12 },
    ],
    6: [
      { x: 0, y: -10, rot: 0, z: 10 },
      { x: -8, y: -4, rot: -7, z: 11 },
      { x: 8, y: -4, rot: 7, z: 11 },
      { x: -8, y: 6, rot: -6, z: 12 },
      { x: 8, y: 6, rot: 6, z: 12 },
      { x: 0, y: 12, rot: 0, z: 14 },
    ],
    7: [
      { x: 0, y: -11, rot: 0, z: 10 },
      { x: -8, y: -5, rot: -7, z: 11 },
      { x: 8, y: -5, rot: 7, z: 11 },
      { x: 0, y: 1, rot: 0, z: 13 },
      { x: -9, y: 8, rot: -6, z: 12 },
      { x: 9, y: 8, rot: 6, z: 12 },
      { x: 0, y: 14, rot: 0, z: 15 },
    ],
    8: [
      { x: -6, y: -12, rot: -6, z: 10 },
      { x: 6, y: -12, rot: 6, z: 10 },
      { x: -11, y: -4, rot: -9, z: 11 },
      { x: 0, y: -2, rot: 0, z: 13 },
      { x: 11, y: -4, rot: 9, z: 11 },
      { x: -8, y: 7, rot: -6, z: 12 },
      { x: 8, y: 7, rot: 6, z: 12 },
      { x: 0, y: 14, rot: 0, z: 15 },
    ],
    9: [
      { x: 0, y: -13, rot: 0, z: 10 },
      { x: -8, y: -7, rot: -6, z: 10 },
      { x: 8, y: -7, rot: 6, z: 10 },
      { x: -12, y: 0, rot: -9, z: 11 },
      { x: 0, y: 0, rot: 0, z: 13 },
      { x: 12, y: 0, rot: 9, z: 11 },
      { x: -8, y: 8, rot: -6, z: 12 },
      { x: 8, y: 8, rot: 6, z: 12 },
      { x: 0, y: 15, rot: 0, z: 15 },
    ],
    10: [
      { x: -6, y: -14, rot: -6, z: 10 },
      { x: 6, y: -14, rot: 6, z: 10 },
      { x: -11, y: -7, rot: -9, z: 11 },
      { x: 0, y: -6, rot: 0, z: 11 },
      { x: 11, y: -7, rot: 9, z: 11 },
      { x: -10, y: 1, rot: -7, z: 12 },
      { x: 10, y: 1, rot: 7, z: 12 },
      { x: -7, y: 9, rot: -6, z: 13 },
      { x: 0, y: 10, rot: 0, z: 14 },
      { x: 7, y: 9, rot: 6, z: 13 },
    ],
  };

  const activeSlotTable = isBigCollection ? bigSlotLayouts : smallSlotLayouts;
  const currentSlots = activeSlotTable[fCount] || activeSlotTable[Math.min(maxAllowed, Math.max(3, fCount))];

  activeFlowers.forEach((item, idx) => {
    const slot = currentSlots[idx] || {
      x: (rand() * 12 - 6),
      y: (rand() * 12 - 6),
      rot: (rand() * 8 - 4),
      z: 10 + idx,
    };

    const jiggleX = (rand() * 0.4 - 0.2);
    const jiggleY = (rand() * 0.4 - 0.2);
    const jiggleRot = (rand() * 2 - 1);

    const visualScale = FLOWER_VISUAL_SCALES[item.id] ?? 1.0;

    flowerLayers.push({
      id: `${item.id}-${idx}`,
      item,
      xPercent: Math.round((slot.x + jiggleX) * 10) / 10,
      yPercent: Math.round((slot.y + jiggleY) * 10) / 10,
      rotationDeg: Math.round(slot.rot + jiggleRot),
      scale: Math.round(visualScale * 100) / 100,
      zIndex: slot.z,
    });
  });

  return {
    greeneryLayers,
    flowerLayers,
    seed,
    collectionType,
  };
}
