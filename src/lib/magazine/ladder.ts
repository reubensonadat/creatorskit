// ladder.ts — §4 the type ladder: hierarchy solved, never inherited.
// Class ratios, capacity scaling, the scale-exaggeration branch, and
// the monotonicity law that makes tiny-text covers impossible.

import { clamp } from './units';
import type { SolverRole } from './copy';
// §4 · THE TYPE LADDER — hierarchy is solved, never inherited. The style's
//      class sets the base rungs; the chosen zone's capacity scales them;
//      a monotonicity pass enforces the visual law: every rung steps down
//      by a clear ratio, masthead to teaser, or the ladder is wrong.
// ===========================================================================

export interface TypeLadder {
    masthead: number;
    feature: number;
    sub: number;
    teaser: number;
    dateline: number;
    /** the breath gap between stack rungs, as a fraction of canvas height */
    breath: number;
}

/** Style classes — the two dials that actually differ between houses. */
interface StyleClass {
    /** base masthead cap height, PERCENT */
    masthead: number;
    /** feature rung when it leads a stack vs when it is a plated statement */
    featureStack: number;
    featureStatement: number;
    /** global tracking character */
    tracking: number;
}

const CLASSIC_CLASS: StyleClass = {
    masthead: 16,
    featureStack: 3.4,
    featureStatement: 5.2,
    tracking: 0.08,
};

const DISPLAY_CLASS: StyleClass = {
    masthead: 18,
    featureStack: 4.6,
    featureStatement: 7,
    tracking: -0.02,
};

const SERIF_CLASS: StyleClass = {
    masthead: 15,
    featureStack: 3.2,
    featureStatement: 4.8,
    tracking: 0.1,
};

const styleClassOf = (style: string): StyleClass => {
    switch (style) {
        case 'vogue':
        case 'bazaar':
            return SERIF_CLASS;
        case 'zine':
        case 'dazed':
        case 'cyber':
            return DISPLAY_CLASS;
        default:
            return CLASSIC_CLASS;
    }
};

/**
 * Solve the ladder for a chosen cluster zone and signature.
 * `zoneH` is the cluster zone's height as a FRACTION (0–1); the stack's
 * total ink must fit inside it with breath gaps, and every rung must
 * step down from its neighbour by at least the monotonic ratios below.
 */
const LADDER_MONO = { mastheadOverFeature: 2.1, featureOverSub: 1.45, subOverTeaser: 1.12 };

const solveTypeLadder = (
    style: string,
    clusterZoneH: number,
    statement: boolean,
    overrides: Partial<Record<SolverRole, number>> | undefined,
): TypeLadder => {
    const cls = styleClassOf(style);
    let feature = statement ? cls.featureStatement : cls.featureStack;
    let sub = feature * 0.55;
    let teaser = sub * 0.82;
    const masthead = cls.masthead;
    const dateline = 1.9;

    // Capacity: the stack (feature + sub + teaser rows) plus breaths must
    // fit 88% of the zone's height. If it cannot, scale the whole stack
    // down together — hierarchy is ratio, not absolute size.
    const breath = 0.022;
    const stackH = (feature + sub + teaser) / 100 + 2 * breath;
    const capacity = clamp(clusterZoneH, 0.12, 0.9) * 0.88;
    if (stackH > capacity) {
        const k = capacity / stackH;
        feature *= k;
        sub *= k;
        teaser *= k;
    } else if (stackH < capacity * 0.72) {
        // GESTALT · SCALE EXAGGERATION — "if it doesn't stand out,
        // exaggerate the scale." The down-fit above is only half the
        // law: a stack that fits timidly inside generous whitespace
        // reads PLAIN. When the zone affords headroom (stack under
        // 72% of capacity), the ladder GROWS to claim 86% of it —
        // bounded by the class's statement ceiling so quiet genres
        // never shout past their register. The masthead follows via
        // the return-line dominance law, so the WHOLE ladder towers.
        const ceiling = statement ? cls.featureStatement : cls.featureStack;
        const k = Math.min((capacity * 0.86) / stackH, ceiling / feature);
        feature *= k;
        sub *= k;
        teaser *= k;
    }

    // Monotonicity — the law, enforced after all other forces.
    sub = Math.min(sub, feature / LADDER_MONO.featureOverSub);
    teaser = Math.min(teaser, sub / LADDER_MONO.subOverTeaser);
    feature = Math.max(feature, sub * LADDER_MONO.featureOverSub);
    if (overrides) {
        if (overrides.feature != null) feature = overrides.feature;
        if (overrides.sub != null) sub = Math.min(overrides.sub, feature / LADDER_MONO.featureOverSub);
        if (overrides.teasers != null) teaser = Math.min(overrides.teasers, sub / LADDER_MONO.subOverTeaser);
        if (overrides.masthead != null) {
            // A preset may tower the masthead, but never below the law.
            const floor = feature * LADDER_MONO.mastheadOverFeature;
            const wanted = overrides.masthead;
            // feature could exceed `floor` if presets forced a small masthead;
            // in that case feature yields instead — the brand always wins.
            if (wanted < floor) feature = Math.min(feature, wanted / LADDER_MONO.mastheadOverFeature);
        }
    }

    return {
        masthead: Math.max(overrides?.masthead ?? masthead, feature * LADDER_MONO.mastheadOverFeature),
        feature: Math.round(feature * 100) / 100,
        sub: Math.round(sub * 100) / 100,
        teaser: Math.round(teaser * 100) / 100,
        dateline,
        breath,
    };
};

// ===========================================================================
export { solveTypeLadder, styleClassOf, LADDER_MONO };
export type { StyleClass };
