'use client';

import { useState } from 'react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import { generateBillOfMaterials, resolveEquipmentAffiliateInfo } from '@/lib/space-planner/affiliate';
import type { Currency } from './types';
import { ShoppingCart, ExternalLink, Download, Check, Copy } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: 'GH₵',
  NGN: '₦',
};

export default function BudgetPanel() {
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const currency = usePlannerStore((s) => s.currency);
  const setCurrency = usePlannerStore((s) => s.setCurrency);
  const setCustomPrice = usePlannerStore((s) => s.setCustomPrice);
  const userAffiliateTag = usePlannerStore((s) => s.userAffiliateTag);
  const setUserAffiliateTag = usePlannerStore((s) => s.setUserAffiliateTag);
  const showBudgetPanel = usePlannerStore((s) => s.showBudgetPanel);
  const toggleBudgetPanel = usePlannerStore((s) => s.toggleBudgetPanel);

  const [copiedSchedule, setCopiedSchedule] = useState(false);

  const getPrice = (obj: typeof placedObjects[0]) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
    if (!def) return 0;
    if (currency === 'USD') return obj.customPriceUSD ?? def.defaultPriceUSD ?? Math.round(def.defaultPriceGHS / 15);
    if (currency === 'EUR') return obj.customPriceEUR ?? def.defaultPriceEUR ?? Math.round(def.defaultPriceGHS / 16);
    if (currency === 'GBP') return obj.customPriceGBP ?? def.defaultPriceGBP ?? Math.round(def.defaultPriceGHS / 19);
    if (currency === 'GHS') return obj.customPriceGHS ?? def.defaultPriceGHS;
    return obj.customPriceNGN ?? def.defaultPriceNGN;
  };

  const powerTotal = placedObjects.reduce(
    (sum, o) => sum + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts ?? 0),
    0
  );
  const budgetTotal = placedObjects.reduce((sum, o) => sum + getPrice(o), 0);
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  const bom = generateBillOfMaterials(placedObjects, userAffiliateTag);

  const handleCopySchedule = () => {
    const totalUSD = bom.totalEstimatedUSD ?? bom.totalCostUSD ?? 0;
    const totalWatts = bom.totalPowerWatts ?? bom.totalWatts ?? 0;
    const totalUnits = bom.totalUnits ?? bom.itemCount ?? 0;
    const lines = [
      `# CREATOR STUDIO PROCUREMENT SCHEDULE`,
      `Total Placed Equipment: ${totalUnits} items | Total Draw: ${totalWatts}W | Est Budget: $${totalUSD.toLocaleString()} USD`,
      ``,
      `| Item & Brand | Model | Qty | Est. Unit Price | Total Price | Amazon Direct Buy |`,
      `| --- | --- | --- | --- | --- | --- |`,
      ...bom.items.map(
        (i) =>
          `| ${i.brand} | ${i.model} | ${i.quantity} | $${i.typicalPriceUSD ?? i.unitPriceUSD ?? 0} | $${(i.subtotalUSD ?? i.totalPriceUSD ?? 0).toLocaleString()} | [Buy on Amazon](${i.amazonUrl}) |`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSchedule(true);
    setTimeout(() => setCopiedSchedule(false), 2500);
  };

  return (
    <>
      {/* Budget Summary In Right Sidebar */}
      <div className="panel-section space-y-3">
        <div className="panel-title flex items-center justify-between">
          <span>Power & Procurement</span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-zinc-900 text-white font-bold">
            BOM
          </span>
        </div>

        {/* Currency Switcher */}
        <div className="grid grid-cols-5 gap-1">
          {(['USD', 'EUR', 'GBP', 'GHS', 'NGN'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`btn justify-center text-[9.5px] px-1 py-1 font-mono font-bold ${
                currency === c ? 'bg-zinc-900 text-white' : 'bg-white text-stone-800'
              }`}
            >
              {CURRENCY_SYMBOLS[c]}
            </button>
          ))}
        </div>

        {/* Studio Power Draw Meter */}
        <div className="p-2 bg-stone-50 border border-black/20 space-y-1.5">
          <div className="flex justify-between text-[10.5px] font-bold font-mono">
            <span className="text-stone-600">Total Power Draw</span>
            <span className="text-black">{powerTotal}W</span>
          </div>
          <div className="w-full bg-stone-200 h-2 border border-black/20 overflow-hidden">
            <div
              className={`h-full transition-all ${
                powerTotal > 2000 ? 'bg-red-600' : powerTotal > 1000 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (powerTotal / 2860) * 100)}%` }}
            />
          </div>
          <div className="text-[8.5px] font-mono text-stone-500 leading-tight">
            13A @ 220V breaker capacity: 2,860W max.
          </div>
        </div>

        {/* Budget Total */}
        <div className="flex items-baseline justify-between p-2 bg-stone-100 border-2 border-black">
          <span className="text-[10px] font-mono font-bold uppercase text-stone-700">Studio BOM Est.</span>
          <span className="font-mono font-black text-lg text-black">
            {sym}{budgetTotal.toLocaleString()}
          </span>
        </div>

        <button
          className="btn w-full justify-center py-1.5 font-bold bg-zinc-900 text-white hover:bg-black shadow-[2px_2px_0_#000]"
          onClick={toggleBudgetPanel}
        >
          <ShoppingCart size={13} className="mr-1" />
          Procurement Schedule ({placedObjects.length})
        </button>
      </div>

      {/* Bill of Materials Full Slide-Out Modal */}
      {showBudgetPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={toggleBudgetPanel} />
          <div className="w-full max-w-xl bg-white border-l-4 border-black z-10 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b-2 border-black bg-stone-100 flex items-center justify-between">
              <div>
                <div className="font-mono font-black text-base uppercase tracking-wider text-black">
                  Studio Bill of Materials & Procurement
                </div>
                <div className="text-[11px] font-mono text-stone-600">
                  {bom.totalUnits ?? bom.itemCount ?? 0} items • {bom.totalPowerWatts ?? bom.totalWatts ?? 0}W total draw • Est. ${(bom.totalEstimatedUSD ?? bom.totalCostUSD ?? 0).toLocaleString()} USD
                </div>
              </div>
              <button
                className="w-7 h-7 bg-black text-white font-bold flex items-center justify-center hover:bg-stone-800"
                onClick={toggleBudgetPanel}
              >
                ✕
              </button>
            </div>

            {/* Custom Affiliate Tag Input */}
            <div className="p-3 bg-amber-50 border-b-2 border-black flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex-1">
                <span className="font-bold text-black block text-[11px]">Your Amazon Associate Tag:</span>
                <span className="text-[9.5px] text-stone-600">
                  Share this studio kit to earn affiliate commissions when others buy this gear.
                </span>
              </div>
              <input
                type="text"
                value={userAffiliateTag}
                placeholder="e.g. yourtag-20"
                onChange={(e) => setUserAffiliateTag(e.target.value)}
                className="w-36 p-1 bg-white border-2 border-black text-[11px] font-mono font-bold"
              />
            </div>

            {/* Schedule Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
              {bom.items.length === 0 ? (
                <div className="text-center py-16 text-stone-500">
                  <div className="font-bold text-sm text-black">No equipment placed yet</div>
                  <div className="text-xs mt-1">Add cameras, lights, and desks from the library into your studio.</div>
                </div>
              ) : (
                bom.items.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="p-3 border-2 border-black bg-stone-50 shadow-[2px_2px_0_#000] space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black px-1.5 py-1 bg-white border border-black/30 text-stone-800">
                          {item.category.toUpperCase().slice(0, 3)}
                        </span>
                        <div>
                          <div className="font-black text-[13px] text-black">
                            {item.brand} {item.model} <span className="text-stone-500 font-normal">×{item.quantity}</span>
                          </div>
                          <div className="text-[9.5px] text-stone-600 uppercase font-bold">
                            {item.category} • {item.watts > 0 ? `${item.watts * item.quantity}W draw` : 'Passive'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-black">
                          ${(item.subtotalUSD ?? item.totalPriceUSD ?? 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-stone-500">
                          ${item.typicalPriceUSD ?? item.unitPriceUSD ?? 0} each
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[10px]">
                      <span className="text-stone-600 truncate max-w-[240px]">
                        Catalog: {item.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={item.amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-[#FF9900] hover:bg-[#e88b00] text-black font-black border border-black flex items-center gap-1 shadow-[1px_1px_0_#000]"
                        >
                          Amazon <ExternalLink size={10} />
                        </a>
                        <a
                          href={item.bhPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-white hover:bg-stone-100 text-black font-bold border border-black flex items-center gap-1 shadow-[1px_1px_0_#000]"
                        >
                          B&H <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-black bg-stone-100 flex items-center justify-between gap-3 font-mono">
              <button
                onClick={handleCopySchedule}
                className="btn flex-1 justify-center py-2 bg-white hover:bg-stone-200 border-2 border-black text-black font-bold text-xs shadow-[2px_2px_0_#000]"
              >
                {copiedSchedule ? <Check size={14} className="mr-1 text-emerald-600" /> : <Copy size={14} className="mr-1" />}
                {copiedSchedule ? 'Copied Markdown!' : 'Copy Procurement Markdown'}
              </button>
              <button
                onClick={toggleBudgetPanel}
                className="btn py-2 px-5 bg-black hover:bg-stone-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
