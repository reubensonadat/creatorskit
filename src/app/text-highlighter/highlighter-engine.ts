// Text Highlighter Engine — Cinematic Journal Sweep Renderer
//
// WHAT MAKES THIS ENGINE A HIGHLIGHTER (and not a match cut):
// A human hand slowly drags a marker across a full journal paragraph — the
// anchor phrase may wrap across MULTIPLE lines and the sweep flows line to
// line with eased, hand-drawn motion. The sweep target follows the selected
// document sector (highlightSector): the masthead header, the main headline
// sentence, or a body paragraph below the fold. Nothing is locked to a fixed
// slot; the drama is the stroke itself, not optical stability.
//
// The rapid whip-cut montage with an anchor locked to one fixed line lives
// in src/app/match-cut/match-cut-engine.ts. Shared paper graphics, themes
// and sounds live in src/lib/paper-graphics.ts and src/lib/studio-sounds.ts.

import {
    applyTodayDateline,
    BACKGROUND_BODY_PARAGRAPHS,
    PAPER_THEMES,
    drawAnchorHighlight,
    drawDenseColumns,
    getDocBufferCanvas,
    getNoisePattern,
    matchAnchorWords,
    normalizePhraseKey,
    parseAnchorPhrases,
    wrapSimpleText,
    type AnchorWord,
    type NewspaperCut,
    type PaperTheme,
    type PaperThemeKey,
} from '@/lib/paper-graphics';
import { buildPhraseBodySentence } from './highlighter-presets';
import { clamp01 } from '@/lib/motion/easing';
import { renderPaperTransition } from '@/lib/motion/paper-transition';
import { easeHighlightSweep } from '@/lib/studio-sounds';

// Re-exported for the highlighter page's convenience.
export { PAPER_THEMES } from '@/lib/paper-graphics';
export type { NewspaperCut, PaperThemeKey } from '@/lib/paper-graphics';
export {
    easeHighlightSweep,
    playCutSound,
    synthesizeCutSound,
} from '@/lib/studio-sounds';

export interface HighlighterRenderOptions {
    anchorPhrase: string;
    highlightColor: string;
    highlightStyle: 'marker' | 'underline' | 'box' | 'circle' | 'tape' | 'double-underline';
    markerOpacity: number;
    paperTheme: PaperThemeKey;
    depthOfField: boolean;
    dofIntensity: number; // 0 to 1
    filmGrain: boolean;
    cameraShake: boolean;
    aspectRatio: '9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4';
    showCrosshairGuide?: boolean;
    animationMode?: 'match-cut' | 'animated-highlight';
    highlightProgress?: number; // 0.0 to 1.0
    highlightDirection?: 'ltr' | 'rtl';
    highlightSector?: 'top-masthead' | 'center-headline' | 'body-paragraph';
    fontFamily?: string;

    // Layout & Visibility
    showTopColumns?: boolean;
    showMasthead?: boolean;
    showSubhead?: boolean;
    showByline?: boolean;
    showBottomColumns?: boolean;
    showDividerRules?: boolean;

    // Camera Zoom
    zoomEnabled?: boolean;
    zoomDirection?: 'in' | 'out';
    zoomIntensity?: number;

    // Typography
    headlineScale?: number;
    headlineWrapMode?: 'single-line' | 'auto-wrap';

    // Paper Entrance (pre-sweep slam): the finished document flies into
    // frame from a chosen edge with directional motion blur + settle tilt,
    // holds a beat, and THEN the highlighter sweep begins.
    entranceDirection?: 'none' | 'top' | 'bottom' | 'left' | 'right';
    entranceProgress?: number; // 0..1 across the flight+hold window (1 = settled)
    entranceBlur?: number; // 0..1 directional smear intensity during flight
    entranceTilt?: number; // settle rotation in degrees (default 5)
    entranceScaleFrom?: number; // starting scale, e.g. 1.1 (default)
    entranceOvershoot?: number; // settle bounce depth (0.2 default; ~0 = pure glide)

    // Paper Exit (post-sweep whip-out): after the final sweep the finished
    // document whips back OUT of frame — anticipation windup, acceleration,
    // hot motion-blur streak — leaving only the paper color behind.
    exitDirection?: 'none' | 'top' | 'bottom' | 'left' | 'right';
    exitProgress?: number; // 0..1 across the whip-out window (1 = fully gone)
    exitBlur?: number; // 0..1 directional smear intensity during the exit

    // Travel distance multiplier for EVERY paper move — slam-in, inter-screen
    // scrolls and whip-out (default 1.3 × axis length). Raise it to scroll
    // "more of the page" between screens.
    paperTravel?: number;

    // ── Sticky sequence memory ─────────────────────────────────────────────
    // Phrases already swept on EARLIER screens of the sequence, pipe-joined.
    // They stay fully drawn (faintly dimmed) while the active phrase sweeps —
    // the marker never erases what it already marked. Empty ⇒ classic mode.
    persistedPhrases?: string;

    // ── Instance resolution ────────────────────────────────────────────────
    // normalizePhraseKey(phrase) → 1-based occurrence (reading order). When a
    // phrase appears five times in the document the studio asks WHICH one;
    // only the picked instance gets tagged. Absent key ⇒ all occurrences.
    anchorInstances?: Record<string, number>;
    /** Document Scan Mode: 'cover' zooms the picture to FILL the chosen aspect
     *  ratio — the WHOLE picture stays visible and artificial paper fills
     *  the rest of the frame; default 'contain' shows the whole page. */
    scanPageFit?: 'contain' | 'cover';
    /** Document Scan Mode: set false to disable the automatic camera zoom
     *  choreography — highlights still animate on a static full-page view. */
    scanAutoCamera?: boolean;
    /** Document Scan Mode FILL finish: 'paper' extends the theme sheet,
     *  'edge' tints the extension with the photo's sampled border color,
     *  'blur' fills the frame with a blurred copy of the page. */
    scanFillStyle?: 'paper' | 'edge' | 'blur';
    /** Sampled border color of the scan (eyedropper) — used by 'edge'. */
    scanEdgeColor?: string;
}

interface HeadlineLine {
    text: string;
    words: { word: string; isAnchor: boolean; phraseIndex: number; x: number; w: number }[];
    w: number;
}

/**
 * Wraps the journal headline naturally and computes exact anchor word
 * positions across multiple lines & phrases — the sweep then flows through
 * these chunks line by line. `occurrences` carries the per-phrase instance
 * picks so ambiguous phrases tag ONLY the chosen occurrence.
 */
function wrapHeadlineWithAnchor(
    ctx: CanvasRenderingContext2D,
    text: string,
    phrases: string[],
    maxWidth: number,
    occurrences?: Record<number, number>
): HeadlineLine[] {
    const cleanText = text.trim();
    if (!cleanText) return [];

    const wordObjects: AnchorWord[] = matchAnchorWords(cleanText, phrases, occurrences);

    const lines: HeadlineLine[] = [];
    let currentLineWords: { word: string; isAnchor: boolean; phraseIndex: number; w: number }[] = [];
    let currentLineWidth = 0;
    const spaceW = ctx.measureText(' ').width;

    const buildLine = (): HeadlineLine => {
        let curX = 0;
        const positionedWords = currentLineWords.map((w) => {
            const item = { word: w.word, isAnchor: w.isAnchor, phraseIndex: w.phraseIndex, x: curX, w: w.w };
            curX += w.w + spaceW;
            return item;
        });
        return {
            text: currentLineWords.map((w) => w.word).join(' '),
            words: positionedWords,
            w: Math.max(0, curX - spaceW),
        };
    };

    for (let i = 0; i < wordObjects.length; i++) {
        const wObj = wordObjects[i];
        const wW = ctx.measureText(wObj.word).width;
        const testW = currentLineWidth === 0 ? wW : currentLineWidth + spaceW + wW;

        if (testW > maxWidth && currentLineWords.length > 0) {
            lines.push(buildLine());
            currentLineWords = [{ word: wObj.word, isAnchor: wObj.isAnchor, phraseIndex: wObj.phraseIndex, w: wW }];
            currentLineWidth = wW;
        } else {
            currentLineWords.push({ word: wObj.word, isAnchor: wObj.isAnchor, phraseIndex: wObj.phraseIndex, w: wW });
            currentLineWidth = testW;
        }
    }

    if (currentLineWords.length > 0) {
        lines.push(buildLine());
    }

    return lines;
}

interface SweepChunk {
    phraseIndex: number;
    lineIdx: number;
    x: number;
    y: number;
    w: number;
}

/**
 * Groups consecutive anchor words (per phrase) into highlightable chunks for
 * one text block laid out at `yStart` with `lineH` line spacing.
 */
function collectSweepChunks(
    lines: HeadlineLine[],
    yStart: number,
    lineH: number,
    xForLine: (line: HeadlineLine) => number
): SweepChunk[] {
    const chunks: SweepChunk[] = [];
    lines.forEach((line, lineIdx) => {
        const lineY = yStart + lineIdx * lineH;
        const lineStartX = xForLine(line);
        let groupStartX = -1;
        let groupEndX = -1;
        let curPhraseIdx = 0;

        for (let i = 0; i < line.words.length; i++) {
            const w = line.words[i];
            const wx = lineStartX + w.x;
            if (w.isAnchor) {
                if (groupStartX === -1) {
                    groupStartX = wx;
                    curPhraseIdx = w.phraseIndex;
                } else if (w.phraseIndex !== curPhraseIdx) {
                    chunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
                    groupStartX = wx;
                    curPhraseIdx = w.phraseIndex;
                }
                groupEndX = wx + w.w;
            } else if (groupStartX !== -1) {
                chunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
                groupStartX = -1;
                groupEndX = -1;
            }
        }
        if (groupStartX !== -1) {
            chunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
        }
    });
    return chunks;
}

/**
 * Draws one block's sweep chunks with sequential per-phrase windowing —
 * phrase 1 sweeps, a beat of pause, then phrase 2, and so on.
 *
 * `settledCount` leading phrase indices are STICKY MEMORIES from earlier
 * screens: they render fully drawn at ~88% ink so the live stroke stays the
 * hero while the page keeps everything the marker already marked.
 */
function drawSweepChunks(
    ctx: CanvasRenderingContext2D,
    chunks: SweepChunk[],
    fontSize: number,
    progress: number,
    options: HighlighterRenderOptions,
    settledCount = 0
) {
    if (chunks.length === 0) return;
    const activeIdxs = chunks.filter((c) => c.phraseIndex >= settledCount).map((c) => c.phraseIndex);
    if (activeIdxs.length === 0) {
        chunks.forEach((chunk) => {
            drawAnchorHighlight(ctx, chunk.x, chunk.y + fontSize * 0.5, chunk.w, fontSize, {
                ...options,
                highlightProgress: 1,
                markerOpacity: options.markerOpacity * 0.88,
            });
        });
        return;
    }
    const numPhrases = Math.max(...activeIdxs) + 1 - settledCount;

    chunks.forEach((chunk) => {
        if (chunk.phraseIndex < settledCount) {
            drawAnchorHighlight(ctx, chunk.x, chunk.y + fontSize * 0.5, chunk.w, fontSize, {
                ...options,
                highlightProgress: 1,
                markerOpacity: options.markerOpacity * 0.88,
            });
            return;
        }
        const pIdx = chunk.phraseIndex - settledCount;
        const phraseWindowStart = pIdx / numPhrases;
        const phraseSweepEnd = (pIdx + (numPhrases > 1 ? 0.78 : 1.0)) / numPhrases;

        let phraseProg = 0;
        if (progress >= phraseSweepEnd) {
            phraseProg = 1;
        } else if (progress > phraseWindowStart) {
            phraseProg = (progress - phraseWindowStart) / (phraseSweepEnd - phraseWindowStart);
        }

        // Distribute progress across multiple lines within this phrase
        const phraseChunks = chunks.filter((c) => c.phraseIndex === pIdx);
        const chunkIdxInPhrase = phraseChunks.indexOf(chunk);
        const totalInPhrase = phraseChunks.length;

        const startP = totalInPhrase > 1 ? chunkIdxInPhrase / totalInPhrase : 0;
        const endP = totalInPhrase > 1 ? (chunkIdxInPhrase + 1) / totalInPhrase : 1;
        const chunkProg = totalInPhrase > 1
            ? Math.min(1, Math.max(0, (phraseProg - startP) / (endP - startP)))
            : phraseProg;

        drawAnchorHighlight(
            ctx,
            chunk.x,
            chunk.y + fontSize * 0.5,
            chunk.w,
            fontSize,
            { ...options, highlightProgress: chunkProg }
        );
    });
}

/**
 * Main Journal Sweep Renderer
 */
export function renderHighlighterStory(
    targetCanvasCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cut: NewspaperCut,
    options: HighlighterRenderOptions,
    frameIndex = 0
) {
    const theme: PaperTheme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.academic;
    const isDark = options.paperTheme === 'noir';

    // Use offscreen canvas buffer if depth of field is active (paper env only)
    const useDof = Boolean(options.depthOfField && typeof document !== 'undefined');
    const renderBuffer = useDof ? getDocBufferCanvas(width, height, 'main') : null;
    const ctx = renderBuffer ? renderBuffer.getContext('2d')! : targetCanvasCtx;

    ctx.save();

    // 1. Draw Paper Canvas Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35,
        width / 2, height / 2, Math.max(width, height) * 0.88
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, isDark ? 'rgba(0,0,0,0.25)' : 'rgba(80,60,30,0.04)');
    vignette.addColorStop(1, isDark ? 'rgba(0,0,0,0.55)' : 'rgba(70,50,20,0.12)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    if (options.filmGrain) {
        const noise = getNoisePattern();
        const pattern = ctx.createPattern(noise, 'repeat');
        if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); }
    }

    // 2. Optical Center Coordinates
    const targetCenterX = width / 2;
    const targetCenterY = height / 2;

    // Geometry & Typography
    const pageWidth = Math.min(width * 0.92, 1040);
    const pageLeftX = (width - pageWidth) / 2;

    // Resolve Font Family
    let chosenFont = '"Playfair Display", Georgia, serif';
    if (options.fontFamily && options.fontFamily !== 'cycle-dynamic') {
        chosenFont = options.fontFamily;
    } else {
        chosenFont = '"Playfair Display", Georgia, serif';
    }
    void frameIndex; // journal sweep keeps one steady font — no per-cut cycling here

    // Body Copy Typography (for background columns) — the chosen font
    // drives the WHOLE document (body, masthead, subhead, byline), not
    // just the headline; otherwise font selection barely reads as a change.
    const bodyFontSize = Math.max(12, Math.round(width * 0.0165));
    const bodyLineHeight = bodyFontSize * 1.52;
    const bodyFont = `${bodyFontSize}px ${chosenFont}`;

    // Headline Typography (the journal sentence being swept)
    let headlineFontSize = Math.max(24, Math.round(width * 0.038)) * (options.headlineScale ?? 1);
    let headlineFont = `bold ${headlineFontSize}px ${chosenFont}`;

    const anchor = (options.anchorPhrase || '').trim();
    const headlineRaw = (cut.headline || '').trim() || '10x faster turnaround times';

    // ── SEQUENCE PHRASE COMPOSITION ────────────────────────────────────────
    // settled = phrases swept on earlier screens (sticky memory, drawn dim);
    // active = the phrase(s) being swept on the CURRENT screen. Layout is
    // computed from the COMBINED list so word positions are identical on
    // every screen — memories never shift when the page scrolls.
    const settledPhrases = parseAnchorPhrases(options.persistedPhrases || '', 512);
    const activePhrases = parseAnchorPhrases(anchor, 512);
    const combinedPhrases = [...settledPhrases, ...activePhrases];
    const settledCount = settledPhrases.length;
    const occurrenceMap: Record<number, number> | undefined = options.anchorInstances ? {} : undefined;
    if (occurrenceMap) {
        combinedPhrases.forEach((p, i) => {
            const occ = options.anchorInstances?.[normalizePhraseKey(p)];
            if (occ && occ > 0) occurrenceMap[i] = occ;
        });
    }

    const bodyParas = (cut.bodyParagraphs && cut.bodyParagraphs.length > 0)
        ? cut.bodyParagraphs
        : BACKGROUND_BODY_PARAGRAPHS;

    const isSingleLine = options.headlineWrapMode === 'single-line';

    if (isSingleLine) {
        ctx.font = headlineFont;
        const singleLineW = ctx.measureText(headlineRaw).width;
        const maxSingleLineAllowed = pageWidth * 0.96;
        if (singleLineW > maxSingleLineAllowed && singleLineW > 0) {
            const scaleDown = maxSingleLineAllowed / singleLineW;
            headlineFontSize = Math.max(14, Math.round(headlineFontSize * scaleDown));
            headlineFont = `bold ${headlineFontSize}px ${chosenFont}`;
        }
    }

    const headlineLineHeight = headlineFontSize * 1.35;

    // Measure and wrap the journal sentence; anchor words may span lines.
    ctx.font = headlineFont;
    const maxHeadlineW = isSingleLine ? 99999 : pageWidth;
    const headlineLines = wrapHeadlineWithAnchor(ctx, headlineRaw, combinedPhrases, maxHeadlineW, occurrenceMap);

    // If no anchor matched in headline, tag the whole headline
    const anyAnchor = headlineLines.some((l) => l.words.some((w) => w.isAnchor));
    if (!anyAnchor && headlineLines.length > 0) {
        headlineLines.forEach((l) => l.words.forEach((w) => { w.isAnchor = true; }));
    }

    // ─────────────────────────────────────────────────────────────────
    // MASTHEAD STRAPLINE (top-masthead sector)
    // The anchor phrase can NEVER appear inside a journal masthead name,
    // so the old code fell back to sweeping the whole masthead — the user
    // pressed "Research Journal" and watched "CREATOR RESEARCH LABS" get
    // highlighted. Instead, the header sector now renders a STRAPLINE (a
    // kicker line under the masthead, standard journal furniture) that
    // carries the anchor phrase itself. The sweep always strokes the
    // phrase; the masthead stays untouched branding.
    // ─────────────────────────────────────────────────────────────────
    const sector = options.highlightSector || 'center-headline';
    const strapFontPx = Math.max(15, Math.round(width * 0.0175));
    const strapLineH = Math.round(strapFontPx * 1.4);
    let strapLines: HeadlineLine[] = [];
    if (sector === 'top-masthead') {
        const strapPhrases = combinedPhrases.length > 0 ? combinedPhrases : parseAnchorPhrases(headlineRaw, 512);
        const strapText = (strapPhrases.length > 0 ? strapPhrases : [headlineRaw])
            .map((p) => p.toUpperCase())
            .join('  ·  ');
        ctx.font = `900 ${strapFontPx}px ${chosenFont}`;
        strapLines = wrapHeadlineWithAnchor(
            ctx,
            strapText,
            strapPhrases.length > 0 ? strapPhrases : [strapText],
            pageWidth * 0.9,
            occurrenceMap
        );
        // The strapline IS the phrases — every word sweepable with its own
        // phraseIndex so sticky memories stay separate from the live stroke.
        const anyStrapAnchor = strapLines.some((l) => l.words.some((w) => w.isAnchor));
        if (!anyStrapAnchor) {
            strapLines.forEach((l) => l.words.forEach((w) => {
                w.isAnchor = true;
                w.phraseIndex = 0;
            }));
        }
    }
    // ABSOLUTE header anchoring: the masthead block stays at its default
    // position; the strapline's footprint pushes ONLY the headline (and
    // everything flowing below it) further down. Anchoring relatively
    // (mastheadY = docHeadlineY − 95) made the strapline overflow INTO the
    // headline — text stacked on top of text.
    const mastheadY = 405;
    const strapTop = mastheadY + 60; // strapline zone: below dateline & double rule
    const docHeadlineY = 500 + (strapLines.length > 0 ? strapLines.length * strapLineH + 12 : 0);

    const isAnimated = options.animationMode === 'animated-highlight';
    const progress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

    // Masthead geometry (Section B mirrors these exact values when drawing)
    const mastheadText = (cut.masthead || 'JOURNAL OF CREATIVE RESEARCH').toUpperCase();
    const mastheadFontPx = Math.max(16, Math.round(width * 0.024));
    const mastheadFont = `900 ${mastheadFontPx}px ${chosenFont}`;
    // (mastheadY / strapTop now declared above, before docHeadlineY —
    // the header block no longer shifts when the strapline inflates the page)

    // ------------------------------------------------------------
    // FLOWING DOCUMENT LAYOUT (document space, measured BEFORE the
    // camera so the sweep target position is known when focusing)
    // ------------------------------------------------------------
    const headlineH = headlineLines.length * headlineLineHeight;
    const headlineRuleY = docHeadlineY + headlineH + 16;
    let flowY = headlineRuleY;
    if (options.showDividerRules !== false) flowY += 16;

    const subheadFont = `italic ${Math.max(14, Math.round(width * 0.0175))}px ${chosenFont}`;
    const subheadLineH = Math.max(20, Math.round(width * 0.024));
    const subheadLines = (options.showSubhead !== false && cut.subhead)
        ? wrapSimpleText(ctx, cut.subhead, subheadFont, pageWidth)
        : [];
    const subheadY = flowY;
    if (subheadLines.length > 0) flowY += subheadLines.length * subheadLineH + 12;

    const showByline = options.showByline !== false && Boolean(cut.byline || cut.location);
    const bylineY = flowY;
    if (showByline) flowY += 26;

    const bylineRuleY = flowY;
    if (options.showDividerRules !== false) flowY += 14;

    const bodySweepStartY = flowY + 6;
    const bodySweepX = pageLeftX + pageWidth * 0.03;

    // ------------------------------------------------------------
    // SECTOR SWEEP TARGETS — the marker stroke follows the selected
    // document sector, and the camera tracks the actual stroke.
    // ------------------------------------------------------------
    let bodySweepLines: HeadlineLine[] = [];
    let sweepBodyParas = bodyParas;
    if (sector === 'body-paragraph') {
        // ─────────────────────────────────────────────────────────────
        // BODY SECTOR CONTRACT: the FULL anchor phrase(s) are always what
        // gets swept — the story itself is modified to carry them.
        //
        // matchAnchorWords() has a keyword fallback (a lone "neural" in
        // preset filler counts as a "match"), so scanning the corpus for
        // partial hits let unrelated paragraphs win the sweep and produced
        // the "only NEURAL is highlighted" bug. Instead:
        //   1. If the first paragraph already contains EVERY phrase
        //      verbatim, sweep it directly.
        //   2. Otherwise PREPEND a natural journal sentence with the
        //      phrase(s) embedded verbatim and sweep that.
        // ─────────────────────────────────────────────────────────────
        const phrases = combinedPhrases;
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        const carriesAllPhrases = (para: string) =>
            phrases.length > 0 && phrases.every((p) => norm(para).includes(norm(p)));

        if (phrases.length > 0) {
            let sweepText: string;
            if (bodyParas.length > 0 && carriesAllPhrases(bodyParas[0])) {
                // Story already opens with the phrase(s) — sweep it as-is.
                sweepText = bodyParas[0];
            } else {
                // Modify the story: a real prose sentence (stable per paper
                // via a hash of the cut id) with the phrase(s) embedded
                // verbatim becomes the first body paragraph.
                const variantSeed = (cut.id || 'body').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                sweepText = buildPhraseBodySentence(combinedPhrases.join(' | '), variantSeed);
                sweepBodyParas = [sweepText, ...bodyParas];
            }

            ctx.font = bodyFont;
            bodySweepLines = wrapHeadlineWithAnchor(ctx, sweepText, combinedPhrases, pageWidth * 0.94, occurrenceMap);

            // Guarantee: every phrase must have produced a highlight span.
            // If any phrase missed (degenerate punctuation edge case), fall
            // back to sweeping the whole sentence so nothing reads broken.
            const phraseHits = new Set(
                bodySweepLines.flatMap((l) => l.words.filter((w) => w.isAnchor).map((w) => w.phraseIndex))
            );
            if (phraseHits.size < phrases.length) {
                bodySweepLines.forEach((l) => l.words.forEach((w) => {
                    w.isAnchor = true;
                    w.phraseIndex = 0;
                }));
            }
        } else if (bodyParas[0]) {
            // No anchor configured at all — sweep the opening paragraph.
            ctx.font = bodyFont;
            bodySweepLines = wrapHeadlineWithAnchor(ctx, bodyParas[0], [], pageWidth * 0.94);
            bodySweepLines.forEach((l) => l.words.forEach((w) => {
                w.isAnchor = true;
                w.phraseIndex = 0;
            }));
        }
    }
    const bodySweepH = bodySweepLines.length * bodyLineHeight;

    // Sweep chunks per sector (empty for non-active sectors → no stroke there)
    const headlineChunks = sector === 'center-headline'
        ? collectSweepChunks(headlineLines, docHeadlineY, headlineLineHeight, (l) => pageLeftX + (pageWidth - l.w) / 2)
        : [];
    const strapChunks = strapLines.length > 0
        ? collectSweepChunks(strapLines, strapTop, strapLineH, (l) => pageLeftX + (pageWidth - l.w) / 2)
        : [];
    const bodyChunks = bodySweepLines.length > 0
        ? collectSweepChunks(bodySweepLines, bodySweepStartY, bodyLineHeight, () => bodySweepX)
        : [];

    const activeChunks = sector === 'top-masthead'
        ? strapChunks
        : sector === 'body-paragraph'
            ? bodyChunks
            : headlineChunks;
    const activeLineH = sector === 'top-masthead'
        ? strapLineH
        : sector === 'body-paragraph'
            ? bodyLineHeight
            : headlineLineHeight;

    // Anchor center in document space — bbox of the LIVE stroke only. Settled
    // memories from earlier screens must not pull the camera away from the
    // phrase being swept right now.
    const cameraChunks = activeChunks.filter((c) => c.phraseIndex >= settledCount);
    let docAnchorCenterX: number;
    let docAnchorCenterY: number;
    if (cameraChunks.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        cameraChunks.forEach((c) => {
            minX = Math.min(minX, c.x);
            maxX = Math.max(maxX, c.x + c.w);
            minY = Math.min(minY, c.y);
            maxY = Math.max(maxY, c.y + activeLineH);
        });
        docAnchorCenterX = (minX + maxX) / 2;
        docAnchorCenterY = (minY + maxY) / 2;
    } else {
        docAnchorCenterX = pageLeftX + pageWidth / 2;
        docAnchorCenterY = docHeadlineY + (headlineLines.length * headlineLineHeight) / 2;
    }

    // ============================================================
    // CAMERA TRANSFORM — centers the sweep region on screen
    // ============================================================
    ctx.save();

    const cameraPanX = targetCenterX - docAnchorCenterX;
    const cameraPanY = targetCenterY - docAnchorCenterY;

    ctx.translate(cameraPanX, cameraPanY);

    if (options.cameraShake) {
        const angle = (cut.rotationOffset ?? 0) * 0.003;
        const scale = 1 + (cut.scaleOffset ?? 0) * 0.004;
        ctx.translate(docAnchorCenterX, docAnchorCenterY);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.translate(-docAnchorCenterX, -docAnchorCenterY);
    }

    // Camera Zoom (cinematic slow zoom during highlight sweep)
    if (options.zoomEnabled) {
        const zoomProgress = progress;
        const dir = options.zoomDirection === 'out' ? -1 : 1;
        const zoomScale = 1 + dir * (options.zoomIntensity ?? 0.1) * zoomProgress;
        ctx.translate(docAnchorCenterX, docAnchorCenterY);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-docAnchorCenterX, -docAnchorCenterY);
    }

    // ------------------------------------------------------------
    // SECTION A: Dense Top Columns
    // ------------------------------------------------------------
    if (options.showTopColumns !== false) {
        const topColumnsY = 40;
        // Clamp the columns above the FIXED masthead block as well — when
        // the strapline inflates the page, docHeadlineY − 145 alone would
        // run the filler columns straight into the masthead name.
        const topColumnsBottomY = Math.min(docHeadlineY - 145, mastheadY - mastheadFontPx - 14);
        if (topColumnsBottomY > topColumnsY + 40) {
            drawDenseColumns(
                ctx,
                pageLeftX,
                topColumnsY,
                pageWidth,
                topColumnsBottomY - topColumnsY,
                bodyParas.slice(0, 2),
                bodyFont,
                bodyFontSize,
                bodyLineHeight,
                theme
            );
        }
    }

    // ------------------------------------------------------------
    // SECTION B: Masthead & Dateline (swept when header sector active)
    // ------------------------------------------------------------
    if (options.showMasthead !== false) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        // NOTE: the masthead NAME is never swept anymore — the anchor
        // phrase physically cannot appear inside a journal title, so the
        // old whole-name fallback produced nonsense highlights ("CREATOR
        // RESEARCH LABS" instead of the chosen phrase). The header-sector
        // sweep now strokes the strapline in SECTION B2 below.

        ctx.fillStyle = theme.ink;
        ctx.font = mastheadFont;
        ctx.fillText(mastheadText, pageLeftX + pageWidth / 2, mastheadY);

        if (cut.dateString) {
            ctx.font = `bold ${Math.max(10, Math.round(width * 0.012))}px "Courier New", monospace`;
            ctx.fillStyle = theme.inkMuted;
            // The printed calendar date always shows TODAY's device date.
            ctx.fillText(applyTodayDateline(cut.dateString).toUpperCase(), pageLeftX + pageWidth / 2, mastheadY + 28);
        }

        if (options.showDividerRules !== false) {
            const ruleY = mastheadY + 44;
            ctx.strokeStyle = theme.ruleColor;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(pageLeftX, ruleY);
            ctx.lineTo(pageLeftX + pageWidth, ruleY);
            ctx.stroke();

            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pageLeftX, ruleY + 4);
            ctx.lineTo(pageLeftX + pageWidth, ruleY + 4);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION B2: Anchor Strapline (top-masthead sector sweep target)
    // Draw the phrase kicker line under the masthead block, then sweep
    // it. Kept OUTSIDE the showMasthead guard: it is the active sweep
    // target for the header sector and must render even when the
    // masthead name itself is toggled off.
    // ------------------------------------------------------------
    if (strapChunks.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.font = `900 ${strapFontPx}px ${chosenFont}`;
        ctx.fillStyle = isDark ? '#ffffff' : theme.ink;
        strapLines.forEach((line, i) => {
            ctx.fillText(line.text, pageLeftX + pageWidth / 2, strapTop + i * strapLineH + strapFontPx * 0.85);
        });

        drawSweepChunks(ctx, strapChunks, strapFontPx, progress, options, settledCount);
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION C: The Journal Sentence & Sweep Highlight
    // ------------------------------------------------------------
    ctx.save();
    ctx.font = headlineFont;
    ctx.textBaseline = 'top';

    // 1. Sweep highlight — only the center (headline) sector strokes here
    drawSweepChunks(ctx, headlineChunks, headlineFontSize, progress, options, settledCount);

    // 2. Draw Journal Text Words ("Abstract" renders extra-bold in academic theme)
    headlineLines.forEach((line, lineIdx) => {
        const lineY = docHeadlineY + lineIdx * headlineLineHeight;
        const lineStartX = pageLeftX + (pageWidth - line.w) / 2;

        line.words.forEach((w) => {
            const wx = lineStartX + w.x;
            if (w.word === 'Abstract' && options.paperTheme === 'academic') {
                ctx.font = `900 ${headlineFontSize}px ${chosenFont}`;
            } else {
                ctx.font = headlineFont;
            }

            if (w.isAnchor && options.highlightStyle === 'box') {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = isDark ? '#ffffff' : theme.ink;
            }
            ctx.fillText(w.word, wx, lineY);
        });
    });

    ctx.restore();

    // Thin rule below the sentence
    if (options.showDividerRules !== false) {
        ctx.save();
        ctx.strokeStyle = theme.ruleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pageLeftX, headlineRuleY);
        ctx.lineTo(pageLeftX + pageWidth, headlineRuleY);
        ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION D: Subhead & Byline
    // ------------------------------------------------------------
    if (subheadLines.length > 0) {
        ctx.save();
        ctx.font = subheadFont;
        ctx.fillStyle = theme.inkMuted;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        subheadLines.forEach((sLine, idx) => {
            ctx.fillText(sLine, pageLeftX, subheadY + idx * subheadLineH);
        });
        ctx.restore();
    }

    if (showByline) {
        ctx.save();
        ctx.font = `bold italic ${Math.max(12, Math.round(width * 0.0155))}px ${chosenFont}`;
        ctx.fillStyle = theme.inkMuted;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const bylineStr = [cut.location, cut.byline].filter(Boolean).join(' — ') || 'From Our Special Correspondent';
        ctx.fillText(bylineStr, pageLeftX, bylineY);
        ctx.restore();
    }

    // Thin rule below byline
    if (options.showDividerRules !== false) {
        ctx.save();
        ctx.strokeStyle = theme.ruleColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pageLeftX, bylineRuleY);
        ctx.lineTo(pageLeftX + pageWidth, bylineRuleY);
        ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION D2: Body Paragraph Sweep (body-paragraph sector)
    // ------------------------------------------------------------
    let denseColumnsStartY = flowY;
    if (bodySweepLines.length > 0) {
        ctx.save();
        ctx.font = bodyFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        drawSweepChunks(ctx, bodyChunks, bodyFontSize, progress, options, settledCount);

        bodySweepLines.forEach((line, lineIdx) => {
            const lineY = bodySweepStartY + lineIdx * bodyLineHeight;
            line.words.forEach((w) => {
                ctx.fillStyle = isDark ? '#ffffff' : theme.ink;
                ctx.fillText(w.word, bodySweepX + w.x, lineY);
            });
        });
        ctx.restore();

        denseColumnsStartY = bodySweepStartY + bodySweepH + 16;
    }

    // ------------------------------------------------------------
    // SECTION E: Dense Bottom Columns
    // ------------------------------------------------------------
    if (options.showBottomColumns !== false) {
        const bottomColumnsH = 1600;
        const remainingParas = bodySweepLines.length > 0 && sweepBodyParas.length > 1
            ? sweepBodyParas.slice(1)
            : sweepBodyParas;
        drawDenseColumns(
            ctx,
            pageLeftX,
            denseColumnsStartY,
            pageWidth,
            bottomColumnsH,
            remainingParas,
            bodyFont,
            bodyFontSize,
            bodyLineHeight,
            theme,
            3
        );
    }

    ctx.restore(); // Restore camera transform

    // ------------------------------------------------------------
    // SECTION F: Depth of Field Tilt-Shift Blur (Wide clear focal center)
    // ------------------------------------------------------------
    if (useDof && renderBuffer) {
        const blurCanvas = getDocBufferCanvas(width, height, 'blur');
        const blurCtx = blurCanvas.getContext('2d')!;
        blurCtx.clearRect(0, 0, width, height);

        const blurRadius = Math.max(3, Math.round(options.dofIntensity * 14));
        try {
            blurCtx.filter = `blur(${blurRadius}px)`;
        } catch { /* filter unsupported — plain blit */ }
        blurCtx.drawImage(renderBuffer, 0, 0);
        try {
            blurCtx.filter = 'none';
        } catch { /* ignore */ }

        targetCanvasCtx.clearRect(0, 0, width, height);
        targetCanvasCtx.drawImage(blurCanvas, 0, 0);

        const mask = getDocBufferCanvas(width, height, 'mask');
        const mCtx = mask.getContext('2d')!;
        mCtx.clearRect(0, 0, width, height);

        const innerRadius = Math.min(width, height) * 0.18;
        const outerRadius = Math.max(width, height) * 0.55;

        const radialGrad = mCtx.createRadialGradient(
            targetCenterX,
            targetCenterY,
            innerRadius,
            targetCenterX,
            targetCenterY,
            outerRadius
        );

        radialGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radialGrad.addColorStop(0.35, 'rgba(0,0,0,1)');
        radialGrad.addColorStop(1, 'rgba(0,0,0,0)');

        mCtx.fillStyle = radialGrad;
        mCtx.fillRect(0, 0, width, height);

        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(renderBuffer, 0, 0);
        mCtx.globalCompositeOperation = 'source-over';

        targetCanvasCtx.drawImage(mask, 0, 0);
    }

    // ------------------------------------------------------------
    // SECTION G: Center Alignment Crosshair Guide (Optional)
    // ------------------------------------------------------------
    if (options.showCrosshairGuide) {
        targetCanvasCtx.save();
        targetCanvasCtx.strokeStyle = 'rgba(234, 88, 12, 0.7)';
        targetCanvasCtx.lineWidth = 1.2;
        targetCanvasCtx.setLineDash([4, 4]);

        targetCanvasCtx.beginPath();
        targetCanvasCtx.moveTo(targetCenterX, 0);
        targetCanvasCtx.lineTo(targetCenterX, height);
        targetCanvasCtx.stroke();

        targetCanvasCtx.beginPath();
        targetCanvasCtx.moveTo(0, targetCenterY);
        targetCanvasCtx.lineTo(width, targetCenterY);
        targetCanvasCtx.stroke();

        targetCanvasCtx.beginPath();
        targetCanvasCtx.arc(targetCenterX, targetCenterY, 22, 0, Math.PI * 2);
        targetCanvasCtx.stroke();
        targetCanvasCtx.restore();
    }

    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// PAPER ENTRANCE / EXIT — the pre-sweep slam and the post-sweep whip-out.
//
// The viral pattern: before any highlighting starts, the whole news article
// flies into view (top→bottom, bottom→top, left→right, right→left) with
// directional motion blur and a settle tilt, lands dead center, holds for a
// configurable beat (0–4s), and only then does the marker sweep begin. After
// the final sweep the SAME machinery runs as an exit: the finished paper
// whips back out with an anticipation windup and a hot streak.
// Deterministic Motion-as-Code: the caller drives `entranceProgress` /
// `exitProgress` (0..1) exactly like `highlightProgress`, so the live
// preview and the frame-stepped exporter produce identical pixels.
// All spring/streak math lives in the SHARED lib so Text Match Cut gets
// pixel-identical motion for free.
// ─────────────────────────────────────────────────────────────────────────────

export function renderHighlighterStoryWithEntrance(
    targetCanvasCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cut: NewspaperCut,
    options: HighlighterRenderOptions,
    frameIndex = 0
) {
    const inDir = options.entranceDirection ?? 'none';
    const outDir = options.exitDirection ?? 'none';
    const inP = clamp01(options.entranceProgress ?? 1);
    const outP = clamp01(options.exitProgress ?? 0);
    const theme: PaperTheme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.academic;

    // Entrance in flight → the document renders untouched (no sweep strokes
    // yet) and the shared transition composites the slam-in.
    if (inDir !== 'none' && inP < 1 && typeof document !== 'undefined') {
        renderPaperTransition(targetCanvasCtx, width, height, (c) => {
            renderHighlighterStory(c, width, height, cut, { ...options, highlightProgress: 0 }, frameIndex);
        }, {
            mode: 'in',
            direction: inDir,
            progress: inP,
            blur: options.entranceBlur ?? 0.8,
            tiltDeg: options.entranceTilt ?? 4,
            scaleEdge: options.entranceScaleFrom ?? 1.07,
            overshoot: options.entranceOvershoot,
            bg: theme.bg,
            travelScale: options.paperTravel,
        });
        return;
    }

    // Exit in flight (or fully gone) → the finished document whips out.
    if (outDir !== 'none' && outP > 0 && typeof document !== 'undefined') {
        renderPaperTransition(targetCanvasCtx, width, height, (c) => {
            renderHighlighterStory(c, width, height, cut, options, frameIndex);
        }, {
            mode: 'out',
            direction: outDir,
            progress: outP,
            blur: options.exitBlur ?? 0.8,
            bg: theme.bg,
            travelScale: options.paperTravel,
        });
        return;
    }

    renderHighlighterStory(targetCanvasCtx, width, height, cut, options, frameIndex);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SCAN MODE — import a REAL newspaper photo, OCR it, and sweep the
// marker over the ACTUAL printed page.
//
// This is a deliberately different world from Journal Mode: no synthesized
// columns, no paper slam — the uploaded clip IS the document. The camera
// does the storytelling instead: full-page overview → eased dive onto the
// picked line → marker sweep → hold beat → pull back → dive to the next
// pick. Every completed stroke STAYS on the page (sticky by design), so by
// the final beat the reader sees the whole trail of marks, exactly like a
// physical newspaper worked over with a highlighter.
//
// Deterministic Motion-as-Code: sampleScanSequence() is the single clock
// shared by the live loop and the frame-stepped exporter, so preview pixels
// always equal export pixels.
// ─────────────────────────────────────────────────────────────────────────────

/** One OCR word inside a line — the atom for PART-of-line trims. */
export interface ScanWordBox {
    text: string;
    /** Normalized [0..1] coordinates relative to the source image. */
    box: { x0: number; y0: number; x1: number; y1: number };
}

/** One extracted, pickable line of OCR text with its box in image space. */
export interface ScanLineBox {
    id: string;
    text: string;
    /** Normalized [0..1] coordinates relative to the source image. */
    box: { x0: number; y0: number; x1: number; y1: number };
    /** Word-level boxes (when OCR provides them) — powers PART-of-line
     *  trims, so you can highlight just the middle sentence of a line. */
    words?: ScanWordBox[];
    /** Continuous RANGE pick: ordered sub-lines swept by ONE marker
     *  motion (A→B→C→D, no break between them). `box` is the union. */
    flow?: ScanLineBox[];
    /** Page-side trim bookkeeping — the untrimmed box/text before a PART cut. */
    origBox?: { x0: number; y0: number; x1: number; y1: number };
    origText?: string;
}

export interface ScanRenderState {
    image: CanvasImageSource;
    imageW: number;
    imageH: number;
    /** User-picked lines, in highlight order. */
    picks: ScanLineBox[];
}

export interface ScanBeat {
    pickIndex: number;
    phase: 'overview' | 'dive' | 'sweep' | 'hold' | 'outro';
    phaseT: number; // 0..1 within the phase
}

// Choreography pacing (ms). The full page breathes ONCE, pick 0 dives in
// ("moving in totally"), then every following pick GLIDES from the previous
// focus straight to the next — teleprompter-smooth, never a snap between
// sectors. The wide pull-back only happens at the very end ("moving out
// totally"). Sweep runs at the user's highlight duration; hold is the ~1.6s
// read beat.
export const SCAN_OVERVIEW_MS = 520;
export const SCAN_DIVE_MS = 480;
export const SCAN_HOLD_MS = 1600;
export const SCAN_OUTRO_MS = 900;

export function getPickSweepMs(pick: ScanLineBox | undefined, baseSweepMs: number): number {
    if (!pick?.flow || pick.flow.length <= 1) return baseSweepMs;
    // Scale duration naturally with number of segments so multi-line continuous sweeps aren't rushed
    return Math.round(baseSweepMs * (1 + (pick.flow.length - 1) * 0.75));
}

/** Dwell per pick: enter (dive or glide) + sweep + hold. */
export function scanBeatMs(sweepMs: number): number {
    return SCAN_DIVE_MS + sweepMs + SCAN_HOLD_MS;
}

export function scanSequenceTotalMs(picksOrCount: number | ScanLineBox[], baseSweepMs: number): number {
    if (typeof picksOrCount === 'number') {
        if (picksOrCount <= 0) return SCAN_OVERVIEW_MS + SCAN_OUTRO_MS;
        return SCAN_OVERVIEW_MS + picksOrCount * scanBeatMs(baseSweepMs) + SCAN_OUTRO_MS;
    }
    const picks = picksOrCount;
    if (picks.length <= 0) return SCAN_OVERVIEW_MS + SCAN_OUTRO_MS;
    const totalBeats = picks.reduce((acc, p) => acc + (SCAN_DIVE_MS + getPickSweepMs(p, baseSweepMs) + SCAN_HOLD_MS), 0);
    return SCAN_OVERVIEW_MS + totalBeats + SCAN_OUTRO_MS;
}

/** Absolute start time of pick `pickIndex`'s sweep (for audio scheduling). */
export function scanSweepStartMs(pickIndex: number, picksOrCount: number | ScanLineBox[], baseSweepMs: number = 2000): number {
    let t = SCAN_OVERVIEW_MS;
    const picks = typeof picksOrCount === 'number' ? null : picksOrCount;
    const count = picks ? picks.length : (picksOrCount as number);
    for (let i = 0; i < pickIndex && i < count; i++) {
        const sweepMs = picks ? getPickSweepMs(picks[i], baseSweepMs) : baseSweepMs;
        t += SCAN_DIVE_MS + sweepMs + SCAN_HOLD_MS;
    }
    return t + SCAN_DIVE_MS;
}

export function sampleScanSequence(elapsedMs: number, picksOrCount: number | ScanLineBox[], baseSweepMs: number): ScanBeat {
    const picks = typeof picksOrCount === 'number' ? null : picksOrCount;
    const count = picks ? picks.length : (picksOrCount as number);

    if (count <= 0) {
        return {
            pickIndex: 0,
            phase: 'overview',
            phaseT: Math.min(1, elapsedMs / (SCAN_OVERVIEW_MS + SCAN_OUTRO_MS)),
        };
    }
    if (elapsedMs < SCAN_OVERVIEW_MS) {
        return { pickIndex: 0, phase: 'overview', phaseT: elapsedMs / SCAN_OVERVIEW_MS };
    }
    let t = elapsedMs - SCAN_OVERVIEW_MS;
    for (let i = 0; i < count; i++) {
        const sweepMs = picks ? getPickSweepMs(picks[i], baseSweepMs) : baseSweepMs;
        if (t < SCAN_DIVE_MS) return { pickIndex: i, phase: 'dive', phaseT: t / SCAN_DIVE_MS };
        t -= SCAN_DIVE_MS;
        if (t < sweepMs) return { pickIndex: i, phase: 'sweep', phaseT: t / sweepMs };
        t -= sweepMs;
        if (t < SCAN_HOLD_MS) return { pickIndex: i, phase: 'hold', phaseT: t / SCAN_HOLD_MS };
        t -= SCAN_HOLD_MS;
    }
    return {
        pickIndex: count - 1,
        phase: 'outro',
        phaseT: Math.min(1, Math.max(0, t / SCAN_OUTRO_MS)),
    };
}

// Watermark-style 9-sector grid — the camera fallback when a pick's OCR box
// is degenerate. Order: top-left → top-center → top-right → mid-left →
// center → mid-right → bottom-left → bottom-center → bottom-right.
const SCAN_SECTORS = [
    { x: 0.22, y: 0.16 }, { x: 0.5, y: 0.16 }, { x: 0.78, y: 0.16 },
    { x: 0.22, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.78, y: 0.5 },
    { x: 0.22, y: 0.84 }, { x: 0.5, y: 0.84 }, { x: 0.78, y: 0.84 },
];

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Runs of picks that read as one continuous block (each line sits directly
 *  under the previous one) share a single camera focus — the whole block is
 *  centered mid-screen instead of zooming out and back in between its lines. */
function scanPickGroupBox(scan: ScanRenderState, pickIndex: number): { x0: number; y0: number; x1: number; y1: number } | null {
    const picks = scan.picks;
    const anchor = picks[pickIndex];
    if (!anchor) return null;
    const verticallyAdjacent = (a: ScanLineBox, b: ScanLineBox): boolean => {
        // Next line starts just below where the previous one ends, and the two
        // share enough horizontal overlap to belong to the same text column.
        const vGap = b.box.y0 - a.box.y1;
        const xOverlap = Math.min(a.box.x1, b.box.x1) - Math.max(a.box.x0, b.box.x0);
        return vGap > -0.015 && vGap < 0.05 && xOverlap > 0.05;
    };
    let lo = pickIndex;
    let hi = pickIndex;
    while (lo > 0 && verticallyAdjacent(picks[lo - 1], picks[lo])) lo -= 1;
    while (hi < picks.length - 1 && verticallyAdjacent(picks[hi], picks[hi + 1])) hi += 1;
    let { x0, y0, x1, y1 } = anchor.box;
    for (let k = lo; k <= hi; k++) {
        x0 = Math.min(x0, picks[k].box.x0);
        y0 = Math.min(y0, picks[k].box.y0);
        x1 = Math.max(x1, picks[k].box.x1);
        y1 = Math.max(y1, picks[k].box.y1);
    }
    return { x0, y0, x1, y1 };
}

interface ScanCameraFocus {
    cx: number;
    cy: number;
    s: number;
}

function scanCameraFocus(
    scan: ScanRenderState,
    beat: ScanBeat,
    pageX: number,
    pageY: number,
    pageW: number,
    pageH: number,
    width: number,
    height: number
): ScanCameraFocus {
    const overviewCx = pageX + pageW / 2;
    const overviewCy = pageY + pageH / 2;

    const focusForPick = (idx: number): ScanCameraFocus => {
        // Vertically-continuous picks (line B directly under line A) form one
        // block with a SHARED focus: the whole block is centered mid-screen
        // and the camera never zooms out just to dive back in on the next line.
        const group = scanPickGroupBox(scan, idx);
        const box = group && (group.x1 - group.x0) > 0.001 && (group.y1 - group.y0) > 0.001 ? group : scan.picks[idx]?.box;
        if (!box) {
            // Degenerate box → sector grid fallback, watermark placement order.
            const sec = SCAN_SECTORS[idx % SCAN_SECTORS.length];
            return { cx: pageX + sec.x * pageW, cy: pageY + sec.y * pageH, s: 2.1 };
        }
        const pxW = Math.max(8, (box.x1 - box.x0) * pageW);
        const pxH = Math.max(8, (box.y1 - box.y0) * pageH);

        const isPortrait = height > width;
        // In 9:16 and mobile portrait formats, extreme zooms crop out the paper and surrounding context.
        // Guarantee that zoom never exceeds what fits comfortably on screen with safe padding margins.
        const maxFitZoomW = (width * 0.94) / Math.max(1, pageW);
        const maxZoomLimit = isPortrait ? Math.min(1.18, maxFitZoomW) : Math.min(2.0, maxFitZoomW);
        const targetZoomW = (width * 0.82) / pxW;
        const targetZoomH = (height * 0.48) / pxH;
        const zoom = Math.min(maxZoomLimit, Math.max(1, Math.min(targetZoomW, targetZoomH)));

        return {
            cx: pageX + ((box.x0 + box.x1) / 2) * pageW,
            cy: pageY + ((box.y0 + box.y1) / 2) * pageH,
            s: zoom,
        };
    };

    const target = focusForPick(beat.pickIndex);

    switch (beat.phase) {
        case 'overview': {
            // Slow breathing drift on the full page — earlier marks visible.
            return { cx: overviewCx, cy: overviewCy, s: 1 + 0.015 * beat.phaseT };
        }
        case 'dive': {
            // Pick 0 dives in from the wide page ("moving in totally"). Every
            // later pick GLIDES from the previous pick's focus straight to the
            // next — one continuous teleprompter-style camera move, never a
            // snap between sectors.
            const e = easeInOutCubic(beat.phaseT);
            const from: ScanCameraFocus = beat.pickIndex > 0
                ? focusForPick(beat.pickIndex - 1)
                : { cx: overviewCx, cy: overviewCy, s: 1 };
            const glide = beat.pickIndex > 0;
            const jumpDist = Math.hypot(target.cx - from.cx, target.cy - from.cy) / (Math.hypot(pageW, pageH) || 1);
            // Same focus (continuous-line block) → no pull-back at all.
            const pull = jumpDist < 0.02 ? 0 : 0.20 + 0.12 * Math.min(1, jumpDist * 1.5);
            const arc = glide ? Math.sin(Math.PI * beat.phaseT) : 0;
            const baseS = from.s + (target.s - from.s) * e;
            return {
                cx: from.cx + (target.cx - from.cx) * e,
                cy: from.cy + (target.cy - from.cy) * e,
                s: Math.max(1, baseS + (1 - baseS) * pull * arc),
            };
        }
        case 'sweep':
        case 'hold':
            return target;
        case 'outro': {
            // Final pull-back to the full page ("moving out totally").
            const e = easeInOutCubic(beat.phaseT);
            return {
                cx: target.cx + (overviewCx - target.cx) * e,
                cy: target.cy + (overviewCy - target.cy) * e,
                s: target.s + (1.0 - target.s) * e,
            };
        }
    }
}

/**
 * Renders one Document Scan frame. The caller drives the clock: compute a
 * ScanBeat with sampleScanSequence() and pass it in — identical frames for
 * the live preview and the MP4 exporter.
 */
export function renderScanDocumentStory(
    targetCanvasCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scan: ScanRenderState,
    options: HighlighterRenderOptions,
    beat: ScanBeat
) {
    const theme: PaperTheme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.academic;
    const isDark = options.paperTheme === 'noir';

    const useDof = Boolean(options.depthOfField && typeof document !== 'undefined');
    const renderBuffer = useDof ? getDocBufferCanvas(width, height, 'main') : null;
    const ctx = renderBuffer ? renderBuffer.getContext('2d')! : targetCanvasCtx;

    ctx.save();

    const cover = options.scanPageFit === 'cover';
    const fillStyle = options.scanFillStyle ?? 'blur';
    const blurBg = fillStyle === 'blur';
    const edgeBg = fillStyle === 'edge';
    const edgeColor = options.scanEdgeColor || (isDark ? '#141414' : '#f0ede6');

    // 1. Canvas Backdrop — BLUR, EDGE color, or theme PAPER desk
    if (blurBg) {
        ctx.save();
        const bgScale = Math.max(width / scan.imageW, height / scan.imageH) * 1.08;
        const bgW = scan.imageW * bgScale;
        const bgH = scan.imageH * bgScale;
        try {
            ctx.filter = `blur(${Math.max(14, Math.round(Math.min(width, height) * 0.05))}px)`;
        } catch { /* filter unsupported */ }
        ctx.drawImage(scan.image, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
        try { ctx.filter = 'none'; } catch { /* ignore */ }
        ctx.restore();
        // Soft cinematic scrim over blur for contrast & focus
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(0, 0, width, height);
    } else if (edgeBg) {
        ctx.fillStyle = edgeColor;
        ctx.fillRect(0, 0, width, height);
        // Soft vignette so edge fill looks natural and photographic
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.4,
            width / 2, height / 2, Math.max(width, height) * 0.95
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Paper desk background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.35,
            width / 2, height / 2, Math.max(width, height) * 0.88
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(0.7, isDark ? 'rgba(0,0,0,0.25)' : 'rgba(80,60,30,0.04)');
        vignette.addColorStop(1, isDark ? 'rgba(0,0,0,0.55)' : 'rgba(70,50,20,0.12)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    }

    if (options.filmGrain) {
        const noise = getNoisePattern();
        const pattern = ctx.createPattern(noise, 'repeat');
        if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); }
    }

    // 2. Fit the scanned page. In both FIT and FILL, the WHOLE scan remains visible and never cropped!
    // In FIT: comfortable margins so the page sits neatly on the desk/blur/edge background.
    // In FILL: spans edge-to-edge on the limiting dimension without cropping text.
    const margin = cover ? 0 : Math.min(width, height) * 0.035;
    const availW = width - margin * 2;
    const availH = height - margin * 2;
    const scale = Math.min(availW / scan.imageW, availH / scan.imageH);
    const pageW = scan.imageW * scale;
    const pageH = scan.imageH * scale;
    const pageX = (width - pageW) / 2;
    const pageY = (height - pageH) / 2;

    // 3. Camera choreography — AUTO CAMERA can be switched off for a static full-page view
    const focus = options.scanAutoCamera === false
        ? { cx: pageX + pageW / 2, cy: pageY + pageH / 2, s: 1 }
        : scanCameraFocus(scan, beat, pageX, pageY, pageW, pageH, width, height);

    // Smooth vertical pan to eye-level (~44% height) when zoomed in
    const eyeLevelY = height * 0.44;
    const zoomInfluence = Math.max(0, Math.min(1, (focus.s - 1) * 2.5));
    const panY = (eyeLevelY - focus.cy) * zoomInfluence;

    const screenTargetX = focus.cx;
    const screenTargetY = focus.cy + panY;

    ctx.save();
    ctx.translate(screenTargetX, screenTargetY);
    ctx.scale(focus.s, focus.s);
    if (options.cameraShake) {
        const jitterSeed = beat.pickIndex + 1;
        const angle = Math.sin(jitterSeed * 12.9898) * 0.0012;
        const micro = 1 + Math.cos(jitterSeed * 78.233) * 0.0015;
        ctx.rotate(angle);
        ctx.scale(micro, micro);
    }
    ctx.translate(-focus.cx, -focus.cy);

    // 4. Physical page rendering — clean image with soft drop shadow, NO ugly white padding boxes!
    ctx.save();
    if (blurBg) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = Math.max(14, width * 0.018);
        ctx.shadowOffsetY = Math.max(6, height * 0.008);
        try {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        } catch { /* older browsers */ }
        ctx.drawImage(scan.image, pageX, pageY, pageW, pageH);
    } else if (edgeBg) {
        if (!cover) {
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur = Math.max(12, width * 0.015);
            ctx.shadowOffsetY = Math.max(4, height * 0.006);
        }
        try {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        } catch { /* older browsers */ }
        ctx.drawImage(scan.image, pageX, pageY, pageW, pageH);
    } else {
        ctx.shadowColor = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(60,45,20,0.28)';
        ctx.shadowBlur = Math.max(10, width * 0.012);
        ctx.shadowOffsetY = Math.max(4, width * 0.004);
        try {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        } catch { /* older browsers */ }
        ctx.drawImage(scan.image, pageX, pageY, pageW, pageH);
    }
    ctx.restore();

    // 5. Marker strokes over the printed page — sticky by design: every
    // pick before the active one stays fully drawn (faintly dimmed), the
    // active pick animates with the beat, future picks stay invisible.
    scan.picks.forEach((pick, i) => {
        if (i > beat.pickIndex) return;

        // A RANGE pick carries its sub-lines in `flow` — ONE beat sweeps
        // the marker through A→B→C→D continuously: each segment lights as
        // the stroke crosses it, no break between lines. Plain picks are a
        // single segment.
        const segments = (pick.flow && pick.flow.length > 0 ? pick.flow : [pick]).map((seg) => {
            const bx = pageX + seg.box.x0 * pageW;
            const by = pageY + seg.box.y0 * pageH;
            const bw = Math.max(4, (seg.box.x1 - seg.box.x0) * pageW);
            const bh = Math.max(4, (seg.box.y1 - seg.box.y0) * pageH);
            return { bx, by, bw, bh, fontSize: Math.max(6, bh * 0.82) };
        });

        let hp = 1;
        if (i === beat.pickIndex) {
            hp = beat.phase === 'sweep'
                ? easeHighlightSweep(beat.phaseT)
                : (beat.phase === 'overview' || beat.phase === 'dive') ? 0 : 1;
        }
        if (hp <= 0) return;

        segments.forEach((seg, segIdx) => {
            // Continuous flow: stagger the segments across the single sweep.
            const segHp = segments.length > 1
                ? Math.max(0, Math.min(1, hp * segments.length - segIdx))
                : hp;
            if (segHp <= 0) return;
            drawAnchorHighlight(ctx, seg.bx, seg.by + seg.bh / 2, seg.bw, seg.fontSize, {
                ...options,
                highlightProgress: segHp,
                markerOpacity: i === beat.pickIndex ? options.markerOpacity : options.markerOpacity * 0.88,
            });
        });
    });

    ctx.restore(); // camera transform

    ctx.restore(); // main save

    const pivotX = screenTargetX;
    const pivotY = screenTargetY;

    // 6. Tilt-shift DoF — focal center rides the camera focus point.
    if (useDof && renderBuffer) {
        const blurCanvas = getDocBufferCanvas(width, height, 'blur');
        const blurCtx = blurCanvas.getContext('2d')!;
        blurCtx.clearRect(0, 0, width, height);

        const blurRadius = Math.max(3, Math.round(options.dofIntensity * 14));
        try {
            blurCtx.filter = `blur(${blurRadius}px)`;
        } catch { /* filter unsupported — plain blit */ }
        blurCtx.drawImage(renderBuffer, 0, 0);
        try {
            blurCtx.filter = 'none';
        } catch { /* ignore */ }

        targetCanvasCtx.clearRect(0, 0, width, height);
        targetCanvasCtx.drawImage(blurCanvas, 0, 0);

        const mask = getDocBufferCanvas(width, height, 'mask');
        const mCtx = mask.getContext('2d')!;
        mCtx.clearRect(0, 0, width, height);

        const innerRadius = Math.min(width, height) * 0.18;
        const outerRadius = Math.max(width, height) * 0.55;
        const radialGrad = mCtx.createRadialGradient(
            pivotX, pivotY, innerRadius,
            pivotX, pivotY, outerRadius
        );
        radialGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radialGrad.addColorStop(0.35, 'rgba(0,0,0,1)');
        radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = radialGrad;
        mCtx.fillRect(0, 0, width, height);

        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(renderBuffer, 0, 0);
        mCtx.globalCompositeOperation = 'source-over';

        targetCanvasCtx.drawImage(mask, 0, 0);
    }

    // 7. Optional crosshair guide at the live camera focus.
    if (options.showCrosshairGuide) {
        targetCanvasCtx.save();
        targetCanvasCtx.strokeStyle = 'rgba(234, 88, 12, 0.7)';
        targetCanvasCtx.lineWidth = 1.2;
        targetCanvasCtx.setLineDash([4, 4]);
        targetCanvasCtx.beginPath();
        targetCanvasCtx.moveTo(pivotX, 0);
        targetCanvasCtx.lineTo(pivotX, height);
        targetCanvasCtx.stroke();
        targetCanvasCtx.beginPath();
        targetCanvasCtx.moveTo(0, pivotY);
        targetCanvasCtx.lineTo(width, pivotY);
        targetCanvasCtx.stroke();
        targetCanvasCtx.beginPath();
        targetCanvasCtx.arc(pivotX, pivotY, 22, 0, Math.PI * 2);
        targetCanvasCtx.stroke();
        targetCanvasCtx.restore();
    }
}
