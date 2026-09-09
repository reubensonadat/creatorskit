/**
 * 3D Tree QR Diorama — High-Fidelity Procedural Generator
 * =======================================================
 * Delivers ultra-high detail:
 * - Organic segmented cylindrical wood trunk with root flares
 * - Multi-tier natural branch limbs & twigs extending into canopy
 * - High-density micro-petal blossom cloud (7,200+ instanced petals)
 * - 3 Corner finder flower gardens (450+ 3D grass blades + 160+ wildflower stalks)
 * - Japanese garden stone paving courtyard with bevels & grout lines
 * - Center scattered fallen blossom flakes
 * - Dynamic seasonal particle simulation (sakura, autumn leaves, snow)
 */

import * as THREE from 'three';
import { QRMatrixResult } from './qr-matrix';

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type SceneType = 'tree' | 'bonsai' | 'wisteria' | 'maple' | 'pine' | 'house' | 'avatar';

export interface FoliagePalette {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    highlight: string;
    deepShadow: string;
    flowerAccent?: string;
}

export const PRESET_PALETTES: Record<string, FoliagePalette> = {
    sakura: {
        id: 'sakura',
        name: 'Sakura Pink',
        primary: '#f472b6',
        secondary: '#ec4899',
        highlight: '#fdf2f8',
        deepShadow: '#be185d',
        flowerAccent: '#fda4af',
    },
    wisteria: {
        id: 'wisteria',
        name: 'Wisteria Lavender',
        primary: '#a855f7',
        secondary: '#9333ea',
        highlight: '#f3e8ff',
        deepShadow: '#6b21a8',
        flowerAccent: '#c084fc',
    },
    maple: {
        id: 'maple',
        name: 'Crimson Maple',
        primary: '#ef4444',
        secondary: '#dc2626',
        highlight: '#fee2e2',
        deepShadow: '#991b1b',
        flowerAccent: '#f87171',
    },
    ginkgo: {
        id: 'ginkgo',
        name: 'Golden Ginkgo',
        primary: '#eab308',
        secondary: '#ca8a04',
        highlight: '#fef9c3',
        deepShadow: '#854d0e',
        flowerAccent: '#fde047',
    },
    hydrangea: {
        id: 'hydrangea',
        name: 'Sky Hydrangea',
        primary: '#38bdf8',
        secondary: '#0284c7',
        highlight: '#e0f2fe',
        deepShadow: '#075985',
        flowerAccent: '#7dd3fc',
    },
    frost: {
        id: 'frost',
        name: 'Winter Frost',
        primary: '#e2e8f0',
        secondary: '#cbd5e1',
        highlight: '#ffffff',
        deepShadow: '#64748b',
        flowerAccent: '#f1f5f9',
    },
    lush: {
        id: 'lush',
        name: 'Summer Oak',
        primary: '#22c55e',
        secondary: '#16a34a',
        highlight: '#dcfce7',
        deepShadow: '#14532d',
        flowerAccent: '#86efac',
    },
    autumn: {
        id: 'autumn',
        name: 'Autumn Amber',
        primary: '#f59e0b',
        secondary: '#d97706',
        highlight: '#fef3c7',
        deepShadow: '#78350f',
        flowerAccent: '#fcd34d',
    },
};

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export class PRNG {
    private s: number;
    constructor(seed: number) {
        this.s = seed >>> 0;
    }
    next(): number {
        this.s = (this.s + 0x6d2b79f5) >>> 0;
        let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
    int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
    choice<T>(items: T[]): T {
        return items[this.int(0, items.length - 1)];
    }
}

export interface ParticleState {
    mesh: THREE.InstancedMesh;
    positions: Float32Array;
    velocities: Float32Array;
    rotations: Float32Array;
    rotVelocities: Float32Array;
    count: number;
    season: SeasonType;
}

export interface DioramaSceneObjects {
    rootGroup: THREE.Group;
    groundGroup: THREE.Group;
    earthSlabGroup: THREE.Group;
    finderGardensGroup: THREE.Group;
    darkTilesMesh: THREE.InstancedMesh;
    lightTilesMesh: THREE.InstancedMesh;
    fallenMesh?: THREE.InstancedMesh;
    treeGroup: THREE.Group;
    particles: ParticleState | null;
    leafMeshes: THREE.InstancedMesh[];
    trunkMesh: THREE.Group;
    qrSize: number;
    worldSize: number;
    darkTileCoords: Array<{ x: number; z: number; isFinder: boolean; isCenter: boolean }>;
    lightTileCoords: Array<{ x: number; z: number; isFinder: boolean }>;
    darkTile3DColors: THREE.Color[];
    darkTile2DColors: THREE.Color[];
    lightTile3DColors: THREE.Color[];
    lightTile2DColors: THREE.Color[];
}

/**
 * Helper to create a micro petal geometry
 */
function createPetalGeometry(size = 0.28): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const half = size / 2;
    // Diamond-shaped petal with curved surface
    const vertices = new Float32Array([
        0, 0, -half * 1.35,
        -half, 0.03, 0,
        half, 0.03, 0,

        -half, 0.03, 0,
        0, 0, half * 1.35,
        half, 0.03, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
}

/**
 * Builds the complete high-fidelity 3D Diorama inside a Three.js scene.
 * sceneType controls the centerpiece: 'tree' (default), 'house', or 'avatar'
 */
export function buildDiorama(
    qrResult: QRMatrixResult,
    season: SeasonType,
    customPalette?: FoliagePalette,
    sceneType: SceneType = 'tree'
): DioramaSceneObjects {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'dioramaRoot';

    const groundGroup = new THREE.Group();
    groundGroup.name = 'groundGroup';
    rootGroup.add(groundGroup);

    const treeGroup = new THREE.Group();
    treeGroup.name = 'treeGroup';
    rootGroup.add(treeGroup);

    const prng = new PRNG(qrResult.seed);
    const size = qrResult.size;
    const cellSize = 1.0;
    const worldSize = size * cellSize;

    // Palette selection
    let palette = customPalette;
    if (!palette) {
        if (season === 'spring') palette = PRESET_PALETTES.sakura;
        else if (season === 'summer') palette = PRESET_PALETTES.lush;
        else if (season === 'autumn') palette = PRESET_PALETTES.autumn;
        else palette = PRESET_PALETTES.frost;
    }

    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempRot = new THREE.Euler();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);
    const colorHelper = new THREE.Color();

    // ─── 1. FLOATING DIORAMA BASE SLAB (LAYERED EARTH) ─────────────────────
    const earthSlabGroup = new THREE.Group();
    earthSlabGroup.name = 'earthSlabGroup';
    groundGroup.add(earthSlabGroup);

    const baseMargin = 1.6;
    const totalPlatformWidth = worldSize + baseMargin * 2;
    const slabDepth = 2.2;

    // Deep Earth/Soil Layer
    const baseGeo = new THREE.BoxGeometry(totalPlatformWidth, slabDepth, totalPlatformWidth);
    const baseMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xc8cfd6 : 0x3d2e1e,
        roughness: 0.95,
        metalness: 0.01,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -slabDepth / 2;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    earthSlabGroup.add(baseMesh);

    // Mid Earth Strata Layer (lighter soil band)
    const strataGeo = new THREE.BoxGeometry(totalPlatformWidth - 0.1, 0.4, totalPlatformWidth - 0.1);
    const strataMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xd5dbe2 : 0x5c4430,
        roughness: 0.9,
        metalness: 0.01,
    });
    const strataMesh = new THREE.Mesh(strataGeo, strataMat);
    strataMesh.position.y = -0.6;
    strataMesh.receiveShadow = true;
    earthSlabGroup.add(strataMesh);

    // Top Stone Rim (chiseled granite edge)
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xddd9cf,
        roughness: 0.78,
        metalness: 0.06,
    });
    const rimGeo = new THREE.BoxGeometry(totalPlatformWidth + 0.5, 0.35, totalPlatformWidth + 0.5);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = -0.04;
    rimMesh.receiveShadow = true;
    rimMesh.castShadow = true;
    earthSlabGroup.add(rimMesh);

    // Inner bevel rim for depth
    const innerRimGeo = new THREE.BoxGeometry(totalPlatformWidth + 0.15, 0.18, totalPlatformWidth + 0.15);
    const innerRimMat = new THREE.MeshStandardMaterial({
        color: 0xc9c4b8,
        roughness: 0.82,
        metalness: 0.04,
    });
    const innerRimMesh = new THREE.Mesh(innerRimGeo, innerRimMat);
    innerRimMesh.position.y = 0.08;
    innerRimMesh.receiveShadow = true;
    earthSlabGroup.add(innerRimMesh);

    // ─── 2. GROUND TILES (COURTYARD STONE PAVING & FINDER CORNERS) ────────
    const darkTileCoords: Array<{ x: number; z: number; isFinder: boolean; isCenter: boolean }> = [];
    const lightTileCoords: Array<{ x: number; z: number; isFinder: boolean }> = [];

    const isFinderCorner = (gx: number, gy: number) => {
        const inTopLeft = gx < 7 && gy < 7;
        const inTopRight = gx >= size - 7 && gy < 7;
        const inBottomLeft = gx < 7 && gy >= size - 7;
        return inTopLeft || inTopRight || inBottomLeft;
    };

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const mod = qrResult.modules[y][x];
            const worldX = (x - size / 2 + 0.5) * cellSize;
            const worldZ = (y - size / 2 + 0.5) * cellSize;
            const inFinder = isFinderCorner(x, y);

            if (mod.isDark) {
                darkTileCoords.push({
                    x: worldX,
                    z: worldZ,
                    isFinder: inFinder || mod.isFinder,
                    isCenter: mod.isCenterTreeArea,
                });
            } else {
                lightTileCoords.push({
                    x: worldX,
                    z: worldZ,
                    isFinder: inFinder || mod.isFinder,
                });
            }
        }
    }

    // Light tiles (Warm limestone paving in 3D, crisp white in 2D)
    const lightTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 0.18, cellSize * 0.94);
    const lightTileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.02,
    });
    const lightTilesMesh = new THREE.InstancedMesh(lightTileGeo, lightTileMat, lightTileCoords.length);
    const lightStonePalette = [0xfcfaf5, 0xf6f3eb, 0xf9f7f2, 0xf4f1e8, 0xf8f5ef];
    const lightTile3DColors: THREE.Color[] = [];
    const lightTile2DColors: THREE.Color[] = [];

    lightTileCoords.forEach((coord, idx) => {
        const tileHeight = 0.18;
        const yOffset = prng.range(0.0, 0.02); // Subtle flush paving
        tempPos.set(coord.x, tileHeight / 2 + yOffset, coord.z);
        tempRot.set(prng.range(-0.008, 0.008), prng.range(-0.015, 0.015), prng.range(-0.008, 0.008));
        tempQuat.setFromEuler(tempRot);
        tempScale.set(prng.range(0.95, 0.98), prng.range(0.9, 1.1), prng.range(0.95, 0.98));
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        lightTilesMesh.setMatrixAt(idx, tempMatrix);

        const hex = prng.choice(lightStonePalette);
        const col3d = new THREE.Color(hex);
        const col2d = new THREE.Color(0xffffff);
        lightTile3DColors.push(col3d);
        lightTile2DColors.push(col2d);

        lightTilesMesh.setColorAt(idx, col3d);
    });
    lightTilesMesh.instanceMatrix.needsUpdate = true;
    if (lightTilesMesh.instanceColor) lightTilesMesh.instanceColor.needsUpdate = true;
    lightTilesMesh.receiveShadow = true;
    lightTilesMesh.castShadow = true;
    groundGroup.add(lightTilesMesh);

    // Dark tiles — SOFT WARM COBBLESTONE PAVERS IN 3D, HIGH-CONTRAST IN 2D
    const darkTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 1.0, cellSize * 0.94);
    const darkTileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.03,
    });
    const darkTilesMesh = new THREE.InstancedMesh(darkTileGeo, darkTileMat, darkTileCoords.length);

    // Soft, warm stone cobblestone palette
    const slatePalette = [0xd4cec3, 0xcbc4b9, 0xc1baa9, 0xd0c9bd, 0xbeb7a7, 0xc7c0b4];
    const finderTurfColor = 0x558b16;
    const darkTile3DColors: THREE.Color[] = [];
    const darkTile2DColors: THREE.Color[] = [];

    darkTileCoords.forEach((coord, idx) => {
        const height = coord.isFinder ? 0.22 : prng.range(0.19, 0.24);

        tempPos.set(coord.x, height / 2 + 0.04, coord.z);
        tempRot.set(prng.range(-0.008, 0.008), prng.range(-0.012, 0.012), prng.range(-0.008, 0.008));
        tempQuat.setFromEuler(tempRot);
        tempScale.set(prng.range(0.94, 0.98), height, prng.range(0.94, 0.98));
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        darkTilesMesh.setMatrixAt(idx, tempMatrix);

        let col3d: THREE.Color;
        if (coord.isFinder) {
            col3d = new THREE.Color(finderTurfColor).offsetHSL(prng.range(-0.02, 0.02), prng.range(-0.04, 0.04), prng.range(-0.03, 0.03));
        } else {
            const hex = prng.choice(slatePalette);
            col3d = new THREE.Color(hex).offsetHSL(prng.range(-0.01, 0.01), 0, prng.range(-0.02, 0.02));
        }
        const col2d = new THREE.Color(0x111827); // Crisp, high-contrast dark for scanner decoding
        darkTile3DColors.push(col3d);
        darkTile2DColors.push(col2d);

        darkTilesMesh.setColorAt(idx, col3d);
    });
    darkTilesMesh.instanceMatrix.needsUpdate = true;
    if (darkTilesMesh.instanceColor) darkTilesMesh.instanceColor.needsUpdate = true;
    darkTilesMesh.castShadow = true;
    darkTilesMesh.receiveShadow = true;
    groundGroup.add(darkTilesMesh);

    // ─── 3. CORNER FINDER FLOWER GARDENS (3D GRASS & WILDFLOWERS) ─────────
    const finderGardensGroup = new THREE.Group();
    finderGardensGroup.name = 'finderGardensGroup';
    groundGroup.add(finderGardensGroup);

    const finderCenters = [
        { cx: (-size / 2 + 3.5) * cellSize, cz: (-size / 2 + 3.5) * cellSize },
        { cx: (size / 2 - 3.5) * cellSize, cz: (-size / 2 + 3.5) * cellSize },
        { cx: (-size / 2 + 3.5) * cellSize, cz: (size / 2 - 3.5) * cellSize },
    ];

    const grassBladeCount = 600;
    const grassGeo = new THREE.ConeGeometry(0.045, 1.15, 4);
    const grassMat = new THREE.MeshStandardMaterial({
        color: 0x70a81e,
        roughness: 0.75,
    });
    const grassInstanced = new THREE.InstancedMesh(grassGeo, grassMat, grassBladeCount);

    const flowerCount = 240;
    const flowerGeo = new THREE.SphereGeometry(0.08, 5, 4);
    const flowerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
    });
    const flowerInstanced = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);

    let gIdx = 0;
    let fIdx = 0;

    for (const fc of finderCenters) {
        const bladesPerCorner = Math.floor(grassBladeCount / 3);
        for (let b = 0; b < bladesPerCorner; b++) {
            if (gIdx >= grassBladeCount) break;
            const gx = fc.cx + prng.range(-3.2, 3.2);
            const gz = fc.cz + prng.range(-3.2, 3.2);
            const heightScale = prng.range(0.7, 1.4);
            const gy = 0.12 + (1.15 * heightScale) / 2;

            tempPos.set(gx, gy, gz);
            tempRot.set(prng.range(-0.2, 0.2), prng.range(0, Math.PI * 2), prng.range(-0.2, 0.2));
            tempQuat.setFromEuler(tempRot);
            tempScale.set(prng.range(0.8, 1.2), heightScale, prng.range(0.8, 1.2));
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            grassInstanced.setMatrixAt(gIdx, tempMatrix);
            colorHelper.setHex(prng.choice([0x70a81e, 0x82b926, 0x5b8e18])).offsetHSL(prng.range(-0.03, 0.03), 0, prng.range(-0.04, 0.04));
            grassInstanced.setColorAt(gIdx, colorHelper);
            gIdx++;
        }

        const flowersPerCorner = Math.floor(flowerCount / 3);
        for (let f = 0; f < flowersPerCorner; f++) {
            if (fIdx >= flowerCount) break;
            const fx = fc.cx + prng.range(-3.1, 3.1);
            const fz = fc.cz + prng.range(-3.1, 3.1);
            const fy = prng.range(0.65, 1.25);

            tempPos.set(fx, fy, fz);
            tempRot.set(0, prng.range(0, Math.PI * 2), 0);
            tempQuat.setFromEuler(tempRot);
            const fScale = prng.range(0.8, 1.3);
            tempScale.set(fScale, fScale, fScale);
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            flowerInstanced.setMatrixAt(fIdx, tempMatrix);
            colorHelper.setHex(prng.choice([0xf472b6, 0xfbcfe8, 0xffffff, 0xfde047]));
            flowerInstanced.setColorAt(fIdx, colorHelper);
            fIdx++;
        }
    }

    grassInstanced.instanceMatrix.needsUpdate = true;
    if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
    grassInstanced.castShadow = true;
    grassInstanced.receiveShadow = true;
    finderGardensGroup.add(grassInstanced);

    flowerInstanced.instanceMatrix.needsUpdate = true;
    if (flowerInstanced.instanceColor) flowerInstanced.instanceColor.needsUpdate = true;
    finderGardensGroup.add(flowerInstanced);

    // ─── 4-6. CENTERPIECE — depends on sceneType ─────────────────────────────

    let trunkGroup: THREE.Group;
    let blossomInstanced: THREE.InstancedMesh | null = null;
    let fallenMesh: THREE.InstancedMesh | undefined = undefined;

    if (sceneType === 'house') {
        // House centerpiece
        trunkGroup = new THREE.Group();
        trunkGroup.name = 'houseCenterpiece';
        treeGroup.add(trunkGroup);
        buildHouseCenterpiece(trunkGroup, season, palette, prng);

    } else if (sceneType === 'avatar') {
        // Avatar centerpiece
        trunkGroup = new THREE.Group();
        trunkGroup.name = 'avatarCenterpiece';
        treeGroup.add(trunkGroup);
        buildAvatarCenterpiece(trunkGroup, season, palette, prng);

    } else {
        // ─── DEFAULT: PROCEDURAL GRAND UMBRELLA SAKURA (MATCHING IMAGE 1) ────
        trunkGroup = new THREE.Group();
        trunkGroup.name = 'organicTrunkGroup';
        treeGroup.add(trunkGroup);

        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x54321b,
            roughness: 0.92,
            metalness: 0.01,
        });

        // 1. Species-aware trunk posture & height
        const isBonsai = sceneType === 'bonsai';
        const isWisteria = sceneType === 'wisteria';
        const isPine = sceneType === 'pine';
        const isMaple = sceneType === 'maple';

        const trunkHeight = isBonsai ? 8.2 : isPine ? 11.2 : isWisteria ? 9.5 : 10.2;
        const trunkRadiusBottom = isBonsai ? 1.55 : 1.25;
        const trunkRadiusTop = isBonsai ? 0.45 : 0.58;
        const trunkSegments = 10;
        const wobbleIntensity = isBonsai ? 0.42 : 0.16;

        let prevPoint = new THREE.Vector3(0, 0.14, 0);
        const trunkKnots: THREE.Vector3[] = [prevPoint.clone()];

        for (let s = 0; s < trunkSegments; s++) {
            const segHeight = trunkHeight / trunkSegments;
            const progress = (s + 1) / trunkSegments;
            const rBottom = trunkRadiusBottom - (trunkRadiusBottom - trunkRadiusTop) * (s / trunkSegments);
            const rTop = trunkRadiusBottom - (trunkRadiusBottom - trunkRadiusTop) * progress;

            // Japanese artistic cedar/bonsai posture with graceful organic sway
            const wobbleX = Math.sin(s * 0.45 + qrResult.seed) * wobbleIntensity * (s + 1);
            const wobbleZ = Math.cos(s * 0.4 + qrResult.seed) * wobbleIntensity * (s + 1);
            const nextPoint = new THREE.Vector3(wobbleX, 0.14 + (s + 1) * segHeight, wobbleZ);
            trunkKnots.push(nextPoint.clone());

            // Cylinder with horizontal ring bevel
            const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segHeight * 0.92, 12);
            const segMesh = new THREE.Mesh(segGeo, woodMat);

            const midPoint = prevPoint.clone().add(nextPoint).multiplyScalar(0.5);
            segMesh.position.copy(midPoint);

            const dir = nextPoint.clone().sub(prevPoint).normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            segMesh.quaternion.copy(quat);

            segMesh.castShadow = true;
            segMesh.receiveShadow = true;
            trunkGroup.add(segMesh);

            prevPoint = nextPoint;
        }

        // 2. Thick root buttresses anchoring into stone pavers
        const numRoots = isBonsai ? 8 : 6;
        for (let r = 0; r < numRoots; r++) {
            const rootAngle = (r / numRoots) * Math.PI * 2 + prng.range(-0.15, 0.15);
            const rootLength = isBonsai ? prng.range(2.2, 3.4) : prng.range(1.6, 2.4);
            const rootGeo = new THREE.ConeGeometry(isBonsai ? 0.52 : 0.42, rootLength, 6);
            const rootMesh = new THREE.Mesh(rootGeo, woodMat);

            const rx = Math.cos(rootAngle) * (isBonsai ? 0.95 : 0.72);
            const rz = Math.sin(rootAngle) * (isBonsai ? 0.95 : 0.72);
            rootMesh.position.set(rx, 0.18, rz);
            rootMesh.rotation.set(
                Math.sin(rootAngle) * 0.78,
                0,
                -Math.cos(rootAngle) * 0.78
            );
            rootMesh.castShadow = true;
            trunkGroup.add(rootMesh);
        }

        // Japanese stone lantern accent for Zen Bonsai
        if (isBonsai) {
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
            const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.35, 6), stoneMat);
            lanternBase.position.set(2.4, 0.18, 1.8);
            lanternBase.castShadow = true;
            trunkGroup.add(lanternBase);

            const lanternPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 6), stoneMat);
            lanternPillar.position.set(2.4, 0.65, 1.8);
            lanternPillar.castShadow = true;
            trunkGroup.add(lanternPillar);

            const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 6), stoneMat);
            lanternRoof.position.set(2.4, 1.1, 1.8);
            lanternRoof.castShadow = true;
            trunkGroup.add(lanternRoof);
        }

        // 3. Grand spreading branches supporting the expansive pagoda umbrella canopy
        const branchTips: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; elevation: number }> = [];
        const numBranches = 10;
        const baseAngle = (Math.PI * 2) / numBranches;

        for (let b = 0; b < numBranches; b++) {
            const angle = b * baseAngle + prng.range(-0.2, 0.2);
            // Distribute branches across trunk height
            const knotIdx = Math.min(trunkKnots.length - 1, 3 + (b % 6));
            const startKnot = trunkKnots[knotIdx];
            let bStart = startKnot.clone();

            // Lower branches stretch out further (~9.5 - 11.5 units), higher ones shorter (~6 - 8 units)
            const isLower = knotIdx <= 5;
            const branchLen = isLower ? prng.range(8.5, 11.5) : prng.range(6.0, 8.5);
            const branchSteps = 4;
            const branchDir = new THREE.Vector3(
                Math.cos(angle) * prng.range(0.85, 1.05),
                isLower ? prng.range(0.3, 0.5) : prng.range(0.45, 0.7),
                Math.sin(angle) * prng.range(0.85, 1.05)
            ).normalize();

            let bRadius = isLower ? 0.38 : 0.28;
            for (let bs = 0; bs < branchSteps; bs++) {
                const stepLen = branchLen / branchSteps;
                const bNext = bStart.clone().addScaledVector(branchDir, stepLen);
                bNext.y += prng.range(0.12, 0.3);

                const bTopRadius = Math.max(0.12, bRadius - 0.07);
                const bGeo = new THREE.CylinderGeometry(bTopRadius, bRadius, stepLen, 8);
                const bMesh = new THREE.Mesh(bGeo, woodMat);

                const bMid = bStart.clone().add(bNext).multiplyScalar(0.5);
                bMesh.position.copy(bMid);

                const bdir = bNext.clone().sub(bStart).normalize();
                const bquat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bdir);
                bMesh.quaternion.copy(bquat);

                bMesh.castShadow = true;
                trunkGroup.add(bMesh);

                bStart = bNext;
                bRadius = bTopRadius;
            }

            branchTips.push({ pos: bStart.clone(), dir: branchDir.clone(), elevation: bStart.y });
        }

        // 4. MASSIVE PAGODA UMBRELLA BLOSSOM CANOPY (12,500+ BLOSSOMS SPANNING 24-26 UNITS!)
        const petalCount = 12500;
        const petalGeo = createPetalGeometry(0.34);
        const petalMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.02,
            side: THREE.DoubleSide,
        });
        blossomInstanced = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);

        const crownApex = trunkKnots[trunkKnots.length - 1].clone().add(new THREE.Vector3(0, 1.4, 0));

        // Create tiered conical umbrella cloud shelves matching Image 1
        const clusters: Array<{ pos: THREE.Vector3; radiusX: number; radiusY: number; radiusZ: number; weight: number }> = [
            // Top Apex Crown (peaked dome)
            { pos: crownApex.clone().add(new THREE.Vector3(0, 1.8, 0)), radiusX: 4.2, radiusY: 3.2, radiusZ: 4.2, weight: 1.4 },
            { pos: crownApex, radiusX: 5.8, radiusY: 3.5, radiusZ: 5.8, weight: 1.5 },
            // Mid-upper shelf
            { pos: crownApex.clone().add(new THREE.Vector3(2.5, -0.6, -2.5)), radiusX: 5.2, radiusY: 3.2, radiusZ: 5.2, weight: 1.2 },
            { pos: crownApex.clone().add(new THREE.Vector3(-2.5, -0.6, 2.5)), radiusX: 5.2, radiusY: 3.2, radiusZ: 5.2, weight: 1.2 },
            { pos: crownApex.clone().add(new THREE.Vector3(-2.5, -0.6, -2.5)), radiusX: 5.2, radiusY: 3.2, radiusZ: 5.2, weight: 1.2 },
            { pos: crownApex.clone().add(new THREE.Vector3(2.5, -0.6, 2.5)), radiusX: 5.2, radiusY: 3.2, radiusZ: 5.2, weight: 1.2 },
            // Broad outer branch limb canopies stretching across the whole diorama
            ...branchTips.map((tip) => ({
                pos: tip.pos.clone().addScaledVector(tip.dir, 0.4),
                radiusX: prng.range(4.8, 6.0),
                radiusY: prng.range(2.8, 3.8),
                radiusZ: prng.range(4.8, 6.0),
                weight: 1.1,
            })),
        ];

        // Soft pastel Sakura colors (matching Image 1!)
        const colDeep = new THREE.Color(palette.deepShadow);
        const colSecondary = new THREE.Color(palette.secondary);
        const colPrimary = new THREE.Color(palette.primary);
        const colHighlight = new THREE.Color(palette.highlight);

        let pIdx = 0;
        const totalWeight = clusters.reduce((sum, c) => sum + c.weight, 0);

        for (const cluster of clusters) {
            const countForThis = Math.floor((cluster.weight / totalWeight) * petalCount);
            for (let i = 0; i < countForThis; i++) {
                if (pIdx >= petalCount) break;

                const u = prng.next();
                const v = prng.next();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);
                const r = Math.cbrt(prng.next());

                const ox = r * cluster.radiusX * Math.sin(phi) * Math.cos(theta);
                const oy = r * cluster.radiusY * Math.sin(phi) * Math.sin(theta);
                const oz = r * cluster.radiusZ * Math.cos(phi);

                const px = cluster.pos.x + ox;
                const py = cluster.pos.y + oy;
                const pz = cluster.pos.z + oz;

                tempPos.set(px, py, pz);
                tempRot.set(prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2), prng.range(0, Math.PI * 2));
                tempQuat.setFromEuler(tempRot);
                const scale = prng.range(0.85, 1.45);
                tempScale.set(scale, scale, scale);
                tempMatrix.compose(tempPos, tempQuat, tempScale);

                blossomInstanced.setMatrixAt(pIdx, tempMatrix);

                const heightFactor = (oy / cluster.radiusY + 1) / 2;
                const depthFactor = r;

                if (heightFactor > 0.68 && depthFactor > 0.4) {
                    colorHelper.copy(colHighlight);
                } else if (heightFactor > 0.35) {
                    colorHelper.copy(colPrimary).lerp(colHighlight, (heightFactor - 0.35) * 0.7);
                } else if (depthFactor < 0.35) {
                    colorHelper.copy(colDeep);
                } else {
                    colorHelper.copy(colSecondary);
                }

                colorHelper.offsetHSL(prng.range(-0.015, 0.015), prng.range(-0.02, 0.02), prng.range(-0.02, 0.02));
                blossomInstanced.setColorAt(pIdx, colorHelper);
                pIdx++;
            }
        }

        blossomInstanced.instanceMatrix.needsUpdate = true;
        if (blossomInstanced.instanceColor) blossomInstanced.instanceColor.needsUpdate = true;
        blossomInstanced.castShadow = true;
        treeGroup.add(blossomInstanced);

        // 5. WIDE RADIAL DUSTING OF FALLEN SAKURA PETALS ACROSS THE COURTYARD
        const fallenCount = 500;
        const fallenGeo = createPetalGeometry(0.28);
        const fallenMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.65,
            side: THREE.DoubleSide,
        });
        fallenMesh = new THREE.InstancedMesh(fallenGeo, fallenMat, fallenCount);

        const colPrimaryFallen = new THREE.Color(palette.primary);
        const colSecondaryFallen = new THREE.Color(palette.secondary);

        for (let f = 0; f < fallenCount; f++) {
            const rad = prng.range(0.6, 9.8);
            const fTheta = prng.range(0, Math.PI * 2);
            const fx = Math.cos(fTheta) * rad;
            const fz = Math.sin(fTheta) * rad;
            const fy = 0.17;

            tempPos.set(fx, fy, fz);
            tempRot.set(Math.PI / 2, prng.range(0, Math.PI * 2), 0);
            tempQuat.setFromEuler(tempRot);
            tempScale.set(prng.range(0.85, 1.35), prng.range(0.85, 1.35), 1);
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            fallenMesh.setMatrixAt(f, tempMatrix);
            colorHelper.copy(colPrimaryFallen).lerp(colSecondaryFallen, prng.range(0, 0.5));
            fallenMesh.setColorAt(f, colorHelper);
        }
        fallenMesh.instanceMatrix.needsUpdate = true;
        if (fallenMesh.instanceColor) fallenMesh.instanceColor.needsUpdate = true;
        fallenMesh.receiveShadow = true;
        groundGroup.add(fallenMesh);

    } // end of sceneType === 'tree' block

    // ─── 7. DYNAMIC SEASONAL FLOATING PARTICLES (shared by all scene types) ──
    const particleCount = season === 'autumn' ? 150 : season === 'winter' ? 180 : season === 'spring' ? 140 : 80;
    const partGeo = createPetalGeometry(0.22);
    const partMat = new THREE.MeshBasicMaterial({
        color: season === 'winter' ? 0xffffff : season === 'autumn' ? 0xf59e0b : 0xf472b6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
    });

    const partMesh = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const rotations = new Float32Array(particleCount * 3);
    const rotVelocities = new Float32Array(particleCount * 3);

    const particleCeiling = sceneType === 'tree' ? 11.4 : 9.0;
    for (let p = 0; p < particleCount; p++) {
        const px = prng.range(-worldSize * 0.65, worldSize * 0.65);
        const py = prng.range(1.0, particleCeiling);
        const pz = prng.range(-worldSize * 0.65, worldSize * 0.65);

        positions[p * 3] = px;
        positions[p * 3 + 1] = py;
        positions[p * 3 + 2] = pz;

        const fallSpeed = season === 'autumn' ? prng.range(0.04, 0.08) : season === 'winter' ? prng.range(0.02, 0.05) : prng.range(0.018, 0.042);
        velocities[p * 3] = prng.range(-0.015, 0.015);
        velocities[p * 3 + 1] = -fallSpeed;
        velocities[p * 3 + 2] = prng.range(-0.015, 0.015);

        rotations[p * 3] = prng.range(0, Math.PI * 2);
        rotations[p * 3 + 1] = prng.range(0, Math.PI * 2);
        rotations[p * 3 + 2] = prng.range(0, Math.PI * 2);

        rotVelocities[p * 3] = prng.range(-0.03, 0.03);
        rotVelocities[p * 3 + 1] = prng.range(-0.04, 0.04);
        rotVelocities[p * 3 + 2] = prng.range(-0.03, 0.03);

        tempMatrix.makeTranslation(px, py, pz);
        partMesh.setMatrixAt(p, tempMatrix);
    }
    partMesh.instanceMatrix.needsUpdate = true;
    rootGroup.add(partMesh);

    const particlesState: ParticleState = {
        mesh: partMesh,
        positions,
        velocities,
        rotations,
        rotVelocities,
        count: particleCount,
        season,
    };

    return {
        rootGroup,
        groundGroup,
        earthSlabGroup,
        finderGardensGroup,
        darkTilesMesh,
        lightTilesMesh,
        fallenMesh,
        treeGroup,
        particles: particlesState,
        leafMeshes: blossomInstanced ? [blossomInstanced] : [],
        trunkMesh: trunkGroup,
        qrSize: size,
        worldSize,
        darkTileCoords,
        lightTileCoords,
        darkTile3DColors,
        darkTile2DColors,
        lightTile3DColors,
        lightTile2DColors,
    };
}

/**
 * Updates particle physics and organic tree swaying on every animation frame
 */
export function updateDioramaSimulation(
    diorama: DioramaSceneObjects,
    time: number,
    delta: number
): void {
    if (diorama.treeGroup) {
        const swayAngleX = Math.sin(time * 1.2) * 0.015;
        const swayAngleZ = Math.cos(time * 0.9) * 0.012;
        diorama.treeGroup.rotation.x = swayAngleX;
        diorama.treeGroup.rotation.z = swayAngleZ;
    }

    const particles = diorama.particles;
    if (!particles) return;

    const count = particles.count;
    const pos = particles.positions;
    const vel = particles.velocities;
    const rot = particles.rotations;
    const rotVel = particles.rotVelocities;
    const mesh = particles.mesh;

    const spawnCeiling = 13.0;
    const floorBound = 0.2;
    const boundsRadius = diorama.worldSize * 0.75;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const windX = Math.sin(time * 1.8 + i) * 0.01;
        const windZ = Math.cos(time * 1.5 + i) * 0.01;

        pos[idx] += vel[idx] + windX;
        pos[idx + 1] += vel[idx + 1];
        pos[idx + 2] += vel[idx + 2] + windZ;

        rot[idx] += rotVel[idx];
        rot[idx + 1] += rotVel[idx + 1];
        rot[idx + 2] += rotVel[idx + 2];

        if (pos[idx + 1] <= floorBound || Math.abs(pos[idx]) > boundsRadius || Math.abs(pos[idx + 2]) > boundsRadius) {
            pos[idx + 1] = spawnCeiling + Math.random() * 2.0;
            pos[idx] = (Math.random() - 0.5) * diorama.worldSize * 1.2;
            pos[idx + 2] = (Math.random() - 0.5) * diorama.worldSize * 1.2;
        }

        dummy.position.set(pos[idx], pos[idx + 1], pos[idx + 2]);
        dummy.rotation.set(rot[idx], rot[idx + 1], rot[idx + 2]);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAMLESS 2D ⇄ 3D MORPH SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mind-blowing seamless morph between 2D high-contrast scannable QR Code and
 * living 3D Floating Diorama.
 *
 * @param diorama Scene objects
 * @param morphProgress 0.0 = pure 2D planar QR code, 1.0 = full 3D living diorama
 */
export function applyDioramaMorph(
    diorama: DioramaSceneObjects,
    morphProgress: number
): void {
    const p = Math.max(0.0, Math.min(1.0, morphProgress));

    // 1. Earth foundation slab sinks seamlessly beneath or rises into floating island
    if (diorama.earthSlabGroup) {
        diorama.earthSlabGroup.position.y = (p - 1.0) * 5.0;
        diorama.earthSlabGroup.scale.set(1, Math.max(0.001, p), 1);
        diorama.earthSlabGroup.visible = p > 0.02;
    }

    // 2. Corner finder gardens smoothly transition between lush 3D grass/flowers and flat zen garden moss frames
    if (diorama.finderGardensGroup) {
        const fScaleY = THREE.MathUtils.lerp(0.06, 1.0, p);
        const fScaleXZ = THREE.MathUtils.lerp(0.72, 1.0, p);
        diorama.finderGardensGroup.scale.set(fScaleXZ, fScaleY, fScaleXZ);
        diorama.finderGardensGroup.position.y = (p - 1.0) * 0.15;
        diorama.finderGardensGroup.visible = true;
    }

    // 3. Centerpiece seamlessly transitions between 2D Top-Down Artistic Tree & 3D Volumetric Tree
    if (diorama.treeGroup) {
        // In 2D (p=0), tree stays visible! Its X and Z span gracefully frames the QR center,
        // while its vertical height (Y) flattens towards the surface so top-down projection is clean.
        // In 3D (p=1), it blooms up to full vertical height.
        const scaleY = THREE.MathUtils.lerp(0.06, 1.0, p);
        const scaleXZ = THREE.MathUtils.lerp(0.92, 1.0, p);
        diorama.treeGroup.scale.set(scaleXZ, scaleY, scaleXZ);
        diorama.treeGroup.position.y = (p - 1.0) * 0.12;
        diorama.treeGroup.rotation.y = (1.0 - p) * 0.25;
        diorama.treeGroup.visible = true;
    }

    // 4. Fallen petals remain subtly visible as ground scatter
    if (diorama.fallenMesh) {
        diorama.fallenMesh.visible = true;
        diorama.fallenMesh.position.y = THREE.MathUtils.lerp(0.005, 0.0, p);
    }

    // 5. Morph Dark Tiles between 3D Cobblestones and 2D High-Contrast QR modules
    if (diorama.darkTilesMesh && diorama.darkTileCoords) {
        const tempPos = new THREE.Vector3();
        const tempRot = new THREE.Euler();
        const tempQuat = new THREE.Quaternion();
        const tempScale = new THREE.Vector3();
        const tempMat = new THREE.Matrix4();
        const tempColor = new THREE.Color();

        const count = diorama.darkTileCoords.length;
        for (let i = 0; i < count; i++) {
            const coord = diorama.darkTileCoords[i];
            const fullHeight = coord.isFinder ? 0.22 : 0.21;
            const currentH = THREE.MathUtils.lerp(0.02, fullHeight, p);
            const currentY = THREE.MathUtils.lerp(0.01, fullHeight / 2 + 0.04, p);

            // In 2D mode, slightly snugger tile width to avoid camera sub-pixel aliasing gaps
            const tileXZ = THREE.MathUtils.lerp(0.99, 0.95, p);

            tempPos.set(coord.x, currentY, coord.z);
            tempRot.set(0, 0, 0);
            tempQuat.setFromEuler(tempRot);
            tempScale.set(tileXZ, currentH, tileXZ);
            tempMat.compose(tempPos, tempQuat, tempScale);
            diorama.darkTilesMesh.setMatrixAt(i, tempMat);

            if (diorama.darkTile2DColors && diorama.darkTile3DColors) {
                tempColor.copy(diorama.darkTile2DColors[i]).lerp(diorama.darkTile3DColors[i], p);
                diorama.darkTilesMesh.setColorAt(i, tempColor);
            }
        }
        diorama.darkTilesMesh.instanceMatrix.needsUpdate = true;
        if (diorama.darkTilesMesh.instanceColor) {
            diorama.darkTilesMesh.instanceColor.needsUpdate = true;
        }
    }

    // 6. Morph Light Tiles to pristine white paper in 2D
    if (diorama.lightTilesMesh && diorama.lightTileCoords) {
        const tempColor = new THREE.Color();
        const count = diorama.lightTileCoords.length;
        for (let i = 0; i < count; i++) {
            if (diorama.lightTile2DColors && diorama.lightTile3DColors) {
                tempColor.copy(diorama.lightTile2DColors[i]).lerp(diorama.lightTile3DColors[i], p);
                diorama.lightTilesMesh.setColorAt(i, tempColor);
            }
        }
        if (diorama.lightTilesMesh.instanceColor) {
            diorama.lightTilesMesh.instanceColor.needsUpdate = true;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAIRY-TALE STORYBOOK COTTAGE DIORAMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds an exquisite, half-timbered storybook cottage with multi-tier gabled roofs,
 * glowing lattice windows, overflowing flower planter boxes, fieldstone chimney
 * with animated smoke, flagstone pathway, and seasonal garden props.
 */
export function buildHouseCenterpiece(
    treeGroup: THREE.Group,
    season: SeasonType,
    palette: FoliagePalette,
    prng: PRNG
): void {
    const cottageRoot = new THREE.Group();
    cottageRoot.name = 'storybookCottage';
    treeGroup.add(cottageRoot);

    // ─── 1. STONE PLINTH FOUNDATION & STEPS ────────────────────────────────
    const foundationMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xc8d1db : 0x7c7365,
        roughness: 0.92,
        metalness: 0.04,
    });
    const foundationGeo = new THREE.BoxGeometry(6.4, 0.42, 5.4);
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.set(0.1, 0.21, -0.1);
    foundationMesh.receiveShadow = true;
    foundationMesh.castShadow = true;
    cottageRoot.add(foundationMesh);

    // Stone doorstep
    const stepGeo = new THREE.BoxGeometry(1.6, 0.2, 0.7);
    const stepMesh = new THREE.Mesh(stepGeo, foundationMat);
    stepMesh.position.set(0.2, 0.1, 2.75);
    stepMesh.receiveShadow = true;
    cottageRoot.add(stepMesh);

    // ─── 2. HALF-TIMBERED COTTAGE WALLS (L-SHAPED STORYBOOK SILHOUETTE) ───
    const wallColor = season === 'winter' ? 0xf4f1eb : season === 'autumn' ? 0xfaf4e8 : 0xfbf8f1;
    const plasterMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.88,
        metalness: 0.02,
    });

    const timberMat = new THREE.MeshStandardMaterial({
        color: 0x3d2716, // Rich dark oak timber
        roughness: 0.86,
        metalness: 0.02,
    });

    // Main Hall
    const mainW = 4.4, mainH = 3.4, mainD = 3.4;
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(mainW, mainH, mainD), plasterMat);
    mainHall.position.set(0.5, 0.42 + mainH / 2, -0.2);
    mainHall.castShadow = true;
    mainHall.receiveShadow = true;
    cottageRoot.add(mainHall);

    // Side Cross-Wing (Cozy Kitchen / Study Annex for organic asymmetry)
    const wingW = 2.4, wingH = 2.8, wingD = 2.6;
    const sideWing = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), plasterMat);
    sideWing.position.set(-2.0, 0.42 + wingH / 2, 0.2);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    cottageRoot.add(sideWing);

    // Decorative Tudor Timber Framing Posts on Main Hall
    const cornerPosts = [
        { x: 0.5 - mainW / 2 + 0.1, z: -0.2 - mainD / 2 + 0.1 },
        { x: 0.5 + mainW / 2 - 0.1, z: -0.2 - mainD / 2 + 0.1 },
        { x: 0.5 - mainW / 2 + 0.1, z: -0.2 + mainD / 2 - 0.1 },
        { x: 0.5 + mainW / 2 - 0.1, z: -0.2 + mainD / 2 - 0.1 },
    ];
    cornerPosts.forEach((cp) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, mainH, 0.24), timberMat);
        post.position.set(cp.x, 0.42 + mainH / 2, cp.z);
        post.castShadow = true;
        cottageRoot.add(post);
    });

    // Horizontal timber beams
    const midBeam = new THREE.Mesh(new THREE.BoxGeometry(mainW + 0.06, 0.18, 0.12), timberMat);
    midBeam.position.set(0.5, 0.42 + mainH * 0.55, -0.2 + mainD / 2 + 0.05);
    cottageRoot.add(midBeam);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(mainW + 0.06, 0.2, 0.12), timberMat);
    topBeam.position.set(0.5, 0.42 + mainH - 0.1, -0.2 + mainD / 2 + 0.05);
    cottageRoot.add(topBeam);

    // Diagonal braces on upper facade
    for (const sx of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.1), timberMat);
        brace.position.set(0.5 + sx * 1.3, 0.42 + mainH * 0.76, -0.2 + mainD / 2 + 0.05);
        brace.rotation.z = sx * 0.65;
        cottageRoot.add(brace);
    }

    // ─── 3. DOUBLE-PITCHED SHINGLED ROOFS & GABLES ─────────────────────────
    const roofColor = season === 'autumn' ? 0xa14210 : season === 'winter' ? 0xdbe2ea : 0x853b1b;
    const roofMat = new THREE.MeshStandardMaterial({
        color: roofColor,
        roughness: 0.8,
        metalness: 0.03,
    });

    // Main Hall Gabled Roof
    const mainRoofShape = new THREE.Shape();
    const roofOverhang = 0.55;
    const roofHalfW = mainW / 2 + roofOverhang;
    const roofPeak = 2.4;
    mainRoofShape.moveTo(-roofHalfW, 0);
    mainRoofShape.lineTo(0, roofPeak);
    mainRoofShape.lineTo(roofHalfW, 0);
    mainRoofShape.lineTo(-roofHalfW, 0);

    const mainRoofGeo = new THREE.ExtrudeGeometry(mainRoofShape, {
        depth: mainD + roofOverhang * 2,
        bevelEnabled: false,
    });
    const mainRoof = new THREE.Mesh(mainRoofGeo, roofMat);
    mainRoof.position.set(0.5, 0.42 + mainH, -0.2 - (mainD + roofOverhang * 2) / 2);
    mainRoof.castShadow = true;
    mainRoof.receiveShadow = true;
    cottageRoot.add(mainRoof);

    // Carved Timber Ridge Beam on Roof Peak
    const ridgeBeamGeo = new THREE.BoxGeometry(0.25, 0.25, mainD + roofOverhang * 2 + 0.2);
    const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, timberMat);
    ridgeBeam.position.set(0.5, 0.42 + mainH + roofPeak + 0.05, -0.2);
    cottageRoot.add(ridgeBeam);

    // Side Wing Roof (perpendicular cross gable)
    const wingRoofShape = new THREE.Shape();
    const wingHalfD = wingD / 2 + 0.4;
    const wingPeak = 1.9;
    wingRoofShape.moveTo(-wingHalfD, 0);
    wingRoofShape.lineTo(0, wingPeak);
    wingRoofShape.lineTo(wingHalfD, 0);
    wingRoofShape.lineTo(-wingHalfD, 0);

    const wingRoofGeo = new THREE.ExtrudeGeometry(wingRoofShape, {
        depth: wingW + 0.4,
        bevelEnabled: false,
    });
    const wingRoof = new THREE.Mesh(wingRoofGeo, roofMat);
    wingRoof.rotation.y = Math.PI / 2;
    wingRoof.position.set(-2.0 + (wingW + 0.4) / 2, 0.42 + wingH, 0.2);
    wingRoof.castShadow = true;
    cottageRoot.add(wingRoof);

    // ─── 4. FRONT ROOF DORMER WITH TINY ARCHED WINDOW ──────────────────────
    const dormerGroup = new THREE.Group();
    dormerGroup.position.set(1.4, 0.42 + mainH + 0.65, -0.2 + mainD / 2 + 0.1);
    cottageRoot.add(dormerGroup);

    const dormerBodyGeo = new THREE.BoxGeometry(1.1, 0.95, 1.0);
    const dormerBody = new THREE.Mesh(dormerBodyGeo, plasterMat);
    dormerGroup.add(dormerBody);

    const dormerRoofShape = new THREE.Shape();
    dormerRoofShape.moveTo(-0.65, 0);
    dormerRoofShape.lineTo(0, 0.65);
    dormerRoofShape.lineTo(0.65, 0);
    dormerRoofShape.lineTo(-0.65, 0);
    const dormerRoofGeo = new THREE.ExtrudeGeometry(dormerRoofShape, { depth: 1.1, bevelEnabled: false });
    const dormerRoof = new THREE.Mesh(dormerRoofGeo, roofMat);
    dormerRoof.position.set(0, 0.47, -0.55);
    dormerRoof.castShadow = true;
    dormerGroup.add(dormerRoof);

    // Tiny Dormer Lattice Window
    const dormerWinMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 0.6,
        roughness: 0.2,
    });
    const dormerWin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.08), dormerWinMat);
    dormerWin.position.set(0, 0.1, 0.52);
    dormerGroup.add(dormerWin);

    // ─── 5. FIELDSTONE CHIMNEY WITH DRIFTING SMOKE ─────────────────────────
    const chimneyStoneMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xb5bec8 : 0x6e6559,
        roughness: 0.92,
        metalness: 0.05,
    });
    const chimneyBaseGeo = new THREE.BoxGeometry(1.1, 4.8, 1.1);
    const chimneyBase = new THREE.Mesh(chimneyBaseGeo, chimneyStoneMat);
    chimneyBase.position.set(0.5 + mainW / 2 + 0.35, 2.4, -0.2 - 0.4);
    chimneyBase.castShadow = true;
    cottageRoot.add(chimneyBase);

    // Tapering Chimney Top
    const chimneyTopGeo = new THREE.BoxGeometry(0.85, 2.2, 0.85);
    const chimneyTop = new THREE.Mesh(chimneyTopGeo, chimneyStoneMat);
    chimneyTop.position.set(chimneyBase.position.x, 0.42 + mainH + 1.2, chimneyBase.position.z);
    chimneyTop.castShadow = true;
    cottageRoot.add(chimneyTop);

    // Terracotta Chimney Flue Pots
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75 });
    for (const pOffset of [-0.18, 0.18]) {
        const fluePot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8), potMat);
        fluePot.position.set(chimneyTop.position.x + pOffset, chimneyTop.position.y + 1.25, chimneyTop.position.z);
        cottageRoot.add(fluePot);
    }

    // Drifting chimney smoke puffs
    const smokeCount = 14;
    const smokeGeo = new THREE.SphereGeometry(0.16, 5, 4);
    const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xededed,
        transparent: true,
        opacity: 0.45,
    });
    const smokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, smokeCount);
    const smokeMatrix = new THREE.Matrix4();
    for (let i = 0; i < smokeCount; i++) {
        const sx = chimneyTop.position.x + prng.range(-0.15, 0.15) + i * 0.06;
        const sy = chimneyTop.position.y + 1.5 + i * 0.32;
        const sz = chimneyTop.position.z + prng.range(-0.15, 0.15) - i * 0.05;
        const scale = 0.7 + i * 0.14;
        smokeMatrix.makeTranslation(sx, sy, sz);
        smokeMatrix.scale(new THREE.Vector3(scale, scale * 0.9, scale));
        smokeMesh.setMatrixAt(i, smokeMatrix);
    }
    smokeMesh.instanceMatrix.needsUpdate = true;
    cottageRoot.add(smokeMesh);

    // ─── 6. FRONT ENTRANCE, OAK DOOR & PORCH CANOPY ────────────────────────
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.1, 0.14), timberMat);
    doorFrame.position.set(0.2, 0.42 + 1.05, -0.2 + mainD / 2 + 0.05);
    cottageRoot.add(doorFrame);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x54331a, roughness: 0.82 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.9, 0.1), doorMat);
    door.position.set(0.2, 0.42 + 0.95, -0.2 + mainD / 2 + 0.09);
    door.castShadow = true;
    cottageRoot.add(door);

    // Door Ring Knocker (forged iron)
    const knockerMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.3 });
    const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), knockerMat);
    knocker.position.set(0.38, 0.42 + 1.05, -0.2 + mainD / 2 + 0.15);
    cottageRoot.add(knocker);

    // Overhanging Porch Canopy with Carved Wooden Brackets
    const porchCanopyGeo = new THREE.BoxGeometry(1.8, 0.16, 1.2);
    const porchCanopy = new THREE.Mesh(porchCanopyGeo, roofMat);
    porchCanopy.position.set(0.2, 0.42 + 2.2, -0.2 + mainD / 2 + 0.55);
    porchCanopy.rotation.x = 0.12;
    porchCanopy.castShadow = true;
    cottageRoot.add(porchCanopy);

    for (const bx of [-0.65, 0.65]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.6), timberMat);
        bracket.position.set(0.2 + bx, 0.42 + 1.9, -0.2 + mainD / 2 + 0.28);
        cottageRoot.add(bracket);
    }

    // Hanging Wrought-Iron Lantern with Warm Golden Light
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.3 });
    const lanternPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.25), lanternMat);
    lanternPost.position.set(0.95, 0.42 + 1.85, -0.2 + mainD / 2 + 0.18);
    cottageRoot.add(lanternPost);

    const lanternGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.85,
        roughness: 0.1,
    });
    const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), lanternGlowMat);
    lanternGlass.position.set(0.95, 0.42 + 1.65, -0.2 + mainD / 2 + 0.26);
    cottageRoot.add(lanternGlass);

    const warmLight = new THREE.PointLight(0xffb84d, 1.8, 8, 1.2);
    warmLight.position.copy(lanternGlass.position);
    cottageRoot.add(warmLight);

    // ─── 7. MULTI-PANE ILLUMINATED WINDOWS & FLOWER PLANTER BOXES ─────────
    const windowLocations = [
        { x: -0.9, y: 0.42 + 1.6, z: -0.2 + mainD / 2 + 0.05, rotY: 0, w: 1.1, h: 1.0 },
        { x: 1.7, y: 0.42 + 1.6, z: -0.2 + mainD / 2 + 0.05, rotY: 0, w: 0.9, h: 0.9 },
        { x: -2.0, y: 0.42 + 1.3, z: 0.2 + wingD / 2 + 0.05, rotY: 0, w: 1.0, h: 0.85 },
        { x: -2.0 - wingW / 2 - 0.05, y: 0.42 + 1.3, z: 0.2, rotY: Math.PI / 2, w: 1.0, h: 0.85 },
    ];

    const windowGlassMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.58,
        roughness: 0.18,
    });

    const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0x5c381f, roughness: 0.85 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3f7a18, roughness: 0.7 });
    const flowerMats = [
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 }), // Rose
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 }), // Marigold
        new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.5 }), // Hydrangea
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), // Daisy
    ];

    windowLocations.forEach((wLoc) => {
        const winGroup = new THREE.Group();
        winGroup.position.set(wLoc.x, wLoc.y, wLoc.z);
        winGroup.rotation.y = wLoc.rotY;

        // Glass Pane
        const glass = new THREE.Mesh(new THREE.BoxGeometry(wLoc.w, wLoc.h, 0.08), windowGlassMat);
        winGroup.add(glass);

        // Timber Frame & Mullions
        const frame = new THREE.Mesh(new THREE.BoxGeometry(wLoc.w + 0.14, wLoc.h + 0.14, 0.06), timberMat);
        frame.position.z = -0.02;
        winGroup.add(frame);

        const hMullion = new THREE.Mesh(new THREE.BoxGeometry(wLoc.w, 0.05, 0.1), timberMat);
        winGroup.add(hMullion);
        const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, wLoc.h, 0.1), timberMat);
        winGroup.add(vMullion);

        // Wooden Planter Flower Box Underneath
        const planterGeo = new THREE.BoxGeometry(wLoc.w + 0.1, 0.22, 0.3);
        const planter = new THREE.Mesh(planterGeo, planterBoxMat);
        planter.position.set(0, -wLoc.h / 2 - 0.12, 0.15);
        planter.castShadow = true;
        winGroup.add(planter);

        // Cascading Green Bush Inside Planter
        const bush = new THREE.Mesh(new THREE.BoxGeometry(wLoc.w * 0.95, 0.18, 0.24), foliageMat);
        bush.position.set(0, -wLoc.h / 2 - 0.04, 0.15);
        winGroup.add(bush);

        // Colorful Blossoms Spilling Out
        const bloomCount = 7;
        for (let b = 0; b < bloomCount; b++) {
            const fMat = prng.choice(flowerMats);
            const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), fMat);
            const bx = (b / (bloomCount - 1) - 0.5) * (wLoc.w * 0.85);
            blossom.position.set(bx, -wLoc.h / 2 + prng.range(-0.02, 0.08), 0.22 + prng.range(-0.04, 0.06));
            winGroup.add(blossom);
        }

        cottageRoot.add(winGroup);
    });

    // ─── 8. COTTAGE GARDEN PROPS (PATH, FENCE, BARREL, WOODPILE) ───────────
    // Curved Flagstone Pathway
    const pathStoneMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xd0d7df : 0x9ca3af,
        roughness: 0.85,
    });
    for (let i = 0; i < 6; i++) {
        const rW = prng.range(0.35, 0.52);
        const rH = prng.range(0.3, 0.44);
        const pStone = new THREE.Mesh(new THREE.CylinderGeometry(rW, rW * 1.05, 0.08, 7), pathStoneMat);
        pStone.position.set(
            0.2 + Math.sin(i * 0.6) * 0.45,
            0.15,
            2.9 + i * 0.85
        );
        pStone.rotation.y = prng.range(0, Math.PI);
        pStone.receiveShadow = true;
        cottageRoot.add(pStone);
    }

    // Split-Rail Rustic Wooden Fence
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.85 });
    for (let i = 0; i < 3; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), fenceMat);
        post.position.set(-3.2, 0.55, 1.0 + i * 1.2);
        post.castShadow = true;
        cottageRoot.add(post);

        if (i < 2) {
            const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), fenceMat);
            rail1.position.set(-3.2, 0.45, 1.6 + i * 1.2);
            cottageRoot.add(rail1);

            const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), fenceMat);
            rail2.position.set(-3.2, 0.85, 1.6 + i * 1.2);
            cottageRoot.add(rail2);
        }
    }

    // Rainwater Barrel Under Roof Valley
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.05, 12), barrelMat);
    barrel.position.set(-0.9, 0.52, -0.2 + mainD / 2 + 0.4);
    barrel.castShadow = true;
    cottageRoot.add(barrel);

    const hoopMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.4 });
    for (const hy of [0.25, 0.8]) {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.05, 12), hoopMat);
        hoop.position.set(barrel.position.x, hy, barrel.position.z);
        cottageRoot.add(hoop);
    }

    // Stack of Split Firewood Logs by Chimney
    const logMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    for (let lz = 0; lz < 3; lz++) {
        for (let ly = 0; ly < 2; ly++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 7), logMat);
            log.rotation.x = Math.PI / 2;
            log.position.set(
                chimneyBase.position.x - 0.2 + ly * 0.12,
                0.28 + ly * 0.22,
                chimneyBase.position.z + 0.9 + lz * 0.26
            );
            log.castShadow = true;
            cottageRoot.add(log);
        }
    }

    // ─── 9. SEASONAL STORYBOOK TOUCHES ─────────────────────────────────────
    if (season === 'autumn') {
        // Harvest Pumpkins by the Door
        const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.65 });
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
        const pumpkinLocations = [
            { x: -0.6, z: 2.7, r: 0.25 },
            { x: -0.85, z: 2.85, r: 0.18 },
        ];
        pumpkinLocations.forEach((pLoc) => {
            const pMesh = new THREE.Mesh(new THREE.SphereGeometry(pLoc.r, 8, 8), pumpkinMat);
            pMesh.scale.set(1, 0.8, 1);
            pMesh.position.set(pLoc.x, pLoc.r * 0.8, pLoc.z);
            pMesh.castShadow = true;
            cottageRoot.add(pMesh);

            const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.09, 5), stemMat);
            pStem.position.set(pLoc.x, pLoc.r * 0.8 + 0.16, pLoc.z);
            cottageRoot.add(pStem);
        });
    } else if (season === 'winter') {
        // Soft Snow Cushions on Roof Ridges & Chimney
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
        const ridgeSnow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, mainD + roofOverhang * 2 + 0.1), snowMat);
        ridgeSnow.position.set(0.5, 0.42 + mainH + roofPeak + 0.16, -0.2);
        cottageRoot.add(ridgeSnow);

        const chimneySnow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.15, 0.95), snowMat);
        chimneySnow.position.set(chimneyTop.position.x, chimneyTop.position.y + 1.15, chimneyTop.position.z);
        cottageRoot.add(chimneySnow);
    } else if (season === 'spring') {
        // Blooming Climbing Wisteria Vines scaling the timber posts
        const petalMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
        for (let i = 0; i < 18; i++) {
            const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), petalMat);
            blossom.position.set(
                0.5 - mainW / 2 + 0.1 + prng.range(-0.15, 0.15),
                1.0 + i * 0.14,
                -0.2 + mainD / 2 + 0.12 + prng.range(-0.08, 0.08)
            );
            cottageRoot.add(blossom);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ART TOY FIGURINE AVATAR DIORAMA (COLLECTIBLE DESIGNER VINYL FIGURINE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds an exquisite Collectible Art Toy Figurine (Pop Mart / Nendoroid aesthetic)
 * with stylized chibi proportions, expressive anime eyes, layered sculpted hair,
 * designer oversized streetwear hoodie, platform sneakers, DJ headphones, crossbody
 * bag, and gentle orbiting sparkle aura.
 */
export function buildAvatarCenterpiece(
    treeGroup: THREE.Group,
    season: SeasonType,
    palette: FoliagePalette,
    prng: PRNG
): void {
    const avatarRoot = new THREE.Group();
    avatarRoot.name = 'collectibleAvatar';
    treeGroup.add(avatarRoot);

    // ─── 1. COLLECTOR'S SHOWCASE PEDESTAL ──────────────────────────────────
    const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x18181b, // Satin obsidian base
        roughness: 0.35,
        metalness: 0.3,
    });
    const pedestalGeo = new THREE.CylinderGeometry(2.6, 2.75, 0.32, 32);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.set(0, 0.16, 0);
    pedestalMesh.receiveShadow = true;
    avatarRoot.add(pedestalMesh);

    // Metallic Trim Bevel Ring (Gold / Chrome accent)
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.25,
    });
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(2.68, 0.04, 8, 36), goldMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.set(0, 0.3, 0);
    avatarRoot.add(goldRing);

    // ─── 2. MATERIALS & COLOR PALETTES ─────────────────────────────────────
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xfcd5b8, // Porcelain anime skin tone
        roughness: 0.65,
        metalness: 0.02,
    });

    const blushMat = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.5,
    });

    // Hair color with botanical highlight matching the season
    const hairColor = season === 'autumn' ? 0x78350f : season === 'winter' ? 0x334155 : 0x271e1b;
    const hairMat = new THREE.MeshStandardMaterial({
        color: hairColor,
        roughness: 0.55,
        metalness: 0.05,
    });

    // Designer Oversized Streetwear Hoodie
    const jacketColor = new THREE.Color(palette.primary);
    const jacketMat = new THREE.MeshStandardMaterial({
        color: jacketColor,
        roughness: 0.72,
        metalness: 0.05,
    });

    const innerShirtMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.7,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark slate joggers
        roughness: 0.78,
    });

    const shoeSoleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
    });
    const shoeUpperMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.secondary),
        roughness: 0.65,
    });

    // ─── 3. LEGS & CHUNKY DESIGNER PLATFORM SNEAKERS ───────────────────────
    const legGeo = new THREE.CylinderGeometry(0.24, 0.26, 1.45, 12);
    const legPositions = [
        { x: -0.42, z: 0.08, rotZ: 0.06, rotX: -0.05 }, // Left leg slightly forward
        { x: 0.42, z: -0.08, rotZ: -0.06, rotX: 0.05 }, // Right leg weight bearing
    ];

    legPositions.forEach((lp) => {
        const legGroup = new THREE.Group();
        legGroup.position.set(lp.x, 0.32, lp.z);
        legGroup.rotation.z = lp.rotZ;
        legGroup.rotation.x = lp.rotX;

        // Pants leg
        const legMesh = new THREE.Mesh(legGeo, pantsMat);
        legMesh.position.y = 0.72;
        legMesh.castShadow = true;
        legGroup.add(legMesh);

        // Platform Chunky Sneaker
        const sneakerGroup = new THREE.Group();
        sneakerGroup.position.set(0, 0, 0.05);

        // Thick platform rubber sole
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.85), shoeSoleMat);
        sole.position.set(0, 0.12, 0.05);
        sole.castShadow = true;
        sneakerGroup.add(sole);

        // Sneaker upper body
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.35, 0.78), shoeUpperMat);
        upper.position.set(0, 0.32, 0.02);
        upper.castShadow = true;
        sneakerGroup.add(upper);

        // Toe cap
        const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), shoeSoleMat);
        toeCap.scale.set(1, 0.7, 1);
        toeCap.position.set(0, 0.22, 0.38);
        sneakerGroup.add(toeCap);

        legGroup.add(sneakerGroup);
        avatarRoot.add(legGroup);
    });

    // ─── 4. TORSO & OVERSIZED STREETWEAR HOODIE ────────────────────────────
    const torsoY = 0.32 + 1.45;
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, torsoY, 0);
    avatarRoot.add(torsoGroup);

    // Inner tee
    const innerTee = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.65), innerShirtMat);
    innerTee.position.set(0, 0.6, 0);
    torsoGroup.add(innerTee);

    // Oversized Hoodie Body
    const hoodieGeo = new THREE.BoxGeometry(1.48, 1.45, 1.05);
    const hoodie = new THREE.Mesh(hoodieGeo, jacketMat);
    hoodie.position.set(0, 0.65, 0);
    hoodie.castShadow = true;
    torsoGroup.add(hoodie);

    // Dimensional Folded Collar / Lapels
    const collarGeo = new THREE.BoxGeometry(1.54, 0.32, 1.12);
    const collar = new THREE.Mesh(collarGeo, jacketMat);
    collar.position.set(0, 1.35, 0);
    torsoGroup.add(collar);

    // Front Zipper Line & Toggles
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.08), goldMat);
    zipper.position.set(0, 0.65, 0.54);
    torsoGroup.add(zipper);

    // ─── 5. ARMS & DYNAMIC CASUAL POSE ─────────────────────────────────────
    const armGeo = new THREE.CylinderGeometry(0.24, 0.22, 1.35, 10);

    // Left Arm (relaxed by side / hand in pocket)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.85, 1.15, 0);
    leftArmGroup.rotation.z = 0.15;
    leftArmGroup.rotation.x = -0.08;

    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.position.y = -0.6;
    leftArmMesh.castShadow = true;
    leftArmGroup.add(leftArmMesh);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), skinMat);
    leftHand.position.set(0, -1.25, 0.05);
    leftArmGroup.add(leftHand);
    torsoGroup.add(leftArmGroup);

    // Right Arm (raised slightly holding seasonal prop or giving gentle wave)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.85, 1.15, 0);
    rightArmGroup.rotation.z = -0.32;
    rightArmGroup.rotation.x = 0.35;

    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.position.y = -0.6;
    rightArmMesh.castShadow = true;
    rightArmGroup.add(rightArmMesh);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), skinMat);
    rightHand.position.set(0, -1.25, 0.05);
    rightArmGroup.add(rightHand);

    // In-Hand Accessory: Blooming Sprig, Hot Cocoa Mug, or Smartphone
    if (season === 'spring') {
        const sprigGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5);
        const sprigMesh = new THREE.Mesh(sprigGeo, new THREE.MeshStandardMaterial({ color: 0x4a2e18 }));
        sprigMesh.position.set(0, -1.25, 0.35);
        sprigMesh.rotation.x = Math.PI / 3;
        rightArmGroup.add(sprigMesh);

        const flowerBloom = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 6, 5),
            new THREE.MeshStandardMaterial({ color: 0xf472b6 })
        );
        flowerBloom.position.set(0, -1.0, 0.65);
        rightArmGroup.add(flowerBloom);
    } else if (season === 'winter') {
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.35, 10), mugMat);
        mug.position.set(0, -1.22, 0.28);
        rightArmGroup.add(mug);

        const foam = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        foam.position.set(0, -1.06, 0.28);
        rightArmGroup.add(foam);
    } else {
        // Smartphone displaying miniature glowing QR screen!
        const phoneMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.04), phoneMat);
        phone.position.set(0, -1.2, 0.25);
        phone.rotation.x = -0.3;

        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x67e8f9,
            emissive: 0x22d3ee,
            emissiveIntensity: 0.65,
        });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.02), screenMat);
        screen.position.set(0, 0, 0.025);
        phone.add(screen);
        rightArmGroup.add(phone);
    }
    torsoGroup.add(rightArmGroup);

    // Crossbody Satchel / Messenger Bag
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const bagStrap = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 6, 24), bagMat);
    bagStrap.rotation.y = Math.PI / 4;
    bagStrap.rotation.x = Math.PI / 6;
    bagStrap.position.set(0, 0.75, 0);
    torsoGroup.add(bagStrap);

    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.28), bagMat);
    satchel.position.set(-0.7, 0.25, 0.25);
    satchel.rotation.z = -0.15;
    satchel.castShadow = true;
    torsoGroup.add(satchel);

    // ─── 6. SCULPTED HEAD & BEAUTIFUL ANIME FACE ───────────────────────────
    const headY = torsoY + 1.45 + 0.65;
    const headGroup = new THREE.Group();
    headGroup.position.set(0, headY, 0);
    avatarRoot.add(headGroup);

    // Smooth Chibi Head
    const headGeo = new THREE.SphereGeometry(1.02, 22, 18);
    headGeo.scale(1.05, 1.0, 1.05);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Anime Expressive Eyes (Multi-Part Depth)
    const eyeZ = 0.98;
    for (const ex of [-0.42, 0.42]) {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(ex, 0.02, eyeZ);

        // Outer Dark Pupil
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
        const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), pupilMat);
        eyeGroup.add(pupil);

        // Iris Crescent with Season Color
        const irisMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.primary) });
        const iris = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), irisMat);
        iris.position.set(0, -0.03, 0.005);
        eyeGroup.add(iris);

        // Double Specular Gleam Dots (Lifelike Anime Sparkle)
        const gleamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const bigGleam = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), gleamMat);
        bigGleam.position.set(-0.05, 0.06, 0.01);
        eyeGroup.add(bigGleam);

        const smallGleam = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), gleamMat);
        smallGleam.position.set(0.05, -0.04, 0.01);
        eyeGroup.add(smallGleam);

        // Delicate Upper Lash Curve
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.02), pupilMat);
        lash.position.set(0, 0.17, 0.01);
        lash.rotation.z = ex > 0 ? -0.1 : 0.1;
        eyeGroup.add(lash);

        // Eyebrow
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.02), hairMat);
        brow.position.set(0, 0.32, 0.01);
        brow.rotation.z = ex > 0 ? 0.08 : -0.08;
        eyeGroup.add(brow);

        // Soft Airbrush Peach Blush
        const blush = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), blushMat);
        blush.position.set(0, -0.22, 0.005);
        eyeGroup.add(blush);

        headGroup.add(eyeGroup);
    }

    // Cute Smile
    const smileMat = new THREE.MeshBasicMaterial({ color: 0xc2410c });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), smileMat);
    smile.rotation.x = Math.PI;
    smile.position.set(0, -0.28, eyeZ);
    headGroup.add(smile);

    // ─── 7. LAYERED SCULPTED HAIR & ACCESSORIES ────────────────────────────
    // Front Bangs Sweeping Across Forehead
    const bangOffsets = [-0.6, -0.32, 0.0, 0.32, 0.6];
    bangOffsets.forEach((bx, idx) => {
        const bangGeo = new THREE.ConeGeometry(0.24, 0.85, 8);
        bangGeo.scale(1, 1, 0.45);
        const bang = new THREE.Mesh(bangGeo, hairMat);
        bang.position.set(bx, 0.55 - Math.abs(bx) * 0.18, 0.95);
        bang.rotation.z = (idx - 2) * -0.18 + Math.PI;
        bang.rotation.x = -0.2;
        bang.castShadow = true;
        headGroup.add(bang);
    });

    // Side Tresses Framing Cheeks
    for (const sx of [-0.98, 0.98]) {
        const tressGeo = new THREE.ConeGeometry(0.25, 1.25, 8);
        tressGeo.scale(1, 1, 0.55);
        const tress = new THREE.Mesh(tressGeo, hairMat);
        tress.position.set(sx, -0.1, 0.5);
        tress.rotation.z = sx > 0 ? 0.22 + Math.PI : -0.22 + Math.PI;
        tress.castShadow = true;
        headGroup.add(tress);
    }

    // Volumetric Back Hair Mass
    const backHairGeo = new THREE.SphereGeometry(1.08, 16, 14);
    backHairGeo.scale(1.08, 1.12, 1.05);
    const backHair = new THREE.Mesh(backHairGeo, hairMat);
    backHair.position.set(0, 0.12, -0.22);
    backHair.castShadow = true;
    headGroup.add(backHair);

    // OVER-EAR DJ/STUDIO HEADPHONES (Around Neck / Lower Head)
    const headphoneGroup = new THREE.Group();
    headphoneGroup.position.set(0, -0.75, 0);

    const hpBandMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.2 });
    const hpCushionMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const hpAccentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.primary), roughness: 0.4 });

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 24, Math.PI * 1.3), hpBandMat);
    band.rotation.z = Math.PI / 2 + 0.5;
    band.rotation.x = Math.PI / 2;
    headphoneGroup.add(band);

    for (const hx of [-0.85, 0.85]) {
        // Headphone Ear Cup
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14), hpBandMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(hx, 0, 0);

        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 14), hpCushionMat);
        pad.rotation.z = Math.PI / 2;
        pad.position.set(hx > 0 ? -0.1 : 0.1, 0, 0);
        cup.add(pad);

        const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14), hpAccentMat);
        badge.rotation.z = Math.PI / 2;
        badge.position.set(hx > 0 ? 0.1 : -0.1, 0, 0);
        cup.add(badge);

        headphoneGroup.add(cup);
    }
    headGroup.add(headphoneGroup);

    // ─── 8. ORBITING MAGICAL SPARKLES / RUNES AURA ─────────────────────────
    const sparkleCount = 10;
    const sparkleMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.85,
    });
    for (let s = 0; s < sparkleCount; s++) {
        const rad = 1.6 + prng.range(0.2, 0.8);
        const theta = (s / sparkleCount) * Math.PI * 2 + prng.range(-0.2, 0.2);
        const sGeo = new THREE.OctahedronGeometry(0.12, 0);
        const sparkle = new THREE.Mesh(sGeo, sparkleMat);
        sparkle.position.set(
            Math.cos(theta) * rad,
            0.5 + Math.sin(s * 1.5) * 1.8,
            Math.sin(theta) * rad
        );
        avatarRoot.add(sparkle);
    }
}
