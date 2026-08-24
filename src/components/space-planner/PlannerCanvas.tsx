'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
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
import { getFloorTexture } from '@/lib/space-planner/floor-textures';
import {
  calculateOpticalFov,
  evaluateFramingQuality,
  SENSOR_PROFILES,
  FOCAL_LENGTH_VALUES,
} from '@/lib/space-planner/optical-engine';
import { analyzeStudioLighting } from '@/lib/space-planner/acoustics-lighting-engine';
import type { PlacedObject, ViewMode, CameraLensPreset, CameraSensorSize, CameraAperture } from './types';

// Scene colors - Architectural & Neutral Palette
const BG_COLOR = 0xedebe6;
const WALL_COLOR = 0xf5f3ee;
const BASEBOARD_COLOR = 0x2a2825;
const ACCENT_COLOR = 0x18181b;

const GRID_COLOR_A = 'rgba(0, 0, 0, 0.04)';
const GRID_COLOR_B = 'rgba(0, 0, 0, 0.08)';

export const isCamEquipment = (id?: any): boolean =>
  typeof id === 'string' &&
  (id === 'camera' ||
    id.startsWith('cam') ||
    id.includes('phone') ||
    id.includes('webcam') ||
    id.includes('prompter') ||
    id.includes('teleprompter'));

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.map?.dispose();
            mat.dispose();
          });
        } else {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }
    }
  });
}

export default function PlannerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const floorRef = useRef<THREE.Mesh | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const cameraFrameRef = useRef<THREE.Group | null>(null);
  const lightingVisualizersRef = useRef<THREE.Group | null>(null);
  const acousticRaysRef = useRef<THREE.Group | null>(null);
  const laserRulerGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const composerRef = useRef<EffectComposer | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const cameraAnimRef = useRef<{ cancel: () => void } | null>(null);

  // Overlay state for Director Camera POV View
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '4:5' | '1:1' | '2.39:1'>('16:9');
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [showTikTokUIOverlay, setShowTikTokUIOverlay] = useState(false);

  // Raycaster & drag state
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef<string | null>(null);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Subscribe to store
  const roomWidth = usePlannerStore((s) => s.roomWidth);
  const roomDepth = usePlannerStore((s) => s.roomDepth);
  const roomHeight = usePlannerStore((s) => s.roomHeight);
  const floorFinish = usePlannerStore((s) => s.floorFinish);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const placingEquipmentId = usePlannerStore((s) => s.placingEquipmentId);
  const viewMode = usePlannerStore((s) => s.viewMode);
  const isOrbitPanning = usePlannerStore((s) => s.isOrbitPanning);
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const showLuxHeatmap = usePlannerStore((s) => s.showLuxHeatmap);
  const showAcousticRays = usePlannerStore((s) => s.showAcousticRays);
  const windows = usePlannerStore((s) => s.windows);
  const isMeasuring = usePlannerStore((s) => s.isMeasuring);
  const measureStart = usePlannerStore((s) => s.measureStart);
  const measureEnd = usePlannerStore((s) => s.measureEnd);
  const setMeasurePoints = usePlannerStore((s) => s.setMeasurePoints);
  const toggleMeasuring = usePlannerStore((s) => s.toggleMeasuring);
  const showLightBeams = usePlannerStore((s) => s.showLightBeams);
  const isZenMode = usePlannerStore((s) => s.isZenMode);

  const [hoverMeasurePoint, setHoverMeasurePoint] = useState<{ x: number; y: number; z: number; name?: string } | null>(null);
  const [cadProjection, setCadProjection] = useState<{
    nw: { x: number; y: number };
    ne: { x: number; y: number };
    sw: { x: number; y: number };
    se: { x: number; y: number };
    center: { x: number; y: number };
    widthPx: number;
    heightPx: number;
  } | null>(null);

  const placeObject = usePlannerStore((s) => s.placeObject);
  const updateObjectPosition = usePlannerStore((s) => s.updateObjectPosition);
  const updateObjectLens = usePlannerStore((s) => s.updateObjectLens);
  const setSelectedObject = usePlannerStore((s) => s.setSelectedObject);
  const setPlacingEquipment = usePlannerStore((s) => s.setPlacingEquipment);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const getObjectY = usePlannerStore((s) => s.getObjectY);

  const wallGroupsRef = useRef<{
    back: THREE.Group;
    front: THREE.Group;
    left: THREE.Group;
    right: THREE.Group;
  } | null>(null);

  // Sync auto-rotation with OrbitControls
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

  // ============ Room building ============
  const buildRoom = useCallback((
    scene: THREE.Scene,
    roomGroup: THREE.Group,
    w: number, d: number, h: number,
    wins: typeof windows,
    finish = floorFinish
  ) => {
    disposeObject3D(roomGroup);
    roomGroup.clear();

    // Procedural Floor with Selected Architectural Finish
    const floorTexture = getFloorTexture(finish).clone();
    floorTexture.repeat.set(w * 1.2, d * 1.2);
    floorTexture.needsUpdate = true;

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: finish === 'dark-epoxy' ? 0.15 : finish === 'acoustic-carpet' ? 0.95 : 0.42,
      metalness: finish === 'dark-epoxy' ? 0.3 : 0.05,
      envMapIntensity: 0.6,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    roomGroup.add(floor);
    floorRef.current = floor;

    // Floor precision measurement grid lines (0.5m increments)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x4a453e, transparent: true, opacity: 0.22 });
    for (let i = -d / 2; i <= d / 2; i += 0.5) {
      const pts = [new THREE.Vector3(-w / 2, 0.002, i), new THREE.Vector3(w / 2, 0.002, i)];
      roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let i = -w / 2; i <= w / 2; i += 0.5) {
      const pts = [new THREE.Vector3(i, 0.002, -d / 2), new THREE.Vector3(i, 0.002, d / 2)];
      roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Walls setup
    const wallThickness = 0.08;
    const baseboardH = 0.09;
    const wallMat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: BASEBOARD_COLOR,
      roughness: 0.5,
      metalness: 0.1,
    });

    const backGroup = new THREE.Group();
    const frontGroup = new THREE.Group();
    const leftGroup = new THREE.Group();
    const rightGroup = new THREE.Group();

    // Back Wall (North)
    const backWallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
    backWallMesh.position.set(0, h / 2, -d / 2 - wallThickness / 2);
    backWallMesh.receiveShadow = true;
    backWallMesh.userData.wallName = 'North Wall';
    backGroup.add(backWallMesh);
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(w, baseboardH, 0.015), baseboardMat);
    bbBack.position.set(0, baseboardH / 2, -d / 2 + 0.008);
    backGroup.add(bbBack);

    // Front Wall (South)
    const frontWallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
    frontWallMesh.position.set(0, h / 2, d / 2 + wallThickness / 2);
    frontWallMesh.receiveShadow = true;
    frontWallMesh.userData.wallName = 'South Wall';
    frontGroup.add(frontWallMesh);
    const bbFront = new THREE.Mesh(new THREE.BoxGeometry(w, baseboardH, 0.015), baseboardMat);
    bbFront.position.set(0, baseboardH / 2, d / 2 - 0.008);
    frontGroup.add(bbFront);

    // Left Wall (West)
    const leftWallMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    leftWallMesh.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    leftWallMesh.receiveShadow = true;
    leftWallMesh.userData.wallName = 'West Wall';
    leftGroup.add(leftWallMesh);
    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.015, baseboardH, d), baseboardMat);
    bbLeft.position.set(-w / 2 + 0.008, baseboardH / 2, 0);
    leftGroup.add(bbLeft);

    // Right Wall (East)
    const rightWallMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    rightWallMesh.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    rightWallMesh.receiveShadow = true;
    rightWallMesh.userData.wallName = 'East Wall';
    rightGroup.add(rightWallMesh);
    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.015, baseboardH, d), baseboardMat);
    bbRight.position.set(w / 2 - 0.008, baseboardH / 2, 0);
    rightGroup.add(bbRight);

    // Shared materials for architectural windows
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1f2024,
      roughness: 0.4,
      metalness: 0.25,
    });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x7eb8f5,
      emissive: 0x1a3d60,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const windowSillMat = new THREE.MeshStandardMaterial({
      color: 0xe8e5de,
      roughness: 0.7,
      metalness: 0.05,
    });
    const windowSkyMat = new THREE.MeshBasicMaterial({
      color: 0xd8edff,
    });

    const createWindowMesh = (winWidth: number, winHeight: number) => {
      const winGroup = new THREE.Group();
      const frameDepth = 0.12;
      const frameBorder = 0.055;

      // Outer Frame
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(winWidth, frameBorder, frameDepth), windowFrameMat);
      topFrame.position.set(0, winHeight / 2 - frameBorder / 2, 0);
      winGroup.add(topFrame);

      const btmFrame = new THREE.Mesh(new THREE.BoxGeometry(winWidth, frameBorder, frameDepth), windowFrameMat);
      btmFrame.position.set(0, -winHeight / 2 + frameBorder / 2, 0);
      winGroup.add(btmFrame);

      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, winHeight - frameBorder * 2, frameDepth), windowFrameMat);
      leftFrame.position.set(-winWidth / 2 + frameBorder / 2, 0, 0);
      winGroup.add(leftFrame);

      const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameBorder, winHeight - frameBorder * 2, frameDepth), windowFrameMat);
      rightFrame.position.set(winWidth / 2 - frameBorder / 2, 0, 0);
      winGroup.add(rightFrame);

      // Center Mullions
      const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.024, winHeight - frameBorder * 2, frameDepth * 0.75), windowFrameMat);
      vMullion.position.set(0, 0, 0);
      winGroup.add(vMullion);
      const hMullion = new THREE.Mesh(new THREE.BoxGeometry(winWidth - frameBorder * 2, 0.024, frameDepth * 0.75), windowFrameMat);
      hMullion.position.set(0, 0, 0);
      winGroup.add(hMullion);

      // Glass Pane
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(winWidth - frameBorder * 2, winHeight - frameBorder * 2), windowGlassMat);
      glass.position.set(0, 0, 0.01);
      winGroup.add(glass);

      // Sky Background Pane
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(winWidth - frameBorder * 2, winHeight - frameBorder * 2), windowSkyMat);
      sky.position.set(0, 0, -frameDepth / 2 + 0.005);
      winGroup.add(sky);

      // Extended Interior Sill
      const sill = new THREE.Mesh(new THREE.BoxGeometry(winWidth + 0.12, 0.035, frameDepth + 0.09), windowSillMat);
      sill.position.set(0, -winHeight / 2 - 0.015, 0.045);
      sill.castShadow = true;
      sill.receiveShadow = true;
      winGroup.add(sill);

      return winGroup;
    };

    // Attach placed windows to their respective walls
    if (Array.isArray(wins)) {
      wins.forEach((win) => {
        const winWidth = Math.max(0.4, Math.min(w * 0.8, win.width || 1.2));
        const winHeight = Math.max(0.4, Math.min(h * 0.8, win.height || 1.0));
        const winY = Math.max(winHeight / 2 + 0.2, Math.min(h - winHeight / 2 - 0.1, win.heightOffset ?? (h * 0.55)));
        const mesh = createWindowMesh(winWidth, winHeight);

        if (win.wall === 'back') {
          const maxOffset = (w / 2) - (winWidth / 2) - 0.15;
          const posX = (win.xOffset ?? 0) * maxOffset;
          mesh.position.set(posX, winY, -d / 2);
          backGroup.add(mesh);
        } else if (win.wall === 'front') {
          const maxOffset = (w / 2) - (winWidth / 2) - 0.15;
          const posX = (win.xOffset ?? 0) * maxOffset;
          mesh.position.set(posX, winY, d / 2);
          mesh.rotation.y = Math.PI;
          frontGroup.add(mesh);
        } else if (win.wall === 'left') {
          const maxOffset = (d / 2) - (winWidth / 2) - 0.15;
          const posZ = (win.xOffset ?? 0) * maxOffset;
          mesh.position.set(-w / 2, winY, posZ);
          mesh.rotation.y = Math.PI / 2;
          leftGroup.add(mesh);
        } else if (win.wall === 'right') {
          const maxOffset = (d / 2) - (winWidth / 2) - 0.15;
          const posZ = (win.xOffset ?? 0) * maxOffset;
          mesh.position.set(w / 2, winY, posZ);
          mesh.rotation.y = -Math.PI / 2;
          rightGroup.add(mesh);
        }
      });
    }

    roomGroup.add(backGroup);
    roomGroup.add(frontGroup);
    roomGroup.add(leftGroup);
    roomGroup.add(rightGroup);

    wallGroupsRef.current = {
      back: backGroup,
      front: frontGroup,
      left: leftGroup,
      right: rightGroup,
    };
  }, [floorFinish]);

  // Helper to calculate exact physical lens apex and FOV for any camera/smartphone
  const getCameraLensPos = useCallback((cam: PlacedObject) => {
    const baseY = getObjectY(cam);
    const id = typeof cam?.equipmentId === 'string' ? cam.equipmentId.toLowerCase() : '';
    let localY = 1.25;
    let localZ = 0.14;

    if (id.includes('phone')) {
      localY = 1.22;
      localZ = 0.08;
    } else if (id.includes('webcam')) {
      localY = 0.95;
      localZ = 0.05;
    } else if (id.includes('red') || id.includes('arri')) {
      localY = 1.35;
      localZ = 0.22;
    }

    const lens = cam.lensPreset || '24mm';
    const sensor = cam.sensorSize || 'full-frame';
    const opt = calculateOpticalFov(lens, sensor);
    const fov = opt.verticalFovDegrees;

    return { y: baseY + localY, localY, localZ, fov, opt };
  }, [getObjectY]);

  // ============ Camera Frustum Framing Visualizer ============
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
      placedObjects.find((o) => o.isMainCamera && isCamEquipment(o.equipmentId)) ||
      placedObjects.find((o) => isCamEquipment(o.equipmentId));
    if (!mainCam) return;

    const g = new THREE.Group();
    const camBaseY = getObjectY(mainCam);
    g.position.set(mainCam.x, camBaseY, mainCam.z);
    g.rotation.y = mainCam.rotationY;

    const lens = getCameraLensPos(mainCam);
    const apex = new THREE.Vector3(0, lens.localY, lens.localZ);

    const opt = lens.opt;
    const hFovRad = (opt.horizontalFovDegrees * Math.PI) / 180;
    const vFovRad = (opt.verticalFovDegrees * Math.PI) / 180;

    const dNear = 0.6;
    const wNear = Math.tan(hFovRad / 2) * dNear;
    const hNear = Math.tan(vFovRad / 2) * dNear;

    const nTL = new THREE.Vector3(-wNear, lens.localY + hNear, lens.localZ + dNear);
    const nTR = new THREE.Vector3(wNear, lens.localY + hNear, lens.localZ + dNear);
    const nBR = new THREE.Vector3(wNear, lens.localY - hNear, lens.localZ + dNear);
    const nBL = new THREE.Vector3(-wNear, lens.localY - hNear, lens.localZ + dNear);

    const dFar = 2.8;
    const wFar = Math.tan(hFovRad / 2) * dFar;
    const hFar = Math.tan(vFovRad / 2) * dFar;

    const fTL = new THREE.Vector3(-wFar, lens.localY + hFar, lens.localZ + dFar);
    const fTR = new THREE.Vector3(wFar, lens.localY + hFar, lens.localZ + dFar);
    const fBR = new THREE.Vector3(wFar, lens.localY - hFar, lens.localZ + dFar);
    const fBL = new THREE.Vector3(-wFar, lens.localY - hFar, lens.localZ + dFar);

    const frustumMat = new THREE.LineBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.85 });
    const subtleMat = new THREE.LineBasicMaterial({ color: 0x71717a, transparent: true, opacity: 0.45 });
    const floorMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45 });

    if (viewMode === 'top') {
      // Clean subtle 2D footprint only in 2D blueprint mode (no tall 3D pyramid edges)
      const floorMat = new THREE.LineBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.5 });
      const fovPts = [
        new THREE.Vector3(0, 0.01, 0),
        new THREE.Vector3(-wFar * 0.6, 0.01, dFar * 0.6),
        new THREE.Vector3(wFar * 0.6, 0.01, dFar * 0.6),
        new THREE.Vector3(0, 0.01, 0),
      ];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(fovPts), floorMat));
      scene.add(g);
      cameraFrameRef.current = g;
      return;
    }

    // 1. Sightlines from apex to corners
    [fTL, fTR, fBR, fBL].forEach((corner) => {
      const geo = new THREE.BufferGeometry().setFromPoints([apex, corner]);
      g.add(new THREE.Line(geo, frustumMat));
    });

    // 2. Far & Near Framing Rectangles
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([fTL, fTR, fBR, fBL, fTL]), frustumMat));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nTL, nTR, nBR, nBL, nTL]), subtleMat));

    // 3. Center Sightline
    const centerFar = new THREE.Vector3(0, lens.localY, lens.localZ + dFar);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([apex, centerFar]), subtleMat));

    // 4. Floor footprint
    const floorY = -camBaseY + 0.005;
    const floorFarBL = new THREE.Vector3(fBL.x * 0.9, floorY, fBL.z);
    const floorFarBR = new THREE.Vector3(fBR.x * 0.9, floorY, fBR.z);
    const floorNearBL = new THREE.Vector3(nBL.x * 0.9, floorY, nBL.z);
    const floorNearBR = new THREE.Vector3(nBR.x * 0.9, floorY, nBR.z);
    const groundPts = [floorNearBL, floorNearBR, floorFarBR, floorFarBL, floorNearBL];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(groundPts), floorMat));

    scene.add(g);
    cameraFrameRef.current = g;
  }, [placedObjects, getObjectY, getCameraLensPos, viewMode]);

  // ============ Lighting Beam Cone & Throw Visualizers ============
  const updateLightingVisualizers = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (lightingVisualizersRef.current) {
      scene.remove(lightingVisualizersRef.current);
      lightingVisualizersRef.current.traverse((c) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      lightingVisualizersRef.current = null;
    }

    if (!showLightBeams || viewMode === 'top') return;

    const lightObjects = placedObjects.filter((o) => {
      const def = COMPREHENSIVE_EQUIPMENT_CATALOG[o?.equipmentId];
      return def?.category === 'lighting' || o.lightSettings !== undefined;
    });

    if (lightObjects.length === 0) return;

    const masterGroup = new THREE.Group();

    lightObjects.forEach((light) => {
      const g = new THREE.Group();
      const baseY = getObjectY(light);
      const emitterLocalY = 1.65;
      const emitterForwardZ = 0.12;

      g.position.set(
        light.x + Math.sin(light.rotationY) * emitterForwardZ,
        baseY + emitterLocalY,
        light.z + Math.cos(light.rotationY) * emitterForwardZ
      );
      g.rotation.y = light.rotationY;

      const kelvin = light.lightSettings?.colorTempKelvin ?? 5600;
      let lightHex = 0xfffaed;
      if (light.lightSettings?.colorHex) {
        lightHex = parseInt(light.lightSettings.colorHex.replace('#', ''), 16) || 0xfffaed;
      } else if (kelvin <= 3200) {
        lightHex = 0xffa040;
      } else if (kelvin <= 4500) {
        lightHex = 0xffeed4;
      } else {
        lightHex = 0xf0f7ff;
      }

      const intensity = (light.lightSettings?.intensity ?? 80) / 100;
      const throwDist = 2.2 * Math.max(0.6, intensity);
      const beamRadius = Math.tan((26 * Math.PI) / 180) * throwDist;

      const coneGeo = new THREE.ConeGeometry(beamRadius, throwDist, 24, 1, true);
      coneGeo.translate(0, -throwDist / 2, 0);
      coneGeo.rotateX(-Math.PI / 2);

      // Subtle atmospheric throw (soft 0.04 opacity instead of blinding cones)
      const coneMat = new THREE.MeshBasicMaterial({
        color: lightHex,
        transparent: true,
        opacity: 0.04 * intensity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      g.add(new THREE.Mesh(coneGeo, coneMat));
      masterGroup.add(g);
    });

    scene.add(masterGroup);
    lightingVisualizersRef.current = masterGroup;
  }, [placedObjects, showLightBeams, viewMode, getObjectY]);

  // ============ Acoustic First-Reflection Tracing ============
  const updateAcousticRays = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (acousticRaysRef.current) {
      scene.remove(acousticRaysRef.current);
      acousticRaysRef.current.traverse((c) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      acousticRaysRef.current = null;
    }

    if (!showAcousticRays || viewMode === 'top') return;

    const mic = placedObjects.find(
      (o) =>
        o.equipmentId.includes('mic') ||
        o.equipmentId.includes('sm7b') ||
        o.equipmentId.includes('rode') ||
        o.equipmentId.includes('shure')
    );
    const soundPos = mic ? new THREE.Vector3(mic.x, 1.1, mic.z) : new THREE.Vector3(0, 1.1, 0);

    const g = new THREE.Group();
    const rayMat = new THREE.LineDashedMaterial({
      color: 0x9333ea,
      dashSize: 0.12,
      gapSize: 0.08,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.75,
    });

    const hw = roomWidth / 2;
    const soundY = 1.1;

    const traceReflection = (wallX: number) => {
      const zReflect = soundPos.z;
      const pts = [
        soundPos,
        new THREE.Vector3(wallX, soundY, zReflect),
        new THREE.Vector3(soundPos.x, soundY, zReflect + 1.2),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, rayMat);
      line.computeLineDistances();
      g.add(line);

      const targetMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
      const target = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 24), targetMat);
      target.position.set(wallX + (wallX < 0 ? 0.01 : -0.01), soundY, zReflect);
      target.rotation.y = Math.PI / 2;
      g.add(target);
    };

    traceReflection(-hw);
    traceReflection(hw);

    scene.add(g);
    acousticRaysRef.current = g;
  }, [placedObjects, showAcousticRays, roomWidth]);

  // ============ 3D Laser Ruler Dimension Overlay Rendering ============
  const updateLaserRulerVisualizer = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (laserRulerGroupRef.current) {
      scene.remove(laserRulerGroupRef.current);
      laserRulerGroupRef.current.traverse((c) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.Line || c instanceof THREE.Sprite) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      laserRulerGroupRef.current = null;
    }

    if (!isMeasuring) return;

    const g = new THREE.Group();
    const p1 = measureStart;
    const p2 = measureEnd || hoverMeasurePoint;

    // Hover snap ring indicator
    if (hoverMeasurePoint && !measureEnd) {
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, depthTest: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 32), ringMat);
      ring.position.set(hoverMeasurePoint.x, 0.005, hoverMeasurePoint.z);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 99;
      g.add(ring);

      // Center dot
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0x0891b2, depthTest: false }));
      dot.position.set(hoverMeasurePoint.x, 0.006, hoverMeasurePoint.z);
      dot.rotation.x = -Math.PI / 2;
      dot.renderOrder = 100;
      g.add(dot);
    }

    // Active measurement line between Start and End/Hover
    if (p1 && p2) {
      const linePts = [
        new THREE.Vector3(p1.x, 0.015, p1.z),
        new THREE.Vector3(p2.x, 0.015, p2.z),
      ];

      // Laser dimension line
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2, depthTest: false });
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 98;
      g.add(line);

      // Start witness tick
      const startRing = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.14, 24),
        new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, depthTest: false })
      );
      startRing.position.set(p1.x, 0.016, p1.z);
      startRing.rotation.x = -Math.PI / 2;
      startRing.renderOrder = 99;
      g.add(startRing);

      // End witness tick
      const endRing = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.14, 24),
        new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, depthTest: false })
      );
      endRing.position.set(p2.x, 0.016, p2.z);
      endRing.rotation.x = -Math.PI / 2;
      endRing.renderOrder = 99;
      g.add(endRing);
    }

    scene.add(g);
    laserRulerGroupRef.current = g;
  }, [isMeasuring, measureStart, measureEnd, hoverMeasurePoint]);

  // ============ Magnetic Building & Wall Snapping Function ============
  const calculateMagneticSnap = useCallback((rawX: number, rawZ: number) => {
    const hw = roomWidth / 2;
    const hd = roomDepth / 2;
    const snapDist = 0.28; // Snapping radius threshold in meters

    let snappedX = rawX;
    let snappedZ = rawZ;
    let snapName = 'Custom Coordinate';

    // 1. Room Boundary Wall Corners (High Priority)
    const corners = [
      { x: -hw, z: -hd, name: `North-West Corner (-${hw.toFixed(1)}m, -${hd.toFixed(1)}m)` },
      { x: hw, z: -hd, name: `North-East Corner (${hw.toFixed(1)}m, -${hd.toFixed(1)}m)` },
      { x: -hw, z: hd, name: `South-West Corner (-${hw.toFixed(1)}m, ${hd.toFixed(1)}m)` },
      { x: hw, z: hd, name: `South-East Corner (${hw.toFixed(1)}m, ${hd.toFixed(1)}m)` },
    ];

    for (const c of corners) {
      if (Math.hypot(rawX - c.x, rawZ - c.z) < snapDist) {
        return { x: c.x, z: c.z, name: c.name };
      }
    }

    // 2. Wall Midpoints & Axis Centers
    const wallMidpoints = [
      { x: 0, z: -hd, name: `North Wall Center (Z: -${hd.toFixed(2)}m)` },
      { x: 0, z: hd, name: `South Wall Center (Z: +${hd.toFixed(2)}m)` },
      { x: -hw, z: 0, name: `West Wall Center (X: -${hw.toFixed(2)}m)` },
      { x: hw, z: 0, name: `East Wall Center (X: +${hw.toFixed(2)}m)` },
      { x: 0, z: 0, name: 'Room Floor Center (0, 0)' },
    ];

    for (const m of wallMidpoints) {
      if (Math.hypot(rawX - m.x, rawZ - m.z) < snapDist) {
        return { x: m.x, z: m.z, name: m.name };
      }
    }

    // 3. Wall Perimeter Planes (Perpendicular Lock)
    if (Math.abs(rawZ - -hd) < snapDist) {
      snappedZ = -hd;
      snapName = `North Wall Edge (Z: -${hd.toFixed(2)}m)`;
    } else if (Math.abs(rawZ - hd) < snapDist) {
      snappedZ = hd;
      snapName = `South Wall Edge (Z: +${hd.toFixed(2)}m)`;
    }

    if (Math.abs(rawX - -hw) < snapDist) {
      snappedX = -hw;
      snapName = `West Wall Edge (X: -${hw.toFixed(2)}m)`;
    } else if (Math.abs(rawX - hw) < snapDist) {
      snappedX = hw;
      snapName = `East Wall Edge (X: +${hw.toFixed(2)}m)`;
    }

    // 4. Placed Equipment Centers & Table Bounds
    for (const obj of placedObjects) {
      if (Math.hypot(rawX - obj.x, rawZ - obj.z) < snapDist) {
        const def = COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
        return {
          x: obj.x,
          z: obj.z,
          name: `${def?.name || obj.equipmentId} Position`,
        };
      }
    }

    // 5. Standard Grid Snapping (0.25m intervals if not snapped to walls)
    if (snapName === 'Custom Coordinate') {
      snappedX = Math.round(rawX * 4) / 4;
      snappedZ = Math.round(rawZ * 4) / 4;
      snapName = `Grid Point (${snappedX.toFixed(2)}m, ${snappedZ.toFixed(2)}m)`;
    }

    return { x: snappedX, z: snappedZ, name: snapName };
  }, [roomWidth, roomDepth, placedObjects]);

  // ============ View transition ============
  const transitionView = useCallback((mode: ViewMode) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxDim = Math.max(roomWidth, roomDepth);
    let targetPos = new THREE.Vector3(maxDim * 0.8, maxDim * 0.65, maxDim * 0.9);
    let targetCenter = new THREE.Vector3(0, 0.5, 0);
    let targetFov = 40;

    if (mode === 'top') {
      targetPos = new THREE.Vector3(0, maxDim * 1.8, 0.01);
      targetCenter = new THREE.Vector3(0, 0, 0);
      targetFov = 34;
    } else if (mode === 'camera-pov') {
      const activeCam =
        placedObjects.find((o) => o.isMainCamera && isCamEquipment(o.equipmentId)) ||
        placedObjects.find((o) => isCamEquipment(o.equipmentId));

      if (activeCam) {
        const lens = getCameraLensPos(activeCam);
        targetPos = new THREE.Vector3(
          activeCam.x + Math.sin(activeCam.rotationY) * lens.localZ,
          lens.y,
          activeCam.z + Math.cos(activeCam.rotationY) * lens.localZ
        );
        const forwardX = Math.sin(activeCam.rotationY);
        const forwardZ = Math.cos(activeCam.rotationY);
        targetCenter = new THREE.Vector3(
          targetPos.x + forwardX * 3.5,
          lens.y,
          targetPos.z + forwardZ * 3.5
        );
        targetFov = lens.fov;
      }
    } else if (mode === 'walkthrough') {
      targetPos = new THREE.Vector3(0, 1.65, roomDepth * 0.38);
      targetCenter = new THREE.Vector3(0, 1.4, 0);
      targetFov = 52;
    }

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startFov = camera.fov;
    const duration = 800;
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
  }, [roomWidth, roomDepth, placedObjects, getCameraLensPos]);

  // ============ Scene Setup & Interaction Listeners ============
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.Fog(BG_COLOR, 18, 42);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / (mount.clientHeight || 1), 0.1, 100);
    camera.position.set(4, 3.2, 4.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      0.04, 0.2, 0.96
    );
    composer.addPass(bloomPass);
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / (mount.clientWidth || 1), 1 / (mount.clientHeight || 1));
    composer.addPass(fxaaPass);
    composerRef.current = composer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xfff8ee, 0.72);
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const sun = new THREE.DirectionalLight(0xfffaf0, 1.15);
    sun.position.set(4.5, 9.5, 3.5);
    sun.castShadow = true;
    scene.add(sun);
    sunLightRef.current = sun;

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;
    buildRoom(scene, roomGroup, roomWidth, roomDepth, roomHeight, windows, floorFinish);

    const tick = () => {
      controls.update();

      const wallMode = usePlannerStore.getState().wallDisplayMode;
      const walls = wallGroupsRef.current;
      if (walls) {
        if (wallMode === 'floor-only') {
          walls.back.visible = false;
          walls.front.visible = false;
          walls.left.visible = false;
          walls.right.visible = false;
        } else if (wallMode === 'corner-2') {
          walls.back.visible = true;
          walls.left.visible = true;
          walls.front.visible = false;
          walls.right.visible = false;
        } else if (wallMode === 'u-shape-3') {
          walls.back.visible = true;
          walls.left.visible = true;
          walls.right.visible = true;
          walls.front.visible = false;
        } else if (wallMode === 'all-4') {
          walls.back.visible = true;
          walls.front.visible = true;
          walls.left.visible = true;
          walls.right.visible = true;
        } else {
          // 'auto-cutaway'
          const camPos = camera.position;
          const rW = usePlannerStore.getState().roomWidth;
          const rD = usePlannerStore.getState().roomDepth;
          const pad = 0.2;
          walls.back.visible = camPos.z >= -rD / 2 - pad;
          walls.front.visible = camPos.z <= rD / 2 + pad;
          walls.left.visible = camPos.x >= -rW / 2 - pad;
          walls.right.visible = camPos.x <= rW / 2 + pad;
        }
      }

      // Compute 2D CAD blueprint projection coordinates on screen
      if (usePlannerStore.getState().viewMode === 'top' && mount) {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        const hw = usePlannerStore.getState().roomWidth / 2;
        const hd = usePlannerStore.getState().roomDepth / 2;

        const proj = (px: number, py: number, pz: number) => {
          const v = new THREE.Vector3(px, py, pz).project(camera);
          return {
            x: ((v.x + 1) / 2) * w,
            y: ((-v.y + 1) / 2) * h,
          };
        };

        const nw = proj(-hw, 0, -hd);
        const ne = proj(hw, 0, -hd);
        const sw = proj(-hw, 0, hd);
        const se = proj(hw, 0, hd);
        const center = proj(0, 0, 0);

        setCadProjection({
          nw,
          ne,
          sw,
          se,
          center,
          widthPx: Math.hypot(ne.x - nw.x, ne.y - nw.y),
          heightPx: Math.hypot(sw.x - nw.x, sw.y - nw.y),
        });
      }

      composer.render();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!mount || !renderer || !camera || !composer) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(mount);

    // ============ Pointer Event Listeners for Raycast & Snapping ============
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Left-click only
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const state = usePlannerStore.getState();

      // 1. Measuring Mode Click
      if (state.isMeasuring) {
        const floorIntersection = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection)) {
          const snap = calculateMagneticSnap(floorIntersection.x, floorIntersection.z);
          const pt = { x: snap.x, y: 0, z: snap.z, name: snap.name };

          if (!state.measureStart) {
            state.setMeasurePoints(pt, null);
          } else if (!state.measureEnd) {
            state.setMeasurePoints(state.measureStart, pt);
          } else {
            // Restart measurement from new point
            state.setMeasurePoints(pt, null);
          }
        }
        return;
      }

      // 2. Placing new equipment item
      if (state.placingEquipmentId) {
        const floorIntersection = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection)) {
          const snap = calculateMagneticSnap(floorIntersection.x, floorIntersection.z);
          state.placeObject(state.placingEquipmentId, snap.x, snap.z);
          state.setPlacingEquipment(null);
        }
        return;
      }

      // 3. Object Selection & Dragging
      const objectGroups: THREE.Object3D[] = [];
      objectMeshesRef.current.forEach((g) => objectGroups.push(g));
      const hits = raycasterRef.current.intersectObjects(objectGroups, true);

      if (hits.length > 0) {
        let hitGroup: THREE.Object3D | null = hits[0].object;
        while (hitGroup && !hitGroup.userData.placedId && hitGroup.parent) {
          hitGroup = hitGroup.parent;
        }

        if (hitGroup && hitGroup.userData.placedId) {
          const targetId = hitGroup.userData.placedId;
          state.setSelectedObject(targetId);
          dragTargetRef.current = targetId;
          isDraggingRef.current = true;
          controls.enabled = false; // Disable orbit during object drag
        }
      } else {
        // Click on empty space
        state.setSelectedObject(null);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const state = usePlannerStore.getState();

      // Laser Ruler Hover Snapping
      if (state.isMeasuring) {
        const floorIntersection = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection)) {
          const snap = calculateMagneticSnap(floorIntersection.x, floorIntersection.z);
          setHoverMeasurePoint({ x: snap.x, y: 0, z: snap.z, name: snap.name });
        }
        return;
      }

      // Object Dragging
      if (isDraggingRef.current && dragTargetRef.current) {
        const floorIntersection = new THREE.Vector3();
        if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, floorIntersection)) {
          const snap = calculateMagneticSnap(floorIntersection.x, floorIntersection.z);
          const halfW = state.roomWidth / 2 - 0.15;
          const halfD = state.roomDepth / 2 - 0.15;
          const clampedX = Math.max(-halfW, Math.min(halfW, snap.x));
          const clampedZ = Math.max(-halfD, Math.min(halfD, snap.z));
          state.updateObjectPosition(dragTargetRef.current, clampedX, clampedZ);
        }
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      dragTargetRef.current = null;
      controls.enabled = true;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Multi-Angle Snapshot Generator for PDF & Export
    (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__ = () => {
      const origPos = camera.position.clone();
      const origTarget = controls.target.clone();
      const origFov = camera.fov;
      const walls = wallGroupsRef.current;
      const rW = usePlannerStore.getState().roomWidth;
      const rD = usePlannerStore.getState().roomDepth;
      const maxDim = Math.max(rW, rD);

      const captureFrame = (
        posX: number,
        posY: number,
        posZ: number,
        tX: number,
        tY: number,
        tZ: number,
        fov: number,
        wallVisibility?: { back: boolean; front: boolean; left: boolean; right: boolean }
      ) => {
        camera.position.set(posX, posY, posZ);
        controls.target.set(tX, tY, tZ);
        camera.fov = fov;
        camera.updateProjectionMatrix();
        controls.update();

        if (walls && wallVisibility) {
          walls.back.visible = wallVisibility.back;
          walls.front.visible = wallVisibility.front;
          walls.left.visible = wallVisibility.left;
          walls.right.visible = wallVisibility.right;
        }

        renderer.render(scene, camera);
        const gl = renderer.getContext();
        if (gl) gl.flush();
        return renderer.domElement.toDataURL('image/jpeg', 0.95);
      };

      const hero3D = captureFrame(maxDim * 0.85, maxDim * 0.72, maxDim * 0.95, 0, 0.5, 0, 38, { back: true, left: true, right: true, front: false });
      const north = captureFrame(0, 1.5, maxDim * 0.9, 0, 1.2, -rD * 0.2, 42, { back: true, left: true, right: true, front: false });
      const south = captureFrame(0, 1.6, -maxDim * 0.85, 0, 1.1, 0, 44, { back: false, left: true, right: true, front: true });
      const left45 = captureFrame(-maxDim * 0.8, maxDim * 0.6, maxDim * 0.65, 0, 0.6, 0, 40, { back: true, left: false, right: true, front: false });
      const right45 = captureFrame(maxDim * 0.8, maxDim * 0.6, maxDim * 0.65, 0, 0.6, 0, 40, { back: true, left: true, right: false, front: false });
      const top3D = captureFrame(0, maxDim * 1.85, 0.001, 0, 0, 0, 32, { back: true, left: true, right: true, front: true });

      const activeCam = usePlannerStore.getState().placedObjects.find((o) => isCamEquipment(o.equipmentId));
      let directorPOV = hero3D;

      if (activeCam) {
        const lens = getCameraLensPos(activeCam);
        const posX = activeCam.x + Math.sin(activeCam.rotationY) * lens.localZ;
        const posY = lens.y;
        const posZ = activeCam.z + Math.cos(activeCam.rotationY) * lens.localZ;
        const fwdX = Math.sin(activeCam.rotationY);
        const fwdZ = Math.cos(activeCam.rotationY);

        directorPOV = captureFrame(posX, posY, posZ, posX + fwdX * 3.5, posY, posZ + fwdZ * 3.5, lens.fov, { back: true, left: true, right: true, front: true });
      }

      camera.position.copy(origPos);
      controls.target.copy(origTarget);
      camera.fov = origFov;
      camera.updateProjectionMatrix();
      controls.update();

      return { hero3D, north, south, left45, right45, top3D, directorPOV };
    };

    (window as any).__SPACE_PLANNER_SNAP_CAMERA__ = (preset: 'iso' | 'north' | 'top' | 'side') => {
      const rW = usePlannerStore.getState().roomWidth;
      const rD = usePlannerStore.getState().roomDepth;
      const maxDim = Math.max(rW, rD);

      if (preset === 'iso') {
        camera.position.set(maxDim * 0.85, maxDim * 0.72, maxDim * 0.95);
        controls.target.set(0, 0.5, 0);
      } else if (preset === 'north') {
        camera.position.set(0, 1.8, maxDim * 0.9);
        controls.target.set(0, 1.1, -rD * 0.2);
      } else if (preset === 'top') {
        camera.position.set(0, maxDim * 1.8, 0.001);
        controls.target.set(0, 0, 0);
      } else if (preset === 'side') {
        camera.position.set(-maxDim * 0.9, 1.8, 0);
        controls.target.set(0, 1.0, 0);
      }
      camera.updateProjectionMatrix();
      controls.update();
    };

    return () => {
      delete (window as any).__SPACE_PLANNER_CAPTURE_ANGLES__;
      delete (window as any).__SPACE_PLANNER_SNAP_CAMERA__;
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      if (composerRef.current) {
        composerRef.current.dispose();
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [buildRoom, roomWidth, roomDepth, roomHeight, windows, floorFinish, calculateMagneticSnap, getCameraLensPos]);

  // Sync scene models with full Three.js geometry/material memory cleanup
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    objectMeshesRef.current.forEach((group) => {
      scene.remove(group);
      disposeObject3D(group);
    });
    objectMeshesRef.current.clear();

    placedObjects.forEach((obj) => {
      const group = createEquipmentModel(obj.equipmentId);
      const elevation = getObjectY(obj);
      group.position.set(obj.x, elevation, obj.z);
      group.rotation.y = obj.rotationY;
      group.userData.placedId = obj.id;
      scene.add(group);
      objectMeshesRef.current.set(obj.id, group);
    });

    updateCameraFrame();
    updateLightingVisualizers();
    updateAcousticRays();
  }, [placedObjects, getObjectY, updateCameraFrame, updateLightingVisualizers, updateAcousticRays]);

  // Sync laser ruler 3D visualizer
  useEffect(() => {
    updateLaserRulerVisualizer();
  }, [updateLaserRulerVisualizer]);

  // Sync viewMode changes
  useEffect(() => {
    transitionView(viewMode);
  }, [viewMode, transitionView]);

  // Active Camera & Optical Telemetry in POV mode
  const activeCamera = useMemo(() => {
    return (
      placedObjects.find((o) => o.isMainCamera && isCamEquipment(o.equipmentId)) ||
      placedObjects.find((o) => isCamEquipment(o.equipmentId))
    );
  }, [placedObjects]);

  const opticalMetrics = useMemo(() => {
    if (!activeCamera) return null;
    const lens = activeCamera.lensPreset || '24mm';
    const sensor = activeCamera.sensorSize || 'full-frame';
    const opt = calculateOpticalFov(lens, sensor);

    // Forward direction unit vector of camera on floor plane
    const fwdX = Math.sin(activeCamera.rotationY);
    const fwdZ = Math.cos(activeCamera.rotationY);

    const candidates = placedObjects.filter(
      (o) =>
        o.id !== activeCamera.id &&
        (o.equipmentId.includes('chair') ||
          o.equipmentId.includes('desk') ||
          o.equipmentId.includes('human') ||
          o.equipmentId === 'content-table')
    );

    let distM = 1.6;
    if (candidates.length > 0) {
      let closestInFov = Infinity;
      let foundInFov = false;

      for (const s of candidates) {
        const dx = s.x - activeCamera.x;
        const dz = s.z - activeCamera.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          // Check if candidate is in the forward hemisphere of the lens (dot product > 0.3)
          const dot = (dx * fwdX + dz * fwdZ) / d;
          if (dot > 0.3 && d < closestInFov) {
            closestInFov = d;
            foundInFov = true;
          }
        }
      }
      if (foundInFov && closestInFov < 12) {
        distM = closestInFov;
      }
    }

    const backdropDistM = Math.max(0.5, roomDepth / 2 - Math.abs(activeCamera.z));
    const framing = evaluateFramingQuality(distM, lens, sensor, backdropDistM);

    return {
      opt,
      distM: Math.round(distM * 10) / 10,
      backdropDistM: Math.round(backdropDistM * 10) / 10,
      framing,
    };
  }, [activeCamera, placedObjects, roomDepth]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#EAE7DF] overflow-hidden ${placingEquipmentId || isMeasuring ? 'cursor-crosshair' : ''}`}
      style={{
        backgroundImage: `
          linear-gradient(${GRID_COLOR_A} 1px, transparent 1px),
          linear-gradient(90deg, ${GRID_COLOR_A} 1px, transparent 1px),
          linear-gradient(${GRID_COLOR_B} 1px, transparent 1px),
          linear-gradient(90deg, ${GRID_COLOR_B} 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px',
      }}
    >
      {/* Dedicated Three.js WebGL canvas mount container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* Director POV Framing & Optical HUD Overlay */}
      {viewMode === 'camera-pov' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3">
          {/* Top Bar with Camera Metadata & Optical Quick Bar */}
          <div className="flex items-center justify-between pointer-events-auto flex-wrap gap-2">
            <div className="flex items-center gap-2 p-1 bg-black/90 text-white backdrop-blur border border-white/20 shadow-xl font-mono text-[11px]">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-600 font-bold text-white tracking-widest animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" /> REC 4K
              </span>
              <span className="text-zinc-200 font-bold">
                {activeCamera?.lensPreset || '24mm'} • {opticalMetrics?.opt.effectiveFocalLengthMm.toFixed(0)}mm Eq. • {activeCamera?.aperture || 'f/2.8'}
              </span>
              <span className="text-cyan-300 font-bold">
                {opticalMetrics?.opt.horizontalFovDegrees}° H-FOV
              </span>
            </div>

            {/* Framing Guides Switcher */}
            <div className="flex items-center gap-1 p-1 bg-black/90 text-white backdrop-blur border border-white/20 font-mono text-[11px]">
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '16:9' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'
                }`}
                onClick={() => setAspectRatio('16:9')}
              >
                16:9 YT
              </button>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '9:16' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'
                }`}
                onClick={() => setAspectRatio('9:16')}
              >
                9:16 Shorts
              </button>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '4:5' ? 'bg-white text-black' : 'hover:bg-white/10 text-white'
                }`}
                onClick={() => setAspectRatio('4:5')}
              >
                4:5 IG
              </button>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  showTikTokUIOverlay ? 'bg-cyan-400 text-black' : 'text-zinc-400 hover:text-white'
                }`}
                onClick={() => setShowTikTokUIOverlay(!showTikTokUIOverlay)}
                title="Toggle TikTok UI Safe Zones"
              >
                Safe Overlay
              </button>
            </div>
          </div>

          {/* Aspect Ratio Frame & Grid Guide */}
          <div className="relative flex-1 flex items-center justify-center my-2">
            <div
              className={`relative border-2 border-white/80 transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ${
                aspectRatio === '16:9'
                  ? 'w-[90%] aspect-[16/9]'
                  : aspectRatio === '9:16'
                  ? 'h-[92%] aspect-[9/16]'
                  : aspectRatio === '4:5'
                  ? 'h-[92%] aspect-[4/5]'
                  : 'h-[92%] aspect-square'
              }`}
            >
              {/* Rule of Thirds Crosshairs */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div className="border-r border-b border-white/25" />
                  <div />
                </div>
              )}

              {/* Center Eyeline Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 border border-white/50 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Optical Diagnostic HUD */}
          <div className="pointer-events-auto flex items-center justify-between gap-3 p-2.5 bg-black/95 text-white backdrop-blur border border-white/20 font-mono text-xs shadow-2xl flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-zinc-800 text-white font-bold text-[10px] border border-white/20">
                DIRECTOR HUD
              </span>
              <span className="text-zinc-300">
                Subject Dist: <strong className="text-emerald-400">{opticalMetrics?.distM ?? 1.6}m</strong>
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-300">
                Bokeh Score: <strong className="text-amber-300">{opticalMetrics?.framing.bokehScore}/10</strong>
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400 text-[11px]">
                {opticalMetrics?.framing.framingDescription}
              </span>
            </div>

            {/* Quick Lens Switcher */}
            <div className="flex items-center gap-1">
              {(['16mm', '24mm', '35mm', '50mm', '85mm'] as CameraLensPreset[]).map((lens) => (
                <button
                  key={lens}
                  className={`px-2 py-0.5 text-[10px] font-bold font-mono transition-all ${
                    activeCamera?.lensPreset === lens
                      ? 'bg-white text-black'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                  onClick={() => activeCamera && updateObjectLens(activeCamera.id, lens)}
                >
                  {lens}
                </button>
              ))}
              <button
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] ml-2"
                onClick={() => usePlannerStore.getState().setViewMode('perspective')}
              >
                Exit POV ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Blueprint Mode Floorplanner-Grade Architectural CAD HUD & On-Building Dimension Strings */}
      {viewMode === 'top' && (
        <div className="absolute inset-0 pointer-events-none z-10 font-mono text-xs select-none overflow-hidden">
          {/* SVG CAD Layer for On-Wall Dimension Strings & Witness Marks */}
          {cadProjection && (
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              {/* North Wall Dimension (Top) */}
              {(() => {
                const p1 = cadProjection.nw;
                const p2 = cadProjection.ne;
                const y = Math.min(p1.y, p2.y) - 24;
                return (
                  <g>
                    <line x1={p1.x} y1={p1.y} x2={p1.x} y2={y - 6} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p2.x} y1={p2.y} x2={p2.x} y2={y - 6} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p1.x} y1={y} x2={p2.x} y2={y} stroke="#09090b" strokeWidth="1.6" />
                    {/* Witness Ticks */}
                    <line x1={p1.x - 4} y1={y + 4} x2={p1.x + 4} y2={y - 4} stroke="#09090b" strokeWidth="2.2" />
                    <line x1={p2.x - 4} y1={y + 4} x2={p2.x + 4} y2={y - 4} stroke="#09090b" strokeWidth="2.2" />
                  </g>
                );
              })()}

              {/* South Wall Dimension (Bottom) */}
              {(() => {
                const p1 = cadProjection.sw;
                const p2 = cadProjection.se;
                const y = Math.max(p1.y, p2.y) + 24;
                return (
                  <g>
                    <line x1={p1.x} y1={p1.y} x2={p1.x} y2={y + 6} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p2.x} y1={p2.y} x2={p2.x} y2={y + 6} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p1.x} y1={y} x2={p2.x} y2={y} stroke="#09090b" strokeWidth="1.6" />
                    <line x1={p1.x - 4} y1={y + 4} x2={p1.x + 4} y2={y - 4} stroke="#09090b" strokeWidth="2.2" />
                    <line x1={p2.x - 4} y1={y + 4} x2={p2.x + 4} y2={y - 4} stroke="#09090b" strokeWidth="2.2" />
                  </g>
                );
              })()}

              {/* West Wall Dimension (Left) */}
              {(() => {
                const p1 = cadProjection.nw;
                const p2 = cadProjection.sw;
                const x = Math.min(p1.x, p2.x) - 24;
                return (
                  <g>
                    <line x1={p1.x} y1={p1.y} x2={x - 6} y2={p1.y} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p2.x} y1={p2.y} x2={x - 6} y2={p2.y} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={x} y1={p1.y} x2={x} y2={p2.y} stroke="#09090b" strokeWidth="1.6" />
                    <line x1={x - 4} y1={p1.y + 4} x2={x + 4} y2={p1.y - 4} stroke="#09090b" strokeWidth="2.2" />
                    <line x1={x - 4} y1={p2.y + 4} x2={x + 4} y2={p2.y - 4} stroke="#09090b" strokeWidth="2.2" />
                  </g>
                );
              })()}

              {/* East Wall Dimension (Right) */}
              {(() => {
                const p1 = cadProjection.ne;
                const p2 = cadProjection.se;
                const x = Math.max(p1.x, p2.x) + 24;
                return (
                  <g>
                    <line x1={p1.x} y1={p1.y} x2={x + 6} y2={p1.y} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={p2.x} y1={p2.y} x2={x + 6} y2={p2.y} stroke="#09090b" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                    <line x1={x} y1={p1.y} x2={x} y2={p2.y} stroke="#09090b" strokeWidth="1.6" />
                    <line x1={x - 4} y1={p1.y + 4} x2={x + 4} y2={p1.y - 4} stroke="#09090b" strokeWidth="2.2" />
                    <line x1={x - 4} y1={p2.y + 4} x2={x + 4} y2={p2.y - 4} stroke="#09090b" strokeWidth="2.2" />
                  </g>
                );
              })()}
            </svg>
          )}

          {/* On-Wall Floating Dimension Labels (Matching Floorplanner.com Blueprint) */}
          {cadProjection && (
            <>
              {/* North Wall Dimension Tag */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0_#000] text-[11px] font-bold text-black flex items-center gap-1 pointer-events-auto"
                style={{
                  left: (cadProjection.nw.x + cadProjection.ne.x) / 2,
                  top: Math.min(cadProjection.nw.y, cadProjection.ne.y) - 24,
                }}
              >
                <span>{roomWidth.toFixed(2)} m</span>
                <span className="text-[9px] text-stone-500 font-mono">({(roomWidth * 3.28084).toFixed(1)}ft)</span>
              </div>

              {/* South Wall Dimension Tag */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0_#000] text-[11px] font-bold text-black flex items-center gap-1 pointer-events-auto"
                style={{
                  left: (cadProjection.sw.x + cadProjection.se.x) / 2,
                  top: Math.max(cadProjection.sw.y, cadProjection.se.y) + 24,
                }}
              >
                <span>{roomWidth.toFixed(2)} m</span>
              </div>

              {/* West Wall Dimension Tag */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0_#000] text-[11px] font-bold text-black flex items-center gap-1 -rotate-90 pointer-events-auto"
                style={{
                  left: Math.min(cadProjection.nw.x, cadProjection.sw.x) - 24,
                  top: (cadProjection.nw.y + cadProjection.sw.y) / 2,
                }}
              >
                <span>{roomDepth.toFixed(2)} m</span>
                <span className="text-[9px] text-stone-500 font-mono">({(roomDepth * 3.28084).toFixed(1)}ft)</span>
              </div>

              {/* East Wall Dimension Tag */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0_#000] text-[11px] font-bold text-black flex items-center gap-1 rotate-90 pointer-events-auto"
                style={{
                  left: Math.max(cadProjection.ne.x, cadProjection.se.x) + 24,
                  top: (cadProjection.ne.y + cadProjection.se.y) / 2,
                }}
              >
                <span>{roomDepth.toFixed(2)} m</span>
              </div>

              {/* Floorplanner-Style Center Room Plaque Badge */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 border border-black/70 shadow-[2px_2px_0_rgba(0,0,0,0.15)] text-center rounded-sm pointer-events-none"
                style={{
                  left: cadProjection.center.x,
                  top: cadProjection.center.y,
                }}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-black">
                  Studio Space
                </div>
                <div className="text-xs font-black text-black">
                  {(roomWidth * roomDepth).toFixed(1)} m²
                </div>
                <div className="text-[8.5px] font-bold text-stone-500">
                  {((roomWidth * roomDepth) * 10.7639).toFixed(0)} sq ft
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Camera Preset Angles Widget */}
      {viewMode === 'perspective' && !isZenMode && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-black shadow-[2px_2px_0_rgba(0,0,0,1)] font-mono text-[10px]">
          <span className="text-stone-500 font-bold px-1 hidden sm:inline">VIEW:</span>
          <button
            onClick={() => (window as any).__SPACE_PLANNER_SNAP_CAMERA__?.('iso')}
            className="px-2 py-0.5 bg-stone-100 hover:bg-zinc-900 hover:text-white border border-stone-300 font-bold transition-all"
            title="Isometric 3D Room Vantage"
          >
            ISO
          </button>
          <button
            onClick={() => (window as any).__SPACE_PLANNER_SNAP_CAMERA__?.('north')}
            className="px-2 py-0.5 bg-stone-100 hover:bg-zinc-900 hover:text-white border border-stone-300 font-bold transition-all"
            title="North Elevation (Desk & Background Wall)"
          >
            NORTH
          </button>
          <button
            onClick={() => (window as any).__SPACE_PLANNER_SNAP_CAMERA__?.('top')}
            className="px-2 py-0.5 bg-stone-100 hover:bg-zinc-900 hover:text-white border border-stone-300 font-bold transition-all"
            title="Top-Down 3D Perspective"
          >
            TOP
          </button>
          <button
            onClick={() => (window as any).__SPACE_PLANNER_SNAP_CAMERA__?.('side')}
            className="px-2 py-0.5 bg-stone-100 hover:bg-zinc-900 hover:text-white border border-stone-300 font-bold transition-all"
            title="Side Profile / Key Light Vantage"
          >
            SIDE
          </button>
        </div>
      )}

      {/* High-Precision Laser Tape Measure Floating Snapping HUD */}
      {isMeasuring && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center flex-wrap gap-2.5 px-3.5 py-2 bg-white/95 backdrop-blur-md border border-black shadow-[3px_3px_0_rgba(0,0,0,1)] font-mono text-xs text-black max-w-[94vw]">
          <div className="flex items-center gap-1.5 bg-zinc-900 text-white px-2 py-0.5 font-bold text-[10px] uppercase">
            <span>LASER RULER</span>
          </div>

          {measureStart && (measureEnd || hoverMeasurePoint) ? (
            (() => {
              const p1 = measureStart;
              const p2 = measureEnd || hoverMeasurePoint!;
              const dist3D = Math.hypot(p2.x - p1.x, (p2.y ?? 0) - (p1.y ?? 0), p2.z - p1.z);
              const deltaX = Math.abs(p2.x - p1.x);
              const deltaZ = Math.abs(p2.z - p1.z);
              return (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-stone-500 font-bold">DISTANCE:</span>
                    <strong className="text-sm font-black text-black">{dist3D.toFixed(2)} m</strong>
                    <span className="text-stone-500 text-[11px] font-bold">({(dist3D * 3.28084).toFixed(2)} ft)</span>
                  </div>
                  <div className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 border border-stone-300">
                    ΔWidth: <strong>{deltaX.toFixed(2)}m</strong> • ΔDepth: <strong>{deltaZ.toFixed(2)}m</strong>
                  </div>
                  {p2.name && (
                    <div className="text-[10px] text-cyan-800 bg-cyan-50 px-1.5 py-0.5 border border-cyan-300 font-bold">
                      {p2.name}
                    </div>
                  )}
                </div>
              );
            })()
          ) : hoverMeasurePoint ? (
            <div className="flex items-center gap-2">
              <span className="text-stone-700 font-medium text-[11px]">
                Click point to anchor measurement • Snapped:
              </span>
              <span className="text-[10px] text-cyan-800 bg-cyan-50 px-1.5 py-0.5 border border-cyan-300 font-bold">
                {hoverMeasurePoint.name}
              </span>
            </div>
          ) : (
            <span className="text-stone-700 font-medium text-[11px]">
              Click any wall corner, edge, or equipment to anchor point
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {measureStart && (
              <button
                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-black font-bold text-[10px]"
                onClick={() => setMeasurePoints(null, null)}
              >
                Reset Point
              </button>
            )}
            <button
              className="px-2.5 py-1 bg-zinc-900 hover:bg-black text-white font-bold text-[10px]"
              onClick={() => toggleMeasuring()}
            >
              Done (M)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
