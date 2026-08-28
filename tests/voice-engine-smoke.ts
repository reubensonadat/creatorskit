/**
 * Smoke test for the voice matching engine improvements:
 * multi-hypothesis scoring, number normalization, lost-tracking recovery.
 * Run: npx tsx tests/voice-engine-smoke.ts
 */
import {
    isFuzzyMatch,
    numericValue,
    createVoiceMatchEngine,
    type TranscriptHypothesis,
} from '../src/lib/teleprompter/voice-matching-engine';

let failures = 0;
function check(name: string, cond: boolean) {
    if (cond) {
        console.log(`PASS  ${name}`);
    } else {
        failures++;
        console.error(`FAIL  ${name}`);
    }
}

// ---------- 1. Number normalization ----------
check('numericValue("25") === 25', numericValue('25') === 25);
check('numericValue("twentyfive") === 25', numericValue('twentyfive') === 25);
check('numericValue("hundred") === 100', numericValue('hundred') === 100);
check('numericValue("twothousand") === 2000', numericValue('twothousand') === 2000);
check('numericValue("five") === 5', numericValue('five') === 5);

const numMatch = isFuzzyMatch('25', 'twentyfive');
check(`"25" matches "twentyfive" (conf ${numMatch.confidence.toFixed(2)})`, numMatch.match);
const numMatch2 = isFuzzyMatch('100', 'hundred');
check(`"100" matches "hundred" (conf ${numMatch2.confidence.toFixed(2)})`, numMatch2.match);

// ---------- 2. Ghanaian accent matching (regression) ----------
check('"this" matches "dis"', isFuzzyMatch('this', 'dis').match);
check('"water" matches "wata"', isFuzzyMatch('water', 'wata').match);
check('"three" matches "tree"', isFuzzyMatch('three', 'tree').match);
check('"ask" matches "hask" (h-add)', isFuzzyMatch('ask', 'hask').match);

// ---------- 3. Multi-hypothesis + recovery on a real-ish script ----------
const script = `welcome back creators today i am breaking down the exact 3 part framework
that doubled our audience in under 90 days first stop spending 80 percent of your
time on editing and only 20 percent on your packaging the thumbnail and the first
5 seconds determine 90 percent of your video reach`.split(/\s+/);

const engine = createVoiceMatchEngine({ initialWpm: 140 });

// a) Normal progression: primary hypothesis is correct
let r = engine.process('welcome back creators today i am'.split(' '), script);
check(`primary match at word 5 (got ${r.matchIndex})`, r.matched && r.matchIndex === 5);

// b) Multi-hypothesis: primary is garbage, alternative 2 is correct
const bad: TranscriptHypothesis[] = [
    { words: 'welcomb act creator today hi am'.split(' '), rank: 0 },
    { words: 'welcome bag creators to day i am'.split(' '), rank: 1 },
    { words: 'welcome back creators today i am breaking'.split(' '), rank: 2 },
];
r = engine.processAlternatives(bad, script);
check(`alt-hypothesis match advanced to "breaking" idx 6 (got ${r.matchIndex})`, r.matched && r.matchIndex === 6);

// c) Lost-tracking recovery: simulate 6s of no progress, then speak a phrase
//    that only exists ~25 words ahead of the current position.
const noise: TranscriptHypothesis[] = [
    { words: 'zzz qqq vvv xxx yyy'.split(' '), rank: 0 },
];
r = engine.processAlternatives(noise, script);
check('noise does not match', !r.matched);

async function main() {
    // Wait past RECOVERY_AFTER_MS (5s) then speak words far ahead of position
    await new Promise((res) => setTimeout(res, 5200));
    r = engine.processAlternatives(
        [{ words: 'the thumbnail and the first 5 seconds'.split(' '), rank: 0 }],
        script
    );
    check(
      `recovery re-anchored ahead at "seconds" idx 44 (got ${r.matchIndex})`,
      r.matched && r.matchIndex >= 42 && r.matchIndex <= 44
    );

    console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
