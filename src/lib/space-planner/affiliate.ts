// ============================================================
// Creator Space Planner — Affiliate & E-Commerce Procurement Engine
// Direct Shoppable Links (Amazon, B&H Photo, Sweetwater) with Creator Tag Support
// ============================================================

import type { Currency, PlacedObject, EquipmentDefinition } from '@/components/space-planner/types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from '@/components/space-planner/gear-library';

export const DEFAULT_AMAZON_AFFILIATE_TAG = 'creatorkit-20';

export interface BrandMetadata {
  brand: string;
  model: string;
  searchQuery: string;
  typicalPriceUSD: number;
  amazonAsinOrQuery?: string;
  bhPhotoSkuOrQuery?: string;
  sweetwaterSkuOrQuery?: string;
}

// Real-world brand mappings for popular studio equipment
export const BRAND_EQUIPMENT_MAP: Record<string, BrandMetadata> = {
  // Cameras & Lenses
  'camera': {
    brand: 'Sony',
    model: 'Alpha 7 IV Full-Frame Camera',
    searchQuery: 'Sony A7 IV full frame mirrorless camera body',
    typicalPriceUSD: 2498,
    amazonAsinOrQuery: 'Sony Alpha 7 IV',
    bhPhotoSkuOrQuery: 'sony a7 iv',
  },
  'cam-cine-mini': {
    brand: 'Blackmagic Design',
    model: 'Pocket Cinema Camera 6K Pro',
    searchQuery: 'Blackmagic Pocket Cinema Camera 6K Pro',
    typicalPriceUSD: 2535,
    amazonAsinOrQuery: 'Blackmagic Pocket Cinema Camera 6K Pro',
    bhPhotoSkuOrQuery: 'blackmagic pocket 6k pro',
  },
  'webcam': {
    brand: 'Elgato',
    model: 'Facecam Pro 4K60 Ultra-HD Camera',
    searchQuery: 'Elgato Facecam Pro 4K60',
    typicalPriceUSD: 299,
    amazonAsinOrQuery: 'Elgato Facecam Pro',
    bhPhotoSkuOrQuery: 'elgato facecam pro',
  },
  'phone-gimbal': {
    brand: 'DJI',
    model: 'Osmo Mobile 6 Smartphone Gimbal',
    searchQuery: 'DJI Osmo Mobile 6 3-axis smartphone gimbal stabilizer',
    typicalPriceUSD: 149,
    amazonAsinOrQuery: 'DJI Osmo Mobile 6',
  },
  'teleprompter': {
    brand: 'Elgato',
    model: 'Prompter Multi-Screen Studio Teleprompter',
    searchQuery: 'Elgato Prompter for livestreaming and video production',
    typicalPriceUSD: 279,
    amazonAsinOrQuery: 'Elgato Prompter',
  },

  // Lighting & Modifiers
  'softbox': {
    brand: 'Aputure / Amaran',
    model: 'Amaran 200x S Bi-Color LED Point-Source Light',
    searchQuery: 'Amaran 200x S Bi-Color Point-Source LED Light with Bowens mount',
    typicalPriceUSD: 349,
    amazonAsinOrQuery: 'Amaran 200x S',
    bhPhotoSkuOrQuery: 'amaran 200x s',
  },
  'led-light': {
    brand: 'Elgato',
    model: 'Key Light Air Professional Studio LED Panel',
    searchQuery: 'Elgato Key Light Air 1400 lumens desk-mounted LED panel',
    typicalPriceUSD: 129,
    amazonAsinOrQuery: 'Elgato Key Light Air',
  },
  'rgb-tube': {
    brand: 'Nanlite',
    model: 'PavoTube II 6C / 15C RGBWW LED Tube Light',
    searchQuery: 'Nanlite PavoTube II RGBWW LED pixel tube light',
    typicalPriceUSD: 169,
    amazonAsinOrQuery: 'Nanlite PavoTube II',
  },
  'ring-light': {
    brand: 'Neewer',
    model: '18-inch Pro Bi-Color LED Ring Light Kit',
    searchQuery: 'Neewer 18 inch LED ring light with tripod stand and phone holder',
    typicalPriceUSD: 99,
    amazonAsinOrQuery: 'Neewer 18-inch Ring Light',
  },

  // Audio & Microphones
  'microphone': {
    brand: 'Shure',
    model: 'SM7B Cardioid Dynamic Vocal Microphone',
    searchQuery: 'Shure SM7B dynamic broadcast microphone',
    typicalPriceUSD: 399,
    amazonAsinOrQuery: 'Shure SM7B',
    bhPhotoSkuOrQuery: 'shure sm7b',
    sweetwaterSkuOrQuery: 'SM7B',
  },
  'podcast-mic': {
    brand: 'Rode',
    model: 'PodMic Cardioid Dynamic Broadcast Mic',
    searchQuery: 'Rode PodMic dynamic podcasting microphone',
    typicalPriceUSD: 99,
    amazonAsinOrQuery: 'Rode PodMic',
    sweetwaterSkuOrQuery: 'PodMic',
  },
  'audio-recorder': {
    brand: 'Focusrite',
    model: 'Scarlett 2i2 4th Gen USB Audio Interface',
    searchQuery: 'Focusrite Scarlett 2i2 4th Generation 2-in 2-out USB Audio Interface',
    typicalPriceUSD: 199,
    amazonAsinOrQuery: 'Focusrite Scarlett 2i2 4th Gen',
    sweetwaterSkuOrQuery: 'Scarlet2i2G4',
  },
  'lavalier': {
    brand: 'Rode',
    model: 'Wireless PRO Dual-Channel Compact Wireless Mic System',
    searchQuery: 'Rode Wireless PRO dual transmitter lavalier kit with 32-bit float',
    typicalPriceUSD: 399,
    amazonAsinOrQuery: 'Rode Wireless PRO',
  },
  'studio-monitor': {
    brand: 'Yamaha',
    model: 'HS5 5-inch Powered Studio Reference Monitors (Pair)',
    searchQuery: 'Yamaha HS5 nearfield powered studio monitors',
    typicalPriceUSD: 398,
    amazonAsinOrQuery: 'Yamaha HS5 Pair',
    sweetwaterSkuOrQuery: 'HS5pr',
  },
  'acoustic-panel': {
    brand: 'Primacoustic',
    model: 'Broadway Studio Acoustic Sound Absorption Panels',
    searchQuery: 'Primacoustic Broadway acoustic wall panels 24x24 inch soundproofing',
    typicalPriceUSD: 149,
    amazonAsinOrQuery: 'Acoustic Sound Absorption Panels 2 inch',
  },

  // Furniture & Desks
  'content-table': {
    brand: 'Secretlab',
    model: 'MAGNUS Pro Sit-to-Stand Metal Studio Desk (1.5m)',
    searchQuery: 'Secretlab Magnus Pro sit-to-stand desk with magnetic cable management',
    typicalPriceUSD: 849,
    amazonAsinOrQuery: 'sit stand studio desk electric',
  },
  'chair': {
    brand: 'Herman Miller',
    model: 'Embody Ergonomic Studio Task Chair',
    searchQuery: 'Herman Miller Embody ergonomic chair rhythm fabric',
    typicalPriceUSD: 1795,
    amazonAsinOrQuery: 'ergonomic studio office chair high back',
  },
  'tripod': {
    brand: 'Manfrotto',
    model: '504X Fluid Video Head & Aluminum Twin Leg Tripod',
    searchQuery: 'Manfrotto 504X fluid video head tripod system',
    typicalPriceUSD: 699,
    amazonAsinOrQuery: 'Manfrotto 504X Tripod',
  },
  'green-screen': {
    brand: 'Elgato',
    model: 'Green Screen MT Wall/Ceiling Mountable Chroma Key Panel',
    searchQuery: 'Elgato Green Screen MT collapsible wrinkle-resistant',
    typicalPriceUSD: 159,
    amazonAsinOrQuery: 'Elgato Green Screen MT',
  },
  'power-station': {
    brand: 'EcoFlow',
    model: 'DELTA 2 1024Wh Portable Power Station (1800W)',
    searchQuery: 'EcoFlow DELTA 2 portable power station LiFePO4 battery',
    typicalPriceUSD: 799,
    amazonAsinOrQuery: 'EcoFlow DELTA 2',
  },
};

/**
 * Builds direct affiliate purchase link for Amazon with custom or default creator tag
 */
export function getAmazonAffiliateUrl(
  searchQuery: string,
  userTag?: string
): string {
  const tag = (userTag && userTag.trim().length > 0) ? userTag.trim() : DEFAULT_AMAZON_AFFILIATE_TAG;
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://www.amazon.com/s?k=${encodedQuery}&tag=${encodeURIComponent(tag)}`;
}

/**
 * Builds direct search link for B&H Photo Video
 */
export function getBhPhotoUrl(searchQuery: string): string {
  const encoded = encodeURIComponent(searchQuery);
  return `https://www.bhphotovideo.com/c/search?Ntt=${encoded}`;
}

/**
 * Builds direct search link for Sweetwater Sound
 */
export function getSweetwaterUrl(searchQuery: string): string {
  const encoded = encodeURIComponent(searchQuery);
  return `https://www.sweetwater.com/store/search?s=${encoded}`;
}

/**
 * Resolves full brand metadata and affiliate links for a given equipment ID
 */
export function resolveEquipmentAffiliateInfo(
  equipmentId: string,
  userTag?: string
): {
  brand: string;
  model: string;
  searchQuery: string;
  typicalPriceUSD: number;
  amazonUrl: string;
  bhPhotoUrl: string;
  sweetwaterUrl: string;
} {
  const def = COMPREHENSIVE_EQUIPMENT_CATALOG[equipmentId];
  const brandMeta = BRAND_EQUIPMENT_MAP[equipmentId];

  const brand = brandMeta?.brand || def?.brand || 'Creator Pro';
  const model = brandMeta?.model || def?.model || def?.name || equipmentId;
  const searchQuery = brandMeta?.searchQuery || `${brand} ${model}`;
  const typicalPriceUSD = brandMeta?.typicalPriceUSD || def?.defaultPriceUSD || 199;

  return {
    brand,
    model,
    searchQuery,
    typicalPriceUSD,
    amazonUrl: getAmazonAffiliateUrl(searchQuery, userTag),
    bhPhotoUrl: getBhPhotoUrl(searchQuery),
    sweetwaterUrl: getSweetwaterUrl(searchQuery),
  };
}

export interface BillOfMaterialsItem {
  id: string;
  equipmentId: string;
  placedObjectId: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  icon: string;
  watts: number;
  quantity: number;
  unitPriceUSD: number;
  typicalPriceUSD: number;
  totalPriceUSD: number;
  subtotalUSD: number;
  amazonUrl: string;
  bhPhotoUrl: string;
  sweetwaterUrl: string;
}

/**
 * Generates an aggregated Bill of Materials (BOM) for all placed objects in the room
 */
export function generateBillOfMaterials(
  placedObjects: PlacedObject[],
  userAffiliateTag?: string
): {
  items: BillOfMaterialsItem[];
  totalCostUSD: number;
  totalEstimatedUSD: number;
  totalWatts: number;
  totalPowerWatts: number;
  itemCount: number;
  totalUnits: number;
  categoryTotals: Record<string, number>;
} {
  const aggregated = new Map<string, { count: number; firstObj: PlacedObject }>();

  placedObjects.forEach((obj) => {
    const existing = aggregated.get(obj.equipmentId);
    if (existing) {
      existing.count += 1;
    } else {
      aggregated.set(obj.equipmentId, { count: 1, firstObj: obj });
    }
  });

  const items: BillOfMaterialsItem[] = [];
  let totalCostUSD = 0;
  let totalWatts = 0;
  const categoryTotals: Record<string, number> = {};

  aggregated.forEach(({ count, firstObj }, eqId) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[eqId];
    if (!def) return;

    const aff = resolveEquipmentAffiliateInfo(eqId, userAffiliateTag);
    const unitPrice = firstObj.customPriceUSD ?? aff.typicalPriceUSD ?? def.defaultPriceUSD ?? Math.round(def.defaultPriceGHS / 15);
    const lineTotal = unitPrice * count;
    const lineWatts = (def.watts || 0) * count;

    totalCostUSD += lineTotal;
    totalWatts += lineWatts;

    categoryTotals[def.category] = (categoryTotals[def.category] || 0) + lineTotal;

    items.push({
      id: eqId,
      equipmentId: eqId,
      placedObjectId: firstObj.id,
      name: def.name,
      brand: aff.brand,
      model: aff.model,
      category: def.category,
      icon: def.icon,
      watts: def.watts,
      quantity: count,
      unitPriceUSD: unitPrice,
      typicalPriceUSD: unitPrice,
      totalPriceUSD: lineTotal,
      subtotalUSD: lineTotal,
      amazonUrl: aff.amazonUrl,
      bhPhotoUrl: aff.bhPhotoUrl,
      sweetwaterUrl: aff.sweetwaterUrl,
    });
  });

  return {
    items,
    totalCostUSD,
    totalEstimatedUSD: totalCostUSD,
    totalWatts,
    totalPowerWatts: totalWatts,
    itemCount: placedObjects.length,
    totalUnits: placedObjects.length,
    categoryTotals,
  };
}
