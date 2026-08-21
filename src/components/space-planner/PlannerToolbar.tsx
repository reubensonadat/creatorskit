'client';

import { usePlannerStore } from './store';

export default function PlannerToolbar() {
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const updateObjectRotation = usePlannerStore((s) => s.updateObjectRotation);
  const deleteObject = usePlannerStore((s) => s.deleteObject);
  const clearAll = usePlannerStore((s) => s.clearAll);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const toggleCameraPreview = usePlannerStore((s) => s.toggleCameraPreview);
  const hasMainCamera = placedObjects.some((o) => o.isMainCamera);

  return (
    <div className="hud hud-bc">
      <div className="flex items-center gap-1">
        <button
          className="btn btn-icon"
          title="Reset view"
          onClick={() => setViewMode('perspective')}
        >
          🏠
        </button>
        {selectedObjectId && (
          <>
            <div className="w-px h-5 mx-1 bg-[var(--line)]" />
            <button
              className="btn btn-icon"
              title="Rotate left (R)"
              onClick={() => {
                const obj = placedObjects.find((o) => o.id === selectedObjectId);
                if (obj) updateObjectRotation(obj.id, obj.rotationY - Math.PI / 4);
              }}
            >
              ↺
            </button>
            <button
              className="btn btn-icon"
              title="Rotate right (R)"
              onClick={() => {
                const obj = placedObjects.find((o) => o.id === selectedObjectId);
                if (obj) updateObjectRotation(obj.id, obj.rotationY + Math.PI / 4);
              }}
            >
              ↻
            </button>
            <button
              className="btn btn-icon text-red-500"
              title="Delete (Del)"
              onClick={() => deleteObject(selectedObjectId)}
            >
              ✕
            </button>
          </>
        )}
        <div className="w-px h-5 mx-1 bg-[var(--line)]" />
        <button
          className={`btn btn-icon ${showCameraPreview ? 'active' : ''}`}
          title="Camera preview"
          onClick={toggleCameraPreview}
          disabled={!hasMainCamera}
        >
          📷
        </button>
        <button
          className="btn btn-icon"
          title="Clear all"
          onClick={clearAll}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
