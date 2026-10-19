// decorations.ts — §8 the emitters: every signature device expressed
// in the house unit grammar (7 kinds; corner-ticks rejected by ruling).

import { devGuardUnits } from './debug';
import type { Grid } from './types';
import type { TypeLadder } from './ladder';
import type { NormalizedSignature } from './signatures';
// §8 · DECORATION EMITTERS — every device expressed in the house unit
//      grammar (x/y fractions, w/h percent), every anchor deliberate.
//      The renderer re-expands these into full-fidelity layers.
// ===========================================================================

export interface DecorationShape {
    kind: 'frame' | 'crosshair' | 'accent-block' | 'em-dash' | 'giant-type' | 'rail-bg' | 'corner-tick';
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    color: string;
    rotationDeg: number;
    depth: 'behind' | 'front';
    text?: string;
    typeFamily?: string;
    weight?: number;
    letterSpacing?: number;
    maskPhoto?: boolean;
    /** stroke weight for frames, PERCENT */
    thickness?: number;
    /** crosshair arm thickness, FRACTION of canvas */
    arm?: number;
    corner?: number;
    opacity?: number;
}

interface EmitContext {
    g: Grid;
    word: string;
    ladder: TypeLadder;
}

const emitDecorations = (sig: NormalizedSignature, ctx: EmitContext): DecorationShape[] => {
    const out: DecorationShape[] = [];
    const ink = ctx.g.light ? '#2B2B2B' : '#F5F0E8';

    // GIANT TYPE-AS-MASK WORDMARK — centre-anchored, photo reading through
    // the letterforms. The composer's masthead retires for giant styles
    // (the apply pass hides it): the wordmark IS the masthead.
    if (sig.giant) {
        const gs = sig.giant;
        out.push({
            kind: 'giant-type',
            xPct: 0.5,
            yPct: 0.5,
            wPct: gs.widthPct ?? 92,
            hPct: gs.heightPct ?? 90,
            color: ink,
            rotationDeg: 0,
            depth: 'behind',
            text: gs.word && gs.word.trim() ? gs.word.trim().toUpperCase() : ctx.word,
            typeFamily: sig.mastheadFamily ?? 'geometric-sans',
            weight: gs.weight ?? sig.mastheadWeight ?? 900,
            letterSpacing: gs.tracking ?? -0.03,
            maskPhoto: gs.maskPhoto ?? true,
            opacity: gs.opacity ?? 0.14,
        });
    }

    // THE RAIL — a right-edge editorial column backdrop with em-dash
    // dividers on a shared baseline grid. DECORATIVE ONLY by ruling: the
    // cluster's placement stays optimizer-owned; if the cost matrix sends
    // the cluster to the rail column (as rail styles' calm photos usually
    // will), the backdrop is already there waiting for it.
    if (sig.rail) {
        const rs = sig.rail;
        const rx = rs.x ?? 0.875;
        const rw = rs.widthPct ?? 18;
        if (rs.backdrop) {
            out.push({
                kind: 'rail-bg',
                xPct: rx,
                yPct: 0.5,
                wPct: rw,
                hPct: 78,
                color: ink,
                rotationDeg: 0,
                depth: 'behind',
                opacity: 0.08,
            });
        }
        if (rs.dividers !== false) {
            const top = 0.14;
            const bottom = 0.86;
            const bands = 4;
            const step = (bottom - top) / bands;
            for (let i = 1; i < bands; i++) {
                out.push({
                    kind: 'em-dash',
                    xPct: rx,
                    yPct: Math.round((top + step * i) * 1000) / 1000,
                    wPct: Math.min(7.2, rw * 0.4),
                    hPct: 0.4,
                    color: ink,
                    rotationDeg: 0,
                    depth: 'front',
                    thickness: 0.18,
                });
            }
        }
    }

    // CROSSHAIR REGISTRATION MARKS — the print-shop's fingerprint.
    if (sig.crosshairs) {
        const cs = sig.crosshairs;
        const positions = cs.positions ?? ([[0.08, 0.08], [0.92, 0.92]] as [number, number][]);
        for (const [chx, chy] of positions) {
            out.push({
                kind: 'crosshair',
                xPct: chx,
                yPct: chy,
                wPct: cs.sizePct ?? 3,
                hPct: cs.sizePct ?? 3,
                color: ink,
                rotationDeg: 0,
                depth: 'front',
                arm: cs.arm ?? 0.018,
            });
        }
    }

    // ACCENT BLOCK — one hue of the house, placed with intent.
    if (sig.accent) {
        const a = sig.accent;
        out.push({
            kind: 'accent-block',
            xPct: a.xPct ?? 0.24,
            yPct: a.yPct ?? 0.5,
            wPct: a.wPct ?? 12,
            hPct: a.hPct ?? 8,
            color: a.color,
            rotationDeg: 0,
            depth: 'behind',
        });
    }

    // THE BORDER FRAME — turns the cover into a document.
    if (sig.frame) {
        const inset = sig.frame.inset ?? 0.035;
        out.push({
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: Math.round((1 - inset * 2) * 100),
            hPct: Math.round((1 - inset * 2) * 94),
            color: sig.frame.color,
            rotationDeg: 0,
            depth: 'front',
            thickness: sig.frame.strokeW,
        });
    }

    // (Corner-tick crop marks were emitted here once and REJECTED by
    // the editor — nothing is ever placed at the four corners. The
    // "add relevant details" Gestalt fix is carried by REAL editorial
    // furniture only: dateline, scan, badges, rail dividers.)

    return out;
};

// ===========================================================================
export { emitDecorations };
export type { EmitContext };
