'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Sliders, ExternalLink, Trash2, Camera, Sun, Move, ShoppingCart } from 'lucide-react';
import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import {
  calculateOpticalFov,
  SENSOR_PROFILES,
  FOCAL_LENGTH_VALUES,
} from '@/lib/space-planner/optical-engine';
import { resolveEquipmentAffiliateInfo } from '@/lib/space-planner/affiliate';
import type { CameraLensPreset, CameraSensorSize, CameraAperture } from './types';

export default function InspectorPanel() {
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const updateObjectRotation = usePlannerStore((s) => s.updateObjectRotation);
  const deleteObject = usePlannerStore((s) => s.deleteObject);
  const setMainCamera = usePlannerStore((s) => s.setMainCamera);
  const setObjectParent = usePlannerStore((s) => s.setObjectParent);
  const getObjectY = usePlannerStore((s) => s.getObjectY);

  const updateObjectLens = usePlannerStore((s) => s.updateObjectLens);
  const updateObjectSensor = usePlannerStore((s) => s.updateObjectSensor);
  const updateObjectAperture = usePlannerStore((s) => s.updateObjectAperture);
  const updateObjectLight = usePlannerStore((s) => s.updateObjectLight);
  const setCustomPrice = usePlannerStore((s) => s.setCustomPrice);
  const currency = usePlannerStore((s) => s.currency);
  const userAffiliateTag = usePlannerStore((s) => s.userAffiliateTag);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const toggleCameraPreview = usePlannerStore((s) => s.toggleCameraPreview);

  // Section collapse states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    optics: true,
    lighting: true,
    transform: true,
    procurement: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const obj = placedObjects.find((o) => o.id === selectedObjectId);
  if (!obj) {
    return (
      <div className="panel-section p-3 border-b border-black">
        <div className="flex items-center justify-between font-black text-xs uppercase tracking-wider text-black mb-2">
          <span>Inspector</span>
          <span className="text-[9px] font-mono text-stone-400">Idle</span>
        </div>
        <div className="text-[11px] text-center py-6 px-2 leading-relaxed text-stone-500 font-mono bg-stone-50 border border-stone-200">
          Click any 3D equipment or camera in the scene to inspect optical specs, lighting controls, and procurement links.
        </div>
      </div>
    );
  }

  const eq = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
  if (!eq) return null;
  const currentY = getObjectY(obj);

  // Available surface/table options
  const surfaceObjects = placedObjects.filter(
    (o) => o.id !== obj.id && COMPREHENSIVE_EQUIPMENT_CATALOG[o.equipmentId]?.surfaceHeight !== undefined
  );
  const parentObj = obj.parentId ? placedObjects.find((o) => o.id === obj.parentId) : null;
  const parentDef = parentObj ? COMPREHENSIVE_EQUIPMENT_CATALOG[parentObj.equipmentId] : null;

  const eqId = typeof obj.equipmentId === 'string' ? obj.equipmentId : '';
  const isCamera = eq.category === 'camera' || eqId.startsWith('cam') || eqId === 'camera' || eqId.includes('phone') || eqId.includes('webcam');
  const isLight = eq.category === 'lighting' || eqId.includes('light') || eqId.includes('softbox') || eqId.includes('fresnel') || eqId.includes('tube') || eqId.includes('lamp');

  const light = obj.lightSettings || {
    intensity: 80,
    colorTempKelvin: 5600,
    colorHex: '#FFFFFF',
    beamAngle: 60,
  };

  const currentLens: CameraLensPreset = obj.lensPreset || '24mm';
  const currentSensor: CameraSensorSize = obj.sensorSize || (eqId.includes('phone') ? 'smartphone' : 'full-frame');
  const currentAperture: CameraAperture = obj.aperture || 'f/2.8';

  const opticalMath = isCamera ? calculateOpticalFov(currentLens, currentSensor) : null;
  const affInfo = resolveEquipmentAffiliateInfo(obj.equipmentId, userAffiliateTag);

  const KELVIN_PRESETS = [
    { k: 2700, label: 'Warm 2700K' },
    { k: 3200, label: 'Tungsten 3200K' },
    { k: 4500, label: 'Studio 4500K' },
    { k: 5600, label: 'Daylight 5600K' },
    { k: 6500, label: 'Cool Sky 6500K' },
  ];

  return (
    <div className="panel-section p-3 border-b border-black space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
          <span>Inspector</span>
        </div>
        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-black text-[#FFE500] font-black">
          {eq.category}
        </span>
      </div>

      {/* Item Headline & Real Brand */}
      <div className="flex items-start gap-2.5 p-2 bg-stone-50 border-2 border-black shadow-[2px_2px_0_#000]">
        <div className="text-[10px] font-mono font-black p-1 bg-white border border-black/30 flex-shrink-0 flex items-center justify-center min-w-10 text-center">
          {eq.category.toUpperCase().slice(0, 4)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-black text-black leading-snug truncate">
            {affInfo.brand} {affInfo.model}
          </div>
          <div className="text-[10px] text-stone-600 line-clamp-2 leading-relaxed">
            {eq.description}
          </div>
          <div className="text-[9px] font-mono text-emerald-800 font-bold mt-0.5">
            ${affInfo.typicalPriceUSD} USD • {eq.watts > 0 ? `${eq.watts}W draw` : '0W passive'}
          </div>
        </div>
      </div>

      {/* Transform & Coordinates Accordion */}
      <div className="border border-black bg-white overflow-hidden shadow-[1.5px_1.5px_0_#000]">
        <button
          onClick={() => toggleSection('transform')}
          className="w-full flex items-center justify-between p-1.5 bg-stone-100 hover:bg-stone-200 text-left border-b border-black/20"
        >
          <div className="flex items-center gap-1 font-bold text-[10px] uppercase text-black">
            <Move size={12} />
            <span>Position & Rotation</span>
          </div>
          {openSections.transform ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.transform && (
          <div className="p-2 space-y-2 bg-white">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="p-1 bg-stone-50 border border-black/20 text-center">
                <label className="text-[8px] uppercase tracking-wider text-stone-500 block font-mono">X Pos</label>
                <div className="text-[10.5px] font-mono font-bold">{obj.x.toFixed(2)}m</div>
              </div>
              <div className="p-1 bg-stone-50 border border-black/20 text-center">
                <label className="text-[8px] uppercase tracking-wider text-stone-500 block font-mono">Z Pos</label>
                <div className="text-[10.5px] font-mono font-bold">{obj.z.toFixed(2)}m</div>
              </div>
              <div className="p-1 bg-stone-50 border border-black/20 text-center">
                <label className="text-[8px] uppercase tracking-wider text-stone-500 block font-mono">Elevation</label>
                <div className="text-[10.5px] font-mono font-bold">{currentY.toFixed(2)}m</div>
              </div>
            </div>

            {/* Rotation Buttons */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-stone-600 block">Rotate Y-Axis</label>
              <div className="flex gap-1">
                <button
                  className="btn flex-1 justify-center py-1 text-[9.5px] font-mono font-bold bg-white hover:bg-stone-100 border border-black"
                  onClick={() => updateObjectRotation(obj.id, obj.rotationY - Math.PI / 4)}
                >
                  ↺ 45°
                </button>
                <button
                  className="btn flex-1 justify-center py-1 text-[9.5px] font-mono font-bold bg-white hover:bg-stone-100 border border-black"
                  onClick={() => updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4)}
                >
                  ↻ 45°
                </button>
                <button
                  className="btn flex-1 justify-center py-1 text-[9.5px] font-mono font-bold bg-white hover:bg-stone-100 border border-black"
                  onClick={() => updateObjectRotation(obj.id, obj.rotationY + Math.PI)}
                >
                  180°
                </button>
              </div>
            </div>

            {/* Surface Placement */}
            {!eq.surfaceHeight && (
              <div className="p-1.5 bg-stone-50 border border-stone-300 space-y-1">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-stone-700">Mount Surface:</span>
                  <span className="font-mono px-1 bg-stone-200 font-bold">
                    {parentDef ? parentDef.name : 'Floor'}
                  </span>
                </div>
                {surfaceObjects.length > 0 && (
                  <select
                    className="w-full text-[9.5px] font-mono p-1 border border-black bg-white"
                    value={obj.parentId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setObjectParent(obj.id, val === '' ? undefined : val);
                    }}
                  >
                    <option value="">Floor Level (0.00m)</option>
                    {surfaceObjects.map((sObj) => {
                      const sDef = COMPREHENSIVE_EQUIPMENT_CATALOG[sObj.equipmentId];
                      if (!sDef) return null;
                      return (
                        <option key={sObj.id} value={sObj.id}>
                          {sDef.name} ({sDef.surfaceHeight?.toFixed(2)}m)
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optical Precision Camera Simulator Accordion */}
      {isCamera && opticalMath && (
        <div className="border-2 border-amber-400 bg-amber-50/60 overflow-hidden shadow-[2px_2px_0_#000]">
          <button
            onClick={() => toggleSection('optics')}
            className="w-full flex items-center justify-between p-1.5 bg-amber-100 hover:bg-amber-200/70 text-left border-b border-amber-400"
          >
            <div className="flex items-center gap-1 font-black text-[10.5px] uppercase text-amber-950">
              <Camera size={13} />
              <span>Camera Optics & FOV</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono px-1 py-0.5 bg-amber-400 text-black font-black">
                {opticalMath.horizontalFovDegrees}° H-FOV
              </span>
              {openSections.optics ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </div>
          </button>

          {openSections.optics && (
            <div className="p-2 space-y-2 bg-amber-50/30">
              {/* Focal Length Selector */}
              <div>
                <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-1">
                  <span>Focal Length</span>
                  <span className="font-bold text-black">{currentLens} ({opticalMath.effectiveFocalLengthMm.toFixed(0)}mm Eq.)</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {(['16mm', '24mm', '35mm', '50mm', '85mm', '105mm'] as CameraLensPreset[]).map((lens) => (
                    <button
                      key={lens}
                      onClick={() => updateObjectLens(obj.id, lens)}
                      className={`btn justify-center text-[8.5px] py-1 px-0 font-mono font-bold border border-black ${
                        currentLens === lens ? 'bg-black text-[#FFE500]' : 'bg-white hover:bg-amber-100 text-black'
                      }`}
                    >
                      {lens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensor Size Profile */}
              <div>
                <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-1">
                  <span>Sensor Format</span>
                  <span className="font-bold text-black">{SENSOR_PROFILES[currentSensor]?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                  {(Object.keys(SENSOR_PROFILES) as CameraSensorSize[]).map((sensor) => (
                    <button
                      key={sensor}
                      onClick={() => updateObjectSensor(obj.id, sensor)}
                      className={`btn justify-center py-1 px-1 text-[8.5px] font-bold border border-black truncate ${
                        currentSensor === sensor ? 'bg-black text-white' : 'bg-white text-stone-800'
                      }`}
                    >
                      {sensor === 'full-frame' ? 'Full-Frame (1.0x)' : sensor === 'aps-c' ? 'APS-C (1.5x)' : sensor === 'micro-four-thirds' ? 'MFT (2.0x)' : 'Phone (5.5x)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Framing Analysis Box */}
              <div className="p-1.5 bg-white border border-amber-300 text-[9px] font-mono text-stone-700 space-y-1">
                <div className="text-black font-bold">
                  Classification: <span className="text-amber-800">{opticalMath.shotClassification}</span>
                </div>
                <div className="text-stone-600">
                  Optimal Distance: <strong className="text-black">{opticalMath.idealSubjectDistanceM.ideal}m</strong> (Range: {opticalMath.idealSubjectDistanceM.min}–{opticalMath.idealSubjectDistanceM.max}m)
                </div>
              </div>

              {/* Camera POV Buttons */}
              <div className="flex gap-1.5 pt-0.5">
                <button
                  className={`btn flex-1 justify-center text-[10px] py-1.5 font-bold border border-black ${
                    obj.isMainCamera ? 'bg-black text-[#FFE500]' : 'bg-white text-black'
                  }`}
                  onClick={() => {
                    setMainCamera(obj.id);
                    toggleCameraPreview();
                  }}
                >
                  {obj.isMainCamera ? 'Active Cam' : 'Set Active'}
                </button>
                <button
                  className="btn flex-1 justify-center text-[10px] py-1.5 bg-black hover:bg-stone-800 text-white font-bold border border-black shadow-[1.5px_1.5px_0_#000]"
                  onClick={() => {
                    setMainCamera(obj.id);
                    setViewMode('camera-pov');
                  }}
                >
                  Director POV
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Studio Lighting Controls Accordion */}
      {isLight && (
        <div className="border-2 border-blue-400 bg-blue-50/60 overflow-hidden shadow-[2px_2px_0_#000]">
          <button
            onClick={() => toggleSection('lighting')}
            className="w-full flex items-center justify-between p-1.5 bg-blue-100 hover:bg-blue-200/70 text-left border-b border-blue-400"
          >
            <div className="flex items-center gap-1 font-black text-[10.5px] uppercase text-blue-950">
              <Sun size={13} />
              <span>Lighting & Kelvin CCT</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono px-1 py-0.5 bg-blue-600 text-white font-bold">
                {light.intensity}% • {light.colorTempKelvin ?? 5600}K
              </span>
              {openSections.lighting ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </div>
          </button>

          {openSections.lighting && (
            <div className="p-2 space-y-2 bg-blue-50/30">
              <div>
                <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-0.5">
                  <span>Dimmer Output</span>
                  <span className="font-bold text-black">{light.intensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={light.intensity}
                  onChange={(e) => updateObjectLight(obj.id, { intensity: parseInt(e.target.value, 10) })}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-0.5">
                  <span>Color Temperature (CCT)</span>
                  <span className="font-bold text-black">{light.colorTempKelvin ?? 5600}K</span>
                </div>
                <input
                  type="range"
                  min={2700}
                  max={6500}
                  step={100}
                  value={light.colorTempKelvin ?? 5600}
                  onChange={(e) => updateObjectLight(obj.id, { colorTempKelvin: parseInt(e.target.value, 10) })}
                  className="w-full cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, #ffb154, #ffe4ce, #ffffff, #d3e8ff)',
                    height: 6,
                    borderRadius: 3,
                  }}
                />
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {KELVIN_PRESETS.slice(1, 4).map((kp) => (
                    <button
                      key={kp.k}
                      onClick={() => updateObjectLight(obj.id, { colorTempKelvin: kp.k })}
                      className={`btn justify-center text-[8px] py-0.5 px-1 font-mono border border-black ${
                        light.colorTempKelvin === kp.k ? 'bg-black text-white font-bold' : 'bg-white'
                      }`}
                    >
                      {kp.k}K
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Procurement & Buy Links Accordion */}
      <div className="border-2 border-emerald-500 bg-emerald-50/60 overflow-hidden shadow-[2px_2px_0_#000]">
        <button
          onClick={() => toggleSection('procurement')}
          className="w-full flex items-center justify-between p-1.5 bg-emerald-100 hover:bg-emerald-200/70 text-left border-b border-emerald-500"
        >
          <div className="flex items-center gap-1 font-black text-[10.5px] uppercase text-emerald-950">
            <ShoppingCart size={13} />
            <span>Procurement & Hardware Buy</span>
          </div>
          {openSections.procurement ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.procurement && (
          <div className="p-2 space-y-1.5 bg-emerald-50/30">
            <div className="text-[9.5px] text-stone-600 leading-snug">
              Verified {affInfo.brand} equipment listings from certified creator retailers:
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <a
                href={affInfo.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn justify-center text-[9.5px] py-1 bg-[#FF9900] hover:bg-[#e88b00] text-black font-black border border-black shadow-[1px_1px_0_#000] flex items-center gap-1"
              >
                <span>Amazon</span>
                <ExternalLink size={10} />
              </a>
              <a
                href={affInfo.bhPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn justify-center text-[9.5px] py-1 bg-white hover:bg-stone-100 text-black font-bold border border-black shadow-[1px_1px_0_#000] flex items-center gap-1"
              >
                <span>B&H Photo</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Delete Item */}
      <button
        className="btn w-full justify-center text-red-600 border-2 border-red-400 bg-red-50 hover:bg-red-100 py-1.5 text-[11px] font-bold flex items-center gap-1.5 shadow-[1px_1px_0_#000]"
        onClick={() => deleteObject(obj.id)}
      >
        <Trash2 size={13} />
        <span>Delete Placed Item</span>
      </button>
    </div>
  );
}
