'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_TEMPLATES, COMPREHENSIVE_TEMPLATE_IDS } from './templates';
import type { CreatorTemplateId } from './types';

const CATEGORIES = ['All', 'Audio & Music', 'Video & Tech', 'Commercial & Photo', 'Lifestyle & Crafts', 'Bedroom & Small'] as const;

interface TemplateSelectorProps {
  onSelectTemplate?: (id: CreatorTemplateId) => void;
  compact?: boolean;
}

export default function TemplateSelector({ onSelectTemplate, compact = false }: TemplateSelectorProps) {
  const templateId = usePlannerStore((s) => s.templateId);
  const loadTemplate = usePlannerStore((s) => s.loadTemplate);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');

  const filteredTemplates = useMemo(() => {
    return COMPREHENSIVE_TEMPLATE_IDS.filter((id) => {
      const tpl = COMPREHENSIVE_TEMPLATES[id];
      if (!tpl) return false;
      const matchesSearch =
        search.trim() === '' ||
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        tpl.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCat === 'All' || tpl.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCat]);

  const handleSelect = (id: string) => {
    loadTemplate(id as CreatorTemplateId);
    if (onSelectTemplate) {
      onSelectTemplate(id as CreatorTemplateId);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Studio Presets ({COMPREHENSIVE_TEMPLATE_IDS.length})
        </span>
        {templateId && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono truncate max-w-[150px]">
            Active: {COMPREHENSIVE_TEMPLATES[templateId]?.name || templateId}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${COMPREHENSIVE_TEMPLATE_IDS.length}+ studio setups...`}
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

      {/* Filter Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors border ${
              selectedCat === cat
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 font-medium'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200/70'
            }`}
          >
            {cat === 'All' ? `All (${COMPREHENSIVE_TEMPLATE_IDS.length})` : cat}
          </button>
        ))}
      </div>

      {/* Grid of Templates */}
      <div className={`grid ${compact ? 'grid-cols-2 max-h-[220px] overflow-y-auto pr-1' : 'grid-cols-2'} gap-1.5`}>
        {filteredTemplates.map((id) => {
          const tpl = COMPREHENSIVE_TEMPLATES[id];
          if (!tpl) return null;
          const isActive = templateId === id;
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className={`template-card relative p-2 text-left rounded-lg transition-all border ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
              title={tpl.description}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{tpl.icon}</span>
                <span className="text-[9px] font-mono text-stone-400 bg-stone-200/60 dark:bg-stone-700/60 px-1 py-0.2 rounded">
                  {tpl.defaultRoom.width}×{tpl.defaultRoom.depth}m
                </span>
              </div>
              <div className="text-[11px] font-semibold mt-1 leading-tight text-stone-900 dark:text-stone-100 truncate">
                {tpl.name}
              </div>
              <div className="text-[9.5px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                {tpl.items.length} items · {tpl.category || 'Studio'}
              </div>
            </button>
          );
        })}
      </div>
      {filteredTemplates.length === 0 && (
        <div className="text-center py-4 text-xs text-stone-400">
          No templates match &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}
