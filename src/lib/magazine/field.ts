// field.ts — §1 the measurement field: one 96×120 downsample becomes
// the 24×30 calmness/shelter grid, the subject boxes, the horizon.

import { clamp, clamp01, rectOf, rectCx } from './units';
import type { Rect } from './units';
import type { PhotoAnalysis } from './cover-system';
// §1 · THE MEASUREMENT FIELD — one 96×120 downsample becomes a 24×30 cell
//      grid of luminance, texture energy, saturation and calmness, plus a
//      trimmed subject box, a horizon line, and a distance-to-busyness map
//      that tells the whitespace engine how PROTECTED every cell is.
// ===========================================================================

export const SOLVER_GRID = { cols: 24, rows: 30 } as const;

export interface GridAnalysis {
    cols: number;
    rows: number;
    /** per-cell mean luminance 0-1 */
    lum: Float32Array;
    /** per-cell texture/edge energy 0-1 (gradient magnitude) */
    energy: Float32Array;
    /** per-cell saturation 0-1 */
    sat: Float32Array;
    /** per-cell calmness 0-1 (1 - normalized energy) */
    calm: Float32Array;
    /** per-cell distance to the nearest busy cell, in cell units, 0-8 */
    shelter: Float32Array;
    /** overall photo reads light (plate polarity) */
    light: boolean;
    /** bounding box of the visual mass (normalized, percentile-trimmed), null if diffuse */
    subjectBox: Rect | null;
    /** a tighter core of the subject — where the face/mass really lives */
    subjectCore: Rect | null;
    /** row (0-1) where horizontal structure peaks — the horizon */
    horizonY: number;
    /** circular-mean hue 0-360 and mean saturation — the colour vibe */
    hue: number;
    satAvg: number;
    /** column marginal calmness (length cols) */
    colProfile: Float32Array;
    /** row marginal calmness (length rows) */
    rowProfile: Float32Array;
}

export function analyzeGridFromCanvas(cv: HTMLCanvasElement): GridAnalysis | null {
    try {
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        const W0 = cv.width;
        const H0 = cv.height;
        if (!W0 || !H0) return null;

        // FAST FIRST STEP — downsample to a 96×120 thumbnail before ANY
        // pixel read. A full-resolution getImageData allocates tens of
        // megabytes and stalls the frame; the thumbnail is ~100× cheaper
        // and just as accurate for a 24×30 field (4×4 px per cell).
        const W = 96;
        const H = 120;
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) return null;
        octx.drawImage(cv, 0, 0, W, H);

        const { cols, rows } = SOLVER_GRID;
        const n = cols * rows;
        const lum = new Float32Array(n);
        const sat = new Float32Array(n);
        const rs = new Float64Array(n);
        const gs = new Float64Array(n);
        const bs = new Float64Array(n);
        const cnt = new Float64Array(n);

        const d = octx.getImageData(0, 0, W, H).data;
        // Pixel pass — accumulate RGB into cells (one pass over the tiny
        // thumbnail; sub-millisecond by construction).
        for (let i = 0; i < d.length; i += 4) {
            const px = (i / 4) | 0;
            const cxs = px % W;
            const cys = (px / W) | 0;
            const c = Math.min(cols - 1, ((cxs / W) * cols) | 0);
            const r = Math.min(rows - 1, ((cys / H) * rows) | 0);
            const k = r * cols + c;
            rs[k] += d[i];
            gs[k] += d[i + 1];
            bs[k] += d[i + 2];
            cnt[k]++;
        }
        let sinH = 0;
        let cosH = 0;
        let satSum = 0;
        let lumSum = 0;
        for (let k = 0; k < n; k++) {
            const c = Math.max(1, cnt[k]);
            const r = rs[k] / c / 255;
            const g = gs[k] / c / 255;
            const b = bs[k] / c / 255;
            const l = 0.299 * r + 0.587 * g + 0.114 * b;
            lum[k] = l;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const s = max <= 0 ? 0 : (max - min) / max;
            sat[k] = s;
            lumSum += l;
            satSum += s;
            if (max - min > 1e-4) {
                let h: number;
                if (max === r) h = ((g - b) / (max - min)) % 6;
                else if (max === g) h = (b - r) / (max - min) + 2;
                else h = (r - g) / (max - min) + 4;
                h *= 60;
                if (h < 0) h += 360;
                sinH += Math.sin((h * Math.PI) / 180);
                cosH += Math.cos((h * Math.PI) / 180);
            }
        }

        // Energy pass — gradient magnitude over the cell lattice (a cheap
        // Sobel on the downsampled field; edges = subject, flat = space).
        const energy = new Float32Array(n);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const k = r * cols + c;
                const l = lum[k];
                const lu = lum[Math.max(0, r - 1) * cols + c];
                const ld = lum[Math.min(rows - 1, r + 1) * cols + c];
                const ll = lum[r * cols + Math.max(0, c - 1)];
                const lr = lum[r * cols + Math.min(cols - 1, c + 1)];
                energy[k] = clamp01((Math.abs(lu - ld) + Math.abs(ll - lr)) / 2 / 0.16);
            }
        }
        const calm = new Float32Array(n);
        for (let k = 0; k < n; k++) calm[k] = clamp01(1 - energy[k]);

        // Subject statistics — mean and spread of busyness for trimming.
        let eMean = 0;
        for (let k = 0; k < n; k++) eMean += energy[k];
        eMean /= n;
        let eVar = 0;
        for (let k = 0; k < n; k++) eVar += (energy[k] - eMean) * (energy[k] - eMean);
        const eStd = Math.sqrt(eVar / n);

        // PERCENTILE-TRIMMED SUBJECT BOX — Gen II took every cell above a
        // threshold, so one busy corner dragged the box across the whole
        // page and the adjacency math flattened. Gen III collects hit
        // coordinates, sorts them, and trims the outer 8% per edge: the
        // box hugs the mass that actually matters.
        const thr = eMean + 0.55 * eStd;
        const hitXs: number[] = [];
        const hitYs: number[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (energy[r * cols + c] > thr) {
                    hitXs.push((c + 0.5) / cols);
                    hitYs.push((r + 0.5) / rows);
                }
            }
        }
        const quantile = (arr: number[], q: number): number => {
            if (!arr.length) return 0;
            const s = [...arr].sort((a, b) => a - b);
            return s[clamp(Math.floor(q * (s.length - 1)), 0, s.length - 1)];
        };
        let subjectBox: Rect | null = null;
        let subjectCore: Rect | null = null;
        if (hitXs.length >= 5) {
            subjectBox = rectOf(
                clamp(quantile(hitXs, 0.08), 0, 1),
                clamp(quantile(hitYs, 0.08), 0, 1),
                clamp(quantile(hitXs, 0.92), 0, 1),
                clamp(quantile(hitYs, 0.92), 0, 1),
            );
            subjectCore = rectOf(
                clamp(quantile(hitXs, 0.3), 0, 1),
                clamp(quantile(hitYs, 0.3), 0, 1),
                clamp(quantile(hitXs, 0.7), 0, 1),
                clamp(quantile(hitYs, 0.7), 0, 1),
            );
        }

        // HORIZON — the row whose horizontal energy run is strongest. A
        // landscape's text should respect the ground; a portrait's should
        // respect the shoulder line. Cheap: max over rows of smoothed
        // row energy, kept only when it clearly dominates.
        let horizonY = 0.5;
        let bestRun = 0;
        let secondRun = 0;
        for (let r = 2; r < rows - 2; r++) {
            let run = 0;
            for (let c = 1; c < cols - 1; c++) {
                run += Math.abs(lum[r * cols + c + 1] - lum[r * cols + c - 1]);
            }
            if (run > bestRun) {
                secondRun = bestRun;
                bestRun = run;
                horizonY = r / rows;
            } else if (run > secondRun) {
                secondRun = run;
            }
        }
        if (bestRun < secondRun * 1.6) horizonY = 0.5; // no clear horizon — stay neutral

        // SHELTER MAP — bounded BFS from every busy cell: how far each cell
        // sits from the nearest structure. Whitespace deep inside a calm
        // region is PREMIUM (a masthead there never collides); calm cells
        // hugging the subject are cushion space (good for plating, risky
        // for bare ink). Capped at 8 — beyond that it is all the same
        // "deep space" to the cost function.
        const shelter = new Float32Array(n).fill(8);
        const queue: number[] = [];
        for (let k = 0; k < n; k++) {
            if (energy[k] > thr) {
                shelter[k] = 0;
                queue.push(k);
            }
        }
        let head = 0;
        while (head < queue.length) {
            const k = queue[head++];
            const r = (k / cols) | 0;
            const c = k % cols;
            const dcur = shelter[k];
            if (dcur >= 8) continue;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const rr = r + dr;
                    const cc = c + dc;
                    if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
                    const kk = rr * cols + cc;
                    if (shelter[kk] > dcur + 1) {
                        shelter[kk] = dcur + 1;
                        queue.push(kk);
                    }
                }
            }
        }

        // Marginals — the column/row whitespace profile (interior only).
        const colProfile = new Float32Array(cols);
        const rowProfile = new Float32Array(rows);
        for (let c = 0; c < cols; c++) {
            let s = 0;
            for (let r = 2; r < rows - 2; r++) s += calm[r * cols + c];
            colProfile[c] = s / (rows - 4);
        }
        for (let r = 0; r < rows; r++) {
            let s = 0;
            for (let c = 2; c < cols - 2; c++) s += calm[r * cols + c];
            rowProfile[r] = s / (cols - 4);
        }

        let hue = Math.atan2(sinH, cosH) * (180 / Math.PI);
        if (hue < 0) hue += 360;
        return {
            cols,
            rows,
            lum,
            energy,
            sat,
            calm,
            shelter,
            light: lumSum / Math.max(1, n) > 0.58,
            subjectBox,
            subjectCore,
            horizonY,
            hue,
            satAvg: satSum / Math.max(1, n),
            colProfile,
            rowProfile,
        };
    } catch {
        return null;
    }
}

/** Derive the composer's PhotoAnalysis from the grid — ONE scan feeds
 *  both engines, so ASSEMBLE's opening step is a single 96×120 pass. */
export function gridToPhotoAnalysis(g: GridAnalysis): PhotoAnalysis {
    const bandCalm = (x0: number, y0: number, x1: number, y1: number): number => {
        let s = 0;
        let n = 0;
        for (let r = 0; r < g.rows; r++) {
            for (let c = 0; c < g.cols; c++) {
                const cc = (c + 0.5) / g.cols;
                const rr = (r + 0.5) / g.rows;
                if (cc < x0 || cc > x1 || rr < y0 || rr > y1) continue;
                s += g.calm[r * g.cols + c];
                n++;
            }
        }
        return Math.round((s / Math.max(1, n)) * 100) / 100;
    };
    const core = g.subjectCore ?? g.subjectBox;
    const cx = core ? rectCx(core) : 0.5;
    // §7 POSE — the subject box's aspect is the evidence: a body wider
    // than tall (ratio >= 1.25) is reclining/lying. That rotates the calm
    // grammar 90°: the bands own the typography, the columns belong to
    // the body. Measured, never guessed — the AI is TOLD, the composer
    // enforces, the laws verify.
    const sb = g.subjectBox;
    const subjectW = sb ? Math.round((sb.x1 - sb.x0) * 100) / 100 : undefined;
    const subjectH = sb ? Math.round((sb.y1 - sb.y0) * 100) / 100 : undefined;
    const pose: PhotoAnalysis['pose'] =
        subjectW && subjectH && subjectH > 0 && subjectW / subjectH >= 1.25 ? 'horizontal' : 'upright';
    return {
        headroom: bandCalm(0, 0, 1, 0.18),
        leftSpace: bandCalm(0, 0.18, 0.24, 0.72),
        rightSpace: bandCalm(0.76, 0.18, 1, 0.72),
        bottomSpace: bandCalm(0, 0.74, 1, 0.94),
        photoLight: g.light,
        subjectX: cx < 0.42 ? 'left' : cx > 0.58 ? 'right' : 'center',
        hue: Math.round(g.hue),
        sat: Math.round(g.satAvg * 100) / 100,
        pose,
        subjectW,
        subjectH,
    } as PhotoAnalysis;
}

// ===========================================================================
