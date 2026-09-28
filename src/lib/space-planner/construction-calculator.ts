import type {
  WallSegment,
  HouseOpening,
  RoomZone,
  PlotConfig,
  RoofConfig,
  MaterialUnitRates,
  ConstructionBoQ,
} from '@/components/space-planner/types';

export const DEFAULT_UNIT_RATES: MaterialUnitRates = {
  cementBagGHS: 98,           // 50kg bag (Ghacem, CIMAF, Dangote 42.5R/32.5R)
  sandcrete6InchBlockGHS: 8.50, // Standard 6-inch solid/hollow sandcrete block
  sandcrete5InchBlockGHS: 7.50, // 5-inch partition block
  sandcrete9InchBlockGHS: 12.00,// 9-inch load-bearing / perimeter fence block
  sandTripGHS: 1900,          // 20-tonne / 14m³ coarse river sand tipper trip
  chippingsTripGHS: 2400,     // 20-tonne crushed granite chippings trip
  rebarTonGHS: 14500,         // High-tensile deformed iron rods (12mm/16mm)
  roofingSheetM2GHS: 120,     // 0.45mm / 0.50mm Aluzinc / Aluminum roofing sheets
  exchangeRateGHSPerUSD: 15.5,// Current commercial exchange rate
};

export const STANDARD_PLOT_PRESETS: Record<string, PlotConfig> = {
  '100x80': {
    preset: '100x80',
    name: "100' × 80' Standard Residential Plot (8,000 sq ft)",
    widthFt: 100,
    depthFt: 80,
    widthM: 30.48,
    depthM: 24.38,
    compoundFinish: 'pavement-blocks',
    showPerimeterFence: true,
    fenceHeightM: 2.2,
    frontSetbackFt: 20,
    rearSetbackFt: 10,
    sideSetbackFt: 8,
  },
  '100x70': {
    preset: '100x70',
    name: "100' × 70' Residential Subdivision Plot (7,000 sq ft)",
    widthFt: 100,
    depthFt: 70,
    widthM: 30.48,
    depthM: 21.34,
    compoundFinish: 'pavement-blocks',
    showPerimeterFence: true,
    fenceHeightM: 2.2,
    frontSetbackFt: 18,
    rearSetbackFt: 10,
    sideSetbackFt: 8,
  },
  '100x50': {
    preset: '100x50',
    name: "100' × 50' Half Plot / Compact Urban (5,000 sq ft)",
    widthFt: 100,
    depthFt: 50,
    widthM: 30.48,
    depthM: 15.24,
    compoundFinish: 'pavement-blocks',
    showPerimeterFence: true,
    fenceHeightM: 2.2,
    frontSetbackFt: 15,
    rearSetbackFt: 8,
    sideSetbackFt: 6,
  },
  '70x50': {
    preset: '70x50',
    name: "70' × 50' Corner / Quarter Plot (3,500 sq ft)",
    widthFt: 70,
    depthFt: 50,
    widthM: 21.34,
    depthM: 15.24,
    compoundFinish: 'mixed',
    showPerimeterFence: true,
    fenceHeightM: 2.2,
    frontSetbackFt: 12,
    rearSetbackFt: 6,
    sideSetbackFt: 5,
  },
};

/**
 * Calculates Ghanaian & West African residential construction material quantities & cost (Bill of Quantities)
 */
export function calculateConstructionBoQ(params: {
  walls: WallSegment[];
  openings: HouseOpening[];
  rooms: RoomZone[];
  plot: PlotConfig;
  roof: RoofConfig;
  rates?: Partial<MaterialUnitRates>;
  hasFirstFloor?: boolean;
}): ConstructionBoQ {
  const rates: MaterialUnitRates = { ...DEFAULT_UNIT_RATES, ...(params.rates || {}) };
  const { walls, openings, rooms, plot, hasFirstFloor } = params;

  // 1. Calculate Gross Wall Length and Areas
  let grossWallArea6Inch = 0;
  let grossWallArea5Inch = 0;
  let grossWallArea9Inch = 0;

  for (const wall of walls) {
    const dx = wall.endX - wall.startX;
    const dz = wall.endZ - wall.startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const height = wall.height || 3.0;
    const area = length * height;

    if (wall.thickness === '5-inch') {
      grossWallArea5Inch += area;
    } else if (wall.thickness === '9-inch') {
      grossWallArea9Inch += area;
    } else {
      grossWallArea6Inch += area;
    }
  }

  // If walls array is empty, derive approximate walls from rooms if rooms exist
  if (walls.length === 0 && rooms.length > 0) {
    for (const room of rooms) {
      const perimeter = 2 * (room.width + room.depth);
      const height = 3.0;
      // Assume 60% external/load-bearing 6", 40% partition 5"
      grossWallArea6Inch += perimeter * height * 0.6;
      grossWallArea5Inch += perimeter * height * 0.4;
    }
  }

  // 2. Openings Deduction (Doors & Windows)
  let openingsAreaM2 = 0;
  for (const op of openings) {
    openingsAreaM2 += (op.width || 1.2) * (op.height || 1.5);
  }

  const grossWallAreaTotal = grossWallArea6Inch + grossWallArea5Inch + grossWallArea9Inch;
  const netWallAreaM2 = Math.max(0, grossWallAreaTotal - openingsAreaM2);

  // Proportional net area for each block thickness
  const ratio6 = grossWallAreaTotal > 0 ? grossWallArea6Inch / grossWallAreaTotal : 0.65;
  const ratio5 = grossWallAreaTotal > 0 ? grossWallArea5Inch / grossWallAreaTotal : 0.25;
  const ratio9 = grossWallAreaTotal > 0 ? grossWallArea9Inch / grossWallAreaTotal : 0.10;

  const net6Area = netWallAreaM2 * ratio6;
  const net5Area = netWallAreaM2 * ratio5;
  const net9Area = netWallAreaM2 * ratio9;

  // 3. Sandcrete Blocks Calculation
  // Standard in Ghana: 450mm x 225mm block = ~10 blocks per m² + 8% wastage
  const BLOCKS_PER_M2 = 10.2;
  const WASTAGE_MULTIPLIER = 1.08;

  const blocks6InchCount = Math.round(net6Area * BLOCKS_PER_M2 * WASTAGE_MULTIPLIER);
  const blocks5InchCount = Math.round(net5Area * BLOCKS_PER_M2 * WASTAGE_MULTIPLIER);
  const blocks9InchCount = Math.round(net9Area * BLOCKS_PER_M2 * WASTAGE_MULTIPLIER);
  const totalBlocksCount = blocks6InchCount + blocks5InchCount + blocks9InchCount;

  // 4. Built Footprint and Floor Area
  let builtFootprintM2 = 0;
  let totalFloorAreaM2 = 0;

  for (const room of rooms) {
    const rArea = (room.width || 4) * (room.depth || 4);
    if (room.floor === 'ground' || !room.floor) {
      builtFootprintM2 += rArea;
    }
    totalFloorAreaM2 += rArea;
  }

  if (builtFootprintM2 === 0) {
    // fallback based on net wall area: approx A_floor ≈ (Wall_Perimeter / 4)^2
    builtFootprintM2 = Math.max(70, Math.round(netWallAreaM2 * 0.75));
    totalFloorAreaM2 = hasFirstFloor ? builtFootprintM2 * 1.8 : builtFootprintM2;
  }

  const plotAreaM2 = plot.widthM * plot.depthM;
  const plotCoveragePct = plotAreaM2 > 0 ? Math.min(100, Math.round((builtFootprintM2 / plotAreaM2) * 100)) : 25;

  // 5. Cement Bags Calculation (50kg bags)
  // A. Block laying mortar: 1 bag lays ~55 blocks
  const cementLayingBags = Math.round(totalBlocksCount / 55);

  // B. Wall plastering/rendering: 12mm thickness, 2 sides (interior + exterior).
  // 6.5 bags per 100m² of wall face * 2 faces = 13 bags per 100m² net wall
  const cementPlasteringBags = Math.round((netWallAreaM2 * 2 * 6.5) / 100);

  // C. German Floor (concrete slab 150mm oversite concrete at 1:2:4 mix):
  // 6.1 bags per m³ * (Area * 0.15m)
  const slabVolumeM3 = builtFootprintM2 * 0.15;
  let cementGermanFloorBags = Math.round(slabVolumeM3 * 6.1);
  if (hasFirstFloor) {
    // Add suspended slab for first floor (150mm reinforced concrete slab)
    cementGermanFloorBags += Math.round((builtFootprintM2 * 0.8 * 0.15) * 6.8);
  }

  // D. Columns, footings & lintel ring beams
  const cementBeamsLintelsBags = Math.round((cementLayingBags + cementGermanFloorBags) * 0.22);

  const totalCementBags =
    cementLayingBags + cementPlasteringBags + cementGermanFloorBags + cementBeamsLintelsBags;

  // 6. Aggregates (Coarse Sand & Granite Chippings)
  // 1 trip (20 tonnes / 14m³) coarse sand per ~650 blocks + plastering + slab
  const sandTrips = Math.max(2, Math.ceil(totalBlocksCount / 650 + builtFootprintM2 / 65));
  // 1 trip chippings per ~40 m² of concrete slab and lintels
  const chippingsTrips = Math.max(2, Math.ceil(builtFootprintM2 / 45 + (hasFirstFloor ? 3 : 0)));

  // 7. Rebar / High-Tensile Iron Rods
  // Footing trench, columns, lintels, ring beam, suspended slab
  const rebarTons = Number(
    ((builtFootprintM2 * 0.012) + (hasFirstFloor ? builtFootprintM2 * 0.016 : 0) + 0.5).toFixed(1)
  );

  // 8. Roofing Area
  // Roof area = built footprint * 1.15 (slope & overhang allowance)
  const roofingAreaM2 = Math.round(builtFootprintM2 * 1.18);

  // 9. Itemized Costs (GH₵)
  const costBlocks =
    blocks6InchCount * rates.sandcrete6InchBlockGHS +
    blocks5InchCount * rates.sandcrete5InchBlockGHS +
    blocks9InchCount * rates.sandcrete9InchBlockGHS;

  const costCement = totalCementBags * rates.cementBagGHS;
  const costSandChippings = sandTrips * rates.sandTripGHS + chippingsTrips * rates.chippingsTripGHS;
  const costRebar = rebarTons * rates.rebarTonGHS;
  const costRoofing = roofingAreaM2 * rates.roofingSheetM2GHS;

  // In Ghana, skilled mason & steel bender labor typically amounts to ~28-35% of material package
  const materialSubtotal = costBlocks + costCement + costSandChippings + costRebar + costRoofing;
  const estimatedLabor = Math.round(materialSubtotal * 0.32);

  const totalCostGHS = Math.round(materialSubtotal + estimatedLabor);
  const totalCostUSD = Math.round(totalCostGHS / (rates.exchangeRateGHSPerUSD || 15.5));

  return {
    grossWallAreaM2: Math.round(grossWallAreaTotal),
    openingsAreaM2: Math.round(openingsAreaM2),
    netWallAreaM2: Math.round(netWallAreaM2),
    blocks6InchCount,
    blocks5InchCount,
    blocks9InchCount,
    totalBlocksCount,
    blocksWastagePct: 8,
    cementLayingBags,
    cementPlasteringBags,
    cementGermanFloorBags,
    cementBeamsLintelsBags,
    totalCementBags,
    sandTrips,
    chippingsTrips,
    rebarTons,
    roofingAreaM2,
    builtFootprintM2,
    totalFloorAreaM2,
    plotCoveragePct,
    totalCostGHS,
    totalCostUSD,
    itemizedCostsGHS: {
      blocks: Math.round(costBlocks),
      cement: Math.round(costCement),
      sandChippings: Math.round(costSandChippings),
      rebar: Math.round(costRebar),
      roofing: Math.round(costRoofing),
      estimatedLabor,
    },
  };
}
