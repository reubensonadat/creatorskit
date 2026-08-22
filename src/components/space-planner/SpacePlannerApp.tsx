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
import type { Currency, ViewMode } from './types';

export default function SpacePlannerApp() {
  const hasHydratedRef = useRef(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'equipment' | 'templates'>('equipment');

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
  const clearAll = usePlannerStore((s) => s.clearAll);
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const toggleCameraPreview = usePlannerStore((s) => s.toggleCameraPreview);

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
    await exportPDF(canvas, {
      projectInfo,
      placedObjects,
      roomWidth,
      roomDepth,
      currency,
      powerTotal,
      budgetTotal,
    });
  }, [projectInfo, placedObjects, roomWidth, roomDepth, currency, powerTotal, budgetTotal]);

  const area = (roomWidth * roomDepth).toFixed(1);
  const tplName = COMPREHENSIVE_TEMPLATES[templateId]?.name || '';

  return (
    <div style={{ background: "#fff", height: "100vh", overflow: "hidden" }}>
      {/* WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "270px 1fr 300px", height: "100%" }}>
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
            <div style={{ display: "flex", borderBottom: "2px solid #000", background: "#f0f0f0" }}>
              <button
                onClick={() => setLeftSidebarTab('equipment')}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: 800,
                  background: leftSidebarTab === 'equipment' ? "#fff" : "#f4f4f5",
                  color: leftSidebarTab === 'equipment' ? "#000" : "#666",
                  border: "none",
                  borderRight: "2px solid #000",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span>📦 Gear</span>
                <span style={{ fontSize: "9px", background: "#FFDD00", color: "#000", border: "1px solid #000", padding: "0 4px", borderRadius: 2, fontWeight: 900 }}>
                  {ALL_EQUIPMENT_IDS.length}
                </span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('templates')}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: 800,
                  background: leftSidebarTab === 'templates' ? "#fff" : "#f4f4f5",
                  color: leftSidebarTab === 'templates' ? "#000" : "#666",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <span>📐 Presets</span>
                <span style={{ fontSize: "9px", background: "#FFDD00", color: "#000", border: "1px solid #000", padding: "0 4px", borderRadius: 2, fontWeight: 900 }}>
                  {COMPREHENSIVE_TEMPLATE_IDS.length}
                </span>
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
                    <span style={{ fontSize: "14px" }}>{COMPREHENSIVE_TEMPLATES[templateId]?.icon || '📐'}</span>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

          {/* HUD overlays */}
          <div className="hud hud-tl" style={{ background: "rgba(255,255,255,0.95)", border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: "#888" }}>Floor Area</div>
                <div className="font-display font-bold text-sm mt-0.5" style={{ color: "#000" }}>
                  {area} m²
                </div>
              </div>
              <div className="h-7 w-px" style={{ background: "#ddd" }} />
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: "#888" }}>Dimensions</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: "#000" }}>
                  {roomWidth} × {roomDepth} m
                </div>
              </div>
              <div className="h-7 w-px" style={{ background: "#ddd" }} />
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: "#888" }}>Items</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: "#000" }}>{placedObjects.length}</div>
              </div>
            </div>
          </div>

          <div className="hud hud-tr" style={{ background: "rgba(255,255,255,0.95)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "center", gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: "flex", border: "2px solid #000" }}>
              <button
                onClick={() => setViewMode('perspective')}
                style={{ 
                  color: viewMode === 'perspective' ? "#fff" : "#000",
                  background: viewMode === 'perspective' ? "#000" : "transparent",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                🧊 3D
              </button>
              <button
                onClick={() => setViewMode('top')}
                style={{ 
                  color: viewMode === 'top' ? "#fff" : "#000",
                  background: viewMode === 'top' ? "#000" : "transparent",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  border: "none",
                  borderLeft: "2px solid #000",
                  cursor: "pointer",
                }}
              >
                📐 Top
              </button>
            </div>

            <div className="h-5 w-px" style={{ background: "#ddd" }} />

            {/* Room dimensions */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                value={roomWidth}
                onChange={(e) => setRoomDimensions(parseFloat(e.target.value) || 5, roomDepth)}
                style={{ width: 44, padding: "2px 4px", fontSize: "10px", fontFamily: "monospace", border: "2px solid #000", background: "#fff", color: "#000", borderRadius: 0, fontWeight: 700, textAlign: "center" }}
                step="0.5"
                min="2"
                max="20"
              />
              <span style={{ fontSize: "10px", color: "#888" }}>×</span>
              <input
                type="number"
                value={roomDepth}
                onChange={(e) => setRoomDimensions(roomWidth, parseFloat(e.target.value) || 4)}
                style={{ width: 44, padding: "2px 4px", fontSize: "10px", fontFamily: "monospace", border: "2px solid #000", background: "#fff", color: "#000", borderRadius: 0, fontWeight: 700, textAlign: "center" }}
                step="0.5"
                min="2"
                max="20"
              />
              <span style={{ fontSize: "9px", color: "#888" }}>m</span>
            </div>

            <div className="h-5 w-px" style={{ background: "#ddd" }} />

            {/* Export */}
            <button onClick={handleExportPNG} style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", border: "2px solid #000", background: "#fff", color: "#000", borderRadius: 0, cursor: "pointer" }}>
              📸 PNG
            </button>
            <button onClick={handleExportPDF} style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", border: "2px solid #000", background: "#000", color: "#fff", borderRadius: 0, cursor: "pointer" }}>
              📄 PDF
            </button>
          </div>

          {/* Bottom toolbar */}
          <PlannerToolbar />

          {/* Director Camera Viewfinder HUD overlay */}
          {showCameraPreview && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 bg-black/35 backdrop-blur-[1px]">
              {/* Top Bar */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/80 text-white px-3 py-1.5 border border-white/20 font-mono text-[11px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="font-bold text-red-500">REC</span>
                  <span className="text-white/80">00:14:28:12</span>
                  <span className="text-white/40">|</span>
                  <span className="text-emerald-400 font-bold">4K 60FPS</span>
                  <span className="text-white/70">ProRes 422HQ</span>
                </div>

                <button
                  onClick={toggleCameraPreview}
                  className="bg-black/90 hover:bg-black text-white px-3 py-1.5 border border-white/30 font-mono text-[11px] font-bold cursor-pointer transition-colors shadow-lg"
                >
                  ✕ Close Viewfinder
                </button>
              </div>

              {/* Center Framing Guides */}
              <div className="relative flex-1 flex items-center justify-center my-2">
                {/* 16:9 Border Guideline */}
                <div className="relative w-full max-w-4xl aspect-video border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col justify-between p-3">
                  {/* Rule of Thirds Grid */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                  </div>

                  {/* Corner Crosshairs */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white" />

                  {/* Center Autofocus Reticle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-emerald-400/80 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  </div>

                  {/* Audio Level Meters */}
                  <div className="absolute left-4 bottom-4 flex gap-1 items-end h-12 bg-black/60 p-1 border border-white/20">
                    <div className="w-1.5 h-8 bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500" />
                    <div className="w-1.5 h-9 bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500" />
                    <span className="text-[8px] font-mono text-white/80 self-center ml-1">L/R CH</span>
                  </div>

                  {/* Lens info in frame */}
                  <div className="absolute right-4 bottom-4 font-mono text-[10px] text-white/90 bg-black/60 px-2 py-1 border border-white/20">
                    DSLR 50mm Prime • f/2.8 • AF-C Target Tracked
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-4 bg-black/85 text-white px-4 py-1.5 border border-white/20 font-mono text-[10px]">
                  <span><b className="text-white/60">SHUTTER:</b> 1/125s</span>
                  <span><b className="text-white/60">APERTURE:</b> f/2.8</span>
                  <span><b className="text-white/60">ISO:</b> 800</span>
                  <span><b className="text-white/60">WB:</b> 5600K</span>
                  <span><b className="text-white/60">BATTERY:</b> 98% 🔋</span>
                </div>
              </div>
            </div>
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

      {/* Toast container (for future use) */}
    </div>
  );
}
