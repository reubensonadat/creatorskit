'use client';

import { useState } from 'react';
import { usePlannerStore } from './store';
import {
  Calculator,
  Layers,
  Package,
  Truck,
  DollarSign,
  Copy,
  Check,
  SlidersHorizontal,
  Home,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

export default function ConstructionEstimatorPanel() {
  const showBudgetPanel = usePlannerStore((s) => s.showBudgetPanel);
  const toggleBudgetPanel = usePlannerStore((s) => s.toggleBudgetPanel);
  const currency = usePlannerStore((s) => s.currency);
  const setCurrency = usePlannerStore((s) => s.setCurrency);
  const getConstructionBoQ = usePlannerStore((s) => s.getConstructionBoQ);
  const materialUnitRates = usePlannerStore((s) => s.materialUnitRates);
  const updateMaterialUnitRate = usePlannerStore((s) => s.updateMaterialUnitRate);
  const plotConfig = usePlannerStore((s) => s.plotConfig);
  const roofConfig = usePlannerStore((s) => s.roofConfig);

  const [copied, setCopied] = useState(false);
  const [showRatesEditor, setShowRatesEditor] = useState(false);

  if (!showBudgetPanel) return null;

  const boq = getConstructionBoQ();

  const handleCopyBoQ = () => {
    const text = [
      `# GHANAIAN RESIDENTIAL CONSTRUCTION BILL OF QUANTITIES (BoQ)`,
      `Plot Size: ${plotConfig.name}`,
      `Total Built Area: ${boq.builtFootprintM2} m² (${Math.round(boq.builtFootprintM2 * 10.764)} sq ft) | Plot Coverage: ${boq.plotCoveragePct}%`,
      `Roof Style: ${roofConfig.type.toUpperCase()}`,
      ``,
      `--- MATERIAL BREAKDOWN ---`,
      `- Sandcrete Blocks Total: ${boq.totalBlocksCount.toLocaleString()} blocks (incl. 8% waste)`,
      `  * 6-inch Standard Wall Blocks: ${boq.blocks6InchCount.toLocaleString()} pcs`,
      `  * 5-inch Partition Blocks: ${boq.blocks5InchCount.toLocaleString()} pcs`,
      `  * 9-inch Foundation/Fence Blocks: ${boq.blocks9InchCount.toLocaleString()} pcs`,
      `- 50kg Cement Bags Total: ${boq.totalCementBags.toLocaleString()} bags`,
      `  * Block Laying Mortar: ${boq.cementLayingBags} bags`,
      `  * Wall Plastering/Rendering: ${boq.cementPlasteringBags} bags`,
      `  * German Floor Slab (Oversite Concrete): ${boq.cementGermanFloorBags} bags`,
      `  * Columns, Lintels & Ring Beams: ${boq.cementBeamsLintelsBags} bags`,
      `- Coarse River Sand: ${boq.sandTrips} trips (20-tonne tipper)`,
      `- Crushed Granite Chippings: ${boq.chippingsTrips} trips (20-tonne)`,
      `- High-Tensile Iron Rods (Rebar): ${boq.rebarTons} tons`,
      `- Roofing Sheets Area: ${boq.roofingAreaM2} m²`,
      ``,
      `--- ESTIMATED PROJECT COST ---`,
      `Estimated Material Cost: GH₵ ${(boq.totalCostGHS - boq.itemizedCostsGHS.estimatedLabor).toLocaleString()}`,
      `Estimated Skilled Labor (~32%): GH₵ ${boq.itemizedCostsGHS.estimatedLabor.toLocaleString()}`,
      `TOTAL ESTIMATED COST: GH₵ ${boq.totalCostGHS.toLocaleString()} (approx. $${boq.totalCostUSD.toLocaleString()} USD)`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] text-[#1F1E1D] border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              🇬🇭
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase" style={{ fontFamily: 'monospace' }}>
                Ghanaian Construction Estimator (BoQ)
              </h2>
              <p className="text-xs text-[#6B6863]">
                Accurate Sandcrete Blocks, 50kg Cement Bags, Aggregates & Construction Budget
              </p>
            </div>
          </div>
          <button
            onClick={toggleBudgetPanel}
            className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Cost */}
            <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-bold text-[#6B6863] uppercase tracking-wider font-mono">
                Total Est. Cost
              </div>
              <div className="text-xl font-black text-black mt-1">
                {currency === 'USD' ? `$${boq.totalCostUSD.toLocaleString()}` : `GH₵ ${boq.totalCostGHS.toLocaleString()}`}
              </div>
              <div className="text-[11px] text-[#6B6863] mt-0.5 font-mono">
                {currency === 'USD' ? `GH₵ ${boq.totalCostGHS.toLocaleString()}` : `$${boq.totalCostUSD.toLocaleString()} USD`}
              </div>
            </div>

            {/* Total Blocks */}
            <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-bold text-[#6B6863] uppercase tracking-wider font-mono">
                Sandcrete Blocks
              </div>
              <div className="text-xl font-black text-black mt-1">
                {boq.totalBlocksCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#6B6863] mt-0.5 font-mono">
                incl. 8% waste
              </div>
            </div>

            {/* Cement Bags */}
            <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-bold text-[#6B6863] uppercase tracking-wider font-mono">
                50kg Cement Bags
              </div>
              <div className="text-xl font-black text-black mt-1">
                {boq.totalCementBags.toLocaleString()} <span className="text-xs font-normal">bags</span>
              </div>
              <div className="text-[11px] text-[#6B6863] mt-0.5 font-mono">
                laying + plaster + slab
              </div>
            </div>

            {/* Built Area */}
            <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-bold text-[#6B6863] uppercase tracking-wider font-mono">
                Built Footprint
              </div>
              <div className="text-xl font-black text-black mt-1">
                {boq.builtFootprintM2} <span className="text-xs font-normal">m²</span>
              </div>
              <div className="text-[11px] text-[#6B6863] mt-0.5 font-mono">
                {boq.plotCoveragePct}% plot coverage
              </div>
            </div>
          </div>

          {/* Detailed Bill of Quantities Table */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F5F1EA] border-b-2 border-black flex items-center justify-between">
              <span className="text-xs font-bold font-mono uppercase tracking-wider">
                Material & Work Schedule (BoQ)
              </span>
              <span className="text-[11px] font-mono text-[#6B6863]">
                Ghana Standard 450×225mm Blocks
              </span>
            </div>

            <div className="divide-y divide-black/10 text-xs">
              {/* Blocks */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>🧱 Sandcrete Blocks (6-inch standard & 5-inch partitions)</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    6" Outer: {boq.blocks6InchCount.toLocaleString()} pcs · 5" Partition: {boq.blocks5InchCount.toLocaleString()} pcs
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.blocks.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.totalBlocksCount.toLocaleString()} blocks
                  </div>
                </div>
              </div>

              {/* Cement */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>🏛️ 50kg Cement Bags (Laying, Rendering & German Floor Slab)</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    Laying: {boq.cementLayingBags} bags · Plastering: {boq.cementPlasteringBags} bags · Concrete Slab: {boq.cementGermanFloorBags} bags
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.cement.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.totalCementBags} bags @ GH₵ {materialUnitRates.cementBagGHS}
                  </div>
                </div>
              </div>

              {/* Sand & Chippings */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>🚚 Aggregates (Coarse River Sand & Granite Chippings)</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.sandTrips} Sand Trips (20-ton) · {boq.chippingsTrips} Granite Chippings Trips
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.sandChippings.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.sandTrips + boq.chippingsTrips} truckloads
                  </div>
                </div>
              </div>

              {/* Iron Rods / Rebar */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>⚙️ High-Tensile Iron Rods (16mm, 12mm & 10mm Stirrups)</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    Footings, structural columns, lintels & ring beam reinforcement
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.rebar.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.rebarTons} tons
                  </div>
                </div>
              </div>

              {/* Roofing */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>🏠 Roofing System ({roofConfig.type.replace('-', ' ').toUpperCase()})</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    Aluzinc sheets, timber trusses, ridge caps & parapet waterproofing
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.roofing.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    {boq.roofingAreaM2} m² area
                  </div>
                </div>
              </div>

              {/* Skilled Labor */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-black/2 bg-[#FFFDF5]">
                <div className="space-y-0.5">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>👷 Estimated Skilled Labor Package (~32%)</span>
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    Master masons, steel benders, carpenters & concrete handlers
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-black font-mono">
                    GH₵ {boq.itemizedCostsGHS.estimatedLabor.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#6B6863] font-mono">
                    Workmanship
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Rates Editor Accordion */}
          <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => setShowRatesEditor(!showRatesEditor)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono font-bold hover:bg-black/5 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={14} />
                <span>Custom Market Unit Prices (Inflation Adjuster)</span>
              </span>
              {showRatesEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRatesEditor && (
              <div className="p-4 border-t-2 border-black grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-[#6B6863] mb-1">
                    50kg Cement Bag (GH₵):
                  </label>
                  <input
                    type="number"
                    value={materialUnitRates.cementBagGHS}
                    onChange={(e) => updateMaterialUnitRate('cementBagGHS', Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#6B6863] mb-1">
                    6-Inch Sandcrete Block (GH₵):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={materialUnitRates.sandcrete6InchBlockGHS}
                    onChange={(e) => updateMaterialUnitRate('sandcrete6InchBlockGHS', Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#6B6863] mb-1">
                    Coarse Sand 20-Tonne Trip (GH₵):
                  </label>
                  <input
                    type="number"
                    value={materialUnitRates.sandTripGHS}
                    onChange={(e) => updateMaterialUnitRate('sandTripGHS', Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#6B6863] mb-1">
                    Crushed Granite Chippings Trip (GH₵):
                  </label>
                  <input
                    type="number"
                    value={materialUnitRates.chippingsTripGHS}
                    onChange={(e) => updateMaterialUnitRate('chippingsTripGHS', Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#6B6863] mb-1">
                    Exchange Rate (GH₵ per USD):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={materialUnitRates.exchangeRateGHSPerUSD}
                    onChange={(e) => updateMaterialUnitRate('exchangeRateGHSPerUSD', Number(e.target.value) || 15.5)}
                    className="w-full px-2.5 py-1.5 border-2 border-black font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t-2 border-black bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#6B6863]">Display Currency:</span>
            <button
              onClick={() => setCurrency('GHS')}
              className={`px-3 py-1 text-xs font-mono font-bold border-2 border-black cursor-pointer transition-colors ${
                currency === 'GHS' ? 'bg-black text-white' : 'bg-white hover:bg-black/5'
              }`}
            >
              GH₵ (Cedi)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 text-xs font-mono font-bold border-2 border-black cursor-pointer transition-colors ${
                currency === 'USD' ? 'bg-black text-white' : 'bg-white hover:bg-black/5'
              }`}
            >
              $ (USD)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyBoQ}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDE59] text-black font-mono text-xs font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied BoQ!' : 'Copy Bill of Quantities'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
