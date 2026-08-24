// ============================================================
// Creator Space Planner — 1-Click Viral Kit Sharing Engine
// URL state compression with LZ-string for instant studio setup sharing
// ============================================================

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { PlannerState, PlacedObject, ProjectInfo, FloorFinish, Currency } from '@/components/space-planner/types';

export interface SharedStudioKitPayload {
  v: number; // Schema version
  name: string;
  w: number; // room width
  d: number; // room depth
  h: number; // room height
  f: FloorFinish; // floor finish
  tag?: string; // creator affiliate tag
  objs: Array<{
    id: string;
    e: string; // equipmentId
    x: number;
    z: number;
    r: number; // rotationY
    c?: boolean; // isMainCamera
    l?: string; // lensPreset
    s?: string; // sensorSize
    a?: string; // aperture
    p?: string; // parentId
    y?: number; // elevationY
    i?: number; // light intensity
    k?: number; // light kelvin
  }>;
}

/**
 * Compresses the current studio state into a compact URL query string
 */
export function compressStudioKit(
  state: {
    roomWidth: number;
    roomDepth: number;
    roomHeight: number;
    floorFinish?: FloorFinish;
    projectInfo: ProjectInfo;
    userAffiliateTag?: string;
    placedObjects: PlacedObject[];
  }
): string {
  const payload: SharedStudioKitPayload = {
    v: 2,
    name: state.projectInfo.name || 'Studio Kit',
    w: Math.round(state.roomWidth * 10) / 10,
    d: Math.round(state.roomDepth * 10) / 10,
    h: Math.round((state.roomHeight || 3.0) * 10) / 10,
    f: state.floorFinish || 'oak-parquet',
    tag: state.userAffiliateTag,
    objs: state.placedObjects.map((o) => ({
      id: o.id,
      e: o.equipmentId,
      x: Math.round(o.x * 100) / 100,
      z: Math.round(o.z * 100) / 100,
      r: Math.round(o.rotationY * 100) / 100,
      c: o.isMainCamera ? true : undefined,
      l: o.lensPreset,
      s: o.sensorSize,
      a: o.aperture,
      p: o.parentId,
      y: o.elevationY ? Math.round(o.elevationY * 100) / 100 : undefined,
      i: o.lightSettings?.intensity,
      k: o.lightSettings?.colorTempKelvin,
    })),
  };

  const jsonStr = JSON.stringify(payload);
  const compressed = compressToEncodedURIComponent(jsonStr);
  return compressed;
}

/**
 * Decompresses a studio kit from URL query parameter
 */
export function decompressStudioKit(
  compressedStr: string
): {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  floorFinish: FloorFinish;
  projectName: string;
  creatorTag?: string;
  placedObjects: PlacedObject[];
} | null {
  try {
    let jsonStr = decompressFromEncodedURIComponent(compressedStr);
    if (!jsonStr) {
      // Fallback to base64 decode if uncompressed
      try {
        jsonStr = decodeURIComponent(atob(compressedStr));
      } catch {
        return null;
      }
    }
    if (!jsonStr) return null;

    const payload: SharedStudioKitPayload = JSON.parse(jsonStr);
    if (!payload || !Array.isArray(payload.objs)) return null;

    const placedObjects: PlacedObject[] = payload.objs.map((o, idx) => ({
      id: o.id || `shared-obj-${idx}`,
      equipmentId: o.e as any,
      x: o.x,
      z: o.z,
      rotationY: o.r || 0,
      isMainCamera: Boolean(o.c),
      lensPreset: (o.l as any) || '24mm',
      sensorSize: (o.s as any) || 'full-frame',
      aperture: (o.a as any) || 'f/2.8',
      parentId: o.p,
      elevationY: o.y,
      lightSettings: o.i !== undefined ? {
        intensity: o.i,
        colorTempKelvin: o.k || 5600,
        colorHex: '#FFFFFF',
      } : undefined,
    }));

    return {
      roomWidth: payload.w || 5,
      roomDepth: payload.d || 4,
      roomHeight: payload.h || 3.0,
      floorFinish: payload.f || 'oak-parquet',
      projectName: payload.name || 'Shared Creator Studio',
      creatorTag: payload.tag,
      placedObjects,
    };
  } catch (err) {
    console.error('Failed to parse shared studio kit:', err);
    return null;
  }
}

/**
 * Generates the full shareable URL with embedded studio kit payload
 */
export function generateShareableKitUrl(
  state: {
    roomWidth: number;
    roomDepth: number;
    roomHeight: number;
    floorFinish?: FloorFinish;
    projectInfo: ProjectInfo;
    userAffiliateTag?: string;
    placedObjects: PlacedObject[];
  }
): string {
  if (typeof window === 'undefined') return '';
  const compressed = compressStudioKit(state);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}?kit=${compressed}`;
}
