'use client';

import { useState, useMemo } from 'react';
import { Search, RotateCcw, Check, Sparkles as SparklesIcon, Wand2 } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_TEMPLATES, COMPREHENSIVE_TEMPLATE_IDS } from './templates';
import type { CreatorTemplateId } from './types';

const CATEGORIES = [
  'All',
  'Audio & Music',
  'Video & Tech',
  'Commercial & Photo',
  'Lifestyle & Crafts',
  'Bedroom & Small',
  'Budget & DIY',
] as const;

const CURATED_FEATURED_IDS = [
  'bedroom-studio',
  'podcast',
  'tech-review',
  'streaming-battlestation',
  'product-photography',
  'culinary-kitchen',
  'music-vocal-booth',
  'diy-bedroom-phone',
  'interview',
  'fashion-lookbook',
];

interface TemplateSelectorProps {
  onSelectTemplate?: (id: CreatorTemplateId) => void;
  compact?: boolean;
}

export default function TemplateSelector({ onSelectTemplate, compact = false }: TemplateSelectorProps) {
  const templateId = usePlannerStore((s) => s.templateId);
  const loadTemplate = usePlannerStore((s) => s.loadTemplate);
  const optimizeStudioErgonomics = usePlannerStore((s) => s.optimizeStudioErgonomics);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [justLoadedId, setJustLoadedId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return COMPREHENSIVE_TEMPLATE_IDS.filter((id) => {
      const tpl = COMPREHENSIVE_TEMPLATES[id];
      if (!tpl) return false;
      const matchesSearch =
        search.trim() === '' ||
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        tpl.description.toLowerCase().includes(search.toLowerCase()) ||
        (tpl.category && tpl.category.toLowerCase().includes(search.toLowerCase()));
      const matchesCat = selectedCat === 'All' || tpl.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCat]);

  const handleSelect = (id: string) => {
    loadTemplate(id as CreatorTemplateId);
    setJustLoadedId(id);
    setTimeout(() => setJustLoadedId(null), 1500);
    if (onSelectTemplate) {
      onSelectTemplate(id as CreatorTemplateId);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header & Quick Optimization */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono font-black uppercase tracking-wider text-black">
            Studio Setups ({COMPREHENSIVE_TEMPLATE_IDS.length})
          </span>
        </div>
        <button
          onClick={optimizeStudioErgonomics}
          className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-zinc-100 text-black border-2 border-black font-mono text-[10px] font-bold shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5"
          title="Auto-align cameras, 3-point lighting, and furniture for maximum studio ergonomics"
        >
          <Wand2 className="w-3 h-3 text-black" />
          <span>Auto-Align Set</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${COMPREHENSIVE_TEMPLATE_IDS.length}+ setup archetypes & gear...`}
          className="w-full pl-8 pr-7 py-1.5 text-[11px] font-mono bg-white border-2 border-black rounded-none focus:outline-none focus:bg-stone-50 placeholder:text-stone-400 font-bold"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-600 hover:text-black font-bold text-xs px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-2.5 py-1 font-mono font-bold whitespace-nowrap transition-all border-2 ${
              selectedCat === cat
                ? 'bg-zinc-900 text-white border-black shadow-[2px_2px_0_#000]'
                : 'bg-white text-stone-700 border-black hover:bg-stone-100 shadow-[2px_2px_0_#000]'
            }`}
          >
            {cat === 'All' ? `All Setups (${COMPREHENSIVE_TEMPLATE_IDS.length})` : cat}
          </button>
        ))}
      </div>

      {/* Curated Pro Starters (shown when not searching) */}
      {!search && selectedCat === 'All' && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
            <span>PRO STARTER SETUPS</span>
            <span className="text-[9px] text-stone-400">Click to load</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CURATED_FEATURED_IDS.map((id) => {
              const tpl = COMPREHENSIVE_TEMPLATES[id];
              if (!tpl) return null;
              const isActive = templateId === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`p-2 text-left border-2 transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-zinc-900 text-white border-black shadow-[3px_3px_0_#000]'
                      : 'bg-white border-black hover:bg-stone-50 text-black shadow-[2px_2px_0_#000]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border ${
                      isActive ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-stone-100 border-black/20 text-stone-800'
                    }`}>
                      {tpl.category.toUpperCase().slice(0, 3)}
                    </span>
                    <span className={`text-[9px] font-mono font-bold border px-1 ${
                      isActive ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-black border-black'
                    }`}>
                      {tpl.defaultRoom.width}×{tpl.defaultRoom.depth}m
                    </span>
                  </div>
                  <div className={`text-[11px] font-bold mt-1 leading-tight truncate ${isActive ? 'text-white' : 'text-black'}`}>
                    {tpl.name}
                  </div>
                  <div className={`text-[9px] font-mono mt-0.5 truncate ${isActive ? 'text-zinc-300' : 'text-stone-600'}`}>
                    {tpl.items.length} gear items · {tpl.category}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of All Setup Templates */}
      <div className="flex flex-col gap-1.5 pt-2">
        <div className="text-[10px] font-mono font-bold text-stone-600">
          <span>ALL PRODUCTION SETUPS ({filteredTemplates.length})</span>
        </div>
        <div className={`grid ${compact ? 'grid-cols-2 max-h-[260px] overflow-y-auto pr-1' : 'grid-cols-2'} gap-2`}>
          {filteredTemplates.map((id) => {
            const tpl = COMPREHENSIVE_TEMPLATES[id];
            if (!tpl) return null;
            const isActive = templateId === id;
            const isJustLoaded = justLoadedId === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`relative p-2.5 text-left border-2 transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-zinc-900 text-white border-black shadow-[3px_3px_0_#000]'
                    : 'bg-white border-black hover:bg-stone-50 text-black shadow-[2px_2px_0_#000]'
                }`}
                title={tpl.description}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 border border-black/20 text-stone-800">
                    {tpl.category.toUpperCase().slice(0, 3)}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-black bg-stone-100 border border-black px-1.5 py-0.5">
                    {tpl.defaultRoom.width}×{tpl.defaultRoom.depth}m
                  </span>
                </div>
                <div className="text-[11px] font-black mt-1.5 leading-tight text-black line-clamp-1">
                  {tpl.name}
                </div>
                <div className="text-[9.5px] text-stone-600 mt-1 line-clamp-2 leading-snug">
                  {tpl.description}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/20 text-[9px] font-mono font-bold">
                  <span className="text-stone-700">{tpl.items.length} items</span>
                  <span className={`px-1 py-0.5 border ${isActive ? 'bg-black text-white border-black' : 'bg-stone-100 text-black border-black'}`}>
                    {isJustLoaded ? '✓ Loaded' : isActive ? 'Active' : 'Load'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6 text-xs font-mono text-stone-500 bg-stone-100 border-2 border-dashed border-stone-300 p-4">
          No setups match &ldquo;{search}&rdquo;. Try searching for &quot;podcast&quot;, &quot;desk&quot;, &quot;lighting&quot;, or &quot;4K&quot;.
        </div>
      )}
    </div>
  );
}

