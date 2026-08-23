'use client';

import { usePlannerStore } from './store';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';

export default function InspectorPanel() {
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const updateObjectRotation = usePlannerStore((s) => s.updateObjectRotation);
  const deleteObject = usePlannerStore((s) => s.deleteObject);
  const setMainCamera = usePlannerStore((s) => s.setMainCamera);
  const setObjectParent = usePlannerStore((s) => s.setObjectParent);
  const setObjectElevation = usePlannerStore((s) => s.setObjectElevation);
  const getObjectY = usePlannerStore((s) => s.getObjectY);

  const updateObjectLens = usePlannerStore((s) => s.updateObjectLens);
  const updateObjectLight = usePlannerStore((s) => s.updateObjectLight);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const toggleCameraPreview = usePlannerStore((s) => s.toggleCameraPreview);

  const obj = placedObjects.find((o) => o.id === selectedObjectId);
  if (!obj) {
    return (
      <div className="panel-section">
        <div className="panel-title"><span>Inspector</span></div>
        <div className="text-[11px] text-center py-4 leading-relaxed text-[var(--charcoal-3)]">
          Click an object in the
          3D scene to inspect it.
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
  const isCamera = eq.category === 'camera' || eqId.startsWith('cam') || eqId === 'camera';
  const isLight = eq.category === 'lighting' || eqId.includes('light') || eqId.includes('softbox') || eqId.includes('fresnel') || eqId.includes('tube') || eqId.includes('lamp');

  const light = obj.lightSettings || {
    intensity: 80,
    colorTempKelvin: 5600,
    colorHex: '#FFFFFF',
    beamAngle: 60,
  };

  const currentLens = obj.lensPreset || '24mm';

  const KELVIN_PRESETS = [
    { k: 2700, label: 'Warm 2700K', desc: 'Candle / Amber' },
    { k: 3200, label: 'Tungsten 3200K', desc: 'Warm Halogen' },
    { k: 4500, label: 'Studio 4500K', desc: 'Neutral Balance' },
    { k: 5600, label: 'Daylight 5600K', desc: 'Cinema Standard' },
    { k: 6500, label: 'Cool Sky 6500K', desc: 'Overcast Day' },
  ];

  return (
    <div className="panel-section">
      <div className="panel-title"><span>Inspector</span></div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="item-icon text-base">{eq.icon}</div>
        <div>
          <div className="text-[12px] font-semibold">{eq.name}</div>
          <div className="text-[10px] text-[var(--charcoal-3)]">{eq.description}</div>
        </div>
      </div>

      {/* Position & Height */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="p-1.5 bg-[#f5f2ed] border border-[#e5dfd5]">
          <label className="text-[9px] uppercase tracking-wider text-[var(--charcoal-3)] block font-mono">X Pos</label>
          <div className="text-[11px] font-mono font-bold">{obj.x.toFixed(2)}m</div>
        </div>
        <div className="p-1.5 bg-[#f5f2ed] border border-[#e5dfd5]">
          <label className="text-[9px] uppercase tracking-wider text-[var(--charcoal-3)] block font-mono">Z Pos</label>
          <div className="text-[11px] font-mono font-bold">{obj.z.toFixed(2)}m</div>
        </div>
        <div className="p-1.5 bg-[#f5f2ed] border border-[#e5dfd5]">
          <label className="text-[9px] uppercase tracking-wider text-[var(--charcoal-3)] block font-mono">Elevation</label>
          <div className="text-[11px] font-mono font-bold">{currentY.toFixed(2)}m</div>
        </div>
      </div>

      {/* Camera Specific Controls */}
      {isCamera && (
        <div className="mb-3 p-2 bg-[#fff8eb] border border-[#f5d08a]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#8a5d00] font-mono uppercase">📷 Lens Focal Length</span>
            <span className="text-[9px] font-mono px-1 bg-[#f0c050] text-black font-black">{currentLens}</span>
          </div>

          <div className="grid grid-cols-5 gap-1 mb-2">
            {(['16mm', '24mm', '35mm', '50mm', '85mm'] as const).map((lens) => (
              <button
                key={lens}
                onClick={() => updateObjectLens(obj.id, lens)}
                className={`btn justify-center text-[9px] py-0.5 px-0 font-mono ${currentLens === lens ? 'bg-black text-white' : 'bg-white'}`}
              >
                {lens}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            <button
              className={`btn flex-1 justify-center text-[10px] py-1 ${
                obj.isMainCamera ? 'bg-[#000] text-white' : 'bg-white border-black'
              }`}
              onClick={() => {
                setMainCamera(obj.id);
                toggleCameraPreview();
              }}
            >
              {obj.isMainCamera ? '★ Active Main Cam' : 'Set as Main Cam'}
            </button>
            <button
              className="btn flex-1 justify-center text-[10px] py-1 bg-white border-black font-bold"
              onClick={() => {
                setMainCamera(obj.id);
                setViewMode('camera-pov');
              }}
            >
              Director POV ➔
            </button>
          </div>
        </div>
      )}

      {/* Studio Lighting Controls */}
      {isLight && (
        <div className="mb-3 p-2 bg-[#f0f8ff] border border-[#b8dcff]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#004a8f] font-mono uppercase">💡 Light Specs</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#004a8f] text-white font-bold">{light.intensity}%</span>
          </div>

          {/* Dimmer Slider */}
          <div className="mb-2">
            <div className="flex justify-between text-[9px] font-mono text-[#555] mb-0.5">
              <span>Dimmer / Output</span>
              <span>{light.intensity}%</span>
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

          {/* Kelvin Temperature */}
          <div className="mb-2">
            <div className="flex justify-between text-[9px] font-mono text-[#555] mb-0.5">
              <span>Color Temperature</span>
              <span className="font-bold">{light.colorTempKelvin ?? 5600}K</span>
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
                  className={`btn justify-center text-[8px] py-0.5 px-1 font-mono ${light.colorTempKelvin === kp.k ? 'bg-black text-white' : 'bg-white'}`}
                >
                  {kp.k}K
                </button>
              ))}
            </div>
          </div>

          {/* RGB Accent Color (for tubes / mood lights) */}
          {(obj.equipmentId.includes('tube') || obj.equipmentId.includes('rgb')) && (
            <div className="flex items-center justify-between pt-1 border-t border-[#d0e4f7]">
              <span className="text-[9px] font-mono text-[#555]">RGB Gel Color</span>
              <input
                type="color"
                value={light.colorHex || '#FF0055'}
                onChange={(e) => updateObjectLight(obj.id, { colorHex: e.target.value })}
                className="w-8 h-6 border border-black cursor-pointer p-0"
              />
            </div>
          )}
        </div>
      )}

      {/* Surface / Table Stacking */}
      {!eq.surfaceHeight && (
        <div className="mb-3 p-2 bg-[#fbf9f5] border border-[#e8e2d8]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#333]">Surface Placement</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#eee] font-bold">
              {parentDef ? `On: ${parentDef.name}` : 'Floor Level'}
            </span>
          </div>

          <div className="space-y-1.5">
            {surfaceObjects.length > 0 && (
              <select
                className="w-full text-[10px] font-mono p-1 border border-black bg-white"
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
                      {sDef.icon} {sDef.name} ({sDef.surfaceHeight?.toFixed(2)}m)
                    </option>
                  );
                })}
              </select>
            )}

            {obj.parentId && (
              <button
                className="btn w-full text-[10px] justify-center py-1 bg-white border border-[#ccc]"
                onClick={() => setObjectParent(obj.id, undefined)}
              >
                Drop to Floor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rotation */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--charcoal-3)] block mb-1">Rotation Angle</label>
        <div className="flex gap-1">
          <button
            className="btn flex-1 justify-center py-1 text-[10px]"
            onClick={() => updateObjectRotation(obj.id, obj.rotationY - Math.PI / 4)}
          >
            ↺ 45°
          </button>
          <button
            className="btn flex-1 justify-center py-1 text-[10px]"
            onClick={() => updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4)}
          >
            ↻ 45°
          </button>
          <button
            className="btn flex-1 justify-center py-1 text-[10px]"
            onClick={() => updateObjectRotation(obj.id, obj.rotationY + Math.PI)}
          >
            180°
          </button>
        </div>
        <div className="text-[9px] font-mono text-[var(--charcoal-3)] mt-1">
          Current: {((((obj.rotationY * 180) / Math.PI) % 360) + 360) % 360}°
        </div>
      </div>

      {/* Delete */}
      <button
        className="btn w-full justify-center text-red-600 border-red-200 hover:bg-red-50 py-1 text-[11px]"
        onClick={() => deleteObject(obj.id)}
      >
        ✕ Delete Item
      </button>
    </div>
  );
}
