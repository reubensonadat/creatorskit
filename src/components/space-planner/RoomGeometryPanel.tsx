'use client';

import React, { useState } from 'react';
import { usePlannerStore } from './store';
import type { PlacedObject, FloorFinish } from './types';
import { calculateRoomAcoustics } from '@/lib/space-planner/acoustics-lighting-engine';
import { Upload } from 'lucide-react';

interface AnglePhoto {
  id: 'door' | 'desk' | 'backdrop' | 'corner';
  title: string;
  subtitle: string;
  imgUrl: string | null;
  gridOverlay: boolean;
}

const INITIAL_ANGLES: AnglePhoto[] = [
  {
    id: 'door',
    title: '1. Entrance / Door View',
    subtitle: 'Stand at doorway looking straight into room',
    imgUrl: null,
    gridOverlay: true,
  },
  {
    id: 'desk',
    title: '2. Main Desk / Shooting Wall',
    subtitle: 'Facing the wall where your desk & camera sit',
    imgUrl: null,
    gridOverlay: true,
  },
  {
    id: 'backdrop',
    title: '3. Background / Opposite Wall',
    subtitle: 'Looking at the background wall behind your chair',
    imgUrl: null,
    gridOverlay: false,
  },
  {
    id: 'corner',
    title: '4. Wide Corner Perspective',
    subtitle: 'From a far corner showing floor & ceiling lines',
    imgUrl: null,
    gridOverlay: false,
  },
];

const FLOOR_FINISHES: { id: FloorFinish; name: string; desc: string; acousticBadge: string }[] = [
  {
    id: 'oak-parquet',
    name: 'Scandinavian Oak Parquet',
    desc: 'Natural hardwood timber with warm tone and moderate sound reflection.',
    acousticBadge: 'Balanced Reflection',
  },
  {
    id: 'acoustic-carpet',
    name: 'Studio Acoustic Carpet',
    desc: 'Dense absorption tile weave that eliminates floor slap-back flutter echoes.',
    acousticBadge: 'Acoustic Recommended',
  },
  {
    id: 'dark-epoxy',
    name: 'Obsidian Epoxy Resin',
    desc: 'Ultra high-gloss modern black floor. Reflects studio lighting accents.',
    acousticBadge: 'High Flutter Echo',
  },
  {
    id: 'concrete-loft',
    name: 'Industrial Polished Concrete',
    desc: 'Loft aesthetic with expansion joints and raw aggregate textures.',
    acousticBadge: 'Requires Wall Panels',
  },
];

export default function RoomGeometryPanel() {
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const floorFinish = usePlannerStore((s) => s.floorFinish);
  const setFloorFinish = usePlannerStore((s) => s.setFloorFinish);
  const wallDisplayMode = usePlannerStore((s) => s.wallDisplayMode);
  const setWallDisplayMode = usePlannerStore((s) => s.setWallDisplayMode);
  const setRoomDimensions = usePlannerStore((s) => s.setRoomDimensions);
  const placeObject = usePlannerStore((s) => s.placeObject);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const showAcousticRays = usePlannerStore((s) => s.showAcousticRays);
  const toggleAcousticRays = usePlannerStore((s) => s.toggleAcousticRays);

  const [activeTab, setActiveTab] = useState<'dimensions' | 'finishes' | 'photo-reference' | 'presets'>('dimensions');
  const [unit, setUnit] = useState<'meters' | 'feet'>('meters');

  const [anglePhotos, setAnglePhotos] = useState<AnglePhoto[]>(INITIAL_ANGLES);
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);

  const acousticData = calculateRoomAcoustics(roomWidth, roomDepth, roomHeight, floorFinish, placedObjects);

  const handleApplyDimensions = (w: number, d: number, h?: number) => {
    const safeW = Math.max(2, Math.min(25, w || 4));
    const safeD = Math.max(2, Math.min(25, d || 3.5));
    const safeH = Math.max(2, Math.min(8, h || 2.6));
    setRoomDimensions(safeW, safeD, safeH);
  };

  const handleFileUpload = (angleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setAnglePhotos((prev) =>
        prev.map((a) => (a.id === angleId ? { ...a, imgUrl: url } : a))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (angleId: string) => {
    setAnglePhotos((prev) =>
      prev.map((a) => (a.id === angleId ? { ...a, imgUrl: null } : a))
    );
  };

  const toggleGrid = (angleId: string) => {
    setAnglePhotos((prev) =>
      prev.map((a) => (a.id === angleId ? { ...a, gridOverlay: !a.gridOverlay } : a))
    );
  };

  const addWardrobe = (wall: 'back' | 'left' | 'right') => {
    let x = 0;
    let z = 0;
    let rot = 0;
    if (wall === 'back') {
      x = 0;
      z = roomDepth / 2 - 0.35;
      rot = 0;
    } else if (wall === 'left') {
      x = -roomWidth / 2 + 0.35;
      z = 0;
      rot = Math.PI / 2;
    } else {
      x = roomWidth / 2 - 0.35;
      z = 0;
      rot = -Math.PI / 2;
    }
    const newObj: PlacedObject = {
      id: `wardrobe-${Date.now()}`,
      equipmentId: 'closet-wardrobe',
      x,
      z,
      rotationY: rot,
      isMainCamera: false,
    };
    placeObject(newObj);
  };

  const addDoorSwing = () => {
    const newObj: PlacedObject = {
      id: `door-swing-${Date.now()}`,
      equipmentId: 'furn-door-swing',
      x: roomWidth / 2 - 0.55,
      z: -roomDepth / 2 + 0.55,
      rotationY: 0,
      isMainCamera: false,
    };
    placeObject(newObj);
  };

  const addColumn = () => {
    const newObj: PlacedObject = {
      id: `column-${Date.now()}`,
      equipmentId: 'furn-pillar-column',
      x: -roomWidth / 2 + 0.3,
      z: roomDepth / 2 - 0.3,
      rotationY: 0,
      isMainCamera: false,
    };
    placeObject(newObj);
  };

  return (
    <div className="flex flex-col gap-3 font-mono text-xs text-black">
      {/* Sub-tabs */}
      <div className="flex border-2 border-black bg-stone-100">
        <button
          onClick={() => setActiveTab('dimensions')}
          className={`flex-1 py-1.5 px-1 font-bold border-r border-black transition-all ${
            activeTab === 'dimensions' ? 'bg-black text-[#FFE500] font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Dimensions
        </button>
        <button
          onClick={() => setActiveTab('finishes')}
          className={`flex-1 py-1.5 px-1 font-bold border-r border-black transition-all ${
            activeTab === 'finishes' ? 'bg-black text-[#FFE500] font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Finishes
        </button>
        <button
          onClick={() => setActiveTab('photo-reference')}
          className={`flex-1 py-1.5 px-1 font-bold border-r border-black transition-all ${
            activeTab === 'photo-reference' ? 'bg-black text-[#FFE500] font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Angles
        </button>
      </div>

      {/* ================= TAB 1: DIMENSIONS ================= */}
      {activeTab === 'dimensions' && (
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-[#fbf9f5] border-2 border-black shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-[11px] uppercase tracking-wider text-black">Room Size</span>
              <div className="flex border border-black text-[9.5px]">
                <button
                  onClick={() => setUnit('meters')}
                  className={`px-1.5 py-0.5 font-bold ${unit === 'meters' ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  Meters
                </button>
                <button
                  onClick={() => setUnit('feet')}
                  className={`px-1.5 py-0.5 font-bold border-l border-black ${unit === 'feet' ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  Feet
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span>Width: {roomWidth}m ({((roomWidth) * 3.28084).toFixed(1)}ft)</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={0.1}
                  value={roomWidth}
                  onChange={(e) => handleApplyDimensions(parseFloat(e.target.value), roomDepth, roomHeight)}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span>Depth: {roomDepth}m ({((roomDepth) * 3.28084).toFixed(1)}ft)</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={0.1}
                  value={roomDepth}
                  onChange={(e) => handleApplyDimensions(roomWidth, parseFloat(e.target.value), roomHeight)}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span>Ceiling Height: {roomHeight}m ({((roomHeight) * 3.28084).toFixed(1)}ft)</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={0.1}
                  value={roomHeight}
                  onChange={(e) => handleApplyDimensions(roomWidth, roomDepth, parseFloat(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Wall Cutaway Selector */}
          <div className="p-2.5 bg-stone-50 border-2 border-black">
            <span className="font-black text-[10.5px] uppercase tracking-wider text-black block mb-1.5">
              3D Wall Mode
            </span>
            <div className="grid grid-cols-2 gap-1 text-[9.5px] font-bold">
              <button
                onClick={() => setWallDisplayMode('auto-cutaway')}
                className={`p-1.5 border border-black ${wallDisplayMode === 'auto-cutaway' ? 'bg-black text-[#FFE500]' : 'bg-white'}`}
              >
                Auto Cutaway (Default)
              </button>
              <button
                onClick={() => setWallDisplayMode('corner-2')}
                className={`p-1.5 border border-black ${wallDisplayMode === 'corner-2' ? 'bg-black text-[#FFE500]' : 'bg-white'}`}
              >
                2 Corner Walls
              </button>
              <button
                onClick={() => setWallDisplayMode('u-shape-3')}
                className={`p-1.5 border border-black ${wallDisplayMode === 'u-shape-3' ? 'bg-black text-[#FFE500]' : 'bg-white'}`}
              >
                3 Walls (U-Shape)
              </button>
              <button
                onClick={() => setWallDisplayMode('all-4')}
                className={`p-1.5 border border-black ${wallDisplayMode === 'all-4' ? 'bg-black text-[#FFE500]' : 'bg-white'}`}
              >
                All 4 Walls
              </button>
            </div>
          </div>

          {/* Architectural Obstacles */}
          <div className="p-2.5 bg-stone-50 border-2 border-black space-y-1.5">
            <span className="font-black text-[10.5px] uppercase tracking-wider text-black block">
              Architectural Fixtures
            </span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => addWardrobe('back')}
                className="btn justify-center py-1 text-[9.5px] font-bold bg-white border-black"
              >
                + Wardrobe
              </button>
              <button
                onClick={addDoorSwing}
                className="btn justify-center py-1 text-[9.5px] font-bold bg-white border-black"
              >
                + Door Swing
              </button>
              <button
                onClick={addColumn}
                className="btn justify-center py-1 text-[9.5px] font-bold bg-white border-black"
              >
                + Pillar Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FLOOR FINISHES & ACOUSTICS ================= */}
      {activeTab === 'finishes' && (
        <div className="flex flex-col gap-3">
          {/* Sabine RT60 Live Acoustics Telemetry */}
          <div className="p-2.5 bg-purple-50 border-2 border-purple-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-[10.5px] uppercase tracking-wider text-purple-950">
                🎙️ Acoustic RT60 Reverb Engine
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-600 text-white font-mono">
                {acousticData.rt60Seconds}s RT60
              </span>
            </div>
            <div className="text-[10px] text-purple-900 leading-snug">
              Room Volume: <strong>{acousticData.roomVolumeM3} m³</strong> • Rating: <strong>{acousticData.acousticRating}</strong>
            </div>
            <div className="text-[9.5px] text-stone-700 leading-relaxed bg-white/80 p-1.5 border border-purple-200">
              {acousticData.tips[0] || 'Studio acoustics calibrated for speech.'}
            </div>

            <button
              onClick={toggleAcousticRays}
              className={`btn w-full justify-center py-1 text-[10px] font-bold mt-1 ${
                showAcousticRays ? 'bg-purple-700 text-white' : 'bg-white text-purple-950 border-purple-400'
              }`}
            >
              {showAcousticRays ? '✓ Acoustic 1st-Reflection Rays ON' : 'Show 1st-Reflection Sound Rays'}
            </button>
          </div>

          {/* Floor Finish Selection */}
          <div className="space-y-1.5">
            <span className="font-black text-[10.5px] uppercase tracking-wider text-black block">
              Architectural Floor Material
            </span>
            {FLOOR_FINISHES.map((f) => (
              <div
                key={f.id}
                onClick={() => setFloorFinish(f.id)}
                className={`p-2 border-2 cursor-pointer transition-all ${
                  floorFinish === f.id
                    ? 'border-black bg-amber-50/80 shadow-[2px_2px_0_#000]'
                    : 'border-stone-200 bg-white hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[11px] text-black">{f.name}</span>
                  <span className="text-[8.5px] font-mono px-1 py-0.2 bg-stone-100 border border-black/20 text-stone-700">
                    {f.acousticBadge}
                  </span>
                </div>
                <div className="text-[9.5px] text-stone-600 leading-snug">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PHOTO ANGLES ================= */}
      {activeTab === 'photo-reference' && (
        <div className="flex flex-col gap-2">
          <div className="p-2 bg-stone-100 border border-black text-[10px] leading-relaxed">
            Upload photos of your real room from standard perspectives to cross-reference while positioning your 3D equipment.
          </div>

          {anglePhotos.map((angle, idx) => (
            <div
              key={angle.id}
              className={`p-2 border-2 ${
                activeAngleIndex === idx ? 'border-black bg-white shadow-[2px_2px_0_#000]' : 'border-stone-300 bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[10.5px] text-black">{angle.title}</span>
                {angle.imgUrl ? (
                  <span className="text-[9px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                    Uploaded
                  </span>
                ) : (
                  <span className="text-[9px] text-stone-500">No Photo</span>
                )}
              </div>
              <div className="text-[9px] text-stone-600 mb-2 leading-tight">{angle.subtitle}</div>

              {angle.imgUrl ? (
                <div className="relative border border-black overflow-hidden mb-1.5 bg-black">
                  <img src={angle.imgUrl} alt={angle.title} className="w-full h-24 object-cover" />
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <button
                      onClick={() => toggleGrid(angle.id)}
                      className={`px-1.5 py-0.5 text-[8.5px] font-bold border border-black ${
                        angle.gridOverlay ? 'bg-[#FFDD00] text-black' : 'bg-black/80 text-white'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => handleRemovePhoto(angle.id)}
                      className="px-1.5 py-0.5 text-[8.5px] font-bold bg-red-600 text-white border border-black"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-dashed border-black cursor-pointer hover:bg-stone-100 font-bold text-[9.5px]">
                  <Upload size={12} />
                  <span>Upload Angle Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(angle.id, e)}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
