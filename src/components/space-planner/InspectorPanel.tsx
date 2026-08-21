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

      {/* Main camera toggle */}
      {obj.equipmentId === 'camera' && (
        <div className="mb-3 p-2 bg-[#fff5f2] border border-[#f5c6bb]">
          <div className="text-[10px] font-semibold text-[#c75d3f] mb-1">
            📷 DSLR 4K Camera View
          </div>
          <div className="text-[9px] text-[#666] mb-2 leading-tight">
            16:9 View Frustum projects from lens atop tripod (1.25m height) with floor coverage guide.
          </div>
          <button
            className={`btn w-full justify-center text-[10px] py-1 ${
              obj.isMainCamera ? 'bg-[#000] text-white' : 'bg-white border-black'
            }`}
            onClick={() => setMainCamera(obj.id)}
          >
            {obj.isMainCamera ? '★ Active Main Camera' : 'Set as Main Camera'}
          </button>
        </div>
      )}

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
