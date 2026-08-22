'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { usePlannerStore } from './store';
import { createEquipmentModel, EQUIPMENT_CATALOG } from './equipment';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import type { PlacedObject, ViewMode } from './types';

// ============================================================
// PlannerCanvas — Core Three.js 3D scene
// Handles: room rendering, equipment placement, selection,
// dragging, view switching, camera preview, resize
// ============================================================

// Scene colors
const BG_COLOR = 0xf2f0eb;
const WALL_COLOR = 0xf5f3ee;
const BASEBOARD_COLOR = 0x2a2825;
const ACCENT_COLOR = 0x1a1a1a;
const WINDOW_FRAME_COLOR = 0x222222;
const WINDOW_GLASS_COLOR = 0xb0d4ea;

const SELECTION_OUTLINE_COLOR = 0x000000;
const GHOST_OPACITY = 0.45;
const GRID_COLOR_A = 'rgba(0, 0, 0, 0.04)';
const GRID_COLOR_B = 'rgba(0, 0, 0, 0.08)';

// Procedural high-resolution White Oak Hardwood Parquet floor texture generator
let cachedFloorTexture: THREE.CanvasTexture | null = null;
function getStudioFloorTexture(): THREE.CanvasTexture {
  if (cachedFloorTexture) return cachedFloorTexture;
  if (typeof document === 'undefined') return new THREE.CanvasTexture(document.createElement('canvas'));

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base warm Scandinavian oak tone
  ctx.fillStyle = '#dfd7cc';
  ctx.fillRect(0, 0, 1024, 1024);

  const numRows = 16;
  const plankH = 1024 / numRows;
  const plankW = 256;

  for (let r = 0; r < numRows; r++) {
    const y = r * plankH;
    const offset = (r % 3) * 85;
    for (let x = -plankW + offset; x < 1024 + plankW; x += plankW) {
      // Natural plank lightness and tone variation
      const seed = Math.sin(r * 12.3 + x * 0.05);
      const lightness = 82 + seed * 5 - (r % 2) * 2;
      ctx.fillStyle = `hsl(38, 22%, ${lightness}%)`;
      ctx.fillRect(x, y, plankW - 2, plankH - 2);

      // Fine organic woodgrain striations
      ctx.strokeStyle = `hsla(35, 24%, ${lightness - 8}%, 0.4)`;
      ctx.lineWidth = 1;
      for (let g = 6; g < plankH - 4; g += 7) {
        ctx.beginPath();
        ctx.moveTo(x + 2, y + g);
        ctx.bezierCurveTo(
          x + plankW * 0.35,
          y + g + Math.sin(x + g) * 1.5,
          x + plankW * 0.7,
          y + g - Math.cos(x + g) * 1.5,
          x + plankW - 4,
          y + g
        );
        ctx.stroke();
      }

      // Plank micro-bevel seams
      ctx.strokeStyle = '#c4b7a4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, plankW - 1, plankH - 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedFloorTexture = tex;
  return tex;
}

export default function PlannerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const floorRef = useRef<THREE.Mesh | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const selectionOutlineRef = useRef<THREE.LineSegments | null>(null);
  const cameraFrameRef = useRef<THREE.Group | null>(null);
  const ghostRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const cameraAnimRef = useRef<{ cancel: () => void } | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);

  // Raycasting state
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef<string | null>(null);
  const dragOffsetRef = useRef(new THREE.Vector3());

  // Subscribe to store
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const placingEquipmentId = usePlannerStore((s) => s.placingEquipmentId);
  const viewMode = usePlannerStore((s) => s.viewMode);
  const isOrbitPanning = usePlannerStore((s) => s.isOrbitPanning);
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const showLuxHeatmap = usePlannerStore((s) => s.showLuxHeatmap);
  const windows = usePlannerStore((s) => s.windows);

  const placeObject = usePlannerStore((s) => s.placeObject);
  const updateObjectPosition = usePlannerStore((s) => s.updateObjectPosition);
  const setSelectedObject = usePlannerStore((s) => s.setSelectedObject);
  const setPlacingEquipment = usePlannerStore((s) => s.setPlacingEquipment);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const getObjectY = usePlannerStore((s) => s.getObjectY);

  // Sync auto-rotation / slow cinematic pan with OrbitControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (viewMode === 'perspective' && isOrbitPanning) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.85;
    } else {
      controls.autoRotate = false;
    }
  }, [viewMode, isOrbitPanning]);

  // Register Multi-Angle Studio Snapshot Capture Hook for PDF / Blueprint Export
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__ = () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;

      const origPos = camera.position.clone();
      const origRot = camera.rotation.clone();
      const origFov = camera.fov;
      const origTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0.5, 0);

      // Temporarily hide outer walls so they never obstruct, clip, or block the interior studio view
      const wasRoomVisible = roomGroupRef.current?.visible ?? true;
      if (roomGroupRef.current) {
        roomGroupRef.current.visible = false;
      }

      const angles: Record<string, string> = {};
      const maxDim = Math.max(roomWidth, roomDepth);

      const capture = (x: number, y: number, z: number, tx: number, ty: number, tz: number, fov: number, key: string) => {
        camera.fov = fov;
        camera.position.set(x, y, z);
        camera.lookAt(tx, ty, tz);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        angles[key] = renderer.domElement.toDataURL('image/jpeg', 0.95);
      };

      // 1. Hero 3D Perspective (Unobstructed Isometric Overview)
      capture(roomWidth * 0.9, maxDim * 0.95, roomDepth * 0.95, 0, 0.6, 0, 44, 'hero3D');

      // 2. Front Eye-Level Angle (Looking at stage/desk)
      capture(0, 1.45, roomDepth * 0.85, 0, 0.9, 0, 48, 'front');

      // 3. Left 45-deg Angle
      capture(-roomWidth * 0.85, 1.5, roomDepth * 0.85, 0, 0.85, 0, 48, 'left45');

      // 4. Right 45-deg Angle
      capture(roomWidth * 0.85, 1.5, roomDepth * 0.85, 0, 0.85, 0, 48, 'right45');

      // 5. Top-Down 3D Orthographic View (Actual 3D models viewed directly from above)
      capture(0, maxDim * 1.35, 0.0001, 0, 0, 0, 42, 'top3D');

      // Restore camera & room walls visibility
      camera.fov = origFov;
      camera.position.copy(origPos);
      camera.rotation.copy(origRot);
      camera.updateProjectionMatrix();
      if (roomGroupRef.current) {
        roomGroupRef.current.visible = wasRoomVisible;
      }
      if (controlsRef.current) {
        controlsRef.current.target.copy(origTarget);
        controlsRef.current.update();
      }
      renderer.render(scene, camera);

      return angles;
    };

    return () => {
      delete (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__;
    };
  }, [roomWidth, roomDepth, roomHeight]);

  // ============ Room building ============
  const buildRoom = useCallback((
    scene: THREE.Scene,
    roomGroup: THREE.Group,
    w: number, d: number, h: number,
    wins: typeof windows,
  ) => {
    // Clear old
    roomGroup.clear();

    // High-fidelity Floor with Wood Parquet Texture
    const floorTexture = getStudioFloorTexture().clone();
    floorTexture.repeat.set(w * 1.2, d * 1.2);
    floorTexture.needsUpdate = true;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.42, 
        metalness: 0.05,
        envMapIntensity: 0.6,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    roomGroup.add(floor);
    floorRef.current = floor;

    // Floor precision measurement grid lines (subtle studio guides)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x6e6559, transparent: true, opacity: 0.18 });
    for (let i = -d / 2; i <= d / 2; i += 0.5) {
      const pts = [new THREE.Vector3(-w / 2, 0.002, i), new THREE.Vector3(w / 2, 0.002, i)];
      roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let j = -w / 2; j <= w / 2; j += 0.5) {
      const pts = [new THREE.Vector3(j, 0.002, -d / 2), new THREE.Vector3(j, 0.002, d / 2)];
      roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Walls with warm matte plaster finish
    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.9, metalness: 0.01 });
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), wallMat);
    wallBack.position.set(0, h / 2, -d / 2);
    wallBack.receiveShadow = true;
    roomGroup.add(wallBack);

    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), wallMat);
    wallLeft.position.set(-w / 2, h / 2, 0);
    wallLeft.receiveShadow = true;
    roomGroup.add(wallLeft);

    // Modern Architectural Multi-profile Baseboards
    const baseMat = new THREE.MeshStandardMaterial({ color: BASEBOARD_COLOR, roughness: 0.5, metalness: 0.1 });
    const baseTrimMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.6 });

    // Back wall baseboard
    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.024), baseMat);
    baseBack.position.set(0, 0.045, -d / 2 + 0.072);
    roomGroup.add(baseBack);
    const baseBackCap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, 0.028), baseTrimMat);
    baseBackCap.position.set(0, 0.095, -d / 2 + 0.074);
    roomGroup.add(baseBackCap);

    // Left wall baseboard
    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.09, d), baseMat);
    baseLeft.position.set(-w / 2 + 0.072, 0.045, 0);
    roomGroup.add(baseLeft);
    const baseLeftCap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, d), baseTrimMat);
    baseLeftCap.position.set(-w / 2 + 0.074, 0.095, 0);
    roomGroup.add(baseLeftCap);

    // Render windows from store
    const frameMat = new THREE.MeshStandardMaterial({ color: WINDOW_FRAME_COLOR, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: WINDOW_GLASS_COLOR, 
      transparent: true, 
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
    });

    wins.forEach((win) => {
      if (win.wall === 'back') {
        const xPos = win.xOffset * (w / 2 - 0.5);
        // Glass
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.width, win.height), glassMat);
        glass.position.set(xPos, win.heightOffset, -d / 2 + 0.07);
        roomGroup.add(glass);
        // Frame
        const ft = new THREE.Mesh(new THREE.BoxGeometry(win.width + 0.1, 0.06, 0.04), frameMat);
        ft.position.set(xPos, win.heightOffset + win.height / 2 + 0.03, -d / 2 + 0.08);
        roomGroup.add(ft);
        const fb = new THREE.Mesh(new THREE.BoxGeometry(win.width + 0.1, 0.06, 0.04), frameMat);
        fb.position.set(xPos, win.heightOffset - win.height / 2 - 0.03, -d / 2 + 0.08);
        roomGroup.add(fb);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.06, win.height + 0.12, 0.04), frameMat);
        fl.position.set(xPos - win.width / 2 - 0.03, win.heightOffset, -d / 2 + 0.08);
        roomGroup.add(fl);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, win.height + 0.12, 0.04), frameMat);
        fr.position.set(xPos + win.width / 2 + 0.03, win.heightOffset, -d / 2 + 0.08);
        roomGroup.add(fr);
        // Cross bars
        const ch = new THREE.Mesh(new THREE.BoxGeometry(win.width, 0.03, 0.02), frameMat);
        ch.position.set(xPos, win.heightOffset, -d / 2 + 0.09);
        roomGroup.add(ch);
        const cv = new THREE.Mesh(new THREE.BoxGeometry(0.03, win.height, 0.02), frameMat);
        cv.position.set(xPos, win.heightOffset, -d / 2 + 0.09);
        roomGroup.add(cv);
      } else if (win.wall === 'left') {
        const zPos = win.xOffset * (d / 2 - 0.5);
        // Glass
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.width, win.height), glassMat);
        glass.rotation.y = Math.PI / 2;
        glass.position.set(-w / 2 + 0.07, win.heightOffset, zPos);
        roomGroup.add(glass);
        // Frame
        const ft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, win.width + 0.1), frameMat);
        ft.position.set(-w / 2 + 0.08, win.heightOffset + win.height / 2 + 0.03, zPos);
        roomGroup.add(ft);
        const fb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, win.width + 0.1), frameMat);
        fb.position.set(-w / 2 + 0.08, win.heightOffset - win.height / 2 - 0.03, zPos);
        roomGroup.add(fb);
        const ff = new THREE.Mesh(new THREE.BoxGeometry(0.04, win.height + 0.12, 0.06), frameMat);
        ff.position.set(-w / 2 + 0.08, win.heightOffset, zPos - win.width / 2 - 0.03);
        roomGroup.add(ff);
        const fbb = new THREE.Mesh(new THREE.BoxGeometry(0.04, win.height + 0.12, 0.06), frameMat);
        fbb.position.set(-w / 2 + 0.08, win.heightOffset, zPos + win.width / 2 + 0.03);
        roomGroup.add(fbb);
      }
    });

    // Wall dimension labels (small markers)
    const labelMat = new THREE.MeshBasicMaterial({ color: ACCENT_COLOR, transparent: true, opacity: 0.6 });
    [-w / 2, w / 2].forEach(x => {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.1), labelMat);
      marker.position.set(x, 0.01, d / 2 - 0.15);
      roomGroup.add(marker);
    });
    [-d / 2, d / 2].forEach(z => {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), labelMat);
      marker.position.set(w / 2 - 0.15, 0.01, z);
      roomGroup.add(marker);
    });
  }, []);

  // ============ Sync placed objects to 3D scene ============
  const syncObjects = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(placedObjects.map((o) => o.id));

    // Remove meshes for deleted objects
    objectMeshesRef.current.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        mesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (c.material instanceof THREE.Material) c.material.dispose();
          }
        });
        objectMeshesRef.current.delete(id);
      }
    });

    // Add / update meshes
    placedObjects.forEach((obj) => {
 let mesh = objectMeshesRef.current.get(obj.id);
      if (!mesh) {
        mesh = createEquipmentModel(obj.equipmentId);
        mesh.userData.placedId = obj.id;
        // Tiny mesh parts create noisy shadow speckles; disable their shadow casting.
        mesh.traverse((c) => {
          if (!(c instanceof THREE.Mesh)) return;
          c.geometry.computeBoundingBox();
          const box = c.geometry.boundingBox;
          if (!box) return;
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim < 0.03) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        scene.add(mesh);
        objectMeshesRef.current.set(obj.id, mesh);

        // Animate in
        mesh.scale.set(0.01, 0.01, 0.01);
        const startTime = performance.now();
        const animateIn = () => {
          const t = Math.min(1, (performance.now() - startTime) / 300);
          const eased = 1 - Math.pow(1 - t, 3);
          mesh!.scale.setScalar(0.01 + 0.99 * eased);
          if (t < 1) requestAnimationFrame(animateIn);
        };
        animateIn();
      }

      mesh.position.set(obj.x, getObjectY(obj), obj.z);
      mesh.rotation.y = obj.rotationY;
    });
  }, [placedObjects, getObjectY]);

  // ============ Selection outline ============
  const updateSelection = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old outline
    if (selectionOutlineRef.current) {
      scene.remove(selectionOutlineRef.current);
      selectionOutlineRef.current.geometry?.dispose();
      (selectionOutlineRef.current.material as THREE.Material)?.dispose();
      selectionOutlineRef.current = null;
    }

    if (!selectedObjectId) return;

    const mesh = objectMeshesRef.current.get(selectedObjectId);
    if (!mesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const outlineGeo = new THREE.BoxGeometry(
      Math.max(0.01, size.x + 0.08),
      Math.max(0.01, size.y + 0.08),
      Math.max(0.01, size.z + 0.08)
    );
    const edges = new THREE.EdgesGeometry(outlineGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: SELECTION_OUTLINE_COLOR, linewidth: 2 });
    const outline = new THREE.LineSegments(edges, lineMat);
    outline.position.copy(center);
    scene.add(outline);
    selectionOutlineRef.current = outline;
  }, [selectedObjectId]);

  // ============ Camera frame visualization ============
  const updateCameraFrame = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (cameraFrameRef.current) {
      scene.remove(cameraFrameRef.current);
      cameraFrameRef.current.traverse((c) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      cameraFrameRef.current = null;
    }

    const mainCam =
      placedObjects.find((o) => o.isMainCamera && o.equipmentId === 'camera') ||
      placedObjects.find((o) => o.equipmentId === 'camera');
    if (!mainCam) return;

    const g = new THREE.Group();
    const camBaseY = getObjectY(mainCam);
    g.position.set(mainCam.x, camBaseY, mainCam.z);
    g.rotation.y = mainCam.rotationY;

    // Optical Lens center atop the tripod fluid head (y = 1.25m, forward z = 0.14m)
    const lensY = 1.25;
    const lensZ = 0.14;
    const apex = new THREE.Vector3(0, lensY, lensZ);

    // 16:9 Aspect Ratio Frustum Geometry
    const dNear = 1.0;
    const wNear = 0.45;
    const hNear = wNear * (9 / 16); // ~0.253
    const nTL = new THREE.Vector3(-wNear, lensY + hNear, lensZ + dNear);
    const nTR = new THREE.Vector3(wNear, lensY + hNear, lensZ + dNear);
    const nBR = new THREE.Vector3(wNear, lensY - hNear, lensZ + dNear);
    const nBL = new THREE.Vector3(-wNear, lensY - hNear, lensZ + dNear);

    const dFar = 2.6;
    const wFar = 1.15;
    const hFar = wFar * (9 / 16); // ~0.647
    const fTL = new THREE.Vector3(-wFar, lensY + hFar, lensZ + dFar);
    const fTR = new THREE.Vector3(wFar, lensY + hFar, lensZ + dFar);
    const fBR = new THREE.Vector3(wFar, lensY - hFar, lensZ + dFar);
    const fBL = new THREE.Vector3(-wFar, lensY - hFar, lensZ + dFar);

    const coralColor = 0xc75d3f;
    const frustumMat = new THREE.LineBasicMaterial({ color: coralColor, transparent: true, opacity: 0.85 });
    const subtleMat = new THREE.LineBasicMaterial({ color: 0xdb7b60, transparent: true, opacity: 0.45 });
    const floorMat = new THREE.LineBasicMaterial({ color: 0x4a7a8c, transparent: true, opacity: 0.6 });

    // 1. Four 3D Sightlines from Lens Apex
    [fTL, fTR, fBR, fBL].forEach((corner) => {
      const geo = new THREE.BufferGeometry().setFromPoints([apex, corner]);
      g.add(new THREE.Line(geo, frustumMat));
    });

    // 2. Far 16:9 Framing Rectangle
    const farRectGeo = new THREE.BufferGeometry().setFromPoints([fTL, fTR, fBR, fBL, fTL]);
    g.add(new THREE.Line(farRectGeo, frustumMat));

    // 3. Near Framing Rectangle
    const nearRectGeo = new THREE.BufferGeometry().setFromPoints([nTL, nTR, nBR, nBL, nTL]);
    g.add(new THREE.Line(nearRectGeo, subtleMat));

    // 4. Optical Center Sightline & Center Crosshair at Far Plane
    const centerFar = new THREE.Vector3(0, lensY, lensZ + dFar);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([apex, centerFar]), subtleMat));

    // Rule of thirds grid on far frame
    const thirdX1 = -wFar / 3;
    const thirdX2 = wFar / 3;
    const thirdY1 = lensY - hFar / 3;
    const thirdY2 = lensY + hFar / 3;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(thirdX1, lensY + hFar, lensZ + dFar),
          new THREE.Vector3(thirdX1, lensY - hFar, lensZ + dFar),
        ]),
        subtleMat
      )
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(thirdX2, lensY + hFar, lensZ + dFar),
          new THREE.Vector3(thirdX2, lensY - hFar, lensZ + dFar),
        ]),
        subtleMat
      )
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-wFar, thirdY1, lensZ + dFar),
          new THREE.Vector3(wFar, thirdY1, lensZ + dFar),
        ]),
        subtleMat
      )
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-wFar, thirdY2, lensZ + dFar),
          new THREE.Vector3(wFar, thirdY2, lensZ + dFar),
        ]),
        subtleMat
      )
    );

    // 5. Vertical Drop-lines to Floor (connecting 3D frustum to physical room floor)
    const gBL = new THREE.Vector3(fBL.x, 0.005, fBL.z);
    const gBR = new THREE.Vector3(fBR.x, 0.005, fBR.z);
    const gnBL = new THREE.Vector3(nBL.x, 0.005, nBL.z);
    const gnBR = new THREE.Vector3(nBR.x, 0.005, nBR.z);
    [
      [fBL, gBL],
      [fBR, gBR],
      [nBL, gnBL],
      [nBR, gnBR],
    ].forEach(([topPt, btmPt]) => {
      const dropGeo = new THREE.BufferGeometry().setFromPoints([topPt, btmPt]);
      g.add(new THREE.Line(dropGeo, subtleMat));
    });

    // 6. Ground Field-of-View Coverage Footprint on Floor
    const groundPts = [gnBL, gnBR, gBR, gBL, gnBL];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(groundPts), floorMat));

    // 7. Creator / Host Standing Spot indicator on floor
    const hostSpot = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.23, 24),
      new THREE.MeshBasicMaterial({ color: 0xc75d3f, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    hostSpot.position.set(0, 0.006, lensZ + 2.0);
    hostSpot.rotation.x = Math.PI / 2;
    g.add(hostSpot);

    scene.add(g);
    cameraFrameRef.current = g;
  }, [placedObjects, getObjectY]);

  // ============ View transition ============
  const transitionView = useCallback((mode: ViewMode) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxDim = Math.max(roomWidth, roomDepth);

    // Calculate camera target depending on mode
    let targetPos = new THREE.Vector3(maxDim * 0.8, maxDim * 0.65, maxDim * 0.9);
    let targetCenter = new THREE.Vector3(0, 0.5, 0);
    let targetFov = 40;

    if (mode === 'top') {
      targetPos = new THREE.Vector3(0, maxDim * 1.8, 0.01);
      targetCenter = new THREE.Vector3(0, 0, 0);
      targetFov = 34;
    } else if (mode === 'camera-pov') {
      const activeCam =
        placedObjects.find((o) => o.isMainCamera && (o.equipmentId === 'camera' || o.equipmentId.startsWith('cam'))) ||
        placedObjects.find((o) => o.equipmentId === 'camera' || o.equipmentId.startsWith('cam'));

      if (activeCam) {
        const camY = getObjectY(activeCam) + 1.25;
        targetPos = new THREE.Vector3(activeCam.x, camY, activeCam.z);
        const forwardX = Math.sin(activeCam.rotationY);
        const forwardZ = Math.cos(activeCam.rotationY);
        targetCenter = new THREE.Vector3(activeCam.x + forwardX * 3.5, camY, activeCam.z + forwardZ * 3.5);

        const lensMap: Record<string, number> = {
          '16mm': 84,
          '24mm': 65,
          '35mm': 50,
          '50mm': 39,
          '85mm': 24,
        };
        targetFov = lensMap[activeCam.lensPreset || '24mm'] || 65;
      }
    } else if (mode === 'walkthrough') {
      targetPos = new THREE.Vector3(0, 1.65, roomDepth * 0.38);
      targetCenter = new THREE.Vector3(0, 1.4, 0);
      targetFov = 52;
    }

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startFov = camera.fov;
    const duration = 1100;
    const startTime = performance.now();
    controls.enabled = false;

    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, targetPos, eased);
      controls.target.lerpVectors(startTarget, targetCenter, eased);
      camera.fov = startFov + (targetFov - startFov) * eased;
      camera.updateProjectionMatrix();
      controls.update();
      if (t < 1) {
        cameraAnimRef.current = { cancel: () => {} };
        requestAnimationFrame(tick);
      } else {
        controls.enabled = true;
        cameraAnimRef.current = null;
      }
    };
    if (cameraAnimRef.current) cameraAnimRef.current.cancel();
    tick();
  }, [roomWidth, roomDepth, placedObjects, getObjectY]);

  // ============ Mouse intersection helper ============
  const getFloorIntersection = useCallback((clientX: number, clientY: number) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const floor = floorRef.current;
    if (!renderer || !camera || !floor) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const hits = raycasterRef.current.intersectObject(floor);
    return hits.length > 0 ? hits[0] : null;
  }, []);

  const getObjectIntersection = useCallback((clientX: number, clientY: number): THREE.Group | null => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    const allMeshes: THREE.Mesh[] = [];
    objectMeshesRef.current.forEach((group) => {
      group.traverse((c) => {
        if (c instanceof THREE.Mesh) allMeshes.push(c);
      });
    });

    const hits = raycasterRef.current.intersectObjects(allMeshes, false);
    if (hits.length === 0) return null;

    // Find parent group with placedId
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData.placedId) {
      obj = obj.parent;
    }
    return obj as THREE.Group | null;
  }, []);

  const getSurfaceIntersection = useCallback((clientX: number, clientY: number): { parentId: string; y: number } | null => {
    const objGroup = getObjectIntersection(clientX, clientY);
    if (!objGroup) return null;
    const placedId = objGroup.userData.placedId as string;
    const storeObj = placedObjects.find((o) => o.id === placedId);
    if (!storeObj) return null;
    const def = COMPREHENSIVE_EQUIPMENT_CATALOG[storeObj.equipmentId] ?? EQUIPMENT_CATALOG[storeObj.equipmentId as any];
    if (!def?.surfaceHeight) return null;
    const parentY = getObjectY(storeObj);
    return { parentId: placedId, y: parentY + def.surfaceHeight };
  }, [placedObjects, getObjectIntersection, getObjectY]);

  // ============ Main initialization ============
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.Fog(BG_COLOR, 18, 42);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3.2, 4.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.04, 0.2, 0.96
    );
    composer.addPass(bloomPass);
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / container.clientWidth, 1 / container.clientHeight);
    composer.addPass(fxaaPass);
    composerRef.current = composer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // High-fidelity Studio Lighting
    const ambient = new THREE.AmbientLight(0xfff8ee, 0.72);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffaf0, 1.15);
    sun.position.set(4.5, 9.5, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 35;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 2.5;
    scene.add(sun);

    // Warm ground bounce from hardwood floor
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd2c4b0, 0.65);
    scene.add(hemi);

    // Soft sky/window fill
    const fill = new THREE.DirectionalLight(0xeaf2ff, 0.52);
    fill.position.set(-4, 4, -2.5);
    scene.add(fill);

    // Window light simulation
    const windowLight = new THREE.PointLight(0xfffaed, 0.35, 10);
    windowLight.position.set(0, roomHeight * 0.65, -roomDepth / 2 + 1);
    scene.add(windowLight);

    // Room group
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;
    buildRoom(scene, roomGroup, roomWidth, roomDepth, roomHeight, windows);

    // Animation loop
    const tick = () => {
      controls.update();
      composer.render();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      fxaaPass.uniforms['resolution'].value.set(1 / w, 1 / h);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      scene.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ============ Rebuild room when dimensions change ============
  useEffect(() => {
    const scene = sceneRef.current;
    const roomGroup = roomGroupRef.current;
    if (!scene || !roomGroup) return;
    buildRoom(scene, roomGroup, roomWidth, roomDepth, roomHeight, windows);
  }, [roomWidth, roomDepth, roomHeight, windows, buildRoom]);

  // ============ Sync placed objects ============
  useEffect(() => {
    syncObjects();
  }, [placedObjects, syncObjects]);

  // ============ Selection outline ============
  useEffect(() => {
    updateSelection();
  }, [selectedObjectId, placedObjects, updateSelection]);

  // ============ Camera frame ============
  useEffect(() => {
    updateCameraFrame();
  }, [placedObjects, updateCameraFrame]);

  // ============ View mode transition ============
  useEffect(() => {
    transitionView(viewMode);
  }, [viewMode, transitionView]);

  // ============ Lux & Lighting Coverage Heatmap Floor Texture ============
  useEffect(() => {
    const floor = floorRef.current;
    if (!floor || !(floor.material instanceof THREE.MeshStandardMaterial)) return;

    if (showLuxHeatmap) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Base cool ambient shadow background
      ctx.fillStyle = '#081224';
      ctx.fillRect(0, 0, 512, 512);

      // Grid guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'screen';
      const lights = placedObjects.filter(
        (o) =>
          o.equipmentId.includes('light') ||
          o.equipmentId.includes('softbox') ||
          o.equipmentId.includes('fresnel') ||
          o.equipmentId.includes('tube') ||
          o.equipmentId.includes('lamp')
      );

      lights.forEach((light) => {
        const cx = ((light.x + roomWidth / 2) / roomWidth) * 512;
        const cy = ((light.z + roomDepth / 2) / roomDepth) * 512;
        const intensity = (light.lightSettings?.intensity ?? 80) / 100;
        const radius = 140 * Math.max(0.5, intensity);

        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
        grad.addColorStop(0, `rgba(255, 50, 50, ${0.95 * intensity})`);
        grad.addColorStop(0.35, `rgba(255, 220, 0, ${0.85 * intensity})`);
        grad.addColorStop(0.7, `rgba(0, 230, 100, ${0.55 * intensity})`);
        grad.addColorStop(1, 'rgba(0, 50, 150, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      const heatmapTex = new THREE.CanvasTexture(canvas);
      heatmapTex.colorSpace = THREE.SRGBColorSpace;
      floor.material.map = heatmapTex;
      floor.material.needsUpdate = true;
    } else {
      const normalTex = getStudioFloorTexture().clone();
      normalTex.repeat.set(roomWidth * 1.2, roomDepth * 1.2);
      normalTex.needsUpdate = true;
      floor.material.map = normalTex;
      floor.material.needsUpdate = true;
    }
  }, [showLuxHeatmap, placedObjects, roomWidth, roomDepth]);

  // ============ Ghost preview ============
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old ghost
    if (ghostRef.current) {
      scene.remove(ghostRef.current);
      ghostRef.current.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          (c.material as THREE.Material)?.dispose();
        }
      });
      ghostRef.current = null;
    }

    if (!placingEquipmentId) return;

    const ghost = createEquipmentModel(placingEquipmentId);
    ghost.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.material = c.material.clone();
        (c.material as THREE.MeshStandardMaterial).transparent = true;
        (c.material as THREE.MeshStandardMaterial).opacity = GHOST_OPACITY;
        c.castShadow = false;
      }
    });
    scene.add(ghost);
    ghostRef.current = ghost;
  }, [placingEquipmentId]);

  // ============ Mouse events ============
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      // Ghost tracking
      if (placingEquipmentId && ghostRef.current) {
        // Check if hovering over a surface first
        const surface = getSurfaceIntersection(e.clientX, e.clientY);
        if (surface) {
          const hw = roomWidth / 2 - 0.3;
          const hd = roomDepth / 2 - 0.3;
          const hit = getFloorIntersection(e.clientX, e.clientY);
          if (hit) {
            ghostRef.current.position.set(
              Math.max(-hw, Math.min(hw, hit.point.x)),
              surface.y,
              Math.max(-hd, Math.min(hd, hit.point.z))
            );
          }
        } else {
          const hit = getFloorIntersection(e.clientX, e.clientY);
          if (hit) {
            const hw = roomWidth / 2 - 0.3;
            const hd = roomDepth / 2 - 0.3;
            ghostRef.current.position.set(
              Math.max(-hw, Math.min(hw, hit.point.x)),
              0,
              Math.max(-hd, Math.min(hd, hit.point.z))
            );
          }
        }
        return;
      }

      // Dragging
      if (isDraggingRef.current && dragTargetRef.current) {
        const hit = getFloorIntersection(e.clientX, e.clientY);
        if (hit) {
          const hw = roomWidth / 2 - 0.2;
          const hd = roomDepth / 2 - 0.2;
          const nx = Math.max(-hw, Math.min(hw, hit.point.x + dragOffsetRef.current.x));
          const nz = Math.max(-hd, Math.min(hd, hit.point.z + dragOffsetRef.current.z));
          const store = usePlannerStore.getState();
          const oldObj = store.placedObjects.find((o) => o.id === dragTargetRef.current);
          if (oldObj) {
            const dx = nx - oldObj.x;
            const dz = nz - oldObj.z;

            // Check if dragged object is hovering over any table/shelf/stand
            const draggedDef = COMPREHENSIVE_EQUIPMENT_CATALOG[oldObj.equipmentId] ?? EQUIPMENT_CATALOG[oldObj.equipmentId as any];
            if (draggedDef && !draggedDef.surfaceHeight) {
              const tableObj = store.placedObjects.find((t) => {
                if (t.id === oldObj.id) return false;
                const tDef = COMPREHENSIVE_EQUIPMENT_CATALOG[t.equipmentId] ?? EQUIPMENT_CATALOG[t.equipmentId as any];
                if (!tDef?.surfaceHeight) return false;
                const halfW = tDef.dimensions.width / 2 + 0.05;
                const halfD = tDef.dimensions.depth / 2 + 0.05;
                return (
                  nx >= t.x - halfW &&
                  nx <= t.x + halfW &&
                  nz >= t.z - halfD &&
                  nz <= t.z + halfD
                );
              });

              if (tableObj && oldObj.parentId !== tableObj.id) {
                store.setObjectParent(oldObj.id, tableObj.id);
              } else if (!tableObj && oldObj.parentId) {
                store.setObjectParent(oldObj.id, undefined);
              }
            }

            // Move all children recursively
            const moveChildren = (parentId: string, ddx: number, ddz: number) => {
              store.placedObjects.forEach((child) => {
                if (child.parentId === parentId) {
                  store.updateObjectPosition(child.id, child.x + ddx, child.z + ddz);
                  moveChildren(child.id, ddx, ddz);
                }
              });
            };
            moveChildren(dragTargetRef.current, dx, dz);
          }
          updateObjectPosition(dragTargetRef.current, nx, nz);
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // Placing mode
      if (placingEquipmentId) {
        // Check if hovering over a surface
        const surface = getSurfaceIntersection(e.clientX, e.clientY);
        if (surface) {
          const hit = getFloorIntersection(e.clientX, e.clientY);
          if (hit) {
            const hw = roomWidth / 2 - 0.3;
            const hd = roomDepth / 2 - 0.3;
            const x = Math.max(-hw, Math.min(hw, hit.point.x));
            const z = Math.max(-hd, Math.min(hd, hit.point.z));
            placeObject(placingEquipmentId, x, z, 0, false, surface.parentId);
          }
        } else {
          const hit = getFloorIntersection(e.clientX, e.clientY);
          if (hit) {
            const hw = roomWidth / 2 - 0.3;
            const hd = roomDepth / 2 - 0.3;
            const x = Math.max(-hw, Math.min(hw, hit.point.x));
            const z = Math.max(-hd, Math.min(hd, hit.point.z));
            placeObject(placingEquipmentId, x, z);
          }
        }
        return;
      }

      // Try to select an object
      const objGroup = getObjectIntersection(e.clientX, e.clientY);
      if (objGroup) {
        const id = objGroup.userData.placedId as string;
        setSelectedObject(id);

        // Start drag
        const hit = getFloorIntersection(e.clientX, e.clientY);
        if (hit) {
          const storeObj = placedObjects.find((o) => o.id === id);
          if (storeObj) {
            isDraggingRef.current = true;
            dragTargetRef.current = id;
            dragOffsetRef.current.set(storeObj.x - hit.point.x, 0, storeObj.z - hit.point.z);
            // Disable orbit controls during drag
            if (controlsRef.current) controlsRef.current.enabled = false;
          }
        }
      } else {
        setSelectedObject(null);
      }
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragTargetRef.current = null;
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [placingEquipmentId, placedObjects, roomWidth, roomDepth, getFloorIntersection, getObjectIntersection, getSurfaceIntersection, placeObject, updateObjectPosition, setSelectedObject]);

  // ============ Keyboard shortcuts ============
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setPlacingEquipment(null);
        setSelectedObject(null);
      } else if (e.key === 'v' || e.key === 'V') {
        setViewMode(viewMode === 'perspective' ? 'top' : 'perspective');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          usePlannerStore.getState().deleteObject(selectedObjectId);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedObjectId) {
          const obj = usePlannerStore.getState().placedObjects.find((o) => o.id === selectedObjectId);
          if (obj) {
            usePlannerStore.getState().updateObjectRotation(selectedObjectId, obj.rotationY + Math.PI / 4);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedObjectId, viewMode, setPlacingEquipment, setSelectedObject, setViewMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#F5F1EA] ${placingEquipmentId ? 'cursor-crosshair' : ''}`}
      style={{
        backgroundImage: `
          linear-gradient(${GRID_COLOR_A} 1px, transparent 1px),
          linear-gradient(90deg, ${GRID_COLOR_A} 1px, transparent 1px),
          linear-gradient(${GRID_COLOR_B} 1px, transparent 1px),
          linear-gradient(90deg, ${GRID_COLOR_B} 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px',
      }}
    />
  );
}
