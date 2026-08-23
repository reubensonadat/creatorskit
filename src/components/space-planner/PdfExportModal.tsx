'use client';

import { useState } from 'react';
import { usePlannerStore } from './store';
import { exportPDF } from '@/lib/space-planner/export';
import { X, FileText, CheckSquare, Square, Download, Sparkles } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function PdfExportModal({ isOpen, onClose, canvasContainerRef }: PdfExportModalProps) {
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const setProjectInfo = usePlannerStore((s) => s.setProjectInfo);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const currency = usePlannerStore((s) => s.currency);
  const getPowerTotal = usePlannerStore((s) => s.getPowerTotal);
  const getBudgetTotal = usePlannerStore((s) => s.getBudgetTotal);

  const [title, setTitle] = useState(projectInfo.name || 'Creator Studio Master Plan');
  const [author, setAuthor] = useState('Lead Creator / DP');
  const [location, setLocation] = useState(projectInfo.location || '');
  const [notes, setNotes] = useState(projectInfo.notes || 'Calibrated 3-point lighting setup with 0.9m walking clearance and balanced sound isolation.');
  
  // Section options
  const [includeCover, setIncludeCover] = useState(true);
  const [includeBlueprint, setIncludeBlueprint] = useState(true);
  const [includeMultiRenders, setIncludeMultiRenders] = useState(true);
  const [includeLightingOptics, setIncludeLightingOptics] = useState(true);
  const [includeBillOfMaterials, setIncludeBillOfMaterials] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    try {
      setIsGenerating(true);
      await new Promise((r) => setTimeout(r, 80));

      // Sync project info to store
      setProjectInfo({
        name: title,
        location,
        notes,
      });

      await exportPDF(canvas, {
        projectInfo: {
          name: title,
          author,
          location,
          notes,
          supplierContact: projectInfo.supplierContact,
        },
        placedObjects,
        roomWidth,
        roomDepth,
        currency,
        powerTotal: getPowerTotal(),
        budgetTotal: getBudgetTotal(),
        options: {
          includeCover,
          includeBlueprint,
          includeMultiRenders,
          includeLightingOptics,
          includeBillOfMaterials,
        },
      });

      onClose();
    } catch (err) {
      console.error('Master PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-mono text-black">
      <div className="bg-white border-2 border-black shadow-[6px_6px_0_#000] w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 bg-stone-100 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-black" />
            <span className="font-black text-sm uppercase tracking-wider">
              Export Master Studio PDF
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-200 border border-black transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Metadata inputs */}
          <div className="space-y-3 bg-stone-50 border border-black p-3">
            <span className="font-bold text-[11px] uppercase tracking-wider text-stone-600 block">
              1. Document Information
            </span>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-stone-700">Project / Studio Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="e.g. Master Bedroom Creator Studio"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-stone-700">Lead Creator / Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-medium focus:outline-none"
                  placeholder="e.g. Studio DP"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-stone-700">Location / Room #</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-medium focus:outline-none"
                  placeholder="e.g. Studio A, Floor 2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-stone-700">Engineering Notes / Directives</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 border border-black bg-white text-xs font-medium focus:outline-none resize-none"
                placeholder="Notes for contractor, electrician, or production crew..."
              />
            </div>
          </div>

          {/* Page Inclusions */}
          <div className="space-y-2 bg-stone-50 border border-black p-3">
            <span className="font-bold text-[11px] uppercase tracking-wider text-stone-600 block mb-1">
              2. Included Sections & Render Angles
            </span>

            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 bg-white border border-stone-200 hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="font-bold block text-[11px]">Page 1: Executive Cover & Master KPI Specification</strong>
                  <span className="text-[10px] text-stone-500">Hero 3D perspective render, studio dimensions, total power load, budget breakdown</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 bg-white border border-stone-200 hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={includeBlueprint}
                  onChange={(e) => setIncludeBlueprint(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="font-bold block text-[11px]">Page 2: Architectural CAD 2D/3D Floor Plan Blueprint</strong>
                  <span className="text-[10px] text-stone-500">Top-down orthographic CAD blueprint, wall dimensions, coordinate index pins</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 bg-white border border-stone-200 hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={includeMultiRenders}
                  onChange={(e) => setIncludeMultiRenders(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="font-bold block text-[11px]">Page 3: 4-Perspective 3D Visual Proofs & Director POV</strong>
                  <span className="text-[10px] text-stone-500">Hero Isometric, North/South wall elevations, 45° Key light angle, and Director 16:9 lens viewfinder</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 bg-white border border-stone-200 hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={includeLightingOptics}
                  onChange={(e) => setIncludeLightingOptics(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="font-bold block text-[11px]">Page 4: Lighting CCT Kelvin & Camera Optics Schedule</strong>
                  <span className="text-[10px] text-stone-500">Color temperature, lighting ratios, beam throw angles, camera lens focal lengths</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 bg-white border border-stone-200 hover:border-black transition-colors">
                <input
                  type="checkbox"
                  checked={includeBillOfMaterials}
                  onChange={(e) => setIncludeBillOfMaterials(e.target.checked)}
                  className="accent-black w-4 h-4 cursor-pointer"
                />
                <div>
                  <strong className="font-bold block text-[11px]">Page 5: Itemized Bill of Materials & Quality Diagnostics</strong>
                  <span className="text-[10px] text-stone-500">Complete itemized gear schedule, pricing in {currency}, acoustics & ergonomic pass/fail matrix</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-100 border-t-2 border-black flex items-center justify-between">
          <div className="text-[10px] text-stone-600 font-bold">
            <span>{roomWidth}m × {roomDepth}m ({(roomWidth * roomDepth).toFixed(1)} m²)</span> · <span>{placedObjects.length} Fixtures</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-white hover:bg-stone-200 border border-black font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-black hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 border border-black shadow-[2px_2px_0_#000] transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Rendering PDF...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Generate Master PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
