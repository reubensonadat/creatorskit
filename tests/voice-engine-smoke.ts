/**
 * Smoke test for the voice matching engine improvements:
 * sentence leash, sequential anchor lock, burst-resistant WPM, and leap governor.
 * Run: npx tsx tests/voice-engine-smoke.ts
 */
import {
    isFuzzyMatch,
    numericValue,
    createVoiceMatchEngine,
    createWPMTracker,
    findBestPhraseMatch,
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

// ---------- 3. Hard Sentence Leash & Anti-Skip Protection ----------
const testScript = `welcome back creators today i am breaking down the exact 3 part framework
that doubled our audience in under 90 days first stop spending 80 percent of your
time on editing and only 20 percent on your packaging the thumbnail and the first
5 seconds determine 90 percent of your video reach`.split(/\s+/);

// 1-word far-away match should NOT match
const farSingleWord = findBestPhraseMatch(['editing'], testScript, 0, 6);
check('1-word far lookahead is gated (cannot match 20 words ahead)', farSingleWord === null);

// 1-word stop word should NOT match
const stopWordMatch = findBestPhraseMatch(['the'], testScript, 0, 6);
check('1-word stop word is suppressed from leaping ahead', stopWordMatch === null);

// 1-word adjacent distinctive word SHOULD match at immediate next word
const closeSingleWord = findBestPhraseMatch(['welcome'], testScript, 0, 6);
check('1-word close distinctive word matches within leash', closeSingleWord !== null && closeSingleWord.matchIndex === 0);

// ---------- 4. Burst-resistant WPM Tracker ----------
const tracker = createWPMTracker(135);
const startTime = Date.now();
tracker.update(2, 0.9, startTime + 100);
tracker.update(4, 0.9, startTime + 200);
tracker.update(6, 0.9, startTime + 300);
tracker.update(8, 0.9, startTime + 800);
check(`Rapid ASR bursts do not spike WPM to crazy numbers (WPM is ${tracker.wpm})`, tracker.wpm <= 160);

// ---------- 5. Sequential sentence-by-sentence progression on a real script ----------
const script = testScript;
const engine = createVoiceMatchEngine({ initialWpm: 135 });

// a) Sentence 1 start
let r = engine.process('welcome back creators'.split(' '), script);
check(`Sentence 1 start matched (got word ${r.matchIndex})`, r.matched && r.matchIndex === 2);

// b) Next phrase
r = engine.process('today i am breaking'.split(' '), script);
check(`Sentence 1 continuation matched (got word ${r.matchIndex})`, r.matched && r.matchIndex >= 3 && r.matchIndex <= 6);

// c) 1-2 stray words from future paragraphs must NOT skip paragraphs
const strayFarWords = ['packaging', 'the'];
const rStray = engine.process(strayFarWords, script);
check('1-2 stray words from future paragraphs are strictly blocked by leash', !rStray.matched || rStray.matchIndex <= 8);

// d) 4+ word distinctive phrase CAN safely catch up if the speaker intentionally skipped a sentence
const skippedSentence = ['stop', 'spending', '80', 'percent', 'of', 'your', 'time'];
const rCatchUp = engine.process(skippedSentence, script);
check(
  `4+ word distinctive anchor catches up to skipped sentence (got word ${rCatchUp.matchIndex})`,
  rCatchUp.matched && rCatchUp.matchIndex >= 22 && rCatchUp.matchIndex <= 28
);

// e) Monotonic forward progression
const before = engine.currentIndex;
r = engine.processAlternatives(
    [{ words: 'spending 80 percent of your time'.split(' '), rank: 0 }],
    script
);
check(
  `re-read echo does not regress position (before ${before}, after ${r.matchIndex})`,
  r.matchIndex >= before
);

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
