'use client';

import { Suspense, lazy } from 'react';

const SpacePlannerApp = lazy(() => import('@/components/space-planner/SpacePlannerApp'));

export default function SpacePlannerPage() {
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