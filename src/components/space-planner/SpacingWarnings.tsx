'use client';

import { useMemo, useState } from 'react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import type { SpacingWarning } from './types';

const isMatch = (val: unknown, ...needles: string[]) => {
  if (typeof val !== 'string') return false;
  const s = val.toLowerCase();
  return needles.some((n) => s.includes(n.toLowerCase()));
};

function computeWarnings(
  placedObjects: { id: string; equipmentId: string; x: number; z: number }[],
  roomWidth: number,
  roomDepth: number
): { warnings: SpacingWarning[]; acousticWarnings: SpacingWarning[]; powerWarnings: SpacingWarning[] } {
  const warnings: SpacingWarning[] = [];
  const acousticWarnings: SpacingWarning[] = [];
  const powerWarnings: SpacingWarning[] = [];

  const hw = roomWidth / 2;
  const hd = roomDepth / 2;
  const wallThreshold = 0.25;

  // 1. Chair Push-Out Clearance Check
  const chairs = placedObjects.filter((o) => o.equipmentId === 'chair' || isMatch(o.equipmentId, 'chair'));
  chairs.forEach((chair) => {
    const spaceToBackWall = hd - chair.z;
    if (spaceToBackWall < 0.75) {
      warnings.push({
        type: 'chair-clearance',
        severity: 'warning',
        message: `Chair has ${(spaceToBackWall).toFixed(2)}m rear clearance. Allow ≥0.85m for slide-out room.`,
        objectIds: [chair.id],
      });
    }
  });

  // 2. Equipment near wall
  placedObjects.forEach((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    if (!def) return;
    const halfW = (def.dimensions?.width || 0.5) / 2;
    const halfD = (def.dimensions?.depth || 0.5) / 2;
    if (
      Math.abs(o.x) + halfW > hw - wallThreshold ||
      Math.abs(o.z) + halfD > hd - wallThreshold
    ) {
      if (o.equipmentId !== 'closet-wardrobe' && o.equipmentId !== 'bed-furniture' && o.equipmentId !== 'acoustic-panel') {
        warnings.push({
          type: 'equipment-near-wall',
          severity: 'info',
          message: `${def.name} is against the wall. Move 15cm inward for cable and lighting clearance.`,
          objectIds: [o.id],
        });
      }
    }
  });

  // 3. Camera distance to talent
  const cameras = placedObjects.filter((o) => isMatch(o.equipmentId, 'cam', 'phone', 'webcam', 'prompter'));
  chairs.forEach((chair) => {
    cameras.forEach((cam) => {
      const dist = Math.sqrt((cam.x - chair.x) ** 2 + (cam.z - chair.z) ** 2);
      if (dist < 0.8) {
        warnings.push({
          type: 'camera-too-close',
          severity: 'warning',
          message: `Camera is ${dist.toFixed(1)}m from host. Back up to ≥1.2m to avoid wide-angle face distortion.`,
          objectIds: [cam.id, chair.id],
        });
      }
    });
  });

  // 4. Acoustic Reflection & Audio Analysis
  const mics = placedObjects.filter((o) => isMatch(o.equipmentId, 'mic', 'lav', 'podcast', 'audio'));
  const acousticPanels = placedObjects.filter((o) => isMatch(o.equipmentId, 'acoustic', 'vocal-booth'));
  const softAbsorbers = placedObjects.filter((o) => isMatch(o.equipmentId, 'bed', 'sofa'));

  if (mics.length > 0) {
    if (acousticPanels.length === 0 && softAbsorbers.length === 0) {
      acousticWarnings.push({
        type: 'acoustic-echo',
        severity: 'danger',
        message: 'No acoustic treatment detected. Bare walls cause hollow flutter echo.',
      });
    } else if (acousticPanels.length === 0 && softAbsorbers.length > 0) {
      acousticWarnings.push({
        type: 'acoustic-echo',
        severity: 'info',
        message: 'Bed/Sofa provides partial absorption. Add a panel opposite your mic for broadcast clarity.',
      });
    }

    const noisyGear = placedObjects.filter((o) => isMatch(o.equipmentId, 'generator', 'fog', 'haze'));
    mics.forEach((mic) => {
      noisyGear.forEach((gear) => {
        const dist = Math.sqrt((mic.x - gear.x) ** 2 + (mic.z - gear.z) ** 2);
        if (dist < 2.5) {
          acousticWarnings.push({
            type: 'audio-noise',
            severity: 'danger',
            message: `Mic is within ${dist.toFixed(1)}m of ${COMPREHENSIVE_EQUIPMENT_CATALOG[gear.equipmentId]?.name || 'device'}. Fan noise may bleed.`,
            objectIds: [mic.id, gear.id],
          });
        }
      });
    });
  }

  // 5. Electrical Load
  const totalWatts = placedObjects.reduce((sum, o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    return sum + (def?.watts || 0);
  }, 0);

  const socketLimit = 2860;
  const hasGen = placedObjects.some((o) => o.equipmentId === 'generator');
  const hasPS = placedObjects.some((o) => o.equipmentId === 'power-station');

  if (totalWatts > socketLimit && !hasGen && !hasPS) {
    powerWarnings.push({
      type: 'power-overload',
      severity: 'danger',
      message: `Total draw is ~${totalWatts}W (exceeds 13A ~${socketLimit}W socket limit). Split across circuits.`,
    });
  }

  return { warnings, acousticWarnings, powerWarnings };
}

export default function SpacingWarnings() {
  const showWarnings = usePlannerStore((s) => s.showWarnings);
  const toggleWarnings = usePlannerStore((s) => s.toggleWarnings);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);

  const [activeTab, setActiveTab] = useState<'spatial' | 'acoustic' | 'checklist'>('spatial');
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const { warnings, acousticWarnings, powerWarnings } = useMemo(
    () => computeWarnings(placedObjects, roomWidth, roomDepth),
    [placedObjects, roomWidth, roomDepth]
  );

  const allWarnings = [...warnings, ...acousticWarnings, ...powerWarnings];
  const warningCount = allWarnings.length;
  const hasDanger = allWarnings.some((w) => w.severity === 'danger');

  const setupSteps = [
    {
      title: '1. Establish Host Anchor & Desk',
      desc: 'Set desk maintaining ≥0.85m rear chair space.',
    },
    {
      title: '2. Position Key Light (45° Rule)',
      desc: 'Place key light 45° off-axis at 1.7m height angled 30° down.',
    },
    {
      title: '3. Mount Camera at Eye Level',
      desc: 'Position lens at eye level (~1.3m) and ~1.5m away.',
    },
    {
      title: '4. Microphone Placement (15–20cm)',
      desc: 'Set lavalier or boom mic close to talent, away from PC fans.',
    },
    {
      title: '5. Cable Management & Safety',
      desc: 'Route cords along room edges to prevent tripping.',
    },
  ];

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <>
      <div className="p-3 border-b border-black font-mono">
        <button
          className={`btn w-full justify-between py-1.5 px-2 text-xs font-bold border-2 border-black ${
            warningCount > 0 && hasDanger ? 'bg-red-50 text-red-900 border-red-700' : 'bg-white hover:bg-stone-50 text-black'
          }`}
          onClick={toggleWarnings}
        >
          <span>Studio Diagnostics</span>
          <span className={`px-1.5 py-0.2 text-[10px] font-black border ${
            warningCount > 0 ? (hasDanger ? 'bg-red-600 text-white border-black' : 'bg-[#FFDD00] text-black border-black') : 'bg-emerald-100 text-emerald-800 border-emerald-400'
          }`}>
            {warningCount === 0 ? 'Clear' : `${warningCount} Issues`}
          </span>
        </button>
      </div>

      {showWarnings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={toggleWarnings} />
          <div className="w-84 max-w-full bg-white border-l-2 border-black h-full overflow-y-auto p-4 relative z-10 flex flex-col justify-between font-mono">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
                <div>
                  <div className="font-bold text-sm text-black">Studio Diagnostics</div>
                  <div className="text-[10px] text-stone-500">Sightline, acoustic & power checks</div>
                </div>
                <button
                  className="px-2 py-0.5 text-xs font-bold border border-black hover:bg-stone-100"
                  onClick={toggleWarnings}
                >
                  ✕ Close
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex border border-black mb-3 text-[10px] font-bold">
                <button
                  className={`flex-1 py-1 text-center transition-colors ${
                    activeTab === 'spatial' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100 text-black'
                  }`}
                  onClick={() => setActiveTab('spatial')}
                >
                  Spatial ({warnings.length + powerWarnings.length})
                </button>
                <button
                  className={`flex-1 py-1 text-center transition-colors border-l border-black ${
                    activeTab === 'acoustic' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100 text-black'
                  }`}
                  onClick={() => setActiveTab('acoustic')}
                >
                  Audio ({acousticWarnings.length})
                </button>
                <button
                  className={`flex-1 py-1 text-center transition-colors border-l border-black ${
                    activeTab === 'checklist' ? 'bg-[#FFDD00] text-black' : 'bg-white hover:bg-stone-100 text-black'
                  }`}
                  onClick={() => setActiveTab('checklist')}
                >
                  Guide
                </button>
              </div>

              {/* Tab 1: Spatial & Power */}
              {activeTab === 'spatial' && (
                <div className="space-y-2">
                  {warnings.length === 0 && powerWarnings.length === 0 ? (
                    <div className="p-3 border border-dashed border-emerald-500 bg-emerald-50 text-center">
                      <div className="text-xs font-bold text-emerald-900">Spatial & Power Clear</div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">
                        Clearances and power loads are within normal limits.
                      </div>
                    </div>
                  ) : (
                    [...warnings, ...powerWarnings].map((w, i) => (
                      <div
                        key={i}
                        className={`p-2.5 border-2 text-[11px] leading-snug ${
                          w.severity === 'danger'
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : w.severity === 'warning'
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-black bg-stone-50 text-stone-900'
                        }`}
                      >
                        {w.message}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Acoustic Analysis */}
              {activeTab === 'acoustic' && (
                <div className="space-y-2">
                  {acousticWarnings.length === 0 ? (
                    <div className="p-3 border border-dashed border-emerald-500 bg-emerald-50 text-center">
                      <div className="text-xs font-bold text-emerald-900">Audio Reflections OK</div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">
                        Absorption elements detected to keep vocal recordings clean.
                      </div>
                    </div>
                  ) : (
                    acousticWarnings.map((w, i) => (
                      <div
                        key={i}
                        className={`p-2.5 border-2 text-[11px] leading-snug ${
                          w.severity === 'danger'
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : 'border-amber-500 bg-amber-50 text-amber-900'
                        }`}
                      >
                        {w.message}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Step-by-Step Creator Setup Guide */}
              {activeTab === 'checklist' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-stone-700 mb-1">
                    Setup Checklist ({Object.values(completedSteps).filter(Boolean).length}/5):
                  </div>
                  {setupSteps.map((step, idx) => {
                    const isDone = !!completedSteps[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStep(idx)}
                        className={`p-2 border border-black cursor-pointer transition-all ${
                          isDone ? 'bg-emerald-50 text-emerald-900' : 'bg-white hover:bg-stone-50 text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isDone}
                            readOnly
                            className="accent-black pointer-events-none"
                          />
                          <div className="text-[11px] font-bold">{step.title}</div>
                        </div>
                        <div className="text-[10px] text-stone-600 mt-1 pl-5 leading-tight">
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2 border-t text-[9.5px] text-stone-400">
              Creator space layout diagnostics.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
