'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG, ALL_EQUIPMENT_IDS } from './gear-library';
import type { EquipmentCategory } from './types';

const CATEGORY_ORDER = ['all', 'camera', 'lighting', 'audio', 'furniture', 'power', 'props'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  camera: 'Camera',
  lighting: 'Lighting',
  audio: 'Audio',
  furniture: 'Furniture',
  power: 'Power',
  props: 'Props',
};

export default function EquipmentLibrary() {
  const placingEquipmentId = usePlannerStore((s) => s.placingEquipmentId);
  const setPlacingEquipment = usePlannerStore((s) => s.setPlacingEquipment);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return ALL_EQUIPMENT_IDS.filter((id) => {
      const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[id];
      if (!eq) return false;
      const matchesSearch =
        search.trim() === '' ||
        eq.name.toLowerCase().includes(search.toLowerCase()) ||
        eq.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCat === 'all' || eq.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCat]);

  const activeCategories = useMemo(() => {
    if (selectedCat !== 'all') {
      return [selectedCat];
    }
    const cats = new Set(filteredItems.map((id) => COMPREHENSIVE_EQUIPMENT_CATALOG[id]?.category).filter(Boolean));
    return ['camera', 'lighting', 'audio', 'furniture', 'power', 'props'].filter((c) => cats.has(c as EquipmentCategory));
  }, [selectedCat, filteredItems]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${ALL_EQUIPMENT_IDS.length}+ studio gear items...`}
          className="w-full pl-8 pr-7 py-1.5 text-[11px] bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors border ${
              selectedCat === cat
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 font-medium'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200/70'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grouped Equipment Cards */}
      <div className="space-y-3">
        {activeCategories.map((cat) => {
          const items = filteredItems.filter((id) => COMPREHENSIVE_EQUIPMENT_CATALOG[id]?.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                {CATEGORY_LABELS[cat]} ({items.length})
              </div>
              <div className="space-y-1">
                {items.map((id) => {
                  const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[id];
                  if (!eq) return null;
                  const isActive = placingEquipmentId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setPlacingEquipment(isActive ? null : id)}
                      className={`item-card w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-all border ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-sm ring-1 ring-amber-500/40 text-stone-900 dark:text-stone-100'
                          : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                      title={eq.description}
                    >
                      <div className="item-icon text-base flex-shrink-0">{eq.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold truncate leading-snug">{eq.name}</div>
                        <div className="text-[9.5px] font-mono text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                          {eq.watts > 0 ? `${eq.watts}W` : 'Passive'} · {eq.dimensions.width}×{eq.dimensions.depth}m
                          {eq.isMountableOnTable ? ' · Tabletop' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-6 text-xs text-stone-400">
            No equipment found matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
