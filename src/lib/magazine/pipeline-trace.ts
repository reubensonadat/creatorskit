// pipeline-trace.ts — §12.5 THE GLASS PIPELINE.
//
// One console readout of every decision the cover engine makes per click,
// so a bad cover can be blamed on the EXACT stage that made it:
//
//   1 · MEASURE   — the on-device vision math (what the AI was TOLD)
//   2 · AI BRIEF  — the model's art direction + the RAW model output
//   3 · SOLVER    — zones → Hungarian assignment → type ladder → laws
//   4 · COMPOSER  — the geometry materialization (every x/y/w/h)
//   5 · GUARANTEE — what the no-text-on-text pass actually moved
//
// The same snapshot is parked on window.__CK_TRACE__ — copy it from the
// DevTools console and paste it back with a GOOD/BAD verdict to close the
// feedback loop. Purely structural types: zero runtime imports, no cycles.

export interface TraceSemantics {
    summary?: string;
    genre?: string;
    mood?: string[];
    subjectFocus?: string;
    archetypeHint?: string;
    note?: string;
    direction?: {
        template?: string;
        cluster?: string;
        treatment?: string;
        mastheadDepth?: string;
        mainLinePos?: string;
        palette?: string;
        special?: string;
        scanCorner?: string;
        badgeSpot?: string;
        rail?: boolean;
        tone?: string;
        accent?: string;
        mastheadScale?: string;
        energy?: string;
        mastheadRot?: string;
        note?: string;
    };
    copy?: Record<string, unknown>;
}

export interface TracePlacement {
    role: string;
    zone: string;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct?: number;
    rotationDeg?: number;
    plate: boolean;
    depth: string;
}

export interface TraceSolver {
    seed: number;
    style: string;
    photoLight: boolean;
    archetype?: string;
    plan?: unknown;
    placements: TracePlacement[];
    violations: unknown[];
    decorations: unknown[];
    alternates?: unknown[][];
}

export interface TraceComposed {
    theme: string;
    style: string;
    archetype: string;
    text: unknown[];
    shapes: unknown[];
    photo?: unknown;
}

export interface TraceInput {
    analysis?: {
        headroom: number;
        leftSpace: number;
        rightSpace: number;
        bottomSpace: number;
        subjectX?: string;
        photoLight?: boolean;
        pose?: 'upright' | 'horizontal';
        subjectW?: number;
        subjectH?: number;
    } | null;
    semantics?: TraceSemantics | null;
    aiDebug?: { assignment?: unknown; facts?: string; vibe?: string; raw?: string } | null;
    solver?: TraceSolver | null;
    composed?: TraceComposed | null;
    composedMeta?: { style: string; seed: number } | null;
    guarantee?: { moved: Array<{ id: string; dxPct: number; dyPct: number }> } | null;
    brain?: {
        situation?: string;
        findings?: unknown[];
        precedents?: Array<{ id: string; name: string; fit: number }>;
        precedentUsed?: string;
        audit?: unknown[];
        attempts?: unknown[];
    } | null;
    settle?: Array<{ id: string; fromX: number; toX: number; gainedCalm: number }> | null;
    contrast?: Array<{ id: string; fromColor: string; toColor: string; bgLum: number }> | null;
}

const pct = (v: unknown): string =>
    typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v * 100)}%` : '?';

const f2 = (v: unknown): string =>
    typeof v === 'number' && Number.isFinite(v) ? v.toFixed(3) : '?';

/** Build the JSON-safe snapshot (also parked on window.__CK_TRACE__). */
export function buildCoverTrace(t: TraceInput): Record<string, unknown> {
    const a = t.analysis ?? null;
    const sem = t.semantics ?? null;
    const dbg = t.aiDebug ?? null;
    const s = t.solver ?? null;
    const c = t.composed ?? null;
    const g = t.guarantee ?? null;

    return {
        stamp: new Date().toISOString(),
        measure: a
            ? {
                headroom: pct(a.headroom),
                leftColumn: pct(a.leftSpace),
                rightColumn: pct(a.rightSpace),
                bottomBand: pct(a.bottomSpace),
                subjectSits: a.subjectX ?? 'center',
                photoReads: a.photoLight ? 'light' : 'dark',
                pose: a.pose ?? 'upright',
                subjectBox:
                    typeof a.subjectW === 'number' && typeof a.subjectH === 'number'
                        ? `${Math.round(a.subjectW * 100)}% × ${Math.round(a.subjectH * 100)}%`
                        : null,
            }
            : null,
        aiBrief: sem
            ? {
                summary: sem.summary ?? '',
                genre: sem.genre ?? '',
                archetypeHint: sem.archetypeHint ?? '(dropped — free solve)',
                note: sem.note ?? '',
                direction: sem.direction ?? {},
                copy: sem.copy ?? {},
                assignmentRoll: dbg?.assignment ?? null,
                factsSentToModel: dbg?.facts ?? '',
                vibeInput: dbg?.vibe ?? '',
                rawModelOutput: dbg?.raw ?? '',
            }
            : null,
        solver: s
            ? {
                seed: s.seed,
                styleToken: s.style,
                photoLight: s.photoLight,
                archetype: s.archetype ?? '',
                plan: s.plan ?? {},
                placements: s.placements.map((p) => ({
                    role: p.role,
                    zone: p.zone,
                    x: f2(p.xPct),
                    y: f2(p.yPct),
                    wPct: Math.round(p.widthPct),
                    rungH: p.heightPct ?? null,
                    rot: p.rotationDeg ?? 0,
                    plate: p.plate,
                    depth: p.depth,
                })),
                violations: s.violations,
                decorationCount: s.decorations?.length ?? 0,
            }
            : null,
        composer: c
            ? {
                style: t.composedMeta?.style ?? c.style,
                seed: t.composedMeta?.seed ?? null,
                theme: c.theme,
                tags: c.archetype,
                photo: c.photo ?? {},
                texts: (c.text as Array<Record<string, unknown>>).map((x) => ({
                    id: String(x.id ?? ''),
                    text: String(x.text ?? ''),
                    x: f2(x.xPct),
                    y: f2(x.yPct),
                    wPct: Math.round(Number(x.widthPct ?? 0)),
                    hPct: x.heightPct ?? null,
                    depth: String(x.depth ?? ''),
                })),
                shapes: (c.shapes as Array<Record<string, unknown>>).map((x) => ({
                    id: String(x.id ?? ''),
                    kind: String(x.kind ?? ''),
                    x: f2(x.xPct),
                    y: f2(x.yPct),
                    wPct: Math.round(Number(x.wPct ?? 0)),
                    hPct: Math.round(Number(x.hPct ?? 0)),
                    label: x.label ? String(x.label) : undefined,
                })),
            }
            : null,
        guarantee: g ? { movedCount: g.moved.length, moved: g.moved } : null,
        brain: t.brain ?? null,
        settle: t.settle ?? null,
        contrast: t.contrast ?? null,
    };
}

const HDR = 'background:#7c3aed;color:#fff;padding:2px 6px;border-radius:3px;font-weight:700';
const STAGE = 'color:#7c3aed;font-weight:700';
const DIM = 'color:#888';

/** Print the full pipeline trace to the console (collapsed group) and
 *  park the snapshot on window.__CK_TRACE__ for copy-paste feedback. */
export function traceCoverPipeline(t: TraceInput): void {
    const snap = buildCoverTrace(t);
    try {
        (window as unknown as Record<string, unknown>).__CK_TRACE__ = snap;
    } catch {
        /* non-browser context — console only */
    }
    const c = console;
    c.groupCollapsed(
        '%c COVER ENGINE TRACE %c %s — report a bad cover: copy window.__CK_TRACE__',
        HDR,
        DIM,
        String((snap as Record<string, unknown>).stamp ?? ''),
    );

    // 0 · BRAIN — the deterministic reasoner (situation → precedents →
    // reconcile → critique). If a cover misfires, read WHY it planned.
    const br = snap.brain as Record<string, unknown> | null;
    if (br) {
        c.groupCollapsed('%c0 · BRAIN%c (situation → precedents → reconcile → critique)', STAGE, DIM);
        c.log('situation  :', br.situation);
        c.table(br.findings);
        c.log('precedents :');
        c.table(br.precedents);
        c.log('applied    :', br.precedentUsed);
        c.table(br.audit);
        c.log('critique   :');
        c.table(br.attempts);
        c.groupEnd();
    }

    // 1 · MEASURE — the on-device vision math.
    const m = snap.measure as Record<string, unknown> | null;
    if (m) {
        c.groupCollapsed('%c1 · MEASURE%c (on-device vision math — what the AI was told)', STAGE, DIM);
        c.table(m);
        c.groupEnd();
    }

    // 2 · AI BRIEF — the model's art direction + RAW output.
    const b = snap.aiBrief as Record<string, unknown> | null;
    if (b) {
        c.groupCollapsed('%c2 · AI BRIEF%c (the model’s art direction)', STAGE, DIM);
        c.log('summary   :', b.summary);
        c.log('genre     :', b.genre);
        c.log('archetype :', b.archetypeHint);
        c.log('note      :', b.note);
        c.log('direction :', b.direction);
        c.log('copy      :', b.copy);
        c.log('assignment roll (server):', b.assignmentRoll);
        c.log('facts sent to the model :', b.factsSentToModel);
        c.log('vibe input             :', b.vibeInput);
        if (b.rawModelOutput) {
            c.groupCollapsed('%cRAW MODEL OUTPUT%c (the vision analysis, unfiltered)', 'color:#c026d3;font-weight:700', DIM);
            c.log(String(b.rawModelOutput));
            c.groupEnd();
        }
        c.groupEnd();
    }

    // 3 · SOLVER — the optimizer's own words.
    const s = snap.solver as Record<string, unknown> | null;
    if (s) {
        c.groupCollapsed('%c3 · SOLVER%c (zones → Hungarian → ladder → laws)', STAGE, DIM);
        c.log('seed', s.seed, '· style', s.styleToken, '· archetype', s.archetype);
        c.log('plan:', s.plan);
        c.table(s.placements as unknown[]);
        const v = s.violations as unknown[];
        c.log(`violations: ${Array.isArray(v) ? v.length : 0}`, v);
        c.groupEnd();
    }

    // 4 · COMPOSER — the materialized geometry.
    const k = snap.composer as Record<string, unknown> | null;
    if (k) {
        c.groupCollapsed('%c4 · COMPOSER%c (the geometry that landed)', STAGE, DIM);
        c.log('style', k.style, '· seed', k.seed);
        c.log('theme:', k.theme);
        c.log('tags :', k.tags);
        c.log('photo:', k.photo);
        c.table(k.texts as unknown[]);
        c.table(k.shapes as unknown[]);
        c.groupEnd();
    }

    // 5 · GUARANTEE — what separation actually moved.
    const g = snap.guarantee as Record<string, unknown> | null;
    if (g) {
        c.groupCollapsed('%c5 · GUARANTEE%c (separation + settling + ink contrast)', STAGE, DIM);
        c.log(`moved ${g.movedCount} element(s):`, g.moved);
        const st = snap.settle as Array<{ id: string; fromX: number; toX: number; gainedCalm: number }> | null;
        if (st && st.length) {
            c.log(`calm-settled ${st.length} element(s) along x:`);
            c.table(st);
        }
        const ct = snap.contrast as Array<{ id: string; fromColor: string; toColor: string; bgLum: number }> | null;
        if (ct && ct.length) {
            c.log(`contrast-audit flipped ${ct.length} ink(s) — photo luminance under the text:`);
            c.table(ct);
        }
        c.groupEnd();
    }

    c.log(`%cVerdict loop:%c look at the cover → blame a stage → copy window.__CK_TRACE__ and send it with GOOD or BAD.`, DIM, '');
    c.groupEnd();
}
