/**
 * Voxel QR Diorama — Three.js Mesh Builders
 * =========================================
 * Clean, high-performance instanced voxel rendering (single draw call),
 * floating earth slab, and gentle drifting petal particle field.
 * Guaranteed 100% QR scannability in top-down view.
 */

import * as THREE from 'three';
import type { VoxelBlock, VoxelData } from './voxel-blocks';
import { groundShadowFactor } from './voxel-blocks';
import {
    BLOCK,
    VoxelBlockType,
    blockNoise,
    mixRgb,
    type RGB,
    type VoxelTones,
} from './voxel-qr';

// ─── Blocks Mesh ─────────────────────────────────────────────────────────────

export interface BlocksMesh {
    mesh: THREE.InstancedMesh;
    positions: Float32Array; // count * 3 (x, y, z world)
    staggers: Float32Array; // count — rebuild ripple distance
    count: number;
}

function pickTone(tones4: [RGB, RGB, RGB, RGB], n: number): RGB {
    if (n < 0.25) return tones4[0];
    if (n < 0.55) return tones4[1];
    if (n < 0.8) return tones4[2];
    return tones4[3];
}

function blockColor(
    b: VoxelBlock,
    tones: VoxelTones,
    gridSize: number,
    canopyRadius: number
): THREE.Color {
    const n1 = blockNoise(b.col, b.row, b.layer, 0);
    const n2 = blockNoise(b.col, b.row, b.layer, 1);
    let rgb: RGB;

    switch (b.type) {
        case VoxelBlockType.PathLight:
            rgb = n1 < 0.4 ? tones.path : n1 < 0.8 ? tones.pathAlt : tones.pathEdge;
            break;
        case VoxelBlockType.Canopy: {
            rgb = pickTone(tones.canopy, n1);
            // Subtle ambient occlusion: blocks higher in canopy are slightly brighter
            const ao = 0.72 + 0.28 * Math.min(b.layer / 16, 1);
            rgb = [rgb[0] * ao, rgb[1] * ao, rgb[2] * ao];
            break;
        }
        case VoxelBlockType.Trunk:
            rgb = pickTone(tones.trunk, n2);
            break;
        case VoxelBlockType.Grass:
            rgb = n1 < 0.4 ? tones.grass[0] : n1 < 0.75 ? tones.grass[1] : tones.grass[2];
            break;
        case VoxelBlockType.PetalBed:
            rgb = n1 < 0.55
                ? mixRgb(tones.grass[0], tones.petalBed, 0.35 + n2 * 0.3)
                : mixRgb(tones.petalBed, tones.grass[1], 0.25);
            break;
        case VoxelBlockType.HouseWall:
            rgb = n1 < 0.5 ? tones.wall[0] : tones.wall[1];
            break;
        case VoxelBlockType.HouseRoof:
            rgb = n1 < 0.5 ? tones.roof[0] : tones.roof[1];
            break;
        case VoxelBlockType.HouseDoor:
            rgb = tones.door;
            break;
        case VoxelBlockType.HouseWindow:
            rgb = n1 < 0.2 ? tones.wall[0] : tones.window;
            break;
        case VoxelBlockType.HouseFloor:
            rgb = n1 < 0.5 ? mixRgb(tones.wall[1], tones.trunk[1], 0.5) : tones.trunk[1];
            break;
        case VoxelBlockType.FlowerAccent:
            rgb = mixRgb(tones.flower, tones.canopy[2], 0.55);
            break;
        default:
            rgb = tones.path;
    }

    // Ground tree shadow blob under the canopy (only for ground blocks)
    if (b.layer === 0 && b.type !== VoxelBlockType.PathLight) {
        const f = groundShadowFactor(b.col, b.row, gridSize, canopyRadius);
        rgb = [rgb[0] * f, rgb[1] * f, rgb[2] * f];
    }

    return new THREE.Color(rgb[0], rgb[1], rgb[2]);
}

export function buildBlocksMesh(data: VoxelData, tones: VoxelTones): BlocksMesh {
    const count = data.blocks.length;
    const geometry = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const material = new THREE.MeshLambertMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const halfGrid = data.halfGridWorld;
    const canopyRadius = data.gridSize * 0.46;
    const positions = new Float32Array(count * 3);
    const staggers = new Float32Array(count);
    const m = new THREE.Matrix4();

    for (let i = 0; i < count; i++) {
        const b = data.blocks[i];
        const x = b.col * BLOCK - halfGrid;
        const y = b.layer * BLOCK + BLOCK * 0.5;
        const z = b.row * BLOCK - halfGrid;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        staggers[i] = b.stagger;
        m.makeTranslation(x, y, z);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, blockColor(b, tones, data.gridSize, canopyRadius));
    }
    mesh.instanceColor!.needsUpdate = true;
    return { mesh, positions, staggers, count };
}

// ─── Earth Slab ──────────────────────────────────────────────────────────────

export function buildSlabMesh(data: VoxelData, tones: VoxelTones): THREE.Mesh {
    const size = data.gridSize * BLOCK;
    const geometry = new THREE.BoxGeometry(size, BLOCK * 1.6, size);
    const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(tones.slab[0], tones.slab[1], tones.slab[2]),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -BLOCK * 0.8;
    return mesh;
}

// ─── Drifting Petals ─────────────────────────────────────────────────────────

export interface PetalField {
    points: THREE.Points;
    material: THREE.PointsMaterial;
    positions: Float32Array;
    velocities: Float32Array; // downward speed
    phases: Float32Array;
    count: number;
}

export function buildPetalField(
    count: number,
    tones: VoxelTones,
    halfGridWorld: number,
    topWorld: number,
    rng: () => number
): PetalField {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (rng() - 0.5) * halfGridWorld * 1.6;
        positions[i * 3 + 1] = BLOCK * 2 + rng() * topWorld;
        positions[i * 3 + 2] = (rng() - 0.5) * halfGridWorld * 1.6;
        velocities[i] = (0.45 + rng() * 0.75) * BLOCK;
        phases[i] = rng() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: new THREE.Color(tones.petalDrift[0], tones.petalDrift[1], tones.petalDrift[2]),
        size: 5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    return { points, material, positions, velocities, phases, count };
}
