// signatures.ts — §7 style signatures: the good parts of Gen IIb as
// DATA, with the ruling encoded — signatures DECORATE, they never
// re-cost geometry. Runtime preset registration lives here.

import type { SystemStyleId } from './cover-system';
import type { SolverRole } from './copy';
// §7 · STYLE SIGNATURES — the good parts of Gen IIb, as DATA. A signature
//      DECORATES the solved geometry; it never re-costs it, never moves a
//      coordinate the optimizer chose, and never flattens the ladder. The
//      Gen IIb failure mode — signature devices seizing the geometry — is
//      structurally impossible here: emitters receive the ladder and the
//      grid, and nothing with write access to placements.
//
//      PRESETS: styles beyond the composer's roster register at RUNTIME
//      under `preset:<name>` — see registerStyleSignature() and the guide
//      at the bottom of this file. The engine never needs a recompile to
//      learn a new house style.
// ===========================================================================

/** A style token: a composer genre, or a runtime-registered preset. */
export type SolverStyleToken = SystemStyleId | `preset:${string}`;

export interface GiantSpec {
    /** the word — defaults to the semantics' strongest word */
    word?: string;
    /** canvas width PERCENT the wordmark spans */
    widthPct?: number;
    /** canvas height PERCENT the wordmark towers */
    heightPct?: number;
    /** ghost opacity when the photo reads through the letters */
    opacity?: number;
    family?: string;
    weight?: number;
    tracking?: number;
    /** photo shows through the letterforms (type-as-mask look) */
    maskPhoto?: boolean;
}

export interface RailSpec {
    /** rail column centre, FRACTION 0-1 */
    x?: number;
    /** rail column width PERCENT */
    widthPct?: number;
    /** em-dash dividers between rail bands */
    dividers?: boolean;
    /** rail backdrop plate */
    backdrop?: boolean;
}

export interface CrosshairSpec {
    positions?: [number, number][];
    sizePct?: number;
    arm?: number;
}

export interface AccentSpec {
    color: string;
    xPct?: number;
    yPct?: number;
    wPct?: number;
    hPct?: number;
}

export interface FrameSpec {
    color: string;
    strokeW: number;
    inset?: number;
}

/** A house style's signature — everything the emitters need. */
export interface StyleSignature {
    giant?: boolean | GiantSpec;
    rail?: boolean | RailSpec;
    crosshairs?: boolean | CrosshairSpec;
    accent?: string | AccentSpec;
    frame?: FrameSpec;
    cornerTicks?: boolean; // RESERVED — never emitted (corner marks tried and rejected)
    mastheadFamily?: string;
    mastheadWeight?: number;
    /** per-role type rung overrides (heightPct PERCENT) — the ladder's
     *  monotonicity law still rules; overrides can only bend it so far */
    typeScale?: Partial<Record<SolverRole, number>>;
    /** how far placements may sit from the canvas heart */
    spread?: 'tight' | 'classic' | 'wide';
}

/** Fully-resolved signature — booleans normalized into spec objects. */
interface NormalizedSignature {
    giant: GiantSpec | null;
    rail: RailSpec | null;
    crosshairs: CrosshairSpec | null;
    accent: AccentSpec | null;
    frame: FrameSpec | null;
    cornerTicks: boolean;
    mastheadFamily?: string;
    mastheadWeight?: number;
    typeScale?: Partial<Record<SolverRole, number>>;
    spread: 'tight' | 'classic' | 'wide';
}

/**
 * The classic ten — tuned SUBTLE. These styles earned their names by
 * typography and placement, not by devices; their signatures are the
 * quiet ones (a frame, an accent, corner ticks). Anything louder belongs
 * to a registered preset.
 */
const SIGNATURES: Partial<Record<SystemStyleId, StyleSignature>> = {
    vogue: {},
    zine: {},
    kinfolk: { frame: { color: '#F7F6F0', strokeW: 1.5, inset: 0.04 } },
    noir: {},
    gq: {},
    dazed: {},
    natgeo: { frame: { color: '#D4AF37', strokeW: 1.5, inset: 0.05 } },
    cyber: {},
    vinyl: {},
    architectural: { frame: { color: '#FFFFFF', strokeW: 2, inset: 0.05 } },
};

/** Runtime preset registry — `preset:<name>` tokens live here. */
const PRESET_SIGNATURES = new Map<string, StyleSignature>();

/**
 * Register a preset signature at runtime. No engine edit, no recompile.
 *
 *   registerStyleSignature('preset:fragments', {
 *       giant: { heightPct: 88, widthPct: 74, maskPhoto: true },
 *       rail: { x: 0.875, widthPct: 18, dividers: true },
 *       crosshairs: { sizePct: 3 },
 *       accent: '#D94B28',
 *   });
 *
 * Throws on malformed tokens (must be `preset:` + a non-empty name) so a
 * typo'd preset fails at registration, never at layout time.
 */
export function registerStyleSignature(token: SolverStyleToken, signature: StyleSignature): void {
    if (!token.startsWith('preset:') || token.length <= 'preset:'.length) {
        throw new Error(`[solver] preset tokens must look like "preset:name" — got "${token}"`);
    }
    PRESET_SIGNATURES.set(token.slice('preset:'.length), signature);
}

/** Everything the engine can currently style — genres first, presets after. */
export function listStyleSignatures(): SolverStyleToken[] {
    return [
        ...(Object.keys(SIGNATURES) as SystemStyleId[]),
        ...[...PRESET_SIGNATURES.keys()].map((name) => `preset:${name}` as SolverStyleToken),
    ];
}

const normalizeGiant = (v: boolean | GiantSpec | undefined): GiantSpec | null =>
    typeof v === 'object' ? v : v ? { widthPct: 92, heightPct: 90, opacity: 0.14, maskPhoto: true, weight: 900, tracking: -0.03 } : null;
const normalizeRail = (v: boolean | RailSpec | undefined): RailSpec | null =>
    typeof v === 'object' ? v : v ? { x: 0.875, widthPct: 18, dividers: true, backdrop: false } : null;
const normalizeCross = (v: boolean | CrosshairSpec | undefined): CrosshairSpec | null =>
    typeof v === 'object' ? v : v ? { positions: [[0.08, 0.08], [0.92, 0.92]], sizePct: 3, arm: 0.018 } : null;
const normalizeAccent = (v: string | AccentSpec | undefined): AccentSpec | null =>
    v == null ? null : typeof v === 'string' ? { color: v, xPct: 0.24, yPct: 0.5, wPct: 12, hPct: 8 } : v;

const resolveSignature = (token: SolverStyleToken): NormalizedSignature => {
    const raw: StyleSignature | undefined = token.startsWith('preset:')
        ? PRESET_SIGNATURES.get(token.slice('preset:'.length))
        : SIGNATURES[token as SystemStyleId];
    const sig = raw ?? {};
    return {
        giant: normalizeGiant(sig.giant),
        rail: normalizeRail(sig.rail),
        crosshairs: normalizeCross(sig.crosshairs),
        accent: normalizeAccent(sig.accent),
        frame: sig.frame ?? null,
        cornerTicks: !!sig.cornerTicks,
        mastheadFamily: sig.mastheadFamily,
        mastheadWeight: sig.mastheadWeight,
        typeScale: sig.typeScale,
        spread: sig.spread ?? 'classic',
    };
};

// ===========================================================================
export { resolveSignature, SIGNATURES, PRESET_SIGNATURES };
export type { NormalizedSignature };
