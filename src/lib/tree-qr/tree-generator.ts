/**
 * 3D Tree QR Diorama — Procedural Voxel Engine & Particle Simulator
 * =================================================================
 * Generates an isometric floating island diorama with:
 * - Scannable QR-mapped stone & grass ground tiles
 * - Procedural wooden trunk & branching structure
 * - Lush instanced voxel foliage canopy with multi-tone shading
 * - Dynamic seasonal particle simulations (Sakura petals, rain, snow)
 */

import * as THREE from 'three';
import { QRMatrixResult } from './qr-matrix';

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FoliagePalette {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    highlight: string;
    leafShape?: 'cube' | 'flat';
}

export const PRESET_PALETTES: Record<string, FoliagePalette> = {
    sakura: {
        id: 'sakura',
        name: 'Sakura Pink',
        primary: '#f472b6',
        secondary: '#ec4899',
        highlight: '#fbcfe8',
    },
    lush: {
        id: 'lush',
        name: 'Summer Oak',
        primary: '#22c55e',
        secondary: '#16a34a',
        highlight: '#86efac',
    },
    autumn: {
        id: 'autumn',
        name: 'Autumn Amber',
        primary: '#f59e0b',
        secondary: '#d97706',
        highlight: '#fde68a',
    },
    ginkgo: {
        id: 'ginkgo',
        name: 'Golden Ginkgo',
        primary: '#eab308',
        secondary: '#ca8a04',
        highlight: '#fef08a',
    },
    wisteria: {
        id: 'wisteria',
        name: 'Wisteria Violet',
        primary: '#a855f7',
        secondary: '#9333ea',
        highlight: '#e9d5ff',
    },
    frost: {
        id: 'frost',
        name: 'Winter Frost',
        primary: '#e2e8f0',
        secondary: '#cbd5e1',
        highlight: '#ffffff',
    },
    maple: {
        id: 'maple',
        name: 'Crimson Maple',
        primary: '#ef4444',
        secondary: '#b91c1c',
        highlight: '#fca5a5',
    },
    cyber: {
        id: 'cyber',
        name: 'Cyber Neon',
        primary: '#06b6d4',
        secondary: '#0891b2',
        highlight: '#67e8f9',
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
    trunkMesh: THREE.InstancedMesh;
    qrSize: number;
    worldSize: number;
}

/**
 * Builds the complete 3D Diorama inside a Three.js scene
 */
export function buildDiorama(
    qrResult: QRMatrixResult,
    season: SeasonType,
    customPalette?: FoliagePalette
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
    const cellSize = 1.0; // 1 unit per QR cell
    const halfSize = (size * cellSize) / 2;
    const worldSize = size * cellSize;

    // Palette selection based on season or custom override
    let palette = customPalette;
    if (!palette) {
        if (season === 'spring') palette = PRESET_PALETTES.sakura;
        else if (season === 'summer') palette = PRESET_PALETTES.lush;
        else if (season === 'autumn') palette = PRESET_PALETTES.autumn;
        else palette = PRESET_PALETTES.frost;
    }

    // ─── 1. FLOATING DIORAMA BASE SLAB ────────────────────────────────────
    const baseMargin = 1.8;
    const totalPlatformWidth = worldSize + baseMargin * 2;
    const slabDepth = 2.4;

    // Soil & Grass Platform
    const baseGeo = new THREE.BoxGeometry(totalPlatformWidth, slabDepth, totalPlatformWidth);
    const baseMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xd0d7de : 0x5a4131,
        roughness: 0.88,
        metalness: 0.05,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -slabDepth / 2;
    baseMesh.receiveShadow = true;
    groundGroup.add(baseMesh);

    // Platform Top Grass / Sand Bevel Rim
    const rimMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xe2e8f0 : season === 'autumn' ? 0xd4a373 : 0x86efac,
        roughness: 0.9,
    });
    const rimGeo = new THREE.BoxGeometry(totalPlatformWidth + 0.3, 0.4, totalPlatformWidth + 0.3);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = -0.2;
    groundGroup.add(rimMesh);

    // Decorative perimeter curb / stone fence
    const curbGeo = new THREE.BoxGeometry(cellSize * 0.85, 0.25, cellSize * 0.85);
    const curbMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xf8fafc : 0xd1d5db,
        roughness: 0.7,
    });
    const curbInstanced = new THREE.InstancedMesh(curbGeo, curbMat, (size + 2) * 4);
    let curbIdx = 0;
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();

    for (let i = -1; i <= size; i++) {
        const coords = [
            { x: i, y: -1 },
            { x: i, y: size },
            { x: -1, y: i },
            { x: size, y: i },
        ];
        for (const coord of coords) {
            const posX = (coord.x - size / 2 + 0.5) * cellSize;
            const posZ = (coord.y - size / 2 + 0.5) * cellSize;
            tempPos.set(posX, 0.12, posZ);
            tempMatrix.makeTranslation(tempPos.x, tempPos.y, tempPos.z);
            curbInstanced.setMatrixAt(curbIdx++, tempMatrix);
        }
    }
    curbInstanced.instanceMatrix.needsUpdate = true;
    groundGroup.add(curbInstanced);

    // ─── 2. GROUND TILES (MAPPED TO QR CODE CELLS) ────────────────────────
    // We collect coordinates for dark tiles, light tiles, and finder patterns
    const darkTileCoords: Array<{ x: number; z: number; isFinder: boolean; isCenter: boolean }> = [];
    const lightTileCoords: Array<{ x: number; z: number; isFinder: boolean }> = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const mod = qrResult.modules[y][x];
            const worldX = (x - size / 2 + 0.5) * cellSize;
            const worldZ = (y - size / 2 + 0.5) * cellSize;

            if (mod.isDark) {
                darkTileCoords.push({
                    x: worldX,
                    z: worldZ,
                    isFinder: mod.isFinder,
                    isCenter: mod.isCenterTreeArea,
                });
            } else {
                lightTileCoords.push({
                    x: worldX,
                    z: worldZ,
                    isFinder: mod.isFinder,
                });
            }
        }
    }

    // Light tiles (Pathways / Cream paving / Sand)
    const lightTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 0.1, cellSize * 0.94);
    const lightTileMat = new THREE.MeshStandardMaterial({
        color: season === 'winter' ? 0xffffff : 0xf9f7f1,
        roughness: 0.95,
        metalness: 0.0,
    });
    const lightTilesMesh = new THREE.InstancedMesh(lightTileGeo, lightTileMat, lightTileCoords.length);
    lightTileCoords.forEach((coord, idx) => {
        tempMatrix.makeTranslation(coord.x, 0.05, coord.z);
        lightTilesMesh.setMatrixAt(idx, tempMatrix);
    });
    lightTilesMesh.instanceMatrix.needsUpdate = true;
    lightTilesMesh.receiveShadow = true;
    groundGroup.add(lightTilesMesh);

    // Dark tiles (Stone slabs, Cobblestone, Grassy shrubs, Shrines)
    const darkTileGeo = new THREE.BoxGeometry(cellSize * 0.94, 0.22, cellSize * 0.94);
    // Dark color depends on season: Spring/Summer gets lush dark forest green, Autumn gets deep umber/moss, Winter gets slate stone
    const darkTileColor =
        season === 'spring' ? 0x2e7d32 : season === 'summer' ? 0x1b5e20 : season === 'autumn' ? 0x78350f : 0x334155;

    const darkTileMat = new THREE.MeshStandardMaterial({
        color: darkTileColor,
        roughness: 0.85,
        metalness: 0.05,
    });
    const darkTilesMesh = new THREE.InstancedMesh(darkTileGeo, darkTileMat, darkTileCoords.length);
    const tileColorObj = new THREE.Color();

    darkTileCoords.forEach((coord, idx) => {
        const height = coord.isFinder ? 0.35 : prng.range(0.18, 0.28);
        tempMatrix.makeTranslation(coord.x, height / 2, coord.z);
        darkTilesMesh.setMatrixAt(idx, tempMatrix);

        // Subtle shade variation for authentic organic stone/hedge look
        if (coord.isFinder) {
            tileColorObj.setHex(0x111827); // Dark crisp shrine stone for eyes
        } else {
            tileColorObj.setHex(darkTileColor);
            tileColorObj.offsetHSL(0, 0, prng.range(-0.06, 0.06));
        }
        darkTilesMesh.setColorAt(idx, tileColorObj);
    });
    darkTilesMesh.instanceMatrix.needsUpdate = true;
    if (darkTilesMesh.instanceColor) darkTilesMesh.instanceColor.needsUpdate = true;
    darkTilesMesh.castShadow = true;
    darkTilesMesh.receiveShadow = true;
    groundGroup.add(darkTilesMesh);

    // ─── 3. PROCEDURAL TREE TRUNK & BRANCHES ─────────────────────────────
    // The central trunk stands at (0, 0) and climbs 5-8 units, splitting into 4-5 organic branches
    const trunkVoxelSize = 0.55;
    const trunkGeo = new THREE.BoxGeometry(trunkVoxelSize, trunkVoxelSize, trunkVoxelSize);
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.9,
    });

    const trunkVoxels: Array<{ pos: THREE.Vector3; color: THREE.Color }> = [];
    const trunkHeight = prng.range(5.5, 7.5);
    const branchTips: Array<{ pos: THREE.Vector3; dir: THREE.Vector3 }> = [];

    // Main central column with slight organic natural wobble
    let currentPos = new THREE.Vector3(0, 0.2, 0);
    const numLayers = Math.floor(trunkHeight / trunkVoxelSize);

    for (let i = 0; i < numLayers; i++) {
        const y = i * trunkVoxelSize + 0.3;
        const wobbleX = Math.sin(i * 0.6 + qrResult.seed) * 0.25;
        const wobbleZ = Math.cos(i * 0.7 + qrResult.seed) * 0.25;
        const p = new THREE.Vector3(wobbleX, y, wobbleZ);

        // Core trunk
        const woodColor = new THREE.Color(0x4a3728).offsetHSL(0, 0, (i / numLayers) * 0.1);
        trunkVoxels.push({ pos: p.clone(), color: woodColor });

        // Base root flares at the bottom (i < 3)
        if (i <= 2) {
            const rootOffsets = [
                new THREE.Vector3(trunkVoxelSize, -i * 0.1, 0),
                new THREE.Vector3(-trunkVoxelSize, -i * 0.1, 0),
                new THREE.Vector3(0, -i * 0.1, trunkVoxelSize),
                new THREE.Vector3(0, -i * 0.1, -trunkVoxelSize),
            ];
            for (const ro of rootOffsets) {
                trunkVoxels.push({ pos: p.clone().add(ro), color: woodColor });
            }
        }
    }

    // Organic Branches: 4 to 6 main limb branches
    const numBranches = prng.int(4, 6);
    const baseBranchAngle = (Math.PI * 2) / numBranches;

    for (let b = 0; b < numBranches; b++) {
        const angle = b * baseBranchAngle + prng.range(-0.35, 0.35);
        const branchStartLayer = prng.int(Math.floor(numLayers * 0.5), Math.floor(numLayers * 0.85));
        const branchStartY = branchStartLayer * trunkVoxelSize;

        let bPos = new THREE.Vector3(
            Math.sin(branchStartLayer * 0.6 + qrResult.seed) * 0.25,
            branchStartY,
            Math.cos(branchStartLayer * 0.7 + qrResult.seed) * 0.25
        );

        const branchLength = prng.range(2.8, 4.4);
        const steps = Math.floor(branchLength / trunkVoxelSize);
        const dir = new THREE.Vector3(
            Math.cos(angle) * prng.range(0.65, 0.9),
            prng.range(0.4, 0.75),
            Math.sin(angle) * prng.range(0.65, 0.9)
        ).normalize();

        for (let s = 1; s <= steps; s++) {
            bPos = bPos.clone().addScaledVector(dir, trunkVoxelSize * 0.85);
            trunkVoxels.push({
                pos: bPos.clone(),
                color: new THREE.Color(0x5c4033).offsetHSL(0, 0, prng.range(-0.05, 0.05)),
            });
        }
        branchTips.push({ pos: bPos.clone(), dir: dir.clone() });
    }

    // Build instanced trunk mesh
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkVoxels.length);
    trunkVoxels.forEach((v, idx) => {
        tempMatrix.makeTranslation(v.pos.x, v.pos.y, v.pos.z);
        trunkMesh.setMatrixAt(idx, tempMatrix);
        trunkMesh.setColorAt(idx, v.color);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    if (trunkMesh.instanceColor) trunkMesh.instanceColor.needsUpdate = true;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // ─── 4. LUSH INSTANCED VOXEL FOLIAGE CANOPY ──────────────────────────
    // Leaves form dense volumetric cloud clumps centered on the branch tips
    // and crown.
    const leafVoxelSize = 0.44;
    const leafGeo = new THREE.BoxGeometry(leafVoxelSize, leafVoxelSize, leafVoxelSize);
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // colored via instanceColor
        roughness: 0.65,
        metalness: 0.05,
    });

    const leafPositions: Array<{ pos: THREE.Vector3; colorHex: string; isTop: boolean }> = [];
    const primaryCol = new THREE.Color(palette.primary);
    const secondaryCol = new THREE.Color(palette.secondary);
    const highlightCol = new THREE.Color(palette.highlight);

    // Clumps at each branch tip plus 2 central apex clumps
    const clumpCenters: Array<{ pos: THREE.Vector3; radius: number }> = [
        {
            pos: new THREE.Vector3(0, trunkHeight + 0.8, 0),
            radius: prng.range(2.6, 3.4),
        },
        {
            pos: new THREE.Vector3(0, trunkHeight - 0.4, 0),
            radius: prng.range(2.8, 3.6),
        },
        ...branchTips.map((tip) => ({
            pos: tip.pos.clone().addScaledVector(tip.dir, 0.5),
            radius: prng.range(2.0, 2.8),
        })),
    ];

    // Generate leaf voxels on a 3D grid around each clump center
    const occupiedKeys = new Set<string>();

    for (const clump of clumpCenters) {
        const radius = clump.radius;
        const gridRadius = Math.ceil(radius / leafVoxelSize);

        for (let gx = -gridRadius; gx <= gridRadius; gx++) {
            for (let gy = -gridRadius; gy <= gridRadius; gy++) {
                for (let gz = -gridRadius; gz <= gridRadius; gz++) {
                    const localX = gx * leafVoxelSize;
                    const localY = gy * leafVoxelSize * 0.85; // slightly flattened dome
                    const localZ = gz * leafVoxelSize;

                    const d = Math.sqrt(
                        (localX / radius) ** 2 + (localY / (radius * 0.85)) ** 2 + (localZ / radius) ** 2
                    );

                    // Organic fuzzy noise edge
                    const noise = prng.range(-0.15, 0.15);
                    if (d + noise <= 1.0) {
                        const worldX = clump.pos.x + localX;
                        const worldY = clump.pos.y + localY;
                        const worldZ = clump.pos.z + localZ;

                        // Grid snap key to prevent overlapping duplicate voxels
                        const key = `${Math.round(worldX / leafVoxelSize)},${Math.round(worldY / leafVoxelSize)},${Math.round(worldZ / leafVoxelSize)}`;
                        if (!occupiedKeys.has(key)) {
                            occupiedKeys.add(key);

                            // Determine shading: higher voxels get highlight color, lower/inner get secondary/primary
                            const isTop = gy >= gridRadius * 0.5;
                            const isBottom = gy <= -gridRadius * 0.4;
                            let chosenCol = primaryCol;
                            if (isTop) chosenCol = highlightCol;
                            else if (isBottom) chosenCol = secondaryCol;

                            // Slight random hue offset for natural foliage depth
                            const varied = chosenCol.clone().offsetHSL(
                                prng.range(-0.02, 0.02),
                                prng.range(-0.04, 0.04),
                                prng.range(-0.06, 0.06)
                            );

                            leafPositions.push({
                                pos: new THREE.Vector3(worldX, worldY, worldZ),
                                colorHex: `#${varied.getHexString()}`,
                                isTop,
                            });
                        }
                    }
                }
            }
        }
    }

    const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafPositions.length);
    const leafColorObj = new THREE.Color();

    leafPositions.forEach((l, idx) => {
        tempMatrix.makeTranslation(l.pos.x, l.pos.y, l.pos.z);
        leafMesh.setMatrixAt(idx, tempMatrix);
        leafColorObj.set(l.colorHex);
        leafMesh.setColorAt(idx, leafColorObj);
    });
    leafMesh.instanceMatrix.needsUpdate = true;
    if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    treeGroup.add(leafMesh);

    // Fallen leaves scattered under the tree canopy
    const fallenCount = prng.int(45, 80);
    const fallenGeo = new THREE.BoxGeometry(0.32, 0.04, 0.32);
    const fallenMat = new THREE.MeshStandardMaterial({
        color: primaryCol.clone().offsetHSL(0, -0.1, -0.05),
        roughness: 0.9,
    });
    const fallenMesh = new THREE.InstancedMesh(fallenGeo, fallenMat, fallenCount);

    for (let f = 0; f < fallenCount; f++) {
        const rad = prng.range(0.8, 3.8);
        const theta = prng.range(0, Math.PI * 2);
        const fx = Math.cos(theta) * rad;
        const fz = Math.sin(theta) * rad;
        const fy = 0.23;

        tempMatrix.makeTranslation(fx, fy, fz);
        tempMatrix.multiply(new THREE.Matrix4().makeRotationY(prng.range(0, Math.PI)));
        fallenMesh.setMatrixAt(f, tempMatrix);
    }
    fallenMesh.instanceMatrix.needsUpdate = true;
    fallenMesh.receiveShadow = true;
    groundGroup.add(fallenMesh);

    // ─── 5. DYNAMIC SEASONAL PARTICLE SIMULATION ─────────────────────────
    let particlesState: ParticleState | null = null;
    const particleCount = season === 'autumn' ? 140 : season === 'winter' ? 160 : season === 'spring' ? 120 : 60;

    let partGeo: THREE.BufferGeometry;
    let partMat: THREE.Material;

    if (season === 'spring') {
        // Cherry blossom sakura petals (delicate curved flat wafer)
        partGeo = new THREE.PlaneGeometry(0.24, 0.2);
        partMat = new THREE.MeshBasicMaterial({
            color: 0xffb7c5,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
        });
    } else if (season === 'autumn') {
        // Autumn golden leaves + rain streaks
        partGeo = new THREE.PlaneGeometry(0.26, 0.18);
        partMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        });
    } else if (season === 'winter') {
        // Snowflakes (small white quad voxels)
        partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        partMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });
    } else {
        // Summer warm sun motes
        partGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
        partMat = new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.75,
        });
    }

    const partMesh = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const rotations = new Float32Array(particleCount * 3);
    const rotVelocities = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
        const px = prng.range(-worldSize * 0.7, worldSize * 0.7);
        const py = prng.range(1.0, trunkHeight + 5.0);
        const pz = prng.range(-worldSize * 0.7, worldSize * 0.7);

        positions[p * 3] = px;
        positions[p * 3 + 1] = py;
        positions[p * 3 + 2] = pz;

        // Fall speeds
        const fallSpeed = season === 'autumn' ? prng.range(0.04, 0.09) : season === 'winter' ? prng.range(0.02, 0.06) : prng.range(0.015, 0.045);
        const driftX = prng.range(-0.015, 0.015);
        const driftZ = prng.range(-0.015, 0.015);

        velocities[p * 3] = driftX;
        velocities[p * 3 + 1] = -fallSpeed;
        velocities[p * 3 + 2] = driftZ;

        rotations[p * 3] = prng.range(0, Math.PI * 2);
        rotations[p * 3 + 1] = prng.range(0, Math.PI * 2);
        rotations[p * 3 + 2] = prng.range(0, Math.PI * 2);

        rotVelocities[p * 3] = prng.range(-0.04, 0.04);
        rotVelocities[p * 3 + 1] = prng.range(-0.05, 0.05);
        rotVelocities[p * 3 + 2] = prng.range(-0.04, 0.04);

        tempMatrix.makeTranslation(px, py, pz);
        partMesh.setMatrixAt(p, tempMatrix);
    }
    partMesh.instanceMatrix.needsUpdate = true;
    rootGroup.add(partMesh);

    particlesState = {
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
        leafMeshes: [leafMesh],
        trunkMesh,
        qrSize: size,
        worldSize,
    };
}

/**
 * Updates particle physics and wind displacement on every animation frame
 */
export function updateDioramaSimulation(
    diorama: DioramaSceneObjects,
    time: number,
    delta: number
): void {
    // 1. Gentle organic canopy sway (breathing tree)
    if (diorama.treeGroup) {
        const swayAngleX = Math.sin(time * 1.4) * 0.018;
        const swayAngleZ = Math.cos(time * 1.1) * 0.014;
        diorama.treeGroup.rotation.x = swayAngleX;
        diorama.treeGroup.rotation.z = swayAngleZ;
    }

    // 2. Seasonal Particle fall & loop
    const particles = diorama.particles;
    if (!particles) return;

    const count = particles.count;
    const pos = particles.positions;
    const vel = particles.velocities;
    const rot = particles.rotations;
    const rotVel = particles.rotVelocities;
    const mesh = particles.mesh;

    const spawnCeiling = 12.0;
    const floorBound = 0.2;
    const boundsRadius = diorama.worldSize * 0.8;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const idx = i * 3;

        // Wind drift oscillation
        const windX = Math.sin(time * 2.0 + i) * 0.012;
        const windZ = Math.cos(time * 1.8 + i) * 0.012;

        pos[idx] += vel[idx] + windX;
        pos[idx + 1] += vel[idx + 1];
        pos[idx + 2] += vel[idx + 2] + windZ;

        rot[idx] += rotVel[idx];
        rot[idx + 1] += rotVel[idx + 1];
        rot[idx + 2] += rotVel[idx + 2];

        // Respawn particle at top when it hits the floor or drifts out of bounds
        if (pos[idx + 1] <= floorBound || Math.abs(pos[idx]) > boundsRadius || Math.abs(pos[idx + 2]) > boundsRadius) {
            pos[idx + 1] = spawnCeiling + (Math.random() * 2.0);
            pos[idx] = (Math.random() - 0.5) * diorama.worldSize * 1.3;
            pos[idx + 2] = (Math.random() - 0.5) * diorama.worldSize * 1.3;
        }

        dummy.position.set(pos[idx], pos[idx + 1], pos[idx + 2]);
        dummy.rotation.set(rot[idx], rot[idx + 1], rot[idx + 2]);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
}
