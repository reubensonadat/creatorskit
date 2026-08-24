// ============================================================
// Creator Space Planner — Optical & Director's Viewfinder Engine
// Precision sensor geometry, focal length FOV, aperture & framing math
// ============================================================

import type { CameraSensorSize, CameraLensPreset, CameraAperture } from '@/components/space-planner/types';

export interface SensorSpecs {
  name: string;
  widthMm: number;
  heightMm: number;
  cropFactor: number;
  description: string;
}

export const SENSOR_PROFILES: Record<CameraSensorSize, SensorSpecs> = {
  'full-frame': {
    name: '35mm Full-Frame (1.0x)',
    widthMm: 36.0,
    heightMm: 24.0,
    cropFactor: 1.0,
    description: 'Sony A7 IV / FX3, Canon R6 II, Panasonic S5 IIX',
  },
  'aps-c': {
    name: 'Super35 / APS-C (1.5x)',
    widthMm: 23.5,
    heightMm: 15.6,
    cropFactor: 1.5,
    description: 'Sony FX30 / ZV-E10, Canon R7 / R10, Fuji X-T5',
  },
  'micro-four-thirds': {
    name: 'Micro Four Thirds (2.0x)',
    widthMm: 17.3,
    heightMm: 13.0,
    cropFactor: 2.0,
    description: 'Panasonic GH6 / BGH1, Blackmagic Pocket 4K',
  },
  'smartphone': {
    name: 'Smartphone 1/1.3" Sensor (5.5x)',
    widthMm: 9.6,
    heightMm: 7.2,
    cropFactor: 5.5,
    description: 'iPhone 15/16 Pro, Samsung S24 Ultra, Pixel 8/9 Pro',
  },
};

export const FOCAL_LENGTH_VALUES: Record<CameraLensPreset, number> = {
  '16mm': 16,
  '24mm': 24,
  '35mm': 35,
  '50mm': 50,
  '85mm': 85,
  '105mm': 105,
};

export const APERTURE_VALUES: Record<CameraAperture, number> = {
  'f/1.4': 1.4,
  'f/1.8': 1.8,
  'f/2.8': 2.8,
  'f/4.0': 4.0,
  'f/5.6': 5.6,
};

export interface OpticalCalculation {
  focalLengthMm: number;
  effectiveFocalLengthMm: number;
  horizontalFovDegrees: number;
  verticalFovDegrees: number;
  diagonalFovDegrees: number;
  shotClassification: 'Extreme Wide' | 'Wide Room / Environmental' | 'Medium Wide / Vlogging' | 'Medium / Narrative' | 'Portrait / Headshot' | 'Tight Telephoto';
  idealSubjectDistanceM: { min: number; ideal: number; max: number };
  recommendedCrop: string;
}

/**
 * Calculates real-world optical Field of View (FOV) and framing metrics
 */
export function calculateOpticalFov(
  lensPreset: CameraLensPreset = '24mm',
  sensorSize: CameraSensorSize = 'full-frame'
): OpticalCalculation {
  const focalLength = FOCAL_LENGTH_VALUES[lensPreset] || 24;
  const sensor = SENSOR_PROFILES[sensorSize] || SENSOR_PROFILES['full-frame'];
  
  const effectiveFocalLength = focalLength * sensor.cropFactor;

  // Real optical math: FOV = 2 * atan(sensor_dim / (2 * focal_length))
  const hFovRad = 2 * Math.atan(sensor.widthMm / (2 * focalLength));
  const vFovRad = 2 * Math.atan(sensor.heightMm / (2 * focalLength));
  const diagMm = Math.hypot(sensor.widthMm, sensor.heightMm);
  const dFovRad = 2 * Math.atan(diagMm / (2 * focalLength));

  const hFovDeg = (hFovRad * 180) / Math.PI;
  const vFovDeg = (vFovRad * 180) / Math.PI;
  const dFovDeg = (dFovRad * 180) / Math.PI;

  let shotClassification: OpticalCalculation['shotClassification'] = 'Medium Wide / Vlogging';
  let idealSubjectDistanceM = { min: 0.8, ideal: 1.5, max: 2.2 };
  let recommendedCrop = 'Upper body & full desk setup';

  if (effectiveFocalLength <= 18) {
    shotClassification = 'Extreme Wide';
    idealSubjectDistanceM = { min: 0.5, ideal: 0.9, max: 1.5 };
    recommendedCrop = 'Full room architecture, gaming battlestation & wide background';
  } else if (effectiveFocalLength <= 28) {
    shotClassification = 'Wide Room / Environmental';
    idealSubjectDistanceM = { min: 0.8, ideal: 1.4, max: 2.2 };
    recommendedCrop = 'Waist-up with rich background context (Standard YouTuber / Desk setup)';
  } else if (effectiveFocalLength <= 40) {
    shotClassification = 'Medium Wide / Vlogging';
    idealSubjectDistanceM = { min: 1.2, ideal: 1.8, max: 2.8 };
    recommendedCrop = 'Natural human perspective (35mm aesthetic) — chest-up with soft background';
  } else if (effectiveFocalLength <= 65) {
    shotClassification = 'Medium / Narrative';
    idealSubjectDistanceM = { min: 1.6, ideal: 2.4, max: 3.8 };
    recommendedCrop = 'Cinematic narrative portrait (50mm standard) — gorgeous optical compression';
  } else if (effectiveFocalLength <= 95) {
    shotClassification = 'Portrait / Headshot';
    idealSubjectDistanceM = { min: 2.2, ideal: 3.2, max: 5.0 };
    recommendedCrop = 'Tight head-and-shoulders with maximum creamy background bokeh (Podcast / Interview)';
  } else {
    shotClassification = 'Tight Telephoto';
    idealSubjectDistanceM = { min: 3.0, ideal: 4.5, max: 7.0 };
    recommendedCrop = 'Extreme closeup & product macro shot with hyper-isolated depth of field';
  }

  return {
    focalLengthMm: focalLength,
    effectiveFocalLengthMm: effectiveFocalLength,
    horizontalFovDegrees: Math.round(hFovDeg * 10) / 10,
    verticalFovDegrees: Math.round(vFovDeg * 10) / 10,
    diagonalFovDegrees: Math.round(dFovDeg * 10) / 10,
    shotClassification,
    idealSubjectDistanceM,
    recommendedCrop,
  };
}

/**
 * Evaluates camera-to-subject framing quality given physical distance in meters
 */
export function evaluateFramingQuality(
  distanceMeters: number,
  lensPreset: CameraLensPreset = '24mm',
  sensorSize: CameraSensorSize = 'full-frame',
  backdropDistanceMeters?: number
): {
  status: 'optimal' | 'too-close' | 'too-far';
  framingDescription: string;
  depthOfFieldAdvice: string;
  bokehScore: number; // 1 to 10
} {
  const opt = calculateOpticalFov(lensPreset, sensorSize);
  const { min, ideal, max } = opt.idealSubjectDistanceM;

  let status: 'optimal' | 'too-close' | 'too-far' = 'optimal';
  let framingDescription = '';

  if (distanceMeters < min) {
    status = 'too-close';
    framingDescription = `At ${distanceMeters.toFixed(1)}m, camera is too close for ${lensPreset}. Subject will fill entire frame with wide-angle facial distortion. Pull camera back to ~${ideal}m.`;
  } else if (distanceMeters > max) {
    status = 'too-far';
    framingDescription = `At ${distanceMeters.toFixed(1)}m, camera is quite far for ${lensPreset}. Subject will look tiny in room. Consider moving camera closer to ~${ideal}m or switching to a longer lens (e.g. 50mm / 85mm).`;
  } else {
    status = 'optimal';
    framingDescription = `At ${distanceMeters.toFixed(1)}m with ${lensPreset} (${sensorSize}): Perfect ${opt.shotClassification.toLowerCase()} framing. ${opt.recommendedCrop}.`;
  }

  // Calculate background separation & bokeh rating
  let bokehScore = 5;
  if (opt.effectiveFocalLengthMm >= 50) bokehScore += 2;
  if (opt.effectiveFocalLengthMm >= 85) bokehScore += 2;
  if (sensorSize === 'full-frame') bokehScore += 1;
  if (sensorSize === 'smartphone') bokehScore = Math.min(bokehScore, 3);

  let depthOfFieldAdvice = '';
  if (backdropDistanceMeters !== undefined) {
    if (backdropDistanceMeters < 0.8) {
      depthOfFieldAdvice = `⚠️ Backdrop is only ${backdropDistanceMeters.toFixed(1)}m behind talent. Wall will look flat/sharp. Pull subject forward to at least 1.5m for creamy cinematic background blur.`;
      bokehScore = Math.max(1, bokehScore - 3);
    } else {
      depthOfFieldAdvice = `✓ Excellent ${backdropDistanceMeters.toFixed(1)}m background separation allows gorgeous optical depth of field and clean lighting isolation.`;
    }
  } else {
    depthOfFieldAdvice = `Keep at least 1.5m between creator and back wall for optimal cinematic subject separation.`;
  }

  return {
    status,
    framingDescription,
    depthOfFieldAdvice,
    bokehScore: Math.min(10, Math.max(1, bokehScore)),
  };
}
