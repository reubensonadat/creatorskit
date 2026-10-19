// laws.ts — §9 the verifier: twelve laws checked against final
// geometry (structural + Gestalt + brand fidelity), plus the
// human-readable report.

import { contrastRatio, INK_LUM, PAPER_LUM, quadrantOf } from './units';
import type { SolvedPlacement, SolverResult, Grid } from './types';
import type { TypeLadder } from './ladder';
import type { NormalizedSignature } from './signatures';
import { mastheadBand, inferComposition } from './archetypes';
import type { Archetype, CompositionPlan } from './archetypes';
// §9 · THE LAW VERIFIER — the engine's conscience. Twelve laws, checked
//      against the FINAL geometry; survivors report home with severity so
//      the UI can show exactly what the mathematics could not give.
//      L9–L11 are the GESTALT calibration (Aevy lesson): proximity,
//      alignment/continuity, and focal contrast — measured, not assumed.
// ===========================================================================

export interface LayoutViolation {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    role?: string;
}

const verifyLaws = (
    placements: SolvedPlacement[],
    ladder: TypeLadder,
    g: Grid,
    sig: NormalizedSignature,
    archetype: Archetype | null = null,
    plan: CompositionPlan | null = null,
): LayoutViolation[] => {
    const v: LayoutViolation[] = [];
    const byRole: Record<string, SolvedPlacement> = {};
    for (const p of placements) byRole[p.role] = p;

    // L1 · MASTHEAD LEADERSHIP — the brand tops the upper field (giant
    // wordmark styles are exempt: the wordmark IS the masthead; so are
    // rotated rail mastheads, whose band math is columnar, and §6.5
    // brands that DECLARE a bottom masthead — position F is identity).
    const mast = byRole.masthead;
    if (mast && mast.yPct > 0.55 && !sig.giant && !mast.rotationDeg && archetype?.mastheadPosition !== 'F') {
        v.push({ id: 'masthead-lead', severity: 'critical', message: 'masthead must lead the upper field', role: 'masthead' });
    }

    // L2 · LADDER MONOTONICITY — every rung steps down, visibly.
    if (!(ladder.masthead >= ladder.feature * 2.0)) {
        v.push({ id: 'ladder-monotonic', severity: 'critical', message: 'masthead rung must tower the feature ≥ 2×' });
    }
    if (!(ladder.feature >= ladder.sub * 1.4 && ladder.sub >= ladder.teaser * 1.1)) {
        v.push({ id: 'ladder-steps', severity: 'warning', message: 'feature/sub/teaser rungs must step down clearly' });
    }

    // L3 · CLUSTER BREATH — the sub lands a full breath beneath the feature.
    const feat = byRole.feature;
    const sub = byRole.sub;
    if (feat && sub && feat.heightPct && sub.heightPct) {
        const need = feat.heightPct / 200 + ladder.breath + sub.heightPct / 200;
        if (sub.yPct - feat.yPct < need * 0.85) {
            v.push({ id: 'cluster-breath', severity: 'warning', message: 'sub must breathe one gap beneath the feature', role: 'sub' });
        }
    }

    // L4 · EDGE SAFETY — nobody hangs off the page (rails exempt by job).
    for (const p of placements) {
        if (p.rotationDeg) continue;
        const hw = p.widthPct / 200;
        if (p.xPct - hw < 0.015 || p.xPct + hw > 0.985) {
            v.push({ id: 'edge-safety', severity: 'warning', message: `${p.role} crosses the page margin`, role: p.role });
        }
    }

    // L5 · PLATE JUSTIFICATION — plates only where physics demanded them.
    if (feat && feat.plate && feat.zoneLum != null) {
        const cr = contrastRatio(g.light ? PAPER_LUM : INK_LUM, feat.zoneLum);
        if (cr >= 4.5) {
            v.push({ id: 'plate-justified', severity: 'info', message: 'feature plated on already-contrasting ground', role: 'feature' });
        }
    }

    // L6 · SCAN CORNER — the barcode/QR sits inside a real corner.
    const scan = byRole.scan;
    if (scan && (scan.xPct < 0.05 || scan.xPct > 0.95 || scan.yPct < 0.05 || scan.yPct > 0.95)) {
        v.push({ id: 'scan-corner', severity: 'warning', message: 'scan element must sit inside a corner', role: 'scan' });
    }

    // L7 · SPREAD BALANCE — the page breathes in more than one quadrant.
    const m = [0, 0, 0, 0];
    for (const p of placements) {
        const w = p.role === 'masthead' ? 2 : p.role === 'feature' ? 3 : 1;
        m[quadrantOf(p.xPct, p.yPct)] += w;
    }
    const total = m.reduce((a, b) => a + b, 0) || 1;
    if (Math.max(...m) / total > 0.75) {
        v.push({ id: 'spread-balance', severity: 'warning', message: 'text mass crowds one quadrant — the page cannot breathe' });
    }

    // L8 · RAIL ALIGNMENT — with a rail backdrop, the cluster honours it.
    if (sig.rail) {
        const rx = sig.rail.x ?? 0.875;
        if (feat && Math.abs(feat.xPct - rx) > 0.14) {
            v.push({ id: 'rail-alignment', severity: 'info', message: 'rail present but the cluster chose its own column', role: 'feature' });
        }
    }

    // L9 · GESTALT PROXIMITY — "keep related elements together so they
    // appear part of the same group." The cluster is ONE conceptual
    // unit; the masthead is ANOTHER. The void between groups must be
    // clearly larger than the breaths inside the cluster — a masthead
    // parked inside the cluster band merges the two groups and the
    // hierarchy dissolves. (Rotated rail mastheads are exempt: their
    // band math is columnar, not horizontal.)
    const teas = byRole.teasers;
    if (feat && sub && mast && !mast.rotationDeg) {
        const mastBottom = mast.yPct + ladder.masthead / 200;
        const clTopY = Math.min(
            feat.yPct - (feat.heightPct ?? 0) / 200,
            sub.yPct - (sub.heightPct ?? 0) / 200,
            teas ? teas.yPct - (teas.heightPct ?? 0) / 200 : feat.yPct,
        );
        const between = clTopY - mastBottom;
        const xOverlap =
            Math.abs(mast.xPct - feat.xPct) < ((mast.widthPct + feat.widthPct) / 200) * 0.5;
        if (between >= 0 && between < ladder.breath * 2 && xOverlap) {
            v.push({
                id: 'gestalt-proximity',
                severity: 'warning',
                message: 'masthead sits inside the cluster band — groups must separate harder than their internal breaths',
                role: 'masthead',
            });
        }
    }

    // L10 · GESTALT ALIGNMENT / CONTINUITY — "arrange elements in a
    // common direction so the viewer's eye moves naturally." The
    // cluster's rungs share ONE axis; the eye rides it down the page.
    // Drift off the axis (beyond optical tolerance) breaks the path.
    if (feat && sub && teas) {
        const axisSpread = Math.max(
            Math.abs(feat.xPct - sub.xPct),
            Math.abs(sub.xPct - teas.xPct),
            Math.abs(feat.xPct - teas.xPct),
        );
        if (axisSpread > 0.02) {
            v.push({
                id: 'gestalt-alignment',
                severity: 'warning',
                message: 'cluster rungs drift off the shared axis — the eye loses its path',
                role: 'feature',
            });
        }
    }

    // L11 · GESTALT FOCAL POINT — "no focal point? use contrast." The
    // feature owns scale dominance (L2); this law owns the TONAL side:
    // a headline neither plated nor sitting on ≥2.5:1 ground has no
    // focal contrast at all — the cover becomes wallpaper.
    if (feat && feat.zoneLum != null && !feat.plate) {
        const cr = contrastRatio(g.light ? PAPER_LUM : INK_LUM, feat.zoneLum);
        if (cr < 2.5) {
            v.push({
                id: 'gestalt-focal',
                severity: 'critical',
                message: 'feature has neither a plate nor tonal contrast — no focal point',
                role: 'feature',
            });
        }
    }

    // L12 · BRAND FIDELITY — the masthead position is the brand's
    // identity decision, made once (§6.5 ruling): when an archetype
    // owns the solve, the masthead must sit in its canonical band.
    if (archetype && mast) {
        const band = mastheadBand(archetype.mastheadPosition, plan ?? inferComposition(g));
        const rotated = band.rotationDeg !== 0;
        if (
            Math.abs(mast.yPct - band.y) > 0.14 ||
            Math.abs(mast.xPct - band.x) > 0.18 ||
            (rotated ? mast.rotationDeg !== band.rotationDeg : !!mast.rotationDeg)
        ) {
            v.push({ id: 'brand-fidelity', severity: 'critical', message: `masthead left the ${archetype.name} brand band`, role: 'masthead' });
        }
    }

    return v;
};

/** Human-readable one-liner for the ⚙ SOLVER readout. */
export const formatSolverReport = (s: SolverResult): string =>
    `${String(s.style).toUpperCase()} · ${s.placements.length} placements · ${s.decorations.length} decorations · ` +
    `${s.violations.length} law flags · +${s.alternates.length} alternates · seed ${s.seed.toString(36)}` +
    `${s.archetype ? ` · brand ${s.archetype} (${s.plan?.mastheadRel ?? '?'} / stack ${s.plan?.stackSide ?? '?'})` : ''}`;

// ===========================================================================
export { verifyLaws };
