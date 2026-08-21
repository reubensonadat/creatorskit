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
import type { PlacedObject, ViewMode } from './types';

// ============================================================
// PlannerCanvas — Core Three.js 3D scene
// Handles: room rendering, equipment placement, selection,
// dragging, view switching, camera preview, resize
// ============================================================

// Scene colors
const BG_COLOR = 0xf0f0f0;
const FLOOR_COLOR = 0xe5e5e5;
const WALL_COLOR = 0xffffff;
const BASEBOARD_COLOR = 0x222222;
const ACCENT_COLOR = 0x000000;
const GRID_COLOR_A = 'rgba(0, 0, 0, 0.04)';
const GRID_COLOR_B = 'rgba(0, 0, 0, 0.08)';
const WINDOW_FRAME_COLOR = 0x333333;
const WINDOW_GLASS_COLOR = 0xadd8e6;

const SELECTION_OUTLINE_COLOR = 0x000000;
const GHOST_OPACITY = 0.45;

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
  const showCameraPreview = usePlannerStore((s) => s.showCameraPreview);
  const windows = usePlannerStore((s) => s.windows);

  const placeObject = usePlannerStore((s) => s.placeObject);
  const updateObjectPosition = usePlannerStore((s) => s.updateObjectPosition);
  const setSelectedObject = usePlannerStore((s) => s.setSelectedObject);
  const setPlacingEquipment = usePlannerStore((s) => s.setPlacingEquipment);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const getObjectY = usePlannerStore((s) => s.getObjectY);

  // ============ Room building ============
  const buildRoom = useCallback((
    scene: THREE.Scene,
    roomGroup: THREE.Group,
    w: number, d: number, h: number,
    wins: typeof windows,
  ) => {
    // Clear old
    roomGroup.clear();

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ 
        color: FLOOR_COLOR, 
        roughness: 0.35, 
        metalness: 0.05,
        envMapIntensity: 0.5,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    roomGroup.add(floor);
    floorRef.current = floor;

    // Floor grid lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.15 });
    for (let i = -d / 2; i <= d / 2; i += 0.4) {
      const pts = [new THREE.Vector3(-w / 2, 0.002, i), new THREE.Vector3(w / 2, 0.002, i)];
      roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.85, metalness: 0.02 });
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), wallMat);
    wallBack.position.set(0, h / 2, -d / 2);
    wallBack.receiveShadow = true;
    roomGroup.add(wallBack);

    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), wallMat);
    wallLeft.position.set(-w / 2, h / 2, 0);
    wallLeft.receiveShadow = true;
    roomGroup.add(wallLeft);

    // Baseboards
    const baseMat = new THREE.MeshStandardMaterial({ color: BASEBOARD_COLOR, roughness: 0.7 });
    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.02), baseMat);
    baseBack.position.set(0, 0.04, -d / 2 + 0.07);
    roomGroup.add(baseBack);
    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, d), baseMat);
    baseLeft.position.set(-w / 2 + 0.07, 0.04, 0);
    roomGroup.add(baseLeft);

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
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          (c.material as THREE.Material)?.dispose();
        }
      });
      cameraFrameRef.current = null;
    }

    const mainCam = placedObjects.find((o) => o.isMainCamera && o.equipmentId === 'camera');
    if (!mainCam) return;

    const g = new THREE.Group();
    const mesh = objectMeshesRef.current.get(mainCam.id);
    if (mesh) {
      g.position.copy(mesh.position);
      g.position.y = 0.12; // camera height
      g.rotation.y = mainCam.rotationY;
    } else {
      g.position.set(mainCam.x, 0.12, mainCam.z);
      g.rotation.y = mainCam.rotationY;
    }

    // FOV cone lines
    const fovAngle = 0.5; // ~50 degree half-angle
    const coneLength = 3.0;
    const coneWidth = Math.tan(fovAngle) * coneLength;
    const lineMat = new THREE.LineBasicMaterial({ color: 0xc75d3f, transparent: true, opacity: 0.6 });
    const left = new THREE.Vector3(0, 0, coneLength);
    left.x = -coneWidth;
    const right = new THREE.Vector3(0, 0, coneLength);
    right.x = coneWidth;
    const top = new THREE.Vector3(0, coneWidth * 0.6, coneLength);
    const bottom = new THREE.Vector3(0, -coneWidth * 0.6, coneLength);

    [left, right, top, bottom].forEach((pt) => {
      const pts = [new THREE.Vector3(0, 0, 0), pt];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      g.add(new THREE.Line(geo, lineMat));
    });

    // Frame rectangle at end
    const framePts = [left, new THREE.Vector3(coneWidth, 0, coneLength), right, new THREE.Vector3(-coneWidth, 0, coneLength), left];
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(framePts),
      lineMat
    ));

    scene.add(g);
    cameraFrameRef.current = g;
  }, [placedObjects]);

  // ============ View transition ============
  const transitionView = useCallback((mode: ViewMode) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxDim = Math.max(roomWidth, roomDepth);

    const views: Record<ViewMode, { pos: THREE.Vector3; target: THREE.Vector3; fov: number }> = {
      perspective: {
        pos: new THREE.Vector3(maxDim * 0.8, maxDim * 0.65, maxDim * 0.9),
        target: new THREE.Vector3(0, 0.5, 0),
        fov: 40,
      },
      top: {
        pos: new THREE.Vector3(0, maxDim * 1.8, 0.01),
        target: new THREE.Vector3(0, 0, 0),
        fov: 34,
      },
    };

    const target = views[mode];
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startFov = camera.fov;
    const duration = 1100;
    const startTime = performance.now();
    controls.enabled = false;

    const tick = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, target.pos, eased);
      controls.target.lerpVectors(startTarget, target.target, eased);
      camera.fov = startFov + (target.fov - startFov) * eased;
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
  }, [roomWidth, roomDepth]);

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
    const def = EQUIPMENT_CATALOG[storeObj.equipmentId];
    if (!def.surfaceHeight) return null;
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

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(5, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 2;
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xe5e5e5, 0.6);
    scene.add(hemi);

    const fill = new THREE.DirectionalLight(0xe5e5e5, 0.55);
    fill.position.set(-4, 3, -2);
    scene.add(fill);

    // Window light simulation
    const windowLight = new THREE.PointLight(0xffffff, 0.32, 8);
    windowLight.position.set(0, roomHeight * 0.6, -roomDepth / 2 + 1);
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
