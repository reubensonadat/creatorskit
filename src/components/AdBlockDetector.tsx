'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Ad-block notice — non-blocking toast edition (owner ruling 2026-10-07).
 *
 * Previously a full-screen wall; that blocked first impressions while zero
 * real ads shipped and risked a bad AdSense review. Now: the same high-accuracy
 * DOM bait check fires ONE dismissable toast per session, and never blocks
 * content. Revisit intensity only after real AdSense units are live.
 */
export default function AdBlockDetector() {
  const { toast } = useToast();

  useEffect(() => {
    // One notice per session, max.
    if (sessionStorage.getItem('adblock_dismissed') === 'true') {
      return;
    }

    const checkAdBlocker = () => {
      try {
        const bait = document.createElement('div');
        bait.className = 'adsbox ad-placement doubleclick-ad pub_300x250';
        bait.style.position = 'absolute';
        bait.style.left = '-9999px';
        bait.style.top = '-9999px';
        bait.style.width = '100px';
        bait.style.height = '100px';
        bait.innerHTML = '&nbsp;';
        document.body.appendChild(bait);

        setTimeout(() => {
          const isHidden =
            bait.offsetParent === null ||
            bait.offsetHeight === 0 ||
            bait.offsetLeft === 0 ||
            window.getComputedStyle(bait).display === 'none' ||
            window.getComputedStyle(bait).visibility === 'hidden';

          if (document.body.contains(bait)) {
            document.body.removeChild(bait);
          }

          if (isHidden) {
            sessionStorage.setItem('adblock_dismissed', 'true');
            toast({
              title: 'Ad blocker detected',
              description:
                'Ads keep every tool here free. Please consider whitelisting us — click the ad blocker icon → "Disable on this site" → reload. 🙏',
              action: (
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-bold"
                >
                  <RefreshCw size={13} />
                  Reload
                </button>
              ),
            });
          }
        }, 500);
      } catch {
        // bait failures must never surface
      }
    };

    // Delay slightly to prevent race conditions during hydration.
    const timer = setTimeout(checkAdBlocker, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
