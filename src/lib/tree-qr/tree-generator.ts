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
import { getPresetBuilder, PresetResult } from './presets';

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type SceneType =
    | 'sakura'
    | 'tree'
    | 'maple'
    | 'ginkgo'
    | 'magnolia'
    | 'hydrangea'
    | 'frost'
    | 'oak'
    | 'rose'
    | 'wisteria'
    | 'bonsai'
    | 'pine'
    | 'house';

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
    rose: {
        id: 'rose',
        name: 'Velvet Rose',
        primary: '#e11d48',
        secondary: '#be123c',
        highlight: '#ffe4e6',
        deepShadow: '#881337',
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
    magnolia: {
        id: 'magnolia',
        name: 'Blush Magnolia',
        primary: '#f5c2dd',
        secondary: '#e18bb4',
        highlight: '#fff5fa',
        deepShadow: '#a63d6e',
        flowerAccent: '#fce7f1',
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

export interface BlossomMorphData {
    mesh: THREE.InstancedMesh;
    pos3D: Float32Array;
    pos2D: Float32Array;
    rot3D: Float32Array;
    rot2D: Float32Array;
    scale3D: Float32Array;
    scale2D: Float32Array;
    count: number;
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
    blossomMorph?: BlossomMorphData;
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

    // Winter-white palettes (light primaries) get pale stone foundations;
    // everything else keeps the warm floating-earth soil.
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(palette.primary).getHSL(hsl);
    const isWinterStone = hsl.l > 0.72;

    // Shared tint binding the courtyard greens to the chosen world color
    const grassTint = new THREE.Color(palette.deepShadow);

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
        color: isWinterStone ? 0xc8cfd6 : 0x3d2e1e,
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
        color: isWinterStone ? 0xd5dbe2 : 0x5c4430,
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

    // Dark tiles — LUSH GREEN GARDEN TURF IN 3D, HIGH-CONTRAST IN 2D
    const darkTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 1.0, cellSize * 0.94);
    const darkTileMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.03,
    });
    const darkTilesMesh = new THREE.InstancedMesh(darkTileGeo, darkTileMat, darkTileCoords.length);

    // Dark tiles — BOTANICAL-TINTED COBBLESTONES in 3D: the active palette
    // tempers the stone so the courtyard itself takes on the chosen world
    // color (blush slate for sakura, deep wine for rose, amber, cobalt…),
    // matching the palette-driven 2D QR render underneath.
    const stoneTemper = new THREE.Color(0x8a8074);
    const darkStoneBase = new THREE.Color(palette.secondary).lerp(stoneTemper, 0.38);
    const finderStoneBase = new THREE.Color(palette.deepShadow).lerp(new THREE.Color(0x3a3f36), 0.3);
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
        let col2d: THREE.Color;
        if (coord.isFinder) {
            col3d = finderStoneBase
                .clone()
                .offsetHSL(prng.range(-0.02, 0.02), prng.range(-0.04, 0.04), prng.range(-0.03, 0.03));
            col2d = new THREE.Color(0x365314); // deep hedge green for 2D finder scanning
        } else {
            col3d = darkStoneBase
                .clone()
                .offsetHSL(prng.range(-0.02, 0.02), prng.range(-0.03, 0.03), prng.range(-0.04, 0.04));
            col2d = new THREE.Color(palette.primary); // matching blossom tone in 2D
        }
        darkTile3DColors.push(col3d);
        darkTile2DColors.push(col2d);

        darkTilesMesh.setColorAt(idx, col3d);
    });
    darkTilesMesh.instanceMatrix.needsUpdate = true;
    if (darkTilesMesh.instanceColor) darkTilesMesh.instanceColor.needsUpdate = true;
    darkTilesMesh.castShadow = true;
    darkTilesMesh.receiveShadow = true;
    groundGroup.add(darkTilesMesh);

    // ─── 3. CORNER FINDER FLOWER GARDENS (RAISED STONE BEDS, SLENDER GRASS BLADES & WILDFLOWERS) ───
    const finderGardensGroup = new THREE.Group();
    finderGardensGroup.name = 'finderGardensGroup';
    groundGroup.add(finderGardensGroup);

    const finderCenters = [
        { cx: (-size / 2 + 3.5) * cellSize, cz: (-size / 2 + 3.5) * cellSize },
        { cx: (size / 2 - 3.5) * cellSize, cz: (-size / 2 + 3.5) * cellSize },
        { cx: (-size / 2 + 3.5) * cellSize, cz: (size / 2 - 3.5) * cellSize },
    ];

    // Stone kerb border framing each 7x7 corner finder garden bed (Image 2)
    const kerbMat = new THREE.MeshStandardMaterial({
        color: 0xded8cc, // Clean Japanese garden stone edging
        roughness: 0.85,
        metalness: 0.02,
    });
    const kerbThickness = 0.22;
    const kerbHeight = 0.26;
    const bedSide = 7 * cellSize;

    finderCenters.forEach((fc) => {
        const hSegmentGeo = new THREE.BoxGeometry(bedSide, kerbHeight, kerbThickness);
        const vSegmentGeo = new THREE.BoxGeometry(kerbThickness, kerbHeight, bedSide);

        // North kerb
        const kNorth = new THREE.Mesh(hSegmentGeo, kerbMat);
        kNorth.position.set(fc.cx, kerbHeight / 2 + 0.04, fc.cz - bedSide / 2 + kerbThickness / 2);
        kNorth.castShadow = true;
        kNorth.receiveShadow = true;
        finderGardensGroup.add(kNorth);

        // South kerb
        const kSouth = new THREE.Mesh(hSegmentGeo, kerbMat);
        kSouth.position.set(fc.cx, kerbHeight / 2 + 0.04, fc.cz + bedSide / 2 - kerbThickness / 2);
        kSouth.castShadow = true;
        kSouth.receiveShadow = true;
        finderGardensGroup.add(kSouth);

        // West kerb
        const kWest = new THREE.Mesh(vSegmentGeo, kerbMat);
        kWest.position.set(fc.cx - bedSide / 2 + kerbThickness / 2, kerbHeight / 2 + 0.04, fc.cz);
        kWest.castShadow = true;
        kWest.receiveShadow = true;
        finderGardensGroup.add(kWest);

        // East kerb
        const kEast = new THREE.Mesh(vSegmentGeo, kerbMat);
        kEast.position.set(fc.cx + bedSide / 2 - kerbThickness / 2, kerbHeight / 2 + 0.04, fc.cz);
        kEast.castShadow = true;
        kEast.receiveShadow = true;
        finderGardensGroup.add(kEast);
    });

    // Slender upright grass blades with natural curvature and varied heights (Image 2)
    const grassBladeCount = 800;
    const grassGeo = new THREE.ConeGeometry(0.042, 1.45, 4);
    const grassMat = new THREE.MeshStandardMaterial({
        color: 0x5b8e18,
        roughness: 0.72,
    });
    const grassInstanced = new THREE.InstancedMesh(grassGeo, grassMat, grassBladeCount);

    // Wildflower blossom heads (delicate pink, white, cream, buttercup yellow)
    const flowerCount = 280;
    const flowerHeadGeo = new THREE.SphereGeometry(0.11, 7, 6);
    const flowerHeadMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.45,
    });
    const flowerInstanced = new THREE.InstancedMesh(flowerHeadGeo, flowerHeadMat, flowerCount);

    // Wildflower stems
    const stemGeo = new THREE.CylinderGeometry(0.016, 0.02, 1.25, 4);
    const stemMat = new THREE.MeshStandardMaterial({
        color: 0x3f6212,
        roughness: 0.8,
    });
    const stemInstanced = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);

    // Finder-corner wildflower heads follow the chosen palette
    const finderFlowerColors = [
        new THREE.Color(palette.primary),
        new THREE.Color(palette.highlight),
        new THREE.Color(palette.flowerAccent ?? palette.primary),
        new THREE.Color(0xffffff),
    ];

    let gIdx = 0;
    let fIdx = 0;

    for (const fc of finderCenters) {
        const bladesPerCorner = Math.floor(grassBladeCount / 3);
        for (let b = 0; b < bladesPerCorner; b++) {
            if (gIdx >= grassBladeCount) break;
            const gx = fc.cx + prng.range(-3.1, 3.1);
            const gz = fc.cz + prng.range(-3.1, 3.1);
            const heightScale = prng.range(0.75, 1.45);
            const gy = 0.12 + (1.45 * heightScale) / 2;

            tempPos.set(gx, gy, gz);
            tempRot.set(prng.range(-0.22, 0.22), prng.range(0, Math.PI * 2), prng.range(-0.22, 0.22));
            tempQuat.setFromEuler(tempRot);
            tempScale.set(prng.range(0.8, 1.2), heightScale, prng.range(0.8, 1.2));
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            grassInstanced.setMatrixAt(gIdx, tempMatrix);
            colorHelper
                .setHex(prng.choice([0x5b8e18, 0x70a81e, 0x82b926, 0x4d7c0f]))
                .lerp(grassTint, 0.12)
                .offsetHSL(prng.range(-0.02, 0.02), 0, prng.range(-0.03, 0.03));
            grassInstanced.setColorAt(gIdx, colorHelper);
            gIdx++;
        }

        const flowersPerCorner = Math.floor(flowerCount / 3);
        for (let f = 0; f < flowersPerCorner; f++) {
            if (fIdx >= flowerCount) break;
            const fx = fc.cx + prng.range(-3.0, 3.0);
            const fz = fc.cz + prng.range(-3.0, 3.0);
            const stemHeight = prng.range(0.9, 1.5);
            const stemBaseY = 0.12 + stemHeight / 2;

            // Stem placement
            tempPos.set(fx, stemBaseY, fz);
            tempRot.set(prng.range(-0.1, 0.1), prng.range(0, Math.PI * 2), prng.range(-0.1, 0.1));
            tempQuat.setFromEuler(tempRot);
            tempScale.set(1, stemHeight / 1.25, 1);
            tempMatrix.compose(tempPos, tempQuat, tempScale);
            stemInstanced.setMatrixAt(fIdx, tempMatrix);

            // Blossom head on top of stem
            const headY = 0.12 + stemHeight + 0.08;
            tempPos.set(fx, headY, fz);
            tempScale.set(prng.range(0.85, 1.3), prng.range(0.8, 1.1), prng.range(0.85, 1.3));
            tempMatrix.compose(tempPos, tempQuat, tempScale);
            flowerInstanced.setMatrixAt(fIdx, tempMatrix);

            colorHelper.copy(prng.choice(finderFlowerColors)).offsetHSL(0, 0, prng.range(-0.02, 0.02));
            flowerInstanced.setColorAt(fIdx, colorHelper);
            fIdx++;
        }
    }

    grassInstanced.instanceMatrix.needsUpdate = true;
    if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
    grassInstanced.castShadow = true;
    grassInstanced.receiveShadow = true;
    finderGardensGroup.add(grassInstanced);

    stemInstanced.instanceMatrix.needsUpdate = true;
    finderGardensGroup.add(stemInstanced);

    flowerInstanced.instanceMatrix.needsUpdate = true;
    if (flowerInstanced.instanceColor) flowerInstanced.instanceColor.needsUpdate = true;
    flowerInstanced.castShadow = true;
    finderGardensGroup.add(flowerInstanced);

    // ─── 3b. WIDESPREAD GARDEN GRASS & WILDFLOWERS ACROSS ALL DARK TILES ──────
    // Filter dark tiles that are NOT in finder areas and NOT in center tree area
    const gardenDarkTiles = darkTileCoords.filter(c => !c.isFinder && !c.isCenter);

    // Garden grass: 2 blades per eligible dark tile (short lawn grass)
    const gardenGrassCount = Math.min(gardenDarkTiles.length * 2, 2400);
    const gardenGrassGeo = new THREE.ConeGeometry(0.04, 0.55, 4);
    const gardenGrassMat = new THREE.MeshStandardMaterial({
        color: 0x70a81e,
        roughness: 0.75,
    });
    const gardenGrassInstanced = new THREE.InstancedMesh(gardenGrassGeo, gardenGrassMat, gardenGrassCount);
    let ggIdx = 0;

    for (const tile of gardenDarkTiles) {
        const bladesPerTile = Math.min(2, gardenGrassCount - ggIdx);
        for (let b = 0; b < bladesPerTile; b++) {
            if (ggIdx >= gardenGrassCount) break;
            const gx = tile.x + prng.range(-0.35, 0.35);
            const gz = tile.z + prng.range(-0.35, 0.35);
            const heightScale = prng.range(0.4, 0.9);
            const gy = 0.14 + (0.55 * heightScale) / 2;

            tempPos.set(gx, gy, gz);
            tempRot.set(prng.range(-0.25, 0.25), prng.range(0, Math.PI * 2), prng.range(-0.25, 0.25));
            tempQuat.setFromEuler(tempRot);
            tempScale.set(prng.range(0.7, 1.1), heightScale, prng.range(0.7, 1.1));
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            gardenGrassInstanced.setMatrixAt(ggIdx, tempMatrix);
            colorHelper
                .setHex(prng.choice([0x70a81e, 0x82b926, 0x5b8e18, 0x6b9d1c]))
                .lerp(grassTint, 0.12)
                .offsetHSL(prng.range(-0.03, 0.03), 0, prng.range(-0.04, 0.04));
            gardenGrassInstanced.setColorAt(ggIdx, colorHelper);
            ggIdx++;
        }
    }
    gardenGrassInstanced.instanceMatrix.needsUpdate = true;
    if (gardenGrassInstanced.instanceColor) gardenGrassInstanced.instanceColor.needsUpdate = true;
    gardenGrassInstanced.castShadow = true;
    gardenGrassInstanced.receiveShadow = true;
    groundGroup.add(gardenGrassInstanced);

    // Scattered wildflowers across dark tiles (~1 per 4 tiles)
    const gardenFlowerCount = Math.min(Math.floor(gardenDarkTiles.length / 4), 400);
    const gardenFlowerGeo = new THREE.SphereGeometry(0.06, 5, 4);
    const gardenFlowerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
    });
    const gardenFlowerInstanced = new THREE.InstancedMesh(gardenFlowerGeo, gardenFlowerMat, gardenFlowerCount);

    const flowerPaletteColors = palette.flowerAccent
        ? [parseInt(palette.primary.replace('#', ''), 16), parseInt(palette.flowerAccent.replace('#', ''), 16), 0xfbcfe8, 0xffffff, 0xfde047]
        : [0xf472b6, 0xfbcfe8, 0xffffff, 0xfde047];

    for (let gf = 0; gf < gardenFlowerCount; gf++) {
        const tile = prng.choice(gardenDarkTiles);
        const fx = tile.x + prng.range(-0.3, 0.3);
        const fz = tile.z + prng.range(-0.3, 0.3);
        const fy = prng.range(0.35, 0.65);

        tempPos.set(fx, fy, fz);
        tempRot.set(0, prng.range(0, Math.PI * 2), 0);
        tempQuat.setFromEuler(tempRot);
        const fScale = prng.range(0.7, 1.2);
        tempScale.set(fScale, fScale, fScale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);

        gardenFlowerInstanced.setMatrixAt(gf, tempMatrix);
        colorHelper.setHex(prng.choice(flowerPaletteColors));
        gardenFlowerInstanced.setColorAt(gf, colorHelper);
    }
    gardenFlowerInstanced.instanceMatrix.needsUpdate = true;
    if (gardenFlowerInstanced.instanceColor) gardenFlowerInstanced.instanceColor.needsUpdate = true;
    groundGroup.add(gardenFlowerInstanced);

    // ─── 3c. SMALL BUSH/SHRUB CLUSTERS ON ~18% OF NON-FINDER DARK TILES ──────
    const bushTiles = gardenDarkTiles.filter(() => prng.next() < 0.18);
    const bushCount = bushTiles.length;
    if (bushCount > 0) {
        const bushGeo = new THREE.SphereGeometry(1.0, 6, 5);
        const bushMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.78,
            metalness: 0.02,
        });
        const bushInstanced = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
        const bushGreenPalette = [0x4a8015, 0x578c1a, 0x3f7210, 0x5a9920];
        const bushTint = new THREE.Color(palette.primary);

        bushTiles.forEach((tile, bIdx) => {
            const bScale = prng.range(0.2, 0.42);
            const bScaleY = bScale * prng.range(0.7, 1.1);
            const by = 0.14 + bScaleY * 0.5;

            tempPos.set(tile.x + prng.range(-0.1, 0.1), by, tile.z + prng.range(-0.1, 0.1));
            tempRot.set(0, prng.range(0, Math.PI * 2), 0);
            tempQuat.setFromEuler(tempRot);
            tempScale.set(bScale, bScaleY, bScale);
            tempMatrix.compose(tempPos, tempQuat, tempScale);

            bushInstanced.setMatrixAt(bIdx, tempMatrix);
            colorHelper
                .setHex(prng.choice(bushGreenPalette))
                .lerp(bushTint, 0.14)
                .offsetHSL(prng.range(-0.02, 0.02), prng.range(-0.03, 0.03), prng.range(-0.04, 0.04));
            bushInstanced.setColorAt(bIdx, colorHelper);
        });
        bushInstanced.instanceMatrix.needsUpdate = true;
        if (bushInstanced.instanceColor) bushInstanced.instanceColor.needsUpdate = true;
        bushInstanced.castShadow = true;
        bushInstanced.receiveShadow = true;
        groundGroup.add(bushInstanced);
    }

    // ─── 4. MODULAR BOTANICAL CENTERPIECE PRESET ─────────────────────────────
    let trunkGroup: THREE.Group;
    let leafMeshes: THREE.InstancedMesh[] = [];
    let fallenMesh: THREE.InstancedMesh | undefined = undefined;
    let blossomMorphData: BlossomMorphData | undefined = undefined;

    if (sceneType === 'house') {
        trunkGroup = new THREE.Group();
        trunkGroup.name = 'houseCenterpiece';
        treeGroup.add(trunkGroup);
        buildHouseCenterpiece(trunkGroup, season, palette, prng);
    } else {
        const builder = getPresetBuilder(sceneType);
        const presetResult = builder({
            scene: treeGroup,
            season,
            palette,
            prng,
            worldSize,
            qrSize: size,
        });
        trunkGroup = presetResult.trunkGroup;
        leafMeshes = presetResult.leafMeshes;
    }

    // ─── 6. FALLEN PETAL SCATTER ON COURTYARD PAVERS ─────────────────────────
    const fallenCount = 450;
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
        const rad = prng.range(0.8, 9.8);
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

    // ─── 7. PALETTE-BOUND DRIFTING PETALS (shared by all scene types) ──────────
    // The breeze itself follows the chosen world color: blush flakes for
    // sakura, lavender for wisteria, golden leaves for ginkgo — and soft
    // white snow under the frost palette, with no special-case code.
    const particleCount = 150;
    const partGeo = createPetalGeometry(0.22);
    const partMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, // tinted per-instance from the palette
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
    });
    const particleColors = [
        new THREE.Color(palette.primary),
        new THREE.Color(palette.secondary),
        new THREE.Color(palette.highlight),
    ];
    if (palette.flowerAccent) particleColors.push(new THREE.Color(palette.flowerAccent));

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

        // Winter-white palettes drift gently like snow; richer tones flutter
        const fallSpeed = isWinterStone ? prng.range(0.016, 0.038) : prng.range(0.02, 0.05);
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
        colorHelper
            .copy(prng.choice(particleColors))
            .offsetHSL(prng.range(-0.012, 0.012), 0, prng.range(-0.03, 0.03));
        partMesh.setColorAt(p, colorHelper);
    }
    partMesh.instanceMatrix.needsUpdate = true;
    if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;
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
        leafMeshes,
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
 * Seamless morph between 2D scannable QR Code and living 3D Floating Diorama.
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
        diorama.finderGardensGroup.visible = p > 0.05;
    }

    // 3. Centerpiece smoothly transitions between 2D Top-Down and 3D Volumetric
    if (diorama.treeGroup) {
        const scaleY = THREE.MathUtils.lerp(0.06, 1.0, p);
        const scaleXZ = THREE.MathUtils.lerp(0.92, 1.0, p);
        diorama.treeGroup.scale.set(scaleXZ, scaleY, scaleXZ);
        diorama.treeGroup.position.y = (p - 1.0) * 0.12;
        diorama.treeGroup.rotation.y = (1.0 - p) * 0.25;
        diorama.treeGroup.visible = p > 0.05;
    }

    // 4. Fallen petals remain subtly visible as ground scatter
    if (diorama.fallenMesh) {
        diorama.fallenMesh.visible = p > 0.05;
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
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D DIGITAL BOUQUET — BLOOMING ROSE ARRANGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds an exquisite Blooming Rose Bouquet:
 * - Ribbed kraft paper conical wrap with satin belt and tied ribbon bow
 * - Emerging lower stems and serrated emerald rose leaves
 * - Layered procedural blooming roses (central queen rose and outer companion blooms)
 * - Delicate baby's breath floret sprigs
 */
export function buildRoseBouquetCenterpiece(
    bouquetGroup: THREE.Group,
    season: SeasonType,
    palette: FoliagePalette,
    prng: PRNG
): void {
    const root = new THREE.Group();
    root.name = 'roseBouquetRoot';
    bouquetGroup.add(root);

    // 1. Tapered Kraft Paper Bouquet Wrap
    const wrapMat = new THREE.MeshStandardMaterial({
        color: 0xd6c7b2, // Ribbed kraft wrapping paper
        roughness: 0.88,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });
    // Tapered cone wrap: top radius 2.4, bottom radius 0.85, height 3.8
    const wrapGeo = new THREE.CylinderGeometry(2.4, 0.85, 3.8, 24, 1, true);
    const wrapMesh = new THREE.Mesh(wrapGeo, wrapMat);
    wrapMesh.position.set(0, 2.1, 0);
    wrapMesh.castShadow = true;
    wrapMesh.receiveShadow = true;
    root.add(wrapMesh);

    // Satin Ribbon Belt & Bow Knot
    const ribbonMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.primary),
        roughness: 0.35,
        metalness: 0.25,
    });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 8, 32), ribbonMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 1.4, 0);
    belt.castShadow = true;
    root.add(belt);

    // Bow knot loops
    const loopGeo = new THREE.TorusGeometry(0.32, 0.06, 6, 16);
    const leftLoop = new THREE.Mesh(loopGeo, ribbonMat);
    leftLoop.position.set(-0.35, 1.4, 1.25);
    leftLoop.rotation.set(0.3, 0.5, 0.2);
    root.add(leftLoop);

    const rightLoop = new THREE.Mesh(loopGeo, ribbonMat);
    rightLoop.position.set(0.35, 1.4, 1.25);
    rightLoop.rotation.set(0.3, -0.5, -0.2);
    root.add(rightLoop);

    // Ribbon tails
    const tailGeo = new THREE.BoxGeometry(0.18, 0.9, 0.02);
    const leftTail = new THREE.Mesh(tailGeo, ribbonMat);
    leftTail.position.set(-0.25, 0.95, 1.28);
    leftTail.rotation.set(0.15, 0, 0.25);
    root.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, ribbonMat);
    rightTail.position.set(0.25, 0.95, 1.28);
    rightTail.rotation.set(0.15, 0, -0.25);
    root.add(rightTail);

    // 2. Stems emerging from bottom
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), stemMat);
        stem.position.set(Math.cos(angle) * 0.38, 0.45, Math.sin(angle) * 0.38);
        stem.rotation.set(Math.sin(angle) * 0.18, 0, -Math.cos(angle) * 0.18);
        root.add(stem);
    }

    // 3. Serrated Rose Leaves framing the wrap collar
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
    });
    for (let l = 0; l < 10; l++) {
        const lAngle = (l / 10) * Math.PI * 2 + prng.range(-0.1, 0.1);
        const leaf = new THREE.Mesh(createPetalGeometry(0.9), leafMat);
        leaf.position.set(Math.cos(lAngle) * 2.2, 3.8, Math.sin(lAngle) * 2.2);
        leaf.rotation.set(-0.4, lAngle, 0.5);
        leaf.castShadow = true;
        root.add(leaf);
    }

    // 4. Center Queen Rose and Satellite Roses
    const rosePetalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.deepShadow).lerp(new THREE.Color(palette.primary), 0.5),
        roughness: 0.6,
        metalness: 0.05,
        side: THREE.DoubleSide,
    });
    const rosePositions = [
        { x: 0, y: 4.8, z: 0, scale: 1.15 },
        { x: 1.1, y: 4.4, z: 0.5, scale: 0.95 },
        { x: -1.0, y: 4.3, z: 0.6, scale: 0.92 },
        { x: 0.6, y: 4.4, z: -0.9, scale: 0.95 },
        { x: -0.7, y: 4.3, z: -0.8, scale: 0.9 },
        { x: 1.2, y: 4.1, z: -0.4, scale: 0.88 },
        { x: -1.2, y: 4.1, z: 0.3, scale: 0.88 },
    ];

    rosePositions.forEach((rp) => {
        const roseGroup = new THREE.Group();
        roseGroup.position.set(rp.x, rp.y, rp.z);
        roseGroup.scale.set(rp.scale, rp.scale, rp.scale);

        // Core bud spiral
        const budCore = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.45, 8), rosePetalMat);
        budCore.position.y = 0.2;
        roseGroup.add(budCore);

        // Petal whorl layers
        for (let layer = 0; layer < 4; layer++) {
            const countInLayer = 3 + layer * 2;
            const radius = 0.3 + layer * 0.22;
            for (let p = 0; p < countInLayer; p++) {
                const theta = (p / countInLayer) * Math.PI * 2 + (layer * 0.5);
                const petal = new THREE.Mesh(createPetalGeometry(0.55 + layer * 0.18), rosePetalMat);
                petal.position.set(Math.cos(theta) * radius, 0.1 + layer * 0.08, Math.sin(theta) * radius);
                petal.rotation.set(-0.35 - layer * 0.12, -theta, 0.4);
                petal.castShadow = true;
                roseGroup.add(petal);
            }
        }
        root.add(roseGroup);
    });

    // 5. Baby's breath filler sprigs
    const babyBreathMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const bbGeo = new THREE.SphereGeometry(0.06, 5, 4);
    for (let bb = 0; bb < 45; bb++) {
        const bbx = prng.range(-1.9, 1.9);
        const bbz = prng.range(-1.9, 1.9);
        const bby = 4.2 + prng.range(-0.3, 0.8);
        const floret = new THREE.Mesh(bbGeo, babyBreathMat);
        floret.position.set(bbx, bby, bbz);
        root.add(floret);
    }
}
