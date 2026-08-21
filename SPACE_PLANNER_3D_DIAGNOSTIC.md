# Space Planner 3D Diagnostic (Do Not Push)

Date: 2026-08-21

This document captures what is currently going wrong with 3D rendering and camera behavior in the space planner, based on code inspection and the latest screenshot.

## Confirmed user-visible symptoms

- Scene appears visually broken or "1D" instead of readable 3D.
- Tripods and stands look like they have extra disconnected rods/legs.
- Camera movement feels limited or temporarily locked.
- Scene can become overloaded with duplicated objects (example seen: 224 items).
- Lighting/post effects make silhouettes muddy and details hard to read.

## Root causes in code

### 1) Save hydration duplication and runaway object count

Primary impact: severe clutter, overlapping meshes, fake-looking "extra legs", poor performance.

- In older behavior, saved objects were re-added by calling placeObject repeatedly during hydration, which can duplicate data across repeated mounts/hydration cycles.
- Current file now shows a guard and replacement path:
  - hasHydratedRef mount guard in SpacePlannerApp.
  - replacePlacedObjects usage to restore exact object arrays.

Relevant code locations:
- src/components/space-planner/SpacePlannerApp.tsx:23
- src/components/space-planner/SpacePlannerApp.tsx:73
- src/components/space-planner/SpacePlannerApp.tsx:87
- src/components/space-planner/SpacePlannerApp.tsx:101
- src/components/space-planner/store.ts:53
- src/components/space-planner/store.ts:140

Why it looks like many extra tripod legs:
- If one tripod model is duplicated many times in almost the same position, the thin cylinders from each model overlap and appear as random disconnected lines.

### 2) Thin geometry + shadows create speckle and detached-line artifacts

Primary impact: tripod/chair/stand parts look disconnected and noisy.

- Many models use very thin cylinders and tiny decorative parts.
- Tiny parts cast harsh micro-shadows and aliasing artifacts at distance.

Relevant code locations:
- src/components/space-planner/equipment.ts:931 (tripod model)
- src/components/space-planner/equipment.ts:571 (small slider legs)
- src/components/space-planner/PlannerCanvas.tsx:240 (tiny-part shadow filtering threshold)

### 3) Exposure + bloom + fog stack flattening depth cues

Primary impact: details are washed/gray, perceived depth drops, geometry edges blur.

- ACES tone mapping exposure is relatively high.
- Bloom pass is enabled globally.
- Fog is active across room depth.

Relevant code locations:
- src/components/space-planner/PlannerCanvas.tsx:489
- src/components/space-planner/PlannerCanvas.tsx:496

### 4) Camera controls are intentionally constrained and sometimes temporarily disabled

Primary impact: user feels camera cannot move freely.

- Orbit control vertical angle is capped below horizontal crossing.
- During view transitions controls are disabled until animation completes.

Relevant code locations:
- src/components/space-planner/PlannerCanvas.tsx:513
- src/components/space-planner/PlannerCanvas.tsx:388
- src/components/space-planner/PlannerCanvas.tsx:402

Practical effect:
- Rapid toggles or ongoing transitions can feel like camera lock.
- With dense scene + low FPS, lock windows feel longer than intended.

### 5) Top view configuration can read as flat/1D

Primary impact: user perception that items have no volume in top mode.

- Top camera is very high with near-overhead look and narrow depth cues.
- Combined with bloom/fog/exposure, this reduces shape legibility.

Relevant code location:
- src/components/space-planner/PlannerCanvas.tsx (transitionView top preset block around lines 367-381)

## Why the screenshot looked especially bad

The screenshot shows all failure modes at once:
- Duplicated asset population (224 objects) causing heavy overlap.
- High density of thin rods (tripods/stands/chair bases) creating a "spider web" look.
- Lighting and postprocessing softening contrast and depth edges.

## Safe rollback options (no push)

Choose one path depending on what you want to keep.

### Option A: Keep all files, clear corrupted saved scene data

Use browser storage cleanup to remove duplicated saved layout.
- Storage key: creator-space-planner-save
- Code reference: src/lib/space-planner/storage.ts:17

Result:
- Keeps code edits.
- Resets planner scene data so duplicated items disappear.

### Option B: Keep your own work, discard only planner-related edits

Use targeted restore for planner files only, then re-apply known-good fixes intentionally.

Suggested target files:
- src/components/space-planner/PlannerCanvas.tsx
- src/components/space-planner/SpacePlannerApp.tsx
- src/components/space-planner/store.ts
- src/components/space-planner/equipment.ts

### Option C: Full working-tree rollback to last commit

Use only if you want to discard all uncommitted edits in the repository.

## Recommended recovery sequence

1. Stop dev server.
2. Clear local saved scene key creator-space-planner-save.
3. Reload planner and confirm item count is realistic.
4. Validate camera movement in perspective mode first.
5. Re-introduce rendering tweaks gradually (one at a time):
   - shadow quality
n   - exposure
   - bloom
   - model-detail thresholds

## Current repository state note

As of this snapshot, the working tree has many modified files and should not be pushed until rollback strategy is chosen and validated.
