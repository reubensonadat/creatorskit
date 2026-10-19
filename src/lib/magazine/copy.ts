// copy.ts — §3 semantics & copy fitness: the AI's only jurisdiction
// (it DESCRIBES), plus the line-width model that decides whether real
// words fit a real zone at a real rung.

import { clamp, clamp01 } from './units';
import type { ArtDirection } from './cover-system';

// §3 · SEMANTICS & COPY FITNESS — the AI's only jurisdiction. It describes
//      the photograph and (optionally) supplies the words; the engine
//      measures whether those words FIT the geometry it is about to
//      choose, before choosing it. Copy that cannot fit its zone at a
//      dignified size is a layout bug wearing a writer's hat.
// ===========================================================================

export interface SolverSemantics {
    summary?: string;
    genre?: string;
    mood?: string[];
    subjectFocus?: string;
    /** §6.5 — the AI's archetype read of the photo (it is trained on the
     *  anatomy): one of ARCHETYPES' ids. A hint, never a command — the
     *  style's own brand mapping wins ties, and geometry stays ours. */
    archetypeHint?: string;
    /** §7 — the AI's ART DIRECTION for the compositor: a validated menu
     *  pick (template / cluster / treatment / corners / rail) returned in
     *  the SAME analyze round trip. The AI calls the structure; the app's
     *  deterministic composer materializes the geometry. Never a
     *  coordinate — the sanitizer drops anything off-menu. */
    direction?: ArtDirection;
    /** §16 — the PHOTO PALETTE, three swatches (accentPrimary ·
     *  paperNeutral · inkDark) the vision model claims and the on-device
     *  pixel extractor measures. The harmonized set rides the same round
     *  trip as the direction; the composer inks its typography with the
     *  photo's own tones so type reads as PRINTED WITH the photograph,
     *  not stamped on it. Empty-string accent = monochrome photo. */
    swatches?: {
        accentPrimary: string;
        paperNeutral: string;
        inkDark: string;
    };
    /** §7.5 — the art director's one-line rationale for this edition's
     *  composition (≤120 chars, clamped server-side). Readout voice only —
     *  it never steers geometry. */
    note?: string;
    /** The edition's WORDS, written in the same breath as the analysis —
     *  the analyze route returns copy in the SAME round trip so the user
     *  never waits for a second call: genre-correct, photo-grounded,
     *  budget-clamped, fresh every read. The solver measures these words
     *  for fit before choosing geometry (§3 copy fitness). */
    copy?: {
        masthead?: string;
        dateline?: string;
        feature?: string;
        sub?: string;
        teasers?: string[];
        badge?: string;
        rail?: string;
    };
}

/** The editorial roles the engine places. Order = hierarchy rank. */
export type SolverRole = 'masthead' | 'dateline' | 'feature' | 'sub' | 'teasers' | 'badge' | 'scan';

const ROLE_RANK: Record<string, number> = {
    masthead: 0,
    feature: 1,
    sub: 2,
    teasers: 3,
    dateline: 4,
    badge: 5,
    scan: 6,
};

/** Optional real copy, so fitness is measured on the actual words. */
export type SolverCopy = Partial<Record<SolverRole, string>>;

/**
 * Width a single line of `chars` characters occupies at a given cap height,
 * in PERCENT of canvas width. Average editorial glyph advance ≈ 0.62 of
 * cap height; tracking adds em-fraction per character. This estimate is
 * the bridge between the writer's word count and the geometer's column.
 */
const estimateLineWidthPct = (chars: number, heightPct: number, trackingEm = 0): number =>
    chars * (0.62 + trackingEm) * heightPct;

/**
 * How the copy fits a zone: the scale factor (≤ 1) at which the longest
 * line fits the zone width, and the number of lines a wrapped block needs.
 * Returns null when no dignified fit exists (scale < 0.55 — the words are
 * simply too many for this whitespace; the cost matrix will feel it).
 */
const fitCopyToZone = (
    text: string,
    zoneWidthPct: number,
    heightPct: number,
    trackingEm = 0,
): { scale: number; lines: number } | null => {
    const rawLines = text.split('\n').filter((l) => l.trim().length > 0);
    if (!rawLines.length) return { scale: 1, lines: 1 };
    const longest = Math.max(...rawLines.map((l) => l.trim().length));
    const need = estimateLineWidthPct(longest, heightPct, trackingEm);
    const scale = clamp01(zoneWidthPct / Math.max(1e-6, need));
    if (scale < 0.55) return null;
    // Wrapped line count: total glyphs over what one zone line carries.
    const perLine = Math.max(4, Math.floor((longest * zoneWidthPct) / Math.max(1e-6, need)));
    const total = rawLines.reduce((acc, l) => acc + Math.max(1, Math.ceil(l.trim().length / perLine)), 0);
    return { scale, lines: clamp(total, 1, 6) };
};

/** The giant wordmark seed: the most typograph-able strong word in the
 *  semantics — 3–8 letters, alphabetic, punchy. */
const giantWordFrom = (semantics: SolverSemantics | null, copy: SolverCopy): string => {
    const src = `${copy.masthead ?? ''} ${semantics?.subjectFocus ?? ''} ${semantics?.summary ?? ''}`;
    const word = src
        .split(/\s+/)
        .map((w) => w.replace(/[^A-Za-z]/g, '').toUpperCase())
        .find((w) => w.length >= 3 && w.length <= 8);
    return word || 'PULSE';
};

// ===========================================================================
export { fitCopyToZone, giantWordFrom };
