/**
 * src/lib/ad-gate.ts — client-side sponsor-gate state (owner ruling 2026-10-07).
 *
 * • Cooldown: a gate can fire at most ONCE per cooldown window per tool, so
 *   hammering "Generate" 500 times in 2 minutes shows exactly one sponsor
 *   screen (the owner's explicit requirement — the timer lives on the
 *   front-end, by design).
 * • Ad-watched counter: how many sponsor screens this browser has completed,
 *   readable anywhere via getAdsWatched(). Stored locally (localStorage) —
 *   there are no accounts on CreatorsKit, so a database row would identify
 *   no one and cost a round-trip; the count is a device-level convenience
 *   stat, not user data.
 */

const TS_PREFIX = 'ck_adgate_ts_';
const COUNT_KEY = 'ck_ads_watched';

function safeGet(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSet(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* private mode — cooldown simply won't persist */
    }
}

/** True when the tool's cooldown window is still active (gate should SKIP). */
export function gateOnCooldown(tool: string, cooldownMs: number): boolean {
    if (cooldownMs <= 0) return false;
    const raw = safeGet(TS_PREFIX + tool);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < cooldownMs;
}

/** Persist "gate shown now" for the tool + bump the all-time counter. */
export function recordGateShown(tool: string): void {
    safeSet(TS_PREFIX + tool, String(Date.now()));
    const n = Number(safeGet(COUNT_KEY));
    safeSet(COUNT_KEY, String((Number.isFinite(n) ? n : 0) + 1));
}

/** How many sponsor screens this browser has completed. */
export function getAdsWatched(): number {
    const n = Number(safeGet(COUNT_KEY));
    return Number.isFinite(n) ? n : 0;
}
