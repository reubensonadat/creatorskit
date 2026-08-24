'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Package,
  LayoutTemplate,
  Building,
  Sliders,
  Zap,
  AlertTriangle,
  ListTree,
  FileText,
  Share2,
  Download,
  FileDown,
  Eye,
  Sun,
  Camera,
  Grid,
  Home,
  Footprints,
  Maximize2,
  Sparkles,
  Trash2,
} from 'lucide-react';
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
import ShareKitModal from './ShareKitModal';
import { decompressStudioKit } from '@/lib/space-planner/share-engine';
import type { Currency, ViewMode } from './types';

export default function SpacePlannerApp() {
  const hasHydratedRef = useRef(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'equipment' | 'templates' | 'room-ai' | 'openings'>('equipment');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Right sidebar accordion states
  const [rightAccordion, setRightAccordion] = useState({
    inspector: true,
    budget: true,
    warnings: true,
    placedList: true,
  });

  const toggleRightAccordion = (key: keyof typeof rightAccordion) => {
    setRightAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Store subscriptions
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const setRoomDimensions = usePlannerStore((s) => s.setRoomDimensions);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const setSelectedObject = usePlannerStore((s) => s.setSelectedObject);
  const currency = usePlannerStore((s) => s.currency);
  const projectInfo = usePlannerStore((s) => s.projectInfo);
  const setProjectInfo = usePlannerStore((s) => s.setProjectInfo);
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

  // Power and budget computations
  const powerTotal = placedObjects.reduce(
    (sum, o) => sum + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts ?? 0),
    0
  );
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
        roomHeight,
        templateId,
        viewMode,
        currency,
        projectInfo,
        placedObjects,
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [roomWidth, roomDepth, roomHeight, templateId, viewMode, currency, projectInfo, placedObjects]);

  // Load saved plan or shared kit on mount (100% client-side via LZ-String)
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const kitParam = searchParams.get('kit') || (window.location.hash.includes('kit=') ? window.location.hash.split('kit=')[1] : null);
      if (kitParam) {
        const sharedKit = decompressStudioKit(kitParam);
        if (sharedKit && sharedKit.placedObjects.length > 0) {
          const store = usePlannerStore.getState();
          store.setRoomDimensions(sharedKit.roomWidth, sharedKit.roomDepth, sharedKit.roomHeight);
          if (sharedKit.floorFinish) store.setFloorFinish(sharedKit.floorFinish);
          if (sharedKit.projectName) store.setProjectInfo({ name: sharedKit.projectName, creator: '', notes: '' });
          if (sharedKit.creatorTag) store.setUserAffiliateTag(sharedKit.creatorTag);
          store.replacePlacedObjects(sharedKit.placedObjects);
          return;
        }
      }
    }

    const saved = loadPlan();
    if (saved) {
      const store = usePlannerStore.getState();
      setRoomDimensions(saved.roomWidth, saved.roomDepth, saved.roomHeight || 2.8);
      store.setCurrency(saved.currency);
      store.setProjectInfo(saved.projectInfo);
      store.setViewMode(saved.viewMode);
      store.setTemplateId(saved.templateId);

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
      loadTemplate('bedroom-studio');
    }
  }, [loadTemplate, setRoomDimensions]);

  // Keyboard Shortcuts for Sidebar Toggling & Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      if (e.key === '[' || e.key === 'BracketLeft') {
        toggleLeftPanel();
      } else if (e.key === ']' || e.key === 'BracketRight') {
        toggleRightPanel();
      } else if (e.key === 'h' || e.key === 'H') {
        toggleZenMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLeftPanel, toggleRightPanel, toggleZenMode]);

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    exportPNG(canvas, projectInfo.name || 'studio-space-planner');
  }, [projectInfo.name]);

  const area = (roomWidth * roomDepth).toFixed(1);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F4F4F5] text-black overflow-hidden font-mono select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR & HEADER CONTROLS
      ────────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-13 bg-white border-b-2 border-black flex items-center justify-between px-3 z-30 shadow-[0_2px_0_#000]">
        {/* Left: Brand, Back & Studio Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-black bg-stone-100 hover:bg-stone-200 px-2 py-1 border-2 border-black shadow-[2px_2px_0_#000] transition-all hover:translate-x-[-1px]"
            title="Return to Home Dashboard"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="h-6 w-px bg-stone-300 hidden sm:block" />

          {/* Project Title & Floor Area */}
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={projectInfo.name || 'Creator Studio Setup'}
              onChange={(e) => setProjectInfo({ name: e.target.value })}
              className="text-xs font-black text-black bg-transparent hover:bg-stone-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black px-1.5 py-0.5 border border-transparent hover:border-stone-300 rounded font-mono truncate max-w-[150px] sm:max-w-[200px]"
              title="Click to rename project"
            />
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 border border-black/30 text-[10px] text-stone-700">
              <span className="font-bold text-black">{roomWidth.toFixed(1)}×{roomDepth.toFixed(1)}m</span>
              <span className="text-stone-400">•</span>
              <span>{area}m² ({(Number(area) * 10.764).toFixed(0)} sq ft)</span>
              <span className="text-stone-400">•</span>
              <span className="text-emerald-800 font-bold">{placedObjects.length} items</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Lighting, Share, PDF & Collapsible Sidebar Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Panel Toggle Shortcuts */}
          <div className="flex items-center border-2 border-black bg-stone-100 p-0.5 shadow-[1.5px_1.5px_0_#000]">
            <button
              onClick={toggleLeftPanel}
              className={`p-1 text-xs font-bold transition-all flex items-center gap-1 ${
                leftPanelOpen ? 'bg-black text-[#FFE500]' : 'bg-transparent text-stone-700 hover:bg-stone-200'
              }`}
              title="Toggle Left Library Panel (Shortcut: [)"
            >
              {leftPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              <span className="text-[9px] hidden lg:inline">Library</span>
            </button>
            <div className="w-px h-4 bg-stone-300 mx-0.5" />
            <button
              onClick={toggleRightPanel}
              className={`p-1 text-xs font-bold transition-all flex items-center gap-1 ${
                rightPanelOpen ? 'bg-black text-[#FFE500]' : 'bg-transparent text-stone-700 hover:bg-stone-200'
              }`}
              title="Toggle Right Inspector & BOM Panel (Shortcut: ])"
            >
              <span className="text-[9px] hidden lg:inline">Inspector</span>
              {rightPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>

          <div className="h-5 w-px bg-stone-300 hidden sm:block mx-0.5" />

          {/* Time of Day Selector */}
          <div className="hidden lg:flex items-center border-2 border-black bg-white shadow-[1.5px_1.5px_0_#000] text-[9.5px]">
            <button
              onClick={() => setTimeOfDay('daylight')}
              className={`px-2 py-1 font-bold ${timeOfDay === 'daylight' ? 'bg-[#FFE500] text-black font-black' : 'hover:bg-stone-100'}`}
              title="Bright 5600K Clean Daylight"
            >
              Day
            </button>
            <button
              onClick={() => setTimeOfDay('golden-hour')}
              className={`px-2 py-1 font-bold border-l border-black ${timeOfDay === 'golden-hour' ? 'bg-[#F97316] text-white font-black' : 'hover:bg-stone-100'}`}
              title="Warm 3200K Golden Hour Sun"
            >
              Golden
            </button>
            <button
              onClick={() => setTimeOfDay('night')}
              className={`px-2 py-1 font-bold border-l border-black ${timeOfDay === 'night' ? 'bg-[#0F172A] text-sky-400 font-black' : 'hover:bg-stone-100'}`}
              title="Moody Night Studio"
            >
              Night
            </button>
          </div>

          {/* 1-Click 100% Client-Side Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-2.5 py-1 bg-[#FFE500] hover:bg-amber-300 text-black border-2 border-black font-black text-xs shadow-[2px_2px_0_#000] flex items-center gap-1.5 transition-all hover:translate-x-[-1px]"
            title="100% Client-Side 3D Studio Kit URL Generator (No Backend Needed)"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Share 3D Kit</span>
          </button>

          {/* PNG & PDF Export Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportPNG}
              className="px-2 py-1 bg-white hover:bg-stone-100 text-black border-2 border-black font-bold text-xs shadow-[1.5px_1.5px_0_#000] hidden md:flex items-center gap-1"
              title="Export High-Resolution Canvas PNG"
            >
              <Download size={13} />
              <span>PNG</span>
            </button>
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="px-2.5 py-1 bg-black hover:bg-stone-800 text-white border-2 border-black font-bold text-xs shadow-[2px_2px_0_#000] flex items-center gap-1"
              title="Generate 5-Page Architectural PDF Dossier"
            >
              <FileDown size={13} />
              <span>PDF</span>
            </button>
          </div>

          {/* Clean 3D Zen Mode */}
          <button
            onClick={toggleZenMode}
            className={`p-1.5 border-2 border-black text-xs font-bold transition-all shadow-[1.5px_1.5px_0_#000] ${
              isZenMode ? 'bg-[#00FF66] text-black font-black' : 'bg-white hover:bg-stone-100 text-black'
            }`}
            title="Clean View / Zen Mode (Shortcut: H) — Hide all UI overlays"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. WORKSPACE BODY: LEFT PANEL + 3D CANVAS + RIGHT PANEL
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLLAPSIBLE SIDEBAR */}
        {leftPanelOpen ? (
          <aside className="w-80 md:w-88 flex-shrink-0 bg-white border-r-2 border-black flex flex-col z-20 overflow-hidden shadow-[2px_0_0_#000] animate-in slide-in-from-left duration-150">
            {/* Left Tabs */}
            <div className="flex border-b-2 border-black bg-stone-100 p-1 gap-1">
              <button
                onClick={() => setLeftSidebarTab('equipment')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border border-black transition-all ${
                  leftSidebarTab === 'equipment'
                    ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Package size={12} />
                <span>Gear</span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('templates')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border border-black transition-all ${
                  leftSidebarTab === 'templates'
                    ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                <LayoutTemplate size={12} />
                <span>Presets</span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('room-ai')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border border-black transition-all ${
                  leftSidebarTab === 'room-ai'
                    ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Building size={12} />
                <span>Room</span>
              </button>
              <button
                onClick={() => setLeftSidebarTab('openings')}
                className={`py-1.5 px-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center border border-black transition-all ${
                  leftSidebarTab === 'openings'
                    ? 'bg-black text-[#FFE500] shadow-[1.5px_1.5px_0_#000]'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
                title="Doors & Windows"
              >
                <span>Doors/Windows</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-2.5">
              {leftSidebarTab === 'equipment' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-stone-100 border-2 border-black shadow-[2px_2px_0_#000]">
                    <span className="text-[11px] font-black text-black truncate">
                      Active: {COMPREHENSIVE_TEMPLATES[templateId]?.name || 'Studio Layout'}
                    </span>
                    <button
                      onClick={() => setLeftSidebarTab('templates')}
                      className="px-2 py-0.5 bg-[#FFE500] border border-black font-black text-[9px] text-black hover:bg-amber-300 shadow-[1px_1px_0_#000]"
                    >
                      SWITCH
                    </button>
                  </div>
                  <EquipmentLibrary />
                </div>
              )}

              {leftSidebarTab === 'templates' && (
                <TemplateSelector onSelectTemplate={() => setLeftSidebarTab('equipment')} />
              )}

              {leftSidebarTab === 'room-ai' && <RoomGeometryPanel />}

              {leftSidebarTab === 'openings' && <WindowsPanel />}
            </div>

            {/* Left Sidebar Collapse Button Strip */}
            <div className="p-1.5 border-t-2 border-black bg-stone-100 flex items-center justify-between">
              <span className="text-[9px] text-stone-500 font-mono">Press [ to collapse</span>
              <button
                onClick={toggleLeftPanel}
                className="p-1 bg-white hover:bg-stone-200 border border-black font-bold text-[10px] flex items-center gap-1"
              >
                <ChevronLeft size={12} />
                <span>Collapse</span>
              </button>
            </div>
          </aside>
        ) : (
          /* Collapsed Left Icon Strip */
          <div className="w-10 bg-white border-r-2 border-black flex flex-col items-center py-2 gap-2 z-20 shadow-[2px_0_0_#000]">
            <button
              onClick={toggleLeftPanel}
              className="p-1.5 bg-[#FFE500] hover:bg-amber-300 border-2 border-black text-black shadow-[1.5px_1.5px_0_#000]"
              title="Expand Library Panel ([)"
            >
              <ChevronRight size={14} />
            </button>
            <div className="w-6 h-px bg-stone-300 my-1" />
            <button
              onClick={() => {
                setLeftSidebarTab('equipment');
                toggleLeftPanel();
              }}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Gear Catalog"
            >
              <Package size={16} />
            </button>
            <button
              onClick={() => {
                setLeftSidebarTab('templates');
                toggleLeftPanel();
              }}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Studio Presets"
            >
              <LayoutTemplate size={16} />
            </button>
            <button
              onClick={() => {
                setLeftSidebarTab('room-ai');
                toggleLeftPanel();
              }}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Room Builder & Acoustics"
            >
              <Building size={16} />
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CENTER 3D/2D CANVAS STAGE
        ────────────────────────────────────────────────────────────── */}
        <section
          ref={canvasContainerRef}
          className="flex-1 relative bg-[#E4E4E7] overflow-hidden flex items-center justify-center"
        >
          <div className="w-full h-full absolute inset-0">
            <PlannerCanvas />
          </div>

          {/* Floating Top-Left Area & Status HUD (hidden during Zen mode) */}
          {viewMode !== 'camera-pov' && !isZenMode && (
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur-md border-2 border-black shadow-[3px_3px_0_#000] text-black">
              <div className="flex items-center gap-2.5 px-1">
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Floor Area</div>
                  <div className="text-xs font-black">{area} m²</div>
                </div>
                <div className="h-5 w-px bg-stone-300" />
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Bounds</div>
                  <div className="text-xs font-bold">{roomWidth}×{roomDepth}m</div>
                </div>
                <div className="h-5 w-px bg-stone-300" />
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-stone-500 font-bold">Total Draw</div>
                  <div className="text-xs font-bold text-amber-700">{powerTotal}W</div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Bottom Toolbar */}
          {!isZenMode && viewMode !== 'camera-pov' && <PlannerToolbar />}

          {/* Clean View Exit Pill */}
          {isZenMode && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40">
              <button
                onClick={toggleZenMode}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-black/95 text-white border-2 border-white/40 shadow-[4px_4px_0_#000] font-mono text-xs font-bold backdrop-blur transition-all hover:scale-105"
              >
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                <span>Zen Mode Active • Press H to restore HUD</span>
              </button>
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT COLLAPSIBLE INSPECTOR & BOM SIDEBAR
        ────────────────────────────────────────────────────────────── */}
        {rightPanelOpen ? (
          <aside className="w-80 md:w-88 flex-shrink-0 bg-white border-l-2 border-black flex flex-col z-20 overflow-hidden shadow-[-2px_0_0_#000] animate-in slide-in-from-right duration-150">
            {/* Right Sidebar Header */}
            <div className="p-2 border-b-2 border-black bg-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-black">
                <Sliders size={13} />
                <span>Inspector & BOM</span>
              </div>
              <button
                onClick={toggleRightPanel}
                className="p-1 bg-white hover:bg-stone-200 border border-black font-bold text-[10px] flex items-center gap-1"
                title="Collapse Right Sidebar (Shortcut: ])"
              >
                <span>Collapse</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Scrollable Accordion Content */}
            <div className="flex-1 overflow-y-auto space-y-0 divide-y-2 divide-black">
              {/* Active Inspector */}
              <InspectorPanel />

              {/* Power & Budget BOM */}
              <BudgetPanel />

              {/* Spacing & Acoustic Diagnostics */}
              <SpacingWarnings />

              {/* Project & Client Dossier */}
              <ProjectInfoPanel />

              {/* Placed Gear Hierarchy Outliner */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between font-black text-xs uppercase tracking-wider text-black">
                  <div className="flex items-center gap-1.5">
                    <ListTree size={13} />
                    <span>Placed Items Tree</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-stone-100 border border-black font-bold">
                    {placedObjects.length}
                  </span>
                </div>

                {placedObjects.length === 0 ? (
                  <div className="text-[11px] text-center py-4 text-stone-500 bg-stone-50 border border-stone-200 leading-relaxed">
                    No gear placed in room.<br />Pick items from the library.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {placedObjects.map((obj) => {
                      const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
                      if (!eq) return null;
                      const isSelected = selectedObjectId === obj.id;
                      return (
                        <div
                          key={obj.id}
                          className={`flex items-center justify-between p-1.5 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-[#FFE500] border-2 border-black shadow-[2px_2px_0_#000] font-bold'
                              : 'bg-white border-stone-200 hover:border-black'
                          }`}
                          onClick={() => setSelectedObject(obj.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[8.5px] font-mono font-black px-1 py-0.5 bg-stone-100 border border-black/20 text-stone-700 flex-shrink-0">
                              {eq.category.toUpperCase().slice(0, 3)}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[11px] truncate leading-tight">{eq.name}</div>
                              <div className="text-[9px] text-stone-500 font-mono">
                                {obj.isMainCamera ? 'Main Camera • ' : ''}
                                {obj.x.toFixed(1)}m, {obj.z.toFixed(1)}m
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-black uppercase text-black">Active</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Clear Scene Button Footer */}
            <div className="p-2 border-t-2 border-black bg-stone-100 flex items-center justify-between">
              <span className="text-[9px] text-stone-500 font-mono">Shortcuts: R=Rotate • Del=Remove</span>
              {placedObjects.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2 py-1 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-300 font-bold text-[10px] flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </aside>
        ) : (
          /* Collapsed Right Icon Strip */
          <div className="w-10 bg-white border-l-2 border-black flex flex-col items-center py-2 gap-2 z-20 shadow-[-2px_0_0_#000]">
            <button
              onClick={toggleRightPanel}
              className="p-1.5 bg-[#FFE500] hover:bg-amber-300 border-2 border-black text-black shadow-[-1.5px_1.5px_0_#000]"
              title="Expand Inspector Panel (])"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="w-6 h-px bg-stone-300 my-1" />
            <button
              onClick={toggleRightPanel}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Active Inspector"
            >
              <Sliders size={16} />
            </button>
            <button
              onClick={toggleRightPanel}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Bill of Materials & Watts"
            >
              <Zap size={16} />
            </button>
            <button
              onClick={toggleRightPanel}
              className="p-2 hover:bg-stone-100 rounded text-stone-700"
              title="Diagnostics & Clearance"
            >
              <AlertTriangle size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MODALS & SLIDE-OUT DRAWERS (PDF & 100% Client-Side Kit Share)
      ────────────────────────────────────────────────────────────── */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        canvasContainerRef={canvasContainerRef}
      />

      <ShareKitModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}
