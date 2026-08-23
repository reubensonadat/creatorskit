'use client';

import { usePlannerStore } from './store';

export default function ProjectInfoPanel() {
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const setProjectInfo = usePlannerStore((s) => s.setProjectInfo);
  const showProjectInfo = usePlannerStore((s) => s.showProjectInfo);
  const toggleProjectInfo = usePlannerStore((s) => s.toggleProjectInfo);

  const fields: { key: keyof typeof projectInfo; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Project Name', placeholder: 'e.g. Podcast Studio Setup' },
    { key: 'location', label: 'Location', placeholder: 'e.g. Studio Room 2' },
    { key: 'supplierContact', label: 'Supplier / Rental Contact', placeholder: 'e.g. Equipment Rental Contact' },
    { key: 'notes', label: 'Field Notes', placeholder: 'Notes about this setup...', multiline: true },
  ];

  return (
    <>
      <div className="p-3 border-b border-black font-mono">
        <button
          className="btn w-full justify-center py-1.5 px-2 text-xs font-bold bg-white text-black border-2 border-black hover:bg-stone-50"
          onClick={toggleProjectInfo}
        >
          Project Details
        </button>
      </div>

      {showProjectInfo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={toggleProjectInfo} />
          <div className="w-80 max-w-full bg-white border-l-2 border-black h-full overflow-y-auto p-4 relative z-10 font-mono">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
              <div className="font-bold text-sm text-black">Project Details</div>
              <button className="px-2 py-0.5 text-xs font-bold border border-black hover:bg-stone-100" onClick={toggleProjectInfo}>✕</button>
            </div>
            <div className="space-y-3 text-xs">
              {fields.map(({ key, label, placeholder, multiline }) => (
                <div key={key}>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">
                    {label}
                  </label>
                  {multiline ? (
                    <textarea
                      value={projectInfo[key]}
                      onChange={(e) => setProjectInfo({ [key]: e.target.value })}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full px-2 py-1.5 text-xs border border-black bg-white resize-none text-black"
                    />
                  ) : (
                    <input
                      type="text"
                      value={projectInfo[key]}
                      onChange={(e) => setProjectInfo({ [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full px-2 py-1.5 text-xs border border-black bg-white text-black"
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
