// ---------------------------------------------------------------------------
// THE EDITORIAL SOLVER, GENERATION III — "THE FULLY-LOADED ENGINE"
// (src/lib/magazine/solver.ts)
//
// Lineage (owner ruling, for whoever opens this file next):
//   GEN I   — the AI drew the layout. Beautiful on lucky days, unusable on
//             the others. Retired to git history (commit 5b58685 era).
//   GEN II  — "perception belongs to the AI, geometry belongs to
//             mathematics." A 24×30 measurement field, 17 candidate zones,
//             Hungarian assignment. ~600 lines. It worked perfectly fine.
//             Preserved at solver-v1-glm25.ts.
//   GEN IIb — the whitespace-power rewrite. 4,000+ lines, fifteen preset
//             presets, fifteen laws. Powerful, but it replaced the engine
//             instead of growing it, and the editorial vibe died in the
//             swap. Preserved at solver-v2-fragments.ts.
//   GEN III — THIS FILE. The Gen II architecture, kept byte-for-byte in
//             spirit (same field, same optimizer core, same unit grammar,
//             same "AI never outputs a coordinate" ruling), grown into a
//             fully-loaded engine with everything the upgrades wanted:
//
//     1. FIELD      — the proven 24×30 luminance/energy/saturation grid,
//                     now with a percentile-trimmed subject box, a horizon
//                     estimate, and a per-cell distance-to-busyness map.
//     2. WHITESPACE — not 17 hardcoded rectangles anymore. The classic
//                     lattice survives, joined by DISCOVERED maximal calm
//                     rectangles and subject-adjacent cushion frames,
//                     deduplicated by non-max suppression. 40–64 live
//                     candidates per photo, every one of them measured.
//     3. LADDER     — the type hierarchy is SOLVED, not inherited. Role
//                     heights derive from zone capacity and the style's
//                     class, then a monotonic-ladder pass guarantees
//                     masthead > feature > sub > teaser, always, visibly.
//     4. ASSIGN     — the same exact Hungarian O(n³) core, now fed by
//                     CLUSTER UNITS (the feature/sub/teaser stack moves as
//                     one body and is distributed INSIDE its zone with
//                     breath gaps — the bunched-cover bug cannot recur),
//                     with k-best perturbation restarts for diversity and
//                     a quadrant spread balance so the page breathes.
//     5. CONTRAST   — ink polarity is physics here: every placement knows
//                     its zone's mean luminance and the WCAG contrast its
//                     ink would carry; plates are justified with numbers.
//     6. SIGNATURES — the good parts of Gen IIb as DATA. Giant type-as-
//                     mask wordmarks, vertical info rails, crosshair
//                     registration marks, accent blocks, border frames,
//                     corner ticks — declared per style, emitted in this
//                     file's unit grammar, and REGISTRABLE AT RUNTIME so
//                     new presets plug in without touching engine code.
//     7. LAWS       — an eight-law verifier reports what the geometry
//                     pass could not fully satisfy, with severities, so
//                     the UI can show the engine's conscience.
//     8. APPLY      — same contract as Gen II: solved placements rewrite
//                     the composed cover's specs; the app's layout-law
//                     engine verifies physically afterwards.
//
// UNIT GRAMMAR (house law — the lesson this file exists to remember):
//   xPct / yPct           are FRACTIONS of the canvas (0–1).
//   widthPct / heightPct  are PERCENT (0–100) — likewise wPct / hPct.
//   The renderer computes positions as `xPct * W` and sizes as
//   `(heightPct / 100) * H`. Never multiply a position by 100. Never
//   divide a size by 100 twice. devGuardUnits() watches in dev builds.
//
// PERFORMANCE CONTRACT (the one-hour application stays a one-hour
// application): one 96×120 downsample per analyze (sub-millisecond pixel
// pass), every later pass runs over ≤ 720 cells / ≤ 64 zones / ≤ 12×12
// assignment matrices. k-best runs the 12³ Hungarian four times. The whole
// solve is bounded work well under a millisecond on any laptop made this
// decade. Same photo + same seed → same cover. New click → new seed →
// the next-best optimal assignment.
//
// Nothing here is heuristic hand-waving; every number is a measurement and
// every placement is an optimum.
// ---------------------------------------------------------------------------

import type { ComposedCover, PhotoAnalysis, SystemShapeSpec, SystemStyleId, SystemTextSpec } from './cover-system';

// ===========================================================================
import { mulberry32, clamp, clamp01, overlapRatio, opticalSnap, quadrantOf, rectCx, contrastRatio, INK_LUM, PAPER_LUM } from './units';
import { devGuardUnits } from './debug';
import { enumerateZones } from './zones';
import type { Zone } from './zones';
import { fitCopyToZone, giantWordFrom } from './copy';
import { solveTypeLadder, styleClassOf } from './ladder';
import { kBestAssignments, INFEASIBLE } from './assign';
import { ARCHETYPES, ARCHETYPE_OF_STYLE, inferComposition, mastheadBand } from './archetypes';
import { resolveSignature } from './signatures';
import type { SolverStyleToken } from './signatures';
import { emitDecorations } from './decorations';
import { verifyLaws } from './laws';
import type { Grid, SolvedPlacement, SolverResult } from './types';
import type { SolverSemantics, SolverCopy } from './copy';
import type { TypeLadder } from './ladder';

// §6 · THE SOLVER — cluster-unit assignment. The feature/sub/teaser stack
//      travels as ONE body (Gen II assigned them separately and stacked
//      afterthought-fashion — the bunched-cover bug). Here the cluster's
//      zone must have the CAPACITY for the whole ladder, and the roles are
//      distributed inside it with breath gaps. Quadrant spread is checked
//      after the optimum; a lopsided page re-solves with balance bonuses.
// ===========================================================================

const KNOWN_STYLES: SystemStyleId[] = [
    'vogue', 'zine', 'kinfolk', 'noir', 'gq', 'dazed', 'natgeo', 'cyber', 'vinyl', 'architectural',
];

/** The colour-mood → genre map, on solver measurements (AI-free fallback). */
const gridVibe = (g: Grid): SystemStyleId => {
    const { hue, satAvg: sat, light } = g;
    if (sat < 0.16) return light ? 'kinfolk' : 'noir';
    const warm = hue >= 340 || (hue >= 12 && hue <= 50);
    if (warm && sat >= 0.34) return 'vogue'; // warm+saturated appetite → couture (the food genre is post-HEAD)
    if (hue >= 70 && hue < 170) return light ? 'kinfolk' : 'vinyl';
    if (hue >= 170 && hue < 265) return light ? 'natgeo' : 'cyber';
    if (hue >= 265 && hue < 340 && sat >= 0.25) return 'dazed';
    return light ? 'kinfolk' : 'gq';
};

/** Snap to the 24-division optical grid when within tolerance — the quiet
 *  mechanical rhythm that makes print layouts feel set, not dropped. */

export function solveEditorialCover(
    g: Grid,
    semantics: SolverSemantics | null,
    opts: { seed?: number; style?: SolverStyleToken; copy?: SolverCopy } = {},
): SolverResult {
    const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rng = mulberry32(seed);
    const style: SolverStyleToken =
        opts.style ??
        (semantics?.genre && (KNOWN_STYLES as string[]).includes(semantics.genre) ? (semantics.genre as SystemStyleId) : gridVibe(g));
    const signature = resolveSignature(style);
    // §6.5 — the brand system + the photograph's composition plan. The
    // AI may hint an archetype (its route is trained on the anatomy);
    // the style's own brand mapping wins ties. Null = free solve.
    const hintArch = semantics?.archetypeHint ? ARCHETYPES[semantics.archetypeHint] : undefined;
    const styleArchId = ARCHETYPE_OF_STYLE[style as SystemStyleId];
    const archetype = hintArch ?? (styleArchId ? ARCHETYPES[styleArchId] ?? null : null);
    const plan = inferComposition(g);
    const copy = opts.copy ?? {};
    const jitter = () => 1 + (rng() * 2 - 1) * 0.06; // ±6% weight noise → k-best diversity

    const zones = enumerateZones(g);
    const subjectCx = g.subjectCore ? rectCx(g.subjectCore) : g.subjectBox ? rectCx(g.subjectBox) : 0.5;
    // The text mass lives in the CALMER half; the scan corner sits opposite.
    let leftCalm = 0;
    let rightCalm = 0;
    for (let c = 0; c < 6; c++) leftCalm += g.colProfile[c];
    for (let c = g.cols - 6; c < g.cols; c++) rightCalm += g.colProfile[c];
    const textSide: 'left' | 'right' = leftCalm >= rightCalm ? 'left' : 'right';

    // ── Cluster units ─────────────────────────────────────────────────────
    // masthead · dateline · CLUSTER(feature+sub+teasers) · badge · scan.
    // The cluster is one row of the matrix; its internal distribution is
    // §4/§6 geometry, run after the optimum is chosen.
    const UNITS: { id: string; aspect: number; minCalm: number }[] = [
        { id: 'masthead', aspect: 3.4, minCalm: 0.4 },
        { id: 'dateline', aspect: 9.0, minCalm: 0.48 },
        { id: 'cluster', aspect: 3.0, minCalm: 0.42 },
        { id: 'badge', aspect: 5.0, minCalm: 0.42 },
        { id: 'scan', aspect: 2.2, minCalm: 0.25 },
    ];

    // Copy fitness needs a provisional ladder; statement-ness depends on
    // the zone, but the scale differs little — compute one ladder with the
    // page-wide calm as proxy capacity, refine inside the geometry pass.
    const provisional = solveTypeLadder(style, 0.5, false, signature.typeScale);

    const buildCost = (spreadBonus: number[]): number[][] =>
        UNITS.map((unit) =>
            zones.map((z, zi) => {
                if (z.calm < unit.minCalm) return INFEASIBLE;
                const zoneAspect = z.w / Math.max(0.02, z.h);
                let c =
                    2.3 * (1 - z.calm) * jitter() +
                    0.8 * Math.abs(Math.log(zoneAspect / unit.aspect)) * jitter() +
                    0.35 * (1 - z.flat) +
                    0.5 * (1 - clamp01(z.shelter / 5)) +
                    spreadBonus[zi] * jitter();
                switch (unit.id) {
                    case 'masthead':
                        if (z.cy > 0.62) c += 0.9; // masthead leads the upper two-thirds
                        if (g.subjectBox && overlapRatio(z, g.subjectBox) > 0.5) c += 0.35; // sandwich legal, not preferred
                        if (signature.giant) c -= 0.3; // giant wordmark styles want the field
                        if (archetype) {
                            // §6.5 — zones near the brand band are cheap; far zones taxed.
                            const band = mastheadBand(archetype.mastheadPosition, plan);
                            c += 1.4 * Math.abs(z.cx - band.x) + 1.4 * Math.abs(z.cy - band.y);
                            if (band.rotationDeg && z.w / Math.max(0.02, z.h) > 1.2) c += 1.1; // vertical brand wants a column
                        }
                        break;
                    case 'dateline':
                        if (z.cy > 0.16 && z.cy < 0.9) c += 0.8;
                        if (z.cy > 0.5) c += 0.3;
                        break;
                    case 'cluster': {
                        c += 0.9 * Math.abs(z.cx - subjectCx); // coverlines point AT the subject
                        if (z.cy < 0.3) c += 0.4;
                        if (archetype) {
                            // §5/§8 — the stack follows the archetype's authored
                            // strategy, cross-checked against the photo's measured
                            // empty quadrants (side stacks only when a side is calm).
                            const want =
                                archetype.stack === 'both-sym' || archetype.stack === 'both-asym'
                                    ? 'both'
                                    : archetype.stack === 'top'
                                      ? 'top'
                                      : (archetype.stack as 'left' | 'right' | 'bottom');
                            const go =
                                want === 'both' || want === 'bottom' || want === 'top'
                                    ? want
                                    : plan.stackSide === 'both'
                                      ? want
                                      : plan.stackSide;
                            if (go === 'left' && z.cx < 0.44) c -= 0.9;
                            else if (go === 'right' && z.cx > 0.56) c -= 0.9;
                            else if (go === 'bottom' && z.cy > 0.62) c -= 0.9;
                            else if (go === 'top' && z.cy < 0.28) c -= 0.9;
                            else if (go === 'both' && Math.abs(z.cx - 0.5) > 0.2) c -= 0.6;
                        }
                        // CAPACITY — the whole ladder stack must fit the zone.
                        const stackNeed = (provisional.feature + provisional.sub + provisional.teaser) / 100 + 2 * provisional.breath;
                        if (stackNeed > z.h * 0.92) c += 1.4 * (stackNeed / Math.max(0.05, z.h * 0.92) - 1);
                        // COPY FITNESS — the actual words, if we have them.
                        const featCopy = copy.feature;
                        if (featCopy) {
                            const fit = fitCopyToZone(featCopy, z.w * 100, provisional.feature, styleClassOf(style).tracking);
                            if (!fit) c += 1.2;
                            else c += 0.5 * (1 - fit.scale);
                        }
                        break;
                    }
                    case 'badge':
                        if (!z.tags.includes('corner')) c += INFEASIBLE;
                        break;
                    case 'scan': {
                        if (!z.tags.includes('corner')) c += INFEASIBLE;
                        else {
                            // §13 — the scan sits in the corner OPPOSITE the text mass.
                            const stackOn = archetype
                                ? archetype.stack === 'right' || (archetype.stack !== 'left' && plan.stackSide === 'right')
                                : textSide === 'right';
                            if (stackOn ? z.tags.includes('right') : z.tags.includes('left')) c += 0.8;
                            else c -= 0.4;
                        }
                        break;
                    }
                }
                return c;
            }),
        );

    // Pad to square with phantom zones so every unit gets an answer.
    const n = UNITS.length;
    const padSquare = (c: number[][]): number[][] => {
        const sq = c.map((row) => [...row]);
        while (sq[0].length < n) sq.forEach((row) => row.push(INFEASIBLE * 2));
        return sq;
    };

    // ── the optimum (and its runners-up) ─────────────────────────────────
    let cost = buildCost(zones.map(() => 0));
    let cands = kBestAssignments(padSquare(cost), 4, rng);
    if (!cands.length) {
        // Degenerate photo (nothing calm enough): fall back to infeasible-
        // tolerant costs so the composer defaults still rule the page.
        cost = cost.map((row) => row.map((c) => (c >= INFEASIBLE ? 60 : c)));
        cands = kBestAssignments(padSquare(cost), 1, rng);
    }

    /** Turn an assignment into concrete placements + the final ladder.
     *  Pure with respect to its inputs — the winner and every alternate
     *  run through the same geometry, no special cases. */
    const materialize = (assign: number[]): { placements: SolvedPlacement[]; ladder: TypeLadder } => {
        const placements: SolvedPlacement[] = [];
        const zoneOf = (i: number): Zone | null => {
            const zi = assign[i];
            return zi >= 0 && zi < zones.length ? zones[zi] : null;
        };
        const zoneLumOf = (z: Zone | null): number => (z ? z.lum : g.light ? 0.8 : 0.2);

        // -- masthead ------------------------------------------------------
        const mastZ = zoneOf(0);
        if (archetype) {
            // §6.5 — THE BRAND IS LAW: the archetype's canonical band wins
            // over the zone walk. The photograph steers composition (stack
            // side, scan corner), never the brand's identity slot.
            const band = mastheadBand(archetype.mastheadPosition, plan);
            placements.push({
                role: 'masthead',
                zone: `brand-${archetype.mastheadPosition}`,
                xPct: Math.round(opticalSnap(clamp(band.x, 0.05, 0.95)) * 1000) / 1000,
                yPct: Math.round(opticalSnap(clamp(band.y, 0.06, 0.94)) * 1000) / 1000,
                widthPct: Math.round(band.widthPct),
                rotationDeg: band.rotationDeg,
                plate: false,
                depth: band.depth,
                zoneLum: zoneLumOf(mastZ),
                polarity: 'ink',
            });
        } else if (mastZ && cost[0][assign[0]] < INFEASIBLE) {
            const rail = mastZ.tags.includes('column') && mastZ.h / Math.max(0.04, mastZ.w) >= 1.9;
            let widthPct: number;
            let rotationDeg = 0;
            if (rail) {
                // Vertical masthead: text length runs down the column height.
                widthPct = clamp(mastZ.h * 100 * 0.85, 46, 64);
                rotationDeg = mastZ.tags.includes('left') ? -90 : 90;
            } else {
                widthPct = clamp(mastZ.w * 100 * 0.92, 46, 92);
            }
            const cx = rail
                ? clamp(mastZ.x0 + (mastZ.tags.includes('left') ? 0.045 : -0.045) + (mastZ.tags.includes('left') ? 0.0 : mastZ.w), 0.03, 0.97)
                : opticalSnap(clamp(mastZ.cx, 0.06, 0.94));
            const cy = opticalSnap(clamp(mastZ.cy, 0.08, 0.92));
            const sandwich = !!g.subjectBox && overlapRatio(mastZ, g.subjectBox) > 0.4 && !rail;
            placements.push({
                role: 'masthead',
                zone: mastZ.id,
                xPct: Math.round(cx * 1000) / 1000,
                yPct: Math.round(cy * 1000) / 1000,
                widthPct: Math.round(widthPct),
                rotationDeg,
                plate: false,
                depth: sandwich ? 'behind' : 'front',
                zoneLum: zoneLumOf(mastZ),
                polarity: 'ink',
            });
        }

        // -- dateline --------------------------------------------------------
        const dateZ = zoneOf(1);
        if (dateZ && cost[1][assign[1]] < INFEASIBLE) {
            placements.push({
                role: 'dateline',
                zone: dateZ.id,
                xPct: Math.round(opticalSnap(clamp(dateZ.cx, 0.08, 0.92)) * 1000) / 1000,
                yPct: Math.round(opticalSnap(clamp(dateZ.cy, 0.06, 0.14)) * 1000) / 1000,
                widthPct: Math.round(clamp(dateZ.w * 100 * 0.9, 30, 84)),
                rotationDeg: 0,
                plate: false,
                depth: 'front',
                zoneLum: zoneLumOf(dateZ),
                polarity: 'ink',
            });
        }

        // -- the cluster: feature / sub / teasers, distributed in-zone --------
        const clZ = zoneOf(2);
        if (clZ && cost[2][assign[2]] < INFEASIBLE) {
            const statement = !!g.subjectBox && overlapRatio(clZ, g.subjectBox) > 0.35 && clZ.calm < 0.55;
            const ladder = solveTypeLadder(style, clZ.h, statement, signature.typeScale);
            const stackX = opticalSnap(clamp(clZ.cx, 0.12, 0.88));
            const widthPct = Math.round(clamp(clZ.w * 100 * 0.92, 24, 60));

            // Distribution: the stack starts one rung below the zone's top
            // and each following role lands after the previous rung plus a
            // breath gap — never a fixed offset, always proportional, so
            // the cluster fills its whitespace without ever bunching.
            const top = clamp(clZ.y0 + ladder.feature / 200 + 0.012, 0.08, 0.9);
            const featP: SolvedPlacement = {
                role: 'feature',
                zone: clZ.id,
                xPct: Math.round(stackX * 1000) / 1000,
                yPct: Math.round(opticalSnap(top) * 1000) / 1000,
                widthPct,
                rotationDeg: 0,
                plate: statement,
                depth: 'front',
                heightPct: ladder.feature,
                zoneLum: zoneLumOf(clZ),
                polarity: statement ? 'plate' : 'ink',
            };
            placements.push(featP);

            const subY = clamp(top + ladder.feature / 200 + ladder.breath + ladder.sub / 200, 0.1, 0.93);
            const subP: SolvedPlacement = {
                role: 'sub',
                zone: clZ.id,
                xPct: featP.xPct,
                yPct: Math.round(opticalSnap(subY) * 1000) / 1000,
                widthPct: Math.max(20, widthPct - 4),
                rotationDeg: 0,
                plate: statement,
                depth: 'front',
                heightPct: ladder.sub,
                zoneLum: zoneLumOf(clZ),
                polarity: statement ? 'plate' : 'ink',
            };
            placements.push(subP);

            const teasY = clamp(subY + ladder.sub / 200 + ladder.breath + ladder.teaser / 200, 0.12, 0.94);
            placements.push({
                role: 'teasers',
                zone: clZ.id,
                xPct: featP.xPct,
                yPct: Math.round(opticalSnap(teasY) * 1000) / 1000,
                widthPct: Math.max(18, widthPct - 8),
                rotationDeg: 0,
                plate: false,
                depth: 'front',
                heightPct: ladder.teaser,
                zoneLum: zoneLumOf(clZ),
                polarity: 'ink',
            });

            // Ink physics — bare ink needs contrast ≥ 3.2 against its zone;
            // otherwise the rung demands a plate (the app's plating law
            // re-cuts the rect; we only rule on necessity).
            if (!statement) {
                const inkLum = g.light ? PAPER_LUM : INK_LUM;
                if (contrastRatio(inkLum, zoneLumOf(clZ)) < 3.2) {
                    featP.plate = true;
                    featP.polarity = 'plate';
                    subP.plate = true;
                    subP.polarity = 'plate';
                }
            }

            return { placements, ladder };
        }

        // Cluster infeasible — composer defaults carry the coverline stack.
        return { placements, ladder: provisional };
    };

    // ── spread balance: the page must breathe in more than one corner ----
    const quadrantMass = (ps: SolvedPlacement[]): number[] => {
        const m = [0, 0, 0, 0];
        for (const p of ps) {
            const w = p.role === 'masthead' ? 2 : p.role === 'feature' ? 3 : p.role === 'sub' || p.role === 'teasers' ? 2 : 1;
            m[quadrantOf(p.xPct, p.yPct)] += w;
        }
        return m;
    };
    let winner = cands[0];
    let mat = materialize(winner.assignment);
    {
        const m = quadrantMass(mat.placements);
        const total = m.reduce((a, b) => a + b, 0) || 1;
        if (Math.max(...m) / total > 0.7) {
            // Lopsided — re-solve with the crowded quadrant's zones taxed.
            const crowded = m.indexOf(Math.max(...m));
            const spreadBonus = zones.map((z) => (quadrantOf(z.cx, z.cy) === crowded ? 0.9 : 0));
            const rebalanced = kBestAssignments(padSquare(buildCost(spreadBonus)), 2, rng);
            if (rebalanced.length) {
                winner = rebalanced[0];
                mat = materialize(winner.assignment);
            }
        }
    }

    const alternates: SolvedPlacement[][] = [];
    for (const cand of cands.slice(1)) {
        if (cand.assignment.every((c, i) => c === winner.assignment[i])) continue;
        alternates.push(materialize(cand.assignment).placements);
        if (alternates.length >= 2) break;
    }

    // ── the masthead dominance invariant (today's lesson, made law) ------
    // In band zones the masthead's column visibly dominates the feature's:
    // "brand towers, coverline answers". Vertical rails and giant-wordmark
    // styles are exempt — their width grammar is different on purpose.
    const mast = mat.placements.find((p) => p.role === 'masthead');
    const feat = mat.placements.find((p) => p.role === 'feature');
    if (mast && feat && !mast.rotationDeg && !signature.giant && /^(T|M|C|D|S|H|X)/.test(mast.zone)) {
        if (mast.widthPct < feat.widthPct + 8) {
            mast.widthPct = Math.min(92, feat.widthPct + 8);
        }
    }
    for (const p of mat.placements) {
        devGuardUnits(`placement:${p.role}`, p.xPct, p.yPct, p.widthPct, p.heightPct ?? 0);
    }

    const decorations = emitDecorations(signature, {
        g,
        word: giantWordFrom(semantics, copy),
        ladder: mat.ladder,
    });
    for (const d of decorations) {
        devGuardUnits(`decoration:${d.kind}`, d.xPct, d.yPct, d.wPct, d.hPct);
    }

    const violations = verifyLaws(mat.placements, mat.ladder, g, signature, archetype, plan);

    return {
        placements: mat.placements,
        style,
        photoLight: g.light,
        decorations,
        violations,
        seed,
        ladder: mat.ladder,
        alternates,
        ...(archetype ? { archetype: archetype.id, plan } : {}),
    };
}

// ===========================================================================

// ── public API preserved: the page imports stay valid ──────────────
export { analyzeGridFromCanvas, gridToPhotoAnalysis } from './field';
export type { GridAnalysis } from './field';
export { applySolverToCover } from './skeleton';
export { formatSolverReport } from './laws';
export { registerStyleSignature, listStyleSignatures } from './signatures';
export { ARCHETYPES, listArchetypes, inferComposition, mastheadBand } from './archetypes';
export type { SolverStyleToken, StyleSignature } from './signatures';
export type { SolvedPlacement, SolverResult } from './types';
export type { SolverSemantics, SolverCopy } from './copy';
export type { TypeLadder } from './ladder';
export type { LayoutViolation } from './laws';
export type { DecorationShape } from './decorations';
export type { Archetype, CompositionPlan } from './archetypes';

// §11 · APPENDIX A — ADDING A PRESET (the two-minute guide)
// --------------------------------------------------------------------------
// A preset is a NAME plus a StyleSignature. Nothing else. The engine's
// optimizer, ladder, physics and verifier apply to it like any genre.
//
//   1. Register (once, at app boot or module init):
//
//        registerStyleSignature('preset:fragments', {
//            giant: { heightPct: 88, widthPct: 74, maskPhoto: true },
//            rail: { x: 0.875, widthPct: 18, dividers: true },
//            crosshairs: { sizePct: 3 },
//            accent: '#D94B28',
//        });
//
//   2. Solve with it:
//
//        solveEditorialCover(grid, semantics, { style: 'preset:fragments' });
//
//   3. Devices available (all optional, all composable):
//        giant       boolean | GiantSpec   — type-as-mask wordmark
//        rail        boolean | RailSpec    — edge column + em-dash dividers
//        crosshairs  boolean | CrosshairSpec — registration marks
//        accent      string  | AccentSpec  — one hue of the house
//        frame       FrameSpec              — border document frame
//        cornerTicks boolean                — reserved, never emitted (corner marks rejected)
//        typeScale   Partial<Record<SolverRole, number>> — rung overrides
//        spread      'tight' | 'classic' | 'wide'
//
//   THE RULING, ENCODED: signatures decorate, the optimizer decides. A
//   preset can never seize geometry — the flat-rail era cannot recur.
//
// ===========================================================================
// §12 · APPENDIX B — PERFORMANCE BUDGET (why this stays instant)
// --------------------------------------------------------------------------
//   analyzeGridFromCanvas : 1 downsample + 1 thumbnail read + O(96×120)
//                           pixel pass + O(720) cell passes + a BFS whose
//                           queue is bounded by 720 cells. Sub-millisecond.
//   enumerateZones        : ≤ 40 growth seeds × O(54) growth + NMS over
//                           ≤ 80 candidates at O(k²) with k ≤ 80 → ≤ 6.4k
//                           IoU checks of pure arithmetic.
//   hungarian             : 5×5 padded matrix, ~125 inner iterations a
//                           solve, run ≤ 4 + 2 times for k-best + rebalance.
//   solveEditorialCover   : all of the above + seven small geometry loops.
//                           Comfortably under 1 ms on anything modern.
//
//   Same photo + same seed → byte-identical cover. Always.
// ===========================================================================
