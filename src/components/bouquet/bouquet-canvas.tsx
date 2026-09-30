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
  onPromptClick?: () => void;
}

export const BouquetCanvas = forwardRef<HTMLDivElement, BouquetCanvasProps>(
  (
    {
      greeneryLayers,
      flowerLayers,
      borderless = false,
      className = '',
      onPromptClick,
    },
    ref
  ) => {
    const hasGreenery = greeneryLayers.length > 0;
    const hasFlowers = flowerLayers.length > 0;
    const hasSelection = hasGreenery || hasFlowers;

    // Background box: only on desktop when completely empty and not borderless.
    // Immediately disappears the second foliage or flowers are selected!
    const showBoxBg = !hasSelection && !borderless;

    return (
      <div
        ref={ref}
        id="bouquet-canvas-export"
        className={`relative max-w-full max-h-full aspect-[4/5] overflow-hidden select-none transition-all duration-300 flex items-center justify-center ${
          showBoxBg
            ? 'border-0 bg-transparent shadow-none md:border-2 md:border-black md:bg-[#FAF8F5] md:shadow-[6px_6px_0_#000]'
            : 'bg-transparent border-0 shadow-none'
        } ${className}`}
      >
        {/* Subtle Ambient Garden Warmth & Fine Paper Texture (desktop empty box mode only) */}
        {showBoxBg && (
          <>
            <div className="hidden md:block absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50/70 via-transparent to-stone-200/50" />
            
            {/* Fine Archival Corner Crop Marks (desktop only) */}
            <span className="hidden md:block absolute top-2.5 left-3 text-stone-400 font-mono text-[12px] leading-none select-none pointer-events-none">⌜</span>
            <span className="hidden md:block absolute top-2.5 right-3 text-stone-400 font-mono text-[12px] leading-none select-none pointer-events-none">⌝</span>
            <span className="hidden md:block absolute bottom-2.5 left-3 text-stone-400 font-mono text-[12px] leading-none select-none pointer-events-none">⌞</span>
            <span className="hidden md:block absolute bottom-2.5 right-3 text-stone-400 font-mono text-[12px] leading-none select-none pointer-events-none">⌟</span>
          </>
        )}

        {/* Full Canvas Stage Container */}
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center p-2">
          {/* Prompt when completely empty: Subtle clean label in center */}
          {!hasSelection && (
            <div
              onClick={onPromptClick}
              className="absolute pointer-events-auto cursor-pointer flex flex-col items-center justify-center transition-all duration-300 group z-30"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="font-mono text-[10px] text-stone-400 group-hover:text-stone-700 tracking-[0.24em] uppercase font-bold transition-colors select-none py-1.5 px-3 border border-dashed border-stone-300 group-hover:border-stone-500">
                select a foliage
              </span>
            </div>
          )}

          {/* 1. GRAND GREENERY BACKDROP: Only the user's selected foliage */}
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

          {/* 2. NESTLED BLOOMS: Only the user's selected blooms */}
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
                    ? 'w-30 h-30 sm:w-36 sm:h-36 md:w-40 md:h-40 flex items-center justify-center'
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
