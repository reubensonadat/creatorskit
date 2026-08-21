'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { usePlannerStore } from './store';
import { CREATOR_TEMPLATES } from './templates';
import { EQUIPMENT_CATALOG } from './equipment';
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

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Power and budget (computed from placedObjects to avoid infinite loop)
  const powerTotal = placedObjects.reduce((sum, o) => sum + EQUIPMENT_CATALOG[o.equipmentId].watts, 0);
  const budgetTotal = placedObjects.reduce((sum, o) => {
    const def = EQUIPMENT_CATALOG[o.equipmentId];
    if (currency === 'GHS') return sum + (o.customPriceGHS ?? def.defaultPriceGHS);
    return sum + (o.customPriceNGN ?? def.defaultPriceNGN);
  }, 0);
  const CURRENCY_SYMBOLS: Record<Currency, string> = { GHS: 'GH\u20b5', NGN: '\u20a6' };
  const sym = CURRENCY_SYMBOLS[currency];

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
      loadTemplate('podcast');
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
  const tplName = CREATOR_TEMPLATES[templateId]?.name || '';

  return (
    <div style={{ background: "#fff", height: "100vh", overflow: "hidden" }}>
      {/* WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 300px", height: "100%" }}>
        {/* LEFT PANEL */}
        {leftPanelOpen && (
          <aside className="panel left-panel" style={{ background: "#fff", borderRight: "2px solid #000", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", borderBottom: "2px solid #000", background: "#f9f9f9" }}>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  background: "#000",
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  textDecoration: "none",
                  cursor: "pointer",
                  border: "2px solid #000",
                }}
              >
                <ChevronLeft size={12} />
                Dashboard
              </Link>
            </div>
            <div className="panel-section" style={{ overflow: "hidden" }}>
              <TemplateSelector />
            </div>
            <div className="panel-section" style={{ overflowY: "auto", flex: 1 }}>
              <div className="panel-title">
                <span style={{ color: "#000" }}>Equipment</span>
                <span className="text-[9px] font-normal" style={{ color: "#888", textTransform: 'none', letterSpacing: 0 }}>
                  click → place
                </span>
              </div>
              <EquipmentLibrary />
              <WindowsPanel />
            </div>
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
                    const eq = EQUIPMENT_CATALOG[obj.equipmentId];
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
