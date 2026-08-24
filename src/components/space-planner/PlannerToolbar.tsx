'use client';

import { useState, useEffect } from 'react';
import { usePlannerStore } from './store';
import {
  Camera,
  Grid,
  Footprints,
  Ruler,
  Sun,
  Flame,
  Eye,
  Wand2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Trash2,
  Box,
  CheckCircle2,
} from 'lucide-react';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';

export default function PlannerToolbar() {
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const isOrbitPanning = usePlannerStore((s) => s.isOrbitPanning);
  const toggleOrbitPanning = usePlannerStore((s) => s.toggleOrbitPanning);
  const setOrbitPanning = usePlannerStore((s) => s.setOrbitPanning);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const updateObjectRotation = usePlannerStore((s) => s.updateObjectRotation);
  const deleteObject = usePlannerStore((s) => s.deleteObject);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const toggleCameraPreview = usePlannerStore((s) => s.toggleCameraPreview);
  const showLuxHeatmap = usePlannerStore((s) => s.showLuxHeatmap);
  const toggleLuxHeatmap = usePlannerStore((s) => s.toggleLuxHeatmap);
  const isMeasuring = usePlannerStore((s) => s.isMeasuring);
  const toggleMeasuring = usePlannerStore((s) => s.toggleMeasuring);
  const showLightBeams = usePlannerStore((s) => s.showLightBeams);
  const toggleLightBeams = usePlannerStore((s) => s.toggleLightBeams);
  const optimizeStudioErgonomics = usePlannerStore((s) => s.optimizeStudioErgonomics);
  const setMainCamera = usePlannerStore((s) => s.setMainCamera);
  const isZenMode = usePlannerStore((s) => s.isZenMode);
  const toggleZenMode = usePlannerStore((s) => s.toggleZenMode);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const cameras = placedObjects.filter(
    (o) =>
      typeof o.equipmentId === 'string' &&
      (o.equipmentId === 'camera' ||
        o.equipmentId.startsWith('cam') ||
        o.equipmentId.includes('phone') ||
        o.equipmentId.includes('webcam') ||
        o.equipmentId.includes('prompter'))
  );
  const hasCamera = cameras.length > 0;

  const selectedObj = placedObjects.find((o) => o.id === selectedObjectId);
  const selectedDef = selectedObj ? COMPREHENSIVE_EQUIPMENT_CATALOG[selectedObj.equipmentId] : null;

  // Global Keyboard Shortcuts for Toolbar Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === '1') {
        if (viewMode !== 'perspective') {
          setViewMode('perspective');
          setOrbitPanning(true);
        } else {
          toggleOrbitPanning();
        }
      } else if (e.key === '2') {
        setViewMode('top');
      } else if (e.key === '3') {
        if (hasCamera) setViewMode('camera-pov');
      } else if (e.key === '4') {
        setViewMode('walkthrough');
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMeasuring();
      } else if (e.key === 'b' || e.key === 'B') {
        toggleLightBeams();
      } else if (e.key === 'l' || e.key === 'L') {
        toggleLuxHeatmap();
      } else if (e.key === 'p' || e.key === 'P') {
        if (hasCamera) toggleCameraPreview();
      } else if ((e.key === 'r' || e.key === 'R') && selectedObjectId) {
        const obj = placedObjects.find((o) => o.id === selectedObjectId);
        if (obj) {
          updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4);
          showToast(`Rotated ${selectedDef?.name || 'Item'} +45°`);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
        deleteObject(selectedObjectId);
        showToast('Item removed from studio');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    setViewMode,
    toggleOrbitPanning,
    setOrbitPanning,
    hasCamera,
    toggleMeasuring,
    toggleLightBeams,
    toggleLuxHeatmap,
    toggleCameraPreview,
    selectedObjectId,
    placedObjects,
    selectedDef,
    updateObjectRotation,
    deleteObject,
  ]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 max-w-[calc(100vw-32px)]">
      {/* Dynamic Toast Feedback Pill */}
      {toastMessage && (
        <div className="bg-black text-[#FFE500] border-2 border-black px-3 py-1 text-[11px] font-mono font-bold shadow-[2px_2px_0_#000] flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <CheckCircle2 size={13} className="text-[#00FF66]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Neo-Brutalist Floating CAD Studio Dock */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] p-1 flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar select-none font-mono">
        
        {/* SECTION 1: View Modes Segmented Control */}
        <div className="flex items-center border-2 border-black divide-x-2 divide-black bg-stone-100 flex-shrink-0">
          {/* 3D Orbit View */}
          <button
            onClick={() => {
              if (viewMode !== 'perspective') {
                setViewMode('perspective');
                setOrbitPanning(true);
              } else {
                toggleOrbitPanning();
              }
            }}
            className={`px-2.5 py-1 text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
              viewMode === 'perspective'
                ? 'bg-[#FFE500] text-black shadow-inner'
                : 'bg-white text-stone-800 hover:bg-stone-100'
            }`}
            title="3D Orbit View (Key 1) · Click to toggle cinematic pan"
          >
            <Box size={13} />
            <span className="hidden sm:inline">3D Orbit</span>
            <span className="text-[9px] opacity-60 font-mono">[1]</span>
            {viewMode === 'perspective' && isOrbitPanning && (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            )}
          </button>

          {/* 2D CAD Blueprint */}
          <button
            onClick={() => setViewMode('top')}
            className={`px-2.5 py-1 text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
              viewMode === 'top'
                ? 'bg-[#FFE500] text-black shadow-inner'
                : 'bg-white text-stone-800 hover:bg-stone-100'
            }`}
            title="2D CAD Top Blueprint (Key 2)"
          >
            <Grid size={13} />
            <span className="hidden sm:inline">2D CAD</span>
            <span className="text-[9px] opacity-60 font-mono">[2]</span>
          </button>

          {/* Director POV */}
          <button
            onClick={() => hasCamera && setViewMode('camera-pov')}
            disabled={!hasCamera}
            className={`px-2.5 py-1 text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
              viewMode === 'camera-pov'
                ? 'bg-[#FFE500] text-black shadow-inner'
                : hasCamera
                ? 'bg-white text-stone-800 hover:bg-stone-100'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
            title={hasCamera ? "Director POV Lens Viewfinder (Key 3)" : "Add a camera from the library to enable Director POV"}
          >
            <Camera size={13} />
            <span className="hidden sm:inline">Director POV</span>
            <span className="text-[9px] opacity-60 font-mono">[3]</span>
          </button>

          {/* Walk-In */}
          <button
            onClick={() => setViewMode('walkthrough')}
            className={`px-2.5 py-1 text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
              viewMode === 'walkthrough'
                ? 'bg-[#FFE500] text-black shadow-inner'
                : 'bg-white text-stone-800 hover:bg-stone-100'
            }`}
            title="First-Person Studio Walk-In (Key 4)"
          >
            <Footprints size={13} />
            <span className="hidden md:inline">Walk-In</span>
            <span className="text-[9px] opacity-60 font-mono">[4]</span>
          </button>
        </div>

        {/* Multi-Camera Angle Selector (if multiple cameras placed) */}
        {cameras.length > 1 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 border-2 border-black flex-shrink-0">
            <span className="text-[9px] font-black text-black uppercase">CAM:</span>
            {cameras.map((c, idx) => {
              const isMain = c.isMainCamera || (!placedObjects.some((o) => o.isMainCamera) && idx === 0);
              const label = idx === 0 ? 'A' : idx === 1 ? 'B' : `${idx + 1}`;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setMainCamera(c.id);
                    showToast(`Active camera set to Angle ${label}`);
                  }}
                  className={`w-5 h-5 border border-black flex items-center justify-center text-[10px] font-black transition-all ${
                    isMain ? 'bg-[#FFE500] text-black shadow-[1px_1px_0_#000]' : 'bg-white text-stone-800 hover:bg-stone-200'
                  }`}
                  title={`Switch to Camera Angle ${label}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Vertical Divider */}
        <div className="w-0.5 h-6 bg-black flex-shrink-0 mx-0.5" />

        {/* SECTION 2: Studio Visual Overlays & Measurement Toggles */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Laser Ruler */}
          <button
            onClick={toggleMeasuring}
            className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase flex items-center gap-1 transition-all ${
              isMeasuring
                ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                : 'bg-white text-stone-900 hover:bg-stone-100 shadow-[1.5px_1.5px_0_#000]'
            }`}
            title="Laser Ruler (Key M) · Measure point-to-point distances and clearance in 3D"
          >
            <Ruler size={13} />
            <span className="hidden lg:inline">Ruler</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">[M]</span>
          </button>

          {/* Light Beams */}
          <button
            onClick={toggleLightBeams}
            className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase flex items-center gap-1 transition-all ${
              showLightBeams
                ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                : 'bg-white text-stone-900 hover:bg-stone-100 shadow-[1.5px_1.5px_0_#000]'
            }`}
            title="3D Light Cones & Beam Spreads (Key B)"
          >
            <Sun size={13} />
            <span className="hidden lg:inline">Beams</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">[B]</span>
          </button>

          {/* Lux Heatmap */}
          <button
            onClick={toggleLuxHeatmap}
            className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase flex items-center gap-1 transition-all ${
              showLuxHeatmap
                ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                : 'bg-white text-stone-900 hover:bg-stone-100 shadow-[1.5px_1.5px_0_#000]'
            }`}
            title="Volumetric Lighting Lux Heatmap (Key L)"
          >
            <Flame size={13} />
            <span className="hidden lg:inline">Lux</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">[L]</span>
          </button>

          {/* PiP Viewport */}
          <button
            onClick={toggleCameraPreview}
            disabled={!hasCamera}
            className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase flex items-center gap-1 transition-all ${
              showCameraPreview
                ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                : hasCamera
                ? 'bg-white text-stone-900 hover:bg-stone-100 shadow-[1.5px_1.5px_0_#000]'
                : 'bg-stone-100 text-stone-400 border-stone-300 cursor-not-allowed shadow-none'
            }`}
            title={hasCamera ? "Toggle Live Director's Viewport PiP (Key P)" : "Add a camera to enable PiP Viewport"}
          >
            <Eye size={13} />
            <span className="hidden lg:inline">PiP</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">[P]</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="w-0.5 h-6 bg-black flex-shrink-0 mx-0.5" />

        {/* SECTION 3: Smart Studio Tools */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Auto-Align Ergonomics */}
          <button
            onClick={() => {
              optimizeStudioErgonomics();
              showToast('Calibrated 45° Key Light, 0.9m Seating Egress & Lens Eye-Level');
            }}
            className="px-2.5 py-1 bg-[#00FF66] hover:bg-emerald-300 text-black border-2 border-black font-black text-[11px] uppercase flex items-center gap-1 shadow-[1.5px_1.5px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
            title="Auto-Align: Calibrate 45° Key Light, 0.9m Seating Clearance & Lens Eye-Level"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">Auto-Align</span>
          </button>

          {/* Zen View Mode */}
          <button
            onClick={toggleZenMode}
            className={`px-2 py-1 border-2 border-black text-[11px] font-bold uppercase flex items-center gap-1 transition-all ${
              isZenMode
                ? 'bg-black text-white shadow-[1.5px_1.5px_0_#000]'
                : 'bg-white text-stone-900 hover:bg-stone-100 shadow-[1.5px_1.5px_0_#000]'
            }`}
            title="Zen Mode (Key H) · Hide all overlays for clean inspection"
          >
            <Minimize2 size={13} />
            <span className="hidden md:inline">Zen</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">[H]</span>
          </button>
        </div>

        {/* SECTION 4: Contextual Selected Item Transform HUD */}
        {selectedObj && (
          <>
            <div className="w-0.5 h-6 bg-black flex-shrink-0 mx-0.5" />
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 border-2 border-black flex-shrink-0">
              <span className="text-[10px] font-black text-black max-w-[100px] truncate px-1" title={selectedDef?.name || selectedObj.equipmentId}>
                {selectedDef?.name || selectedObj.equipmentId}
              </span>
              <button
                onClick={() => {
                  updateObjectRotation(selectedObj.id, selectedObj.rotationY - Math.PI / 4);
                  showToast('Rotated -45°');
                }}
                className="p-1 bg-white hover:bg-stone-200 border border-black text-black"
                title="Rotate -45°"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={() => {
                  updateObjectRotation(selectedObj.id, selectedObj.rotationY + Math.PI / 4);
                  showToast('Rotated +45° (Key R)');
                }}
                className="p-1 bg-white hover:bg-stone-200 border border-black text-black"
                title="Rotate +45° (Key R)"
              >
                <RotateCw size={12} />
              </button>
              <button
                onClick={() => {
                  deleteObject(selectedObj.id);
                  showToast('Item deleted');
                }}
                className="p-1 bg-red-600 hover:bg-red-700 border border-black text-white"
                title="Delete Selected Item (Del)"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
