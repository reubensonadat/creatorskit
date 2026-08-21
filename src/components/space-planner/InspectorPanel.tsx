'use client';

import { usePlannerStore } from './store';
import { EQUIPMENT_CATALOG } from './equipment';

export default function InspectorPanel() {
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const updateObjectRotation = usePlannerStore((s) => s.updateObjectRotation);
  const deleteObject = usePlannerStore((s) => s.deleteObject);
  const setMainCamera = usePlannerStore((s) => s.setMainCamera);

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

  const eq = EQUIPMENT_CATALOG[obj.equipmentId];

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

      {/* Position */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-[var(--charcoal-3)]">X Position</label>
          <div className="text-[12px] font-mono font-semibold">{obj.x.toFixed(2)}m</div>
        </div>
        <div>
          <label className="text-[10px] text-[var(--charcoal-3)]">Z Position</label>
          <div className="text-[12px] font-mono font-semibold">{obj.z.toFixed(2)}m</div>
        </div>
      </div>

      {/* Rotation */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--charcoal-3)] block mb-1">Rotation</label>
        <div className="flex gap-1">
          <button
            className="btn flex-1 justify-center"
            onClick={() => updateObjectRotation(obj.id, obj.rotationY - Math.PI / 4)}
          >
            ↺ 45°
          </button>
          <button
            className="btn flex-1 justify-center"
            onClick={() => updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4)}
          >
            ↻ 45°
          </button>
        </div>
        <div className="text-[10px] font-mono text-[var(--charcoal-3)] mt-1">
          {((obj.rotationY * 180 / Math.PI) % 360).toFixed(0)}°
        </div>
      </div>

      {/* Main camera toggle (only for camera equipment) */}
      {obj.equipmentId === 'camera' && (
        <div className="mb-3">
          <button
            className={`btn w-full justify-center ${obj.isMainCamera ? 'active' : ''}`}
            onClick={() => setMainCamera(obj.id)}
          >
            {obj.isMainCamera ? '★ Main Camera' : 'Set as Main Camera'}
          </button>
        </div>
      )}

      {/* Delete */}
      <button
        className="btn w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => deleteObject(obj.id)}
      >
            ✕  Delete
      </button>
    </div>
  );
}
