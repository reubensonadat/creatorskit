// ============================================================
// Creator Space Planner — Lighting, Acoustics & Gear Compatibility Engine
// Sabine RT60 acoustics, 3-point lighting diagnostics & gear chain validation
// ============================================================

import type {
  PlacedObject,
  FloorFinish,
  EquipmentDefinition,
  SpacingWarning,
} from '@/components/space-planner/types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from '@/components/space-planner/gear-library';

export interface AcousticAnalysis {
  roomVolumeM3: number;
  totalSurfaceAreaM2: number;
  rt60Seconds: number;
  acousticRating: 'Studio Grade / Broadcast' | 'Good Speech / Podcast' | 'Acceptable / Light Echo' | 'Untreated / High Flutter Echo';
  panelCoveragePercent: number;
  recommendedPanelCount: number;
  currentPanelCount: number;
  tips: string[];
}

export interface LightingAnalysis {
  hasKeyLight: boolean;
  hasFillLight: boolean;
  hasRimLight: boolean;
  hasBackgroundLight: boolean;
  keyLightDistanceM: number;
  lightingSetupType: 'Complete 3-Point Studio Rig' | '2-Point Key + Fill' | 'Single Key Light' | 'Ambient Only / Incomplete';
  subjectToBackdropDistM: number;
  shadowSpillRisk: 'high' | 'moderate' | 'low';
  advice: string[];
}

export interface CompatibilityIssue {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  fixSuggestion: string;
  actionEquipmentId?: string;
  actionLabel?: string;
}

/**
 * Calculates Room Acoustic Absorption & RT60 Reverberation Time using Sabine's Formula
 * RT60 = 0.161 * V / A
 */
export function calculateRoomAcoustics(
  width: number,
  depth: number,
  height: number,
  floorFinish: FloorFinish = 'oak-parquet',
  placedObjects: PlacedObject[]
): AcousticAnalysis {
  const volume = width * depth * height;
  const floorArea = width * depth;
  const ceilingArea = floorArea;
  const wallArea = 2 * (width * height) + 2 * (depth * height);
  const totalSurfaceArea = floorArea + ceilingArea + wallArea;

  // Absorption coefficients at 1kHz
  let floorAlpha = 0.08; // Hardwood
  if (floorFinish === 'acoustic-carpet') floorAlpha = 0.35;
  if (floorFinish === 'concrete-loft') floorAlpha = 0.03;
  if (floorFinish === 'dark-epoxy') floorAlpha = 0.04;

  const ceilingAlpha = 0.05; // Standard drywall ceiling
  const bareWallAlpha = 0.06; // Bare drywall/plaster

  // Count acoustic treatment items placed in room
  let acousticPanels = 0;
  let diffusers = 0;
  let hasVocalBooth = false;

  placedObjects.forEach((obj) => {
    const id = obj.equipmentId;
    if (id === 'acoustic-panel' || id.includes('panel') || id.includes('foam')) {
      acousticPanels += 1;
    }
    if (id.includes('diffuser')) {
      diffusers += 1;
    }
    if (id.includes('vocal-booth') || id.includes('iso-vocal')) {
      hasVocalBooth = true;
    }
  });

  // Effective panel absorption: ~0.85 alpha per 0.6m x 0.6m panel (~0.36m2)
  const treatedAreaM2 = acousticPanels * 0.45;
  const remainingWallAreaM2 = Math.max(0, wallArea - treatedAreaM2);

  // Total absorption Sabins A
  let totalSabins =
    floorArea * floorAlpha +
    ceilingArea * ceilingAlpha +
    remainingWallAreaM2 * bareWallAlpha +
    treatedAreaM2 * 0.85 +
    diffusers * 0.3;

  if (hasVocalBooth) totalSabins += 4.0;

  // Sabine formula
  let rt60 = (0.161 * volume) / Math.max(0.1, totalSabins);
  rt60 = Math.round(rt60 * 100) / 100;

  // Recommended panels: aim for ~20-30% wall absorption for clean spoken word podcast/YouTube
  const targetTreatedArea = wallArea * 0.18;
  const recommendedPanelCount = Math.max(4, Math.ceil(targetTreatedArea / 0.45));
  const panelCoveragePercent = Math.min(100, Math.round((treatedAreaM2 / (wallArea * 0.25)) * 100));

  let acousticRating: AcousticAnalysis['acousticRating'] = 'Untreated / High Flutter Echo';
  const tips: string[] = [];

  if (rt60 <= 0.28) {
    acousticRating = 'Studio Grade / Broadcast';
    tips.push('✓ Pristine acoustic isolation for condenser mics and voiceovers.');
  } else if (rt60 <= 0.45) {
    acousticRating = 'Good Speech / Podcast';
    tips.push('✓ Good speech clarity with minimal room boominess.');
  } else if (rt60 <= 0.7) {
    acousticRating = 'Acceptable / Light Echo';
    tips.push('⚠️ Room is somewhat lively. Consider mounting 2–4 acoustic panels at first-reflection points.');
  } else {
    acousticRating = 'Untreated / High Flutter Echo';
    tips.push('⚠️ High room reverberation. Audio will sound hollow/echoey on sensitive studio microphones.');
    tips.push(`💡 Add at least ${recommendedPanelCount - acousticPanels} more acoustic panels or lay acoustic carpet to eliminate flutter echo.`);
  }

  return {
    roomVolumeM3: Math.round(volume * 10) / 10,
    totalSurfaceAreaM2: Math.round(totalSurfaceArea * 10) / 10,
    rt60Seconds: rt60,
    acousticRating,
    panelCoveragePercent,
    recommendedPanelCount,
    currentPanelCount: acousticPanels,
    tips,
  };
}

/**
 * Evaluates 3-Point Lighting Rig & Shadow Spill Risk
 */
export function analyzeStudioLighting(
  placedObjects: PlacedObject[],
  roomDepth: number
): LightingAnalysis {
  // Find subject / talent or main desk
  const subject = placedObjects.find(
    (o) =>
      o.equipmentId.includes('human') ||
      o.equipmentId.includes('chair') ||
      o.equipmentId.includes('desk') ||
      o.equipmentId === 'content-table'
  ) || { x: 0, z: 0, rotationY: 0 };

  const lights = placedObjects.filter((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    return def?.category === 'lighting' || o.lightSettings !== undefined;
  });

  let hasKey = false;
  let hasFill = false;
  let hasRim = false;
  let hasBg = false;
  let keyDistance = 1.8;

  lights.forEach((l) => {
    const dx = l.x - subject.x;
    const dz = l.z - subject.z;
    const dist = Math.hypot(dx, dz);
    const angleRad = Math.atan2(dx, dz);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Frontal Key/Fill vs Back Rim
    if (dz > 0.3) {
      if (Math.abs(angleDeg) > 15 && Math.abs(angleDeg) < 70) {
        if (!hasKey) {
          hasKey = true;
          keyDistance = Math.round(dist * 10) / 10;
        } else {
          hasFill = true;
        }
      } else {
        hasKey = true;
      }
    } else if (dz < -0.3) {
      if (Math.abs(dx) < 1.0) {
        hasRim = true; // Behind subject pointing forward
      } else {
        hasBg = true; // Side background accent
      }
    }
  });

  const subjectToBackdropDist = Math.max(0.2, subject.z - -roomDepth / 2);
  let shadowSpillRisk: LightingAnalysis['shadowSpillRisk'] = 'low';
  if (subjectToBackdropDist < 0.9 && hasKey) {
    shadowSpillRisk = 'high';
  } else if (subjectToBackdropDist < 1.5) {
    shadowSpillRisk = 'moderate';
  }

  let lightingSetupType: LightingAnalysis['lightingSetupType'] = 'Ambient Only / Incomplete';
  if (hasKey && hasFill && hasRim) lightingSetupType = 'Complete 3-Point Studio Rig';
  else if (hasKey && (hasFill || hasRim)) lightingSetupType = '2-Point Key + Fill';
  else if (hasKey) lightingSetupType = 'Single Key Light';

  const advice: string[] = [];
  if (shadowSpillRisk === 'high') {
    advice.push(`⚠️ Shadow Spill Risk: Subject is only ${subjectToBackdropDist.toFixed(1)}m from back wall. Key light will cast harsh distracting shadows on the backdrop. Pull desk forward.`);
  }
  if (!hasKey) {
    advice.push('💡 Add a Key Light (Softbox or LED Panel) placed 45° to the side of talent for flattering cinematic contrast.');
  }
  if (hasKey && !hasRim) {
    advice.push('💡 Consider adding a subtle Rim / Hair Light behind the talent to pop them off dark backgrounds.');
  }

  return {
    hasKeyLight: hasKey,
    hasFillLight: hasFill,
    hasRimLight: hasRim,
    hasBackgroundLight: hasBg,
    keyLightDistanceM: keyDistance,
    lightingSetupType,
    subjectToBackdropDistM: Math.round(subjectToBackdropDist * 10) / 10,
    shadowSpillRisk,
    advice,
  };
}

/**
 * Validates Gear Rig Compatibility (XLR Chains, Heavy Weights, Circuit Breakers)
 */
export function validateGearCompatibility(
  placedObjects: PlacedObject[]
): SpacingWarning[] {
  const warnings: SpacingWarning[] = [];

  const hasXlrMic = placedObjects.some((o) => {
    const id = o.equipmentId;
    return (
      id === 'microphone' ||
      id === 'podcast-mic' ||
      id.includes('sm7b') ||
      id.includes('podmic') ||
      id.includes('ribbon') ||
      id.includes('tube-condenser') ||
      id.includes('shotgun')
    );
  });

  const hasAudioInterface = placedObjects.some((o) => {
    const id = o.equipmentId;
    return (
      id === 'audio-recorder' ||
      id.includes('mixer') ||
      id.includes('stream-mixer') ||
      id.includes('dsp') ||
      id.includes('rodecaster') ||
      id.includes('scarlett')
    );
  });

  if (hasXlrMic && !hasAudioInterface) {
    warnings.push({
      type: 'xlr-missing-interface',
      severity: 'danger',
      message: 'XLR Studio Microphone detected without an Audio Interface / Mixer (e.g. Focusrite Scarlett 2i2 or Rodecaster Pro). An XLR mic cannot plug directly into a computer USB port without preamps.',
      actionLabel: '+ Add Audio Interface',
      actionEquipmentId: 'audio-recorder',
    });
  }

  // Heavy cinema rig check
  const heavyCinemaRig = placedObjects.find(
    (o) => o.equipmentId === 'cinema-camera-rig' || o.equipmentId.includes('broadcast-studio')
  );
  if (heavyCinemaRig && heavyCinemaRig.parentId) {
    warnings.push({
      type: 'heavy-camera-on-light-arm',
      severity: 'warning',
      message: 'Heavy Cinema Camera Rig placed on a desk mount. Ensure using a heavy-duty steel clamp or dedicated floor tripod to prevent desk sagging.',
      objectIds: [heavyCinemaRig.id],
    });
  }

  return warnings;
}
