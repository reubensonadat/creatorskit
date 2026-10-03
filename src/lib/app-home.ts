/**
 * src/lib/app-home.ts — quick-tool state for the /app launcher.
 * ─────────────────────────────────────────────────────────────────────────────
 * Remembers the tools a visitor actually uses (recents) and the ones they
 * long-press to pin. 100% local — plain localStorage under the house `ck_`
 * prefix, so everything shows up in the /your-data self-serve view.
 * The bottom bar shows QUICK_SLOTS tools: pinned first, then recents fill
 * the remaining slots (owner ruling 2026-10-03).
 */
import { EVERY_TOOL } from '@/data/tools';

const RECENT_KEY = 'ck_app_recent_v1';
const PIN_KEY = 'ck_app_pins_v1';
const RECENT_CAP = 12;

/** How many quick-tool slots the /app bottom navigation has. */
export const QUICK_SLOTS = 3;

function readList(key: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === 'string');
    } catch {
        return [];
    }
}

function writeList(key: string, list: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
        /* storage full / private mode — quick tools just won't persist */
    }
}

/** Most-recent-first hrefs of tools visited. */
export function getRecentTools(max = RECENT_CAP): string[] {
    return readList(RECENT_KEY).slice(0, max);
}

/** Move-to-front + dedupe. Only real tool routes are recorded. */
export function recordToolVisit(href: string): void {
    if (!href || href === '/app') return;
    const list = readList(RECENT_KEY).filter((h) => h !== href);
    list.unshift(href);
    writeList(RECENT_KEY, list.slice(0, RECENT_CAP));
}

/** Pinned hrefs, oldest-pin-first, capped at the number of quick slots. */
export function getPinnedTools(): string[] {
    return readList(PIN_KEY).slice(0, QUICK_SLOTS);
}

export function isToolPinned(href: string): boolean {
    return readList(PIN_KEY).includes(href);
}

/** Toggle a pin. Returns `true` when the tool is now pinned. */
export function toggleToolPin(href: string): boolean {
    if (!href || href === '/app') return false;
    const pins = readList(PIN_KEY);
    if (pins.includes(href)) {
        writeList(PIN_KEY, pins.filter((h) => h !== href));
        return false;
    }
    writeList(PIN_KEY, [href, ...pins].slice(0, QUICK_SLOTS));
    return true;
}

/**
 * Force-attach a tool when every quick slot is already taken: newest in,
 * oldest evicted. Used by the /app attach-tools drawer so adding never
 * dead-ends. Returns the final pinned list.
 */
export function pinToolEvicting(href: string): string[] {
    if (!href || href === '/app') return getPinnedTools();
    const pins = readList(PIN_KEY).filter((h) => h !== href);
    const next = [href, ...pins].slice(0, QUICK_SLOTS);
    writeList(PIN_KEY, next);
    return next;
}

/**
 * ClientLayout calls this on every pathname change. Matches nested tool
 * paths (e.g. /business/…) back to their tool entry; marketing routes and
 * the /app launcher itself are never recorded.
 */
export function recordVisitForPath(pathname: string): void {
    const hit = EVERY_TOOL.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'));
    if (hit && hit.href !== '/app' && !hit.isExternal) recordToolVisit(hit.href);
}
