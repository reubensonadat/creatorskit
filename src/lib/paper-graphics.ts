// Shared paper-graphics foundation for the newspaper-style studio tools.
// This is the ONE file the Text Match Cut engine and the Text Highlighter
// engine have in common: paper themes, dense column typesetting, grain,
// offscreen DoF buffers, anchor phrase matching and the marker highlight
// drawing itself. Everything that makes "match cut" different from
// "highlighting" (camera behavior + headline layout) lives in the two
// dedicated engines under src/app/match-cut/ and src/app/text-highlighter/.

export interface NewspaperCut {
    id: string;
    masthead: string;
    subhead?: string;
    headline: string;
    byline?: string;
    location?: string;
    bodyParagraphs: string[];
    dateString: string;
    columnCount: number;
    rotationOffset?: number;
    scaleOffset?: number;
    dropCapLetter?: string;
}

export type PaperThemeKey =
    | 'vintage'
    | 'salmon'
    | 'tabloid'
    | 'dossier'
    | 'crisp'
    | 'noir'
    | 'academic';

export interface PaperTheme {
    id: PaperThemeKey;
    label: string;
    bg: string;
    bgDark: string;
    ink: string;
    inkMuted: string;
    inkFaint: string;
    ruleColor: string;
    accentColor: string;
    paperNoiseAlpha: number;
}

export const PAPER_THEMES: Record<PaperThemeKey, PaperTheme> = {
    vintage: {
        id: 'vintage',
        label: 'Vintage Broadsheet',
        bg: '#f5f0e6',
        bgDark: '#e6ded0',
        ink: '#1c1b18',
        inkMuted: '#524e47',
        inkFaint: '#78736a',
        ruleColor: '#2b2925',
        accentColor: '#8b0000',
        paperNoiseAlpha: 18,
    },
    salmon: {
        id: 'salmon',
        label: 'Salmon Financial',
        bg: '#f7e4d4',
        bgDark: '#ebcfbd',
        ink: '#261914',
        inkMuted: '#5e483e',
        inkFaint: '#8a6e60',
        ruleColor: '#3d251d',
        accentColor: '#962b19',
        paperNoiseAlpha: 16,
    },
    tabloid: {
        id: 'tabloid',
        label: 'Pulp Tabloid',
        bg: '#faf4e1',
        bgDark: '#ecdfbf',
        ink: '#14120e',
        inkMuted: '#4f4738',
        inkFaint: '#7a705b',
        ruleColor: '#c8102e',
        accentColor: '#c8102e',
        paperNoiseAlpha: 20,
    },
    dossier: {
        id: 'dossier',
        label: 'Classified Dossier',
        bg: '#ede4ce',
        bgDark: '#d8cbb0',
        ink: '#191715',
        inkMuted: '#4d463e',
        inkFaint: '#736b60',
        ruleColor: '#2d2822',
        accentColor: '#ab1c1c',
        paperNoiseAlpha: 22,
    },
    crisp: {
        id: 'crisp',
        label: 'Clean Modern Paper',
        bg: '#fafaf9',
        bgDark: '#e5e5e3',
        ink: '#111111',
        inkMuted: '#3e3e3e',
        inkFaint: '#6e6e6e',
        ruleColor: '#222222',
        accentColor: '#0055aa',
        paperNoiseAlpha: 10,
    },
    noir: {
        id: 'noir',
        label: 'High-Contrast Noir',
        bg: '#181716',
        bgDark: '#0e0e0d',
        ink: '#f4efe8',
        inkMuted: '#aaa498',
        inkFaint: '#6e695f',
        ruleColor: '#4f4a42',
        accentColor: '#e05a47',
        paperNoiseAlpha: 22,
    },
    academic: {
        id: 'academic',
        label: 'Academic Journal',
        bg: '#ffffff',
        bgDark: '#f3f4f6',
        ink: '#111827',
        inkMuted: '#4b5563',
        inkFaint: '#9ca3af',
        ruleColor: '#e5e7eb',
        accentColor: '#e11d48',
        paperNoiseAlpha: 5,
    },
};

export const AVAILABLE_FONTS = [
    { id: 'serif', label: 'Vintage Serif', value: '"Playfair Display", Georgia, serif' },
    { id: 'typewriter', label: 'Courier Typewriter', value: '"Courier New", Courier, monospace' },
    { id: 'tabloid', label: 'Bold Tabloid Gothic', value: 'Impact, "Arial Black", sans-serif' },
    { id: 'editorial', label: 'Classic Times', value: '"Times New Roman", Times, serif' },
    { id: 'brutalist', label: 'Brutalist Sans', value: '"Helvetica Neue", Arial, sans-serif' },
    { id: 'georgia', label: 'Antique Book', value: 'Georgia, serif' },
];

// Background dense newspaper copy corpus shared by both tools.
const BACKGROUND_BODY_PARAGRAPHS = [
    `The spokesperson smiled and said nothing that could be quoted. Nobody was charged but several people were deeply embarrassed. The meeting was rescheduled four times and then cancelled. The corporation released a statement. Nobody read it. He returned the money. Most of it. Eventually. Local residents were surprised but not shocked. Mostly not shocked. The report is nineteen pages and solves nothing. The building has been there for years. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. She blamed her assistant. The assistant has since resigned.`,
    `The app was updated. It is worse now. The investigation is ongoing, apparently. An expert was consulted. The expert was also confused. The chairman called it unprecedented. What happened was unprecedented. Mostly not shocked. He said it twice. Nobody wrote it down. The consultant fee was not disclosed. It was large. The app was updated. It is worse now. Nobody resigned, which surprised everyone, including the board. Her publicist says she is resting and reflecting on the experience. The report is nineteen pages and solves nothing. Witnesses disagree on basically everything. A pigeon was briefly detained. It offered no statement. Nobody wrote it down. An audit was mentioned briefly and then not mentioned again. It turns out the license had expired in 2019. The email was sent to everyone, including the people it was about.`,
    `Officers are reviewing it slowly. Funding has been allocated. Its current location is unknown. The investigation is ongoing, apparently. Nobody was charged but several people were deeply embarrassed. The email was sent to everyone, including the board. It turns out the license had expired in 2019. An expert was consulted. The expert was also confused. Her publicist says she is resting and reflecting on the experience. All parties described it as a misunderstanding. A second van was also seen. Nobody mentioned this until now. She won the appeal. The other nine cases were dismissed. A local man claims responsibility. Police are not convinced. The contractor billed for work that is not visible to anyone. The mayor denied everything and then left the building. Three people clapped. Several others checked their phones.`,
    `The suspect was later found at a nearby buffet. Police arrived three hours later. They had sandwiches. The corporation released a statement. A full refund was promised to some of the affected customers. City council voted 4-3 to table the matter indefinitely. He resigned "to spend more time with his spreadsheets." All parties described it as a misunderstanding. Funding has been allocated. Its current location is unknown. He was asked to return the trophy. He kept the trophy. The meeting was rescheduled four times and then cancelled. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. Someone say it was worse but like a new way everyday. The assistant has since resigned. Experts called the situation "not ideal" and left.`,
];

export { BACKGROUND_BODY_PARAGRAPHS };

// Procedural paper grain pattern cache
let noisePatternCanvas: HTMLCanvasElement | null = null;
export function getNoisePattern(): HTMLCanvasElement {
    if (noisePatternCanvas) return noisePatternCanvas;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(128, 128);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 14;
    }
    ctx.putImageData(imgData, 0, 0);
    noisePatternCanvas = c;
    return c;
}

// Helper for safe roundRect drawing
export function safeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[]
) {
    if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === 'function') {
        try {
            (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number | number[]) => void }).roundRect(x, y, w, h, radii);
            return;
        } catch { /* fall through to rect */ }
    }
    ctx.rect(x, y, w, h);
}

/**
 * Offscreen rendering buffers for optical depth-of-field tilt-shift,
 * shared and cached across both engines.
 */
let offscreenMain: HTMLCanvasElement | null = null;
let offscreenBlur: HTMLCanvasElement | null = null;
let offscreenMask: HTMLCanvasElement | null = null;

export function getDocBufferCanvas(w: number, h: number, type: 'main' | 'blur' | 'mask'): HTMLCanvasElement {
    let c: HTMLCanvasElement | null = null;
    if (type === 'main') {
        if (!offscreenMain) offscreenMain = document.createElement('canvas');
        c = offscreenMain;
    } else if (type === 'blur') {
        if (!offscreenBlur) offscreenBlur = document.createElement('canvas');
        c = offscreenBlur;
    } else {
        if (!offscreenMask) offscreenMask = document.createElement('canvas');
        c = offscreenMask;
    }
    if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
    }
    return c;
}

/**
 * Draws dense multi-column newspaper paragraphs with genuine paragraph
 * structure and clean typography.
 */
export function drawDenseColumns(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    totalWidth: number,
    maxHeight: number,
    paragraphs: string[],
    font: string,
    fontSize: number,
    lineHeight: number,
    theme: PaperTheme,
    numColumns = 3
) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = theme.ink;
    ctx.textBaseline = 'top';

    const numCols = numColumns;
    const gutter = 24;
    const colWidth = (totalWidth - gutter * (numCols - 1)) / numCols;
    const paragraphGap = Math.round(lineHeight * 0.45);

    const rawParas = (paragraphs && paragraphs.length > 0)
        ? paragraphs.filter((p) => p.trim().length > 0)
        : BACKGROUND_BODY_PARAGRAPHS;

    const pool = [...rawParas, ...BACKGROUND_BODY_PARAGRAPHS, ...rawParas];

    let colIdx = 0;
    let curY = y;
    let paraIdx = 0;

    while (colIdx < numCols && paraIdx < pool.length) {
        const paraText = pool[paraIdx];
        const words = paraText.split(/\s+/).filter(Boolean);
        let lineWords: string[] = [];
        let isFirstLineOfPara = true;

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
            const nextWord = words[wIdx];
            const testLine = [...lineWords, nextWord].join(' ');
            const indent = isFirstLineOfPara ? 12 : 0;
            const testWidth = ctx.measureText(testLine).width + indent;

            if (testWidth > colWidth && lineWords.length > 0) {
                const colX = x + colIdx * (colWidth + gutter) + (isFirstLineOfPara ? 12 : 0);
                ctx.fillText(lineWords.join(' '), colX, curY);
                curY += lineHeight;
                isFirstLineOfPara = false;
                lineWords = [nextWord];

                if (curY + lineHeight > y + maxHeight) {
                    colIdx++;
                    curY = y;
                    if (colIdx >= numCols) break;
                }
            } else {
                lineWords.push(nextWord);
            }
        }

        if (lineWords.length > 0 && colIdx < numCols && curY + lineHeight <= y + maxHeight) {
            const colX = x + colIdx * (colWidth + gutter) + (isFirstLineOfPara ? 12 : 0);
            ctx.fillText(lineWords.join(' '), colX, curY);
            curY += lineHeight + paragraphGap;
        }

        if (curY + lineHeight > y + maxHeight) {
            colIdx++;
            curY = y;
        }

        paraIdx++;
        if (paraIdx >= pool.length && colIdx < numCols) {
            paraIdx = 0; // loop back to guarantee full stage coverage
        }
    }

    // Draw crisp vertical column divider rules
    ctx.strokeStyle = theme.ruleColor;
    ctx.lineWidth = 0.6;
    for (let c = 1; c < numCols; c++) {
        const dividerX = x + c * (colWidth + gutter) - gutter / 2;
        ctx.beginPath();
        ctx.moveTo(dividerX, y);
        ctx.lineTo(dividerX, y + maxHeight);
        ctx.stroke();
    }

    ctx.restore();
}

export function wrapSimpleText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number
): string[] {
    ctx.save();
    ctx.font = font;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';

    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && cur) {
            lines.push(cur);
            cur = w;
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
}

// ---------------------------------------------------------------------------
// Anchor phrase matching (shared by both engines)
// ---------------------------------------------------------------------------

function cleanToken(s: string) {
    return s.toLowerCase().replace(/^[^\w\d]+|[^\w\d]+$/g, '');
}

/**
 * Splits a raw anchor input ("RED FLAGS | cover-up") into trimmed phrases,
 * each clamped to `maxLen` characters so the camera lock stays tight.
 */
export function parseAnchorPhrases(anchorInput: string, maxLen = 23): string[] {
    return anchorInput
        .split(/[|\n]+/)
        .map((p) => p.trim().slice(0, maxLen))
        .filter(Boolean);
}

const DATELINE_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DATELINE_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Rewrites the printed calendar date inside a paper dateline to TODAY's date
 * on the viewing device (phone/tablet), preserving the original flavor —
 * weekday prefix ("TUESDAY,"), trailing year and letter case. Datelines
 * without a recognizable calendar date are returned untouched, so custom
 * copy like "SPECIAL EDITION" survives.
 */
export function applyTodayDateline(dateString: string): string {
    if (!dateString) return dateString;

    const now = new Date();
    const month = DATELINE_MONTHS[now.getMonth()];
    const weekday = DATELINE_WEEKDAYS[now.getDay()];
    const dayNum = now.getDate();
    const yearNum = now.getFullYear();

    // Matches "TUESDAY, MARCH 3", "March 14, 2026", "MAY 21, 2026", "January 14, 2026"…
    const match = dateString.match(
        /\b(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day[,\s]+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\b[,\s]*\d{1,2}(?:\s*,\s*\d{4})?/i
    );
    if (!match) return dateString;

    const matched = match[0];
    const isUpper = matched === matched.toUpperCase();

    let datePart = `${month} ${dayNum}`;
    if (/\d{4}/.test(matched)) datePart += `, ${yearNum}`;

    const hasWeekday = /^[a-z]+day\b/i.test(matched);
    const replacement = hasWeekday ? `${weekday}, ${datePart}` : datePart;

    return dateString.replace(matched, isUpper ? replacement.toUpperCase() : replacement);
}

export interface AnchorWord {
    word: string;
    isAnchor: boolean;
    phraseIndex: number;
}

/**
 * Tags every word of `text` that belongs to one of the anchor phrases.
 * Matching strategy (most → least specific):
 *   1. Case-insensitive substring spans over the raw text.
 *   2. Token-sequence matching (handles attached quotes/commas/dashes).
 *   3. Keyword fallback — highlights any matching keywords when the full
 *      phrase is not present verbatim.
 */
export function matchAnchorWords(text: string, phrases: string[]): AnchorWord[] {
    const cleanText = text.trim();
    const rawWords = cleanText.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0 || phrases.length === 0) {
        return rawWords.map((w) => ({ word: w, isAnchor: false, phraseIndex: 0 }));
    }

    const textLower = cleanText.toLowerCase();

    // 1. Substring spans
    const phraseSpans: { start: number; end: number; phraseIndex: number }[] = [];
    phrases.forEach((phrase, pIdx) => {
        const p = phrase.toLowerCase();
        let searchPos = 0;
        while (searchPos < textLower.length && p.length > 0) {
            const idx = textLower.indexOf(p, searchPos);
            if (idx === -1) break;
            phraseSpans.push({ start: idx, end: idx + p.length, phraseIndex: pIdx });
            searchPos = idx + p.length;
        }
    });

    const wordObjects: AnchorWord[] = [];
    let searchFrom = 0;

    for (let i = 0; i < rawWords.length; i++) {
        const w = rawWords[i];
        const wLower = w.toLowerCase();
        const wStart = textLower.indexOf(wLower, searchFrom);
        const wEnd = wStart >= 0 ? wStart + w.length : searchFrom + w.length;
        searchFrom = wEnd;

        let isAnchor = false;
        let phraseIndex = 0;

        for (const span of phraseSpans) {
            if (wStart >= 0 && wEnd > span.start && wStart < span.end) {
                isAnchor = true;
                phraseIndex = span.phraseIndex;
                break;
            }
        }
        wordObjects.push({ word: w, isAnchor, phraseIndex });
    }

    // 2. Token-sequence matching fallback
    phrases.forEach((phrase, pIdx) => {
        const phraseTokens = phrase.toLowerCase().split(/\s+/).map(cleanToken).filter(Boolean);
        if (phraseTokens.length === 0) return;

        for (let i = 0; i <= rawWords.length - phraseTokens.length; i++) {
            let matches = true;
            for (let k = 0; k < phraseTokens.length; k++) {
                if (cleanToken(rawWords[i + k]) !== phraseTokens[k]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                for (let k = 0; k < phraseTokens.length; k++) {
                    wordObjects[i + k].isAnchor = true;
                    wordObjects[i + k].phraseIndex = pIdx;
                }
            }
        }
    });

    // 3. Guaranteed keyword fallback
    const anyMatched = wordObjects.some((w) => w.isAnchor);
    if (!anyMatched) {
        const allKeywords = new Set(
            phrases.join(' ').toLowerCase().split(/\s+/).map(cleanToken).filter((t) => t.length > 2)
        );
        wordObjects.forEach((wObj) => {
            if (allKeywords.has(cleanToken(wObj.word))) {
                wObj.isAnchor = true;
                wObj.phraseIndex = 0;
            }
        });
    }

    return wordObjects;
}

// ---------------------------------------------------------------------------
// Shared marker / underline / box / circle / tape highlight drawing
// ---------------------------------------------------------------------------

export interface HighlightDrawOptions {
    highlightColor: string;
    highlightStyle: 'marker' | 'underline' | 'box' | 'circle' | 'tape' | 'double-underline';
    markerOpacity: number;
    paperTheme: PaperThemeKey;
    animationMode?: 'match-cut' | 'animated-highlight';
    highlightProgress?: number;
    highlightDirection?: 'ltr' | 'rtl';
}

/**
 * Draws the vivid marker highlighter, underline, box, or tape with optional
 * animated progressive sweep. Identical in preview and both engine exports.
 */
export function drawAnchorHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    textWidth: number,
    fontSize: number,
    options: HighlightDrawOptions
) {
    const isAnimated = options.animationMode === 'animated-highlight';
    const progress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

    if (progress <= 0 || textWidth <= 0) return;

    ctx.save();
    const padX = fontSize * 0.14;
    const padY = fontSize * 0.12;
    const hx = x - padX;
    const hy = y - fontSize * 0.52 - padY;
    const hw = textWidth + padX * 2;
    const hh = fontSize * 1.04 + padY * 2;

    const isRtl = options.highlightDirection === 'rtl';
    const drawnW = hw * progress;
    const currentDrawX = isRtl ? hx + hw - drawnW : hx;

    if (options.highlightStyle === 'marker') {
        ctx.fillStyle = options.highlightColor;
        ctx.globalAlpha = Math.min(0.95, Math.max(0.4, options.markerOpacity));

        if (options.paperTheme !== 'noir') {
            ctx.globalCompositeOperation = 'multiply';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        safeRoundRect(ctx, currentDrawX, hy, drawnW, hh, [3, 4, 3, 5]);
        ctx.fill();

        // Subtle second swipe tail for realism
        ctx.fillStyle = options.highlightColor;
        ctx.globalAlpha = options.markerOpacity * 0.3;
        ctx.beginPath();
        safeRoundRect(ctx, currentDrawX + (isRtl ? 0 : 2), hy + hh * 0.18, Math.max(0, drawnW - 4), hh * 0.65, 2);
        ctx.fill();
    } else if (options.highlightStyle === 'underline') {
        ctx.strokeStyle = options.highlightColor;
        ctx.lineWidth = Math.max(3.5, fontSize * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();

        const lineStartX = isRtl ? x + textWidth + 2 : x - 2;
        const lineTargetX = isRtl
            ? x + textWidth + 2 - (textWidth + 4) * progress
            : x - 2 + (textWidth + 4) * progress;

        ctx.moveTo(lineStartX, y + fontSize * 0.54);
        ctx.lineTo(lineTargetX, y + fontSize * 0.54);
        ctx.stroke();
    } else if (options.highlightStyle === 'double-underline') {
        ctx.strokeStyle = options.highlightColor;
        ctx.lineWidth = Math.max(2, fontSize * 0.08);
        ctx.lineCap = 'round';

        const lineStartX = isRtl ? x + textWidth + 2 : x - 2;
        const lineTargetX = isRtl
            ? x + textWidth + 2 - (textWidth + 4) * progress
            : x - 2 + (textWidth + 4) * progress;

        ctx.beginPath();
        ctx.moveTo(lineStartX, y + fontSize * 0.5);
        ctx.lineTo(lineTargetX, y + fontSize * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(lineStartX, y + fontSize * 0.66);
        ctx.lineTo(lineTargetX, y + fontSize * 0.66);
        ctx.stroke();
    } else if (options.highlightStyle === 'box') {
        ctx.fillStyle = options.highlightColor;
        ctx.beginPath();
        ctx.rect(currentDrawX, hy, drawnW, hh);
        ctx.fill();
    } else if (options.highlightStyle === 'circle') {
        ctx.strokeStyle = options.highlightColor;
        ctx.lineWidth = Math.max(3, fontSize * 0.1);
        ctx.beginPath();
        const startAngle = isRtl ? Math.PI : 0;
        const sweepAngle = (Math.PI * 2) * progress;
        ctx.ellipse(
            x + textWidth / 2,
            y,
            textWidth * 0.62 + 6,
            fontSize * 0.72,
            -0.04,
            startAngle,
            startAngle + sweepAngle
        );
        ctx.stroke();
    } else if (options.highlightStyle === 'tape') {
        ctx.fillStyle = options.highlightColor;
        ctx.rect(currentDrawX - (isRtl ? 0 : 8), hy, drawnW + 16, hh);
        ctx.fill();
    }
    ctx.restore();
}
