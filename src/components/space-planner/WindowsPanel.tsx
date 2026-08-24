'use client';

import { usePlannerStore } from './store';
import { Plus, Trash2, Sun, DoorOpen, Maximize2, MoveHorizontal, MoveVertical, ShieldAlert } from 'lucide-react';
import type { PlacedObject } from './types';

export default function WindowsPanel() {
  const windows = usePlannerStore((s) => s.windows);
  const addWindow = usePlannerStore((s) => s.addWindow);
  const removeWindow = usePlannerStore((s) => s.removeWindow);
  const updateWindow = usePlannerStore((s) => s.updateWindow);
  const placeObject = usePlannerStore((s) => s.placeObject);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);

  const handleAddDoorSwing = (wall: 'north' | 'south' | 'west' | 'east') => {
    let x = 0;
    let z = 0;
    let rot = 0;

    if (wall === 'north') {
      x = roomWidth / 2 - 0.6;
      z = -roomDepth / 2 + 0.55;
      rot = 0;
    } else if (wall === 'south') {
      x = -roomWidth / 2 + 0.6;
      z = roomDepth / 2 - 0.55;
      rot = Math.PI;
    } else if (wall === 'west') {
      x = -roomWidth / 2 + 0.55;
      z = -roomDepth / 2 + 0.6;
      rot = Math.PI / 2;
    } else {
      x = roomWidth / 2 - 0.55;
      z = roomDepth / 2 - 0.6;
      rot = -Math.PI / 2;
    }

    const newObj: PlacedObject = {
      id: `door-swing-${Date.now()}`,
      equipmentId: 'furn-door-swing' as any,
      x,
      z,
      rotationY: rot,
      isMainCamera: false,
    };
    placeObject(newObj);
  };

  return (
    <div className="space-y-4 font-mono pb-8">
      {/* Header & Quick Wall Buttons */}
      <div className="p-3 bg-stone-100 border-2 border-black shadow-[2px_2px_0_#000] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-black text-xs text-black uppercase tracking-wider">
            <Sun size={14} className="text-amber-500" />
            <span>Studio Windows ({windows.length})</span>
          </div>
          <span className="text-[9.5px] text-stone-500 font-bold">Natural Light</span>
        </div>

        <div className="grid grid-cols-4 gap-1 pt-1">
          <button
            onClick={() => addWindow('back')}
            className="px-1.5 py-1 text-[10px] bg-white hover:bg-black hover:text-white border border-black font-bold transition-colors"
            title="Add window on Back / North wall"
          >
            + North
          </button>
          <button
            onClick={() => addWindow('left')}
            className="px-1.5 py-1 text-[10px] bg-white hover:bg-black hover:text-white border border-black font-bold transition-colors"
            title="Add window on Left / West wall"
          >
            + West
          </button>
          <button
            onClick={() => addWindow('right')}
            className="px-1.5 py-1 text-[10px] bg-white hover:bg-black hover:text-white border border-black font-bold transition-colors"
            title="Add window on Right / East wall"
          >
            + East
          </button>
          <button
            onClick={() => addWindow('front')}
            className="px-1.5 py-1 text-[10px] bg-white hover:bg-black hover:text-white border border-black font-bold transition-colors"
            title="Add window on Front / South wall"
          >
            + South
          </button>
        </div>
      </div>

      {/* Placed Windows Full Unconstrained List */}
      {windows.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-stone-300 text-center space-y-1.5 bg-stone-50">
          <Sun size={20} className="mx-auto text-stone-400" />
          <p className="text-xs font-bold text-stone-700">No Windows Placed</p>
          <p className="text-[10px] text-stone-500">
            Click one of the wall buttons above (+ North, + West, etc.) to add natural daylight sources.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {windows.map((win, idx) => (
            <div
              key={win.id}
              className="border-2 border-black p-3 bg-white shadow-[2px_2px_0_#000] space-y-2.5 transition-all"
            >
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-black">
                    WIN #{idx + 1}
                  </span>
                  <select
                    value={win.wall}
                    onChange={(e) => updateWindow(win.id, { wall: e.target.value as any })}
                    className="text-[10px] font-bold border border-black px-1.5 py-0.5 bg-stone-50 text-black cursor-pointer"
                  >
                    <option value="back">North Wall (Back)</option>
                    <option value="front">South Wall (Front)</option>
                    <option value="left">West Wall (Left)</option>
                    <option value="right">East Wall (Right)</option>
                  </select>
                </div>

                <button
                  onClick={() => removeWindow(win.id)}
                  className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-300 transition-all"
                  title="Delete window"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-2 text-[10px]">
                {/* Horizontal Position Along Wall */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-stone-600 font-bold">
                    <span className="flex items-center gap-1">
                      <MoveHorizontal size={11} /> Position Along Wall
                    </span>
                    <span className="text-black font-mono">
                      {win.xOffset === 0
                        ? 'Center'
                        : win.xOffset < 0
                        ? `${Math.abs(Math.round(win.xOffset * 100))}% Left`
                        : `${Math.round(win.xOffset * 100)}% Right`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min={-0.9}
                      max={0.9}
                      step={0.05}
                      value={win.xOffset}
                      onChange={(e) => updateWindow(win.id, { xOffset: parseFloat(e.target.value) })}
                      className="flex-1 h-2 accent-black cursor-pointer"
                    />
                    <button
                      onClick={() => updateWindow(win.id, { xOffset: 0 })}
                      className="px-1.5 py-0.5 text-[9px] font-bold bg-stone-100 hover:bg-stone-200 border border-black"
                      title="Center window on wall"
                    >
                      Center
                    </button>
                  </div>
                </div>

                {/* Width Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-stone-600 font-bold">
                    <span>Width</span>
                    <span className="text-black font-mono font-bold">
                      {win.width.toFixed(2)}m ({(win.width * 3.28084).toFixed(1)}ft)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.1}
                      value={win.width}
                      onChange={(e) => updateWindow(win.id, { width: parseFloat(e.target.value) })}
                      className="flex-1 h-2 accent-black cursor-pointer"
                    />
                  </div>
                </div>

                {/* Height Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-stone-600 font-bold">
                    <span>Height</span>
                    <span className="text-black font-mono font-bold">
                      {win.height.toFixed(2)}m ({(win.height * 3.28084).toFixed(1)}ft)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.5}
                      max={2.6}
                      step={0.1}
                      value={win.height}
                      onChange={(e) => updateWindow(win.id, { height: parseFloat(e.target.value) })}
                      className="flex-1 h-2 accent-black cursor-pointer"
                    />
                  </div>
                </div>

                {/* Elevation / Height from floor */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-stone-600 font-bold">
                    <span className="flex items-center gap-1">
                      <MoveVertical size={11} /> Height From Floor (Sill)
                    </span>
                    <span className="text-black font-mono font-bold">
                      {(win.heightOffset ?? 1.5).toFixed(2)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.6}
                      max={2.4}
                      step={0.05}
                      value={win.heightOffset ?? 1.5}
                      onChange={(e) => updateWindow(win.id, { heightOffset: parseFloat(e.target.value) })}
                      className="flex-1 h-2 accent-black cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Door Swing & Architectural Obstacles Section */}
      <div className="p-3 bg-stone-100 border-2 border-black shadow-[2px_2px_0_#000] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-black text-xs text-black uppercase tracking-wider">
            <DoorOpen size={14} className="text-cyan-700" />
            <span>Entry Doors & Clearances</span>
          </div>
        </div>
        <p className="text-[10px] text-stone-600 leading-tight">
          Add door swing radii to ensure equipment and light stands do not block entryways.
        </p>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => handleAddDoorSwing('north')}
            className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-black font-bold text-[10px] text-left transition-colors"
          >
            🚪 North Entry Door
          </button>
          <button
            onClick={() => handleAddDoorSwing('south')}
            className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-black font-bold text-[10px] text-left transition-colors"
          >
            🚪 South Entry Door
          </button>
          <button
            onClick={() => handleAddDoorSwing('west')}
            className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-black font-bold text-[10px] text-left transition-colors"
          >
            🚪 West Entry Door
          </button>
          <button
            onClick={() => handleAddDoorSwing('east')}
            className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-black font-bold text-[10px] text-left transition-colors"
          >
            🚪 East Entry Door
          </button>
        </div>
      </div>
    </div>
  );
}
