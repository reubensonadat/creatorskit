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
export type SceneType = 'tree' | 'house' | 'avatar';

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
    treeGroup: THREE.Group;
    particles: ParticleState | null;
    leafMeshes: THREE.InstancedMesh[];
    trunkMesh: THREE.Group;
    qrSize: number;
    worldSize: number;
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
    groundGroup.add(baseMesh);

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
    groundGroup.add(strataMesh);

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
    groundGroup.add(rimMesh);

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
    groundGroup.add(innerRimMesh);

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

    // Light tiles (Warm limestone paving — flush with gentle height variation)
    const lightTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 0.18, cellSize * 0.94);
    const lightTileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.02,
    });
    const lightTilesMesh = new THREE.InstancedMesh(lightTileGeo, lightTileMat, lightTileCoords.length);
    const lightStonePalette = [0xfcfaf5, 0xf6f3eb, 0xf9f7f2, 0xf4f1e8, 0xf8f5ef];

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
        colorHelper.setHex(hex);
        lightTilesMesh.setColorAt(idx, colorHelper);
    });
    lightTilesMesh.instanceMatrix.needsUpdate = true;
    if (lightTilesMesh.instanceColor) lightTilesMesh.instanceColor.needsUpdate = true;
    lightTilesMesh.receiveShadow = true;
    lightTilesMesh.castShadow = true;
    groundGroup.add(lightTilesMesh);

    // Dark tiles — SOFT WARM COBBLESTONE PAVERS (matching reference diorama Image 1!)
    const darkTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 1.0, cellSize * 0.94);
    const darkTileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.03,
    });
    const darkTilesMesh = new THREE.InstancedMesh(darkTileGeo, darkTileMat, darkTileCoords.length);

    // Soft, warm stone cobblestone palette (exact match to tree.icqr.com)
    const slatePalette = [0xd4cec3, 0xcbc4b9, 0xc1baa9, 0xd0c9bd, 0xbeb7a7, 0xc7c0b4];
    const finderTurfColor = 0x558b16;

    darkTileCoords.forEach((coord, idx) => {
        // Gentle flush relief — harmonizes with ground instead of harsh dark monoliths
        const height = coord.isFinder ? 0.22 : prng.range(0.19, 0.24);

        tempPos.set(coord.x, height / 2 + 0.04, coord.z);
        tempRot.set(prng.range(-0.008, 0.008), prng.range(-0.012, 0.012), prng.range(-0.008, 0.008));
        tempQuat.setFromEuler(tempRot);
        tempScale.set(prng.range(0.94, 0.98), height, prng.range(0.94, 0.98));
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        darkTilesMesh.setMatrixAt(idx, tempMatrix);

        if (coord.isFinder) {
            colorHelper.setHex(finderTurfColor).offsetHSL(prng.range(-0.02, 0.02), prng.range(-0.04, 0.04), prng.range(-0.03, 0.03));
        } else {
            const hex = prng.choice(slatePalette);
            colorHelper.setHex(hex).offsetHSL(prng.range(-0.01, 0.01), 0, prng.range(-0.02, 0.02));
        }
        darkTilesMesh.setColorAt(idx, colorHelper);
    });
    darkTilesMesh.instanceMatrix.needsUpdate = true;
    if (darkTilesMesh.instanceColor) darkTilesMesh.instanceColor.needsUpdate = true;
    darkTilesMesh.castShadow = true;
    darkTilesMesh.receiveShadow = true;
    groundGroup.add(darkTilesMesh);

    // ─── 3. CORNER FINDER FLOWER GARDENS (3D GRASS & WILDFLOWERS) ─────────
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
    groundGroup.add(grassInstanced);

    flowerInstanced.instanceMatrix.needsUpdate = true;
    if (flowerInstanced.instanceColor) flowerInstanced.instanceColor.needsUpdate = true;
    groundGroup.add(flowerInstanced);

    // ─── 4-6. CENTERPIECE — depends on sceneType ─────────────────────────────

    let trunkGroup: THREE.Group;
    let blossomInstanced: THREE.InstancedMesh | null = null;

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

        // 1. Stately vertical trunk with horizontal bark ring segments (matching Image 1!)
        const trunkHeight = 10.2;
        const trunkRadiusBottom = 1.25;
        const trunkRadiusTop = 0.58;
        const trunkSegments = 10;

        let prevPoint = new THREE.Vector3(0, 0.14, 0);
        const trunkKnots: THREE.Vector3[] = [prevPoint.clone()];

        for (let s = 0; s < trunkSegments; s++) {
            const segHeight = trunkHeight / trunkSegments;
            const progress = (s + 1) / trunkSegments;
            const rBottom = trunkRadiusBottom - (trunkRadiusBottom - trunkRadiusTop) * (s / trunkSegments);
            const rTop = trunkRadiusBottom - (trunkRadiusBottom - trunkRadiusTop) * progress;

            // Subtle Japanese cedar posture
            const wobbleX = Math.sin(s * 0.4 + qrResult.seed) * 0.15;
            const wobbleZ = Math.cos(s * 0.35 + qrResult.seed) * 0.15;
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
        const numRoots = 6;
        for (let r = 0; r < numRoots; r++) {
            const rootAngle = (r / numRoots) * Math.PI * 2 + prng.range(-0.1, 0.1);
            const rootLength = prng.range(1.6, 2.3);
            const rootGeo = new THREE.ConeGeometry(0.42, rootLength, 6);
            const rootMesh = new THREE.Mesh(rootGeo, woodMat);

            const rx = Math.cos(rootAngle) * 0.72;
            const rz = Math.sin(rootAngle) * 0.72;
            rootMesh.position.set(rx, 0.18, rz);
            rootMesh.rotation.set(
                Math.sin(rootAngle) * 0.78,
                0,
                -Math.cos(rootAngle) * 0.78
            );
            rootMesh.castShadow = true;
            trunkGroup.add(rootMesh);
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
        const fallenMesh = new THREE.InstancedMesh(fallenGeo, fallenMat, fallenCount);

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
        treeGroup,
        particles: particlesState,
        leafMeshes: blossomInstanced ? [blossomInstanced] : [],
        trunkMesh: trunkGroup,
        qrSize: size,
        worldSize,
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
// HOUSE DIORAMA — Cozy low-poly cottage with chimney, garden, and mailbox
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a cozy cottage house on the QR platform instead of a tree.
 * Uses the same QR ground tile system but replaces the tree with a house.
 */
export function buildHouseCenterpiece(
    treeGroup: THREE.Group,
    season: SeasonType,
    palette: FoliagePalette,
    prng: PRNG
): void {
    // House body (main structure)
    const bodyW = 4.0, bodyH = 3.2, bodyD = 3.5;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    const wallColor = season === 'winter' ? 0xf0ece6 : 0xfaf5ed;
    const bodyMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.88,
        metalness: 0.02,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, bodyH / 2 + 0.15, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    treeGroup.add(body);

    // Pitched roof (triangular prism via ExtrudeGeometry)
    const roofShape = new THREE.Shape();
    const roofOverhang = 0.6;
    const roofHalfW = bodyW / 2 + roofOverhang;
    const roofPeak = 2.2;
    roofShape.moveTo(-roofHalfW, 0);
    roofShape.lineTo(0, roofPeak);
    roofShape.lineTo(roofHalfW, 0);
    roofShape.lineTo(-roofHalfW, 0);

    const roofExtrudeSettings = { depth: bodyD + roofOverhang, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, roofExtrudeSettings);
    const roofColor = season === 'autumn' ? 0xb45309 : season === 'winter' ? 0xcbd5e1 : 0xc0392b;
    const roofMat = new THREE.MeshStandardMaterial({
        color: roofColor,
        roughness: 0.75,
        metalness: 0.05,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, bodyH + 0.15, -(bodyD + roofOverhang) / 2);
    roof.castShadow = true;
    treeGroup.add(roof);

    // Chimney
    const chimneyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(bodyW / 2 - 0.8, bodyH + roofPeak * 0.55 + 0.15, -0.3);
    chimney.castShadow = true;
    treeGroup.add(chimney);

    // Chimney smoke particles (small spheres rising)
    const smokeCount = 12;
    const smokeGeo = new THREE.SphereGeometry(0.15, 5, 4);
    const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xd4d4d4,
        transparent: true,
        opacity: 0.4,
    });
    const smokeInstanced = new THREE.InstancedMesh(smokeGeo, smokeMat, smokeCount);
    const smokeMatrix = new THREE.Matrix4();
    for (let i = 0; i < smokeCount; i++) {
        const sx = chimney.position.x + prng.range(-0.15, 0.15);
        const sy = chimney.position.y + 0.9 + i * 0.35 + prng.range(-0.1, 0.1);
        const sz = chimney.position.z + prng.range(-0.15, 0.15);
        const scale = 0.6 + i * 0.12;
        smokeMatrix.makeTranslation(sx, sy, sz);
        smokeMatrix.scale(new THREE.Vector3(scale, scale, scale));
        smokeInstanced.setMatrixAt(i, smokeMatrix);
    }
    smokeInstanced.instanceMatrix.needsUpdate = true;
    treeGroup.add(smokeInstanced);

    // Door
    const doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.12);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.8 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.8 + 0.15, bodyD / 2 + 0.06);
    door.castShadow = true;
    treeGroup.add(door);

    // Door knob
    const knobGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.7 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(0.25, 0.8 + 0.15, bodyD / 2 + 0.14);
    treeGroup.add(knob);

    // Windows (two on front)
    const windowGeo = new THREE.BoxGeometry(0.7, 0.7, 0.08);
    const windowMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0xfef3c7,
        emissiveIntensity: 0.35,
    });
    for (const wx of [-1.2, 1.2]) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(wx, 2.0 + 0.15, bodyD / 2 + 0.05);
        treeGroup.add(win);

        // Window frame
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.8 });
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 0.1), frameMat);
        hBar.position.set(wx, 2.0 + 0.15, bodyD / 2 + 0.08);
        treeGroup.add(hBar);
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.1), frameMat);
        vBar.position.set(wx, 2.0 + 0.15, bodyD / 2 + 0.08);
        treeGroup.add(vBar);
    }

    // Mailbox
    const mailboxPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
    const mailboxPostMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.7 });
    const mailboxPost = new THREE.Mesh(mailboxPostGeo, mailboxPostMat);
    mailboxPost.position.set(3.0, 0.6 + 0.15, 2.0);
    treeGroup.add(mailboxPost);

    const mailboxBoxGeo = new THREE.BoxGeometry(0.5, 0.35, 0.3);
    const mailboxBoxMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const mailboxBox = new THREE.Mesh(mailboxBoxGeo, mailboxBoxMat);
    mailboxBox.position.set(3.0, 1.3 + 0.15, 2.0);
    mailboxBox.castShadow = true;
    treeGroup.add(mailboxBox);

    // Front path stones
    const pathStoneMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.85 });
    for (let i = 0; i < 5; i++) {
        const stoneGeo = new THREE.CylinderGeometry(
            prng.range(0.25, 0.38), prng.range(0.28, 0.42), 0.08, 7
        );
        const stone = new THREE.Mesh(stoneGeo, pathStoneMat);
        stone.position.set(
            prng.range(-0.3, 0.3),
            0.19,
            bodyD / 2 + 0.8 + i * 0.85
        );
        stone.rotation.y = prng.range(0, Math.PI);
        stone.receiveShadow = true;
        treeGroup.add(stone);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR DIORAMA — Blocky voxel-style character standing on QR platform
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a cute blocky avatar character on the QR platform.
 */
export function buildAvatarCenterpiece(
    treeGroup: THREE.Group,
    season: SeasonType,
    palette: FoliagePalette,
    prng: PRNG
): void {
    const skinColor = 0xf5c6a0;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75, metalness: 0.02 });

    const shirtColor = new THREE.Color(palette.primary);
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });

    const pantsColor = 0x374151;
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });

    const hairColor = 0x3f2a1a;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

    const shoeColor = 0x1f2937;
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.7 });

    const baseY = 0.15;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.55, 1.3, 0.55);
    for (const lx of [-0.35, 0.35]) {
        const leg = new THREE.Mesh(legGeo, pantsMat);
        leg.position.set(lx, baseY + 0.65, 0);
        leg.castShadow = true;
        treeGroup.add(leg);

        // Shoes
        const shoeGeo = new THREE.BoxGeometry(0.6, 0.3, 0.7);
        const shoe = new THREE.Mesh(shoeGeo, shoeMat);
        shoe.position.set(lx, baseY + 0.15, 0.06);
        shoe.castShadow = true;
        treeGroup.add(shoe);
    }

    // Body / Torso
    const torsoGeo = new THREE.BoxGeometry(1.3, 1.6, 0.8);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.set(0, baseY + 1.3 + 0.8, 0);
    torso.castShadow = true;
    treeGroup.add(torso);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.45, 1.4, 0.45);
    for (const ax of [-1.1, 1.1]) {
        const armGroup = new THREE.Group();
        armGroup.position.set(ax > 0 ? 0.88 : -0.88, baseY + 1.3 + 0.8 + 0.5, 0);

        const arm = new THREE.Mesh(armGeo, shirtMat);
        arm.position.set(0, -0.3, 0);
        arm.castShadow = true;
        armGroup.add(arm);

        // Hand
        const handGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
        const hand = new THREE.Mesh(handGeo, skinMat);
        hand.position.set(0, -1.0, 0);
        armGroup.add(hand);

        // Slight arm rotation for natural pose
        armGroup.rotation.z = ax > 0 ? -0.12 : 0.12;
        armGroup.rotation.x = prng.range(-0.08, 0.08);

        treeGroup.add(armGroup);
    }

    // Head
    const headGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, baseY + 1.3 + 1.6 + 0.58 + 0.12, 0);
    head.castShadow = true;
    treeGroup.add(head);

    // Hair (block on top)
    const hairTopGeo = new THREE.BoxGeometry(1.22, 0.35, 1.22);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, head.position.y + 0.58 + 0.15, 0);
    hairTop.castShadow = true;
    treeGroup.add(hairTop);

    // Hair sides
    const hairSideGeo = new THREE.BoxGeometry(0.15, 0.6, 1.22);
    for (const sx of [-0.68, 0.68]) {
        const hairSide = new THREE.Mesh(hairSideGeo, hairMat);
        hairSide.position.set(sx, head.position.y + 0.25, 0);
        treeGroup.add(hairSide);
    }

    // Eyes (dark cubes)
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.08);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    for (const ex of [-0.25, 0.25]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, head.position.y + 0.1, 0.58);
        treeGroup.add(eye);
    }

    // Mouth (small dark bar)
    const mouthGeo = new THREE.BoxGeometry(0.3, 0.08, 0.08);
    const mouth = new THREE.Mesh(mouthGeo, eyeMat);
    mouth.position.set(0, head.position.y - 0.2, 0.58);
    treeGroup.add(mouth);

    // Seasonal accessories
    if (season === 'winter') {
        // Scarf
        const scarfMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 });
        const scarfGeo = new THREE.BoxGeometry(1.35, 0.25, 0.9);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.set(0, baseY + 1.3 + 1.6 + 0.05, 0);
        treeGroup.add(scarf);

        // Beanie
        const beanieMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });
        const beanieGeo = new THREE.BoxGeometry(1.25, 0.5, 1.25);
        const beanie = new THREE.Mesh(beanieGeo, beanieMat);
        beanie.position.set(0, hairTop.position.y + 0.2, 0);
        beanie.castShadow = true;
        treeGroup.add(beanie);
    }

    if (season === 'spring') {
        // Flower in hand
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(1.0, baseY + 1.6, 0.3);
        treeGroup.add(stem);

        const petalMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.primary), roughness: 0.5 });
        const petalGeo = new THREE.SphereGeometry(0.2, 6, 5);
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(1.0, baseY + 2.15, 0.3);
        treeGroup.add(petal);
    }

    // Floating nameplate above head
    const plateGeo = new THREE.BoxGeometry(2.5, 0.35, 0.06);
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, head.position.y + 1.6, 0);
    treeGroup.add(plate);
}
