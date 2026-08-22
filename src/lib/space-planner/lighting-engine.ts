import * as THREE from 'three';
import type { PlacedObject, LightRole } from '@/components/space-planner/types';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from '@/components/space-planner/gear-library';

// ============================================================
// Studio Lighting Engine & PBR Illumination Utilities
// Converts Kelvin CCT to photometrically accurate RGB / sRGB
// and computes real-time Key:Fill:Rim contrast ratios.
// ============================================================

export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export function kelvinToThreeColor(kelvin: number): THREE.Color {
  const { r, g, b } = kelvinToRgb(kelvin);
  return new THREE.Color(r / 255, g / 255, b / 255);
}

export function kelvinToHex(kelvin: number): string {
  const { r, g, b } = kelvinToRgb(kelvin);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface LightingRatioAnalysis {
  ratioString: string;
  ratioValue: number;
  styleDescription: string;
  keyIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  keyKelvin: number;
  fillKelvin: number;
  totalLuxEstimate: number;
  activeLightsCount: number;
}

export function calculateLightingRatio(placedObjects: PlacedObject[]): LightingRatioAnalysis {
  const lights = placedObjects.filter((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    return (
      def?.category === 'lighting' ||
      o.equipmentId.includes('light') ||
      o.equipmentId.includes('softbox') ||
      o.equipmentId.includes('fresnel') ||
      o.equipmentId.includes('tube') ||
      o.equipmentId.includes('lamp')
    );
  });

  if (lights.length === 0) {
    return {
      ratioString: '1:1',
      ratioValue: 1,
      styleDescription: 'Ambient Only (No Active Studio Lights)',
      keyIntensity: 0,
      fillIntensity: 0,
      rimIntensity: 0,
      keyKelvin: 5600,
      fillKelvin: 5600,
      totalLuxEstimate: 120,
      activeLightsCount: 0,
    };
  }

  // Sort by effective power output (intensity * watts)
  const sorted = [...lights].sort((a, b) => {
    const aWatts = COMPREHENSIVE_EQUIPMENT_CATALOG[a.equipmentId]?.watts || 50;
    const bWatts = COMPREHENSIVE_EQUIPMENT_CATALOG[b.equipmentId]?.watts || 50;
    const aPower = ((a.lightSettings?.intensity ?? 80) / 100) * aWatts;
    const bPower = ((b.lightSettings?.intensity ?? 80) / 100) * bWatts;
    return bPower - aPower;
  });

  const keyLight = sorted[0];
  const fillLight = sorted[1];
  const rimLight = sorted[2];

  const keyWatts = COMPREHENSIVE_EQUIPMENT_CATALOG[keyLight.equipmentId]?.watts || 60;
  const keyIntensity = ((keyLight.lightSettings?.intensity ?? 80) / 100) * keyWatts;

  const fillWatts = fillLight ? COMPREHENSIVE_EQUIPMENT_CATALOG[fillLight.equipmentId]?.watts || 40 : 0;
  const fillIntensity = fillLight ? ((fillLight.lightSettings?.intensity ?? 50) / 100) * fillWatts : keyIntensity * 0.5;

  const rimWatts = rimLight ? COMPREHENSIVE_EQUIPMENT_CATALOG[rimLight.equipmentId]?.watts || 30 : 0;
  const rimIntensity = rimLight ? ((rimLight.lightSettings?.intensity ?? 60) / 100) * rimWatts : 0;

  const ratio = Math.max(1, Math.round((keyIntensity / Math.max(1, fillIntensity)) * 10) / 10);
  const ratioString = `${ratio}:1`;

  let styleDescription = 'Commercial & Beauty (Clean / Balanced)';
  if (ratio <= 1.2) {
    styleDescription = 'High-Key / Flat Broadcast (Shadowless News & Product)';
  } else if (ratio <= 2.5) {
    styleDescription = 'Standard Commercial / YouTube Vlog (Natural Depth)';
  } else if (ratio <= 4.5) {
    styleDescription = 'Cinematic Drama & Interview (Pronounced Dimension)';
  } else if (ratio <= 8.5) {
    styleDescription = 'Moody / Film Noir (Chiaroscuro Deep Shadows)';
  } else {
    styleDescription = 'Silhouette / Hard Edge Dramatic Contrast';
  }

  // Estimated Lux at Subject (Lux = Lumens / m^2 approx)
  const totalWatts = lights.reduce((sum, l) => {
    const w = COMPREHENSIVE_EQUIPMENT_CATALOG[l.equipmentId]?.watts || 40;
    const inten = (l.lightSettings?.intensity ?? 80) / 100;
    return sum + w * inten;
  }, 0);
  const totalLuxEstimate = Math.round(totalWatts * 18 + 150);

  return {
    ratioString,
    ratioValue: ratio,
    styleDescription,
    keyIntensity: Math.round(keyLight.lightSettings?.intensity ?? 80),
    fillIntensity: Math.round(fillLight?.lightSettings?.intensity ?? 50),
    rimIntensity: Math.round(rimLight?.lightSettings?.intensity ?? 60),
    keyKelvin: keyLight.lightSettings?.colorTempKelvin ?? 5600,
    fillKelvin: fillLight?.lightSettings?.colorTempKelvin ?? 5600,
    totalLuxEstimate,
    activeLightsCount: lights.length,
  };
}
