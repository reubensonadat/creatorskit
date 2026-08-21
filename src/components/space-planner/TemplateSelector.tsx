'use client';

import { usePlannerStore } from './store';
import { CREATOR_TEMPLATES, TEMPLATE_IDS } from './templates';
import type { CreatorTemplateId } from './types';

export default function TemplateSelector() {
  const templateId = usePlannerStore((s) => s.templateId);
  const loadTemplate = usePlannerStore((s) => s.loadTemplate);

  return (
    <div>
      <div className="panel-title">
        <span>Templates</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {TEMPLATE_IDS.map((id) => {
          const tpl = CREATOR_TEMPLATES[id];
          const isActive = templateId === id;
          return (
            <button
              key={id}
              onClick={() => loadTemplate(id)}
              className={`template-card ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{tpl.icon}</span>
              <div className="text-[11px] font-semibold mt-1">{tpl.name}</div>
              <div className="text-[9px] font-mono mt-0.5 text-[var(--charcoal-3)]">
                {tpl.defaultRoom.width}×{tpl.defaultRoom.depth}m
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
