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

export const isCamEquipment = (id?: any): boolean =>
  typeof id === 'string' &&
  (id === 'camera' ||
    id.startsWith('cam') ||
    id.includes('phone') ||
    id.includes('webcam') ||
    id.includes('prompter') ||
    id.includes('teleprompter'));

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
  const lightingVisualizersRef = useRef<THREE.Group | null>(null);
  const acousticRaysRef = useRef<THREE.Group | null>(null);
  const ghostRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const composerRef = useRef<EffectComposer | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
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
  const dragOffsetRef = useRef(new THREE.Vector3());

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
  const timeOfDay = usePlannerStore((s) => s.timeOfDay);
  const setTimeOfDay = usePlannerStore((s) => s.setTimeOfDay);
  const isMeasuring = usePlannerStore((s) => s.isMeasuring);
  const measureStart = usePlannerStore((s) => s.measureStart);
  const measureEnd = usePlannerStore((s) => s.measureEnd);
  const setMeasurePoints = usePlannerStore((s) => s.setMeasurePoints);
  const toggleMeasuring = usePlannerStore((s) => s.toggleMeasuring);
  const showLightBeams = usePlannerStore((s) => s.showLightBeams);

  const measureGroupRef = useRef<THREE.Group | null>(null);
  const [hoverMeasurePoint, setHoverMeasurePoint] = useState<{ x: number; y: number; z: number; name?: string } | null>(null);

  const placeObject = usePlannerStore((s) => s.placeObject);
  const updateObjectPosition = usePlannerStore((s) => s.updateObjectPosition);
  const updateObjectLens = usePlannerStore((s) => s.updateObjectLens);
  const updateObjectSensor = usePlannerStore((s) => s.updateObjectSensor);
  const updateObjectAperture = usePlannerStore((s) => s.updateObjectAperture);
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

  // ============ Room building (All 4 Walls Architecture & Dynamic Floor Textures) ============
  const buildRoom = useCallback((
    scene: THREE.Scene,
    roomGroup: THREE.Group,
    w: number, d: number, h: number,
    wins: typeof windows,
    finish = floorFinish
  ) => {
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

    // Floor precision measurement grid lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x6e6559, transparent: true, opacity: 0.18 });
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

    // Back Wall
    const backWallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
    backWallMesh.position.set(0, h / 2, -d / 2 - wallThickness / 2);
    backWallMesh.receiveShadow = true;
    backGroup.add(backWallMesh);
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(w, baseboardH, 0.015), baseboardMat);
    bbBack.position.set(0, baseboardH / 2, -d / 2 + 0.008);
    backGroup.add(bbBack);

    // Front Wall
    const frontWallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThickness), wallMat);
    frontWallMesh.position.set(0, h / 2, d / 2 + wallThickness / 2);
    frontWallMesh.receiveShadow = true;
    frontGroup.add(frontWallMesh);
    const bbFront = new THREE.Mesh(new THREE.BoxGeometry(w, baseboardH, 0.015), baseboardMat);
    bbFront.position.set(0, baseboardH / 2, d / 2 - 0.008);
    frontGroup.add(bbFront);

    // Left Wall
    const leftWallMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    leftWallMesh.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    leftWallMesh.receiveShadow = true;
    leftGroup.add(leftWallMesh);
    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.015, baseboardH, d), baseboardMat);
    bbLeft.position.set(-w / 2 + 0.008, baseboardH / 2, 0);
    leftGroup.add(bbLeft);

    // Right Wall
    const rightWallMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, d), wallMat);
    rightWallMesh.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    rightWallMesh.receiveShadow = true;
    rightGroup.add(rightWallMesh);
    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.015, baseboardH, d), baseboardMat);
    bbRight.position.set(w / 2 - 0.008, baseboardH / 2, 0);
    rightGroup.add(bbRight);

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

    const sensor = cam.sensorSize || (id.includes('phone') ? 'smartphone' : 'full-frame');
    const lens = cam.lensPreset || '24mm';
    const opt = calculateOpticalFov(lens, sensor);

    if (id.includes('phone') || id.includes('gimbal')) {
      localY = baseY > 0.4 ? 0.28 : 1.28;
      localZ = 0.05;
    } else if (id.includes('webcam')) {
      localY = 0.48;
      localZ = 0.05;
    } else if (id.includes('overhead')) {
      localY = 2.0;
      localZ = 0;
    } else if (id.includes('pedestal') || id.includes('broadcast')) {
      localY = 1.45;
      localZ = 0.35;
    } else if (id.includes('prompter') || id.includes('teleprompter')) {
      localY = 1.35;
      localZ = 0.15;
    } else {
      localY = baseY > 0.4 ? 0.35 : 1.25;
      localZ = 0.14;
    }

    return {
      x: cam.x,
      y: baseY + localY,
      z: cam.z,
      localY,
      localZ,
      fov: opt.verticalFovDegrees,
      hFov: opt.horizontalFovDegrees,
      opt,
    };
  }, [getObjectY]);

  // ============ Optical Camera Frustum & Cone Visualizer ============
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

    const coralColor = 0xc75d3f;
    const frustumMat = new THREE.LineBasicMaterial({ color: coralColor, transparent: true, opacity: 0.88 });
    const subtleMat = new THREE.LineBasicMaterial({ color: 0xdb7b60, transparent: true, opacity: 0.45 });
    const floorMat = new THREE.LineBasicMaterial({ color: 0x4a7a8c, transparent: true, opacity: 0.45 });

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
  }, [placedObjects, getObjectY, getCameraLensPos]);

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

    if (!showLightBeams) return;

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
      const throwDist = 2.4 * Math.max(0.6, intensity);
      const beamRadius = Math.tan((30 * Math.PI) / 180) * throwDist;

      const coneGeo = new THREE.ConeGeometry(beamRadius, throwDist, 24, 1, true);
      coneGeo.translate(0, -throwDist / 2, 0);
      coneGeo.rotateX(-Math.PI / 2);

      const coneMat = new THREE.MeshBasicMaterial({
        color: lightHex,
        transparent: true,
        opacity: 0.18 * intensity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      g.add(new THREE.Mesh(coneGeo, coneMat));
      masterGroup.add(g);
    });

    scene.add(masterGroup);
    lightingVisualizersRef.current = masterGroup;
  }, [placedObjects, showLightBeams, getObjectY]);

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

    if (!showAcousticRays) return;

    const g = new THREE.Group();
    const talent = placedObjects.find(
      (o) => o.equipmentId.includes('chair') || o.equipmentId.includes('desk') || o.equipmentId.includes('human')
    ) || { x: 0, z: 0 };

    const mic = placedObjects.find((o) => o.equipmentId.includes('mic')) || {
      x: talent.x,
      z: talent.z + 0.4,
    };

    const hw = roomWidth / 2;
    const hd = roomDepth / 2;
    const soundY = 1.25;

    // Reflection math: Mirror points on Left Wall (x = -hw) and Right Wall (x = hw)
    const traceReflection = (wallX: number) => {
      const zReflect = (talent.z + mic.z) / 2;
      const pTalent = new THREE.Vector3(talent.x, soundY, talent.z);
      const pWall = new THREE.Vector3(wallX, soundY, zReflect);
      const pMic = new THREE.Vector3(mic.x, soundY, mic.z);

      const rayMat = new THREE.LineDashedMaterial({
        color: 0x9333ea,
        dashSize: 0.1,
        gapSize: 0.05,
        linewidth: 2,
      });

      const line1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pTalent, pWall]), rayMat);
      line1.computeLineDistances();
      g.add(line1);

      const line2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pWall, pMic]), rayMat);
      line2.computeLineDistances();
      g.add(line2);

      // Acoustic Panel Target Marker on Wall
      const targetMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide });
      const target = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 24), targetMat);
      target.position.set(wallX + (wallX < 0 ? 0.01 : -0.01), soundY, zReflect);
      target.rotation.y = Math.PI / 2;
      g.add(target);
    };

    traceReflection(-hw);
    traceReflection(hw);

    scene.add(g);
    acousticRaysRef.current = g;
  }, [placedObjects, showAcousticRays, roomWidth, roomDepth]);

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

  // Handle Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.Fog(BG_COLOR, 18, 42);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3.2, 4.5);
    cameraRef.current = camera;

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

      composer.render();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!container || !renderer || !camera || !composer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [buildRoom, roomWidth, roomDepth, roomHeight, windows, floorFinish]);

  // Sync scene models
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    objectMeshesRef.current.forEach((group) => scene.remove(group));
    objectMeshesRef.current.clear();

    placedObjects.forEach((obj) => {
      const group = createEquipmentModel(obj.equipmentId, obj);
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

    const subject = placedObjects.find(
      (o) => o.equipmentId.includes('chair') || o.equipmentId.includes('desk') || o.equipmentId.includes('human')
    );
    const distM = subject ? Math.hypot(activeCamera.x - subject.x, activeCamera.z - subject.z) : 1.6;
    const backdropDistM = Math.max(0.5, (subject ? subject.z : 0) - -roomDepth / 2);
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
      className={`relative w-full h-full bg-[#F5F1EA] overflow-hidden ${placingEquipmentId ? 'cursor-crosshair' : ''}`}
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
      {/* Director POV Framing & Optical HUD Overlay */}
      {viewMode === 'camera-pov' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3">
          {/* Top Bar with Camera Metadata & Optical Quick Bar */}
          <div className="flex items-center justify-between pointer-events-auto flex-wrap gap-2">
            <div className="flex items-center gap-2 p-1 bg-black/90 text-white backdrop-blur border border-white/20 shadow-xl font-mono text-[11px]">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 font-bold text-white tracking-widest animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" /> REC 4K
              </span>
              <span className="text-zinc-200 font-bold">
                {activeCamera?.lensPreset || '24mm'} • {opticalMetrics?.opt.effectiveFocalLengthMm.toFixed(0)}mm Eq. • {activeCamera?.aperture || 'f/2.8'}
              </span>
              <span className="text-[#FFE500] font-bold">
                {opticalMetrics?.opt.horizontalFovDegrees}° H-FOV
              </span>
            </div>

            {/* Aspect Ratio Guides Switcher */}
            <div className="flex items-center gap-1 p-1 bg-black/90 text-white backdrop-blur border border-white/20 font-mono text-[11px]">
              <span className="text-[10px] text-zinc-400 px-1 font-bold">CROP:</span>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '16:9' ? 'bg-[#FFDD00] text-black' : 'hover:bg-white/10 text-white'
                }`}
                onClick={() => setAspectRatio('16:9')}
              >
                16:9 YT
              </button>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '9:16' ? 'bg-[#FFDD00] text-black' : 'hover:bg-white/10 text-white'
                }`}
                onClick={() => setAspectRatio('9:16')}
              >
                9:16 Shorts
              </button>
              <button
                className={`px-2 py-0.5 text-xs font-bold transition-all ${
                  aspectRatio === '4:5' ? 'bg-[#FFDD00] text-black' : 'hover:bg-white/10 text-white'
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
              className={`relative border-2 border-[#FFDD00]/80 transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
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
                  <div className="border-r border-white/25" />
                  <div className="border-r border-white/25" />
                  <div />
                </div>
              )}

              {/* TikTok / Reels UI Overlay Protection */}
              {showTikTokUIOverlay && aspectRatio === '9:16' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                  <div className="h-10 bg-black/40 border border-dashed border-cyan-400/60 flex items-center justify-center text-[9px] font-mono text-cyan-300">
                    TOP HEADER / SEARCH / FOR YOU (Keep clean)
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-[60%] h-20 bg-black/40 border border-dashed border-amber-400/60 p-1 text-[8px] font-mono text-amber-300">
                      CAPTIONS & USERNAME SAFE AREA
                    </div>
                    <div className="w-12 h-36 bg-black/40 border border-dashed border-red-400/60 flex flex-col justify-around items-center text-[7px] font-mono text-red-300 text-center">
                      <span>LIKE</span>
                      <span>COMMENT</span>
                      <span>SHARE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Center Eyeline Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 border border-white/50 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#FFDD00] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Optical Diagnostic HUD */}
          <div className="pointer-events-auto flex items-center justify-between gap-3 p-2.5 bg-black/95 text-white backdrop-blur border border-white/20 font-mono text-xs shadow-2xl flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-[#FFE500] text-black font-black text-[10px]">
                DIRECTOR HUD
              </span>
              <span className="text-zinc-300">
                Subject Dist: <strong className="text-emerald-400">{opticalMetrics?.distM ?? 1.6}m</strong>
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-300">
                Bokeh Score: <strong className="text-amber-400">{opticalMetrics?.framing.bokehScore}/10</strong>
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
                      ? 'bg-[#FFE500] text-black'
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

      {/* 2D Blueprint Mode Architectural HUD */}
      {viewMode === 'top' && (
        <div className="absolute inset-0 pointer-events-none z-10 p-4 flex flex-col justify-between font-mono text-xs">
          {/* Top Dimension Header Callout */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 p-1.5 bg-white/95 backdrop-blur border-2 border-black shadow-[3px_3px_0_#000] text-black">
              <span className="px-1.5 py-0.5 bg-black text-[#FFE500] font-black text-[9.5px] uppercase">
                2D Blueprint
              </span>
              <span className="font-bold text-[11px]">
                Width: {roomWidth.toFixed(2)}m ({(roomWidth * 3.28084).toFixed(1)}ft) × Depth: {roomDepth.toFixed(2)}m ({(roomDepth * 3.28084).toFixed(1)}ft)
              </span>
              <span className="text-stone-400">|</span>
              <span className="text-stone-600 text-[10px]">
                Area: {(roomWidth * roomDepth).toFixed(1)}m² ({((roomWidth * roomDepth) * 10.7639).toFixed(0)} sq ft)
              </span>
            </div>

            {/* Quick Room Scale Adjusters on Blueprint */}
            <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur border-2 border-black shadow-[2px_2px_0_#000]">
              <span className="text-[10px] font-bold text-stone-600 px-1">ROOM:</span>
              <button
                onClick={() => usePlannerStore.getState().setRoomDimensions(Math.max(2, roomWidth - 0.5), roomDepth, roomHeight)}
                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-black font-bold text-[10px]"
                title="Decrease Room Width by 0.5m"
              >
                W -0.5m
              </button>
              <button
                onClick={() => usePlannerStore.getState().setRoomDimensions(Math.min(15, roomWidth + 0.5), roomDepth, roomHeight)}
                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-black font-bold text-[10px]"
                title="Increase Room Width by 0.5m"
              >
                W +0.5m
              </button>
              <button
                onClick={() => usePlannerStore.getState().setRoomDimensions(roomWidth, Math.max(2, roomDepth - 0.5), roomHeight)}
                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-black font-bold text-[10px]"
                title="Decrease Room Depth by 0.5m"
              >
                D -0.5m
              </button>
              <button
                onClick={() => usePlannerStore.getState().setRoomDimensions(roomWidth, Math.min(15, roomDepth + 0.5), roomHeight)}
                className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-black font-bold text-[10px]"
                title="Increase Room Depth by 0.5m"
              >
                D +0.5m
              </button>
            </div>
          </div>

          {/* Blueprint Dimension Overlay Lines */}
          <div className="relative flex-1 flex items-center justify-center pointer-events-none my-4">
            <div className="relative w-[78%] h-[78%] border border-dashed border-black/25 flex flex-col justify-between items-center p-2">
              {/* Top Width Wall Dimension */}
              <div className="w-full flex items-center justify-center gap-2 text-stone-800 font-bold text-[11px] bg-white/90 px-2 py-0.5 border border-black/40 shadow-sm max-w-fit">
                <span>◀ ── {roomWidth.toFixed(2)}m ({(roomWidth * 3.28084).toFixed(1)}ft) ── ▶</span>
              </div>

              {/* Side Depth Wall Dimension */}
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-1 text-stone-800 font-bold text-[11px] bg-white/90 px-2 py-0.5 border border-black/40 shadow-sm rotate-[-90deg] origin-center">
                  <span>◀ ── {roomDepth.toFixed(2)}m ── ▶</span>
                </div>
                <div className="flex items-center gap-1 text-stone-800 font-bold text-[11px] bg-white/90 px-2 py-0.5 border border-black/40 shadow-sm rotate-[90deg] origin-center">
                  <span>◀ ── {(roomDepth * 3.28084).toFixed(1)}ft ── ▶</span>
                </div>
              </div>

              {/* Bottom Center Reference */}
              <div className="text-[10px] text-stone-500 bg-white/80 px-2 py-0.5 border border-black/20">
                Grid Spacing: 0.5m × 0.5m precision snap • North orientation
              </div>
            </div>
          </div>

          {/* Bottom Blueprint Toolbar Indicator */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 p-1.5 bg-black text-white font-mono text-[10.5px]">
              <span className="text-[#FFE500] font-bold">2D ORTHO VIEW</span>
              <span className="text-zinc-400">• Drag objects to reposition</span>
              <span className="text-zinc-400">• R to Rotate</span>
              <span className="text-zinc-400">• Click 3D for Perspective</span>
            </div>

            <button
              onClick={() => usePlannerStore.getState().setViewMode('perspective')}
              className="btn px-3 py-1 bg-[#FFE500] hover:bg-amber-300 text-black border-2 border-black font-black text-xs shadow-[2px_2px_0_#000]"
            >
              Switch to 3D Orbit View →
            </button>
          </div>
        </div>
      )}

      {/* Interactive Laser Tape Measure Floating HUD */}
      {isMeasuring && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center flex-wrap gap-2.5 px-3.5 py-2 bg-white/95 backdrop-blur-md border-2 border-black shadow-[4px_4px_0_#000] font-mono text-xs text-black max-w-[94vw]">
          <div className="flex items-center gap-1.5 bg-black text-[#FFE500] px-2 py-0.5 font-black text-[10px] uppercase">
            <span>RULER</span>
          </div>

          {measureStart && (measureEnd || hoverMeasurePoint) ? (
            (() => {
              const p1 = measureStart;
              const p2 = measureEnd || hoverMeasurePoint!;
              const dist3D = Math.hypot(p2.x - p1.x, (p2.y ?? 0) - (p1.y ?? 0), p2.z - p1.z);
              return (
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-black text-black">{dist3D.toFixed(2)} m</strong>
                  <span className="text-stone-500 text-[11px] font-bold">({(dist3D * 3.28084).toFixed(2)} ft)</span>
                </div>
              );
            })()
          ) : (
            <span className="text-stone-700 font-medium text-[11px]">
              Click any equipment or floor point to start measuring
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              className="px-2.5 py-1 bg-black hover:bg-stone-800 text-white font-bold text-[10px]"
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
