'use client';

import { useMemo } from 'react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import type { SpacingWarning } from './types';

const SEVERITY_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-800' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-800' },
};

function computeWarnings(
  placedObjects: { id: string; equipmentId: string; x: number; z: number }[],
  roomWidth: number,
  roomDepth: number
): SpacingWarning[] {
  const warnings: SpacingWarning[] = [];
  const hw = roomWidth / 2;
  const hd = roomDepth / 2;
  const wallThreshold = 0.3;

  // Equipment too close to wall
  placedObjects.forEach((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    if (!def) return;
    const halfW = def.dimensions.width / 2;
    const halfD = def.dimensions.depth / 2;
    if (Math.abs(o.x) + halfW > hw - wallThreshold ||
        Math.abs(o.z) + halfD > hd - wallThreshold) {
      warnings.push({
        type: 'equipment-near-wall',
        severity: 'warning',
        message: `${def.name} may be too close to a wall. Consider pulling it inward for better access.`,
        objectIds: [o.id],
      });
    }
  });

  // Camera too close to backdrop
  const cameras = placedObjects.filter((o) => o.equipmentId === 'camera');
  const backdrops = placedObjects.filter((o) => o.equipmentId === 'backdrop');
  cameras.forEach((cam) => {
    backdrops.forEach((bd) => {
      const dist = Math.sqrt((cam.x - bd.x) ** 2 + (cam.z - bd.z) ** 2);
      if (dist < 1.5) {
        warnings.push({
          type: 'camera-too-close',
          severity: 'danger',
          message: `Camera is only ${dist.toFixed(1)}m from the backdrop. Move it further back for a wider shot.`,
          objectIds: [cam.id, bd.id],
        });
      }
    });
  });

  // Lights too close together
  const lights = placedObjects.filter((o) => o.equipmentId === 'led-light' || o.equipmentId === 'softbox');
  for (let i = 0; i < lights.length; i++) {
    for (let j = i + 1; j < lights.length; j++) {
      const dist = Math.sqrt((lights[i].x - lights[j].x) ** 2 + (lights[i].z - lights[j].z) ** 2);
      if (dist < 0.8) {
        warnings.push({
          type: 'lights-too-close',
          severity: 'warning',
          message: `Two lights are only ${dist.toFixed(1)}m apart. Spread them out for more even lighting.`,
          objectIds: [lights[i].id, lights[j].id],
        });
      }
    }
  }

  // Power load
  const totalWatts = placedObjects.reduce((sum, o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    return sum + (def?.watts || 0);
  }, 0);
  if (totalWatts > 0) {
    const socketLimit = 2860;
    const hasGen = placedObjects.some((o) => o.equipmentId === 'generator');
    const hasPS = placedObjects.some((o) => o.equipmentId === 'power-station');
    if (totalWatts > socketLimit && !hasGen && !hasPS) {
      warnings.push({
        type: 'power-overload',
        severity: 'danger',
        message: `Total power draw is ~${totalWatts}W, which may exceed a single socket (~${socketLimit}W). Consider adding a generator or power station.`,
      });
    } else if (totalWatts > socketLimit * 0.8) {
      warnings.push({
        type: 'power-overload',
        severity: 'info',
        message: `Power draw is ~${totalWatts}W — getting close to socket limit. This is planning guidance only.`,
      });
    }
  }

  // Walking path
  if (placedObjects.length > 3) {
    const roomArea = roomWidth * roomDepth;
    const objectFootprint = placedObjects.reduce((sum, o) => {
      const d = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.dimensions;
      return sum + (d ? d.width * d.depth : 0);
    }, 0);
    const usedRatio = objectFootprint / roomArea;
    if (usedRatio > 0.45) {
      warnings.push({
        type: 'no-walking-path',
        severity: 'warning',
        message: `Equipment covers ~${(usedRatio * 100).toFixed(0)}% of the floor. Make sure there is a clear path to move around.`,
      });
    }
  }

  return warnings;
}

export default function SpacingWarnings() {
  const showWarnings = usePlannerStore((s) => s.showWarnings);
  const toggleWarnings = usePlannerStore((s) => s.toggleWarnings);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);

  const warnings = useMemo(
    () => computeWarnings(placedObjects, roomWidth, roomDepth),
    [placedObjects, roomWidth, roomDepth]
  );
  const warningCount = warnings.length;
  const hasDanger = warnings.some(w => w.severity === 'danger');

  return (
    <>
      <div className="panel-section">
        <button
          className={`btn w-full justify-center ${warningCount > 0 && hasDanger ? 'border-red-300 text-red-600' : ''}`}
          onClick={toggleWarnings}
        >
          ⚠ Setup Checks
          {warningCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 font-semibold">
              {warningCount}
            </span>
          )}
        </button>
      </div>

      {showWarnings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={toggleWarnings} />
          <div className="w-80 bg-white border-l border-[var(--line)] h-full overflow-y-auto p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-bold text-[15px]">Setup Checks</div>
                <div className="text-[10px] text-[var(--charcoal-3)]">
                  Planning guidance only — not compliance certification.
                </div>
              </div>
              <button className="btn btn-icon" onClick={toggleWarnings}>✕</button>
            </div>

            {warnings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm font-semibold">All clear</div>
                <div className="text-[11px] text-[var(--charcoal-3)]">
                  No spacing or power issues detected.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {warnings.map((w, i) => {
                  const style = SEVERITY_STYLES[w.severity];
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${style.bg} ${style.border}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                        <div className={`text-[11.5px] leading-relaxed ${style.text}`}>
                          {w.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <div className="text-[10px] text-[var(--charcoal-3)] leading-relaxed">
                These checks are planning guidance only. They do not replace
                professional electrical, fire safety, or building compliance
                assessments. Always consult a qualified professional for your
                specific situation.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
