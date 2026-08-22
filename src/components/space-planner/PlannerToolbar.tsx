'use client';

import { usePlannerStore } from './store';
import { Camera, Compass, Eye, Flame, RotateCcw, RotateCw, Trash2, Home, Grid, Footprints, Ruler, Sun, Sparkles, Sliders } from 'lucide-react';
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
  const clearAll = usePlannerStore((s) => s.clearAll);
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
  const activeCameraId = usePlannerStore((s) => s.activeCameraId);
  const setActiveCameraId = usePlannerStore((s) => s.setActiveCameraId);
  const setMainCamera = usePlannerStore((s) => s.setMainCamera);

  const cameras = placedObjects.filter(
    (o) => o.equipmentId === 'camera' || o.equipmentId.startsWith('cam') || o.equipmentId.includes('phone') || o.equipmentId.includes('webcam')
  );
  const hasCamera = cameras.length > 0;

  return (
    <div className="hud hud-bc">
      <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur border-2 border-black shadow-[3px_3px_0_#000]">
        {/* View Mode Buttons */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1.5 transition-all ${
            viewMode === 'perspective' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title={
            viewMode === 'perspective'
              ? isOrbitPanning
                ? 'Click to pause slow cinematic pan'
                : 'Click to start slow cinematic pan'
              : '3D Orbit Perspective (1)'
          }
          onClick={() => {
            if (viewMode !== 'perspective') {
              setViewMode('perspective');
              setOrbitPanning(true);
            } else {
              toggleOrbitPanning();
            }
          }}
        >
          <Home size={13} />
          <span>3D Orbit</span>
          {viewMode === 'perspective' && isOrbitPanning && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
          )}
        </button>

        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1.5 ${
            viewMode === 'top' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="2D Top-Down CAD Blueprint (2)"
          onClick={() => setViewMode('top')}
        >
          <Grid size={13} /> 2D Top
        </button>

        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1.5 ${
            viewMode === 'camera-pov' ? 'bg-[#FFDD00] text-black border-black' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Through-The-Lens Director POV (3)"
          onClick={() => setViewMode('camera-pov')}
          disabled={!hasCamera}
        >
          <Camera size={13} /> Director POV
        </button>

        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1.5 ${
            viewMode === 'walkthrough' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="First-Person Studio Walkthrough (4)"
          onClick={() => setViewMode('walkthrough')}
        >
          <Footprints size={13} /> Walk-In
        </button>

        <div className="w-px h-5 mx-0.5 bg-black/20" />

        {/* Multi-Camera Angle Switcher (if multiple cameras exist) */}
        {cameras.length > 1 && (
          <div className="flex items-center gap-1 bg-amber-50 px-1 py-0.5 border border-amber-400">
            <span className="text-[9px] font-mono font-bold text-amber-900 uppercase">Cam:</span>
            {cameras.map((c, idx) => {
              const isMain = c.isMainCamera || (!placedObjects.some((o) => o.isMainCamera) && idx === 0);
              const label = idx === 0 ? 'A (Main)' : idx === 1 ? 'B (Side)' : `C (${idx + 1})`;
              return (
                <button
                  key={c.id}
                  onClick={() => setMainCamera(c.id)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    isMain ? 'bg-black text-[#FFDD00]' : 'bg-white text-black border border-black/30 hover:bg-gray-100'
                  }`}
                  title={`Switch active director camera to ${COMPREHENSIVE_EQUIPMENT_CATALOG[c.equipmentId]?.name || 'Camera'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Laser Tape Ruler Tool */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 ${
            isMeasuring ? 'bg-[#00FF66] text-black border border-black animate-pulse' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Laser Tape Measure (M) — Click any 2 objects or floor points to measure exact distance & angle"
          onClick={toggleMeasuring}
        >
          <Ruler size={13} />
          <span>Ruler {isMeasuring ? 'ON' : ''}</span>
        </button>

        {/* Light Cones Volumetric Toggle */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 ${
            showLightBeams ? 'bg-[#38BDF8] text-black border border-black' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Toggle 3D Lighting Beam Angles & Kelvin Temperature Cones"
          onClick={toggleLightBeams}
        >
          <Sun size={13} />
          <span>Beams</span>
        </button>

        {/* Lux Heatmap Toggle */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 ${
            showLuxHeatmap ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Toggle Studio Lighting Lux & Coverage Heatmap"
          onClick={toggleLuxHeatmap}
        >
          <Flame size={13} /> Lux
        </button>

        {/* Live PiP Monitor Toggle */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 ${
            showCameraPreview ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Toggle Director's Live Picture-in-Picture Viewport"
          onClick={toggleCameraPreview}
          disabled={!hasCamera}
        >
          <Eye size={13} /> PiP
        </button>

        {/* 1-Click Studio Ergonomics Optimizer */}
        <button
          className="btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-black border border-black/20"
          title="1-Click Creator Studio Auto-Alignment (Triangulates 45° Key Light, 0.9m Chair Pushout & Camera Eye-Level)"
          onClick={() => {
            optimizeStudioErgonomics();
          }}
        >
          <Sparkles size={13} className="text-emerald-600" />
          <span>Auto-Align</span>
        </button>

        {/* Selected Object Manipulation */}
        {selectedObjectId && (
          <>
            <div className="w-px h-5 mx-0.5 bg-black/20" />
            <button
              className="btn btn-icon py-1 px-1.5 hover:bg-gray-100"
              title="Rotate Counter-Clockwise (-45°)"
              onClick={() => {
                const obj = placedObjects.find((o) => o.id === selectedObjectId);
                if (obj) updateObjectRotation(obj.id, obj.rotationY - Math.PI / 4);
              }}
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="btn btn-icon py-1 px-1.5 hover:bg-gray-100"
              title="Rotate Clockwise (+45°)"
              onClick={() => {
                const obj = placedObjects.find((o) => o.id === selectedObjectId);
                if (obj) updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4);
              }}
            >
              <RotateCw size={13} />
            </button>
            <button
              className="btn btn-icon text-red-600 hover:bg-red-50 py-1 px-1.5"
              title="Delete Item (Del)"
              onClick={() => deleteObject(selectedObjectId)}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}

        <div className="w-px h-5 mx-0.5 bg-black/20" />

        <button
          className="btn text-[10px] font-mono py-1 px-2 text-red-600 hover:bg-red-50"
          title="Clear all studio items"
          onClick={() => {
            if (confirm('Clear all equipment from this studio layout?')) {
              clearAll();
            }
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
