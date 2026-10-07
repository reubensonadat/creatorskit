/**
 * src/lib/consent.ts
 * Consent state (owner ruling 2026-10-07): an explicit Accept / Deny banner
 * gates ALL measurement and ad cookies. GA4 loads with Consent Mode v2
 * defaults set to DENIED (see src/app/layout.tsx) — nothing is stored until
 * the visitor accepts. Denials still produce cookieless consent pings, so
 * GA4's Consent Overview reports the accepted/denied ratio out of the box.
 *
 * The choice itself lives in localStorage (functional storage, key ck_consent).
 */

export type ConsentChoice = 'granted' | 'denied';
export const CONSENT_STORAGE_KEY = 'ck_consent_v1';
export const CONSENT_EVENT = 'ck-consent-changed';

export function getStoredConsent(): ConsentChoice | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        return v === 'granted' || v === 'denied' ? v : null;
    } catch {
        return null;
    }
}

export function hasAnalyticsConsent(): boolean {
    return getStoredConsent() === 'granted';
}

/** Push a Consent Mode v2 update through to gtag (GA4 + AdSense honour it). */
function pushConsentToGtag(choice: ConsentChoice): void {
    if (typeof window === 'undefined') return;
    try {
        const w = window as unknown as { gtag?: (...args: unknown[]) => void };
        w.gtag?.('consent', 'update', {
            ad_storage: choice,
            ad_user_data: choice,
            ad_personalization: choice,
            analytics_storage: choice,
            functionality_storage: 'granted', // strictly functional, always on
            security_storage: 'granted',
        });
    } catch {
        /* gtag not loaded yet (GA_ID unset) — choice is still persisted. */
    }
}

export function writeConsent(choice: ConsentChoice): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
        /* private mode — fall through so gtag still gets the update */
    }
    pushConsentToGtag(choice);
    window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}
