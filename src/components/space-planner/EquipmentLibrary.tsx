'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG, ALL_EQUIPMENT_IDS } from './gear-library';
import type { EquipmentCategory } from './types';

const CATEGORY_ORDER = [
  'all',
  'bedroom',
  'living',
  'dining',
  'kitchen',
  'bathroom',
  'doors-windows',
  'outdoor',
  'furniture',
] as const;

const CATEGORY_META: Record<string, { label: string; tag: string; desc: string }> = {
  all: { label: 'All Elements', tag: 'ALL', desc: 'Complete architectural elements & fixtures' },
  bedroom: { label: 'Bedrooms', tag: 'BED', desc: 'King/Queen beds, wardrobes, nightstands' },
  living: { label: 'Living & Lounge', tag: 'LVG', desc: 'Sectional sofas, couches, TV consoles, armchairs' },
  dining: { label: 'Dining Sets', tag: 'DIN', desc: '6-seater & 8-seater dining tables & chairs' },
  kitchen: { label: 'Kitchen & Island', tag: 'KIT', desc: 'Countertops, cooking islands, refrigerators, sinks' },
  bathroom: { label: 'Bathroom & Sanitary', tag: 'SAN', desc: 'Water closet toilets, showers, vanities, baths' },
  'doors-windows': { label: 'Doors & Windows', tag: 'OPN', desc: 'Pivot entrance doors, sliders, aluminium windows' },
  outdoor: { label: 'Compound & Vehicles', tag: 'OUT', desc: 'SUVs, sedans, perimeter gates, royal palms' },
  furniture: { label: 'Other Furniture', tag: 'FUR', desc: 'Additional interior furniture' },
};

export default function EquipmentLibrary() {
  const placingEquipmentId = usePlannerStore((s) => s.placingEquipmentId);
  const setPlacingEquipment = usePlannerStore((s) => s.setPlacingEquipment);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // State to track collapsed categories in accordion
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const filteredItems = useMemo(() => {
    return ALL_EQUIPMENT_IDS.filter((id) => {
      const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[id] as any;
      if (!eq) return false;
      const matchesSearch =
        search.trim() === '' ||
        eq.name.toLowerCase().includes(search.toLowerCase()) ||
        eq.description.toLowerCase().includes(search.toLowerCase());
      const itemCat = eq.architecturalCategory || eq.category;
      const matchesCat = selectedCat === 'all' || itemCat === selectedCat || eq.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCat]);

  const activeCategories = useMemo(() => {
    if (selectedCat !== 'all') {
      return [selectedCat];
    }
    const cats = new Set(
      filteredItems.map((id) => {
        const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[id] as any;
        return eq?.architecturalCategory || eq?.category;
      }).filter(Boolean)
    );
    return ['bedroom', 'living', 'dining', 'kitchen', 'bathroom', 'doors-windows', 'outdoor', 'furniture'].filter((c) => cats.has(c));
  }, [selectedCat, filteredItems]);

  return (
    <div className="flex flex-col gap-2.5 font-mono text-xs text-black">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${ALL_EQUIPMENT_IDS.length}+ items (e.g. Sony, Aputure, SM7B)...`}
          className="w-full pl-8 pr-7 py-1.5 text-[11px] bg-stone-50 border-2 border-black focus:outline-none focus:bg-white placeholder:text-stone-400 font-mono shadow-[2px_2px_0_#00000015]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black font-bold text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[9.5px]">
        {CATEGORY_ORDER.map((cat) => {
          const isSelected = selectedCat === cat;
          const meta = CATEGORY_META[cat] || { label: cat, tag: cat.toUpperCase().slice(0, 3) };
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-2 py-1 whitespace-nowrap transition-all border font-bold flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-zinc-900 text-white border-black shadow-[1.5px_1.5px_0_#000]'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-black hover:bg-stone-100'
              }`}
            >
              <span className={`text-[8px] font-mono px-1 py-0.2 border ${isSelected ? 'bg-zinc-800 text-white border-zinc-700 font-bold' : 'bg-stone-100 text-stone-600 border-stone-300'}`}>
                {meta.tag}
              </span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion Categories */}
      <div className="space-y-2">
        {activeCategories.map((cat) => {
          const items = filteredItems.filter((id) => COMPREHENSIVE_EQUIPMENT_CATALOG[id]?.category === cat);
          if (items.length === 0) return null;
          const isCollapsed = Boolean(collapsedCategories[cat]);
          const meta = CATEGORY_META[cat] || { label: cat, tag: cat.toUpperCase().slice(0, 3), desc: '' };

          return (
            <div key={cat} className="border-2 border-black bg-white shadow-[2px_2px_0_#00000010] overflow-hidden">
              {/* Category Header (Clickable to Collapse/Expand) */}
              <button
                onClick={() => toggleCategoryCollapse(cat)}
                className="w-full flex items-center justify-between p-2 bg-stone-100 hover:bg-stone-200/80 transition-colors border-b border-black/20 text-left"
              >
                <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-black">
                  <span className="text-[8.5px] font-mono px-1 py-0.2 bg-black text-white font-bold">{meta.tag}</span>
                  <span>{meta.label}</span>
                  <span className="text-[9px] font-normal text-stone-500 font-mono">({items.length})</span>
                </div>
                <div className="flex items-center text-stone-600">
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Items List Inside Category */}
              {!isCollapsed && (
                <div className="p-1.5 space-y-1 bg-stone-50/50">
                  {items.map((id) => {
                    const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[id];
                    if (!eq) return null;
                    const isActive = placingEquipmentId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setPlacingEquipment(isActive ? null : id)}
                        className={`w-full text-left p-2 transition-all border flex items-center gap-2.5 ${
                          isActive
                            ? 'bg-zinc-900 border-2 border-black shadow-[2px_2px_0_#000] text-white font-bold'
                            : 'bg-white border-stone-200 hover:border-black hover:shadow-[1px_1px_0_#000] text-black'
                        }`}
                        title={eq.description}
                      >
                        <div className={`text-[9px] font-mono font-bold px-1.5 py-1 border flex-shrink-0 ${
                          isActive ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-stone-100 border-black/30 text-stone-800'
                        }`}>
                          {eq.category.toUpperCase().slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold truncate leading-tight">{eq.name}</div>
                          <div className={`text-[9px] font-mono mt-0.5 truncate flex items-center gap-1.5 ${
                            isActive ? 'text-zinc-300' : 'text-stone-500'
                          }`}>
                            <span>{eq.watts > 0 ? `${eq.watts}W draw` : '0W passive'}</span>
                            <span>•</span>
                            <span>{eq.dimensions.width}×{eq.dimensions.depth}m</span>
                            {eq.isMountableOnTable && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 font-bold">Tabletop</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-black font-mono text-stone-600">
                          {isActive ? 'PLACING' : '+ ADD'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 px-4 bg-stone-100 border-2 border-dashed border-stone-300 font-mono text-xs text-stone-500">
            No equipment found matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
