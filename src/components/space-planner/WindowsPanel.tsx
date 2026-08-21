'use client';

import { usePlannerStore } from './store';
import { Plus, Trash2, MoveHorizontal, MoveVertical } from 'lucide-react';

export default function WindowsPanel() {
  const windows = usePlannerStore((s) => s.windows);
  const addWindow = usePlannerStore((s) => s.addWindow);
  const removeWindow = usePlannerStore((s) => s.removeWindow);
  const updateWindow = usePlannerStore((s) => s.updateWindow);

  return (
    <div className="border-t border-black/10 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-black/50">Windows</span>
        <div className="flex gap-1">
          <button
            onClick={() => addWindow('back')}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/5 hover:bg-black/10 border border-black/10 transition-colors"
          >
            <Plus size={10} /> Back
          </button>
          <button
            onClick={() => addWindow('left')}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/5 hover:bg-black/10 border border-black/10 transition-colors"
          >
            <Plus size={10} /> Left
          </button>
        </div>
      </div>

      {windows.length === 0 && (
        <p className="text-[10px] text-black/30 font-mono">No windows. Add one above.</p>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {windows.map((win, idx) => (
          <div key={win.id} className="border border-black/10 p-2 bg-white/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-black/50">
                {win.wall === 'back' ? 'Back Wall' : 'Left Wall'} #{idx + 1}
              </span>
              <button
                onClick={() => removeWindow(win.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MoveHorizontal size={10} className="text-black/30" />
                <input
                  type="range"
                  min={-0.9}
                  max={0.9}
                  step={0.05}
                  value={win.xOffset}
                  onChange={(e) => updateWindow(win.id, { xOffset: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-black/30 w-6">W</span>
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={win.width}
                  onChange={(e) => updateWindow(win.id, { width: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black"
                />
                <span className="text-[9px] font-mono text-black/40 w-6 text-right">{win.width.toFixed(1)}</span>
              </div>

              <div className="flex items-center gap-2">
                <MoveVertical size={10} className="text-black/30" />
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={win.height}
                  onChange={(e) => updateWindow(win.id, { height: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-black"
                />
                <span className="text-[9px] font-mono text-black/40 w-6 text-right">{win.height.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
