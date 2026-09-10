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

export interface VoxelData {
    gridSize: number;
    halfGridWorld: number; // gridSize * BLOCK / 2
    blocks: VoxelBlock[];
    grassSpots: GrassSpot[];
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
            if (isHouse && dist < houseR - 1.7) {
                groundType = VoxelBlockType.HouseFloor;
            } else if (dist < trunkR) {
                groundType = VoxelBlockType.Trunk;
            } else if (dist >= canopyOuter) {
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
                if (flower) push(col, row, 1, VoxelBlockType.FlowerAccent);
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
    } else {
        // Trunk — dark modules within the trunk radius stack to trunkLayers.
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const info = modules[row][col];
                if (!info.isDark) continue;
                const dx = col + 0.5 - c;
                const dy = row + 0.5 - c;
                if (Math.sqrt(dx * dx + dy * dy) >= trunkR) continue;
                for (let l = 1; l <= shape.trunkLayers; l++) {
                    push(col, row, l, VoxelBlockType.Trunk);
                }
            }
        }
    }

    // ─── Pass 3: canopy silhouette per preset shape ──────────────────────────
    if (!isHouse && shape.canopy !== 'none') {
        const H = shape.canopyLayers;
        const base = shape.canopy === 'cone' ? 4 : shape.canopy === 'palm' ? shape.trunkLayers : Math.round(shape.trunkLayers * 0.72);
        const sparse = shape.sparse ?? 0;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const info = modules[row][col];
                if (!info.isDark) continue;
                const dx = col + 0.5 - c;
                const dy = row + 0.5 - c;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= canopyOuter) continue;

                const t = 1 - dist / canopyOuter; // 1 center → 0 edge
                const r1 = rng();
                const r2 = rng();

                const emit = (layer: number) => {
                    if (sparse > 0 && Math.sin((col * 17.3 + row * 31.1 + layer * 73.7) % 10) < 0 && r1 < sparse) return;
                    push(col, row, layer, VoxelBlockType.Canopy);
                };

                switch (shape.canopy) {
                    case 'dome': {
                        const layersHere = Math.max(3, Math.round(H * (0.25 + 0.75 * t * t)));
                        for (let k = 0; k < layersHere; k++) emit(base + k);
                        if (r2 < 0.12) emit(base + Math.max(3, Math.round(H * (0.25 + 0.75 * t * t)))); // ragged extras
                        break;
                    }
                    case 'cone': {
                        const layersHere = Math.max(2, Math.round(H * Math.pow(1 - t, 1.15)));
                        for (let k = 0; k < layersHere; k++) emit(base + k);
                        if (t > 0.92 && r2 < 0.3) emit(base + H); // spire tip
                        break;
                    }
                    case 'cube': {
                        const layersHere = t >= 0.25 ? H : Math.max(2, Math.round(H * (t / 0.25)));
                        for (let k = 0; k < layersHere; k++) emit(base + k);
                        if (r2 < 0.1) emit(base + layersHere);
                        break;
                    }
                    case 'puff': {
                        const layersHere = Math.max(2, Math.round(H * (1 - Math.pow(t, 1.7))));
                        for (let k = 0; k < layersHere; k++) emit(base + k);
                        if (r2 < 0.16) emit(base + layersHere);
                        break;
                    }
                    case 'tiers': {
                        // Bonsai: stacked platforms shrinking upward.
                        for (let j = 0; j < 3; j++) {
                            const rj = canopyOuter * (1 - j * 0.3);
                            if (dist < rj) {
                                emit(base + j * 3);
                                emit(base + j * 3 + 1);
                            }
                        }
                        if (dist < canopyOuter * 0.12) emit(base + 9); // top cap
                        break;
                    }
                    case 'weeping': {
                        const layersHere = Math.max(3, Math.round(H * (0.25 + 0.75 * t * t)));
                        for (let k = 0; k < layersHere; k++) emit(base + k);
                        if (r2 < 0.12) emit(base + layersHere);
                        // Hanging tassels draping below the rim.
                        if (t < 0.4) {
                            const hang = 2 + Math.floor(r1 * 3);
                            for (let k = 1; k <= hang; k++) emit(base - k);
                        }
                        break;
                    }
                    case 'palm': {
                        // Plus-shaped fronds fanning from the crown.
                        if (Math.abs(dx) <= 1.2 || Math.abs(dy) <= 1.2) {
                            emit(base);
                            emit(base + 1);
                        }
                        if (dist < 2.4) {
                            emit(base + 2);
                            if (dist < 1.4 && r2 < 0.8) emit(base + 3);
                        }
                        break;
                    }
                }
            }
        }
    }

    return {
        gridSize: size,
        halfGridWorld: (size * BLOCK) / 2,
        blocks,
        grassSpots,
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
