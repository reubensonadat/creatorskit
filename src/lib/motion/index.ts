/**
 * Motion as Code — shared engine core
 * ===================================
 * CreatorsKit's implementation of the "Motion as Code" blueprint: every
 * visual state is a deterministic pure function of time, S(t) = f(t), so
 * the live browser preview and the headless frame-stepped exporter render
 * identical pixels.
 *
 * - `easing`    — pure curves, springs, and decaying-sine impact shake
 * - `timing`    — word-level voiceover index (wordOf / lineOf) over the
 *                 aligned cue track (`word_timings.json` equivalent)
 * - `timeline`  — plate-based scene coordinator + sub-frame motion blur
 *                 accumulator
 */

export * from './easing';
export * from './timing';
export * from './timeline';
