/**
 * Motion-as-code core smoke test — pure logic, no DOM required.
 *
 * Verifies the three pillars of the motion engine:
 *   1. Pure math is deterministic & bounded (easing / spring / shake).
 *   2. Word-timing queries (wordOf / lineOf / onsetNear) index the
 *      aligned cue track exactly like the blueprint's word_timings.json.
 *   3. The scene timeline + motion-blur accumulator time-step correctly.
 *
 * Run:  npx tsx tests/motion-core-smoke.ts
 */

import {
    clamp01,
    easeInOutSine,
    easeOutExpo,
    impactShake,
    progressSince,
    springScale,
} from '../src/lib/motion/easing';
import { MotionTimeline, accumulateMotionBlur } from '../src/lib/motion/timeline';
import { WordTimingIndex } from '../src/lib/motion/timing';
import type { SubtitleCue } from '../src/lib/captions/vtt-formatter';

let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string): void {
    if (cond) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        console.error(`  ✗ ${label}`);
    }
}

function approx(a: number, b: number, eps = 1e-9): boolean {
    return Math.abs(a - b) < eps;
}

// ── 1. Pure math ────────────────────────────────────────────────────────
console.log('[1] easing / spring / impact shake');

ok(easeInOutSine(0) === 0 && easeInOutSine(1) === 1, 'easeInOutSine endpoints are 0 and 1');
ok(approx(easeInOutSine(0.5), 0.5), 'easeInOutSine(0.5) = 0.5');
ok(easeOutExpo(0.5) > 0.9, 'easeOutExpo(0.5) explodes early (>0.9)');
ok(clamp01(-3) === 0 && clamp01(3) === 1 && clamp01(0.42) === 0.42, 'clamp01 clamps both sides');
ok(progressSince(5, 4, 2) === 0.5 && progressSince(3, 4, 2) === 0, 'progressSince windows & clamps');

ok(approx(springScale(0), 0.92), 'springScale(0) rests at 0.92');
ok(springScale(1) === 1 && springScale(2) === 1, 'springScale settles at exactly 1');
let peak = 0;
for (let i = 1; i < 100; i++) peak = Math.max(peak, springScale(i / 100));
ok(peak > 1.05 && peak < 1.35, `springScale overshoots once (~1.1-1.3), measured ${peak.toFixed(3)}`);
ok(springScale(0.37, 1.15) === springScale(0.37, 1.15), 'springScale is deterministic');

const dead = impactShake(-0.5);
ok(dead.x === 0 && dead.y === 0 && dead.rot === 0 && dead.envelope === 0, 'impactShake(negative age) is zero');
ok(impactShake(0.05).envelope > impactShake(0.2).envelope, 'impactShake envelope decays with age');
ok(impactShake(0).envelope === 1 && impactShake(0).x !== 0, 'impactShake(0) fires at full amplitude');
ok(impactShake(10).envelope < 0.001, 'impactShake is fully dead after long age');

// ── 2. Word timing index (wordOf / lineOf) ─────────────────────────────
console.log('[2] WordTimingIndex over aligned cues');

const cues: SubtitleCue[] = [
    {
        start: 0.0,
        end: 1.8,
        text: 'What if I told you',
        words: [
            { word: 'What', start: 0.0, end: 0.3 },
            { word: 'if', start: 0.32, end: 0.5 },
            { word: 'I', start: 0.52, end: 0.6 },
            { word: 'told', start: 0.62, end: 0.95 },
            { word: 'you', start: 0.97, end: 1.2 },
        ],
    },
    {
        start: 1.4,
        end: 3.0,
        text: 'code creates motion',
        words: [
            { word: 'code,', start: 1.42, end: 1.78 },
            { word: 'creates', start: 1.8, end: 2.2 },
            { word: 'motion', start: 2.22, end: 2.7 },
        ],
    },
    // No word timings → fallback even spread; stage directions stripped.
    { start: 3.2, end: 4.0, text: 'code it again [PAUSE 2s]' },
];

const index = WordTimingIndex.fromCues(cues);

ok(index.wordOf('code')?.start === 1.42, 'wordOf matches through punctuation ("code," → "code")');
ok(index.wordOf('code', 1)?.start === 3.2, 'wordOf occurrence disambiguates repeated words');
ok(index.wordOf('nonexistent') === null, 'wordOf returns null for unspoken words');
const line = index.lineOf('creates motion');
ok(line !== null && approx(line.start, 1.8) && approx(line.end, 2.7), 'lineOf spans contiguous phrases');
ok(index.lineOf('told you code') !== null, 'lineOf crosses cue boundaries');
ok(index.lineOf('you told') === null, 'lineOf rejects wrong order');
ok(index.wordAt(1.5)?.clean === 'code', 'wordAt finds the active word');
ok(approx(index.progressOf('code', 1.6), 0.5, 1e-9), 'progressOf computes 0..1 through the word');
ok(index.onsetNear(1.45, 0.35)?.clean === 'code', 'onsetNear finds the fresh word onset');
ok(index.onsetNear(2.6, 0.05) === null, 'onsetNear ignores stale onsets (impulse already dead)');
ok(index.onsetNear(1.42, 1.0)!.start === 1.42, 'onsetNear picks the LATEST onset ≤ t');
const paused = index.words.find((w) => w.clean === 'pause');
ok(paused === undefined, 'bracket stage directions are never indexed');
ok(approx(index.duration, 4.0), 'duration = end of the last word');

// ── 3. Timeline & motion blur accumulator ──────────────────────────────
console.log('[3] MotionTimeline & accumulateMotionBlur');

const timeline = new MotionTimeline();
const seen: Array<{ id: string; time: number; progress: number }> = [];
timeline
    .add({
        id: 'hook',
        start: 0,
        end: 2,
        draw: (_ctx, info) => seen.push({ id: 'hook', time: info.time, progress: info.progress }),
    })
    .add({
        id: 'problem',
        start: 2,
        end: 4,
        draw: (_ctx, info) => seen.push({ id: 'problem', time: info.time, progress: info.progress }),
    });

const fakeCtx = { globalAlpha: 1, save(): void { }, restore(): void { } } as unknown as CanvasRenderingContext2D;
seen.length = 0;
timeline.renderAt(fakeCtx, 1920, 1080, 1.0);
ok(seen.length === 1 && seen[0].id === 'hook' && seen[0].progress === 0.5, 'renderAt activates the right plate with eased progress');
seen.length = 0;
timeline.renderAt(fakeCtx, 1920, 1080, 3.9);
ok(seen.length === 1 && seen[0].id === 'problem' && approx(seen[0].progress, 0.95), 'second plate spans [2,4)');
seen.length = 0;
timeline.renderAt(fakeCtx, 1920, 1080, 9.0);
ok(seen.length === 0, 'plates are invisible outside their window');
ok(approx(timeline.duration, 4), 'timeline duration = latest plate end');
seen.length = 0;
timeline.renderAt(fakeCtx, 1920, 1080, 1.0);
timeline.renderAt(fakeCtx, 1920, 1080, 1.0);
ok(seen.length === 2, 'renderAt is re-entrant (pure evaluation, no dedup state)');

const alphas: number[] = [];
const times: number[] = [];
accumulateMotionBlur(fakeCtx, 1.0, 1 / 30, 4, (subT) => {
    alphas.push(fakeCtx.globalAlpha);
    times.push(subT);
});
ok(
    alphas.length === 4 && approx(alphas[0], 1) && approx(alphas[1], 0.5) && approx(alphas[2], 1 / 3),
    `progressive-mean alphas 1, 1/2, 1/3.. (got ${alphas.map((a) => a.toFixed(2)).join(', ')})`
);
ok(
    times.every((t) => t > 1.0 - 1 / 60 && t < 1.0 + 1 / 60),
    'sub-frames sampled inside the exposure window'
);
ok(times[0] < times[3], 'sub-frames are chronologically ordered');
ok(approx(fakeCtx.globalAlpha, 1), 'globalAlpha restored to 1 after accumulation');

alphas.length = 0;
accumulateMotionBlur(fakeCtx, 2.0, 1 / 30, 1, () => alphas.push(fakeCtx.globalAlpha));
ok(alphas.length === 1 && alphas[0] === 1, 'samples=1 (blur off) draws exactly once at frame time');

// ── verdict ─────────────────────────────────────────────────────────────
console.log(`\nmotion-core-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
