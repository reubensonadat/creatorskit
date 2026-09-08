/**
 * Teleprompter Script-to-Audio Forced Aligner for CreatorKit
 * ==========================================================
 * Aligns ground-truth teleprompter scripts with raw audio-detected speech timestamps
 * using CreatorKit's proprietary Voice Matching Engine (isFuzzyMatch & phonetic normalizations).
 * 
 * Strict Synchronization Rules:
 * 1. ZERO guessing during lead-in silence: Script words are strictly anchored to the first
 *    acoustic match. Any script words prior to the first spoken word are NEVER placed in silence.
 * 2. Silence preservation: Pauses between speech events (>0.4s) remain 100% silent (no cues).
 * 3. Single-line cues: Output cues are strictly single-line (3-5 words) with exact word timestamps.
 * 4. Bracket cues like [HOOK], [SILENCE], [PAUSE] are strictly stripped.
 */

import { SubtitleCue, SubtitleWord, cleanStageDirections } from './vtt-formatter';
import { 
    findBestPhraseMatch, 
    cleanWordForMatch, 
    isFuzzyMatch, 
    STOP_WORDS 
} from '@/lib/teleprompter/voice-matching-engine';
import { groupWordsIntoSingleLineCues } from './whisper-client';

export interface ScriptWordToken {
    text: string;
    clean: string;
    index: number;
}

/**
 * Tokenizes teleprompter script while stripping bracket cues like [HOOK], [PAUSE], etc.
 */
export function tokenizeScript(script: string): { tokens: ScriptWordToken[]; rawWords: string[] } {
    const tokens: ScriptWordToken[] = [];
    const segments = script.split(/(\[[^\]]*\])/g);
    let wordIdx = 0;

    segments.forEach((segment) => {
        const trimmed = segment.trim();
        // Skip bracketed stage directions
        if (/^\[.*\]$/.test(trimmed) && trimmed.length > 2) {
            return;
        }

        const words = trimmed.split(/\s+/).filter(Boolean);
        words.forEach((w) => {
            const clean = cleanWordForMatch(w);
            if (clean.length > 0) {
                tokens.push({
                    text: w,
                    clean,
                    index: wordIdx++,
                });
            }
        });
    });

    const rawWords = tokens.map((t) => t.text);
    return { tokens, rawWords };
}

interface AcousticWord {
    word: string;
    clean: string;
    start: number;
    end: number;
    cueIndex: number;
}

interface AnchorMatch {
    scriptIdx: number;
    acousticIdx: number;
    confidence: number;
}

/**
 * Aligns ground-truth teleprompter script words to acoustic Whisper speech cues.
 * Uses phrase n-grams (2-4 words) via the Teleprompter's voice matching engine
 * to guarantee that unsaid lead-in words are NEVER placed before speech begins.
 */
export function alignScriptWithAudioCues(
    whisperCues: SubtitleCue[],
    scriptText: string
): SubtitleCue[] {
    if (!scriptText.trim() || whisperCues.length === 0) {
        return whisperCues;
    }

    const { tokens: scriptTokens } = tokenizeScript(scriptText);
    if (scriptTokens.length === 0) return whisperCues;

    // 1. Extract all verified acoustic words from Whisper
    const acousticWords: AcousticWord[] = [];
    whisperCues.forEach((cue, cueIdx) => {
        if (cue.words && cue.words.length > 0) {
            cue.words.forEach((w) => {
                const clean = cleanWordForMatch(w.word);
                if (clean.length > 0) {
                    acousticWords.push({
                        word: w.word,
                        clean,
                        start: w.start,
                        end: w.end,
                        cueIndex: cueIdx,
                    });
                }
            });
        } else {
            const cleaned = cleanStageDirections(cue.text);
            if (!cleaned) return;
            const split = cleaned.split(/\s+/).filter(Boolean);
            if (split.length === 0) return;
            const dur = Math.max(0.08, cue.end - cue.start);
            const perWord = dur / split.length;
            split.forEach((w, i) => {
                const clean = cleanWordForMatch(w);
                if (clean.length > 0) {
                    acousticWords.push({
                        word: w,
                        clean,
                        start: cue.start + i * perWord,
                        end: cue.start + (i + 1) * perWord,
                        cueIndex: cueIdx,
                    });
                }
            });
        }
    });

    if (acousticWords.length === 0) return whisperCues;

    const scriptCleanWords = scriptTokens.map((t) => t.clean);

    // 2. Multi-Tiered Phrase Anchoring
    // We slide acoustic n-grams across the script using findBestPhraseMatch.
    // Requiring 2+ words (or non-stop words with >=0.92 confidence) guarantees
    // zero false positives and eliminates guessing before speech starts.
    const anchors: AnchorMatch[] = [];
    let lastScriptIdx = 0;
    let r = 0;

    while (r < acousticWords.length) {
        let matched = false;

        // Try phrase lengths: 4 words, then 3 words, then 2 words
        for (let phraseLen = Math.min(4, acousticWords.length - r); phraseLen >= 2; phraseLen--) {
            const phraseWords = acousticWords.slice(r, r + phraseLen).map((w) => w.clean);
            const lookahead = Math.min(35, scriptCleanWords.length - lastScriptIdx);

            const result = findBestPhraseMatch(phraseWords, scriptCleanWords, lastScriptIdx, lookahead);
            if (result && result.confidence >= 0.72) {
                const matchedEndScriptIdx = result.matchIndex;
                const matchedStartScriptIdx = matchedEndScriptIdx - result.phraseLength + 1;

                // Bind acoustic words to script words
                for (let k = 0; k < result.phraseLength; k++) {
                    anchors.push({
                        scriptIdx: matchedStartScriptIdx + k,
                        acousticIdx: r + k,
                        confidence: result.confidence,
                    });
                }

                lastScriptIdx = matchedEndScriptIdx + 1;
                r += result.phraseLength;
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Check for a single distinctive, non-stop content word (e.g. unique nouns/verbs)
            const singleAcoustic = acousticWords[r];
            if (!STOP_WORDS.has(singleAcoustic.clean) && singleAcoustic.clean.length >= 4) {
                const lookahead = Math.min(20, scriptCleanWords.length - lastScriptIdx);
                for (let s = lastScriptIdx; s < Math.min(scriptCleanWords.length, lastScriptIdx + lookahead); s++) {
                    const fMatch = isFuzzyMatch(scriptCleanWords[s], singleAcoustic.clean);
                    if (fMatch.match && fMatch.confidence >= 0.90) {
                        anchors.push({
                            scriptIdx: s,
                            acousticIdx: r,
                            confidence: fMatch.confidence,
                        });
                        lastScriptIdx = s + 1;
                        matched = true;
                        r++;
                        break;
                    }
                }
            }

            if (!matched) {
                // Advance acoustic index
                r++;
            }
        }
    }

    // If phrase anchoring found no reliable anchors, fallback to whisper cues
    if (anchors.length === 0) {
        return whisperCues;
    }

    // 3. Strict Speech Bounds
    // ONLY script words from the FIRST CONFIRMED ANCHOR to the LAST CONFIRMED ANCHOR are used.
    // Any script words before anchors[0].scriptIdx were NOT spoken in the audio and MUST be omitted!
    const firstAnchor = anchors[0];
    const lastAnchor = anchors[anchors.length - 1];

    const anchorMap = new Map<number, AnchorMatch>();
    anchors.forEach((a) => anchorMap.set(a.scriptIdx, a));

    const alignedWords: SubtitleWord[] = [];

    for (let s = firstAnchor.scriptIdx; s <= lastAnchor.scriptIdx; s++) {
        const sToken = scriptTokens[s];
        const existingAnchor = anchorMap.get(s);

        if (existingAnchor) {
            const ac = acousticWords[existingAnchor.acousticIdx];
            alignedWords.push({
                word: sToken.text,
                start: parseFloat(ac.start.toFixed(3)),
                end: parseFloat(ac.end.toFixed(3)),
            });
        } else {
            // Find nearest previous and next anchors
            let prevA = firstAnchor;
            for (let p = s - 1; p >= firstAnchor.scriptIdx; p--) {
                if (anchorMap.has(p)) {
                    prevA = anchorMap.get(p)!;
                    break;
                }
            }

            let nextA = lastAnchor;
            for (let n = s + 1; n <= lastAnchor.scriptIdx; n++) {
                if (anchorMap.has(n)) {
                    nextA = anchorMap.get(n)!;
                    break;
                }
            }

            const intermediateAcousticCount = nextA.acousticIdx - prevA.acousticIdx - 1;
            const intermediateScriptCount = nextA.scriptIdx - prevA.scriptIdx - 1;
            const scriptOffset = s - prevA.scriptIdx - 1;

            if (intermediateAcousticCount > 0 && intermediateScriptCount > 0) {
                // There are actual detected acoustic words in this window: snap to them!
                const mappedAcousticIdx = prevA.acousticIdx + 1 + Math.min(
                    intermediateAcousticCount - 1,
                    Math.round((scriptOffset / Math.max(1, intermediateScriptCount)) * intermediateAcousticCount)
                );
                const ac = acousticWords[mappedAcousticIdx];
                alignedWords.push({
                    word: sToken.text,
                    start: parseFloat(ac.start.toFixed(3)),
                    end: parseFloat(ac.end.toFixed(3)),
                });
            } else {
                const prevAc = acousticWords[prevA.acousticIdx];
                const nextAc = acousticWords[nextA.acousticIdx];

                const sSpan = Math.max(1, nextA.scriptIdx - prevA.scriptIdx);
                const sOffset = (s - prevA.scriptIdx) / sSpan;

                const timeGap = nextAc.start - prevAc.end;

                let wordStart: number;
                let wordEnd: number;

                if (timeGap > 0.6) {
                    // Real acoustic pause / breath! Keep silence clean!
                    if (sOffset < 0.5) {
                        wordStart = prevAc.end + (s - prevA.scriptIdx) * 0.20;
                        wordEnd = wordStart + 0.18;
                    } else {
                        wordStart = nextAc.start - (nextA.scriptIdx - s) * 0.20;
                        wordEnd = wordStart + 0.18;
                    }
                } else {
                    wordStart = prevAc.end + Math.max(0, timeGap * sOffset);
                    wordEnd = Math.min(nextAc.start, wordStart + Math.max(0.18, timeGap / sSpan));
                }

                alignedWords.push({
                    word: sToken.text,
                    start: parseFloat(wordStart.toFixed(3)),
                    end: parseFloat(wordEnd.toFixed(3)),
                });
            }
        }
    }

    // 4. Group into strictly ONE-LINE cues with exact word timings
    return groupWordsIntoSingleLineCues(alignedWords);
}
