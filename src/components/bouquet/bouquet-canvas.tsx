'use client';

import React, { forwardRef } from 'react';
import { ArrangedElement } from '@/lib/bouquet/arrangement';

export interface BouquetCanvasProps {
  greeneryLayers: ArrangedElement[];
  flowerLayers: ArrangedElement[];
  showRibbon?: boolean;
  className?: string;
  cardTemplateId?: string;
  note?: {
    to: string;
    message: string;
    from: string;
  };
  onCardClick?: () => void;
}

export const BouquetCanvas = forwardRef<HTMLDivElement, BouquetCanvasProps>(
  (
    {
      greeneryLayers,
      flowerLayers,
      className = '',
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        id="bouquet-canvas-export"
        className={`relative w-full max-w-[500px] aspect-[4/5] rounded-xl overflow-hidden select-none transition-all duration-300 border-2 border-black bg-[#FAF8F5] ${className}`}
        style={{
          boxShadow: '4px 4px 0 #000000',
        }}
      >
        {/* Subtle Ambient Garden Warmth */}
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50 via-transparent to-stone-200/40" />

        {/* Studio watermark tag in top corner */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-xs border border-black rounded font-mono text-[9px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000000]">
          <span>🌿</span>
          <span>BOTANICAL GARDEN</span>
        </div>

        {/* Full Canvas Stage Container */}
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center">
          {/* 1. GRAND GREENERY BACKDROP: Big, lush garden foliage that totally encapsulates the flowers */}
          {greeneryLayers.map((layer) => (
            <div
              key={layer.id}
              className="absolute transition-all duration-500 ease-out pointer-events-none flex items-center justify-center"
              style={{
                left: `calc(50% + ${layer.xPercent}%)`,
                top: `calc(50% + ${layer.yPercent}%)`,
                transform: `translate(-50%, -50%) rotate(${layer.rotationDeg}deg) scale(${layer.scale})`,
                zIndex: layer.zIndex, // 1 to 3
              }}
            >
              <img
                src={layer.item.src}
                alt={layer.item.name}
                loading="eager"
                className="w-[90%] sm:w-[95%] max-w-[470px] aspect-square object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.12)] filter opacity-95"
                draggable={false}
              />
            </div>
          ))}

          {/* 2. NESTLED BLOOMS: Snug, cohesive florist bunch centered right inside the foliage cradle */}
          {flowerLayers.map((layer) => (
            <div
              key={layer.id}
              className="absolute transition-all duration-500 ease-out pointer-events-none flex items-center justify-center"
              style={{
                left: `calc(50% + ${layer.xPercent}%)`,
                top: `calc(50% + ${layer.yPercent}%)`,
                transform: `translate(-50%, -50%) rotate(${layer.rotationDeg}deg) scale(${layer.scale})`,
                zIndex: 20 + layer.zIndex, // strictly above greenery!
              }}
            >
              <div
                className={
                  layer.item.flowerSize === 'big'
                    ? 'w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center'
                    : 'w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center'
                }
              >
                <img
                  src={layer.item.src}
                  alt={layer.item.name}
                  loading="eager"
                  className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(20,10,10,0.24)] filter"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

BouquetCanvas.displayName = 'BouquetCanvas';
