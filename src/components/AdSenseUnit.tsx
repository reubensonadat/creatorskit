"use client";

/**
 * src/components/AdSenseUnit.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The ONE real AdSense ad unit renderer (AdSense remediation 2026-10-23).
 *
 * Why this exists: the site previously drew dashed "ADVERTISEMENT /
 * [AdSense-ready]" placeholder boxes. Google policy forbids simulated or
 * placeholder ad frames — they read as misleading "ads" placed next to thin
 * content, which contributed to the "Low value content" rejection. This
 * component renders a genuine <ins class="adsbygoogle"> tag, and renders
 * NOTHING AT ALL when the slot is not configured — an unconfigured slot must
 * be invisible, never a fake box.
 *
 * Configuration (.env.local or host env):
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-7897650446063664        (already public in the repo)
 *   NEXT_PUBLIC_ADSENSE_SLOT_RAIL=1234567890                  (300×600 rail unit id)
 *   NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR=1234567890                (320×50 anchor unit id)
 *   NEXT_PUBLIC_ADSENSE_SLOT_HOME=1234567890                  (home leaderboard unit id)
 * Create the corresponding display units in the AdSense dashboard and copy
 * their data-ad-slot IDs into those variables.
 */

import { useEffect, useRef } from "react";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-7897650446063664";

interface AdSenseUnitProps {
    /** AdSense data-ad-slot for this placement. When empty → render nothing. */
    slot?: string;
    /** CSS format hint, e.g. "auto", "300x600", "320x50", "728x90". */
    format?: string;
    /** Optional inline layout styles for the container. */
    style?: React.CSSProperties;
    /** Responsive units fill the container width. Default true. */
    responsive?: boolean;
}

export default function AdSenseUnit({
    slot,
    format = "auto",
    style,
    responsive = true,
}: AdSenseUnitProps) {
    const pushed = useRef(false);

    useEffect(() => {
        // Push exactly once per mount. adsbygoogle may not exist yet while the
        // account is under review — that is fine, the <ins> simply stays empty
        // and invisible; the push is retried on the next mount/navigation.
        if (!slot || pushed.current) return;
        try {
            const w = window as unknown as { adsbygoogle?: unknown[] };
            w.adsbygoogle = w.adsbygoogle || [];
            w.adsbygoogle.push({});
            pushed.current = true;
        } catch {
            /* adsense not loaded (blocked/offline) — stay invisible */
        }
    }, [slot]);

    // No slot configured → render nothing. NEVER a placeholder box.
    if (!slot) return null;

    return (
        <ins
            className="adsbygoogle"
            style={{ display: "block", ...style }}
            data-ad-client={AD_CLIENT}
            data-ad-slot={slot}
            data-ad-format={format}
            {...(responsive ? { "data-full-width-responsive": "true" } : {})}
        />
    );
}
