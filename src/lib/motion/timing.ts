/**
 * Motion as Code — word-level timing index (wordOf / lineOf)
 * ==========================================================
 * The Motion-as-Code paradigm anchors every animation to the VOICEOVER,
 * never to hardcoded second values. Instead of `animateAt(4.2)` you write:
 *
 *     const trigger = index.wordOf("bottleneck");
 *     ... progressSince(t, trigger.start, 0.6)
 *
 * This module turns the aligned cue track produced by the captions
 * pipeline (Whisper word timestamps + the script aligner — this repo's
 * equivalent of the blueprint's `data/word_timings.json`) into a flat,
 * queryable index of every spoken word.
 *
 * Re-record the voiceover with different pacing → re-run alignment → every
 * scene re-syncs automatically. No keyframe numbers to adjust.
 */

import type { SubtitleCue } from '@/lib/captions/vtt-formatter';
import { cleanStageDirections } from '@/lib/captions/vtt-formatter';
import { clamp01 } from './easing';

/** One spoken word with exact acoustic start/end (seconds). */
export interface WordTiming {
    /** The word as transcribed (may carry punctuation). */
    word: string;
    /** Normalized form used for matching (lowercase, punctuation stripped). */
    clean: string;
    start: number;
    end: number;
    /** Global index across the whole track. */
    index: number;
    /** Index of the source cue this word belongs to. */
    cueIndex: number;
}

/** A contiguous span of spoken words (a phrase / "line"). */
export interface LineTiming {
    text: string;
    start: number;
    end: number;
    words: WordTiming[];
}

/** Normalize a word for matching: lowercase, strip punctuation & quotes. */
export function normalizeWord(w: string): string {
    return w
        .toLowerCase()
        .replace(/[^a-z0-9']/g, '')
        .replace(/^'+|'+$/g, '');
}

/**
 * Flat, ordered index of every spoken word in a cue track — the queryable
 * form of `word_timings.json`.
 */
export class WordTimingIndex {
    /** All spoken words in chronological order. */
    readonly words: readonly WordTiming[];

    private constructor(words: WordTiming[]) {
        this.words = words;
    }

    /**
     * Builds the index from aligned subtitle cues. Cues that carry exact
     * word timestamps use them directly; cues without them fall back to an
     * even spread across the cue span (after stage directions are
     * stripped). Words inside bracket cues like [HOOK]/[PAUSE 3s] are
     * never indexed.
     */
    static fromCues(cues: SubtitleCue[]): WordTimingIndex {
        const out: WordTiming[] = [];
        let index = 0;

        cues.forEach((cue, cueIndex) => {
            if (cue.words && cue.words.length > 0) {
                cue.words.forEach((w) => {
                    const clean = normalizeWord(w.word);
                    if (!clean) return;
                    out.push({
                        word: w.word,
                        clean,
                        start: w.start,
                        end: Math.max(w.start + 0.01, w.end),
                        index: index++,
                        cueIndex,
                    });
                });
            } else {
                const cleaned = cleanStageDirections(cue.text);
                if (!cleaned) return;
                const split = cleaned.split(/\s+/).filter(Boolean);
                if (split.length === 0) return;
                const dur = Math.max(0.08, cue.end - cue.start);
                const perWord = dur / split.length;
                split.forEach((w, i) => {
                    const clean = normalizeWord(w);
                    if (!clean) return;
                    out.push({
                        word: w,
                        clean,
                        start: cue.start + i * perWord,
                        end: cue.start + (i + 1) * perWord,
                        index: index++,
                        cueIndex,
                    });
                });
            }
        });

        return new WordTimingIndex(out);
    }

    /** Total spoken-track duration in seconds (0 when empty). */
    get duration(): number {
        return this.words.length > 0 ? this.words[this.words.length - 1].end : 0;
    }

    /**
     * Exact timing of a spoken word.
     *
     * Disambiguation for repeated words: pass an `occurrence` (0-based) —
     * `wordOf("code", 1)` is the SECOND time "code" is said — or prefer
     * [`lineOf`](./timing.ts) with surrounding context.
     *
     * @returns null when the word was never spoken (check spelling against
     *          the transcription; the aligner keeps the spoken form).
     */
    wordOf(word: string, occurrence: number = 0): WordTiming | null {
        const target = normalizeWord(word);
        if (!target) return null;
        let seen = 0;
        for (const w of this.words) {
            if (w.clean === target) {
                if (seen === occurrence) return w;
                seen++;
            }
        }
        return null;
    }

    /**
     * Timing of a contiguous spoken phrase, e.g.
     * `lineOf("without opening After Effects")`.
     *
     * Slides the phrase across the whole word track and returns the FIRST
     * contiguous match (normalization ignores case/punctuation). This is
     * the recommended disambiguator for repeated keywords.
     *
     * @returns null when the full phrase is not found contiguously.
     */
    lineOf(phrase: string): LineTiming | null {
        const tokens = phrase
            .split(/\s+/)
            .map(normalizeWord)
            .filter(Boolean);
        if (tokens.length === 0) return null;

        const n = tokens.length;
        for (let i = 0; i + n <= this.words.length; i++) {
            let ok = true;
            for (let k = 0; k < n; k++) {
                if (this.words[i + k].clean !== tokens[k]) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                const matched = this.words.slice(i, i + n);
                return {
                    text: matched.map((w) => w.word).join(' '),
                    start: matched[0].start,
                    end: matched[matched.length - 1].end,
                    words: matched,
                };
            }
        }
        return null;
    }

    /** The word being spoken at time `t` (inclusive bounds), else null. */
    wordAt(t: number): WordTiming | null {
        for (const w of this.words) {
            if (t >= w.start && t <= w.end) return w;
        }
        return null;
    }

    /** The next word whose onset is at or after `t` (else null). */
    nextWord(t: number): WordTiming | null {
        for (const w of this.words) {
            if (w.start >= t) return w;
        }
        return null;
    }

    /**
     * 0..1 progress through a word at time `t` (0 before, 1 after;
     * words shorter than 60 ms are treated as 60 ms so progress is finite).
     */
    progressOf(word: string | WordTiming, t: number): number {
        const w = typeof word === 'string' ? this.wordOf(word) : word;
        if (!w) return 0;
        const dur = Math.max(0.06, w.end - w.start);
        return clamp01((t - w.start) / dur);
    }

    /**
     * Most recent word ONSET at or before `t`, but only if it happened
     * within `maxAgeSec` — the standard query for decaying impulse
     * effects (impact shake, flash, zoom kick) triggered by speech:
     *
     *     const hit = index.onsetNear(t, 0.35);
     *     if (hit) impactShake(t - hit.start, { ... })
     */
    onsetNear(t: number, maxAgeSec: number): WordTiming | null {
        let best: WordTiming | null = null;
        for (const w of this.words) {
            if (w.start <= t && t - w.start <= maxAgeSec) {
                if (!best || w.start > best.start) best = w;
            }
            if (w.start > t) break; // words are chronological
        }
        return best;
    }
}
