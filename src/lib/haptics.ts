/**
 * src/lib/haptics.ts — tiny vibration feedback for mobile taps.
 * ─────────────────────────────────────────────────────────────────────────────
 * Owner ruling 2026-10-03: "add haptics to taps of things on mobile".
 * Web Vibration API: Android Chrome/Edge honor it; iOS Safari ignores it
 * (every call is a harmless no-op there). Cheap + safe to fire liberally.
 */

function canVibrate(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Light tap — buttons, chips, nav toggles. */
export function hapticTap(): void {
    if (canVibrate()) {
        try {
            navigator.vibrate(10);
        } catch {
            /* no-op */
        }
    }
}

/** Slightly stronger — opening a tool (card / quick-slot tap). */
export function hapticOpen(): void {
    if (canVibrate()) {
        try {
            navigator.vibrate(16);
        } catch {
            /* no-op */
        }
    }
}

/** Confirm double-blip — pin / unpin actions. */
export function hapticPin(): void {
    if (canVibrate()) {
        try {
            navigator.vibrate([0, 18, 40, 18]);
        } catch {
            /* no-op */
        }
    }
}
