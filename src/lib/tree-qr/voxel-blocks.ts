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

            if (isHouse && dist < houseR - 1.7) {
                groundType = VoxelBlockType.HouseFloor;
            } else if (dist < trunkR) {
                groundType = VoxelBlockType.Trunk;
            } else if (isEdge) {
                groundType = VoxelBlockType.Grass;
            } else {
                groundType = VoxelBlockType.PetalBed;
            }
            push(col, row, 0, groundType);

            if (groundType === VoxelBlockType.Grass || groundType === VoxelBlockType.PetalBed) {
                const flower = groundType === VoxelBlockType.Grass && rng() < 0.07;
                const r = rng();
                grassSpots.push({
                    col,
                    row,
                    flower,
                    blades: 1 + (r < 0.55 ? 1 : 0) + (r < 0.22 ? 1 : 0),
                });
                // Blossoms are now textured planes (foliage-meshes), not blocks.
            }
        }
    }

    // ─── Pass 2: centerpiece — trunk stack or cottage house ──────────────────
    if (isHouse) {
        // Pass A — collect the wall ring and pick the door column whose
        // angle faces the iso camera (≈ π/4).
        let doorCol = Math.floor(c + houseR - 1);
        let doorRow = Math.floor(c);
        let bestAngle = Infinity;
        const ring: Array<{ col: number; row: number; angle: number }> = [];

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const info = modules[row][col];
                if (!info.isDark) continue;
                const dx = col + 0.5 - c;
                const dy = row + 0.5 - c;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < houseR - 1.7 || dist >= houseR) continue;

                const angle = Math.abs(Math.atan2(dy, dx) - Math.PI / 4);
                ring.push({ col, row, angle });
                if (angle < bestAngle) {
                    bestAngle = angle;
                    doorCol = col;
                    doorRow = row;
                }
            }
        }

        // Pass B — walls, alternating windows, and the door column.
        ring.forEach((m, idx) => {
            const isWindow = idx % 2 === 1 && m.angle > 0.5;
            for (let l = 1; l <= wallH; l++) {
                if (m.col === doorCol && m.row === doorRow && l <= 2) {
                    push(m.col, m.row, l, VoxelBlockType.HouseDoor);
                } else if (isWindow && (l === 3 || l === 4)) {
                    push(m.col, m.row, l, VoxelBlockType.HouseWindow);
                } else {
                    push(m.col, m.row, l, VoxelBlockType.HouseWall);
                }
            }
        });

        // Roof — stepped pyramid bands, only on dark modules.
        const nLevels = Math.max(2, Math.ceil((houseR - 0.5) / 1.4));
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const info = modules[row][col];
                if (!info.isDark) continue;
                const dx = col + 0.5 - c;
                const dy = row + 0.5 - c;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= houseR) continue;

                const j = Math.floor((houseR - dist) / 1.4);
                if (j >= 0 && j < nLevels) {
                    push(col, row, wallH + 1 + j, VoxelBlockType.HouseRoof);
                } else if (j >= nLevels) {
                    push(col, row, wallH + 1 + nLevels, VoxelBlockType.HouseRoof); // apex cap
                }
            }
        }

        // Chimney — a warm little smoke-stack on the far corner.
        const chimCol = Math.floor(c - houseR * 0.45);
        const chimRow = Math.floor(c - houseR * 0.45);
        if (modules[chimRow]?.[chimCol]?.isDark) {
            for (let l = wallH + 2; l <= wallH + 4; l++) {
                push(chimCol, chimRow, l, VoxelBlockType.Trunk);
            }
        }
    }

    // ─── Pass 2: trunk + house structures ────────────────────────────────────────
    if (!isHouse) {
        // Pixel-perfect voxel trunk instead of the smooth cylinder!
        for (let l = 1; l <= shape.trunkLayers; l++) {
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    const info = modules[row][col];
                    if (!info.isDark) continue;
                    const dx = col + 0.5 - c;
                    const dy = row + 0.5 - c;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < trunkR) {
                        push(col, row, l, VoxelBlockType.Trunk);
                    }
                }
            }
        }
    }

    // ─── Pass 3: canopy foliage — pure voxel block stacks ────────
    // Reverting to the beautiful clean pure voxel look from ICQR
    if (!isHouse && shape.canopy !== 'none') {
        const H = shape.canopyLayers;
        const base = shape.canopy === 'cone' ? 4 : shape.canopy === 'palm' ? shape.trunkLayers : Math.round(shape.trunkLayers * 0.72);
        const sparse = shape.sparse ?? 0;

        // Vertical silhouette profile — how many layers of foliage sit over a
        // module at radial position t (1 center → 0 edge), per canopy kind.
        const profileLayers = (t: number): number => {
            switch (shape.canopy) {
                case 'cone':
                    return Math.max(2, Math.round(H * Math.pow(1 - t, 1.15)));
                case 'cube':
                    return t >= 0.25 ? H : Math.max(2, Math.round(H * (t / 0.25)));
                case 'puff':
                    return Math.max(2, Math.round(H * (1 - Math.pow(t, 1.7))));
                default:
                    // dome / weeping — round bell curve
                    return Math.max(3, Math.round(H * (0.25 + 0.75 * t * t)));
            }
        };

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const info = modules[row][col];
                if (!info.isDark) continue;
                const dx = col + 0.5 - c;
                const dy = row + 0.5 - c;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= canopyOuter) continue;

                const t = 1 - dist / canopyOuter; // 1 center → 0 edge
                if (sparse > 0 && rng() < sparse * 0.85) continue; // frost gaps

                const layersHere = profileLayers(t);

                // Push actual canopy blocks for that pixel-perfect voxel look
                for (let l = 1; l <= layersHere; l++) {
                    const layerY = base + l;
                    push(col, row, layerY, VoxelBlockType.Canopy);
                    if (layerY > leafTop) leafTop = layerY;
                }
            }
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
