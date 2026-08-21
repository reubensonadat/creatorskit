'use client';

import { useEffect, useRef, useCallback } from 'react';
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
import type { Currency, ViewMode } from './types';

export default function SpacePlannerApp() {
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
    const saved = loadPlan();
    if (saved) {
      const store = usePlannerStore.getState();
      setRoomDimensions(saved.roomWidth, saved.roomDepth);
      store.setCurrency(saved.currency);
      store.setProjectInfo(saved.projectInfo);
      store.setViewMode(saved.viewMode);
      // Restore placed objects directly
      saved.placedObjects.forEach((obj) => {
        store.placeObject(obj.equipmentId, obj.x, obj.z, obj.rotationY, obj.isMainCamera);
      });
    } else {
      // Load default template
      loadTemplate('podcast');
    }
  }, []);

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
    <div className="app">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="flex items-center gap-4">
          {/* Mobile panel toggle */}
          <button
            className="btn btn-icon md:hidden"
            onClick={toggleLeftPanel}
          >
            ☰
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden bg-[var(--charcoal)]">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(199,93,63,0.5), transparent 60%)' }} />
              <span className="relative text-sm">🎬</span>
            </div>
            <div>
              <div className="font-display font-bold text-[14px] leading-none">Creator Space Planner</div>
              <div className="text-[8px] tracking-[0.16em] uppercase mt-0.5 text-[var(--charcoal-3)]">
                {tplName} Template
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-[var(--line)] hidden sm:block" />
          <span className="text-[11px] text-[var(--charcoal-3)] hidden sm:block">
            {projectInfo.name || 'Untitled Project'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="view-toggle">
            <button
              className={viewMode === 'perspective' ? 'active' : ''}
              onClick={() => setViewMode('perspective')}
            >
              🧊 3D
            </button>
            <button
              className={viewMode === 'top' ? 'active' : ''}
              onClick={() => setViewMode('top')}
            >
              📐 Top
            </button>
          </div>

          <div className="h-6 w-px bg-[var(--line)] hidden sm:block" />

          {/* Room dimensions */}
          <div className="hidden md:flex items-center gap-1.5">
            <input
              type="number"
              value={roomWidth}
              onChange={(e) => setRoomDimensions(parseFloat(e.target.value) || 5, roomDepth)}
              className="w-14 px-1.5 py-1 text-[11px] font-mono border border-[var(--line)] rounded bg-white text-center"
              step="0.5"
              min="2"
              max="20"
            />
            <span className="text-[11px] text-[var(--charcoal-3)]">×</span>
            <input
              type="number"
              value={roomDepth}
              onChange={(e) => setRoomDimensions(roomWidth, parseFloat(e.target.value) || 4)}
              className="w-14 px-1.5 py-1 text-[11px] font-mono border border-[var(--line)] rounded bg-white text-center"
              step="0.5"
              min="2"
              max="20"
            />
            <span className="text-[10px] text-[var(--charcoal-3)]">m</span>
          </div>

          <div className="h-6 w-px bg-[var(--line)] hidden sm:block" />

          {/* Export buttons */}
          <button className="btn hidden sm:inline-flex" onClick={handleExportPNG}>
            📸 PNG
          </button>
          <button className="btn btn-primary hidden sm:inline-flex" onClick={handleExportPDF}>
            📄 PDF
          </button>

          {/* Mobile right panel toggle */}
          <button
            className="btn btn-icon md:hidden"
            onClick={toggleRightPanel}
          >
            ℹ
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="workspace">
        {/* LEFT PANEL */}
        {leftPanelOpen && (
          <aside className="panel left-panel">
            <div className="panel-section">
              <TemplateSelector />
            </div>
            <div className="panel-section scroll">
              <div className="panel-title">
                <span>Equipment</span>
                <span className="text-[9px] font-normal text-[var(--charcoal-3)]" style={{ textTransform: 'none', letterSpacing: 0 }}>
                  click → place
                </span>
              </div>
              <EquipmentLibrary />
            </div>
            {/* Mobile export buttons */}
            <div className="panel-section md:hidden">
              <div className="flex gap-2">
                <button className="btn flex-1 justify-center" onClick={handleExportPNG}>
                  📸 PNG
                </button>
                <button className="btn btn-primary flex-1 justify-center" onClick={handleExportPDF}>
                  📄 PDF
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* CENTER: Canvas */}
        <section className="canvas-container" ref={canvasContainerRef}>
          <PlannerCanvas />

          {/* HUD overlays */}
          <div className="hud hud-tl">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--charcoal-3)]">Floor Area</div>
                <div className="font-display font-bold text-sm mt-0.5">
                  {area} m²
                </div>
              </div>
              <div className="h-7 w-px bg-[var(--line)]" />
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--charcoal-3)]">Dimensions</div>
                <div className="font-mono text-xs mt-0.5">
                  {roomWidth} × {roomDepth} m
                </div>
              </div>
              <div className="h-7 w-px bg-[var(--line)]" />
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--charcoal-3)]">Items</div>
                <div className="font-mono text-xs mt-0.5">{placedObjects.length}</div>
              </div>
            </div>
          </div>

          <div className="hud hud-tr">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
              <span className="text-[var(--charcoal-3)]">Auto-saved</span>
            </div>
          </div>

          {/* Bottom toolbar (inside canvas HUD) */}
          <PlannerToolbar />

          {/* Mobile dimension inputs (shown on canvas) */}
          <div className="hud hud-tl md:hidden" style={{ top: 'auto', bottom: '56px', left: '14px' }}>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={roomWidth}
                onChange={(e) => setRoomDimensions(parseFloat(e.target.value) || 5, roomDepth)}
                className="w-12 px-1 py-0.5 text-[10px] font-mono border border-[var(--line)] rounded bg-white/90 text-center"
                step="0.5"
                min="2"
                max="20"
              />
              <span className="text-[10px] text-[var(--charcoal-3)]">×</span>
              <input
                type="number"
                value={roomDepth}
                onChange={(e) => setRoomDimensions(roomWidth, parseFloat(e.target.value) || 4)}
                className="w-12 px-1 py-0.5 text-[10px] font-mono border border-[var(--line)] rounded bg-white/90 text-center"
                step="0.5"
                min="2"
                max="20"
              />
              <span className="text-[9px] text-[var(--charcoal-3)]">m</span>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        {rightPanelOpen && (
          <aside className="panel panel-right">
            <InspectorPanel />
            <BudgetPanel />
            <SpacingWarnings />
            <ProjectInfoPanel />

            {/* Placed items list */}
            <div className="panel-section scroll">
              <div className="panel-title">
                <span>Placed Equipment</span>
                <span className="font-mono text-[9px] font-semibold text-[var(--charcoal-3)]">
                  {placedObjects.length}
                </span>
              </div>
              {placedObjects.length === 0 ? (
                <div className="text-[11px] text-center py-4 leading-relaxed text-[var(--charcoal-3)]">
                  No equipment yet.<br />Select from the left panel<br />to start placing.
                </div>
              ) : (
                <div className="space-y-1">
                  {placedObjects.map((obj) => {
                    const eq = EQUIPMENT_CATALOG[obj.equipmentId];
                    return (
                      <div
                        key={obj.id}
                        className="flex items-center gap-2 p-1.5 rounded border border-[var(--line-soft)] bg-[var(--surface-2)] cursor-pointer hover:border-[var(--oat-dark)] transition-colors"
                        onClick={() => usePlannerStore.getState().setSelectedObject(obj.id)}
                      >
                        <span className="text-sm">{eq.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold truncate">{eq.name}</div>
                          <div className="text-[9px] font-mono text-[var(--charcoal-3)]">
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
