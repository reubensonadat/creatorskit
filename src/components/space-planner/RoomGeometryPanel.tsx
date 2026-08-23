'use client';

import React, { useState } from 'react';
import { usePlannerStore } from './store';
import type { PlacedObject } from './types';
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

// Architectural Presets
const CREATOR_ROOM_PRESETS = [
  {
    id: 'bedroom-4x3.5',
    title: '4.0m × 3.5m Bedroom Studio with Wardrobe',
    desc: 'Standard creator bedroom with built-in wardrobe along the side wall and bed.',
    width: 4.0,
    depth: 3.5,
    height: 2.6,
    obstacles: [
      { id: 'closet-wardrobe', name: 'Built-in Wardrobe', x: 1.1, z: 1.45, rotY: 0 },
      { id: 'bed-furniture', name: 'Double Bed', x: -1.0, z: 0.7, rotY: 0 },
      { id: 'furn-door-swing', name: 'Door Clearance Swing', x: 1.7, z: -1.4, rotY: Math.PI / 2 },
    ],
  },
  {
    id: 'square-4x4',
    title: '4.0m × 4.0m Square Room with Corner Pillar',
    desc: 'Square studio space with structural corner column and wardrobe.',
    width: 4.0,
    depth: 4.0,
    height: 2.8,
    obstacles: [
      { id: 'closet-wardrobe', name: 'Deep Wardrobe', x: -1.2, z: 1.65, rotY: 0 },
      { id: 'furn-pillar-column', name: 'Corner Pillar', x: 1.7, z: 1.7, rotY: 0 },
      { id: 'furn-door-swing', name: 'Door Clearance', x: -1.7, z: -1.7, rotY: 0 },
    ],
  },
  {
    id: 'compact-3.5x3',
    title: '3.5m × 3.0m Compact Creator Nook',
    desc: 'Tight bedroom setup optimized for corner desk and ring light setup.',
    width: 3.5,
    depth: 3.0,
    height: 2.5,
    obstacles: [
      { id: 'closet-wardrobe', name: 'Tall Wardrobe', x: 0.9, z: 1.2, rotY: 0 },
      { id: 'furn-door-swing', name: 'Door Clearance', x: 1.4, z: -1.1, rotY: Math.PI / 2 },
    ],
  },
];

export default function RoomGeometryPanel() {
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const wallDisplayMode = usePlannerStore((s) => s.wallDisplayMode);
  const setWallDisplayMode = usePlannerStore((s) => s.setWallDisplayMode);
  const setRoomDimensions = usePlannerStore((s) => s.setRoomDimensions);
  const placeObject = usePlannerStore((s) => s.placeObject);

  const [activeTab, setActiveTab] = useState<'dimensions' | 'photo-reference' | 'presets'>('dimensions');
  const [unit, setUnit] = useState<'meters' | 'feet'>('meters');

  // Multi-angle photo reference state
  const [anglePhotos, setAnglePhotos] = useState<AnglePhoto[]>(INITIAL_ANGLES);
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);

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

  // Quick add architectural features
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
      x: roomWidth / 2 - 0.6,
      z: -roomDepth / 2 + 0.6,
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
            activeTab === 'dimensions' ? 'bg-black text-white font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Dimensions
        </button>
        <button
          onClick={() => setActiveTab('photo-reference')}
          className={`flex-1 py-1.5 px-1 font-bold border-r border-black transition-all ${
            activeTab === 'photo-reference' ? 'bg-black text-white font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Photo Angles
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-1 font-bold transition-all ${
            activeTab === 'presets' ? 'bg-black text-white font-black' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Room Shapes
        </button>
      </div>

      {/* ================= TAB 1: DIMENSIONS & ARCHITECTURAL ELEMENTS ================= */}
      {activeTab === 'dimensions' && (
        <div className="flex flex-col gap-3">
          {/* Unit Toggle & Live Metrics */}
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

            {/* Sliders & Inputs */}
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
                  min={2.2}
                  max={4.5}
                  step={0.1}
                  value={roomHeight}
                  onChange={(e) => handleApplyDimensions(roomWidth, roomDepth, parseFloat(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Wall Enclosure & Visibility Modes */}
          <div className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0_#000]">
            <span className="font-black text-[11px] uppercase tracking-wider text-black block mb-2">
              Wall Enclosure & View
            </span>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              <button
                onClick={() => setWallDisplayMode('auto-cutaway')}
                className={`py-1 px-1.5 font-bold border border-black text-center transition-all ${
                  wallDisplayMode === 'auto-cutaway' ? 'bg-black text-white font-black' : 'bg-stone-50 text-black hover:bg-stone-100'
                }`}
                title="Smart cutaway: walls facing camera fade so view is never blocked"
              >
                Auto-Cutaway
              </button>
              <button
                onClick={() => setWallDisplayMode('all-4')}
                className={`py-1 px-1.5 font-bold border border-black text-center transition-all ${
                  wallDisplayMode === 'all-4' ? 'bg-black text-white font-black' : 'bg-stone-50 text-black hover:bg-stone-100'
                }`}
                title="All 4 solid walls enclosed"
              >
                4 Solid Walls
              </button>
              <button
                onClick={() => setWallDisplayMode('corner-2')}
                className={`py-1 px-1.5 font-bold border border-black text-center transition-all ${
                  wallDisplayMode === 'corner-2' ? 'bg-black text-white font-black' : 'bg-stone-50 text-black hover:bg-stone-100'
                }`}
                title="Open 2-wall corner studio"
              >
                Corner (2 Walls)
              </button>
              <button
                onClick={() => setWallDisplayMode('floor-only')}
                className={`py-1 px-1.5 font-bold border border-black text-center transition-all ${
                  wallDisplayMode === 'floor-only' ? 'bg-black text-white font-black' : 'bg-stone-50 text-black hover:bg-stone-100'
                }`}
                title="Open soundstage floor"
              >
                Floor Only
              </button>
            </div>
          </div>

          {/* Architectural Fixtures / Obstacles */}
          <div className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0_#000]">
            <span className="font-black text-[11px] uppercase tracking-wider text-black block mb-2">
              Architectural Fixtures
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => addWardrobe('back')}
                className="btn w-full justify-between py-1 px-2 text-[10px] font-bold bg-stone-50 border-black hover:bg-stone-100"
              >
                <span>+ Built-in Wardrobe (Back Wall)</span>
                <span className="text-[9px] text-stone-500 font-normal">1.8m × 0.6m</span>
              </button>
              <button
                onClick={() => addWardrobe('left')}
                className="btn w-full justify-between py-1 px-2 text-[10px] font-bold bg-stone-50 border-black hover:bg-stone-100"
              >
                <span>+ Built-in Wardrobe (Side Wall)</span>
                <span className="text-[9px] text-stone-500 font-normal">1.8m × 0.6m</span>
              </button>
              <button
                onClick={addDoorSwing}
                className="btn w-full justify-between py-1 px-2 text-[10px] font-bold bg-stone-50 border-black hover:bg-stone-100"
              >
                <span>+ Room Entry Door Clearance</span>
                <span className="text-[9px] text-stone-500 font-normal">0.9m swing</span>
              </button>
              <button
                onClick={addColumn}
                className="btn w-full justify-between py-1 px-2 text-[10px] font-bold bg-stone-50 border-black hover:bg-stone-100"
              >
                <span>+ Structural Column / Pillar</span>
                <span className="text-[9px] text-stone-500 font-normal">0.45m pillar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MULTI-ANGLE REAL PHOTO REFERENCE ================= */}
      {activeTab === 'photo-reference' && (
        <div className="flex flex-col gap-3">
          <div className="p-2 bg-stone-100 border border-black text-[10px] leading-relaxed">
            <span className="font-bold text-black block mb-0.5">Real Room Visual Reference</span>
            Upload photos of your real room from standard perspectives to cross-reference while positioning your 3D furniture and cameras.
          </div>

          {/* Angle List */}
          <div className="flex flex-col gap-2">
            {anglePhotos.map((angle, idx) => (
              <div
                key={angle.id}
                className={`p-2 border-2 transition-all ${
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
                    <img src={angle.imgUrl} alt={angle.title} className="w-full h-28 object-cover" />
                    {angle.gridOverlay && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(56, 189, 248, 0.4) 1px, transparent 1px)
                          `,
                          backgroundSize: '25% 25%',
                        }}
                      />
                    )}
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button
                        onClick={() => toggleGrid(angle.id)}
                        className={`px-1.5 py-0.5 text-[8.5px] font-bold border border-black ${
                          angle.gridOverlay ? 'bg-[#FFDD00] text-black' : 'bg-black/80 text-white'
                        }`}
                        title="Toggle Horizon Alignment Grid"
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => handleRemovePhoto(angle.id)}
                        className="px-1.5 py-0.5 text-[8.5px] font-bold bg-red-600 text-white border border-black"
                        title="Delete photo"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-dashed border-black cursor-pointer hover:bg-stone-100 font-bold text-[9.5px]">
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
        </div>
      )}

      {/* ================= TAB 3: STANDARD ROOM PRESETS ================= */}
      {activeTab === 'presets' && (
        <div className="flex flex-col gap-2">
          {CREATOR_ROOM_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-2.5 bg-white border-2 border-black shadow-[2px_2px_0_#000] flex flex-col gap-1.5"
            >
              <div className="flex justify-between items-start">
                <span className="font-black text-[11px] text-black">{preset.title}</span>
              </div>
              <div className="text-[9.5px] text-stone-600 leading-tight">{preset.desc}</div>
              <button
                onClick={() => {
                  setRoomDimensions(preset.width, preset.depth, preset.height);
                  // Add obstacles
                  preset.obstacles.forEach((obs) => {
                    placeObject({
                      id: `obs-${Date.now()}-${Math.random()}`,
                      equipmentId: obs.id as any,
                      x: obs.x,
                      z: obs.z,
                      rotationY: obs.rotY,
                      isMainCamera: false,
                    });
                  });
                }}
                className="btn w-full justify-center py-1 font-black text-[10px] bg-[#FFDD00] text-black border-black hover:bg-amber-300 mt-1"
              >
                Apply Room Shape ({preset.width}m × {preset.depth}m)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
