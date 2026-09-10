/**
 * Deterministic PRNG & procedural noise utilities for the Keepsake dioramas.
 * Completely decoupled from the QR harness — every tree is unique to its
 * recipient seed yet perfectly reproducible.
 */

/** FNV-1a-ish string hash → uint32, so seeds can be names ("for-mom-2026"). */
export function hashSeedString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Mulberry32 — tiny, fast, high-quality enough for botanical art. */
export class PRNG {
    private s: number;

    constructor(seed: number | string) {
        const s = typeof seed === 'string' ? hashSeedString(seed) : seed >>> 0;
        // Avoid the degenerate all-zero state.
        this.s = (s || 0x9e3779b9) >>> 0;
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

    bool(p = 0.5): boolean {
        return this.next() < p;
    }

    pick<T>(items: readonly T[]): T {
        return items[this.int(0, items.length - 1)];
    }

    sign(): number {
        return this.next() < 0.5 ? -1 : 1;
    }

    /** Box–Muller gaussian, mean 0 sigma 1. */
    gaussian(): number {
        let u = 0;
        let v = 0;
        while (u === 0) u = this.next();
        while (v === 0) v = this.next();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    /** Uniform point on unit sphere. */
    unitVector(): { x: number; y: number; z: number } {
        const z = this.range(-1, 1);
        const a = this.range(0, Math.PI * 2);
        const r = Math.sqrt(1 - z * z);
        return { x: r * Math.cos(a), y: z, z: r * Math.sin(a) };
    }

    /** Fork a child generator so subsystems (bark, moss, ground…) stay stable
     *  even when earlier subsystem counts change. */
    fork(label: string): PRNG {
        return new PRNG(hashSeedString(`${label}:${this.next()}`));
    }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Smooth value noise (2D) — used for bark relief, moss placement and organic
 * radius modulation. Deterministic from a seed.
 * ──────────────────────────────────────────────────────────────────────────── */

const NOISE_SIZE = 256;

export class ValueNoise2D {
    private table: Float32Array;

    constructor(seed: number | string) {
        const prng = new PRNG(seed);
        this.table = new Float32Array(NOISE_SIZE * NOISE_SIZE);
        for (let i = 0; i < this.table.length; i++) this.table[i] = prng.next();
    }

    private valueAt(ix: number, iy: number): number {
        const x = ((ix % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
        const y = ((iy % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
        return this.table[y * NOISE_SIZE + x];
    }

    /** Smooth interpolated noise in [0,1]. */
    noise(x: number, y: number): number {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const v00 = this.valueAt(ix, iy);
        const v10 = this.valueAt(ix + 1, iy);
        const v01 = this.valueAt(ix, iy + 1);
        const v11 = this.valueAt(ix + 1, iy + 1);
        return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v11 - v10 - v01 + v00) * sx * sy;
    }

    /** Fractal brownian motion, result roughly in [0,1]. */
    fbm(x: number, y: number, octaves = 4, lacunarity = 2.1, gain = 0.5): number {
        let amp = 0.5;
        let freq = 1;
        let sum = 0;
        let norm = 0;
        for (let o = 0; o < octaves; o++) {
            sum += amp * this.noise(x * freq, y * freq);
            norm += amp;
            amp *= gain;
            freq *= lacunarity;
        }
        return sum / norm;
    }
}
