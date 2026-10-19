// elect.ts — §13 THE CHAMPION ELECTION.
//
// The composer is deterministic per seed, so ONE art direction yields a
// family of realizations (different feature bands, micro voices, badge
// spots, teaser densities). The resolver does not take the first roll —
// it composes N candidates and TASTES them against the measured photo:
//
//   · CALM      — where does the type actually land? (calm-field coverage,
//                 area-weighted; the behind-sandwich masthead counts at 25%
//                 because overlapping the subject is its JOB)
//   · HIERARCHY — is the size ladder loud? (masthead ≫ feature ≫ sub;
//                 polite ratios read as mistakes)
//   · ORDER     — does the story read top-to-bottom in rung order?
//   · MARGINS   — breathing room at the edges (a sweet spot ~4.5%,
//                 not hugged, not floating)
//   · BALANCE   — the text mass centroid sits near the calm field centroid
//   · SHELTER   — micro type (teasers/datelines) hides in sheltered cells
//
// Pure math on the calm grid. No AI round trip, no coordinates from the
// model, nothing pruned — the loser seeds are simply never drawn.

import type { GridAnalysis } from './field';

/** The minimal text-spec shape the estimator + rubric need. Structurally
 *  satisfied by SystemTextSpec, so the composer's output feeds straight in. */
export interface SpecLike {
    id: string;
    text: string;
    fitToWidth: boolean;
    widthPct: number;
    heightPct: number;
    letterSpacingEm?: number;
    caseMode?: string;
    rotationDeg?: number;
    depth?: string;
    xPct: number;
    yPct: number;
}

/** Estimate a spec's half-extents in canvas fractions (0-1). Mirrors the
 *  page's measureTextBox: conservative glyph widths + tracking, and rails
 *  (|rot| near 90°) swap their run length and glyph height. */
export const specBox = (t: SpecLike): { hw: number; hh: number } => {
    const rail = Math.abs(Math.abs(t.rotationDeg || 0) % 180 - 90) < 15;
    const rawLines = t.text.split('\n');
    const lines = rawLines.filter((s) => s.trim()).length || 1;
    const maxLen = Math.max(...rawLines.map((ln) => ln.length), 1);
    let effW = t.widthPct;
    if (!t.fitToWidth && t.text.trim()) {
        const track = Math.max(0, t.letterSpacingEm || 0);
        const adv = (t.caseMode === 'uppercase' ? 0.76 : 0.68) + track * 1.1;
        const aspect = 1.5;
        effW = Math.min(96, maxLen * t.heightPct * aspect * adv + t.heightPct * aspect * 0.5);
    }
    const wPct = rail ? Math.max(t.heightPct, 1.2) : effW;
    const hPct = rail ? effW : t.heightPct * (lines > 1 ? lines * 1.12 : 1);
    return { hw: Math.max(0.012, wPct / 200), hh: Math.max(0.008, hPct / 200) };
};

export interface ElectBox extends SpecLike {
    hw: number;
    hh: number;
    /** Sits on an opaque plate — a busy landing is legal (the plate IS the
     *  contrast), so the calm rubric credits it a floor instead of punishing. */
    plated?: boolean;
}

export interface ElectCandidate {
    seed: number;
    label: string;
    boxes: ElectBox[];
}

export type ElectPart = 'calm' | 'hierarchy' | 'order' | 'margins' | 'balance' | 'shelter';

export interface ElectVerdict {
    seed: number;
    label: string;
    total: number;
    parts: Record<ElectPart, number>;
}

const WEIGHTS: Record<ElectPart, number> = {
    calm: 0.34,
    hierarchy: 0.22,
    order: 0.16,
    margins: 0.1,
    balance: 0.1,
    shelter: 0.08,
};

const rankOf = (id: string): number =>
    id === 'box-masthead' ? 0 : id === 'box-feature' ? 1 : id.startsWith('box-sub') ? 2 : id.startsWith('box-teaser') ? 3 : 4;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Area-weighted mean of any per-cell field under a normalized box. */
const meanFieldUnder = (field: Float32Array, g: GridAnalysis, x0: number, y0: number, x1: number, y1: number): number => {
    const { cols, rows } = g;
    const cx0 = Math.max(0, Math.min(cols - 1, Math.floor(Math.max(0, x0) * cols)));
    const cx1 = Math.max(0, Math.min(cols - 1, Math.ceil(Math.min(1, x1) * cols) - 1));
    const cy0 = Math.max(0, Math.min(rows - 1, Math.floor(Math.max(0, y0) * rows)));
    const cy1 = Math.max(0, Math.min(rows - 1, Math.ceil(Math.min(1, y1) * rows) - 1));
    let s = 0;
    let n = 0;
    for (let r = cy0; r <= cy1; r++) {
        for (let c = cx0; c <= cx1; c++) {
            s += field[r * cols + c];
            n++;
        }
    }
    return n ? s / n : 0;
};

/** Score one candidate against the measured grid. */
export function scoreCandidate(cand: ElectCandidate, g: GridAnalysis): ElectVerdict {
    const boxes = cand.boxes;

    // CALM — where the ink actually lands. A behind monumental masthead
    // deliberately crosses the subject (the sandwich); it weighs 25%.
    let calmAcc = 0;
    let calmW = 0;
    for (const b of boxes) {
        const raw = meanFieldUnder(g.calm, g, b.xPct - b.hw, b.yPct - b.hh, b.xPct + b.hw, b.yPct + b.hh);
        // A plate converts any landing into a legal high-contrast landing —
        // the calm rubric floors plated boxes at 0.55 instead of punishing
        // the statement edition for crossing a busy zone (which is its job).
        const c = b.plated ? Math.max(raw, 0.55) : raw;
        const w = b.depth === 'behind' && b.heightPct >= 20 ? 0.25 : 1;
        calmAcc += c * w;
        calmW += w;
    }
    // SUBJECT COLLISION PENALTY:
    // Unplated front typography must NEVER sit directly on top of the subject's
    // core body or face. If an unplated front text box collides with subjectCore
    // or subjectBox, penalize its calm score down!
    let subjectHitPenalty = 0;
    if (g.subjectBox) {
        const sb = g.subjectBox;
        for (const b of boxes) {
            if (b.plated || b.depth === 'behind') continue; // plates and behind-sandwich are exempt
            const x0 = b.xPct - b.hw;
            const x1 = b.xPct + b.hw;
            const y0 = b.yPct - b.hh;
            const y1 = b.yPct + b.hh;
            const ox = Math.max(0, Math.min(x1, sb.x1) - Math.max(x0, sb.x0));
            const oy = Math.max(0, Math.min(y1, sb.y1) - Math.max(y0, sb.y0));
            const overlapArea = ox * oy;
            const boxArea = (x1 - x0) * (y1 - y0);
            if (boxArea > 0 && overlapArea / boxArea > 0.15) {
                const coreHit = g.subjectCore &&
                    Math.max(0, Math.min(x1, g.subjectCore.x1) - Math.max(x0, g.subjectCore.x0)) *
                    Math.max(0, Math.min(y1, g.subjectCore.y1) - Math.max(y0, g.subjectCore.y0)) > 0;
                subjectHitPenalty += coreHit ? 0.40 : 0.22;
            }
        }
    }
    const calm = calmW ? clamp01((calmAcc / calmW) - subjectHitPenalty) : 0;

    // HIERARCHY — exaggerate, never polite. Reward loud rung ratios.
    const byRank = (r: number) => boxes.filter((b) => rankOf(b.id) === r);
    const mh = byRank(0)[0];
    const ft = byRank(1)[0];
    const sb = byRank(2)[0];
    let hierarchy = 0;
    if (mh && ft) hierarchy += clamp01((mh.heightPct / Math.max(ft.heightPct, 0.01) - 1.3) / 1.2);
    if (ft && sb) hierarchy += clamp01((ft.heightPct / Math.max(sb.heightPct, 0.01) - 1.15) / 1.2);
    hierarchy = clamp01(hierarchy / 2);

    // ORDER — each successive rung reads strictly below the previous WITHIN ITS COLUMN CORRIDOR.
    // Elements on opposite flanks (e.g. left teasers vs right headline) are independent reading columns.
    let ordPairs = 0;
    let ordOk = 0;
    for (let rA = 0; rA < 3; rA++) {
        for (let rB = rA + 1; rB <= 3; rB++) {
            const boxesA = byRank(rA);
            const boxesB = byRank(rB);
            for (const a of boxesA) {
                for (const b of boxesB) {
                    const xDist = Math.abs(a.xPct - b.xPct);
                    const xSpan = a.hw + b.hw;
                    if (xDist <= xSpan + 0.08) {
                        ordPairs++;
                        if (b.yPct - b.hh >= a.yPct + a.hh - 0.01) ordOk++;
                    }
                }
            }
        }
    }
    const order = ordPairs ? ordOk / ordPairs : 1;

    // MARGINS — a sweet spot ~4.5%: not edge-hugged, not floating.
    let margAcc = 0;
    for (const b of boxes) {
        const m = Math.min(b.xPct - b.hw, 1 - (b.xPct + b.hw), b.yPct - b.hh, 1 - (b.yPct + b.hh));
        margAcc += 1 - clamp01(Math.abs(m - 0.045) / 0.05);
    }
    const margins = boxes.length ? clamp01(margAcc / boxes.length) : 0;

    // BALANCE — text mass centroid vs the calm field's centroid.
    let calmCx = 0.5;
    {
        const { cols, colProfile } = g;
        let s = 0;
        let w = 0;
        for (let c = 0; c < cols; c++) {
            s += ((c + 0.5) / cols) * colProfile[c];
            w += colProfile[c];
        }
        if (w > 0) calmCx = s / w;
    }
    let massX = 0;
    let massW = 0;
    for (const b of boxes) {
        const w = b.hw * b.hh;
        massX += b.xPct * w;
        massW += w;
    }
    const balance = clamp01(1 - Math.abs((massW ? massX / massW : 0.5) - calmCx) / 0.3);

    // SHELTER — micro type hides in cells far from busy edges.
    const micro = boxes.filter((b) => rankOf(b.id) >= 3);
    let shelter = 0.5;
    if (micro.length) {
        let acc = 0;
        for (const b of micro) {
            acc += clamp01(meanFieldUnder(g.shelter, g, b.xPct - b.hw, b.yPct - b.hh, b.xPct + b.hw, b.yPct + b.hh) / 6);
        }
        shelter = clamp01(acc / micro.length);
    }

    const parts: Record<ElectPart, number> = { calm, hierarchy, order, margins, balance, shelter };
    const total = (Object.keys(WEIGHTS) as ElectPart[]).reduce((s, k) => s + parts[k] * WEIGHTS[k], 0);
    return { seed: cand.seed, label: cand.label, total, parts };
}

/** Compose-then-taste: rank every candidate, crown the highest total. */
export function electChampion(
    cands: ElectCandidate[],
    g: GridAnalysis,
): { champion: ElectCandidate; verdicts: ElectVerdict[] } {
    const verdicts = cands
        .map((c) => scoreCandidate(c, g))
        .sort((a, b) => b.total - a.total || a.seed - b.seed);
    const best = verdicts[0];
    const champion = cands.find((c) => c.seed === best.seed) ?? cands[0];
    return { champion, verdicts };
}
