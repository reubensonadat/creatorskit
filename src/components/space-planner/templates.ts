import type { CreatorTemplate, CreatorTemplateId } from './types';

// ============================================================
// 9 Realistic Creator Studio Templates
// Real-world equipment placement, accurate room dimensions,
// lighting key/fill angles, acoustic treatment, and tabletop stacking.
// Coordinates are relative to room center (0,0)
// ============================================================

import { STANDARD_PLOT_PRESETS } from '@/lib/space-planner/construction-calculator';

export const CREATOR_TEMPLATES: Record<CreatorTemplateId, CreatorTemplate> = {
  // ─── MODERN HOUSE ARCHITECTURE PRESETS (GHANA & WEST AFRICA) ───

  'preset-3bed-bungalow': {
    id: 'preset-3bed-bungalow',
    name: 'Modern 3-Bedroom 3-Bathroom Luxury Bungalow',
    icon: '🏡',
    category: 'Modern Homes (Ghana)',
    description: 'Signature tropical contemporary home with hidden parapet roof, master suite with walk-in closet, 2 ensuite guest bedrooms, living hall, dining, fitted kitchen, front porch, and paved compound on a 100\'×80\' plot.',
    defaultRoom: { width: 16.0, depth: 14.0 },
    plotConfig: STANDARD_PLOT_PRESETS['100x80'],
    roofConfig: {
      type: 'hidden-parapet',
      visible: true,
      parapetHeightM: 0.8,
      pitchDegrees: 12,
      material: 'aluzinc',
      colorHex: '#3a3f44',
    },
    hasFirstFloor: false,
    roomZones: [
      { id: 'rm-master', name: 'Master Suite', type: 'master-suite', x: -4.8, z: -3.8, width: 5.2, depth: 4.6, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'rm-master-bath', name: 'Master Ensuite', type: 'bathroom', x: -5.8, z: -0.6, width: 2.8, depth: 2.0, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'rm-bed2', name: 'Bedroom 2', type: 'bedroom', x: 4.8, z: -3.8, width: 4.4, depth: 4.0, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'rm-bed2-bath', name: 'Ensuite 2', type: 'bathroom', x: 5.6, z: -0.8, width: 2.4, depth: 1.8, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'rm-bed3', name: 'Bedroom 3', type: 'bedroom', x: 4.8, z: 2.6, width: 4.4, depth: 3.8, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'rm-guest-bath', name: 'Guest Washroom', type: 'bathroom', x: 5.6, z: 5.4, width: 2.4, depth: 1.8, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'rm-living', name: 'Living Hall', type: 'living-hall', x: -1.2, z: 2.4, width: 6.8, depth: 5.4, floor: 'ground', floorFinish: 'marble-white' },
      { id: 'rm-dining', name: 'Dining Room', type: 'dining', x: -1.2, z: -2.4, width: 4.6, depth: 3.8, floor: 'ground', floorFinish: 'marble-white' },
      { id: 'rm-kitchen', name: 'Chef\'s Kitchen', type: 'kitchen', x: 2.0, z: -2.4, width: 4.4, depth: 3.8, floor: 'ground', floorFinish: 'porcelain-grey' },
      { id: 'rm-porch', name: 'Entrance Porch', type: 'porch-terrace', x: -2.2, z: 6.4, width: 4.8, depth: 2.2, floor: 'ground', floorFinish: 'terrazzo-polish' },
    ],
    wallSegments: [
      // Outer perimeter walls (6-inch load-bearing sandcrete)
      { id: 'w-out-1', startX: -8.0, startZ: -6.5, endX: 7.5, endZ: -6.5, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'w-out-2', startX: 7.5, startZ: -6.5, endX: 7.5, endZ: 6.5, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'w-out-3', startX: 7.5, startZ: 6.5, endX: -8.0, endZ: 6.5, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'w-out-4', startX: -8.0, startZ: 6.5, endX: -8.0, endZ: -6.5, thickness: '6-inch', height: 3.0, floor: 'ground' },
      // Internal partition walls (5-inch sandcrete)
      { id: 'w-in-1', startX: -2.0, startZ: -6.5, endX: -2.0, endZ: 0.0, thickness: '5-inch', height: 3.0, floor: 'ground' },
      { id: 'w-in-2', startX: 2.6, startZ: -6.5, endX: 2.6, endZ: 6.5, thickness: '5-inch', height: 3.0, floor: 'ground' },
      { id: 'w-in-3', startX: -8.0, startZ: 0.0, endX: 2.6, endZ: 0.0, thickness: '5-inch', height: 3.0, floor: 'ground' },
      { id: 'w-in-4', startX: 2.6, startZ: 0.5, endX: 7.5, endZ: 0.5, thickness: '5-inch', height: 3.0, floor: 'ground' },
    ],
    openings: [
      { id: 'op-main-door', type: 'door-double', x: -2.2, z: 6.5, rotationY: 0, width: 1.8, height: 2.2, floor: 'ground', label: 'Main Entrance' },
      { id: 'op-patio-door', type: 'door-sliding', x: -1.2, z: -6.5, rotationY: 0, width: 2.4, height: 2.2, floor: 'ground', label: 'Patio Slider' },
      { id: 'op-win-living', type: 'window-sliding', x: -6.0, z: 6.5, rotationY: 0, width: 1.8, height: 1.5, floor: 'ground', label: 'Living Window' },
      { id: 'op-win-master', type: 'window-casement', x: -8.0, z: -3.8, rotationY: Math.PI / 2, width: 1.5, height: 1.5, floor: 'ground', label: 'Master Window' },
      { id: 'op-win-bed2', type: 'window-casement', x: 7.5, z: -3.8, rotationY: -Math.PI / 2, width: 1.5, height: 1.5, floor: 'ground', label: 'Bed 2 Window' },
      { id: 'op-win-bed3', type: 'window-casement', x: 7.5, z: 2.6, rotationY: -Math.PI / 2, width: 1.5, height: 1.5, floor: 'ground', label: 'Bed 3 Window' },
    ],
    items: [
      // Master Bedroom
      { equipmentId: 'arch-bed-king', x: -5.0, z: -4.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-wardrobe', x: -7.4, z: -2.8, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: -6.2, z: -0.6, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-shower', x: -4.8, z: -0.6, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-vanity', x: -6.2, z: 0.2, rotationY: Math.PI, floor: 'ground' },

      // Bedroom 2
      { equipmentId: 'arch-bed-queen', x: 5.0, z: -4.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-wardrobe', x: 7.0, z: -2.8, rotationY: -Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: 5.8, z: -0.8, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-shower', x: 7.0, z: -0.8, rotationY: 0, floor: 'ground' },

      // Bedroom 3
      { equipmentId: 'arch-bed-queen', x: 5.0, z: 2.4, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-wardrobe', x: 7.0, z: 3.8, rotationY: -Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: 5.8, z: 5.4, rotationY: 0, floor: 'ground' },

      // Living Hall
      { equipmentId: 'arch-sofa-sectional', x: -1.2, z: 1.8, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-coffee-table', x: -1.2, z: 3.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-tv-console', x: -1.2, z: 4.8, rotationY: Math.PI, floor: 'ground' },

      // Dining Room
      { equipmentId: 'arch-dining-6seat', x: -1.2, z: -2.4, rotationY: 0, floor: 'ground' },

      // Kitchen
      { equipmentId: 'arch-kitchen-counter', x: 2.2, z: -4.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-kitchen-island', x: 2.0, z: -2.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-refrigerator', x: 3.6, z: -4.2, rotationY: 0, floor: 'ground' },

      // Compound (Driveway & Landscaping)
      { equipmentId: 'arch-car-suv', x: -10.5, z: 3.5, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-palm-tree', x: -11.0, z: -5.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-palm-tree', x: 10.5, z: -5.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-outdoor-patio', x: -2.2, z: 8.5, rotationY: 0, floor: 'ground' },
    ],
  },

  'preset-4bed-villa': {
    id: 'preset-4bed-villa',
    name: '4-Bedroom 2-Storey Modern Executive Villa',
    icon: '🏛️',
    category: 'Storey Building (2-Floor)',
    description: 'Luxury 2-storey modern villa with hidden parapet roof, ground floor guest suite, expansive living & dining foyer, first-floor penthouse master suite with private balcony, and family lounge.',
    defaultRoom: { width: 17.0, depth: 15.0 },
    plotConfig: STANDARD_PLOT_PRESETS['100x80'],
    roofConfig: {
      type: 'hidden-parapet',
      visible: true,
      parapetHeightM: 1.0,
      pitchDegrees: 10,
      material: 'aluzinc',
      colorHex: '#2b3035',
    },
    hasFirstFloor: true,
    roomZones: [
      // Ground Floor
      { id: 'v-g-living', name: 'Grand Living Foyer', type: 'living-hall', x: -2.5, z: 2.0, width: 7.2, depth: 5.6, floor: 'ground', floorFinish: 'marble-white' },
      { id: 'v-g-dining', name: 'Formal Dining', type: 'dining', x: -2.5, z: -3.0, width: 4.8, depth: 4.2, floor: 'ground', floorFinish: 'marble-white' },
      { id: 'v-g-kitchen', name: 'Chef\'s Kitchen & Store', type: 'kitchen', x: 2.8, z: -3.0, width: 5.0, depth: 4.2, floor: 'ground', floorFinish: 'porcelain-grey' },
      { id: 'v-g-guest', name: 'Guest Bedroom (Suite 4)', type: 'bedroom', x: 4.8, z: 2.5, width: 4.8, depth: 4.2, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'v-g-guest-bath', name: 'Guest Ensuite', type: 'bathroom', x: 6.2, z: 5.2, width: 2.6, depth: 2.0, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'v-g-powder', name: 'Visitor\'s Washroom', type: 'bathroom', x: -6.5, z: 4.8, width: 2.2, depth: 1.8, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'v-g-porch', name: 'Grand Entrance Porch', type: 'porch-terrace', x: -2.5, z: 6.8, width: 5.2, depth: 2.4, floor: 'ground', floorFinish: 'terrazzo-polish' },

      // First Floor
      { id: 'v-f-master', name: 'Penthouse Master Suite', type: 'master-suite', x: -3.0, z: -2.5, width: 6.2, depth: 5.2, floor: 'first', floorFinish: 'hardwood-teak' },
      { id: 'v-f-master-bath', name: 'Luxury Master Bath', type: 'bathroom', x: -6.4, z: -2.5, width: 3.2, depth: 2.4, floor: 'first', floorFinish: 'bathroom-tile' },
      { id: 'v-f-lounge', name: 'Upper Family Lounge', type: 'living-hall', x: 2.0, z: -2.0, width: 5.2, depth: 4.5, floor: 'first', floorFinish: 'porcelain-cream' },
      { id: 'v-f-bed2', name: 'Bedroom 2 (Ensuite)', type: 'bedroom', x: 4.5, z: 2.5, width: 4.6, depth: 4.2, floor: 'first', floorFinish: 'porcelain-cream' },
      { id: 'v-f-bed3', name: 'Bedroom 3 (Ensuite)', type: 'bedroom', x: -3.0, z: 2.5, width: 4.6, depth: 4.2, floor: 'first', floorFinish: 'porcelain-cream' },
      { id: 'v-f-balcony', name: 'Master Sunset Balcony', type: 'balcony', x: -3.0, z: -5.8, width: 5.5, depth: 2.0, floor: 'first', floorFinish: 'terrazzo-polish' },
    ],
    wallSegments: [
      // Ground floor external walls
      { id: 'vg-out-1', startX: -8.5, startZ: -6.5, endX: 8.5, endZ: -6.5, thickness: '6-inch', height: 3.2, floor: 'ground' },
      { id: 'vg-out-2', startX: 8.5, startZ: -6.5, endX: 8.5, endZ: 6.8, thickness: '6-inch', height: 3.2, floor: 'ground' },
      { id: 'vg-out-3', startX: 8.5, startZ: 6.8, endX: -8.5, endZ: 6.8, thickness: '6-inch', height: 3.2, floor: 'ground' },
      { id: 'vg-out-4', startX: -8.5, startZ: 6.8, endX: -8.5, endZ: -6.5, thickness: '6-inch', height: 3.2, floor: 'ground' },
      // First floor external walls
      { id: 'vf-out-1', startX: -8.5, startZ: -6.5, endX: 8.5, endZ: -6.5, thickness: '6-inch', height: 3.0, floor: 'first' },
      { id: 'vf-out-2', startX: 8.5, startZ: -6.5, endX: 8.5, endZ: 6.8, thickness: '6-inch', height: 3.0, floor: 'first' },
      { id: 'vf-out-3', startX: 8.5, startZ: 6.8, endX: -8.5, endZ: 6.8, thickness: '6-inch', height: 3.0, floor: 'first' },
      { id: 'vf-out-4', startX: -8.5, startZ: 6.8, endX: -8.5, endZ: -6.5, thickness: '6-inch', height: 3.0, floor: 'first' },
    ],
    openings: [
      { id: 'vg-door-main', type: 'door-double', x: -2.5, z: 6.8, rotationY: 0, width: 2.0, height: 2.4, floor: 'ground', label: 'Grand Pivot Door' },
      { id: 'vg-door-patio', type: 'door-sliding', x: -2.5, z: -6.5, rotationY: 0, width: 3.0, height: 2.4, floor: 'ground', label: 'Garden Glass Slider' },
      { id: 'vf-door-balcony', type: 'door-sliding', x: -3.0, z: -5.0, rotationY: 0, width: 2.4, height: 2.2, floor: 'first', label: 'Balcony Slider' },
    ],
    items: [
      // Ground Floor
      { equipmentId: 'arch-sofa-sectional', x: -2.5, z: 1.5, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-coffee-table', x: -2.5, z: 2.8, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-tv-console', x: -2.5, z: 4.8, rotationY: Math.PI, floor: 'ground' },
      { equipmentId: 'arch-dining-8seat', x: -2.5, z: -3.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-kitchen-island', x: 2.5, z: -2.5, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-kitchen-counter', x: 3.2, z: -4.5, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-refrigerator', x: 4.8, z: -4.5, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-bed-queen', x: 4.8, z: 2.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: 6.2, z: 5.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-shower', x: 7.2, z: 5.2, rotationY: 0, floor: 'ground' },

      // First Floor
      { equipmentId: 'arch-bed-king', x: -3.0, z: -3.2, rotationY: 0, floor: 'first' },
      { equipmentId: 'arch-bathtub', x: -6.4, z: -3.2, rotationY: 0, floor: 'first' },
      { equipmentId: 'arch-vanity', x: -6.4, z: -1.8, rotationY: Math.PI, floor: 'first' },
      { equipmentId: 'arch-sofa-3seat', x: 2.0, z: -2.0, rotationY: 0, floor: 'first' },
      { equipmentId: 'arch-bed-queen', x: 4.5, z: 2.2, rotationY: 0, floor: 'first' },
      { equipmentId: 'arch-bed-queen', x: -3.0, z: 2.2, rotationY: 0, floor: 'first' },

      // Outdoor Compound
      { equipmentId: 'arch-car-suv', x: -11.0, z: 3.5, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-car-sedan', x: -11.0, z: 0.5, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-palm-tree', x: -11.5, z: -5.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-palm-tree', x: 11.5, z: -5.2, rotationY: 0, floor: 'ground' },
    ],
  },

  'preset-2bed-halfplot': {
    id: 'preset-2bed-halfplot',
    name: 'Modern 2-Bedroom Compact Home (Half-Plot 100\'×50\')',
    icon: '🏠',
    category: 'Compact & Half-Plot',
    description: 'Smart modern tropical 2-bedroom 2-bathroom home optimized for urban Accra or Kumasi 100\'×50\' half-plots, featuring open-plan living, carport, and garden.',
    defaultRoom: { width: 12.0, depth: 10.0 },
    plotConfig: STANDARD_PLOT_PRESETS['100x50'],
    roofConfig: {
      type: 'hidden-parapet',
      visible: true,
      parapetHeightM: 0.8,
      pitchDegrees: 12,
      material: 'aluzinc',
      colorHex: '#3d444b',
    },
    hasFirstFloor: false,
    roomZones: [
      { id: 'hp-master', name: 'Master Bedroom', type: 'master-suite', x: -3.2, z: -2.8, width: 4.5, depth: 4.0, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'hp-master-bath', name: 'Master Ensuite', type: 'bathroom', x: -4.4, z: 0.2, width: 2.4, depth: 1.8, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'hp-bed2', name: 'Bedroom 2', type: 'bedroom', x: 3.2, z: -2.8, width: 4.0, depth: 3.8, floor: 'ground', floorFinish: 'porcelain-cream' },
      { id: 'hp-bath2', name: 'Full Bathroom', type: 'bathroom', x: 4.2, z: 0.2, width: 2.2, depth: 1.8, floor: 'ground', floorFinish: 'bathroom-tile' },
      { id: 'hp-living', name: 'Open Living & Dining', type: 'living-hall', x: -0.5, z: 2.2, width: 5.8, depth: 4.8, floor: 'ground', floorFinish: 'marble-white' },
      { id: 'hp-kitchen', name: 'Modern Kitchen', type: 'kitchen', x: 3.2, z: 2.8, width: 3.8, depth: 3.4, floor: 'ground', floorFinish: 'porcelain-grey' },
      { id: 'hp-porch', name: 'Front Porch', type: 'porch-terrace', x: -1.0, z: 5.4, width: 3.8, depth: 1.8, floor: 'ground', floorFinish: 'terrazzo-polish' },
    ],
    wallSegments: [
      { id: 'hp-w1', startX: -6.0, startZ: -5.0, endX: 5.8, endZ: -5.0, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'hp-w2', startX: 5.8, startZ: -5.0, endX: 5.8, endZ: 5.0, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'hp-w3', startX: 5.8, startZ: 5.0, endX: -6.0, endZ: 5.0, thickness: '6-inch', height: 3.0, floor: 'ground' },
      { id: 'hp-w4', startX: -6.0, startZ: 5.0, endX: -6.0, endZ: -5.0, thickness: '6-inch', height: 3.0, floor: 'ground' },
    ],
    openings: [
      { id: 'hp-op1', type: 'door-single', x: -1.0, z: 5.0, rotationY: 0, width: 1.0, height: 2.1, floor: 'ground', label: 'Entrance' },
      { id: 'hp-op2', type: 'window-sliding', x: -3.5, z: 5.0, rotationY: 0, width: 1.5, height: 1.4, floor: 'ground', label: 'Living Window' },
      { id: 'hp-op3', type: 'window-casement', x: -6.0, z: -2.8, rotationY: Math.PI / 2, width: 1.4, height: 1.4, floor: 'ground', label: 'Master Window' },
      { id: 'hp-op4', type: 'window-casement', x: 5.8, z: -2.8, rotationY: -Math.PI / 2, width: 1.4, height: 1.4, floor: 'ground', label: 'Bed 2 Window' },
    ],
    items: [
      { equipmentId: 'arch-bed-king', x: -3.2, z: -3.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: -4.4, z: 0.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-bed-queen', x: 3.2, z: -3.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-toilet', x: 4.2, z: 0.2, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-sofa-3seat', x: -0.5, z: 1.5, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-coffee-table', x: -0.5, z: 2.6, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-tv-console', x: -0.5, z: 4.0, rotationY: Math.PI, floor: 'ground' },
      { equipmentId: 'arch-dining-6seat', x: -2.8, z: 2.2, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-kitchen-counter', x: 3.2, z: 3.0, rotationY: 0, floor: 'ground' },
      { equipmentId: 'arch-car-sedan', x: -8.0, z: 2.0, rotationY: Math.PI / 2, floor: 'ground' },
      { equipmentId: 'arch-palm-tree', x: -8.0, z: -4.0, rotationY: 0, floor: 'ground' },
    ],
  },

  'preset-custom-blank': {
    id: 'preset-custom-blank',
    name: 'Custom Architectural Floor Plan (100\'×80\' Plot)',
    icon: '📐',
    category: 'Custom Builder',
    description: 'Clean blank 100\'×80\' residential plot with setbacks and fence walls, ready for custom wall drawing and space planning.',
    defaultRoom: { width: 15.0, depth: 12.0 },
    plotConfig: STANDARD_PLOT_PRESETS['100x80'],
    roofConfig: {
      type: 'hidden-parapet',
      visible: true,
      parapetHeightM: 0.8,
      pitchDegrees: 12,
      material: 'aluzinc',
      colorHex: '#3a3f44',
    },
    hasFirstFloor: false,
    roomZones: [],
    wallSegments: [],
    openings: [],
    items: [],
  },

  'diy-bedroom-phone': {
    id: 'diy-bedroom-phone',
    name: 'DIY Phone Bedroom Rig ($0–$50)',
    icon: '📱',
    category: 'Budget & DIY',
    description: 'Realistic bedroom studio using your smartphone with rear mirror monitor, desk clamp light, wireless lapel mic, bed audio absorption, and window daylight',
    defaultRoom: { width: 3.4, depth: 3.0 },
    items: [
      // Double Bed (Acts as major acoustic absorption for room echo)
      { equipmentId: 'bed-furniture', x: -1.0, z: -0.5, rotationY: 0 },
      // Wardrobe / Closet
      { equipmentId: 'closet-wardrobe', x: 1.1, z: -0.9, rotationY: 0 },
      // 2: Small Work Desk
      { equipmentId: 'content-table', x: 0.2, z: 0.15, rotationY: 0 },
      // Smartphone Mount with Rear Mirror (mounted on desk)
      { equipmentId: 'phone-tripod-mirror', x: 0.2, z: -0.1, rotationY: 0, parentId: 2, isMainCamera: true, lensPreset: '24mm' },
      // Clamp DIY Lamp with Parchment Paper Diffuser (mounted on desk)
      { equipmentId: 'clamp-desk-lamp', x: 0.55, z: -0.05, rotationY: -Math.PI / 4, parentId: 2, lightSettings: { intensity: 80, colorTempKelvin: 4500, beamAngle: 80 } },
      // Wireless Lapel Mic
      { equipmentId: 'budget-wireless-lav', x: -0.05, z: 0.05, rotationY: 0, parentId: 2 },
      // Creator Desk Chair
      { equipmentId: 'chair', x: 0.2, z: -0.65, rotationY: 0 },
      // Power strip on floor
      { equipmentId: 'power-strip', x: 0.8, z: 0.7, rotationY: 0 },
    ],
  },

  'bedroom-studio': {
    id: 'bedroom-studio',
    name: 'Bedroom Creator Nook',
    icon: '🛏️',
    category: 'Bedroom & Small',
    description: 'Cozy bedroom YouTube & streaming setup with desk, monitors, mic, and warm lighting',
    defaultRoom: { width: 3.6, depth: 3.0 },
    items: [
      // 0: Main Wooden Content Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      // Table accessories mounted atop desk
      { equipmentId: 'desk-lamp', x: 0.35, z: -0.7, rotationY: 0, parentId: 0, lightSettings: { intensity: 75, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'webcam', x: 0, z: -0.65, rotationY: Math.PI, parentId: 0, lensPreset: '24mm' },
      { equipmentId: 'podcast-mic', x: -0.35, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.72, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.72, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'power-strip', x: 0.42, z: -0.55, rotationY: 0, parentId: 0 },
      // Ergonomic Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Room Lighting & Camera
      { equipmentId: 'ring-light', x: 0.65, z: 0.35, rotationY: -Math.PI / 4, lightSettings: { intensity: 80, colorTempKelvin: 5600, beamAngle: 75 } },
      { equipmentId: 'camera', x: 0, z: 0.85, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Acoustic wall treatment & background shelf
      { equipmentId: 'acoustic-panel', x: -0.85, z: -1.35, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.85, z: -1.35, rotationY: 0 },
      { equipmentId: 'shelf-props', x: -1.35, z: -0.8, rotationY: Math.PI / 2 },
      // Backup Power
      { equipmentId: 'power-station', x: 1.25, z: -1.0, rotationY: 0 },
    ],
  },

  podcast: {
    id: 'podcast',
    name: 'Two-Person Podcast Lounge',
    icon: '🎙️',
    category: 'Audio & Music',
    description: 'Two-host broadcast podcast with modern sofa, dual dynamic mics, softbox lighting, and RGB rim',
    defaultRoom: { width: 5.2, depth: 4.2 },
    items: [
      // Backdrop
      { equipmentId: 'backdrop', x: 0, z: -1.75, rotationY: 0 },
      // Host & Guest Sofa
      { equipmentId: 'sofa', x: 0, z: -0.8, rotationY: 0 },
      // 2: Center Coffee / Equipment Table
      { equipmentId: 'content-table', x: 0, z: -0.05, rotationY: 0 },
      // Table gear
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.05, rotationY: 0, parentId: 2 },
      { equipmentId: 'podcast-mic', x: 0.38, z: -0.05, rotationY: 0, parentId: 2 },
      { equipmentId: 'audio-recorder', x: 0, z: -0.05, rotationY: 0, parentId: 2 },
      // Key & Fill Softbox Lighting
      { equipmentId: 'softbox', x: -1.7, z: 0.45, rotationY: Math.PI / 3, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'softbox', x: 1.7, z: 0.45, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 80 } },
      // RGB Tube Rim Light for cinematic silhouette
      { equipmentId: 'rgb-tube', x: 1.45, z: -1.35, rotationY: -Math.PI / 2, lightSettings: { intensity: 65, colorHex: '#00D4FF', beamAngle: 120 } },
      // Acoustic Panels
      { equipmentId: 'acoustic-panel', x: -2.35, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 2.35, z: -0.8, rotationY: -Math.PI / 2 },
      // Master Camera with 16:9 view frustum
      { equipmentId: 'camera', x: 0, z: 1.5, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Backup Power
      { equipmentId: 'power-station', x: -2.0, z: -1.5, rotationY: 0 },
    ],
  },

  'product-photography': {
    id: 'product-photography',
    name: 'Commercial Product Studio',
    icon: '📸',
    category: 'Commercial & Photo',
    description: 'Clean product shoot studio with rotating turntable, dual softboxes, and overhead beauty dish',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.3, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.4, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 1.1, rotationY: Math.PI, isMainCamera: true, lensPreset: '50mm' },
      { equipmentId: 'softbox', x: -1.3, z: 0.1, rotationY: Math.PI / 3, lightSettings: { intensity: 90, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'softbox', x: 1.3, z: 0.1, rotationY: -Math.PI / 3, lightSettings: { intensity: 60, colorTempKelvin: 5600, beamAngle: 60 } },
      { equipmentId: 'beauty-dish', x: 0, z: 0.75, rotationY: Math.PI, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 45 } },
      // 6: Side Prep Table
      { equipmentId: 'content-table', x: 1.35, z: -0.85, rotationY: -Math.PI / 4 },
      { equipmentId: 'power-strip', x: 1.35, z: -0.85, rotationY: 0, parentId: 6 },
      { equipmentId: 'shelf-props', x: -1.55, z: -1.15, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.35, z: 0.6, rotationY: 0 },
    ],
  },

  'tech-review': {
    id: 'tech-review',
    name: 'Tech & Unboxing Desk',
    icon: '💻',
    category: 'Video & Tech',
    description: 'Overhead camera slider setup with studio audio monitors, motorized display stand, and soft panels',
    defaultRoom: { width: 4.6, depth: 3.8 },
    items: [
      // 0: Content Desk
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.55, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.45, z: -0.65, rotationY: 0, parentId: 0, lightSettings: { intensity: 70, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'studio-monitor', x: -0.55, z: -0.7, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.55, z: -0.7, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'power-strip', x: -0.45, z: -0.55, rotationY: 0, parentId: 0 },
      // Host Chair
      { equipmentId: 'chair', x: 0, z: -0.05, rotationY: 0 },
      // Cinematic Camera Slider
      { equipmentId: 'camera-slider', x: 0, z: 0.85, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 0.85, rotationY: Math.PI, isMainCamera: true, lensPreset: '35mm' },
      // Soft Panel Key & Fill
      { equipmentId: 'led-light', x: -1.5, z: 0.2, rotationY: Math.PI / 3, lightSettings: { intensity: 85, colorTempKelvin: 5600, beamAngle: 70 } },
      { equipmentId: 'led-light', x: 1.5, z: 0.2, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 80 } },
      // Acoustic wall panels and bookshelf
      { equipmentId: 'acoustic-panel', x: 0, z: -1.75, rotationY: 0 },
      { equipmentId: 'shelf-props', x: -1.7, z: -1.2, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.2, rotationY: 0 },
    ],
  },

  'streaming-battlestation': {
    id: 'streaming-battlestation',
    name: 'Streaming Battlestation',
    icon: '🎮',
    category: 'Video & Tech',
    description: 'Immersive gaming setup with dual RGB tube mood lighting, studio monitors, and boom condenser mic',
    defaultRoom: { width: 4.0, depth: 3.2 },
    items: [
      // 0: Battlestation Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'webcam', x: 0, z: -0.7, rotationY: Math.PI, parentId: 0, lensPreset: '24mm' },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.75, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.75, rotationY: -0.2, parentId: 0 },
      { equipmentId: 'microphone', x: -0.3, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.45, z: -0.7, rotationY: 0, parentId: 0, lightSettings: { intensity: 65, colorTempKelvin: 3200, beamAngle: 80 } },
      { equipmentId: 'power-strip', x: 0.45, z: -0.55, rotationY: 0, parentId: 0 },
      // Ergonomic Gaming Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Dual Neon RGB Tubes
      { equipmentId: 'rgb-tube', x: -1.3, z: -1.0, rotationY: Math.PI / 4, lightSettings: { intensity: 75, colorHex: '#9D00FF', beamAngle: 120 } },
      { equipmentId: 'rgb-tube', x: 1.3, z: -1.0, rotationY: -Math.PI / 4, lightSettings: { intensity: 75, colorHex: '#00E5FF', beamAngle: 120 } },
      // Key Ring Light & DSLR
      { equipmentId: 'ring-light', x: 0.55, z: 0.35, rotationY: -Math.PI / 4, lightSettings: { intensity: 80, colorTempKelvin: 5600, beamAngle: 75 } },
      { equipmentId: 'camera', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true, lensPreset: '24mm' },
      { equipmentId: 'acoustic-panel', x: 0, z: -1.45, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.4, z: 0.8, rotationY: 0 },
    ],
  },

  interview: {
    id: 'interview',
    name: 'Talking-Head & Interview',
    icon: '🗣️',
    category: 'Commercial & Photo',
    description: 'Two-person interview setup with 3-point lighting, teleprompter, and multi-cam angles',
    defaultRoom: { width: 5.5, depth: 4.5 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.8, rotationY: 0 },
      // Two Interview Chairs
      { equipmentId: 'chair', x: -0.75, z: 0.1, rotationY: Math.PI / 6 },
      { equipmentId: 'chair', x: 0.75, z: 0.1, rotationY: -Math.PI / 6 },
      // 3: Center Table
      { equipmentId: 'content-table', x: 0, z: 0.1, rotationY: 0 },
      { equipmentId: 'audio-recorder', x: 0, z: 0.1, rotationY: 0, parentId: 3 },
      { equipmentId: 'lavalier', x: -0.2, z: 0.1, rotationY: 0, parentId: 3 },
      { equipmentId: 'lavalier', x: 0.2, z: 0.1, rotationY: 0, parentId: 3 },
      // Master A-Cam with Teleprompter
      { equipmentId: 'teleprompter', x: 0, z: 1.8, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.8, rotationY: Math.PI, isMainCamera: true, lensPreset: '50mm' },
      // Secondary B-Cam Angle
      { equipmentId: 'camera', x: -1.6, z: 1.3, rotationY: Math.PI * 0.75, lensPreset: '85mm' },
      // 3-Point Lighting (Fresnel key, Softbox fill, RGB hair light)
      { equipmentId: 'fresnel', x: -2.0, z: 0.3, rotationY: Math.PI / 3, lightSettings: { intensity: 90, colorTempKelvin: 5600, beamAngle: 35 } },
      { equipmentId: 'softbox', x: 2.0, z: 0.3, rotationY: -Math.PI / 3, lightSettings: { intensity: 50, colorTempKelvin: 4500, beamAngle: 75 } },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.4, rotationY: -Math.PI / 2, lightSettings: { intensity: 60, colorHex: '#FF9E00', beamAngle: 120 } },
      { equipmentId: 'generator', x: -2.2, z: -1.6, rotationY: 0 },
    ],
  },

  'fashion-lookbook': {
    id: 'fashion-lookbook',
    name: 'Fashion Runway & Lookbook',
    icon: '👗',
    category: 'Commercial & Photo',
    description: 'High-end fashion shoot with wide backdrop sweep, dual softboxes, and beauty dish',
    defaultRoom: { width: 5.6, depth: 5.0 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -2.0, rotationY: 0 },
      { equipmentId: 'camera', x: 0, z: 2.0, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'softbox', x: -1.8, z: 0.6, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 0.6, rotationY: -Math.PI / 3 },
      { equipmentId: 'beauty-dish', x: 0, z: -0.4, rotationY: Math.PI },
      { equipmentId: 'led-light', x: -2.2, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'led-light', x: 2.2, z: -0.8, rotationY: -Math.PI / 2 },
      { equipmentId: 'shelf-props', x: -2.2, z: -2.0, rotationY: 0 },
      { equipmentId: 'content-table', x: 2.1, z: -1.8, rotationY: -Math.PI / 6 },
      { equipmentId: 'chair', x: -1.2, z: 1.5, rotationY: Math.PI / 4 },
      { equipmentId: 'generator', x: -2.2, z: 1.5, rotationY: 0 },
    ],
  },

  'green-screen-vfx': {
    id: 'green-screen-vfx',
    name: 'Chroma Green VFX Studio',
    icon: '🟩',
    category: 'Commercial & Photo',
    description: 'Evenly lit green screen studio with dual softboxes, key light, and audio boom',
    defaultRoom: { width: 4.6, depth: 4.0 },
    items: [
      { equipmentId: 'green-screen', x: 0, z: -1.5, rotationY: 0 },
      // Dual Softboxes for even green screen illumination (no hotspots/shadows)
      { equipmentId: 'softbox', x: -1.6, z: -0.7, rotationY: Math.PI / 4 },
      { equipmentId: 'softbox', x: 1.6, z: -0.7, rotationY: -Math.PI / 4 },
      // Key presenter light
      { equipmentId: 'led-light', x: 1.2, z: 0.5, rotationY: -Math.PI / 3 },
      { equipmentId: 'camera', x: 0, z: 1.4, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'microphone', x: -1.2, z: 0.2, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.6, z: -1.4, rotationY: 0 },
    ],
  },

  'home-studio': {
    id: 'home-studio',
    name: 'Compact Home Studio',
    icon: '🏠',
    category: 'Bedroom & Small',
    description: 'Space-efficient studio for small apartments and dorms with desk and backup generator',
    defaultRoom: { width: 3.2, depth: 2.6 },
    items: [
      // 0: Compact Desk
      { equipmentId: 'content-table', x: 0, z: -0.65, rotationY: 0 },
      { equipmentId: 'webcam', x: 0, z: -0.65, rotationY: Math.PI, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.35, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.35, z: -0.65, rotationY: 0, parentId: 0 },
      { equipmentId: 'chair', x: 0, z: -0.1, rotationY: 0 },
      { equipmentId: 'led-light', x: -0.9, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'camera', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'shelf-props', x: -1.1, z: -0.8, rotationY: Math.PI / 2 },
      { equipmentId: 'generator', x: 1.1, z: -0.9, rotationY: 0 },
    ],
  },

  'culinary-kitchen': {
    id: 'culinary-kitchen',
    name: 'Culinary & Cooking Show',
    icon: '🍳',
    category: 'Lifestyle & Crafts',
    description: 'Central cooking prep island with overhead top-down camera rig, dual softboxes, and lavaliers',
    defaultRoom: { width: 5.4, depth: 4.4 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.8, rotationY: 0 },
      // 1: Center Prep Island
      { equipmentId: 'content-table', x: 0, z: -0.4, rotationY: 0 },
      { equipmentId: 'product-stand', x: 0, z: -0.4, rotationY: 0, parentId: 1 },
      // Overhead Rig pointing directly down at the prep surface
      { equipmentId: 'overhead-rig', x: -0.3, z: -0.4, rotationY: 0 },
      // Front Master Eye-Level Camera
      { equipmentId: 'camera', x: 0, z: 1.5, rotationY: Math.PI, isMainCamera: true },
      // Floor confidence monitor for chef preview
      { equipmentId: 'floor-monitor', x: 0.85, z: 1.1, rotationY: Math.PI * 0.85 },
      // Dual Softbox Lighting
      { equipmentId: 'softbox', x: -1.8, z: 0.4, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.8, z: 0.4, rotationY: -Math.PI / 3 },
      // Side pantry shelf & power
      { equipmentId: 'shelf-props', x: -2.1, z: -1.4, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 2.0, z: -1.4, rotationY: 0 },
    ],
  },

  'music-vocal-booth': {
    id: 'music-vocal-booth',
    name: 'Music & Vocal Studio',
    icon: '🎵',
    category: 'Audio & Music',
    description: 'Pro music workstation with MIDI synth keyboard, acoustic vocal shield, and studio monitors',
    defaultRoom: { width: 4.8, depth: 4.0 },
    items: [
      // 0: Producer Workstation Desk
      { equipmentId: 'content-table', x: 0, z: -0.9, rotationY: 0 },
      { equipmentId: 'studio-monitor', x: -0.52, z: -0.92, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.52, z: -0.92, rotationY: -0.15, parentId: 0 },
      { equipmentId: 'audio-recorder', x: 0, z: -0.85, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.38, z: -0.9, rotationY: 0, parentId: 0 },
      // Producer Chair
      { equipmentId: 'chair', x: 0, z: -0.35, rotationY: 0 },
      // Side 61-Key Synthesizer Keyboard on stand
      { equipmentId: 'keyboard-synth', x: 1.45, z: -0.6, rotationY: -Math.PI / 2 },
      // Vocal Reflection Shield in recording corner
      { equipmentId: 'vocal-booth-screen', x: -1.4, z: 0.5, rotationY: Math.PI * 0.75 },
      // Wall acoustic panels
      { equipmentId: 'acoustic-panel', x: -1.2, z: -1.85, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 1.2, z: -1.85, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: -2.25, z: 0.2, rotationY: Math.PI / 2 },
      // Camera & mood lights
      { equipmentId: 'camera', x: 0, z: 1.2, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'rgb-tube', x: -1.6, z: -1.4, rotationY: Math.PI / 4 },
      { equipmentId: 'power-station', x: 1.8, z: 1.2, rotationY: 0 },
    ],
  },

  'fitness-dance': {
    id: 'fitness-dance',
    name: 'Fitness, Yoga & Dance',
    icon: '🧘',
    category: 'Lifestyle & Crafts',
    description: 'Spacious workout space with stage floor monitor, wide-angle camera, and wash softboxes',
    defaultRoom: { width: 6.0, depth: 4.8 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -2.0, rotationY: 0 },
      // Stage Floor confidence monitor angled up at instructor
      { equipmentId: 'floor-monitor', x: 0.9, z: 1.5, rotationY: Math.PI * 0.85 },
      // Master Camera (Wide Angle)
      { equipmentId: 'camera', x: 0, z: 1.9, rotationY: Math.PI, isMainCamera: true },
      // Dual Softbox Wash Lights
      { equipmentId: 'softbox', x: -2.1, z: 0.5, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 2.1, z: 0.5, rotationY: -Math.PI / 3 },
      // Overhead beauty dish for head-to-toe definition
      { equipmentId: 'beauty-dish', x: 0, z: -0.6, rotationY: Math.PI },
      // Side water & props table
      { equipmentId: 'content-table', x: 2.2, z: -1.4, rotationY: -Math.PI / 6 },
      { equipmentId: 'generator', x: -2.3, z: 1.6, rotationY: 0 },
    ],
  },

  'craft-flatlay': {
    id: 'craft-flatlay',
    name: 'Art, Craft & Flatlay DIY',
    icon: '🎨',
    category: 'Lifestyle & Crafts',
    description: 'Top-down DIY crafting studio with overhead boom camera rig, cutting desk, and soft lighting',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      // 0: Main Workstation Crafting Desk
      { equipmentId: 'content-table', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.55, rotationY: 0, parentId: 0 },
      // Overhead Boom Rig centered directly over the desk
      { equipmentId: 'overhead-rig', x: -0.25, z: -0.5, rotationY: 0 },
      // Front Camera for talking head intros
      { equipmentId: 'camera', x: 0, z: 1.1, rotationY: Math.PI, isMainCamera: true },
      // Host Stool / Chair
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      // Dual Softbox side lights for shadowless craft lighting
      { equipmentId: 'softbox', x: -1.4, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.4, z: 0.2, rotationY: -Math.PI / 3 },
      // Props shelf for art supplies
      { equipmentId: 'shelf-props', x: -1.5, z: -1.1, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.4, z: -1.1, rotationY: 0 },
    ],
  },

  'asmr-sound': {
    id: 'asmr-sound',
    name: 'ASMR & Binaural Audio',
    icon: '🎧',
    category: 'Audio & Music',
    description: 'Intimate audio sanctuary featuring 3DIO binaural ear microphone, warm lighting, and acoustic foam',
    defaultRoom: { width: 3.8, depth: 3.2 },
    items: [
      // 0: ASMR Center Presentation Table
      { equipmentId: 'content-table', x: 0, z: -0.4, rotationY: 0 },
      // 3DIO Binaural Silicone Ear Mic in center of table
      { equipmentId: 'binaural-mic', x: 0, z: -0.38, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: -0.42, z: -0.45, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.45, rotationY: 0, parentId: 0 },
      // Cozy Chair / Loveseat
      { equipmentId: 'chair', x: 0, z: 0.1, rotationY: 0 },
      // Soft Front Macro Camera
      { equipmentId: 'camera', x: 0, z: 0.9, rotationY: Math.PI, isMainCamera: true },
      // Dual RGB Ambient Glow Tubes behind host
      { equipmentId: 'rgb-tube', x: -1.2, z: -1.0, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.0, rotationY: -Math.PI / 4 },
      // Acoustic wall treatment
      { equipmentId: 'acoustic-panel', x: -0.7, z: -1.45, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.7, z: -1.45, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.3, z: 0.7, rotationY: 0 },
    ],
  },

  'executive-webinar': {
    id: 'executive-webinar',
    name: 'Executive Keynote & Webinar',
    icon: '💼',
    category: 'Video & Tech',
    description: 'High-trust executive broadcast with dual barndoor studio panels, teleprompter, and podcast mic',
    defaultRoom: { width: 5.0, depth: 4.0 },
    items: [
      // 0: Executive Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.65, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: 0.42, z: -0.72, rotationY: 0, parentId: 0 },
      // Executive Leather Chair
      { equipmentId: 'chair', x: 0, z: -0.15, rotationY: 0 },
      // Master Camera with Beam-Splitter Teleprompter
      { equipmentId: 'teleprompter', x: 0, z: 1.3, rotationY: Math.PI },
      { equipmentId: 'camera', x: 0, z: 1.3, rotationY: Math.PI, isMainCamera: true },
      // Dual Barndoor Studio Spotlights for crisp executive lighting
      { equipmentId: 'barndoor-light', x: -1.6, z: 0.4, rotationY: Math.PI / 3 },
      { equipmentId: 'barndoor-light', x: 1.6, z: 0.4, rotationY: -Math.PI / 3 },
      // Background Bookcase Shelf & Acoustic Panels
      { equipmentId: 'shelf-props', x: -1.8, z: -1.4, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 0.6, z: -1.85, rotationY: 0 },
      { equipmentId: 'power-station', x: 1.7, z: -1.3, rotationY: 0 },
    ],
  },

  'live-dj-booth': {
    id: 'live-dj-booth',
    name: 'Live DJ Stream & Club Set',
    icon: '🎛️',
    category: 'Audio & Music',
    description: 'High-energy DJ broadcast with 4-channel controller, studio monitors, RGB mood tubes, and stage fogger',
    defaultRoom: { width: 4.8, depth: 3.8 },
    items: [
      // 0: DJ Stand Table
      { equipmentId: 'content-table', x: 0, z: -0.6, rotationY: 0 },
      { equipmentId: 'dj-deck', x: 0, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.58, z: -0.65, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.58, z: -0.65, rotationY: -0.2, parentId: 0 },
      // DJ Standing in front / behind deck
      { equipmentId: 'shotgun-mic', x: -0.85, z: -0.4, rotationY: Math.PI / 4 },
      // Front Camera Wide
      { equipmentId: 'camera', x: 0, z: 1.3, rotationY: Math.PI, isMainCamera: true },
      // Stage Atmospheric Fog Haze Machine
      { equipmentId: 'fog-machine', x: -1.6, z: -1.2, rotationY: Math.PI / 4 },
      // Dual RGB Neon Tubes behind DJ
      { equipmentId: 'rgb-tube', x: -1.4, z: -1.4, rotationY: Math.PI / 4 },
      { equipmentId: 'rgb-tube', x: 1.4, z: -1.4, rotationY: -Math.PI / 4 },
      // Acoustic wall baffles
      { equipmentId: 'acoustic-panel', x: -1.0, z: -1.8, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 1.0, z: -1.8, rotationY: 0 },
      { equipmentId: 'power-station', x: 1.8, z: -0.8, rotationY: 0 },
    ],
  },

  'makeup-beauty-vanity': {
    id: 'makeup-beauty-vanity',
    name: 'Beauty, Glam & Makeup Vanity',
    icon: '💄',
    category: 'Lifestyle & Crafts',
    description: 'Glamour studio with Hollywood lighted vanity mirror, beauty dish overhead, and dual product risers',
    defaultRoom: { width: 4.2, depth: 3.6 },
    items: [
      // 0: Glam Vanity Table
      { equipmentId: 'content-table', x: 0, z: -0.65, rotationY: 0 },
      { equipmentId: 'beauty-mirror', x: 0, z: -0.82, rotationY: 0, parentId: 0 },
      { equipmentId: 'product-stand', x: -0.48, z: -0.58, rotationY: 0, parentId: 0 },
      { equipmentId: 'product-stand', x: 0.48, z: -0.58, rotationY: 0, parentId: 0 },
      // Vanity Plush Chair
      { equipmentId: 'chair', x: 0, z: -0.1, rotationY: 0 },
      // Front Beauty Camera with Ring Light
      { equipmentId: 'camera', x: 0, z: 0.95, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'ring-light', x: 0, z: 0.95, rotationY: Math.PI },
      // Overhead Beauty Dish for soft hair and cheekbone highlight
      { equipmentId: 'beauty-dish', x: 0, z: -0.2, rotationY: Math.PI },
      // Side Softbox for soft ambient wrap
      { equipmentId: 'softbox', x: -1.4, z: 0.2, rotationY: Math.PI / 3 },
      { equipmentId: 'shelf-props', x: 1.5, z: -0.9, rotationY: -Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.5, z: -1.2, rotationY: 0 },
    ],
  },

  'unboxing-3cam': {
    id: 'unboxing-3cam',
    name: '3-Camera Pro Unboxing Suite',
    icon: '📦',
    category: 'Video & Tech',
    description: 'Multi-angle studio with front talking camera, 45° detail cam, top-down boom, and live video switcher',
    defaultRoom: { width: 4.8, depth: 4.0 },
    items: [
      // 0: Unboxing Presentation Desk
      { equipmentId: 'content-table', x: 0, z: -0.5, rotationY: 0 },
      { equipmentId: 'multi-cam-switcher', x: 0.42, z: -0.45, rotationY: -0.2, parentId: 0 },
      { equipmentId: 'podcast-mic', x: -0.38, z: -0.42, rotationY: 0.2, parentId: 0 },
      { equipmentId: 'audio-recorder', x: 0.42, z: -0.62, rotationY: 0, parentId: 0 },
      // Host Ergonomic Chair
      { equipmentId: 'chair', x: 0, z: 0.05, rotationY: 0 },
      // Camera 1: Master Front Talking Head
      { equipmentId: 'camera', x: 0, z: 1.25, rotationY: Math.PI, isMainCamera: true },
      // Camera 2: Left 45-Degree Macro Product Detail
      { equipmentId: 'camera', x: -1.1, z: 0.45, rotationY: Math.PI * 0.75 },
      // Camera 3: Top-Down Articulating Overhead Boom Rig
      { equipmentId: 'overhead-rig', x: 0.35, z: -0.5, rotationY: -Math.PI / 2 },
      // Dual Softboxes & Light Flag Cutter
      { equipmentId: 'softbox', x: -1.6, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'softbox', x: 1.6, z: 0.3, rotationY: -Math.PI / 3 },
      { equipmentId: 'c-stand-flag', x: -1.4, z: -0.6, rotationY: Math.PI / 4 },
      // Power & Shelf
      { equipmentId: 'shelf-props', x: -1.7, z: -1.3, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: 1.6, z: -1.3, rotationY: 0 },
    ],
  },

  'voiceover-booth': {
    id: 'voiceover-booth',
    name: 'Isolation Voiceover & Audiobook',
    icon: '🎙️',
    category: 'Audio & Music',
    description: 'Tightly dampened acoustic booth with reflection shield, broadcast shotgun mic, and floor monitor',
    defaultRoom: { width: 3.4, depth: 2.8 },
    items: [
      // 0: Script Stand Table
      { equipmentId: 'content-table', x: 0, z: -0.3, rotationY: 0 },
      { equipmentId: 'audio-recorder', x: 0.35, z: -0.3, rotationY: 0, parentId: 0 },
      { equipmentId: 'desk-lamp', x: -0.35, z: -0.35, rotationY: 0, parentId: 0 },
      // Voice Actor Stool
      { equipmentId: 'chair', x: 0, z: 0.25, rotationY: 0 },
      // Heavy Vocal Reflection Shield with Mic
      { equipmentId: 'vocal-booth-screen', x: 0, z: -0.05, rotationY: 0 },
      // Floor preview script monitor
      { equipmentId: 'floor-monitor', x: 0.65, z: 0.45, rotationY: Math.PI * 0.8 },
      // 360 Acoustic Foam Wall Coverage
      { equipmentId: 'acoustic-panel', x: -0.75, z: -1.25, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0.75, z: -1.25, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: -1.55, z: 0, rotationY: Math.PI / 2 },
      { equipmentId: 'acoustic-panel', x: 1.55, z: 0, rotationY: -Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.1, z: 0.8, rotationY: 0 },
    ],
  },

  'mobile-vlog-station': {
    id: 'mobile-vlog-station',
    name: 'Mobile Smartphone & Gimbal Station',
    icon: '📱',
    category: 'Video & Tech',
    description: 'Fast-turnaround vertical TikTok & Reels creator hub with phone gimbal, wireless audio, and ring light',
    defaultRoom: { width: 3.8, depth: 3.2 },
    items: [
      { equipmentId: 'backdrop', x: 0, z: -1.3, rotationY: 0 },
      // 0: Props & Phone Charging Table
      { equipmentId: 'content-table', x: -1.1, z: -0.4, rotationY: Math.PI / 2 },
      { equipmentId: 'power-station', x: -1.1, z: -0.5, rotationY: 0, parentId: 0 },
      // Center Standing Host Zone
      { equipmentId: 'phone-gimbal', x: 0, z: 0.8, rotationY: Math.PI, isMainCamera: true },
      { equipmentId: 'ring-light', x: 0, z: 0.82, rotationY: Math.PI },
      // Dual wireless lavaliers and sound recorder
      { equipmentId: 'lavalier', x: 0, z: 0, rotationY: 0 },
      // RGB mood tube in corner
      { equipmentId: 'rgb-tube', x: 1.3, z: -1.0, rotationY: -Math.PI / 4 },
      { equipmentId: 'generator', x: 1.3, z: 0.9, rotationY: 0 },
    ],
  },

  'gaming-dual-host': {
    id: 'gaming-dual-host',
    name: 'Esports & Co-Op Stream Lounge',
    icon: '🎮',
    category: 'Video & Tech',
    description: 'Dual-seat gaming station with side-by-side chairs, studio monitors, dynamic mics, and barndoor wash',
    defaultRoom: { width: 5.2, depth: 4.2 },
    items: [
      // 0: Wide Co-Op Gaming Desk
      { equipmentId: 'content-table', x: 0, z: -0.7, rotationY: 0 },
      { equipmentId: 'podcast-mic', x: -0.45, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'podcast-mic', x: 0.45, z: -0.6, rotationY: 0, parentId: 0 },
      { equipmentId: 'studio-monitor', x: -0.85, z: -0.72, rotationY: 0.15, parentId: 0 },
      { equipmentId: 'studio-monitor', x: 0.85, z: -0.72, rotationY: -0.15, parentId: 0 },
      // Dual Streamer Gaming Chairs
      { equipmentId: 'chair', x: -0.42, z: -0.1, rotationY: 0 },
      { equipmentId: 'chair', x: 0.42, z: -0.1, rotationY: 0 },
      // Master Center Camera
      { equipmentId: 'camera', x: 0, z: 1.25, rotationY: Math.PI, isMainCamera: true },
      // Dual Barndoor Side Lights
      { equipmentId: 'barndoor-light', x: -1.8, z: 0.3, rotationY: Math.PI / 3 },
      { equipmentId: 'barndoor-light', x: 1.8, z: 0.3, rotationY: -Math.PI / 3 },
      // Dual RGB Neon Tubes on Back Wall
      { equipmentId: 'rgb-tube', x: -1.2, z: -1.6, rotationY: 0 },
      { equipmentId: 'rgb-tube', x: 1.2, z: -1.6, rotationY: 0 },
      { equipmentId: 'acoustic-panel', x: 0, z: -1.95, rotationY: 0 },
      { equipmentId: 'power-station', x: -1.9, z: -1.2, rotationY: 0 },
    ],
  },
};

// Curated catalog only: the 20 hand-built templates above are the presets we
// stand behind. The mass-generated scenario catalog (100+ near-duplicates)
// was removed from the picker — it drowned the usable setups.
export const COMPREHENSIVE_TEMPLATES: Record<string, CreatorTemplate> = {
  ...CREATOR_TEMPLATES,
};

export const COMPREHENSIVE_TEMPLATE_IDS: string[] = Object.keys(COMPREHENSIVE_TEMPLATES);

export const TEMPLATE_IDS: CreatorTemplateId[] = COMPREHENSIVE_TEMPLATE_IDS as any;


