'use client';

import { useMemo } from 'react';
import { usePlannerStore } from './store';
import type { PlacedObject } from './types';

interface SpacingWarning {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  message: string;
}

function computeWarnings(
  placedObjects: PlacedObject[],
  roomWidth: number,
  roomDepth: number
): { warnings: SpacingWarning[]; acousticWarnings: SpacingWarning[]; powerWarnings: SpacingWarning[] } {
  const warnings: SpacingWarning[] = [];
  const acousticWarnings: SpacingWarning[] = [];
  const powerWarnings: SpacingWarning[] = [];

  // Check for spacing issues
  for (let i = 0; i < placedObjects.length; i++) {
    for (let j = i + 1; j < placedObjects.length; j++) {
      const a = placedObjects[i];
      const b = placedObjects[j];
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.3) {
        warnings.push({
          id: `${a.id}-${b.id}`,
          severity: 'danger',
          message: `${a.equipmentId} and ${b.equipmentId} are too close (${dist.toFixed(2)}m)`,
        });
      }
    }
  }

  // Check for power issues
  const powerTotal = placedObjects.reduce((sum, obj) => {
    // Simple power estimation based on equipment type
    if (obj.equipmentId.includes('light')) return sum + 100;
    if (obj.equipmentId.includes('monitor')) return sum + 50;
    if (obj.equipmentId.includes('computer')) return sum + 200;
    return sum;
  }, 0);

  if (powerTotal > 1500) {
    powerWarnings.push({
      id: 'power-overload',
      severity: 'danger',
      message: `Estimated power draw (${powerTotal}W) exceeds typical 15A circuit capacity`,
    });
  }

  return { warnings, acousticWarnings, powerWarnings };
}

export default function SpacingWarnings() {
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);

  const { warnings, acousticWarnings, powerWarnings } = useMemo(
    () => computeWarnings(placedObjects, roomWidth, roomDepth),
    [placedObjects, roomWidth, roomDepth]
  );

  const allWarnings = [...warnings, ...acousticWarnings, ...powerWarnings];
  const warningCount = allWarnings.length;
  const hasDanger = allWarnings.some((w) => w.severity === 'danger');

  return (
    <div className="p-3 border-b border-black font-mono">
      <div className={`w-full justify-between py-1.5 px-2 text-xs font-bold border-2 border-black flex ${warningCount > 0 && hasDanger ? 'bg-red-50 text-red-900 border-red-700' : 'bg-white text-black'
        }`}>
        <span>Studio Diagnostics</span>
        <span className={`px-1.5 py-0.2 text-[10px] font-black border ${warningCount > 0 ? (hasDanger ? 'bg-red-600 text-white border-black' : 'bg-[#FFDD00] text-black border-black') : 'bg-emerald-100 text-emerald-800 border-emerald-400'
          }`}>
          {warningCount === 0 ? 'Clear' : `${warningCount} Issues`}
        </span>
      </div>
    </div>
  );
}
