'use client';

import { useMemo, useState } from 'react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import type { SpacingWarning } from './types';
import { CheckCircle2, Circle, Volume2, Zap, ShieldAlert, BookOpen, MoveRight } from 'lucide-react';

const SEVERITY_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-800' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-800' },
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
  const chairs = placedObjects.filter((o) => o.equipmentId === 'chair');
  chairs.forEach((chair) => {
    const spaceToBackWall = hd - chair.z;
    if (spaceToBackWall < 0.75) {
      warnings.push({
        type: 'chair-clearance',
        severity: 'warning',
        message: `Chair has only ${(spaceToBackWall).toFixed(2)}m clearance to the rear wall. Allow ≥0.85m so you can slide in/out comfortably.`,
        objectIds: [chair.id],
      });
    }
  });

  // 2. Equipment too close to wall
  placedObjects.forEach((o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    if (!def) return;
    const halfW = def.dimensions.width / 2;
    const halfD = def.dimensions.depth / 2;
    if (
      Math.abs(o.x) + halfW > hw - wallThreshold ||
      Math.abs(o.z) + halfD > hd - wallThreshold
    ) {
      if (o.equipmentId !== 'closet-wardrobe' && o.equipmentId !== 'bed-furniture' && o.equipmentId !== 'acoustic-panel') {
        warnings.push({
          type: 'equipment-near-wall',
          severity: 'info',
          message: `${def.name} is right against a wall. Pulling it 15-20cm inward improves cable access and light wrap.`,
          objectIds: [o.id],
        });
      }
    }
  });

  // 3. Camera distance to talent
  const cameras = placedObjects.filter((o) => o.equipmentId.includes('cam') || o.equipmentId.includes('phone'));
  chairs.forEach((chair) => {
    cameras.forEach((cam) => {
      const dist = Math.sqrt((cam.x - chair.x) ** 2 + (cam.z - chair.z) ** 2);
      if (dist < 0.8) {
        warnings.push({
          type: 'camera-too-close',
          severity: 'warning',
          message: `Camera is very close (${dist.toFixed(1)}m from host). Lens will cause wide-angle face distortion unless backed up to ≥1.2m.`,
          objectIds: [cam.id, chair.id],
        });
      }
    });
  });

  // 4. Acoustic Reflection & Audio Analysis
  const mics = placedObjects.filter((o) => o.equipmentId.includes('mic') || o.equipmentId.includes('lav'));
  const acousticPanels = placedObjects.filter((o) => o.equipmentId === 'acoustic-panel' || o.equipmentId === 'vocal-booth-screen');
  const softAbsorbers = placedObjects.filter((o) => o.equipmentId === 'bed-furniture' || o.equipmentId === 'sofa');

  if (mics.length > 0) {
    if (acousticPanels.length === 0 && softAbsorbers.length === 0) {
      acousticWarnings.push({
        type: 'acoustic-echo',
        severity: 'danger',
        message: 'No acoustic treatment detected. Bare plaster/concrete walls create severe flutter echo and hollow voice reverb.',
      });
    } else if (acousticPanels.length === 0 && softAbsorbers.length > 0) {
      acousticWarnings.push({
        type: 'acoustic-echo',
        severity: 'info',
        message: 'Natural absorption detected (Bed / Sofa). For cleaner broadcast audio, position a blanket or foam panel on the wall directly opposite your mic.',
      });
    }

    // Check mic proximity to noisy machines
    const noisyGear = placedObjects.filter((o) => o.equipmentId === 'generator' || o.equipmentId === 'fog-machine');
    mics.forEach((mic) => {
      noisyGear.forEach((gear) => {
        const dist = Math.sqrt((mic.x - gear.x) ** 2 + (mic.z - gear.z) ** 2);
        if (dist < 2.5) {
          acousticWarnings.push({
            type: 'audio-noise',
            severity: 'danger',
            message: `Microphone is within ${dist.toFixed(1)}m of ${COMPREHENSIVE_EQUIPMENT_CATALOG[gear.equipmentId]?.name}. Mechanical noise will bleed into your audio track.`,
            objectIds: [mic.id, gear.id],
          });
        }
      });
    });
  }

  // 5. Electrical Load & Circuit Balancing
  const totalWatts = placedObjects.reduce((sum, o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    return sum + (def?.watts || 0);
  }, 0);

  const socketLimit = 2860;
  const hasGen = placedObjects.some((o) => o.equipmentId === 'generator');
  const hasPS = placedObjects.some((o) => o.equipmentId === 'power-station');
  const powerStrips = placedObjects.filter((o) => o.equipmentId === 'power-strip');

  if (totalWatts > socketLimit && !hasGen && !hasPS) {
    powerWarnings.push({
      type: 'power-overload',
      severity: 'danger',
      message: `Total draw is ~${totalWatts}W, exceeding a standard 13A home breaker socket (~${socketLimit}W). Split high-watt lights across different wall circuits or use a power station.`,
    });
  } else if (totalWatts > 1200 && powerStrips.length === 0) {
    powerWarnings.push({
      type: 'power-strip-needed',
      severity: 'warning',
      message: `Multiple powered studio lights detected (~${totalWatts}W total). Place a dedicated surge-protected power strip near your desk to prevent daisy-chaining cords.`,
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
      desc: `Place desk and chair maintaining at least 0.85m push-out space. Position talent to face the primary shooting axis.`,
    },
    {
      title: '2. Position Key & Natural Light (45° Rule)',
      desc: 'Set main key light (or position near window) 45° to the left or right of host at 1.7m height angled 30° down.',
    },
    {
      title: '3. Mount Camera / Smartphone at Eye Level',
      desc: 'Set camera tripod lens exactly at eye level (~1.3m). Maintain ~1.5m host-to-lens distance for natural facial proportions.',
    },
    {
      title: '4. Microphone Placement (15–20cm Rule)',
      desc: 'Position lavalier mic 15cm from mouth or boom mic 30cm overhead pointing at chin. Ensure away from PC fans.',
    },
    {
      title: '5. Cable Management & Circuit Safety',
      desc: 'Route cables along wall perimeters with gaffer tape. Connect lighting to dedicated surge protector.',
    },
  ];

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <>
      <div className="panel-section">
        <button
          className={`btn w-full justify-center font-bold text-xs py-2 ${
            warningCount > 0 && hasDanger ? 'border-red-400 bg-red-50 text-red-700' : 'bg-white hover:bg-gray-50'
          }`}
          onClick={toggleWarnings}
        >
          <ShieldAlert size={14} className={hasDanger ? 'text-red-600' : 'text-amber-600'} />
          <span>Setup & Sightline Checks</span>
          {warningCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-600 text-white font-bold font-mono">
              {warningCount}
            </span>
          )}
        </button>
      </div>

      {showWarnings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={toggleWarnings} />
          <div className="w-96 bg-white border-l-2 border-black h-full overflow-y-auto p-5 relative z-10 flex flex-col justify-between shadow-2xl">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3 border-b pb-3">
                <div>
                  <div className="font-mono font-bold text-base flex items-center gap-2">
                    <ShieldAlert size={18} className="text-[#FFDD00]" />
                    <span>Studio Quality Checks</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Professional creator ergonomics & acoustic safety diagnostics.
                  </div>
                </div>
                <button
                  className="btn btn-icon text-sm font-mono hover:bg-gray-100"
                  onClick={toggleWarnings}
                >
                  ✕
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex border border-black mb-4 font-mono text-[11px] font-bold">
                <button
                  className={`flex-1 py-1.5 px-2 text-center transition-colors flex items-center justify-center gap-1 ${
                    activeTab === 'spatial' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('spatial')}
                >
                  <Zap size={12} /> Spatial & Power ({warnings.length + powerWarnings.length})
                </button>
                <button
                  className={`flex-1 py-1.5 px-2 text-center transition-colors flex items-center justify-center gap-1 border-l border-black ${
                    activeTab === 'acoustic' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('acoustic')}
                >
                  <Volume2 size={12} /> Audio ({acousticWarnings.length})
                </button>
                <button
                  className={`flex-1 py-1.5 px-2 text-center transition-colors flex items-center justify-center gap-1 border-l border-black ${
                    activeTab === 'checklist' ? 'bg-[#FFDD00] text-black' : 'bg-white hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('checklist')}
                >
                  <BookOpen size={12} /> Build Guide
                </button>
              </div>

              {/* Tab 1: Spatial & Power */}
              {activeTab === 'spatial' && (
                <div className="space-y-2.5">
                  {warnings.length === 0 && powerWarnings.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4">
                      <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-1.5" />
                      <div className="text-xs font-bold text-emerald-900 font-mono">Spatial & Power Clear</div>
                      <div className="text-[11px] text-emerald-700 mt-1">
                        Excellent chair clearances, sightlines, and safe electrical circuit load.
                      </div>
                    </div>
                  ) : (
                    [...warnings, ...powerWarnings].map((w, i) => {
                      const style = SEVERITY_STYLES[w.severity];
                      return (
                        <div key={i} className={`p-3 border-2 border-black shadow-[2px_2px_0_#000] ${style.bg}`}>
                          <div className="flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                            <div className={`text-[11.5px] leading-relaxed font-mono ${style.text}`}>
                              {w.message}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 2: Acoustic Analysis */}
              {activeTab === 'acoustic' && (
                <div className="space-y-2.5">
                  {acousticWarnings.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4">
                      <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-1.5" />
                      <div className="text-xs font-bold text-emerald-900 font-mono">Audio Reflections Optimized</div>
                      <div className="text-[11px] text-emerald-700 mt-1">
                        Acoustic absorption materials detected. Voice tracks will remain tight and articulate.
                      </div>
                    </div>
                  ) : (
                    acousticWarnings.map((w, i) => {
                      const style = SEVERITY_STYLES[w.severity];
                      return (
                        <div key={i} className={`p-3 border-2 border-black shadow-[2px_2px_0_#000] ${style.bg}`}>
                          <div className="flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                            <div className={`text-[11.5px] leading-relaxed font-mono ${style.text}`}>
                              {w.message}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="p-3 bg-zinc-900 text-white font-mono text-[11px] border-2 border-black mt-3">
                    <div className="text-[#FFDD00] font-bold mb-1 flex items-center gap-1">
                      💡 Pro Home Studio Acoustic Tip:
                    </div>
                    <div>
                      Place a thick blanket or soft mattress behind the camera. Sound bouncing off your mouth travels past the camera and causes the most audible slap-back echo.
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Step-by-Step Creator Setup Guide */}
              {activeTab === 'checklist' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold font-mono text-gray-700">
                    Physical Studio Assembly Sequence ({Object.values(completedSteps).filter(Boolean).length}/5 Done):
                  </div>
                  {setupSteps.map((step, idx) => {
                    const isDone = !!completedSteps[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStep(idx)}
                        className={`p-3 border-2 border-black cursor-pointer transition-all ${
                          isDone ? 'bg-emerald-50 border-emerald-700 shadow-none' : 'bg-white shadow-[2px_2px_0_#000] hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className={`text-xs font-bold font-mono ${isDone ? 'line-through text-emerald-800' : 'text-black'}`}>
                              {step.title}
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-3 border-t text-[10px] text-gray-500 font-mono leading-relaxed">
              Calculations are engineered for creator workflow planning and visual sightline clarity.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
