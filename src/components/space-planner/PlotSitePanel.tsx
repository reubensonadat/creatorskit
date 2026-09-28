'use client';

import { usePlannerStore } from './store';
import { STANDARD_PLOT_PRESETS } from '@/lib/space-planner/construction-calculator';
import type { PlotPresetId, CompoundFinish, RoofType } from './types';
import {
  Compass,
  Home,
  Shield,
  Layers,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export default function PlotSitePanel() {
  const plotConfig = usePlannerStore((s) => s.plotConfig);
  const setPlotPreset = usePlannerStore((s) => s.setPlotPreset);
  const setPlotDimensions = usePlannerStore((s) => s.setPlotDimensions);
  const setCompoundFinish = usePlannerStore((s) => s.setCompoundFinish);
  const togglePerimeterFence = usePlannerStore((s) => s.togglePerimeterFence);

  const roofConfig = usePlannerStore((s) => s.roofConfig);
  const setRoofType = usePlannerStore((s) => s.setRoofType);
  const toggleRoofVisible = usePlannerStore((s) => s.toggleRoofVisible);

  const hasFirstFloor = usePlannerStore((s) => s.hasFirstFloor);
  const setHasFirstFloor = usePlannerStore((s) => s.setHasFirstFloor);
  const activeFloor = usePlannerStore((s) => s.activeFloor);
  const setActiveFloor = usePlannerStore((s) => s.setActiveFloor);

  return (
    <div className="space-y-4 font-mono text-xs text-black">
      
      {/* ─── 1. PLOT OF LAND PRESETS ────────────────────────────── */}
      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black uppercase tracking-wider flex items-center gap-1.5">
            <Compass size={14} className="text-amber-700" />
            <span>Plot Size & Boundary</span>
          </span>
          <span className="text-[10px] text-[#6B6863]">Ghana Standard</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {Object.entries(STANDARD_PLOT_PRESETS).map(([key, preset]) => {
            const isSelected = plotConfig.preset === key;
            return (
              <button
                key={key}
                onClick={() => setPlotPreset(key as PlotPresetId)}
                className={`p-2 border border-black text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected ? 'bg-[#FFDE59] font-bold shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="text-[11px] font-black">{preset.name}</div>
                  <div className="text-[9px] text-[#6B6863]">
                    {preset.widthFt}' × {preset.depthFt}' ({preset.widthM}m × {preset.depthM}m)
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-black" />}
              </button>
            );
          })}
        </div>

        {/* Custom Dimensions */}
        <div className="pt-2 border-t border-black/10">
          <div className="text-[10px] text-[#6B6863] mb-1">Custom Plot Dimensions (Feet):</div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-[9px] text-stone-500">Width (ft):</span>
              <input
                type="number"
                value={plotConfig.widthFt}
                onChange={(e) => setPlotDimensions(Number(e.target.value) || 50, plotConfig.depthFt)}
                className="w-full px-2 py-1 border border-black font-mono text-xs bg-stone-50"
              />
            </div>
            <div className="flex-1">
              <span className="text-[9px] text-stone-500">Depth (ft):</span>
              <input
                type="number"
                value={plotConfig.depthFt}
                onChange={(e) => setPlotDimensions(plotConfig.widthFt, Number(e.target.value) || 50)}
                className="w-full px-2 py-1 border border-black font-mono text-xs bg-stone-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. COMPOUND FINISH & PERIMETER WALL ───────────────── */}
      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-700" />
            <span>Compound & Fence Wall</span>
          </span>
        </div>

        {/* Compound Surface */}
        <div>
          <div className="text-[10px] text-[#6B6863] mb-1">Compound Ground Surface:</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'pavement-blocks', label: '🧱 Paving Stones' },
              { id: 'grass-lawn', label: '🌿 Green Lawn' },
              { id: 'stamped-concrete', label: '🏛️ Concrete Floor' },
              { id: 'mixed', label: '🪴 Mixed Paved/Lawn' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCompoundFinish(item.id as CompoundFinish)}
                className={`p-1.5 border border-black text-[10px] font-bold text-center cursor-pointer transition-colors ${
                  plotConfig.compoundFinish === item.id ? 'bg-black text-white' : 'bg-white hover:bg-stone-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Perimeter Fence Toggle */}
        <div className="pt-2 border-t border-black/10 flex items-center justify-between">
          <div>
            <div className="font-bold text-[11px]">Perimeter Fence Wall</div>
            <div className="text-[9px] text-[#6B6863]">2.2m height + 4.2m entrance gate</div>
          </div>
          <button
            onClick={togglePerimeterFence}
            className={`px-2.5 py-1 border border-black font-bold text-[10px] cursor-pointer ${
              plotConfig.showPerimeterFence ? 'bg-[#FFDE59] text-black' : 'bg-white text-stone-400'
            }`}
          >
            {plotConfig.showPerimeterFence ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* ─── 3. ROOF ARCHITECTURE ──────────────────────────────── */}
      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black uppercase tracking-wider flex items-center gap-1.5">
            <Home size={14} className="text-blue-700" />
            <span>Roofing Architecture</span>
          </span>
          <button
            onClick={toggleRoofVisible}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-800 hover:underline cursor-pointer"
          >
            {roofConfig.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{roofConfig.visible ? 'Roof Visible' : 'Cutaway'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {[
            {
              id: 'hidden-parapet',
              name: 'Hidden Parapet Roof (Secret Roof)',
              desc: 'Parapet walls conceal low-pitch aluzinc roof (Modern luxury signature in Accra)',
              tag: 'TOP TREND',
            },
            {
              id: 'hip',
              name: 'Traditional Hip Roof (4-Pitch)',
              desc: 'Classic 4-sided pitched roof with ridges for heavy tropical rainfall runoff',
              tag: 'CLASSIC',
            },
            {
              id: 'monoslope',
              name: 'Monoslope / Shed Roof',
              desc: 'Single sleek angled pitch for modern minimalist villa designs',
              tag: 'CONTEMPORARY',
            },
            {
              id: 'open-cutaway',
              name: 'Open 3D Cutaway (Roof Off)',
              desc: 'Inspect interior rooms and furniture in full 3D dollhouse perspective',
              tag: 'INTERIOR',
            },
          ].map((r) => {
            const isSelected = roofConfig.type === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRoofType(r.id as RoofType)}
                className={`p-2 border border-black text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  isSelected ? 'bg-[#FFDE59] font-bold shadow-[2px_2px_0_#000]' : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black">{r.name}</span>
                  <span className="text-[8px] px-1 py-0.2 bg-black text-white font-bold">{r.tag}</span>
                </div>
                <div className="text-[9px] text-[#6B6863]">{r.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. MULTI-STORY / STOREY BUILDING TOGGLE ───────────── */}
      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-purple-700" />
            <span>Storey Building (Floors)</span>
          </span>
          <span className="text-[10px] text-[#6B6863]">
            {hasFirstFloor ? '2 Floors (Storey)' : 'Single Storey'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setHasFirstFloor(!hasFirstFloor);
              if (hasFirstFloor) setActiveFloor('ground');
            }}
            className={`flex-1 py-2 px-3 border border-black font-bold text-center cursor-pointer transition-all ${
              hasFirstFloor ? 'bg-purple-900 text-white shadow-[2px_2px_0_#000]' : 'bg-white text-black hover:bg-stone-100'
            }`}
          >
            {hasFirstFloor ? '✓ 2-Storey Active' : '+ Enable First Floor (Upper)'}
          </button>
        </div>

        {hasFirstFloor && (
          <div className="pt-2 border-t border-black/10 flex items-center gap-2">
            <button
              onClick={() => setActiveFloor('ground')}
              className={`flex-1 py-1.5 border border-black text-[10px] font-bold cursor-pointer ${
                activeFloor === 'ground' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100'
              }`}
            >
              Editing Ground Floor
            </button>
            <button
              onClick={() => setActiveFloor('first')}
              className={`flex-1 py-1.5 border border-black text-[10px] font-bold cursor-pointer ${
                activeFloor === 'first' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100'
              }`}
            >
              Editing First Floor
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
