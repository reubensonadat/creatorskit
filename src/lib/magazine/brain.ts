// brain.ts — §15 THE DETERMINISTIC BRAIN.
//
// "Give a smart response to a dumb system and you get Siri." The resolver
// used to be a switchboard: each AI token flipped a fixed geometry switch.
// The brain sits between the brief and the geometry and actually THINKS,
// in four deterministic moves — zero extra AI calls, every thought traced:
//
//   1 · SITUATION     — fuse the measured grid into named findings
//                       ("reclining subject, head at left edge, bottom
//                       band 84% calm, right flank dead")
//   2 · PRECEDENT     — recall the 60-cover anatomy as scored cases that
//                       FIT the situation (not one hardcoded branch)
//   3 · RECONCILE     — the AI brief wins UNLESS it contradicts a measured
//                       finding; every override is recorded with its reason
//   4 · CRITIQUE      — compose, taste (elect.ts rubric), and if the score
//                       is poor, name the weakest part and amend the plan
//                       from a fixed table; bounded retries, best edition wins
//
// Doctrine, unchanged: the AI never emits coordinates, nothing is pruned
// or pinned, separation stays the only automatic correction — the brain
// only chooses WHICH legal plan to realize.

import type { GridAnalysis } from './field';
import type { ArtDirection } from './cover-system';
import { electChampion, specBox, type ElectCandidate, type ElectVerdict, type ElectPart } from './elect';

// ---------------------------------------------------------------------------
// 1 · SITUATION MODEL
// ---------------------------------------------------------------------------

export interface Finding {
    code: string;
    detail: string;
    /** confidence 0-1 */
    weight: number;
}

export interface Situation {
    pose: 'upright' | 'horizontal';
    headSide: 'left' | 'right' | 'center' | null;
    bands: { top: number; bottom: number; left: number; right: number; center: number };
    photoLight: boolean;
    findings: Finding[];
    summary: string;
}

const meanCalm = (g: GridAnalysis, x0: number, y0: number, x1: number, y1: number): number => {
    const { cols, rows, calm } = g;
    const cx0 = Math.max(0, Math.min(cols - 1, Math.floor(x0 * cols)));
    const cx1 = Math.max(cx0, Math.min(cols - 1, Math.ceil(x1 * cols) - 1));
    const cy0 = Math.max(0, Math.min(rows - 1, Math.floor(y0 * rows)));
    const cy1 = Math.max(cy0, Math.min(rows - 1, Math.ceil(y1 * rows) - 1));
    let s = 0;
    let n = 0;
    for (let r = cy0; r <= cy1; r++) {
        for (let c = cx0; c <= cx1; c++) {
            s += calm[r * cols + c];
            n++;
        }
    }
    return n ? s / n : 0;
};

const pctS = (v: number): string => `${Math.round(v * 100)}%`;

/** Fuse the measured grid into the named situation every later stage
 *  reasons about. Pure function of the field — same grid, same diagnosis. */
export function diagnoseSituation(g: GridAnalysis): Situation {
    const top = meanCalm(g, 0.1, 0, 0.9, 0.22);
    const bottom = meanCalm(g, 0.1, 0.78, 0.9, 1);
    const left = meanCalm(g, 0, 0.22, 0.24, 0.78);
    const right = meanCalm(g, 0.76, 0.22, 1, 0.78);
    const center = meanCalm(g, 0.3, 0.3, 0.7, 0.7);

    const core = g.subjectCore;
    const box = g.subjectBox;
    const boxW = box ? box.x1 - box.x0 : 0;
    const boxH = box ? box.y1 - box.y0 : 0;
    const pose: Situation['pose'] = boxW > 0 && boxH > 0 && boxW / boxH >= 1.25 ? 'horizontal' : 'upright';
    const headSide: Situation['headSide'] = !core
        ? null
        : core.x0 + (core.x1 - core.x0) / 2 < 0.35
            ? 'left'
            : core.x0 + (core.x1 - core.x0) / 2 > 0.65
                ? 'right'
                : 'center';

    const findings: Finding[] = [];
    const add = (code: string, detail: string, weight = 1) => findings.push({ code, detail, weight });

    if (pose === 'horizontal') add('POSE_RECLINING', `subject box ${pctS(boxW)}×${pctS(boxH)} — the bands own the type`);
    if (pose === 'horizontal' && (headSide === 'left' || headSide === 'right'))
        add('HEAD_AT_EDGE', `head rests at the ${headSide} edge — the spine statement is legal`, 0.9);
    if (top >= 0.5) add('TOP_BAND_CALM', `${pctS(top)} headroom calm — the classic over-head masthead is legal`);
    if (bottom >= 0.5) add('BOTTOM_BAND_CALM', `${pctS(bottom)} bottom calm — the floor stack wants the feature`);
    if (left >= 0.42) add('LEFT_FLANK_CALM', `${pctS(left)} left column calm`);
    if (right >= 0.42) add('RIGHT_FLANK_CALM', `${pctS(right)} right column calm`);
    const flankDiff = Math.abs(left - right);
    if (left >= 0.40 && right >= 0.40 && flankDiff <= 0.20) {
        add('TWIN_FLANKS', 'both columns calm and balanced — twin colonies are legal');
    } else if (flankDiff > 0.20 || (left < 0.35 && right >= 0.42) || (right < 0.35 && left >= 0.42)) {
        add('ASYMMETRIC_FLANKS', `left ${pctS(left)} vs right ${pctS(right)} — asymmetric negative space, colonize the calmer flank`);
    }
    if (left < 0.2 && right < 0.2 && top < 0.38 && bottom < 0.38) {
        add('DENSE_EVERYWHERE', 'no calm quadrant — only the deep sandwich + statement plate survive');
    }
    add(g.light ? 'PHOTO_LIGHT' : 'PHOTO_DARK', g.light ? 'light photo — ink masthead legal' : 'dark photo — paper masthead');

    const calmRank = (
        [
            ['top', top],
            ['bottom', bottom],
            ['left', left],
            ['right', right],
        ] as Array<[string, number]>
    ).sort((a, b) => b[1] - a[1]);
    const summary = `${pose === 'horizontal' ? 'reclining subject' : 'upright subject'}${headSide && headSide !== 'center' ? `, head ${headSide}` : ''}; calmest ${calmRank[0][0]} ${pctS(calmRank[0][1])}, then ${calmRank[1][0]} ${pctS(calmRank[1][1])}; ${g.light ? 'light' : 'dark'} photo`;

    return { pose, headSide, bands: { top, bottom, left, right, center }, photoLight: g.light, findings, summary };
}

// ---------------------------------------------------------------------------
// 2 · PRECEDENT LIBRARY — the 60-cover anatomy as scored cases
// ---------------------------------------------------------------------------

export interface PrecedentHit {
    id: string;
    name: string;
    fit: number;
    why: string;
    plan: Partial<ArtDirection>;
}

interface Precedent {
    id: string;
    name: string;
    fit: (s: Situation) => { fit: number; why: string } | null;
    plan: (s: Situation) => Partial<ArtDirection>;
}

const PRECEDENTS: Precedent[] = [
    {
        id: 'SPINE_STATEMENT',
        name: 'Reclining spine statement',
        fit: (s) =>
            s.findings.some((f) => f.code === 'HEAD_AT_EDGE')
                ? { fit: 0.95, why: 'reclining subject with the head at an edge — the vertical wordmark runs down that edge, the head crossing the letters IS the sandwich' }
                : null,
        plan: (s) => ({
            mastheadRot: s.headSide === 'left' ? 'spine-left' : 'spine-right',
            cluster: 'center',
            mainLinePos: s.bands.bottom >= s.bands.top ? 'bottom' : 'above-head',
            mastheadDepth: 'behind',
        }),
    },
    {
        id: 'FLOOR_STACK',
        name: 'Calm floor stack',
        fit: (s) =>
            s.bands.bottom >= 0.5 ? { fit: 0.85, why: `${pctS(s.bands.bottom)} bottom band calm — the feature stack parks on the floor` } : null,
        plan: () => ({ mainLinePos: 'bottom', treatment: 'strip' }),
    },
    {
        id: 'OVER_HEAD_CLASSIC',
        name: 'Classic over-head masthead',
        fit: (s) =>
            s.bands.top >= 0.5 && s.pose === 'upright' ? { fit: 0.85, why: `${pctS(s.bands.top)} headroom calm — the front over-head band` } : null,
        plan: () => ({ template: 'TOP-MASTHEAD', mastheadDepth: 'front', mainLinePos: 'below-chin' }),
    },
    {
        id: 'SIDE_STRIP_COLONY',
        name: 'Side-strip colony',
        fit: (s) => {
            const calmest = s.bands.left >= s.bands.right ? 'left' : 'right';
            const v = Math.max(s.bands.left, s.bands.right);
            return v >= 0.42 && s.pose === 'upright'
                ? { fit: 0.8, why: `${calmest} column ${pctS(v)} calm — masthead + coverline stack colonise the strip` }
                : null;
        },
        plan: (s) => ({
            template: 'SIDE-STRIP',
            cluster: s.bands.left >= s.bands.right ? 'left' : 'right',
            scanCorner: s.bands.left >= s.bands.right ? 'right' : 'left',
        }),
    },
    {
        id: 'TWIN_COLONIES',
        name: 'Twin symmetric colonies',
        fit: (s) =>
            s.findings.some((f) => f.code === 'TWIN_FLANKS') && s.pose === 'upright'
                ? { fit: 0.7, why: 'both flanks calm — the split symmetry is legal' }
                : null,
        plan: () => ({ cluster: 'split', treatment: 'symmetric' }),
    },
    {
        id: 'DEEP_SANDWICH',
        name: 'Deep-layer sandwich',
        fit: (s) =>
            s.findings.some((f) => f.code === 'DENSE_EVERYWHERE')
                ? { fit: 0.85, why: 'dense full-bleed — the behind masthead + bottom strip is the only unplated survivor' }
                : null,
        plan: () => ({ template: 'DEEP-LAYER', mastheadDepth: 'behind', mainLinePos: 'bottom' }),
    },
    {
        id: 'INVERTED_GRAVITAS',
        name: 'Inverted commemorative',
        fit: (s) =>
            s.bands.bottom >= 0.6 && s.bands.top < 0.4 ? { fit: 0.65, why: 'bottom-dominant calm — the commemorative inversion' } : null,
        plan: () => ({ template: 'INVERTED', mainLinePos: 'bottom' }),
    },
    {
        id: 'BAND_RECLINING_CENTER',
        name: 'Reclining centre band',
        fit: (s) =>
            s.pose === 'horizontal' ? { fit: 0.8, why: 'reclining body — bands own the type, columns belong to the body' } : null,
        plan: (s) => ({ cluster: 'center', mainLinePos: s.bands.bottom >= s.bands.top ? 'bottom' : 'above-head' }),
    },
];

/** Rank the precedents that fit this situation. Empty list = no strong
 *  precedent and the AI brief stands alone. */
export function recallPrecedents(s: Situation): PrecedentHit[] {
    const hits: PrecedentHit[] = [];
    for (const p of PRECEDENTS) {
        const r = p.fit(s);
        if (r && r.fit > 0) hits.push({ id: p.id, name: p.name, fit: r.fit, why: r.why, plan: p.plan(s) });
    }
    return hits.sort((a, b) => b.fit - a.fit);
}

// ---------------------------------------------------------------------------
// 3 · RECONCILER — the brief wins unless it contradicts a measurement
// ---------------------------------------------------------------------------

export interface ReconcileAudit {
    field: string;
    from: string;
    to: string;
    reason: string;
}

export interface Reconciliation {
    direction: ArtDirection;
    precedent: string;
    audit: ReconcileAudit[];
}

/** Merge the AI brief with the best precedents. Missing fields inherit
 *  from the top precedent; fields that CONTRADICT a measured finding are
 *  overridden and the override is recorded — the audit IS the reasoning. */
export function reconcile(s: Situation, hits: PrecedentHit[], ai?: ArtDirection | null): Reconciliation {
    const out: ArtDirection = { ...(ai ?? {}) };
    const audit: ReconcileAudit[] = [];
    const top = hits[0] ?? null;

    // (a) inheritance — anything the AI left unset, the precedent supplies
    if (top) {
        for (const [k, v] of Object.entries(top.plan) as Array<[keyof ArtDirection, unknown]>) {
            if (out[k] === undefined && v !== undefined) {
                (out as Record<string, unknown>)[k] = v;
                audit.push({ field: k, from: '(unset)', to: String(v), reason: `${top.id} supplies it (${top.why})` });
            }
        }
    }

    // (b) contradiction overrides — measured facts outrank the brief
    const flankCalm = (side: 'left' | 'right'): number => (side === 'left' ? s.bands.left : s.bands.right);
    const contradicts = (field: keyof ArtDirection, test: (v: unknown) => boolean, reason: string, fix: () => void): void => {
        const cur = (out as Record<string, unknown>)[field];
        if (cur !== undefined && test(cur)) {
            const from = String(cur);
            fix();
            audit.push({ field, from, to: String((out as Record<string, unknown>)[field]), reason });
        }
    };

    contradicts(
        'cluster',
        (v) => (v === 'left' && flankCalm('left') < 0.2) || (v === 'right' && flankCalm('right') < 0.2),
        'the chosen flank measured <20% calm — stacking there prints on the subject',
        () => {
            out.cluster = s.bands.left >= s.bands.right ? 'left' : 'right';
            if (s.pose === 'horizontal') out.cluster = 'center';
        },
    );
    contradicts(
        'cluster',
        (v) => (v === 'split' || out.treatment === 'symmetric') && (s.findings.some((f) => f.code === 'ASYMMETRIC_FLANKS') || !s.findings.some((f) => f.code === 'TWIN_FLANKS')),
        'split columns need BOTH flanks calm and balanced — asymmetric flanks force colonizing the calmer flank',
        () => {
            out.cluster = s.pose === 'horizontal' ? 'center' : s.bands.left >= s.bands.right ? 'left' : 'right';
            if (out.treatment === 'symmetric') out.treatment = 'strip';
        },
    );
    contradicts(
        'treatment',
        (v) => v === 'symmetric' && !s.findings.some((f) => f.code === 'TWIN_FLANKS'),
        'symmetric twins need both flanks calm and balanced — demoted to a single stack',
        () => {
            out.treatment = 'strip';
            out.cluster = s.pose === 'horizontal' ? 'center' : s.bands.left >= s.bands.right ? 'left' : 'right';
        },
    );
    contradicts(
        'cluster',
        (v) => v === 'center' && s.pose === 'upright' && s.bands.center < 0.35 && (s.bands.left >= 0.40 || s.bands.right >= 0.40),
        'center corridor is occupied by the subject — moving cluster to the calmer flank',
        () => {
            out.cluster = s.bands.left >= s.bands.right ? 'left' : 'right';
        },
    );
    contradicts(
        'mainLinePos',
        (v) => v === 'over-body' && out.treatment !== 'statement',
        'over-body is ONLY legal as an opaque statement plate — clean type moves to the calm band',
        () => {
            out.mainLinePos = s.bands.bottom >= s.bands.top ? 'bottom' : 'below-chin';
        },
    );
    contradicts(
        'mastheadDepth',
        (v) => v === 'front' && s.bands.top < 0.3,
        'a front masthead needs calm headroom — this photo reads dense up top (the behind sandwich instead)',
        () => {
            out.mastheadDepth = 'behind';
        },
    );

    return { direction: out, precedent: top ? top.id : '(no precedent — the brief stands alone)', audit };
}

// ---------------------------------------------------------------------------
// 4 · CRITIQUE LOOP — compose, taste, name the weak part, amend, retry
// ---------------------------------------------------------------------------

export interface CritiqueAttempt {
    attempt: number;
    seeds: number[];
    championSeed: number;
    score: number;
    parts: Record<ElectPart, number>;
    weakest: ElectPart | null;
    amendment: { field: string; to: string; reason: string } | null;
    /** the beam: every amendment considered this attempt + its best score */
    considered?: Array<{ amendment: string; score: number }>;
}

export interface CritiqueResult {
    direction: ArtDirection;
    championSeed: number;
    attempts: CritiqueAttempt[];
    verdicts: ElectVerdict[];
}

/** Weakest part → a deterministic plan amendment. The table IS the
 *  experience: each failure mode has one learned correction. */
const AMENDMENTS: Record<ElectPart, (s: Situation, d: ArtDirection) => { field: keyof ArtDirection; to: unknown; reason: string }> = {
    calm: (s) => ({
        field: 'cluster',
        to: s.pose === 'horizontal' ? 'center' : s.bands.left >= s.bands.right ? 'left' : 'right',
        reason: 'type landed on busy cells — move the stack to the calmest zone',
    }),
    hierarchy: () => ({ field: 'mastheadScale', to: 'monumental', reason: 'the ladder read polite — monumental masthead restores dominance' }),
    order: () => ({ field: 'mainLinePos', to: 'bottom', reason: 'the story read out of order — pin the feature to the floor band' }),
    margins: () => ({ field: 'badgeSpot', to: 'corner', reason: 'furniture hugged the edges — park the badge in the quiet corner' }),
    balance: (s) => ({
        field: 'cluster',
        to: s.bands.left >= s.bands.right ? 'left' : 'right',
        reason: 'text mass fought the calm field — align the stack with the calm side',
    }),
    shelter: () => ({ field: 'rail', to: false, reason: 'micro type sat in exposed cells — cut the rail, keep the dateline' }),
};

const GOOD_ENOUGH = 0.62;

/** Compose candidates per seed, taste them with the rubric, and when the
 *  champion is still poor, amend the plan against its weakest part and
 *  try again — bounded, deterministic, fully audited. */
export function runCritiqueLoop(opts: {
    situation: Situation;
    baseDirection: ArtDirection;
    grid: GridAnalysis;
    seeds: number[];
    composeCandidate: (dir: ArtDirection, seed: number) => ElectCandidate;
    maxAttempts?: number;
}): CritiqueResult {
    const maxAttempts = opts.maxAttempts ?? 3;
    let direction: ArtDirection = { ...opts.baseDirection };
    const attempts: CritiqueAttempt[] = [];
    let finalVerdicts: ElectVerdict[] = [];
    let championSeed = opts.seeds[0];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const evaluate = (dir: ArtDirection): { champion: ElectCandidate; verdicts: ElectVerdict[] } => {
            const cands = opts.seeds.map((seed) => opts.composeCandidate(dir, seed));
            return electChampion(cands, opts.grid);
        };
        const { champion, verdicts } = evaluate(direction);
        finalVerdicts = verdicts;
        championSeed = champion.seed;
        const best = verdicts[0];

        const parts = best.parts;
        const weakest = (Object.keys(parts) as ElectPart[]).reduce((w, k) => (parts[k] < parts[w] ? k : w), 'calm' as ElectPart);
        const record: CritiqueAttempt = {
            attempt,
            seeds: [...opts.seeds],
            championSeed: champion.seed,
            score: Math.round(best.total * 1000) / 1000,
            parts,
            weakest,
            amendment: null,
        };

        if (best.total >= GOOD_ENOUGH || attempt === maxAttempts) {
            attempts.push(record);
            break;
        }

        // THE BEAM — don't gamble on the named weakest part; trial EVERY
        // learned amendment, keep whichever direction scores best. Pure
        // math, so the beam is cheap: 6 amendments × 3 seeds per attempt.
        const considered: Array<{ amendment: string; score: number }> = [];
        let bestAmen: { field: keyof ArtDirection; to: unknown; reason: string; score: number; verdicts: ElectVerdict[]; championSeed: number } | null = null;
        for (const mk of Object.values(AMENDMENTS)) {
            const a = mk(opts.situation, direction);
            const trial = { ...direction, [a.field]: a.to } as ArtDirection;
            const ev = evaluate(trial);
            const score = Math.round(ev.verdicts[0].total * 1000) / 1000;
            considered.push({ amendment: `${String(a.field)}→${String(a.to)}`, score });
            if (!bestAmen || ev.verdicts[0].total > bestAmen.score) {
                bestAmen = { ...a, score: ev.verdicts[0].total, verdicts: ev.verdicts, championSeed: ev.champion.seed };
            }
        }
        record.considered = considered.sort((x, y) => y.score - x.score);
        record.amendment = bestAmen
            ? { field: String(bestAmen.field), to: String(bestAmen.to), reason: bestAmen.reason }
            : null;
        attempts.push(record);
        if (!bestAmen) break;
        direction = { ...direction, [bestAmen.field]: bestAmen.to } as ArtDirection;
        finalVerdicts = bestAmen.verdicts;
        championSeed = bestAmen.championSeed;
    }

    return { direction, championSeed, attempts, verdicts: finalVerdicts };
}

/** Convenience: build an ElectCandidate from a composed cover's text specs.
 *  `platedIds` marks texts that sit on opaque plates (plate-feature →
 *  box-feature…) so the calm rubric credits them their legal floor. */
export function candidateFrom(
    seed: number,
    label: string,
    texts: Array<Record<string, unknown>>,
    platedIds?: Set<string>,
): ElectCandidate {
    return {
        seed,
        label,
        boxes: texts.map((t) => {
            const spec = {
                id: String(t.id ?? ''),
                text: String(t.text ?? ''),
                fitToWidth: Boolean(t.fitToWidth),
                widthPct: Number(t.widthPct ?? 40),
                heightPct: Number(t.heightPct ?? 3),
                letterSpacingEm: Number(t.letterSpacingEm ?? 0),
                caseMode: String(t.caseMode ?? 'uppercase'),
                rotationDeg: Number(t.rotationDeg ?? 0),
                depth: String(t.depth ?? 'front'),
                xPct: Number(t.xPct ?? 0.5),
                yPct: Number(t.yPct ?? 0.5),
            };
            const plated = platedIds?.has(spec.id) || undefined;
            return { ...spec, ...specBox(spec), ...(plated ? { plated: true } : {}) };
        }),
    };
}
