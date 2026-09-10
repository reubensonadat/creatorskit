/**
 * Voxel QR Diorama — block generation
 * ===================================
 * Turns a QR matrix into a voxel scene using the reference demo's passes
 * (ground → trunk → canopy dome → ragged extras) and extends them with
 * per-preset canopy shapes, a cottage house centerpiece, flower accents
 * and grass-blade spots.
 *
 * QR guarantee: every module keeps exactly one ground-level block whose
 * tone matches its darkness; trunk/canopy/house only ever stack on DARK
 * modules, so the flattened scene is the scannable QR.
 */

import type { SceneType } from './tree-generator';
import { generateQRMatrix, stringToSeed } from './qr-matrix';
import {
    BLOCK,
    TRUNK_RADIUS,
    CANOPY_OUTER_RADIUS_FACTOR,
    VOXEL_SHAPES,
    VoxelBlockType,
    mulberry32,
} from './voxel-qr';

export interface VoxelBlock {
    col: number;
    row: number;
    layer: number;
    type: VoxelBlockType;
    /** 3D distance from the scene chest — drives the rebuild stagger. */
    stagger: number;
}

export interface GrassSpot {
    col: number;
    row: number;
    flower: boolean;
    blades: number;
}

/**
 * One alpha-clipped foliage plane scattered through the canopy volume.
 * Minecraft-style canopy voxel stacks are gone — the preset's growth
 * rules decide how these leaf clusters group, spread and stack, while
 * the solid ground tiles beneath keep the flattened QR scannable.
 */
export interface LeafPlane {
    /** Module-space position (col + 0.5 + jitter). */
    x: number;
    /** Module-space position (row + 0.5 + jitter). */
    z: number;
    /** Height in block units — world y = layerY * BLOCK. */
    layerY: number;
    /** Plane size in module widths (variance pre-baked). */
    size: number;
    /** Canopy tone index 0..3 (light → rich). */
    tone: number;
    /** 0..1 hash — drives the wind phase and the rebuild bloom order. */
    phase: number;
}

export interface VoxelData {
    gridSize: number;
    halfGridWorld: number; // gridSize * BLOCK / 2
    blocks: VoxelBlock[];
    grassSpots: GrassSpot[];
    leafPlanes: LeafPlane[];
    /** Topmost leaf height in block units — sizes the petal spawn volume. */
    leafTop: number;
    petalCount: number;
    maxStagger: number;
}

function smoothstep(a: number, b: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

export function generateVoxelDiorama(url: string, sceneType: SceneType): VoxelData {
    const matrix = generateQRMatrix(url);
    const size = matrix.size;
    const modules = matrix.modules;
    const shape = VOXEL_SHAPES[sceneType];
    const rng = mulberry32(stringToSeed(url + '::' + sceneType));

    const c = size / 2;
    const canopyOuter = size * (shape.canopyRadiusFactor || CANOPY_OUTER_RADIUS_FACTOR);
    const trunkR = shape.trunkRadius ?? TRUNK_RADIUS;

    const isHouse = shape.canopy === 'none';
    const houseR = Math.min(size * 0.46 * 0.8, 6.8);
    const wallH = 6;

    const blocks: VoxelBlock[] = [];
    const grassSpots: GrassSpot[] = [];
    const leafPlanes: LeafPlane[] = [];
    let leafTop = 8;
    let maxStagger = 1;

    const push = (col: number, row: number, layer: number, type: VoxelBlockType) => {
        const dx = col + 0.5 - c;
        const dy = row + 0.5 - c;
        const stagger = Math.sqrt(dx * dx + dy * dy + (layer * 0.55) * (layer * 0.55));
        if (stagger > maxStagger) maxStagger = stagger;
        blocks.push({ col, row, layer, type, stagger });
    };

    // ─── Pass 1: ground plate — one block per QR module ──────────────────────
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const info = modules[row][col];
            const dx = col + 0.5 - c;
            const dy = row + 0.5 - c;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!info.isDark) {
                push(col, row, 0, VoxelBlockType.PathLight);
                continue;
            }

            let groundType: VoxelBlockType;
            const isEdge = col <= 0 || col >= size - 1 || row <= 0 || row >= size - 1;
            const isCornerFinder =
                (col < 8 && row < 8) ||
                (col >= size - 8 && row < 8) ||
                (col < 8 && row >= size - 8);

            if (isHouse && dist < houseR - 1.7) {
                groundType = VoxelBlockType.HouseFloor;
            } else if (dist < trunkR) {
                groundType = VoxelBlockType.Trunk;
            } else if (isEdge || isCornerFinder) {
                groundType = VoxelBlockType.Grass;
            } else {
                groundType = VoxelBlockType.PetalBed;
            }
            push(col, row, 0, groundType);

            // Clean, manicured courtyard: only perimeter edge tiles & corner finders get grass tufts!
            // Interior PetalBed tiles remain clean, smooth cobblestone pavers with petal accents.
            if (groundType === VoxelBlockType.Grass) {
                const flower = isCornerFinder && rng() < 0.16;
                grassSpots.push({
                    col,
                    row,
                    flower,
                    blades: 1 + (rng() < 0.45 ? 1 : 0),
                });
            } else if (groundType === VoxelBlockType.PetalBed && rng() < 0.03) {
                // Rare tiny subtle moss sprig in the courtyard stones
                grassSpots.push({
                    col,
                    row,
                    flower: false,
                    blades: 1,
                });
            }
        }
    }

    // ─── Pass 2: Centerpiece & Foliage Cloud Generation ───────────────────────
    // The ground layer (layer 0) represents the full QR code.
    // 3D tree canopy clusters are generated as volumetric foliage planes
    // (with vertex-shader wind and 4-stop altitude lighting).
    if (!isHouse && shape.canopy !== 'none') {
        const H = shape.canopyLayers;
        const trunkH = Math.max(12, shape.trunkLayers);
        const baseLayer =
            shape.canopy === 'tiers'
                ? trunkH * 0.5
                : shape.canopy === 'weeping'
                ? trunkH * 0.78
                : shape.canopy === 'cone'
                ? trunkH * 0.35
                : trunkH * 0.65;
        const topLayer = trunkH + H * 1.15;
        leafTop = topLayer;

        const rules = shape.leaves;
        const targetClusters = Math.min(
            620,
            Math.max(380, Math.round(size * size * 0.42 * rules.density))
        );

        // Branch arm anchors radiating outwards to form natural foliage clouds
        const numBoughs = shape.canopy === 'cone' ? 8 : shape.canopy === 'tiers' ? 4 : 6;
        const boughs: Array<{ x: number; z: number; y: number; r: number }> = [];
        for (let b = 0; b < numBoughs; b++) {
            const bAngle = (b / numBoughs) * Math.PI * 2 + rng() * 0.4;
            const bDist = canopyOuter * (0.35 + rng() * 0.45);
            const bHeight = baseLayer + (rng() * 0.5 + 0.2) * H;
            boughs.push({
                x: c + Math.cos(bAngle) * bDist,
                z: c + Math.sin(bAngle) * bDist,
                y: bHeight,
                r: canopyOuter * (0.28 + rng() * 0.2),
            });
        }

        // Central crown anchor
        boughs.push({
            x: c,
            z: c,
            y: baseLayer + H * 0.62,
            r: canopyOuter * 0.44,
        });

        for (let i = 0; i < targetClusters; i++) {
            const anchor = boughs[Math.floor(rng() * boughs.length)];
            const angle = rng() * Math.PI * 2;
            const radial = Math.pow(rng(), 0.68) * anchor.r;
            let px = anchor.x + Math.cos(angle) * radial;
            let pz = anchor.z + Math.sin(angle) * radial;

            px = Math.max(1.5, Math.min(size - 2.5, px));
            pz = Math.max(1.5, Math.min(size - 2.5, pz));

            const distFromTrunk = Math.hypot(px - c, pz - c);
            const tDist = Math.min(1, distFromTrunk / canopyOuter);

            let py: number;
            if (shape.canopy === 'weeping') {
                // Cascading weeping racemes draping down from the boughs
                const boughY = anchor.y;
                const droopAmount = (rules.droop || 4.5) * Math.pow(rng(), 0.7);
                py = boughY + (rng() * 0.25 - 0.05) * H - droopAmount;
            } else if (shape.canopy === 'cone') {
                // Pagoda pine conical tiers narrowing upward
                const relH = rng();
                py = baseLayer + relH * (topLayer - baseLayer);
                const maxR = canopyOuter * (1 - relH * 0.75);
                if (distFromTrunk > maxR) {
                    px = c + (px - c) * (maxR / (distFromTrunk + 0.01));
                    pz = c + (pz - c) * (maxR / (distFromTrunk + 0.01));
                }
            } else if (shape.canopy === 'tiers') {
                // Bonsai cloud pads (Niwaki pads) at distinct steps
                const tier = Math.floor(rng() * 3);
                py = baseLayer + tier * (H * 0.4) + (rng() - 0.5) * 1.6;
            } else {
                // Dome / Puff / Cube rounded natural crown
                const domeH = Math.sqrt(Math.max(0.04, 1 - tDist * tDist));
                py = baseLayer + (rng() * 0.72 + 0.28 * domeH) * H;
            }

            // Altitude lighting ramp: bottom is deep shade, top is sunny highlight
            const altRatio = Math.max(
                0,
                Math.min(1, (py - baseLayer) / Math.max(1, topLayer - baseLayer))
            );
            let tone = 1;
            if (altRatio < 0.22) tone = 3; // underbelly deep shadow
            else if (altRatio < 0.52) tone = 2; // mid shadow
            else if (altRatio < 0.82) tone = 1; // primary body
            else tone = 0; // sunlit crown highlight

            if (rng() < 0.14) {
                tone = Math.max(0, Math.min(3, tone + (rng() < 0.5 ? -1 : 1)));
            }

            const sizeVar = (rng() - 0.5) * (rules.sizeVar ?? 0.5);
            const planeSize = Math.max(1.2, rules.size * (1 + sizeVar));

            leafPlanes.push({
                x: px,
                z: pz,
                layerY: py,
                size: planeSize,
                tone,
                phase: rng(),
            });
        }
    }

    return {
        gridSize: size,
        halfGridWorld: (size * BLOCK) / 2,
        blocks,
        grassSpots,
        leafPlanes,
        leafTop,
        petalCount: 150,
        maxStagger,
    };
}

/**
 * Tree-shadow factor for ground blocks — same shape as the reference
 * fragment shader (offset blob under the canopy).
 */
export function groundShadowFactor(
    col: number,
    row: number,
    gridSize: number,
    canopyRadius: number
): number {
    const c = gridSize * 0.5;
    const dx = col + 0.5 - (c + 1.5);
    const dy = row + 0.5 - (c + 1.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const shadowT = 1 - smoothstep(TRUNK_RADIUS, canopyRadius, dist);
    return 1 - shadowT * 0.35;
}
