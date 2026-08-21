'use client';

import { usePlannerStore } from './store';
import { EQUIPMENT_CATALOG, EQUIPMENT_IDS } from './equipment';
import type { EquipmentId } from './types';

const CATEGORY_ORDER = ['camera', 'lighting', 'audio', 'furniture', 'power', 'props'] as const;

const CATEGORY_LABELS: Record<string, string> = {
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

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: EQUIPMENT_IDS.filter((id) => EQUIPMENT_CATALOG[id].category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(({ category, label, items }) => (
        <div key={category}>
          <div className="panel-title">
            <span>{label}</span>
          </div>
          <div className="space-y-1">
            {items.map((id) => {
              const eq = EQUIPMENT_CATALOG[id];
              const isActive = placingEquipmentId === id;
              return (
                <button
                  key={id}
                  onClick={() => setPlacingEquipment(isActive ? null : id)}
                  className={`item-card w-full text-left ${isActive ? 'active' : ''}`}
                >
                  <div className="item-icon text-base">{eq.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold truncate">{eq.name}</div>
                    <div className="text-[10px] font-mono text-[var(--charcoal-3)]">
                      {eq.watts > 0 ? `${eq.watts}W` : '—'} · {eq.dimensions.width}×{eq.dimensions.depth}m
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
