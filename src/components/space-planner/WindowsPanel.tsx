'use client';

import { usePlannerStore } from './store';
import { Plus, Trash2, MoveHorizontal, MoveVertical } from 'lucide-react';

export default function WindowsPanel() {
  const windows = usePlannerStore((s) => s.windows);
  const addWindow = usePlannerStore((s) => s.addWindow);
  const removeWindow = usePlannerStore((s) => s.removeWindow);
  const updateWindow = usePlannerStore((s) => s.updateWindow);

  return (
    <div className="border-t border-black/10 pt-3 mt-3 font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-bold text-black">Windows</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => addWindow('back')}
            className="px-1.5 py-0.5 text-[9.5px] bg-stone-100 hover:bg-stone-200 border border-black font-bold"
            title="Add window on Back / North wall"
          >
            + Back
          </button>
          <button
            onClick={() => addWindow('left')}
            className="px-1.5 py-0.5 text-[9.5px] bg-stone-100 hover:bg-stone-200 border border-black font-bold"
            title="Add window on Left / West wall"
          >
            + Left
          </button>
          <button
            onClick={() => addWindow('right')}
            className="px-1.5 py-0.5 text-[9.5px] bg-stone-100 hover:bg-stone-200 border border-black font-bold"
            title="Add window on Right / East wall"
          >
            + Right
          </button>
          <button
            onClick={() => addWindow('front')}
            className="px-1.5 py-0.5 text-[9.5px] bg-stone-100 hover:bg-stone-200 border border-black font-bold"
            title="Add window on Front / South wall"
          >
            + Front
          </button>
        </div>
      </div>

      {windows.length === 0 && (
        <p className="text-[10px] text-stone-500">No windows placed. Add one above.</p>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {windows.map((win, idx) => (
          <div key={win.id} className="border border-black p-2 bg-stone-50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-black">
                  #{idx + 1}
                </span>
                <select
                  value={win.wall}
                  onChange={(e) => updateWindow(win.id, { wall: e.target.value as any })}
                  className="text-[9.5px] font-bold border border-black px-1 py-0.5 bg-white text-black"
                >
                  <option value="back">Back Wall (North)</option>
                  <option value="front">Front Wall (South)</option>
                  <option value="left">Left Wall (West)</option>
                  <option value="right">Right Wall (East)</option>
                </select>
              </div>
              <button
                onClick={() => removeWindow(win.id)}
                className="text-red-500 hover:text-red-700 p-0.5"
                title="Remove window"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="space-y-1.5 text-[9.5px]">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-stone-500 w-10">Position</span>
                <input
                  type="range"
                  min={-0.9}
                  max={0.9}
                  step={0.05}
                  value={win.xOffset}
                  onChange={(e) => updateWindow(win.id, { xOffset: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-stone-500 w-10">Width</span>
                <input
                  type="range"
                  min={0.4}
                  max={2.4}
                  step={0.1}
                  value={win.width}
                  onChange={(e) => updateWindow(win.id, { width: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black cursor-pointer"
                />
                <span className="text-[9px] font-bold text-stone-700 w-7 text-right">{win.width.toFixed(1)}m</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-stone-500 w-10">Height</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={win.height}
                  onChange={(e) => updateWindow(win.id, { height: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black cursor-pointer"
                />
                <span className="text-[9px] font-bold text-stone-700 w-7 text-right">{win.height.toFixed(1)}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
