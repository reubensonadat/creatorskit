/**
 * Motion as Code — pure easing & impulse math
 * ============================================
 * Every function here is a DETERMINISTIC PURE FUNCTION OF TIME:
 *     S(t) = f(t)
 *
 * The same call produces the identical value in the live browser preview
 * (60 FPS requestAnimationFrame loop) and in the headless deterministic
 * export (canvas-video-exporter stepping frame-by-frame). No wall clocks,
 * no Math.random(), no hidden state — that determinism is what makes the
 * two environments agree frame-for-frame.
 *
 * This module is the single source of truth for motion curves across the
 * studio suite (auto captions overlay, text match cut, text highlighter).
 */

// ── scalar helpers ──────────────────────────────────────────

/** Clamps any number into [0, 1]. */
export function clamp01(x: number): number {
    return Math.min(1, Math.max(0, x));
}

/** Clamps any number into [min, max]. */
export function clamp(x: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, x));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Inverse lerp: where `x` sits between `a` and `b`, as 0..1. */
export function invLerp(a: number, b: number, x: number): number {
    if (b === a) return 0;
    return clamp01((x - a) / (b - a));
}

/** Normalized 0..1 progression of `t` through a window starting at `start`. */
export function progressSince(t: number, start: number, duration: number): number {
    if (duration <= 0) return t >= start ? 1 : 0;
    return clamp01((t - start) / duration);
}

// ── easing curves ───────────────────────────────────────────

/** Smooth "S" ease-in-out (3t² − 2t³). */
export function smoothstep(t: number): number {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
}

/**
 * easeInOutSine — slow take-off → fast glide through the middle → gentle
 * settle. This is the natural hand-stroke curve used by the match-cut and
 * text-highlighter sweep timelines (0.5 − 0.5·cos(πx)).
 */
export function easeInOutSine(t: number): number {
    const x = clamp01(t);
    return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

/** Symmetric cubic ease-in-out — heavier feel than sine. */
export function easeInOutCubic(t: number): number {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Expo ease-out — an explosive start that settles almost instantly. */
export function easeOutExpo(t: number): number {
    const x = clamp01(t);
    return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

/** Back ease-out — slight anticipation overshoot past 1.0, then settle. */
export function easeOutBack(t: number): number {
    const x = clamp01(t);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ── springs & impacts ───────────────────────────────────────

/**
 * Damped harmonic spring scale for kinetic word entrances.
 * ONE quick overshoot (~1.28·intensity within the first ~18% of the word)
 * followed by a smooth elastic settle. Shared by every caption mode so the
 * "creator pop" feels identical in teleprompter and kinetic-pop studios.
 *
 * @param progress  0.0 (word onset) → 1.0 (word end)
 * @param intensity bounce factor (≈0.5–2.0; the studios default to ~1.15)
 */
export function springScale(progress: number, intensity: number = 1.1): number {
    if (progress <= 0) return 0.92;
    if (progress >= 1.0) return 1.0;
    // Lower frequency + faster decay than the old spring: one overshoot,
    // then rest — no visible wobble.
    const frequency = 7.0;
    const decay = 7.5;
    const amplitude = 0.16 * intensity;
    const springOffset = amplitude * Math.exp(-decay * progress) * Math.sin(frequency * progress * Math.PI);
    return Math.max(0.9, 1.0 + springOffset);
}

export interface ImpactShakeOptions {
    /** Peak horizontal displacement in px (already scaled by the caller). */
    amplitudePx?: number;
    /** Shake frequency in Hz. Higher = more violent chatter. */
    frequencyHz?: number;
    /** Exponential decay rate; amplitude falls to ~5% after 3/decay sec. */
    decayPerSec?: number;
    /** Peak rotation in radians (default ≈ 0.45° at full amplitude). */
    maxRotationRad?: number;
}

export interface ShakeVector {
    x: number;
    y: number;
    rot: number;
    /** Remaining envelope 0..1 (e^−decay·age) — useful for debug HUDs. */
    envelope: number;
}

/**
 * Decaying-sine impact shake — the classic "camera flinches when the word
 * lands" move. A pure function of the time elapsed since the trigger:
 *
 *     amplitude · e^(−λ·age) · sin(2π·f·age)
 *
 * X and Y run on slightly detuned phases so the jitter feels organic
 * instead of tracing a straight line. Deterministic: the same trigger time
 * always produces the exact same shake, preview and export alike.
 *
 * @param ageSec seconds since the impact trigger (negative → zero shake)
 */
export function impactShake(ageSec: number, opts: ImpactShakeOptions = {}): ShakeVector {
    const {
        amplitudePx = 10,
        frequencyHz = 26,
        decayPerSec = 14,
        maxRotationRad = 0.008,
    } = opts;

    if (ageSec < 0) return { x: 0, y: 0, rot: 0, envelope: 0 };

    const envelope = Math.exp(-decayPerSec * ageSec);
    if (envelope < 0.001) return { x: 0, y: 0, rot: 0, envelope };

    const phase = 2 * Math.PI * frequencyHz * ageSec;
    // Detuned second axis (×0.9, +1.7 rad) breaks the linear path.
    const x = amplitudePx * Math.cos(phase) * envelope;
    const y = amplitudePx * 0.6 * Math.cos(phase * 0.9 + 1.7) * envelope;
    const rot = maxRotationRad * Math.sin(phase + 0.6) * envelope;

    return { x, y, rot, envelope };
}
