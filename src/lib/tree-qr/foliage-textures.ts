/**
 * Foliage QR Diorama — procedural plane textures
 * ===============================================
 * High-resolution canvas-painted textures for the alpha-clipped foliage
 * planes: leaf clusters, grass blades and blossom rosettes.
 *
 * The artwork is painted in near-grayscale luminance (bright values with
 * internal shading) on purpose — the instanced meshes tint each plane via
 * `instanceColor`, so one texture set works for every botanical palette
 * while still receiving the palette's exact hue.
 *
 * Alpha is binary (paint or nothing) so `alphaTest` clipping gives clean
 * cutout edges with zero sorting issues.
 */

import * as THREE from 'three';
import { mulberry32 } from './voxel-qr';

export interface FoliageTextureSet {
    leaf: THREE.Texture;
    grass: THREE.Texture;
    blossom: THREE.Texture;
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement): THREE.Texture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
}

/** One teardrop leaf with a soft vertical gradient and a pale midrib vein. */
function paintLeaf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    len: number,
    wid: number,
    rot: number,
    lightness: number
): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    const grd = ctx.createLinearGradient(0, -len / 2, 0, len / 2);
    const tip = Math.min(255, lightness + 18);
    grd.addColorStop(0, `rgb(${tip},${tip},${tip})`);
    grd.addColorStop(1, `rgb(${lightness},${lightness},${lightness})`);
    ctx.fillStyle = grd;

    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.quadraticCurveTo(wid / 2, -len / 6, 0, len / 2);
    ctx.quadraticCurveTo(-wid / 2, -len / 6, 0, -len / 2);
    ctx.fill();

    // Midrib vein
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = Math.max(0.8, wid * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, -len / 2 + 2.5);
    ctx.lineTo(0, len / 2 - 2.5);
    ctx.stroke();

    ctx.restore();
}

/**
 * Leaf-cluster cutout — ~75 layered leaves radiating from a dense core,
 * smaller and sparser toward the rim, with occasional deep-shadow leaves
 * for volume. Drawn bright so palette tint multiplication stays rich.
 */
function paintLeafCluster(size = 256): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(size);
    const rng = mulberry32(0x5eed1e);
    const cx = size / 2;
    const cy = size / 2 + 6;

    const count = 78;
    for (let i = 0; i < count; i++) {
        const r = (size * 0.42) * Math.pow(rng(), 0.52);
        const ang = rng() * Math.PI * 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * 0.94;

        const edge = r / (size * 0.46);
        let len = (size * 0.24) * (1.08 - edge * 0.42) * (0.72 + rng() * 0.5);
        len = Math.min(len, size * 0.3);
        const wid = len * (0.5 + rng() * 0.18);
        const rot = ang + (rng() - 0.5) * 1.35 + Math.PI / 2;

        let lightness = 196 + rng() * 56; // bright base for tinting
        if (rng() < 0.18) lightness = 148 + rng() * 38; // deep-shadow leaves
        paintLeaf(ctx, x, y, len, wid, rot, Math.min(252, lightness));
    }

    return canvas;
}

/**
 * Grass-blade cutout — a tuft of ~16 curved, tapered blades fanning up
 * from the bottom edge. Anchored at the quad base (y = 0) so the wind
 * vertex shader can weight sway by height.
 */
function paintGrassTuft(size = 256): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(size);
    const rng = mulberry32(0x9a55e7);
    const baseY = size + 2; // slightly below the edge — roots must touch ground

    const paintBlade = (baseX: number, tipX: number, tipY: number, w: number, lightness: number) => {
        const midY = (baseY + tipY) / 2;
        const ctrlX = baseX + (tipX - baseX) * 0.18;

        const grd = ctx.createLinearGradient(0, baseY, 0, tipY);
        const tip = Math.min(255, lightness + 26);
        grd.addColorStop(0, `rgb(${lightness},${lightness},${lightness})`);
        grd.addColorStop(1, `rgb(${tip},${tip},${tip})`);
        ctx.fillStyle = grd;

        ctx.beginPath();
        ctx.moveTo(baseX - w, baseY);
        ctx.quadraticCurveTo(ctrlX - w * 0.35, midY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX + w * 0.35, midY, baseX + w, baseY);
        ctx.closePath();
        ctx.fill();
    };

    // Back row — shorter, darker blades for depth
    for (let i = 0; i < 7; i++) {
        const baseX = size * 0.5 + (rng() - 0.5) * size * 0.2;
        const tipX = baseX + (rng() - 0.5) * size * 0.16;
        const tipY = size * (0.42 + rng() * 0.16);
        paintBlade(baseX, tipX, tipY, 4.5 + rng() * 3.5, 152 + rng() * 34);
    }
    // Front row — the tall show blades
    for (let i = 0; i < 9; i++) {
        const baseX = size * 0.5 + (rng() - 0.5) * size * 0.34;
        const tipX = baseX + (rng() - 0.5) * size * 0.62;
        const tipY = size * (0.03 + rng() * 0.26);
        paintBlade(baseX, tipX, tipY, 6 + rng() * 4.5, 198 + rng() * 52);
    }

    return canvas;
}

/** Blossom cutout — six-petal rosette with a dim center, drawn face-on. */
function paintBlossom(size = 128): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(size);
    const rng = mulberry32(0x1017ea);
    const cx = size / 2;
    const cy = size / 2;

    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + rng() * 0.22;
        const len = size * (0.36 + rng() * 0.05);
        const wid = len * 0.62;

        ctx.save();
        ctx.translate(cx + Math.cos(ang) * size * 0.09, cy + Math.sin(ang) * size * 0.09);
        ctx.rotate(ang + Math.PI / 2);

        const L = 232 + rng() * 20;
        const grd = ctx.createLinearGradient(0, -len / 2, 0, len / 2);
        grd.addColorStop(0, `rgb(${Math.min(255, L + 15)},${Math.min(255, L + 15)},${Math.min(255, L + 15)})`);
        grd.addColorStop(1, `rgb(${L - 34},${L - 34},${L - 34})`);
        ctx.fillStyle = grd;

        ctx.beginPath();
        ctx.moveTo(0, -len / 2);
        ctx.quadraticCurveTo(wid / 2, -len / 6, 0, len / 2);
        ctx.quadraticCurveTo(-wid / 2, -len / 6, 0, -len / 2);
        ctx.fill();
        ctx.restore();
    }

    // Dim center disc — reads as the flower's eye once tinted
    const c = 118;
    ctx.fillStyle = `rgb(${c},${c},${c})`;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.085, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
}

// ─── Module-level cache: palette-independent (grayscale), build once ─────────

let cached: FoliageTextureSet | null = null;

export function getFoliageTextures(): FoliageTextureSet {
    if (!cached) {
        cached = {
            leaf: toTexture(paintLeafCluster()),
            grass: toTexture(paintGrassTuft()),
            blossom: toTexture(paintBlossom()),
        };
    }
    return cached;
}

export function disposeFoliageTextures(): void {
    if (cached) {
        cached.leaf.dispose();
        cached.grass.dispose();
        cached.blossom.dispose();
        cached = null;
    }
}
