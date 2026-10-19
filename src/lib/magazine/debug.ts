// debug.ts — the unit-grammar guard. Dev-time assert that xPct/yPct
// stay fractions and w/h stay percent. Extracted so every module can
// police the same law without importing the whole engine.

import { DEV } from './units';

const devGuardUnits = (label: string, x: number, y: number, w: number, h: number): void => {
    if (!DEV) return;
    if (x < -0.02 || x > 1.02 || y < -0.02 || y > 1.02) {
        console.warn(`[solver:units] ${label}: xPct/yPct must be FRACTIONS 0–1 — got (${x}, ${y})`);
    }
    if (w < -0.5 || w > 100.5 || h < -0.5 || h > 100.5) {
        console.warn(`[solver:units] ${label}: wPct/hPct must be PERCENT 0–100 — got (${w}, ${h})`);
    }
};

// ===========================================================================
export { devGuardUnits };
