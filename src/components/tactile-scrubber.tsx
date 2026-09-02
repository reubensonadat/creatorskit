'use client';

import React, { useRef, useCallback } from 'react';

export interface TactileScrubberPreset {
  label: string;
  value: number;
}

export interface TactileScrubberProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  stepDelta?: number;
  onChange: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
  presets?: (TactileScrubberPreset | number)[];
  presetsLayout?: 'inline' | 'below';
  width?: number | string;
  height?: number;
  fillColor?: string;
  showSteppers?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function TactileScrubber({
  value,
  min,
  max,
  step,
  stepDelta,
  onChange,
  label,
  formatValue,
  presets,
  presetsLayout = 'inline',
  width = '100%',
  height = 15,
  fillColor = '#FFE500',
  showSteppers = true,
  className,
  style,
}: TactileScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const delta = stepDelta || step || (max - min) / 10;

  const clampAndRound = useCallback(
    (rawVal: number) => {
      let clamped = Math.max(min, Math.min(max, rawVal));
      if (step !== undefined && step > 0) {
        const steps = Math.round((clamped - min) / step);
        clamped = min + steps * step;
      }
      // Fix float rounding issues (e.g. 0.8500000000000001)
      const precision = step ? `${step}`.split('.')[1]?.length || 0 : 3;
      return parseFloat(clamped.toFixed(precision));
    },
    [min, max, step]
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      onChange(clampAndRound(raw));
    },
    [min, max, clampAndRound, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updateFromClientX(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => {
      updateFromClientX(moveEvent.clientX);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    updateFromClientX(e.touches[0].clientX);
    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      updateFromClientX(moveEvent.touches[0].clientX);
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const displayString = formatValue
    ? formatValue(value)
    : step && step >= 1
    ? `${Math.round(value)}`
    : `${value}`;

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const renderPresets = () => {
    if (!presets || presets.length === 0) return null;

    return (
      <div
        style={{
          display: 'flex',
          border: '1.5px solid #000',
          background: '#fff',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '1.5px 1.5px 0 #000',
          flexShrink: 0,
          width: presetsLayout === 'below' ? '100%' : 'auto',
        }}
      >
        {presets.map((preset, idx) => {
          const pVal = typeof preset === 'number' ? preset : preset.value;
          const pLabel = typeof preset === 'number' ? `${preset}` : preset.label;
          const isSelected = Math.abs(value - pVal) < 0.001;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(pVal)}
              style={{
                flex: presetsLayout === 'below' ? 1 : 'none',
                padding: '4px 6px',
                border: 'none',
                borderRight: idx !== presets.length - 1 ? '1px solid #000' : 'none',
                background: isSelected ? '#000' : '#fff',
                color: isSelected ? fillColor : '#000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.62rem',
                cursor: 'pointer',
                transition: 'all 0.1s',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {pLabel}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: typeof width === 'number' ? `${width}px` : width,
        ...style,
      }}
    >
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              color: '#000',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              fontFamily: 'monospace',
              fontWeight: 900,
              background: fillColor,
              padding: '1px 5px',
              border: '1.5px solid #000',
              borderRadius: 3,
              color: '#000',
              minWidth: 36,
              textAlign: 'center',
            }}
          >
            {displayString}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: presetsLayout === 'below' ? 'column' : 'row',
          alignItems: presetsLayout === 'below' ? 'stretch' : 'center',
          gap: 6,
        }}
      >
        {/* Capsule Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#fff',
            padding: '3px 6px',
            border: '2px solid #000',
            borderRadius: 4,
            boxShadow: '2px 2px 0 #000',
          }}
        >
          {showSteppers && (
            <button
              type="button"
              onClick={() => onChange(clampAndRound(value - delta))}
              style={{
                width: 19,
                height: 19,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #000',
                background: '#fff',
                fontSize: '0.75rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                cursor: 'pointer',
                borderRadius: 2,
                padding: 0,
                color: '#000',
              }}
              title="Decrease value"
            >
              -
            </button>
          )}

          {/* Drag Track */}
          <div
            ref={trackRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
              position: 'relative',
              flex: 1,
              height,
              background: '#e5e7eb',
              border: '1.5px solid #000',
              borderRadius: 3,
              cursor: 'ew-resize',
              overflow: 'hidden',
              userSelect: 'none',
            }}
            title="Click or drag to adjust"
          >
            {/* Progress Fill */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                background: fillColor,
                borderRight: pct > 0 && pct < 100 ? '1.5px solid #000' : 'none',
              }}
            />

            {/* Tactile Gauge Grip Grooves */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                pointerEvents: 'none',
                opacity: 0.3,
              }}
            >
              <div style={{ width: 1, height: Math.max(4, height - 6), background: '#000' }} />
              <div style={{ width: 1, height: Math.max(4, height - 6), background: '#000' }} />
              <div style={{ width: 1, height: Math.max(4, height - 6), background: '#000' }} />
              <div style={{ width: 1, height: Math.max(4, height - 6), background: '#000' }} />
            </div>
          </div>

          {showSteppers && (
            <button
              type="button"
              onClick={() => onChange(clampAndRound(value + delta))}
              style={{
                width: 19,
                height: 19,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #000',
                background: '#fff',
                fontSize: '0.75rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                cursor: 'pointer',
                borderRadius: 2,
                padding: 0,
                color: '#000',
              }}
              title="Increase value"
            >
              +
            </button>
          )}

          {!label && (
            <span
              style={{
                fontSize: '0.66rem',
                fontFamily: 'monospace',
                fontWeight: 900,
                background: fillColor,
                padding: '1px 5px',
                border: '1.5px solid #000',
                borderRadius: 3,
                color: '#000',
                minWidth: 38,
                textAlign: 'center',
              }}
            >
              {displayString}
            </span>
          )}
        </div>

        {/* Optional Presets */}
        {renderPresets()}
      </div>
    </div>
  );
}

export default TactileScrubber;
