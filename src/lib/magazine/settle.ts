// settle.ts — §14 CALM SETTLING.
//
// The no-text-on-text guarantee fixes every Y (separation is its whole
// job). This pass adds the measurement the guarantee never had: each
// stack gets ONE deterministic nudge along X toward the calmest stretch
// of its own band (the grid's column calm profile, windowed to the
// text's y-range).
//
// Doctrine, unchanged: separation-only — texts slide within ±0.07 of
// their settled column, never leave the canvas, never cross onto a
// sibling (an exact x/y overlap guard runs before every commit), and
// nothing is ever pruned or pinned. The guarantee's Y is law.
// Architecture (behind sandwich / giant wordmark) and rotated spine
// elements do not move — their overlap with the subject is the point.

import type { GridAnalysis } from './field';

export interface SettleNode {
    id: string;
    xPct: number;
    yPct: number;
    hw: number;
    hh: number;
    /** The sandwich / giant statement — its busy overlap is intended. */
    architecture?: boolean;
    /** Edge-pinned rotated elements (spine mastheads, rails) stay put. */
    pinned?: boolean;
}

export interface SettleMove {
    id: string;
    fromX: number;
    toX: number;
    gainedCalm: number;
}

const MAX_SLIDE = 0.07;
const MIN_GAIN = 0.04;
const SIBLING_GAP = 0.012;

/** Column calm profile windowed to a y-range: mean calm per column. */
const columnProfile = (g: GridAnalysis, y0: number, y1: number): Float32Array => {
    const { cols, rows, calm } = g;
    const prof = new Float32Array(cols);
    const r0 = Math.max(0, Math.min(rows - 1, Math.floor(Math.max(0, y0) * rows)));
    const r1 = Math.max(r0, Math.min(rows - 1, Math.ceil(Math.min(1, y1) * rows) - 1));
    for (let c = 0; c < cols; c++) {
        let s = 0;
        let n = 0;
        for (let r = r0; r <= r1; r++) {
            s += calm[r * cols + c];
            n++;
        }
        prof[c] = n ? s / n : 0;
    }
    return prof;
};

/** Mean profile value across a normalized x-window. */
const windowMean = (prof: Float32Array, x0: number, x1: number): number => {
    const cols = prof.length;
    const c0 = Math.max(0, Math.min(cols - 1, Math.floor(Math.max(0, x0) * cols)));
    const c1 = Math.max(c0, Math.min(cols - 1, Math.ceil(Math.min(1, x1) * cols) - 1));
    let s = 0;
    let n = 0;
    for (let c = c0; c <= c1; c++) {
        s += prof[c];
        n++;
    }
    return n ? s / n : 0;
};

/** Calmest centre position for a box of half-width hw (sliding window). */
const calmestCentre = (prof: Float32Array, hw: number): number => {
    const cols = prof.length;
    const w = Math.max(1, Math.min(cols, Math.round(hw * 2 * cols)));
    let best = 0.5;
    let bestV = -1;
    for (let c0 = 0; c0 + w <= cols; c0++) {
        let s = 0;
        for (let c = c0; c < c0 + w; c++) s += prof[c];
        const v = s / w;
        if (v > bestV) {
            bestV = v;
            best = (c0 + w / 2) / cols;
        }
    }
    return best;
};

/** Would sliding `self` to `tx` overlap any same-band sibling? */
const blockedBySibling = (nodes: SettleNode[], self: SettleNode, tx: number): boolean => {
    for (const o of nodes) {
        if (o === self || o.architecture) continue; // the sandwich overlaps by design
        if (Math.abs(o.yPct - self.yPct) >= o.hh + self.hh + 0.01) continue; // different bands
        if (tx - self.hw - SIBLING_GAP < o.xPct + o.hw && tx + self.hw + SIBLING_GAP > o.xPct - o.hw) return true;
    }
    return false;
};

/** Slide every eligible node toward the calmest stretch of its band. */
export function settleIntoCalm(nodes: SettleNode[], g: GridAnalysis): { nodes: SettleNode[]; moves: SettleMove[] } {
    const out: SettleNode[] = nodes.map((n) => ({ ...n }));
    const moves: SettleMove[] = [];

    for (const n of out) {
        if (n.architecture || n.pinned) continue;
        const y0 = n.yPct - n.hh;
        const y1 = n.yPct + n.hh;
        const prof = columnProfile(g, y0, y1);
        const curCalm = windowMean(prof, n.xPct - n.hw, n.xPct + n.hw);
        const target = calmestCentre(prof, n.hw);
        const dx = target - n.xPct;
        if (Math.abs(dx) < 0.012) continue; // already there — don't fidget
        const step = Math.sign(dx) * Math.min(Math.abs(dx), MAX_SLIDE);
        const tx = n.xPct + step;
        if (tx - n.hw < 0.015 || tx + n.hw > 0.985) continue; // never crowd the edge
        const newCalm = windowMean(prof, tx - n.hw, tx + n.hw);
        if (newCalm - curCalm < MIN_GAIN) continue; // the slide must pay for itself
        if (blockedBySibling(out, n, tx)) continue; // separation is still law
        moves.push({
            id: n.id,
            fromX: Math.round(n.xPct * 1000) / 1000,
            toX: Math.round(tx * 1000) / 1000,
            gainedCalm: Math.round((newCalm - curCalm) * 1000) / 1000,
        });
        n.xPct = tx;
    }

    return { nodes: out, moves };
}

// ---------------------------------------------------------------------------
// §16 CONTRAST AUDIT — ink that can actually be read
// ---------------------------------------------------------------------------

export interface ContrastNode {
    id: string;
    xPct: number;
    yPct: number;
    hw: number;
    hh: number;
    color?: string;
    opacity?: number;
    depth?: string;
}

export interface ContrastFlip {
    id: string;
    fromColor: string;
    toColor: string;
    bgLum: number;
}

const INK = '#000000';
const PAPER = '#FFFFFF';

const hexLum = (hex: string): number | null => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) return null;
    const v = parseInt(m[1], 16);
    const r = (v >> 16) & 255;
    const g = (v >> 8) & 255;
    const b = v & 255;
    return (r * 299 + g * 587 + b * 114) / 255000;
};

const meanLumUnder = (g: GridAnalysis, x0: number, y0: number, x1: number, y1: number): number => {
    const { cols, rows, lum } = g;
    const cx0 = Math.max(0, Math.min(cols - 1, Math.floor(Math.max(0, x0) * cols)));
    const cx1 = Math.max(cx0, Math.min(cols - 1, Math.ceil(Math.min(1, x1) * cols) - 1));
    const cy0 = Math.max(0, Math.min(rows - 1, Math.floor(Math.max(0, y0) * rows)));
    const cy1 = Math.max(cy0, Math.min(rows - 1, Math.ceil(Math.min(1, y1) * rows) - 1));
    let s = 0;
    let n = 0;
    for (let r = cy0; r <= cy1; r++) {
        for (let c = cx0; c <= cx1; c++) {
            s += lum[r * cols + c];
            n++;
        }
    }
    return n ? s / n : 0.5;
};

/** Measure the photo luminance actually UNDER each front-depth text and
 *  flip ink↔paper when the pair is unreadable. Behind-depth (sandwich)
 *  texts keep their hairline stroke contract; plated texts sit on their
 *  plate, not the photo. Separation-only doctrine: colors flip, nothing
 *  else moves. */
export function auditContrast(nodes: ContrastNode[], g: GridAnalysis, platedIds?: Set<string>): ContrastFlip[] {
    const flips: ContrastFlip[] = [];
    for (const n of nodes) {
        if (n.depth !== 'front') continue;
        if (platedIds?.has(n.id)) continue;
        if (typeof n.opacity === 'number' && n.opacity < 0.9) continue; // translucent = deliberate whisper
        const textLum = n.color ? hexLum(n.color) : 1;
        if (textLum === null) continue;
        const bgLum = meanLumUnder(g, n.xPct - n.hw, n.yPct - n.hh, n.xPct + n.hw, n.yPct + n.hh);
        const contrast = Math.abs(textLum - bgLum);
        if (contrast >= 0.34) continue; // readable — leave the art direction alone
        const to = bgLum > 0.5 ? INK : PAPER;
        if (to.toLowerCase() === (n.color ?? '').toLowerCase()) continue; // already the right ink
        flips.push({
            id: n.id,
            fromColor: n.color ?? '',
            toColor: to,
            bgLum: Math.round(bgLum * 1000) / 1000,
        });
    }
    return flips;
}
