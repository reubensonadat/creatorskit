'use client';

import { Suspense, lazy, useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, ChevronLeft } from 'lucide-react';

const SpacePlannerApp = lazy(() => import('@/components/space-planner/SpacePlannerApp'));

function SmallScreenWarning() {
  return (
    <div className="flex items-center justify-center h-screen bg-white px-6">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 border-2 border-black flex items-center justify-center">
            <Monitor size={28} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-lg font-bold text-black mb-2" style={{ fontFamily: 'monospace' }}>
          Desktop or Tablet Required
        </h1>
        <p className="text-sm text-black/50 mb-6 leading-relaxed">
          The 3D Space Planner needs a larger screen to work properly. Please open this page on a desktop computer or tablet (768px+ wide).
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold font-mono bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors"
        >
          ‹ HOME
        </Link>
      </div>
    </div>
  );
}

export default function SpacePlannerPage() {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const check = () => setIsLargeScreen(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isLargeScreen) return <SmallScreenWarning />;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#F5F1EA]">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">🎬</div>
            <div className="text-sm text-[#6B6863]">Loading Creator Space Planner...</div>
          </div>
        </div>
      }
    >
      <SpacePlannerApp />
    </Suspense>
  );
}