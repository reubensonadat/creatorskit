'use client';

import { usePlannerStore } from './store';

export default function ProjectInfoPanel() {
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const setProjectInfo = usePlannerStore((s) => s.setProjectInfo);
  const showProjectInfo = usePlannerStore((s) => s.showProjectInfo);
  const toggleProjectInfo = usePlannerStore((s) => s.toggleProjectInfo);

  const fields: { key: keyof typeof projectInfo; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Project Name', placeholder: 'e.g. Podcast Ep 12 Setup' },
    { key: 'location', label: 'Location', placeholder: 'e.g. East Legon, Accra' },
    { key: 'supplierContact', label: 'Supplier / Rental Contact', placeholder: 'e.g. Kofi Equipment Rentals +233...'
 },
    { key: 'notes', label: 'Field Notes', placeholder: 'Any notes about this setup...', multiline: true },
  ];

  return (
    <>
      <div className="panel-section">
        <button
          className="btn w-full justify-center"
          onClick={toggleProjectInfo}
        >
          📋 Project Info
        </button>
      </div>

      {showProjectInfo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={toggleProjectInfo} />
          <div className="w-80 bg-white border-l border-[var(--line)] h-full overflow-y-auto p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-[15px]">Project Info</div>
              <button className="btn btn-icon" onClick={toggleProjectInfo}>✕</button>
            </div>
            <div className="space-y-3">
              {fields.map(({ key, label, placeholder, multiline }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--charcoal-3)] block mb-1">
                    {label}
                  </label>
                  {multiline ? (
                    <textarea
                      value={projectInfo[key]}
                      onChange={(e) => setProjectInfo({ [key]: e.target.value })}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full px-3 py-2 text-[12px] border border-[var(--line)] rounded-lg bg-white resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={projectInfo[key]}
                      onChange={(e) => setProjectInfo({ [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 text-[12px] border border-[var(--line)] rounded-lg bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
