/**
 * Voice Matching Engine for CreatorKit Studio Teleprompter
 * ========================================================
 * Optimized for Ghanaian English accents & West African speech patterns.
 *
 * This engine takes the words output by the Web Speech API and matches them
 * against the teleprompter script in real time, producing:
 *   - The best matching script position (word index)
 *   - A confidence score (0..1) for the match
 *   - Adaptive words-per-minute (WPM) tracking for smooth scroll prediction
 *
 * Matching strategy stack (cheapest first, most expensive last):
 *   1. Exact match after accent normalization
 *   2. Ghanaian / Pidgin word-equivalence lookup (dis -> this, dem -> them...)
 *   3. Soundex phonetic matching (three -> tree)
 *   4. Prefix / suffix / substring containment
 *   5. Levenshtein distance similarity
 *   6. Character overlap (Jaccard)
 *
 * Phrase matching slides n-grams (1..4 words) of the spoken audio across a
 * forward search window of the script, weighting content words higher than
 * stop words, and prefers matches closest to the current reading position.
 */

// ============================================================
// TYPES
// ============================================================

export interface WordMatchResult {
    match: boolean;
    confidence: number;
    strategy: string;
}

export interface PhraseMatchResult {
    /** Index of the LAST matched word in the script */
    matchIndex: number;
    /** Weighted confidence 0..1 */
    confidence: number;
    /** How many words of the phrase matched */
    matchedWords: number;
    /** Length of the script n-gram that produced the best score */
    phraseLength: number;
}

export interface WPMTrackerState {
    wpm: number;
    lastTimestamp: number;
    lastIndex: number;
    samples: number;
}

export interface VoiceMatchEngineResult {
    matched: boolean;
    matchIndex: number;
    confidence: number;
    matchedWords: number;
    instantWpm: number | null;
    learnedWpm: number;
    delta: number;
}

export interface VoiceMatchEngineOptions {
    /** Minimum confidence to accept a phrase match (default 0.55) */
    confidenceThreshold?: number;
    /** Base forward search window in words (default 12) */
    baseLookahead?: number;
    /** Maximum forward search window when user is ahead (default 30) */
    maxLookahead?: number;
    /** Allow backward jumps when the speaker re-reads (default true) */
    allowBacktracking?: boolean;
    /** Initial learned WPM (default 140) */
    initialWpm?: number;
    /** Min plausible instant WPM (default 40) */
    minWpm?: number;
    /** Max plausible instant WPM (default 320) */
    maxWpm?: number;
}

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Stop words carry little matching signal. They are matched with a lower
 * weight in phrase scoring so that "the"/"a" mismatches do not derail
 * tracking of the surrounding content words.
 */
export const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
    'can', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'he',
    'her', 'hers', 'him', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
    'me', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'ours', 'she', 'so',
    'some', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
    'they', 'this', 'those', 'to', 'too', 'us', 'very', 'was', 'we', 'were',
    'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'will', 'with',
    'would', 'you', 'your', 'yours', 'am', 'ok', 'okay', 'uh', 'um', 'erm',
    'ah', 'eh', 'mm', 'hmm', 'like', 'right', 'yeah', 'yes',
]);

/**
 * Phonetic normalizations applied to BOTH the script word and the spoken
 * word before comparison. These capture consonant/vowel cluster confusions
 * common in Ghanaian English pronunciation and in how browsers transcribe
 * them (e.g. "three" -> "tree", "better" -> "beta").
 */
const PHONETIC_NORMALIZATIONS: Array<[RegExp, string]> = [
    [/^kn/, 'n'],        // know -> no
    [/^wr/, 'r'],        // write -> rite
    [/^ps/, 's'],        // psychology
    [/^pn/, 'n'],
    [/mb$/, 'm'],        // climb -> clim
    [/gh$/, ''],         // though -> thou
    [/^gh/, 'g'],        // ghost -> gost
    [/^x/, 'z'],         // xerox
    [/tion/g, 'shun'],   // education -> edukashun
    [/cious/g, 'shus'],  // precious
    [/tious/g, 'shus'],  // ambitious
    [/sion/g, 'shun'],   // mission
    [/ough/g, 'o'],      // though -> tho
    [/augh/g, 'af'],     // laugh -> laf
    [/eigh/g, 'ay'],     // eight -> ayte
    [/igh/g, 'y'],       // light -> lyte
    [/ph/g, 'f'],        // phone -> fone
    [/que/g, 'k'],       // unique ->unik
    [/ck/g, 'k'],        // back -> bak
    [/qu/g, 'kw'],
    [/x/g, 'ks'],        // box -> boks
    [/ce$/, 's'],        // dance -> dans
    [/se$/, 'z'],        // because -> becauz
    [/ee/g, 'i'],        // seen -> sin
    [/oo/g, 'u'],        // food -> fud
    [/ou/g, 'ow'],
    [/ai/g, 'ay'],       // wait -> wayt
    [/ay/g, 'ay'],
    [/oi/g, 'oy'],
    [/au/g, 'o'],        // pause -> poz
    [/aw/g, 'o'],        // law -> lo
    [/ew/g, 'u'],        // new -> nu
    [/ie/g, 'i'],        // believe -> biliv
    [/ei/g, 'ay'],
    [/ea/g, 'e'],        // read -> red
    [/ah/g, 'a'],        // Ghana -> Gana
    [/eh/g, 'e'],
    [/oh/g, 'o'],
    [/uh/g, 'u'],
    [/er$/, 'a'],        // better -> beta
    [/or$/, 'o'],        // for -> fo
    [/ar$/, 'a'],        // water -> wata
    [/y$/, 'i'],         // happy -> happi
    [/([a-z])\1/g, '$1'], // collapse doubles: letter -> leter
];

/**
 * Ghanaian English / West African Pidgin word equivalences.
 * Key = canonical English word (as it appears in scripts).
 * Values = common ASR transcriptions when spoken with a Ghanaian accent.
 * Lookup is bidirectional (built into VARIATION_LOOKUP below).
 */
const GHANAIAN_WORD_VARIATIONS: Record<string, string[]> = {
    // Pronouns & articles
    'the': ['de', 'di', 'd'],
    'this': ['dis'],
    'that': ['dat'],
    'these': ['dese'],
    'those': ['dose'],
    'them': ['dem'],
    'they': ['dey'],
    'their': 'der dem'.split(' '),
    'there': ['der', 'dey'],
    'is': ['na', 'e', 'bi'],
    'are': ['dey', 'na'],
    'was': ['bin'],
    'were': ['bin'],
    'am': ['na', 'dey'],
    'be': ['bi'],
    'been': ['bin'],
    'our': ['awa'],
    'your': ['yu', 'una'],
    'you': ['yu'],
    'it': ['e', 'am'],
    "it's": ['e', 'bi'],
    'we': ['wi'],
    'i': ['ay', 'a'],
    'my': ['may', 'ma'],
    'me': ['mi'],
    'to': ['tu'],
    'of': ['ov'],
    'and': ['an', 'n'],
    'with': ['wit', 'wiv'],
    'for': ['fo'],
    'from': ['fram'],
    'in': ['insaid'],
    'on': ['on', 'apon'],
    'what': ['wetin', 'wat', 'wot'],
    'why': ['wei', 'way'],
    'how': ['hau'],
    'who': ['hu', 'whu'],
    'where': ['wer', 'wea'],
    'when': ['wen', 'whea'],
    'which': ['wich'],
    'because': ['becos', 'bikos', 'cos', 'cuz'],
    'cannot': ['kant'],
    "can't": ['kant'],
    "don't": ['dont'],
    "doesn't": ['dasant'],
    "isn't": ['isant'],
    "won't": ['wont'],
    'not': ['nat'],
    'also': ['oso'],
    'always': ['olways', 'awiz'],
    'maybe': ['mebi'],
    'never': ['neva'],
    'ever': ['eva'],
    'every': ['evri', 'ere'],
    'everyone': ['evribodi'],
    'somebody': ['sambodi'],
    'nobody': ['nobodi'],
    'anybody': ['enibodi'],
    'everybody': ['evribodi'],

    // Common nouns with Ghanaian pronunciation
    'water': ['wata', 'watar'],
    'brother': ['broda', 'bro'],
    'sister': ['sista'],
    'mother': ['moda', 'mami'],
    'father': ['fada', 'papi'],
    'children': ['pikin', 'pikin-dem'],
    'child': ['pikin'],
    'family': ['famli'],
    'friend': ['frend', 'padi'],
    'friends': ['frendz', 'padis'],
    'people': ['pipul', 'pipol'],
    'person': ['pesin'],
    'money': ['moni'],
    'house': ['haus'],
    'government': ['goment'],
    'education': ['edukeshon'],
    'school': ['skul'],
    'church': ['chotch'],
    'work': ['wok'],
    'food': ['fud', 'chop'],
    'thing': ['tin'],
    'things': ['tins'],
    'something': ['samtin'],
    'anything': ['enitin'],
    'nothing': ['natin'],
    'everything': ['evritin'],
    'problem': ['problem', 'wahala'],
    'problems': ['wahala'],
    'market': ['maket'],
    'street': ['strit'],
    'road': ['rod'],
    'car': ['kor', 'moto'],
    'phone': ['fon'],
    'video': ['video', 'bidio'],
    'channel': ['chanal'],
    'picture': ['pichor'],
    'business': ['biznis'],
    'company': ['kampuni'],
    'country': ['kontri'],
    'ghana': ['gana'],
    'accra': ['akra'],
    'africa': ['afrika'],
    'nigeria': ['naija'],
    'world': ['wold'],
    'time': ['taym'],
    'year': ['yia'],
    'years': ['yias'],
    'day': ['dey'],
    'days': ['des'],
    'night': ['nait'],
    'morning': ['monin'],
    'evening': ['ivnin'],
    'week': ['wik'],
    'month': ['mont'],

    // Common verbs
    'eat': ['chop'],
    'eating': ['chop'],
    'go': ['go'],
    'going': ['goin', 'dey-go'],
    'goes': ['go'],
    'went': ['go'],
    'gone': ['go'],
    'come': ['kam'],
    'coming': ['comin', 'dey-kam'],
    'came': ['kam'],
    'want': ['wan'],
    'wants': ['wan'],
    'wanted': ['wan'],
    'know': ['no', 'kno'],
    'knows': ['no'],
    'knew': ['no'],
    'known': ['no'],
    'think': ['tink'],
    'thinks': ['tink'],
    'thank': ['tank'],
    'thanks': ['tanks'],
    'say': ['se'],
    'says': ['se'],
    'said': ['se'],
    'see': ['si'],
    'saw': ['si'],
    'seen': ['si'],
    'look': ['luk'],
    'hear': ['yia'],
    'heard': ['yia'],
    'understand': ['onastan', 'andastan'],
    'give': ['giv'],
    'gave': ['giv'],
    'take': ['tek'],
    'took': ['tek'],
    'taken': ['tek'],
    'make': ['mek'],
    'makes': ['mek'],
    'made': ['mek'],
    'get': ['get'],
    'got': ['get'],
    'put': ['put'],
    'let': ['let'],
    'tell': ['tel'],
    'told': ['tel'],
    'ask': ['ask', 'hask'],
    'asked': ['ask', 'hask'],
    'answer': ['ansa', 'hansa'],
    'call': ['kol'],
    'called': ['kol'],
    'talk': ['tok'],
    'talking': ['tokin'],
    'walk': ['wok'],
    'walking': ['wokin'],
    'working': ['wokin'],
    'watch': ['woch'],
    'watching': ['wochin'],
    'show': ['sho'],
    'start': ['stat'],
    'started': ['stat'],
    'stop': ['stop'],
    'help': ['hep'],
    'love': ['lav'],
    'live': ['liv'],
    'believe': ['biliv'],
    'learn': ['lon'],
    'teach': ['tich'],
    'buy': ['bay'],
    'sell': ['sel'],
    'build': ['bild'],
    'bring': ['brin'],
    'keep': ['kip'],
    'sleep': ['slip'],
    'speak': ['spik'],
    'read': ['rid'],
    'write': ['rayt'],
    'grow': ['gro'],
    'growing': ['groin'],
    'change': ['chenj'],
    'reach': ['rich'],
    'wash': ['wosh'],
    'wish': ['wish'],
    'use': ['yuz'],
    'used': ['yuzd'],

    // Common adjectives / adverbs
    'good': ['gud'],
    'bad': ['bad'],
    'big': ['big'],
    'small': ['smol'],
    'better': ['beta'],
    'best': ['bes'],
    'beautiful': ['butiful'],
    'nice': ['nais'],
    'fine': ['fain'],
    'great': ['gret'],
    'little': ['litol', 'likol'],
    'many': ['meni'],
    'much': ['moch'],
    'more': ['mor'],
    'most': ['mos'],
    'other': ['oda'],
    'another': ['anoda'],
    'only': ['onli'],
    'just': ['jos'],
    'even': ['ivin'],
    'again': ['agen'],
    'against': ['agenst'],
    'together': ['togeda', 'tgeda'],
    'already': ['oredi'],
    'please': ['pliz'],
    'sorry': ['sori'],
    'really': ['rili'],
    'very': ['veri', 'wella'],
    'quickly': ['kwik'],
    'slowly': ['slow'],
    'early': ['oli'],
    'late': ['layt'],
    'cheap': ['chip'],
    'strong': ['stron'],
    'young': ['yong'],
    'old': ['old'],
    'new': ['nu'],
    'true': ['tru'],
    'false': ['fols'],
    'happy': ['hapi'],
    'easy': ['izi'],
    'hard': ['had'],
    'own': ['on'],
    'same': ['sem'],
    'different': ['difren'],
    'important': ['importan'],
    'possible': ['posibl'],
    'serious': ['sirios'],
    'special': ['speshal'],
};

/**
 * Reverse lookup map: variation -> canonical word.
 * Built once at module load for O(1) access.
 */
const VARIATION_LOOKUP: Map<string, string> = (() => {
    const map = new Map<string, string>();
    for (const [canonical, variants] of Object.entries(GHANAIAN_WORD_VARIATIONS)) {
        const key = canonical.replace(/'/g, '');
        map.set(key, key);
        for (const variant of variants) {
            const v = variant.replace(/[^a-z]/g, '');
            if (v && !map.has(v)) map.set(v, key);
        }
    }
    return map;
})();

// ============================================================
// CORE UTILITIES
// ============================================================

/** Lowercase and strip punctuation from a word. */
export function cleanWordForMatch(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();
}

/**
 * Normalize a word for accent tolerance. Applies phonetic cluster
 * normalizations so that "three"/"tree" and "better"/"beta" collapse
 * to the same canonical form.
 */
export function normalizeForAccent(word: string): string {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return '';
    for (const [pattern, replacement] of PHONETIC_NORMALIZATIONS) {
        w = w.replace(pattern, replacement);
    }
    return w;
}

/**
 * Resolve a word to its canonical Ghanaian-English equivalent.
 * Returns the original (accent-normalized) word if no mapping exists.
 */
export function canonicalizeWord(word: string): string {
    const raw = word.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
    if (!raw) return '';
    const canonical = VARIATION_LOOKUP.get(raw);
    if (canonical) return normalizeForAccent(canonical);
    return normalizeForAccent(raw);
}

/** One ASR transcript hypothesis: a word list plus its rank/confidence. */
export interface TranscriptHypothesis {
    words: string[];
    /** 0 = primary Chrome hypothesis, 1+ = lower-ranked alternatives */
    rank: number;
    /** Chrome-provided confidence 0..1 when available */
    asrConfidence?: number;
}

/**
 * Number words for numeric equivalence matching. Lets "25" in the script
 * match "twentyfive" / "twenty five" in speech and vice versa.
 */
const NUMBER_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    million: 1000000,
};

/**
 * Parse a numeric value from a word or digit token.
 * Handles pure digits ("25"), simple number words ("five"), and
 * hyphenated/merged compounds ("twentyfive" -> 25, "onehundred" -> 100).
 */
export function numericValue(word: string): number | null {
    const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!w) return null;
    if (/^\d+(\.\d+)?$/.test(w)) return parseFloat(w);
    if (NUMBER_WORDS[w] !== undefined) return NUMBER_WORDS[w];

    // Compound: greedy two-part split (tens+units or units*scale)
    for (let i = 3; i <= w.length - 3; i++) {
        const head = w.slice(0, i);
        const tail = w.slice(i);
        const h = NUMBER_WORDS[head];
        const t = NUMBER_WORDS[tail];
        if (h !== undefined && t !== undefined) {
            if (h >= 20 && h <= 90 && t < 100) return h + t;   // twentyfive
            if (h < 10 && (t === 100 || t === 1000 || t === 1000000)) return h * t; // twothousand
        }
    }
    return null;
}

/**
 * Soundex phonetic code. Words that sound alike share a code,
 * e.g. "three" -> T600 and "tree" -> T600.
 */
export function soundex(word: string): string {
    if (!word) return '';

    const w = word.toUpperCase().replace(/[^A-Z]/g, '');
    if (w.length === 0) return '';

    const codes: Record<string, string> = {
        A: '', E: '', I: '', O: '', U: '', Y: '', H: '', W: '',
        B: '1', F: '1', P: '1', V: '1',
        C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
        D: '3', T: '3',
        L: '4',
        M: '5', N: '5',
        R: '6',
    };

    let result = w[0];

    for (let i = 1; i < w.length; i++) {
        const code = codes[w[i]] || '';
        const prevCode = codes[w[i - 1]] || '';
        if (code !== '' && code !== prevCode) {
            result += code;
        }
    }

    while (result.length < 4) result += '0';
    return result.substring(0, 4);
}

/**
 * Levenshtein edit distance using a memory-efficient two-row DP.
 * Capped at maxDistance for early exit when only a threshold matters.
 */
export function levenshteinDistance(
    str1: string,
    str2: string,
    maxDistance: number = Infinity
): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > maxDistance) return maxDistance + 1;

    let prevRow = new Array<number>(n + 1);
    let currRow = new Array<number>(n + 1);

    for (let j = 0; j <= n; j++) prevRow[j] = j;

    for (let i = 1; i <= m; i++) {
        currRow[0] = i;
        let rowMin = currRow[0];

        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,        // deletion
                currRow[j - 1] + 1,    // insertion
                prevRow[j - 1] + cost  // substitution
            );
            if (currRow[j] < rowMin) rowMin = currRow[j];
        }

        if (rowMin > maxDistance) return maxDistance + 1;

        const swap = prevRow;
        prevRow = currRow;
        currRow = swap;
    }

    return prevRow[n];
}

/** Jaccard overlap of the character sets of two strings. */
export function calculateOverlap(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase());
    const set2 = new Set(str2.toLowerCase());

    let intersection = 0;
    for (const char of set1) {
        if (set2.has(char)) intersection++;
    }

    const union = set1.size + set2.size - intersection;
    return union > 0 ? intersection / union : 0;
}

// ============================================================
// WORD-LEVEL FUZZY MATCHING
// ============================================================

/**
 * Ghanaian "h-drop / h-add" rule: Ghanaian English speakers frequently
 * drop or add a leading aspirate ("have" -> "ave", "ask" -> "hask").
 * If one word is exactly the other plus/minus a leading 'h' on a vowel,
 * treat it as a strong match.
 */
function matchesHRule(s1: string, s2: string): boolean {
    if (s1.length >= 2 && s2.length >= 2) {
        if (s1[0] === 'h' && s2[0] !== 'h' && s1.slice(1) === s2) return true;
        if (s2[0] === 'h' && s1[0] !== 'h' && s2.slice(1) === s1) return true;
    }
    return false;
}

/**
 * Compare a script word against a spoken word using the full strategy
 * stack. Returns a confidence score and which strategy produced it.
 *
 * Order matters: cheap, high-precision strategies run first.
 */
export function isFuzzyMatch(scriptWord: string, spokenWord: string): WordMatchResult {
    if (!scriptWord || !spokenWord) return { match: false, confidence: 0, strategy: 'empty' };

    const s1 = scriptWord.toLowerCase();
    const s2 = spokenWord.toLowerCase();

    // 1. Exact match
    if (s1 === s2) return { match: true, confidence: 1.0, strategy: 'exact' };

    // 1.5 Numeric equivalence ("25" <-> "twentyfive", "100" <-> "hundred")
    const num1 = numericValue(s1);
    const num2 = numericValue(s2);
    if (num1 !== null && num2 !== null && num1 === num2) {
        return { match: true, confidence: 0.97, strategy: 'numeric' };
    }

    // 2. Canonical Ghanaian equivalence (dis -> this, dem -> them)
    const c1 = canonicalizeWord(s1);
    const c2 = canonicalizeWord(s2);
    if (c1 && c2 && c1 === c2) {
        return { match: true, confidence: 0.96, strategy: 'ghanaian' };
    }

    // 3. Leading-h aspiration rule
    if (matchesHRule(s1, s2)) {
        return { match: true, confidence: 0.9, strategy: 'h-rule' };
    }

    // 4. Soundex phonetic match (three <-> tree)
    const soundex1 = soundex(s1);
    const soundex2 = soundex(s2);
    if (soundex1 && soundex2 && soundex1 === soundex2) {
        // Require some edit proximity too, to avoid false positives
        const dist = levenshteinDistance(c1, c2, 4);
        if (dist <= 4) {
            const nearness = 1 - dist / Math.max(c1.length, c2.length, 1);
            return { match: true, confidence: 0.82 + nearness * 0.06, strategy: 'soundex' };
        }
    }

    // 5. Prefix match (partial recognition of longer words)
    const prefixLen = Math.min(4, Math.min(s1.length, s2.length));
    if (prefixLen >= 3 && s1.slice(0, prefixLen) === s2.slice(0, prefixLen)) {
        const lenRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
        return { match: true, confidence: 0.78 * lenRatio + 0.12, strategy: 'prefix' };
    }

    // 6. Suffix match (word captured mid-way, start clipped)
    const suffixLen = Math.min(4, Math.min(s1.length, s2.length));
    if (suffixLen >= 3 && s1.slice(-suffixLen) === s2.slice(-suffixLen)) {
        const lenRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
        return { match: true, confidence: 0.72 * lenRatio + 0.1, strategy: 'suffix' };
    }

    // 7. Substring containment (ASR merged/split words)
    if (s1.length >= 5 && s2.length >= 3 && s1.includes(s2)) {
        return { match: true, confidence: 0.74, strategy: 'contains' };
    }
    if (s2.length >= 5 && s1.length >= 3 && s2.includes(s1)) {
        return { match: true, confidence: 0.74, strategy: 'contained' };
    }

    // 8. Levenshtein similarity
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen >= 3) {
        const allowedDist = maxLen <= 4 ? 1 : maxLen <= 6 ? 2 : 3;
        const distance = levenshteinDistance(c1 || s1, c2 || s2, allowedDist);
        if (distance <= allowedDist) {
            const similarity = 1 - distance / maxLen;
            if (similarity >= 0.65) {
                return { match: true, confidence: similarity * 0.88, strategy: 'levenshtein' };
            }
        }
    }

    // 9. Character overlap (last resort for longer words)
    if (maxLen >= 4) {
        const overlap = calculateOverlap(s1, s2);
        if (overlap >= 0.65) {
            return { match: true, confidence: overlap * 0.8, strategy: 'overlap' };
        }
    }

    return { match: false, confidence: 0, strategy: 'none' };
}

/** Weight of a word in phrase scoring: content words count more. */
function wordWeight(word: string): number {
    return STOP_WORDS.has(word) ? 0.35 : 1.0;
}

// ============================================================
// PHRASE MATCHING (n-gram sliding window)
// ============================================================

/**
 * Slide spoken n-grams (longest first) across a forward window of the
 * script starting at `startIndex`. Scores each candidate alignment by
 * weighted average confidence, with a proximity bonus for matches near
 * the current position (monotonic reading is the common case).
 *
 * Returns the best-scoring alignment, or null when nothing clears the
 * per-word match requirement.
 */
export function findBestPhraseMatch(
    spokenPhrase: string[],
    scriptWords: string[],
    startIndex: number,
    maxLookahead: number
): PhraseMatchResult | null {
    if (spokenPhrase.length === 0 || scriptWords.length === 0) return null;

    const spoken = spokenPhrase.map(cleanWordForMatch).filter(Boolean);
    if (spoken.length === 0) return null;

    let bestMatch: PhraseMatchResult | null = null;
    const start = Math.max(0, Math.min(startIndex, scriptWords.length - 1));

    // Try phrase lengths from longest (most signal) to shortest
    for (let phraseLen = Math.min(spoken.length, 4); phraseLen >= 1; phraseLen--) {
        // Align the END of the spoken n-gram with the script window
        const spokenSlice = spoken.slice(spoken.length - phraseLen);

        for (let offset = 0; offset <= maxLookahead; offset++) {
            const scriptStartIdx = start + offset;
            if (scriptStartIdx + phraseLen > scriptWords.length) break;

            let weightedConfSum = 0;
            let weightSum = 0;
            let matchCount = 0;

            for (let i = 0; i < phraseLen; i++) {
                const scriptWord = cleanWordForMatch(scriptWords[scriptStartIdx + i]);
                const spokenWord = spokenSlice[i];
                const weight = wordWeight(scriptWord || spokenWord);
                weightSum += weight;

                const result = isFuzzyMatch(scriptWord, spokenWord);
                if (result.match) {
                    matchCount++;
                    weightedConfSum += result.confidence * weight;
                }
            }

            if (matchCount === 0) continue;

            const avgConfidence = weightSum > 0 ? weightedConfSum / weightSum : 0;
            // Require at least half the words to match for multi-word phrases
            if (phraseLen > 1 && matchCount < Math.ceil(phraseLen / 2)) continue;

            // Proximity bonus: closer to current position = more likely correct
            const proximityBonus = Math.max(0, 1 - offset / (maxLookahead + 1)) * 0.08;
            const lengthBonus = (phraseLen - 1) * 0.04; // longer matches are stronger
            const finalConfidence = Math.min(1, avgConfidence + proximityBonus + lengthBonus);

            if (!bestMatch || finalConfidence > bestMatch.confidence) {
                bestMatch = {
                    matchIndex: scriptStartIdx + phraseLen - 1,
                    confidence: finalConfidence,
                    matchedWords: matchCount,
                    phraseLength: phraseLen,
                };
            }
        }
    }

    return bestMatch;
}

/**
 * Context-aware matching: like findBestPhraseMatch but with an adaptive
 * search window that widens when the speaker has jumped ahead (fast
 * reading / skipped words) and a small backward window for re-reads.
 */
export function findContextAwareMatch(
    spokenPhrase: string[],
    scriptWords: string[],
    currentIndex: number,
    options: {
        baseLookahead?: number;
        maxLookahead?: number;
        allowBacktracking?: boolean;
        recentDelta?: number;
    } = {}
): PhraseMatchResult | null {
    const {
        baseLookahead = 12,
        maxLookahead = 30,
        allowBacktracking = true,
        recentDelta = 0,
    } = options;

    if (spokenPhrase.length === 0 || scriptWords.length === 0) return null;

    // Widen the window when the user has recently been moving fast
    const speedFactor = Math.min(1, Math.max(0, recentDelta / 10));
    const lookahead = Math.round(baseLookahead + (maxLookahead - baseLookahead) * speedFactor);

    // Backward search: user re-read a sentence
    if (allowBacktracking) {
        const backWindow = Math.min(10, currentIndex);
        const backStart = Math.max(0, currentIndex - backWindow);
        if (backStart < currentIndex) {
            const backMatch = findBestPhraseMatch(spokenPhrase, scriptWords, backStart, backWindow - 1);
            // Only accept a backward match if it is clearly strong
            if (backMatch && backMatch.confidence >= 0.8) {
                return backMatch;
            }
        }
    }

    return findBestPhraseMatch(spokenPhrase, scriptWords, currentIndex, lookahead);
}

// ============================================================
// ADAPTIVE WPM TRACKER
// ============================================================

/**
 * Creates a tracker that learns the speaker's natural words-per-minute
 * using an exponential moving average. Outlier samples (pauses between
 * takes, recognition bursts) are rejected so the scroll prediction stays
 * stable.
 */
export function createWPMTracker(initialWpm: number = 140) {
    const state: WPMTrackerState = {
        wpm: initialWpm,
        lastTimestamp: 0,
        lastIndex: 0,
        samples: 0,
    };

    return {
        get wpm() {
            return state.wpm;
        },
        get samples() {
            return state.samples;
        },
        reset(wpm: number = initialWpm) {
            state.wpm = wpm;
            state.lastTimestamp = 0;
            state.lastIndex = 0;
            state.samples = 0;
        },
        /**
         * Record a confirmed match and update the learned WPM.
         * @returns the instant WPM for this sample, or null if rejected
         */
        update(
            matchIndex: number,
            confidence: number,
            now: number = Date.now(),
            minWpm = 40,
            maxWpm = 320
        ): number | null {
            const wordsSpoken = matchIndex - state.lastIndex;
            const timeElapsedSec = state.lastTimestamp === 0 ? 0 : (now - state.lastTimestamp) / 1000;

            let instantWpm: number | null = null;

            if (timeElapsedSec > 0.2 && timeElapsedSec < 8.0 && wordsSpoken > 0) {
                const candidate = Math.round((wordsSpoken / timeElapsedSec) * 60);
                if (candidate >= minWpm && candidate <= maxWpm) {
                    instantWpm = candidate;
                    // Adaptive learning rate: high-confidence matches move the EMA more
                    const learningRate = 0.18 + confidence * 0.22;
                    state.wpm = Math.round(state.wpm * (1 - learningRate) + candidate * learningRate);
                    state.samples++;
                }
            }

            state.lastTimestamp = now;
            state.lastIndex = matchIndex;
            return instantWpm;
        },
    };
}

export type WPMTracker = ReturnType<typeof createWPMTracker>;

// ============================================================
// STATEFUL VOICE MATCH ENGINE
// ============================================================

/**
 * Creates a stateful matching engine that wraps the pure functions above.
 * It keeps track of the current confirmed position, recent movement speed,
 * and the learned WPM so callers get a single `process()` call per
 * recognition event.
 *
 * Usage:
 *   const engine = createVoiceMatchEngine();
 *   const result = engine.process(spokenWords, scriptWords);
 *   if (result.matched) scrollToWord(result.matchIndex);
 */
export function createVoiceMatchEngine(options: VoiceMatchEngineOptions = {}) {
    const {
        confidenceThreshold = 0.55,
        baseLookahead = 12,
        maxLookahead = 30,
        allowBacktracking = true,
        initialWpm = 140,
        minWpm = 40,
        maxWpm = 320,
    } = options;

    const wpmTracker = createWPMTracker(initialWpm);

    let currentIndex = 0;
    let lastMatchIndex = 0;
    let recentDelta = 0;
    let lastResult: VoiceMatchEngineResult | null = null;
    /** Timestamp of the last accepted match (drives lost-tracking recovery) */
    let lastProgressTimestamp = 0;
    /** ms without an accepted match before triggering the recovery re-anchor scan */
    const RECOVERY_AFTER_MS = 5000;

    const buildFallback = (): VoiceMatchEngineResult => ({
        matched: false,
        matchIndex: currentIndex,
        confidence: 0,
        matchedWords: 0,
        instantWpm: null,
        learnedWpm: wpmTracker.wpm,
        delta: 0,
    });

    /** Score one spoken phrase against the script at the current position. */
    const findFromCurrent = (recent: string[], scriptWords: string[]): PhraseMatchResult | null =>
        findContextAwareMatch(recent, scriptWords, currentIndex, {
            baseLookahead,
            maxLookahead,
            allowBacktracking,
            recentDelta,
        });

    /** Apply an accepted match: update WPM learning + internal position state. */
    const applyMatch = (match: PhraseMatchResult): VoiceMatchEngineResult => {
        // Monotonic forward progression: a match that lands behind the
        // current position is a re-read echo (ASR re-emitting the previous
        // phrase) — it confirms where we are but must NEVER pull the
        // tracking backwards.
        const nextIndex = Math.max(match.matchIndex, currentIndex);

        const instantWpm = wpmTracker.update(
            nextIndex,
            match.confidence,
            Date.now(),
            minWpm,
            maxWpm
        );

        const delta = nextIndex - currentIndex;
        // Track recent movement speed (EMA) to size the next search window
        recentDelta = recentDelta === 0 ? delta : Math.round(recentDelta * 0.7 + delta * 0.3);

        currentIndex = nextIndex;
        lastMatchIndex = nextIndex;
        lastProgressTimestamp = Date.now();

        lastResult = {
            matched: true,
            matchIndex: nextIndex,
            confidence: match.confidence,
            matchedWords: match.matchedWords,
            instantWpm,
            learnedWpm: wpmTracker.wpm,
            delta,
        };
        return lastResult;
    };

    /**
     * Lost-tracking recovery: after RECOVERY_AFTER_MS without an accepted
     * match, scan far ahead (120 words) for a strong 3+ word anchor to
     * re-lock the position instead of staying stuck behind the speaker.
     */
    const attemptRecovery = (spoken: string[], scriptWords: string[]): PhraseMatchResult | null => {
        const now = Date.now();
        if (lastProgressTimestamp !== 0 && now - lastProgressTimestamp < RECOVERY_AFTER_MS) {
            return null;
        }
        const wide = findBestPhraseMatch(spoken, scriptWords, currentIndex, 120);
        if (wide && wide.confidence >= 0.75 && wide.matchedWords >= 3) {
            return wide;
        }
        return null;
    };

    return {
        get currentIndex() {
            return currentIndex;
        },
        get learnedWpm() {
            return wpmTracker.wpm;
        },
        get lastResult() {
            return lastResult;
        },

        reset(scriptPosition: number = 0, wpm: number = initialWpm) {
            currentIndex = scriptPosition;
            lastMatchIndex = scriptPosition;
            recentDelta = 0;
            lastResult = null;
            lastProgressTimestamp = 0;
            wpmTracker.reset(wpm);
        },

        /** Force the engine to a script position (e.g. user jumped to a chapter). */
        seek(index: number) {
            currentIndex = index;
            lastMatchIndex = index;
        },

        /**
         * Manually set the reading pace (WPM). The adaptive tracker keeps
         * refining from this new baseline instead of learning from scratch,
         * so the user can seed it with their natural pace.
         */
        setPace(wpm: number) {
            wpmTracker.reset(Math.max(50, Math.min(300, Math.round(wpm))));
        },

        /**
         * Process a batch of spoken words (raw or cleaned — cleaning happens
         * inside) against the full script.
         */
        process(spokenWords: string[], scriptWords: string[]): VoiceMatchEngineResult {
            const fallback = buildFallback();

            if (!spokenWords?.length || !scriptWords?.length) {
                lastResult = fallback;
                return fallback;
            }

            // Focus on the most recent words (ASR interim results grow over time)
            const recent = spokenWords.slice(-6);
            const match = findFromCurrent(recent, scriptWords);

            if (match && match.confidence >= confidenceThreshold) {
                return applyMatch(match);
            }

            // Lost-tracking recovery: re-anchor on a strong phrase far ahead
            const recovery = attemptRecovery(recent, scriptWords);
            if (recovery) return applyMatch(recovery);

            lastResult = fallback;
            return fallback;
        },

        /**
         * Multi-hypothesis matching: score EVERY ASR alternative against the
         * script and accept whichever fits best. Chrome frequently ranks the
         * correct transcription of accented speech 2nd or 3rd, so this
         * recovers matches the primary hypothesis loses. Rank acts as a
         * small prior so lower alternatives must fit clearly better to win.
         */
        processAlternatives(
            hypotheses: TranscriptHypothesis[],
            scriptWords: string[]
        ): VoiceMatchEngineResult {
            const fallback = buildFallback();

            if (!hypotheses?.length || !scriptWords?.length) {
                lastResult = fallback;
                return fallback;
            }

            let best: PhraseMatchResult | null = null;

            for (const hyp of hypotheses) {
                const recent = hyp.words.slice(-6);
                const match = findFromCurrent(recent, scriptWords);
                if (!match || match.confidence < confidenceThreshold) continue;

                // Rank prior: primary hypothesis gets up to +0.06, decaying per rank
                const rankPrior = Math.max(0, 0.06 * (1 - hyp.rank * 0.25));
                const asrBoost = hyp.asrConfidence !== undefined ? hyp.asrConfidence * 0.05 : 0;
                const score = Math.min(1, match.confidence + rankPrior + asrBoost);

                // Prefer clearly higher scores; break ties by words matched so
                // longer, stronger phrase alignments beat single-word hits of
                // equal (capped) confidence.
                const isBetter =
                    !best ||
                    score > best.confidence + 1e-9 ||
                    (Math.abs(score - best.confidence) <= 1e-9 &&
                        match.matchedWords > best.matchedWords);

                if (isBetter) {
                    best = { ...match, confidence: score };
                }
            }

            if (best) return applyMatch(best);

            // Lost-tracking recovery using the primary hypothesis
            const recovery = attemptRecovery(hypotheses[0].words.slice(-6), scriptWords);
            if (recovery) return applyMatch(recovery);

            lastResult = fallback;
            return fallback;
        },
    };
}

export type VoiceMatchEngine = ReturnType<typeof createVoiceMatchEngine>;
