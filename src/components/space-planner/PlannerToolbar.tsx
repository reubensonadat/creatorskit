'use client';

import { usePlannerStore } from './store';
import { Camera, Compass, Eye, Flame, RotateCcw, RotateCw, Trash2, Home, Grid, Footprints } from 'lucide-react';

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

  const hasCamera = placedObjects.some((o) => o.equipmentId === 'camera' || o.equipmentId.startsWith('cam'));

  return (
    <div className="hud hud-bc">
      <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur border-2 border-black shadow-[3px_3px_0_#000]">
        {/* View Mode Buttons */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2.5 font-bold flex items-center gap-1.5 transition-all ${
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
          className={`btn text-[11px] font-mono py-1 px-2.5 font-bold flex items-center gap-1.5 ${
            viewMode === 'top' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="2D Top-Down CAD Blueprint (2)"
          onClick={() => setViewMode('top')}
        >
          <Grid size={13} /> 2D Top
        </button>

        <button
          className={`btn text-[11px] font-mono py-1 px-2.5 font-bold flex items-center gap-1.5 ${
            viewMode === 'camera-pov' ? 'bg-[#FFDD00] text-black border-black' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Through-The-Lens Director POV (3)"
          onClick={() => setViewMode('camera-pov')}
          disabled={!hasCamera}
        >
          <Camera size={13} /> Director POV
        </button>

        <button
          className={`btn text-[11px] font-mono py-1 px-2.5 font-bold flex items-center gap-1.5 ${
            viewMode === 'walkthrough' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="First-Person Studio Walkthrough (4)"
          onClick={() => setViewMode('walkthrough')}
        >
          <Footprints size={13} /> Walk-In
        </button>

        <div className="w-px h-5 mx-0.5 bg-black/20" />

        {/* Lux Heatmap Toggle */}
        <button
          className={`btn text-[11px] font-mono py-1 px-2 font-bold flex items-center gap-1 ${
            showLuxHeatmap ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white' : 'bg-white text-black hover:bg-gray-100'
          }`}
          title="Toggle Studio Lighting Lux & Coverage Heatmap"
          onClick={toggleLuxHeatmap}
        >
          <Flame size={13} /> Lux Heatmap
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
          <Eye size={13} /> PiP Monitor
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
