'use client';

import React, { useState } from 'react';
import { usePlannerStore } from './store';
import { calculateLightingRatio } from '@/lib/space-planner/lighting-engine';

export default function LightingBalanceHUD() {
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const updateObjectLight = usePlannerStore((s) => s.updateObjectLight);
  const [isOpen, setIsOpen] = useState(true);

  const analysis = calculateLightingRatio(placedObjects);

  // Apply Lighting Presets to scene lights
  const applyPreset = (preset: 'hollywood' | 'beauty' | 'noir' | 'cyberpunk' | 'golden') => {
    const lights = placedObjects.filter((o) =>
      o.equipmentId.includes('light') ||
      o.equipmentId.includes('softbox') ||
      o.equipmentId.includes('fresnel') ||
      o.equipmentId.includes('tube') ||
      o.equipmentId.includes('lamp')
    );

    if (lights.length === 0) return;

    if (preset === 'hollywood') {
      // Key: 100% 5600K, Fill: 50% 4500K, Rim: 75% 6500K
      if (lights[0]) updateObjectLight(lights[0].id, { intensity: 100, colorTempKelvin: 5600, beamAngle: 60, role: 'key' });
      if (lights[1]) updateObjectLight(lights[1].id, { intensity: 50, colorTempKelvin: 4500, beamAngle: 90, role: 'fill' });
      if (lights[2]) updateObjectLight(lights[2].id, { intensity: 75, colorTempKelvin: 6500, beamAngle: 30, role: 'rim' });
    } else if (preset === 'beauty') {
      // High-Key Flat: 95% Key, 90% Fill, 5600K Clean White
      if (lights[0]) updateObjectLight(lights[0].id, { intensity: 95, colorTempKelvin: 5600, beamAngle: 90, role: 'key' });
      if (lights[1]) updateObjectLight(lights[1].id, { intensity: 90, colorTempKelvin: 5600, beamAngle: 90, role: 'fill' });
      if (lights[2]) updateObjectLight(lights[2].id, { intensity: 60, colorTempKelvin: 5600, beamAngle: 60, role: 'rim' });
    } else if (preset === 'noir') {
      // Hard Dramatic: 100% Key Spot, 15% Fill, 3200K Warm Tungsten
      if (lights[0]) updateObjectLight(lights[0].id, { intensity: 100, colorTempKelvin: 3200, beamAngle: 25, role: 'key' });
      if (lights[1]) updateObjectLight(lights[1].id, { intensity: 15, colorTempKelvin: 3200, beamAngle: 60, role: 'fill' });
      if (lights[2]) updateObjectLight(lights[2].id, { intensity: 90, colorTempKelvin: 3200, beamAngle: 20, role: 'rim' });
    } else if (preset === 'cyberpunk') {
      // Dual RGB Gel Mood: Magenta Key + Cyan Rim
      if (lights[0]) updateObjectLight(lights[0].id, { intensity: 90, colorHex: '#ff007f', role: 'key' });
      if (lights[1]) updateObjectLight(lights[1].id, { intensity: 40, colorHex: '#00f0ff', role: 'fill' });
      if (lights[2]) updateObjectLight(lights[2].id, { intensity: 100, colorHex: '#00f0ff', role: 'rim' });
    } else if (preset === 'golden') {
      // Warm Amber Sunset: 2700K Key + 3000K Soft Fill
      if (lights[0]) updateObjectLight(lights[0].id, { intensity: 95, colorTempKelvin: 2700, beamAngle: 45, role: 'key' });
      if (lights[1]) updateObjectLight(lights[1].id, { intensity: 45, colorTempKelvin: 3000, beamAngle: 80, role: 'fill' });
      if (lights[2]) updateObjectLight(lights[2].id, { intensity: 80, colorTempKelvin: 2400, beamAngle: 35, role: 'rim' });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: '#FFDD00',
          border: '2px solid #000',
          boxShadow: '3px 3px 0 #000',
          padding: '6px 12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 30,
        }}
      >
        <span>💡 LIGHT BALANCE</span>
        <span style={{ background: '#000', color: '#fff', padding: '1px 5px', fontSize: '10px' }}>
          {analysis.ratioString}
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 320,
        background: '#ffffff',
        border: '2px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        fontFamily: 'monospace',
        zIndex: 30,
        padding: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#000000',
          color: '#ffffff',
          padding: '6px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '12px' }}>💡</span>
          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em' }}>
            STUDIO LIGHTING ENGINE
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#FFDD00',
            border: '1px solid #fff',
            color: '#000',
            fontWeight: 900,
            fontSize: '10px',
            padding: '1px 5px',
            cursor: 'pointer',
          }}
        >
          ─
        </button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        {/* Top Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#f5f5f5', border: '1.5px solid #000', padding: '6px 8px' }}>
            <div style={{ fontSize: '9px', color: '#666', fontWeight: 800 }}>CONTRAST RATIO</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>
              {analysis.ratioString}
            </div>
          </div>
          <div style={{ background: '#f5f5f5', border: '1.5px solid #000', padding: '6px 8px' }}>
            <div style={{ fontSize: '9px', color: '#666', fontWeight: 800 }}>SUBJECT LUX EST.</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>
              {analysis.totalLuxEstimate} <span style={{ fontSize: '10px' }}>LUX</span>
            </div>
          </div>
        </div>

        {/* Style description */}
        <div
          style={{
            fontSize: '10px',
            fontWeight: 800,
            background: '#FFF9D2',
            border: '1px solid #000',
            padding: '4px 8px',
            marginBottom: 10,
          }}
        >
          {analysis.styleDescription}
        </div>

        {/* 3-Point Light Level Bars */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 800, marginBottom: 2 }}>
            <span>Key Light</span>
            <span>{analysis.keyIntensity}% ({analysis.keyKelvin}K)</span>
          </div>
          <div style={{ height: 6, background: '#eee', border: '1px solid #000', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${analysis.keyIntensity}%`, background: '#FFDD00' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 800, marginBottom: 2 }}>
            <span>Fill Light</span>
            <span>{analysis.fillIntensity}% ({analysis.fillKelvin}K)</span>
          </div>
          <div style={{ height: 6, background: '#eee', border: '1px solid #000', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${analysis.fillIntensity}%`, background: '#60a5fa' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 800, marginBottom: 2 }}>
            <span>Rim / Hair Light</span>
            <span>{analysis.rimIntensity}%</span>
          </div>
          <div style={{ height: 6, background: '#eee', border: '1px solid #000', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${analysis.rimIntensity}%`, background: '#f472b6' }} />
          </div>
        </div>

        {/* Quick Pro Lighting Setups */}
        <div style={{ borderTop: '1.5px solid #000', paddingTop: 8 }}>
          <div style={{ fontSize: '9px', fontWeight: 900, color: '#555', marginBottom: 5 }}>
            QUICK LIGHTING STYLES:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <button
              onClick={() => applyPreset('hollywood')}
              style={{
                background: '#fff',
                border: '1px solid #000',
                padding: '3px 2px',
                fontSize: '8.5px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🎬 3-Point 5600K
            </button>
            <button
              onClick={() => applyPreset('beauty')}
              style={{
                background: '#fff',
                border: '1px solid #000',
                padding: '3px 2px',
                fontSize: '8.5px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              💄 High-Key Soft
            </button>
            <button
              onClick={() => applyPreset('noir')}
              style={{
                background: '#fff',
                border: '1px solid #000',
                padding: '3px 2px',
                fontSize: '8.5px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🕵️ Noir 8:1
            </button>
            <button
              onClick={() => applyPreset('cyberpunk')}
              style={{
                background: '#fff',
                border: '1px solid #000',
                padding: '3px 2px',
                fontSize: '8.5px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🔮 Cyberpunk RGB
            </button>
            <button
              onClick={() => applyPreset('golden')}
              style={{
                background: '#fff',
                border: '1px solid #000',
                padding: '3px 2px',
                fontSize: '8.5px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🌅 Golden 2700K
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
