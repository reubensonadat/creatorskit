// archetypes.ts — §6.5 the brand library: the 60-cover anatomy
// compiled. Ten canonical templates, six masthead brand-bands, the
// §4 decision logic on measured headroom/side-strips, crop inference.
// The brand is fixed; the photograph selects the composition.

import type { Grid } from './types';
import type { SystemStyleId } from './cover-system';
// §6.5 · THE ARCHETYPE SYSTEM — the structural analysis, compiled.
//      (Source: the 60-cover anatomy — seven atomic components, six
//      masthead positions, four masthead/subject strategies, six
//      coverline stacks, six crops, the quadrant rules, ten archetypes.)
//
//      THE RULING THAT ORGANIZES EVERYTHING BELOW:
//      A magazine cover is a FIXED BRAND SYSTEM (masthead position +
//      family + colour + barcode corner — chosen per BRAND, never per
//      issue) into which a VARIABLE COMPOSITION is dropped. The
//      photograph's negative space selects the composition; the brand
//      preset stays immutable. The solver FITS the brand to the photo —
//      it never invents brand identity per click.
// ===========================================================================

/** §2 — the six canonical masthead positions. */
export type MastheadPosition = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
/** §5 — the six coverline stack strategies. */
export type CoverlineStack = 'left' | 'right' | 'both-sym' | 'both-asym' | 'bottom' | 'top';
/** §6 — where the main cover line sits relative to the subject. */
export type MainLinePos = 'above-head' | 'below-chin' | 'side' | 'bottom' | 'over-body';
/** §9 — the six colour treatments. */
export type ColorTreatment =
    | 'bw'
    | 'duotone'
    | 'neutral-masthead'
    | 'colored-masthead'
    | 'mono-accent'
    | 'multi';
/** §10 — the five reserved special-issue signals. */
export type SpecialTreatment = 'frame' | 'badge' | 'banner' | 'inverted' | 'wrap';

/** §11 — one of the ~10 canonical cover templates. This IS a brand. */
export interface Archetype {
    id: string;
    name: string;
    /** §2 — brand-locked masthead position; never varies per issue */
    mastheadPosition: MastheadPosition;
    /** §3 — masthead type family; the genre signal before a word is read */
    mastheadFamily: 'didone' | 'slab' | 'geometric-sans' | 'grotesque' | 'script' | 'transitional-serif';
    /** §5 — coverline stack direction */
    stack: CoverlineStack;
    /** §6 — main line position relative to the subject */
    mainLine: MainLinePos;
    /** §9 — colour system */
    color: ColorTreatment;
    /** §10 — optional special-issue treatment (reserved punctuation) */
    special?: SpecialTreatment;
    /** §13 — barcode corner, opposite the text mass */
    barcodeCorner: 'BL' | 'BR';
    /** §12 — masthead-over-feature ratio override (rare equal/larger cases) */
    mastheadOverFeature?: number;
}

/** §11 · THE ARCHETYPE LIBRARY — the ten canonical templates. */
export const ARCHETYPES: Record<string, Archetype> = {
    'classic-vogue': {
        id: 'classic-vogue', name: 'Classic Vogue masthead-over-head',
        mastheadPosition: 'A', mastheadFamily: 'didone',
        stack: 'left', mainLine: 'below-chin', color: 'colored-masthead', barcodeCorner: 'BR',
    },
    'vogue-deep-layer': {
        id: 'vogue-deep-layer', name: 'Vogue deep-layer (celebrity override)',
        mastheadPosition: 'B', mastheadFamily: 'didone',
        stack: 'left', mainLine: 'below-chin', color: 'colored-masthead', barcodeCorner: 'BR',
    },
    'time-frame': {
        id: 'time-frame', name: 'TIME red-frame person-of-year',
        mastheadPosition: 'C', mastheadFamily: 'slab',
        stack: 'bottom', mainLine: 'above-head', color: 'bw', special: 'frame', barcodeCorner: 'BL',
    },
    'natgeo-frame': {
        id: 'natgeo-frame', name: 'National Geographic yellow border',
        mastheadPosition: 'C', mastheadFamily: 'geometric-sans',
        stack: 'top', mainLine: 'bottom', color: 'colored-masthead', special: 'frame', barcodeCorner: 'BR',
    },
    'bazaar-soft': {
        id: 'bazaar-soft', name: 'Bazaar soft-pink behind-subject',
        mastheadPosition: 'B', mastheadFamily: 'didone',
        stack: 'right', mainLine: 'side', color: 'duotone', barcodeCorner: 'BL',
    },
    'indie-minimal': {
        id: 'indie-minimal', name: 'Indie art-book minimal',
        mastheadPosition: 'D', mastheadFamily: 'grotesque',
        stack: 'left', mainLine: 'side', color: 'bw', barcodeCorner: 'BR',
    },
    'tabloid-stack': {
        id: 'tabloid-stack', name: 'Tabloid left-column stack',
        mastheadPosition: 'C', mastheadFamily: 'geometric-sans',
        stack: 'left', mainLine: 'over-body', color: 'mono-accent', barcodeCorner: 'BR',
    },
    'bottom-strip': {
        id: 'bottom-strip', name: 'Bottom-strip editorial',
        mastheadPosition: 'A', mastheadFamily: 'transitional-serif',
        stack: 'bottom', mainLine: 'bottom', color: 'neutral-masthead', barcodeCorner: 'BR',
    },
    'inverted-commemorative': {
        id: 'inverted-commemorative', name: 'Inverted / commemorative',
        mastheadPosition: 'F', mastheadFamily: 'slab',
        stack: 'top', mainLine: 'above-head', color: 'bw', special: 'inverted', barcodeCorner: 'BR',
    },
    'avant-garde': {
        id: 'avant-garde', name: 'Avant-garde art-director',
        mastheadPosition: 'B', mastheadFamily: 'display' as Archetype['mastheadFamily'],
        stack: 'left', mainLine: 'over-body', color: 'mono-accent', special: 'wrap', barcodeCorner: 'BL',
    },
};

/** Brand → archetype. The composer genre names a BRAND; the archetype
 *  is its anatomy. Two brands may share an archetype and differ by
 *  signature decorations (the house jewellery). */
export const ARCHETYPE_OF_STYLE: Partial<Record<SystemStyleId, string>> = {
    vogue: 'classic-vogue',
    zine: 'indie-minimal',
    kinfolk: 'bottom-strip',
    noir: 'time-frame',
    gq: 'tabloid-stack',
    dazed: 'avant-garde',
    natgeo: 'natgeo-frame',
    cyber: 'inverted-commemorative',
    vinyl: 'bazaar-soft',
    architectural: 'indie-minimal',
    food: 'classic-vogue',
    fragments: 'avant-garde',
    time: 'time-frame',
    eye: 'avant-garde',
    bazaar: 'bazaar-soft',
};

/** The composition the PHOTOGRAPH asks for (§4 decision logic, §7 crop
 *  inference, §8 quadrant rules) — measured, never guessed. */
export interface CompositionPlan {
    /** §4 — masthead/subject relationship the negative space supports */
    mastheadRel: 'front' | 'behind' | 'side';
    /** §5/§8 — where the coverline stack wants to live */
    stackSide: 'left' | 'right' | 'both' | 'bottom' | 'top';
    /** §7 — the subject crop the photo already is */
    crop: 'full-bleed' | 'three-quarter' | 'head-shoulders' | 'closeup' | 'vignette' | 'off-center';
    /** measured calm of the band above the subject's head (0–1) */
    headroom: number;
    /** measured calm of the outer left / right strips (0–1) */
    leftStrip: number;
    rightStrip: number;
    /** §8 — quadrants flat enough to own typography */
    empty: Array<'T' | 'B' | 'L' | 'R'>;
}

const meanOf = (a: Float32Array, from: number, to: number): number => {
    const i0 = Math.max(0, Math.floor(from * a.length));
    const i1 = Math.min(a.length, Math.ceil(to * a.length));
    if (i1 <= i0) return 0;
    let s = 0;
    for (let i = i0; i < i1; i++) s += a[i];
    return s / (i1 - i0);
};

/** §4's decision tree, on solver measurements:
 *  headroom? → masthead in front, in the top band (4.1).
 *  side strip? → whitespace strategy, masthead in the strip (4.3).
 *  neither? → overlay and let the plate physics carry legibility. */
export function inferComposition(g: Grid): CompositionPlan {
    const subjTop = g.subjectBox?.y0 ?? 0.3;
    const headroom = subjTop > 0.06 ? meanOf(g.rowProfile, 0, Math.min(subjTop, 0.35)) : 0.08;
    const leftStrip = meanOf(g.colProfile, 0, 0.24);
    const rightStrip = meanOf(g.colProfile, 0.76, 1);
    const empty: CompositionPlan['empty'] = [];
    if (meanOf(g.rowProfile, 0, 0.5) > 0.55) empty.push('T');
    if (meanOf(g.rowProfile, 0.5, 1) > 0.55) empty.push('B');
    if (meanOf(g.colProfile, 0, 0.5) > 0.55) empty.push('L');
    if (meanOf(g.colProfile, 0.5, 1) > 0.55) empty.push('R');

    const mastheadRel: CompositionPlan['mastheadRel'] =
        headroom > 0.5 ? 'front' : Math.max(leftStrip, rightStrip) > 0.55 ? 'side' : 'front';

    let stackSide: CompositionPlan['stackSide'];
    const L = empty.includes('L');
    const R = empty.includes('R');
    if (L && R) stackSide = 'both';
    else if (L) stackSide = 'left';
    else if (R) stackSide = 'right';
    else if (empty.includes('B')) stackSide = 'bottom';
    else if (empty.includes('T')) stackSide = 'top';
    else stackSide = 'bottom'; // dense photo: the §5.5 fallback strip

    const b = g.subjectBox;
    const bw = b ? b.x1 - b.x0 : 1;
    const bh = b ? b.y1 - b.y0 : 1;
    let crop: CompositionPlan['crop'] = 'head-shoulders';
    if (!b) crop = 'vignette';
    else if (bw < 0.38 && bh > 0.5) crop = 'closeup';
    else if (bh > 0.92) crop = 'full-bleed';
    else if (Math.abs((b.x0 + b.x1) / 2 - 0.5) > 0.14) crop = 'off-center';
    else if (bh > 0.62) crop = 'three-quarter';

    return { mastheadRel, stackSide, crop, headroom, leftStrip, rightStrip, empty };
}

/** §2 geometry — the brand band each masthead position owns. Units:
 *  x/y fractions, widthPct PERCENT — the house grammar. */
export interface MastheadBand {
    x: number;
    y: number;
    widthPct: number;
    rotationDeg: number;
    depth: 'front' | 'behind';
}

export function mastheadBand(pos: MastheadPosition, plan: CompositionPlan): MastheadBand {
    const side: 'left' | 'right' = plan.leftStrip >= plan.rightStrip ? 'left' : 'right';
    switch (pos) {
        case 'A':
            // Full-width over the subject — but §4.3: when there is no
            // headroom and a strip is calm, the whitespace strategy
            // moves the wordmark INTO the strip beside the subject.
            if (plan.headroom < 0.5 && Math.max(plan.leftStrip, plan.rightStrip) > 0.55) {
                return {
                    x: side === 'left' ? 0.27 : 0.73,
                    y: 0.115,
                    widthPct: 44,
                    rotationDeg: 0,
                    depth: 'front',
                };
            }
            return { x: 0.5, y: 0.095, widthPct: 92, rotationDeg: 0, depth: 'front' };
        case 'B':
            // The celebrity override — the wordmark sits BEHIND the
            // subject's head; legibility ≥70% is the plate system's job.
            return { x: 0.5, y: 0.095, widthPct: 92, rotationDeg: 0, depth: 'behind' };
        case 'C':
            // The news nameplate — compact, centered, newspaper voice.
            return { x: 0.5, y: 0.075, widthPct: 40, rotationDeg: 0, depth: 'front' };
        case 'D':
            // The indie corner anchor.
            return { x: 0.24, y: 0.08, widthPct: 44, rotationDeg: 0, depth: 'front' };
        case 'E':
            // The side-rail vertical — the whole top goes to the photo.
            return {
                x: side === 'left' ? 0.055 : 0.945,
                y: 0.5,
                widthPct: 58,
                rotationDeg: side === 'left' ? -90 : 90,
                depth: 'front',
            };
        case 'F':
            // The inverted commemorative — brand at the floor.
            return { x: 0.5, y: 0.925, widthPct: 70, rotationDeg: 0, depth: 'front' };
    }
}

/** Registry read for the UI: every brand template the engine knows. */
export function listArchetypes(): Archetype[] {
    return Object.values(ARCHETYPES);
}

// ===========================================================================
