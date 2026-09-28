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
  greeneryId?: string;
  greeneryIds: string[];
  flowerIds: string[];
}

export const BOUQUET_PRESETS: BouquetPreset[] = [
  // ── Big Flowers Presets (Pick 2 to 3 Statement Blooms · TWO Sets of Foliage) ──
  {
    id: 'tulip-trio',
    name: 'Velvet Trio (Big)',
    tagline: 'Ruby tulip, velvet rose & stargazer lily cradled by lush foliage & forest fern',
    type: 'big',
    greeneryIds: ['net-leafy', 'net-fern'],
    flowerIds: ['net-tulip', 'net-rose', 'net-lily'],
  },
  {
    id: 'grand-elegance',
    name: 'Grand Elegance (Big)',
    tagline: 'Stately ruby tulips, stargazer lilies & royal orchids with weeping willow',
    type: 'big',
    greeneryIds: ['net-willow', 'net-eucalyptus'],
    flowerIds: ['net-tulip', 'net-lily', 'net-orchid'],
  },
  {
    id: 'pure-serenity',
    name: 'Pure Serenity (Big)',
    tagline: 'Sacred lotus & classic camellia duo framed by eucalyptus',
    type: 'big',
    greeneryIds: ['net-eucalyptus', 'net-leafy'],
    flowerIds: ['net-lotus', 'net-camellia'],
  },
  {
    id: 'royal-meadow',
    name: 'Royal Meadow (Big)',
    tagline: 'Velvet rose, imperial peony & meadow daisy with rich garden greenery',
    type: 'big',
    greeneryIds: ['net-leafy', 'net-willow'],
    flowerIds: ['net-rose', 'net-peony', 'net-daisy'],
  },

  // ── Small Flowers Presets (Pick 3 to 10 Petite Blooms · ONE Clean Backdrop) ──
  {
    id: 'sunset-radiance',
    name: 'Sunset Radiance (Small)',
    tagline: 'Warm golden sunflowers, coral daisies & blush peonies',
    type: 'small',
    greeneryIds: ['fern-fan'],
    flowerIds: ['sunflower-golden', 'peony-blush', 'african-daisy-coral', 'rose-pink', 'carnation-blush'],
  },
  {
    id: 'wildflower-meadow',
    name: 'Wildflower Meadow (Small)',
    tagline: 'Lush countryside daisies, sunflowers & ranunculus',
    type: 'small',
    greeneryIds: ['curled-frond'],
    flowerIds: ['daisy-cream', 'sunflower-golden', 'ranunculus-blush', 'rose-pink', 'carnation-blush', 'tulip-rose'],
  },
  {
    id: 'secret-garden',
    name: 'Secret Garden (Small)',
    tagline: '7-bloom royal cottage garden bunch with every flower visible',
    type: 'small',
    greeneryIds: ['fern-illustration'],
    flowerIds: ['peony-blush', 'rose-pink', 'sunflower-golden', 'camellia-pink', 'carnation-blush', 'lily-ivory', 'lotus-blush'],
  },
  {
    id: 'spring-cottage',
    name: 'Spring Cottage (Small)',
    tagline: 'Grand 9-bloom cottage garden arrangement',
    type: 'small',
    greeneryIds: ['fern-fan'],
    flowerIds: ['rose-pink', 'sunflower-golden', 'peony-blush', 'ranunculus-blush', 'carnation-blush', 'camellia-pink', 'african-daisy-coral', 'daisy-cream', 'tulip-rose'],
  },
];

// ── Greenery Layout Configuration per Asset ──
// Calibrated so each greenery appears as one single, balanced botanical backdrop
// perfectly proportioned to the flowers without giant overwhelming foliage bushes.
export interface GreeneryLayoutConfig {
  scale: number;
  yPercent: number;
  rotationDeg?: number;
}

export const GREENERY_CONFIGS: Record<string, GreeneryLayoutConfig> = {
  // Petite Greenery (For Small Flowers - delicate framing backdrop)
  'fern-illustration': { scale: 1.15, yPercent: -2 },
  'fern-fan': { scale: 1.16, yPercent: -3 },
  'curled-frond': { scale: 1.16, yPercent: -3 },
  'olive-spray': { scale: 1.12, yPercent: -2 },
  'berry-branch': { scale: 1.12, yPercent: -2 },
  'berry-spray': { scale: 1.12, yPercent: -2 },

  // Grand Greenery (For Big Flowers - majestic, lush, and prominent)
  'net-leafy': { scale: 1.50, yPercent: -4 },
  'net-eucalyptus': { scale: 1.52, yPercent: -4 },
  'net-willow': { scale: 1.52, yPercent: -5 },
  'net-fern': { scale: 1.50, yPercent: -4 },
};

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

  const minAllowed = isBigCollection ? 2 : 3;
  const maxAllowed = isBigCollection ? 3 : 10;
  const activeFlowers = validFlowers.slice(0, maxAllowed);

  if (activeFlowers.length < minAllowed) {
    const defaults = isBigCollection
      ? ['net-rose', 'net-tulip', 'net-lily']
      : ['rose-pink', 'sunflower-golden', 'peony-blush'];
    for (const defId of defaults) {
      if (activeFlowers.length >= minAllowed) break;
      const found = FLOWERS.find(f => f.id === defId);
      if (found && !activeFlowers.some(f => f.id === found.id)) {
        activeFlowers.push(found);
      }
    }
  }

  // 2. GREENERY:
  // For Big Flowers: TWO (2) sets of greenery (e.g. Lush Foliage + Forest Fern), fanning out harmoniously
  // For Small Flowers: Exactly ONE (1) clean, delicate backdrop (e.g. Woodland Fern)
  const activeGreenery = selectedGreeneryIds
    .map(id => GREENERY.find(g => g.id === id))
    .filter((g): g is BotanicalItem => !!g);

  const greeneryLayers: ArrangedElement[] = [];

  if (isBigCollection) {
    const primaryG = activeGreenery[0] || GREENERY.find(g => g.id === 'net-leafy') || GREENERY[0];
    const secondaryG = activeGreenery[1] || primaryG;

    const cfg1 = GREENERY_CONFIGS[primaryG.id] || { scale: 1.40, yPercent: -4 };
    const cfg2 = GREENERY_CONFIGS[secondaryG.id] || { scale: 1.35, yPercent: 2 };

    greeneryLayers.push(
      // Greenery Set 1: Upper Right branch
      {
        id: `${primaryG.id}-set-1`,
        item: primaryG,
        xPercent: 12,
        yPercent: cfg1.yPercent - 3,
        rotationDeg: 14,
        scale: cfg1.scale,
        zIndex: 1,
      },
      // Greenery Set 2: Lower Left cradle branch
      {
        id: `${secondaryG.id}-set-2`,
        item: secondaryG,
        xPercent: -12,
        yPercent: cfg2.yPercent + 4,
        rotationDeg: -16,
        scale: Math.round(cfg2.scale * 0.95 * 100) / 100,
        zIndex: 2,
      }
    );
  } else {
    const primaryG = activeGreenery[0] || GREENERY.find(g => g.id === 'fern-illustration') || GREENERY[0];
    const cfg = GREENERY_CONFIGS[primaryG.id] || { scale: 1.45, yPercent: -4 };

    greeneryLayers.push({
      id: `${primaryG.id}-backdrop`,
      item: primaryG,
      xPercent: 0,
      yPercent: cfg.yPercent,
      rotationDeg: cfg.rotationDeg || 0,
      scale: cfg.scale,
      zIndex: 1,
    });
  }

  // 3. FLOWER SLOTS:
  // Big Flowers: Maintained as the user requested (nice 2-column florist dome, spacious with elegant overlap)
  // Small Flowers: Brought closer together into a tighter, snugger bouquet bunch (strictly <= 30% overlap)
  const flowerLayers: ArrangedElement[] = [];
  const fCount = activeFlowers.length;

  // ── A. BIG FLOWERS SLOTS (Min 2 · Max 3 Statement Blooms with Wide Balanced Spacing) ──
  const bigSlotLayouts: Record<number, Array<{ x: number; y: number; rot: number; z: number }>> = {
    2: [
      { x: -12, y: -5, rot: -7, z: 10 },
      { x: 12, y: 7, rot: 7, z: 12 },
    ],
    3: [
      { x: 0, y: -13, rot: 0, z: 10 },
      { x: -16, y: 9, rot: -10, z: 12 },
      { x: 16, y: 9, rot: 10, z: 12 },
    ],
  };

  // ── B. SMALL FLOWERS SLOTS (Max 10 · Brought together much more, strictly <= 30% overlap) ──
  const smallSlotLayouts: Record<number, Array<{ x: number; y: number; rot: number; z: number }>> = {
    3: [
      { x: 0, y: -5, rot: 0, z: 10 },
      { x: -6, y: 4, rot: -5, z: 12 },
      { x: 6, y: 4, rot: 5, z: 12 },
    ],
    4: [
      { x: -5.5, y: -5.5, rot: -4, z: 10 },
      { x: 5.5, y: -5.5, rot: 4, z: 10 },
      { x: -5.5, y: 5.5, rot: -4, z: 12 },
      { x: 5.5, y: 5.5, rot: 4, z: 12 },
    ],
    5: [
      { x: -6, y: -6.5, rot: -4, z: 10 },
      { x: 6, y: -6.5, rot: 4, z: 10 },
      { x: 0, y: 0, rot: 0, z: 11 },
      { x: -6, y: 6.5, rot: -4, z: 13 },
      { x: 6, y: 6.5, rot: 4, z: 13 },
    ],
    6: [
      { x: -6, y: -9, rot: -4, z: 10 },
      { x: 6, y: -9, rot: 4, z: 10 },
      { x: -7, y: 0, rot: -3, z: 11 },
      { x: 7, y: 0, rot: 3, z: 11 },
      { x: -6, y: 9, rot: -4, z: 13 },
      { x: 6, y: 9, rot: 4, z: 13 },
    ],
    7: [
      { x: 0, y: -9, rot: 0, z: 10 },
      { x: -7, y: -4, rot: -4, z: 11 },
      { x: 7, y: -4, rot: 4, z: 11 },
      { x: 0, y: 1, rot: 0, z: 12 },
      { x: -7, y: 6, rot: -4, z: 13 },
      { x: 7, y: 6, rot: 4, z: 13 },
      { x: 0, y: 11, rot: 0, z: 14 },
    ],
    8: [
      { x: -6, y: -9, rot: -4, z: 10 },
      { x: 6, y: -9, rot: 4, z: 10 },
      { x: -8, y: -3, rot: -5, z: 11 },
      { x: 0, y: -3, rot: 0, z: 11 },
      { x: 8, y: -3, rot: 5, z: 11 },
      { x: -6, y: 5, rot: -4, z: 12 },
      { x: 6, y: 5, rot: 4, z: 12 },
      { x: 0, y: 11, rot: 0, z: 14 },
    ],
    9: [
      { x: -6.5, y: -9, rot: -4, z: 10 },
      { x: 0, y: -10, rot: 0, z: 10 },
      { x: 6.5, y: -9, rot: 4, z: 10 },
      { x: -7.5, y: -1, rot: -5, z: 11 },
      { x: 0, y: 0, rot: 0, z: 12 },
      { x: 7.5, y: -1, rot: 5, z: 11 },
      { x: -6.5, y: 8, rot: -4, z: 13 },
      { x: 0, y: 9, rot: 0, z: 14 },
      { x: 6.5, y: 8, rot: 4, z: 13 },
    ],
    10: [
      { x: -4.5, y: -11, rot: -3, z: 10 },
      { x: 4.5, y: -11, rot: 3, z: 10 },
      { x: -8, y: -5, rot: -5, z: 11 },
      { x: 0, y: -5.5, rot: 0, z: 11 },
      { x: 8, y: -5, rot: 5, z: 11 },
      { x: -7.5, y: 2, rot: -4, z: 12 },
      { x: 7.5, y: 2, rot: 4, z: 12 },
      { x: -5.5, y: 8, rot: -3, z: 13 },
      { x: 0, y: 9, rot: 0, z: 14 },
      { x: 5.5, y: 8, rot: 3, z: 13 },
    ],
  };

  const activeSlotTable = isBigCollection ? bigSlotLayouts : smallSlotLayouts;
  const currentSlots = activeSlotTable[fCount] || activeSlotTable[Math.min(maxAllowed, Math.max(minAllowed, fCount))];

  // Shuffle slot assignments using the PRNG so clicking SHUFFLE physically swaps bloom locations!
  const slotIndices = activeFlowers.map((_, i) => i);
  for (let i = slotIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = slotIndices[i];
    slotIndices[i] = slotIndices[j];
    slotIndices[j] = temp;
  }

  activeFlowers.forEach((item, originalIdx) => {
    const assignedSlotIdx = slotIndices[originalIdx];
    const slot = currentSlots[assignedSlotIdx] || {
      x: rand() * 12 - 6,
      y: rand() * 12 - 6,
      rot: rand() * 8 - 4,
      z: 10 + originalIdx,
    };

    // Noticeable physical variation on shuffle
    const jiggleX = rand() * 3.0 - 1.5;
    const jiggleY = rand() * 3.0 - 1.5;
    const jiggleRot = rand() * 14 - 7;
    const jiggleScale = rand() * 0.08 - 0.04;

    const visualScale = (FLOWER_VISUAL_SCALES[item.id] ?? 1.0) + jiggleScale;

    flowerLayers.push({
      id: `${item.id}-${originalIdx}`,
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
