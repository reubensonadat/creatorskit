'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { usePlannerStore } from './store';
import { ARCHITECTURAL_CATALOG, createArchitectural3DModel } from './house-catalog';
import { COMPREHENSIVE_EQUIPMENT_CATALOG } from './gear-library';
import { createEquipmentModel } from './equipment';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Compass,
  Eye,
  EyeOff,
  Box,
  Layout,
  Move,
} from 'lucide-react';
import type { PlacedObject, WallSegment, HouseOpening, RoomZone, FloorLevel } from './types';

// ============================================================
// 2D & 3D Architectural Canvas for Ghanaian & Modern Homes
// ============================================================

export default function ArchitecturalCanvas() {
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);
  const plotConfig = usePlannerStore((s) => s.plotConfig);
  const roofConfig = usePlannerStore((s) => s.roofConfig);
  const toggleRoofVisible = usePlannerStore((s) => s.toggleRoofVisible);
  const activeFloor = usePlannerStore((s) => s.activeFloor);
  const setActiveFloor = usePlannerStore((s) => s.setActiveFloor);
  const hasFirstFloor = usePlannerStore((s) => s.hasFirstFloor);
  const showFloorGhost = usePlannerStore((s) => s.showFloorGhost);
  const toggleFloorGhost = usePlannerStore((s) => s.toggleFloorGhost);

  const wallSegments = usePlannerStore((s) => s.wallSegments);
  const houseOpenings = usePlannerStore((s) => s.houseOpenings);
  const roomZones = usePlannerStore((s) => s.roomZones);
  const placedObjects = usePlannerStore((s) => s.placedObjects);
  const selectedObjectId = usePlannerStore((s) => s.selectedObjectId);
  const setSelectedObject = usePlannerStore((s) => s.setSelectedObject);
  const updateObjectPosition = usePlannerStore((s) => s.updateObjectPosition);

  // 2D Canvas Pan and Zoom State
  const [zoom, setZoom] = useState(24); // pixels per meter
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // 2D Dragging Object State
  const [draggingObjId, setDraggingObjId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, z: 0 });

  // 3D Mount Refs
  const mount3DRef = useRef<HTMLDivElement>(null);
  const scene3DRef = useRef<THREE.Scene | null>(null);
  const camera3DRef = useRef<THREE.PerspectiveCamera | null>(null);
  const renderer3DRef = useRef<THREE.WebGLRenderer | null>(null);
  const controls3DRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);

  // Filter items for active floor
  const currentFloorObjects = useMemo(() => {
    return placedObjects.filter((o) => (o.floor || 'ground') === activeFloor);
  }, [placedObjects, activeFloor]);

  const currentFloorRooms = useMemo(() => {
    return roomZones.filter((r) => (r.floor || 'ground') === activeFloor);
  }, [roomZones, activeFloor]);

  const currentFloorWalls = useMemo(() => {
    return wallSegments.filter((w) => (w.floor || 'ground') === activeFloor);
  }, [wallSegments, activeFloor]);

  const groundFloorRooms = useMemo(() => {
    return roomZones.filter((r) => (r.floor || 'ground') === 'ground');
  }, [roomZones]);

  // ─────────────────────────────────────────────────────────────
  // 2D INTERACTION HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handle2DMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      // Check if target is not an item
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handle2DMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    } else if (draggingObjId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2 + pan.x;
      const centerY = rect.height / 2 + pan.y;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const meterX = (mouseX - centerX) / zoom - dragOffsetRef.current.x;
      const meterZ = (mouseY - centerY) / zoom - dragOffsetRef.current.z;

      // Snap to 0.2m grid
      const snappedX = Math.round(meterX * 5) / 5;
      const snappedZ = Math.round(meterZ * 5) / 5;

      updateObjectPosition(draggingObjId, snappedX, snappedZ);
    }
  };

  const handle2DMouseUp = () => {
    setIsPanning(false);
    setDraggingObjId(null);
  };

  const handle2DWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((z) => Math.max(10, Math.min(60, z * factor)));
  };

  const handleResetView = () => {
    setZoom(24);
    setPan({ x: 0, y: 0 });
  };

  // ─────────────────────────────────────────────────────────────
  // 3D SCENE INITIALIZATION & UPDATE
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (viewMode === '2d' || !mount3DRef.current) return;

    const container = mount3DRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene3DRef.current = scene;
    scene.background = new THREE.Color(0xf0ece1); // Soft architectural sand
    scene.fog = new THREE.FogExp2(0xf0ece1, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 150);
    camera.position.set(22, 18, 25);
    camera3DRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer3DRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep above ground
    controls.minDistance = 6;
    controls.maxDistance = 65;
    controls.target.set(0, 1.5, 0);
    controls3DRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x44403c, 0.75);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e6, 1.4);
    sunLight.position.set(24, 32, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 80;
    const d = 26;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 6. Build Compound & Ground
    const plotW = plotConfig.widthM || 30.48;
    const plotD = plotConfig.depthM || 24.38;

    // Outer Earth / Grass Plane
    const earthGeo = new THREE.PlaneGeometry(plotW * 1.5, plotD * 1.5);
    earthGeo.rotateX(-Math.PI / 2);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x98a18a, roughness: 0.9 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.y = -0.05;
    earth.receiveShadow = true;
    scene.add(earth);

    // Plot Paved Compound
    const plotGeo = new THREE.PlaneGeometry(plotW, plotD);
    plotGeo.rotateX(-Math.PI / 2);
    const plotMat = new THREE.MeshStandardMaterial({
      color: plotConfig.compoundFinish === 'grass-lawn' ? 0x476b42 : 0xc7c4bc,
      roughness: 0.8,
    });
    const plotMesh = new THREE.Mesh(plotGeo, plotMat);
    plotMesh.position.y = 0;
    plotMesh.receiveShadow = true;
    scene.add(plotMesh);

    // Perimeter Fence Wall (if enabled)
    if (plotConfig.showPerimeterFence) {
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0xe3e0d8, roughness: 0.8 });
      const fenceH = plotConfig.fenceHeightM || 2.2;
      const halfW = plotW / 2;
      const halfD = plotD / 2;

      // Back wall
      const bWallGeo = new THREE.BoxGeometry(plotW, fenceH, 0.23);
      const bWall = new THREE.Mesh(bWallGeo, fenceMat);
      bWall.position.set(0, fenceH / 2, -halfD);
      bWall.castShadow = true;
      bWall.receiveShadow = true;
      scene.add(bWall);

      // Left wall
      const lWallGeo = new THREE.BoxGeometry(0.23, fenceH, plotD);
      const lWall = new THREE.Mesh(lWallGeo, fenceMat);
      lWall.position.set(-halfW, fenceH / 2, 0);
      lWall.castShadow = true;
      lWall.receiveShadow = true;
      scene.add(lWall);

      // Right wall
      const rWallGeo = new THREE.BoxGeometry(0.23, fenceH, plotD);
      const rWall = new THREE.Mesh(rWallGeo, fenceMat);
      rWall.position.set(halfW, fenceH / 2, 0);
      rWall.castShadow = true;
      rWall.receiveShadow = true;
      scene.add(rWall);

      // Front wall with gate opening
      const gateWidth = 4.5;
      const wallPartW = (plotW - gateWidth) / 2;
      const fWallGeo1 = new THREE.BoxGeometry(wallPartW, fenceH, 0.23);
      const fWall1 = new THREE.Mesh(fWallGeo1, fenceMat);
      fWall1.position.set(-halfW + wallPartW / 2, fenceH / 2, halfD);
      fWall1.castShadow = true;
      scene.add(fWall1);

      const fWall2 = new THREE.Mesh(fWallGeo1, fenceMat);
      fWall2.position.set(halfW - wallPartW / 2, fenceH / 2, halfD);
      fWall2.castShadow = true;
      scene.add(fWall2);
    }

    // 7. House German Floor Slab (Foundation Slab)
    const slabMat = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.6 });
    const slabH = 0.25;

    // Combine room bounding boxes for floor slab
    let minX = -8, maxX = 8, minZ = -6.5, maxZ = 6.5;
    if (roomZones.length > 0) {
      minX = Math.min(...roomZones.map((r) => r.x - r.width / 2));
      maxX = Math.max(...roomZones.map((r) => r.x + r.width / 2));
      minZ = Math.min(...roomZones.map((r) => r.z - r.depth / 2));
      maxZ = Math.max(...roomZones.map((r) => r.z + r.depth / 2));
    }

    const houseW = maxX - minX + 0.6;
    const houseD = maxZ - minZ + 0.6;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const slabGeo = new THREE.BoxGeometry(houseW, slabH, houseD);
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(centerX, slabH / 2, centerZ);
    slabMesh.receiveShadow = true;
    scene.add(slabMesh);

    // 8. Extrude Architectural Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf6f4ed, roughness: 0.7 });
    const innerWallMat = new THREE.MeshStandardMaterial({ color: 0xefede6, roughness: 0.8 });

    // Ground Floor Walls
    const groundWalls = wallSegments.filter((w) => (w.floor || 'ground') === 'ground');
    for (const wall of groundWalls) {
      const dx = wall.endX - wall.startX;
      const dz = wall.endZ - wall.startZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const thick = wall.thickness === '5-inch' ? 0.13 : wall.thickness === '9-inch' ? 0.23 : 0.15;
      const h = wall.height || 3.0;

      const wGeo = new THREE.BoxGeometry(len, h, thick);
      const wMesh = new THREE.Mesh(wGeo, wall.isPerimeter ? wallMat : innerWallMat);
      wMesh.position.set(
        (wall.startX + wall.endX) / 2,
        slabH + h / 2,
        (wall.startZ + wall.endZ) / 2
      );
      wMesh.rotation.y = -angle;
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      scene.add(wMesh);
    }

    // First Floor (if 2-storey building)
    if (hasFirstFloor) {
      const firstFloorY = slabH + 3.0; // on top of 3.0m ground floor
      // Intermediate suspended concrete slab
      const firstSlabGeo = new THREE.BoxGeometry(houseW * 0.95, 0.2, houseD * 0.95);
      const firstSlab = new THREE.Mesh(firstSlabGeo, slabMat);
      firstSlab.position.set(centerX, firstFloorY + 0.1, centerZ);
      firstSlab.castShadow = true;
      firstSlab.receiveShadow = true;
      scene.add(firstSlab);

      const firstWalls = wallSegments.filter((w) => w.floor === 'first');
      for (const wall of firstWalls) {
        const dx = wall.endX - wall.startX;
        const dz = wall.endZ - wall.startZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const thick = wall.thickness === '5-inch' ? 0.13 : 0.15;
        const h = wall.height || 3.0;

        const wGeo = new THREE.BoxGeometry(len, h, thick);
        const wMesh = new THREE.Mesh(wGeo, wallMat);
        wMesh.position.set(
          (wall.startX + wall.endX) / 2,
          firstFloorY + 0.2 + h / 2,
          (wall.startZ + wall.endZ) / 2
        );
        wMesh.rotation.y = -angle;
        wMesh.castShadow = true;
        scene.add(wMesh);
      }
    }

    // 9. Roof Construction
    const totalBuildingH = slabH + 3.0 + (hasFirstFloor ? 3.2 : 0);

    if (roofConfig.visible && roofConfig.type !== 'open-cutaway') {
      if (roofConfig.type === 'hidden-parapet') {
        // GHANAIAN SIGNATURE HIDDEN PARAPET ROOF:
        // Perimeter parapet walls (0.8m high) around building top + coping slab on top
        const pHeight = roofConfig.parapetHeightM || 0.8;
        const parapetMat = new THREE.MeshStandardMaterial({ color: 0xdedbd3, roughness: 0.7 });
        const copingMat = new THREE.MeshStandardMaterial({ color: 0x36383a, roughness: 0.5 });

        // Parapet front & back
        const pFrontGeo = new THREE.BoxGeometry(houseW, pHeight, 0.2);
        const pFront = new THREE.Mesh(pFrontGeo, parapetMat);
        pFront.position.set(centerX, totalBuildingH + pHeight / 2, centerZ + houseD / 2);
        pFront.castShadow = true;
        scene.add(pFront);

        const pBack = new THREE.Mesh(pFrontGeo, parapetMat);
        pBack.position.set(centerX, totalBuildingH + pHeight / 2, centerZ - houseD / 2);
        pBack.castShadow = true;
        scene.add(pBack);

        // Parapet left & right
        const pSideGeo = new THREE.BoxGeometry(0.2, pHeight, houseD);
        const pLeft = new THREE.Mesh(pSideGeo, parapetMat);
        pLeft.position.set(centerX - houseW / 2, totalBuildingH + pHeight / 2, centerZ);
        pLeft.castShadow = true;
        scene.add(pLeft);

        const pRight = new THREE.Mesh(pSideGeo, parapetMat);
        pRight.position.set(centerX + houseW / 2, totalBuildingH + pHeight / 2, centerZ);
        pRight.castShadow = true;
        scene.add(pRight);

        // Coping stone caps on top of parapet
        const copingGeo = new THREE.BoxGeometry(houseW + 0.2, 0.08, houseD + 0.2);
        // Recessed low-slope Aluzinc roof deck concealed inside
        const roofDeckGeo = new THREE.BoxGeometry(houseW - 0.4, 0.1, houseD - 0.4);
        const roofDeckMat = new THREE.MeshStandardMaterial({ color: 0x4a4f54, metalness: 0.4, roughness: 0.4 });
        const roofDeck = new THREE.Mesh(roofDeckGeo, roofDeckMat);
        roofDeck.position.set(centerX, totalBuildingH + 0.15, centerZ);
        roofDeck.rotation.x = 0.04; // subtle 3% slope towards rear gutter
        scene.add(roofDeck);
      } else if (roofConfig.type === 'hip') {
        // Classic 4-Pitch Hip Roof
        const hipGeo = new THREE.ConeGeometry(Math.max(houseW, houseD) * 0.72, 2.8, 4);
        hipGeo.rotateY(Math.PI / 4);
        const hipMat = new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.5 });
        const hipRoof = new THREE.Mesh(hipGeo, hipMat);
        hipRoof.position.set(centerX, totalBuildingH + 1.4, centerZ);
        hipRoof.castShadow = true;
        scene.add(hipRoof);
      }
    }

    // 10. Placed Furniture & Architectural Models
    for (const obj of placedObjects) {
      let model: THREE.Group;
      if (typeof obj.equipmentId === 'string' && obj.equipmentId.startsWith('arch-')) {
        model = createArchitectural3DModel(obj.equipmentId);
      } else {
        model = createEquipmentModel(obj.equipmentId);
      }

      const floorOffset = obj.floor === 'first' ? slabH + 3.2 : slabH;
      model.position.set(obj.x, floorOffset + (obj.elevationY || 0), obj.z);
      model.rotation.y = obj.rotationY || 0;

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
    }

    // 11. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 12. Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, [
    viewMode,
    plotConfig,
    roofConfig,
    wallSegments,
    roomZones,
    placedObjects,
    hasFirstFloor,
  ]);

  // Floor Finish Color mapping for 2D Blueprint View
  const getFloorFinishColor = (finish?: string) => {
    switch (finish) {
      case 'porcelain-cream': return '#FAF6F0';
      case 'porcelain-grey': return '#EAE8E4';
      case 'marble-white': return '#F7F7F7';
      case 'hardwood-teak': return '#EDE2D0';
      case 'terrazzo-polish': return '#ECE8E1';
      case 'bathroom-tile': return '#E1EEF4';
      case 'pavement-blocks': return '#DCD9D0';
      case 'grass-lawn': return '#E0EAD8';
      default: return '#FAF8F5';
    }
  };

  return (
    <div className="w-full h-full relative select-none bg-[#EAE7DF] overflow-hidden flex flex-col">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP VIEW CONTROLS & FLOORS SWITCHER
      ────────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        {/* Left: View Mode Toggle (2D Blueprint vs 3D Orbit) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black border border-black transition-all cursor-pointer ${
              viewMode === '2d' ? 'bg-[#FFDE59] text-black' : 'bg-white text-[#4A4744] hover:bg-black/5'
            }`}
          >
            <Layout size={14} />
            <span>2D BLUEPRINT</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black border border-black transition-all cursor-pointer ${
              viewMode === '3d' || viewMode === 'perspective' ? 'bg-[#FFDE59] text-black' : 'bg-white text-[#4A4744] hover:bg-black/5'
            }`}
          >
            <Box size={14} />
            <span>3D ORBIT VIEW</span>
          </button>
        </div>

        {/* Center: Floor Level Switcher (Ground Floor / First Floor) */}
        <div className="pointer-events-auto flex items-center bg-white border-2 border-black p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setActiveFloor('ground')}
            className={`px-3 py-1.5 text-xs font-mono font-bold border border-black transition-colors cursor-pointer ${
              activeFloor === 'ground' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
            }`}
          >
            Ground Floor
          </button>
          {hasFirstFloor && (
            <button
              onClick={() => setActiveFloor('first')}
              className={`px-3 py-1.5 text-xs font-mono font-bold border border-black transition-colors cursor-pointer ${
                activeFloor === 'first' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
              }`}
            >
              First Floor (Upper)
            </button>
          )}
          {hasFirstFloor && activeFloor === 'first' && (
            <button
              onClick={toggleFloorGhost}
              className={`ml-1.5 px-2 py-1.5 text-[11px] font-mono border border-black transition-colors cursor-pointer flex items-center gap-1 ${
                showFloorGhost ? 'bg-black/10 text-black' : 'bg-white text-black/50'
              }`}
              title="Toggle Ground Floor Ghost Underlay"
            >
              <Layers size={13} />
              <span>Underlay</span>
            </button>
          )}
        </div>

        {/* Right: Roof Toggle (3D Mode) & Plot Preset Indicator */}
        <div className="pointer-events-auto flex items-center gap-2">
          {viewMode !== '2d' && (
            <button
              onClick={toggleRoofVisible}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-black/5 transition-colors cursor-pointer`}
            >
              {roofConfig.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{roofConfig.visible ? 'Roof On (Parapet)' : 'Roof Off (Cutaway)'}</span>
            </button>
          )}

          <div className="bg-white border-2 border-black px-3 py-1.5 text-xs font-mono font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5">
            <Compass size={14} className="text-amber-700" />
            <span>Plot: {plotConfig.widthFt}' × {plotConfig.depthFt}'</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CANVAS AREA
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full h-full relative">
        {viewMode === '2d' ? (
          // ─── 2D ARCHITECTURAL BLUEPRINT (SVG CANVAS) ───
          <svg
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handle2DMouseDown}
            onMouseMove={handle2DMouseMove}
            onMouseUp={handle2DMouseUp}
            onWheel={handle2DWheel}
          >
            <defs>
              {/* Architectural Grid */}
              <pattern id="archGrid" width={zoom} height={zoom} patternUnits="userSpaceOnUse">
                <path d={`M ${zoom} 0 L 0 0 0 ${zoom}`} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
              </pattern>
              <pattern id="archGridMajor" width={zoom * 5} height={zoom * 5} patternUnits="userSpaceOnUse">
                <rect width={zoom * 5} height={zoom * 5} fill="url(#archGrid)" />
                <path d={`M ${zoom * 5} 0 L 0 0 0 ${zoom * 5}`} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
              </pattern>

              {/* Interlocking Paving Stones Pattern */}
              <pattern id="pavingBlocks" width={zoom * 0.4} height={zoom * 0.25} patternUnits="userSpaceOnUse">
                <rect width={zoom * 0.4} height={zoom * 0.25} fill="#D8D4CC" stroke="#BFBBB2" strokeWidth="0.7" />
              </pattern>

              {/* Garden Lawn Pattern */}
              <pattern id="lawnGrass" width={zoom * 0.5} height={zoom * 0.5} patternUnits="userSpaceOnUse">
                <rect width={zoom * 0.5} height={zoom * 0.5} fill="#D8E4D0" />
                <circle cx={zoom * 0.25} cy={zoom * 0.25} r="1" fill="#A8BF9B" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#archGridMajor)" />

            {/* Transformed Drawing Group */}
            <g transform={`translate(${pan.x + 400}, ${pan.y + 300})`}>
              
              {/* 1. PLOT OF LAND BOUNDARY & COMPOUND */}
              {(() => {
                const pW = (plotConfig.widthM || 30.48) * zoom;
                const pD = (plotConfig.depthM || 24.38) * zoom;
                const frontSetback = (plotConfig.frontSetbackFt || 20) * 0.3048 * zoom;
                const rearSetback = (plotConfig.rearSetbackFt || 10) * 0.3048 * zoom;
                const sideSetback = (plotConfig.sideSetbackFt || 8) * 0.3048 * zoom;

                return (
                  <g id="plot-compound">
                    {/* Access Road Label at Front */}
                    <rect x={-pW / 2 - 20} y={pD / 2 + 10} width={pW + 40} height={50} fill="#D4D1C9" stroke="#999" strokeWidth="1" />
                    <text x={0} y={pD / 2 + 38} textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="#555">
                      ← ACCESS ROAD (30 FT / 10M RIGHT OF WAY) →
                    </text>

                    {/* Plot Ground Surface */}
                    <rect
                      x={-pW / 2}
                      y={-pD / 2}
                      width={pW}
                      height={pD}
                      fill={plotConfig.compoundFinish === 'grass-lawn' ? 'url(#lawnGrass)' : 'url(#pavingBlocks)'}
                      stroke="#222"
                      strokeWidth="2.5"
                    />

                    {/* Setback Guideline (Dashed Line) */}
                    <rect
                      x={-pW / 2 + sideSetback}
                      y={-pD / 2 + rearSetback}
                      width={pW - sideSetback * 2}
                      height={pD - rearSetback - frontSetback}
                      fill="none"
                      stroke="#E65100"
                      strokeWidth="1.2"
                      strokeDasharray="5,4"
                    />
                    <text
                      x={-pW / 2 + sideSetback + 6}
                      y={-pD / 2 + rearSetback + 14}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#E65100"
                    >
                      BUILDING SETBACK ENVELOPE
                    </text>

                    {/* Main Compound Entrance Gate */}
                    <line
                      x1={-pW * 0.35}
                      y1={pD / 2}
                      x2={-pW * 0.35 + 4.2 * zoom}
                      y2={pD / 2}
                      stroke="#FFB300"
                      strokeWidth="5"
                    />
                    <text
                      x={-pW * 0.35 + 2.1 * zoom}
                      y={pD / 2 + 8}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#B26A00"
                    >
                      MAIN GATE (4.2M)
                    </text>

                    {/* Plot Dimension Callouts */}
                    <text x={0} y={-pD / 2 - 8} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#333">
                      {plotConfig.widthFt}' 0" ({plotConfig.widthM}m)
                    </text>
                    <text x={pW / 2 + 15} y={0} textAnchor="middle" transform={`rotate(90, ${pW / 2 + 15}, 0)`} fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#333">
                      {plotConfig.depthFt}' 0" ({plotConfig.depthM}m)
                    </text>
                  </g>
                );
              })()}

              {/* 2. GHOST UNDERLAY (Ground floor when viewing First Floor) */}
              {activeFloor === 'first' && showFloorGhost && (
                <g id="ghost-ground-floor" opacity={0.35}>
                  {groundFloorRooms.map((rm) => (
                    <rect
                      key={`ghost-${rm.id}`}
                      x={(rm.x - rm.width / 2) * zoom}
                      y={(rm.z - rm.depth / 2) * zoom}
                      width={rm.width * zoom}
                      height={rm.depth * zoom}
                      fill="#888"
                      stroke="#333"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  ))}
                </g>
              )}

              {/* 3. ROOM FLOOR FINISHES & LABELS */}
              {currentFloorRooms.map((rm) => {
                const rx = (rm.x - rm.width / 2) * zoom;
                const rz = (rm.z - rm.depth / 2) * zoom;
                const rw = rm.width * zoom;
                const rd = rm.depth * zoom;
                const areaM2 = (rm.width * rm.depth).toFixed(1);
                const areaSqFt = Math.round(rm.width * rm.depth * 10.764);

                return (
                  <g key={rm.id} id={rm.id}>
                    {/* Room Floor Rectangle */}
                    <rect
                      x={rx}
                      y={rz}
                      width={rw}
                      height={rd}
                      fill={getFloorFinishColor(rm.floorFinish)}
                      stroke="#888"
                      strokeWidth="1"
                    />

                    {/* Room Architectural Tag */}
                    <text
                      x={rm.x * zoom}
                      y={rm.z * zoom - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#111"
                    >
                      {rm.name.toUpperCase()}
                    </text>
                    <text
                      x={rm.x * zoom}
                      y={rm.z * zoom + 6}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fill="#555"
                    >
                      {rm.width}m × {rm.depth}m
                    </text>
                    <text
                      x={rm.x * zoom}
                      y={rm.z * zoom + 18}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fill="#777"
                    >
                      {areaM2} m² ({areaSqFt} sq ft)
                    </text>
                  </g>
                );
              })}

              {/* 4. WALL SEGMENTS (Double line architectural thickness) */}
              {currentFloorWalls.map((wall) => {
                const x1 = wall.startX * zoom;
                const z1 = wall.startZ * zoom;
                const x2 = wall.endX * zoom;
                const z2 = wall.endZ * zoom;
                const strokeW = wall.thickness === '5-inch' ? 3.5 : wall.thickness === '9-inch' ? 6 : 4.5;

                return (
                  <line
                    key={wall.id}
                    x1={x1}
                    y1={z1}
                    x2={x2}
                    y2={z2}
                    stroke="#1a1a1a"
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* 5. DOORS & WINDOWS OPENINGS (90° Swing Arc for Doors) */}
              {houseOpenings
                .filter((op) => (op.floor || 'ground') === activeFloor)
                .map((op) => {
                  const ox = op.x * zoom;
                  const oz = op.z * zoom;
                  const ow = (op.width || 1.0) * zoom;

                  if (op.type.includes('door')) {
                    // Architectural Door Swing Arc
                    return (
                      <g key={op.id} transform={`translate(${ox}, ${oz}) rotate(${((op.rotationY || 0) * 180) / Math.PI})`}>
                        {/* Cutout void */}
                        <line x1={-ow / 2} y1={0} x2={ow / 2} y2={0} stroke="#FFF" strokeWidth="5" />
                        {/* Door leaf */}
                        <line x1={-ow / 2} y1={0} x2={-ow / 2} y2={ow} stroke="#3E2723" strokeWidth="2.5" />
                        {/* Swing Arc */}
                        <path
                          d={`M ${-ow / 2} ${ow} A ${ow} ${ow} 0 0 0 ${ow / 2} 0`}
                          fill="none"
                          stroke="#795548"
                          strokeWidth="1"
                          strokeDasharray="3,2"
                        />
                      </g>
                    );
                  } else {
                    // Architectural Window (Double glazed sill)
                    return (
                      <g key={op.id} transform={`translate(${ox}, ${oz}) rotate(${((op.rotationY || 0) * 180) / Math.PI})`}>
                        <rect x={-ow / 2} y={-3} width={ow} height={6} fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
                        <line x1={-ow / 2} y1={0} x2={ow / 2} y2={0} stroke="#0284C7" strokeWidth="1" />
                      </g>
                    );
                  }
                })}

              {/* 6. ARCHITECTURAL STAMPS & FURNITURE (Beds, Sofas, Kitchen, Cars) */}
              {currentFloorObjects.map((obj) => {
                const def = ARCHITECTURAL_CATALOG[obj.equipmentId] || COMPREHENSIVE_EQUIPMENT_CATALOG[obj.equipmentId];
                if (!def) return null;

                const ox = obj.x * zoom;
                const oz = obj.z * zoom;
                const ow = def.dimensions.width * zoom;
                const od = def.dimensions.depth * zoom;
                const isSelected = selectedObjectId === obj.id;

                return (
                  <g
                    key={obj.id}
                    transform={`translate(${ox}, ${oz}) rotate(${((obj.rotationY || 0) * 180) / Math.PI})`}
                    className="cursor-move hover:opacity-90"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedObject(obj.id);
                      setDraggingObjId(obj.id);
                      dragOffsetRef.current = { x: 0, z: 0 };
                    }}
                  >
                    {/* Item Body */}
                    <rect
                      x={-ow / 2}
                      y={-od / 2}
                      width={ow}
                      height={od}
                      rx={3}
                      fill={isSelected ? '#FEF08A' : '#' + def.color.toString(16).padStart(6, '0')}
                      stroke={isSelected ? '#000000' : '#444'}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={0.9}
                    />

                    {/* Item Icon / Label */}
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#222"
                    >
                      {def.icon || '▪'}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          // ─── 3D ARCHITECTURAL ORBIT VIEW ───
          <div ref={mount3DRef} className="w-full h-full" />
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM RIGHT ZOOM & CAMERA CONTROLS
      ────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        {viewMode === '2d' ? (
          <>
            <button
              onClick={() => setZoom((z) => Math.min(60, z * 1.2))}
              className="p-1.5 hover:bg-black/10 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(10, z / 1.2))}
              className="p-1.5 hover:bg-black/10 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-black/10 transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize2 size={16} />
            </button>
          </>
        ) : (
          <div className="text-xs font-mono text-[#555] px-2 py-0.5">
            Left Click: Orbit · Right Click: Pan · Scroll: Zoom
          </div>
        )}
      </div>

    </div>
  );
}
