'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_TEMPLATES, COMPREHENSIVE_TEMPLATE_IDS } from './templates';
import { COMPREHENSIVE_EQUIPMENT_CATALOG, ALL_EQUIPMENT_IDS } from './gear-library';
import { savePlan, loadPlan, clearSavedPlan, hasSavedPlan } from '@/lib/space-planner/storage';
import { exportPNG, exportPDF } from '@/lib/space-planner/export';
import PlannerCanvas from './PlannerCanvas';
import TemplateSelector from './TemplateSelector';
import EquipmentLibrary from './EquipmentLibrary';
import InspectorPanel from './InspectorPanel';
import BudgetPanel from './BudgetPanel';
import SpacingWarnings from './SpacingWarnings';
import ProjectInfoPanel from './ProjectInfoPanel';
import PlannerToolbar from './PlannerToolbar';
import WindowsPanel from './WindowsPanel';
import RoomGeometryPanel from './RoomGeometryPanel';
import PdfExportModal from './PdfExportModal';
import type { Currency, ViewMode } from './types';

export default function SpacePlannerApp() {
  const hasHydratedRef = useRef(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'equipment' | 'templates' | 'room-ai'>('equipment');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Store subscriptions
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const setRoomDimensions = usePlannerStore((s) => s.setRoomDimensions);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const currency = usePlannerStore((s) => s.currency);
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const templateId = usePlannerStore((s) => s.templateId);
  const loadTemplate = usePlannerStore((s) => s.loadTemplate);
  const leftPanelOpen = usePlannerStore((s) => s.leftPanelOpen);
  const toggleLeftPanel = usePlannerStore((s) => s.toggleLeftPanel);
  const rightPanelOpen = usePlannerStore((s) => s.rightPanelOpen);
  const toggleRightPanel = usePlannerStore((s) => s.toggleRightPanel);
  const isZenMode = usePlannerStore((s) => s.isZenMode);
  const toggleZenMode = usePlannerStore((s) => s.toggleZenMode);
  const clearAll = usePlannerStore((s) => s.clearAll);
  const timeOfDay = usePlannerStore((s) => s.timeOfDay);
  const setTimeOfDay = usePlannerStore((s) => s.setTimeOfDay);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    GHS: 'GH₵',
    NGN: '₦',
  };
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  // Power and budget
  const powerTotal = placedObjects.reduce((sum, o) => sum + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts ?? 0), 0);
  const budgetTotal = placedObjects.reduce((sum, o) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId];
    if (!def) return sum;
    if (currency === 'USD') return sum + (o.customPriceUSD ?? def.defaultPriceUSD ?? Math.round(def.defaultPriceGHS / 15));
    if (currency === 'EUR') return sum + (o.customPriceEUR ?? def.defaultPriceEUR ?? Math.round(def.defaultPriceGHS / 16));
    if (currency === 'GBP') return sum + (o.customPriceGBP ?? def.defaultPriceGBP ?? Math.round(def.defaultPriceGHS / 19));
    if (currency === 'GHS') return sum + (o.customPriceGHS ?? def.defaultPriceGHS);
    return sum + (o.customPriceNGN ?? def.defaultPriceNGN);
  }, 0);

  // Auto-save on changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      savePlan({
        roomWidth,
        roomDepth,
        roomHeight: usePlannerStore.getState().roomHeight,
        templateId,
        viewMode,
        currency,
        projectInfo,
        placedObjects,
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [roomWidth, roomDepth, templateId, viewMode, currency, projectInfo, placedObjects]);

  // Load saved plan on mount
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const saved = loadPlan();
    if (saved) {
      const store = usePlannerStore.getState();
      setRoomDimensions(saved.roomWidth, saved.roomDepth);
      store.setCurrency(saved.currency);
      store.setProjectInfo(saved.projectInfo);
      store.setViewMode(saved.viewMode);
      store.setTemplateId(saved.templateId);

      // Recover from older duplicated saves by collapsing identical placements.
      const unique = new Map<string, (typeof saved.placedObjects)[number]>();
      saved.placedObjects.forEach((obj) => {
        const key = [
          obj.equipmentId,
          obj.x.toFixed(3),
          obj.z.toFixed(3),
          obj.rotationY.toFixed(3),
          obj.parentId ?? '',
          obj.isMainCamera ? '1' : '0',
          obj.customPriceGHS ?? '',
          obj.customPriceNGN ?? '',
        ].join('|');
        if (!unique.has(key)) unique.set(key, obj);
      });

      store.replacePlacedObjects(Array.from(unique.values()));
    } else {
      // Load default template
      loadTemplate('bedroom-studio');
    }
  }, [loadTemplate, setRoomDimensions]);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    exportPNG(canvas, projectInfo.name || 'space-planner');
  }, [projectInfo.name]);

  const handleExportPDF = useCallback(async () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    try {
      setIsExportingPDF(true);
      await new Promise((r) => setTimeout(r, 60)); // let UI update
      await exportPDF(canvas, {
        projectInfo,
        placedObjects,
        roomWidth,
        roomDepth,
        currency,
        powerTotal,
        budgetTotal,
      });
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsExportingPDF(false);
    }
  }, [projectInfo, placedObjects, roomWidth, roomDepth, currency, powerTotal, budgetTotal]);

  const area = (roomWidth * roomDepth).toFixed(1);
  const tplName = COMPREHENSIVE_TEMPLATES[templateId]?.name || '';

  return (
    <div style={{ background: "#fff", height: "100vh", overflow: "hidden" }}>
      {/* WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: `${leftPanelOpen ? '270px' : '0px'} 1fr ${rightPanelOpen ? '300px' : '0px'}`, height: "100%" }}>
        {/* LEFT PANEL */}
        {leftPanelOpen && (
          <aside className="panel left-panel" style={{ background: "#fff", borderRight: "2px solid #000", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Top Bar with Home link */}
            <div style={{ padding: "8px 10px", borderBottom: "2px solid #000", background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  background: "#000",
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 900,
                  textDecoration: "none",
                  cursor: "pointer",
                  border: "2px solid #000",
                }}
              >
                ‹ HOME
              </Link>
              <span className="text-[10px] font-mono font-bold text-stone-500 truncate max-w-[140px]">
                {tplName || '3D Studio'}
              </span>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex border-b-2 border-black bg-stone-100 font-mono text-[10px]">
              <button
                onClick={() => setLeftSidebarTab('equipment')}
                className={`flex-1 py-2 px-1 font-bold border-r-2 border-black flex items-center justify-center gap-1.5 transition-all ${
                  leftSidebarTab === 'equipment' ? 'bg-white text-black font-black' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>Catalog</span>
                <span className="text-[9px] bg-[#FFDD00] text-black border border-black px-1 rounded-sm font-black">
                  {ALL_EQUIPMENT_IDS.length}
                </span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('templates')}
                className={`flex-1 py-2 px-1 font-bold border-r-2 border-black flex items-center justify-center gap-1.5 transition-all ${
                  leftSidebarTab === 'templates' ? 'bg-white text-black font-black' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>Presets</span>
                <span className="text-[9px] bg-[#FFDD00] text-black border border-black px-1 rounded-sm font-black">
                  {COMPREHENSIVE_TEMPLATE_IDS.length}
                </span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('room-ai')}
                className={`flex-1 py-2 px-1 font-bold flex items-center justify-center gap-1.5 transition-all ${
                  leftSidebarTab === 'room-ai' ? 'bg-white text-black font-black' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>Room Builder</span>
              </button>
            </div>

            {/* TAB CONTENT: Gear Library (Default & Primary) */}
            {leftSidebarTab === 'equipment' && (
              <div className="panel-section" style={{ overflowY: "auto", flex: 1, padding: "10px" }}>
                {/* Quick Preset Banner */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    marginBottom: 12,
                    background: "#ffffff",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0 #000000",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span className="text-[11px] font-black text-black truncate">
                      {COMPREHENSIVE_TEMPLATES[templateId]?.name || 'Studio Layout'}
                    </span>
                  </div>
                  <button
                    onClick={() => setLeftSidebarTab('templates')}
                    style={{
                      background: "#FFDD00",
                      border: "1.5px solid #000",
                      padding: "3px 8px",
                      fontSize: "9.5px",
                      fontFamily: "monospace",
                      fontWeight: 900,
                      color: "#000",
                      cursor: "pointer",
                      boxShadow: "1px 1px 0 #000",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    CHANGE
                  </button>
                </div>

                <div className="panel-title mb-2">
                  <span style={{ color: "#000" }}>Equipment</span>
                  <span className="text-[9px] font-normal" style={{ color: "#888", textTransform: 'none', letterSpacing: 0 }}>
                    click to place in 3D
                  </span>
                </div>
                <EquipmentLibrary />
                <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700">
                  <WindowsPanel />
                </div>
              </div>
            )}

            {/* TAB CONTENT: Studio Presets (Full Browser) */}
            {leftSidebarTab === 'templates' && (
              <div className="panel-section" style={{ overflowY: "auto", flex: 1, padding: "10px" }}>
                <TemplateSelector onSelectTemplate={() => setLeftSidebarTab('equipment')} />
              </div>
            )}

            {/* TAB CONTENT: Room Builder & Multi-Angle Photo Reference */}
            {leftSidebarTab === 'room-ai' && (
              <div className="panel-section" style={{ overflowY: "auto", flex: 1, padding: "10px" }}>
                <RoomGeometryPanel />
              </div>
            )}
          </aside>
        )}

        {/* CENTER: Canvas */}
        <section ref={canvasContainerRef} style={{ 
          position: "relative", 
          background: "#f0f0f0", 
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
            <PlannerCanvas />
          </div>

          {/* HUD overlays (hidden during Camera POV or when Zen Mode is active for full unobstructed 3D view) */}
          {viewMode !== 'camera-pov' && isZenMode && (
            <div className="hud hud-bc z-40">
              <button
                onClick={toggleZenMode}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-950/90 text-white hover:bg-black border-2 border-white/40 shadow-[4px_4px_0_#000] font-mono text-xs font-bold backdrop-blur transition-all hover:scale-105"
                title="Exit Clean View Mode (Press H or click to restore full HUD)"
              >
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                <span>Clean 3D View Active</span>
                <span className="text-[10px] text-zinc-300 bg-white/20 px-1.5 py-0.5 rounded">Press H to restore HUD</span>
              </button>
            </div>
          )}

          {viewMode !== 'camera-pov' && !isZenMode && (
            <>
              {/* Top-Left Metric HUD */}
              <div className="hud hud-tl" style={{ background: "rgba(255,255,255,0.96)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", padding: "6px 12px" }}>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-stone-500 font-bold">Floor Area</div>
                    <div className="font-mono font-black text-sm text-black">
                      {area} m²
                    </div>
                  </div>
                  <div className="h-6 w-px bg-stone-300" />
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-stone-500 font-bold">Dimensions</div>
                    <div className="font-mono text-xs text-black font-bold">
                      {roomWidth} × {roomDepth} m
                    </div>
                  </div>
                  <div className="h-6 w-px bg-stone-300" />
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-stone-500 font-bold">Items</div>
                    <div className="font-mono text-xs text-black font-bold">{placedObjects.length}</div>
                  </div>
                </div>
              </div>

              {/* Top-Right Control & Export HUD */}
              <div className="hud hud-tr" style={{ background: "rgba(255,255,255,0.96)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", display: "flex", alignItems: "center", gap: 7, padding: "5px 8px" }}>
                {/* Natural Light Time of Day */}
                <div className="flex items-center border border-black font-mono text-[9.5px]">
                  <button
                    onClick={() => setTimeOfDay('daylight')}
                    className={`px-1.5 py-0.5 font-bold ${timeOfDay === 'daylight' ? 'bg-[#FFDD00] text-black font-black' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                    title="Bright 5600K Clean Daylight"
                  >
                    ☀️ Day
                  </button>
                  <button
                    onClick={() => setTimeOfDay('golden-hour')}
                    className={`px-1.5 py-0.5 font-bold border-l border-black ${timeOfDay === 'golden-hour' ? 'bg-[#F97316] text-white font-black' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                    title="Warm 3200K Golden Hour Sun"
                  >
                    🌅 Golden
                  </button>
                  <button
                    onClick={() => setTimeOfDay('overcast')}
                    className={`px-1.5 py-0.5 font-bold border-l border-black ${timeOfDay === 'overcast' ? 'bg-[#94A3B8] text-white font-black' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                    title="Soft 6500K Diffused Sky"
                  >
                    ☁️ Overcast
                  </button>
                  <button
                    onClick={() => setTimeOfDay('night')}
                    className={`px-1.5 py-0.5 font-bold border-l border-black ${timeOfDay === 'night' ? 'bg-[#0F172A] text-sky-400 font-black' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                    title="Moody Night Studio"
                  >
                    🌙 Night
                  </button>
                </div>

                <div className="h-4 w-px bg-stone-300" />

                {/* View toggle */}
                <div className="flex items-center border border-black font-mono text-[9.5px]">
                  <button
                    onClick={() => setViewMode('perspective')}
                    className={`px-2 py-0.5 font-bold transition-all ${
                      viewMode === 'perspective' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    🧊 3D
                  </button>
                  <button
                    onClick={() => setViewMode('top')}
                    className={`px-2 py-0.5 font-bold border-l border-black transition-all ${
                      viewMode === 'top' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    📐 Top
                  </button>
                </div>

                <div className="h-4 w-px bg-stone-300" />

                {/* Room dimensions */}
                <div className="flex items-center gap-1 font-mono text-[9.5px]">
                  <input
                    type="number"
                    value={roomWidth}
                    onChange={(e) => setRoomDimensions(parseFloat(e.target.value) || 5, roomDepth)}
                    className="w-9 px-1 py-0.5 text-center font-bold border border-black bg-white text-black"
                    step="0.5"
                    min="2"
                    max="20"
                  />
                  <span className="text-stone-500 font-bold">×</span>
                  <input
                    type="number"
                    value={roomDepth}
                    onChange={(e) => setRoomDimensions(roomWidth, parseFloat(e.target.value) || 4)}
                    className="w-9 px-1 py-0.5 text-center font-bold border border-black bg-white text-black"
                    step="0.5"
                    min="2"
                    max="20"
                  />
                  <span className="text-stone-500 font-bold">m</span>
                </div>

                <div className="h-4 w-px bg-stone-300" />

                {/* Export & Zen Mode */}
                <div className="flex items-center gap-1 font-mono text-[9.5px]">
                  <button
                    onClick={handleExportPNG}
                    className="btn px-2 py-0.5 font-bold bg-white text-black border border-black hover:bg-stone-100"
                    title="Export High-Resolution Canvas PNG"
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="btn px-2.5 py-0.5 font-bold bg-black text-white hover:bg-stone-800 border border-black shadow-[1px_1px_0_#000]"
                    title="Configure and Export Master Studio Architectural PDF Dossier"
                  >
                    PDF
                  </button>
                  <button
                    onClick={toggleZenMode}
                    className="btn px-1.5 py-0.5 font-bold bg-[#FFE500] text-black border border-black hover:bg-amber-300"
                    title="Clean 3D View (H) — Hide all HUD overlays"
                  >
                    / Zen
                  </button>
                </div>
              </div>

              {/* Bottom toolbar */}
              <PlannerToolbar />
            </>
          )}
        </section>

        {/* RIGHT PANEL */}
        {rightPanelOpen && (
          <aside className="panel panel-right" style={{ background: "#fff", borderLeft: "2px solid #000", width: 300, minWidth: 260, maxWidth: 340, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <InspectorPanel />
            <BudgetPanel />
            <SpacingWarnings />
            <ProjectInfoPanel />

            {/* Placed items list */}
            <div className="panel-section" style={{ overflowY: "auto", flex: 1 }}>
              <div className="panel-title">
                <span style={{ color: "#000" }}>Placed Equipment</span>
                <span className="font-mono text-[9px] font-semibold" style={{ color: "#888" }}>
                  {placedObjects.length}
                </span>
              </div>
              {placedObjects.length === 0 ? (
                <div className="text-[11px] text-center py-4 leading-relaxed" style={{ color: "#888" }}>
                  No equipment yet.<br />Select from the library<br />to start placing.
                </div>
              ) : (
                <div className="space-y-1">
                  {placedObjects.map((obj) => {
                    const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
                    if (!eq) return null;
                    return (
                      <div
                        key={obj.id}
                        className="flex items-center gap-2 p-1.5 cursor-pointer transition-colors"
                        style={{ border: "2px solid #eee", background: "#f9f9f9" }}
                        onClick={() => usePlannerStore.getState().setSelectedObject(obj.id)}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#000"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#eee"}
                      >
                        <span className="text-sm">{eq.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold truncate" style={{ color: "#000" }}>{eq.name}</div>
                          <div className="text-[9px] font-mono" style={{ color: "#888" }}>
                            {obj.isMainCamera ? '★ ' : ''}
                            {obj.x.toFixed(1)}, {obj.z.toFixed(1)}m
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* PDF Export Progress Modal */}
      {isExportingPDF && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "3px solid #000000",
              boxShadow: "6px 6px 0 #000000",
              padding: "24px 32px",
              maxWidth: "420px",
              width: "90%",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "4px solid #000",
                  borderTopColor: "#38BDF8",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: "#000", margin: "0 0 6px" }}>
              GENERATING MASTER 3D REPORT
            </h3>
            <p style={{ fontSize: 11, fontFamily: "monospace", color: "#64748B", margin: "0 0 12px", lineHeight: 1.5 }}>
              Rendering high-resolution multi-angle studio passes, compiling 2D CAD blueprint, optics schedule &amp; electrical safety audit...
            </p>
            <div style={{ display: "inline-block", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 10px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
              📄 5-Page Architectural Specification Dossier
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        canvasContainerRef={canvasContainerRef}
      />
    </div>
  );
}
