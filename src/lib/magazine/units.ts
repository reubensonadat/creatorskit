// units.ts — §0 core utilities: seeded randomness, rect algebra, WCAG
// contrast, optical snapping. Pure math, zero magazine knowledge.

// §0 · CORE UTILITIES — seeded randomness, interval math, rect algebra,
//                      contrast physics, and the unit-grammar guard.
// ===========================================================================

/** Deterministic 32-bit RNG — same seed, same stream, same cover. Local
 *  copy so the solver stays pure (no imports from the composer's rng). */
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep — the only easing the geometry passes need. */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
    return t * t * (3 - 2 * t);
};

/** Fractional-space rectangle. THE geometry currency of this file. */
interface Rect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

const rectOf = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
const rectW = (r: Rect): number => r.x1 - r.x0;
const rectH = (r: Rect): number => r.y1 - r.y0;
const rectCx = (r: Rect): number => (r.x0 + r.x1) / 2;
const rectCy = (r: Rect): number => (r.y0 + r.y1) / 2;
const rectArea = (r: Rect): number => Math.max(1e-6, rectW(r) * rectH(r));

const rectIntersect = (a: Rect, b: Rect): Rect | null => {
    const x0 = Math.max(a.x0, b.x0);
    const y0 = Math.max(a.y0, b.y0);
    const x1 = Math.min(a.x1, b.x1);
    const y1 = Math.min(a.y1, b.y1);
    return x1 > x0 && y1 > y0 ? rectOf(x0, y0, x1, y1) : null;
};

const rectUnion = (a: Rect, b: Rect): Rect =>
    rectOf(Math.min(a.x0, b.x0), Math.min(a.y0, b.y0), Math.max(a.x1, b.x1), Math.max(a.y1, b.y1));

const rectExpand = (r: Rect, padX: number, padY: number): Rect =>
    rectOf(r.x0 - padX, r.y0 - padY, r.x1 + padX, r.y1 + padY);

/** Overlap of a over b, as a fraction of b's area — Gen II's proven metric. */
const overlapRatio = (a: Rect, b: Rect): number => {
    const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return (ix * iy) / rectArea(b);
};

/** Intersection-over-union — the dedupe metric for the zone engine. */
const iou = (a: Rect, b: Rect): number => {
    const inter = rectIntersect(a, b);
    if (!inter) return 0;
    const union = rectArea(rectUnion(a, b));
    return rectArea(inter) / union;
};

/** WCAG relative luminance of an 8-bit channel triple. */
const relLuminance = (r01: number, g01: number, b01: number): number => {
    const ch = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * ch(r01) + 0.7152 * ch(g01) + 0.0722 * ch(b01);
};

/** WCAG contrast ratio between two luminances (1..21). White-on-black = 21. */
const contrastRatio = (lumA: number, lumB: number): number => {
    const hi = Math.max(lumA, lumB);
    const lo = Math.min(lumA, lumB);
    return (hi + 0.05) / (lo + 0.05);
};

/** Ink luminance extremes used across the engine. */
const INK_LUM = 0.04; // near-black ink
const PAPER_LUM = 0.97; // near-white ink

/**
 * THE UNIT-GRAMMAR GUARD. In dev builds only, screams if a placement or
 * decoration violates the house law: positions in 0–1, sizes in 0–100.
 * This check exists because an entire afternoon once died to a ×100.
 */
const DEV = typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.NODE_ENV !== 'production';

const opticalSnap = (v: number): number => {
    const s = Math.round(v * 24) / 24;
    return Math.abs(s - v) < 0.011 ? s : v;
};

const quadrantOf = (x: number, y: number): 0 | 1 | 2 | 3 => {
    const top = y < 0.5;
    const left = x < 0.5;
    return top ? (left ? 0 : 1) : left ? 2 : 3;
};
export { mulberry32, smoothstep, clamp, clamp01, rectOf, rectCx, rectIntersect, overlapRatio, iou, relLuminance, contrastRatio, INK_LUM, PAPER_LUM, opticalSnap, quadrantOf, DEV };
export type { Rect };
