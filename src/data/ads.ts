/**
 * src/data/ads.ts — the per-tool ad plan (owner ruling 2026-10-07, dictation).
 *
 *  rail        → desktop right 300×600 banner (≥1600px, ToolLayout)
 *  mobileAnchor→ sticky 320×50 banner at the bottom on phones (≤768px)
 *  gate        → sponsor screen before a key action, with a cooldown so
 *                hammering the button never gates twice inside the window
 *
 * Owner notes verbatim (decoded):
 *  business        — side banner ONLY (no gate, no mobile anchor)
 *  demystify       — right banner, that's all (generate never gated)
 *  match-cut       — download gated (generate is NEVER gated — owner
 *                    correction 2026-10-07); rails stay
 *  text-highlighter— download gated (same correction); rails stay
 *  compressor      — rails; "convert" button never gated
 *  watermark       — rails
 *  carousel-slicer — rails
 *  video-grabber   — EXCLUDED (has its own rewarded system)
 *  text-behind     — download gated
 *  quote-card      — download gated
 *  background-replace / palette-extractor / color-gradient — rails
 *  sync-slate      — NO banners anywhere (pro tool, too distracting);
 *                    only the download/export action is gated
 */

export type GateAction = 'generate' | 'download';

export interface ToolAdPlan {
    rail: boolean;
    mobileAnchor: boolean;
    gate?: {
        action: GateAction;
        /** cooldown window; a gate can fire at most once per window per tool */
        cooldownMs: number;
    };
}

export const DEFAULT_AD_PLAN: ToolAdPlan = { rail: true, mobileAnchor: true };

export const TOOL_ADS: Record<string, ToolAdPlan> = {
    '/business': { rail: true, mobileAnchor: false },
    '/demystify': { rail: true, mobileAnchor: false },
    '/match-cut': { rail: true, mobileAnchor: true, gate: { action: 'download', cooldownMs: 0 } },
    '/text-highlighter': { rail: true, mobileAnchor: true, gate: { action: 'download', cooldownMs: 0 } },
    '/compressor': { rail: true, mobileAnchor: true },
    '/watermark': { rail: true, mobileAnchor: true },
    '/carousel-slicer': { rail: true, mobileAnchor: true },
    '/text-behind': { rail: true, mobileAnchor: true, gate: { action: 'download', cooldownMs: 0 } },
    '/quote-card': { rail: true, mobileAnchor: true, gate: { action: 'download', cooldownMs: 0 } },
    '/background-replace': { rail: true, mobileAnchor: true },
    '/palette-extractor': { rail: true, mobileAnchor: true },
    '/color-gradient': { rail: true, mobileAnchor: true },
    '/sync-slate': { rail: false, mobileAnchor: false, gate: { action: 'download', cooldownMs: 0 } },
    // video-grabber is fullscreen chrome (no rails anyway) and runs its own
    // rewarded flow — explicitly nothing here.
    '/video-grabber': { rail: false, mobileAnchor: false },
    // Recipient-facing gift pages stay pure — a bouquet being opened by the
    // person receiving it must never carry an ad (owner ruling 2026-10-07).
    '/bouquet': { rail: false, mobileAnchor: false },
    '/bouquet/response': { rail: false, mobileAnchor: false },
    // Shared/printed documents render clean too.
    '/invoice': { rail: false, mobileAnchor: false },
    '/receipt': { rail: false, mobileAnchor: false },
    '/agreement': { rail: false, mobileAnchor: false },
};

export function adPlanFor(pathname: string | null): ToolAdPlan {
    if (!pathname) return DEFAULT_AD_PLAN;
    return TOOL_ADS[pathname] ?? DEFAULT_AD_PLAN;
}
