// types.ts — the pipeline contracts. The Grid alias and the solved
// artifacts every stage trades in. Type-only: erased at runtime, so
// the type-level import cycle with laws/signatures is legal.

import type { TypeLadder } from './ladder';
import type { PhotoSwatches } from './swatches';
import type { SolverStyleToken, NormalizedSignature } from './signatures';
import type { DecorationShape } from './decorations';
import type { LayoutViolation } from './laws';
import type { GridAnalysis } from './field';
import type { CompositionPlan } from './archetypes';
type Grid = GridAnalysis;

export interface SolvedPlacement {
    role: string;
    zone: string;
    xPct: number;
    yPct: number;
    widthPct: number;
    rotationDeg: number;
    plate: boolean;
    depth: 'behind' | 'front';
    /** solved type rung (heightPct, PERCENT 0-100) — the ladder's word */
    heightPct?: number;
    /** ink polarity the physics chose for this placement */
    polarity?: 'ink' | 'plate';
    /** measured mean luminance under this placement (0-1) */
    zoneLum?: number;
}

export interface SolverResult {
    placements: SolvedPlacement[];
    style: SolverStyleToken;
    photoLight: boolean;
    decorations: DecorationShape[];
    violations: LayoutViolation[];
    seed: number;
    ladder: TypeLadder;
    /** k-best runners-up — hand these to "next layout" for instant variety */
    alternates: SolvedPlacement[][];
    /** §6.5 — the brand template that owned this solve, + its photo plan */
    archetype?: string;
    plan?: CompositionPlan;
    /** §16 — the harmonized photo palette that traveled with the semantics.
     *  Consumed downstream (plates, trace) even when geometry stands alone. */
    swatches?: PhotoSwatches;
}
export type PhotoFilterId =
    | 'none'
    | 'mono'
    | 'vintage'
    | 'noir'
    | 'editorial'
    | 'sepia'
    | 'faded'
    | 'cinematic'
    | 'analog'
    | 'cyber';

export type { Grid };
