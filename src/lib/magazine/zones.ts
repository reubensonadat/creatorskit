// zones.ts — §2 the whitespace engine: lattice + maximal calm
// rectangles + subject cushions + horizon bands, scored and NMS-ed
// into the candidate zone pool. Negative space as data.

import { clamp, clamp01, overlapRatio, iou, rectOf } from './units';
import type { Grid } from './types';
// §2 · THE WHITESPACE ENGINE — where Gen III earns its commission. The 17
//      Gen II lattice zones survive (they encode editorial positions that
//      no algorithm would invent but every art director recognizes), and
//      three new families join them:
//
//        · MAXIMAL CALM RECTANGLES — grown from calm seeds like largest-
//          empty-rectangles over the busy-cell map: the true whitespace
//          the photo actually offers, wherever it happens to be.
//        · SUBJECT-ADJACENT CUSHIONS — bands hugging the trimmed subject
//          box: the zones covers use for plating and sandwiching.
//        · HORIZON BANDS — the calm strip above/below the horizon line.
//
//      Everything funnels through non-max suppression (IoU < 0.45) and a
//      scored ranking capped at MAX_ZONES. No zone is imagined; every
//      rectangle is measured calm, flat, sheltered and luminant.
// ===========================================================================

const MAX_ZONES = 64;

interface Zone {
    id: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
    calm: number;
    flat: number;
    lum: number;
    /** mean shelter (distance to structure) in cell units, 0-8 */
    shelter: number;
    /** overlap fraction with the trimmed subject box */
    subject: number;
    tags: string[];
    /** composite quality score, higher = better whitespace */
    score: number;
}

const zoneMetrics = (g: Grid, id: string, x0: number, y0: number, x1: number, y1: number, tags: string[]): Zone => {
    x0 = clamp01(x0);
    y0 = clamp01(y0);
    x1 = clamp01(x1);
    y1 = clamp01(y1);
    let calmSum = 0;
    let lumSum = 0;
    let shelterSum = 0;
    let n = 0;
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const cc = (c + 0.5) / g.cols;
            const rr = (r + 0.5) / g.rows;
            if (cc < x0 || cc > x1 || rr < y0 || rr > y1) continue;
            const k = r * g.cols + c;
            calmSum += g.calm[k];
            lumSum += g.lum[k];
            shelterSum += g.shelter[k];
            n++;
        }
    }
    n = Math.max(1, n);
    const lumMean = lumSum / n;
    let varAcc = 0;
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const cc = (c + 0.5) / g.cols;
            const rr = (r + 0.5) / g.rows;
            if (cc < x0 || cc > x1 || rr < y0 || rr > y1) continue;
            const dl = g.lum[r * g.cols + c] - lumMean;
            varAcc += dl * dl;
        }
    }
    const rect = rectOf(x0, y0, x1, y1);
    return {
        id,
        x0,
        y0,
        x1,
        y1,
        w: x1 - x0,
        h: y1 - y0,
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        calm: calmSum / n,
        flat: clamp01(1 - Math.sqrt(varAcc / n) * 3),
        lum: lumMean,
        shelter: shelterSum / n,
        subject: g.subjectBox ? overlapRatio(rect, g.subjectBox) : 0,
        tags,
        score: 0,
    };
};

/** The Gen II lattice — kept verbatim in geometry, rescored by the new
 *  engine. These are the positions art directors draw by hand. */
const latticeZones = (g: Grid): Zone[] => [
    zoneMetrics(g, 'T1', 0.06, 0.045, 0.94, 0.15, ['top', 'band']),
    zoneMetrics(g, 'T2', 0.05, 0.05, 0.46, 0.16, ['top', 'left']),
    zoneMetrics(g, 'T3', 0.54, 0.05, 0.95, 0.16, ['top', 'right']),
    zoneMetrics(g, 'B1', 0.06, 0.78, 0.94, 0.9, ['bottom', 'band']),
    zoneMetrics(g, 'B2', 0.05, 0.76, 0.48, 0.9, ['bottom', 'left']),
    zoneMetrics(g, 'B3', 0.52, 0.76, 0.95, 0.9, ['bottom', 'right']),
    zoneMetrics(g, 'L1', 0.035, 0.18, 0.2, 0.72, ['left', 'column', 'mid']),
    zoneMetrics(g, 'R1', 0.8, 0.18, 0.965, 0.72, ['right', 'column', 'mid']),
    zoneMetrics(g, 'M1', 0.06, 0.34, 0.42, 0.62, ['mid', 'left']),
    zoneMetrics(g, 'M2', 0.58, 0.34, 0.94, 0.62, ['mid', 'right']),
    zoneMetrics(g, 'C1', 0.18, 0.36, 0.82, 0.64, ['center', 'mid']),
    zoneMetrics(g, 'D1', 0.05, 0.045, 0.6, 0.09, ['dateline', 'top', 'band']),
    zoneMetrics(g, 'E1', 0.03, 0.03, 0.18, 0.11, ['corner', 'top', 'left']),
    zoneMetrics(g, 'E2', 0.82, 0.03, 0.97, 0.11, ['corner', 'top', 'right']),
    zoneMetrics(g, 'E3', 0.03, 0.87, 0.18, 0.97, ['corner', 'bottom', 'left']),
    zoneMetrics(g, 'E4', 0.82, 0.87, 0.97, 0.97, ['corner', 'bottom', 'right']),
];

/**
 * MAXIMAL CALM RECTANGLES — the discovery pass. Walks the calm mask on a
 * stride, grows each seed right and down while calmness holds, then
 * trims to the measured interior. This is how the engine finds the real
 * whitespace of THIS photo: the sky patch nobody planned for, the calm
 * wall on the left, the empty studio floor. Bounded: ≤ 40 seeds × O(cols
 * + rows) growth.
 */
const maximalCalmRectangles = (g: Grid): Zone[] => {
    const { cols, rows, calm } = g;
    const CALM_SEED = 0.62;
    const CALM_HOLD = 0.52;
    const out: Zone[] = [];
    const cellRect = (c0: number, r0: number, c1: number, r1: number): Zone | null => {
        const x0 = c0 / cols;
        const y0 = r0 / rows;
        const x1 = (c1 + 1) / cols;
        const y1 = (r1 + 1) / rows;
        if (x1 - x0 < 0.16 || y1 - y0 < 0.08) return null; // too small to typeset in
        return zoneMetrics(g, `X${out.length}`, x0, y0, x1, y1, ['discovered']);
    };
    const colCalm = (c: number, r0: number, r1: number): boolean => {
        let s = 0;
        for (let r = r0; r <= r1; r++) s += calm[r * cols + c];
        return s / Math.max(1, r1 - r0 + 1) >= CALM_HOLD;
    };
    const rowCalm = (r: number, c0: number, c1: number): boolean => {
        let s = 0;
        for (let c = c0; c <= c1; c++) s += calm[r * cols + c];
        return s / Math.max(1, c1 - c0 + 1) >= CALM_HOLD;
    };
    let made = 0;
    for (let r0 = 1; r0 < rows - 1 && made < 40; r0 += 3) {
        for (let c0 = 1; c0 < cols - 1 && made < 40; c0 += 3) {
            if (calm[r0 * cols + c0] < CALM_SEED) continue;
            let c1 = c0;
            let r1 = r0;
            // Greedy two-axis growth: extend width while columns stay calm,
            // then height while rows stay calm; repeat until stable.
            for (let guard = 0; guard < 8; guard++) {
                let grew = false;
                while (c1 + 1 < cols - 1 && colCalm(c1 + 1, r0, r1)) {
                    c1++;
                    grew = true;
                }
                while (r1 + 1 < rows - 1 && rowCalm(r1 + 1, c0, c1)) {
                    r1++;
                    grew = true;
                }
                if (!grew) break;
            }
            const z = cellRect(c0, r0, c1, r1);
            if (z) {
                out.push(z);
                made++;
                // Skip past this rectangle's row band — seeds inside it
                // would only rediscover the same whitespace.
                r0 = Math.min(rows - 2, r1);
                break;
            }
        }
    }
    return out;
};

/**
 * SUBJECT-ADJACENT CUSHIONS — bands hugging the trimmed subject box. The
 * coverline stack that points AT the subject lives in the shoulder cushion;
 * the plated statement that crosses it starts from the flank cushions.
 * Only emitted when the subject box is real and leaves room.
 */
const subjectCushions = (g: Grid): Zone[] => {
    const s = g.subjectBox;
    if (!s) return [];
    const out: Zone[] = [];
    const pad = 0.03;
    if (s.x0 > 0.24) {
        out.push(zoneMetrics(g, `S-L`, pad, clamp(s.y0 - 0.02, 0.05, 1), s.x0 - 0.02, clamp(s.y1 + 0.02, 0, 0.95), ['cushion', 'left', 'mid']));
    }
    if (s.x1 < 0.76) {
        out.push(zoneMetrics(g, `S-R`, clamp(s.x1 + 0.02, 0.05, 1), clamp(s.y0 - 0.02, 0.05, 1), 1 - pad, clamp(s.y1 + 0.02, 0, 0.95), ['cushion', 'right', 'mid']));
    }
    if (s.y0 > 0.24) {
        out.push(zoneMetrics(g, `S-T`, 0.06, 0.05, 0.94, s.y0 - 0.02, ['cushion', 'top', 'band']));
    }
    if (s.y1 < 0.74) {
        out.push(zoneMetrics(g, `S-B`, 0.06, clamp(s.y1 + 0.02, 0.05, 1), 0.94, 0.95, ['cushion', 'bottom', 'band']));
    }
    return out;
};

/**
 * HORIZON BANDS — the calm strips above and below the strongest
 * horizontal structure. When a photo has a real horizon, type respects
 * it the way a landscape architect respects a waterline.
 */
const horizonBands = (g: Grid): Zone[] => {
    if (g.horizonY === 0.5) return []; // neutral — no clear horizon
    const out: Zone[] = [];
    if (g.horizonY > 0.34) {
        out.push(zoneMetrics(g, 'H-A', 0.08, 0.06, 0.92, clamp(g.horizonY - 0.03, 0.14, 0.9), ['horizon', 'top', 'band']));
    }
    if (g.horizonY < 0.66) {
        out.push(zoneMetrics(g, 'H-B', 0.08, clamp(g.horizonY + 0.03, 0.1, 0.86), 0.92, 0.94, ['horizon', 'bottom', 'band']));
    }
    return out;
};

/**
 * ZONE SCORING — the composite whitespace quality. Weights are editorial
 * judgment encoded once, in daylight:
 *   calm       2.6 — stillness is the raw material of legibility
 *   shelter    1.1 — deep space never collides with the subject
 *   flat       0.8 — tonal evenness keeps ink honest corner to corner
 *   thirds     0.6 — anchors on the optical power grid read as designed
 *   edge-guard 0.9 — zones drifting off-canvas are discounted
 */
const THIRD_POINTS_X = [1 / 3, 2 / 3];
const scoreZone = (z: Zone): number => {
    let s = 2.6 * z.calm + 1.1 * clamp01(z.shelter / 5) + 0.8 * z.flat;
    const nearThirdsX = THIRD_POINTS_X.some((p) => Math.abs(z.cx - p) < 0.09);
    const nearThirdsY = [1 / 3, 2 / 3].some((p) => Math.abs(z.cy - p) < 0.09);
    if (nearThirdsX && nearThirdsY) s += 0.6;
    else if (nearThirdsX || nearThirdsY) s += 0.3;
    if (z.x0 < 0.02 || z.x1 > 0.98 || z.y0 < 0.02 || z.y1 > 0.98) s -= 0.9;
    return s;
};

/** Non-max suppression: drop any zone whose IoU with a better-scored
 *  keeper exceeds 0.45. Lattice zones get a +0.25 heritage bonus — a
 *  hand-position beats a discovered one when they tie. */
const nonMaxSuppress = (zones: Zone[]): Zone[] => {
    const ranked = zones
        .map((z) => ({ z, s: scoreZone(z) + (z.tags.includes('discovered') ? 0 : 0.25) }))
        .sort((a, b) => b.s - a.s);
    const kept: Zone[] = [];
    for (const { z, s } of ranked) {
        let ok = true;
        for (const k of kept) {
            if (iou(rectOf(z.x0, z.y0, z.x1, z.y1), rectOf(k.x0, k.y0, k.x1, k.y1)) > 0.45) {
                ok = false;
                break;
            }
        }
        if (ok) {
            z.score = s;
            kept.push(z);
        }
        if (kept.length >= MAX_ZONES) break;
    }
    return kept;
};

const enumerateZones = (g: Grid): Zone[] =>
    nonMaxSuppress([...latticeZones(g), ...maximalCalmRectangles(g), ...subjectCushions(g), ...horizonBands(g)]);

// ===========================================================================
export { enumerateZones };
export type { Zone };
