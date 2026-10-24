'use client';

/**
 * AdBanner — homepage ad placement.
 *
 * AdSense remediation 2026-10-23: this used to draw a dashed
 * "ADVERTISEMENT" placeholder box. Placeholder/simulated ad frames are a
 * policy problem and made the site look unfinished to reviewers — during the
 * "Low value content" review every fake box was evidence against the site.
 *
 * Now: a real <ins class="adsbygoogle"> unit (AdSenseUnit), which renders
 * absolutely nothing until NEXT_PUBLIC_ADSENSE_SLOT_HOME is configured.
 * No border, no label, no box — invisible until it can be real.
 */

import AdSenseUnit from '@/components/AdSenseUnit';

const SLOT_HOME = process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME;

interface AdBannerProps {
  slot?: 'leaderboard' | 'rectangle' | 'sidebar';
  className?: string;
}

export default function AdBanner({ className = '' }: AdBannerProps) {
  return (
    <div className={`w-full my-4 min-h-0 ${className}`}>
      <AdSenseUnit slot={SLOT_HOME} format="horizontal" style={{ minHeight: 90 }} />
    </div>
  );
}
