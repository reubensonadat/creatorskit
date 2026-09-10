/**
 * Voxel QR Diorama — shared vocabulary
 * ====================================
 * Ported from the open-source cherry-blossom-qrcode demo
 * (github.com/enzomanuelmangano/demos) and extended for CreatorKit:
 * botanical palettes, per-preset canopy shapes, a cottage house
 * centerpiece, wind-swept grass blades and drifting petals.
 *
 * The seamlessness trick is preserved exactly: there is ONE voxel scene
 * and only the camera moves — an isometric orbit morphing into a strict
 * top-down view whose flattened ground plane IS the scannable QR.
 */

import type { FoliagePalette, SceneType } from './tree-generator';

// ─── World scale (matches the reference demo) ────────────────────────────────

export const BLOCK = 0.0245;
export const TRUNK_RADIUS = 2.5;
export const CANOPY_OUTER_RADIUS_FACTOR = 0.46;

// ─── Camera rig ──────────────────────────────────────────────────────────────

export const ISO_ANGLE_Y = 0.78;
export const ISO_ANGLE_X = 0.55;
export const FLAT_ANGLE_Y = 0.0;
export const FLAT_ANGLE_X = Math.PI / 2;
export const LERP_SPEED = 4.0;

// Framing: orthographic half-height = halfGridWorld * fitFactor(progress)
export const FIT_3D = 1.65;
export const FIT_2D = 1.38;
export const Y_OFFSET_2D_FACTOR = 0.0;
export const X_OFFSET_2D_FACTOR = 0.0;

// ─── Rebuild choreography ────────────────────────────────────────────────────

export const REBUILD_DURATION_URL = 1.2;
export const REBUILD_DURATION_PRESET = 1.0;
export const REBUILD_DURATION_RECOLOR = 0.55;

// ─── Easing (reference math) ─────────────────────────────────────────────────

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

// ─── Block taxonomy ──────────────────────────────────────────────────────────

export enum VoxelBlockType {
    PathLight = 0, // QR light modules — pale sand path
    Canopy = 1, // canopy foliage (QR dark)
    Trunk = 2, // trunk wood + earthen center (QR dark)
    Grass = 3, // lawn (QR dark)
    PetalBed = 4, // mottled fallen-petal lawn (QR dark)
    HouseWall = 5,
    HouseRoof = 6,
    HouseDoor = 7,
    HouseWindow = 8,
    FlowerAccent = 9, // tiny bloom topping a grass block
    HouseFloor = 10, // interior plank floor (QR dark)
}

// ─── Color helpers ───────────────────────────────────────────────────────────

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    const n = parseInt(
        h.length === 3
            ? h
                .split('')
                .map((c) => c + c)
                .join('')
            : h,
        16
    );
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function shade(c: RGB, f: number): RGB {
    return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
}

// ─── Voxel tones derived from a botanical palette ─────────────────────────────

export interface VoxelTones {
    path: RGB; // light modules — near-white warm parchment
    pathAlt: RGB;
    pathEdge: RGB;
    canopy: [RGB, RGB, RGB, RGB]; // light → rich, kept mid-dark for QR contrast
    trunk: [RGB, RGB, RGB, RGB];
    grass: [RGB, RGB, RGB]; // dark, mid, bright
    petalBed: RGB;
    wall: [RGB, RGB];
    roof: [RGB, RGB];
    door: RGB;
    window: RGB;
    flower: RGB;
    petalDrift: RGB;
    slab: RGB; // earth slab under the plate (3D only)
    paper: string; // renderer clear color behind everything
}

const TRUNK_TONES: [RGB, RGB, RGB, RGB] = [
    hexToRgb('#57301a'),
    hexToRgb('#432712'),
    hexToRgb('#331d0d'),
    hexToRgb('#241408'),
];

const GRASS_CLASSIC: [RGB, RGB, RGB] = [
    hexToRgb('#0f3d11'),
    hexToRgb('#124a13'),
    hexToRgb('#1a6118'),
];

const GRASS_FROST: [RGB, RGB, RGB] = [
    hexToRgb('#3d5566'),
    hexToRgb('#4a6878'),
    hexToRgb('#5d7f8f'),
];

const PAPER = '#f6f2e8';

export function deriveVoxelTones(palette: FoliagePalette): VoxelTones {
    const primary = hexToRgb(palette.primary);
    const secondary = hexToRgb(palette.secondary);
    const deep = hexToRgb(palette.deepShadow);
    const highlight = hexToRgb(palette.highlight);
    const accent = palette.flowerAccent ? hexToRgb(palette.flowerAccent) : highlight;

    // Canopy stays in the mid-dark band so dark QR modules read as dark.
    const canopy: [RGB, RGB, RGB, RGB] = [
        mixRgb(secondary, deep, 0.28),
        mixRgb(secondary, deep, 0.52),
        deep,
        shade(deep, 0.78),
    ];

    const grass = palette.id === 'frost' ? GRASS_FROST : GRASS_CLASSIC;

    const pathBase: RGB = [1.0, 0.985, 0.945];
    const path = mixRgb(pathBase, highlight, 0.06);

    return {
        path,
        pathAlt: shade(path, 0.955),
        pathEdge: shade(path, 0.9),
        canopy,
        trunk: TRUNK_TONES,
        grass,
        petalBed: mixRgb(deep, accent, 0.42),
        wall: [hexToRgb('#e9d9b6'), hexToRgb('#b99a6b')],
        roof: [mixRgb(deep, secondary, 0.3), shade(deep, 0.85)],
        door: hexToRgb('#5a3619'),
        window: hexToRgb('#8fd0f5'),
        flower: accent,
        petalDrift: mixRgb(accent, highlight, 0.35),
        slab: shade(mixRgb(deep, hexToRgb('#6b4a2f'), 0.5), 0.7),
        paper: PAPER,
    };
}

// ─── Per-preset canopy shapes ────────────────────────────────────────────────

export type CanopyKind = 'dome' | 'cone' | 'cube' | 'tiers' | 'weeping' | 'palm' | 'puff' | 'none';

export interface VoxelPresetShape {
    canopy: CanopyKind;
    trunkLayers: number;
    canopyLayers: number;
    canopyRadiusFactor: number; // × gridSize → outer radius in blocks
    trunkRadius?: number;
    sparse?: number; // probability a canopy block is skipped (frost gaps)
    sway: number; // idle 3D orbit sway amplitude (radians)
}

export const VOXEL_SHAPES: Record<SceneType, VoxelPresetShape> = {
    sakura: { canopy: 'dome', trunkLayers: 12, canopyLayers: 12, canopyRadiusFactor: 0.46, sway: 0.045 },
    tree: { canopy: 'dome', trunkLayers: 12, canopyLayers: 10, canopyRadiusFactor: 0.44, sway: 0.045 },
    maple: { canopy: 'dome', trunkLayers: 10, canopyLayers: 10, canopyRadiusFactor: 0.47, sway: 0.05 },
    ginkgo: { canopy: 'cube', trunkLayers: 9, canopyLayers: 8, canopyRadiusFactor: 0.42, sway: 0.04 },
    magnolia: { canopy: 'puff', trunkLayers: 7, canopyLayers: 9, canopyRadiusFactor: 0.4, sway: 0.04 },
    hydrangea: { canopy: 'puff', trunkLayers: 8, canopyLayers: 9, canopyRadiusFactor: 0.42, sway: 0.04 },
    frost: { canopy: 'dome', trunkLayers: 12, canopyLayers: 11, canopyRadiusFactor: 0.46, sparse: 0.28, sway: 0.03 },
    oak: { canopy: 'cube', trunkLayers: 9, canopyLayers: 11, canopyRadiusFactor: 0.48, sway: 0.045 },
    rose: { canopy: 'puff', trunkLayers: 6, canopyLayers: 9, canopyRadiusFactor: 0.37, sway: 0.05 },
    wisteria: { canopy: 'weeping', trunkLayers: 11, canopyLayers: 9, canopyRadiusFactor: 0.44, sway: 0.05 },
    bonsai: { canopy: 'tiers', trunkLayers: 5, canopyLayers: 6, canopyRadiusFactor: 0.3, sway: 0.035 },
    pine: { canopy: 'cone', trunkLayers: 15, canopyLayers: 12, canopyRadiusFactor: 0.4, sway: 0.025 },
    house: { canopy: 'none', trunkLayers: 0, canopyLayers: 0, canopyRadiusFactor: 0, sway: 0.03 },
};

// ─── Shared tiny PRNG (deterministic per url+preset) ────────────────────────

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Reference sin-hash — same per-block noise flavor as the demo. */
export function blockNoise(col: number, row: number, layer: number, k: number): number {
    const s = col * 17.3 + row * 31.1 + layer * 73.7 + k * 101.7;
    const x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
}
