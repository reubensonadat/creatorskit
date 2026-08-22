'use client';

import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import type { Currency } from './types';

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
  const showBudgetPanel = usePlannerStore((s) => s.showBudgetPanel);
  const toggleBudgetPanel = usePlannerStore((s) => s.toggleBudgetPanel);

  const getPrice = (obj: typeof placedObjects[0]) => {
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
    if (!def) return 0;
    if (currency === 'USD') return obj.customPriceUSD ?? def.defaultPriceUSD ?? Math.round(def.defaultPriceGHS / 15);
    if (currency === 'EUR') return obj.customPriceEUR ?? def.defaultPriceEUR ?? Math.round(def.defaultPriceGHS / 16);
    if (currency === 'GBP') return obj.customPriceGBP ?? def.defaultPriceGBP ?? Math.round(def.defaultPriceGHS / 19);
    if (currency === 'GHS') return obj.customPriceGHS ?? def.defaultPriceGHS;
    return obj.customPriceNGN ?? def.defaultPriceNGN;
  };

  const powerTotal = placedObjects.reduce((sum, o) => sum + (COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.watts ?? 0), 0);
  const budgetTotal = placedObjects.reduce((sum, o) => sum + getPrice(o), 0);
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  // Group items by type
  const grouped = new Map<string, typeof placedObjects>();
  placedObjects.forEach((o) => {
    const existing = grouped.get(o.equipmentId) || [];
    existing.push(o);
    grouped.set(o.equipmentId, existing);
  });

  return (
    <>
      {/* Budget summary in right panel */}
      <div className="panel-section">
        <div className="panel-title">
          <span>Power & Budget</span>
        </div>

        {/* Currency toggle */}
        <div className="grid grid-cols-5 gap-1 mb-3">
          {(['USD', 'EUR', 'GBP', 'GHS', 'NGN'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`btn justify-center text-[10px] px-1 py-1 font-mono ${currency === c ? 'active bg-black text-white' : 'bg-white'}`}
            >
              {CURRENCY_SYMBOLS[c]}
            </button>
          ))}
        </div>

        {/* Power */}
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-[var(--charcoal-3)]">Power Draw</span>
          <span className="font-mono font-semibold">{powerTotal}W</span>
        </div>
        <div className="meter mb-3">
          <div
            className="meter-fill"
            style={{ width: `${Math.min(100, (powerTotal / 2860) * 100)}%` }}
          />
        </div>
        <div className="text-[9px] text-[var(--charcoal-3)] mb-3">
          Typical socket: ~2,860W (13A × 220V). Planning guidance only.
        </div>

        {/* Budget total */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px] text-[var(--charcoal-3)]">Est. Total</span>
          <span className="font-display font-black text-lg">
            {sym}{budgetTotal.toLocaleString()}
          </span>
        </div>

        <button
          className="btn w-full justify-center"
          onClick={toggleBudgetPanel}
        >
          View Breakdown
        </button>
      </div>

      {/* Full breakdown slide-out */}
      {showBudgetPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={toggleBudgetPanel} />
          <div className="cost-panel open relative z-10">
            <div className="p-5 border-b border-[var(--line)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-[17px]">Equipment Budget</div>
                  <div className="text-[11px] text-[var(--charcoal-3)]">Edit prices to match your local market</div>
                </div>
                <button className="btn btn-icon" onClick={toggleBudgetPanel}>✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {grouped.size === 0 ? (
                <div className="text-center py-12 text-[var(--charcoal-3)]">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm font-semibold">No equipment placed</div>
                  <div className="text-[11px]">Add items to see cost breakdown.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(grouped.entries()).map(([eqId, items]) => {
                    const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[eqId];
                    if (!eq) return null;
                    return (
                      <div key={eqId} className="border-b border-[var(--line-soft)] pb-3">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-base">{eq.icon}</span>
                          <div className="flex-1">
                            <div className="text-[12px] font-semibold">{eq.name} ×{items.length}</div>
                          </div>
                          <div className="font-display font-bold text-[13px]">
                            {sym}{items.reduce((s, o) => s + getPrice(o), 0).toLocaleString()}
                          </div>
                        </div>
                        {items.map((item) => {
                          const price = getPrice(item);
                          return (
                            <div key={item.id} className="flex items-center gap-2 pl-7 mb-1">
                              <input
                                type="number"
                                value={price}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setCustomPrice(item.id, currency, val);
                                }}
                                className="w-24 px-2 py-1 text-[11px] font-mono border border-[var(--line)] rounded bg-white"
                              />
                              <span className="text-[10px] text-[var(--charcoal-3)]">{sym}</span>
                              <span className="text-[10px] text-[var(--charcoal-3)] flex-1">
                                @{eq.watts > 0 ? `${eq.watts}W` : 'passive'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[var(--line)] bg-[var(--surface-2)]">
              <div className="flex justify-between items-baseline">
                <span className="font-display font-semibold text-[13px]">Total</span>
                <span className="font-display font-black text-2xl text-[var(--accent)]">
                  {sym}{budgetTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[var(--charcoal-3)] mt-1">
                <span>Power draw</span>
                <span className="font-mono">{powerTotal}W</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
