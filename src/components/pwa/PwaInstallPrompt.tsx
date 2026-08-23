'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('CreatorKit ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('CreatorKit ServiceWorker registration error:', err);
        });
    }

    // 2. Check if already installed / running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // 3. Check dismissal in localStorage
    const dismissedUntil = localStorage.getItem('creatorkit_pwa_dismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 4. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSSafari = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    setIsIOS(isIOSSafari);

    // 5. Listen for Android / Chrome / Desktop PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show after a short delay
    let iosTimer: NodeJS.Timeout;
    if (isIOSSafari) {
      iosTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    // Dismiss for 7 days
    localStorage.setItem('creatorkit_pwa_dismissed', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Floating Bottom-Right / Bottom-Center PWA Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] animate-in slide-in-from-bottom-5 duration-200 font-mono">
        <div className="bg-white border-2 border-black shadow-[5px_5px_0_#000] p-3 text-black">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-black flex items-center justify-center border border-black flex-shrink-0 relative overflow-hidden">
              <Image src="/logo.png" alt="CreatorKit" width={36} height={36} className="object-contain" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs uppercase tracking-wider">Install CreatorKit</span>
                <span className="px-1 py-0.2 bg-[#FFE500] border border-black text-[9px] font-bold">PWA</span>
              </div>
              <p className="text-[10.5px] text-stone-600 leading-snug mt-0.5">
                Install as a native mobile app for instant offline access &amp; full screen tools.
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1 bg-black text-white hover:bg-stone-800 text-[11px] font-bold border border-black shadow-[2px_2px_0_#000] flex items-center gap-1.5 transition-all"
                >
                  <Download size={12} />
                  <span>Install App</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-300 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 text-stone-400 hover:text-black transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari "Add to Home Screen" Visual Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-black">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0_#000] max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-black" />
                <h3 className="font-black text-sm uppercase">Install on iOS Safari</h3>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 hover:bg-stone-100 border border-black">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-2 bg-stone-50 border border-black">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  1
                </span>
                <p className="leading-tight">
                  Tap the <strong className="font-bold inline-flex items-center gap-1 bg-stone-200 px-1 border border-stone-400"><Share size={11} /> Share</strong> button in your Safari bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-stone-50 border border-black">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  2
                </span>
                <p className="leading-tight">
                  Scroll down and tap <strong className="font-bold inline-flex items-center gap-1 bg-stone-200 px-1 border border-stone-400"><PlusSquare size={11} /> Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-stone-50 border border-black">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  3
                </span>
                <p className="leading-tight">
                  Tap <strong className="font-bold text-black">Add</strong> in the top right corner. CreatorKit will appear directly on your home screen!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-black text-white font-bold text-xs border border-black shadow-[2px_2px_0_#000] hover:bg-stone-800 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
