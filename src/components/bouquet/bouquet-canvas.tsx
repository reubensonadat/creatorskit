'use client';

import React, { forwardRef } from 'react';
import { ArrangedElement } from '@/lib/bouquet/arrangement';

export interface BouquetCanvasProps {
  greeneryLayers: ArrangedElement[];
  flowerLayers: ArrangedElement[];
  showRibbon?: boolean;
  borderless?: boolean;
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
      borderless = false,
      className = '',
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        id="bouquet-canvas-export"
        className={`relative max-w-full max-h-full aspect-[4/5] overflow-hidden select-none transition-all duration-300 flex items-center justify-center ${
          borderless
            ? 'bg-transparent'
            : 'rounded-2xl border-2 border-black bg-[#FAF8F5] shadow-[6px_6px_0_#000000]'
        } ${className}`}
      >
        {/* Subtle Ambient Garden Warmth */}
        {!borderless && (
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50/80 via-transparent to-stone-200/50" />
        )}

        {/* Full Canvas Stage Container */}
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center p-2">
          {/* 1. GRAND GREENERY BACKDROP: Big, lush garden foliage that encapsulates the flowers */}
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
                className={
                  layer.item.greenerySize === 'small'
                    ? 'w-full max-w-[420px] sm:max-w-[460px] md:max-w-[480px] aspect-square object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] filter opacity-95'
                    : 'w-full max-w-[580px] md:max-w-[650px] aspect-square object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.15)] filter opacity-95'
                }
                draggable={false}
              />
            </div>
          ))}

          {/* 2. NESTLED BLOOMS: Generous, crisp floral bunch centered inside foliage */}
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
                    ? 'w-36 h-36 sm:w-44 sm:h-44 md:w-50 md:h-50 flex items-center justify-center'
                    : 'w-22 h-22 sm:w-26 sm:h-26 md:w-28 md:h-28 flex items-center justify-center'
                }
              >
                <img
                  src={layer.item.src}
                  alt={layer.item.name}
                  loading="eager"
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(20,10,10,0.26)] filter"
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
